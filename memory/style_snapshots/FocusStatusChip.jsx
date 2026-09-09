import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BellOff, Bell, X, Sunrise, Timer, Infinity as InfinityIcon, BookOpen } from "lucide-react";

/**
 * FocusStatusChip — header pill that is ALWAYS visible so the user can
 * flip Focus on / off from any surface without hunting through
 * Settings. Two visual states:
 *
 *   OFF (dim / grey `Bell` icon) — single-tap opens a menu with
 *     30m · 1h · 2h · Until sunrise · Turn ON (indefinite). Picking
 *     any option calls `onActivate` with the appropriate settings
 *     patch so the parent can persist to IndexedDB.
 *
 *   ON (indigo `BellOff` icon) — shows the reason (manual / timer /
 *     scheduled) plus a live "X left" countdown that ticks every 30s.
 *     X button calls `onCancel` which the parent uses to clear the
 *     manual toggle + Focus-Now timer in one shot. Schedule keeps
 *     working. Tapping the label itself is a no-op (by design — the
 *     X is the only way to kill Focus so accidental cancels are hard).
 *
 * Props:
 *   status     { active, manual, until, scheduleActive }
 *   onActivate (patch)  → merge settings patch (focus_mode / focus_until)
 *   onCancel   ()       → clear manual + timer
 *   location   optional  { latitude, longitude } for accurate sunrise
 */

function nextSunriseFallback(now = new Date()) {
  const target = new Date(now);
  target.setHours(6, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime();
}

async function fetchNextSunrise(location) {
  if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
    return nextSunriseFallback();
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
        const t = new Date(s).getTime();
        if (Number.isFinite(t) && t > now) return t;
      }
    }
  } catch { /* fall through */ }
  return nextSunriseFallback();
}

export default function FocusStatusChip({ status, onActivate, onCancel, location }) {
  const [, setTick] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!status?.active) return undefined;
    const iv = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(iv);
  }, [status?.active]);

  // Close the OFF-state menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    // Re-anchor the fixed menu to the chip's current viewport rect so
    // it sits flush under the pill. Handles scroll / resize while open.
    const anchor = () => {
      const el = btnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setMenuPos({
        top: Math.round(r.bottom + 4),
        right: Math.round(window.innerWidth - r.right),
      });
    };
    anchor();
    const onDown = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      // Portaled menu lives outside wrapRef — treat clicks on it as inside.
      if (e.target && e.target.closest && e.target.closest('[data-focus-menu-portal="1"]')) return;
      setMenuOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", anchor);
    window.addEventListener("scroll", anchor, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", anchor);
      window.removeEventListener("scroll", anchor, true);
    };
  }, [menuOpen]);

  const active = !!status?.active;

  // -------- OFF STATE: dim pill + tap menu ------------------------------
  if (!active) {
    const pick = async (kind) => {
      setMenuOpen(false);
      if (!onActivate) return;
      if (kind === "manual") {
        onActivate({ focus_mode: true, focus_until: 0 });
        return;
      }
      if (kind === "sunrise") {
        const ts = await fetchNextSunrise(location);
        onActivate({ focus_mode: false, focus_until: ts });
        return;
      }
      const map = { "30m": 30 * 60 * 1000, "1h": 60 * 60 * 1000, "2h": 2 * 60 * 60 * 1000 };
      const ms = map[kind];
      if (ms) onActivate({ focus_mode: false, focus_until: Date.now() + ms });
    };

    return (
      <div ref={wrapRef} className="relative inline-flex mt-1 shrink-0">
        <button
          ref={btnRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-slate-300 border border-white/15 backdrop-blur-sm hover:bg-white/[0.12] hover:text-white transition-colors"
          data-testid="focus-status-chip"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Focus Mode is OFF — tap to silence alarms"
        >
          <Bell className="w-3 h-3" strokeWidth={2.4} />
          <span>Focus · off</span>
        </button>

        {menuOpen && typeof document !== "undefined" && createPortal(
          <div
            role="menu"
            ref={(el) => {
              // Outside-click needs to know about the portaled node too
              // (wrapRef.contains would miss it since it lives in body).
              // We stash it as a data attr and check both refs on click.
              if (el) el.setAttribute("data-focus-menu-portal", "1");
            }}
            style={{
              position: "fixed",
              top: menuPos.top,
              right: menuPos.right,
              zIndex: 2147483000,
              backgroundColor: "rgb(15 23 42)", // slate-900 opaque
            }}
            className="min-w-[160px] rounded-lg border border-white/15 shadow-2xl py-1"
            data-testid="focus-status-menu"
          >
            <MenuRow icon={<Timer className="w-3.5 h-3.5" />} label="30 minutes" onClick={() => pick("30m")} testid="focus-status-menu-30m" />
            <MenuRow icon={<Timer className="w-3.5 h-3.5" />} label="1 hour" onClick={() => pick("1h")} testid="focus-status-menu-1h" />
            <MenuRow icon={<Timer className="w-3.5 h-3.5" />} label="2 hours" onClick={() => pick("2h")} testid="focus-status-menu-2h" />
            <MenuRow icon={<Sunrise className="w-3.5 h-3.5" />} label="Until sunrise" onClick={() => pick("sunrise")} testid="focus-status-menu-sunrise" />
            <div className="h-px bg-white/10 my-1" />
            <MenuRow icon={<InfinityIcon className="w-3.5 h-3.5" />} label="Turn ON (indefinite)" onClick={() => pick("manual")} testid="focus-status-menu-manual" />
            <div className="h-px bg-white/10 my-1" />
            <MenuRow
              icon={<BookOpen className="w-3.5 h-3.5" />}
              label="How Focus works"
              onClick={() => {
                setMenuOpen(false);
                window.open("/focus-mode-guide.html", "_blank", "noopener");
              }}
              testid="focus-status-menu-guide"
            />
          </div>,
          document.body
        )}
      </div>
    );
  }

  // -------- ON STATE: indigo pill + X cancel (unchanged behavior) -------
  let label = "Focus active";
  if (status.until && Date.now() < status.until) {
    const ms = status.until - Date.now();
    const mins = Math.max(1, Math.round(ms / 60000));
    if (mins < 60) label = `Focus · ${mins}m left`;
    else {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      label = m === 0 ? `Focus · ${h}h left` : `Focus · ${h}h ${m}m left`;
    }
  } else if (status.manual) {
    label = "Focus · ON";
  } else if (status.scheduleActive) {
    label = "Focus · scheduled";
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-full text-[10px] font-medium bg-indigo-500/25 text-indigo-100 border border-indigo-400/40 backdrop-blur-sm shrink-0"
      data-testid="focus-status-chip"
      aria-live="polite"
      title="Focus Mode is silencing alarm popups, sound and haptics"
    >
      <BellOff className="w-3 h-3" strokeWidth={2.4} />
      <span>{label}</span>
      {onCancel && (status.manual || (status.until && Date.now() < status.until)) && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Cancel Focus Mode"
          data-testid="focus-status-cancel"
          title="Cancel Focus Mode now"
        >
          <X className="w-3 h-3" strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}

function MenuRow({ icon, label, onClick, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      data-testid={testid}
      className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10 inline-flex items-center gap-2 transition-colors"
    >
      <span className="text-slate-400">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
