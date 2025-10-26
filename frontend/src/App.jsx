import React, { useState, useEffect } from "react";
import InputForm from "./components/InputForm";
import OutputPanel from "./components/OutputPanel";
import HistoryPanel from "./components/HistoryPanel";

export default function App() {
  // Load history from localStorage on first render
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("pseudogen_history") || "[]");
    } catch {
      return [];
    }
  });

  // Stores the currently generated pseudocode output
  const [output, setOutput] = useState("");
  
  // Controls visibility of the sidebar (history panel)
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    return localStorage.getItem("pseudogen_history_open") !== "false"; // default true
  });

  // Stores current theme: "light" or "dark"
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pseudogen_theme") || "light";
  });

  // Persist history changes
  useEffect(() => {
    localStorage.setItem("pseudogen_history", JSON.stringify(history));
  }, [history]);

  // Persist sidebar visibility preference
  useEffect(() => {
    localStorage.setItem("pseudogen_history_open", isHistoryOpen ? "true" : "false");
  }, [isHistoryOpen]);

  // Persist selected theme
  useEffect(() => {
    localStorage.setItem("pseudogen_theme", theme);
  }, [theme]);

  // Apply dark mode CSS class to root container
  const rootClass = theme === "dark" ? "dark" : "";

  // Save a new pseudocode entry to history (max 50 entries)
  const saveToHistory = (entry) => {
    const next = [entry, ...history].slice(0, 50);
    setHistory(next);
  };

  // When a history item is selected, load its pseudocode into the workspace
  const handleSelectHistory = (entry) => {
    setOutput(entry.markdown);
    const mainEl = document.getElementById("main-workspace");
    if (mainEl) mainEl.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Clear all history and reset output
  const handleClearHistory = () => {
    if (!confirm("Clear entire history?")) return;
    setHistory([]);
    setOutput("");
    localStorage.removeItem("pseudogen_history");
  };

  // Delete a single history entry
  const handleDeleteHistory = (index) => {
    if (!confirm("Delete this entry?")) return;
    setHistory((prev) => prev.filter((_, i) => i !== index));
  };

  // Rename a single history entry
  const handleRenameHistory = (index, newTitle) => {
    setHistory((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], problem: newTitle };
      return updated;
    });
  };


  return (
    <div className={`${rootClass} min-h-screen bg-gray-100 dark:bg-slate-900 dark:text-gray-100`}>
      <div className="flex flex-col min-h-screen">
        <header
          className="fixed top-0 left-0 right-0 z-30 
                    bg-white dark:bg-slate-800 dark:border-slate-700 
                    shadow-sm py-4 px-6 flex items-center justify-between 
                    border-b border-gray-200"
        >
          {/* Title and Version */}
          <div>
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              Pseudogen Demo
            </h1>
            <div className="text-xs text-gray-500 dark:text-slate-300">v1</div>
          </div>

          {/* Header buttons: Theme toggle and history toggle */}
          <div className="flex items-center gap-3">
            
            {/* Toggle between light/dark mode */}
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="px-3 py-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 flex items-center gap-2"
              title="Toggle light / dark"
            >
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </button>

            {/* Show or hide history panel */}
            <button
              onClick={() => setIsHistoryOpen((s) => !s)}
              className="px-3 py-1 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700"
              title={isHistoryOpen ? "Collapse history" : "Open history"}
            >
              {isHistoryOpen ? "Hide History" : "Show History"}
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          className={`flex flex-1 overflow-hidden bg-gray-50 dark:bg-slate-900 transition-all duration-300 pt-[72px]
              ${isHistoryOpen ? "pl-72" : "pl-0"}`}
        >
          
          {/* Sidebar: History Panel */}
          <aside
            className={`fixed top-[72px] left-0 h-[calc(100vh-72px)] w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 
                        p-4 transform transition-transform duration-300 ease-in-out z-20
                        ${isHistoryOpen ? "translate-x-0" : "-translate-x-full"}`}
            aria-hidden={!isHistoryOpen}
          >
            <div className="h-full flex flex-col">
              {/* Sidebar header with clear button */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-100">History</h2>
                <button
                  onClick={handleClearHistory}
                  className="text-sm text-red-500 hover:underline"
                >
                  Clear
                </button>
              </div>

              {/* Scrollable history list */}
              <div
                className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
                style={{ maxHeight: "calc(100vh - 160px)" }}
              >
                <HistoryPanel
                  history={history}
                  onSelect={handleSelectHistory}
                  onDelete={handleDeleteHistory}
                  onRename={handleRenameHistory}
                />
              </div>
            </div>
          </aside>

          {/* Workspace: Input + Output */}
          <section
            id="main-workspace"
            className="flex-1 p-6 overflow-auto bg-gray-100 dark:bg-slate-950 transition-colors"
          >
            <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
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

        {/* Footer */}
        <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-3 text-center text-sm text-gray-500 dark:text-slate-300">
          © {new Date().getFullYear()} Pseudogen. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
