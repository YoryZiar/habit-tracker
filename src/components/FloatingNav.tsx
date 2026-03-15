import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Home, ListTodo, User, History, Settings, LogOut, UserCircle } from 'lucide-react';
import { useAuthStore } from '../store/useHabitStore';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface FloatingNavProps {
  currentPage: 'dashboard' | 'todos' | 'history';
  onNavigate: (page: 'dashboard' | 'todos' | 'history') => void;
}

export default function FloatingNav({ currentPage, onNavigate }: FloatingNavProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const logout = useAuthStore(state => state.logout);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsLogoutModalOpen(true);
    setIsUserMenuOpen(false);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    logout();
  };

  const handleComingSoon = (feature: string) => {
    toast.success(`Fitur ${feature} akan segera hadir!`);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-white/90 backdrop-blur-md shadow-lg border border-gray-200 rounded-full px-2 py-2 flex items-center gap-2">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              currentPage === 'dashboard' ? 'bg-green-100 text-green-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">Home</span>
          </button>

          <button
            onClick={() => onNavigate('todos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
              currentPage === 'todos' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ListTodo className="w-5 h-5" />
            <span className="hidden sm:inline">Todo List</span>
          </button>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                isUserMenuOpen || currentPage === 'history' ? 'bg-purple-100 text-purple-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <User className="w-5 h-5" />
              <span className="hidden sm:inline">User</span>
            </button>

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2"
              >
                <button
                  onClick={() => handleComingSoon('Profile')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <UserCircle className="w-4 h-4 text-gray-400" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    onNavigate('history');
                    setIsUserMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    currentPage === 'history' ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <History className="w-4 h-4 text-gray-400" />
                  Riwayat
                </button>
                <button
                  onClick={() => handleComingSoon('Pengaturan')}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Pengaturan
                </button>
                <div className="h-px bg-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  Keluar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    {/* Logout Confirmation Modal */}
    {isLogoutModalOpen && createPortal(
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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
              onClick={confirmLogout}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors shadow-sm"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
