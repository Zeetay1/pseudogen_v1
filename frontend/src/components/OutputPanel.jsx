import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function OutputPanel({ markdown }) {
  const [copied, setCopied] = useState(false);

  if (!markdown) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // show "Copied!" for 2 seconds
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  return (
    <div className="mt-6 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 bg-white dark:bg-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Generated Pseudocode
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="relative text-blue-600 dark:text-blue-400 hover:underline text-sm transition"
          >
            {copied ? (
              <span className="text-green-600 dark:text-green-400 font-medium">
                Copied!
              </span>
            ) : (
              "Copy"
            )}
          </button>
        </div>
      </div>

      <div className="h-72 md:h-96 overflow-y-auto border border-gray-200 dark:border-slate-700 p-4 rounded-lg bg-gray-50 dark:bg-slate-900 text-sm font-mono text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
