import React, { useState } from "react";
import { Trash2, MoreVertical, Edit3 } from "lucide-react";

// Displays list of past pseudocode generations
export default function HistoryPanel({
  history = [],
  onSelect = () => {},
  onDelete = () => {},
  onRename = () => {},
}) {
  // Track which menu is open
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

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
            className="relative p-3 rounded-lg flex justify-between items-start gap-2 cursor-pointer text-sm
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

            {/* Right section — 3-dot menu (appears on hover) */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering onSelect
                  setOpenMenuIndex(openMenuIndex === i ? null : i);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>

              {/* Dropdown menu (Rename / Delete) */}
              {openMenuIndex === i && (
                <div
                  className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      const newName = prompt("Enter a new name:", title);
                      if (newName && newName.trim()) {
                        onRename(i, newName.trim());
                        setOpenMenuIndex(null);
                      }
                    }}
                    className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Edit3 size={14} className="mr-2" /> Rename
                  </button>

                  <button
                    onClick={() => {
                      onDelete(i);
                      setOpenMenuIndex(null);
                    }}
                    className="flex items-center w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Trash2 size={14} className="mr-2" /> Delete
                  </button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
