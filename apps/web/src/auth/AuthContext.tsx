import type { AuthPayload, AuthUser } from '@instaframe/contracts';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setAccessToken } from '../lib/api';

type RegisterInput = { name: string; username: string; email: string; password: string };
type AuthContextValue = { user: AuthUser | null; loading: boolean; login(email: string, password: string, mfaCode?: string): Promise<void>; register(input: RegisterInput): Promise<void>; logout(): Promise<void> };
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api<AuthPayload>('/api/auth/refresh', { method: 'POST' }, false).then(data => { setAccessToken(data.accessToken); setUser(data.user); }).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  const authenticate = async (path: string, body: object) => { const data = await api<AuthPayload>(path, { method: 'POST', body: JSON.stringify(body) }, false); setAccessToken(data.accessToken); setUser(data.user); };
  const value = useMemo<AuthContextValue>(() => ({ user, loading, login: (email, password, mfaCode) => authenticate('/api/auth/login', { email, password, ...(mfaCode ? { mfaCode } : {}) }), register: input => authenticate('/api/auth/register', input), logout: async () => { try { await api<null>('/api/auth/logout', { method: 'POST' }, false); } finally { setAccessToken(null); setUser(null); } } }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be inside AuthProvider'); return value; }
