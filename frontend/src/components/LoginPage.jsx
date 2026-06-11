import React, { useState } from "react";

export default function LoginPage({ onSwitchToRegister, onLogin, noWrapper = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 " +
    "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 " +
    "bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100";

  const card = (
    <div className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 p-8 shadow-lg bg-white dark:bg-slate-800">
      <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
        Sign in to Pseudogen
      </h1>
      <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
        Enter your email and password to continue.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div
            className="rounded-lg p-3 text-sm bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300"
            role="alert"
          >
            {error}
          </div>
        )}
        <div>
          <label
            htmlFor="login-email"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
          >
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label
            htmlFor="login-password"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
          >
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
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
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Sign up
        </button>
      </p>
    </div>
  );

  if (noWrapper) return card;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-100 dark:bg-slate-900">
      {card}
    </div>
  );
}
