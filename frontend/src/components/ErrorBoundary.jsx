import React from "react";

/**
 * Catches React errors in child tree and shows a fallback UI instead of blanking the app.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900 p-6">
          <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 text-center">
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 dark:text-slate-300 text-sm mb-4">
              The app hit an error. Try refreshing the page.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
