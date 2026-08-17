import React, { useEffect, useMemo, useState } from "react";
import { X, HardDrive, Trash2, RefreshCcw, ImageIcon, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import StorageService from "../storage/storageService";
import { checkStorageQuota, _resetStorageWarnings } from "../storage/storageWarnings";

const formatMB = (bytes) => (bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 3 : 2);

/**
 * Storage Cleanup Wizard — modal that lists every attachment across all
 * notes, sorted largest first, and lets the user bulk-select + delete to
 * free space. Also flags "orphan" attachments (blobs no longer referenced
 * by any live note) and offers a one-tap sweep.
 *
 * Additive component — used from the existing SettingsModal via a small
 * "Free up space" button. Does not alter any other Iron Rabbit screen.
 */
export default function StorageCleanupModal({
  isOpen,
  onClose,
  isDark,
  notes = [],
  onSaveNote,      // async (updatedNote) => void — from NotesApp
  onAfterChange,   // () => void — refresh callers' storage/notes cache
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [filter, setFilter] = useState("all"); // all | images | files | orphan
  const [storageInfo, setStorageInfo] = useState(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const [list, info] = await Promise.all([
        StorageService.listAllAttachments({ notes }),
        StorageService.getStorageInfo(),
      ]);
      setRows(list);
      setStorageInfo(info);
      setSelected(new Set()); // clear selection after refresh
    } finally {
      setLoading(false);
    }
  }, [notes]);

  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "images") return rows.filter(r => r.type?.startsWith("image/"));
    if (filter === "files") return rows.filter(r => !r.type?.startsWith("image/"));
    if (filter === "orphan") return rows.filter(r => r.orphan);
    return rows;
  }, [rows, filter]);

  const totals = useMemo(() => {
    const total = rows.reduce((n, r) => n + r.size, 0);
    const orphan = rows.filter(r => r.orphan).reduce((n, r) => n + r.size, 0);
    const selectedBytes = rows.filter(r => selected.has(r.id)).reduce((n, r) => n + r.size, 0);
    return { total, orphan, orphanCount: rows.filter(r => r.orphan).length, selectedBytes };
  }, [rows, selected]);

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const r of visible) next.add(r.id);
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const removeSelected = async () => {
    if (selected.size === 0) return;
    if (!window.confirm(`Remove ${selected.size} attachment${selected.size === 1 ? "" : "s"} (${formatMB(totals.selectedBytes)} MB)? This can't be undone.`)) return;
    setBusy(true);
    try {
      const { removed, notesUpdated } = await StorageService.removeAttachmentsByIds([...selected], { notes, saveNote: onSaveNote });
      toast.success(`Freed ${formatMB(totals.selectedBytes)} MB · removed ${removed} attachment${removed === 1 ? "" : "s"}${notesUpdated ? ` across ${notesUpdated} note${notesUpdated === 1 ? "" : "s"}` : ""}`);
      _resetStorageWarnings();
      await refresh();
      onAfterChange?.();
      // Re-check quota so any subsequent 80% warning stays accurate
      checkStorageQuota().catch(() => {});
    } catch (err) {
      toast.error(err.message || "Failed to remove attachments");
    } finally {
      setBusy(false);
    }
  };

  const sweepOrphans = async () => {
    const orphanIds = rows.filter(r => r.orphan).map(r => r.id);
    if (orphanIds.length === 0) { toast.info("No orphan attachments — nothing to sweep."); return; }
    if (!window.confirm(`Sweep ${orphanIds.length} orphan attachment${orphanIds.length === 1 ? "" : "s"} (${formatMB(totals.orphan)} MB)?`)) return;
    setBusy(true);
    try {
      const { removed } = await StorageService.removeAttachmentsByIds(orphanIds, { notes: [], saveNote: undefined });
      toast.success(`Freed ${formatMB(totals.orphan)} MB · removed ${removed} orphan file${removed === 1 ? "" : "s"}`);
      _resetStorageWarnings();
      await refresh();
      onAfterChange?.();
    } finally {
      setBusy(false);
    }
  };

  const chipCls = (active) => `h-7 px-2.5 rounded-full text-xs font-medium border shrink-0 transition-colors ${
    active ? "bg-indigo-500 border-indigo-500 text-white" : isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
  }`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`sm:max-w-[560px] max-h-[85vh] flex flex-col ${isDark ? "bg-slate-900 text-white border-white/10" : ""}`} data-testid="storage-cleanup-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-500" /> Free Up Space
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Your biggest attachments, sorted by size. Select any to bulk-remove and reclaim device storage.
          </DialogDescription>
        </DialogHeader>

        {/* Overview */}
        <div className={`rounded-lg p-3 flex items-center gap-3 ${isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200"}`} data-testid="storage-cleanup-overview">
          <div className="flex-1">
            <div className="text-xs opacity-70">Device storage</div>
            <div className="text-sm font-mono" data-testid="storage-cleanup-usage">
              {storageInfo ? `${storageInfo.usageMB} MB / ${storageInfo.quotaMB} MB · ${storageInfo.percentUsed}% used` : "…"}
            </div>
          </div>
          <div className="flex-1 text-right">
            <div className="text-xs opacity-70">Attachments total</div>
            <div className="text-sm font-mono">{formatMB(totals.total)} MB · {rows.length} files</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 items-center pt-2 overflow-x-auto pb-1" data-testid="storage-cleanup-filters">
          <button type="button" onClick={() => setFilter("all")}    className={chipCls(filter === "all")}    data-testid="storage-filter-all">All ({rows.length})</button>
          <button type="button" onClick={() => setFilter("images")} className={chipCls(filter === "images")} data-testid="storage-filter-images">Images ({rows.filter(r => r.type?.startsWith("image/")).length})</button>
          <button type="button" onClick={() => setFilter("files")}  className={chipCls(filter === "files")}  data-testid="storage-filter-files">Files ({rows.filter(r => !r.type?.startsWith("image/")).length})</button>
          <button type="button" onClick={() => setFilter("orphan")} className={chipCls(filter === "orphan")} data-testid="storage-filter-orphan" disabled={totals.orphanCount === 0}>
            Orphans ({totals.orphanCount})
          </button>
          <button type="button" onClick={refresh} className={`ml-auto h-7 px-2 rounded-md ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`} title="Refresh" data-testid="storage-cleanup-refresh">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1" data-testid="storage-cleanup-list">
          {loading ? (
            <div className="py-10 text-center text-sm opacity-70"><Loader2 className="w-4 h-4 inline animate-spin mr-2" />Loading attachments…</div>
          ) : visible.length === 0 ? (
            <div className="py-10 text-center text-sm opacity-70">
              {filter === "orphan" ? "No orphan attachments — everything is linked to a note." : rows.length === 0 ? "You have no attachments yet — nothing to clean." : "No attachments match this filter."}
            </div>
          ) : (
            visible.map(r => {
              const isImg = r.type?.startsWith("image/");
              const isSelected = selected.has(r.id);
              return (
                <label
                  key={r.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                    isSelected
                      ? isDark ? "bg-indigo-500/20 border-indigo-400/40" : "bg-indigo-50 border-indigo-300"
                      : isDark ? "border-white/5 hover:bg-white/5" : "border-transparent hover:bg-gray-50"
                  }`}
                  data-testid={`storage-cleanup-row-${r.id}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(r.id)}
                    className="w-4 h-4 accent-indigo-500"
                    data-testid={`storage-cleanup-check-${r.id}`}
                  />
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                    {isImg ? <ImageIcon className="w-4 h-4 opacity-70" /> : <FileText className="w-4 h-4 opacity-70" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-[11px] opacity-60 truncate flex items-center gap-1.5">
                      <span>{formatMB(r.size)} MB</span>
                      <span>·</span>
                      {r.note_title ? (
                        <span className="truncate">{r.note_title}{r.archived ? " · archived" : ""}{r.deleted ? " · in trash" : ""}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-500"><AlertCircle className="w-3 h-3" /> orphan</span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className={`pt-2 border-t ${isDark ? "border-white/10" : "border-gray-200"} flex flex-wrap gap-2 items-center`}>
          <div className="text-xs opacity-70 mr-auto" data-testid="storage-cleanup-selection">
            {selected.size > 0 ? `${selected.size} selected · ${formatMB(totals.selectedBytes)} MB` : "Nothing selected"}
          </div>
          {totals.orphanCount > 0 && (
            <Button variant="outline" size="sm" onClick={sweepOrphans} disabled={busy} data-testid="storage-cleanup-sweep-orphans"
              className={`h-8 text-xs ${isDark ? "border-amber-500/30 text-amber-300 hover:bg-amber-500/10" : "border-amber-200 text-amber-700 hover:bg-amber-50"}`}>
              Sweep orphans ({formatMB(totals.orphan)} MB)
            </Button>
          )}
          {visible.length > 0 && (
            <Button variant="outline" size="sm" onClick={selectAllVisible} className="h-8 text-xs" data-testid="storage-cleanup-select-all">Select visible</Button>
          )}
          {selected.size > 0 && (
            <Button variant="outline" size="sm" onClick={clearSelection} className="h-8 text-xs" data-testid="storage-cleanup-clear">Clear</Button>
          )}
          <Button
            size="sm"
            onClick={removeSelected}
            disabled={busy || selected.size === 0}
            className="h-8 text-xs bg-red-500 hover:bg-red-600 text-white"
            data-testid="storage-cleanup-remove-selected"
          >
            {busy ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Removing…</> : <><Trash2 className="w-3 h-3 mr-1" />Free {selected.size ? formatMB(totals.selectedBytes) : "0"} MB</>}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
