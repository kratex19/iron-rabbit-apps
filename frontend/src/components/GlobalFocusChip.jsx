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
    return () => {
      window.removeEventListener("ir:settings-changed", onChange);
      clearInterval(iv);
      bodyObserver.disconnect();
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
      className={
        tileOpen
          // Fullscreen tile is open (e.g. Expanded Text) — float top-
          // right so the chip stays visible without overlapping the
          // editor's own toolbar.
          ? "fixed top-2 right-2 z-[70] pointer-events-none"
          // Default home layout: dock the chip UNDER THE LOGO (the
          // rusted rabbit icon on the top-right of the header), not
          // under the title text. Uses the same horizontal padding
          // variable the header uses for its content edges so the
          // chip's right edge is precisely aligned with the logo's
          // right edge on every viewport width.
          : "fixed top-[74px] z-[70] pointer-events-none"
      }
      style={tileOpen ? undefined : { right: "var(--ir-container-pad-x, 1rem)" }}
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
