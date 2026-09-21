import React from "react";
import { Undo2, X, Archive, Trash2, FolderMinus, FolderInput } from "lucide-react";

/**
 * Persistent floating pill shown after any archive / trash action. Stays in
 * place until the user taps Undo or Dismiss. Never auto-dismisses.
 */
export default function RecentActionPill({ action, onUndo, onDismiss, isDark }) {
  if (!action) return null;
  const { type, count, label: actionLabel } = action;
  // type: 'archive' | 'trash' | 'uncategorize' | 'category_removed'
  let Icon = Trash2;
  let iconTint = "bg-red-500/20 text-red-400";
  let label = "";
  if (type === "archive") {
    Icon = Archive;
    iconTint = "bg-emerald-500/20 text-emerald-400";
    label = `${count} note${count === 1 ? "" : "s"} archived`;
  } else if (type === "uncategorize") {
    Icon = FolderInput;
    iconTint = "bg-amber-500/20 text-amber-400";
    label = `${count} note${count === 1 ? "" : "s"} moved to Uncategorized`;
  } else if (type === "category_removed") {
    Icon = FolderMinus;
    iconTint = "bg-slate-500/20 text-slate-300";
    label = actionLabel ? `"${actionLabel}" removed` : "Category removed";
  } else {
    label = `${count} note${count === 1 ? "" : "s"} moved to Trash`;
  }
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-2xl backdrop-blur-lg border max-w-[calc(100vw-2rem)] flex-wrap justify-center ${
        isDark
          ? "bg-[#0B1221]/95 border-white/20 text-white"
          : "bg-white/95 border-gray-300 text-gray-900"
      }`}
      style={{ bottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 1rem))" }}
      data-testid="recent-action-pill"
      role="status"
      aria-live="polite"
    >
      <span className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${iconTint}`}>
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className={`text-xs font-medium px-1 ${isDark ? "text-slate-200" : "text-gray-800"}`}>{label}</span>
      <button
        type="button"
        onClick={onUndo}
        className={`h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
          isDark ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
        }`}
        data-testid="recent-action-undo"
      >
        <Undo2 className="w-3.5 h-3.5" /> Undo
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className={`h-8 w-8 rounded-full flex items-center justify-center ${
          isDark ? "text-slate-400 hover:bg-white/10" : "text-gray-500 hover:bg-gray-100"
        }`}
        aria-label="Dismiss"
        data-testid="recent-action-dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
