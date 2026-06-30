import { useAuthStore } from '../store/useHabitStore';
import toast from 'react-hot-toast';

/**
 * Handler terpusat untuk error autentikasi (401 UNAUTHORIZED).
 * Dipakai oleh useHabitStore dan useTodoStore agar tidak duplikasi.
 *
 * @param error - Error yang ditangkap dari try/catch
 * @returns true jika error adalah auth error (caller harus return), false jika bukan
 */
export const handleAuthError = (error: unknown): boolean => {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') {
    useAuthStore.getState().logout();
    toast.error('Sesi Anda telah berakhir. Silakan masuk kembali.');
    return true;
  }
  return false;
};
