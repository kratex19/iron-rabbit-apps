// Restaurants Galore — Spending Center workspace (recharts + KPIs).
import React, { useEffect, useMemo, useState } from "react";
import { TrendingUp, DollarSign, Store, ArrowUpRight, Receipt } from "lucide-react";
import { format, parseISO, subMonths } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import RestaurantsService from "../../storage/restaurantsService";
import { cardCls } from "./_shared";

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

