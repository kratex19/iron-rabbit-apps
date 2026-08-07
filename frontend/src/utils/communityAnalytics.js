/**
 * Lightweight anonymous analytics for the community featured tip.
 *
 * Batches events in memory and flushes them to `/api/community/events`:
 *   - every 5 seconds when there are pending events
 *   - immediately when >= 5 events queued
 *   - on visibility change (page hide) via sendBeacon for reliability
 *
 * No third-party tracking. `install_id` is a random UUID stored in
 * localStorage — no other identity or session state is captured.
 */

const STORAGE_KEY = "irr.install_id";
const FLUSH_INTERVAL_MS = 5000;
const FLUSH_THRESHOLD = 5;

let _queue = [];
let _timer = null;

function _uuid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function getInstallId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = _uuid();
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch (e) {
    return "anon";
  }
}

async function _flushNow(useBeacon = false) {
  if (_queue.length === 0) return;
  const base = process.env.REACT_APP_BACKEND_URL;
  if (!base) { _queue = []; return; }
  const events = _queue.splice(0, _queue.length);
  const url = `${base}/api/community/events`;
  const body = JSON.stringify({ events });
  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    try {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      return;
    } catch (e) { /* fall through to fetch */ }
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch (e) {
    // Silent — analytics is best-effort. Never surface a failure to the user.
  }
}

function _armTimer() {
  if (_timer) return;
  _timer = setTimeout(() => {
    _timer = null;
    _flushNow(false);
  }, FLUSH_INTERVAL_MS);
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") _flushNow(true);
  });
}

export function trackCommunityEvent(event, tipId) {
  if (!event || !tipId) return;
  _queue.push({
    event,
    tip_id: tipId,
    install_id: getInstallId(),
    at: new Date().toISOString(),
  });
  if (_queue.length >= FLUSH_THRESHOLD) _flushNow(false);
  else _armTimer();
}
