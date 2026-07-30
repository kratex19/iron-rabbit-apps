// Restaurants Galore — Menus workspace (price history + sparkline).
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Menu as MenuIcon, Plus, Trash2, Edit3, Check } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RestaurantsService from "../../storage/restaurantsService";
import { Field, inputCls, RestaurantPicker } from "./_shared";

// =========================================================================
// 1. MENUS
// =========================================================================
export function RestaurantMenusModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, all] = await Promise.all([
      RestaurantsService.listRestaurants(),
      RestaurantsService.listMenuItems(),
    ]);
    setRestaurants(rs);
    setItems(all);
    setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() =>
    items.filter(it => !selectedR || it.restaurant_id === selectedR)
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.name || "").localeCompare(b.name || "")),
    [items, selectedR]
  );

  const grouped = useMemo(() => {
    const g = new Map();
    for (const it of filtered) {
      const k = it.category || "Uncategorized";
      if (!g.has(k)) g.set(k, []);
      g.get(k).push(it);
    }
    return Array.from(g.entries());
  }, [filtered]);

  const handleSave = async (payload) => {
    await RestaurantsService.saveMenuItem(payload);
    reload();
    toast.success(payload.id ? "Menu item updated" : `Added "${payload.name}"`);
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteMenuItem(id);
    setItems(items.filter(i => i.id !== id));
    toast.success("Removed");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="menus-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <MenuIcon className="w-5 h-5 text-amber-400" /> Menus
            </DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
              Every dish across every restaurant, with automatic price history.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className={`py-12 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>Loading…</div>
          ) : restaurants.length === 0 ? (
            <div className={`py-10 text-center text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Add a restaurant first from the Directory.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <RestaurantPicker restaurants={restaurants} value={selectedR} onChange={setSelectedR} isDark={isDark} testid="menus-restaurant-picker" />
                <div className="flex-1" />
                <Button
                  className="h-9 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => setEditing({ restaurant_id: selectedR || restaurants[0]?.id })}
                  disabled={restaurants.length === 0}
                  data-testid="menus-add-btn"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add menu item
                </Button>
              </div>

              {grouped.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  No menu items yet. Tap Add menu item.
                </div>
              ) : (
                <div className="space-y-2" data-testid="menus-list">
                  {grouped.map(([cat, arr]) => (
                    <div key={cat}>
                      <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>{cat}</div>
                      <div className="space-y-1">
                        {arr.map(it => {
                          const r = restaurants.find(x => x.id === it.restaurant_id);
                          return (
                            <div key={it.id} className={`flex items-start gap-2 rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"} ${it.discontinued ? "opacity-50" : ""}`} data-testid={`menu-item-${it.id}`}>
                              <div className="flex-1 min-w-0">
                                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {it.name}
                                  {it.discontinued && <span className="ml-2 text-[9px] uppercase font-bold text-amber-400">Discontinued</span>}
                                </div>
                                {r && <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>@ {r.name}</div>}
                                {it.description && <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>{it.description}</div>}
                                {Array.isArray(it.price_history) && it.price_history.length > 0 && (
                                  <div className="h-6 mt-1" data-testid={`menu-sparkline-${it.id}`}>
                                    <ResponsiveContainer width="100%" height="100%">
                                      <LineChart data={[...it.price_history, { price: it.price, date: it.updated_at }].map((p, i) => ({ i, price: Number(p.price) }))}>
                                        <Line type="monotone" dataKey="price" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                      </LineChart>
                                    </ResponsiveContainer>
                                  </div>
                                )}
                              </div>
                              <div className={`text-right shrink-0`}>
                                <div className={`text-sm font-mono font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${Number(it.price || 0).toFixed(2)}</div>
                                {it.calories != null && <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{it.calories} cal</div>}
                              </div>
                              <button type="button" onClick={() => setEditing(it)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} data-testid={`menu-edit-${it.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleDelete(it.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} data-testid={`menu-delete-${it.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {editing && <MenuItemEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function MenuItemEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "",
    category: item?.category || "Dinner", name: item?.name || "",
    description: item?.description || "", price: item?.price ?? "",
    calories: item?.calories ?? "", available: item?.available !== false,
    discontinued: !!item?.discontinued,
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Kids", "Desserts", "Drinks", "Seasonal", "Limited Time", "Specials", "Happy Hour"];
  const canSave = f.name.trim() && f.restaurant_id;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="menu-item-editor">
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit item" : "New menu item"}</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Price changes auto-log to history.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave({ ...f, price: Number(f.price) || 0, calories: f.calories === "" ? null : Number(f.calories) }); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => set("restaurant_id", e.target.value)} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`} data-testid="menu-editor-restaurant">
              <option value="">— Select —</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Category" isDark={isDark}>
              <select value={f.category} onChange={(e) => set("category", e.target.value)} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Name*" isDark={isDark}>
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} className={inputCls(isDark)} data-testid="menu-editor-name" autoFocus />
            </Field>
          </div>
          <Field label="Description" isDark={isDark}>
            <Input value={f.description} onChange={(e) => set("description", e.target.value)} className={inputCls(isDark)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Price ($)" isDark={isDark}>
              <Input type="number" step="0.01" min="0" value={f.price} onChange={(e) => set("price", e.target.value)} className={inputCls(isDark)} data-testid="menu-editor-price" />
            </Field>
            <Field label="Calories" isDark={isDark}>
              <Input type="number" min="0" value={f.calories} onChange={(e) => set("calories", e.target.value)} className={inputCls(isDark)} />
            </Field>
          </div>
          <label className="inline-flex items-center gap-2 mt-1"><input type="checkbox" checked={f.discontinued} onChange={(e) => set("discontinued", e.target.checked)} /><span className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>Discontinued</span></label>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="menu-editor-save"><Check className="w-4 h-4 mr-1" /> {isEdit ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
