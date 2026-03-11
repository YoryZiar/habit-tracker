import React, { useState } from 'react';
import { HabitRecord } from '../services/googleSheetsService';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface HabitCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitRecord;
}

const HabitCalendarModal: React.FC<HabitCalendarModalProps> = ({ isOpen, onClose, habit }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  if (!isOpen) return null;

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getDayStatusColor = (dateStr: string) => {
    const record = habit.records[dateStr];
    
    if (habit.type === 'boolean') {
      if (record === 'selesai') return 'bg-green-500 text-white';
      if (record === 'gagal') return 'bg-red-500 text-white';
      if (record === 'izin') return 'bg-yellow-400 text-white';
    } else if (habit.type === 'quantitative') {
      if (record !== undefined) {
        if (Number(record) >= habit.target) return 'bg-green-500 text-white';
        return 'bg-red-500 text-white';
      }
    }
    
    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    
    if (checkDate > today) {
      return 'bg-gray-50 text-gray-300';
    }
    
    return 'bg-gray-100 text-gray-600';
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10 sm:h-12 sm:w-12"></div>);
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const statusColor = getDayStatusColor(dateStr);
      const record = habit.records[dateStr];
      
      days.push(
        <div 
          key={i} 
          className={`h-10 w-10 sm:h-12 sm:w-12 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${statusColor}`}
          title={record ? `Nilai: ${record}` : 'Tidak ada data'}
        >
          {i}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ position: 'fixed' }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Kalender Habit</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <h3 className="font-semibold text-lg text-gray-800">{habit.name}</h3>
            <p className="text-sm text-gray-500">
              Target: {habit.target} {habit.unit || (habit.type === 'boolean' ? 'hari/minggu' : '')}
            </p>
          </div>

          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-gray-800">
              {monthNames[month]} {year}
            </h4>
            <button 
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
              <div key={day} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2 justify-items-center">
            {renderCalendarDays()}
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>Selesai / Tercapai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Gagal / Kurang</span>
            </div>
            {habit.type === 'boolean' && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span>Izin</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-gray-100"></div>
              <span>Kosong</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HabitCalendarModal;
