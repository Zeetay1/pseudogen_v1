import React, { useState, useRef, useEffect } from "react";
import { Trash2, MoreVertical, Edit3 } from "lucide-react";

export default function HistoryPanel({
  history = [],
  onSelect = () => {},
  onDelete = () => {},
  onRename = () => {},
}) {
  const [openMenuIndex, setOpenMenuIndex] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [renamingIndex, setRenamingIndex] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const renameRef = useRef(null);

  useEffect(() => {
    if (renamingIndex !== null && renameRef.current) {
      renameRef.current.focus();
      renameRef.current.select();
    }
  }, [renamingIndex]);

  if (!history.length) {
    return (
      <div className="text-sm text-gray-400 dark:text-slate-500 text-center mt-10">
        No history yet.
      </div>
    );
  }

  function startRename(i, title) {
    setOpenMenuIndex(null);
    setRenameValue(title);
    setRenamingIndex(i);
  }

  function saveRename(i) {
    if (renameValue.trim()) {
      onRename(i, renameValue.trim());
    }
    setRenamingIndex(null);
  }

  function confirmDelete(i) {
    onDelete(i);
    setPendingDelete(null);
  }

  return (
    <ul className="space-y-1">
      {history.map((h, i) => {
        const raw = h.problem?.trim() || h.markdown || "";
        const title =
          raw.length > 0 ? raw.slice(0, 50) + (raw.length > 50 ? "…" : "") : "Untitled";

        return (
          <li
            key={i}
            className="relative p-3 rounded-lg flex justify-between items-start gap-2 text-sm
                       bg-transparent hover:bg-blue-50 dark:hover:bg-slate-700
                       text-gray-800 dark:text-gray-200 transition group"
          >
            {renamingIndex === i ? (
              <div className="flex-1 flex flex-col gap-1.5">
                <input
                  ref={renameRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveRename(i);
                    if (e.key === "Escape") setRenamingIndex(null);
                  }}
                  className="w-full text-sm px-2 py-1 border border-blue-400 rounded bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-1.5">
                  <button
                    onClick={() => saveRename(i)}
                    className="text-xs px-2 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenamingIndex(null)}
                    className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : pendingDelete === i ? (
              <div className="flex-1 flex flex-col gap-1.5">
                <p className="text-sm text-gray-700 dark:text-slate-300">Remove this entry?</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => confirmDelete(i)}
                    className="text-xs px-2 py-0.5 rounded bg-red-600 text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setPendingDelete(null)}
                    className="text-xs px-2 py-0.5 rounded border border-gray-300 dark:border-slate-600 text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div
                  onClick={() => onSelect(h)}
                  role="button"
                  className="flex-1 overflow-hidden cursor-pointer"
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
                        onClick={() => startRename(i, title)}
                        className="flex items-center w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Edit3 size={13} className="mr-2" /> Rename
                      </button>
                      <button
                        onClick={() => {
                          setOpenMenuIndex(null);
                          setPendingDelete(i);
                        }}
                        className="flex items-center w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        <Trash2 size={13} className="mr-2" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
