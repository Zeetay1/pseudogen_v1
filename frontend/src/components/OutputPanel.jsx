import React from "react";
import ReactMarkdown from "react-markdown";

export default function OutputPanel({ markdown }) {
  if (!markdown) return null;
  return (
    <div className="mt-4 p-3 border rounded">
      <div className="mb-2 flex justify-end">
        <button onClick={() => navigator.clipboard.writeText(markdown)}>Copy</button>
      </div>
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
}
