import React, { useState } from 'react';
import { useAuthStore } from '../store/useHabitStore';
import { Leaf, Loader2 } from 'lucide-react';

declare const google: any;

const CLIENT_ID = '157993863564-ef8r1kkb9r0vqd9q4rmk9ejjnald6618.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

const Login: React.FC = () => {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleGoogleLogin = () => {
    setError('');
    setIsLoading(true);
    
    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            setError('Gagal otentikasi dengan Google');
            setIsLoading(false);
            return;
          }
          
          try {
            await login(tokenResponse.access_token);
          } catch (err: any) {
            setError(err.message || 'Gagal menghubungkan ke Spreadsheet');
            setIsLoading(false);
          }
        },
        error_callback: () => {
          setError('Terjadi kesalahan saat memuat Google Auth');
          setIsLoading(false);
        }
      });
      
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      setError('Google Identity Services belum dimuat. Silakan refresh halaman.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-green-100">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-green-100 p-3 rounded-full mb-4">
            <Leaf className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 text-center">Weekly Habit Tracker</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">Hubungkan dengan Google Sheets</p>
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
          
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 text-gray-700 font-medium py-3 rounded-lg transition-colors shadow-sm flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                Menghubungkan...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Masuk dengan Google
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 mt-4 text-center">
            Aplikasi ini akan meminta izin untuk melihat dan mengelola data di Google Sheets Anda.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
