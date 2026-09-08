import React, { useEffect, useState, useCallback } from "react";
import StorageService from "../storage/storageService";
import { isInFocusWindow } from "../notifications/notificationService";
import FocusStatusChip from "../notes/FocusStatusChip";

/**
 * GlobalFocusChip — top-level Focus pill that appears on ALL routes
 * (not just the home / Notes app). Reads settings directly from
 * IndexedDB via StorageService, listens for `ir:settings-changed`
 * custom events for instant updates, and ticks every 30s so scheduled
 * windows and Focus-Now timers flip live.
 *
 * Positioned as a fixed overlay so it survives route changes without
 * needing each screen to embed the chip itself. Sits under the
 * status bar with pointer-events unlocked only on the pill so the
 * rest of the page is untouched.
 */
export default function GlobalFocusChip() {
  const [settings, setSettings] = useState(null);
  const [, setTick] = useState(0);
  // Position mode — swaps with the presence of body.ir-tile-open which
  // full-screen tiles (FullScreenNote today, other overlays later) add
  // while open. Off → dock the chip under the "Iron Rabbit" logo where
  // it fits inside the header without overlapping content. On → float
  // it top-right so it doesn't cover the fullscreen editor area.
  const [tileOpen, setTileOpen] = useState(
    typeof document !== "undefined" && document.body.classList.contains("ir-tile-open")
  );
  // Measured header height. Mobile has a hero banner + icon strip so
  // the header can be 200-300px tall; desktop is ~90-120px. Hard-
  // coding `top-[74px]` clipped the chip into the icon strip on
  // mobile/landscape. We ResizeObserver the real header and set our
  // top exactly at `header.bottom + 8px` so the chip always sits in
  // the safe zone directly under the header on every viewport.
  const [headerBottom, setHeaderBottom] = useState(76);

  const load = useCallback(async () => {
    try {
      const s = await StorageService.getSettings();
      setSettings(s);
    } catch { /* noop — first boot might race with the store init */ }
  }, []);

  useEffect(() => {
    load();
    const onChange = (e) => {
      if (e && e.detail) setSettings(e.detail);
      else load();
    };
    window.addEventListener("ir:settings-changed", onChange);
    const iv = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    // Watch <body> for the `ir-tile-open` class so we can move the pill
    // out of the way when a fullscreen editor opens without needing
    // any prop plumbing from those surfaces.
    const bodyObserver = new MutationObserver(() => {
      setTileOpen(document.body.classList.contains("ir-tile-open"));
    });
    bodyObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });

    // Measure the real header height so the chip always docks JUST
    // below it — safe across portrait / landscape / tablet / desktop.
    // Falls back to 76px when the header hasn't rendered yet.
    const measure = () => {
      const header = document.querySelector(".ir-app-shell > header, header.header-compact");
      if (!header) return;
      const rect = header.getBoundingClientRect();
      setHeaderBottom(Math.round(rect.bottom));
    };
    measure();
    // Kick a couple of rAF-delayed measures so the initial hero
    // image / URL row landing gets reflected. The header height on
    // portrait mobile depends on the hero banner image loading, so
    // one immediate measure alone can leave the chip clipped inside
    // the icon strip.
    let raf1, raf2;
    raf1 = requestAnimationFrame(() => {
      measure();
      raf2 = requestAnimationFrame(measure);
    });
    // Window `load` fires after images finish downloading — one more
    // safety net for the hero banner case.
    const onLoad = () => measure();
    if (document.readyState !== "complete") {
      window.addEventListener("load", onLoad);
    }
    // React can mount `.ir-app-shell` AFTER this effect runs. Watch
    // the body's child list so we can attach the header ResizeObserver
    // once it finally arrives.
    let ro;
    const attachHeaderObserver = () => {
      const header = document.querySelector(".ir-app-shell > header, header.header-compact");
      if (header && ro) {
        try { ro.observe(header); } catch { /* already observed */ }
      }
    };
    try {
      ro = new ResizeObserver(measure);
      ro.observe(document.body);
      attachHeaderObserver();
    } catch { /* Safari <13.4 fallback */ }
    const domObserver = new MutationObserver(() => {
      attachHeaderObserver();
      measure();
    });
    domObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("ir:settings-changed", onChange);
      clearInterval(iv);
      bodyObserver.disconnect();
      if (ro) ro.disconnect();
      domObserver.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("load", onLoad);
      if (raf1) cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [load]);

  if (!settings) return null;

  const untilRaw = settings.focus_until;
  const until = typeof untilRaw === "number" && Number.isFinite(untilRaw) && Date.now() < untilRaw
    ? untilRaw
    : null;
  const manual = !!settings.focus_mode;
  const scheduleActive = isInFocusWindow(new Date(), settings.focus_schedule);
  const active = manual || !!until || scheduleActive;
  if (!active) return null;

  // Home-layout placement is now handled INLINE inside `AppHeader.jsx`
  // (chip renders directly to the left of the rusty-rabbit logo so it
  // sits in the header flex row instead of overlapping the icon strip
  // or search bar on mobile/landscape). This global overlay ONLY takes
  // over when a fullscreen tile (Expanded Text) is open, where the
  // header itself is hidden — the top-right float stays perfect there.
  if (!tileOpen) return null;

  const cancel = async () => {
    // Kill manual + timer. Schedule keeps working — that's a Settings
    // action, not a header action.
    await StorageService.saveSettings({
      ...settings,
      focus_mode: false,
      focus_until: 0,
    });
  };

  return (
    <div
      className="fixed top-2 right-2 z-[70] pointer-events-none"
      data-testid="global-focus-chip-wrap"
    >
      <div className="pointer-events-auto">
        <FocusStatusChip
          status={{ active, manual, until, scheduleActive }}
          onCancel={cancel}
        />
      </div>
    </div>
  );
}
