import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HabitRecord } from '../services/googleSheetsService';
import { isHabitScheduledOn } from '../utils/gamificationUtils';
import { formatDate } from '../utils/dateUtils';
import { useHabitStore } from '../store/useHabitStore';
import { Check, X, Minus, Pencil, Trash2, CalendarDays, GripVertical, Flame } from 'lucide-react';
import EditHabitModal from './EditHabitModal';
import HabitCalendarModal from './HabitCalendarModal';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'motion/react';
import { getIconComponent } from './IconPicker';

interface HabitRowProps {
  habit: HabitRecord;
  weekDates: Date[];
  onEdit?: () => void;
  onCalendar?: () => void;
  onDelete?: () => void;
}

const HabitRow: React.FC<HabitRowProps> = ({ habit, weekDates, onEdit, onCalendar, onDelete }) => {
  const updateRecord = useHabitStore(state => state.updateRecord);
  const deleteHabit = useHabitStore(state => state.deleteHabit);
  // Local state kept for backward compatibility if used without props
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: habit.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.8 : 1,
    position: 'relative' as const,
  };

  // Menghitung progress mingguan
  const calculateProgress = () => {
    let completed = 0;
    
    if (habit.type === 'boolean') {
      weekDates.forEach(date => {
        const dateStr = formatDate(date);
        if (habit.records[dateStr] === 'selesai') {
          completed += 1;
        }
      });
      return Math.min(100, Math.round((completed / habit.target) * 100));
    } else {
      let totalValue = 0;
      let scheduledDays = 0;
      weekDates.forEach(date => {
        const dateStr = formatDate(date);
        const dayOfWeek = date.getDay();

        const isScheduled = isHabitScheduledOn(habit, date);
        if (isScheduled) {
          scheduledDays++;
        }

        const val = Number(habit.records[dateStr]) || 0;
        totalValue += val;
      });
      const weeklyTarget = scheduledDays * habit.target;
      return weeklyTarget > 0 ? Math.min(100, Math.round((totalValue / weeklyTarget) * 100)) : 0;
    }
  };

  const calculateHabitStreak = () => {
    let streak = 0;
    const today = new Date();
    const todayStr = formatDate(today);
    
    const recordDates = Object.keys(habit.records).sort().reverse();
    if (recordDates.length === 0) return 0;
    
    if (habit.recurrence === 'weekly') {
      // Calculate weekly streak
      // A week is considered completed if the target is met within the week (Mon-Sun)
      // Let's check week by week going backwards
      let currentWeekStart = new Date(today);
      const currentDay = currentWeekStart.getUTCDay();
      const diff = currentWeekStart.getUTCDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to Monday
      currentWeekStart.setUTCDate(diff);
      currentWeekStart.setUTCHours(0, 0, 0, 0);

      let iterations = 0;
      const maxIterations = 104; // Check up to 2 years (104 weeks)

      while (iterations < maxIterations) {
        iterations++;
        
        // Check if any day in this week is completed
        let isWeekCompleted = false;
        for (let i = 0; i < 7; i++) {
          const d = new Date(currentWeekStart);
          d.setUTCDate(d.getUTCDate() + i);
          const dateStr = d.toISOString().split('T')[0];
          
          const isCompleted = habit.type === 'boolean'
            ? habit.records[dateStr] === 'selesai'
            : Number(habit.records[dateStr]) >= habit.target;
            
          if (isCompleted) {
            isWeekCompleted = true;
            break;
          }
        }

        if (isWeekCompleted) {
          streak++;
          // Move to previous week
          currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 7);
        } else {
          // If this is the current week, it's okay if it's not completed yet
          if (iterations === 1) {
            // Move to previous week and continue checking
            currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - 7);
          } else {
            break; // Streak broken
          }
        }
      }
      return streak;
    }

    let currentStr = todayStr;
    const habitStartDate = habit.createdAt ? habit.createdAt.split('T')[0] : '2000-01-01';
    
    // Safety limit to prevent infinite loops
    let iterations = 0;
    const maxIterations = 365 * 2; // Check up to 2 years
    
    while (iterations < maxIterations && currentStr >= habitStartDate) {
      iterations++;
      const currentDateObj = new Date(currentStr);
      const dayOfWeek = currentDateObj.getUTCDay();
      
      // If specific days are set, skip days that are not in the schedule
      if (habit.recurrence === 'specific_days' && habit.specificDays && habit.specificDays.length > 0) {
        if (!habit.specificDays.includes(dayOfWeek)) {
          // Move to previous day
          currentDateObj.setUTCDate(currentDateObj.getUTCDate() - 1);
          currentStr = currentDateObj.toISOString().split('T')[0];
          continue;
        }
      }
      
      const isCompleted = habit.type === 'boolean'
        ? habit.records[currentStr] === 'selesai'
        : habit.records[currentStr] !== undefined && Number(habit.records[currentStr]) >= habit.target;
        
      const isIzin = habit.records[currentStr] === 'izin';

      if (isCompleted) {
        streak++;
        currentDateObj.setUTCDate(currentDateObj.getUTCDate() - 1);
        currentStr = currentDateObj.toISOString().split('T')[0];
      } else if (isIzin) {
        currentDateObj.setUTCDate(currentDateObj.getUTCDate() - 1);
        currentStr = currentDateObj.toISOString().split('T')[0];
      } else if (currentStr === todayStr) {
        // If today is not completed and not izin, it's okay, the day is not over.
        // Just move to yesterday and continue checking the streak.
        currentDateObj.setUTCDate(currentDateObj.getUTCDate() - 1);
        currentStr = currentDateObj.toISOString().split('T')[0];
      } else {
        // Streak broken
        break;
      }
    }
    
    return streak;
  };

  const progress = calculateProgress();
  const streak = calculateHabitStreak();

  const handleBooleanChange = (dateStr: string, value: string) => {
    updateRecord(habit.id, dateStr, value);
  };

  const handleQuantitativeChange = (dateStr: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      updateRecord(habit.id, dateStr, numValue);
    } else if (value === '') {
      updateRecord(habit.id, dateStr, 0);
    }
  };

  const getStatusColor = (status: string | number | undefined) => {
    if (status === 'selesai') return 'bg-green-100 text-green-700 border-green-300';
    if (status === 'izin') return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    if (status === 'gagal') return 'bg-red-100 text-red-700 border-red-300';
    return 'bg-gray-50 text-gray-500 border-gray-200';
  };

  const handleDelete = () => {
    deleteHabit(habit.id);
    setIsDeleteModalOpen(false);
  };

  const HabitIcon = getIconComponent(habit.icon);

  return (
    <div 
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-sm border ${isDragging ? 'border-green-400 shadow-md' : 'border-gray-100'} overflow-hidden mb-4 transition-all hover:shadow-md relative`}
    >
      <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1 -ml-2"
            title="Tarik untuk mengurutkan"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 shrink-0">
            <HabitIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-800 text-lg">{habit.name}</h3>
              <button 
                onClick={() => onCalendar ? onCalendar() : setIsCalendarModalOpen(true)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Lihat Kalender"
              >
                <CalendarDays className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onEdit ? onEdit() : setIsEditModalOpen(true)}
                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
                title="Edit Habit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete ? onDelete() : setIsDeleteModalOpen(true)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Hapus Habit"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
              <span>Target: {habit.target} {habit.unit || (habit.type === 'boolean' ? 'hari/minggu' : '')}</span>
              {streak > 0 && (
                <span className="flex items-center gap-1 text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full text-xs font-bold">
                  <Flame className="w-3 h-3" />
                  {streak} Hari
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full md:w-64">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-medium text-gray-600">Progress</span>
            <span className={`font-bold ${progress === 100 ? 'text-green-600' : 'text-gray-700'}`}>{progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
            <motion.div 
              className={`h-full rounded-full ${
                progress === 100 
                  ? 'bg-gradient-to-r from-green-400 to-green-500' 
                  : 'bg-gradient-to-r from-green-300 to-green-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2 custom-scrollbar">
        <div className="grid grid-cols-7 divide-x divide-gray-100 min-w-[500px]">
          {weekDates.map((date, index) => {
            const dateStr = formatDate(date);
            const value = habit.records[dateStr];
            
            return (
              <div key={dateStr} className="p-2 sm:p-3 flex flex-col items-center justify-center min-h-[80px] relative">
                <span className="text-xs text-gray-500 font-medium mb-2 block">
                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][index]}
                </span>
                
                {habit.type === 'boolean' ? (
                  <motion.div 
                    className="w-full relative"
                    whileTap={{ scale: 0.9 }}
                    animate={value === 'selesai' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <select
                      value={(value as string) || ''}
                      onChange={(e) => handleBooleanChange(dateStr, e.target.value)}
                      className={`w-full text-xs sm:text-sm p-2 rounded-md border appearance-none text-center cursor-pointer outline-none focus:ring-2 focus:ring-green-500 transition-colors ${getStatusColor(value)}`}
                    >
                      <option value="" disabled>-</option>
                      <option value="selesai">Selesai</option>
                      <option value="izin">Izin</option>
                      <option value="gagal">Gagal</option>
                    </select>
                    {value === 'selesai' && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm"
                      >
                        <Check className="w-3 h-3" />
                      </motion.div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    className="w-full relative"
                    whileTap={{ scale: 0.95 }}
                  >
                    <input
                      type="number"
                      min="0"
                      value={value !== undefined ? value : ''}
                      onChange={(e) => handleQuantitativeChange(dateStr, e.target.value)}
                      placeholder="0"
                      className="w-full text-center text-sm p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
                    />
                    {value !== undefined && Number(value) >= habit.target && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full p-0.5 shadow-sm"
                      >
                        <Check className="w-3 h-3" />
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Modals are rendered outside the main draggable div via portals or just fixed positioning, but since they use fixed inset-0, we just need to make sure they aren't clipped or affected by the parent's transform/z-index. React portals are best, but since we are using fixed positioning, we just need to ensure the parent doesn't trap them. By default fixed elements are relative to the viewport unless a parent has a transform. Since dnd-kit applies a transform, we should render modals conditionally and ensure they are not affected. Actually, the best way is to render them outside the draggable div. */}
      {isEditModalOpen && (
        <EditHabitModal 
          isOpen={isEditModalOpen} 
          onClose={() => setIsEditModalOpen(false)} 
          habit={habit} 
        />
      )}

      {isCalendarModalOpen && (
        <HabitCalendarModal
          isOpen={isCalendarModalOpen}
          onClose={() => setIsCalendarModalOpen(false)}
          habit={habit}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Habit</h3>
            <p className="text-gray-500 text-sm mb-6">
              Apakah Anda yakin ingin menghapus habit "{habit.name}"? Semua data riwayat untuk habit ini akan hilang dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HabitRow;
