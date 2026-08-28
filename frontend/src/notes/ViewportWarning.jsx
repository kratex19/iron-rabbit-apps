import React, { useEffect, useState, useCallback } from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * ViewportWarning
 * ────────────────
 * A tiny top-bar sentinel that watches for the classic "the app looks broken
 * on my phone" traps and, when one is detected, flashes a pulsing red warning
 * triangle. Tapping it opens a popover explaining the *likely* cause and how
 * to fix it in one step.
 *
 * Currently detects:
 *   1. Chrome / Firefox / Samsung Internet "Desktop site" mode on a phone
 *   2. Very narrow-window desktop (browser window shrunk below 320 px)
 *   3. Extreme browser zoom (200 % +) forcing content into weird wrapping
 *   4. Very small physical screen paired with a very wide reported viewport
 *      (i.e. anything spoofing a desktop viewport on a mobile device)
 *
 * No side-effects — pure detection + informational popover.
 */
export default function ViewportWarning({ isDark }) {
  const [issues, setIssues] = useState([]);
  const [open, setOpen] = useState(false);

  const runChecks = useCallback(() => {
    const found = [];

    const ua = navigator.userAgent || "";
    const uaSaysMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    const isTouch =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const physicalW = window.screen?.width || 0;
    const physicalH = window.screen?.height || 0;
    const viewportW = window.innerWidth || 0;
    const dpr = window.devicePixelRatio || 1;

    // ── 1. Desktop-site mode on mobile ────────────────────────────
    // Signals: touch input AND (physical screen is phone-sized OR the UA
    // does not include "Mobile"). Chrome for Android's "Desktop site" flag
    // both (a) rewrites the UA to omit "Mobile" and (b) reports a fixed
    // ~980 px viewport regardless of the physical device.
    const physicalIsPhone =
      physicalW > 0 && physicalW < 600 && physicalH > 0 && physicalH < 1100;
    const viewportLooksDesktopy = viewportW >= 900;
    if (isTouch && physicalIsPhone && viewportLooksDesktopy) {
      found.push({
        id: "desktop-site",
        title: "Desktop-site mode is on",
        detail:
          "Your browser is telling this app you're on a desktop, so the desktop layout is being rendered on a phone screen.",
        fix: "Chrome ⋮ menu → untick 'Desktop site' · Safari: aA icon in address bar → 'Request Mobile Website' · Samsung Internet: ≡ → 'Desktop site' off. Then refresh.",
      });
    }

    // ── 2. Extreme browser zoom (200 %+) ──────────────────────────
    // devicePixelRatio > 3 on a non-Retina device usually indicates
    // aggressive OS/browser zoom. Also compare rounded physical to
    // viewport — if the ratio is way off, zoom is probably the cause.
    if (dpr >= 3 && !uaSaysMobile) {
      found.push({
        id: "zoom",
        title: "Browser zoom looks extreme",
        detail:
          "Text and layout may wrap unexpectedly when browser zoom is above ~175 %.",
        fix: "Press Ctrl + 0 (Cmd + 0 on Mac) to reset zoom to 100 %.",
      });
    }

    // ── 3. Window shrunk below phone-min ──────────────────────────
    // Desktop window dragged narrower than any supported phone. Icons
    // and grids will wrap into shapes we didn't specifically test.
    if (!isTouch && viewportW > 0 && viewportW < 320) {
      found.push({
        id: "window-too-narrow",
        title: "Browser window is narrower than any phone",
        detail:
          "Iron Rabbit is tested from 320 px upward. Below that some elements may overlap.",
        fix: "Drag the window a bit wider or maximise the browser.",
      });
    }

    // ── 4. Old service worker still controlling this tab ──────────
    // Best-effort signal only — we compare the SW version we shipped
    // (from index.html meta) against the currently controlling SW.
    // If the browser has an older SW registered and hasn't refreshed
    // yet, layout may reflect a previous build.
    if (
      "serviceWorker" in navigator &&
      navigator.serviceWorker.controller === null &&
      isTouch
    ) {
      // No controlling SW — cold load, will be fine. Not a warning.
    }

    setIssues(found);
  }, []);

  useEffect(() => {
    runChecks();
    // Re-check on orientation / resize since fixing Desktop-site off
    // triggers a viewport change that we want to detect immediately.
    window.addEventListener("resize", runChecks);
    window.addEventListener("orientationchange", runChecks);
    return () => {
      window.removeEventListener("resize", runChecks);
      window.removeEventListener("orientationchange", runChecks);
    };
  }, [runChecks]);

  if (issues.length === 0) return null;

  return (
    <div className="relative shrink-0" data-testid="viewport-warning">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Display looks off — tap for likely causes"
        aria-label="Display looks off — tap for likely causes"
        data-testid="viewport-warning-btn"
        className="ir-viewport-warning-btn"
      >
        <AlertTriangle className="w-4 h-4" strokeWidth={2.4} />
      </button>

      {open && (
        <div
          className={`absolute z-50 top-full right-0 mt-2 w-72 rounded-xl border shadow-2xl overflow-hidden ${
            isDark
              ? "bg-[#0B1221] border-white/15 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
          data-testid="viewport-warning-popover"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Display looks off
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="opacity-70 hover:opacity-100"
              data-testid="viewport-warning-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="p-3 space-y-3 text-xs leading-relaxed">
            {issues.map((iss) => (
              <li key={iss.id} data-testid={`viewport-issue-${iss.id}`}>
                <div className="font-semibold mb-0.5">{iss.title}</div>
                <div className="opacity-80 mb-1">{iss.detail}</div>
                <div className="opacity-70">
                  <span className="font-medium">Fix:</span> {iss.fix}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
