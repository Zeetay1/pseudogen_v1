import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "pseudogen_token";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!localStorage.getItem(STORAGE_KEY));

  const setToken = useCallback((newToken) => {
    if (newToken) {
      localStorage.setItem(STORAGE_KEY, newToken);
      setTokenState(newToken);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setTokenState(null);
      setUser(null);
    }
  }, []);

  const loadUser = useCallback(async () => {
    const t = localStorage.getItem(STORAGE_KEY);
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        setTokenState(t);
      } else {
        setToken(null);
      }
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, [setToken]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email, password) => {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
      }
      const data = await res.json();
      setToken(data.access_token);
      await loadUser();
    },
    [setToken, loadUser]
  );

  const register = useCallback(
    async (email, password) => {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Registration failed");
      }
      const data = await res.json();
      setToken(data.access_token);
      await loadUser();
    },
    [setToken, loadUser]
  );

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  const value = { token, user, loading, login, register, logout, loadUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
