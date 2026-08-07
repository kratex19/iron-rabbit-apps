/**
 * RecoveryAlertsLog — compact "Past alerts" strip.
 *
 * Renders the last 5 rows of the `recovery_alerts` collection so historical
 * drop events stay visible after the in-dashboard banner clears. Silent
 * when the collection is empty (no visual noise on a healthy funnel).
 */

import React, { useCallback, useEffect, useState } from "react";
import { History, TrendingDown, RefreshCcw, Loader2, Slack } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch { return iso; }
}

function formatRelative(iso) {
  if (!iso) return "";
  try {
    const diff = Math.max(0, Date.now() - Date.parse(iso));
    const hours = Math.round(diff / 3600000);
    if (hours < 24) return hours <= 1 ? "just now" : `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  } catch { return ""; }
}

export default function RecoveryAlertsLog({ apiFetch, token }) {
  const [alerts, setAlerts] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/admin/recovery/alerts?limit=5`, token);
      setAlerts(Array.isArray(res?.alerts) ? res.alerts : []);
    } catch (e) {
      setAlerts([]);
    } finally { setLoading(false); }
  }, [apiFetch, token]);

  useEffect(() => { load(); }, [load]);

  // Empty state: don't render at all so a healthy funnel doesn't get a
  // "no alerts" placeholder. Log-style panels are for history, not zero.
  if (alerts === null) return null;
  if (alerts.length === 0) return null;

  return (
    <div
      className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3"
      data-testid="recovery-alerts-log"
    >
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-slate-400" />
        <div className="text-xs font-semibold text-white flex-1">
          Past alerts
          <span className="text-[10px] text-slate-500 font-normal ml-2">
            last {alerts.length} recorded drop{alerts.length === 1 ? "" : "s"}
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-7 px-2 text-xs text-slate-300 border-white/10 hover:bg-white/5"
          data-testid="alerts-log-refresh"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
        </Button>
      </div>
      <ul className="divide-y divide-white/5">
        {alerts.map((a, idx) => {
          const fromPct = Math.round((a.from_share || 0) * 100);
          const toPct = Math.round((a.to_share || 0) * 100);
          return (
            <li
              key={a.week_start || idx}
              className="py-2 flex items-center gap-3 text-xs"
              data-testid={`alerts-log-row-${idx}`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white">
                  <span className="font-semibold text-amber-200">{a.delta} pt drop</span>
                  <span className="text-slate-500 mx-1.5">·</span>
                  <span className="text-slate-300">week of {formatDate(a.week_start)}</span>
                  <span className="text-slate-500 mx-1.5">·</span>
                  <span className="text-slate-400">
                    {fromPct}% → <span className="text-amber-200 font-semibold">{toPct}%</span>
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span>alerted {formatRelative(a.alerted_at)}</span>
                  {a.posted_to_slack ? (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Slack className="w-2.5 h-2.5" /> pinged Slack
                      </span>
                    </>
                  ) : (
                    <>
                      <span>·</span>
                      <span className="text-slate-500">dashboard-only</span>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
