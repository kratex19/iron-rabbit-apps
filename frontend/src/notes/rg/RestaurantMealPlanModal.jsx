// Restaurants Galore™ — Weekly Meal Plan
// A 7-day view (Mon–Sun) where users assign recipes to each day and generate
// a shopping list for the whole week in one tap. Multiple recipes per day
// are allowed. Prev/next week navigation.
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Calendar, ChevronLeft, ChevronRight, Plus, Trash2, ShoppingCart, ChefHat, X as XIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import RestaurantsService from "../../storage/restaurantsService";

// Return an ISO date string YYYY-MM-DD for the Monday of the week containing d.
function mondayOf(d) {
  const dt = new Date(d);
  const day = dt.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function iso(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function RestaurantMealPlanModal({ isOpen, onClose, isDark }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [entries, setEntries] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const from = iso(days[0]);
  const to = iso(days[6]);

  const reload = async () => {
    setLoading(true);
    const [plan, recs] = await Promise.all([
      RestaurantsService.listMealPlan({ from, to }),
      RestaurantsService.listRecipes(),
    ]);
    setEntries(plan);
    setRecipes(recs);
    setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen, from, to]);

  const recipeById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const entriesByDate = useMemo(() => {
    const map = {};
    for (const e of entries) (map[e.date] = map[e.date] || []).push(e);
    return map;
  }, [entries]);

  const addEntry = async (date, recipe_id) => {
    const rec = await RestaurantsService.addMealPlanEntry({ date, recipe_id });
    if (rec) {
      setEntries((prev) => [...prev, rec]);
      toast.success("Added to plan", { id: `mp-add-${date}-${recipe_id}` });
    }
  };
  const removeEntry = async (id) => {
    await RestaurantsService.deleteMealPlanEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };
  const clearWeek = async () => {
    if (!window.confirm("Clear all recipes for this week?")) return;
    const n = await RestaurantsService.clearMealPlanRange({ from, to });
    reload();
    toast.success(`Cleared ${n} entr${n === 1 ? "y" : "ies"}`);
  };

  const buildShoppingList = async () => {
    // Aggregate ingredients from every recipe pinned to this week and push
    // them into the shopping list. RestaurantsService.addShoppingItems handles
    // dedup by normalized name and revives previously-checked items.
    const buckets = [];
    for (const e of entries) {
      const r = recipeById.get(e.recipe_id);
      if (!r || !r.ingredients?.length) continue;
      buckets.push({ ingredients: r.ingredients, title: r.title });
    }
    if (buckets.length === 0) {
      toast.info("No recipes with ingredients are pinned this week.");
      return;
    }
    let totalAdded = 0, totalRevived = 0;
    for (const b of buckets) {
      const res = await RestaurantsService.addShoppingItems(b.ingredients, { recipeTitle: b.title });
      totalAdded += res.added || 0;
      totalRevived += res.revived || 0;
    }
    const parts = [];
    if (totalAdded) parts.push(`${totalAdded} added`);
    if (totalRevived) parts.push(`${totalRevived} restored`);
    toast.success(`Shopping list: ${parts.join(", ") || "already up to date"} (from ${buckets.length} recipe${buckets.length === 1 ? "" : "s"})`, { id: `mp-shop-${from}` });
  };

  const rangeLabel = `${days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  const todayIso = iso(new Date());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="meal-plan-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Calendar className="w-5 h-5 text-purple-400" /> Weekly meal plan
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Pin recipes to each day, then generate this week&apos;s shopping list in one tap.
          </DialogDescription>
        </DialogHeader>

        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, -7))} data-testid="meal-plan-prev-week" aria-label="Previous week">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className={`flex-1 text-center text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`} data-testid="meal-plan-range-label">{rangeLabel}</div>
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(addDays(weekStart, 7))} data-testid="meal-plan-next-week" aria-label="Next week">
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setWeekStart(mondayOf(new Date()))} data-testid="meal-plan-this-week">
            This week
          </Button>
        </div>

        {/* 7-day grid */}
        {loading ? (
          <div className={`py-8 text-center text-sm ${isDark ? "text-slate-500" : "text-gray-500"}`}>Loading…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2" data-testid="meal-plan-grid">
            {days.map((d, i) => {
              const dateIso = iso(d);
              const rows = entriesByDate[dateIso] || [];
              const isToday = dateIso === todayIso;
              return (
                <div
                  key={dateIso}
                  className={`rounded-lg border p-2 min-h-[140px] flex flex-col gap-1 ${isToday ? (isDark ? "border-purple-500/50 bg-purple-500/5" : "border-purple-400 bg-purple-50") : (isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white")}`}
                  data-testid={`meal-plan-day-${dateIso}`}
                >
                  <div className="flex items-baseline justify-between">
                    <div className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? (isDark ? "text-purple-300" : "text-purple-700") : (isDark ? "text-slate-500" : "text-gray-500")}`}>
                      {DOW[i]}
                    </div>
                    <div className={`text-xs font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{d.getDate()}</div>
                  </div>
                  {rows.length === 0 && (
                    <div className={`text-[10px] italic flex-1 flex items-center justify-center ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                      Empty
                    </div>
                  )}
                  {rows.map((e) => {
                    const r = recipeById.get(e.recipe_id);
                    return (
                      <div
                        key={e.id}
                        className={`group flex items-center gap-1 rounded px-1.5 py-1 text-[11px] ${isDark ? "bg-white/5 text-white" : "bg-gray-100 text-gray-900"}`}
                        data-testid={`meal-plan-entry-${e.id}`}
                      >
                        <ChefHat className="w-2.5 h-2.5 shrink-0 text-purple-400" />
                        <span className="flex-1 truncate">{r?.title || "(deleted recipe)"}</span>
                        <button
                          type="button"
                          onClick={() => removeEntry(e.id)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? "text-slate-400 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                          aria-label="Remove from plan"
                          data-testid={`meal-plan-remove-${e.id}`}
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={`mt-auto text-[10px] flex items-center justify-center gap-1 rounded py-1 border transition-colors ${isDark ? "border-white/10 text-slate-400 hover:border-purple-500/40 hover:text-purple-300" : "border-gray-200 text-gray-500 hover:border-purple-400 hover:text-purple-700"}`}
                        disabled={recipes.length === 0}
                        data-testid={`meal-plan-add-${dateIso}`}
                        aria-label={`Add recipe to ${dateIso}`}
                      >
                        <Plus className="w-3 h-3" /> {recipes.length === 0 ? "No recipes" : "Add"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className={`w-56 p-1 max-h-64 overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : ""}`} align="start" data-testid={`meal-plan-picker-${dateIso}`}>
                      <div className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>Pick a recipe</div>
                      {recipes.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => addEntry(dateIso, r.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs text-left ${isDark ? "text-slate-300 hover:bg-white/5 hover:text-white" : "text-gray-700 hover:bg-gray-100"}`}
                          data-testid={`meal-plan-pick-${dateIso}-${r.id}`}
                        >
                          <ChefHat className="w-3 h-3 shrink-0 text-purple-400" />
                          <span className="truncate">{r.title}</span>
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            onClick={buildShoppingList}
            disabled={entries.length === 0}
            className="flex-1 min-w-[180px] h-10 bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="meal-plan-build-shopping"
          >
            <ShoppingCart className="w-4 h-4 mr-1" /> Build shopping list from this week
          </Button>
          <Button onClick={clearWeek} disabled={entries.length === 0} variant="outline" className="h-10" data-testid="meal-plan-clear-week">
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear week
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
