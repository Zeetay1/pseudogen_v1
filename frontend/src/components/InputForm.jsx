// frontend/src/components/InputForm.jsx
import React, { useState } from "react";
import OutputPanel from "./OutputPanel";

export default function InputForm({ onResult, plan = "free" }) {
  const maxLen = plan === "premium" ? 12000 : 4000;
  // Input fields and UI states
  const [problem, setProblem] = useState("");
  const [style, setStyle] = useState("Step-by-Step");
  const [detail, setDetail] = useState("Concise");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState(null);

  // Map of style descriptions
  const styleDescriptions = {
    "Academic": "Formal and structured pseudocode with uppercase keywords and concise logical flow.",
    "Developer-Friendly": "Readable, code-style pseudocode that feels close to real programming syntax.",
    "English-Like": "Plain English step-by-step explanation with no programming syntax.",
    "Step-by-Step": "Beginner-friendly pseudocode written in natural language, clearly ordered and easy to follow."
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const headers = { "Content-Type": "application/json" };
      if (plan === "premium") headers["X-Plan"] = "premium";
      const res = await fetch("/generate-pseudocode", {
        method: "POST",
        headers,
        body: JSON.stringify({ problem_description: problem, style, detail }),
      });
      const text = await res.text();
      const isJson = text.trim().startsWith("{");
      if (!res.ok) {
        const msg = isJson
          ? (JSON.parse(text).detail || "Server error")
          : `Server error (${res.status}). Backend may be unreachable.`;
        throw new Error(msg);
      }
      const data = isJson ? JSON.parse(text) : { markdown: text };
      if (!data.markdown) throw new Error("Invalid response from server.");
      setOutput(data.markdown);
      onResult({ problem, style, detail, markdown: data.markdown, ts: Date.now() });
    } catch (err) {
      setError(err.message || "Request failed. Backend may be unreachable or the request rate limit was exceeded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 rounded-xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Describe Your Problem
        </h2>

        {error && (
          <div
            className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Problem input field */}
        <textarea
          required
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          maxLength={maxLen}
          placeholder="Describe the problem or algorithm..."
          className="w-full h-40 p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
        />
        <div className="text-xs text-gray-500 dark:text-slate-400">
          {problem.length} / {maxLen} characters
          {plan !== "premium" && maxLen === 4000 && " — Upgrade for up to 12,000"}
        </div>

        {/* Style and detail selection controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Style selector with hover tooltip */}
          <div
            className="relative flex-1"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
            >
              <option>Academic</option>
              <option>Developer-Friendly</option>
              <option>English-Like</option>
              <option>Step-by-Step</option>
            </select>

            {/* Tooltip showing current style description */}
            {showTooltip && (
              <div className="absolute top-full mt-2 w-64 bg-gray-800 text-gray-100 text-xs p-2 rounded-lg shadow-lg z-20">
                {styleDescriptions[style]}
              </div>
            )}
          </div>

          {/* Detail selector */}
          <select
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="flex-1 p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
          >
            <option>Concise</option>
            <option>Detailed</option>
          </select>

          {/* Generate button */}
          <button
            disabled={loading}
            className={`px-4 py-2 font-semibold rounded-lg text-white transition ${
              loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
}
