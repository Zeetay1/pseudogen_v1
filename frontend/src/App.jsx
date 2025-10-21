//frontend/src/App.jsx
import React, { useState, useEffect } from "react";
import InputForm from "./components/InputForm";
import OutputPanel from "./components/OutputPanel";
import HistoryPanel from "./components/HistoryPanel";

export default function App() {
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem("pseudogen_history") || "[]"); } catch { return []; }
  });

  const saveToHistory = (entry) => {
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    localStorage.setItem("pseudogen_history", JSON.stringify(next));
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Pseudogen V1</h1>
      <InputForm onResult={saveToHistory} />
      <HistoryPanel history={history} />
    </div>
  );
}
