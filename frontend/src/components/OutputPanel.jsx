// frontend/src/components/OutputPanel.jsx
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";

export default function OutputPanel({ markdown, plan = "free" }) {
  const [copied, setCopied] = useState(false);

  if (!markdown) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const download = (filename, content, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportTxt = () => download("pseudocode.txt", markdown, "text/plain");
  const handleExportMd = () => download("pseudocode.md", markdown, "text/markdown");

  const handleExportPdf = () => {
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Pseudocode</title></head>
      <body style="font-family: monospace; white-space: pre-wrap; padding: 2rem;">${markdown.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</body></html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="mt-6 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 bg-white dark:bg-slate-800">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Generated Pseudocode
        </h2>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm transition"
          >
            {copied ? (
              <span className="text-green-600 dark:text-green-400 font-medium">Copied!</span>
            ) : (
              "Copy"
            )}
          </button>
          <button
            type="button"
            onClick={handleExportTxt}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm transition"
          >
            Export .txt
          </button>
          <button
            type="button"
            onClick={handleExportMd}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm transition"
          >
            Export .md
          </button>
          {plan === "premium" && (
            <button
              type="button"
              onClick={handleExportPdf}
              className="text-blue-600 dark:text-blue-400 hover:underline text-sm transition"
            >
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Markdown-rendered pseudocode */}
      <div className="h-72 md:h-96 overflow-y-auto border border-gray-200 dark:border-slate-700 p-4 rounded-lg bg-gray-50 dark:bg-slate-900 text-sm font-mono text-gray-800 dark:text-gray-100 whitespace-pre-wrap">
        <ReactMarkdown>{markdown}</ReactMarkdown>
      </div>
    </div>
  );
}
