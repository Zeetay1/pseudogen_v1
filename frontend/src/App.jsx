import React, { useState, useEffect, useCallback } from "react";
import { Sun, Moon, History, SquarePen } from "lucide-react";
import InputForm from "./components/InputForm";
import OutputPanel from "./components/OutputPanel";
import HistoryPanel from "./components/HistoryPanel";

function getOrCreateSessionId() {
  let id = localStorage.getItem("pseudogen_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("pseudogen_session_id", id);
  }
  return id;
}

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
    return localStorage.getItem("pseudogen_history_open") === "true";
  });
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("pseudogen_theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });

  const [sessionId] = useState(getOrCreateSessionId);
  const [usageInfo, setUsageInfo] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);
  const [activeChatTs, setActiveChatTs] = useState(null);
  const [initialProblem, setInitialProblem] = useState("");

  const rootClass = theme === "dark" ? "dark" : "";

  useEffect(() => {
    localStorage.setItem("pseudogen_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem("pseudogen_history_open", isHistoryOpen ? "true" : "false");
  }, [isHistoryOpen]);

  useEffect(() => {
    localStorage.setItem("pseudogen_theme", theme);
  }, [theme]);

  const refreshUsage = useCallback(async () => {
    try {
      const res = await fetch("/usage", {
        headers: { "X-Session-ID": sessionId },
        credentials: "include",
      });
      if (res.ok) setUsageInfo(await res.json());
    } catch {
      // non-critical
    }
  }, [sessionId]);

  useEffect(() => {
    refreshUsage();
  }, [refreshUsage]);

  const handleResult = async (entry) => {
    const isFollowUp = activeChatTs !== null;
    const existingIdx = isFollowUp ? history.findIndex((h) => h.ts === activeChatTs) : -1;

    if (isFollowUp && existingIdx !== -1) {
      setHistory((prev) => {
        const idx = prev.findIndex((h) => h.ts === activeChatTs);
        if (idx === -1) return prev;
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          markdown: entry.markdown,
          messages: entry.messages,
          style: entry.style,
          detail: entry.detail,
        };
        return updated;
      });
    } else {
      setHistory((prev) => [entry, ...prev].slice(0, 50));
      setActiveChatTs(entry.ts);
      try {
        const res = await fetch("/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
          credentials: "include",
          body: JSON.stringify({ text: entry.problem }),
        });
        if (res.ok) {
          const { title } = await res.json();
          if (title?.trim()) {
            setHistory((prev) => {
              const idx = prev.findIndex((h) => h.ts === entry.ts);
              if (idx === -1) return prev;
              const updated = [...prev];
              updated[idx] = { ...updated[idx], title: title.trim() };
              return updated;
            });
          }
        }
      } catch {
        // fall back to truncation
      }
    }

    setOutput(entry.markdown);
    setChatMessages(entry.messages || []);
  };

  const handleStreamChunk = useCallback((chunk) => {
    if (chunk !== null) setOutput(chunk);
  }, []);

  const startNewChat = () => {
    setOutput("");
    setInitialProblem("");
    setChatMessages([]);
    setActiveChatTs(null);
    setChatKey((k) => k + 1);
  };

  const handleSelectHistory = (entry) => {
    setOutput(entry.markdown);
    setInitialProblem(entry.problem || "");
    setChatMessages(entry.messages || []);
    setActiveChatTs(entry.ts);
    setChatKey((k) => k + 1);
    document.getElementById("main-workspace")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleClearHistory = () => {
    setHistory([]);
    setOutput("");
    localStorage.removeItem("pseudogen_history");
    setConfirmClear(false);
  };

  const handleDeleteHistory = (index) => {
    setHistory((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRenameHistory = (index, newTitle) => {
    setHistory((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], problem: newTitle };
      return updated;
    });
  };

  const iconBtn =
    "p-2 rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 " +
    "text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600 transition";

  const limitReached = usageInfo && usageInfo.remaining <= 0;

  return (
    <div className={`${rootClass} min-h-screen bg-gray-100 dark:bg-slate-900 dark:text-gray-100`}>
      <div className="flex flex-col min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-30 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 shadow-sm px-4 sm:px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400 tracking-tight">
              Pseudogen
            </h1>
            <button
              type="button"
              onClick={startNewChat}
              className={iconBtn}
              aria-label="New chat"
              title="New chat"
            >
              <SquarePen size={15} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className={iconBtn}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
              type="button"
              onClick={() => setIsHistoryOpen((s) => !s)}
              className={iconBtn}
              aria-label={isHistoryOpen ? "Hide history panel" : "Show history panel"}
              title={isHistoryOpen ? "Hide history panel" : "Show history panel"}
            >
              <History size={15} />
            </button>
          </div>
        </header>

        <main
          className={`flex flex-1 overflow-hidden bg-gray-50 dark:bg-slate-900 transition-all duration-300 pt-[60px]
              ${isHistoryOpen ? "sm:pl-72" : "pl-0"}`}
        >
          <aside
            className={`fixed top-[60px] left-0 h-[calc(100vh-60px)] w-72 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700
                        p-4 transform transition-transform duration-300 ease-in-out z-20
                        ${isHistoryOpen ? "translate-x-0" : "-translate-x-full"}`}
            aria-hidden={!isHistoryOpen}
          >
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  History
                </h2>
                {confirmClear ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-600 dark:text-slate-400">Clear all?</span>
                    <button
                      onClick={handleClearHistory}
                      className="text-xs px-1.5 py-0.5 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClear(true)}
                    className="text-xs text-red-500 hover:text-red-600 dark:hover:text-red-400 transition"
                  >
                    Clear all
                  </button>
                )}
              </div>

              <div
                className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent"
                style={{ maxHeight: "calc(100vh - 140px)" }}
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

          {isHistoryOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-10 sm:hidden"
              onClick={() => setIsHistoryOpen(false)}
              aria-hidden="true"
            />
          )}

          <section
            id="main-workspace"
            className="flex-1 p-6 overflow-auto bg-gray-100 dark:bg-slate-950 transition-colors"
          >
            <div className="max-w-4xl mx-auto space-y-4">
              {limitReached && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-200">
                  Daily limit of {usageInfo.limit} prompts reached. Resets at midnight UTC.
                </div>
              )}

              <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
                <InputForm
                  key={chatKey}
                  sessionId={sessionId}
                  usageInfo={usageInfo}
                  onUsageUpdate={setUsageInfo}
                  onLimitReached={refreshUsage}
                  onResult={handleResult}
                  onStreamChunk={handleStreamChunk}
                  initialProblem={initialProblem}
                  chatMessages={chatMessages}
                />
                <OutputPanel markdown={output} />
              </div>
            </div>
          </section>
        </main>

        <footer className="bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 py-3 text-center text-xs text-gray-400 dark:text-slate-500">
          © {new Date().getFullYear()} Pseudogen
        </footer>
      </div>
    </div>
  );
}
