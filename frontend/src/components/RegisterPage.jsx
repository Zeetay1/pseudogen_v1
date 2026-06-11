import React, { useState } from "react";

export default function RegisterPage({ onSwitchToLogin, onRegister, noWrapper = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await onRegister(email, password);
    } catch (err) {
      setError(err.message || "Registration failed");
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
        Create an account
      </h1>
      <p className="text-sm mb-6 text-gray-500 dark:text-slate-400">
        Sign up to use Pseudogen. Password must be at least 8 characters.
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
            htmlFor="register-email"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
          >
            Email
          </label>
          <input
            id="register-email"
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
            htmlFor="register-password"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
          >
            Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label
            htmlFor="register-confirm"
            className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300"
          >
            Confirm password
          </label>
          <input
            id="register-confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputCls}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-gray-500 dark:text-slate-400">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Sign in
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
