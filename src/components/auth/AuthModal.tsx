import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { authService } from '../../services/authService';
import { AuthUser, AuthSession, ApiTokenItem, UserRole } from '../../types/auth';
import {
  ShieldCheck,
  KeyRound,
  Lock,
  User,
  Users,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Plus,
  LogOut,
  Terminal,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthChanged?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthChanged,
}) => {
  const [session, setSession] = useState<AuthSession | null>(authService.getSession());
  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'token_login' | 'api_tokens'>('profile');

  // Login form state
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rawTokenInput, setRawTokenInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Copy state
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedHeader, setCopiedHeader] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // API Tokens state
  const [apiTokens, setApiTokens] = useState<ApiTokenItem[]>([]);
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenRole, setNewTokenRole] = useState<UserRole>('admin');
  const [newTokenDays, setNewTokenDays] = useState(30);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isCreatingToken, setIsCreatingToken] = useState(false);

  useEffect(() => {
    const unsub = authService.subscribe(s => {
      setSession(s);
      if (onAuthChanged) onAuthChanged();
    });
    setSession(authService.getSession());
    return unsub;
  }, [onAuthChanged]);

  useEffect(() => {
    if (isOpen) {
      setSession(authService.getSession());
      setLoginError('');
      setPassword('');
      setGeneratedToken(null);
      loadApiTokens();
    }
  }, [isOpen]);

  const loadApiTokens = async () => {
    const list = await authService.getApiTokens();
    setApiTokens(list);
  };

  const handleRoleLogin = async (role: UserRole, customPassword?: string) => {
    setIsLoading(true);
    setLoginError('');
    const pwd = customPassword !== undefined ? customPassword : password;
    const res = await authService.login(role, pwd);
    setIsLoading(false);

    if (res.success) {
      setPassword('');
      setActiveTab('profile');
      if (onAuthChanged) onAuthChanged();
    } else {
      setLoginError(res.error || 'Ошибка входа');
    }
  };

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawTokenInput.trim()) return;

    setIsLoading(true);
    setLoginError('');
    const res = await authService.loginWithToken(rawTokenInput);
    setIsLoading(false);

    if (res.success) {
      setRawTokenInput('');
      setActiveTab('profile');
      if (onAuthChanged) onAuthChanged();
    } else {
      setLoginError(res.error || 'Недействительный Bearer токен');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setActiveTab('roles');
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTokenName.trim()) return;

    setIsCreatingToken(true);
    const res = await authService.createApiToken(newTokenName, newTokenRole, newTokenDays);
    setIsCreatingToken(false);

    if (res.success && res.token) {
      setGeneratedToken(res.token);
      setNewTokenName('');
      loadApiTokens();
    }
  };

  const handleRevokeToken = async (id: string) => {
    if (confirm('Отозвать этот API токен? Любые скрипты с этим токеном потеряют доступ.')) {
      await authService.revokeApiToken(id);
      loadApiTokens();
    }
  };

  const copyToClipboard = (text: string, type: 'token' | 'header' | 'curl') => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2500);
    } else if (type === 'header') {
      setCopiedHeader(true);
      setTimeout(() => setCopiedHeader(false), 2500);
    } else if (type === 'curl') {
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2500);
    }
  };

  const currentToken = session?.token || '';
  const currentUser = session?.user;
  const expiresDate = session?.expiresAt ? new Date(session.expiresAt).toLocaleString('ru-RU') : '—';

  const curlSnippet = `curl -X GET "http://localhost:3000/api/sheets/sync" \\
  -H "Authorization: Bearer ${currentToken}" \\
  -H "Content-Type: application/json"`;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Авторизация & Управление Bearer токенами"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
            <span>Текущая сессия & Токен</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'roles'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Сменить роль / Аккаунт</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('token_login')}
            className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'token_login'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Вход по Bearer токену</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('api_tokens');
              loadApiTokens();
            }}
            className={`py-2 px-3.5 font-bold text-xs border-b-2 flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === 'api_tokens'
                ? 'border-sky-600 text-sky-700 bg-sky-50/50 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-indigo-600" />
            <span>API Токены ({apiTokens.length})</span>
          </button>
        </div>

        {/* TAB 1: Profile & Current Bearer Token */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {/* User status card */}
            <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-xl border border-slate-700 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center font-bold text-lg">
                    {currentUser?.role === 'admin'
                      ? '🛡️'
                      : currentUser?.role === 'content'
                      ? '🎨'
                      : currentUser?.role === 'kam'
                      ? '💼'
                      : '👁️'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-white">{currentUser?.name || 'Администратор'}</h4>
                      <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-sky-400/20 text-sky-300 border border-sky-400/30">
                        {currentUser?.role || 'admin'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">{currentUser?.department || 'Отдел контента & КАМ'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('roles')}
                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Сменить роль</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Выйти</span>
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-700/60 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-400" />
                  <span>Действителен до: <span className="text-slate-200 font-mono font-semibold">{expiresDate}</span></span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-mono">Запросы защищены Bearer Token & Server Proxy</span>
                </div>
              </div>
            </div>

            {/* Bearer Token details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-sky-600" />
                  <span>Активный Bearer токен авторизации (JWT / HS256)</span>
                </h5>
                <span className="text-[10px] font-mono text-slate-500">
                  Header: <code>Authorization: Bearer &lt;token&gt;</code>
                </span>
              </div>

              <div className="relative">
                <div className="p-2.5 bg-white border border-slate-300 rounded-lg text-xs font-mono break-all text-slate-700 max-h-24 overflow-y-auto select-all">
                  {currentToken || 'Токен не инициализирован'}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentToken, 'token')}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedToken ? 'Токен скопирован!' : 'Скопировать токен'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(`Authorization: Bearer ${currentToken}`, 'header')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {copiedHeader ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedHeader ? 'Заголовок скопирован!' : 'Скопировать заголовок HTTP'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(curlSnippet, 'curl')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  {copiedCurl ? <Check className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5 text-indigo-600" />}
                  <span>{copiedCurl ? 'cURL команда скопирована!' : 'Скопировать cURL'}</span>
                </button>
              </div>
            </div>

            {/* Architecture note */}
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Безопасность данных:</span> Браузер больше не делает прямых запросов к Google Таблицам. Все запросы на чтение и запись проксируются через сервер <code>/api/sheets/*</code> с проверкой подписи Bearer токена.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Roles Selection / Switch */}
        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-600">
              Выберите учетную запись для генерации соответствующего Bearer токена и прав доступа:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Admin */}
              <div
                onClick={() => setSelectedRole('admin')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedRole === 'admin'
                    ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🛡️</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Разработчик / Admin</h4>
                      <p className="text-[11px] text-slate-500">Полный доступ + Панель dev</p>
                    </div>
                  </div>
                  {selectedRole === 'admin' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-400">
                  Пароль: <code>OK261283</code> или <code>admin</code>
                </div>
              </div>

              {/* Content */}
              <div
                onClick={() => setSelectedRole('content')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedRole === 'content'
                    ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎨</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Отдел контента</h4>
                      <p className="text-[11px] text-slate-500">Товары контента, выгрузка</p>
                    </div>
                  </div>
                  {selectedRole === 'content' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-400">
                  Пароль: <code>content</code>
                </div>
              </div>

              {/* KAM */}
              <div
                onClick={() => setSelectedRole('kam')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedRole === 'kam'
                    ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">💼</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Коммерческий отдел (КАМ)</h4>
                      <p className="text-[11px] text-slate-500">Товары КАМ, задачи, выгрузка</p>
                    </div>
                  </div>
                  {selectedRole === 'kam' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-400">
                  Пароль: <code>kam</code>
                </div>
              </div>

              {/* Guest */}
              <div
                onClick={() => setSelectedRole('guest')}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedRole === 'guest'
                    ? 'border-sky-600 bg-sky-50/70 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👁️</span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Наблюдатель</h4>
                      <p className="text-[11px] text-slate-500">Только чтение и просмотр</p>
                    </div>
                  </div>
                  {selectedRole === 'guest' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                </div>
                <div className="mt-2 text-[10px] font-mono text-slate-400">
                  Без пароля
                </div>
              </div>
            </div>

            {/* Password input & submit */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="text-xs font-bold text-slate-800">
                Авторизация для роли «{selectedRole === 'admin' ? 'Разработчик / Admin' : selectedRole === 'content' ? 'Отдел контента' : selectedRole === 'kam' ? 'Коммерческий отдел' : 'Наблюдатель'}»
              </div>

              {selectedRole !== 'guest' && (
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={`Введите пароль (для ${selectedRole})`}
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setLoginError('');
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleRoleLogin(selectedRole);
                    }}
                    className="w-full pl-9 pr-10 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {loginError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleRoleLogin(selectedRole)}
                  disabled={isLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  <span>Войти и выпустить Bearer токен</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Token Login */}
        {activeTab === 'token_login' && (
          <form onSubmit={handleTokenLogin} className="space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-sky-600" />
                  <span>Прямой вход по Bearer токену</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Вставьте существующий JWT Bearer токен для мгновенной аутентификации.
                </p>
              </div>

              <textarea
                placeholder="Вставьте токен: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                rows={4}
                value={rawTokenInput}
                onChange={e => {
                  setRawTokenInput(e.target.value);
                  setLoginError('');
                }}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              {loginError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !rawTokenInput.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Проверить и применить токен</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 4: API Tokens Management */}
        {activeTab === 'api_tokens' && (
          <div className="space-y-4">
            {/* Create new token form */}
            <form onSubmit={handleCreateToken} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Создать новый постоянный API Bearer токен</span>
                </h4>
                <span className="text-[10px] text-slate-500">Для внешних скриптов, ботов и интеграций</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Название / Назначение</label>
                  <input
                    type="text"
                    placeholder="Напр. Скрипт синхронизации 1С"
                    value={newTokenName}
                    onChange={e => setNewTokenName(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Роль доступа</label>
                  <select
                    value={newTokenRole}
                    onChange={e => setNewTokenRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value="admin">Разработчик (Admin)</option>
                    <option value="content">Отдел контента</option>
                    <option value="kam">Коммерческий отдел (КАМ)</option>
                    <option value="guest">Наблюдатель (Guest)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Срок действия</label>
                  <select
                    value={newTokenDays}
                    onChange={e => setNewTokenDays(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    <option value={7}>7 дней</option>
                    <option value={30}>30 дней</option>
                    <option value={90}>90 дней</option>
                    <option value={365}>1 год (365 дней)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreatingToken || !newTokenName.trim()}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
              >
                {isCreatingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                <span>Сгенерировать API Bearer токен</span>
              </button>
            </form>

            {/* Generated Token Alert */}
            {generatedToken && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Токен успешно создан! Скопируйте его:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedToken, 'token')}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold flex items-center gap-1"
                  >
                    {copiedToken ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedToken ? 'Скопировано!' : 'Скопировать'}</span>
                  </button>
                </div>
                <div className="p-2 bg-white border border-emerald-200 rounded text-xs font-mono break-all text-slate-800 select-all max-h-20 overflow-y-auto">
                  {generatedToken}
                </div>
              </div>
            )}

            {/* Existing API Tokens Table */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-800">
                Активные постоянные токены:
              </div>

              {apiTokens.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                  Нет созданных постоянных токенов
                </div>
              ) : (
                <div className="space-y-2">
                  {apiTokens.map(tok => (
                    <div
                      key={tok.id}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{tok.name}</span>
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono font-bold uppercase">
                            {tok.role}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-3">
                          <span>Создан: {new Date(tok.createdAt).toLocaleDateString('ru-RU')}</span>
                          <span>Истекает: {new Date(tok.expiresAt).toLocaleDateString('ru-RU')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(tok.token, 'token')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold flex items-center gap-1 border border-slate-300"
                          title="Скопировать токен"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Копировать</span>
                        </button>
                        {tok.id !== 'master-api-token' && (
                          <button
                            type="button"
                            onClick={() => handleRevokeToken(tok.id)}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded border border-rose-200"
                            title="Отозвать токен"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
