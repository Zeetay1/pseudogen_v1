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
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    return localStorage.getItem("pseudogen_history_open") !== "false"; // default true
  });

  // theme: "light" or "dark"
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pseudogen_theme") || "light";
  });

  useEffect(() => {
    localStorage.setItem("pseudogen_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("pseudogen_history_open", isHistoryOpen ? "true" : "false");
  }, [isHistoryOpen]);

  useEffect(() => {
    localStorage.setItem("pseudogen_theme", theme);
  }, [theme]);

  // Add or remove the 'dark' class from the top-level container via state (Tailwind picks it up)
  const rootClass = theme === "dark" ? "dark" : "";

  const saveToHistory = (entry) => {
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
    // localStorage is synced via useEffect
  };

  // when a history item is clicked
  const handleSelectHistory = (entry) => {
    setOutput(entry.markdown);
    // optional: bring main area into view
    const mainEl = document.getElementById("main-workspace");
    if (mainEl) mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClearHistory = () => {
    if (!confirm("Clear entire history?")) return;
    setHistory([]);
    setOutput("");
    localStorage.removeItem("pseudogen_history");
  };

  return (
    <div className={`${rootClass} min-h-screen bg-gray-50 dark:bg-slate-900 dark:text-gray-100`}>
      <div className="flex flex-col min-h-screen">
        <header className="bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm py-4 px-6 flex items-center justify-between border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">Pseudogen V1</h1>
            <div className="text-xs text-gray-500 dark:text-slate-300">FastAPI powered</div>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="px-3 py-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 flex items-center gap-2"
              title="Toggle light / dark"
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>

            {/* Collapse history on small screens */}
            <button
              onClick={() => setIsHistoryOpen((s) => !s)}
              className="px-3 py-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700"
              title={isHistoryOpen ? "Collapse history" : "Open history"}
            >
              {isHistoryOpen ? "Hide History" : "Show History"}
            </button>
          </div>
        </header>

        <main className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 p-4 transition-all
                        ${isHistoryOpen ? "w-72" : "w-0"} overflow-hidden`}
            aria-hidden={!isHistoryOpen}
          >
            {/* keep scroll confined to this panel */}
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-100">History</h2>
                <button
                  onClick={handleClearHistory}
                  className="text-sm text-red-500 hover:underline"
                >
                  Clear
                </button>
              </div>

              <div className="overflow-y-auto pr-2" style={{ maxHeight: "calc(100vh - 160px)" }}>
                <HistoryPanel
                  history={history}
                  onSelect={handleSelectHistory}
                />
              </div>
            </div>
          </aside>

          {/* Workspace */}
          <section id="main-workspace" className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <InputForm
                onResult={(entry) => {
                  saveToHistory(entry);
                  setOutput(entry.markdown);
                }}
              />
              <OutputPanel markdown={output} />
            </div>
          </section>
        </main>

        <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-3 text-center text-sm text-gray-500 dark:text-slate-300">
          © {new Date().getFullYear()} Pseudogen. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
