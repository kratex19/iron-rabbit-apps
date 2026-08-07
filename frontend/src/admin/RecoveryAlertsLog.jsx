/**
 * RecoveryAlertsLog — compact "Past alerts" strip.
 *
 * Renders the last 5 rows of the `recovery_alerts` collection so historical
 * drop events stay visible after the in-dashboard banner clears. Silent
 * when the collection is empty (no visual noise on a healthy funnel).
 */

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { History, TrendingDown, RefreshCcw, Loader2, Slack, X, Clock, Eye, EyeOff, RotateCcw, Bot } from "lucide-react";
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
  const [busyKey, setBusyKey] = useState("");
  const [includeDismissed, setIncludeDismissed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = includeDismissed ? "?limit=20&include_dismissed=1" : "?limit=5";
      const res = await apiFetch(`/api/admin/recovery/alerts${qs}`, token);
      setAlerts(Array.isArray(res?.alerts) ? res.alerts : []);
    } catch (e) {
      setAlerts([]);
    } finally { setLoading(false); }
  }, [apiFetch, token, includeDismissed]);

  useEffect(() => { load(); }, [load]);

  const patchAlert = async (weekStart, action, days) => {
    setBusyKey(`${weekStart}:${action}`);
    try {
      await apiFetch(`/api/admin/recovery/alerts/${encodeURIComponent(weekStart)}`, token, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(days ? { action, days } : { action }),
      });
      if (action === "restore") {
        // Restored rows may or may not stay in view depending on toggle —
        // easiest to just re-fetch so state matches server.
        load();
        toast.success("Restored");
      } else {
        // Dismiss/snooze — if we're in audit mode, keep the row and just
        // patch the local flags so the row shows its new status inline.
        if (includeDismissed) {
          setAlerts(prev => (prev || []).map(a =>
            a.week_start === weekStart
              ? {
                  ...a,
                  dismissed_at: action === "dismiss" ? new Date().toISOString() : a.dismissed_at,
                  snooze_until: action === "snooze"
                    ? new Date(Date.now() + (days || 7) * 86400000).toISOString()
                    : a.snooze_until,
                }
              : a
          ));
        } else {
          setAlerts(prev => (prev || []).filter(a => a.week_start !== weekStart));
        }
        toast.success(action === "snooze" ? `Snoozed for ${days || 7} days` : "Dismissed");
      }
    } catch (e) {
      toast.error("Couldn't update alert");
    } finally { setBusyKey(""); }
  };

  // Row status helpers — used to render badges + gate the action set.
  const now = Date.now();
  const rowStatus = (a) => {
    if (a?.auto_dismissed_at) return "auto-dismissed";
    if (a?.dismissed_at) return "dismissed";
    if (a?.snooze_until && Date.parse(a.snooze_until) > now) return "snoozed";
    return "active";
  };

  // Empty state: render an ultra-minimal "Show audit trail" pill so the
  // toggle is still reachable when the active alerts list is empty. Full
  // panel opens once the user clicks the pill (which flips includeDismissed).
  if (alerts === null) return null;
  if (alerts.length === 0 && !includeDismissed) {
    return (
      <div className="mb-4 text-right" data-testid="recovery-alerts-log-empty">
        <button
          type="button"
          onClick={() => setIncludeDismissed(true)}
          className="text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300 inline-flex items-center gap-1 transition-colors"
          data-testid="alerts-log-audit-toggle"
        >
          <Eye className="w-3 h-3" /> Show recovery-alert audit trail
        </button>
      </div>
    );
  }

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
            {includeDismissed
              ? `${alerts.length} total (incl. dismissed/snoozed)`
              : `last ${alerts.length} recorded drop${alerts.length === 1 ? "" : "s"}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIncludeDismissed(v => !v)}
          className={`h-7 px-2 rounded text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
            includeDismissed
              ? "bg-indigo-500/20 text-indigo-200"
              : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
          }`}
          data-testid="alerts-log-audit-toggle"
          aria-pressed={includeDismissed}
          title={includeDismissed ? "Hide dismissed / snoozed" : "Show full audit trail"}
        >
          {includeDismissed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {includeDismissed ? "Hide dismissed" : "Include dismissed"}
        </button>
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
      {alerts.length === 0 ? (
        <div className="py-4 text-center text-[11px] text-slate-500">
          No alerts in the audit trail yet.
        </div>
      ) : (
      <ul className="divide-y divide-white/5">
        {alerts.map((a, idx) => {
          const fromPct = Math.round((a.from_share || 0) * 100);
          const toPct = Math.round((a.to_share || 0) * 100);
          const st = rowStatus(a);
          return (
            <li
              key={a.week_start || idx}
              className={`py-2 flex items-center gap-3 text-xs group ${st !== "active" ? "opacity-70" : ""}`}
              data-testid={`alerts-log-row-${idx}`}
              data-status={st}
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white flex items-center flex-wrap gap-1.5">
                  <span className="font-semibold text-amber-200">{a.delta} pt drop</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-300">week of {formatDate(a.week_start)}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">
                    {fromPct}% → <span className="text-amber-200 font-semibold">{toPct}%</span>
                  </span>
                  {st === "auto-dismissed" && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 font-semibold" data-testid={`alerts-log-badge-${idx}`}>
                      <Bot className="w-2.5 h-2.5" /> Auto-dismissed
                    </span>
                  )}
                  {st === "dismissed" && (
                    <span className="ml-1 inline-flex items-center text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-300 font-semibold" data-testid={`alerts-log-badge-${idx}`}>
                      Dismissed
                    </span>
                  )}
                  {st === "snoozed" && (
                    <span className="ml-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-200 font-semibold" data-testid={`alerts-log-badge-${idx}`}>
                      <Clock className="w-2.5 h-2.5" /> Snoozed
                    </span>
                  )}
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
                  {a.auto_dismissed_at_share !== undefined && a.auto_dismissed_at_share !== null && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-400">
                        recovered to {Math.round(a.auto_dismissed_at_share * 100)}%
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* Action set depends on row state. Active rows get snooze+dismiss;
                  dismissed/snoozed rows get restore. Auto-dismissed rows are
                  also restorable in case the funnel was noisy and the admin
                  wants to keep tracking. */}
              {st === "active" ? (
                <>
                  <button
                    type="button"
                    onClick={() => patchAlert(a.week_start, "snooze", 7)}
                    disabled={busyKey.startsWith(`${a.week_start}:`)}
                    className="h-6 px-2 rounded text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 inline-flex items-center gap-1 transition-colors"
                    title="Hide this alert for 7 days"
                    data-testid={`alerts-log-snooze-${idx}`}
                  >
                    <Clock className="w-3 h-3" /> 7d
                  </button>
                  <button
                    type="button"
                    onClick={() => patchAlert(a.week_start, "dismiss")}
                    disabled={busyKey.startsWith(`${a.week_start}:`)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                    title="Dismiss — keeps the audit row, hides from panel"
                    aria-label="Dismiss alert"
                    data-testid={`alerts-log-dismiss-${idx}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => patchAlert(a.week_start, "restore")}
                  disabled={busyKey.startsWith(`${a.week_start}:`)}
                  className="h-6 px-2 rounded text-[10px] font-medium text-slate-400 hover:text-slate-200 hover:bg-white/5 inline-flex items-center gap-1 transition-colors"
                  title="Bring this alert back to the active list"
                  data-testid={`alerts-log-restore-${idx}`}
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
              )}
            </li>
          );
        })}
      </ul>
      )}
    </div>
  );
}
