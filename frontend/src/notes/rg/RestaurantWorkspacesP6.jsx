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
      });
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

  const reset = async () => {
    setMessages([]);
    await RestaurantsService.clearChatHistory();
    toast.success("Chat cleared");
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
            <button type="button" onClick={reset} className={`ml-auto text-[10px] font-normal flex items-center gap-1 ${isDark ? "text-slate-500 hover:text-white" : "text-gray-500 hover:text-gray-900"}`} data-testid="assistant-reset">
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Ask anything about your dining. Powered by Claude Sonnet — history is saved locally on this device only.
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
                          <button type="button" onClick={() => handleCook(rec.id)} title="Cook this again" className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10" : "text-amber-600 hover:text-amber-700 hover:bg-amber-50"}`} aria-label="Log cook recipe" data-testid={`recipe-cook-${rec.id}`}><Flame className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setEditing(rec)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`} aria-label="Edit recipe" data-testid={`recipe-edit-${rec.id}`}><Edit3 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => handleDelete(rec.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`} aria-label="Delete recipe" data-testid={`recipe-delete-${rec.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
    </>
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
