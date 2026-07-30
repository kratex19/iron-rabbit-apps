// Restaurants Galore — Favorite Meals workspace.
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChefHat, Plus, Trash2, Edit3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantsService from "../../storage/restaurantsService";
import { Field, inputCls, RestaurantPicker } from "./_shared";

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
                          <button type="button" onClick={() => setEditing(m)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} data-testid={`meal-edit-${m.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(m.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} data-testid={`meal-delete-${m.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
