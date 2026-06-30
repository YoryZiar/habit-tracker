import React, { useEffect, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { getWeekDates, formatDate, MONTH_NAMES_SHORT } from '../utils/dateUtils';
import { HabitRecord } from '../services/googleSheetsService';
import HabitRow from './HabitRow';
import AddHabitModal from './AddHabitModal';
import EditHabitModal from './EditHabitModal';
import HabitCalendarModal from './HabitCalendarModal';
import { Plus, Flame, Trophy, Calendar, ListTodo, Star, Medal, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { getIconComponent } from './IconPicker';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface DashboardProps {
  onNavigate: (page: 'dashboard' | 'todos' | 'history') => void;
}

interface ChartDataPoint {
  name: string;
  persentase: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { habits, isLoading, error, fetchHabits, currentStreak, bestStreak, totalPoints, level, currentLevelPoints, nextLevelPoints, badges, reorderHabits, streakExtended, newBestStreak, clearStreakAnimations, deleteHabit } = useHabitStore();
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChartHabitId, setSelectedChartHabitId] = useState<string>('all');
  const [editingHabit, setEditingHabit] = useState<HabitRecord | null>(null);
  const [calendarHabit, setCalendarHabit] = useState<HabitRecord | null>(null);
  const [deletingHabit, setDeletingHabit] = useState<HabitRecord | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = habits.findIndex((h) => h.id === active.id);
      const newIndex = habits.findIndex((h) => h.id === over.id);

      const newHabits = arrayMove(habits, oldIndex, newIndex);
      reorderHabits(newHabits);
    }
  };

  const calculateWeeklyProgress = () => {
    if (habits.length === 0 || weekDates.length === 0) return 0;
    
    let totalProgress = 0;
    habits.forEach(habit => {
      let completed = 0;
      if (habit.type === 'boolean') {
        weekDates.forEach(date => {
          const dateStr = formatDate(date);
          if (habit.records[dateStr] === 'selesai') {
            completed += 1;
          }
        });
        totalProgress += Math.min(100, Math.round((completed / habit.target) * 100));
      } else {
        let totalValue = 0;
        let scheduledDays = 0;
        weekDates.forEach(date => {
          const dateStr = formatDate(date);
          const dayOfWeek = date.getDay();
          
          let isScheduled = false;
          if (!habit.recurrence || habit.recurrence === 'daily') {
            isScheduled = true;
          } else if (habit.recurrence === 'specific_days') {
            isScheduled = habit.specificDays?.includes(dayOfWeek) ?? false;
          }
          
          if (isScheduled) {
            scheduledDays++;
          }

          const val = Number(habit.records[dateStr]) || 0;
          totalValue += val;
        });
        const weeklyTarget = scheduledDays * habit.target;
        totalProgress += weeklyTarget > 0 ? Math.min(100, Math.round((totalValue / weeklyTarget) * 100)) : 0;
      }
    });
    
    return Math.round(totalProgress / habits.length);
  };

  const weeklyProgress = calculateWeeklyProgress();

  const getDailySummary = () => {
    if (habits.length === 0) return { scheduledCount: 0, completedCount: 0, pointsToday: 0 };

    const today = new Date();
    const todayStr = formatDate(today);
    const dayOfWeek = new Date(todayStr).getUTCDay();

    let scheduledCount = 0;
    let completedCount = 0;
    let pointsToday = 0;

    const scheduledHabits = habits.filter(habit => {
      const habitStartDate = habit.createdAt ? habit.createdAt.split('T')[0] : '2000-01-01';
      if (todayStr < habitStartDate) return false;

      if (!habit.recurrence || habit.recurrence === 'daily') {
        return true;
      } else if (habit.recurrence === 'specific_days') {
        return habit.specificDays?.includes(dayOfWeek) ?? false;
      }
      return false;
    });

    scheduledCount = scheduledHabits.length;

    let allCompletedOrIzin = true;
    let hasSelesai = false;

    scheduledHabits.forEach(habit => {
      const record = habit.records[todayStr];
      let isSuccess = false;
      let isIzin = record === 'izin';

      if (habit.type === 'boolean') {
        isSuccess = record === 'selesai';
        if (record === 'selesai') {
          pointsToday += 20;
        } else if (record === 'gagal') {
          pointsToday -= 30;
        } else if (record === 'izin') {
          pointsToday -= 5;
        } else if (!record) {
          pointsToday -= 5;
        }
      } else if (habit.type === 'quantitative') {
        isSuccess = record !== undefined && Number(record) >= habit.target;
        if (record !== undefined && Number(record) >= habit.target) {
          pointsToday += 20;
        } else if (record !== undefined && Number(record) < habit.target) {
          pointsToday -= 30;
        } else if (record === undefined) {
          pointsToday -= 5;
        }
      }

      if (isSuccess) {
        completedCount++;
        hasSelesai = true;
      } else if (!isIzin) {
        allCompletedOrIzin = false;
      }
    });

    if (scheduledCount > 0 && allCompletedOrIzin && hasSelesai) {
      const streakBonus = Math.min(50, currentStreak * 5);
      pointsToday += streakBonus;
    }

    return {
      scheduledCount,
      completedCount,
      pointsToday
    };
  };

  const dailySummary = getDailySummary();

  useEffect(() => {
    fetchHabits();
    const dates = getWeekDates();
    setWeekDates(dates);
  }, [fetchHabits]);

  useEffect(() => {
    // Generate data for chart (Last 4 weeks)
    if (habits.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const data = [];
      const habitsToProcess = selectedChartHabitId === 'all' 
        ? habits 
        : habits.filter(h => h.id === selectedChartHabitId);

      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (w * 7 + 6));
        const weekEnd = new Date(today);
        weekEnd.setDate(today.getDate() - (w * 7));

        let completed = 0;
        let total = 0;

        for (let d = 0; d <= 6; d++) {
          const currentDate = new Date(weekStart);
          currentDate.setDate(weekStart.getDate() + d);
          const dateStr = formatDate(currentDate);

          habitsToProcess.forEach(habit => {
            total++;
            const record = habit.records[dateStr];
            if (habit.type === 'boolean' && record === 'selesai') {
              completed++;
            } else if (habit.type === 'quantitative' && Number(record) >= habit.target) {
              completed++;
            }
          });
        }

        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const startLabel = `${weekStart.getDate()} ${MONTH_NAMES_SHORT[weekStart.getMonth()]}`;
        const endLabel = `${weekEnd.getDate()} ${MONTH_NAMES_SHORT[weekEnd.getMonth()]}`;

        data.push({
          name: w === 0 ? 'Minggu Ini' : `${startLabel} - ${endLabel}`,
          persentase: percentage
        });
      }
      setChartData(data);
    } else {
      setChartData([]);
    }
  }, [habits, selectedChartHabitId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-green-100 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-green-600" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Weekly Habit Tracker</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <Star className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-blue-700">Lvl {level || 1}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 shadow-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Daily Summary */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 shadow-sm text-white mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left">
            <h2 className="text-2xl font-bold mb-1">Ringkasan Hari Ini</h2>
            <p className="text-green-100 text-sm">
              {dailySummary.completedCount} dari {dailySummary.scheduledCount} habit selesai
            </p>
          </div>
          <div className="flex gap-4 sm:gap-6 w-full sm:w-auto justify-center sm:justify-end">
            <div className="flex flex-col items-center bg-white/20 rounded-xl p-3 min-w-[100px] backdrop-blur-sm">
              <ListTodo className="w-6 h-6 mb-1 text-green-100" />
              <span className="text-2xl font-bold">{dailySummary.completedCount}/{dailySummary.scheduledCount}</span>
              <span className="text-xs text-green-100 uppercase tracking-wider font-medium">Selesai</span>
            </div>
            <div className="flex flex-col items-center bg-white/20 rounded-xl p-3 min-w-[100px] backdrop-blur-sm">
              <TrendingUp className="w-6 h-6 mb-1 text-green-100" />
              <span className="text-2xl font-bold">{dailySummary.pointsToday > 0 ? `+${dailySummary.pointsToday}` : dailySummary.pointsToday}</span>
              <span className="text-xs text-green-100 uppercase tracking-wider font-medium">XP Hari Ini</span>
            </div>
            <div className="flex flex-col items-center bg-white/20 rounded-xl p-3 min-w-[100px] backdrop-blur-sm">
              <Flame className="w-6 h-6 mb-1 text-orange-200" />
              <span className="text-2xl font-bold">{currentStreak}</span>
              <span className="text-xs text-green-100 uppercase tracking-wider font-medium">Streak</span>
            </div>
          </div>
        </div>

        {/* Gamification Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 flex items-center gap-4 relative overflow-hidden"
            animate={streakExtended ? { scale: [1, 1.05, 1], borderColor: ['#ffedd5', '#f97316', '#ffedd5'] } : {}}
            transition={{ duration: 0.5 }}
            onAnimationComplete={() => clearStreakAnimations()}
          >
            {streakExtended && (
              <motion.div 
                className="absolute inset-0 bg-orange-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
              />
            )}
            <div className="bg-orange-100 p-4 rounded-full shrink-0 relative">
              <Flame className="w-8 h-8 text-orange-500" />
              {streakExtended && (
                <motion.div
                  className="absolute -top-1 -right-1 text-orange-500 font-bold text-xs bg-white rounded-full px-1 shadow-sm"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: -10, opacity: [0, 1, 0] }}
                  transition={{ duration: 1 }}
                >
                  +1
                </motion.div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current Streak</p>
              <p className="text-3xl font-bold text-gray-900">{currentStreak} <span className="text-lg font-normal text-gray-500">Hari</span></p>
            </div>
          </motion.div>
          
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-yellow-100 flex items-center gap-4 relative overflow-hidden"
            animate={newBestStreak ? { scale: [1, 1.05, 1], borderColor: ['#fef9c3', '#eab308', '#fef9c3'] } : {}}
            transition={{ duration: 0.5 }}
          >
            {newBestStreak && (
              <motion.div 
                className="absolute inset-0 bg-yellow-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
              />
            )}
            <div className="bg-yellow-100 p-4 rounded-full shrink-0 relative">
              <Trophy className="w-8 h-8 text-yellow-500" />
              {newBestStreak && (
                <motion.div
                  className="absolute -top-2 -right-2 text-yellow-500 font-bold text-xs bg-white rounded-full px-1 shadow-sm border border-yellow-200"
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 12 }}
                >
                  NEW!
                </motion.div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Best Streak</p>
              <p className="text-3xl font-bold text-gray-900">{bestStreak} <span className="text-lg font-normal text-gray-500">Hari</span></p>
            </div>
          </motion.div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 flex items-center gap-4">
            <div className="bg-blue-100 p-4 rounded-full shrink-0">
              <Star className="w-8 h-8 text-blue-500" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Level {level || 1}</p>
                <p className="text-xs font-bold text-blue-600">{(totalPoints || 0) - (currentLevelPoints || 0)} / {(nextLevelPoints || 100) - (currentLevelPoints || 0)} XP</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, (((totalPoints || 0) - (currentLevelPoints || 0)) / ((nextLevelPoints || 100) - (currentLevelPoints || 0))) * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-purple-100 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-2">
              <Medal className="w-5 h-5 text-purple-500" />
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Badges</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(!badges || badges.length === 0) ? (
                <span className="text-sm text-gray-400 italic">Belum ada badge</span>
              ) : (
                badges.map((badge, idx) => (
                  <span key={idx} className="bg-purple-100 text-purple-700 text-xs font-bold px-2.5 py-1 rounded-full">
                    {badge}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Habits Grid */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Habit Minggu Ini</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah Habit</span>
            </button>
          </div>
          
          <div className="space-y-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={habits.map((h) => h.id)}
                strategy={verticalListSortingStrategy}
              >
                {habits.map(habit => (
                  <HabitRow 
                    key={habit.id} 
                    habit={habit} 
                    weekDates={weekDates} 
                    onEdit={() => setEditingHabit(habit)}
                    onCalendar={() => setCalendarHabit(habit)}
                    onDelete={() => setDeletingHabit(habit)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            
            {habits.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Belum ada habit. Tambahkan habit pertama Anda!</p>
              </div>
            )}

            {habits.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between mt-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800">Progres Keseluruhan Minggu Ini</h3>
                  <p className="text-xs text-gray-500">Rata-rata pencapaian dari semua habit</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-green-500 h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${weeklyProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-10 text-right">{weeklyProgress}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Analytics */}
        <div className="mb-8">
          {/* Analytics Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-bold text-gray-800">Tren Keberhasilan (1 Bulan Terakhir)</h2>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {selectedChartHabitId !== 'all' && (
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    {(() => {
                      const selectedHabit = habits.find(h => h.id === selectedChartHabitId);
                      const Icon = getIconComponent(selectedHabit?.icon);
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                )}
                <select
                  value={selectedChartHabitId}
                  onChange={(e) => setSelectedChartHabitId(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5 min-w-[200px] w-full sm:w-auto"
                >
                  <option value="all">Semua Habit</option>
                  {habits.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="h-[350px] w-full flex items-center justify-center">
              {isLoading || habits.length === 0 ? (
                <p className="text-gray-500 text-center">Grafik Tren Habit akan ditampilkan di sini</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0fdf4" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [`${value}%`, 'Keberhasilan']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="persentase" 
                      stroke="#16a34a" 
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 6, fill: '#16a34a', strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
        </div>
        </div>
      </main>

      <AddHabitModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />

      {editingHabit && (
        <EditHabitModal 
          isOpen={!!editingHabit} 
          onClose={() => setEditingHabit(null)} 
          habit={editingHabit} 
        />
      )}

      {calendarHabit && (
        <HabitCalendarModal
          isOpen={!!calendarHabit}
          onClose={() => setCalendarHabit(null)}
          habit={calendarHabit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingHabit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ position: 'fixed' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Habit</h3>
            <p className="text-gray-500 text-sm mb-6">
              Apakah Anda yakin ingin menghapus habit "{deletingHabit.name}"? Semua data riwayat untuk habit ini akan hilang dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingHabit(null)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (deletingHabit) deleteHabit(deletingHabit.id);
                  setDeletingHabit(null);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
