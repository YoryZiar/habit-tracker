import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'motion/react';
import { Circle, AlertCircle, Calendar, Edit2, Trash2, GripVertical } from 'lucide-react';
import { TodoRecord } from '../services/googleSheetsService';

interface SortableTodoItemProps {
  todo: TodoRecord;
  toggleTodo: (id: string) => void;
  startEdit: (id: string, text: string, dueDate?: string, description?: string, priority?: 'low' | 'medium' | 'high') => void;
  handleDelete: (id: string) => void;
  isOverdue: (dueDate?: string) => boolean;
}

export const SortableTodoItem: React.FC<SortableTodoItemProps> = ({
  todo,
  toggleTodo,
  startEdit,
  handleDelete,
  isOverdue
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Translate.toString(transform) 
      ? `${CSS.Translate.toString(transform)} ${isDragging ? 'scale(1.02)' : 'scale(1)'}` 
      : (isDragging ? 'scale(1.02)' : undefined),
    transition: transition || undefined,
    zIndex: isDragging ? 50 : 1,
    position: 'relative' as const,
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0, scale: 0.95 }}
      animate={{ opacity: 1, height: 'auto', scale: 1 }}
      exit={{ opacity: 0, height: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div 
        ref={setNodeRef}
        style={style}
        className={`flex items-center justify-between p-4 rounded-xl bg-white border transition-all group ${
          isDragging 
            ? 'border-blue-500 shadow-xl ring-4 ring-blue-50 opacity-90' 
            : 'border-gray-200 shadow-sm hover:border-blue-300'
        }`}
      >
        <div className="flex items-center gap-4 overflow-hidden flex-1">
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 p-1 -ml-2"
          >
            <GripVertical className="w-5 h-5" />
          </div>
          <motion.button 
            whileTap={{ scale: 0.8 }}
            onClick={() => toggleTodo(todo.id)}
            className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
          >
            <Circle className="w-6 h-6" />
          </motion.button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-medium">
                {todo.text}
              </span>
              {todo.priority && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider ${
                  todo.priority === 'high' ? 'bg-red-100 text-red-700' :
                  todo.priority === 'medium' ? 'bg-orange-100 text-orange-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {todo.priority === 'high' ? 'Tinggi' : todo.priority === 'medium' ? 'Sedang' : 'Rendah'}
                </span>
              )}
            </div>
            {todo.description && (
              <span className="text-gray-500 text-sm mt-0.5 line-clamp-2">
                {todo.description}
              </span>
            )}
            {todo.dueDate && (
              <div className={`flex items-center gap-1 text-xs mt-1 ${isOverdue(todo.dueDate) ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {isOverdue(todo.dueDate) ? <AlertCircle className="w-3 h-3" /> : <Calendar className="w-3 h-3" />}
                <span>{new Date(todo.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {isOverdue(todo.dueDate) && <span className="ml-1">(Terlambat)</span>}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-4">
          <button 
            onClick={() => startEdit(todo.id, todo.text, todo.dueDate, todo.description, todo.priority)}
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
      </div>
    </motion.div>
  );
};
