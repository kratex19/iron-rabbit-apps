import React, { useEffect, useState } from "react";
import { FileText, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { NOTE_COLORS } from "./constants";
import StorageService from "../storage/storageService";

/**
 * Template picker — pre-fills the new-note editor.
 *
 * Pinned templates float to the top of the list, marked with a filled star.
 * Users toggle pin state via the star icon on each row. Pinned names live
 * in `app_settings.template_pins` (IndexedDB) so they travel with Backup/
 * Restore just like background and icon pins.
 */
export default function TemplateModal({ isOpen, onClose, templates, onSelect, isDark }) {
  const [pinned, setPinned] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const settings = await StorageService.getSettings();
        const list = Array.isArray(settings?.template_pins) ? settings.template_pins : [];
        setPinned(list);
      } catch (e) {
        console.error("[TemplateModal] hydrate pins failed:", e);
      }
    })();
  }, [isOpen]);

  const togglePin = (name) => {
    setPinned(prev => {
      const isPinned = prev.includes(name);
      const next = isPinned ? prev.filter(n => n !== name) : [name, ...prev];
      StorageService.saveSettings({ template_pins: next }).catch(err =>
        console.error("[TemplateModal] persist pins failed:", err)
      );
      return next;
    });
  };

  // Sort: pinned first (preserving pin order), then the rest in the incoming order.
  const ordered = [...(templates || [])].sort((a, b) => {
    const ai = pinned.indexOf(a.name);
    const bi = pinned.indexOf(b.name);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return 0;
  });

  // Split into pinned + rest for a clearer "favourites shelf" layout.
  const pinnedList = ordered.filter(t => pinned.includes(t.name));
  const unpinnedList = ordered.filter(t => !pinned.includes(t.name));
  const showSplit = pinnedList.length > 0 && unpinnedList.length > 0;

  // Repair #9 · Do NOT short-circuit with `if (!isOpen) return null;`.
  // Radix's <Dialog open={isOpen}> owns the mount/unmount + portal +
  // DismissableLayer lifecycle. Synchronously unmounting mid-pointer-event
  // caused the parent NoteModal to receive a spurious outside-click and
  // close, destroying the template state that handleSelectTemplate had
  // just written. Letting Radix drive lifecycle keeps the layer registered
  // through the end of the current click, so the parent stays open.

  const renderRow = (t, i) => {
    const isPinned = pinned.includes(t.name);
    return (
      <div
        key={t.id || `${t.name}-${i}`}
        className={`w-full p-2.5 rounded-lg flex items-center gap-2 transition-all ${
          isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
        } ${isPinned ? 'ring-1 ring-amber-400/40' : ''}`}
        data-testid={`template-row-${t.name}`}
      >
        <button
          type="button"
          onClick={() => togglePin(t.name)}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
            isPinned
              ? "bg-amber-400 text-black"
              : isDark ? "text-slate-500 hover:text-amber-300 hover:bg-white/5" : "text-gray-400 hover:text-amber-500 hover:bg-gray-200"
          }`}
          aria-label={isPinned ? `Unpin ${t.name}` : `Pin ${t.name}`}
          title={isPinned ? "Unpin template" : "Pin to top"}
          data-testid={`template-pin-${t.name}`}
        >
          <Star className={`w-3.5 h-3.5 ${isPinned ? "fill-current" : ""}`} />
        </button>
        <button
          type="button"
          onClick={() => onSelect(t)}
          className="flex-1 flex items-center gap-2 text-left"
          data-testid={`template-select-${t.name}`}
        >
          <div className="w-3 h-3 rounded-full" style={{ background: NOTE_COLORS.find(c => c.name === t.color)?.gradient || NOTE_COLORS.find(c => c.name === t.color)?.accent || '#a855f7' }} />
          <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.name}</span>
          {t.category && <Badge variant="outline" className={`text-xs ${isDark ? '' : 'text-gray-800 border-gray-300'}`}>{t.category}</Badge>}
        </button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`}>
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <FileText className="w-5 h-5 text-indigo-500" /> Templates
          </DialogTitle>
          <DialogDescription className="sr-only">Choose a template to pre-fill your new note.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {showSplit ? (
            <>
              <h4 className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider mt-1 ${isDark ? "text-amber-300" : "text-amber-600"}`}
                  data-testid="template-pinned-header">
                <Star className="w-3 h-3 fill-current" /> Pinned
              </h4>
              <div className="space-y-2">
                {pinnedList.map(renderRow)}
              </div>
              <h4 className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}
                  data-testid="template-all-header">
                All templates
              </h4>
              <div className="space-y-2">
                {unpinnedList.map(renderRow)}
              </div>
            </>
          ) : (
            ordered.map(renderRow)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
