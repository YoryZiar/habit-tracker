import React, { useEffect, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { getWeekDates, formatDate } from '../utils/dateUtils';
import HabitRow from './HabitRow';
import AddHabitModal from './AddHabitModal';
import EditHabitModal from './EditHabitModal';
import HabitCalendarModal from './HabitCalendarModal';
import { Plus, Flame, Trophy, Calendar, ListTodo, Star, Medal, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
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

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { habits, isLoading, error, fetchHabits, currentStreak, bestStreak, totalPoints, badges, reorderHabits } = useHabitStore();
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedChartHabitId, setSelectedChartHabitId] = useState<string>('all');
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [calendarHabit, setCalendarHabit] = useState<any>(null);
  const [deletingHabit, setDeletingHabit] = useState<any>(null);

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
        weekDates.forEach(date => {
          const dateStr = formatDate(date);
          const val = Number(habit.records[dateStr]) || 0;
          totalValue += val;
        });
        totalProgress += Math.min(100, Math.round((totalValue / habit.target) * 100));
      }
    });
    
    return Math.round(totalProgress / habits.length);
  };

  const weeklyProgress = calculateWeeklyProgress();

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
        
        const startLabel = `${weekStart.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][weekStart.getMonth()]}`;
        const endLabel = `${weekEnd.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][weekEnd.getMonth()]}`;

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
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 shadow-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Gamification Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div 
            className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 flex items-center gap-4 relative overflow-hidden"
            animate={useHabitStore.getState().streakExtended ? { scale: [1, 1.05, 1], borderColor: ['#ffedd5', '#f97316', '#ffedd5'] } : {}}
            transition={{ duration: 0.5 }}
            onAnimationComplete={() => useHabitStore.getState().clearStreakAnimations()}
          >
            {useHabitStore.getState().streakExtended && (
              <motion.div 
                className="absolute inset-0 bg-orange-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
              />
            )}
            <div className="bg-orange-100 p-4 rounded-full shrink-0 relative">
              <Flame className="w-8 h-8 text-orange-500" />
              {useHabitStore.getState().streakExtended && (
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
            animate={useHabitStore.getState().newBestStreak ? { scale: [1, 1.05, 1], borderColor: ['#fef9c3', '#eab308', '#fef9c3'] } : {}}
            transition={{ duration: 0.5 }}
          >
            {useHabitStore.getState().newBestStreak && (
              <motion.div 
                className="absolute inset-0 bg-yellow-500/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.5 }}
              />
            )}
            <div className="bg-yellow-100 p-4 rounded-full shrink-0 relative">
              <Trophy className="w-8 h-8 text-yellow-500" />
              {useHabitStore.getState().newBestStreak && (
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
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Points</p>
              <p className="text-3xl font-bold text-gray-900">{totalPoints || 0} <span className="text-lg font-normal text-gray-500">Pts</span></p>
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
              <select
                value={selectedChartHabitId}
                onChange={(e) => setSelectedChartHabitId(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-green-500 focus:border-green-500 block p-2.5 min-w-[200px]"
              >
                <option value="all">Semua Habit</option>
                {habits.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
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
                  useHabitStore.getState().deleteHabit(deletingHabit.id);
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
