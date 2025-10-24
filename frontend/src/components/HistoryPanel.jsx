import React from "react";

export default function HistoryPanel({ history = [], onSelect = () => {} }) {
  if (!history.length)
    return (
      <div className="text-sm text-gray-500 italic text-center mt-8 dark:text-slate-400">
        No history yet.
      </div>
    );

  return (
    <ul className="space-y-2">
      {history.map((h, i) => {
        // Create a short "title" version of the problem or markdown
        const title =
          h.problem && h.problem.trim().length > 0
            ? h.problem.slice(0, 50) + (h.problem.length > 50 ? "..." : "")
            : h.markdown
            ? h.markdown.slice(0, 50) + (h.markdown.length > 50 ? "..." : "")
            : "Untitled";

        return (
          <li
            key={i}
            onClick={() => onSelect(h)}
            role="button"
            className="p-3 rounded-lg cursor-pointer text-sm
                       bg-transparent hover:bg-blue-50 dark:hover:bg-slate-700
                       text-gray-800 dark:text-gray-200 transition"
            title="Click to view pseudocode"
          >
            <div className="font-medium truncate">{title}</div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {h.style} • {h.detail}
            </div>
            <div className="text-xs text-gray-500 dark:text-slate-400">
              {new Date(h.ts).toLocaleString()}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
