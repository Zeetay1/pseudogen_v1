import React, { useState } from "react";
import OutputPanel from "./OutputPanel";

// Handles user input and sends requests to the backend API
export default function InputForm({ onResult }) {
  // Input fields and UI states
  const [problem, setProblem] = useState("");
  const [style, setStyle] = useState("Step-by-Step");
  const [detail, setDetail] = useState("Concise");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false); // Added for hover tooltip

  // Map of style descriptions
  const styleDescriptions = {
    "Academic": "Formal and structured pseudocode with uppercase keywords and concise logical flow.",
    "Developer-Friendly": "Readable, code-style pseudocode that feels close to real programming syntax.",
    "English-Like": "Plain English step-by-step explanation with no programming syntax.",
    "Step-by-Step": "Beginner-friendly pseudocode written in natural language, clearly ordered and easy to follow."
  };

  // Handles form submission and calls backend
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/generate-pseudocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_description: problem, style, detail }),
      });
      
      // Handle non-successful responses
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Server error");
      }
      
      // Extract result and update output
      const data = await res.json();
      setOutput(data.markdown);
      onResult({ problem, style, detail, markdown: data.markdown, ts: Date.now() });
    } catch (err) {
      alert("Request failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 rounded-xl p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Describe Your Problem
        </h2>

        {/* Problem input field */}
        <textarea
          required
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="Describe the problem or algorithm..."
          className="w-full h-40 p-3 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
        />

        {/* Style and detail selection controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          
          {/* Style selector with hover tooltip */}
          <div
            className="relative flex-1"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
            >
              <option>Academic</option>
              <option>Developer-Friendly</option>
              <option>English-Like</option>
              <option>Step-by-Step</option>
            </select>

            {/* Tooltip showing current style description */}
            {showTooltip && (
              <div className="absolute top-full mt-2 w-64 bg-gray-800 text-gray-100 text-xs p-2 rounded-lg shadow-lg z-20">
                {styleDescriptions[style]}
              </div>
            )}
          </div>

          {/* Detail selector */}
          <select
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="flex-1 p-2 border border-gray-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100"
          >
            <option>Concise</option>
            <option>Detailed</option>
          </select>

          {/* Generate button */}
          <button
            disabled={loading}
            className={`px-4 py-2 font-semibold rounded-lg text-white transition ${
              loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </form>
    </div>
  );
}
