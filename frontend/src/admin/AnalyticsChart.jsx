/**
 * AnalyticsChart — tiny horizontal bar chart of featured-tip performance.
 *
 * Renders top-N tips by "open" clicks with impressions/dismisses/uniques as
 * secondary bars. Uses recharts (already in package.json) so we don't pull
 * in another dep. Fetches `/api/community/analytics` on mount + refresh.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw, BarChart3, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";

export default function AnalyticsChart({ apiFetch, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/community/analytics?days=${days}`, token);
      setData(res);
    } catch (e) {
      toast.error("Couldn't load analytics");
    } finally { setLoading(false); }
  }, [apiFetch, token, days]);

  useEffect(() => { load(); }, [load]);

  const chartData = useMemo(() => {
    if (!data?.tips) return [];
    // Top 5 by opens for the bar chart; truncate long headings.
    return data.tips.slice(0, 5).map(t => ({
      name: (t.heading || "(untitled)").length > 28
        ? (t.heading || "(untitled)").slice(0, 28) + "…"
        : (t.heading || "(untitled)"),
      opens: t.opens,
      impressions: t.impressions,
      dismisses: t.dismisses,
      unique_installs: t.unique_installs,
      tip_id: t.tip_id,
    }));
  }, [data]);

  const totals = useMemo(() => {
    if (!data?.tips) return { impressions: 0, opens: 0, dismisses: 0, uniques: 0 };
    return data.tips.reduce((acc, t) => ({
      impressions: acc.impressions + t.impressions,
      opens: acc.opens + t.opens,
      dismisses: acc.dismisses + t.dismisses,
      uniques: acc.uniques + t.unique_installs,
    }), { impressions: 0, opens: 0, dismisses: 0, uniques: 0 });
  }, [data]);

  const openRate = totals.impressions ? Math.round((totals.opens / totals.impressions) * 100) : 0;

  return (
    <div
      className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
      data-testid="analytics-chart"
    >
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-indigo-400" />
        <div className="text-sm font-semibold text-white flex-1">
          Featured tip analytics
          <span className="text-[10px] text-slate-500 font-normal ml-2 uppercase tracking-wider">
            Last {data?.window_days || days} days
          </span>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="bg-white/5 border border-white/10 text-slate-300 rounded-md h-7 text-xs px-2"
          data-testid="analytics-days-select"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
        <Button
          size="sm"
          variant="outline"
          onClick={load}
          disabled={loading}
          className="text-slate-300 border-white/10 hover:bg-white/5 h-7 px-2"
          data-testid="analytics-refresh"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Top-line totals */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Impressions", value: totals.impressions, color: "text-slate-300", key: "impressions" },
          { label: "Opens", value: totals.opens, color: "text-emerald-400", key: "opens" },
          { label: "Dismisses", value: totals.dismisses, color: "text-amber-400", key: "dismisses" },
          { label: "Unique installs", value: totals.uniques, color: "text-indigo-400", key: "unique-installs" },
        ].map(stat => (
          <div key={stat.key} className="rounded-lg bg-black/20 border border-white/5 p-2.5" data-testid={`analytics-total-${stat.key}`}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{stat.label}</div>
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      {chartData.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-xs" data-testid="analytics-empty">
          {loading ? "Loading…" : (totals.impressions === 0 ? "No events yet — waiting for the first home-screen views to land." : "No promoted tips have data yet.")}
        </div>
      ) : (
        <>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
            Top {chartData.length} tips by opens
            <span className="ml-2 text-slate-600 normal-case">· open-rate {openRate}%</span>
          </div>
          <div style={{ height: chartData.length * 44 + 24 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={200}
                  tick={{ fill: "#cbd5e1", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{ background: "#0F172A", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  cursor={{ fill: "rgba(255,255,255,0.02)" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} iconType="circle" />
                <Bar dataKey="opens" name="Opens" stackId="stack" fill="#10B981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="impressions" name="Impressions" stackId="stack" fill="#6366F1" radius={[0, 0, 0, 0]} />
                <Bar dataKey="dismisses" name="Dismisses" stackId="stack" fill="#F59E0B" radius={[0, 0, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
