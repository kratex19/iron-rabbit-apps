import React, { useMemo, useState, useEffect } from "react";
import { Bell, BellOff, Clock, ChevronRight, X } from "lucide-react";

/**
 * UpcomingAlarmsRail
 * ------------------
 * Sticky, dismissable strip that sits under the search bar and shows
 * the next three upcoming alarms across all active notes + their events.
 * Purpose: give the user a always-visible reassurance that a specific
 * alarm IS scheduled, so they never miss one just because the phone's
 * audio was off / notification permission was denied / the browser
 * throttled the interval while backgrounded.
 *
 * The rail auto-hides when there are no upcoming alarms in the next
 * 24 h. Dismissal is per-session (sessionStorage) — reopens tomorrow.
 */

const DISMISS_KEY = "ir_alarms_rail_dismissed";
const LOOKAHEAD_MS = 24 * 60 * 60 * 1000; // 24 h

function fmtRelative(deltaMs) {
  if (deltaMs < 0) return "now";
  const s = Math.floor(deltaMs / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function fmtAbsolute(d) {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function UpcomingAlarmsRail({ notes = [], isDark, onOpenNote }) {
  // Re-render every 30 s so the countdowns stay live.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(DISMISS_KEY) === "1"; }
    catch { return false; }
  });

  const upcoming = useMemo(() => {
    const now = Date.now();
    const items = [];
    for (const n of notes) {
      if (n.archived_at || n.deleted_at) continue;
      // Main alarm on the note
      if (n.alarm?.enabled && n.alarm?.datetime) {
        const t = new Date(n.alarm.datetime).getTime();
        if (Number.isFinite(t) && t > now && t - now < LOOKAHEAD_MS) {
          items.push({
            id: `main-${n.id}`, noteId: n.id,
            title: n.title || "Untitled", when: t, sound: n.alarm.sound,
          });
        }
      }
      // Per-event alarms
      (n.events || []).forEach((evt) => {
        if (!evt.alarm_enabled || !evt.datetime) return;
        const t = new Date(evt.datetime).getTime();
        if (Number.isFinite(t) && t > now && t - now < LOOKAHEAD_MS) {
          items.push({
            id: `evt-${evt.id}`, noteId: n.id,
            title: `${n.title || "Untitled"} — ${evt.title}`, when: t,
            sound: n.alarm?.sound,
          });
        }
      });
    }
    items.sort((a, b) => a.when - b.when);
    return items.slice(0, 3);
    // tick is a state trigger, not a real dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, tick]);

  if (dismissed || upcoming.length === 0) return null;

  const now = Date.now();
  const shell = isDark
    ? "bg-white/[0.04] border-white/10 backdrop-blur-md"
    : "bg-white/70 border-gray-200 backdrop-blur-md";
  const pillDim = isDark
    ? "bg-white/[0.06] border-white/10 text-white"
    : "bg-white/80 border-gray-200 text-gray-800";

  return (
    <div
      className={`rounded-lg border overflow-hidden mb-2 ${shell}`}
      style={{
        boxShadow: isDark
          ? "inset 0 1px 0 rgba(255,255,255,0.04)"
          : "inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
      data-testid="upcoming-alarms-rail"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-inherit"
           style={{ borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)" }}>
        <Bell className={`w-3.5 h-3.5 ${isDark ? "text-yellow-300" : "text-yellow-600"}`} />
        <span className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>
          Upcoming alarms
        </span>
        <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
          · next {upcoming.length}
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
            setDismissed(true);
          }}
          aria-label="Hide upcoming alarms rail"
          className={`p-1 rounded transition-colors ${
            isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-900 hover:bg-black/5"
          }`}
          data-testid="upcoming-alarms-dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex flex-col gap-1 p-1.5">
        {upcoming.map((a) => {
          const delta = a.when - now;
          const soon = delta < 5 * 60 * 1000; // < 5 min
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onOpenNote?.(a.noteId)}
              className={`w-full flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left transition-all ${pillDim} ${
                soon ? (isDark ? "ring-1 ring-yellow-400/40" : "ring-1 ring-yellow-500/40") : ""
              } hover:translate-x-[1px]`}
              data-testid={`upcoming-alarm-${a.id}`}
            >
              <Clock className={`w-3.5 h-3.5 shrink-0 ${soon ? (isDark ? "text-yellow-300" : "text-yellow-600") : (isDark ? "text-slate-400" : "text-gray-500")}`} />
              <span className="text-xs font-medium truncate flex-1">{a.title}</span>
              <span className={`text-[10px] font-mono shrink-0 ${soon ? (isDark ? "text-yellow-300" : "text-yellow-700") : (isDark ? "text-slate-400" : "text-gray-500")}`}>
                {fmtRelative(delta)}
              </span>
              <span className={`text-[10px] font-mono shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {fmtAbsolute(new Date(a.when))}
              </span>
              <ChevronRight className={`w-3 h-3 shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
