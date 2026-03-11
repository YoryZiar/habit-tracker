import React, { useEffect, useState } from 'react';
import { useTodoStore } from '../store/useTodoStore';
import { useAuthStore } from '../store/useHabitStore';
import { Plus, Trash2, Edit2, Check, X, CheckCircle2, Circle, ListTodo, ArrowLeft, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

interface TodoPageProps {
  onNavigate: (page: 'dashboard' | 'todos') => void;
}

const TodoPage: React.FC<TodoPageProps> = ({ onNavigate }) => {
  const { todos, isLoading, error, fetchTodos, addTodo, toggleTodo, deleteTodo, editTodo } = useTodoStore();
  const logout = useAuthStore(state => state.logout);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    await addTodo(newTodo.trim());
    setNewTodo('');
  };

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = async () => {
    if (editingId && editText.trim()) {
      await editTodo(editingId, editText.trim());
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleDelete = async (id: string) => {
    await deleteTodo(id);
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
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Kembali</span>
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <ListTodo className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Todo List</h1>
            </div>
          </div>
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors text-sm font-medium shrink-0 ml-2"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 shadow-sm border border-red-100">
            {error}
          </div>
        )}

        {/* Add Todo Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <form onSubmit={handleAdd} className="flex gap-3">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Tambahkan tugas baru..."
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={!newTodo.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-xl transition-colors font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </form>
        </div>

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
              activeTodos.map(todo => (
                <div 
                  key={todo.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 shadow-sm transition-all group hover:border-blue-300"
                >
                  {editingId === todo.id ? (
                    <div className="flex items-center gap-3 w-full">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 border border-blue-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <button onClick={saveEdit} className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors">
                        <Check className="w-5 h-5" />
                      </button>
                      <button onClick={cancelEdit} className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 overflow-hidden flex-1">
                        <button 
                          onClick={() => toggleTodo(todo.id)}
                          className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
                        >
                          <Circle className="w-6 h-6" />
                        </button>
                        <span className="text-gray-700 font-medium">
                          {todo.text}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                        <button 
                          onClick={() => startEdit(todo.id, todo.text)}
                          className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(todo.id)}
                          className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Completed Todos */}
        {completedTodos.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              Selesai
              <span className="bg-green-100 text-green-700 text-xs py-1 px-2.5 rounded-full font-medium">
                {completedTodos.length}
              </span>
            </h2>
            
            <div className="space-y-3 opacity-75">
              {completedTodos.map(todo => (
                <div 
                  key={todo.id} 
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200 transition-all group"
                >
                  <div className="flex items-center gap-4 overflow-hidden flex-1">
                    <button 
                      onClick={() => toggleTodo(todo.id)}
                      className="shrink-0 text-green-500 hover:text-gray-400 transition-colors"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
                    <span className="text-gray-400 line-through">
                      {todo.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
                    <button 
                      onClick={() => handleDelete(todo.id)}
                      className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Konfirmasi Keluar</h3>
            <p className="text-gray-500 text-sm mb-6">
              Apakah Anda yakin ingin keluar dari aplikasi? Anda harus login kembali untuk mengakses data Anda.
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

export default TodoPage;
