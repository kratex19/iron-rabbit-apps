// Restaurants Galore™ — Phase 6 modals (P1 enhancements).
//   • RestaurantSmartAssistantModal — multi-turn dining chat over your data
//   • RestaurantRecipesModal        — recreate menu items at home
//   • RestaurantFamilyModal         — dining party members, allergies, favorites

import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import {
  MessageCircle, Send, Loader2, ChefHat, Utensils, Plus, Trash2, Edit3,
  Baby, Cake, HeartHandshake, AlertTriangle, User, RotateCcw, Flame, Calendar, CheckCircle2,
  Sparkles, Save, Star, PlayCircle, ShoppingCart, Coins, Pause, Play, SkipForward, SkipBack, X as XIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantsService from "../../storage/restaurantsService";
import StorageService from "../../storage/storageService";
import { PhotoAttachPanel } from "./PhotoAttachPanel";
import { format, formatDistanceToNow } from "date-fns";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Field = ({ label, children, isDark }) => (
  <div>
    <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);
const inputCls = (isDark) => `h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`;

// =========================================================================
// SMART ASSISTANT (multi-turn chat)
// =========================================================================
export function RestaurantSmartAssistantModal({ isOpen, onClose, isDark }) {
  const [messages, setMessages] = useState([]); // [{role,text}]
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);
  const scrollRef = useRef(null);
  // Recipe idea flow: {loading, idea, restaurants}
  const [recipeIdea, setRecipeIdea] = useState(null);
  const [recipeBusy, setRecipeBusy] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [recipeRestaurantId, setRecipeRestaurantId] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const [dash, all, chat] = await Promise.all([
        RestaurantsService.computeDashboardStats(),
        RestaurantsService.exportAll(),
        RestaurantsService.listChatHistory({ limit: 200 }),
      ]);
      setStats({
        summary: dash,
        restaurants_count: all.restaurants.length,
        recent_orders: all.orders.slice(-30).map(o => ({ date: o.date, total: o.total, tip: o.tip, restaurant_id: o.restaurant_id })),
        top_restaurants: all.restaurants.filter(r => !r.archived).map(r => ({ id: r.id, name: r.name, cuisine: r.cuisine, favorite: r.favorite })).slice(0, 30),
        family: (all.family || []).map(m => ({ name: m.name, relation: m.relation, allergies: m.allergies, dietary: m.dietary, loved_dishes: m.loved_dishes, hated_dishes: m.hated_dishes })),
        rated_recipes: (all.recipes || []).filter(r => r.rating > 0).map(r => ({ title: r.title, cuisine: (r.tags || [])[0] || "", rating: r.rating })).slice(0, 20),
      });
      setRestaurants(all.restaurants.filter(r => !r.archived));
      // Restore prior conversation
      setMessages((chat || []).map(m => ({ role: m.role, text: m.text })));
    })();
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  const send = async () => {
    const q = draft.trim();
    if (!q || busy || !stats) return;
    const userMsg = { role: "user", text: q };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    // Persist user turn immediately so it survives a mid-request reload
    RestaurantsService.appendChatMessage(userMsg).catch(() => {});
    try {
      const res = await axios.post(`${API}/dining_insights`, {
        stats,
        question: q,
        history: nextMessages.slice(0, -1),
      }, { timeout: 45000 });
      const asstMsg = { role: "assistant", text: res.data.insights };
      setMessages([...nextMessages, asstMsg]);
      RestaurantsService.appendChatMessage(asstMsg).catch(() => {});
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Failed";
      toast.error(msg);
      const errMsg = { role: "assistant", text: `⚠ ${msg}` };
      setMessages([...nextMessages, errMsg]);
      RestaurantsService.appendChatMessage(errMsg).catch(() => {});
    } finally {
      setBusy(false);
    }
  };

  // ------ Cost tracking (client-side estimate) ------
  // Rough heuristic: ~4 characters per token for English. Claude Sonnet 4.5
  // pricing: $3 / M input tokens, $15 / M output tokens (Feb 2026).
  // This is an *estimate* — actual usage may vary. The point is to give the
  // user a signal that the conversation is getting expensive.
  const cost = useMemo(() => {
    let inputChars = 0, outputChars = 0;
    // Every request re-sends the full history + stats context. Stats blob
    // is roughly the same size each turn; approximate as 4000 chars.
    const STATS_CHARS_PER_TURN = 4000;
    // Count each user message once as input (in its own turn) plus once for
    // every subsequent turn's history.
    const userTurns = messages.filter(m => m.role === "user").length;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === "user") {
        // Sent as input in every turn from this point onward
        const turnsRemaining = userTurns - messages.slice(0, i).filter(x => x.role === "user").length;
        inputChars += (m.text || "").length * turnsRemaining;
      } else {
        // Assistant message = output in its own turn + input in every subsequent turn
        outputChars += (m.text || "").length;
        const turnsAfter = userTurns - messages.slice(0, i).filter(x => x.role === "user").length;
        inputChars += (m.text || "").length * turnsAfter;
      }
    }
    inputChars += STATS_CHARS_PER_TURN * userTurns; // stats blob per request
    const inputTokens = Math.ceil(inputChars / 4);
    const outputTokens = Math.ceil(outputChars / 4);
    const usd = (inputTokens / 1_000_000) * 3 + (outputTokens / 1_000_000) * 15;
    return { inputTokens, outputTokens, usd };
  }, [messages]);
  // Warn when cost passes 5 cents so the user knows to reset
  const costWarn = cost.usd >= 0.05;

  const reset = async () => {
    setMessages([]);
    await RestaurantsService.clearChatHistory();
    toast.success("Chat cleared");
  };

  const fetchRecipeIdea = async () => {
    if (!stats || recipeBusy) return;
    setRecipeBusy(true);
    const hint = draft.trim(); // reuse the input text as an optional steer
    try {
      const res = await axios.post(`${API}/dining_recipe_idea`, { stats, hint }, { timeout: 45000 });
      setRecipeIdea(res.data);
      // Default target restaurant: user's favorite if any, else the first
      const fav = restaurants.find(r => r.favorite);
      setRecipeRestaurantId((fav || restaurants[0])?.id || "");
      if (hint) setDraft(""); // only clear on success — don't lose the hint on failure
    } catch (e) {
      toast.error(e?.response?.data?.detail || e?.message || "Couldn't generate a recipe idea");
    } finally {
      setRecipeBusy(false);
    }
  };

  const saveRecipeIdea = async () => {
    if (!recipeIdea) return;
    if (!recipeRestaurantId) { toast.error("Pick a restaurant to link this recipe to"); return; }
    try {
      await RestaurantsService.saveRecipe({
        restaurant_id: recipeRestaurantId,
        title: recipeIdea.title,
        prep_time_min: recipeIdea.prep_time_min || null,
        servings: recipeIdea.servings || null,
        ingredients: recipeIdea.ingredients || [],
        steps: recipeIdea.steps || [],
        notes: recipeIdea.notes || "",
        tags: recipeIdea.cuisine ? [recipeIdea.cuisine] : [],
      });
      toast.success(`Saved "${recipeIdea.title}" to your recipes`);
      setRecipeIdea(null);
    } catch (e) {
      toast.error(`Save failed: ${e.message || e}`);
    }
  };

  const suggestions = [
    "Which restaurant is my best value?",
    "How much did I spend on delivery last month?",
    "Suggest a coupon I should use soon.",
    "What's my most-visited cuisine?",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[92vh] flex flex-col ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="smart-assistant-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <MessageCircle className="w-5 h-5 text-amber-400" /> Smart Assistant
            {messages.length > 0 && (
              <span
                className={`ml-2 inline-flex items-center gap-1 text-[10px] font-normal px-1.5 py-0.5 rounded-full border ${costWarn ? (isDark ? "bg-amber-500/10 text-amber-300 border-amber-500/30" : "bg-amber-100 text-amber-800 border-amber-300") : (isDark ? "bg-white/5 text-slate-400 border-white/10" : "bg-gray-100 text-gray-600 border-gray-200")}`}
                title={`Estimate: ~${cost.inputTokens.toLocaleString()} input + ${cost.outputTokens.toLocaleString()} output tokens. Reset to lower cost.`}
                data-testid="assistant-cost-badge"
              >
                <Coins className="w-3 h-3" /> ~${cost.usd.toFixed(cost.usd >= 0.01 ? 3 : 4)}
              </span>
            )}
            <button type="button" onClick={reset} className={`ml-auto text-[10px] font-normal flex items-center gap-1 ${isDark ? "text-slate-500 hover:text-white" : "text-gray-500 hover:text-gray-900"}`} data-testid="assistant-reset">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Ask anything about your dining. Powered by Claude Sonnet — history is saved locally on this device only.
            {costWarn && <span className={`block mt-0.5 ${isDark ? "text-amber-300" : "text-amber-700"}`}>Conversation is getting long — Reset to keep future replies snappy and cheap.</span>}
          </DialogDescription>
        </DialogHeader>

        <div ref={scrollRef} className={`flex-1 min-h-[300px] max-h-[45vh] overflow-y-auto rounded-lg border p-3 space-y-2 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid="assistant-scroll">
          {messages.length === 0 ? (
            <div className={`text-center py-8 space-y-3 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              <MessageCircle className={`w-10 h-10 mx-auto ${isDark ? "text-slate-700" : "text-gray-300"}`} />
              <div className="text-xs">Ask a question, or try one of these:</div>
              <div className="flex flex-wrap gap-1.5 justify-center max-w-md mx-auto">
                {suggestions.map((s, i) => (
                  <button key={i} type="button" onClick={() => setDraft(s)} className={`text-[10px] px-2 py-1 rounded-full border ${isDark ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-100"}`} data-testid={`assistant-suggest-${i}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid={`assistant-msg-${i}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-amber-500 text-white"
                    : isDark ? "bg-white/10 text-slate-100" : "bg-gray-100 text-gray-800"
                }`}>
                  {m.text}
                </div>
              </div>
            ))
          )}
          {busy && (
            <div className="flex justify-start" data-testid="assistant-typing">
              <div className={`rounded-2xl px-3 py-2 text-sm flex items-center gap-2 ${isDark ? "bg-white/10 text-slate-300" : "bg-gray-100 text-gray-500"}`}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        {/* Recipe idea preview panel */}
        {recipeIdea && (
          <div className={`rounded-lg border p-3 space-y-2 ${isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-300"}`} data-testid="recipe-idea-panel">
            <div className="flex items-start gap-2">
              <ChefHat className={`w-4 h-4 mt-0.5 ${isDark ? "text-amber-300" : "text-amber-700"}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold ${isDark ? "text-amber-100" : "text-amber-900"}`} data-testid="recipe-idea-title">{recipeIdea.title}</div>
                <div className={`text-[10px] ${isDark ? "text-amber-300/70" : "text-amber-800/70"}`}>
                  {recipeIdea.cuisine || "Fusion"}
                  {recipeIdea.prep_time_min && <> · {recipeIdea.prep_time_min} min prep</>}
                  {recipeIdea.servings && <> · serves {recipeIdea.servings}</>}
                </div>
              </div>
              <button type="button" onClick={() => setRecipeIdea(null)} className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-800 hover:bg-white/60"}`} data-testid="recipe-idea-dismiss">Dismiss</button>
            </div>
            {recipeIdea.notes && <div className={`text-[11px] italic ${isDark ? "text-amber-200/90" : "text-amber-800"}`}>{recipeIdea.notes}</div>}
            {recipeIdea.ingredients?.length > 0 && (
              <div>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? "text-amber-300" : "text-amber-700"}`}>Ingredients</div>
                <div className={`text-[11px] leading-snug ${isDark ? "text-slate-200" : "text-gray-800"}`} data-testid="recipe-idea-ingredients">
                  {recipeIdea.ingredients.map((s, i) => <div key={i}>• {s}</div>)}
                </div>
              </div>
            )}
            {recipeIdea.steps?.length > 0 && (
              <div>
                <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isDark ? "text-amber-300" : "text-amber-700"}`}>Steps</div>
                <div className={`text-[11px] leading-snug ${isDark ? "text-slate-200" : "text-gray-800"}`} data-testid="recipe-idea-steps">
                  {recipeIdea.steps.map((s, i) => <div key={i}>{i + 1}. {s}</div>)}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <select
                value={recipeRestaurantId}
                onChange={(e) => setRecipeRestaurantId(e.target.value)}
                className={`h-8 flex-1 min-w-0 rounded-md border px-2 text-xs ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                data-testid="recipe-idea-restaurant"
              >
                <option value="">Link to restaurant…</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <Button onClick={saveRecipeIdea} disabled={!recipeRestaurantId} className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="recipe-idea-save">
                <Save className="w-3.5 h-3.5 mr-1" /> Save recipe
              </Button>
              <Button onClick={fetchRecipeIdea} disabled={recipeBusy} variant="outline" className="h-8" data-testid="recipe-idea-regenerate" title="Get another idea">
                {recipeBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ask about your dining…"
            className={`h-10 text-base ${inputCls(isDark)}`}
            disabled={busy || !stats}
            data-testid="assistant-input"
          />
          <Button onClick={send} disabled={busy || !stats || !draft.trim()} className="h-10 bg-amber-500 hover:bg-amber-600 text-white" data-testid="assistant-send">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {/* Assistant actions row */}
        <div className="flex items-center justify-between pt-0.5">
          <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            {draft.trim() ? "Enter to ask · or use the button below with any hint" : "Try a hint like \"vegetarian\", \"kid-friendly\", \"under 30 min\""}
          </div>
          <Button
            type="button"
            onClick={fetchRecipeIdea}
            disabled={recipeBusy || !stats}
            variant="outline"
            className={`h-8 text-xs ${isDark ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10" : "border-amber-500 text-amber-700 hover:bg-amber-50"}`}
            data-testid="recipe-idea-btn"
          >
            {recipeBusy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
            Suggest a new dish
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// RECIPE RECREATION
// =========================================================================
export function RestaurantRecipesModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedR, setSelectedR] = useState("");

  const reload = async () => {
    setLoading(true);
    const [rs, mi, rc] = await Promise.all([
      RestaurantsService.listRestaurants(),
      RestaurantsService.listMenuItems(),
      RestaurantsService.listRecipes(),
    ]);
    setRestaurants(rs); setMenuItems(mi); setRecipes(rc); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const filtered = useMemo(() => recipes.filter(r => !selectedR || r.restaurant_id === selectedR), [recipes, selectedR]);
  const restById = useMemo(() => new Map(restaurants.map(r => [r.id, r])), [restaurants]);
  const menuById = useMemo(() => new Map(menuItems.map(m => [m.id, m])), [menuItems]);

  const handleSave = async (p) => { await RestaurantsService.saveRecipe(p); reload(); toast.success("Saved"); setEditing(null); };
  const handleDelete = async (id) => { await RestaurantsService.deleteRecipe(id); setRecipes(recipes.filter(r => r.id !== id)); toast.success("Removed"); };
  const handleCook = async (id) => {
    const updated = await RestaurantsService.logRecipeCook(id);
    if (updated) {
      setRecipes(recipes.map(r => r.id === id ? updated : r));
      toast.success(`Cooked! (${updated.cook_count}× total)`);
    }
  };
  const handleRate = async (id, rating) => {
    const updated = await RestaurantsService.rateRecipe(id, rating);
    if (updated) setRecipes(recipes.map(r => r.id === id ? updated : r));
  };
  const handleAddToShoppingList = async (rec) => {
    if (!rec.ingredients?.length) { toast.error("No ingredients on this recipe"); return; }
    const res = await RestaurantsService.addShoppingItems(rec.ingredients, { recipeId: rec.id, recipeTitle: rec.title });
    const parts = [];
    if (res.added) parts.push(`${res.added} added`);
    if (res.revived) parts.push(`${res.revived} restored`);
    toast.success(parts.length ? `Shopping list: ${parts.join(", ")}` : "Already on your list");
  };
  const [cooking, setCooking] = useState(null);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="recipes-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><ChefHat className="w-5 h-5 text-amber-400" /> Recipe Recreation</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Your at-home version of restaurant dishes you love.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <select value={selectedR} onChange={(e) => setSelectedR(e.target.value)} className={`h-9 rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`} data-testid="recipes-restaurant-picker">
                  <option value="">All restaurants</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="flex-1" />
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({ restaurant_id: selectedR || restaurants[0]?.id })} disabled={restaurants.length === 0} data-testid="recipes-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> New recipe
                </Button>
              </div>
              {filtered.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No recipes yet — recreate your favorites.</div>
              ) : (
                <div className="space-y-1.5" data-testid="recipes-list">
                  {filtered.map(rec => {
                    const rest = restById.get(rec.restaurant_id);
                    const menu = rec.menu_item_id ? menuById.get(rec.menu_item_id) : null;
                    return (
                      <div key={rec.id} className={`rounded-lg border p-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`recipe-row-${rec.id}`}>
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{rec.title || (menu?.name ? `${menu.name} (home)` : "Recipe")}</div>
                            <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                              {rest?.name}
                              {menu?.name && <> · from <span className="italic">{menu.name}</span></>}
                              {rec.prep_time_min && <> · {rec.prep_time_min} min prep</>}
                              {rec.servings && <> · serves {rec.servings}</>}
                            </div>
                            {/* Star rating */}
                            <div className="flex items-center gap-0.5 mt-1" data-testid={`recipe-rating-${rec.id}`} role="group" aria-label="Rating">
                              {[1, 2, 3, 4, 5].map((n) => {
                                const filled = n <= (rec.rating || 0);
                                return (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => handleRate(rec.id, n === (rec.rating || 0) ? 0 : n)}
                                    className={`p-0.5 rounded transition-colors ${filled ? (isDark ? "text-amber-400" : "text-amber-500") : (isDark ? "text-slate-600 hover:text-amber-400/60" : "text-gray-300 hover:text-amber-400")}`}
                                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                                    data-testid={`recipe-star-${rec.id}-${n}`}
                                  >
                                    <Star className="w-3 h-3" fill={filled ? "currentColor" : "none"} />
                                  </button>
                                );
                              })}
                              {rec.rating > 0 && <span className={`text-[10px] ml-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>({rec.rating}/5)</span>}
                            </div>
                            {rec.ingredients?.length > 0 && (
                              <div className={`text-[11px] mt-1.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                                <span className="font-semibold">Ingredients:</span> {rec.ingredients.slice(0, 5).join(", ")}{rec.ingredients.length > 5 ? `, +${rec.ingredients.length - 5} more` : ""}
                              </div>
                            )}
                            {rec.notes && <div className={`text-[11px] mt-1 italic ${isDark ? "text-slate-400" : "text-gray-600"}`}>{rec.notes}</div>}
                            {rec.cook_count > 0 && (
                              <div className={`text-[10px] mt-1 inline-flex items-center gap-1 ${isDark ? "text-amber-300" : "text-amber-700"}`}>
                                <Flame className="w-2.5 h-2.5" /> cooked {rec.cook_count}× · last: {rec.last_cooked_at ? formatDistanceToNow(new Date(rec.last_cooked_at), { addSuffix: true }) : "—"}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <button type="button" onClick={() => setCooking(rec)} title="Cook mode (step-by-step)" disabled={!rec.steps?.length} className={`w-7 h-7 rounded-full flex items-center justify-center ${!rec.steps?.length ? "opacity-30 cursor-not-allowed" : ""} ${isDark ? "text-sky-400 hover:text-sky-300 hover:bg-sky-500/10" : "text-sky-600 hover:text-sky-700 hover:bg-sky-50"}`} aria-label="Enter cook mode" data-testid={`recipe-cook-mode-${rec.id}`}><PlayCircle className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleAddToShoppingList(rec)} title="Add ingredients to shopping list" disabled={!rec.ingredients?.length} className={`w-7 h-7 rounded-full flex items-center justify-center ${!rec.ingredients?.length ? "opacity-30 cursor-not-allowed" : ""} ${isDark ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"}`} aria-label="Add ingredients to shopping list" data-testid={`recipe-add-shopping-${rec.id}`}><ShoppingCart className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleCook(rec.id)} title="Cook this again (quick log)" className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`} aria-label="Log cook recipe" data-testid={`recipe-cook-${rec.id}`}><Flame className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => setEditing(rec)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} aria-label="Edit recipe" data-testid={`recipe-edit-${rec.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleDelete(rec.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} aria-label="Delete recipe" data-testid={`recipe-delete-${rec.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
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
      {editing && <RecipeEditor restaurants={restaurants} menuItems={menuItems} item={editing.id ? editing : null} defaultRestaurantId={editing.restaurant_id} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
      {cooking && <CookModeModal recipe={cooking} isDark={isDark} onClose={() => setCooking(null)} onComplete={async () => { await handleCook(cooking.id); setCooking(null); }} />}
    </>
  );
}

// =========================================================================
// COOK MODE — step-by-step guided cooking with an auto-detected timer per step
// =========================================================================
// Parses "for 15 minutes" / "15 min" / "1 hour" hints from step text and
// exposes a Start/Pause timer so users can cook hands-free.
function parseStepMinutes(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  // Try "for X min[utes]" first — most reliable
  let m = t.match(/for\s+(\d+)\s*(?:-\s*\d+\s*)?(min|minute|minutes|hr|hrs|hour|hours)\b/);
  if (!m) m = t.match(/\b(\d+)\s*(min|minute|minutes|hr|hrs|hour|hours)\b/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!n || n > 240) return null;
  const isHour = m[2].startsWith("h");
  return isHour ? n * 60 : n;
}

function CookModeModal({ recipe, isDark, onClose, onComplete }) {
  const steps = recipe.steps || [];
  const [idx, setIdx] = useState(0);
  const [seconds, setSeconds] = useState(0); // remaining seconds
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const stepMinutes = parseStepMinutes(steps[idx]);
  const hasTimer = stepMinutes !== null;

  // Reset timer whenever step changes
  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
    setSeconds(stepMinutes ? stepMinutes * 60 : 0);
  }, [idx, stepMinutes]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);
          try {
            toast.success(`Step ${idx + 1} timer done`);
            // Small beep via Web Audio for a gentle nudge
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) {
              const ctx = new AC();
              const o = ctx.createOscillator(); const g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.frequency.value = 880; g.gain.value = 0.08;
              o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 400);
            }
          } catch { /* audio not permitted */ }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [running, idx]);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
  const progress = steps.length ? ((idx + 1) / steps.length) * 100 : 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="cook-mode-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <PlayCircle className="w-5 h-5 text-sky-400" /> Cook mode
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>{recipe.title}</DialogDescription>
        </DialogHeader>
        {/* Progress bar */}
        <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/10" : "bg-gray-200"}`}>
          <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${progress}%` }} data-testid="cook-mode-progress" />
        </div>
        <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"}`} data-testid="cook-mode-step-counter">
          Step {idx + 1} of {steps.length}
        </div>

        <div className={`rounded-xl p-4 border-2 min-h-[120px] ${isDark ? "bg-sky-500/5 border-sky-500/30 text-slate-100" : "bg-sky-50 border-sky-300 text-gray-900"}`} data-testid="cook-mode-step-text">
          <div className="text-base leading-relaxed">{steps[idx] || "(empty step)"}</div>
        </div>

        {/* Timer */}
        {hasTimer && (
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid="cook-mode-timer">
            <div className={`text-3xl font-mono tabular-nums ${isDark ? "text-white" : "text-gray-900"}`} data-testid="cook-mode-timer-display">{fmt(seconds)}</div>
            <div className="flex-1" />
            {!running ? (
              <Button
                type="button"
                onClick={() => { if (seconds === 0) setSeconds(stepMinutes * 60); setRunning(true); }}
                className="bg-sky-500 hover:bg-sky-600 text-white h-9"
                data-testid="cook-mode-timer-start"
              >
                <Play className="w-4 h-4 mr-1" /> {seconds === 0 ? "Restart" : "Start"}
              </Button>
            ) : (
              <Button type="button" onClick={() => setRunning(false)} variant="outline" className="h-9" data-testid="cook-mode-timer-pause">
                <Pause className="w-4 h-4 mr-1" /> Pause
              </Button>
            )}
            <Button type="button" onClick={() => { setSeconds(stepMinutes * 60); setRunning(false); }} variant="outline" className="h-9 px-2" title="Reset" data-testid="cook-mode-timer-reset">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        )}
        {!hasTimer && (
          <div className={`text-[11px] italic ${isDark ? "text-slate-500" : "text-gray-500"}`}>No timer needed for this step.</div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button type="button" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} variant="outline" className="h-10" data-testid="cook-mode-prev">
            <SkipBack className="w-4 h-4" />
          </Button>
          {idx < steps.length - 1 ? (
            <Button type="button" onClick={() => setIdx(idx + 1)} className="flex-1 h-10 bg-sky-500 hover:bg-sky-600 text-white" data-testid="cook-mode-next">
              Next step <SkipForward className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="button" onClick={onComplete} className="flex-1 h-10 bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="cook-mode-finish">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Done cooking
            </Button>
          )}
          <Button type="button" onClick={onClose} variant="outline" className="h-10" data-testid="cook-mode-close" aria-label="Close cook mode">
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RecipeEditor({ restaurants, menuItems, item, defaultRestaurantId, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id,
    restaurant_id: item?.restaurant_id || defaultRestaurantId || "",
    menu_item_id: item?.menu_item_id || "",
    title: item?.title || "",
    prep_time_min: item?.prep_time_min || "",
    servings: item?.servings || 2,
    ingredients_text: (item?.ingredients || []).join("\n"),
    steps_text: (item?.steps || []).join("\n"),
    notes: item?.notes || "",
  });
  const linkedMenus = useMemo(() => menuItems.filter(m => !f.restaurant_id || m.restaurant_id === f.restaurant_id), [menuItems, f.restaurant_id]);
  const canSave = f.restaurant_id && (f.title.trim() || f.menu_item_id);
  const submit = () => onSave({
    ...f,
    ingredients: f.ingredients_text.split("\n").map(s => s.trim()).filter(Boolean),
    steps: f.steps_text.split("\n").map(s => s.trim()).filter(Boolean),
    prep_time_min: Number(f.prep_time_min) || null,
    servings: Number(f.servings) || null,
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="recipe-editor">
        <DialogHeader>
          <DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit recipe" : "New recipe"}</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Ingredients and steps — one per line.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) submit(); }} className="space-y-2">
          <Field label="Restaurant*" isDark={isDark}>
            <select value={f.restaurant_id} onChange={(e) => setF({ ...f, restaurant_id: e.target.value, menu_item_id: "" })} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`} data-testid="recipe-restaurant">
              <option value="">— Select —</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Menu item (optional)" isDark={isDark}>
            <select value={f.menu_item_id} onChange={(e) => setF({ ...f, menu_item_id: e.target.value })} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`} data-testid="recipe-menu">
              <option value="">— Freeform —</option>
              {linkedMenus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </Field>
          <Field label="Title" isDark={isDark}>
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Copycat garlic noodles" className={inputCls(isDark)} data-testid="recipe-title" />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Prep time (min)" isDark={isDark}><Input type="number" value={f.prep_time_min} onChange={(e) => setF({ ...f, prep_time_min: e.target.value })} className={inputCls(isDark)} /></Field>
            <Field label="Servings" isDark={isDark}><Input type="number" value={f.servings} onChange={(e) => setF({ ...f, servings: e.target.value })} className={inputCls(isDark)} /></Field>
          </div>
          <Field label="Ingredients (one per line)" isDark={isDark}><Textarea value={f.ingredients_text} onChange={(e) => setF({ ...f, ingredients_text: e.target.value })} rows={4} placeholder="1 lb dry pasta&#10;6 cloves garlic&#10;1/4 cup butter" className={isDark ? "bg-white/5 border-white/10 text-white" : ""} data-testid="recipe-ingredients" /></Field>
          <Field label="Steps (one per line)" isDark={isDark}><Textarea value={f.steps_text} onChange={(e) => setF({ ...f, steps_text: e.target.value })} rows={4} placeholder="Boil water and salt heavily&#10;Toast garlic in butter…" className={isDark ? "bg-white/5 border-white/10 text-white" : ""} data-testid="recipe-steps" /></Field>
          <Field label="Notes" isDark={isDark}><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>
          <PhotoAttachPanel
            isDark={isDark}
            restaurantId={f.restaurant_id}
            link={{ recipeId: f.id }}
            label="Recipe photos"
            disabled={!f.id}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="recipe-editor-save">{isEdit ? "Save" : "Add recipe"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// FAMILY DINING
// =========================================================================
export function RestaurantFamilyModal({ isOpen, onClose, isDark }) {
  const [members, setMembers] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => { setLoading(true); setMembers(await RestaurantsService.listFamily()); setLoading(false); };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  const handleSave = async (p) => { await RestaurantsService.saveFamilyMember(p); reload(); toast.success("Saved"); setEditing(null); };
  const handleDelete = async (id) => { await RestaurantsService.deleteFamilyMember(id); setMembers(members.filter(m => m.id !== id)); toast.success("Removed"); };
  const handleSyncBirthdays = async () => {
    const withBirthdays = members.filter(m => m.birthday && /^\d{1,2}[-/]\d{1,2}$/.test(m.birthday));
    if (withBirthdays.length === 0) { toast.error("No family birthdays saved yet"); return; }
    let created = 0;
    for (const m of withBirthdays) {
      const [mm, dd] = m.birthday.split(/[-/]/).map(Number);
      const now = new Date();
      let target = new Date(now.getFullYear(), mm - 1, dd);
      if (target < now) target = new Date(now.getFullYear() + 1, mm - 1, dd);
      target.setHours(9, 0, 0, 0);
      const noteId = `rg-bday-${m.id}`;
      await StorageService.saveNote({
        id: noteId,
        title: `🎂 ${m.name}'s birthday`,
        content: `${m.name}${m.relation ? ` (${m.relation})` : ""}\nBirthday reminder from Restaurants Galore.`,
        color: "pink", icon: "Cake",
        background: { type: "gradient", value: ["#F472B6", "#DB2777"] },
        pinned: false,
        tags: ["restaurants", "birthday", "family"],
        attachments: [], events: [], checklist: [],
        category: "Restaurants", subcategory: "",
        alarm: { datetime: target.toISOString(), enabled: true },
        recurring: { enabled: true, frequency: "yearly", days: [] },
        order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      created += 1;
    }
    toast.success(`Synced ${created} birthday reminder${created === 1 ? "" : "s"} to your notes`);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="family-modal">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><HeartHandshake className="w-5 h-5 text-amber-400" /> Family Dining</DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Everyone at the table — allergies, favorites, birthdays.</DialogDescription>
          </DialogHeader>
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
            <div className="space-y-3">
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleSyncBirthdays} disabled={members.length === 0} className="h-9" data-testid="family-sync-btn">
                  <Calendar className="w-4 h-4 mr-1" /> Sync birthdays
                </Button>
                <Button className="h-9 bg-amber-500 hover:bg-amber-600 text-white" onClick={() => setEditing({})} data-testid="family-add-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add member
                </Button>
              </div>
              {members.length === 0 ? (
                <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  <User className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                  <div>No family members yet.</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2" data-testid="family-list">
                  {members.map(m => (
                    <div key={m.id} className={`rounded-lg border p-3 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`family-row-${m.id}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-bold ${isDark ? "bg-amber-500/20 text-amber-300" : "bg-amber-100 text-amber-700"}`}>{m.name?.[0]?.toUpperCase() || "?"}</div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{m.name}{m.kid && <Baby className="w-3 h-3 inline ml-1 text-sky-400" />}</div>
                          <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{m.relation || "family"}{m.birthday && <> · <Cake className="w-2.5 h-2.5 inline mx-0.5" />{m.birthday}</>}</div>
                          {m.allergies?.length > 0 && (
                            <div className={`text-[11px] mt-1 flex items-center gap-1 ${isDark ? "text-red-300" : "text-red-600"}`}>
                              <AlertTriangle className="w-2.5 h-2.5" /> Allergies: {m.allergies.join(", ")}
                            </div>
                          )}
                          {m.dietary?.length > 0 && (
                            <div className={`text-[11px] ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>Diet: {m.dietary.join(", ")}</div>
                          )}
                          {m.loved_dishes?.length > 0 && (
                            <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>Loves: {m.loved_dishes.join(", ")}</div>
                          )}
                          {m.notes && <div className={`text-[11px] mt-0.5 italic ${isDark ? "text-slate-500" : "text-gray-500"}`}>{m.notes}</div>}
                        </div>
                        <button type="button" onClick={() => setEditing(m)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} aria-label="Edit family" data-testid={`family-edit-${m.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                        <button type="button" onClick={() => handleDelete(m.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} aria-label="Delete family" data-testid={`family-delete-${m.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {editing && <FamilyEditor item={editing.id ? editing : null} isDark={isDark} onClose={() => setEditing(null)} onSave={handleSave} />}
    </>
  );
}

function FamilyEditor({ item, isDark, onClose, onSave }) {
  const isEdit = !!item;
  const [f, setF] = useState({
    id: item?.id,
    name: item?.name || "",
    relation: item?.relation || "Partner",
    kid: !!item?.kid,
    birthday: item?.birthday || "",
    allergies_text: (item?.allergies || []).join(", "),
    dietary_text: (item?.dietary || []).join(", "),
    loved_text: (item?.loved_dishes || []).join(", "),
    hated_text: (item?.hated_dishes || []).join(", "),
    notes: item?.notes || "",
  });
  const canSave = f.name.trim();
  const RELATIONS = ["Partner", "Spouse", "Kid", "Parent", "Sibling", "Friend", "Grandparent", "Other"];
  const submit = () => onSave({
    ...f,
    allergies: f.allergies_text.split(",").map(s => s.trim()).filter(Boolean),
    dietary: f.dietary_text.split(",").map(s => s.trim()).filter(Boolean),
    loved_dishes: f.loved_text.split(",").map(s => s.trim()).filter(Boolean),
    hated_dishes: f.hated_text.split(",").map(s => s.trim()).filter(Boolean),
  });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`max-w-md max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="family-editor">
        <DialogHeader><DialogTitle className={isDark ? "text-white" : "text-gray-900"}>{isEdit ? "Edit family member" : "New family member"}</DialogTitle><DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Personalizes future recommendations.</DialogDescription></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); if (canSave) submit(); }} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Name*" isDark={isDark}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls(isDark)} autoFocus data-testid="family-name" /></Field>
            <Field label="Relation" isDark={isDark}>
              <select value={f.relation} onChange={(e) => setF({ ...f, relation: e.target.value })} className={`h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}>{RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}</select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Birthday (MM-DD)" isDark={isDark}><Input value={f.birthday} onChange={(e) => setF({ ...f, birthday: e.target.value })} placeholder="07-14" className={inputCls(isDark)} data-testid="family-birthday" /></Field>
            <label className="inline-flex items-center gap-2 mt-5"><input type="checkbox" checked={f.kid} onChange={(e) => setF({ ...f, kid: e.target.checked })} /><span className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>Kid&apos;s menu eligible</span></label>
          </div>
          <Field label="Allergies (comma separated)" isDark={isDark}><Input value={f.allergies_text} onChange={(e) => setF({ ...f, allergies_text: e.target.value })} placeholder="peanuts, shellfish" className={inputCls(isDark)} data-testid="family-allergies" /></Field>
          <Field label="Dietary (vegetarian, vegan, kosher…)" isDark={isDark}><Input value={f.dietary_text} onChange={(e) => setF({ ...f, dietary_text: e.target.value })} placeholder="vegetarian" className={inputCls(isDark)} /></Field>
          <Field label="Favorite dishes" isDark={isDark}><Input value={f.loved_text} onChange={(e) => setF({ ...f, loved_text: e.target.value })} placeholder="pad thai, ramen" className={inputCls(isDark)} /></Field>
          <Field label="Nope-list" isDark={isDark}><Input value={f.hated_text} onChange={(e) => setF({ ...f, hated_text: e.target.value })} placeholder="olives, cilantro" className={inputCls(isDark)} /></Field>
          <Field label="Notes" isDark={isDark}><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} /></Field>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={!canSave} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="family-editor-save">{isEdit ? "Save" : "Add"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
