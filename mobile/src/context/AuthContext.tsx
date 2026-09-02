import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import apiClient, { setAuthToken } from "@/lib/apiClient";
import { TOKEN_KEY, getItem, removeItem, setItem } from "@/lib/storage";
import type { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    country: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes "haven't read SecureStore yet" from "read it, there was no token".
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getItem(TOKEN_KEY);
      if (cancelled) return;
      setAuthToken(stored);
      setToken(stored);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { data } = await apiClient.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch (error) {
      console.error("Failed to load profile", error);
      await removeItem(TOKEN_KEY);
      setAuthToken(null);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!hydrated) return;
    void fetchProfile();
  }, [hydrated, fetchProfile]);

  const handleAuthSuccess = useCallback(async (payload: { user: User; token: string }) => {
    await setItem(TOKEN_KEY, payload.token);
    setAuthToken(payload.token);
    setToken(payload.token);
    setUser(payload.user);
    setLoading(false);
  }, []);

  const login = useCallback(
    async (credentials: { email: string; password: string }) => {
      const { data } = await apiClient.post<{ user: User; token: string }>("/auth/login", credentials);
      await handleAuthSuccess(data);
    },
    [handleAuthSuccess],
  );

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; phone?: string; country: string }) => {
      const { data } = await apiClient.post<{ user: User; token: string }>("/auth/register", payload);
      await handleAuthSuccess(data);
    },
    [handleAuthSuccess],
  );

  const logout = useCallback(async () => {
    await removeItem(TOKEN_KEY);
    setAuthToken(null);
    setToken(null);
    setUser(null);
    // Drop every cached response so the next account never sees the last one's data.
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading: loading || !hydrated,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, token, loading, hydrated, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }
  return context;
};
