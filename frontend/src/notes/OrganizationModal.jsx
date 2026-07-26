import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { LayoutGrid, Move, FolderInput, Copy } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import StorageService from "../storage/storageService";

export const DEFAULT_DND_PREFS = {
  enabled: true,
  longPressToDrag: true,
  showDragHandles: true,
  haptic: true,
  confirmCrossCategoryMove: false,
  undoNotifications: true,
  // Smart Batch (bulk-action) mode: "move" (default) or "copy".
  smartBatchMode: "move",
};

const ROWS = [
  { key: "enabled",                     label: "Enable Drag & Drop",         hint: "Turn off to disable all reordering (buttons stay)" },
  { key: "longPressToDrag",             label: "Long Press to Drag",         hint: "iPhone-style — brief hold to activate drag" },
  { key: "showDragHandles",             label: "Show Drag Handles",          hint: "Small ≡ icon on categories" },
  { key: "haptic",                      label: "Haptic Feedback",            hint: "Vibrate briefly when a drag starts" },
  { key: "confirmCrossCategoryMove",    label: "Confirm Moves Between Categories", hint: "Ask before finalizing a cross-category drop" },
  { key: "undoNotifications",           label: "Undo Notifications",         hint: "Show a snackbar with Undo after every move" },
];

/**
 * Settings → Organization: preferences for drag & drop behaviour
 * and the "Smart Batch" mode used by multi-select bulk actions.
 */
export default function OrganizationModal({ isOpen, onClose, isDark }) {
  const [prefs, setPrefs] = useState(DEFAULT_DND_PREFS);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const s = (await StorageService.getSettings()) || {};
      setPrefs({ ...DEFAULT_DND_PREFS, ...(s.dnd_prefs || {}) });
    })();
  }, [isOpen]);

  const update = async (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    const s = (await StorageService.getSettings()) || {};
    await StorageService.saveSettings({ ...s, dnd_prefs: next });
  };

  const resetDefaults = async () => {
    setPrefs(DEFAULT_DND_PREFS);
    const s = (await StorageService.getSettings()) || {};
    await StorageService.saveSettings({ ...s, dnd_prefs: DEFAULT_DND_PREFS });
    toast.success("Defaults restored");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md max-h-[90vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`} data-testid="organization-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <LayoutGrid className="w-5 h-5 text-indigo-500" /> Organization
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Control how drag &amp; drop and bulk actions work throughout the app.
          </DialogDescription>
        </DialogHeader>

        {/* Smart Batch Mode — Move vs Copy */}
        <div className={`rounded-md px-3 py-3 mb-1 ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
          <div className={`text-sm mb-0.5 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
            Smart Batch Mode
          </div>
          <div className={`text-[11px] mb-2.5 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            When you bulk-move selected notes, should they be moved or copied to the target category?
          </div>
          <div className={`grid grid-cols-2 gap-2`}>
            <button
              type="button"
              onClick={() => update("smartBatchMode", "move")}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-md border transition-colors ${
                prefs.smartBatchMode === "move"
                  ? (isDark ? "bg-indigo-500/20 border-indigo-400 text-indigo-200" : "bg-indigo-100 border-indigo-400 text-indigo-800")
                  : (isDark ? "bg-transparent border-white/10 text-slate-400 hover:bg-white/5" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100")
              }`}
              data-testid="org-smart-batch-move"
            >
              <FolderInput className="w-4 h-4" />
              <span className="text-xs font-medium">Move</span>
              <span className="text-[10px] opacity-70">Relocates note</span>
            </button>
            <button
              type="button"
              onClick={() => update("smartBatchMode", "copy")}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-md border transition-colors ${
                prefs.smartBatchMode === "copy"
                  ? (isDark ? "bg-indigo-500/20 border-indigo-400 text-indigo-200" : "bg-indigo-100 border-indigo-400 text-indigo-800")
                  : (isDark ? "bg-transparent border-white/10 text-slate-400 hover:bg-white/5" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-100")
              }`}
              data-testid="org-smart-batch-copy"
            >
              <Copy className="w-4 h-4" />
              <span className="text-xs font-medium">Copy</span>
              <span className="text-[10px] opacity-70">Duplicates note</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {ROWS.map((r) => (
            <div key={r.key}
              className={`flex items-center justify-between rounded-md px-3 py-2.5 ${isDark ? "bg-white/5" : "bg-gray-50"}`}
            >
              <div className="flex-1 min-w-0 pr-2">
                <div className={`text-sm ${isDark ? "text-slate-200" : "text-gray-800"}`}>{r.label}</div>
                {r.hint && <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-500" : "text-gray-500"}`}>{r.hint}</div>}
              </div>
              <Switch checked={!!prefs[r.key]} onCheckedChange={(v) => update(r.key, v)} data-testid={`org-${r.key}`} />
            </div>
          ))}
        </div>

        <div className={`text-[11px] mt-4 flex items-start gap-1.5 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
          <Move className="w-3 h-3 mt-0.5" />
          Long-press any category header or note tile to reorder. Drop a note on a different category to move it. Every move saves automatically.
        </div>

        <button
          type="button"
          onClick={resetDefaults}
          className={`w-full mt-3 text-xs underline ${isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"}`}
          data-testid="org-reset"
        >
          Restore defaults
        </button>
      </DialogContent>
    </Dialog>
  );
}
