import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HabitRecord } from '../services/googleSheetsService';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getIconComponent } from './IconPicker';

interface HabitCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitRecord;
}

const HabitCalendarModal: React.FC<HabitCalendarModalProps> = ({ isOpen, onClose, habit }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

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
      if (record === 'selesai') return 'bg-green-500 text-white shadow-sm shadow-green-100';
      if (record === 'gagal') return 'bg-red-500 text-white shadow-sm shadow-red-100';
      if (record === 'izin') return 'bg-yellow-400 text-white shadow-sm shadow-yellow-100';
    } else if (habit.type === 'quantitative') {
      if (record !== undefined) {
        if (Number(record) >= habit.target) return 'bg-green-500 text-white shadow-sm shadow-green-100';
        return 'bg-red-500 text-white shadow-sm shadow-red-100';
      }
    }
    
    // Check if date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    
    if (checkDate > today) {
      return 'bg-transparent text-gray-300';
    }
    
    return 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100';
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-10 h-10 sm:w-11 sm:h-11"></div>);
    }
    
    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const statusColor = getDayStatusColor(dateStr);
      const record = habit.records[dateStr];
      
      const isToday = new Date().toDateString() === new Date(year, month, i).toDateString();
      
      days.push(
        <div 
          key={i} 
          className={`w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl text-sm font-medium transition-colors cursor-default ${statusColor} ${isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
          title={record ? `Nilai: ${record}` : 'Tidak ada data'}
        >
          {i}
        </div>
      );
    }
    
    return days;
  };

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-800">Kalender Habit</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                {(() => {
                  const Icon = getIconComponent(habit.icon);
                  return <Icon className="w-5 h-5" />;
                })()}
              </div>
              <h3 className="font-bold text-xl text-gray-900">{habit.name}</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Target: <span className="font-medium text-gray-700">{habit.target} {habit.unit || (habit.type === 'boolean' ? 'hari/minggu' : '')}</span>
            </p>
          </div>

          <div className="flex items-center justify-between mb-6 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
            <button 
              onClick={handlePrevMonth}
              className="p-2 rounded-xl hover:bg-white hover:shadow-sm text-gray-600 transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-gray-800 text-base">
              {monthNames[month]} {year}
            </h4>
            <button 
              onClick={handleNextMonth}
              className="p-2 rounded-xl hover:bg-white hover:shadow-sm text-gray-600 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2 text-center">
            {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(day => (
              <div key={day} className="text-[11px] font-bold text-gray-400 uppercase tracking-wider py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 justify-items-center">
            {renderCalendarDays()}
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs text-gray-600 font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm"></div>
              <span>Tercapai</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div>
              <span>Gagal</span>
            </div>
            {habit.type === 'boolean' && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></div>
                <span>Izin</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-200"></div>
              <span>Kosong</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HabitCalendarModal;
