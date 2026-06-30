import { create } from 'zustand';
import { googleSheetsService, TodoRecord } from '../services/googleSheetsService';
import { handleAuthError } from '../utils/authUtils';
import toast from 'react-hot-toast';

interface TodoState {
  todos: TodoRecord[];
  isLoading: boolean;
  error: string | null;
  fetchTodos: (retryCount?: number) => Promise<void>;
  addTodo: (text: string, dueDate?: string, description?: string, priority?: 'low' | 'medium' | 'high') => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  editTodo: (id: string, newText: string, newDueDate?: string, newDescription?: string, newPriority?: 'low' | 'medium' | 'high') => Promise<void>;
  clearCompleted: () => Promise<void>;
  reorderTodos: (newTodos: TodoRecord[]) => Promise<void>;
}

let todoUpdateQueue: Record<string, TodoRecord> = {};
let todoSyncTimeout: NodeJS.Timeout | null = null;
let lastSyncedTodos: TodoRecord[] | null = null;

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
      if (handleAuthError(error)) return;
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

  addTodo: async (text: string, dueDate?: string, description?: string, priority?: 'low' | 'medium' | 'high') => {
    const newTodo: TodoRecord = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate,
      description,
      priority
    };
    
    // Optimistic update
    set((state) => ({ todos: [...state.todos, newTodo] }));
    
    try {
      await googleSheetsService.addTodo(newTodo);
    } catch (error) {
      if (handleAuthError(error)) return;
      // Revert on failure
      set((state) => ({ todos: state.todos.filter(t => t.id !== newTodo.id) }));
      toast.error('Gagal menyimpan tugas ke server');
    }
  },

  toggleTodo: async (id: string) => {
    const { todos } = get();
    
    if (Object.keys(todoUpdateQueue).length === 0) {
      lastSyncedTodos = todos;
    }
    
    const todoToToggle = todos.find(t => t.id === id);
    if (!todoToToggle) return;

    const updatedTodo = { ...todoToToggle, completed: !todoToToggle.completed };
    
    // Optimistic update
    set((state) => ({
      todos: state.todos.map(todo => todo.id === id ? updatedTodo : todo)
    }));
    
    todoUpdateQueue[updatedTodo.id] = updatedTodo;
    
    if (todoSyncTimeout) clearTimeout(todoSyncTimeout);
    todoSyncTimeout = setTimeout(async () => {
      const todosToUpdate = Object.values(todoUpdateQueue);
      todoUpdateQueue = {};
      
      try {
        await googleSheetsService.batchUpdateTodos(todosToUpdate);
        lastSyncedTodos = null;
      } catch (error) {
        if (handleAuthError(error)) return;
        // Revert on failure
        if (lastSyncedTodos) {
          set({ todos: lastSyncedTodos });
          lastSyncedTodos = null;
        }
        toast.error('Gagal memperbarui status tugas');
      }
    }, 1000);
  },

  deleteTodo: async (id: string) => {
    const todoToDelete = get().todos.find(t => t.id === id);
    if (!todoToDelete) return;

    // Optimistic update
    set((state) => ({ todos: state.todos.filter(todo => todo.id !== id) }));
    
    try {
      await googleSheetsService.deleteTodo(id);
    } catch (error) {
      if (handleAuthError(error)) return;
      // Revert on failure
      set((state) => ({ todos: [...state.todos, todoToDelete] }));
      toast.error('Gagal menghapus tugas');
    }
  },

  editTodo: async (id: string, newText: string, newDueDate?: string, newDescription?: string, newPriority?: 'low' | 'medium' | 'high') => {
    const { todos } = get();
    
    if (Object.keys(todoUpdateQueue).length === 0) {
      lastSyncedTodos = todos;
    }
    
    const todoToEdit = todos.find(t => t.id === id);
    if (!todoToEdit) return;

    const updatedTodo = { ...todoToEdit, text: newText, dueDate: newDueDate, description: newDescription, priority: newPriority };
    
    // Optimistic update
    set((state) => ({
      todos: state.todos.map(todo => todo.id === id ? updatedTodo : todo)
    }));
    
    todoUpdateQueue[updatedTodo.id] = updatedTodo;
    
    if (todoSyncTimeout) clearTimeout(todoSyncTimeout);
    todoSyncTimeout = setTimeout(async () => {
      const todosToUpdate = Object.values(todoUpdateQueue);
      todoUpdateQueue = {};
      
      try {
        await googleSheetsService.batchUpdateTodos(todosToUpdate);
        lastSyncedTodos = null;
      } catch (error) {
        if (handleAuthError(error)) return;
        // Revert on failure
        if (lastSyncedTodos) {
          set({ todos: lastSyncedTodos });
          lastSyncedTodos = null;
        }
        toast.error('Gagal memperbarui teks tugas');
      }
    }, 1000);
  },

  clearCompleted: async () => {
    const { todos } = get();
    const completedTodos = todos.filter(t => t.completed);
    if (completedTodos.length === 0) return;

    // Optimistic update
    set((state) => ({ todos: state.todos.filter(t => !t.completed) }));

    try {
      const idsToDelete = completedTodos.map(todo => todo.id);
      await googleSheetsService.batchDeleteTodos(idsToDelete);
      toast.success('Berhasil menghapus semua tugas yang selesai');
    } catch (error) {
      if (handleAuthError(error)) return;
      // Revert on failure
      set({ todos });
      toast.error('Gagal menghapus beberapa tugas');
    }
  },

  reorderTodos: async (newTodos) => {
    const { todos: oldTodos } = get();
    set({ todos: newTodos });
    
    try {
      await googleSheetsService.reorderTodos(newTodos);
    } catch (error) {
      if (handleAuthError(error)) return;
      set({ todos: oldTodos, error: 'Gagal mengurutkan tugas' });
      toast.error('Gagal menyimpan urutan tugas');
    }
  }
}));
