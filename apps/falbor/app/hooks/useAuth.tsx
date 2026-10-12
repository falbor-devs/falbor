"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { loadProfileFromServer } from "~/lib/stores/profile";

interface User {
  id: string;
  email: string;
  displayName?: string | null;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string; requiresVerification?: boolean }>;
  register: (email: string, password: string, role?: string) => Promise<{ error?: string; requiresVerification?: boolean; email?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loginWithGoogle: (data: { credential?: string; accessToken?: string; role?: string }) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function clearSessionCookie() {
  const isHttps = window.location.protocol === "https:";
  const secure = isHttps ? "; Secure" : "";
  document.cookie = `session=; Path=/; SameSite=Lax${secure}; Max-Age=0`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = (await res.json()) as { user?: { id: string; email: string; displayName?: string | null; role?: string } };
      setUser(data.user ?? null);
      if (data.user) {
        loadProfileFromServer();
        syncStorageFromServer();
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { user?: any; error?: string; requiresVerification?: boolean };
      if (!res.ok) {
        if (res.status === 403 && data.requiresVerification) {
          return { requiresVerification: true };
        }
        return { error: data.error ?? "Login failed" };
      }
      setUser(data.user);
      syncStorageFromServer();
      loadProfileFromServer();
      return {};
    } catch {
      return { error: "Network error" };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, role?: string) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = (await res.json()) as { user?: any; error?: string; requiresVerification?: boolean; email?: string };
      if (!res.ok) return { error: data.error ?? "Registration failed" };
      if (data.requiresVerification) {
        return { requiresVerification: true, email: data.email };
      }
      setUser(data.user);
      syncStorageFromServer();
      loadProfileFromServer();
      return {};
    } catch {
      return { error: "Network error" };
    }
  }, []);

  const loginWithGoogle = useCallback(async (tokenData: { credential?: string; accessToken?: string; role?: string }) => {
    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tokenData),
      });
      const data = (await res.json()) as { user?: any; error?: string };
      if (!res.ok) return { error: data.error ?? "Google login failed" };
      setUser(data.user);
      syncStorageFromServer();
      loadProfileFromServer();
      return {};
    } catch {
      return { error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      
    }
    clearSessionCookie();
    setUser(null);
  }, []);

  const value: AuthContextValue = { user, loading, login, register, logout, refresh, loginWithGoogle };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

async function syncStorageFromServer() {
  try {
    const res = await fetch("/api/sync");
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, any>;
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("__")) continue;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        
      }
    }
  } catch {
    
  }
}
