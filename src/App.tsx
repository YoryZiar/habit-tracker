/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useAuthStore } from './store/useHabitStore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import TodoPage from './components/TodoPage';
import HistoryPage from './components/HistoryPage';
import FloatingNav from './components/FloatingNav';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'todos' | 'history'>('dashboard');

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {!isAuthenticated ? (
        <Login />
      ) : (
        <div className="pb-24"> {/* Add padding bottom to prevent content from being hidden behind the floating nav */}
          {currentPage === 'dashboard' ? (
            <Dashboard onNavigate={setCurrentPage} />
          ) : currentPage === 'todos' ? (
            <TodoPage onNavigate={setCurrentPage} />
          ) : (
            <HistoryPage onNavigate={setCurrentPage} />
          )}
          <FloatingNav currentPage={currentPage} onNavigate={setCurrentPage} />
        </div>
      )}
    </>
  );
}
