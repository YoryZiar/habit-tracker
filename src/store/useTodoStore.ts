import { create } from 'zustand';
import { googleSheetsService, TodoRecord } from '../services/googleSheetsService';
import toast from 'react-hot-toast';

interface TodoState {
  todos: TodoRecord[];
  isLoading: boolean;
  error: string | null;
  fetchTodos: (retryCount?: number) => Promise<void>;
  addTodo: (text: string, dueDate?: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  editTodo: (id: string, newText: string, newDueDate?: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
}

export const useTodoStore = create<TodoState>((set, get) => ({
  todos: [],
  isLoading: false,
  error: null,

  fetchTodos: async (retryCount = 0) => {
    set({ isLoading: true, error: null });
    try {
      const todos = await googleSheetsService.getTodos();
      set({ todos, isLoading: false });
    } catch (error: any) {
      if (retryCount < 2) {
        // Auto-retry up to 2 times with a short delay
        setTimeout(() => {
          get().fetchTodos(retryCount + 1);
        }, 1000 * (retryCount + 1));
      } else {
        set({ error: error.message || 'Gagal mengambil data Todo dari Google Sheets', isLoading: false });
        toast.error('Gagal memuat tugas setelah beberapa percobaan');
      }
    }
  },

  addTodo: async (text: string, dueDate?: string) => {
    const newTodo: TodoRecord = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate
    };
    
    // Optimistic update
    set((state) => ({ todos: [...state.todos, newTodo] }));
    
    try {
      await googleSheetsService.addTodo(newTodo);
    } catch (error) {
      // Revert on failure
      set((state) => ({ todos: state.todos.filter(t => t.id !== newTodo.id) }));
      toast.error('Gagal menyimpan tugas ke server');
    }
  },

  toggleTodo: async (id: string) => {
    const todoToToggle = get().todos.find(t => t.id === id);
    if (!todoToToggle) return;

    const updatedTodo = { ...todoToToggle, completed: !todoToToggle.completed };
    
    // Optimistic update
    set((state) => ({
      todos: state.todos.map(todo => todo.id === id ? updatedTodo : todo)
    }));
    
    try {
      await googleSheetsService.updateTodo(updatedTodo);
    } catch (error) {
      // Revert on failure
      set((state) => ({
        todos: state.todos.map(todo => todo.id === id ? todoToToggle : todo)
      }));
      toast.error('Gagal memperbarui status tugas');
    }
  },

  deleteTodo: async (id: string) => {
    const todoToDelete = get().todos.find(t => t.id === id);
    if (!todoToDelete) return;

    // Optimistic update
    set((state) => ({ todos: state.todos.filter(todo => todo.id !== id) }));
    
    try {
      await googleSheetsService.deleteTodo(id);
    } catch (error) {
      // Revert on failure
      set((state) => ({ todos: [...state.todos, todoToDelete] }));
      toast.error('Gagal menghapus tugas');
    }
  },

  editTodo: async (id: string, newText: string, newDueDate?: string) => {
    const todoToEdit = get().todos.find(t => t.id === id);
    if (!todoToEdit) return;

    const updatedTodo = { ...todoToEdit, text: newText, dueDate: newDueDate };
    
    // Optimistic update
    set((state) => ({
      todos: state.todos.map(todo => todo.id === id ? updatedTodo : todo)
    }));
    
    try {
      await googleSheetsService.updateTodo(updatedTodo);
    } catch (error) {
      // Revert on failure
      set((state) => ({
        todos: state.todos.map(todo => todo.id === id ? todoToEdit : todo)
      }));
      toast.error('Gagal memperbarui teks tugas');
    }
  },

  clearCompleted: async () => {
    const completedTodos = get().todos.filter(t => t.completed);
    if (completedTodos.length === 0) return;

    // Optimistic update
    set((state) => ({ todos: state.todos.filter(t => !t.completed) }));

    try {
      // Delete one by one since we don't have a batch delete in googleSheetsService
      for (const todo of completedTodos) {
        await googleSheetsService.deleteTodo(todo.id);
      }
      toast.success('Berhasil menghapus semua tugas yang selesai');
    } catch (error) {
      // Revert on failure
      set((state) => ({ todos: [...state.todos, ...completedTodos] }));
      toast.error('Gagal menghapus beberapa tugas');
    }
  }
}));
