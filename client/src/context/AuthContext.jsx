import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi, setCsrfToken } from '../services/api.js';
import { AuthContext } from './auth-context.js';
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [loading, setLoading] = useState(true);
  const refreshUser = useCallback(async () => { try { const { data } = await authApi.me(); setUser(data.data.user); setCsrfToken(data.data.csrfToken); return data.data.user; } catch { setUser(null); setCsrfToken(null); return null; } finally { setLoading(false); } }, []);
  useEffect(() => { void refreshUser(); }, [refreshUser]);
  const login = useCallback(async (credentials) => { const { data } = await authApi.login(credentials); setUser(data.data.user); setCsrfToken(data.data.csrfToken); return data.data.user; }, []);
  const logout = useCallback(async () => { await authApi.logout(); setUser(null); setCsrfToken(null); }, []);
  const value = useMemo(() => ({ user, loading, isAuthenticated: Boolean(user), login, logout, refreshUser }), [user, loading, login, logout, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
