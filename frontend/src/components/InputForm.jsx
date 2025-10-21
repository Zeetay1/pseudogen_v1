//frontend/src/components/InputForm.jsx
import React, { useState } from "react";
import OutputPanel from "./OutputPanel";

export default function InputForm({ onResult }) {
  const [problem, setProblem] = useState("");
  const [style, setStyle] = useState("Developer-Friendly");
  const [detail, setDetail] = useState("Concise");
  const [output, setOutput] = useState(null);
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
      setOutput(data.markdown);
      onResult({ problem, style, detail, markdown: data.markdown, ts: Date.now() });
    } catch (err) {
      alert("Request failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3 mb-4">
        <textarea required minLength={1} value={problem} onChange={e => setProblem(e.target.value)}
          placeholder="Describe the problem..." className="w-full p-2 border" rows={6} />
        <div className="flex gap-2">
          <select value={style} onChange={e=>setStyle(e.target.value)}>
            <option>Academic</option>
            <option>Developer-Friendly</option>
            <option>Step-by-Step</option>
          </select>
          <select value={detail} onChange={e=>setDetail(e.target.value)}>
            <option>Concise</option>
            <option>Detailed</option>
          </select>
          <button disabled={loading} className="px-3 py-1 bg-blue-600 text-white">Generate</button>
        </div>
      </form>
      <OutputPanel markdown={output} />
    </>
  );
}
