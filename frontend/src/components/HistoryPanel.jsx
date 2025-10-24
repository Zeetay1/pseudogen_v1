import React from "react";

export default function HistoryPanel({ history = [] }) {
  if (!history.length) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">History</h2>
      <ul className="space-y-3">
        {history.map((h, i) => (
          <li
            key={i}
            className="p-3 bg-gray-100 hover:bg-blue-50 rounded-lg cursor-pointer text-sm"
          >
            <div className="text-xs text-gray-500 mb-1">
              {new Date(h.ts).toLocaleString()}
            </div>
            <div className="font-medium text-gray-800 mb-1">
              {h.style} • {h.detail}
            </div>
            <div className="text-gray-700 whitespace-pre-wrap text-xs">
              {h.markdown.slice(0, 200)}
              {h.markdown.length > 200 ? "..." : ""}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
