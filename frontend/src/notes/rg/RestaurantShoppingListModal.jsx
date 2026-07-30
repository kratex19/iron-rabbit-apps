// Restaurants Galore™ — Shopping List
// Cross-recipe grocery list. Users can add ingredients from any recipe
// (via the Recipes modal's cart button) or type items directly here.
// Items dedupe by normalized name; checked items sink to the bottom and
// can be cleared in bulk.
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, CheckCircle2, X as XIcon, Sparkles, LayoutList, Store, RefreshCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RestaurantsService from "../../storage/restaurantsService";
import { classifyAisle, aisleMeta, AISLE_ORDER, allAisles } from "./aisleClassifier";

const GROUP_PREF_KEY = "rg_shopping_group_by_aisle";

export function RestaurantShoppingListModal({ isOpen, onClose, isDark }) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [groupByAisle, setGroupByAisle] = useState(() => localStorage.getItem(GROUP_PREF_KEY) === "1");

  const toggleGrouping = () => {
    const next = !groupByAisle;
    setGroupByAisle(next);
    localStorage.setItem(GROUP_PREF_KEY, next ? "1" : "0");
  };

  const reload = async () => {
    setLoading(true);
    setItems(await RestaurantsService.listShoppingItems());
    setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const stats = useMemo(() => {
    const total = items.length;
    const checked = items.filter((i) => i.checked).length;
    return { total, checked, remaining: total - checked };
  }, [items]);

  // Group unchecked items by aisle (checked items stay in a single "Done" pile
  // at the bottom so users have a clear "still to buy" view). Honors
  // per-item aisle_override when set.
  const grouped = useMemo(() => {
    const groups = {};
    for (const it of items) {
      if (it.checked) {
        (groups.__checked = groups.__checked || []).push(it);
      } else {
        const key = it.aisle_override || classifyAisle(it.name);
        (groups[key] = groups[key] || []).push(it);
      }
    }
    return groups;
  }, [items]);

  const addFromDraft = async () => {
    const parts = draft.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    const res = await RestaurantsService.addShoppingItems(parts, { recipeTitle: "manual" });
    setDraft("");
    reload();
    const parts2 = [];
    if (res.added) parts2.push(`${res.added} added`);
    if (res.revived) parts2.push(`${res.revived} restored`);
    if (parts2.length) toast.success(`Shopping list: ${parts2.join(", ")}`);
    else toast.info("Already on your list");
  };
  const toggle = async (id) => {
    await RestaurantsService.toggleShoppingItem(id);
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, checked: !it.checked } : it)
      .sort((a, b) => a.checked !== b.checked ? (a.checked ? 1 : -1) : (a.created_at || "").localeCompare(b.created_at || "")));
  };
  const remove = async (id) => {
    await RestaurantsService.deleteShoppingItem(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };
  const setAisle = async (id, aisleKey) => {
    await RestaurantsService.setShoppingItemAisle(id, aisleKey);
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, aisle_override: aisleKey || null } : it));
  };
  const clearChecked = async () => {
    const n = await RestaurantsService.clearCheckedShoppingItems();
    reload();
    if (n) toast.success(`Cleared ${n} checked item${n === 1 ? "" : "s"}`);
  };
  const clearAll = async () => {
    if (!window.confirm("Clear the entire shopping list?")) return;
    await RestaurantsService.clearShoppingList();
    reload();
    toast.success("Shopping list cleared");
  };

  const renderRow = (it) => {
    const currentAisle = it.aisle_override || classifyAisle(it.name);
    const meta = aisleMeta(currentAisle);
    return (
      <div
        key={it.id}
        className={`group flex items-center gap-2 rounded-md px-2 py-1.5 border transition-colors ${it.checked ? (isDark ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-gray-100 border-gray-200 opacity-60") : (isDark ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.08]" : "bg-white border-gray-200 hover:bg-gray-50")}`}
        data-testid={`shopping-item-${it.id}`}
      >
        <button
          type="button"
          onClick={() => toggle(it.id)}
          className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${it.checked ? "bg-emerald-500 border-emerald-500 text-white" : (isDark ? "border-white/30 hover:border-emerald-400" : "border-gray-300 hover:border-emerald-500")}`}
          aria-label={it.checked ? "Uncheck" : "Check"}
          aria-pressed={it.checked}
          data-testid={`shopping-toggle-${it.id}`}
        >
          {it.checked && <CheckCircle2 className="w-3 h-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className={`text-sm ${it.checked ? "line-through" : ""} ${isDark ? "text-white" : "text-gray-900"}`}>{it.name}</div>
          {it.sources?.length > 0 && !it.checked && (
            <div className={`text-[10px] truncate ${isDark ? "text-slate-500" : "text-gray-500"}`}>{it.sources.slice(0, 2).join(" · ")}{it.sources.length > 2 ? ` +${it.sources.length - 2}` : ""}</div>
          )}
        </div>
        {/* Aisle picker — only surfaced when the user is in grouped view so the flat view stays minimal. */}
        {groupByAisle && !it.checked && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={`shrink-0 inline-flex items-center gap-1 h-6 px-1.5 rounded text-[11px] border transition-colors ${it.aisle_override ? (isDark ? "bg-sky-500/10 border-sky-500/30 text-sky-300" : "bg-sky-50 border-sky-300 text-sky-700") : (isDark ? "bg-white/5 border-white/10 text-slate-400 hover:border-white/30" : "bg-white border-gray-200 text-gray-500 hover:border-gray-400")}`}
                aria-label={`Change aisle (currently ${meta.label}${it.aisle_override ? ", manual" : ""})`}
                data-testid={`shopping-aisle-picker-${it.id}`}
                title={it.aisle_override ? "Manual aisle — tap to change or reset" : `Auto: ${meta.label}`}
              >
                <span aria-hidden>{meta.emoji}</span>
                {it.aisle_override && <span className="text-[9px] leading-none">•</span>}
              </button>
            </PopoverTrigger>
            <PopoverContent className={`w-44 p-1 ${isDark ? "bg-[#0B1221] border-white/10" : ""}`} align="end" data-testid={`shopping-aisle-menu-${it.id}`}>
              <div className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Move to aisle</div>
              {allAisles().map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => setAisle(it.id, a.key)}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left ${a.key === currentAisle ? (isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-900") : (isDark ? "text-slate-300 hover:bg-white/5" : "text-gray-700 hover:bg-gray-50")}`}
                  data-testid={`shopping-aisle-choice-${it.id}-${a.key}`}
                >
                  <span aria-hidden className="w-4 text-center">{a.emoji}</span>
                  {a.label}
                </button>
              ))}
              {it.aisle_override && (
                <button
                  type="button"
                  onClick={() => setAisle(it.id, null)}
                  className={`w-full mt-1 border-t pt-1 flex items-center gap-2 px-2 py-1 rounded text-[11px] ${isDark ? "text-slate-500 hover:text-white hover:bg-white/5 border-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-gray-50 border-gray-200"}`}
                  data-testid={`shopping-aisle-reset-${it.id}`}
                >
                  <RefreshCcw className="w-3 h-3" /> Reset to auto
                </button>
              )}
            </PopoverContent>
          </Popover>
        )}
        <button
          type="button"
          onClick={() => remove(it.id)}
          className={`w-6 h-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
          aria-label="Remove"
          data-testid={`shopping-remove-${it.id}`}
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="shopping-list-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <ShoppingCart className="w-5 h-5 text-emerald-400" /> Shopping list
            <button
              type="button"
              onClick={toggleGrouping}
              className={`ml-auto inline-flex items-center gap-1 text-[10px] font-normal px-2 py-0.5 rounded-full border transition-colors ${groupByAisle ? (isDark ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-emerald-500 text-white border-emerald-500") : (isDark ? "text-slate-400 border-white/10 hover:border-white/30" : "text-gray-500 border-gray-200 hover:border-gray-400")}`}
              title={groupByAisle ? "Currently grouped by aisle" : "Grouped chronologically"}
              data-testid="shopping-group-toggle"
              aria-pressed={groupByAisle}
            >
              {groupByAisle ? <Store className="w-3 h-3" /> : <LayoutList className="w-3 h-3" />}
              {groupByAisle ? "By aisle" : "By order"}
            </button>
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Ingredients from your recipes, deduplicated and checkable. {stats.remaining} to buy · {stats.checked} done.
          </DialogDescription>
        </DialogHeader>

        {/* Manual add row */}
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addFromDraft(); } }}
            placeholder="Add an item… (comma-separate for multiple)"
            className={`h-10 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`}
            data-testid="shopping-input"
          />
          <Button onClick={addFromDraft} disabled={!draft.trim()} className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="shopping-add-btn">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* List */}
        {loading ? (
          <div className={`py-8 text-center text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>Loading…</div>
        ) : items.length === 0 ? (
          <div className={`text-center py-10 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            <Sparkles className="w-6 h-6 mx-auto mb-2 opacity-40" />
            <div className="text-xs">Your list is empty.</div>
            <div className="text-[10px] mt-1">Tap the cart button on any recipe to add its ingredients here.</div>
          </div>
        ) : groupByAisle ? (
          <div className="space-y-2" data-testid="shopping-items">
            {AISLE_ORDER.map((key) => {
              const rows = grouped[key];
              if (!rows || rows.length === 0) return null;
              const meta = aisleMeta(key);
              return (
                <div key={key} data-testid={`shopping-aisle-${key}`}>
                  <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-0.5 px-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    <span aria-hidden>{meta.emoji}</span> {meta.label} <span className={`font-normal ${isDark ? "text-slate-600" : "text-gray-400"}`}>· {rows.length}</span>
                  </div>
                  <div className="space-y-0.5">{rows.map(renderRow)}</div>
                </div>
              );
            })}
            {grouped.__checked && grouped.__checked.length > 0 && (
              <div data-testid="shopping-aisle-checked">
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider mb-0.5 mt-3 px-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  <CheckCircle2 className="w-3 h-3" /> Done <span className={`font-normal ${isDark ? "text-slate-600" : "text-gray-400"}`}>· {grouped.__checked.length}</span>
                </div>
                <div className="space-y-0.5">{grouped.__checked.map(renderRow)}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-0.5" data-testid="shopping-items">
            {items.map(renderRow)}
          </div>
        )}

        {/* Bulk actions */}
        {items.length > 0 && (
          <div className="flex gap-2 pt-1">
            <Button onClick={clearChecked} disabled={stats.checked === 0} variant="outline" className="flex-1 h-9" data-testid="shopping-clear-checked">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear checked ({stats.checked})
            </Button>
            <Button onClick={clearAll} variant="outline" className="h-9" data-testid="shopping-clear-all">Clear all</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
