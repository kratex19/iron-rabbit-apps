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
    return () => {
      window.removeEventListener("ir:settings-changed", onChange);
      clearInterval(iv);
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
