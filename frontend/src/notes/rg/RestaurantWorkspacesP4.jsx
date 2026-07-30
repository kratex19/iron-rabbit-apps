// Restaurants Galore™ — Phase 4 workspace modals.
//   • RestaurantVoiceJournalModal — record + transcribe visits (browser SpeechRecognition)
//   • RestaurantSearchModal       — cross-store full-text search
//   • RestaurantBeveragesModal    — beverage-only view of menus
//   • RestaurantDessertsModal     — dessert-only view of menus
//   • RestaurantAIInsightsModal   — /api/dining_insights (opt-in AI)

import React, { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  Mic, MicOff, Play, Search, Coffee, Cookie, Sparkles, Plus, Trash2,
  Loader2, MessageCircle, Store, Ticket, Star, Utensils, ChefHat, Receipt,
  ClipboardList, Users, Camera,
} from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import RestaurantsService from "../../storage/restaurantsService";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Field = ({ label, children, isDark }) => (
  <div>
    <label className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);
const inputCls = (isDark) => `h-9 ${isDark ? "bg-white/5 border-white/10 text-white placeholder:text-slate-500" : ""}`;
const selectCls = (isDark) => `h-9 w-full rounded-md border px-2 text-sm ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`;

// =========================================================================
// VOICE JOURNAL
// =========================================================================
export function RestaurantVoiceJournalModal({ isOpen, onClose, isDark }) {
  const [restaurants, setRestaurants] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedR, setSelectedR] = useState("");
  const [pendingR, setPendingR] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const recognitionRef = useRef(null);
  const startTimeRef = useRef(null);

  const reload = async () => {
    setLoading(true);
    const [rs, ve] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listVoiceJournal()]);
    setRestaurants(rs); setEntries(ve); setLoading(false);
  };
  useEffect(() => { if (isOpen) reload(); }, [isOpen]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (event) => {
      let finalT = "";
      let interT = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalT += t + " ";
        else interT += t;
      }
      if (finalT) setTranscript(prev => (prev + finalT).replace(/\s+/g, " ").trim() + " ");
      setInterim(interT);
    };
    rec.onerror = (e) => {
      console.warn("SpeechRecognition error", e.error);
      if (e.error === "not-allowed") toast.error("Microphone permission denied");
      setRecording(false);
    };
    rec.onend = () => {
      setInterim("");
    };
    recognitionRef.current = rec;
    return () => { try { rec.stop(); } catch (_e) { /* ignore */ } };
  }, []);

  const startRec = () => {
    if (!recognitionRef.current) return;
    setTranscript(""); setInterim("");
    startTimeRef.current = Date.now();
    try {
      recognitionRef.current.start();
      setRecording(true);
    } catch (e) {
      // Chrome throws if already started
      toast.error("Could not start microphone");
    }
  };
  const stopRec = () => {
    try { recognitionRef.current?.stop(); } catch (_e) { /* ignore */ }
    setRecording(false);
  };
  const saveEntry = async () => {
    const finalT = (transcript + " " + interim).trim();
    if (!finalT) { toast.error("Nothing recorded"); return; }
    const target = pendingR || selectedR || restaurants[0]?.id || "";
    await RestaurantsService.saveVoiceJournalEntry({
      restaurant_id: target,
      transcript: finalT,
      duration_ms: startTimeRef.current ? Date.now() - startTimeRef.current : 0,
    });
    setTranscript(""); setInterim(""); setPendingR("");
    reload();
    toast.success("Voice entry saved");
  };
  const handleDelete = async (id) => {
    await RestaurantsService.deleteVoiceJournalEntry(id);
    setEntries(entries.filter(e => e.id !== id));
    toast.success("Removed");
  };

  const filtered = useMemo(() => entries.filter(e => !selectedR || e.restaurant_id === selectedR), [entries, selectedR]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="voice-journal-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Mic className="w-5 h-5 text-amber-400" /> Voice Journal</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Talk about the visit — transcribed & saved on your device.</DialogDescription>
        </DialogHeader>

        {!supported && (
          <div className={`rounded-lg p-3 text-xs ${isDark ? "bg-amber-500/10 text-amber-300 border border-amber-500/20" : "bg-amber-50 text-amber-800 border border-amber-200"}`}>
            SpeechRecognition isn&apos;t available in this browser. Try Chrome, Edge, or Safari.
          </div>
        )}

        <div className={`rounded-xl p-3 border space-y-2 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200 shadow-sm"}`}>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={pendingR} onChange={(e) => setPendingR(e.target.value)} className={selectCls(isDark) + " flex-1 min-w-[150px]"} disabled={recording} data-testid="voice-restaurant-select">
              <option value="">Assign to restaurant…</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            {!recording ? (
              <Button onClick={startRec} disabled={!supported || restaurants.length === 0} className="h-9 bg-red-500 hover:bg-red-600 text-white" data-testid="voice-record-btn">
                <Mic className="w-4 h-4 mr-1" /> Record
              </Button>
            ) : (
              <Button onClick={stopRec} className="h-9 bg-slate-600 hover:bg-slate-700 text-white" data-testid="voice-stop-btn">
                <MicOff className="w-4 h-4 mr-1" /> Stop
              </Button>
            )}
            <Button onClick={saveEntry} disabled={!transcript.trim() && !interim.trim()} className="h-9 bg-amber-500 hover:bg-amber-600 text-white" data-testid="voice-save-btn">
              Save entry
            </Button>
          </div>
          {(recording || transcript || interim) && (
            <div className={`min-h-[80px] max-h-[200px] overflow-y-auto rounded-md p-2 text-sm ${isDark ? "bg-white/5 border border-white/10 text-slate-200" : "bg-gray-100 border border-gray-200 text-gray-800"}`} data-testid="voice-transcript">
              {transcript}
              <span className={isDark ? "text-slate-500 italic" : "text-gray-400 italic"}>{interim}</span>
              {recording && <span className="ml-1 inline-block w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            </div>
          )}
        </div>

        {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <select value={selectedR} onChange={(e) => setSelectedR(e.target.value)} className={selectCls(isDark) + " w-auto"} data-testid="voice-filter-restaurant">
                <option value="">All restaurants</option>
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>{filtered.length} entries</div>
            </div>
            {filtered.length === 0 ? (
              <div className={`text-center py-8 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No voice entries yet.</div>
            ) : (
              <div className="space-y-1.5" data-testid="voice-list">
                {filtered.map(v => {
                  const r = restaurants.find(x => x.id === v.restaurant_id);
                  const dur = v.duration_ms ? `${Math.round(v.duration_ms / 1000)}s` : "";
                  return (
                    <div key={v.id} className={`rounded-lg border p-2.5 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid={`voice-row-${v.id}`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`text-[10px] flex items-center gap-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                            <Play className="w-2.5 h-2.5" />{r?.name || "Unknown"} · {format(new Date(v.taken_at), "MMM d, h:mma")} {dur && `· ${dur}`}
                          </div>
                          <div className={`text-sm mt-1 ${isDark ? "text-slate-200" : "text-gray-800"}`}>{v.transcript}</div>
                        </div>
                        <button type="button" onClick={() => handleDelete(v.id)} className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}><Trash2 className="w-3.5 h-3.5" /></button>
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
  );
}

// =========================================================================
// SEARCH ALL
// =========================================================================
export function RestaurantSearchModal({ isOpen, onClose, isDark }) {
  const [q, setQ] = useState("");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const all = await RestaurantsService.exportAll();
      setData(all);
      setLoading(false);
    })();
  }, [isOpen]);

  const results = useMemo(() => {
    if (!q.trim()) return null;
    const term = q.trim().toLowerCase();
    const match = (s) => (s || "").toString().toLowerCase().includes(term);

    return {
      restaurants: (data.restaurants || []).filter(r => match(r.name) || match(r.nickname) || match(r.category) || match(r.cuisine) || match(r.notes) || match(r.address)),
      menus: (data.menus || []).filter(m => match(m.name) || match(m.description) || match(m.category)),
      favorite_meals: (data.favorite_meals || []).filter(m => match(m.meal_name) || match(m.custom_requests) || match(m.sauces) || match(m.side) || match(m.drink) || match(m.dessert)),
      orders: (data.orders || []).filter(o => match(o.notes) || match(o.who_paid) || (o.items || []).some(it => match(it.name))),
      reviews: (data.reviews || []).filter(r => match(r.comment)),
      coupons: (data.coupons || []).filter(c => match(c.code) || match(c.description)),
      staff: (data.staff || []).filter(s => match(s.name) || match(s.role) || match(s.notes)),
      wishlist: (data.wishlist || []).filter(w => match(w.name) || match(w.cuisine) || match(w.location) || match(w.notes)),
      voice_journal: (data.voice_journal || []).filter(v => match(v.transcript)),
    };
  }, [q, data]);

  const total = results ? Object.values(results).reduce((s, arr) => s + arr.length, 0) : 0;
  const restById = useMemo(() => new Map((data.restaurants || []).map(r => [r.id, r])), [data]);

  const section = (label, Icon, arr, renderRow) => arr.length > 0 && (
    <div>
      <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 flex items-center gap-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        <Icon className="w-3 h-3" /> {label} ({arr.length})
      </div>
      <div className="space-y-1">{arr.slice(0, 20).map(renderRow)}</div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="search-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Search className="w-5 h-5 text-amber-400" /> Search All</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Search across every restaurant, menu item, order, review, coupon, staff, wish, and voice entry.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" className={inputCls(isDark) + " h-10 text-base"} autoFocus data-testid="search-input" />
          {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : !results ? (
            <div className={`text-center py-16 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              <Search className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
              <div className="text-sm">Start typing to search everything.</div>
            </div>
          ) : total === 0 ? (
            <div className={`text-center py-10 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>No matches for &ldquo;{q}&rdquo;.</div>
          ) : (
            <div className="space-y-3" data-testid="search-results">
              <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{total} matches</div>
              {section("Restaurants", Store, results.restaurants, r => (
                <div key={r.id} className={`text-sm p-1.5 rounded ${isDark ? "bg-white/[0.02] text-white" : "bg-white text-gray-900"}`}>{r.name} <span className="text-[10px] text-slate-500">· {r.cuisine || r.category}</span></div>
              ))}
              {section("Menu items", Utensils, results.menus, m => {
                const r = restById.get(m.restaurant_id);
                return <div key={m.id} className={`text-sm p-1.5 rounded ${isDark ? "bg-white/[0.02] text-white" : "bg-white text-gray-900"}`}>{m.name} <span className="text-[10px] text-slate-500">${Number(m.price || 0).toFixed(2)} · {r?.name}</span></div>;
              })}
              {section("Favorite meals", ChefHat, results.favorite_meals, m => {
                const r = restById.get(m.restaurant_id);
                return <div key={m.id} className={`text-sm p-1.5 rounded ${isDark ? "bg-white/[0.02] text-white" : "bg-white text-gray-900"}`}>{m.meal_name} <span className="text-[10px] text-slate-500">@ {r?.name}</span></div>;
              })}
              {section("Orders", Receipt, results.orders, o => {
                const r = restById.get(o.restaurant_id);
                return <div key={o.id} className={`text-sm p-1.5 rounded ${isDark ? "bg-white/[0.02] text-white" : "bg-white text-gray-900"}`}>{r?.name || "Unknown"} <span className="text-[10px] text-slate-500">${Number(o.total || 0).toFixed(2)} · {o.date ? format(new Date(o.date), "MMM d") : ""}</span></div>;
              })}
              {section("Reviews", Star, results.reviews, r => {
                const rest = restById.get(r.restaurant_id);
                return <div key={r.id} className={`text-sm p-1.5 rounded italic ${isDark ? "bg-white/[0.02] text-slate-300" : "bg-white text-gray-700"}`}>&ldquo;{(r.comment || "").slice(0, 100)}&rdquo; <span className="text-[10px] text-slate-500 not-italic">— {rest?.name}</span></div>;
              })}
              {section("Coupons", Ticket, results.coupons, c => (
                <div key={c.id} className={`text-sm p-1.5 rounded font-mono ${isDark ? "bg-white/[0.02] text-white" : "bg-white text-gray-900"}`}>{c.code || c.description} <span className="text-[10px] text-slate-500">{c.discount}</span></div>
              ))}
              {section("Staff", Users, results.staff, s => {
                const rest = restById.get(s.restaurant_id);
                return <div key={s.id} className={`text-sm p-1.5 rounded ${isDark ? "bg-white/[0.02] text-white" : "bg-white text-gray-900"}`}>{s.name} <span className="text-[10px] text-slate-500">{s.role} @ {rest?.name}</span></div>;
              })}
              {section("Wish list", ClipboardList, results.wishlist, w => (
                <div key={w.id} className={`text-sm p-1.5 rounded ${isDark ? "bg-white/[0.02] text-white" : "bg-white text-gray-900"}`}>{w.name} <span className="text-[10px] text-slate-500">{w.cuisine} · {w.location}</span></div>
              ))}
              {section("Voice entries", Mic, results.voice_journal, v => {
                const rest = restById.get(v.restaurant_id);
                return <div key={v.id} className={`text-sm p-1.5 rounded ${isDark ? "bg-white/[0.02] text-slate-300" : "bg-white text-gray-700"}`}>{(v.transcript || "").slice(0, 100)}&hellip; <span className="text-[10px] text-slate-500">— {rest?.name}</span></div>;
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// BEVERAGES / DESSERTS (category-filtered menus)
// =========================================================================
function CategoryMenuModal({ isOpen, onClose, isDark, category, IconComp, title, accent, testid }) {
  const [restaurants, setRestaurants] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const [rs, all] = await Promise.all([RestaurantsService.listRestaurants(), RestaurantsService.listMenuItems()]);
      setRestaurants(rs);
      setItems(all.filter(m => (m.category || "").toLowerCase() === category.toLowerCase()));
      setLoading(false);
    })();
  }, [isOpen, category]);

  const grouped = useMemo(() => {
    const g = new Map();
    for (const it of items) {
      const rid = it.restaurant_id;
      if (!g.has(rid)) g.set(rid, []);
      g.get(rid).push(it);
    }
    return Array.from(g.entries());
  }, [items]);

  const stats = useMemo(() => {
    if (!items.length) return null;
    const prices = items.map(i => Number(i.price) || 0).filter(v => v > 0);
    return {
      count: items.length,
      avg: prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      max: Math.max(0, ...prices),
      min: prices.length ? Math.min(...prices) : 0,
    };
  }, [items]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid={testid}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><IconComp className={`w-5 h-5 ${accent}`} /> {title}</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Every {category.toLowerCase()} across every restaurant — instantly comparable.</DialogDescription>
        </DialogHeader>
        {loading ? <div className="py-10 text-center text-sm text-slate-400">Loading…</div> : items.length === 0 ? (
          <div className={`py-12 text-center ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            <IconComp className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
            <div className="text-sm">No {category.toLowerCase()} yet.</div>
            <div className="text-xs mt-1">Add menu items with category &ldquo;{category}&rdquo; to see them here.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {stats && (
              <div className="grid grid-cols-4 gap-2">
                <div className={`rounded-lg border p-2 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"}`}><div className={`text-[10px] uppercase font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Total</div><div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.count}</div></div>
                <div className={`rounded-lg border p-2 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"}`}><div className={`text-[10px] uppercase font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Avg</div><div className={`text-lg font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${stats.avg.toFixed(2)}</div></div>
                <div className={`rounded-lg border p-2 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"}`}><div className={`text-[10px] uppercase font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Cheapest</div><div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>${stats.min.toFixed(2)}</div></div>
                <div className={`rounded-lg border p-2 ${isDark ? "bg-white/[0.03] border-white/10" : "bg-white border-gray-200"}`}><div className={`text-[10px] uppercase font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>Priciest</div><div className={`text-lg font-bold ${isDark ? "text-amber-300" : "text-amber-700"}`}>${stats.max.toFixed(2)}</div></div>
              </div>
            )}
            <div className="space-y-2">
              {grouped.map(([restId, arr]) => {
                const r = restaurants.find(x => x.id === restId);
                return (
                  <div key={restId}>
                    <div className={`text-[10px] uppercase tracking-wider font-semibold mb-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>{r?.name || "Unknown"}</div>
                    <div className="space-y-1">
                      {arr.sort((a, b) => Number(a.price) - Number(b.price)).map(it => (
                        <div key={it.id} className={`flex items-center gap-2 rounded-lg border p-2 ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`}>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${isDark ? "text-white" : "text-gray-900"}`}>{it.name}</div>
                            {it.description && <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{it.description}</div>}
                          </div>
                          <div className={`text-sm font-mono font-semibold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${Number(it.price || 0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RestaurantBeveragesModal(props) {
  return <CategoryMenuModal {...props} category="Drinks" IconComp={Coffee} title="Beverage Center" accent="text-sky-400" testid="beverages-modal" />;
}
export function RestaurantDessertsModal(props) {
  return <CategoryMenuModal {...props} category="Desserts" IconComp={Cookie} title="Dessert Center" accent="text-pink-400" testid="desserts-modal" />;
}

// =========================================================================
// AI INSIGHTS (opt-in Emergent LLM)
// =========================================================================
export function RestaurantAIInsightsModal({ isOpen, onClose, isDark }) {
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setStatsLoading(true);
      const [dash, exportAll] = await Promise.all([
        RestaurantsService.computeDashboardStats(),
        RestaurantsService.exportAll(),
      ]);
      // Redact heavy fields (photos, addresses) before sending to model
      const light = {
        summary: dash,
        restaurants_count: exportAll.restaurants.length,
        recent_orders: exportAll.orders.slice(-30).map(o => ({
          date: o.date, total: o.total, tip: o.tip, item_count: (o.items || []).length,
          restaurant_id: o.restaurant_id,
        })),
        top_restaurants: exportAll.restaurants
          .filter(r => !r.archived)
          .map(r => ({ id: r.id, name: r.name, cuisine: r.cuisine, favorite: r.favorite }))
          .slice(0, 30),
        review_averages: (exportAll.reviews || []).slice(-30).map(r => {
          const vals = Object.values(r.ratings || {}).filter(v => v > 0);
          return { restaurant_id: r.restaurant_id, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 };
        }),
      };
      setStats(light);
      setStatsLoading(false);
    })();
  }, [isOpen]);

  const askAI = async () => {
    if (!stats) return;
    setLoading(true); setInsights("");
    try {
      const res = await axios.post(`${API}/dining_insights`, {
        stats,
        question: question.trim() || null,
      }, { timeout: 45000 });
      setInsights(res.data.insights || "No insights returned.");
    } catch (e) {
      const msg = e?.response?.data?.detail || e?.message || "Insights failed";
      toast.error(msg);
      setInsights(`Error: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-2xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="ai-insights-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><Sparkles className="w-5 h-5 text-amber-400" /> AI Insights</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Opt-in AI analysis of your dining patterns. Nothing is stored on the server.</DialogDescription>
        </DialogHeader>
        {statsLoading ? <div className="py-8 text-center text-sm text-slate-400">Preparing your data…</div> : (
          <div className="space-y-3">
            <div className={`rounded-lg p-3 border text-xs space-y-1 ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white shadow-sm"}`}>
              <div className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Snapshot ready</div>
              <div className={isDark ? "text-slate-400" : "text-gray-600"}>
                {stats?.summary?.total_restaurants || 0} restaurants · {stats?.summary?.total_orders || 0} orders · ${(stats?.summary?.yearly_spend || 0).toFixed(2)} this year
              </div>
            </div>
            <Field label="Ask anything about your dining (optional)" isDark={isDark}>
              <Textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. Which restaurant is the best value? Am I spending too much on delivery?" rows={2} className={isDark ? "bg-white/5 border-white/10 text-white" : ""} data-testid="ai-question" />
            </Field>
            <Button onClick={askAI} disabled={loading || !stats} className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white" data-testid="ai-run-btn">
              {loading ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Analyzing…</> : <><Sparkles className="w-4 h-4 mr-1" /> Generate insights</>}
            </Button>
            {insights && (
              <div className={`rounded-lg p-3 border text-sm whitespace-pre-wrap ${isDark ? "border-amber-500/20 bg-amber-500/[0.05] text-slate-200" : "border-amber-200 bg-amber-50 text-gray-800"}`} data-testid="ai-insights-output">
                {insights}
              </div>
            )}
            <div className={`text-[10px] italic ${isDark ? "text-slate-600" : "text-gray-400"}`}>
              <MessageCircle className="w-2.5 h-2.5 inline mr-1" />
              Powered by Claude Sonnet. Data is sent only when you tap &ldquo;Generate&rdquo;.
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
