# Iron Rabbit — Focus Mode: Complete Guide

_A calm, uninterrupted way to work, sleep and unplug — without silencing your device._

---

## What is Focus Mode?

Focus Mode is Iron Rabbit's built-in quiet-time system. When Focus is active, the app **silences its own alarm pop-ups, sounds and haptics** — but your phone's normal notifications and calls continue to work. It's designed for three moments in your day:

- **Deep work sessions** — no reminder pop-ups jumping onto your screen while you're concentrating
- **Sleep** — your recurring morning alarms stay armed and ready for tomorrow, but overnight reminders don't wake you
- **Downtime** — evenings, meals, moments away from your to-do list

Nothing is deleted. Nothing is missed. Alarms that would have fired during Focus are simply marked as "silenced" and available in your history the moment Focus ends.

---

## Three Ways to Turn Focus On

There's a **Focus chip** in the top-right of every screen (right beside the rusty rabbit logo on the home view, floating top-right when you're inside an Expanded Text note). The chip has two visual states:

- **OFF** — a dim grey pill labelled `Focus · off` with a bell icon
- **ON** — a solid indigo pill labelled `Focus · ON` / `Focus · 45m left` / `Focus · scheduled` with a bell-off icon and a small × cancel button

### Method 1 — Quick Timer (single tap)

Tap the OFF pill. A small menu appears:

| Option | What it does |
|---|---|
| **30 minutes** | Focus turns on for exactly half an hour, then turns off automatically |
| **1 hour** | Focus for one hour |
| **2 hours** | Focus for two hours |
| **Until sunrise** | Focus stays on until sunrise at your current location tomorrow morning (uses the same location as your weather widget) |
| **Turn ON (indefinite)** | Focus stays on until you manually cancel it |

Pick one — the pill instantly flips to its ON state and starts counting down. Tap the × on the pill to cancel early at any time.

### Method 2 — Nightly Schedule (automatic every night)

Open **Settings → Focus Mode → Nightly Schedule**. You can set:

- **Enabled per day** — pick which nights the schedule should run (Sunday–Saturday individually). Weekdays only? Weekends only? All seven? Your call.
- **Start time** — the moment Focus should switch itself on (e.g. 22:00)
- **End time** — the moment Focus should switch itself off (e.g. 06:30 next morning)
- **Crosses midnight** — the schedule handles overnight windows automatically. `22:00 → 06:30` means Focus is on from 10 PM tonight until 6:30 AM tomorrow

When a scheduled window is active, the Focus pill shows `Focus · scheduled` in indigo. You cannot cancel the schedule from the pill (that would be a Settings action) — but you _can_ layer a manual override on top: tap the pill's × when scheduled, and you'll get a one-time exception for tonight only. Tomorrow the schedule runs as usual.

### Method 3 — Manual Toggle (Settings)

Open **Settings → Focus Mode → Focus Mode** and flip the master switch. This is functionally identical to picking "Turn ON (indefinite)" from the Focus chip menu. Stays on until you flip it off.

---

## What Actually Gets Silenced?

When Focus is active, the following in-app things go quiet:

- **Alarm pop-up cards** — the usual full-screen "Time's up!" card doesn't show. The alarm is logged silently.
- **Alarm sounds** — no ringing, chiming or vibrating from the app.
- **Haptic feedback** — long-press pulses, drag confirmations, etc. stay silent.
- **Toast notifications** — the small "Saved!" / "Reminder set for 3 PM" pop-ups are suppressed.

The following are **NOT** affected:

- Your phone's system notifications from other apps
- Incoming calls and texts
- Alarms you scheduled in your phone's native Clock app
- Anything happening outside of Iron Rabbit

Focus is a **library silence**, not a **phone silence**.

---

## Night Visuals — Pair Focus with a Calmer Look

Under **Settings → Focus Mode → Night Visuals**, you can attach a visual "night skin" that applies automatically whenever Focus is active. Snapshot your favourite dim wallpaper + reduced brightness + warmer text tint, save it, and every time Focus turns on the app will silently switch to that visual state. When Focus ends, your daytime look returns.

Common combinations:

- **Sleeping** — pitch-black background, brightness 10%, extra-warm text tint
- **Deep work** — deep navy background, medium brightness, cool text tint (helps concentration)
- **Reading** — cream wallpaper, brightness 60%, warm text tint (easy on the eyes)

---

## Focus + Alarms — What Happens Tomorrow?

Focus Mode never disables your alarms. It only silences the _delivery_ of alarms that fire _during_ the Focus window. Two important behaviours:

1. **Recurring alarms** — if you have "Water break every 30 min" and Focus is on for 2 hours, that alarm fires 4 times silently. When Focus ends, the alarm resumes ringing normally at its next scheduled time.

2. **One-shot alarms** — if you set "Call Mum at 8 PM" and Focus is on at 8 PM, the alarm fires silently at 8 PM and is marked complete. **It does not re-fire when Focus ends.** If you want to be reminded again, set another alarm.

A history strip in **Settings → Focus Mode → Silenced Alarms** shows every alarm that Focus intercepted in the last 24 hours, so you can catch up on what you missed with one glance.

---

## Common Recipes

### "I want to sleep from 10 PM to 7 AM every night"

1. Settings → Focus Mode → Nightly Schedule
2. Enable all seven days
3. Start: `22:00` · End: `07:00`
4. Under Night Visuals, save a dim/dark snapshot

Every night at 10 PM the app silences itself; every morning at 7 AM it wakes up bright and ready.

### "I want a distraction-free 90-minute work sprint right now"

1. Tap the Focus chip
2. Pick **1 hour** (or **2 hours** if you're feeling ambitious)
3. Work

Focus turns itself off automatically when your sprint ends. If you finish early, tap the × on the pill to cancel manually.

### "Weekend brunch — no reminders 10 AM to 2 PM Saturdays"

1. Settings → Focus Mode → Nightly Schedule
2. Enable **Saturday only**
3. Start: `10:00` · End: `14:00`
4. Save

Every Saturday your Iron Rabbit stays quiet during brunch. Weekdays remain business as usual.

### "I'm heading into a meeting — no notifications until it ends"

1. Tap the Focus chip
2. Pick **Turn ON (indefinite)**
3. When the meeting ends, tap the ×

Simple. No timer to guess.

---

## Troubleshooting

**"The Focus pill is orange/dim but no menu opens when I tap it"**

The menu is portaled to `document.body` at very high z-index. If it's not showing, try closing and reopening the Iron Rabbit tab/app fully — the service-worker cache might be serving an older bundle. On phones, swipe the app away from recents and reopen.

**"I set a schedule for 22:00–06:30 but it didn't activate at 10 PM"**

Two checks:

1. Confirm the current day-of-week toggle is on (Settings → Focus Mode → Nightly Schedule → check the day you're on)
2. Confirm your device clock time zone is correct — schedules use local time

**"An alarm rang during Focus — why?"**

Focus silences alarms only for the **in-app** delivery layer. If you allowed the app to send system push notifications and one arrived through the OS channel while Focus was on, that's a browser/OS-level fallback that Focus can't control. Turn off push notifications in your device settings if you want absolute quiet.

**"Can I set multiple different Focus windows in one day?"**

Currently one nightly schedule window per day, plus any number of manual-timer overrides layered on top. If you need a lunch window and a dinner window on the same day, use two Quick Timer sessions.

---

## Quick Reference Card

| I want to… | Do this |
|---|---|
| Turn Focus on for 30 minutes | Tap Focus chip → **30 minutes** |
| Turn Focus on until sunrise | Tap Focus chip → **Until sunrise** |
| Turn Focus on indefinitely | Tap Focus chip → **Turn ON (indefinite)** |
| Cancel Focus now | Tap × on the indigo pill |
| Auto-Focus every night 22:00–06:30 | Settings → Focus Mode → Nightly Schedule |
| See what alarms Focus silenced | Settings → Focus Mode → Silenced Alarms |
| Dim the app while Focus is on | Settings → Focus Mode → Night Visuals |

---

_Iron Rabbit · Focus Mode Guide · Version 1.0_
_Questions or feedback? Tap the chat icon in the app or visit ironrabbit.app/support_
