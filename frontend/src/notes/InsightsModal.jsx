import React, { useMemo } from "react";
import { format, subDays, startOfDay, isSameDay } from "date-fns";
import {
  BarChart3, Flame, Pin, Archive, Trash2, Bell, CheckSquare, Calendar,
  TrendingUp, Hash, Tag as TagIcon, ListChecks, Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NOTE_COLORS } from "./constants";

/**
 * Insights dashboard modal — computes and renders every stat purely from
 * the in-memory notes array (offline-first). No network calls.
 */
export default function InsightsModal({ isOpen, onClose, notes, isDark }) {
  const [trips, setTrips] = React.useState([]);
  React.useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try {
        const settings = await (await import("../storage/storageService")).default.getSettings();
        setTrips(Array.isArray(settings?.grocery_trips) ? settings.grocery_trips : []);
      } catch { /* ignore */ }
    })();
  }, [isOpen]);
  const stats = useMemo(() => {
    const now = new Date();
    const startToday = startOfDay(now);

    const active = notes.filter(n => !n.archived_at && !n.deleted_at);
    const archived = notes.filter(n => n.archived_at);
    const trashed = notes.filter(n => n.deleted_at);
    const pinned = active.filter(n => n.pinned);
    const withAlarm = active.filter(n => n.alarm?.enabled);
    const recurring = active.filter(n => n.recurring?.enabled);

    // Checklist completion
    let totalItems = 0;
    let doneItems = 0;
    for (const n of active) {
      const list = Array.isArray(n.checklist) ? n.checklist : [];
      totalItems += list.length;
      doneItems += list.filter(i => i.done).length;
    }
    const completionPct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

    // Last 7 days activity (creates + edits)
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = subDays(startToday, i);
      const created = active.filter(n => n.created_at && isSameDay(new Date(n.created_at), d)).length;
      const edited = active.filter(n => n.updated_at && !isSameDay(new Date(n.updated_at), new Date(n.created_at)) && isSameDay(new Date(n.updated_at), d)).length;
      days.push({ date: d, created, edited, total: created + edited });
    }
    const maxDay = Math.max(1, ...days.map(d => d.total));

    // Streak — consecutive days (ending today or yesterday) with any activity
    let streak = 0;
    const daySet = new Set();
    for (const n of notes) {
      if (n.created_at) daySet.add(startOfDay(new Date(n.created_at)).toISOString());
      if (n.updated_at) daySet.add(startOfDay(new Date(n.updated_at)).toISOString());
    }
    let cursor = startToday;
    // Allow starting from yesterday if today has no activity yet
    if (!daySet.has(cursor.toISOString())) {
      cursor = subDays(cursor, 1);
    }
    while (daySet.has(cursor.toISOString())) {
      streak++;
      cursor = subDays(cursor, 1);
      if (streak > 365) break;
    }

    // Category breakdown
    const catMap = new Map();
    for (const n of active) {
      const c = (n.category || "Uncategorized").trim() || "Uncategorized";
      catMap.set(c, (catMap.get(c) || 0) + 1);
    }
    const categories = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const catMax = Math.max(1, ...categories.map(([, v]) => v));

    // Top tags
    const tagMap = new Map();
    for (const n of active) {
      const tags = Array.isArray(n.tags) ? n.tags : [];
      for (const raw of tags) {
        const t = String(raw || "").trim().toLowerCase();
        if (!t) continue;
        tagMap.set(t, (tagMap.get(t) || 0) + 1);
      }
    }
    const tags = Array.from(tagMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Color distribution
    const colorMap = new Map();
    for (const n of active) {
      const c = n.color || "purple";
      colorMap.set(c, (colorMap.get(c) || 0) + 1);
    }
    const colors = Array.from(colorMap.entries()).sort((a, b) => b[1] - a[1]);

    return {
      total: active.length,
      archived: archived.length,
      trashed: trashed.length,
      pinned: pinned.length,
      withAlarm: withAlarm.length,
      recurring: recurring.length,
      totalItems, doneItems, completionPct,
      days, maxDay,
      streak,
      categories, catMax,
      tags,
      colors,
    };
  }, [notes]);

  const cardCls = isDark
    ? "rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
    : "rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm";
  const labelCls = `text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`;
  const valueCls = `text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-2xl max-h-[88vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
        data-testid="insights-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <BarChart3 className="w-5 h-5 text-indigo-400" /> Insights
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Your activity across every note, checklist and reminder — 100% offline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Top row — 4 KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className={cardCls} data-testid="stat-total">
              <div className={labelCls}>Active notes</div>
              <div className={valueCls}>{stats.total}</div>
              <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"} mt-1 flex items-center gap-1`}>
                <Pin className="w-3 h-3" /> {stats.pinned} pinned
              </div>
            </div>

            <div className={cardCls} data-testid="stat-streak">
              <div className={labelCls}>Streak</div>
              <div className={`${valueCls} flex items-baseline gap-1`}>
                {stats.streak}
                <Flame className={`w-5 h-5 ${stats.streak > 0 ? "text-orange-500" : isDark ? "text-slate-600" : "text-gray-300"}`} />
              </div>
              <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"} mt-1`}>
                {stats.streak === 0 ? "Start today!" : `${stats.streak === 1 ? "day" : "days"} in a row`}
              </div>
            </div>

            <div className={cardCls} data-testid="stat-completion">
              <div className={labelCls}>Checklist done</div>
              <div className={valueCls}>{stats.completionPct}%</div>
              <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"} mt-1 flex items-center gap-1`}>
                <ListChecks className="w-3 h-3" /> {stats.doneItems}/{stats.totalItems} items
              </div>
              <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all"
                  style={{ width: `${stats.completionPct}%` }}
                />
              </div>
            </div>

            <div className={cardCls} data-testid="stat-reminders">
              <div className={labelCls}>Active reminders</div>
              <div className={valueCls}>{stats.withAlarm}</div>
              <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"} mt-1 flex items-center gap-1`}>
                <Bell className="w-3 h-3" /> {stats.recurring} recurring
              </div>
            </div>
          </div>

          {/* Weekly activity bar chart */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"} font-medium text-sm`}>
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Last 7 days
              </div>
              <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                {stats.days.reduce((a, d) => a + d.total, 0)} total actions
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-24" data-testid="weekly-chart">
              {stats.days.map((d, i) => {
                const pct = (d.total / stats.maxDay) * 100;
                const isToday = i === stats.days.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                    <div className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-gray-500"} h-3`}>
                      {d.total > 0 ? d.total : ""}
                    </div>
                    <div className={`w-full rounded-t-md relative overflow-hidden flex flex-col-reverse ${isDark ? "bg-white/5" : "bg-gray-100"}`} style={{ height: "60px" }}>
                      <div
                        className={`w-full transition-all ${
                          d.total === 0
                            ? ""
                            : isToday
                            ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                            : "bg-gradient-to-t from-indigo-500/60 to-indigo-400/40"
                        }`}
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                    <div className={`text-[10px] font-medium ${isToday ? (isDark ? "text-indigo-400" : "text-indigo-600") : isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {format(d.date, "EEE")}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two-column: Categories + Tags */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className={cardCls}>
              <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                <Sparkles className="w-4 h-4 text-fuchsia-400" /> Top categories
              </div>
              {stats.categories.length === 0 ? (
                <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>No categories yet.</div>
              ) : (
                <div className="space-y-2" data-testid="category-breakdown">
                  {stats.categories.map(([cat, count]) => {
                    const pct = (count / stats.catMax) * 100;
                    return (
                      <div key={cat} className="flex items-center gap-2">
                        <div className={`text-xs truncate w-24 ${isDark ? "text-slate-300" : "text-gray-700"}`}>{cat}</div>
                        <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                          <div className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-400" style={{ width: `${pct}%` }} />
                        </div>
                        <div className={`text-xs font-mono w-6 text-right ${isDark ? "text-slate-400" : "text-gray-600"}`}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={cardCls}>
              <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                <TagIcon className="w-4 h-4 text-emerald-400" /> Top tags
              </div>
              {stats.tags.length === 0 ? (
                <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Add tags to a note to see them here.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5" data-testid="top-tags">
                  {stats.tags.map(([tag, count]) => (
                    <span
                      key={tag}
                      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        isDark ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <Hash className="w-3 h-3" /> {tag}
                      <span className={`text-[10px] font-mono ${isDark ? "text-emerald-500/70" : "text-emerald-600/70"}`}>
                        {count}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Color distribution + lifecycle */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <div className={cardCls}>
              <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-pink-500 via-indigo-500 to-cyan-400" /> Palette
              </div>
              <div className="flex h-8 rounded-lg overflow-hidden" data-testid="color-distribution">
                {stats.colors.length === 0 ? (
                  <div className={`text-xs w-full flex items-center justify-center ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    No notes yet
                  </div>
                ) : (
                  stats.colors.map(([color, count]) => {
                    const cfg = NOTE_COLORS.find(c => c.name === color) || NOTE_COLORS[0];
                    const pct = (count / stats.total) * 100;
                    return (
                      <div
                        key={color}
                        title={`${cfg.label}: ${count} (${Math.round(pct)}%)`}
                        style={{
                          background: cfg.gradient || cfg.accent,
                          width: `${pct}%`,
                        }}
                      />
                    );
                  })
                )}
              </div>
              <div className={`text-[11px] mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                {stats.colors.length} color{stats.colors.length === 1 ? "" : "s"} in use
              </div>
            </div>

            <div className={cardCls}>
              <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                <Archive className="w-4 h-4 text-amber-400" /> Lifecycle
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{stats.total}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-500"}`}>Active</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${isDark ? "text-amber-300" : "text-amber-600"}`}>{stats.archived}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-500"}`}>Archived</div>
                </div>
                <div>
                  <div className={`text-lg font-bold ${isDark ? "text-red-300" : "text-red-600"}`}>{stats.trashed}</div>
                  <div className={`text-[10px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-500"}`}>Trash</div>
                </div>
              </div>
            </div>
          </div>

          {/* Grocery trip history — appears once the user has logged at least one trip via Shopping Mode */}
          {trips.length > 0 && (() => {
            const now = new Date();
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthTrips = trips.filter(t => new Date(t.date) >= monthStart);
            const monthSpend = monthTrips.reduce((s, t) => s + (Number(t.total_spent) || 0), 0);
            const monthItems = monthTrips.reduce((s, t) => s + (Number(t.item_count) || 0), 0);
            const avg = trips.length > 0 ? trips.reduce((s, t) => s + (Number(t.total_spent) || 0), 0) / trips.length : 0;
            const biggest = trips.reduce((m, t) => Math.max(m, Number(t.total_spent) || 0), 0);
            return (
              <div className={cardCls} data-testid="grocery-trip-card">
                <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                  <div className="w-4 h-4 rounded bg-gradient-to-br from-emerald-500 to-teal-400" /> Grocery trips
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <div><div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{monthTrips.length}</div><div className={labelCls}>this month</div></div>
                  <div><div className={`text-lg font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${monthSpend.toFixed(2)}</div><div className={labelCls}>month spend</div></div>
                  <div><div className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{monthItems}</div><div className={labelCls}>items bought</div></div>
                  <div><div className={`text-lg font-bold ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>${avg.toFixed(2)}</div><div className={labelCls}>avg trip</div></div>
                </div>
                <div className={`text-[11px] mt-2 text-right ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Biggest trip so far: <b className={isDark ? "text-emerald-300" : "text-emerald-700"}>${biggest.toFixed(2)}</b> · {trips.length} trips lifetime
                </div>
              </div>
            );
          })()}
        </div>
      </DialogContent>
    </Dialog>
  );
}
