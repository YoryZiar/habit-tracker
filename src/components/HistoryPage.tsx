import React, { useState, useMemo } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { formatDate } from '../utils/dateUtils';
import { ChevronLeft, Calendar, TrendingUp, Award, List } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface HistoryPageProps {
  onNavigate: (page: 'dashboard' | 'todos' | 'history') => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  const { habits } = useHabitStore();
  const [selectedHabitId, setSelectedHabitId] = useState<string>(habits.length > 0 ? habits[0].id : '');
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');

  const selectedHabit = useMemo(() => habits.find(h => h.id === selectedHabitId), [habits, selectedHabitId]);

  const historyData = useMemo(() => {
    if (!selectedHabit) return [];

    const today = new Date();
    const data = [];
    let totalPoints = 0;

    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const record = selectedHabit.records[dateStr];
      
      let points = 0;
      let status = 'Kosong';
      let value = 0;
      let isSuccess = false;

      if (selectedHabit.type === 'boolean') {
        if (record === 'selesai') {
          points = 10;
          status = 'Selesai';
          value = 100;
          isSuccess = true;
        } else if (record === 'gagal') {
          points = -10;
          status = 'Gagal';
          value = 0;
        } else if (record === 'izin') {
          points = -5;
          status = 'Izin';
          value = 50;
        } else if (d < new Date(new Date().setHours(0,0,0,0))) {
          points = -10;
          status = 'Terlewat';
          value = 0;
        }
      } else {
        if (record !== undefined) {
          const numRecord = Number(record);
          value = Math.min(100, Math.round((numRecord / selectedHabit.target) * 100));
          if (numRecord >= selectedHabit.target) {
            points = 10;
            status = `Tercapai (${numRecord})`;
            isSuccess = true;
          } else {
            points = -5;
            status = `Kurang (${numRecord})`;
          }
        } else if (d < new Date(new Date().setHours(0,0,0,0))) {
          points = -10;
          status = 'Terlewat';
          value = 0;
        }
      }

      totalPoints += points;

      data.push({
        date: dateStr,
        displayDate: `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()]}`,
        status,
        points,
        value,
        isSuccess,
        rawRecord: record
      });
    }

    return data;
  }, [selectedHabit]);

  const stats = useMemo(() => {
    if (!historyData.length) return { successRate: 0, totalPoints: 0, bestStreak: 0 };
    
    let successCount = 0;
    let totalPoints = 0;
    let currentStreak = 0;
    let bestStreak = 0;

    historyData.forEach(day => {
      totalPoints += day.points;
      if (day.isSuccess) {
        successCount++;
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else if (day.status !== 'Izin') {
        currentStreak = 0;
      }
    });

    return {
      successRate: Math.round((successCount / 30) * 100),
      totalPoints,
      bestStreak
    };
  }, [historyData]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="p-2 -ml-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Riwayat Habit</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {habits.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">Belum ada habit. Silakan tambahkan habit di Dashboard terlebih dahulu.</p>
          </div>
        ) : (
          <>
            {/* Habit Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
              <label htmlFor="habit-select" className="block text-sm font-medium text-gray-700 mb-2">
                Pilih Habit
              </label>
              <select
                id="habit-select"
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="w-full md:w-1/2 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
              >
                {habits.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            {selectedHabit && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100 flex items-center gap-4">
                    <div className="bg-green-100 p-4 rounded-full shrink-0">
                      <TrendingUp className="w-8 h-8 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tingkat Sukses (30 Hari)</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-full shrink-0">
                      <Award className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Poin Diperoleh (30 Hari)</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalPoints}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 flex items-center gap-4">
                    <div className="bg-orange-100 p-4 rounded-full shrink-0">
                      <Calendar className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Best Streak (30 Hari)</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.bestStreak} <span className="text-lg font-normal text-gray-500">Hari</span></p>
                    </div>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex justify-end mb-4">
                  <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex">
                    <button
                      onClick={() => setViewMode('chart')}
                      className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                        viewMode === 'chart' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      Grafik
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                        viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Daftar
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  {viewMode === 'chart' ? (
                    <div className="h-[400px] w-full">
                      <h3 className="text-lg font-bold text-gray-800 mb-6">Progres 30 Hari Terakhir</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={historyData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                          <XAxis 
                            dataKey="displayDate" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6b7280', fontSize: 11 }} 
                            dy={10} 
                            angle={-45}
                            textAnchor="end"
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#6b7280', fontSize: 12 }} 
                            dx={-10} 
                            domain={[0, 100]} 
                          />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            formatter={(value, name, props) => {
                              return [props.payload.status, 'Status'];
                            }}
                            labelFormatter={(label) => `Tanggal: ${label}`}
                          />
                          <Bar 
                            dataKey="value" 
                            radius={[4, 4, 0, 0]}
                          >
                            {historyData.map((entry, index) => (
                              <cell 
                                key={`cell-${index}`} 
                                fill={entry.isSuccess ? '#3b82f6' : entry.status === 'Izin' ? '#facc15' : '#ef4444'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-6">Riwayat Detail 30 Hari Terakhir</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="py-3 px-4 text-sm font-semibold text-gray-600">Tanggal</th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-600">Status / Nilai</th>
                              <th className="py-3 px-4 text-sm font-semibold text-gray-600">Poin</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historyData.slice().reverse().map((day, idx) => (
                              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="py-3 px-4 text-sm text-gray-800 font-medium">{day.displayDate}</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    day.isSuccess ? 'bg-green-100 text-green-800' : 
                                    day.status === 'Izin' ? 'bg-yellow-100 text-yellow-800' : 
                                    day.status === 'Kosong' ? 'bg-gray-100 text-gray-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {day.status}
                                  </span>
                                </td>
                                <td className={`py-3 px-4 text-sm font-bold ${
                                  day.points > 0 ? 'text-green-600' : day.points < 0 ? 'text-red-600' : 'text-gray-500'
                                }`}>
                                  {day.points > 0 ? `+${day.points}` : day.points}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
