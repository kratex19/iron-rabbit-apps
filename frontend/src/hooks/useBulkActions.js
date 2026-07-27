import { useState, useCallback } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import jsPDF from "jspdf";

import StorageService from "../storage/storageService";
import { haptic } from "../utils/haptic";
import { NOTE_COLORS } from "../notes/constants";

/**
 * Encapsulates every multi-select bulk action for the Notes app.
 *
 * Owns:
 *   - Selection state (`selectMode`, `selectedIds`, helpers)
 *   - Modal visibility flags used by Batch Studio + confirmations
 *   - All bulk handlers (delete, move, copy, duplicate, pin, color, alarm, PDF)
 *
 * The consuming component (NotesApp) is responsible for rendering:
 *   MultiSelectBar, BatchStudioSheet, MoveToCategoryModal, CopySuffixDialog,
 *   and the "Delete N notes?" AlertDialog — wiring each to the returned state.
 */
export default function useBulkActions({ settings, fetchData }) {
  // ---- Selection state ----
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // ---- Modal / sheet visibility ----
  const [moveToOpen, setMoveToOpen] = useState(false);
  const [batchStudioOpen, setBatchStudioOpen] = useState(false);
  const [pendingCopyTarget, setPendingCopyTarget] = useState(null); // string | null
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // ---- Selection helpers ----
  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds]);
  const toggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    haptic("tap");
  }, []);
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectMode(false);
  }, []);
  const enterSelectMode = useCallback(() => {
    setSelectMode(true);
    haptic("tap");
  }, []);

  // ---- Internal: snapshot / restore (for Undo) ----
  const _snapshotSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const snap = new Map();
    for (const id of ids) {
      const n = await StorageService.getNote(id);
      if (n) snap.set(id, n);
    }
    return { ids, snap };
  }, [selectedIds]);
  const _restore = useCallback(async (snap) => {
    for (const [id, n] of snap.entries()) {
      try { await StorageService.saveNote({ ...n, id }); } catch (_e) { /* continue */ }
    }
    fetchData();
  }, [fetchData]);

  // ---- Delete (two-step: open confirm, then confirm actually deletes) ----
  const openDeleteConfirm = useCallback(() => {
    if (selectedIds.size === 0) return;
    setConfirmDeleteOpen(true);
  }, [selectedIds]);

  const confirmBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setConfirmDeleteOpen(false);
    for (const id of ids) {
      try { await StorageService.deleteNote(id); } catch (_e) { /* continue */ }
    }
    clearSelection();
    fetchData();
    toast.success(`Deleted ${ids.length} note${ids.length === 1 ? "" : "s"}`);
  }, [selectedIds, clearSelection, fetchData]);

  // ---- Move ----
  const bulkMoveTo = useCallback(async (targetCategory) => {
    const mode = settings?.dnd_prefs?.smartBatchMode || "move";
    if (mode === "copy") {
      setPendingCopyTarget(targetCategory ?? "");
      return;
    }
    const ids = Array.from(selectedIds);
    const prevMap = new Map();
    for (const id of ids) {
      const prev = await StorageService.moveNoteToCategory(id, targetCategory, "");
      if (prev) prevMap.set(id, prev);
    }
    clearSelection();
    fetchData();
    toast.success(`Moved ${ids.length} note${ids.length === 1 ? "" : "s"} to "${targetCategory || "Uncategorized"}"`, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: async () => {
          for (const [id, prev] of prevMap.entries()) {
            await StorageService.moveNoteToCategory(id, prev.category, prev.subcategory);
          }
          fetchData();
        },
      },
    });
  }, [settings, selectedIds, clearSelection, fetchData]);

  // ---- Copy to another category (with " (copy)" suffix opt) ----
  const bulkCopyTo = useCallback(async (targetCategory, addSuffix) => {
    const ids = Array.from(selectedIds);
    const newIds = [];
    for (const id of ids) {
      const src = await StorageService.getNote(id);
      if (!src) continue;
      const now = new Date().toISOString();
      const copy = {
        ...src,
        id: uuidv4(),
        title: addSuffix ? `${src.title || "Untitled"} (copy)` : src.title,
        category: targetCategory || "",
        subcategory: "",
        created_at: now,
        updated_at: now,
        order: Date.now(),
      };
      delete copy.pinned_at;
      await StorageService.saveNote(copy);
      newIds.push(copy.id);
    }
    clearSelection();
    fetchData();
    toast.success(`Copied ${newIds.length} note${newIds.length === 1 ? "" : "s"} to "${targetCategory || "Uncategorized"}"`, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: async () => {
          for (const nid of newIds) {
            try { await StorageService.deleteNote(nid); } catch (_e) { /* continue */ }
          }
          fetchData();
        },
      },
    });
  }, [selectedIds, clearSelection, fetchData]);

  // ---- Duplicate in place (same category, always adds " (copy)") ----
  const bulkDuplicateInPlace = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const newIds = [];
    for (const id of ids) {
      const src = await StorageService.getNote(id);
      if (!src) continue;
      const now = new Date().toISOString();
      const copy = {
        ...src,
        id: uuidv4(),
        title: `${src.title || "Untitled"} (copy)`,
        created_at: now,
        updated_at: now,
        order: Date.now(),
      };
      delete copy.pinned_at;
      await StorageService.saveNote(copy);
      newIds.push(copy.id);
    }
    clearSelection();
    fetchData();
    toast.success(`Duplicated ${newIds.length} note${newIds.length === 1 ? "" : "s"} in place`, {
      duration: 6000,
      action: {
        label: "Undo",
        onClick: async () => {
          for (const nid of newIds) {
            try { await StorageService.deleteNote(nid); } catch (_e) { /* continue */ }
          }
          fetchData();
        },
      },
    });
  }, [selectedIds, clearSelection, fetchData]);

  // ---- Pin / Unpin (auto-toggle) ----
  const bulkTogglePin = useCallback(async () => {
    const { ids, snap } = await _snapshotSelected();
    if (ids.length === 0) return;
    const anyUnpinned = Array.from(snap.values()).some((n) => !n.pinned);
    const target = anyUnpinned;
    const now = new Date().toISOString();
    for (const id of ids) {
      const n = snap.get(id);
      if (!n) continue;
      await StorageService.saveNote({ ...n, pinned: target, updated_at: now });
    }
    clearSelection();
    fetchData();
    toast.success(`${target ? "Pinned" : "Unpinned"} ${ids.length} note${ids.length === 1 ? "" : "s"}`, {
      duration: 6000,
      action: { label: "Undo", onClick: () => _restore(snap) },
    });
  }, [_snapshotSelected, _restore, clearSelection, fetchData]);

  // ---- Recolor ----
  const bulkSetColor = useCallback(async (colorName) => {
    const { ids, snap } = await _snapshotSelected();
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    for (const id of ids) {
      const n = snap.get(id);
      if (!n) continue;
      await StorageService.saveNote({ ...n, color: colorName, updated_at: now });
    }
    clearSelection();
    fetchData();
    toast.success(`Recolored ${ids.length} note${ids.length === 1 ? "" : "s"}`, {
      duration: 6000,
      action: { label: "Undo", onClick: () => _restore(snap) },
    });
  }, [_snapshotSelected, _restore, clearSelection, fetchData]);

  // ---- Set alarm on all ----
  const bulkSetAlarm = useCallback(async (isoDateTime, sound = "bell") => {
    const { ids, snap } = await _snapshotSelected();
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    for (const id of ids) {
      const n = snap.get(id);
      if (!n) continue;
      await StorageService.saveNote({
        ...n,
        alarm: { enabled: true, datetime: isoDateTime, sound, haptic: false },
        updated_at: now,
      });
    }
    clearSelection();
    fetchData();
    toast.success(`Alarm set on ${ids.length} note${ids.length === 1 ? "" : "s"}`, {
      duration: 6000,
      action: { label: "Undo", onClick: () => _restore(snap) },
    });
  }, [_snapshotSelected, _restore, clearSelection, fetchData]);

  // ---- Clear alarms ----
  const bulkClearAlarm = useCallback(async () => {
    const { ids, snap } = await _snapshotSelected();
    if (ids.length === 0) return;
    const now = new Date().toISOString();
    for (const id of ids) {
      const n = snap.get(id);
      if (!n) continue;
      await StorageService.saveNote({
        ...n,
        alarm: { enabled: false, datetime: null, sound: n.alarm?.sound || "bell", haptic: false },
        updated_at: now,
      });
    }
    clearSelection();
    fetchData();
    toast.success(`Cleared alarms on ${ids.length} note${ids.length === 1 ? "" : "s"}`, {
      duration: 6000,
      action: { label: "Undo", onClick: () => _restore(snap) },
    });
  }, [_snapshotSelected, _restore, clearSelection, fetchData]);

  // ---- Export selected to PDF ----
  const bulkExportPDF = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const notesToExport = [];
    for (const id of ids) {
      const n = await StorageService.getNote(id);
      if (n) notesToExport.push(n);
    }
    if (notesToExport.length === 0) { toast.error("Nothing to export"); return; }
    const doc = new jsPDF();
    let y = 15;
    doc.setFontSize(18); doc.text(settings?.company_name || "Iron Rabbit", 15, y); y += 10;
    doc.setFontSize(9); doc.text(`Exported: ${format(new Date(), "MMM d, yyyy HH:mm")} · ${notesToExport.length} notes`, 15, y); y += 10;
    notesToExport.forEach((note) => {
      if (y > 270) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setTextColor(NOTE_COLORS.find(c => c.name === note.color)?.accent || "#000");
      doc.text(note.title || "Untitled", 15, y); y += 6;
      doc.setFontSize(8); doc.setTextColor(100);
      doc.text(`${format(new Date(note.created_at), "MMM d, yyyy HH:mm")}${note.category ? ` | ${note.category}` : ''}`, 15, y); y += 5;
      doc.setFontSize(10); doc.setTextColor(0);
      doc.splitTextToSize(note.content || "", 180).forEach(line => {
        if (y > 280) { doc.addPage(); y = 15; }
        doc.text(line, 15, y); y += 5;
      });
      y += 8;
    });
    doc.save(`${settings?.company_name || "notes"}-selected-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    clearSelection();
    toast.success(`Exported ${notesToExport.length} note${notesToExport.length === 1 ? "" : "s"} to PDF`);
  }, [selectedIds, settings, clearSelection]);

  return {
    // Selection state
    selectMode, setSelectMode,
    selectedIds,
    isSelected, toggleSelect, clearSelection, enterSelectMode,

    // Modal state
    moveToOpen, setMoveToOpen,
    batchStudioOpen, setBatchStudioOpen,
    pendingCopyTarget, setPendingCopyTarget,
    confirmDeleteOpen, setConfirmDeleteOpen,

    // Handlers
    openDeleteConfirm,
    confirmBulkDelete,
    bulkMoveTo,
    bulkCopyTo,
    bulkDuplicateInPlace,
    bulkTogglePin,
    bulkSetColor,
    bulkSetAlarm,
    bulkClearAlarm,
    bulkExportPDF,
  };
}
