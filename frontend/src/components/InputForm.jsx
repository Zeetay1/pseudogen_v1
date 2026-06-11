import React, { useState } from "react";

const STYLE_DESCRIPTIONS = {
  Academic:
    "Formal pseudocode with uppercase keywords (BEGIN, END, IF, WHILE) and concise logical flow.",
  "Developer-Friendly":
    "Code-style pseudocode close to real syntax — functions, loops, and conditionals.",
  "English-Like":
    "Plain English steps with no programming syntax. Great for non-technical audiences.",
  "Step-by-Step":
    "Beginner-friendly pseudocode in natural language, clearly ordered and easy to follow.",
};

const MAX_LEN = 4000;

export default function InputForm({
  onResult,
  onStreamChunk,
  sessionId,
  usageInfo,
  onUsageUpdate,
  onLimitReached,
  initialProblem = "",
  chatMessages = [],
}) {
  const [problem, setProblem] = useState(initialProblem);
  const [style, setStyle] = useState("Developer-Friendly");
  const [detail, setDetail] = useState("Concise");
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [error, setError] = useState(null);

  const atLimit = usageInfo && usageInfo.remaining <= 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (atLimit) return;
    setLoading(true);
    setError(null);
    onStreamChunk?.("");

    const headers = { "Content-Type": "application/json" };
    if (sessionId) headers["X-Session-ID"] = sessionId;

    const body = { problem_description: problem, style, detail };
    if (chatMessages.length > 0) body.context = chatMessages;

    try {
      const res = await fetch("/v1/generate-pseudocode", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 429) {
          onLimitReached?.();
          return;
        }
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      if (!data.markdown) throw new Error("Received an empty response from the server.");

      if (data.used !== undefined) {
        onUsageUpdate?.({ used: data.used, limit: data.limit, remaining: data.remaining, is_guest: data.is_guest });
      }

      const updatedMessages = [
        ...chatMessages,
        { role: "user", content: problem },
        { role: "assistant", content: data.markdown },
      ];
      onResult({
        problem,
        style,
        detail,
        markdown: data.markdown,
        ts: Date.now(),
        messages: updatedMessages,
      });
    } catch (err) {
      onStreamChunk?.(null);
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
          maxLength={MAX_LEN}
          disabled={atLimit}
          placeholder={
            atLimit
              ? "Daily limit reached."
              : "e.g. Find the shortest path between two nodes in a weighted graph…"
          }
          className="w-full h-40 p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
          <span>
            {problem.length} / {MAX_LEN} characters
            {chatMessages.length > 0 && (
              <span className="ml-2 text-blue-400 dark:text-blue-500">
                · {Math.floor(chatMessages.length / 2)} exchange{chatMessages.length > 2 ? "s" : ""} in context
              </span>
            )}
          </span>
          {usageInfo && (
            <span
              className={
                usageInfo.remaining <= 1
                  ? "text-amber-500 dark:text-amber-400 font-medium"
                  : ""
              }
            >
              {usageInfo.remaining} / {usageInfo.limit} prompts left today
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
              disabled={atLimit}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
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
            disabled={atLimit}
            className="flex-1 p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
          >
            <option>Concise</option>
            <option>Detailed</option>
          </select>

          <button
            disabled={loading || atLimit}
            className={`px-5 py-2 font-semibold rounded-lg text-white transition ${
              loading || atLimit
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
}
