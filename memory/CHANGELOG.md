# Iron Rabbit Changelog

## 2026-02-08 (session 6) — Encrypted Backups + Auto-Schedule + Assistant Memory ✅

### Encrypted backups (client-side AES-256-GCM)
- New helpers in `restaurantsService.js`: `encryptPayload`, `decryptPayload`, `isEncryptedPayload`.
- PBKDF2-SHA256 (200 000 iterations) → AES-256-GCM with random 16-byte salt + 12-byte IV. Envelope: `{app, encrypted:true, kdf, iterations, salt, iv, ciphertext, meta}`.
- Backup modal has a new "Encrypt backups" toggle + passphrase input. Exports produce `.rgenc` files instead of `.json`.
- Restore auto-detects encrypted files and shows a decrypt panel before preview. Wrong passphrase → clear toast.
- WebDAV push/pull + Google Drive push/pull all honor encryption toggle.

### Auto-scheduled backups
- New schedule panel: Off / Weekly / Monthly + target Local / WebDAV / Google Drive.
- Config persisted in `localStorage.rg_backup_schedule`. Optional passphrase field encrypts auto-backups.
- `runScheduledBackupIfDue()` runs at app boot from `NotesApp.jsx` — silently pushes if the interval has elapsed. Success toast on completion.
- Google Drive path is skipped silently (needs interactive OAuth consent).

### Smart Assistant conversation persistence
- New `rg_chat_history` store in `restaurantsService.js` with `listChatHistory`, `appendChatMessage`, `clearChatHistory`. Rolling cap of 500 messages to prevent IndexedDB bloat.
- `RestaurantSmartAssistantModal` loads prior turns on mount, persists each user/assistant message immediately. Reset clears both UI and store.
- Description updated to "history is saved locally on this device only".
- `chat_history` included in `exportAll` / `importAll` so backups carry conversations too.

### Testing
- Iteration 34: 100% pass (3/3 backend pytest, 12/12 frontend Playwright). Zero console errors, zero regressions.

---


## 2026-02-08 (session 5) — Refactor + A11y + Cloud Sync ✅

### Refactor — Phase 3/4/5/6 moved into `/notes/rg/`
- All Restaurants Galore workspaces now live in one folder: `/app/frontend/src/notes/rg/`
- `RestaurantWorkspacesP3.jsx` (Phase 3), `P4`, `P5`, `P6` all moved. Import paths inside them updated (`../../storage/*`, `./PhotoAttachPanel`).
- `AppModals.jsx` + `RestaurantDirectoryModal.jsx` updated to import from `./rg/*`.
- Result: cleaner directory structure, zero behavioral change.

### A11y sweep
- **Star widgets** — every 5-star button now has `aria-label="Rate 3 of 5 for Food"` (per-metric) + `aria-pressed` + `focus-visible:ring-2 ring-amber-400`.
- **Icon-only buttons** — Python regex sweep injected `aria-label` on every Edit/Delete/Cook/Dial button across all workspace files. Values are contextual: "Edit recipe", "Delete family", "Log cook recipe", "Call delivery", etc.
- **Launcher tiles** — added `focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2` + `aria-label` on each of the 21 tiles.

### Backup 30-day nudge
- `daysSinceLastBackup()` reads `localStorage.rg_last_backup_at`.
- Dashboard `launcher-backup` shows an amber badge: `!` when never backed up, or `<N>d` when >30 days stale.
- All export paths (local download, WebDAV push, Google Drive push) write the timestamp on success.
- Backup modal Export card also shows "Last: N days ago" and a small stale banner (data-testid `backup-stale-nudge`) when overdue.

### WebDAV cloud sync
- One-time config: URL + username + app-password + optional path, all stored in `localStorage.rg_webdav_cfg` (never sent to Emergent).
- **Push** (HTTP PUT) uploads the full JSON backup with Basic auth.
- **Pull** (HTTP GET) fetches and loads it into the Restore preview → user chooses Merge or Replace.
- Works with Nextcloud, ownCloud, Fastmail Files, and any spec-compliant WebDAV server.
- All rendered inside a new `webdav-panel` in the Backup modal.

### Google Drive cloud sync
- Uses Google Identity Services (`accounts.google.com/gsi/client`) token flow with `drive.file` scope (Google Drive only sees files this app creates — never anything else).
- Config: user pastes their own Google Cloud OAuth Client ID (stored in `localStorage.rg_gdrive_client_id`). Instructions inline in the modal.
- **Push** (multipart upload) creates or PATCHes a single file `iron-rabbit-backup.json` in the user's Drive.
- **Pull** searches for the file by name, downloads with `alt=media`, and loads into Restore preview.
- Rendered inside a new `gdrive-panel` with the official multi-color Drive logo.

### Testing
- `iteration_33.json` — All 11 assertions PASS. Zero React warnings, zero console errors. Refactor validated (21 modals still open).

---

## 2026-02-08 (session 4) — Batches A + B + C Complete ✅
See earlier entries.

## Prior sessions
See earlier entries + `PRD.md` for original problem statement.

### Batch A — Recipe polish
- **"Cook this again"** — one-tap flame button on each recipe row (`recipe-cook-<id>`). Increments `cook_count`, records `last_cooked_at`, and shows a live "cooked N× · last: <time>" badge.
- **Recipe photo attach** — attach step-by-step photos to any saved recipe (client-side JPEG resize to ≤1200px @ 85%).

### Batch B — Small polish
- **Coupon photo attach** — snap a photo of the physical coupon so you never lose it. Photos stored with `coupon_id`.
- **Review photo attach** — attach photos to reviews via `review_id`.
- **Delivery driver tap-to-call** — new `delivery-driver-phone` input; list rows render a `tel:` anchor (`delivery-dial-<id>`) that opens the phone dialer.
- **Family birthday auto-sync** — new `family-sync-btn` in the Family workspace creates one recurring yearly note per family member with a valid MM-DD birthday. Idempotent — clicking again updates the same notes instead of duplicating.

### Batch C — Look & feel
- **Glass workspace theme** — new `glass-toggle` in the Backup modal toggles `body[data-rg-glass]` and persists to `localStorage`. When on, all Restaurants Galore modals get a frosted-blur backdrop (`backdrop-filter: blur(18px) saturate(180%)`) with semi-transparent surface.

### Cross-cutting infrastructure
- New shared `PhotoAttachPanel.jsx` component consumed by Order/Review/Recipe/Coupon editors. Handles resize, save with correct `restaurant_id + linkId`, list, and delete.
- `restaurantsService.listPhotos()` extended with `recipeId` + `couponId` filter args.
- New `restaurantsService.logRecipeCook(id)` mutator.

### Toast placement fix (unblocks automation)
- Toaster moved from `top-right` → `bottom-right` in both `NotesApp.jsx` and `App.js`. The `header-restaurants-galore` button in the top-right is no longer occluded by toasts, which fixes the recurring block for the testing agent (iteration_32 pre-visit briefing PASS).

### Testids polish
- Added per-id data-testids on Edit/Delete icon buttons across every workspace: `recipe-edit-<id>`, `recipe-delete-<id>`, `meal-edit-<id>`, `menu-edit-<id>`, `coupon-edit-<id>`, `review-edit-<id>`, `delivery-edit-<id>`, `staff-edit-<id>`, `wishlist-edit-<id>`, `family-edit-<id>` (+ matching delete IDs). Also new `family-birthday` and `family-sync-btn`.

### Testing
- `iteration_32.json` (Batch A/B/C retest) — **100% PASS** on all 12 assertions. Zero React key warnings, zero console errors.

---

## 2026-02-08 (session 3) — Pre-Visit Briefing Card + Toast fix

### Pre-Visit Briefing
- New `directory-brief-<id>` button on every restaurant row.
- New `PreVisitBriefingModal` (`/notes/rg/PreVisitBriefing.jsx`) assembles 8 sections from IndexedDB in <100ms:
  1. Allergy warnings (red) — every family member's allergies
  2. Family favorites — cross-referenced with this restaurant's menu (shows "on menu · $X" badge on match)
  3. Upcoming birthdays (family + staff, ≤30 days)
  4. Live coupons with countdown (< 3 days red, < 7 days amber)
  5. Your favorite meals at this restaurant
  6. Staff to greet (favorites first)
  7. Latest review snippet
  8. Last order highlights
- Big "Add visit to my notes" CTA at the bottom creates a floating Iron Rabbit note tagged `restaurants` + `pre-visit`, with the visit datetime as an enabled alarm.

## 2026-02-08 (session 2) — P1 Batch Complete ✅

### P1a — Refactor of Phase 2 workspaces
- `RestaurantWorkspaces.jsx` (was 860 lines) is now a thin barrel; per-workspace files live in `/app/frontend/src/notes/rg/`:
  - `_shared.jsx` (Field / RestaurantPicker / css helpers)
  - `RestaurantMenus.jsx` (~200 lines)
  - `RestaurantMeals.jsx` (~140 lines)
  - `RestaurantOrders.jsx` (~300 lines with new attach-photo section)
  - `RestaurantSpending.jsx` (~120 lines)
  - `RestaurantCoupons.jsx` (~150 lines)

### P1b — Data-loss bug fix (silent)
- `restaurantsService.js` — 10 `save*()` methods now put `id: X.id || rid('...')` **AFTER** the spread. Previously `...X` would splat `id: undefined` on top of the freshly-generated id, causing every new record to be stored under the literal key `"undefined"` and overwrite the previous one.

### P1c — Smart Assistant multi-turn chat
- New modal `RestaurantSmartAssistantModal`. Backend `/api/dining_insights` extended with optional `history: List[{role,text}]`.

### P1d — Recipe Recreation workspace
- New IndexedDB store `rg_recipes` + `RestaurantRecipesModal`.

### P1e — Family Dining workspace
- New IndexedDB store `rg_family` + `RestaurantFamilyModal`.

### P1f — Attach photo to order
- OrderEditor gains a Photos section on saved orders.

### Dashboard
- 21 total launcher tiles.

---

## 2026-02-08 (session 1) — Restaurants Galore Phases 2–5 Complete ✅
See `/app/specs/RESTAURANTS_GALORE.md` for the master spec.

## Prior sessions
See `PRD.md` for original problem statement, personas, and pre-2026-02 history.
