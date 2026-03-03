import React from "react";

const FREE_FEATURES = [
  "Up to 4,000 characters per problem",
  "30 generations per minute",
  "Export as .txt and .md",
  "Local history (this device)",
  "All pseudocode styles",
];

const PREMIUM_FEATURES = [
  "Up to 12,000 characters per problem",
  "Higher rate limits",
  "Export as .txt, .md, and PDF",
  "Cloud-synced history (coming soon)",
  "Batch generation (coming soon)",
  "API access (coming soon)",
];

export default function PricingPage({ onSelectPlan, onBack, theme }) {
  const isDark = theme === "dark";
  const cardClass = isDark
    ? "bg-slate-800 border-slate-700 text-gray-100"
    : "bg-white border-gray-200 text-gray-800";
  const btnPrimary = "px-6 py-3 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <button
        type="button"
        onClick={onBack}
        className="absolute top-4 left-6 text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        ← Back to app
      </button>
      <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Choose your plan</h1>
      <p className="text-gray-600 dark:text-slate-300 mb-10">Free forever to start. Upgrade when you need more.</p>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* Free */}
        <div className={`${cardClass} border rounded-2xl p-6 flex flex-col`}>
          <h2 className="text-xl font-semibold mb-1">Free</h2>
          <p className="text-3xl font-bold mb-6">$0<span className="text-sm font-normal text-gray-500 dark:text-slate-400">/month</span></p>
          <ul className="space-y-3 mb-6 flex-1">
            {FREE_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span> {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onSelectPlan("free")}
            className="w-full py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
          >
            Current plan
          </button>
        </div>

        {/* Premium */}
        <div className={`${cardClass} border-2 border-blue-500 rounded-2xl p-6 flex flex-col relative`}>
          <span className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-600 dark:text-blue-400">
            Popular
          </span>
          <h2 className="text-xl font-semibold mb-1">Premium</h2>
          <p className="text-3xl font-bold mb-6">$9<span className="text-sm font-normal text-gray-500 dark:text-slate-400">/month</span></p>
          <ul className="space-y-3 mb-6 flex-1">
            {PREMIUM_FEATURES.map((f, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-green-500">✓</span> {f}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => onSelectPlan("premium")}
            className={`w-full ${btnPrimary}`}
          >
            Get Premium
          </button>
        </div>
      </div>
    </div>
  );
}
