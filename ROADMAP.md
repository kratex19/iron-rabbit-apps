# Iron Rabbit — Product Roadmap

## Guiding constraint
**Iron Rabbit is a free, offline-first, phone-downloadable app.** No feature that requires a network connection to work will be added to this version. A future paid/online tier may live at a separate product level, but this app must remain 100% functional offline.

---

## Deferred: Native-only Quick Access features

The following features were designed by the user but require compiling Iron Rabbit as a real Android APK / iOS IPA via Capacitor. They remain **offline-capable** — they just aren't achievable inside a browser-based PWA. They are archived here until a native Capacitor build is compiled (see `/app/CAPACITOR_SETUP.md`).

### 1. Home Screen Widget (Android + iOS)
- Displays: Favorite notes, Recent notes, Emergency notes, Running timers, Daily checklist
- Android — implement via `AppWidgetProvider` + `RemoteViews`, backed by Capacitor plugin that reads from IndexedDB via a WebView bridge or shared preferences.
- iOS — implement via WidgetKit extension. Data is written to a shared App Group by the main app so the widget can read it while the app is closed.
- Refresh cadence: manual on note edit + every 30 minutes.

### 2. Android Quick Settings Tile
- Implement `TileService` that launches the app on tap.
- Requires an Android-only Capacitor plugin (~40 lines Kotlin).
- Users add the tile once from Android's quick-settings edit screen — instructions shown in the Quick Access wizard.

### 3. Persistent Timer Notification (Android)
- When any timer is running, show an "ongoing" notification (`setOngoing(true)`) with:
  - Timer name + remaining time
  - Pause, Resume, Stop action buttons
  - Tap opens directly to that timer
- Requires a `ForegroundService` + `NotificationCompat.Builder` — Android native.
- iOS equivalent: Live Activities (iOS 16+) via ActivityKit.

### 4. Lock Screen Support
- Android: Notification appears on lock screen automatically when using notifications (public visibility flag).
- iOS: Live Activities show on lock screen (iOS 16+). Older iOS uses local notifications.

---

## Deferred: Nice-to-haves that need reconsideration

- **LLM-powered note translation on demand** — deferred: Emergent LLM Key is available but calling it requires network. Keep offline-first behavior; users can still add offline i18n strings.
- **Cloud sync between devices** — deferred to a future paid tier. Explicitly out of scope for the free offline version.
- **JSON Export / Import full backup** — offline-compatible. P2 — active roadmap item.
- **Tags + multi-tag filter chips** — offline. P2.
- **Image attachments to notes (base64/Blob in IndexedDB)** — offline. P2.
- **Streaks for recurring notes + Weekly stats card** — offline. P2.
- **Auto-purge Trash by retention** — currently manual-only per user preference; auto could be added later behind a Setting.

---

## Shipped in the free offline PWA (as of 2026-02-27)
See `/app/memory/PRD.md` for the full changelog. Highlights:
- Icon + list views, drag & drop reordering, multi-select Batch Studio
- 25 note colors (5 solids + 20 gradients)
- Local PIN + Panic Mode + Auto-lock
- 25 offline languages via i18next
- Archive & Trash lifecycle with retention setting
- Smart Batch Mode (Move vs Copy)
- Persistent Undo pill
- iOS-Notes-style swipe-to-select on list rows
- Quick Access — Pin to Home Screen, First Launch Wizard, Settings toggle
