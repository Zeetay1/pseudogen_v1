import React, { useState } from "react";
import OutputPanel from "./OutputPanel";

export default function InputForm({ onResult }) {
  const [problem, setProblem] = useState("");
  const [style, setStyle] = useState("Developer-Friendly");
  const [detail, setDetail] = useState("Concise");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/generate-pseudocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem_description: problem, style, detail }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Server error");
      }
      const data = await res.json();
      const entry = {
        problem,
        style,
        detail,
        markdown: data.markdown,
        ts: Date.now(),
      };
      onResult(entry);
    } catch (err) {
      alert("Request failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4"
    >
      <h2 className="text-lg font-semibold text-gray-800">
        Describe Your Problem
      </h2>

      <textarea
        required
        value={problem}
        onChange={(e) => setProblem(e.target.value)}
        placeholder="Describe the problem or algorithm..."
        className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-lg"
        >
          <option>Academic</option>
          <option>Developer-Friendly</option>
          <option>Step-by-Step</option>
        </select>

        <select
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="flex-1 p-2 border border-gray-300 rounded-lg"
        >
          <option>Concise</option>
          <option>Detailed</option>
        </select>

        <button
          disabled={loading}
          className={`px-4 py-2 font-semibold rounded-lg text-white transition ${
            loading
              ? "bg-blue-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Generating..." : "Generate"}
        </button>
      </div>
    </form>
  );
}
