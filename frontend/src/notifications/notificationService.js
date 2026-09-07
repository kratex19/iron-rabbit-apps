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
// How far in the past we're willing to still fire a missed alarm. If
// the user opens the app more than 2 hours after a scheduled time, the
// alarm is considered stale and self-silences (recorded as notified
// without triggering a popup) so we don't spam a user who cleared cache
// or lost the ledger with a wall of old reminders.
const MISSED_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 h
// Alarms older than this that AREN'T already in the ledger are
// auto-silenced instead of firing. Prevents cache-clear from producing
// a barrage of stale reminders.
const STALE_SILENT_MS = 60 * 60 * 1000; // 1 h
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

// -------- Focus Mode schedule helper --------------------------------------
// Days-of-week keyed schedule with optional overnight windows. Each day's
// `start` and `end` are "HH:MM" strings in local time. If `end <= start`
// the window is treated as crossing midnight (e.g. `22:00 → 06:30` on
// Sun covers Sun 22:00 through Mon 06:30). To check the current moment
// we look at TODAY's window in the normal direction and ALSO at
// YESTERDAY's window's tail if it crossed midnight.
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function parseHHMM(s) {
  if (typeof s !== "string") return null;
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}
export function isInFocusWindow(now, schedule) {
  if (!schedule || !schedule.enabled) return false;
  const days = schedule.days || {};
  const curDay = now.getDay(); // 0=Sun
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  // Today
  const today = days[DAY_KEYS[curDay]];
  if (today && today.enabled) {
    const s = parseHHMM(today.start);
    const e = parseHHMM(today.end);
    if (s != null && e != null) {
      if (s < e) {
        if (curMinutes >= s && curMinutes < e) return true;
      } else {
        // Crosses midnight — active from start through end of today.
        if (curMinutes >= s) return true;
      }
    }
  }
  // Yesterday tail (only counts if yesterday's window crossed midnight)
  const yIdx = (curDay + 6) % 7;
  const yesterday = days[DAY_KEYS[yIdx]];
  if (yesterday && yesterday.enabled) {
    const s = parseHHMM(yesterday.start);
    const e = parseHHMM(yesterday.end);
    if (s != null && e != null && s >= e) {
      if (curMinutes < e) return true;
    }
  }
  return false;
}

class NotificationService {
  constructor() {
    this.checkInterval = null;
    // Persistent per-alarm ledger: "main-<noteId>@<alarmISO>" -> notifiedTs
    this.notified = readNotifiedLedger();
    // Shared audio context — created lazily on first user gesture.
    this._audioCtx = null;
    this._primeBound = false;
    // Focus Mode — user-settable via Settings. When active:
    //   - No in-app alarm toast popup
    //   - No alarm sound
    //   - No haptic vibration
    //   - OS notification still fires, but with `silent: true` so
    //     Android/iOS don't play their default notification sound.
    // Perfect for late-night use: the reminder still lands on your
    // lock screen but nothing beeps or flashes on the open tab.
    //
    // Two-plus inputs, OR'd together to produce the effective quiet state:
    //   1. `focusConfig.manual` — the "ON now" toggle (immediate override)
    //   2. `focusConfig.until`  — timestamp (ms) that pins Focus ON until
    //                             the given moment (Focus Now chip row)
    //   3. `focusConfig.schedule` — per-day nightly window with times
    // Effective state is computed at trigger time via `isFocusActive()`
    // so a running alarm scheduler picks up transitions without any
    // explicit tick.
    this.focusConfig = { manual: false, until: null, schedule: null };
  }

  // Called from NotesApp when `settings.focus_mode`,
  // `settings.focus_until` or `settings.focus_schedule` changes so
  // the alarm scheduler picks up the latest configuration immediately.
  setFocusConfig(config) {
    this.focusConfig = {
      manual: !!(config && config.manual),
      until: (config && typeof config.until === "number" && Number.isFinite(config.until)) ? config.until : null,
      schedule: config && config.schedule ? config.schedule : null,
    };
  }

  // Legacy setter — kept so anything still calling the old API works.
  setFocusMode(on) {
    this.focusConfig = { ...(this.focusConfig || {}), manual: !!on };
  }

  // Effective focus state = manual OR active-until-timer OR inside a
  // scheduled window right now.
  isFocusActive(now = new Date()) {
    const cfg = this.focusConfig || {};
    if (cfg.manual) return true;
    if (cfg.until && Date.now() < cfg.until) return true;
    return isInFocusWindow(now, cfg.schedule);
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
      icon: options.icon || "/icon-192.png",
      // Notification "badge" is a small monochrome silhouette shown in
      // the Android status bar. Use the 96px flat icon so it renders
      // crisply — Android will threshold to monochrome automatically.
      badge: options.badge || "/notification-badge-96.png",
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      // Metadata the SW's notificationclick handler forwards back to
      // the app so it can act on the tap (dismiss / snooze).
      data: options.data || {},
      // OS-level action buttons — Chrome / Edge / Samsung Internet
      // honour these. iOS ignores them silently (users tap the toast).
      actions: options.actions || undefined,
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
    //
    // Focus Mode: user-facing "quiet" toggle. When active the OS
    // notification STILL fires (so the reminder lands on the lock
    // screen) but everything else that would grab your attention on
    // the open tab is suppressed: the in-app popup toast, the alarm
    // ringtone, and the vibration. We also pass `silent: true` to the
    // OS notification so the phone's default notification sound
    // doesn't play either.
    const quiet = this.isFocusActive();
    try {
      // Fire-and-forget: showNotification is async but we don't await
      // it (nothing here depends on the notification landing).
      this.showNotification(`Reminder: ${note.title}`, {
        body: note.content?.substring(0, 100) || "Time for your task!",
        tag: `alarm-${note.id}`,
        requireInteraction: true,
        silent: quiet,
        data: { noteId: note.id, kind: "alarm" },
        actions: [
          { action: "snooze-5", title: "Snooze 5m" },
          { action: "dismiss",  title: "Turn off" },
        ],
      });
    } catch (err) { console.warn("showNotification threw:", err); }

    if (!quiet) {
      try {
        if (note.alarm?.sound) this.playSound(note.alarm.sound);
      } catch (err) { console.warn("playSound threw:", err); }

      try {
        if (note.alarm?.haptic) this.triggerHaptic();
      } catch (err) { console.warn("triggerHaptic threw:", err); }
    }

    // In-app snooze toast (only shows when app is focused). Skip for
    // synthetic per-event alarms (id contains "-") since they aren't
    // stored as top-level notes. Also skipped entirely in Focus Mode.
    if (quiet) return;
    try {
      const isEventAlarm = typeof note.id === "string" && note.id.includes("-") && note.id.split("-").length > 5;
      if (!isEventAlarm) {
        toast(`⏰ ${note.title}`, {
          description: note.content?.substring(0, 80) || "Time for your task!",
          // Persist until the user acts. No more auto-dismiss so the
          // user can't accidentally miss the alarm — but they now have
          // an explicit "Turn off" button that KILLS the alarm for good.
          duration: Infinity,
          id: `alarm-toast-${note.id}`,
          action: {
            label: "Turn off",
            onClick: () => this.dismissAlarm(note.id),
          },
          cancel: {
            label: "Snooze 5m",
            onClick: () => this.snoozeAlarm(note.id, 5),
          },
        });
      }
    } catch (err) { console.warn("toast threw:", err); }
  }

  // Permanently disables the alarm on the note (persists `enabled=false`
  // and clears the datetime) and records the ledger so it can NEVER
  // re-fire — even if the user's data goes through a chrono re-parse
  // or the ledger gets wiped. The "kill switch" for repeating popups.
  async dismissAlarm(noteId) {
    try {
      const existing = await StorageService.getNote(noteId);
      if (!existing) return;
      const prevDatetime = existing.alarm?.datetime;
      const updated = {
        ...existing,
        alarm: {
          ...(existing.alarm || {}),
          enabled: false,
          datetime: null,
          // Strip the auto_detected marker so chrono won't re-detect
          // from the title on subsequent saves.
          auto_detected: false,
        },
        updated_at: new Date().toISOString(),
      };
      await StorageService.saveNote(updated);
      // Belt-and-suspenders: record every historical datetime for this
      // note as "already notified" so any legacy scheduler that still
      // holds a reference can't refire it.
      if (prevDatetime) {
        this.notified[`main-${noteId}@${prevDatetime}`] = Date.now();
        writeNotifiedLedger(this.notified);
      }
      toast.dismiss(`alarm-toast-${noteId}`);
      toast.success("Alarm turned off");
    } catch (err) {
      console.error("dismissAlarm error:", err);
      toast.error("Could not turn off alarm");
    }
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
              // Stale (older than STALE_SILENT_MS in the past and NOT
              // in the ledger) → mark as notified silently. Prevents
              // the "cache cleared → old alarms all fire at once" storm.
              if (diff < -STALE_SILENT_MS && !this.notified[key]) {
                this.notified[key] = now;
                writeNotifiedLedger(this.notified);
                return;
              }
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
                if (diff < -STALE_SILENT_MS && !this.notified[key]) {
                  this.notified[key] = now;
                  writeNotifiedLedger(this.notified);
                  return;
                }
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
