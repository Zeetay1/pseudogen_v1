import React from "react";

/**
 * props:
 * - history: array of entries
 * - onSelect(entry): function called when an item is clicked (we'll set output)
 */
export default function HistoryPanel({ history = [], onSelect = () => {} }) {
  if (!history.length)
    return (
      <div className="text-sm text-gray-500 italic text-center mt-8 dark:text-slate-400">
        No history yet.
      </div>
    );

  return (
    <ul className="space-y-3">
      {history.map((h, i) => (
        <li
          key={i}
          role="button"
          onClick={() => onSelect(h)}
          className="p-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 transition cursor-pointer text-sm"
          title="Click to view full pseudocode"
        >
          <div className="text-xs text-gray-500 dark:text-slate-300 mb-1">
            {new Date(h.ts).toLocaleString()}
          </div>

          <div className="font-medium text-gray-800 dark:text-gray-100 mb-1">
            {h.style} • {h.detail}
          </div>

          <div className="text-gray-700 dark:text-slate-200 whitespace-pre-wrap text-xs">
            {h.markdown ? (h.markdown.length > 160 ? h.markdown.slice(0, 160) + "..." : h.markdown) : ""}
          </div>
        </li>
      ))}
    </ul>
  );
}
