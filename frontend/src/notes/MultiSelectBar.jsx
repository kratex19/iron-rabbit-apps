import React from "react";
import { X, Trash2, FolderInput, Copy, Check } from "lucide-react";

/**
 * Floating action bar that appears at the bottom when the user is in
 * multi-select mode. Shows selection count and bulk actions. The
 * "Move to…" button toggles to "Copy to…" when Smart Batch Mode = copy.
 */
export default function MultiSelectBar({
  count,
  onClear,
  onDelete,
  onMoveTo,
  mode = "move",
  isDark,
}) {
  if (count === 0) return null;
  const isCopy = mode === "copy";
  const Icon = isCopy ? Copy : FolderInput;
  const label = isCopy ? "Copy to…" : "Move to…";
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
        onClick={onMoveTo}
        className={`h-8 px-3 rounded-full text-xs flex items-center gap-1.5 transition-colors ${
          isDark ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
        }`}
        data-testid="multiselect-move-btn"
      >
        <Icon className="w-3.5 h-3.5" /> {label}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="h-8 px-3 rounded-full text-xs flex items-center gap-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30"
        data-testid="multiselect-delete-btn"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
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
