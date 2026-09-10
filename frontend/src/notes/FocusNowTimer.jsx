import React, { useEffect, useState } from "react";
import { Timer, Sunrise, X } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "../utils/haptic";

/**
 * FocusNowTimer — quick chip row to pin Focus Mode ON for a limited
 * window without hunting through the manual toggle or the schedule.
 *
 * Value: `settings.focus_until` (ms timestamp). When `Date.now() < until`
 * Focus is treated as ON by the notification service. When the timer
 * elapses the state naturally reverts. The user can also cancel early
 * with the ✕ chip.
 *
 * Chips:
 *   30m — Date.now() + 30·60·1000
 *   1h  — Date.now() + 60·60·1000
 *   2h  — Date.now() + 2·60·60·1000
 *   Until sunrise — next occurrence of 06:00 local (rough "morning" heuristic)
 */

function nextSunrise(now = new Date()) {
  const target = new Date(now);
  target.setHours(6, 0, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime();
}

// Fetch the next real local sunrise from Open-Meteo when the user's
// weather location is known. Falls back to the 06:00 heuristic on
// error / when lat & lng aren't set.
async function fetchNextSunrise(location) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return nextSunrise();
  }
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&daily=sunrise&timezone=auto&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sunrise fetch HTTP ${res.status}`);
    const data = await res.json();
    const items = data?.daily?.sunrise;
    if (Array.isArray(items)) {
      const now = Date.now();
      for (const s of items) {
        // Open-Meteo returns ISO local time strings without timezone
        // (e.g. "2026-02-28T06:12"). Because we requested timezone=auto
        // the JS Date constructor will parse them as local, which is
        // exactly what we want.
        const t = new Date(s).getTime();
        if (Number.isFinite(t) && t > now) return t;
      }
    }
  } catch (err) {
    console.warn("fetchNextSunrise failed, falling back to 6am heuristic:", err);
  }
  return nextSunrise();
}

function formatRemaining(ms) {
  if (ms <= 0) return "0m";
  const totalMins = Math.round(ms / 60000);
  if (totalMins < 60) return `${totalMins}m`;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function FocusNowTimer({ value, onChange, isDark, location }) {
  const until = typeof value === "number" && Number.isFinite(value) ? value : null;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!until) return undefined;
    const iv = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(iv);
  }, [until]);

  const active = until && Date.now() < until;
  // Clean up an elapsed timer once we notice it so `settings.focus_until`
  // doesn't linger stale in storage. Also fire a strong "focus done"
  // haptic pulse + toast so the user knows the quiet window has
  // ended even if their eyes were elsewhere.
  useEffect(() => {
    if (until && Date.now() >= until) {
      onChange(null);
      haptic("milestone");
      toast.success("Focus session complete");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, until]);

  const chipCls = isDark
    ? "border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-slate-200"
    : "border border-gray-200 bg-white hover:bg-gray-50 text-gray-800";
  const activeChipCls = isDark
    ? "border border-indigo-400/40 bg-indigo-500/20 text-indigo-100"
    : "border border-indigo-300 bg-indigo-50 text-indigo-800";

  const setTimer = (deltaMs) => onChange(Date.now() + deltaMs);
  const setSunrise = async () => {
    const ts = await fetchNextSunrise(location);
    onChange(ts);
  };
  const cancel = () => onChange(null);

  return (
    <div className={`rounded-md p-3 ${isDark ? "bg-black/20 border border-white/10" : "bg-gray-50 border border-gray-200"}`} data-testid="focus-now-timer">
      <div className="flex items-center gap-2 mb-2">
        <Timer className={`w-3.5 h-3.5 ${active ? "text-indigo-400" : (isDark ? "text-slate-500" : "text-gray-400")}`} />
        <span className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
          Focus Now
        </span>
        {active && (
          <span
            className={`ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full ${
              isDark ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30" : "bg-indigo-50 text-indigo-700 border border-indigo-200"
            }`}
            data-testid="focus-now-remaining"
            aria-live="polite"
          >
            {formatRemaining(until - Date.now())} left
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTimer(30 * 60 * 1000)}
          className={`px-2.5 py-1 rounded-full text-xs transition-colors ${chipCls}`}
          data-testid="focus-now-30m"
        >
          30 min
        </button>
        <button
          type="button"
          onClick={() => setTimer(60 * 60 * 1000)}
          className={`px-2.5 py-1 rounded-full text-xs transition-colors ${chipCls}`}
          data-testid="focus-now-1h"
        >
          1 hour
        </button>
        <button
          type="button"
          onClick={() => setTimer(2 * 60 * 60 * 1000)}
          className={`px-2.5 py-1 rounded-full text-xs transition-colors ${chipCls}`}
          data-testid="focus-now-2h"
        >
          2 hours
        </button>
        <button
          type="button"
          onClick={setSunrise}
          className={`px-2.5 py-1 rounded-full text-xs transition-colors inline-flex items-center gap-1 ${chipCls}`}
          data-testid="focus-now-sunrise"
          title="Silence alarms until 6:00 AM local"
        >
          <Sunrise className="w-3 h-3" /> Until sunrise
        </button>
        {active && (
          <button
            type="button"
            onClick={cancel}
            className={`px-2.5 py-1 rounded-full text-xs transition-colors inline-flex items-center gap-1 ${activeChipCls}`}
            data-testid="focus-now-cancel"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        )}
      </div>
      <p className={`text-[10px] mt-2 leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        Pins Focus Mode ON for a limited window then reverts automatically. Works alongside the manual toggle and the schedule below.
      </p>
    </div>
  );
}
