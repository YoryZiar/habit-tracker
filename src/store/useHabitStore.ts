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
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
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
  totalPoints: 0,
  level: 1,
  currentLevelPoints: 0,
  nextLevelPoints: 100,
  badges: [],
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
      set({ currentStreak: 0, bestStreak: 0, totalPoints: 0, level: 1, currentLevelPoints: 0, nextLevelPoints: 100, badges: [] });
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
        
        const dateObj = new Date(currentStr);
        const dayOfWeek = dateObj.getUTCDay();
        
        let isScheduled = false;
        if (!habit.recurrence || habit.recurrence === 'daily') {
          isScheduled = true;
        } else if (habit.recurrence === 'specific_days') {
          isScheduled = habit.specificDays?.includes(dayOfWeek) ?? false;
        }

        // Calculate points
        if (habit.type === 'boolean') {
          if (record === 'selesai') {
            points += 20;
          } else if (record === 'gagal') {
            points -= 10;
          } else if (!record && currentStr < today && isScheduled) {
            // Missed past scheduled day
            points -= 10;
          }
        } else if (habit.type === 'quantitative') {
          if (record !== undefined && Number(record) >= habit.target) {
            points += 20;
          } else if (record !== undefined && Number(record) < habit.target) {
            points -= 10;
          } else if (record === undefined && currentStr < today && isScheduled) {
            // Missed past scheduled day
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

    for (let i = 0; i < sortedDates.length; i++) {
      const dateStr = sortedDates[i];
      const dateObj = new Date(dateStr);
      const dayOfWeek = dateObj.getUTCDay();
      
      const scheduledHabits = habits.filter(habit => {
        const habitStartDate = habit.createdAt ? habit.createdAt.split('T')[0] : '2000-01-01';
        if (dateStr < habitStartDate) return false;

        if (!habit.recurrence || habit.recurrence === 'daily') {
          return true;
        } else if (habit.recurrence === 'specific_days') {
          return habit.specificDays?.includes(dayOfWeek) ?? false;
        }
        return false;
      });

      if (scheduledHabits.length > 0) {
        let allCompleted = true;
        let anyFailed = false;

        scheduledHabits.forEach(habit => {
          const record = habit.records[dateStr];
          let isSuccess = false;
          
          if (habit.type === 'boolean') {
            isSuccess = record === 'selesai';
          } else {
            isSuccess = record !== undefined && Number(record) >= habit.target;
          }

          if (!isSuccess) {
            allCompleted = false;
            if (record === 'gagal') {
              anyFailed = true;
            } else if (record !== 'izin' && dateStr < today) {
              anyFailed = true;
            }
          }
        });

        if (allCompleted) {
          tempStreak++;
          best = Math.max(best, tempStreak);
          // Add streak bonus points (up to +50 per day)
          const streakBonus = Math.min(50, tempStreak * 5);
          points += streakBonus;
        } else if (anyFailed) {
          tempStreak = 0;
        }
      }
    }
    
    current = tempStreak;

    // Calculate level
    let level = 1;
    let currentLevelPoints = 0;
    let nextLevelPoints = 100;
    while (points >= nextLevelPoints) {
      level++;
      currentLevelPoints = nextLevelPoints;
      nextLevelPoints = currentLevelPoints + 50 * (level + 1);
    }

    // Calculate badges based on new levels and streaks
    const newBadges: string[] = [];
    if (level >= 3) newBadges.push('Pemula');
    if (level >= 10) newBadges.push('Konsisten');
    if (level >= 25) newBadges.push('Master Habit');
    if (level >= 50) newBadges.push('Legenda');
    if (current >= 3) newBadges.push('On Fire');
    if (best >= 10) newBadges.push('Unstoppable');
    if (best >= 30) newBadges.push('Titan');

    const streakExtended = current > prevCurrentStreak && current > 0;
    const newBestStreak = best > prevBestStreak && best > 0;

    set({ 
      currentStreak: current, 
      bestStreak: best, 
      totalPoints: points, 
      level,
      currentLevelPoints,
      nextLevelPoints,
      badges: newBadges,
      streakExtended,
      newBestStreak
    });
  }
}));
