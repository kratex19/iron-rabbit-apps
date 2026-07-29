import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Receipt, Calendar, DollarSign, TrendingUp, Trash2, ChevronDown, ChevronRight,
  ShoppingBag, Store, X, Clock,
} from "lucide-react";
import { format, parseISO, startOfWeek, startOfMonth, subMonths, isSameMonth } from "date-fns";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StorageService from "../storage/storageService";
import { bestDayToBuy, itemPriceSeries } from "../utils/priceHistory";

/**
 * Trip Journal — full history of grocery shopping trips.
 *
 * Reads `settings.grocery_trips[]` written by ShoppingModeModal when the user
 * closes the shopping-mode sheet after checking off items. Displays a monthly
 * spend line chart, department breakdown, and an expandable list of trips
 * with per-item breakdown + delete.
 */
export default function TripJournalModal({ isOpen, onClose, isDark }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(null);
  // Per-item deep analytics (best-day + sparkline) for top 6 most-bought items.
  const [analytics, setAnalytics] = useState({}); // { itemText → { best, series } }

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      setLoading(true);
      const list = await StorageService.getGroceryTrips();
      // newest first
      setTrips([...list].sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    })();
  }, [isOpen]);

  const toggleExpand = (id) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const stats = useMemo(() => {
    if (trips.length === 0) return null;
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthTrips = trips.filter(t => new Date(t.date) >= monthStart);
    const monthSpend = monthTrips.reduce((s, t) => s + (Number(t.total_spent) || 0), 0);
    const monthItems = monthTrips.reduce((s, t) => s + (Number(t.item_count) || 0), 0);
    const total = trips.reduce((s, t) => s + (Number(t.total_spent) || 0), 0);
    const avg = trips.length > 0 ? total / trips.length : 0;
    const biggest = trips.reduce((m, t) => Math.max(m, Number(t.total_spent) || 0), 0);

    // 6-month trend
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const inMonth = trips.filter(t => isSameMonth(new Date(t.date), d));
      months.push({
        label: format(d, "MMM"),
        spend: Number(inMonth.reduce((s, t) => s + (Number(t.total_spent) || 0), 0).toFixed(2)),
        trips: inMonth.length,
      });
    }

    // Department breakdown (from items[].dept)
    const deptMap = new Map();
    for (const t of trips) {
      for (const it of (t.items || [])) {
        const k = it.dept || "Other";
        deptMap.set(k, (deptMap.get(k) || 0) + (Number(it.price) || 0));
      }
    }
    const departments = Array.from(deptMap.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const deptMax = Math.max(1, ...departments.map(([, v]) => v));

    // Top items
    const itemMap = new Map();
    for (const t of trips) {
      for (const it of (t.items || [])) {
        const k = (it.text || "").toLowerCase().trim();
        if (!k) continue;
        const cur = itemMap.get(k) || { text: it.text, count: 0, spend: 0 };
        cur.count += 1;
        cur.spend += Number(it.price) || 0;
        itemMap.set(k, cur);
      }
    }
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { monthTrips: monthTrips.length, monthSpend, monthItems, total, avg, biggest, months, departments, deptMax, topItems };
  }, [trips]);

  // Load best-day + price series for the top 6 items whenever the item ranking changes.
  useEffect(() => {
    if (!stats?.topItems?.length) return;
    let cancelled = false;
    (async () => {
      const target = stats.topItems.slice(0, 6);
      const map = {};
      for (const it of target) {
        // eslint-disable-next-line no-await-in-loop
        const [best, series] = await Promise.all([
          bestDayToBuy(it.text, 30),
          itemPriceSeries(it.text, 30),
        ]);
        map[it.text] = { best, series };
      }
      if (!cancelled) setAnalytics(map);
    })();
    return () => { cancelled = true; };
  }, [stats?.topItems]);

  const handleDelete = async (id) => {
    await StorageService.deleteGroceryTrip(id);
    setTrips(trips.filter(t => t.id !== id));
    toast.success("Trip removed");
    setConfirmDelete(null);
  };

  const cardCls = isDark
    ? "rounded-xl border border-white/10 bg-white/[0.03] p-3.5"
    : "rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm";
  const labelCls = `text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`;
  const valueCls = `text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={`max-w-3xl max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`}
          data-testid="trip-journal-modal"
        >
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
              <Receipt className="w-5 h-5 text-emerald-400" /> Trip Journal
            </DialogTitle>
            <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
              Every grocery trip you&apos;ve logged via Shopping Mode — 100% offline.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className={`text-center py-16 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Loading trips…
            </div>
          ) : trips.length === 0 ? (
            <div className={`text-center py-16 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <ShoppingBag className={`w-12 h-12 mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
              <div className="font-medium mb-1">No trips yet</div>
              <div className="text-xs">Check items off in Shopping Mode and close it — a trip will be logged here.</div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              {/* KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className={cardCls} data-testid="trip-stat-month-spend">
                  <div className={labelCls}>This month</div>
                  <div className={`${valueCls} text-emerald-400`}>${stats.monthSpend.toFixed(2)}</div>
                  <div className={`text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    {stats.monthTrips} trips · {stats.monthItems} items
                  </div>
                </div>
                <div className={cardCls}>
                  <div className={labelCls}>Avg trip</div>
                  <div className={valueCls}>${stats.avg.toFixed(2)}</div>
                  <div className={`text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    across {trips.length} trips
                  </div>
                </div>
                <div className={cardCls}>
                  <div className={labelCls}>Biggest trip</div>
                  <div className={valueCls}>${stats.biggest.toFixed(2)}</div>
                  <div className={`text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>lifetime high</div>
                </div>
                <div className={cardCls}>
                  <div className={labelCls}>Total spend</div>
                  <div className={valueCls}>${stats.total.toFixed(2)}</div>
                  <div className={`text-[11px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>all trips</div>
                </div>
              </div>

              {/* 6-month trend chart */}
              <div className={cardCls}>
                <div className={`flex items-center gap-1.5 mb-2 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> 6-month spend trend
                </div>
                <div className="h-40" data-testid="trip-trend-chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.months} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1f2937" : "#e5e7eb"} />
                      <XAxis dataKey="label" tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 11 }} />
                      <YAxis tick={{ fill: isDark ? "#94a3b8" : "#6b7280", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: isDark ? "#0f172a" : "#fff",
                          border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(v) => [`$${v}`, "Spend"]}
                      />
                      <Bar dataKey="spend" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Department breakdown + top items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className={cardCls}>
                  <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    <Store className="w-4 h-4 text-teal-400" /> Top departments
                  </div>
                  {stats.departments.length === 0 ? (
                    <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                      Items with prices will show here.
                    </div>
                  ) : (
                    <div className="space-y-2" data-testid="trip-department-breakdown">
                      {stats.departments.map(([dept, total]) => {
                        const pct = (total / stats.deptMax) * 100;
                        return (
                          <div key={dept} className="flex items-center gap-2">
                            <div className={`text-xs truncate w-24 ${isDark ? "text-slate-300" : "text-gray-700"}`}>{dept}</div>
                            <div className={`flex-1 h-2 rounded-full overflow-hidden ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400" style={{ width: `${pct}%` }} />
                            </div>
                            <div className={`text-xs font-mono w-16 text-right ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                              ${total.toFixed(2)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className={cardCls}>
                  <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                    <ShoppingBag className="w-4 h-4 text-fuchsia-400" /> Most bought & best day to buy
                  </div>
                  {stats.topItems.length === 0 ? (
                    <div className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                      No items yet.
                    </div>
                  ) : (
                    <div className="space-y-2" data-testid="trip-top-items">
                      {stats.topItems.slice(0, 6).map(it => {
                        const a = analytics[it.text];
                        const best = a?.best;
                        const series = (a?.series || []).map((p, i) => ({ i, price: p.price }));
                        return (
                          <div
                            key={it.text}
                            className={`rounded-lg p-2 border ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"}`}
                            data-testid={`top-item-${it.text.toLowerCase().replace(/\s+/g, "-")}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex-1 min-w-0">
                                <div className={`text-xs font-medium truncate ${isDark ? "text-white" : "text-gray-900"}`}>
                                  {it.text}
                                </div>
                                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                  bought ×{it.count} · ${it.spend.toFixed(2)} total
                                </div>
                              </div>
                              {best ? (
                                <div
                                  className={`shrink-0 flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isDark ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                                  title={`Median $${best.median.toFixed(2)} on ${best.dayName}s vs $${best.worst_median.toFixed(2)} on ${best.worst_day}s — ${best.savings_pct.toFixed(0)}% savings across ${best.total_points} data points`}
                                  data-testid={`best-day-${it.text.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  Best: {best.dayName}s
                                  {best.savings_pct > 5 && <span className="opacity-70">· save {best.savings_pct.toFixed(0)}%</span>}
                                </div>
                              ) : (
                                <div className={`text-[10px] ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                                  {(a && a.series.length < 3) ? "Need more data" : "…"}
                                </div>
                              )}
                            </div>
                            {series.length >= 2 && (
                              <div className="h-8 mt-1" data-testid={`sparkline-${it.text.toLowerCase().replace(/\s+/g, "-")}`}>
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={series} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                                    <Tooltip
                                      cursor={{ stroke: isDark ? "#334155" : "#e5e7eb" }}
                                      contentStyle={{
                                        background: isDark ? "#0f172a" : "#fff",
                                        border: `1px solid ${isDark ? "#1e293b" : "#e5e7eb"}`,
                                        borderRadius: 6,
                                        fontSize: 11,
                                        padding: "2px 6px",
                                      }}
                                      formatter={(v) => [`$${Number(v).toFixed(2)}`, "price"]}
                                      labelFormatter={() => ""}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="price"
                                      stroke="#d946ef"
                                      strokeWidth={1.75}
                                      dot={false}
                                      isAnimationActive={false}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Trip list */}
              <div className={cardCls}>
                <div className={`flex items-center gap-1.5 mb-3 font-medium text-sm ${isDark ? "text-white" : "text-gray-900"}`}>
                  <Calendar className="w-4 h-4 text-indigo-400" /> All trips ({trips.length})
                </div>
                <div className="space-y-1.5" data-testid="trip-list">
                  {trips.map(t => {
                    const isOpen = expanded.has(t.id);
                    let d;
                    try { d = new Date(t.date); } catch { d = new Date(); }
                    return (
                      <div
                        key={t.id}
                        className={`rounded-lg border ${isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"}`}
                        data-testid={`trip-row-${t.id}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleExpand(t.id)}
                          className="w-full flex items-center gap-2 p-2.5 text-left"
                        >
                          {isOpen ? (
                            <ChevronDown className={`w-4 h-4 shrink-0 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                          ) : (
                            <ChevronRight className={`w-4 h-4 shrink-0 ${isDark ? "text-slate-400" : "text-gray-500"}`} />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {format(d, "EEE, MMM d, yyyy · h:mm a")}
                            </div>
                            <div className={`text-[11px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                              {t.item_count} item{t.item_count === 1 ? "" : "s"}
                              {t.notes ? ` · ${t.notes}` : ""}
                            </div>
                          </div>
                          <div className={`text-base font-mono font-semibold shrink-0 ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                            ${Number(t.total_spent || 0).toFixed(2)}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(t); }}
                            className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? "text-slate-500 hover:text-red-400 hover:bg-red-500/10" : "text-gray-400 hover:text-red-500 hover:bg-red-50"}`}
                            aria-label="Delete trip"
                            data-testid={`trip-delete-${t.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </button>
                        {isOpen && (
                          <div className={`border-t px-3 py-2 ${isDark ? "border-white/5" : "border-gray-100"}`} data-testid={`trip-detail-${t.id}`}>
                            {Array.isArray(t.items) && t.items.length > 0 ? (
                              <div className="space-y-1">
                                {t.items.map((it, i) => (
                                  <div
                                    key={i}
                                    className={`flex items-center justify-between text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}
                                  >
                                    <div className="flex-1 min-w-0 truncate">
                                      <span className="truncate">{it.text}</span>
                                      {it.dept && (
                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-slate-500" : "bg-gray-100 text-gray-500"}`}>
                                          {it.dept}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`font-mono ml-2 shrink-0 ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                                      {it.price ? `$${Number(it.price).toFixed(2)}` : "—"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={`text-xs italic ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                                Item breakdown not saved for this trip.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent data-testid="trip-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This trip will be removed from your history. Notes and checklists are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="trip-delete-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
              data-testid="trip-delete-confirm-btn"
            >
              Delete trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
