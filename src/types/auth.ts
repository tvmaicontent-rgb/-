export type UserRole = 'admin' | 'content' | 'kam' | 'guest';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  department: string;
  avatar?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  expiresAt: number; // Unix timestamp in ms
}

export interface ApiTokenItem {
  id: string;
  name: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  role: UserRole;
  lastUsed?: string;
}

export interface LoginResponse {
  success: boolean;
  token?: string;
  user?: AuthUser;
  expiresAt?: number;
  error?: string;
}
