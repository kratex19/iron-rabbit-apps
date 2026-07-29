import React, { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShoppingCart, Check, Circle, ArrowLeft, X, Filter, Eye, EyeOff, DollarSign,
  TrendingDown, TrendingUp,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NOTE_COLORS } from "./constants";
import { haptic } from "../utils/haptic";
import StorageService from "../storage/storageService";
import { buildPriceHistory, priceSignal, clearPriceHistoryCache } from "../utils/priceHistory";

/**
 * Phase-2 Shopping Mode.
 *
 * A giant-button, distraction-free view of every Grocery-category note's
 * checklist merged into one big shopping cart. Users can:
 *   • filter by department (source note)
 *   • hide checked items
 *   • see a live running total (each checklist item may carry an
 *     optional `.price` number — we sum unchecked items)
 *   • tap to toggle done, with an undo toast per action
 */
export default function ShoppingModeModal({ isOpen, onClose, notes, onSaveNote, isDark }) {
  const [deptFilter, setDeptFilter] = useState("all");
  const [hideDone, setHideDone] = useState(false);
  // Snapshot of item→done state at modal open. When the modal closes we
  // diff this against the current state to see which items were freshly
  // checked and log a "grocery trip" for the Insights budget card.
  const [openSnapshot, setOpenSnapshot] = useState(null);
  const [priceHistory, setPriceHistory] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    buildPriceHistory().then(setPriceHistory).catch(() => {});
  }, [isOpen]);

  // Capture snapshot when the modal first opens.
  useEffect(() => {
    if (isOpen && openSnapshot === null) {
      const map = {};
      for (const n of notes || []) {
        for (const it of (n.checklist || [])) {
          map[`${n.id}:${it.id}`] = !!it.done;
        }
      }
      setOpenSnapshot(map);
    }
    if (!isOpen) setOpenSnapshot(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // On close, log a Grocery trip if the user checked at least one new item.
  const handleClose = async () => {
    try {
      if (openSnapshot) {
        let newlyChecked = 0;
        let spent = 0;
        const items = [];
        for (const n of notes || []) {
          if (n.category !== "Grocery" && !(Array.isArray(n.tags) && n.tags.includes("grocery"))) continue;
          for (const it of (n.checklist || [])) {
            const key = `${n.id}:${it.id}`;
            const wasDone = openSnapshot[key] === true;
            if (!wasDone && it.done) {
              newlyChecked += 1;
              const price = Number(it.price) || 0;
              spent += price;
              items.push({
                text: it.text || "",
                price,
                dept: n.title || "",
              });
            }
          }
        }
        if (newlyChecked > 0) {
          await StorageService.saveGroceryTrip({
            date: new Date().toISOString(),
            item_count: newlyChecked,
            total_spent: Number(spent.toFixed(2)),
            items,
          });
          toast.success(
            spent > 0
              ? `Trip saved · ${newlyChecked} items · $${spent.toFixed(2)}`
              : `Trip saved · ${newlyChecked} items`
          );
        }
      }
    } catch (err) {
      console.error("Trip log error:", err);
    }
    onClose();
  };


  const groceryNotes = useMemo(
    () => (notes || []).filter(
      n =>
        !n.archived_at &&
        !n.deleted_at &&
        (n.category === "Grocery" || (Array.isArray(n.tags) && n.tags.includes("grocery")))
    ),
    [notes]
  );

  const flat = useMemo(() => {
    const rows = [];
    for (const n of groceryNotes) {
      const list = Array.isArray(n.checklist) ? n.checklist : [];
      for (const item of list) {
        rows.push({
          noteId: n.id,
          noteTitle: n.title || "Untitled",
          noteColor: n.color,
          item,
        });
      }
    }
    return rows;
  }, [groceryNotes]);

  const filtered = useMemo(() => {
    return flat.filter(r =>
      (deptFilter === "all" || r.noteId === deptFilter) &&
      (!hideDone || !r.item.done)
    );
  }, [flat, deptFilter, hideDone]);

  const totalRemaining = useMemo(() => {
    return flat
      .filter(r => !r.item.done)
      .reduce((s, r) => s + (Number(r.item.price) || 0), 0);
  }, [flat]);

  const doneCount = flat.filter(r => r.item.done).length;
  const totalCount = flat.length;
  const pct = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  const toggleItem = (row) => {
    const note = groceryNotes.find(n => n.id === row.noteId);
    if (!note) return;
    const list = Array.isArray(note.checklist) ? note.checklist : [];
    const nextList = list.map(it => it.id === row.item.id ? { ...it, done: !it.done } : it);
    onSaveNote(note.id, { checklist: nextList });
    haptic("tap");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent
        className={`max-w-3xl max-h-[92vh] overflow-y-auto p-0 ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="shopping-mode-modal"
      >
        <DialogTitle className="sr-only">Shopping Mode</DialogTitle>

        {/* Header */}
        <div className={`sticky top-0 z-10 px-5 py-4 flex items-center gap-3 border-b ${isDark ? "bg-gradient-to-r from-emerald-900/80 via-teal-900/60 to-cyan-900/80 border-white/10" : "bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100 border-gray-200"}`}>
          <div className="flex-1 min-w-0">
            <div className={`text-2xl font-bold flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <ShoppingCart className="w-6 h-6 text-emerald-400" /> Shopping Mode
            </div>
            <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-600"}`}>
              {doneCount} of {totalCount} items done · {pct}%
              {totalRemaining > 0 && <span> · <b>${totalRemaining.toFixed(2)}</b> remaining</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white hover:bg-gray-100 text-gray-800 shadow-sm"}`}
            aria-label="Close shopping mode"
            data-testid="shopping-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className={`h-1.5 ${isDark ? "bg-white/5" : "bg-gray-200"}`}>
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
            style={{ width: `${pct}%` }}
            data-testid="shopping-progress"
          />
        </div>

        {/* Controls */}
        <div className="p-4 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setDeptFilter("all")}
              className={`h-7 px-2.5 rounded-full text-xs font-medium border shrink-0 ${
                deptFilter === "all"
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-gray-200 bg-white text-gray-700"
              }`}
              data-testid="shopping-filter-all"
            >
              All ({totalCount})
            </button>
            {groceryNotes.map(n => {
              const cfg = NOTE_COLORS.find(c => c.name === n.color) || NOTE_COLORS[0];
              const cnt = (n.checklist || []).length;
              if (cnt === 0) return null;
              const active = deptFilter === n.id;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setDeptFilter(n.id)}
                  className={`h-7 px-2.5 rounded-full text-xs font-medium border shrink-0 flex items-center gap-1 ${
                    active ? "text-white" : isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-gray-200 bg-white text-gray-700"
                  }`}
                  style={active ? { background: cfg.accent, borderColor: cfg.accent } : undefined}
                  data-testid={`shopping-filter-${n.id}`}
                >
                  <span className="truncate max-w-[8rem]">{n.title}</span>
                  <span className="opacity-70">{cnt}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setHideDone(h => !h)}
            className={`h-7 px-2.5 rounded-full text-xs font-medium border flex items-center gap-1 ${
              hideDone
                ? "bg-emerald-500 border-emerald-500 text-white"
                : isDark ? "border-white/10 bg-white/5 text-slate-300" : "border-gray-200 bg-white text-gray-700"
            }`}
            data-testid="shopping-hide-done"
          >
            {hideDone ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {hideDone ? "Show all" : "Hide done"}
          </button>
        </div>

        {/* Item list */}
        <div className="px-4 pb-4 space-y-1.5" data-testid="shopping-item-list">
          {filtered.length === 0 ? (
            <div className={`text-center py-10 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              {totalCount === 0
                ? "No grocery items yet — add some to a Grocery pack tile."
                : hideDone ? "Everything in this view is checked off 🎉" : "No items match this filter."}
            </div>
          ) : (
            filtered.map(row => {
              const cfg = NOTE_COLORS.find(c => c.name === row.noteColor) || NOTE_COLORS[0];
              return (
                <button
                  key={`${row.noteId}-${row.item.id}`}
                  type="button"
                  onClick={() => toggleItem(row)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all active:scale-[0.98] ${
                    row.item.done
                      ? isDark ? "bg-emerald-500/10 border-emerald-400/30" : "bg-emerald-50 border-emerald-300"
                      : isDark ? "bg-white/[0.03] border-white/10 hover:border-white/20" : "bg-white border-gray-200 hover:border-emerald-300"
                  }`}
                  style={{ borderLeftColor: cfg.accent, borderLeftWidth: "5px" }}
                  data-testid={`shopping-item-${row.item.id}`}
                >
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border-2 ${
                    row.item.done
                      ? "bg-emerald-500 border-emerald-400 text-white"
                      : isDark ? "border-white/20 text-slate-500" : "border-gray-300 text-gray-400"
                  }`}>
                    {row.item.done ? <Check className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-base font-medium truncate ${
                      row.item.done
                        ? isDark ? "text-emerald-200 line-through" : "text-emerald-800 line-through"
                        : isDark ? "text-white" : "text-gray-900"
                    }`}>
                      {row.item.text}
                    </div>
                    <div className={`text-xs truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                      {row.noteTitle}
                      {row.item.price ? <span className={`ml-2 font-mono ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${Number(row.item.price).toFixed(2)}</span> : null}
                      {(() => {
                        const s = priceHistory ? priceSignal(row.item.text, row.item.price, priceHistory) : null;
                        if (!s) return null;
                        const isDrop = s.kind === "drop";
                        return (
                          <span
                            className={`ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded ${
                              isDrop
                                ? isDark ? "bg-emerald-500/25 text-emerald-200" : "bg-emerald-100 text-emerald-700"
                                : isDark ? "bg-amber-500/25 text-amber-200" : "bg-amber-100 text-amber-700"
                            }`}
                            title={isDrop
                              ? `Great deal! Median $${s.median.toFixed(2)} across last ${s.count} trips`
                              : `Above median $${s.median.toFixed(2)} across last ${s.count} trips`}
                            data-testid={`shopping-price-signal-${row.item.id}`}
                          >
                            {isDrop ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
                            {Math.abs(s.pct).toFixed(0)}%
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
