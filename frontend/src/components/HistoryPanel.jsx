import React from "react";
import { Trash2 } from "lucide-react"; // Import trash icon

// Displays list of past pseudocode generations
export default function HistoryPanel({
  history = [],
  onSelect = () => {},
  onDelete = () => {}, // Added delete handler
}) {
  // Show message when history is empty
  if (!history.length)
    return (
      <div className="text-sm text-gray-500 italic text-center mt-8 dark:text-slate-400">
        No history yet.
      </div>
    );

  return (
    <ul className="space-y-2">
      {history.map((h, i) => {
        {/* Create a short "title" version of the problem or markdown */}
        const title =
          h.problem && h.problem.trim().length > 0
            ? h.problem.slice(0, 50) + (h.problem.length > 50 ? "..." : "")
            : h.markdown
            ? h.markdown.slice(0, 50) + (h.markdown.length > 50 ? "..." : "")
            : "Untitled";

        return (
          <li
            key={i}
            className="p-3 rounded-lg flex justify-between items-start gap-2 cursor-pointer text-sm
                       bg-transparent hover:bg-blue-50 dark:hover:bg-slate-700
                       text-gray-800 dark:text-gray-200 transition group"
          >
            {/* Left section — main info, click to select */}
            <div
              onClick={() => onSelect(h)}
              role="button"
              className="flex-1 overflow-hidden"
              title="Click to view pseudocode"
            >
              <div className="font-medium truncate">{title}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {h.style} • {h.detail}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400">
                {new Date(h.ts).toLocaleString()}
              </div>
            </div>

            {/* Right section — delete button, visible on hover */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering onSelect
                onDelete(i);
              }}
              className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600 transition"
              title="Delete this entry"
            >
              <Trash2 size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
