import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { LayoutGrid, Move } from "lucide-react";
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
 * Settings → Organization: preferences for drag & drop behaviour.
 * Toggles live in settings.dnd_prefs and are read by NotesApp's drag handlers.
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
      <DialogContent className={`max-w-md ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`} data-testid="organization-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <LayoutGrid className="w-5 h-5 text-indigo-500" /> Organization
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Control how drag &amp; drop works throughout the app.
          </DialogDescription>
        </DialogHeader>

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
