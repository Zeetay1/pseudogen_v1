import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const AuthContext = createContext(null);

// Access token lives only in memory — never in localStorage
// Refresh token lives in an HttpOnly cookie managed by the backend

const REFRESH_INTERVAL_MS = 14 * 60 * 1000; // refresh 1 min before 15-min expiry

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback((silentRefresh) => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(silentRefresh, REFRESH_INTERVAL_MS);
  }, []);

  const silentRefresh = useCallback(async () => {
    try {
      const res = await fetch("/auth/refresh", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token);
        scheduleRefresh(silentRefresh);
      } else {
        clearAuth();
      }
    } catch {
      clearAuth();
    }
  }, [clearAuth, scheduleRefresh]);

  // On mount: attempt a silent refresh to restore session from HttpOnly cookie
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          setToken(data.access_token);
          // Load user profile
          const meRes = await fetch("/auth/me", {
            headers: { Authorization: `Bearer ${data.access_token}` },
            credentials: "include",
          });
          if (meRes.ok) {
            setUser(await meRes.json());
          }
          scheduleRefresh(silentRefresh);
        }
      } catch {
        // No active session — that's fine
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(
    async (email, password) => {
      const res = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Login failed");
      }
      const data = await res.json();
      setToken(data.access_token);
      const meRes = await fetch("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
        credentials: "include",
      });
      if (meRes.ok) setUser(await meRes.json());
      scheduleRefresh(silentRefresh);
    },
    [scheduleRefresh, silentRefresh]
  );

  const register = useCallback(
    async (email, password) => {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Registration failed");
      }
      const data = await res.json();
      setToken(data.access_token);
      const meRes = await fetch("/auth/me", {
        headers: { Authorization: `Bearer ${data.access_token}` },
        credentials: "include",
      });
      if (meRes.ok) setUser(await meRes.json());
      scheduleRefresh(silentRefresh);
    },
    [scheduleRefresh, silentRefresh]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // ignore network errors on logout
    }
    clearAuth();
  }, [token, clearAuth]);

  const value = { token, user, loading, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
