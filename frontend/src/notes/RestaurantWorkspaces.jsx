// Restaurants Galore™ — Phase 2 workspace modals.
// All 5 sub-modals share a common shell so we ship them in one file:
//   • RestaurantMenusModal        — items + price history
//   • RestaurantMealsModal        — favorite meals
//   • RestaurantOrdersModal       — order history + tip calc + split bill
//   • RestaurantSpendingModal     — charts + KPIs (recharts)
//   • RestaurantCouponsModal      — coupons + expiration alerts

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Menu as MenuIcon, ChefHat, Receipt, TrendingUp, Ticket, Plus, X, Trash2,
  Edit3, Store, DollarSign, Percent, Users, Calculator, AlertCircle, Clock,
  Check, Search, TrendingDown, ArrowUpRight,
} from "lucide-react";
import { format, parseISO, differenceInCalendarDays, subMonths, subDays } from "date-fns";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantsService from "../storage/restaurantsService";
import { haptic } from "../utils/haptic";

// =========================================================================
// Shared helpers
// =========================================================================
const Field = ({ label, children, isDark }) => (
  <div>
    <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

const inputCls = (isDark) => `h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`;
const cardCls  = (isDark) => `rounded-xl border p-3 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200 shadow-sm"}`;

function RestaurantPicker({ restaurants, value, onChange, isDark, testid = "rest-picker" }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className={`h-9 rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}
      data-testid={testid}
    >
      <option value="">All restaurants</option>
      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
    </select>
  );
}

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
                              <button type="button" onClick={() => setEditing(it)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}><Edit3 className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => handleDelete(it.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}><Trash2 className="w-3.5 h-3.5" /></button>
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

// =========================================================================
// 2. FAVORITE MEALS
// =========================================================================
export function RestaurantMealsModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [meals, setMeals] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, all] = await Promise.all([
      RestaurantsService.listRestaurants(),
      RestaurantsService.listFavoriteMeals(),
    ]);
    setRestaurants(rs);
    setMeals(all);
    setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => meals.filter(m => !selectedR || m.restaurant_id === selectedR), [meals, selectedR]);

  const handleSave = async (payload) => {
    await RestaurantsService.saveFavoriteMeal(payload);
    reload();
    toast.success(payload.id ? "Updated" : "Saved favorite");
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteFavoriteMeal(id);
    setMeals(meals.filter(m => m.id !== id));
    toast.success("Removed");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="meals-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><ChefHat className="w-5 h-5 text-amber-400" /> Favorite Meals</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Remember exactly how you like every dish — right down to the extra pickles.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <RestaurantPicker restaurants={restaurants} value={selectedR} onChange={setSelectedR} isDark={isDark} testid="meals-restaurant-picker" />
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: selectedR || restaurants[0]?.id })} disabled={restaurants.length === 0} data-testid="meals-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add favorite
                </Button>
              </div>
              {filtered.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No favorite meals yet.</div>
              ) : (
                <div className="space-y-1.5" data-testid="meals-list">
                  {filtered.map(m => {
                    const r = restaurants.find(x => x.id === m.restaurant_id);
                    return (
                      <div key={m.id} className={`rounded-lg border p-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`meal-row-${m.id}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{m.meal_name}</div>
                            {r && <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>@ {r.name}</div>}
                            <div className={`text-[11px] mt-1 space-y-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {m.drink && <div>🥤 {m.drink}</div>}
                              {m.side && <div>🍟 {m.side}</div>}
                              {m.dessert && <div>🍰 {m.dessert}</div>}
                              {m.sauces && <div>🥫 {m.sauces}</div>}
                              {m.cooking_pref && <div>🔥 {m.cooking_pref}</div>}
                              {m.custom_requests && <div>📝 {m.custom_requests}</div>}
                            </div>
                          </div>
                          <button type="button" onClick={() => setEditing(m)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(m.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {editing && <MealEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function MealEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "",
    meal_name: item?.meal_name || "", drink: item?.drink || "", dessert: item?.dessert || "",
    side: item?.side || "", sauces: item?.sauces || "", cooking_pref: item?.cooking_pref || "",
    custom_requests: item?.custom_requests || "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const canSave = f.meal_name.trim() && f.restaurant_id;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="meal-editor">
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit favorite" : "New favorite meal"}</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>The details you never want to forget.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave(f); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => set("restaurant_id", e.target.value)} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <option value="">— Select —</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Meal*" isDark={isDark}><Input value={f.meal_name} onChange={(e) => set("meal_name", e.target.value)} className={inputCls(isDark)} data-testid="meal-editor-name" autoFocus /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Drink" isDark={isDark}><Input value={f.drink} onChange={(e) => set("drink", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Side" isDark={isDark}><Input value={f.side} onChange={(e) => set("side", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Dessert" isDark={isDark}><Input value={f.dessert} onChange={(e) => set("dessert", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Sauces" isDark={isDark}><Input value={f.sauces} onChange={(e) => set("sauces", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Cooking preference" isDark={isDark}><Input value={f.cooking_pref} onChange={(e) => set("cooking_pref", e.target.value)} placeholder="Well done, extra crispy, medium rare…" className={inputCls(isDark)} /></Field>
          <Field label="Custom requests" isDark={isDark}><Textarea value={f.custom_requests} onChange={(e) => set("custom_requests", e.target.value)} placeholder="Extra pickles, no onions, light salt…" rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="meal-editor-save">{isEdit ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// 3. ORDER HISTORY + TIP CALCULATOR + SPLIT BILL
// =========================================================================
export function RestaurantOrdersModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, os] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listOrders()]);
    setRestaurants(rs); setOrders(os); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => orders.filter(o => !selectedR || o.restaurant_id === selectedR), [orders, selectedR]);

  const handleSave = async (payload) => {
    await RestaurantsService.saveOrder(payload);
    reload();
    toast.success(payload.id ? "Order updated" : "Order logged");
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteOrder(id);
    setOrders(orders.filter(o => o.id !== id));
    toast.success("Removed");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="orders-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Receipt className="w-5 h-5 text-amber-400" /> Order History</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Every meal, every dollar, forever. Tip calc + split bill built in.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <RestaurantPicker restaurants={restaurants} value={selectedR} onChange={setSelectedR} isDark={isDark} testid="orders-restaurant-picker" />
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: selectedR || restaurants[0]?.id })} disabled={restaurants.length === 0} data-testid="orders-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Log order
                </Button>
              </div>
              {filtered.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No orders logged.</div>
              ) : (
                <div className="space-y-1.5" data-testid="orders-list">
                  {filtered.map(o => {
                    const r = restaurants.find(x => x.id === o.restaurant_id);
                    return (
                      <div key={o.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`order-row-${o.id}`}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {r?.name || "Unknown"}
                              <span className={`ml-2 text-[10px] font-normal ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                {o.date ? format(new Date(o.date), "MMM d, yyyy") : "—"}{o.time ? ` · ${o.time}` : ""}
                              </span>
                            </div>
                            <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              {(o.items || []).length} items{o.payment_method ? ` · ${o.payment_method}` : ""}{o.who_paid ? ` · ${o.who_paid} paid` : ""}
                            </div>
                          </div>
                          <div className={`text-right shrink-0 mr-2`}>
                            <div className={`text-base font-mono font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${Number(o.total || 0).toFixed(2)}</div>
                            {o.tip > 0 && <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>tip ${Number(o.tip).toFixed(2)}</div>}
                          </div>
                          <button type="button" onClick={() => setEditing(o)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(o.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {editing && <OrderEditor restaurants={restaurants} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function OrderEditor({ restaurants, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || defaultRestaurantId || "",
    date: item?.date ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    time: item?.time || "", order_number: item?.order_number || "",
    subtotal: item?.subtotal ?? "", tax: item?.tax ?? "", tip: item?.tip ?? "",
    delivery_fee: item?.delivery_fee ?? "", discount: item?.discount ?? "",
    total: item?.total ?? "", who_paid: item?.who_paid || "",
    payment_method: item?.payment_method || "", notes: item?.notes || "",
    items: item?.items?.length ? [...item.items] : [{ name: "", qty: 1, price: "" }],
    split_bill: item?.split_bill?.length ? [...item.split_bill] : [],
    tip_pct: "",
    split_count: item?.split_bill?.length || 1,
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const setItem = (i, k, v) => setF({ ...f, items: f.items.map((it, ix) => ix === i ? { ...it, [k]: v } : it) });
  const addItem = () => setF({ ...f, items: [...f.items, { name: "", qty: 1, price: "" }] });
  const rmItem = (i) => setF({ ...f, items: f.items.filter((_, ix) => ix !== i) });

  // Auto-calc subtotal from items
  const computedSubtotal = f.items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
  const effectiveSubtotal = Number(f.subtotal) || computedSubtotal;
  const total = effectiveSubtotal + (Number(f.tax) || 0) + (Number(f.tip) || 0) + (Number(f.delivery_fee) || 0) - (Number(f.discount) || 0);

  // Tip calculator helpers
  const applyTipPct = (pct) => {
    const tip = Number((effectiveSubtotal * pct / 100).toFixed(2));
    setF({ ...f, tip });
  };
  const roundUp = () => setF({ ...f, tip: Math.ceil(total) - (total - (Number(f.tip) || 0)) });
  const roundDown = () => setF({ ...f, tip: Math.max(0, Math.floor(total) - (total - (Number(f.tip) || 0))) });

  // Split-bill preview
  const splitCount = Math.max(1, Number(f.split_count) || 1);
  const perPerson = total / splitCount;

  const canSave = f.restaurant_id;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="order-editor">
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit order" : "Log a new order"}</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Tip calculator + split bill included.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave({ ...f, subtotal: Number(effectiveSubtotal.toFixed(2)), total: Number(total.toFixed(2)), split_bill: splitCount > 1 ? Array.from({ length: splitCount }, (_, i) => ({ label: `Person ${i+1}`, amount: Number(perPerson.toFixed(2)) })) : [] }); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => set("restaurant_id", e.target.value)} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <option value="">— Select —</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Date" isDark={isDark}><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Time" isDark={isDark}><Input type="time" value={f.time} onChange={(e) => set("time", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Order #" isDark={isDark}><Input value={f.order_number} onChange={(e) => set("order_number", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>

          <Field label="Items" isDark={isDark}>
            <div className="space-y-1.5">
              {f.items.map((it, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input value={it.name} onChange={(e) => setItem(i, "name", e.target.value)} placeholder="Item" className={inputCls(isDark) + " flex-1"} data-testid={`order-item-name-${i}`} />
                  <Input type="number" min="1" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} className={inputCls(isDark) + " w-14"} />
                  <Input type="number" step="0.01" value={it.price} onChange={(e) => setItem(i, "price", e.target.value)} placeholder="$" className={inputCls(isDark) + " w-20"} />
                  {f.items.length > 1 && <button type="button" onClick={() => rmItem(i)} className={`w-8 h-9 rounded flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}><X className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
              <button type="button" onClick={addItem} className={`text-[11px] ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-800"}`}>+ Add item</button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label={`Subtotal (auto: $${computedSubtotal.toFixed(2)})`} isDark={isDark}><Input type="number" step="0.01" value={f.subtotal} onChange={(e) => set("subtotal", e.target.value)} placeholder={computedSubtotal.toFixed(2)} className={inputCls(isDark)} /></Field>
            <Field label="Tax" isDark={isDark}><Input type="number" step="0.01" value={f.tax} onChange={(e) => set("tax", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Delivery fee" isDark={isDark}><Input type="number" step="0.01" value={f.delivery_fee} onChange={(e) => set("delivery_fee", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Discount" isDark={isDark}><Input type="number" step="0.01" value={f.discount} onChange={(e) => set("discount", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>

          {/* Tip calculator */}
          <div className={`rounded-lg p-2 border ${isDark ? "border-amber-500/20 bg-amber-500/[0.03]" : "border-amber-200 bg-amber-50"}`}>
            <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${isDark ? "text-amber-300" : "text-amber-800"}`}>
              <Calculator className="w-3 h-3 inline mr-1" /> Tip calculator
            </div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {[10, 15, 18, 20, 25].map(p => (
                <button key={p} type="button" onClick={() => applyTipPct(p)} className={`text-[11px] px-2 py-0.5 rounded-md border ${isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`} data-testid={`tip-btn-${p}`}>{p}%</button>
              ))}
              <button type="button" onClick={roundUp} className={`text-[11px] px-2 py-0.5 rounded-md border ${isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>Round up</button>
              <button type="button" onClick={roundDown} className={`text-[11px] px-2 py-0.5 rounded-md border ${isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"}`}>Round down</button>
              <Input type="number" step="0.01" value={f.tip} onChange={(e) => set("tip", e.target.value)} placeholder="Tip $" className={inputCls(isDark) + " w-20 ml-auto h-7 text-xs"} data-testid="tip-amount" />
            </div>
          </div>

          {/* Split bill */}
          <div className={`rounded-lg p-2 border ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"}`}>
            <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <Users className="w-3 h-3 inline mr-1" /> Split bill
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={isDark ? "text-slate-300" : "text-gray-700"}>Divide by</span>
              <Input type="number" min="1" value={f.split_count} onChange={(e) => set("split_count", e.target.value)} className={inputCls(isDark) + " w-14 h-7"} data-testid="split-count" />
              <span className={isDark ? "text-slate-300" : "text-gray-700"}>=</span>
              <span className={`font-mono font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${perPerson.toFixed(2)}/person</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Who paid" isDark={isDark}><Input value={f.who_paid} onChange={(e) => set("who_paid", e.target.value)} className={inputCls(isDark)} /></Field>
            <Field label="Payment method" isDark={isDark}><Input value={f.payment_method} onChange={(e) => set("payment_method", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Notes" isDark={isDark}><Textarea value={f.notes} onChange={(e) => set("notes", e.target.value)} rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>

          <div className={`rounded-lg p-3 flex items-center justify-between ${isDark ? "bg-emerald-500/10 border border-emerald-500/25" : "bg-emerald-50 border border-emerald-200"}`}>
            <span className={`text-xs uppercase tracking-wider font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Total</span>
            <span className={`text-2xl font-bold font-mono ${isDark ? "text-emerald-300" : "text-emerald-700"}`} data-testid="order-total">${total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="order-editor-save">{isEdit ? "Save order" : "Log order"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// 4. SPENDING CENTER
// =========================================================================
export function RestaurantSpendingModal({ isOpen, onClose, isDark }) {
  const [orders, setOrders] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const [rs, os] = await Promise.all([RestaurantsService.listRestaurants({ includeArchived: true }), RestaurantsService.listOrders()]);
      setRestaurants(rs); setOrders(os); setLoading(false);
    })();
  }, [isOpen]);

  const stats = useMemo(() => {
    if (!orders.length) return null;
    const now = new Date();

    // 6-month chart
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const monthly = orders.filter(o => {
        try { const od = new Date(o.date); return od.getFullYear() === d.getFullYear() && od.getMonth() === d.getMonth(); } catch { return false; }
      });
      months.push({ label: format(d, "MMM"), spend: Number(monthly.reduce((s, o) => s + (Number(o.total) || 0), 0).toFixed(2)) });
    }

    // Restaurant ranking
    const byRest = new Map();
    for (const o of orders) {
      const cur = byRest.get(o.restaurant_id) || { total: 0, count: 0 };
      cur.total += Number(o.total) || 0;
      cur.count += 1;
      byRest.set(o.restaurant_id, cur);
    }
    const ranking = Array.from(byRest.entries())
      .map(([id, v]) => ({ id, ...v, restaurant: restaurants.find(r => r.id === id)?.name || "Unknown", avg: v.total / v.count }))
      .sort((a, b) => b.total - a.total);

    const totals = orders.map(o => Number(o.total) || 0).filter(v => v > 0);
    const tips = orders.map(o => Number(o.tip) || 0);

    return {
      total: totals.reduce((a, b) => a + b, 0),
      count: orders.length,
      avg: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0,
      avgTip: tips.length ? tips.reduce((a, b) => a + b, 0) / tips.length : 0,
      max: Math.max(0, ...totals),
      min: totals.length ? Math.min(...totals) : 0,
      months,
      ranking: ranking.slice(0, 8),
      maxRank: ranking[0]?.total || 1,
    };
  }, [orders, restaurants]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="spending-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><TrendingUp className="w-5 h-5 text-amber-400" /> Spending Center</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Where your dining dollars actually go.</DialogDescription>
        </DialogHeader>
        {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : !stats ? (
          <div className={`py-10 text-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            <Receipt className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
            <div className="text-sm font-medium">No orders yet</div>
            <div className="text-xs">Log an order to unlock spending analytics.</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className={cardCls(isDark)}><div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Total</div><div className={`text-2xl font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${stats.total.toFixed(2)}</div><div className="text-[10px] text-slate-500 mt-0.5">{stats.count} orders</div></div>
              <div className={cardCls(isDark)}><div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Avg bill</div><div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>${stats.avg.toFixed(2)}</div><div className="text-[10px] text-slate-500 mt-0.5">tip avg ${stats.avgTip.toFixed(2)}</div></div>
              <div className={cardCls(isDark)}><div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Biggest</div><div className={`text-2xl font-bold ${isDark ? "text-amber-300" : "text-amber-700"}`}>${stats.max.toFixed(2)}</div></div>
              <div className={cardCls(isDark)}><div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Cheapest</div><div className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>${stats.min.toFixed(2)}</div></div>
            </div>
            <div className={cardCls(isDark)}>
              <div className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>6-month spend</div>
              <div className="h-40" data-testid="spending-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.months} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2937" : "#e5e7eb"} />
                    <XAxis dataKey="label" tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 11 }} />
                    <YAxis tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: isDark ? "#0f172a" : "#fff", border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`, borderRadius: 8, fontSize: 12 }} formatter={(v) => [`$${v}`, "Spend"]} />
                    <Bar dataKey="spend" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className={cardCls(isDark)}>
              <div className={`text-sm font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Restaurant ranking</div>
              <div className="space-y-2" data-testid="spending-ranking">
                {stats.ranking.map(r => (
                  <div key={r.id} className="flex items-center gap-2">
                    <div className={`text-xs w-32 truncate ${isDark ? "text-slate-300" : "text-gray-700"}`}>{r.restaurant}</div>
                    <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                      <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400" style={{ width: `${(r.total / stats.maxRank) * 100}%` }} />
                    </div>
                    <div className={`text-xs font-mono w-20 text-right ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${r.total.toFixed(2)}</div>
                    <div className={`text-[10px] w-12 text-right ${isDark ? "text-slate-500" : "text-gray-500"}`}>×{r.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// 5. COUPONS & REWARDS
// =========================================================================
export function RestaurantCouponsModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [rs, cs] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listCoupons()]);
    setRestaurants(rs); setCoupons(cs); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const now = new Date();
  const enriched = coupons.map(c => {
    let daysLeft = null, state = "ok";
    if (c.used) state = "used";
    else if (c.expires_at) {
      try {
        daysLeft = differenceInCalendarDays(parseISO(c.expires_at), now);
        if (daysLeft < 0) state = "expired";
        else if (daysLeft <= 3) state = "critical";
        else if (daysLeft <= 7) state = "soon";
      } catch { /* ignore */ }
    }
    return { ...c, daysLeft, state };
  });

  const handleSave = async (payload) => {
    await RestaurantsService.saveCoupon(payload);
    reload();
    toast.success(payload.id ? "Coupon updated" : "Coupon saved");
    setEditing(null);
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteCoupon(id);
    setCoupons(coupons.filter(c => c.id !== id));
    toast.success("Removed");
  };
  const toggleUsed = async (c) => {
    await RestaurantsService.saveCoupon({ ...c, used: !c.used, used_at: !c.used ? new Date().toISOString() : null });
    reload();
    haptic("tap");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-2xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="coupons-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Ticket className="w-5 h-5 text-amber-400" /> Coupons & Rewards</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Every promo code, gift card, and reward — with expiration alerts.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({})} disabled={restaurants.length === 0} data-testid="coupons-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add coupon
                </Button>
              </div>
              {enriched.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No coupons yet.</div>
              ) : (
                <div className="space-y-1.5" data-testid="coupons-list">
                  {enriched.map(c => {
                    const r = restaurants.find(x => x.id === c.restaurant_id);
                    const badge = c.state === "expired" ? { cls: "bg-red-500/20 text-red-300 border-red-500/30", txt: `Expired ${Math.abs(c.daysLeft)}d ago` }
                      : c.state === "critical" ? { cls: "bg-orange-500/20 text-orange-300 border-orange-500/30", txt: c.daysLeft === 0 ? "Expires today" : `${c.daysLeft}d left` }
                      : c.state === "soon" ? { cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", txt: `${c.daysLeft}d left` }
                      : c.state === "used" ? { cls: "bg-slate-500/20 text-slate-400 border-slate-500/30", txt: "Used" }
                      : c.expires_at ? { cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25", txt: `${c.daysLeft}d left` }
                      : null;
                    return (
                      <div key={c.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"} ${c.used ? "opacity-60" : ""}`} data-testid={`coupon-row-${c.id}`}>
                        <div className="flex items-start gap-2">
                          <button type="button" onClick={() => toggleUsed(c)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${c.used ? "bg-emerald-500 border-emerald-500 text-white" : isDark ? "border-white/20 hover:border-emerald-500" : "border-gray-300 hover:border-emerald-500"}`}>{c.used && <Check className="w-3 h-3" />}</button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className={`text-sm font-mono font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{c.code || c.description || "—"}</div>
                              {badge && <span className={`inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.cls}`}><Clock className="w-2.5 h-2.5" />{badge.txt}</span>}
                            </div>
                            {r && <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>@ {r.name}</div>}
                            <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>{c.description}{c.discount ? ` · ${c.discount}` : ""}{c.loyalty_number ? ` · Loyalty: ${c.loyalty_number}` : ""}</div>
                          </div>
                          <button type="button" onClick={() => setEditing(c)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(c.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {editing && <CouponEditor restaurants={restaurants} item={editing.id ? editing : null} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function CouponEditor({ restaurants, item, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id, restaurant_id: item?.restaurant_id || "", code: item?.code || "",
    description: item?.description || "", discount: item?.discount || "",
    expires_at: item?.expires_at ? item.expires_at.slice(0, 10) : "",
    loyalty_number: item?.loyalty_number || "",
  });
  const set = (k, v) => setF({ ...f, [k]: v });
  const canSave = f.code.trim() || f.description.trim();
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="coupon-editor">
        <DialogHeader><DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit coupon" : "New coupon"}</DialogTitle><DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Never lose a promo code again.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) onSave({ ...f, expires_at: f.expires_at ? new Date(f.expires_at).toISOString() : null }); }} className="space-y-2">
          <Field label="Restaurant" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => set("restaurant_id", e.target.value)} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>
              <option value="">Any</option>{restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Code" isDark={isDark}><Input value={f.code} onChange={(e) => set("code", e.target.value)} placeholder="SAVE20" className={inputCls(isDark)} data-testid="coupon-code" /></Field>
            <Field label="Discount" isDark={isDark}><Input value={f.discount} onChange={(e) => set("discount", e.target.value)} placeholder="20% off" className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Description" isDark={isDark}><Input value={f.description} onChange={(e) => set("description", e.target.value)} className={inputCls(isDark)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Expires" isDark={isDark}><Input type="date" value={f.expires_at} onChange={(e) => set("expires_at", e.target.value)} className={inputCls(isDark)} data-testid="coupon-expires" /></Field>
            <Field label="Loyalty #" isDark={isDark}><Input value={f.loyalty_number} onChange={(e) => set("loyalty_number", e.target.value)} className={inputCls(isDark)} /></Field>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="coupon-editor-save">{isEdit ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
