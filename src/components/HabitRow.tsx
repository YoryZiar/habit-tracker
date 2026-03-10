import React, { useState } from 'react';
import { HabitRecord } from '../services/googleSheetsService';
import { formatDate } from '../utils/dateUtils';
import { useHabitStore } from '../store/useHabitStore';
import { Check, X, Minus, Pencil, Trash2 } from 'lucide-react';
import EditHabitModal from './EditHabitModal';

interface HabitRowProps {
  habit: HabitRecord;
  weekDates: Date[];
}

const HabitRow: React.FC<HabitRowProps> = ({ habit, weekDates }) => {
  const updateRecord = useHabitStore(state => state.updateRecord);
  const deleteHabit = useHabitStore(state => state.deleteHabit);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
      weekDates.forEach(date => {
        const dateStr = formatDate(date);
        const val = Number(habit.records[dateStr]) || 0;
        totalValue += val;
      });
      return Math.min(100, Math.round((totalValue / habit.target) * 100));
    }
  };

  const progress = calculateProgress();

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4 transition-all hover:shadow-md">
      <div className="p-4 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-800 text-lg">{habit.name}</h3>
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
              title="Edit Habit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Hapus Habit"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Target: {habit.target} {habit.unit || (habit.type === 'boolean' ? 'hari/minggu' : '')}
          </p>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full md:w-64">
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-600">Progress</span>
            <span className="font-bold text-green-600">{progress}%</span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                progress === 100 ? 'bg-green-500' : 'bg-green-400'
              }`}
              style={{ width: `${progress}%` }}
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
              <div key={dateStr} className="p-2 sm:p-3 flex flex-col items-center justify-center min-h-[80px]">
                <span className="text-xs text-gray-500 font-medium mb-2 block">
                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'][index]}
                </span>
                
                {habit.type === 'boolean' ? (
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
                ) : (
                  <input
                    type="number"
                    min="0"
                    value={value !== undefined ? value : ''}
                    onChange={(e) => handleQuantitativeChange(dateStr, e.target.value)}
                    placeholder="0"
                    className="w-full text-center text-sm p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <EditHabitModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        habit={habit} 
      />

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
        </div>
      )}
    </div>
  );
};

export default HabitRow;
