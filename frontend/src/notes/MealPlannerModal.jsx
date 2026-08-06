import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChefHat, Calendar, Plus, X, ShoppingCart, Search, Coffee, Sun, Moon,
  ArrowLeft, ArrowRight, Clock, Users, Sparkles, Trash2, GripVertical,
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import QuickGuideButton from "../quickguide/QuickGuideButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BUILTIN_RECIPES } from "../data/recipes";
import StorageService from "../storage/storageService";
import { haptic } from "../utils/haptic";

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", icon: Coffee, accent: "#f59e0b" },
  { key: "lunch",     label: "Lunch",     icon: Sun,    accent: "#10b981" },
  { key: "dinner",    label: "Dinner",    icon: Moon,   accent: "#6366f1" },
];

const dateKey = (d) => format(d, "yyyy-MM-dd");

/**
 * Weekly Meal Planner + recipe library.
 *
 * - 7-day grid (Mon → Sun) with 3 slots per day (breakfast/lunch/dinner).
 * - Tap a slot to pick a recipe from the built-in library or a custom one.
 * - "Generate Shopping List" consolidates all planned meal ingredients into
 *   a new Grocery note (respected by ShoppingModeModal & TripJournal).
 * - Users can create custom recipes that are stored offline in settings.
 */
export default function MealPlannerModal({ isOpen, onClose, isDark, onGeneratedGroceryNote }) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [plan, setPlan] = useState({});
  const [pickerOpen, setPickerOpen] = useState(null); // { dateKey, mealType }
  const [customRecipes, setCustomRecipes] = useState([]);
  const [creatingRecipe, setCreatingRecipe] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [p, custom] = await Promise.all([
        StorageService.getMealPlan(),
        StorageService.getCustomRecipes(),
      ]);
      setPlan(p || {});
      setCustomRecipes(custom || []);
    })();
  }, [isOpen]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const allRecipes = useMemo(() => {
    return [...customRecipes, ...BUILTIN_RECIPES];
  }, [customRecipes]);

  const findRecipe = (id) => allRecipes.find(r => r.id === id);

  const setSlot = async (dk, meal, recipeId) => {
    const next = { ...plan };
    if (!next[dk]) next[dk] = {};
    if (recipeId === null) delete next[dk][meal];
    else next[dk][meal] = recipeId;
    if (Object.keys(next[dk] || {}).length === 0) delete next[dk];
    setPlan(next);
    await StorageService.saveMealPlan(next);
    haptic("tap");
  };

  const clearWeek = async () => {
    const next = { ...plan };
    for (const d of days) delete next[dateKey(d)];
    setPlan(next);
    await StorageService.saveMealPlan(next);
    toast.success("Week cleared");
  };

  // Drag between meal slots. Droppable IDs are `slot-<dateKey>-<mealType>`.
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId) return;
    const [, srcDate, srcMeal] = source.droppableId.split("|");
    const [, dstDate, dstMeal] = destination.droppableId.split("|");
    const next = { ...plan };
    const srcSlots = { ...(next[srcDate] || {}) };
    const dstSlots = { ...(next[dstDate] || {}) };
    const moved = srcSlots[srcMeal];
    if (!moved) return;
    const displaced = dstSlots[dstMeal] || null;
    // Swap: put src recipe into destination, and destination's (if any) back into src
    dstSlots[dstMeal] = moved;
    if (displaced) srcSlots[srcMeal] = displaced;
    else delete srcSlots[srcMeal];
    if (Object.keys(srcSlots).length === 0) delete next[srcDate];
    else next[srcDate] = srcSlots;
    if (Object.keys(dstSlots).length === 0) delete next[dstDate];
    else next[dstDate] = dstSlots;
    setPlan(next);
    await StorageService.saveMealPlan(next);
    haptic("tap");
  };

  const generateShoppingList = async () => {
    // Collect ingredients from every planned meal this week
    const combined = new Map(); // key = text.lower  → { text, qty[], dept }
    let recipeCount = 0;
    for (const d of days) {
      const dk = dateKey(d);
      const slots = plan[dk];
      if (!slots) continue;
      for (const meal of Object.keys(slots)) {
        const r = findRecipe(slots[meal]);
        if (!r) continue;
        recipeCount++;
        for (const ing of (r.ingredients || [])) {
          const key = (ing.text || "").toLowerCase().trim();
          if (!key) continue;
          const cur = combined.get(key) || { text: ing.text, qtys: [], dept: ing.dept || "" };
          if (ing.qty) cur.qtys.push(ing.qty);
          combined.set(key, cur);
        }
      }
    }
    if (combined.size === 0) {
      toast.error("Add some meals to your plan first");
      return;
    }
    // Group by department
    const byDept = new Map();
    for (const item of combined.values()) {
      const dept = item.dept || "Other";
      if (!byDept.has(dept)) byDept.set(dept, []);
      byDept.get(dept).push(item);
    }
    const checklist = [];
    for (const [dept, items] of Array.from(byDept.entries()).sort()) {
      // Section header as a done=true placeholder isn't ideal, so we skip section
      // headers and rely on dept metadata for future grouping in the UI.
      for (const item of items) {
        const qtyStr = item.qtys.length > 0 ? ` (${item.qtys.join(" + ")})` : "";
        checklist.push({
          id: uuidv4().slice(0, 10),
          text: `${item.text}${qtyStr}`,
          done: false,
          dept,
        });
      }
    }
    const now = new Date().toISOString();
    const noteId = uuidv4();
    const newNote = {
      id: noteId,
      title: `Meal Plan · Week of ${format(weekStart, "MMM d")}`,
      content: `Auto-generated from your meal plan (${recipeCount} recipe${recipeCount === 1 ? "" : "s"}).\n\nCheck items off in Shopping Mode.`,
      category: "Grocery",
      tags: ["grocery", "meal-plan"],
      color: "lime",
      checklist,
      created_at: now,
      updated_at: now,
      order: Date.now(),
    };
    await StorageService.saveNote(newNote);
    toast.success(`Shopping list created · ${checklist.length} items`);
    if (typeof onGeneratedGroceryNote === "function") {
      onGeneratedGroceryNote(newNote);
    }
    onClose();
  };

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allRecipes;
    return allRecipes.filter(r =>
      (r.name || "").toLowerCase().includes(q) ||
      (r.tagline || "").toLowerCase().includes(q) ||
      (Array.isArray(r.tags) && r.tags.some(t => t.toLowerCase().includes(q)))
    );
  }, [allRecipes, search]);

  const deleteCustom = async (id) => {
    await StorageService.deleteCustomRecipe(id);
    setCustomRecipes(customRecipes.filter(r => r.id !== id));
    toast.success("Recipe removed");
  };

  const cellCls = isDark
    ? "rounded-lg border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
    : "rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors shadow-sm";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-5xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="meal-planner-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <ChefHat className="w-5 h-5 text-amber-400" /> Meal Planner
            <span className="ml-auto"><QuickGuideButton resourceId="IRR-1500" origin="meal-planner" isDark={isDark} size="sm" /></span>
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Plan the week, then generate a shopping list with one tap.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Week navigation */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, -7))}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-800"}`}
              data-testid="meal-week-prev"
              aria-label="Previous week"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className={`flex-1 text-center font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
              Week of {format(weekStart, "MMM d")} — {format(addDays(weekStart, 6), "MMM d, yyyy")}
            </div>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
              className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-800"}`}
              data-testid="meal-week-next"
              aria-label="Next week"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week grid */}
          <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2" data-testid="meal-plan-grid">
            {days.map(d => {
              const dk = dateKey(d);
              const slots = plan[dk] || {};
              const isCurrent = isSameDay(d, new Date());
              return (
                <div
                  key={dk}
                  className={`rounded-xl p-2 ${isDark ? "bg-white/[0.03] border border-white/10" : "bg-white border border-gray-200 shadow-sm"} ${isCurrent ? "ring-2 ring-amber-400" : ""}`}
                >
                  <div className={`text-center text-[10px] uppercase tracking-wider font-semibold ${isCurrent ? "text-amber-400" : isDark ? "text-slate-400" : "text-gray-500"}`}>
                    {format(d, "EEE")}
                  </div>
                  <div className={`text-center text-lg font-bold mb-1.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                    {format(d, "d")}
                  </div>
                  <div className="space-y-1.5">
                    {MEAL_TYPES.map(mt => {
                      const recipeId = slots[mt.key];
                      const r = recipeId ? findRecipe(recipeId) : null;
                      const Icon = mt.icon;
                      const droppableId = `slot|${dk}|${mt.key}`;
                      return (
                        <Droppable droppableId={droppableId} key={mt.key}>
                          {(dropProvided, dropSnap) => (
                            <div
                              ref={dropProvided.innerRef}
                              {...dropProvided.droppableProps}
                              className={`relative ${dropSnap.isDraggingOver ? "ring-2 ring-amber-400 rounded-lg" : ""}`}
                            >
                              {r ? (
                                <Draggable draggableId={`drag|${dk}|${mt.key}`} index={0}>
                                  {(dragProvided, dragSnap) => (
                                    <div
                                      ref={dragProvided.innerRef}
                                      {...dragProvided.draggableProps}
                                      className={`relative w-full ${dragSnap.isDragging ? "shadow-2xl opacity-90 z-10" : ""}`}
                                      style={{ ...dragProvided.draggableProps.style }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => setPickerOpen({ dateKey: dk, mealType: mt.key })}
                                        className={`w-full text-left px-1.5 py-1.5 pr-6 ${cellCls}`}
                                        style={{ borderLeftColor: mt.accent, borderLeftWidth: "3px" }}
                                        data-testid={`meal-slot-${dk}-${mt.key}`}
                                      >
                                        <div className={`text-[9px] uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                          <Icon className="w-2.5 h-2.5" style={{ color: mt.accent }} />
                                          {mt.label}
                                        </div>
                                        <div className={`text-xs mt-0.5 truncate ${isDark ? "text-white font-medium" : "text-gray-900 font-medium"}`}>
                                          {r.name}
                                        </div>
                                      </button>
                                      <div
                                        {...dragProvided.dragHandleProps}
                                        className={`absolute top-1/2 right-1 -translate-y-1/2 w-5 h-6 rounded flex items-center justify-center cursor-grab active:cursor-grabbing ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                                        title="Drag to another slot"
                                        data-testid={`meal-slot-drag-${dk}-${mt.key}`}
                                        aria-label={`Drag ${r.name}`}
                                      >
                                        <GripVertical className="w-3 h-3" />
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPickerOpen({ dateKey: dk, mealType: mt.key })}
                                  className={`w-full text-left px-1.5 py-1.5 ${cellCls}`}
                                  data-testid={`meal-slot-${dk}-${mt.key}`}
                                >
                                  <div className={`text-[9px] uppercase tracking-wider flex items-center gap-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                    <Icon className="w-2.5 h-2.5" style={{ color: mt.accent }} />
                                    {mt.label}
                                  </div>
                                  <div className={`text-xs mt-0.5 truncate ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                                    Tap to add…
                                  </div>
                                </button>
                              )}
                              {dropProvided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          </DragDropContext>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              onClick={generateShoppingList}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="meal-generate-list-btn"
            >
              <ShoppingCart className="w-4 h-4 mr-1.5" /> Generate shopping list
            </Button>
            <Button variant="outline" onClick={clearWeek} data-testid="meal-clear-week-btn">
              <X className="w-4 h-4 mr-1.5" /> Clear week
            </Button>
            <div className="flex-1" />
            <div className={`text-[11px] self-center ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              {allRecipes.length} recipes ({customRecipes.length} custom · {BUILTIN_RECIPES.length} built-in)
            </div>
          </div>

          {/* Custom recipe list — always visible below the plan */}
          {customRecipes.length > 0 && (
            <div className={`rounded-xl p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`}>
              <div className={`flex items-center gap-1.5 mb-2 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                <Sparkles className="w-4 h-4 text-fuchsia-400" /> Your recipes
              </div>
              <div className="flex flex-wrap gap-2">
                {customRecipes.map(r => (
                  <div
                    key={r.id}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${isDark ? "bg-white/5 border-white/10 text-slate-200" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                    data-testid={`custom-recipe-${r.id}`}
                  >
                    <ChefHat className="w-3 h-3 text-fuchsia-400" />
                    <span>{r.name}</span>
                    <button
                      type="button"
                      onClick={() => deleteCustom(r.id)}
                      className={`ml-1 ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                      aria-label={`Remove ${r.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recipe picker */}
        {pickerOpen && (
          <RecipePicker
            allRecipes={allRecipes}
            search={search}
            setSearch={setSearch}
            filteredRecipes={filteredRecipes}
            slotLabel={MEAL_TYPES.find(m => m.key === pickerOpen.mealType)?.label || ""}
            date={pickerOpen.dateKey}
            isDark={isDark}
            onPick={(rid) => {
              setSlot(pickerOpen.dateKey, pickerOpen.mealType, rid);
              setPickerOpen(null);
            }}
            onClear={() => {
              setSlot(pickerOpen.dateKey, pickerOpen.mealType, null);
              setPickerOpen(null);
            }}
            onClose={() => setPickerOpen(null)}
            onCreate={() => setCreatingRecipe(true)}
          />
        )}

        {/* Create custom recipe */}
        {creatingRecipe && (
          <CreateRecipe
            isDark={isDark}
            onClose={() => setCreatingRecipe(false)}
            onSave={async (r) => {
              const saved = await StorageService.saveCustomRecipe(r);
              setCustomRecipes([saved, ...customRecipes]);
              toast.success(`Added "${saved.name}"`);
              setCreatingRecipe(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function RecipePicker({ allRecipes, search, setSearch, filteredRecipes, slotLabel, date, isDark, onPick, onClear, onClose, onCreate }) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="recipe-picker"
      >
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            Pick a recipe for {slotLabel}
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            {format(new Date(date), "EEE, MMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${allRecipes.length} recipes…`}
            className={`pl-8 h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`}
            data-testid="recipe-search"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto">
          {filteredRecipes.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => onPick(r.id)}
              className={`text-left p-3 rounded-xl border transition-colors ${isDark ? "bg-white/[0.03] border-white/10 hover:bg-white/[0.06]" : "bg-white border-gray-200 hover:bg-gray-50"}`}
              data-testid={`recipe-option-${r.id}`}
            >
              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                {r.name}
              </div>
              {r.tagline && (
                <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                  {r.tagline}
                </div>
              )}
              <div className={`flex items-center gap-2 mt-1.5 text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                {r.time_min && (
                  <span className="inline-flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> {r.time_min}m
                  </span>
                )}
                {r.servings && (
                  <span className="inline-flex items-center gap-0.5">
                    <Users className="w-2.5 h-2.5" /> {r.servings}
                  </span>
                )}
                <span>· {(r.ingredients || []).length} ingredients</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClear} className="flex-1" data-testid="recipe-clear-slot">
            <X className="w-4 h-4 mr-1" /> Clear slot
          </Button>
          <Button onClick={onCreate} className="flex-1 bg-fuchsia-500 hover:bg-fuchsia-600" data-testid="recipe-create-new">
            <Plus className="w-4 h-4 mr-1" /> New recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateRecipe({ isDark, onClose, onSave }) {
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [ingredients, setIngredients] = useState([{ text: "", qty: "", dept: "" }]);

  const addRow = () => setIngredients([...ingredients, { text: "", qty: "", dept: "" }]);
  const updateRow = (i, k, v) => setIngredients(ingredients.map((r, ix) => ix === i ? { ...r, [k]: v } : r));
  const removeRow = (i) => setIngredients(ingredients.filter((_, ix) => ix !== i));

  const canSave = name.trim() && ingredients.some(i => i.text.trim());

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className={`max-w-lg max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="create-recipe-modal"
      >
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            New recipe
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div>
            <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Name
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grandma's Sunday Roast"
              className={`h-9 mt-1 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
              data-testid="new-recipe-name" autoFocus />
          </div>
          <div>
            <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Tagline (optional)
            </label>
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short description"
              className={`h-9 mt-1 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
              data-testid="new-recipe-tagline" />
          </div>

          <div>
            <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Ingredients
            </label>
            <div className="space-y-1.5 mt-1">
              {ingredients.map((row, i) => (
                <div key={i} className="flex gap-1.5">
                  <Input
                    value={row.text}
                    onChange={(e) => updateRow(i, "text", e.target.value)}
                    placeholder="Item"
                    className={`h-8 text-xs flex-1 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
                    data-testid={`new-recipe-ing-text-${i}`}
                  />
                  <Input
                    value={row.qty}
                    onChange={(e) => updateRow(i, "qty", e.target.value)}
                    placeholder="Qty"
                    className={`h-8 text-xs w-20 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
                    data-testid={`new-recipe-ing-qty-${i}`}
                  />
                  <Input
                    value={row.dept}
                    onChange={(e) => updateRow(i, "dept", e.target.value)}
                    placeholder="Aisle"
                    className={`h-8 text-xs w-24 ${isDark ? "bg-white/5 border-white/10 text-white" : ""}`}
                    data-testid={`new-recipe-ing-dept-${i}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400" : "text-gray-400 hover:text-red-500"}`}
                    aria-label="Remove ingredient"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addRow}
                className={`w-full h-8 text-xs rounded flex items-center justify-center gap-1 border-2 border-dashed ${isDark ? "border-white/10 text-slate-400 hover:border-white/20" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                data-testid="new-recipe-add-ingredient"
              >
                <Plus className="w-3.5 h-3.5" /> Add ingredient
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            disabled={!canSave}
            onClick={() => onSave({
              name: name.trim(),
              tagline: tagline.trim(),
              ingredients: ingredients.filter(i => i.text.trim()).map(i => ({
                text: i.text.trim(),
                qty: i.qty.trim(),
                dept: i.dept.trim(),
              })),
              is_custom: true,
              created_at: new Date().toISOString(),
            })}
            className="flex-1 bg-fuchsia-500 hover:bg-fuchsia-600"
            data-testid="new-recipe-save"
          >
            <Check className="w-4 h-4 mr-1" /> Save recipe
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Check icon fallback (imported at top would also work but keep local to avoid lint noise if unused elsewhere)
function Check({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
