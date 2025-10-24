import React from "react";
import ReactMarkdown from "react-markdown";

export default function OutputPanel({ markdown }) {
  if (!markdown) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">
          Generated Pseudocode
        </h2>
        <button
          onClick={() => navigator.clipboard.writeText(markdown)}
          className="text-blue-600 hover:underline text-sm"
        >
          Copy
        </button>
      </div>
      <div className="h-60 overflow-y-auto border border-gray-200 p-3 rounded-lg bg-gray-50 text-sm font-mono text-gray-800 whitespace-pre-wrap">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
