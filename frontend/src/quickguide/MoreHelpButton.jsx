/**
 * MoreHelpButton — visible but DISABLED "Coming Soon" button in the modal
 * bottom-right corner. Reserves the layout slot for whichever module lands
 * first in Phase 3/6 (KB browser, AI Assistant, Bug Reports).
 */

import React from "react";
import { ArrowRight } from "lucide-react";

export default function MoreHelpButton({ isDark = true }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      title="Advanced Help, tutorials, and community are coming in future updates."
      data-testid="quickguide-more-help"
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] transition cursor-not-allowed select-none ${
        isDark
          ? "text-slate-500 bg-white/[0.04] border border-white/5 opacity-60"
          : "text-gray-400 bg-gray-50 border border-gray-200 opacity-70"
      }`}
    >
      <span>More Help</span>
      <span className={`text-[9px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>Soon</span>
      <ArrowRight className="w-3 h-3" />
    </button>
  );
}
