import React, { useState } from 'react';
import { Lock, User, KeyRound, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { authService } from '../../services/authService';
import { AuthUser } from '../../types/auth';
import { safeErrorMessage } from '../../utils/errorUtils';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Введите логин');
      return;
    }
    if (!password.trim()) {
      setError('Введите пароль');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await authService.login(username, password);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setError(safeErrorMessage(result.error, 'Неверный логин или пароль'));
      }
    } catch (err: any) {
      setIsLoading(false);
      setError(safeErrorMessage(err, 'Ошибка подключения к серверу'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d8eaf8] via-[#eaf3fb] to-[#f6f9fc] flex items-center justify-center p-4 selection:bg-sky-200 selection:text-sky-900">
      <div className="w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-sky-950/5 border border-sky-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-8 text-white relative">
            <div className="w-12 h-12 bg-sky-500/20 border border-sky-400/30 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md">
              <Lock className="w-6 h-6 text-sky-300" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight mb-1">
              Панель управления
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              Отдел контента & Коммерческий отдел
            </p>
            <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full border border-white/10 text-[11px] font-mono text-sky-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Bearer Auth</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Логин пользователя
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="login-username-input"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Например: admin, content, kam, guest"
                    autoFocus
                    required
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Пароль
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Введите пароль доступа"
                    required
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 focus:outline-hidden transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                id="login-submit-button"
                disabled={isLoading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-sky-600/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Проверка пары и получение токена...</span>
                  </>
                ) : (
                  <>
                    <span>Войти в систему</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Security notice footer */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Защищенная авторизация по стандарту Bearer Token (HS256)</span>
          </p>
        </div>
      </div>
    </div>
  );
};
