/**
 * QuickGuideSettingsSection — 6 rows injected into the existing SettingsModal.
 *
 * Locked design:
 *   1. Enable Quick Guides (toggle)
 *   2. Automatically show Quick Guides (toggle, default OFF)
 *   3. Reset Quick Guide Tour (button + confirm)
 *   4. Content version (read-only)
 *   5. Knowledge Distribution status (reserved, shows "Local only")
 *   6. About Quick Guides — opens the IRR-9000 meta guide
 *
 * Grouped under a collapsible "Quick Guides" heading, closed by default.
 */

import React, { useCallback, useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, RotateCcw, Info, Cloud } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQuickGuideContext } from "./QuickGuideProvider";

export default function QuickGuideSettingsSection({ isDark = true }) {
  const { state, hydrated, setEnabled, setAutoShow, resetTour, contentVersion, articleCount, open } = useQuickGuideContext();
  const [expanded, setExpanded] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleReset = useCallback(async () => {
    await resetTour();
    setConfirmingReset(false);
    toast.success("Quick Guide tour reset");
  }, [resetTour]);

  if (!hydrated) return null;

  const rowBase = "flex items-center justify-between py-2";
  const labelCls = isDark ? "text-sm text-slate-200" : "text-sm text-gray-800";
  const subCls = isDark ? "text-[11px] text-slate-500" : "text-[11px] text-gray-500";

  return (
    <div
      className={`rounded-xl border ${
        isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"
      }`}
      data-testid="quickguide-settings-section"
    >
      {/* Section header — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        data-testid="quickguide-settings-toggle"
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className={`w-4 h-4 ${isDark ? "text-indigo-300" : "text-indigo-500"}`} />
          <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Quick Guides</span>
          <span className={subCls}>({articleCount} available)</span>
        </span>
        {expanded ? <ChevronDown className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} /> : <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} />}
      </button>

      {expanded && (
        <div className={`px-4 pb-4 space-y-1 ${isDark ? "border-t border-white/5" : "border-t border-gray-100"}`}>
          {/* Row 1 — Enable */}
          <div className={rowBase}>
            <div>
              <div className={labelCls}>Enable Quick Guides</div>
              <div className={subCls}>Show the ? button on every screen</div>
            </div>
            <Switch
              checked={state.enabled}
              onCheckedChange={setEnabled}
              data-testid="quickguide-toggle-enabled"
            />
          </div>

          {/* Row 2 — Auto-show */}
          <div className={rowBase}>
            <div>
              <div className={labelCls}>Automatically show Quick Guides</div>
              <div className={subCls}>Open a guide the first time you visit a screen</div>
            </div>
            <Switch
              checked={state.auto_show}
              onCheckedChange={setAutoShow}
              disabled={!state.enabled}
              data-testid="quickguide-toggle-auto"
            />
          </div>

          {/* Row 3 — Reset */}
          <div className={rowBase}>
            <div>
              <div className={labelCls}>Reset Quick Guide Tour</div>
              <div className={subCls}>Show every guide again on next visit</div>
            </div>
            {confirmingReset ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className={`text-xs h-8 px-2.5 rounded-lg ${isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"}`}
                  data-testid="quickguide-reset-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs h-8 px-2.5 rounded-lg bg-indigo-500 text-white"
                  data-testid="quickguide-reset-confirm"
                >
                  Reset
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className={`inline-flex items-center gap-1 text-xs h-8 px-2.5 rounded-lg transition ${
                  isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                data-testid="quickguide-reset-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          {/* Row 4 — Content version */}
          <div className={rowBase}>
            <div className={labelCls}>Content version</div>
            <div className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-gray-500"}`} data-testid="quickguide-content-version">
              {contentVersion}
            </div>
          </div>

          {/* Row 5 — Knowledge Distribution status (reserved) */}
          <div className={rowBase}>
            <div className="flex items-center gap-2">
              <Cloud className={`w-3.5 h-3.5 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              <div>
                <div className={labelCls}>Knowledge Distribution</div>
                <div className={subCls}>Sync guides from the web (coming later)</div>
              </div>
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Local only
            </span>
          </div>

          {/* Row 6 — About Quick Guides (opens the meta guide) */}
          <div className={rowBase}>
            <div className={labelCls}>About Quick Guides</div>
            <button
              type="button"
              onClick={() => open("IRR-9000", { origin: "settings" })}
              className="inline-flex items-center gap-1 text-xs h-8 px-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition"
              data-testid="quickguide-open-meta"
            >
              <Info className="w-3.5 h-3.5" /> Open
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
