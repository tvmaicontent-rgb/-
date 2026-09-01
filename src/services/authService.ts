import { AuthUser, AuthSession, ApiTokenItem, UserRole } from '../types/auth';
import { safeErrorMessage } from '../utils/errorUtils';

const STORAGE_KEY = 'content_ops_auth_session';

const BUILTIN_USERS: Array<{
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  passwords: string[];
}> = [
  {
    id: 'user-admin',
    username: 'admin',
    name: 'Разработчик / Администратор',
    role: 'admin',
    department: 'Отдел контента & КАМ',
    passwords: ['OK261283', 'admin'],
  },
  {
    id: 'user-content',
    username: 'content',
    name: 'Специалист отдела контента',
    role: 'content',
    department: 'Отдел контента',
    passwords: ['content'],
  },
  {
    id: 'user-kam',
    username: 'kam',
    name: 'Менеджер коммерческого отдела',
    role: 'kam',
    department: 'КАМ',
    passwords: ['kam'],
  },
  {
    id: 'user-guest',
    username: 'guest',
    name: 'Наблюдатель (Только чтение)',
    role: 'guest',
    department: 'Общий доступ',
    passwords: ['guest', 'guest2026', 'guest123', '12345'],
  },
];

class AuthService {
  private session: AuthSession | null = null;
  private listeners: Array<(session: AuthSession | null) => void> = [];
  private isCheckingAuth = false;

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: AuthSession = JSON.parse(saved);
        if (parsed.expiresAt && parsed.expiresAt > Date.now() && parsed.token && parsed.user) {
          this.session = parsed;
        } else {
          localStorage.removeItem(STORAGE_KEY);
          this.session = null;
        }
      }
    } catch (e) {
      console.warn('Failed to load auth session:', e);
      this.session = null;
    }
  }

  /**
   * Validates saved token with the backend.
   * If backend is unavailable (e.g. static hosting like Vercel), preserves local session if unexpired.
   */
  async checkAuth(): Promise<AuthUser | null> {
    if (!this.session || !this.session.token) {
      this.setSession(null);
      return null;
    }

    if (this.session.expiresAt && this.session.expiresAt <= Date.now()) {
      this.setSession(null);
      return null;
    }

    try {
      this.isCheckingAuth = true;
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${this.session.token}`,
          Accept: 'application/json',
        },
      });

      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data && data.success && data.user) {
          // Update user info from server
          this.session.user = data.user;
          this.saveToStorage();
          this.notify();
          return data.user;
        }
      }

      // If server explicitly returns 401 / 403 (invalid token)
      if (res.status === 401 || res.status === 403) {
        this.setSession(null);
        return null;
      }

      // If server returns 404 (static hosting like Vercel) or other status, retain valid local session
      if (this.session && this.session.expiresAt > Date.now()) {
        return this.session.user;
      }

      this.setSession(null);
      return null;
    } catch (err) {
      console.warn('Failed to verify token with server:', err);
      // If network offline or static host, keep unexpired session
      if (this.session && this.session.expiresAt > Date.now()) {
        return this.session.user;
      }
      this.setSession(null);
      return null;
    } finally {
      this.isCheckingAuth = false;
    }
  }

  getSession(): AuthSession | null {
    return this.session;
  }

  getUser(): AuthUser | null {
    return this.session?.user || null;
  }

  getToken(): string | null {
    return this.session?.token || null;
  }

  isAuthenticated(): boolean {
    return Boolean(this.session && this.session.token && this.session.expiresAt > Date.now());
  }

  isAdmin(): boolean {
    return this.session?.user?.role === 'admin';
  }

  getRole(): UserRole {
    return this.session?.user?.role || 'guest';
  }

  getAuthHeader(): Record<string, string> {
    const token = this.getToken();
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
    };
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        if (this.session) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.warn('Failed to save auth session:', e);
      }
    }
  }

  setSession(session: AuthSession | null): void {
    this.session = session;
    this.saveToStorage();
    this.notify();
  }

  private authenticateClientFallback(username: string, password?: string): { success: boolean; user?: AuthUser; error?: string } {
    const cleanUser = (username || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!cleanPass) {
      return { success: false, error: 'Пожалуйста, введите пароль' };
    }

    const matched = BUILTIN_USERS.find(u => u.username.toLowerCase() === cleanUser);
    if (!matched) {
      return { success: false, error: 'Неверный логин или пароль' };
    }

    if (!matched.passwords.includes(cleanPass)) {
      return { success: false, error: 'Неверный логин или пароль' };
    }

    const authUser: AuthUser = {
      id: matched.id,
      username: matched.username,
      name: matched.name,
      role: matched.role,
      department: matched.department,
    };

    const clientPayload = {
      userId: matched.id,
      username: matched.username,
      role: matched.role,
      department: matched.department,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600,
    };

    const clientToken = `eyAiYWxnIjogIkhTMjU2IiwgInR5cCI6ICJKV1QiIH0.${btoa(JSON.stringify(clientPayload))}.client_signature`;

    const newSession: AuthSession = {
      token: clientToken,
      user: authUser,
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
    };

    this.setSession(newSession);
    return { success: true, user: authUser };
  }

  async login(username: string, password?: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser) {
      return { success: false, error: 'Введите логин пользователя' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Введите пароль' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          username: cleanUser,
          password: cleanPass,
        }),
      });

      // If backend server returns 404 (e.g. deployed on static hosting / Vercel SPA)
      if (res.status === 404) {
        return this.authenticateClientFallback(cleanUser, cleanPass);
      }

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const rawText = await res.text();
        try {
          data = JSON.parse(rawText);
        } catch {
          // If response is HTML or unknown, fallback to client credentials
          return this.authenticateClientFallback(cleanUser, cleanPass);
        }
      }

      if (res.ok && data?.success && data?.token) {
        const newSession: AuthSession = {
          token: data.token,
          user: data.user,
          expiresAt: data.expiresAt || (Date.now() + 7 * 24 * 3600 * 1000),
        };
        this.setSession(newSession);
        return { success: true, user: data.user };
      }

      return {
        success: false,
        error: safeErrorMessage(data?.error, 'Неверный логин или пароль'),
      };
    } catch (err: any) {
      console.warn('Network error calling /api/auth/login, using client fallback:', err);
      // Fallback to client auth if network request failed
      return this.authenticateClientFallback(cleanUser, cleanPass);
    }
  }

  async loginWithToken(token: string): Promise<{ success: boolean; error?: string }> {
    const cleanToken = (token || '').trim();
    if (!cleanToken) {
      return { success: false, error: 'Токен не может быть пустым' };
    }

    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanToken}`,
          Accept: 'application/json',
        },
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = null;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else if (res.status === 404) {
        // Static hosting fallback: parse client token payload if possible
        try {
          const parts = cleanToken.split('.');
          if (parts.length >= 2) {
            const payload = JSON.parse(atob(parts[1]));
            if (payload.username && payload.role) {
              const matched = BUILTIN_USERS.find(u => u.username === payload.username) || {
                id: payload.userId || 'user-custom',
                username: payload.username,
                name: payload.username,
                role: payload.role as UserRole,
                department: payload.department || 'Общий',
              };
              this.setSession({
                token: cleanToken,
                user: matched,
                expiresAt: payload.exp ? payload.exp * 1000 : Date.now() + 7 * 24 * 3600 * 1000,
              });
              return { success: true };
            }
          }
        } catch {
          // ignore
        }
      }

      if (res.ok && data?.success && data?.user) {
        this.setSession({
          token: cleanToken,
          user: data.user,
          expiresAt: data.expiresAt || (Date.now() + 7 * 24 * 3600 * 1000),
        });
        return { success: true };
      }
      return { success: false, error: safeErrorMessage(data?.error, 'Недействительный Bearer токен') };
    } catch (err: any) {
      return { success: false, error: safeErrorMessage(err, 'Ошибка проверки токена') };
    }
  }

  async logout(): Promise<void> {
    const token = this.getToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // ignore
      }
    }
    this.setSession(null);
  }

  async fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers || {});
    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });

    // If 401 Unauthorized, token has expired or is invalid
    if (response.status === 401) {
      console.warn('Bearer token unauthorized (401). Logging out...');
      this.setSession(null);
    }

    return response;
  }

  async getApiTokens(): Promise<ApiTokenItem[]> {
    try {
      const res = await this.fetchWithAuth('/api/auth/tokens');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.tokens)) {
        return data.tokens;
      }
      return [];
    } catch {
      return [];
    }
  }

  async createApiToken(name: string, role: UserRole = 'admin', expiresInDays: number = 30): Promise<{ success: boolean; token?: string; item?: ApiTokenItem; error?: string }> {
    try {
      const res = await this.fetchWithAuth('/api/auth/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, expiresInDays }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, token: data.token, item: data.item };
      }
      return { success: false, error: safeErrorMessage(data?.error, 'Не удалось создать токен') };
    } catch (e: any) {
      return { success: false, error: safeErrorMessage(e, 'Ошибка сети') };
    }
  }

  async revokeApiToken(tokenId: string): Promise<boolean> {
    try {
      const res = await this.fetchWithAuth(`/api/auth/tokens/${tokenId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      return Boolean(data && data.success);
    } catch {
      return false;
    }
  }

  subscribe(listener: (session: AuthSession | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.session);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    }
  }
}

export const authService = new AuthService();
