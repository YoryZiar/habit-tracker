/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAuthStore } from './store/useHabitStore';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      {isAuthenticated ? <Dashboard /> : <Login />}
    </>
  );
}
