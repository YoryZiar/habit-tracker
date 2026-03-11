import React, { useEffect, useState } from 'react';
import { useAuthStore, useHabitStore } from '../store/useHabitStore';
import { getWeekDates, formatDate } from '../utils/dateUtils';
import HabitRow from './HabitRow';
import AddHabitModal from './AddHabitModal';
import { LogOut, Plus, Flame, Trophy, Calendar, ListTodo } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DashboardProps {
  onNavigate: (page: 'dashboard' | 'todos') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const logout = useAuthStore(state => state.logout);
  const { habits, isLoading, error, fetchHabits, currentStreak, bestStreak } = useHabitStore();
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    fetchHabits();
    const dates = getWeekDates();
    setWeekDates(dates);
  }, [fetchHabits]);

  useEffect(() => {
    // Generate data for chart
    if (habits.length > 0 && weekDates.length > 0) {
      const data = weekDates.map(date => {
        const dateStr = formatDate(date);
        let completed = 0;
        let total = habits.length;

        habits.forEach(habit => {
          const record = habit.records[dateStr];
          if (habit.type === 'boolean' && record === 'selesai') {
            completed++;
          } else if (habit.type === 'quantitative' && Number(record) >= habit.target) {
            completed++;
          }
        });

        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
          name: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][date.getDay() === 0 ? 6 : date.getDay() - 1],
          persentase: percentage
        };
      });
      setChartData(data);
    }
  }, [habits, weekDates]);

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
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('todos')}
              className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium"
            >
              <ListTodo className="w-4 h-4" />
              <span className="hidden sm:inline">Todo List</span>
            </button>
            <div className="w-px h-6 bg-gray-200"></div>
            <button
              onClick={() => setIsLogoutModalOpen(true)}
              className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors text-sm font-medium shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 flex items-center gap-4">
            <div className="bg-orange-100 p-4 rounded-full">
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Current Streak</p>
              <p className="text-3xl font-bold text-gray-900">{currentStreak} <span className="text-lg font-normal text-gray-500">Hari</span></p>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-yellow-100 flex items-center gap-4">
            <div className="bg-yellow-100 p-4 rounded-full">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Best Streak</p>
              <p className="text-3xl font-bold text-gray-900">{bestStreak} <span className="text-lg font-normal text-gray-500">Hari</span></p>
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
            {habits.map(habit => (
              <HabitRow key={habit.id} habit={habit} weekDates={weekDates} />
            ))}
            
            {habits.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">Belum ada habit. Tambahkan habit pertama Anda!</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Analytics */}
        <div className="mb-8">
          {/* Analytics Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 w-full">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Tren Keberhasilan Harian</h2>
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

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Keluar</h3>
            <p className="text-gray-500 text-sm mb-6">
              Apakah Anda yakin ingin keluar dari aplikasi? Anda harus login kembali untuk mengakses data habit Anda.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setIsLogoutModalOpen(false);
                  logout();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
