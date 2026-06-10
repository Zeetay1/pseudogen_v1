import React, { useState } from "react";
import { Trash2, MoreVertical, Edit3 } from "lucide-react";

export default function HistoryPanel({
  history = [],
  onSelect = () => {},
  onDelete = () => {},
  onRename = () => {},
}) {
  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  if (!history.length) {
    return (
      <div className="text-sm text-gray-400 dark:text-slate-500 text-center mt-10">
        No history yet.
      </div>
    );
  }

  return (
    <ul className="space-y-1">
      {history.map((h, i) => {
        const raw = h.problem?.trim() || h.markdown || "";
        const title = raw.length > 0
          ? raw.slice(0, 50) + (raw.length > 50 ? "…" : "")
          : "Untitled";

        return (
          <li
            key={i}
            className="relative p-3 rounded-lg flex justify-between items-start gap-2 cursor-pointer text-sm
                       bg-transparent hover:bg-blue-50 dark:hover:bg-slate-700
                       text-gray-800 dark:text-gray-200 transition group"
          >
            <div
              onClick={() => onSelect(h)}
              role="button"
              className="flex-1 overflow-hidden"
              title="Load this result"
            >
              <div className="font-medium truncate">{title}</div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {h.style} · {h.detail}
              </div>
              <div className="text-xs text-gray-400 dark:text-slate-500">
                {new Date(h.ts).toLocaleString()}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenMenuIndex(openMenuIndex === i ? null : i);
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition p-0.5"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>

              {openMenuIndex === i && (
                <div
                  className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg z-10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      const newName = prompt("Rename entry:", title);
                      if (newName?.trim()) {
                        onRename(i, newName.trim());
                        setOpenMenuIndex(null);
                      }
                    }}
                    className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Edit3 size={13} className="mr-2" /> Rename
                  </button>

                  <button
                    onClick={() => {
                      onDelete(i);
                      setOpenMenuIndex(null);
                    }}
                    className="flex items-center w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    <Trash2 size={13} className="mr-2" /> Delete
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
