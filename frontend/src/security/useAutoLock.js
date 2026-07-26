import { useEffect, useRef, useState, useCallback } from "react";
import SecurityService from "./SecurityService";

/**
 * Runs the app-lock lifecycle:
 * - Locks on cold start if `lockOnLaunch` is true and a method is set
 * - Starts a background timer on `visibilitychange` (hidden) and locks after
 *   the configured auto-lock ms if `lockOnBackground` is true
 * - Applies a blur overlay when the tab is hidden and `hideInRecents` is true
 *   (best-effort Recent-Apps hiding for the PWA)
 */
export default function useAutoLock() {
  const [locked, setLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const timerRef = useRef(null);
  const hiddenAtRef = useRef(null);
  const configRef = useRef({ autoLockMs: 60_000, toggles: null, method: "none" });

  const refreshConfig = useCallback(async () => {
    const [method, autoLockMs, toggles] = await Promise.all([
      SecurityService.getMethod(),
      SecurityService.getAutoLockMs(),
      SecurityService.getToggles(),
    ]);
    configRef.current = { method, autoLockMs, toggles };
  }, []);

  // Initial boot — decide whether to start locked
  useEffect(() => {
    (async () => {
      await refreshConfig();
      const { method, toggles } = configRef.current;
      if (method !== "none" && toggles?.lockOnLaunch) setLocked(true);
      setReady(true);
    })();
  }, [refreshConfig]);

  // Handle background / foreground
  useEffect(() => {
    const onVisibility = async () => {
      await refreshConfig();
      const { method, autoLockMs, toggles } = configRef.current;
      if (method === "none" || !toggles?.lockOnBackground) return;

      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        // If autoLockMs === 0, lock immediately
        if (autoLockMs === 0) {
          setLocked(true);
          return;
        }
        // If autoLockMs === -1 ("Never"), don't auto-lock
        if (autoLockMs < 0) return;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setLocked(true), autoLockMs);
      } else {
        // Returned to foreground — if we already scheduled but not yet fired,
        // check if we've been away longer than the threshold
        clearTimeout(timerRef.current);
        const away = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
        hiddenAtRef.current = null;
        if (autoLockMs >= 0 && away >= autoLockMs) setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(timerRef.current);
    };
  }, [refreshConfig]);

  // Blur overlay when tab is hidden (PWA best-effort for "hide in Recent Apps")
  useEffect(() => {
    const applyBlur = async () => {
      const t = configRef.current.toggles;
      if (!t?.hideInRecents) {
        document.body.style.removeProperty("filter");
        return;
      }
      document.body.style.filter = document.hidden ? "blur(24px)" : "";
    };
    document.addEventListener("visibilitychange", applyBlur);
    return () => document.removeEventListener("visibilitychange", applyBlur);
  }, []);

  const unlock = useCallback(() => setLocked(false), []);
  const lockNow = useCallback(() => setLocked(true), []);
  const rescheduleAfterSettingsChange = useCallback(() => refreshConfig(), [refreshConfig]);

  return { locked, ready, unlock, lockNow, refresh: rescheduleAfterSettingsChange };
}
