// notifications/notificationService.js
// Local notification service using device's native notification API
// No server required - all scheduling happens on-device
//
// v93 alarm reliability pass:
//   1. `startAlarmChecker` now catches PAST alarms whose fire time we
//      missed while the tab was closed / throttled / the phone was
//      asleep (up to 6 hours in the past). Previously we only caught
//      alarms 0-30 seconds in the FUTURE, which meant almost every
//      real-world alarm on mobile was missed.
//   2. The "already-notified" ledger is now persisted to localforage
//      (via localStorage as a lightweight sync mirror) so widening the
//      catch-up window doesn't cause a single alarm to re-fire on every
//      page reload.
//   3. Sounds are now short multi-note ringtones (not single beeps) and
//      are noticeably louder + longer so they can actually be heard on
//      a phone that's a few feet away.
//   4. We pre-warm a single shared `AudioContext` on the first user
//      gesture so alarm playback still works when the tab has been idle
//      (mobile browsers keep new contexts in `suspended` state until a
//      gesture unlocks them). See `primeAudio()`.

import { toast } from "sonner";
import StorageService from "../storage/storageService";

const NOTIFIED_LEDGER_KEY = "ir_alarm_notified_v1";
// How far in the past we're willing to still fire a missed alarm. If the
// user opens the app more than 6 hours after a scheduled time, the alarm
// is considered stale — a "you missed X" toast could be added later.
const MISSED_WINDOW_MS = 6 * 60 * 60 * 1000; // 6 h
// Forward window: catch alarms firing within the next 30 s so back-to-
// back interval ticks can't skip one that's between check cycles.
const FUTURE_WINDOW_MS = 30 * 1000;

// -------- persisted "already fired" ledger --------------------------------
function readNotifiedLedger() {
  try {
    const raw = localStorage.getItem(NOTIFIED_LEDGER_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return typeof obj === "object" && obj !== null ? obj : {};
  } catch { return {}; }
}
function writeNotifiedLedger(led) {
  try {
    // Cheap self-vacuum: drop entries older than 7 days so the ledger
    // doesn't grow forever.
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const next = {};
    for (const [k, v] of Object.entries(led)) {
      if (typeof v === "number" && v > cutoff) next[k] = v;
    }
    localStorage.setItem(NOTIFIED_LEDGER_KEY, JSON.stringify(next));
  } catch { /* ignore quota errors */ }
}

class NotificationService {
  constructor() {
    this.checkInterval = null;
    // Persistent per-alarm ledger: "main-<noteId>@<alarmISO>" -> notifiedTs
    this.notified = readNotifiedLedger();
    // Shared audio context — created lazily on first user gesture.
    this._audioCtx = null;
    this._primeBound = false;
  }

  // -------- permissions --------------------------------------------------
  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("Browser does not support notifications");
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  hasPermission() {
    return "Notification" in window && Notification.permission === "granted";
  }

  // -------- audio priming ------------------------------------------------
  // Attach a one-shot listener that creates + resumes the AudioContext on
  // the FIRST user gesture. Mobile Chrome / iOS Safari refuse to play
  // Web Audio out of a `suspended` context — priming here gives every
  // subsequent alarm a usable, running context.
  primeAudio() {
    if (this._primeBound || typeof window === "undefined") return;
    this._primeBound = true;
    const unlock = () => {
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        if (!this._audioCtx) this._audioCtx = new Ctx();
        if (this._audioCtx.state === "suspended") {
          this._audioCtx.resume().catch(() => {});
        }
        // Play a 1-sample silent buffer to fully unlock on iOS.
        const buf = this._audioCtx.createBuffer(1, 1, 22050);
        const src = this._audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(this._audioCtx.destination);
        src.start(0);
      } catch { /* ignore */ }
      window.removeEventListener("touchstart", unlock, true);
      window.removeEventListener("mousedown", unlock, true);
      window.removeEventListener("keydown", unlock, true);
    };
    window.addEventListener("touchstart", unlock, true);
    window.addEventListener("mousedown", unlock, true);
    window.addEventListener("keydown", unlock, true);
  }

  playSound(soundType = "bell") {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;

      // Reuse the primed context if we have one, otherwise create a fresh
      // one (may still be `suspended` on mobile if the user hasn't
      // interacted yet — the resume() below is our best effort).
      const context = this._audioCtx || new Ctx();
      if (!this._audioCtx) this._audioCtx = context;
      if (context.state === "suspended") {
        context.resume().catch(() => {});
      }

      // Multi-note ringtone patterns — each note is [freq, durationMs,
      // waveType]. Overall gain is ~0.6 which is comfortably audible on
      // a phone at half volume.
      const patterns = {
        bell:   [[880, 220, "sine"],     [660, 260, "sine"]],
        chime:  [[1320, 180, "triangle"],[1760, 180, "triangle"], [1320, 260, "triangle"]],
        // "signal" is the megaphone — should feel like an air-horn: two
        // punchy square-wave blasts with a sub-drop between them.
        signal: [[520, 240, "square"],   [780, 260, "square"],    [520, 320, "square"]],
      };
      const notes = patterns[soundType] || patterns.bell;

      let t = context.currentTime + 0.02;
      notes.forEach(([freq, durMs, wave]) => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = wave;
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(context.destination);
        const dur = durMs / 1000;
        // Small attack + release to avoid clicks and to feel more like a
        // real tone than a raw beep.
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.55, t + 0.015);
        gain.gain.setValueAtTime(0.55, t + dur - 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        osc.start(t);
        osc.stop(t + dur + 0.02);
        t += dur + 0.05; // small gap between notes
      });
    } catch (err) {
      console.error("Error playing sound:", err);
    }
  }

  triggerHaptic() {
    if ("vibrate" in navigator) {
      // Attention-grabbing S-O-S-ish pattern instead of a single buzz.
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  }

  async showNotification(title, options = {}) {
    if (!this.hasPermission()) return null;
    const body = {
      body: options.body || "",
      icon: options.icon || "/favicon.ico",
      badge: options.icon || "/favicon.ico",
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
    };
    // Mobile Chrome + installed PWAs forbid `new Notification(...)` —
    // trying to construct one throws `Illegal constructor. Use
    // ServiceWorkerRegistration.showNotification() instead.` Route
    // through the SW when it's available (which it is for us — we
    // register `/service-worker.js` at boot).
    try {
      if (typeof navigator !== "undefined" && navigator.serviceWorker && navigator.serviceWorker.ready) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && typeof reg.showNotification === "function") {
          await reg.showNotification(title, body);
          return null;
        }
      }
    } catch (err) {
      console.warn("SW notification failed, falling back to direct Notification:", err);
    }
    // Desktop fallback — still supported on Chrome/Firefox/Edge on macOS/Linux/Windows.
    try {
      return new Notification(title, body);
    } catch (err) {
      // Some contexts (mobile PWAs, iOS Safari without SW) refuse both.
      // Never let this bubble — the alarm check runs on a setInterval
      // inside a useEffect, so a throw here would tear down the tree.
      console.warn("Notification.showNotification() rejected:", err);
      return null;
    }
  }

  triggerAlarm(note) {
    // Every step of the alarm trigger is best-effort. A single failure
    // (browser blocks Notification, AudioContext refuses to resume,
    // vibrate() throws on desktop) must NOT propagate out of the
    // 15-second scheduler tick — otherwise it takes the whole React
    // tree down and produces the "black tar" screen users saw before.
    try {
      // Fire-and-forget: showNotification is async but we don't await
      // it (nothing here depends on the notification landing).
      this.showNotification(`Reminder: ${note.title}`, {
        body: note.content?.substring(0, 100) || "Time for your task!",
        tag: `alarm-${note.id}`,
        requireInteraction: true,
      });
    } catch (err) { console.warn("showNotification threw:", err); }

    try {
      if (note.alarm?.sound) this.playSound(note.alarm.sound);
    } catch (err) { console.warn("playSound threw:", err); }

    try {
      if (note.alarm?.haptic) this.triggerHaptic();
    } catch (err) { console.warn("triggerHaptic threw:", err); }

    // In-app snooze toast (only shows when app is focused). Skip for
    // synthetic per-event alarms (id contains "-") since they aren't
    // stored as top-level notes.
    try {
      const isEventAlarm = typeof note.id === "string" && note.id.includes("-") && note.id.split("-").length > 5;
      if (!isEventAlarm) {
        toast(`⏰ ${note.title}`, {
          description: note.content?.substring(0, 80) || "Time for your task!",
          duration: 20000,
          action: {
            label: "Snooze 5m",
            onClick: () => this.snoozeAlarm(note.id, 5),
          },
          cancel: {
            label: "1h",
            onClick: () => this.snoozeAlarm(note.id, 60),
          },
        });
      }
    } catch (err) { console.warn("toast threw:", err); }
  }

  async snoozeAlarm(noteId, minutes) {
    try {
      const existing = await StorageService.getNote(noteId);
      if (!existing || !existing.alarm) return;
      const newTime = new Date(Date.now() + minutes * 60 * 1000);
      const updated = {
        ...existing,
        alarm: { ...existing.alarm, datetime: newTime.toISOString(), enabled: true },
        updated_at: new Date().toISOString(),
      };
      await StorageService.saveNote(updated);
      // Clear the persisted markers so a fresh alarm can fire at the new time.
      const keyPrefix = `main-${noteId}@`;
      Object.keys(this.notified).forEach((k) => { if (k.startsWith(keyPrefix)) delete this.notified[k]; });
      writeNotifiedLedger(this.notified);
      toast.success(`Snoozed ${minutes < 60 ? minutes + " min" : (minutes / 60) + " hr"} — ${newTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch (err) {
      console.error("Snooze error:", err);
      toast.error("Could not snooze");
    }
  }

  // -------- alarm scheduler / checker ------------------------------------
  // Fires every 15 s. For each alarm we look at BOTH a small forward
  // window (upcoming alarm) AND a wide backward window (alarms we
  // missed while the tab was closed / phone asleep). The persisted
  // ledger prevents a caught-up alarm from firing again on the next tick.
  startAlarmChecker(getNotes) {
    if (this.checkInterval) clearInterval(this.checkInterval);

    // Make sure we're primed for audio ASAP.
    this.primeAudio();

    const check = () => {
      try {
        const now = Date.now();
        const notes = getNotes() || [];

        const maybeFire = (key, note) => {
          if (this.notified[key]) return; // already notified this exact schedule
          try {
            this.triggerAlarm(note);
          } catch (err) {
            console.warn("triggerAlarm threw:", err);
          }
          this.notified[key] = now;
          writeNotifiedLedger(this.notified);
        };

        notes.forEach((note) => {
          try {
            // Main alarm
            if (note.alarm?.enabled && note.alarm?.datetime) {
              const alarmMs = new Date(note.alarm.datetime).getTime();
              if (!Number.isFinite(alarmMs)) return;
              const diff = alarmMs - now;
              const key = `main-${note.id}@${note.alarm.datetime}`;
              if ((diff <= FUTURE_WINDOW_MS && diff >= -MISSED_WINDOW_MS)) {
                maybeFire(key, note);
              }
            }
            // Per-event alarms
            (note.events || []).forEach((evt) => {
              try {
                if (!evt.alarm_enabled || !evt.datetime) return;
                const t = new Date(evt.datetime).getTime();
                if (!Number.isFinite(t)) return;
                const diff = t - now;
                const key = `evt-${evt.id}@${evt.datetime}`;
                if (diff <= FUTURE_WINDOW_MS && diff >= -MISSED_WINDOW_MS) {
                  maybeFire(key, {
                    id: `${note.id}-${evt.id}`,
                    title: `${note.title} — ${evt.title}`,
                    content: evt.notes || note.title,
                    alarm: { sound: note.alarm?.sound || "bell", haptic: note.alarm?.haptic },
                  });
                }
              } catch (evtErr) {
                console.warn("Alarm check (event) threw:", evtErr);
              }
            });
          } catch (noteErr) {
            console.warn("Alarm check (note) threw:", noteErr);
          }
        });
      } catch (outerErr) {
        // Absolutely nothing must escape this scheduler — a throw here
        // would take the whole React tree down (which is exactly the
        // "black tar" crash the user hit before the ErrorBoundary).
        console.warn("Alarm check outer error:", outerErr);
      }
    };

    // Mobile browsers heavily throttle (or completely pause) setInterval
    // when the tab is backgrounded / the screen is off. When the user
    // unlocks and returns, `visibilitychange` fires FIRST, so we hook
    // that to force an immediate catch-up before the next 15 s tick.
    // Same for the BFCache `pageshow` event on iOS Safari.
    this._visHandler = () => { if (document.visibilityState === "visible") check(); };
    this._pageshowHandler = () => check();
    document.addEventListener("visibilitychange", this._visHandler);
    window.addEventListener("pageshow", this._pageshowHandler);
    // A `focus` event covers desktop tab switching too.
    this._focusHandler = () => check();
    window.addEventListener("focus", this._focusHandler);

    this.checkInterval = setInterval(check, 15000);
    check(); // Initial check
  }

  stopAlarmChecker() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    if (this._visHandler) {
      document.removeEventListener("visibilitychange", this._visHandler);
      this._visHandler = null;
    }
    if (this._pageshowHandler) {
      window.removeEventListener("pageshow", this._pageshowHandler);
      this._pageshowHandler = null;
    }
    if (this._focusHandler) {
      window.removeEventListener("focus", this._focusHandler);
      this._focusHandler = null;
    }
  }
}

export default new NotificationService();
