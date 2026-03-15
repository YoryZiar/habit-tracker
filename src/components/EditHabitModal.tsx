import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useHabitStore } from '../store/useHabitStore';
import { HabitRecord } from '../services/googleSheetsService';
import { X } from 'lucide-react';

interface EditHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  habit: HabitRecord;
}

const EditHabitModal: React.FC<EditHabitModalProps> = ({ isOpen, onClose, habit }) => {
  const editHabit = useHabitStore(state => state.editHabit);
  const [mounted, setMounted] = useState(false);
  
  const [name, setName] = useState(habit.name);
  const [type, setType] = useState<'boolean' | 'quantitative'>(habit.type);
  const [target, setTarget] = useState<number | ''>(habit.target);
  const [unit, setUnit] = useState(habit.unit || '');
  const [recurrence, setRecurrence] = useState<'daily' | 'weekly' | 'specific_days'>(habit.recurrence || 'daily');
  const [specificDays, setSpecificDays] = useState<number[]>(habit.specificDays || []);
  const [error, setError] = useState('');

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(habit.name);
      setType(habit.type);
      setTarget(habit.target);
      setUnit(habit.unit || '');
      setRecurrence(habit.recurrence || 'daily');
      setSpecificDays(habit.specificDays || []);
      setError('');
    }
  }, [isOpen, habit]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Nama habit tidak boleh kosong');
      return;
    }

    if (target === '' || target <= 0) {
      setError('Target harus lebih besar dari 0');
      return;
    }

    if (type === 'boolean' && target > 7) {
      setError('Target hari untuk tipe boolean maksimal 7 hari');
      return;
    }

    if (recurrence === 'specific_days' && specificDays.length === 0) {
      setError('Pilih setidaknya satu hari untuk repetisi spesifik');
      return;
    }

    try {
      await editHabit(habit.id, {
        name: name.trim(),
        type,
        target: Number(target),
        unit: type === 'quantitative' ? unit.trim() : undefined,
        recurrence,
        specificDays: recurrence === 'specific_days' ? specificDays : undefined,
      });
      onClose();
    } catch (err) {
      setError('Gagal mengedit habit');
    }
  };

  const toggleDay = (day: number) => {
    setSpecificDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const daysOfWeek = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Edit Habit</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Habit</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Minum Air Putih, Olahraga"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Habit</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setType('boolean'); setTarget(''); setUnit(''); }}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  type === 'boolean' 
                    ? 'bg-green-50 border-green-500 text-green-700' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Selesai / Gagal
              </button>
              <button
                type="button"
                onClick={() => { setType('quantitative'); setTarget(''); }}
                className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                  type === 'quantitative' 
                    ? 'bg-green-50 border-green-500 text-green-700' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                Angka / Kuantitas
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Repetisi</label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors mb-3"
            >
              <option value="daily">Setiap Hari</option>
              <option value="weekly">Mingguan</option>
              <option value="specific_days">Hari Tertentu</option>
            </select>

            {recurrence === 'specific_days' && (
              <div className="flex flex-wrap gap-2 mt-2">
                {daysOfWeek.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                      specificDays.includes(index)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Mingguan
              </label>
              <input
                type="number"
                min="1"
                max={type === 'boolean' ? 7 : undefined}
                value={target}
                onChange={(e) => setTarget(e.target.value ? Number(e.target.value) : '')}
                placeholder={type === 'boolean' ? "Maks 7 hari" : "Contoh: 10000"}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
              />
            </div>
            
            {type === 'quantitative' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Satuan (Unit)
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="Contoh: Langkah, Liter"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-colors"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-sm"
            >
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default EditHabitModal;
