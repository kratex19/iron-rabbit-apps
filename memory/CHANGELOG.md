# Iron Rabbit Changelog


## 2026-02-14 (part 4) — Brightness sliders: real color paint + bright icon

### Bugs reported by user
1. Text slider in the Expanded (FullScreen) view slid but never repainted the text
2. Background slider didn't actually go from "solid black to fully transparent"
3. The Sliders icon in the Expanded view was too dim — needed to be bright white

### Root cause
- `TextareaAutosize` inside `FullScreenNote` inherited its color via a CSS
  variable (`--ir-text`). While that pipe technically worked, updating a CSS
  variable on a parent doesn't always trigger a paint in React's inline-style
  path (especially inside third-party wrappers that own their own textarea).
- The old `brightnessToBg(v)` used `rgba(g,g,g, 0.55 + v*0.15)` — a grayscale
  mix that neither hit true opaque black at v=0 nor true transparent at v=1.

### Fix
- **`BrightnessSliders.jsx`** — rewrote helpers:
  - `brightnessToText(v)` → `rgb(v*255, v*255, v*255)` (unchanged output shape;
    verified: v=0 → black, v=0.5 → gray, v=1 → white)
  - `brightnessToBg(v)` → `rgba(0, 0, 0, 1 - v)` (verified: v=0 → solid black,
    v=0.5 → half transparent, v=1 → fully transparent)
- **`FullScreenNote.jsx`** — the container + textarea now receive their
  colors as **directly computed inline values**, not CSS variables. Slider
  moves paint instantly.
- **`FullScreenNote.jsx`** — the Sliders icon in the expanded toolbar now
  ships with `text-white` (fully bright) instead of the header's `text-white/70`.

### Verification
- Pure-JS unit run confirmed all 6 expected outputs
- Lint clean (pre-existing warnings only)


## 2026-02-14 (part 3) — Display Controls Discoverability + Drive Privacy Draft

### Display Controls (`notes/DisplayControlsButton.jsx`)
- Added a one-time animated **orange NEW badge** (pinging dot) rendered on top-right of the `SlidersHorizontal` icon
- Auto-dismisses when the user opens the panel for the first time
- Persisted via `localStorage.ir_display_controls_seen`
- Also shows a small `NEW` word inside the popover header until seen
- Test-id: `{prefix}-display-new-badge` on all three surfaces (home, quicktext, fullscreen)
- Verified: Playwright reports `badge_present: True, badge_visible: True`

### Google Drive Privacy Draft (`/app/memory/GOOGLE_DRIVE_PRIVACY.md`)
- New one-pager covering: exact scope requested (`drive.appdata` only), what's uploaded, what isn't, who has access, revocation paths, Play Store Data Safety table, App Store nutrition label, consent-modal copy, and internal implementation notes (PKCE, no server-side token storage, no telemetry)
- Intended for: in-app consent modal, Play Store listing, App Privacy Nutrition Label
- Explicit clarifications: end-users never touch the developer's Google account; scope is the most restricted Drive scope; no Iron Rabbit backend involvement



## 2026-02-14 (part 2) — Admin Digest Preview-First Send Flow

### Backend (`backend/routes/digest.py`, `backend/models/digest.py`)
- `DigestSendResponse` gained two optional fields: `html: Optional[str]` and `subject: Optional[str]`
- `send_digest_now(dry_run=True)` now returns the fully rendered HTML + subject line so the admin dashboard can render a live preview before broadcasting
- Existing behavior (real send returns no html/subject) preserved
- All 7 tests in `test_parse_and_digest.py` still pass
- Verified via curl: `dry_run=1` → `ok=True`, `subject="Iron Rabbit — Community Digest (N pending)"`, `html_len=4257`

### Frontend (`admin/CommunityDashboard.jsx`)
- New state: `previewKind` (`"tip" | "digest"`) + `previewCounts` — the shared preview modal now adapts its header + footer based on kind
- New `previewDigest()` — POSTs to `/api/community/digest/send?dry_run=1`, pulls html/subject/counts, opens the modal
- New button `admin-preview-digest` (Eye icon) placed next to `admin-send-digest` — "Preview digest" reveals the modal without broadcasting
- Preview modal (`digest-preview-modal`) upgrades:
  - Header switches to "Weekly digest preview" with counts strip (pending / promoted / rejected)
  - Adds footer bar with `digest-preview-cancel` (Close) and `digest-preview-send` (Send digest now) — one-click confirm-and-broadcast
- Successful broadcast now auto-closes the preview modal so the admin isn't looking at stale content

### Test IDs added
- `admin-preview-digest` — top-bar toggle
- `digest-preview-modal` — modal root
- `digest-preview-counts` — pending/promoted/rejected chip strip
- `digest-preview-cancel`, `digest-preview-send` — footer actions

### Verification
- Backend: pytest green, curl returns expected shape
- Frontend: Playwright confirms `PREVIEW_BTN`, `MODAL`, `SEND_BTN` all visible; modal rendered the full digest email in an iframe with subject + counts



## 2026-02-14 — Brightness Sliders → Collapsible Display Panel

### Problem
Brightness sliders were rendering but invisible on dark backdrop:
- 4px tall track at 10% white opacity
- No labels, no value chips, no visible chrome
- Users could not find them at all (reported by user)

### Fix (Option C — hide behind icon toggle)
1. **New component `notes/DisplayControlsButton.jsx`** — `SlidersHorizontal` icon opens a Radix Popover ("Display" panel) containing the sliders. Hidden by default.
2. **Enhanced `notes/BrightnessSliders.jsx`** — added `Type` / `SquareDashed` label icons, "Text"/"BG" labels, `%` value chips, and per-slider `RotateCcw` reset buttons. Track bumped `h-1` → `h-1.5`, `bg-white/10` → `bg-white/20`.
3. **Wiring**:
   - `AppHeader.jsx` — receives `uiBrightness` + `onBrightnessChange` props; renders `DisplayControlsButton` between QuickGuide button and Settings.
   - `NotesApp.jsx` — passes brightness props into `AppHeader`; removed the always-visible sliders block that lived above the search bar.
   - `NoteModal.jsx` — `DisplayControlsButton` added next to QuickGuide button in the modal title row; removed inline sliders block from Photos/attachments row.
   - `FullScreenNote.jsx` — `DisplayControlsButton` added in the top toolbar (between Delete and Close); removed inline sliders block above the footer.
4. **Test IDs**:
   - `home-brightness-display-toggle`, `home-brightness-display-panel`
   - `quicktext-brightness-display-toggle`, `quicktext-brightness-display-panel`
   - `fullscreen-brightness-display-toggle`, `fullscreen-brightness-display-panel`
   - `{prefix}-text-slider`, `{prefix}-bg-slider`, `{prefix}-text-value`, `{prefix}-bg-value`, `{prefix}-text-reset`, `{prefix}-bg-reset`

### Verification
- Lint: clean on all 5 touched files (only pre-existing unused-disable warnings remain)
- Playwright: `home-brightness-display-toggle` visible → clicked programmatically → `home-brightness-display-panel` reports visible


## 2026-02-08 (session 14 · part 7) — Quick Guide Phase 1.5 SHIPPED ✅

### Screen expansion (per user request)
Wired the `?` icon into **7 additional screens** — every major surface now has a Quick Guide:

| Screen | Article ID | Wired at |
| --- | --- | --- |
| Pantry | IRR-1300 | `PantryModal.jsx` title bar |
| Kid Mode | IRR-1400 | `KidDashboardModal.jsx` next to Exit button |
| Meal Planner | IRR-1500 | `MealPlannerModal.jsx` title bar |
| Barcode Scanner | IRR-1600 | `BarcodeScannerModal.jsx` title bar |
| Calendar | IRR-1700 | `FloatingCalendarModal.jsx` title bar |
| Backup & Restore | IRR-1800 | `BackupRestoreModal.jsx` title bar |
| Note Editor | IRR-1900 | `NoteModal.jsx` title, next to Templates button |

### Content
- 7 new placeholder articles in `/quickguide/content/en/IRR-1300.json` → `IRR-1900.json`
- Each follows the locked authoring guide: 5 cards, "What / Creating / Editing / Tips / Common mistakes" pattern, ≤250 char bodies, active voice, no jargon
- Manifest bumped `1.0.0 → 1.1.0`; 11 total articles shipping
- Provider imports all 11 JSONs (~1KB per bundle after gzip)
- Content lint passes 11/11 clean

### CRITICAL bug fixed mid-session
- **Pointer-events cascade**: Radix Dialog primitive sets `document.body { pointer-events: none }` while open. QuickGuideModal rendered as a sibling React child inherited the `none`, making Next / feedback / More Help un-clickable in all 7 new modal contexts + Backup. **Fix**: added `style={{ pointerEvents: 'auto' }}` to the outer overlay div of `QuickGuideModal.jsx` and `CloseConfirmDialog.jsx` — clean, localized, ~2 lines total. Verified in iter_52 across all 7 contexts including the harshest nested-dialog case (Settings → Backup → QuickGuide).

### LOW consistency fix
- Harmonized IRR-1000 (Home) so card 1 = "What Home does" and card 5 = "Common mistake", matching the pattern across all other 10 articles. Now uniform vocabulary across the entire catalogue.

### Verification
- `testing_agent_v3_fork` iteration_52 — **100% pass** with REAL mouse clicks (no JS-dispatched shortcuts). Zero bugs, zero warnings.

### Service Worker
- Cache bumped `v12 → v13` so PWA users pick up all 7 new guides on next open.

### Files touched
- New: `/app/frontend/src/quickguide/content/en/{IRR-1300,IRR-1400,IRR-1500,IRR-1600,IRR-1700,IRR-1800,IRR-1900}.json`
- Modified: `/app/frontend/src/quickguide/content/manifest.json` (v1.0.0 → v1.1.0), `/app/frontend/src/quickguide/QuickGuideProvider.jsx` (added 7 imports), `/app/frontend/src/quickguide/QuickGuideModal.jsx` + `CloseConfirmDialog.jsx` (pointer-events fix), `/app/frontend/src/quickguide/content/en/IRR-1000.json` (heading harmonization)
- Modified (button wiring, all light-touch): `PantryModal.jsx`, `KidDashboardModal.jsx`, `MealPlannerModal.jsx`, `BarcodeScannerModal.jsx`, `FloatingCalendarModal.jsx`, `BackupRestoreModal.jsx`, `NoteModal.jsx`

### Phase status
- Phase 1 ✅ + Phase 1.5 ✅ complete. Every major screen has a `?` icon with a working guide.
- Phase 2 (real editorial content pass) — **queued per user's own request** — starts after the user has used the app for a few days and knows which cards need real answers rather than placeholders.
- Phases 3–8 (KB / Search / Rabbit Tips / Knowledge Distribution / Forums / AI / cross-app extraction) — still queued per locked roadmap.


## 2026-02-08 (session 14 · part 6) — Quick Guide Phase 1 SHIPPED ✅

### Framework
- New folder `/app/frontend/src/quickguide/` — 11 files, ~750 LOC, nothing over 210 lines.
- Public API surface: `<QuickGuideProvider>` at root, `<QuickGuideModal>` at root, `<QuickGuideButton resourceId="…" origin="…" />` per screen, `<QuickGuideSettingsSection>` in Settings, plus `useQuickGuide(id)` for programmatic use.
- **Independent from FirstRunTour and QuickAccess** — matches their visual style via shared `/quickguide/tokens.js` constants but does NOT import them. Zero refactor of existing modals.
- **Locked defaults**: `enabled=true, auto_show=false` — discovery-based, not push. `seen_ids` seeded with every current article ID on first boot to prevent auto-show flood.
- **Storage**: extends `app_settings.quickguide.*` in existing IndexedDB. No new stores.

### 3-Screen Pilot + Meta Article
- `?` icon wired in `AppHeader.jsx` → **IRR-1000 Your Home Screen**
- `?` icon wired in `ShoppingModeModal.jsx` header → **IRR-1100 Shopping Mode**
- `?` icon wired in `SettingsModal.jsx` title → **IRR-1200 Settings**
- Meta article **IRR-9000 About Quick Guides** — opens from the Settings section "About Quick Guides" row.

### Modal features (all working)
- 5-card horizontal swipe carousel (touch, chevrons, ← → arrow keys)
- Progress dots + "N of 5" counter
- ResourceIdChip bottom-left — subtle mono ID + copy button with navigator.clipboard + execCommand fallback
- MoreHelpButton bottom-right — visible but DISABLED "SOON" pill (reserves layout for Phase 3+)
- GuideFeedback (👍 / 👎) on LAST card only — records to `app_settings.quickguide.feedback`, last-vote-wins, derived from context so state syncs across reload/reopen
- Close [X] → confirm dialog → transient hint toast "You can reopen Quick Guides anytime…"
- Escape opens confirm, does not bypass it

### Settings section (6 rows, collapsible)
- Enable Quick Guides · Automatically show · Reset Tour · Content version · Knowledge Distribution status (reserved) · About Quick Guides

### Triple-tap peek
- When globally disabled, tapping `?` 3 times within 800ms opens the guide **temporarily** without re-enabling.

### Content bundle & lint
- 4 English articles in `/quickguide/content/en/*.json`
- Manifest at `/quickguide/content/manifest.json` (content_version 1.0.0, article_ids array)
- Build-time lint at `/quickguide/scripts/lint.js` — ID uniqueness, prefix-in-range, ≤5 cards, ≤500 char bodies (soft 250), related_ids resolve, deprecated warnings. Runs in 4/4 clean.

### Bug fixed during this session
- **HIGH (iter_49)**: `recordFeedback` had a stale-closure race with `_bufferEvent` — the second write clobbered the first, silently dropping every vote. **Fix**: refactored `persist()` to functional updater (`setState(prev => …)`) so all sequential writes rebuild from the current snapshot. `recordFeedback` and `close()` now batch feedback + analytics into a single functional update. `GuideFeedback` derives `voted` via `useMemo` from context — no more useState drift. **Verified in iter_50 (5/5 pass)**.

### Verification
- `testing_agent_v3_fork` iteration_50 — **100% (5/5) pass**, zero bugs, all 15 flows across the framework working. Prior iter_49 13/14 flows also confirmed still green.

### Service Worker
- Cache bumped `v11 → v12` so PWA users pick up the new framework on next open.

### Files touched
- New: `/app/frontend/src/quickguide/{tokens.js, QuickGuideProvider.jsx, QuickGuideButton.jsx, QuickGuideModal.jsx, QuickGuideCard.jsx, ResourceIdChip.jsx, MoreHelpButton.jsx, GuideFeedback.jsx, CloseConfirmDialog.jsx, QuickGuideSettingsSection.jsx, useQuickGuide.js, index.js}`
- New: `/app/frontend/src/quickguide/content/{manifest.json, en/IRR-1000.json, en/IRR-1100.json, en/IRR-1200.json, en/IRR-9000.json}`
- New: `/app/frontend/src/quickguide/scripts/lint.js`
- Modified (light-touch): `/app/frontend/src/NotesApp.jsx` (Provider + Modal mount), `/app/frontend/src/notes/AppHeader.jsx` (`?` button), `/app/frontend/src/notes/ShoppingModeModal.jsx` (`?` button), `/app/frontend/src/notes/SettingsModal.jsx` (`?` button + Settings section)

### Locked design status
`/app/memory/QUICK_GUIDE_DESIGN.md` and `/app/memory/QUICK_GUIDE_AUTHORING.md` remain the source of truth. Phase 1 is complete per that spec. Phase 1.5 (wire remaining 7 screens with placeholder content) is the next batch — awaits explicit user go-ahead. Phases 2-8 (editorial, KB, search, Rabbit Tips, Knowledge Distribution, forums, AI, cross-app extraction) remain queued.


## 2026-02-08 (session 14 · part 5) — Asset Kit + Play Store Copy 📦

### Extended Asset Kit
- Consolidated `/tmp/gen_icons.py` + `/tmp/gen_feature_graphic.py` into a single canonical script at `/app/scripts/generate_play_assets.py`.
- One command rebuilds every static asset needed for the Play release: 8 launcher icons (any-purpose + maskable + adaptive layers + hi-res + favicon), splash, and the 1024×500 feature graphic.
- CLI flags: `--only {icons|splash|feature-graphic|all}`, `--dry-run`, `--out-dir`. Zero side effects on app code.
- Verified end-to-end: `python3 /app/scripts/generate_play_assets.py` regenerates 10 assets deterministically.

### Play Store Listing Copy
- `/app/PLAY_STORE_LISTING.md` — copy-paste-ready store listing:
  - App title (2 options, both ≤ 30 chars)
  - 3 short-description candidates (all ≤ 80 chars, verified with a length check)
  - Full description (**3,505 / 4,000 chars** — comfortable margin), sectioned around Notes, Kid Mode, Shopping & Pantry, Meal Planner, Backup, Privacy, Who it's for
  - What's New / promo text template
  - Data Safety form answers (all "not collected" — matches offline-first architecture)
  - Contact & privacy URL placeholders
  - Pre-submission checklist
- Every claim in the copy is aligned with `/app/PRIVACY.md` and the `Notes that live on your phone.` feature graphic tagline.

### Quick Guide — still parked (per Option A+)
Design remains locked in `/app/memory/QUICK_GUIDE_DESIGN.md` and `/app/memory/QUICK_GUIDE_AUTHORING.md`. Zero application code touched. Awaiting explicit "build Quick Guide Phase 1" signal from the user, which per Option A+ arrives only after the Play launch has shipped and initial user feedback is in.


## 2026-02-08 (session 14 · part 4) — Play Store Assets Complete 🎨

### Feature Graphic (1024×500) — Play Store listing blocker resolved
- Generated `/app/frontend/public/feature-graphic-1024x500.png` via `/tmp/gen_feature_graphic.py` (Python + PIL, reuses the icon-generator rabbit routine).
- Left side: brand mark "IRON RABBIT" · tagline "**Notes that live on your phone.**" (carrot-orange "phone.") · sub-tagline "Offline-first · No account · No ads · No tracking".
- Right side: the same rabbit-face icon in a rounded-square badge with drop shadow — matches the launcher icon so Play Store users see brand consistency at a glance.
- Fixed the rabbit's mouth arc across all generated assets (icons + splash + feature graphic) so he's smiling, not frowning.

### 4 Extra Play Store Screenshots
- `screenshots/pantry-nutriscore.png` — Nutella with NOVA 4 badge, "Ultra-processed" processing panel, Palm Oil warning, allergen chips (milk/nuts/soybeans), full nutrition per 100g, sourced from Open Food Facts.
- `screenshots/meal-plan.png` — populated 7-day grid (Mon–Sun) with real recipes across breakfast/lunch/dinner slots, "Generate shopping list" CTA, "15 recipes" footer.
- `screenshots/kid-mode.png` — Emma's Daily Chores dashboard, streak 1, 2/5 approved, $2 earned this week, individual chores with Approved!/Waiting-for-grown-up badges.
- `screenshots/backup-restore.png` — clean Backup & Restore modal, Export Backup + Import Backup CTAs, "Nothing leaves your device" reassurance.
- All 4 shot at 540×960 (Play's narrow form-factor); registered in `manifest.json` `screenshots` array with descriptive labels for the store listing.

### `manifest.json` update
- Screenshots array grew from 4 → 8 entries. Every new screenshot has a Play-listing-quality label.

### Handoff — what user must still do on their Mac before submission
- Host `/app/PRIVACY.md` at a public URL (GitHub raw is fastest)
- `cd frontend && yarn build && npx cap add android && npx cap sync`
- Wire adaptive icons in Android Studio Asset Studio (foreground + background PNGs already in `/app/frontend/public/`)
- Generate keystore, produce signed `.aab`, upload to Play Console
- In Play Console: paste privacy URL, fill Data Safety form (data collected = none), upload feature graphic + screenshots, submit for review
- Full step-by-step in `/app/GOOGLE_PLAY_LAUNCH.md`


## 2026-02-08 (session 14 · part 3) — Quick Guide System DESIGN LOCKED (post-launch) 🔒

### Decision
Iron Rabbit will ship a universal **Quick Guide** system as its first major post-Play-launch enhancement (v1.1). Design v1.1 is APPROVED and LOCKED. **No application code has been written or modified.** Everything below is documentation only.

### Documents produced
- `/app/memory/QUICK_GUIDE_DESIGN.md` — full architecture, component diagram, storage schema, article schema, ID namespace (17 reserved prefixes including new `FH-` for Feature Highlights), 8-phase roadmap, risks, all 10 user-requested changes folded in
- `/app/memory/QUICK_GUIDE_AUTHORING.md` — writing guidelines: one topic per card, ≤5 cards, ≤250 char bodies, active voice, no jargon, no idioms, localization-ready patterns, review checklist

### Sequencing (locked as Option A+)
1. Ship Google Play release FIRST (feature graphic, extra screenshots, native build, keystore, Play Console submission)
2. Publish app · gather real user feedback
3. Build Quick Guide Phase 1 as the first v1.1 enhancement · guided by actual user friction, not speculation

### Boundary rules for future agents
- **Do not begin any part of the Quick Guide implementation until the user explicitly says "build Quick Guide Phase 1"** (or equivalent).
- When implementation begins, start from `QUICK_GUIDE_DESIGN.md` verbatim — no re-analysis, no scope expansion.
- Vocabulary is final: "Quick Guide" everywhere, `?` icon everywhere, "Knowledge Distribution" for future website sync.

### Estimated effort when green-lit
- Phase 1 (framework + 3-screen pilot): ~2.0 sessions / ~170 ECU
- Total 8-phase roadmap: ~19 sessions / ~1,900 ECU spread across many months


## 2026-02-08 (session 14 · part 2) — Google Play Launch Audit ✅

### App Icons Overhaul (Play blocker → resolved)
- Replaced the placeholder purple "IR" square (973-byte 192px, 2657-byte 512px) with a proper white-rabbit-face design on an indigo radial gradient. Friendly rabbit head with long ears + pink inner-ear + subtle whiskers + amber carrot accent.
- Generated a full launcher-icon set in `/app/frontend/public/`:
  - `icon-192.png` (any-purpose), `icon-512.png` (any-purpose), `icon-1024.png` (Play Store hi-res)
  - `icon-192-maskable.png` + `icon-512-maskable.png` — 33% inner safe zone survives circle / squircle / rounded-square launcher masks
  - `icon-foreground-432.png` + `icon-background-432.png` — Android adaptive-icon layers
  - `splash-2048.png` — 2048×2048 portrait splash on brand `#020617`
  - `favicon.png` — 48px
- Icon generator committed at `/tmp/gen_icons.py` (Python + PIL) so future re-sizes are one command away.

### Manifest Upgrade
- `public/manifest.json`: `version: 1.0.0` (added), longer 4000-char-capable description, `theme_color: #4F46E5` (was `#6366F1`), 6 icons declared (favicon + 192 + 512 + 192-maskable + 512-maskable + 1024), `start_url: /?utm_source=pwa` for analytics attribution when installed as PWA.
- `package.json`: version `0.1.0` → `1.0.0`.

### Capacitor Config Hardened
- `capacitor.config.ts`: added `SplashScreen` plugin config (2s show, 300ms fade, `#020617` bg, immersive full-screen), `LocalNotifications` plugin config (small icon, indigo color, sound), `android.captureInput: true`, comment clarifying no `server.url` (offline-first).

### Privacy Policy & Launch Checklist (Play requirement)
- `/app/PRIVACY.md` — full privacy policy tailored to Iron Rabbit's offline-first architecture. Explicitly declares zero server-side data collection, camera/mic opt-in per use, single third-party (OpenFoodFacts on Pantry scans only), SHA-256+salt PIN hashing, Keychain/Keystore on native. Includes contact email `privacy@ironrabbitapps.com`.
- `/app/GOOGLE_PLAY_LAUNCH.md` — step-by-step launch checklist covering: hosting the privacy policy publicly, `npx cap add android`, adaptive icon wiring in Android Studio, splash screen, `AndroidManifest.xml` permissions, `build.gradle` versionCode/versionName, keystore generation + signing, release build smoke test, Play Console setup (store listing, data-safety form, content rating, submission), and iOS parallel path.

### QR / Barcode Sweep
- Audited every scanner entry point: **header barcode button** (`data-testid="header-barcode"`) → BarcodeScannerModal → grocery quick-add via `useGroceryQuickAdd`, and **Pantry modal** (`PantryModal.jsx:620`) → same modal → populates pantry-edit form with `productInfo`. Both share the single BarcodeScannerModal and were re-verified working in iter_48.
- Native builds use Google ML Kit (`@capacitor-mlkit/barcode-scanning`) with ML Kit module auto-install on Android; PWA builds use `BarcodeDetector` API with declared formats `ean_13 / ean_8 / upc_a / upc_e / code_128 / code_39` and manual-entry fallback for iOS Safari.
- No QR code GENERATION anywhere in the codebase — nothing to sweep on that side. Manual entry is digits-only, which is correct for OpenFoodFacts EAN/UPC lookups.
- Verified new icons + manifest v1.0.0 + 6 icons + maskable variants are served correctly from preview.

### Still-to-do on user's dev machine (documented in GOOGLE_PLAY_LAUNCH.md)
- Host `PRIVACY.md` at a public URL
- Run `npx cap add android` + wire adaptive icons via Android Studio Asset Studio
- Add camera / biometric / notifications permissions to `AndroidManifest.xml`
- Generate keystore, sign, produce `.aab`, upload to Play Console
- Design a **1024×500 Feature Graphic** for Play Store listing (still missing)
- Add 4 more phone screenshots (Kid Mode, Pantry Nutri-Score, Meal Plan, Backup/Restore)


## 2026-02-08 (session 14) — Launch Mode: Pantry Photos + Backup/Restore Fixes ✅

### Pantry Product Photos (P2)
- `PantryModal.jsx` item row now renders the OpenFoodFacts product image as an 8×8 thumbnail with the zone icon overlaid as a small badge (bottom-right). Falls back to the plain zone icon when no `productInfo.image` is stored, preserving backward compatibility. Testid `pantry-item-photo-<id>`.

### Critical Backup/Restore Fixes (Google Play launch blockers)
- **Import validator**: `BackupRestoreModal.handleFilePick` was rejecting every valid backup with "Not an Iron Rabbit backup file" because it checked `'IronRabbit'` (no space) while `exportAllData` writes `'Iron Rabbit'` (with space). Now accepts BOTH strings for backward-compat.
- **Export success toast**: `handleExport` was crashing on `payload.counts.notes` (never returned by service) → caught → showed misleading "Export failed" toast even though the .json file DID download. Now reads `data.notes.length` / `data.files` directly.
- **Import summary shape**: `StorageService.importAllData` now accepts a `mode` parameter (`'replace'` default, `'merge'`) — replace wipes stores first, merge preserves and overwrites by id. Settings are merged (not clobbered) in merge mode. Returns `{notesRestored, templatesRestored, filesRestored}` matching the modal's expected shape.

### Regression fix (iter_46 → iter_47)
- **Pantry ID bug**: `savePantryItem` spread order was overwriting the generated id with `undefined` from the payload. Fixed by placing `id: item.id || generatedId` AFTER `...item`. Verified: two items get distinct real ids, delete-one keeps the other, no React unique-key warnings.

### Verification
- `testing_agent_v3_fork` iteration_48: 7/7 targeted scenarios passing (backup export, import merge, import replace, legacy 'IronRabbit' compat, pantry-id regression, language persistence, offline sweep). No critical or high issues remain.

### Service Worker
- Cache version bumped `iron-rabbit-v10` → `iron-rabbit-v11` so PWA users pick up the new pantry row + backup fixes on next open.


## 2026-02-08 (session 13) — Weekly Meal Plan + Cook Notes Search ✅

### Weekly Meal Plan
- New `meal_plan` localforage store + full CRUD on `RestaurantsService`: `listMealPlan({from,to})`, `addMealPlanEntry({date, recipe_id, slot?})`, `deleteMealPlanEntry(id)`, `clearMealPlanRange({from,to})`. Included in `exportAll` / `importAll` / `computeBackupDiff`.
- New `RestaurantMealPlanModal.jsx` — 7-day Mon–Sun grid with Prev/Next/This-week navigation. Today's column is highlighted purple.
- Popover picker per day (`meal-plan-add-<date>` → `meal-plan-picker-<date>`) with all recipes; multiple entries per day allowed; hover-to-reveal remove button.
- **Build shopping list from this week** button aggregates ingredients from every pinned recipe into the shared shopping list via `addShoppingItems` (dedup + revive handled automatically). Toast shows added/restored counts and recipe count.
- Clear week action (`meal-plan-clear-week`) confirms then wipes only current-week entries; other weeks preserved.
- New `Meal plan` tile on the RG dashboard (`launcher-meal-plan`, Calendar icon).
- Toast dedup via Sonner ids (`mp-add-<date>-<recipe_id>`, `mp-shop-<from>`) to prevent StrictMode double-fires.

### Cook Notes Search
- New search input (`recipes-notes-search`) in the Recipes modal header, with clear-× button (`recipes-notes-search-clear`).
- Filters recipes by lowercased substring match against `title`, `notes`, AND every `cook_notes[].text`. Composes with the restaurant filter (AND).
- `recipes-notes-search-count` line shows "N recipes match" during an active query.
- `recipe-last-note-<id>` now dynamically switches: with an active query it shows the most-recent MATCHING note prefixed `Match: …` in amber; without, it falls back to the newest note prefixed `Last time: …` in emerald.
- Query-aware empty state — when no recipes match, shows `No recipes match "<query>"` instead of the generic message.

### Testing
- Iteration 43: **24/24 (100%)** pass. All meal plan flows (add, multi-per-day, remove, persistence across close/reopen, week nav, build-shopping aggregation, week-scoped clear, disabled-no-recipes, deleted-recipe fallback) verified live. All 8 cook-notes-search scenarios verified (title/notes/cook_notes matching, match vs. last-time note swap, clear-×, combined restaurant filter). Zero console errors, zero regressions.
- Post-report polish: Sonner toast ids added to prevent duplicate toasts, query-aware empty state added.

---


## 2026-02-08 (session 12) — Persistent Cook Session + Post-Cook Notes ✅

### Persistent Cook Session
- Single active cook session persisted to `localStorage.rg_cook_session` with `{recipe_id, step_idx, ends_at, paused_remaining, saved_at}`.
- New `RestaurantsService.saveCookSession / loadCookSession / clearCookSession` helpers.
- `CookModeModal` loads and applies the saved session on mount when `recipe_id` matches — step index, running countdown (via `ends_at`), and paused state (via `paused_remaining`) all resume seamlessly. A `Resumed at step N` toast fires (deduped via toast id `rg-cook-resume`).
- Persistence effect skips writing when in a clean-start state for a *different* recipe than the saved one, so peeking at another recipe never destroys the in-progress cook.
- Recipes modal shows a `recipe-resume-hint-<id>` line on the row whose recipe has an active session so the user can find their way back easily.
- Session is cleared on Finish and on Close (X or Esc).
- **StrictMode-safe timer reset**: replaced the boolean mount-guard with an idx-value guard (`prevIdxRef.current === idx` short-circuit) so React.StrictMode's double-effect-invocation doesn't clobber the resumed timer state.

### Post-Cook Notes
- After the last step's `Done cooking` click, a new `cook-note-prompt` panel appears (in-modal, no extra dialog) with a textarea + `Save note & finish` + `Skip`. Save disabled until non-whitespace present.
- New `RestaurantsService.addRecipeCookNote(id, text)` appends `{text (max 400 chars), cooked_at}` to a per-recipe rolling log (`cook_notes`, cap 20 entries).
- Recipes modal shows the latest note as a Sparkles-prefixed "Last time: …" line (`recipe-last-note-<id>`) so tweaks aren't forgotten between cooks.

### Testing
- Iteration 41: caught 2 real bugs (StrictMode-driven timer wipe + peek-overwrites-session). Both fixed and retested.
- Iteration 42: **13/13 (100%)** pass. Timer resume works with future `ends_at`, paused resume shows Resume label, pause writes integer `paused_remaining`, peek preserves the other recipe's session, actual interaction correctly overwrites. Notes-after-cook prompt/save/skip/rolling-log all green. Zero console errors.

---


## 2026-02-08 (session 11) — Aisle Overrides + Cook Mode Screen Wake ✅

### Aisle Overrides
- New optional `aisle_override` field on each shopping-list item, persisted in IndexedDB. Grouping honors override first, keyword classifier second.
- New `RestaurantsService.setShoppingItemAisle(id, aisleKey|null)` — pass null to clear.
- `aisleClassifier.js` exports `allAisles()` returning every aisle with `{key,label,emoji}` for the picker UI.
- Shopping List row now renders an emoji-only aisle-picker button (`shopping-aisle-picker-<id>`) in grouped view. Clicking opens a Popover menu (`shopping-aisle-menu-<id>`) with all 10 aisles as choices; overridden items show a `Reset to auto` action.
- Picker is intentionally hidden in flat view and for checked items to keep those views minimal.
- Override applies immediately in state (no reload flicker) and survives full page reload.

### Cook Mode — Screen Wake Lock
- New wake-lock hook in `CookModeModal`: on mount `navigator.wakeLock.request("screen")` is invoked (wrapped in try/catch so unsupported / permission-denied environments never throw).
- Small `cook-mode-wake-badge` in the modal title bar (Eye icon + "Screen on") appears when the lock is active.
- `visibilitychange` listener re-acquires the lock after the tab returns (browsers auto-release on hide).
- Unmount cleanup releases the lock so the device sleeps normally after cook mode closes.

### Testing
- Iteration 40: 100% pass. 7/7 aisle-override scenarios green (apply, reset, persist across reload, flat/grouped toggle, checked-hides-picker). Wake Lock verified via structural code paths — Playwright headless rejects `wakeLock.request()` with `NotAllowedError`, which the code handles as a graceful fallback per spec; badge appears on real devices with permission.

---


## 2026-02-08 (session 10) — Cook Timer Alarm + Grocery Aisle Grouping ✅

### Cook Timer — wall-clock + loud alarm
- Rewrote `CookModeModal` timer to use a wall-clock `endsAt` timestamp instead of a decrementing counter. `setInterval` now only bumps a `now` state, so the countdown is drift-proof even when the browser tab is hidden or the machine sleeps briefly.
- `visibilitychange` listener forces an immediate re-render when the tab comes back so the display catches up instantly.
- Pause stores `pausedRemaining` (seconds); Start button relabels to "Resume" and picks up where you left off (never restarts to full).
- Loud alarm loop on timer-finish: repeated 660/880Hz beeps every 900ms, `document.title` flashes to `⏰ Timer done — Iron Rabbit`, and a browser `Notification` fires when permission is granted (permission requested lazily on first alarm).
- Alarm auto-terminates after 20 seconds so users never come back to a stuck loop; a new `cook-mode-alarm-stop` button replaces Start/Pause during alarm.
- Timer container gets `animate-pulse` amber styling while alarming so it's visible from across the room.

### Grocery Aisle Grouping
- New `aisleClassifier.js` — client-side keyword classifier mapping any ingredient string to one of 10 aisles (produce, meat, dairy, bakery, pantry, spices, beverages, frozen, household, other). ~200 curated substrings.
- Shopping List modal gains a `shopping-group-toggle` button in the title bar; grouping preference persists in `localStorage.rg_shopping_group_by_aisle`.
- Grouped view renders aisle sections in a consistent order with emoji + count badges; checked items collect into a `Done` pile at the bottom.
- Flat "By order" view is unchanged so users keep the option to see chronological order.

### Testing
- Iteration 39: 100% pass (18/18 live E2E). Full 60-second real-time alarm test verified: countdown → cook-mode-alarm-stop appears → amber pulse → title flash → Silence restores state. Aisle classifier verified on 7 diverse seed ingredients + the "other" fallback.

---


## 2026-02-08 (session 9) — Cost Badge + Recipe Rating + Cook Mode + Shopping List ✅

### Chat Cost Tracking (Smart Assistant)
- New client-side estimator: 4 chars/token heuristic + Claude Sonnet 4.5 pricing ($3/M input, $15/M output). Accounts for full history being resent on every turn plus a ~4000-char stats blob per request.
- New `data-testid=assistant-cost-badge` in the modal title bar showing `~$0.XXX` with a tooltip listing input/output token estimates. Only appears once the conversation has messages.
- Amber styling + "Reset to keep replies snappy and cheap" hint when estimated cost passes $0.05.
- Reset button (existing) wipes the badge and persisted chat store.

### Recipe Rating
- Recipe schema gains a `rating` field (0–5, 0 = not rated).
- `RestaurantsService.rateRecipe(id, rating)` clamps + persists + bumps `updated_at`.
- Recipes modal rows now render a 5-star rating widget (`recipe-rating-<id>`, individual `recipe-star-<id>-N` buttons). Clicking the same star clears the rating.
- Smart Assistant now enriches `stats.rated_recipes` (title, cuisine, rating) when calling `/api/dining_recipe_idea`.
- Backend prompt updated: favor 4-5-star recipes' cuisine/technique, avoid 1-2-star patterns, never propose the same title as an existing rated recipe.

### Cook Mode
- New `CookModeModal` in `RestaurantWorkspacesP6.jsx`: step-by-step view with progress bar, `Prev / Next / Finish` navigation, and a per-step timer.
- `parseStepMinutes()` regex detects "for 15 minutes", "15 min", "1 hour" etc. and shows a MM:SS countdown when found.
- Timer has Start / Pause / Reset. On completion: success toast + optional Web Audio 880Hz beep (AudioContext primed on first user gesture to satisfy autoplay policies).
- Finishing on the last step calls `logRecipeCook()` so cook_count/last_cooked_at update automatically.
- New `recipe-cook-mode-<id>` button on each recipe row (disabled when the recipe has zero steps).

### Shopping List
- New `shopping_list` localforage store + full CRUD on `RestaurantsService`: `listShoppingItems`, `addShoppingItems({recipeId, recipeTitle})`, `toggleShoppingItem`, `deleteShoppingItem`, `clearCheckedShoppingItems`, `clearShoppingList`.
- New `RestaurantShoppingListModal` component: manual add with comma-splitting, per-item toggle/remove, bulk clear-checked and clear-all, source-recipe attribution ("from: Kimchi Stew · Pho Bo").
- Dedup by lowercased-trimmed-collapsed name key. Re-adding a checked item revives it (uncheck + append source).
- New `Add to shopping list` button on every recipe row (`recipe-add-shopping-<id>`).
- New `Shopping list` tile on the RG dashboard (`launcher-shopping`).
- Included in `exportAll` / `importAll` / `computeBackupDiff` so backups carry the list.

### Testing
- Iteration 38: 100% pass. Backend 10/10 pytest (new `test_recipe_idea_with_rated_recipes` case added at `/app/backend/tests/test_recipe_idea.py`). Frontend live E2E all four features verified — shopping (add/dedup/toggle/clear), rating (set/clear/persist), cook mode (progress/timer parse/countdown/finish), cost badge (hidden → visible → reset).
- Post-report polish: AudioContext lifecycle rewritten to prime on Start-click gesture and close on modal unmount (safer autoplay-policy compliance + no reference leaks).

---


## 2026-02-08 (session 8) — Live Sync Refresh + Conflict Guard + Drill-down + Recipe Ideas ✅

### Live sync-refresh on Backup
- `RestaurantWorkspacesP5.jsx` exposes a new `markBackupCompleted()` helper that stores the timestamp AND dispatches a `window` `CustomEvent("rg-backup-updated", { detail: { at } })`.
- All backup paths (local export, WebDAV push, Google Drive push, auto-scheduled) call it so both manual and automatic backups broadcast the same event.
- `RestaurantsGaloreDashboardModal.jsx` listens for the event with a `backupTick` state bump, causing the Sync Health chip on the Backup tile to re-read `localStorage` without any modal reopen.
- `AppModals.jsx` — the Backup launcher no longer closes the RG dashboard before opening the Backup modal. The dashboard stays mounted behind so the chip visibly flips to `synced just now` mid-flow.

### Pull Conflict Guard
- `RestaurantsService.computeBackupDiff` now flags each `changed` row as `conflict` when `local.updated_at > incoming.updated_at` — i.e., accepting the backup would silently overwrite a fresher local edit.
- `totals.conflicts` count drives a new amber banner (`data-testid=diff-conflict-banner`) inside the diff panel.
- Merge button gets a `⚠` suffix + an extra `window.confirm` if conflicts > 0. Replace button's existing confirm now includes an "N item(s) newer than backup will be overwritten" line.

### Diff Drill-down
- `computeBackupDiff` now returns per-collection sample lists (`items.added`, `items.changed`, `items.removed`), capped at 20 per bucket, each item carrying `{id, name}` via a `labelOf()` best-effort field pick (name → title → meal_name → code → order_number → role/date/id).
- Diff report rows are now expandable buttons (`data-testid=diff-row-toggle-<key>`, `diff-drilldown-<key>`) with `+ / ~ / −` prefixed item names. Rows with zero changes are disabled. Bucket footer shows `… and N more` when the total exceeds 20.

### Assistant Recipe Ideas
- New backend endpoint `POST /api/dining_recipe_idea` (Claude Sonnet 4.6) returns strict JSON `{title, cuisine, prep_time_min, servings, ingredients[], steps[], notes}` personalized to the user's stats (top restaurants, recent orders, family allergies/dietary preferences). Accepts an optional `hint`. Robust to markdown-fenced JSON responses.
- Smart Assistant modal gained a `Suggest a new dish` button (`data-testid=recipe-idea-btn`) and a preview panel (`recipe-idea-panel`) with restaurant-picker + Save + regenerate + dismiss. Save writes directly into `rg_recipes` via `RestaurantsService.saveRecipe`.
- User hint from the input box (e.g. "vegetarian", "under 30 min") is passed through; input is cleared only on success so failures preserve the hint. Server truncates hint to 256 chars for safety.
- `RecipeIdeaRequest.stats` is optional (`default_factory=dict`) — empty body still returns 200.

### Testing
- Iteration 36 → 37: all 4 features shipped, retested to 100% after 2 targeted fixes. Backend 9/9 pytest, frontend all live-scoped flows green. Live sync-refresh visibly flips the chip while the Backup modal is still open on top of the RG dashboard.

---


## 2026-02-08 (session 7) — Diff Report + Sync Health + PBKDF2 600k ✅

### Backup diff report
- New `RestaurantsService.computeBackupDiff(data)` returns per-collection counters `{added, changed, unchanged, removed, total_local, total_incoming}` plus overall totals.
- Backup modal now renders a compact **What will change** panel inside the preview with a Merge/Replace toggle (`data-testid=diff-mode-merge` / `diff-mode-replace`) and per-collection rows (`data-testid=diff-row-<key>`).
- Merge mode shows `+added / ~changed / kept`; Replace mode shows `+added / ~changed / -removed` (red).
- Identical backup → italic "Nothing to change — this backup matches your current library." message.
- Diff also renders for encrypted `.rgenc` files after successful decryption.
- `equal()` strips volatile timestamps (`updated_at`, `last_ordered_at`, `last_cooked_at`, `taken_at`) so re-exports don't show phantom changes.

### Sync Health chip on Backup tile
- New `lastBackupLabel()` helper returns `just now / Xm ago / Xh ago / Xd ago / Xmo ago`.
- Backup launcher tile on the Restaurants Galore dashboard shows a `data-testid=launcher-backup-sync` line under the "Backup" label (green when fresh, amber when stale, dim gray when never synced).
- Aria-label enriched: `"Backup — last synced 2h ago"`, `"Backup — 30+ days overdue"`, or `"Backup"` depending on state.

### Stronger encryption
- `PBKDF2_ITERS` bumped from 200 000 → **600 000** (OWASP 2023 SHA-256 guidance).
- Encrypted envelope now carries `version: 1` alongside `iterations` so future format bumps can be detected.
- `decryptJSON` reads `envelope.iterations` — older `.rgenc` files (produced during iter 34 at 200 k) still open transparently.

### Testing
- Iteration 35: 100% pass. 3/3 backend pytest. 11/11 live frontend items; T7/T8 verified via code inspection (CRA prod build blocks source-module dynamic import — deterministic logic confirmed correct).

---


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
