// Restaurants Galore™ — Shopping List
// Cross-recipe grocery list. Users can add ingredients from any recipe
// (via the Recipes modal's cart button) or type items directly here.
// Items dedupe by normalized name; checked items sink to the bottom and
// can be cleared in bulk.
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, Trash2, CheckCircle2, X as XIcon, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RestaurantsService from "../../storage/restaurantsService";

export function RestaurantShoppingListModal({ isOpen, onClose, isDark }) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="shopping-list-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <ShoppingCart className="w-5 h-5 text-emerald-400" /> Shopping list
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
        ) : (
          <div className="space-y-0.5" data-testid="shopping-items">
            {items.map((it) => (
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
            ))}
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
