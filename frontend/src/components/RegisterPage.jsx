import React, { useState } from "react";

export default function RegisterPage({ onSwitchToLogin, onRegister, theme }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isDark = theme === "dark";

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

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${isDark ? "bg-slate-900" : "bg-gray-100"}`}>
      <div className={`w-full max-w-md rounded-2xl border p-8 shadow-lg ${isDark ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`}>
        <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">Create an account</h1>
        <p className={`text-sm mb-6 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Sign up to use Pseudogen. Password must be at least 8 characters.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className={`rounded-lg p-3 text-sm ${isDark ? "bg-red-900/30 text-red-300" : "bg-red-50 text-red-700"}`} role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="register-email" className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              Email
            </label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              Password
            </label>
            <input
              id="register-password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`}
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label htmlFor="register-confirm" className={`block text-sm font-medium mb-1 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              Confirm password
            </label>
            <input
              id="register-confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${isDark ? "bg-slate-900 border-slate-600 text-gray-100" : "bg-white border-gray-300 text-gray-800"}`}
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
        <p className={`mt-6 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin} className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
