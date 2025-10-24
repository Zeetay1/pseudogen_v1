import React, { useState, useEffect } from "react";
import InputForm from "./components/InputForm";
import OutputPanel from "./components/OutputPanel";
import HistoryPanel from "./components/HistoryPanel";

export default function App() {
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pseudogen_history") || "[]");
    } catch {
      return [];
    }
  });

  const [output, setOutput] = useState("");

  const saveToHistory = (entry) => {
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    localStorage.setItem("pseudogen_history", JSON.stringify(next));
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600">Pseudogen V1</h1>
        <span className="text-sm text-gray-500">by Zite</span>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block w-72 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <HistoryPanel history={history} />
        </aside>

        <section className="flex-1 p-6 flex flex-col gap-6">
          <InputForm
            onResult={(entry) => {
              saveToHistory(entry);
              setOutput(entry.markdown);
            }}
          />
          <OutputPanel markdown={output} />
        </section>
      </main>

      <footer className="bg-white border-t border-gray-200 py-3 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Pseudogen. All rights reserved.
      </footer>
    </div>
  );
}
