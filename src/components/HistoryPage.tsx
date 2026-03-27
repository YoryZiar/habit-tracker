import React, { useState, useMemo } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { formatDate } from '../utils/dateUtils';
import { Calendar, TrendingUp, Award, List, Activity, Star } from 'lucide-react';
import { getIconComponent } from './IconPicker';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface HistoryPageProps {
  onNavigate: (page: 'dashboard' | 'todos' | 'history') => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
  const { habits, level } = useHabitStore();
  const [selectedHabitId, setSelectedHabitId] = useState<string>(habits.length > 0 ? habits[0].id : '');
  const [viewMode, setViewMode] = useState<'chart' | 'list'>('chart');
  const [timeRange, setTimeRange] = useState<'30days' | '12months'>('30days');

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
      
      const dayOfWeek = d.getDay();
      let isScheduled = false;
      if (!selectedHabit.recurrence || selectedHabit.recurrence === 'daily') {
        isScheduled = true;
      } else if (selectedHabit.recurrence === 'specific_days') {
        isScheduled = selectedHabit.specificDays?.includes(dayOfWeek) ?? false;
      }

      let points = 0;
      let status = 'Kosong';
      let value = 0;
      let isSuccess = false;

      if (selectedHabit.type === 'boolean') {
        if (record === 'selesai') {
          points = 20;
          status = 'Selesai';
          value = 100;
          isSuccess = true;
        } else if (record === 'gagal') {
          points = -10;
          status = 'Gagal';
          value = 0;
        } else if (record === 'izin') {
          points = 0;
          status = 'Izin';
          value = 50;
        } else if (d < new Date(new Date().setHours(0,0,0,0)) && isScheduled) {
          points = -10;
          status = 'Terlewat';
          value = 0;
        }
      } else {
        if (record !== undefined) {
          const numRecord = Number(record);
          value = Math.min(100, Math.round((numRecord / selectedHabit.target) * 100));
          if (numRecord >= selectedHabit.target) {
            points = 20;
            status = `Tercapai (${numRecord})`;
            isSuccess = true;
          } else {
            points = -10;
            status = `Kurang (${numRecord})`;
          }
        } else if (d < new Date(new Date().setHours(0,0,0,0)) && isScheduled) {
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

  const monthlyData = useMemo(() => {
    if (!selectedHabit) return [];

    const data = [];
    const today = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'][d.getMonth()];
      const year = d.getFullYear();
      
      let daysInMonth = new Date(year, d.getMonth() + 1, 0).getDate();
      if (i === 0) {
        daysInMonth = today.getDate();
      }

      let successCount = 0;
      let totalPoints = 0;
      let validDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, d.getMonth(), day);
        const dateStr = formatDate(currentDate);
        const record = selectedHabit.records[dateStr];
        
        const dayOfWeek = currentDate.getDay();
        let isScheduled = false;
        if (!selectedHabit.recurrence || selectedHabit.recurrence === 'daily') {
          isScheduled = true;
        } else if (selectedHabit.recurrence === 'specific_days') {
          isScheduled = selectedHabit.specificDays?.includes(dayOfWeek) ?? false;
        }

        if (isScheduled) {
          validDays++;
        }
        
        if (selectedHabit.type === 'boolean') {
          if (record === 'selesai') {
            successCount++;
            totalPoints += 20;
          } else if (record === 'gagal') {
            totalPoints -= 10;
          } else if (record === 'izin') {
            totalPoints += 0;
          } else if (currentDate < new Date(new Date().setHours(0,0,0,0)) && isScheduled) {
            totalPoints -= 10;
          }
        } else {
          if (record !== undefined) {
            const numRecord = Number(record);
            if (numRecord >= selectedHabit.target) {
              successCount++;
              totalPoints += 20;
            } else {
              totalPoints -= 10;
            }
          } else if (currentDate < new Date(new Date().setHours(0,0,0,0)) && isScheduled) {
            totalPoints -= 10;
          }
        }
      }

      const successRate = validDays > 0 ? Math.round((successCount / validDays) * 100) : 0;

      data.push({
        month: `${monthName} ${year.toString().slice(2)}`,
        fullMonth: `${monthName} ${year}`,
        successRate,
        totalPoints,
        successCount,
        validDays
      });
    }

    return data;
  }, [selectedHabit]);

  const stats = useMemo(() => {
    if (timeRange === '30days') {
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
    } else {
      if (!monthlyData.length) return { successRate: 0, totalPoints: 0, bestStreak: 0 };
      
      let totalSuccess = 0;
      let totalValidDays = 0;
      let totalPoints = 0;

      monthlyData.forEach(month => {
        totalSuccess += month.successCount;
        totalValidDays += month.validDays;
        totalPoints += month.totalPoints;
      });

      let currentStreak = 0;
      let bestStreak = 0;
      const today = new Date();
      for (let i = 365; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        const record = selectedHabit?.records[dateStr];
        
        let isSuccess = false;
        if (selectedHabit?.type === 'boolean') {
          if (record === 'selesai') isSuccess = true;
        } else {
          if (record !== undefined && Number(record) >= (selectedHabit?.target || 0)) {
            isSuccess = true;
          }
        }

        if (isSuccess) {
          currentStreak++;
          bestStreak = Math.max(bestStreak, currentStreak);
        } else if (record !== 'izin') {
          currentStreak = 0;
        }
      }

      return {
        successRate: totalValidDays > 0 ? Math.round((totalSuccess / totalValidDays) * 100) : 0,
        totalPoints,
        bestStreak
      };
    }
  }, [historyData, monthlyData, timeRange, selectedHabit]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-12">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Riwayat Habit</h1>
            </div>
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
              <div className="flex items-center gap-3 w-full md:w-1/2">
                {selectedHabit && (
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    {(() => {
                      const Icon = getIconComponent(selectedHabit.icon);
                      return <Icon className="w-6 h-6" />;
                    })()}
                  </div>
                )}
                <select
                  id="habit-select"
                  value={selectedHabitId}
                  onChange={(e) => setSelectedHabitId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                >
                  {habits.map(h => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
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
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Tingkat Sukses ({timeRange === '30days' ? '30 Hari' : '12 Bulan'})</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.successRate}%</p>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-100 flex items-center gap-4">
                    <div className="bg-blue-100 p-4 rounded-full shrink-0">
                      <Award className="w-8 h-8 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">XP Diperoleh ({timeRange === '30days' ? '30 Hari' : '12 Bulan'})</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.totalPoints}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-orange-100 flex items-center gap-4">
                    <div className="bg-orange-100 p-4 rounded-full shrink-0">
                      <Calendar className="w-8 h-8 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Best Streak ({timeRange === '30days' ? '30 Hari' : '1 Tahun'})</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.bestStreak} <span className="text-lg font-normal text-gray-500">Hari</span></p>
                    </div>
                  </div>
                </div>

                {/* View Toggle */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                  <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex">
                    <button
                      onClick={() => setTimeRange('30days')}
                      className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                        timeRange === '30days' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                      30 Hari
                    </button>
                    <button
                      onClick={() => setTimeRange('12months')}
                      className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors ${
                        timeRange === '12months' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Activity className="w-4 h-4" />
                      12 Bulan
                    </button>
                  </div>

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
                      <h3 className="text-lg font-bold text-gray-800 mb-6">
                        {timeRange === '30days' ? 'Progres 30 Hari Terakhir' : 'Tren 12 Bulan Terakhir'}
                      </h3>
                      <ResponsiveContainer width="100%" height="100%">
                        {timeRange === '30days' ? (
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
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.isSuccess ? '#3b82f6' : entry.status === 'Izin' ? '#facc15' : '#ef4444'} 
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        ) : (
                          <AreaChart data={monthlyData.slice().reverse()} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                            <defs>
                              <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                            <XAxis 
                              dataKey="month" 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fill: '#6b7280', fontSize: 11 }} 
                              dy={10} 
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
                              formatter={(value) => [`${value}%`, 'Tingkat Sukses']}
                              labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0) {
                                  return `Bulan: ${payload[0].payload.fullMonth}`;
                                }
                                return label;
                              }}
                            />
                            <Area 
                              type="monotone" 
                              dataKey="successRate" 
                              stroke="#3b82f6" 
                              strokeWidth={3}
                              fillOpacity={1} 
                              fill="url(#colorSuccess)" 
                            />
                          </AreaChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-6">
                        {timeRange === '30days' ? 'Riwayat Detail 30 Hari Terakhir' : 'Riwayat Detail 12 Bulan Terakhir'}
                      </h3>
                      <div className="overflow-x-auto">
                        {timeRange === '30days' ? (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Tanggal</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Status / Nilai</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">XP</th>
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
                        ) : (
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Bulan</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">Tingkat Sukses</th>
                                <th className="py-3 px-4 text-sm font-semibold text-gray-600">XP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {monthlyData.map((month, idx) => (
                                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                  <td className="py-3 px-4 text-sm text-gray-800 font-medium">{month.fullMonth}</td>
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full ${month.successRate >= 80 ? 'bg-green-500' : month.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                          style={{ width: `${month.successRate}%` }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium text-gray-700">{month.successRate}%</span>
                                    </div>
                                  </td>
                                  <td className={`py-3 px-4 text-sm font-bold ${
                                    month.totalPoints > 0 ? 'text-green-600' : month.totalPoints < 0 ? 'text-red-600' : 'text-gray-500'
                                  }`}>
                                    {month.totalPoints > 0 ? `+${month.totalPoints}` : month.totalPoints}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
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
