import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTodoStore } from '../store/useTodoStore';
import { useHabitStore } from '../store/useHabitStore';
import { Plus, Trash2, Edit2, Check, X, CheckCircle2, Circle, ListTodo, Calendar, AlertCircle, RefreshCw, AlignLeft, Star } from 'lucide-react';
import toast from 'react-hot-toast';
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
import { SortableTodoItem } from './SortableTodoItem';

interface TodoPageProps {
  onNavigate: (page: 'dashboard' | 'todos') => void;
}

const TodoPage: React.FC<TodoPageProps> = ({ onNavigate }) => {
  const { todos, isLoading, error, fetchTodos, addTodo, toggleTodo, deleteTodo, editTodo, clearCompleted, reorderTodos } = useTodoStore();
  const { level } = useHabitStore();
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  
  const [newTodo, setNewTodo] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

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
      const oldIndex = todos.findIndex((t) => t.id === active.id);
      const newIndex = todos.findIndex((t) => t.id === over.id);

      const newTodos = arrayMove(todos, oldIndex, newIndex);
      reorderTodos(newTodos);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await addTodo(newTodo.trim(), newDueDate || undefined, newDescription.trim() || undefined, newPriority);
    setNewTodo('');
    setNewDueDate('');
    setNewDescription('');
    setNewPriority('medium');
    setIsTodoModalOpen(false);
  };

  const openAddModal = () => {
    setModalMode('add');
    setNewTodo('');
    setNewDueDate('');
    setNewDescription('');
    setNewPriority('medium');
    setIsTodoModalOpen(true);
  };

  const startEdit = (id: string, text: string, dueDate?: string, description?: string, priority?: 'low' | 'medium' | 'high') => {
    setModalMode('edit');
    setEditingId(id);
    setEditText(text);
    setEditDueDate(dueDate || '');
    setEditDescription(description || '');
    setEditPriority(priority || 'medium');
    setIsTodoModalOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && editText.trim()) {
      await editTodo(editingId, editText.trim(), editDueDate || undefined, editDescription.trim() || undefined, editPriority);
      setEditingId(null);
      setIsTodoModalOpen(false);
    }
  };

  const cancelModal = () => {
    setIsTodoModalOpen(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteTodo(id);
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
  };

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  if (isLoading && todos.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ListTodo className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Todo List</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
              <Star className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-bold text-blue-700">Lvl {level || 1}</span>
            </div>
            <button
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Tambah Tugas</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 shadow-sm border border-red-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button
              onClick={() => fetchTodos()}
              className="flex items-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Active Todos */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            Belum Selesai
            <span className="bg-blue-100 text-blue-700 text-xs py-1 px-2.5 rounded-full font-medium">
              {activeTodos.length}
            </span>
          </h2>
          
          <div className="space-y-3">
            {activeTodos.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-200 rounded-xl bg-white">
                Tidak ada tugas yang belum selesai.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext
                  items={activeTodos.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <AnimatePresence>
                    {activeTodos.map(todo => (
                      <SortableTodoItem
                        key={todo.id}
                        todo={todo}
                        toggleTodo={toggleTodo}
                        startEdit={startEdit}
                        handleDelete={handleDelete}
                        isOverdue={isOverdue}
                      />
                    ))}
                  </AnimatePresence>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                Selesai
                <span className="bg-green-100 text-green-700 text-xs py-1 px-2.5 rounded-full font-medium">
                  {completedTodos.length}
                </span>
              </h2>
              <button
                onClick={() => setIsClearModalOpen(true)}
                className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline transition-all"
              >
                Hapus Semua
              </button>
            </div>
            
            <div className="space-y-3 opacity-75">
              <AnimatePresence>
                {completedTodos.map(todo => (
                  <motion.div 
                    key={todo.id} 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all group"
                  >
                    <div className="flex items-center gap-4 overflow-hidden flex-1">
                      <motion.button 
                        whileTap={{ scale: 0.8 }}
                        onClick={() => toggleTodo(todo.id)}
                        className="shrink-0 text-green-500 hover:text-gray-400 transition-colors"
                      >
                        <CheckCircle2 className="w-6 h-6" />
                      </motion.button>
                      <div className="flex flex-col">
                        <span className="text-gray-400 line-through">
                          {todo.text}
                        </span>
                        {todo.description && (
                          <span className="text-gray-400 text-sm mt-0.5 line-through line-clamp-1">
                            {todo.description}
                          </span>
                        )}
                        {todo.dueDate && (
                          <div className="flex items-center gap-1 text-xs mt-1 text-gray-400">
                            <Calendar className="w-3 h-3" />
                            <span className="line-through">{new Date(todo.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                      <button 
                        onClick={() => handleDelete(todo.id)}
                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Clear Completed Confirmation Modal */}
      {isClearModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Hapus Tugas Selesai</h3>
            <p className="text-gray-500 text-sm mb-6">
              Apakah Anda yakin ingin menghapus semua tugas yang sudah selesai? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsClearModalOpen(false)}
                className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setIsClearModalOpen(false);
                  clearCompleted();
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add/Edit Todo Modal */}
      {isTodoModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">
                {modalMode === 'add' ? 'Tambah Tugas Baru' : 'Edit Tugas'}
              </h3>
              <button
                onClick={cancelModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={modalMode === 'add' ? handleAdd : saveEdit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Tugas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={modalMode === 'add' ? newTodo : editText}
                    onChange={(e) => modalMode === 'add' ? setNewTodo(e.target.value) : setEditText(e.target.value)}
                    placeholder="Apa yang perlu dilakukan?"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4" /> Keterangan
                  </label>
                  <textarea
                    value={modalMode === 'add' ? newDescription : editDescription}
                    onChange={(e) => modalMode === 'add' ? setNewDescription(e.target.value) : setEditDescription(e.target.value)}
                    placeholder="Tambahkan detail atau catatan..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Tenggat Waktu
                  </label>
                  <input
                    type="date"
                    value={modalMode === 'add' ? newDueDate : editDueDate}
                    onChange={(e) => modalMode === 'add' ? setNewDueDate(e.target.value) : setEditDueDate(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> Prioritas
                  </label>
                  <select
                    value={modalMode === 'add' ? newPriority : editPriority}
                    onChange={(e) => modalMode === 'add' ? setNewPriority(e.target.value as 'low' | 'medium' | 'high') : setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-600 bg-white"
                  >
                    <option value="low">Rendah</option>
                    <option value="medium">Sedang</option>
                    <option value="high">Tinggi</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={cancelModal}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={modalMode === 'add' ? !newTodo.trim() : !editText.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2.5 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {modalMode === 'add' ? (
                    <>
                      <Plus className="w-5 h-5" />
                      Simpan Tugas
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Perbarui Tugas
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default TodoPage;
