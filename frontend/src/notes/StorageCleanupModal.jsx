import React, { useEffect, useMemo, useState } from "react";
import { X, HardDrive, Trash2, RefreshCcw, ImageIcon, FileText, AlertCircle, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import StorageService from "../storage/storageService";
import { checkStorageQuota, _resetStorageWarnings } from "../storage/storageWarnings";
import { dHashFromBlob, groupSimilar } from "../utils/imageHash";

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
  const [filter, setFilter] = useState("all"); // all | images | files | orphan | duplicates
  const [storageInfo, setStorageInfo] = useState(null);
  const [dupeGroups, setDupeGroups] = useState([]); // [[id1, id2, ...], ...]
  const [dupeScanState, setDupeScanState] = useState("idle"); // idle | scanning | done
  const [dupeProgress, setDupeProgress] = useState({ done: 0, total: 0 });
  const [thumbUrls, setThumbUrls] = useState({}); // id -> object URL for preview strip

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

  // Revoke thumbnail URLs when modal closes so we don't leak memory
  useEffect(() => {
    if (!isOpen) {
      Object.values(thumbUrls).forEach((u) => { try { URL.revokeObjectURL(u); } catch { /* ignore */ } });
      setThumbUrls({});
      setDupeGroups([]);
      setDupeScanState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const rowsById = useMemo(() => {
    const m = new Map();
    for (const r of rows) m.set(r.id, r);
    return m;
  }, [rows]);

  const scanDuplicates = React.useCallback(async () => {
    const images = rows.filter((r) => r.type?.startsWith("image/"));
    if (images.length < 2) {
      setDupeGroups([]);
      setDupeScanState("done");
      toast.info("Need at least two images to look for duplicates.");
      return;
    }
    setDupeScanState("scanning");
    setDupeProgress({ done: 0, total: images.length });
    const entries = [];
    const newThumbs = {};
    for (let i = 0; i < images.length; i++) {
      const r = images[i];
      try {
        const blob = await StorageService.getAttachmentBlob(r.id);
        if (blob) {
          const hash = await dHashFromBlob(blob);
          if (hash) entries.push({ id: r.id, hash });
          if (!newThumbs[r.id]) newThumbs[r.id] = URL.createObjectURL(blob);
        }
      } catch { /* skip bad blob */ }
      setDupeProgress({ done: i + 1, total: images.length });
    }
    const groups = groupSimilar(entries, 8);
    // Sort each group so the LARGEST file appears first (default "keep")
    for (const g of groups) {
      g.sort((a, b) => (rowsById.get(b)?.size || 0) - (rowsById.get(a)?.size || 0));
    }
    // Sort groups by potential savings (sum of all but largest)
    groups.sort((a, b) => {
      const sa = a.slice(1).reduce((n, id) => n + (rowsById.get(id)?.size || 0), 0);
      const sb = b.slice(1).reduce((n, id) => n + (rowsById.get(id)?.size || 0), 0);
      return sb - sa;
    });
    setThumbUrls((prev) => ({ ...prev, ...newThumbs }));
    setDupeGroups(groups);
    setDupeScanState("done");
    if (groups.length === 0) {
      toast.success("No visual duplicates found among your images.");
    } else {
      const totalDupes = groups.reduce((n, g) => n + g.length - 1, 0);
      toast.success(`Found ${groups.length} group${groups.length === 1 ? "" : "s"} · ${totalDupes} extra copies could be removed`);
    }
  }, [rows, rowsById]);

  // Auto-scan when user switches to the Duplicates tab (only once per open)
  useEffect(() => {
    if (isOpen && filter === "duplicates" && dupeScanState === "idle" && !loading && rows.length > 0) {
      scanDuplicates();
    }
  }, [isOpen, filter, dupeScanState, loading, rows.length, scanDuplicates]);

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
          <button type="button" onClick={() => setFilter("duplicates")} className={chipCls(filter === "duplicates")} data-testid="storage-filter-duplicates">
            <Copy className="w-3 h-3 inline -mt-0.5 mr-0.5" /> Duplicates{dupeScanState === "done" ? ` (${dupeGroups.length})` : ""}
          </button>
          <button type="button" onClick={refresh} className={`ml-auto h-7 px-2 rounded-md ${isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-gray-100 text-gray-600"}`} title="Refresh" data-testid="storage-cleanup-refresh">
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto -mx-1 px-1" data-testid="storage-cleanup-list">
          {filter === "duplicates" ? (
            dupeScanState === "scanning" ? (
              <div className="py-8 text-center text-sm opacity-80">
                <Loader2 className="w-5 h-5 inline animate-spin mr-2" />
                Scanning images… {dupeProgress.done}/{dupeProgress.total}
              </div>
            ) : dupeGroups.length === 0 ? (
              <div className="py-10 text-center text-sm opacity-70">
                {dupeScanState === "done" ? "No visual duplicates found. Nice tidy library!" : "Tap Duplicates to scan for near-identical photos."}
              </div>
            ) : (
              <div className="space-y-4" data-testid="storage-cleanup-dupe-groups">
                {dupeGroups.map((group, gIdx) => {
                  const potentialSavings = group.slice(1).reduce((n, id) => n + (rowsById.get(id)?.size || 0), 0);
                  return (
                    <div
                      key={`group-${gIdx}`}
                      className={`rounded-lg p-2 border ${isDark ? "border-white/10 bg-white/5" : "border-gray-200 bg-white"}`}
                      data-testid={`storage-cleanup-dupe-group-${gIdx}`}
                    >
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="text-xs opacity-70">
                          <span className="font-semibold">{group.length} similar images</span> · save up to {formatMB(potentialSavings)} MB
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            // Select ALL but the first (largest, best-quality) in the group
                            setSelected((prev) => {
                              const next = new Set(prev);
                              for (let i = 1; i < group.length; i++) next.add(group[i]);
                              return next;
                            });
                            setFilter("all"); // switch back so user sees the selection
                            toast.info(`${group.length - 1} extra cop${group.length - 1 === 1 ? "y" : "ies"} selected — Free ${formatMB(potentialSavings)} MB below.`);
                          }}
                          className="h-7 text-[11px] bg-indigo-500 hover:bg-indigo-600 text-white"
                          data-testid={`storage-cleanup-dupe-select-group-${gIdx}`}
                        >
                          Select extras
                        </Button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {group.map((id, idx) => {
                          const r = rowsById.get(id);
                          const isKeep = idx === 0;
                          const isSelected = selected.has(id);
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => toggle(id)}
                              className={`relative shrink-0 rounded-lg overflow-hidden border-2 transition-transform ${
                                isSelected
                                  ? "border-red-500 scale-[0.97]"
                                  : isKeep
                                    ? "border-emerald-400"
                                    : isDark ? "border-white/10" : "border-gray-200"
                              }`}
                              style={{ width: 96, height: 96 }}
                              title={`${r?.name || ""} · ${formatMB(r?.size || 0)} MB${isKeep ? " · Best quality (largest)" : ""}`}
                              data-testid={`storage-cleanup-dupe-thumb-${id}`}
                            >
                              {thumbUrls[id] ? (
                                <img src={thumbUrls[id]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                                  <ImageIcon className="w-4 h-4 opacity-50" />
                                </div>
                              )}
                              {isKeep && (
                                <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold">KEEP</div>
                              )}
                              {isSelected && !isKeep && (
                                <div className="absolute top-1 left-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold">REMOVE</div>
                              )}
                              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-mono px-1 py-0.5 text-center">
                                {formatMB(r?.size || 0)} MB
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : loading ? (
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
