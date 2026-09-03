import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authApi, setCsrfToken } from "../services/api.js";
import { AuthContext } from "./auth-context.js";
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshPromise = useRef(null);
  const refreshUser = useCallback(async () => {
    if (refreshPromise.current) return refreshPromise.current;
    refreshPromise.current = (async () => {
      try {
        const { data } = await authApi.me();
        setUser(data.data.user);
        setCsrfToken(data.data.csrfToken);
        return data.data.user;
      } catch {
        setUser(null);
        setCsrfToken(null);
        return null;
      } finally {
        setLoading(false);
        refreshPromise.current = null;
      }
    })();
    return refreshPromise.current;
  }, []);
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);
  const login = useCallback(async (credentials) => {
    const { data } = await authApi.login(credentials);
    setUser(data.data.user);
    setCsrfToken(data.data.csrfToken);
    return data.data.user;
  }, []);
  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setCsrfToken(null);
  }, []);
  const expireSession = useCallback(() => {
    setUser(null);
    setCsrfToken(null);
    setLoading(false);
  }, []);
  const syncProfileSummary = useCallback((profile) => {
    setUser((current) =>
      current
        ? {
            ...current,
            profile: {
              ...current.profile,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl ?? null,
              completionScore: profile.completionScore,
              isCompleteForApplications: profile.isCompleteForApplications,
              needsOnboarding: Boolean(profile.needsOnboarding),
            },
          }
        : current,
    );
  }, []);
  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login,
      logout,
      expireSession,
      syncProfileSummary,
      refreshUser,
    }),
    [
      user,
      loading,
      login,
      logout,
      expireSession,
      syncProfileSummary,
      refreshUser,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
