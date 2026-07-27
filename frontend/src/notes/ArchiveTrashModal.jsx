import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, Trash2, RotateCcw, XCircle, AlertTriangle } from "lucide-react";
import StorageService from "../storage/storageService";

const TABS = [
  { key: "archive", label: "Archive", icon: Archive },
  { key: "trash",   label: "Trash",   icon: Trash2 },
];

const RETENTION_LABEL = (days) => {
  if (!days || days === 0) return "Forever";
  if (days === 7)  return "7 days";
  if (days === 30) return "30 days";
  if (days === 90) return "90 days";
  if (days === 365) return "1 year";
  return `${days} days`;
};

/**
 * A dedicated modal listing every archived and trashed note. Users can
 * restore individual notes, or empty the entire trash. Auto-purge is
 * disabled (per settings.trash_auto_purge = false), so trash items live
 * until manually purged.
 */
export default function ArchiveTrashModal({ isOpen, onClose, onDataChanged, settings, isDark }) {
  const [tab, setTab] = useState("archive");
  const [items, setItems] = useState([]);
  const [confirmEmpty, setConfirmEmpty] = useState(false);

  const retentionDays = settings?.trash_retention_days ?? 7;
  const retentionLabel = RETENTION_LABEL(retentionDays);

  const refresh = async () => {
    const all = await StorageService.getAllNotes();
    if (tab === "archive") setItems(all.filter(n => n.archived_at).sort((a, b) => (b.archived_at || "").localeCompare(a.archived_at || "")));
    else setItems(all.filter(n => n.deleted_at).sort((a, b) => (b.deleted_at || "").localeCompare(a.deleted_at || "")));
  };
  useEffect(() => { if (isOpen) refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [isOpen, tab]);

  const handleRestore = async (id) => {
    await StorageService.restoreNote(id);
    await refresh();
    onDataChanged && onDataChanged();
    toast.success("Note restored");
  };

  const handleHardDelete = async (id) => {
    await StorageService.deleteNote(id);
    await refresh();
    onDataChanged && onDataChanged();
    toast.success("Permanently deleted");
  };

  const handleEmptyTrash = async () => {
    const count = await StorageService.emptyTrash();
    setConfirmEmpty(false);
    await refresh();
    onDataChanged && onDataChanged();
    toast.success(`Emptied Trash · ${count} note${count === 1 ? "" : "s"} permanently deleted`);
  };

  const trashedCount = useMemo(() => items.length, [items]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="archive-trash-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Archive className="w-5 h-5 text-indigo-400" /> Archive &amp; Trash
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            {tab === "trash"
              ? <>Notes in Trash are auto-purged after <strong>{retentionLabel}</strong> (currently <strong>manual purge only</strong>).</>
              : "Archived notes are kept indefinitely and hidden from your main view."}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className={`flex gap-1 p-1 rounded-md mb-2 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
          {TABS.map(({ key, label, icon: I }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-md transition-colors ${
                tab === key
                  ? (isDark ? "bg-indigo-500/25 text-indigo-200" : "bg-white text-indigo-700 shadow-sm")
                  : (isDark ? "text-slate-400 hover:bg-white/5" : "text-gray-600 hover:bg-white/50")
              }`}
              data-testid={`archive-trash-tab-${key}`}
            >
              <I className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {items.length === 0 ? (
          <div className={`text-center py-8 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`} data-testid="archive-trash-empty">
            {tab === "archive" ? "No archived notes." : "Trash is empty."}
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => {
              const ts = tab === "archive" ? n.archived_at : n.deleted_at;
              return (
                <div
                  key={n.id}
                  className={`flex items-center gap-2 p-2.5 rounded-md border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}
                  data-testid={`archive-trash-item-${n.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>{n.title || "Untitled"}</div>
                    <div className={`text-[11px] font-mono truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {tab === "archive" ? "Archived" : "Trashed"} {ts ? format(new Date(ts), "MMM d, yyyy HH:mm") : ""}
                      {n.category ? ` · ${n.category}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestore(n.id)}
                    className={`h-8 px-2.5 rounded-md text-xs flex items-center gap-1 transition-colors ${
                      isDark ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30" : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    }`}
                    data-testid={`archive-trash-restore-${n.id}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                  {tab === "trash" && (
                    <button
                      type="button"
                      onClick={() => handleHardDelete(n.id)}
                      className="h-8 w-8 rounded-md flex items-center justify-center bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      title="Delete permanently"
                      data-testid={`archive-trash-purge-${n.id}`}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Empty Trash button (only on Trash tab, only when items exist) */}
        {tab === "trash" && trashedCount > 0 && (
          <div className={`mt-4 pt-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
            {!confirmEmpty ? (
              <Button
                onClick={() => setConfirmEmpty(true)}
                variant="outline"
                className={`w-full ${isDark ? "border-red-500/40 text-red-300 hover:bg-red-500/10" : "border-red-300 text-red-700 hover:bg-red-50"}`}
                data-testid="archive-trash-empty-btn"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Empty Trash ({trashedCount} note{trashedCount === 1 ? "" : "s"})
              </Button>
            ) : (
              <div className={`p-3 rounded-md border ${isDark ? "bg-red-500/10 border-red-500/30" : "bg-red-50 border-red-200"}`}>
                <div className={`flex items-center gap-2 text-xs font-medium mb-2 ${isDark ? "text-red-300" : "text-red-800"}`}>
                  <AlertTriangle className="w-4 h-4" />
                  Permanently delete {trashedCount} note{trashedCount === 1 ? "" : "s"}? This cannot be undone.
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleEmptyTrash} className="flex-1 bg-red-500 hover:bg-red-600 text-white" data-testid="archive-trash-empty-confirm">
                    Yes, empty trash
                  </Button>
                  <Button onClick={() => setConfirmEmpty(false)} variant="outline" className={`flex-1 ${isDark ? "border-white/10 text-slate-300" : ""}`} data-testid="archive-trash-empty-cancel">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
