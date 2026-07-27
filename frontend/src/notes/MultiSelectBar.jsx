import React from "react";
import { X, Sparkles, Check } from "lucide-react";

/**
 * Floating pill shown when the user is in multi-select mode.
 * Now a lean launcher for the Batch Studio sheet — one button
 * exposes every bulk action available on the current selection.
 */
export default function MultiSelectBar({
  count,
  onClear,
  onOpenStudio,
  isDark,
}) {
  if (count === 0) return null;
  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-2xl backdrop-blur-lg border ${
        isDark
          ? "bg-[#0B1221]/95 border-white/20 text-white"
          : "bg-white/95 border-gray-300 text-gray-900"
      }`}
      data-testid="multiselect-bar"
    >
      <span className={`text-xs font-semibold flex items-center gap-1.5 px-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
        <Check className="w-3.5 h-3.5 text-indigo-400" />
        {count} selected
      </span>
      <button
        type="button"
        onClick={onOpenStudio}
        className={`h-8 px-3 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
          isDark
            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400"
            : "bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
        }`}
        data-testid="multiselect-studio-btn"
      >
        <Sparkles className="w-3.5 h-3.5" /> Batch Studio
      </button>
      <button
        type="button"
        onClick={onClear}
        className={`h-8 w-8 rounded-full flex items-center justify-center ${
          isDark ? "text-slate-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"
        }`}
        aria-label="Cancel selection"
        data-testid="multiselect-cancel"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
