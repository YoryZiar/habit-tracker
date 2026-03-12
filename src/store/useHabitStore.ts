import { create } from 'zustand';
import { googleSheetsService, HabitRecord } from '../services/googleSheetsService';
import { formatDate } from '../utils/dateUtils';
import toast from 'react-hot-toast';

const handleAuthError = (error: any) => {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    useAuthStore.getState().logout();
    toast.error('Sesi Anda telah berakhir. Silakan masuk kembali.');
    return true;
  }
  return false;
};

interface AuthState {
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

interface HabitState {
  habits: HabitRecord[];
  isLoading: boolean;
  error: string | null;
  fetchHabits: () => Promise<void>;
  updateRecord: (habitId: string, date: string, value: string | number) => Promise<void>;
  addHabit: (habit: Omit<HabitRecord, 'id' | 'records' | 'createdAt'>) => Promise<void>;
  editHabit: (id: string, data: Partial<Omit<HabitRecord, 'id' | 'records' | 'createdAt'>>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (newHabits: HabitRecord[]) => Promise<void>;
  
  // Gamifikasi
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  badges: string[];
  streakExtended: boolean;
  newBestStreak: boolean;
  clearStreakAnimations: () => void;
  calculateGamification: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: localStorage.getItem('auth') === 'true',
  login: async (token: string) => {
    try {
      await googleSheetsService.authenticate(token);
      localStorage.setItem('auth', 'true');
      set({ isAuthenticated: true });
      toast.success('Berhasil masuk dan terhubung');
    } catch (error) {
      toast.error('Gagal terhubung ke Google Sheets');
      throw error;
    }
  },
  logout: () => {
    localStorage.removeItem('auth');
    localStorage.removeItem('gapi_access_token');
    set({ isAuthenticated: false });
    toast.success('Berhasil keluar');
  },
}));

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  isLoading: false,
  error: null,
  currentStreak: 0,
  bestStreak: 0,
  streakExtended: false,
  newBestStreak: false,

  clearStreakAnimations: () => {
    set({ streakExtended: false, newBestStreak: false });
  },

  fetchHabits: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await googleSheetsService.getHabits();
      set({ habits: data, isLoading: false });
      get().calculateGamification();
    } catch (error) {
      if (handleAuthError(error)) return;
      set({ error: 'Gagal mengambil data dari Google Sheets', isLoading: false });
      toast.error('Gagal mengambil data dari Google Sheets');
    }
  },

  updateRecord: async (habitId, date, value) => {
    const { habits } = get();
    const habitIndex = habits.findIndex(h => h.id === habitId);
    
    if (habitIndex === -1) return;
    
    const updatedHabit = { ...habits[habitIndex] };
    updatedHabit.records = { ...updatedHabit.records, [date]: value };
    
    // Optimistic update
    const newHabits = [...habits];
    newHabits[habitIndex] = updatedHabit;
    set({ habits: newHabits });
    get().calculateGamification();
    
    try {
      await googleSheetsService.updateHabit(updatedHabit);
    } catch (error) {
      if (handleAuthError(error)) return;
      // Revert on error
      set({ habits, error: 'Gagal menyimpan perubahan' });
      get().calculateGamification();
      toast.error('Gagal menyimpan perubahan ke Google Sheets');
    }
  },
  
  editHabit: async (id, updatedData) => {
    const { habits } = get();
    const habitIndex = habits.findIndex(h => h.id === id);
    
    if (habitIndex === -1) return;
    
    const updatedHabit = { ...habits[habitIndex], ...updatedData };
    const newHabits = [...habits];
    newHabits[habitIndex] = updatedHabit;
    set({ habits: newHabits });
    get().calculateGamification();
    
    try {
      await googleSheetsService.updateHabit(updatedHabit);
      toast.success('Habit berhasil diperbarui');
    } catch (error) {
      if (handleAuthError(error)) return;
      set({ habits, error: 'Gagal mengedit habit' });
      get().calculateGamification();
      toast.error('Gagal mengedit habit');
    }
  },
  
  addHabit: async (newHabitData) => {
    const newHabit: HabitRecord = {
      ...newHabitData,
      id: Date.now().toString(),
      records: {},
      createdAt: new Date().toISOString()
    };
    
    const { habits } = get();
    const newHabits = [...habits, newHabit];
    set({ habits: newHabits });
    
    try {
      await googleSheetsService.addHabit(newHabit);
      toast.success('Habit baru berhasil ditambahkan');
    } catch (error) {
      if (handleAuthError(error)) return;
      set({ habits, error: 'Gagal menambah habit' });
      toast.error('Gagal menambah habit');
    }
  },
  
  deleteHabit: async (id) => {
    const { habits } = get();
    const newHabits = habits.filter(h => h.id !== id);
    set({ habits: newHabits });
    get().calculateGamification();
    
    try {
      await googleSheetsService.deleteHabit(id);
      toast.success('Habit berhasil dihapus');
    } catch (error) {
      if (handleAuthError(error)) return;
      set({ habits, error: 'Gagal menghapus habit' });
      get().calculateGamification();
      toast.error('Gagal menghapus habit');
    }
  },

  reorderHabits: async (newHabits) => {
    const { habits: oldHabits } = get();
    set({ habits: newHabits });
    
    try {
      await googleSheetsService.reorderHabits(newHabits);
    } catch (error) {
      if (handleAuthError(error)) return;
      set({ habits: oldHabits, error: 'Gagal mengurutkan habit' });
      toast.error('Gagal menyimpan urutan habit');
    }
  },

  calculateGamification: () => {
    const { habits, currentStreak: prevCurrentStreak, bestStreak: prevBestStreak } = get();
    if (habits.length === 0) {
      set({ currentStreak: 0, bestStreak: 0, totalPoints: 0, badges: [] });
      return;
    }

    const today = formatDate(new Date());
    let points = 0;
    const allDates = new Set<string>();

    habits.forEach(habit => {
      let startDateStr = habit.createdAt ? habit.createdAt.split('T')[0] : null;
      
      const recordDates = Object.keys(habit.records).sort();
      if (recordDates.length > 0) {
        if (!startDateStr || recordDates[0] < startDateStr) {
          startDateStr = recordDates[0];
        }
      }

      if (!startDateStr) return;

      let endDateStr = today;
      if (recordDates.length > 0 && recordDates[recordDates.length - 1] > endDateStr) {
        endDateStr = recordDates[recordDates.length - 1];
      }

      let currentStr = startDateStr;
      while (currentStr <= endDateStr) {
        allDates.add(currentStr);
        const record = habit.records[currentStr];
        
        // Calculate points
        if (habit.type === 'boolean') {
          if (record === 'selesai') {
            points += 10;
          } else if (record === 'gagal') {
            points -= 10;
          } else if (!record && currentStr < today) {
            // Missed past day
            points -= 10;
          }
        } else if (habit.type === 'quantitative') {
          if (record !== undefined && Number(record) >= habit.target) {
            points += 10;
          } else if (record !== undefined && Number(record) < habit.target) {
            points -= 10;
          } else if (record === undefined && currentStr < today) {
            // Missed past day
            points -= 10;
          }
        }
        
        // Next day
        const d = new Date(currentStr);
        d.setUTCDate(d.getUTCDate() + 1);
        currentStr = d.toISOString().split('T')[0];
      }
    });

    points = Math.max(0, points);

    const sortedDates = Array.from(allDates).filter(date => date <= today).sort();
    
    let current = 0;
    let best = 0;
    let tempStreak = 0;

    // Logika sederhana: streak dihitung berdasarkan hari di mana minimal 1 habit selesai
    // Untuk aplikasi nyata, logikanya bisa disesuaikan (misal: semua habit harus selesai)
    
    for (let i = 0; i < sortedDates.length; i++) {
      const date = sortedDates[i];
      
      // Cek apakah ada habit yang selesai pada tanggal ini
      const isDayCompleted = habits.some(habit => {
        const record = habit.records[date];
        if (habit.type === 'boolean') {
          return record === 'selesai';
        } else {
          return Number(record) >= habit.target;
        }
      });

      if (isDayCompleted) {
        tempStreak++;
        best = Math.max(best, tempStreak);
        
        // Cek jika ini adalah hari ini atau kemarin untuk current streak
        const dateObj = new Date(date);
        const todayObj = new Date(today);
        const diffTime = Math.abs(todayObj.getTime() - dateObj.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 1) {
          current = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    // Jika hari ini dan kemarin tidak ada yang selesai, current streak putus
    const lastDate = sortedDates[sortedDates.length - 1];
    if (lastDate) {
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      const diffTime = Math.abs(todayObj.getTime() - lastDateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 1) {
        current = 0;
      }
    }

    // Calculate badges
    const newBadges: string[] = [];
    if (points >= 50) newBadges.push('Pemula');
    if (points >= 200) newBadges.push('Konsisten');
    if (points >= 500) newBadges.push('Master Habit');
    if (points >= 1000) newBadges.push('Legenda');
    if (current >= 3) newBadges.push('On Fire');
    if (best >= 10) newBadges.push('Unstoppable');

    const streakExtended = current > prevCurrentStreak && current > 0;
    const newBestStreak = best > prevBestStreak && best > 0;

    set({ 
      currentStreak: current, 
      bestStreak: best, 
      totalPoints: points, 
      badges: newBadges,
      streakExtended,
      newBestStreak
    });
  }
}));
