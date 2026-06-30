import { HabitRecord } from '../services/googleSheetsService';
import { formatDate } from './dateUtils';
import { POINTS, LEVEL_BASE_XP, LEVEL_XP_INCREMENT } from '../constants/gamification';

/**
 * Mengecek apakah sebuah habit terjadwal pada tanggal tertentu.
 * Fungsi ini menggantikan logika `isScheduled` yang tersebar di 5+ tempat.
 *
 * @param habit - HabitRecord yang diperiksa
 * @param date - Tanggal yang diperiksa (Date object)
 * @returns true jika habit terjadwal pada hari tersebut
 */
export const isHabitScheduledOn = (habit: HabitRecord, date: Date): boolean => {
  if (!habit.recurrence || habit.recurrence === 'daily') return true;
  if (habit.recurrence === 'specific_days') {
    const dayOfWeek = date.getUTCDay();
    return habit.specificDays?.includes(dayOfWeek) ?? false;
  }
  return false;
};

/**
 * Mengecek apakah record habit pada tanggal tertentu dianggap berhasil.
 */
export const isHabitSuccess = (habit: HabitRecord, record: string | number | undefined): boolean => {
  if (habit.type === 'boolean') return record === 'selesai';
  return record !== undefined && Number(record) >= habit.target;
};

export interface GamificationResult {
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
  badges: string[];
}

/**
 * Menghitung semua nilai gamifikasi dari daftar habit.
 * Dipindahkan dari useHabitStore agar bisa di-test dan di-reuse secara independen.
 */
export const calculateGamification = (habits: HabitRecord[]): GamificationResult => {
  if (habits.length === 0) {
    return {
      currentStreak: 0,
      bestStreak: 0,
      totalPoints: 0,
      level: 1,
      currentLevelPoints: 0,
      nextLevelPoints: LEVEL_BASE_XP,
      badges: [],
    };
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
      const isScheduled = isHabitScheduledOn(habit, dateObj);

      if (habit.type === 'boolean') {
        if (record === 'selesai') {
          points += POINTS.SUCCESS;
        } else if (record === 'gagal') {
          points += POINTS.FAIL;
        } else if (record === 'izin') {
          points += POINTS.IZIN;
        } else if (!record && currentStr < today && isScheduled) {
          points += POINTS.FAIL;
        } else if (!record && currentStr === today && isScheduled) {
          points += POINTS.IZIN;
        }
      } else if (habit.type === 'quantitative') {
        if (record !== undefined && Number(record) >= habit.target) {
          points += POINTS.SUCCESS;
        } else if (record !== undefined && Number(record) < habit.target) {
          points += POINTS.FAIL;
        } else if (record === undefined && currentStr < today && isScheduled) {
          points += POINTS.FAIL;
        } else if (record === undefined && currentStr === today && isScheduled) {
          points += POINTS.IZIN;
        }
      }

      const d = new Date(currentStr);
      d.setUTCDate(d.getUTCDate() + 1);
      currentStr = d.toISOString().split('T')[0];
    }
  });

  points = Math.max(0, points);

  const sortedDates = Array.from(allDates).filter(date => date <= today).sort();

  let tempStreak = 0;
  let best = 0;

  for (const dateStr of sortedDates) {
    const dateObj = new Date(dateStr);

    const scheduledHabits = habits.filter(habit => {
      const habitStartDate = habit.createdAt ? habit.createdAt.split('T')[0] : '2000-01-01';
      if (dateStr < habitStartDate) return false;
      return isHabitScheduledOn(habit, dateObj);
    });

    if (scheduledHabits.length > 0) {
      let allCompletedOrIzin = true;
      let anyFailed = false;
      let hasSelesai = false;

      scheduledHabits.forEach(habit => {
        const record = habit.records[dateStr];
        const success = isHabitSuccess(habit, record);
        const isIzin = record === 'izin';

        if (success) {
          hasSelesai = true;
        } else if (!isIzin) {
          allCompletedOrIzin = false;
          if (record === 'gagal' || dateStr < today) {
            anyFailed = true;
          }
        }
      });

      if (allCompletedOrIzin && hasSelesai) {
        tempStreak++;
        best = Math.max(best, tempStreak);
        const streakBonus = Math.min(POINTS.STREAK_BONUS_MAX, tempStreak * POINTS.STREAK_BONUS_PER_DAY);
        points += streakBonus;
      } else if (anyFailed) {
        tempStreak = 0;
      }
    }
  }

  const current = tempStreak;

  // Hitung level
  let level = 1;
  let currentLevelPoints = 0;
  let nextLevelPoints = LEVEL_BASE_XP;
  while (points >= nextLevelPoints) {
    level++;
    currentLevelPoints = nextLevelPoints;
    nextLevelPoints = currentLevelPoints + LEVEL_XP_INCREMENT * (level + 1);
  }

  // Hitung badges
  const badges: string[] = [];
  if (level >= 3) badges.push('Pemula');
  if (level >= 10) badges.push('Konsisten');
  if (level >= 25) badges.push('Master Habit');
  if (level >= 50) badges.push('Legenda');
  if (current >= 3) badges.push('On Fire');
  if (best >= 10) badges.push('Unstoppable');
  if (best >= 30) badges.push('Titan');

  return {
    currentStreak: current,
    bestStreak: best,
    totalPoints: points,
    level,
    currentLevelPoints,
    nextLevelPoints,
    badges,
  };
};
