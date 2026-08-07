/**
 * RecoveryFunnel — compact "magic-link vs manual entry" panel.
 *
 * Answers one question: is the magic link in recovery emails earning its
 * URL length? Reads `/api/community/recovery/analytics` and surfaces:
 *   • magic_link_share as a big number (0-100%)
 *   • 5 supporting counts (email_sent, opens split, verify success/fail)
 *   • a tiny window picker (7d / 30d / 90d)
 *
 * Zero deps beyond what the admin dashboard already ships.
 */

import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { RefreshCcw, Link2, Loader2, KeyRound, MailCheck, ShieldAlert, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const WINDOWS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

export default function RecoveryFunnel({ apiFetch, token }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/community/recovery/analytics?days=${days}`, token);
      setData(res);
    } catch (e) {
      toast.error("Couldn't load recovery funnel");
    } finally { setLoading(false); }
  }, [apiFetch, token, days]);

  useEffect(() => { load(); }, [load]);

  const sharePct = data ? Math.round((data.magic_link_share || 0) * 100) : 0;
  const opensTotal = data ? (data.magic_link_opened + data.manual_entry_opened) : 0;
  const verifyTotal = data ? (data.verify_success + data.verify_failed) : 0;
  const conversion = data && data.email_sent > 0
    ? Math.round((data.verify_success / data.email_sent) * 100)
    : 0;

  // Threshold alert: flag any adjacent-week drop of >20 share points where
  // BOTH weeks had opens (otherwise the swing is noise from a zero window).
  // If multiple drops exist we report the largest one — that's the story
  // the admin needs to hear on a Monday morning.
  const dropAlert = React.useMemo(() => {
    const series = data?.weekly_series || [];
    let worst = null;
    for (let i = 1; i < series.length; i++) {
      const a = series[i - 1];
      const b = series[i];
      if (!a || !b) continue;
      if (a.opens_total === 0 || b.opens_total === 0) continue;
      const delta = Math.round((a.magic_link_share - b.magic_link_share) * 100);
      if (delta > 20 && (!worst || delta > worst.delta)) {
        worst = { delta, from: a, to: b };
      }
    }
    return worst;
  }, [data]);

  return (
    <div
      className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
      data-testid="recovery-funnel-panel"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-fuchsia-500">
          <KeyRound className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">Recovery funnel</div>
          <div className="text-[10px] text-slate-500">
            Is the emailed magic link earning its URL length?
          </div>
        </div>
        {/* Window picker */}
        <div className="inline-flex rounded-md bg-white/5 border border-white/10 p-0.5 gap-0.5">
          {WINDOWS.map(w => (
            <button
              key={w.days}
              type="button"
              onClick={() => setDays(w.days)}
              className={`px-2 h-7 rounded text-[11px] font-medium transition-colors ${
                days === w.days
                  ? "bg-indigo-500/20 text-indigo-200"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
              data-testid={`funnel-window-${w.days}`}
            >
              {w.label}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-7 px-2 text-xs text-slate-300 border-white/10 hover:bg-white/5"
          data-testid="funnel-refresh"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
        </Button>
      </div>

      {!data ? (
        <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          {dropAlert && (
            <div
              className="mb-3 rounded-lg border border-amber-400/40 bg-amber-500/[0.08] p-3 flex items-start gap-2"
              role="alert"
              data-testid="funnel-drop-alert"
            >
              <TrendingDown className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-100 leading-relaxed">
                <div className="font-semibold">
                  Magic-link share dropped {dropAlert.delta} points week-over-week
                </div>
                <div className="text-[11px] text-amber-200/80 mt-0.5">
                  {dropAlert.from.week_start} → {dropAlert.from.week_end}:
                  {" "}<span className="font-semibold">{Math.round(dropAlert.from.magic_link_share * 100)}%</span>
                  {"  →  "}
                  {dropAlert.to.week_start} → {dropAlert.to.week_end}:
                  {" "}<span className="font-semibold">{Math.round(dropAlert.to.magic_link_share * 100)}%</span>.
                  {" "}Check recent email deliverability or landing-page copy.
                </div>
              </div>
            </div>
          )}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Big number: magic-link share */}
          <div className="sm:col-span-1 rounded-lg bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/10 border border-indigo-400/20 p-4 flex flex-col items-center justify-center" data-testid="funnel-magic-share">
            <div className="text-[10px] uppercase tracking-wider text-indigo-200 font-semibold mb-1 flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Magic-link share
            </div>
            <div className="text-4xl font-extrabold text-white leading-none">
              {sharePct}<span className="text-lg text-indigo-200">%</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-2 text-center">
              of {opensTotal} open{opensTotal === 1 ? "" : "s"} came via email link
            </div>
            {/* 4-week sparkline — spot climbs/drops week-over-week. */}
            <Sparkline series={data.weekly_series || []} />
          </div>

          {/* Supporting metrics */}
          <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Emails minted" value={data.email_sent} testId="funnel-email-sent" icon={<MailCheck className="w-3 h-3" />} />
            <Stat label="Magic-link opens" value={data.magic_link_opened} testId="funnel-magic-opened" tone="indigo" />
            <Stat label="Manual opens" value={data.manual_entry_opened} testId="funnel-manual-opened" tone="slate" />
            <Stat label={`Verified (${conversion}%)`} value={data.verify_success} testId="funnel-verify-success" tone="emerald" />
            <Stat
              label="Wrong codes"
              value={data.verify_failed}
              testId="funnel-verify-failed"
              tone={data.verify_failed > 0 && verifyTotal > 0 && (data.verify_failed / verifyTotal) > 0.5 ? "amber" : "slate"}
              icon={data.verify_failed > 5 ? <ShieldAlert className="w-3 h-3" /> : null}
            />
            <Stat label="Window" value={`${data.window_days}d`} testId="funnel-window" tone="slate" small />
          </div>
        </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone = "slate", icon = null, testId, small = false }) {
  const tones = {
    slate: "bg-white/[0.03] border-white/10 text-white",
    indigo: "bg-indigo-500/10 border-indigo-400/20 text-indigo-100",
    emerald: "bg-emerald-500/10 border-emerald-400/20 text-emerald-100",
    amber: "bg-amber-500/10 border-amber-400/30 text-amber-100",
  };
  return (
    <div className={`rounded-lg border p-2.5 ${tones[tone] || tones.slate}`} data-testid={testId}>
      <div className="text-[9px] uppercase tracking-wider opacity-70 font-semibold flex items-center gap-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className={`font-extrabold leading-tight mt-0.5 ${small ? "text-lg" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

/**
 * Sparkline — compact 4-bar week-over-week chart of magic-link share.
 * Heights scale to the max share in the series (min 5% so zero weeks still
 * render a visible baseline). Trend indicator compares first vs last non-zero.
 */
function Sparkline({ series }) {
  if (!Array.isArray(series) || series.length === 0) return null;
  const maxShare = Math.max(0.05, ...series.map(w => w.magic_link_share || 0));
  // Trend arrow: compare last week to first week that had activity.
  const withData = series.filter(w => w.opens_total > 0);
  let trend = 0;  // -1 down, 0 flat, +1 up
  if (withData.length >= 2) {
    const first = withData[0].magic_link_share;
    const last = withData[withData.length - 1].magic_link_share;
    if (last - first > 0.05) trend = 1;
    else if (first - last > 0.05) trend = -1;
  }
  const trendColor = trend > 0 ? "text-emerald-300" : trend < 0 ? "text-amber-300" : "text-slate-400";
  const trendArrow = trend > 0 ? "↑" : trend < 0 ? "↓" : "→";

  return (
    <div className="w-full mt-3 pt-3 border-t border-white/10" data-testid="funnel-sparkline">
      <div className="flex items-end gap-1 h-8" role="img" aria-label="Magic-link share, last 4 weeks">
        {series.map((w, i) => {
          const h = w.opens_total > 0
            ? Math.max(8, Math.round((w.magic_link_share / maxShare) * 100))
            : 6;  // baseline for weeks with zero data
          const empty = w.opens_total === 0;
          return (
            <div
              key={w.week_start || i}
              className={`flex-1 rounded-sm ${empty ? "bg-white/10" : "bg-indigo-400/70"}`}
              style={{ height: `${h}%` }}
              title={
                `${w.week_start} → ${w.week_end}\n` +
                `magic: ${w.magic_link_opened}  manual: ${w.manual_entry_opened}\n` +
                (w.opens_total > 0 ? `share: ${Math.round(w.magic_link_share * 100)}%` : "no opens")
              }
              data-testid={`funnel-spark-week-${i}`}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[9px] mt-1">
        <span className="text-slate-500">4-week trend</span>
        <span className={`font-semibold ${trendColor}`} data-testid="funnel-spark-trend">
          {trendArrow} {trend > 0 ? "climbing" : trend < 0 ? "slipping" : "flat"}
        </span>
      </div>
    </div>
  );
}
