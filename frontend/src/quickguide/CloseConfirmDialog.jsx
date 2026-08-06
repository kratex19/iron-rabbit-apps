/**
 * CloseConfirmDialog — "Are you sure you want to close Quick Guide?" Yes / No.
 * Independent from AlertDialog to keep the module self-contained.
 */

import React from "react";

export default function CloseConfirmDialog({ open, onYes, onNo, isDark = true }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      data-testid="quickguide-close-confirm"
    >
      <div
        className={`w-full max-w-xs rounded-2xl p-5 shadow-2xl ${
          isDark ? "bg-[#0B1221] border border-white/10 text-white" : "bg-white border border-gray-200 text-gray-900"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-base font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          Close Quick Guide?
        </h3>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"}`}>
          Are you sure you want to close Quick Guide?
        </p>
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onNo}
            data-testid="quickguide-close-no"
            className={`flex-1 h-9 rounded-lg text-sm transition ${
              isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            No
          </button>
          <button
            type="button"
            onClick={onYes}
            data-testid="quickguide-close-yes"
            className="flex-1 h-9 rounded-lg text-sm bg-indigo-500 hover:bg-indigo-600 text-white transition"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
