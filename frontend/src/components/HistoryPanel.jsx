//frontend/src/components/HistoryPanel.jsx
import React from "react";
export default function HistoryPanel({ history = [] }) {
  if (!history.length) return null;
  return (
    <div className="mt-6">
      <h3 className="font-semibold">History</h3>
      <ul>
        {history.map((h, i) => (
          <li key={i} className="border p-2 my-2">
            <div className="text-sm text-gray-600">{new Date(h.ts).toLocaleString()}</div>
            <div className="font-medium">{h.style} — {h.detail}</div>
            <pre className="whitespace-pre-wrap">{h.markdown.slice(0, 400)}{h.markdown.length>400?"...":""}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
