import React, { useState } from "react";

export default function LoginPage({ onSwitchToRegister, onLogin, theme }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-slate-900" : "bg-gray-100"}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 shadow-lg ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">Sign in to Pseudogen</h1>
        <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Enter your email and password to continue.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`rounded-lg p-3 text-sm ${isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"}`} role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="login-email" className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="login-password" className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className={`mt-6 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Don&apos;t have an account?{" "}
          <button type="button" onClick={onSwitchToRegister} className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
}
