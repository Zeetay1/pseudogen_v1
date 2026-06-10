import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

const STYLE_DESCRIPTIONS = {
  "Academic": "Formal pseudocode with uppercase keywords (BEGIN, END, IF, WHILE) and concise logical flow.",
  "Developer-Friendly": "Code-style pseudocode close to real syntax — functions, loops, and conditionals.",
  "English-Like": "Plain English steps with no programming syntax. Great for non-technical audiences.",
  "Step-by-Step": "Beginner-friendly pseudocode in natural language, clearly ordered and easy to follow.",
};

export default function InputForm({ onResult, plan = "free" }) {
  const { token, logout } = useAuth();
  const maxLen = plan === "premium" ? 12000 : 4000;
  const [problem, setProblem] = useState("");
  const [style, setStyle] = useState("Step-by-Step");
  const [detail, setDetail] = useState("Concise");
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/generate-pseudocode", {
        method: "POST",
        headers,
        body: JSON.stringify({ problem_description: problem, style, detail }),
      });
      const text = await res.text();
      const isJson = text.trim().startsWith("{");
      if (!res.ok) {
        if (res.status === 401) logout();
        const msg = isJson
          ? (JSON.parse(text).detail || "Server error")
          : `Server error (${res.status}). The backend may be unreachable.`;
        throw new Error(msg);
      }
      const data = isJson ? JSON.parse(text) : { markdown: text };
      if (!data.markdown) throw new Error("Received an empty response from the server.");
      onResult({ problem, style, detail, markdown: data.markdown, ts: Date.now() });
    } catch (err) {
      setError(err.message || "Request failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 rounded-xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Describe your problem
        </h2>

        {error && (
          <div
            className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        <textarea
          required
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          maxLength={maxLen}
          placeholder="e.g. Find the shortest path between two nodes in a weighted graph…"
          className="w-full h-40 p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 resize-none"
        />
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
          <span>{problem.length} / {maxLen} characters</span>
          {plan !== "premium" && (
            <span>
              <button
                type="button"
                className="text-blue-500 hover:underline"
                onClick={() => {}}
              >
                Upgrade to Premium
              </button>
              {" "}for up to 12,000
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div
            className="relative flex-1"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option>Academic</option>
              <option>Developer-Friendly</option>
              <option>English-Like</option>
              <option>Step-by-Step</option>
            </select>

            {showTooltip && (
              <div className="absolute top-full mt-2 w-64 bg-gray-800 text-gray-100 text-xs p-3 rounded-lg shadow-lg z-20 leading-relaxed">
                {STYLE_DESCRIPTIONS[style]}
              </div>
            )}
          </div>

          <select
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="flex-1 p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option>Concise</option>
            <option>Detailed</option>
          </select>

          <button
            disabled={loading}
            className={`px-5 py-2 font-semibold rounded-lg text-white transition ${
              loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
}
