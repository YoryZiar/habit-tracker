import { create } from 'zustand';
import { googleSheetsService, HabitRecord } from '../services/googleSheetsService';
import { formatDate } from '../utils/dateUtils';
import { handleAuthError } from '../utils/authUtils';
import { calculateGamification } from '../utils/gamificationUtils';
import toast from 'react-hot-toast';

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

let habitUpdateQueue: Record<string, HabitRecord> = {};
let habitSyncTimeout: NodeJS.Timeout | null = null;
let lastSyncedHabits: HabitRecord[] | null = null;

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
    
    if (Object.keys(habitUpdateQueue).length === 0) {
      lastSyncedHabits = habits;
    }
    
    const habitIndex = habits.findIndex(h => h.id === habitId);
    
    if (habitIndex === -1) return;
    
    const updatedHabit = { ...habits[habitIndex] };
    updatedHabit.records = { ...updatedHabit.records, [date]: value };
    
    // Optimistic update
    const newHabits = [...habits];
    newHabits[habitIndex] = updatedHabit;
    set({ habits: newHabits });
    get().calculateGamification();
    
    habitUpdateQueue[updatedHabit.id] = updatedHabit;
    
    if (habitSyncTimeout) clearTimeout(habitSyncTimeout);
    habitSyncTimeout = setTimeout(async () => {
      const habitsToUpdate = Object.values(habitUpdateQueue);
      habitUpdateQueue = {};
      
      try {
        await googleSheetsService.batchUpdateHabits(habitsToUpdate);
        lastSyncedHabits = null;
      } catch (error) {
        if (handleAuthError(error)) return;
        // Revert on error
        if (lastSyncedHabits) {
          set({ habits: lastSyncedHabits, error: 'Gagal menyimpan perubahan' });
          get().calculateGamification();
          lastSyncedHabits = null;
        }
        toast.error('Gagal menyimpan perubahan ke Google Sheets');
      }
    }, 1000);
  },
  
  editHabit: async (id, updatedData) => {
    const { habits } = get();
    
    if (Object.keys(habitUpdateQueue).length === 0) {
      lastSyncedHabits = habits;
    }
    
    const habitIndex = habits.findIndex(h => h.id === id);
    
    if (habitIndex === -1) return;
    
    const updatedHabit = { ...habits[habitIndex], ...updatedData };
    const newHabits = [...habits];
    newHabits[habitIndex] = updatedHabit;
    set({ habits: newHabits });
    get().calculateGamification();
    
    habitUpdateQueue[updatedHabit.id] = updatedHabit;
    
    if (habitSyncTimeout) clearTimeout(habitSyncTimeout);
    habitSyncTimeout = setTimeout(async () => {
      const habitsToUpdate = Object.values(habitUpdateQueue);
      habitUpdateQueue = {};
      
      try {
        await googleSheetsService.batchUpdateHabits(habitsToUpdate);
        lastSyncedHabits = null;
        toast.success('Habit berhasil diperbarui');
      } catch (error) {
        if (handleAuthError(error)) return;
        if (lastSyncedHabits) {
          set({ habits: lastSyncedHabits, error: 'Gagal mengedit habit' });
          get().calculateGamification();
          lastSyncedHabits = null;
        }
        toast.error('Gagal mengedit habit');
      }
    }, 1000);
  },
  
  addHabit: async (newHabitData) => {
    const newHabit: HabitRecord = {
      ...newHabitData,
      id: crypto.randomUUID(),
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

    const result = calculateGamification(habits);

    const streakExtended = result.currentStreak > prevCurrentStreak && result.currentStreak > 0;
    const newBestStreak = result.bestStreak > prevBestStreak && result.bestStreak > 0;

    set({
      currentStreak: result.currentStreak,
      bestStreak: result.bestStreak,
      totalPoints: result.totalPoints,
      level: result.level,
      currentLevelPoints: result.currentLevelPoints,
      nextLevelPoints: result.nextLevelPoints,
      badges: result.badges,
      streakExtended,
      newBestStreak,
    });
  }
}));
