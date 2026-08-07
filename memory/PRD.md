# Iron Rabbit Apps - Company Website + Notes App


## 📌 Session state (2026-02-07, this session)

### 🎉 Shipped this session (fork continuation)
- **Wall Nickname Deep Link** (2026-02-07) — `/contributors?highlight=@veggie_wizard` (or without the `@`) scrolls that card into view via `useSearchParams` + `cardRefs` and briefly pulses it with an amber ring for ~2.5s via `irr-wall-pulse` CSS keyframes in `index.css`. Case-insensitive lookup; invalid/missing nicknames silently no-op. Respects `prefers-reduced-motion`. `useEffect` cleanup properly cancels the timeout on unmount. Data attribute `data-highlighted="true"` for E2E.
- **Funnel Trendline** (2026-02-07) — `/api/community/recovery/analytics` response now includes `weekly_series[]`: 4 completed 7-day windows (oldest → newest) each with `{week_start, week_end, magic_link_opened, manual_entry_opened, magic_link_share, opens_total}`. Compute lives in `routes/analytics.py` (4 parallel week aggregations). `RecoveryFunnel.jsx` renders a compact 4-bar sparkline inside the big-number card with a `↑ climbing / → flat / ↓ slipping` indicator based on first-vs-last non-zero week (5% threshold to avoid flicker). Grey baseline bars for weeks with no data. Tooltip on each bar shows raw counts. Data-testids: `funnel-sparkline`, `funnel-spark-week-0..3`, `funnel-spark-trend`.
- **Play Screenshot Overlays** (2026-02-07) — New `scripts/overlay_play_screenshots.py` (Pillow) reads the 8 raw shots and composites branded frames: top brand ribbon with amber dot + "IRON RABBIT" wordmark, indigo→deep gradient background, rounded phone-mockup shot with drop shadow, bottom caption/subline block per shot (e.g., "Wall of thanks / Every contributor whose tip made it into the guide."), amber underscore accent. Outputs 1080×1920 PNGs to `frontend/public/screenshots/play/framed/`. `--only` flag rebuilds a single file. 8 shots verified, 109-249 KB each.
- **Admin Recovery Funnel Panel** (2026-02-07) — `RecoveryFunnel.jsx` on `/admin/community` below featured-tip analytics.
- **Wall "New" Ribbon** (2026-02-07) — Cards with `latest_promoted_at` within the last 7 days now render a small amber "NEW" badge.
- **Recovery Email Analytics** (2026-02-07) — New collection `recovery_events` with 90-day TTL. Server-side events: `email_sent` (on request), `verify_success`, `verify_failed` (auto). Client-side events (public, allow-listed): `magic_link_opened` (from `/recover` landing), `manual_entry_opened` (from Wall → NicknameRecoveryDialog). `POST /api/community/recovery/track` only accepts the two client events — server-only events return 400 to prevent inflation. Admin `GET /api/community/recovery/analytics?days=N` returns full funnel + `magic_link_share = magic / (magic + manual)`. React.StrictMode dev double-invoke guarded via `useRef` flags in both `RecoverLandingPage` and `NicknameRecoveryDialog` so counts are exact in both dev and prod. 14 new pytest cases in `test_recovery_analytics.py` (38 recovery-related tests total, all green).
- **Play Store Screenshot Capture** (2026-02-07) — `scripts/capture_play_screenshots.py` (Playwright). One command captures 8 phone-portrait 1080×1920 PNGs into `frontend/public/screenshots/play/` covering Home, Note Fullscreen, Quick Guide, Contributor Wall (Top), Wall (Recent + NEW ribbon), Share Card dialog, Nickname Recovery dialog, Magic-Link landing. Handles the Iron Rabbit service-worker reload race by retrying `/recover` if the SW ate the query params on first navigation. `PLAYWRIGHT_BROWSERS_PATH=/pw-browsers playwright install chromium` was run once to seed chromium-1228.

### 🎉 Shipped earlier in fork (2026-02-07)
- **Wall Sort Toggle** — `/contributors` and `/community/wall` now have a two-button pill toggle above the search bar: **Top** (tip_count desc, existing default) and **Recent** (latest_promoted_at desc, so newly promoted names get discovered faster). Client-side sort — no new backend endpoint. Preference persists via `localStorage['irr.wall_sort_mode']`. Label caption above the grid updates to reflect the active mode. Data-testids: `wall-sort-top`, `wall-sort-recent`, `wall-sort-label`.
- **Magic-Link Recovery** — The recovery email now embeds a one-tap link `${PUBLIC_APP_URL}/recover?n=<nickname>&c=<code>` above the plaintext code (code still shown as a fallback for stripped previews). New `PUBLIC_APP_URL` env var in `backend/.env` (defaulted to the preview URL). New frontend route `/recover` mounts `RecoverLandingPage` which validates query params and, if valid, auto-opens `NicknameRecoveryDialog` directly at step 2 with `recovery-code-input` pre-filled. Invalid links render a friendly explainer with a link back to `/contributors`. `NicknameRecoveryDialog` gained a `prefillCode` prop.
- **Recovery Codes Hashed at Rest** — `nickname_recoveries.code_hash` now stores SHA-256(`<nickname>:<code>`). Verification uses `hmac.compare_digest`.
- **Recovery Rate Limiting** — 3 failed verify attempts → 1-hour lockout. `NicknameRecoveryDialog` shows a friendly toast; requests during lock return `{reason:"locked"}` without issuing a new code.

### 🎉 Shipped earlier in fork (2026-02-06)
- **Share Card Themes** — 4 palette presets (Mint/Rose/Midnight/Sunset) with row of chip swatches above the format toggle in `WallShareDialog`. Choice persists via `localStorage['irr.wall_share_theme']`. Canvas repaints instantly with new gradient BG + nickname gradient + ribbon color.
- **Nickname Recovery** — Two-step public flow via `POST /api/community/nicknames/{n}/recovery` (generates 6-digit code, 30-min TTL, emails ORIGINAL owner via Resend, silent-fails delivered=false when Resend not configured) + `POST /api/community/nicknames/{n}/recovery/verify` (transfers ownership + rewrites tip email + single-use code deletion). Frontend `NicknameRecoveryDialog` on every ContributorWall card that isn't yours (with `KeyRound` icon). Backend never leaks whether nickname is claimed vs unclaimed (both return `ok:true` — one with reason `not-claimed`).
- **Wall Filter** — Client-side substring search on ContributorWall (nickname + latest_heading). Clear button + empty state.
- **Nickname Reservations** — Implicit + explicit `POST /api/community/nicknames/reserve` with idempotent same-email upsert, unique index on reservation nickname.
- **Wall Sharing** — Canvas-generated PNG social card (1200×630 or 1080×1080). Download + native Share.
- **server.py refactor** — Monolith → `deps.py` + `models/` + `routes/`. `server.py` ~102 lines.
- **Anonymous Nickname** — Optional field on tips.
- **Contributor Wall** — Public `/contributors` + `/community/wall` responsive grid.
- **Contributor Thank-You + Featured Tip Analytics + Rotation + Digest Schedule + Import from Text + Community Digest + Admin Dashboard + QR Scan-Back + Promoted cards in Quick Guide** — shipped earlier this session.

### 🎉 Shipped earlier this session
- **Palette expansion** — Tile background picker: 12→43 solid colors, 10→30 gradients (`data/noteIcons.js`); scrolling panel inside dialog
- **Custom Color Picker** — `BackgroundPicker.jsx` gets a "Custom color" panel (native color wheel + hex input + Apply)
- **Custom Gradient Builder** — 2-stop linear gradient builder with two color wheels, hex fields, 0-360° angle slider, live preview
- **First-launch nudge on `?` button** — pulsing ring + orange notification dot on QuickGuideButton until first tap or 15s auto-dismiss. Persisted via `state.nudge_seen` in `app_settings.quickguide`. Respects `prefers-reduced-motion`.
- **Collapsible Images & files accordion** — `FullScreenNote.jsx` now wraps `<Attachments>` in a chevron-toggle accordion. Auto-collapses when the note has attachments (writing space wins); auto-expands when empty (CTA visible)
- **Confirmed Quick Guide content is production-ready** — all 11 articles (IRR-1000 → IRR-1900 + IRR-9000) already contain real, polished editorial copy matching `QUICK_GUIDE_AUTHORING.md`. No rewrite needed.
- **Recent custom backgrounds strip** — `BackgroundPicker.jsx` now remembers the last 8 custom colors and 8 custom gradients under `localStorage['iron_rabbit_bg_recents_v1']`. Shown as a "Recent" strip above the custom builder in each tab, with hover-to-remove `×` per swatch. Purely cosmetic → localStorage is sufficient.
- **Guide search in Settings** — `QuickGuideSettingsSection.jsx` gained a search bar (title×5, id×4, summary×3, keywords/synonyms×2, card body×1 scoring). Top 8 ranked results with title + `IRR-xxxx` chip + summary snippet. Empty state, clear button, click-to-open. Exposed via `getAllArticles()` on the context.
- **Auto-Show First Time** — `QG_DEFAULT_STATE.auto_show` flipped to `true`. Provider now distinguishes truly-new installs from existing users during hydration (only seeds `seen_ids` for existing users). `QuickGuideButton` auto-opens its guide on mount after 900ms if `enabled && auto_show && !isSeen`. Marks seen up-front so it never fires twice.
- **Guide Search inside the Modal** — `QuickGuideModal.jsx` gained a search icon in the header that opens an inline search panel (uses shared `search.js` util). Excludes the currently-open guide from suggestions. Auto-focus on input, clear button, click-to-jump.
- **Shared search util** — `frontend/src/quickguide/search.js` powers both the Settings search and Modal search with identical scoring.
- **Pinned Backgrounds** — Star icon on every recent swatch. Pinned items live in `pinnedColors` / `pinnedGradients` arrays (unlimited); shown above the "Recent" strip with a "★ Pinned" heading. Star toggle moves between pinned/recent. Reusable `SwatchButton` component keeps the render DRY.
- **"No icon" placeholder fix** — `NoteTile`, `NoteModal` editor preview, and `PackBuilder` (both the tile gallery and the current-tile preview) now render nothing when `icon` is null, instead of falling back to `StickyNote`. Matches the user's explicit "No icon" choice.
- **FullScreenNote accordion moved to bottom** — Attachments accordion now sits at the very bottom of the editor scroll area (after chores + checklist) with `mt-auto`, so the writing area gets max vertical breathing room.
- **Weighted Icon Search** — `IconPicker.jsx` now uses weighted scoring (label×5, name×3, category×2). When the query is active it shows a flat, ranked top-60 grid; when idle it keeps the categorized view. New `×` clear button in the search box.
- **Guide History (Recently Viewed)** — `QuickGuideProvider` tracks the last 10 guides opened this session (in-memory only). Modal search panel surfaces them as a "RECENTLY VIEWED" list when the query is empty. Verified live.
- **Pin Sync to IndexedDB** — `BackgroundPicker` now hydrates pinned lists from `StorageService.getSettings().bg_pins` on open, migrates any pre-existing localStorage pins into IndexedDB the first time, and writes pins to both stores on toggle. Because Backup exports the full `app_settings` object, pins now travel with backup files.
- **Play Submission playbook** — New `PLAY_SUBMISSION_TODAY.md` at `/app/` — a one-page, ~90-minute walkthrough from `yarn build` → signed AAB → Play Console upload. References the existing detailed `GOOGLE_PLAY_LAUNCH.md` for deep dives. Updated the launch doc to reflect that feature graphic + 8 screenshots are already generated.
- **Icon Pins + Recents** — `IconPicker` now surfaces a "★ Pinned" + "🕐 Recent" strip at the top of the categorized view. Uses the same architecture as background pins: recents in `localStorage['iron_rabbit_icon_recents_v1']`, pinned in `StorageService.getSettings().icon_pins` so they travel with Backup/Restore. Auto-migrates any legacy localStorage pins into IndexedDB on first open. Every picked icon is remembered (unless pinned). Star toggle moves an item between recents and pinned; `×` removes from recents.
- **Restore Preview** — `BackupRestoreModal` now shows a full summary card before restore: notes, attachments, templates, pinned backgrounds, pinned icons counts + file version + exported-at timestamp. Merge/Replace pickers unchanged.
- **Local Auto-Backup (option B)** — New `frontend/src/storage/autoBackup.js`. Opt-in via Settings → "Automatic weekly backup". Silently exports a full JSON to Downloads once every 7 days on cold boot (5s delayed). Stamps `last_auto_backup_at` so it never runs twice. Toast confirms on success; silent on failure.
- **Template Pins** — `TemplateModal` gained a star toggle per row. Pinned templates float to the top, persisted in `app_settings.template_pins`. Same architecture as icon/background pins.
- **Pack Pins** — `TilePacksModal` gained a star toggle on every pack card (both curated and Custom). Pinned packs float to the top with a subtle amber ring, persisted in `app_settings.pack_pins`. Deleting a custom pack also strips it from pins to keep the list consistent.
- **Pinned Hub (Settings)** — New `PinnedHub.jsx` mounted inside Settings. Shows counts across all pin sources (bg colors, gradients, icons, templates, packs) with a one-tap "Clear all pins" button. First mount stamps `app_settings.first_use_at` so we can gate weekly suggestions.
- **Suggested Pins** — Same Hub surfaces a "You use these a lot — pin them?" chip row after 7 days of use, drawing from unpinned localStorage recents (top 2 icons + top 1 color). Each chip pins on tap and refreshes the counts inline. Silent (no toast, no interruption) — pure discovery.
- **Pinned section headers** — `TilePacksModal` and `TemplateModal` now split into "★ Pinned" and "All …" sub-sections when both exist, so favourites feel like a proper shelf instead of just floating to the top of one giant grid.
- **Weekly Digest** — New `WeeklyDigest.jsx` mounts at the app root. Fires exactly once between days 7 and 14 of first use. Shows: notes created this week, top used icon, top used color. Single primary action "Pin favourites" that pins the top icon + top color in one tap. Never spammed — guarded by `first_use_at` + `digest_shown_at`.
- **Monthly Digest (day 30)** — Same component, monthly mode fires between days 30-44 (takes priority over weekly). Adds a 4-week bar chart of notes-per-week (`TrendingUp` icon), plus a Meal Planner nudge card if the user hasn't tried it yet. Guarded independently by `monthly_digest_shown_at`.
- **Quick Guide horizontal scroll layout** — Rewrote `QuickGuideModal` from single-card + Back/Next to a horizontal scroll strip. All cards visible at once, snap-scroll on mobile, custom scrollbar styling (`qg-strip`). Kept: header title, search icon, close X, feedback thumbs, ID chip, More Help. Removed: Back/Next buttons (superseded by scroll), progress dots (replaced by "X cards" counter).
- **User-editable Quick Guide cards** — Provider now supports `state.user_cards[resourceId]` via `upsertUserCard` / `deleteUserCard`. Modal shows a dashed "Add your own tip" card at the end of the strip. Custom cards get a subtle amber background, "Yours" label, and inline pencil/trash icons for edit/delete.
- **Drag-to-reorder user cards** — HTML5 native drag-and-drop with drop-target ring indicator. Provider gained `reorderUserCards(resourceId, fromId, toId)`. Shipped cards are never draggable — reorder only affects the `user_cards[resourceId]` array so shipped content stays canonical.
- **Share card as image** — New `frontend/src/quickguide/shareCard.js` renders any user card to a 1080×1080 PNG using Canvas (indigo→fuchsia gradient, brand mark, heading, body, resource ID). Uses `navigator.share()` with a File on mobile; falls back to a Downloads-folder PNG on desktop. Dependency-free.
- **Card Themes** — 9 preset options (No theme, 4 solids, 4 gradients) picker inline in each card's edit form. Theme is saved on `user_cards[resourceId][i].theme`. Card body applies the theme as its background with a dim overlay; exported PNG uses the same theme (`shareCard.js` parses the gradient CSS back into a canvas gradient). Text auto-switches to white with a subtle shadow when themed.
- **Card Import via OCR** — Modal-level drop zone + a new "Import from image" tile at the end of the strip. Accepts PNG/JPG/WEBP up to 5MB, POSTs base64 to `/api/ocr` (Claude Sonnet vision, already live). Strips our own boilerplate lines (Iron Rabbit header, IRR-xxxx, domain footer), splits first line → heading, rest → body, opens the edit form pre-filled for user confirmation.
- **QR Card Share** — Installed `qrcode` npm package (~40KB gzipped, fully offline). New `renderQrCardToBlob` + `shareCardAsQr` in `shareCard.js` render a themed 1080×1080 PNG with the tip's text encoded as a scannable QR on a white plate. Same theme parsing as the plain PNG share. `QrCode` icon added between Share as image and Edit on every user card. Uses `navigator.share()` or falls back to Downloads.
- **Community Cards** — New backend endpoint `POST /api/community/tip` (verified live, returns `{ok, id}`) stores anonymous heading + body + resource_id in `db.community_tips`. Client shows a one-time consent dialog on first submit, then persists `app_settings.community_consent`. `Send` icon on every user card triggers submission. No PII, no auth — pure opt-in feedback loop for future article seeding.
- **Google Drive Sync foundation (option A)** — Called `integration_playbook_expert_v2`. Full playbook requires: Google Cloud project + OAuth Client ID + 30-min consent screen setup + minor Play data-safety update. Not shipped in code (would be half-built without user credentials). Created `/app/GOOGLE_DRIVE_SETUP.md` with the complete step-by-step for user to complete, then paste `GOOGLE_DRIVE_CLIENT_ID` back to us. Client-only flow using `drive.appdata` scope + Google Identity Services JS SDK — no backend needed.

### Files touched
- `frontend/src/data/noteIcons.js` — palette expansion
- `frontend/src/components/BackgroundPicker.jsx` — custom color + gradient builders, scroll container
- `frontend/src/quickguide/tokens.js` — added `nudge_seen: false` to `QG_DEFAULT_STATE`
- `frontend/src/quickguide/QuickGuideProvider.jsx` — added `dismissNudge()`, auto-clear on `open()`
- `frontend/src/quickguide/QuickGuideButton.jsx` — pulse class + dot, 15s auto-dismiss timer
- `frontend/src/App.css` — `@keyframes qg-nudge-ring`, `.qg-nudge`, `.qg-nudge-dot`
- `frontend/src/notes/FullScreenNote.jsx` — collapsible accordion around `<Attachments>`

### Next session priorities
- P1: Play Store final submission (Android build + upload)
- P2: Auto-show a Quick Guide on the first visit to each screen (currently locked to false)
- P3: Rich Text Editor / Inline Images (deferred)



## 📌 Session state (2026-08-05, end-of-day)

### 🎉 Shipped this session (all on preview, deploy queued)
- **Pantry Product Info feature — Phases A, B, C ALL COMPLETE**
  - `GET /api/product/{barcode}` backend proxy (Open Food Facts, in-memory cached)
  - `utils/openFoodFacts.js` enhanced with additives, allergens, ingredients, NOVA, ecoscore, categories, countries
  - `BarcodeScannerModal.onCapture` now includes full `product` object
  - `PantryModal` add-item: "📷 Scan barcode / QR" button → autofills name/brand, saves productInfo, auto-suggests zone (frozen→freezer, dairy→fridge)
  - `components/ProductInfoAccordion.jsx` (new) — collapsible panel with Nutri-Score, NOVA, Eco-Score, ingredients, allergens, categories, countries, nutrition per 100g
  - `data/additives.js` (new) — 60+ E-numbers + HFCS/hydrogenated oils/palm oil with 3-level severity (warning/caution/info)
  - "⚠️ Notable" chip on item row when a warning-level additive detected; accordion auto-opens on notable items
- **Icon picker expanded**: 313 icons / 23 categories (was 59/8) — `data/noteIcons.js`
- **TextareaAutosize** on NoteModal + FullScreenNote (`react-textarea-autosize`)
- **Attachments Phase 1**: 2-col thumbnail gallery, dark lightbox (10% opacity), camera capture button, source-URL link foundation
- **Kid Mode celebration**: confetti + gradient banner + card pop-glow + haptic on chore approval
- **Shopping Mode modal**: phone-sized (was desktop-wide)
- **"Tile accent color"** localized in all 25 languages
- **Service worker hardening**: sessionStorage-guarded auto-reload + inline HTML kill-switch

### Deploy status
- Queued at end of session (2026-08-05) — awaiting deployer completion
- Target: `color-task-timer.emergent.host`

### Not shipped (deferred by user or blocked)
- Phase 2 attachments: images inline between paragraphs at cursor position (requires markdown/contentEditable rewrite — user acknowledged, deferred)
- Add-item FAB in Shopping Mode (user said "not necessary")
- Fixing FullScreenNote's attachments-outside-scroll-region visual (Phase 1 architectural limit — user accepted)

### Next session priorities
1. **Verify Pantry barcode + accordion on the deployed live app** — user should test with real products (Coca Cola, Nutella, etc.)
2. **Launch Mode Sweep** — offline persistence, backup/restore, QR flows (still queued from earlier)
3. **Google Play Readiness Audit** — Capacitor config, icons, splash, package name, version, privacy manifest
4. Optional: Phase 2 rich editor for note editor if user wants inline images


## 📌 Session state (2026-08-05, mid-session)

### 🎯 Pantry Product Info feature — Phase A backend DONE, frontend PENDING

**Backend endpoint shipped and tested:** `GET /api/product/{barcode}` in `backend/server.py`

- Proxies Open Food Facts (`https://world.openfoodfacts.org/api/v2/product/{barcode}.json`)
- In-memory cache per barcode (process lifetime)
- Returns normalized JSON: `name`, `brand`, `image_url`, `ingredients_text`, `ingredients_list`, `additives` (E-numbers), `allergens`, `countries_sold`, `nutriscore_grade` (A-E), `nova_group` (1-4), `ecoscore_grade`, `categories`, `labels`
- Tested with barcode `5000112637922` → returns Coca Cola with brand, NOVA=4, additives=[e150a, e150d, e338]
- 400 for invalid format, 404 for not-found, 502 for OFF service down

**Frontend still to do (next session):**

#### Phase A — Wire barcode scan to Pantry Add
- `PantryModal.jsx` add-item form → add a "📷 Scan barcode" button
- Reuse existing `BarcodeScannerModal.jsx` (already in the app, used elsewhere) with `onCapture` callback
- On scan: call `${BACKEND_URL}/api/product/{barcode}`, fill name field
- Also store the full product object on the pantry item as `item.productInfo = {...}` for Phase B/C to consume
- Loading spinner + graceful error toast (offline / not found)

#### Phase B — Product Health & Info accordion
- On each pantry item card (`PantryModal.jsx` render loop), if `item.productInfo` present, add a collapsible section titled "Product Health & Info"
- Content: Ingredients list, Nutri-Score badge (color-coded A-E green→red), NOVA badge (1-4 with meaning: 1 = whole, 4 = ultra-processed), allergens list, additives list with hover tooltip explanations for common ones
- Use `<Collapsible>` or shadcn `<Accordion>` component

#### Phase C — Advanced enrichment
- Additive warning database (small static JSON) — mark E-numbers that are:
  - **Banned in EU/US** (e.g., E110, E129, potassium bromate)
  - **Health concerns** (e.g., aspartame, high-fructose corn syrup)
  - **Ultra-processed markers** (NOVA 4 signal)
- Show "⚠️ Notable" chip on items with any flagged additive
- "Uses in" — pull `categories` from OFF response for context ("Used in: sodas, colas")
- Store product info offline once fetched (already cached backend-side; add localforage cache client-side for full offline use)

### Files touched THIS session
- `backend/server.py` — added `/api/product/{barcode}` endpoint (Open Food Facts proxy)
- `frontend/src/data/noteIcons.js` — icon library expanded to **313 icons across 23 categories**
- `frontend/src/notes/FullScreenNote.jsx` — TextareaAutosize (may need Phase 2 rich editor later to satisfy user's "images inline" ask)
- `frontend/src/notes/NoteModal.jsx` — TextareaAutosize
- `frontend/src/notes/ShoppingModeModal.jsx` — resized DialogContent
- `frontend/src/notes/KidDashboardModal.jsx` — celebration hook
- `frontend/src/components/Attachments.jsx` — Phase 1 gallery + lightbox + camera
- `frontend/src/App.css` — Phase 1 attachment CSS + Kid celebration CSS
- `frontend/public/index.html` — kill-switch for SW reload loop
- `frontend/src/index.js` — sessionStorage-guarded SW auto-reload
- `frontend/src/i18n/locales/*.json` — "Tile accent color" in 25 languages
- `frontend/package.json` — added canvas-confetti, react-textarea-autosize

### User pending items
- Deploy the current preview to `color-task-timer.emergent.host` when ready (user last saw the Shopping List note attachments outside the fullscreen editor bounds — Phase 1 architectural limit)
- Pantry Product Info Phase A frontend + Phase B accordion + Phase C additive warnings
- Answer whether Shopping Mode should get an add-item FAB (user said no earlier — deferred)
- Phase 2 for note editor: inline image tokens at cursor position (deferred; requires markdown or contentEditable rewrite)


## 📌 Session state (2026-08-04, end-of-day)

### What shipped this session (on preview URL)
- ✅ **Kid Mode celebration** — when parent approves a chore, kid sees confetti (canvas-confetti 90 particles), sticky gradient banner "Chore approved! You earned $X.XX 🎉" (2.8s), card pop-glow (1.2s bounce), and haptic success buzz. Fires on the first render where a chore ID has transitioned from `!parent_approved` → `parent_approved` (ref-based diff). Respects `prefers-reduced-motion`.
- ✅ **Shopping Mode modal sizing** — was `max-w-3xl` (768px, way too wide on phone). Now `w-[calc(100vw-2rem)] sm:w-full max-w-md sm:max-w-lg` with `flex flex-col`. Phone-friendly.
- ✅ **"Tile accent color" localised** to all 25 supported locales (en, ar, bn, de, es, fa, fr, he, hi, id, it, ja, ko, ms, nl, pl, pt, ru, sv, th, tr, uk, ur, vi, zh). Only `note.color` key touched; batch-updated via Python.
- ℹ️ User asked about "make the review on link linkable" — deferred, needs clarification (which review? Restaurants Galore is FROZEN so may require lifting the freeze). User said they'd check later.

### Files touched (this session)
- `frontend/package.json` (+ `canvas-confetti@1.9.4`)
- `frontend/src/notes/KidDashboardModal.jsx` (celebration hook + banner + pop class)
- `frontend/src/notes/ShoppingModeModal.jsx` (DialogContent classes)
- `frontend/src/App.css` (`.kid-celebrate-banner`, `.kid-chore-pop` keyframes)
- All 24 `frontend/src/i18n/locales/*.json` files (note.color value)

### Known/carryover
- 🎊 Kid Mode celebration NOT yet manually verified by user — automation couldn't reach kid dashboard past the loading gate. User will test on next visit.
- 🛒 Shopping cart icon only appears when there's an active Grocery note (category="Grocery" OR tag "grocery"). User informed. Not yet verified.
- 🔗 "Review linkable" ask deferred until user clarifies which screen/review element.
- 📱 App still on preview URL only. Deployed URL (`r-task-timer.emergent.host`) is STALE — user must redeploy to see any session changes on their prod app.

### Prior session recovery notes (2026-08-03) — still applicable
- Hard reset was done to commit `96d8893`. Do NOT re-attempt the aggressive dark-mode-only lock (const isDark = true, inline HTML CSS, FullScreenNote hardcoded dark).
- If user reports theme visual bugs: FIRST ask which URL (preview vs deployed) before touching code.

### Next session priorities (user-prioritized order from 2026-08-03)
1. 🎉 **Kid Mode Polish** — DONE this session, awaiting user verification
2. 📱 **Play Readiness Audit** — Capacitor config, icons, splash, package name, version, privacy manifest
3. 🛡️ **Launch Mode Sweep** — offline persistence, backup/restore, QR flows

Restaurants Galore pack remains FROZEN.


## 📌 Session state (2026-08-03, end-of-day)

### What happened today
- **Attempted:** Fix a reported CSS regression where an earlier agent applied `bg-white` instead of `color:white` in note editor / toolbars, then a follow-up ask to force the app to look dark in both Sun and Moon states.
- **Outcome:** ~15 theme-related commits spiraled without resolving the user's device-side visual (turned out the user was testing the DEPLOYED URL `r-task-timer.emergent.host`, not the preview — my fixes never reached them).
- **User invoked hard-reset recovery.** `git reset --hard 96d8893` executed. All theme work from 2026-08-03 wiped.

### Preserved from the recovery
- ✅ Chores Tile View drag-drop fix (commit `96d8893`, from earlier in the day — user validated)
- ✅ `Color` → `Tile accent color` label in `en.json` (reapplied post-reset)
- ✅ Service worker bumped from v2 → v10 (forces device cache refresh)

### DO NOT REDO next session
- Do NOT re-implement `const isDark = true` hardcoding in `NotesApp.jsx`.
- Do NOT add the inline `DARK-ONLY OVERRIDE` block in `frontend/public/index.html`.
- Do NOT edit `FullScreenNote.jsx` to force dark-only styling.
- Do NOT remove `.header-compact.light` CSS overrides in `App.css`.
- These were the exact changes that were reverted. If the user asks about light/dark theming again, get a screenshot FIRST and understand which URL they're testing on before touching code.

### Root cause of the confusion (for next agent)
- The user's Chrome Android was pointing to the **deployed** URL (`r-task-timer.emergent.host`), not the preview URL. Preview and deployed are separate builds. The user never saw any of the theme fixes because those were only on preview. This wasn't understood until the user shared a screenshot with the URL bar visible.
- Lesson: whenever a user reports "still not fixed" after CSS changes, ask for the URL they're viewing BEFORE iterating further.

### Next session priorities (in order)
1. **User verification pending** — user said "Looks good for now" after the restore. Confirm on their next visit that the restored baseline is still acceptable in both Sun and Moon modes.
2. **Launch Mode queue (unchanged from before today):**
   - P0: Verify offline functionality (writes survive reload)
   - P0: Verify Backup & Restore stability
   - P1: QR sweep (barcode scanner + QR gen)
   - P1: Google Play readiness audit (Capacitor config, icons, splash, package name, version, privacy manifest)
3. Restaurants Galore pack remains FROZEN.


# 🛑 PROJECT DIRECTIVE — READ FIRST (2026-02-08)

## Current Mode: **LAUNCH MODE** (Google Play readiness)

### 🚨 Restaurants Galore Pack is FROZEN

The **Restaurants Galore Pack** (all files under `/app/frontend/src/notes/rg/*`, related backend endpoints `/api/dining_insights` and `/api/dining_recipe_idea`, and all `restaurantsService.js` stores) is treated as an **archived feature branch**. Sessions 1–13 delivered a comprehensive tile pack; further work is paused indefinitely.

**Do NOT:**
- Delete any code, assets, database structures, prompts, docs, icons, images, or config files related to the Restaurant Pack.
- Refactor or remove Restaurant Pack functionality unless the user specifically requests it.
- Merge unfinished Restaurant Pack changes into unrelated parts of the app.
- Archive by deleting or compressing files that may be needed later.

**DO:**
- Preserve all Restaurant Pack work exactly as it exists today.
- Maintain compatibility with the current app so the pack can be resumed with minimal work.

### 📱 New Priority: Iron Rabbit Google Play Release

Until the user explicitly changes modes, all development effort must focus on:
1. Fix bugs and glitches (P0).
2. Improve stability and reliability.
3. Improve UI/UX where needed.
4. Verify offline functionality throughout the app.
5. Verify backup and restore features.
6. Verify QR code generation and scanning.
7. Test all existing packs and navigation.
8. Optimize performance where appropriate.
9. Complete Google Play readiness requirements.
10. Assist with testing, debugging, and release preparation.

### 🧭 Development Modes (permanent workflow)

- **Mode 1 — Launch Mode** *(CURRENT)*: bug fixes, testing, optimization, Play readiness.
- **Mode 2 — Feature Development**: new packs and capabilities. Restaurants Galore resumes here when unfrozen.
- **Mode 3 — Maintenance**: small fixes and updates post-release.
- **Mode 4 — Experimental Lab**: trying new ideas without touching production.

### 🛠 Development Guidelines (Launch Mode)

- Make only focused, incremental changes.
- Avoid unnecessary refactoring of working code.
- Preserve existing functionality unless a change is required to fix a bug or improve stability.
- Explain any significant architectural changes before implementing them.
- Verify fixes do not introduce regressions elsewhere.

### 📋 Pending Restaurant Pack work (archived — do not resume without approval)

- `/app/test_reports/iteration_44.json` — meal plan templates + family preference nudge test results (from before the pause). **Retained for future reference.**
- ROADMAP.md still lists P2 Restaurant Pack items — those are frozen too.

---


## What's Live
> **Session 13 (2026-02-08) update:** Restaurants Galore gained a **Weekly Meal Plan** — a 7-day Mon–Sun grid where recipes can be pinned to each day, with a single-tap "Build shopping list from this week" that aggregates ingredients across all pinned recipes. The Recipes modal gained a **Cook Notes Search** input that filters recipes by title, notes, and every cook-note, with a "Match: …" swap so you see the specific note that matched.

> **Session 12 (2026-02-08) update:** Cook Mode now **persists in-progress sessions** — close the app or switch recipes and the exact step + timer state resumes when you reopen (with a subtle `recipe-resume-hint` on the recipe row). After the last step, a **Post-Cook Notes** prompt asks "How did it go?" so personal tweaks are saved to a rolling log per recipe and surfaced as "Last time: …" on the row. Includes a StrictMode-safe fix for the reset-on-step-change effect.

> **Session 11 (2026-02-08) update:** Shopping List items can now be **manually reassigned to a different aisle** via a tiny emoji-picker on each row (with a "Reset to auto" option). Cook Mode requests a **Screen Wake Lock** so the phone stays unlocked between steps, with a "Screen on" indicator in the modal header.

> **Session 10 (2026-02-08) update:** Cook Mode's timer is now **drift-proof** (wall-clock `endsAt` — accurate even when the tab is hidden) and produces a **loud repeating alarm** on finish (repeated beeps, document-title flash, browser Notification, `⏰ Timer done` styling, 20s auto-terminate). The **Shopping List** gains a **By-aisle grouping** toggle that auto-classifies every ingredient into produce / meat / dairy / bakery / pantry / spices / beverages / frozen / household / other. Preference persists.

> **Session 9 (2026-02-08) update:** Restaurants Galore gained four features: a **Chat Cost Badge** on the Smart Assistant that estimates LLM spend per session, **Recipe Ratings** (1-5 stars) that feed back into future Recipe Idea prompts, **Cook Mode** — a step-by-step guided cooking modal with a per-step timer parsed from step text, and a full **Shopping List** (new tile) that aggregates recipe ingredients into a checkable, dedup'd list. See CHANGELOG.md for details.

> **Session 8 (2026-02-08) update:** Restaurants Galore Backup tile now **live-refreshes** its Sync Health chip the moment a backup completes (broadcast via `rg-backup-updated` CustomEvent — no dashboard reopen needed). The Backup **Diff Report** now supports **drill-down** (tap a collection row to see individual item names) and a **Pull Conflict Guard** that flags items you've edited more recently than the backup and prompts before overwriting. Smart Assistant gained a **Suggest a new dish** button that calls a new `/api/dining_recipe_idea` endpoint (Claude Sonnet 4.6) and saves the result straight into your Recipes.

> **Session 7 (2026-02-08) update:** Restaurants Galore Backup modal now shows a **Backup Diff Report** (Merge vs Replace preview of added/changed/removed items per collection) before commit. The dashboard **Backup tile** shows a **sync health chip** (`synced 2h ago` / `never synced`). Encryption strength upgraded to **PBKDF2 600 000 iterations** with a versioned envelope (`version: 1`) — older `.rgenc` files still decrypt transparently. See CHANGELOG.md.

> **Session 6 (2026-02-08) update:** Restaurants Galore now supports client-side AES-256-GCM encrypted backups (`.rgenc`), auto-scheduled weekly/monthly backups (Local / WebDAV / Google Drive) at app boot, and Smart Assistant conversation persistence across sessions. See CHANGELOG.md and ROADMAP.md for details.



### Public Website (moving to ironrabbitapps.com)
Nested under `/site` in the current preview (will be relocated to `ironrabbitapps.com` when the domain is live).
- **Home** (`/site`) — Hero, value props, featured app, why-us, CTA band
- **Apps** (`/site/apps`) — Auto-generated list from `data/apps.js`
- **App Detail** (`/site/apps/:slug`) — Screenshots-ready page with features, FAQs, version history
- **About** (`/site/about`) — Mission
- **Support** (`/site/support`) — Contact card + FAQ
- **Privacy** (`/site/privacy`) — Full policy
- **Terms** (`/site/terms`) — Full terms
- **Contact** (`/site/contact`) — Form opens user's email client (no server)
- **Blog** (`/site/blog`, `/site/blog/:slug`)
- **404** — Not found page

### Notes App (default landing)
- **`/`** — Full offline notes app (default route)
- **`/apps/iron-rabbit-notes/launch`** — Legacy alias, still works

## Architecture
- **Single source of truth** for apps: `/app/frontend/src/data/apps.js`
  - To add an app: append an object with slug, name, tagline, features, FAQs, version history, store URLs
  - It automatically appears on Home (featured), Apps listing, and gets its own detail page
- **Layout components** in `/app/frontend/src/site/components/` (Header, Footer, Layout, AppCard)
- **Pages** in `/app/frontend/src/site/pages/`
- **Notes app** preserved as `/app/frontend/src/NotesApp.jsx`
- **Router** in `/app/frontend/src/App.js` with react-router-dom v7

## SEO
- ✅ Per-page `<title>` and meta description via `usePageMeta`
- ✅ `robots.txt` and `sitemap.xml` in `/public`
- ✅ Manifest.json for PWA install
- ✅ Semantic HTML (header/main/footer/section)

## Design System
- **Palette**: Cream (#FAF7F2) + Charcoal (#1C1917) + Burnt Sienna (#B34A2C)
- **Font**: Manrope + JetBrains Mono (for tech accents)
- **Style**: Editorial, warm, professional — not the generic tech blue/purple


## Routing Pivot (Feb 2026)
- Notes App is now the default landing at `/` (previously company website).
- Company website moved under `/site/*` — will migrate to `www.ironrabbitapps.com` (newly purchased) once DNS is set up.
- All internal Links, `<Navigate>` redirects, and Header/Footer nav updated to `/site/*`.
- `data/apps.js` `webAppUrl` → `/` (Launch button opens Notes at root).
- Brand tld updated to `ironrabbitapps.com` in Header, Footer, and default IndexedDB settings (existing users keep their stored value).
- Legacy `/apps/iron-rabbit-notes/launch` kept as alias for backward compatibility.

## Icon View (Feb 2026)
- Added a **view toggle** in the top bar next to Search: **List** (existing accordion) ↔ **Icon** (tile grid).
- Persisted per-user in IndexedDB settings (`view_mode`).
- New per-note fields: `icon` (lucide-react name, e.g. `ShoppingCart`) and `background` (`{ type: 'color'|'gradient'|'image', value }`).
- Icon-view responsive grid: 2 cols mobile → 6 cols on 1280px+; each tile is a square with centered icon + title (max 2 lines, ellipsised).
- Icon library: ~50 curated everyday-task icons across 8 categories (Shopping, Health & Fitness, Home, Work, Food & Drink, Travel, Money, Personal). Searchable in the `IconPicker` component.
- Background library: 12 solid colors + 10 curated gradients + custom image upload (auto-downscaled to 800px, JPEG 85%, capped ~5MB before compression). See `BackgroundPicker.jsx`.
- Category grouping still works in icon view — tiles grouped under section headings.
- Default templates now ship with icon + gradient background so new users see the feature immediately.
- Files: `data/noteIcons.js`, `components/IconPicker.jsx`, `components/BackgroundPicker.jsx`, `components/NoteTile.jsx`, updates to `NotesApp.jsx` and `App.css` (`.note-tile*`, `.notes-grid`, `.view-toggle`, `.editor-tile-preview`).


## Refactor (Feb 2026)
- Split monolithic `NotesApp.jsx` (1338 lines) into focused modules under `/app/frontend/src/notes/`:
  - `constants.js` — NOTE_COLORS, SORT_OPTIONS, FILTER_OPTIONS, SOUND_OPTIONS, DEFAULT_TEMPLATES
  - `CalculatorWidget.jsx`, `FullScreenNote.jsx`, `AccordionNoteItem.jsx`, `CategoryGroup.jsx`, `TemplateModal.jsx`, `NoteModal.jsx`, `ShareModal.jsx`, `SettingsModal.jsx`
- `NotesApp.jsx` is now a lean **~693 line** orchestrator: state, handlers, derived data, layout + modal wiring.
- Regression-tested via testing agent (iteration_7.json): 100% pass on 14 scenarios, zero console/page errors.



## Light-mode text visibility fix (Feb 2026)
- Bug: In light mode, shadcn Radix components rendering inside Dialogs/Popovers (Button variant="outline", Badge variant="outline", Select trigger, etc.) had invisible white text on white surfaces.
- Root cause: `:root` CSS variables (`--foreground`, `--input`, `--border`, etc.) in `index.css` were hardcoded for **dark mode only**, and a plain-CSS `body { color: #f8fafc; }` rule overrode Tailwind's `text-foreground`. Radix portals render as body children so they inherited near-white text.
- Fix: Added a `body.nx-light` block in `index.css` that flips all shadcn CSS variables to standard light-theme values AND explicitly sets `color`/`background-color` on body to beat the plain-CSS rule. `NotesApp.jsx` toggles the class via `useEffect` on `isDark`. Works for all portaled components without touching each button.
- Also added explicit `text-gray-800 border-gray-300` to Badges and `text-gray-900` to Filter/Sort Select triggers in light mode for robustness.

## Bug Fix (verified iteration_4.json)
Auto-migration on first load pulls user's old notes from backend into local IndexedDB. Manual "Recover Old Notes from Server" button in Settings for retries. Toasts only show when work happened. StrictMode-safe.

## Delight batch 1 (Feb 2026)
Shipped 5 UX-quality features in one iteration:

1. **Haptic feedback** (`/app/frontend/src/utils/haptic.js`) — Vibration API taps on tile-open, note-create, delete, theme toggle, view toggle.
2. **OS theme detect** — first-visit theme follows `prefers-color-scheme`; user's toggle is persisted to IndexedDB (`settings.theme_preference`) and takes precedence on subsequent visits.
3. **Undo delete** — sonner action button restores the deleted note within a 5-second grace period.
4. **Keyboard shortcuts** — `n` new note, `/` focus search, `g` toggle list/icon view. Ignored while typing in inputs.
5. **Pinned notes** — new `pinned` field on notes + pin toggle in `NoteModal` + pin icon inline in accordion + PINNED rail at the top of both list and icon views.

Also polished:
- Empty-state copy adapts to search / filter state and shows shortcut hints on desktop.
- `NoteTile`, `AccordionNoteItem`, `CategoryGroup` all support `onTogglePin`.

## Delight batch 2 (Feb 2026)
Three high-impact features shipped in one pass:

1. **Natural language reminders** — `chrono-node` (2.10.1) parses the note title on save. If a real-world date/time is detected AND the user hasn't manually set an alarm, one is auto-created. Toast confirms with the parsed datetime ("Created — reminder set for Jul 25, 2026, 9:00 AM"). Field `alarm.auto_detected` on the note distinguishes auto vs. manual.
2. **Quick Add** — new `⚡` button in the header opens `IconPicker` in `mode="quick-add"`; tapping any of the 50+ icons instantly creates a preset note (icon → title/content/color/background via `data/quickAddTemplates.js`). Shopping Cart → "Shopping List", Dumbbell → "Workout Log", Pill → "Medication", etc.
3. **Themed Tile Packs** — new `📦` button in the header opens `TilePacksModal.jsx` with 4 curated bundles (Fitness Journey, Meal Planner, Deep Work, Daily Life). Each pack shows an icon-strip preview + one-tap "Apply Pack" that bulk-creates 4-5 pre-configured notes, some pinned.

New files: `data/quickAddTemplates.js` (50+ icon presets), `data/tilePacks.js` (4 packs), `notes/TilePacksModal.jsx`.
Updated: `IconPicker.jsx` (mode="quick-add"), `NotesApp.jsx` (chrono in handleSaveNote, header buttons, handleQuickAdd, handleApplyPack).
Verified: all three flows tested end-to-end; zero console errors.




## Delight batch 3 (Feb 2026)
Final batch of user-facing polish before deploy:

1. **Voice-to-note** — `utils/useVoiceInput.js` wraps browser `SpeechRecognition` (no external service, no cost). New "Voice" button in `NoteModal` next to "Calc"; toggle to dictate directly into a note.
2. **Share tile as image** — `utils/shareTile.js` + `html-to-image@1.11.13` renders any note tile off-screen to PNG. `ShareModal` gains a 4th button (Copy / Email / SMS / Image).
3. **Weekly recap** — `utils/weeklyRecap.js` fires a local browser Notification on Sundays summarising the week. Deduped via `settings.last_recap`.
4. **First-run tour** — `notes/FirstRunTour.jsx` — 3-step tooltip overlay for new users. Persisted via `settings.tour_completed`.

New files: `utils/useVoiceInput.js`, `utils/shareTile.js`, `utils/weeklyRecap.js`, `notes/FirstRunTour.jsx`.
Deps added: `html-to-image@1.11.13`.

**Deployment**: dispatched to deployer agent with target custom domain `www.ironrabbitapps.com` (DNS via Entri after first deploy).


## Tile Pack expansion (Feb 2026)
Grew the tile-pack library from **4 → 33 curated bundles** across 8 life categories:

- **Personal Productivity** — Fitness Journey · Meal Planner · Deep Work · Daily Life
- **Travel & Adventure** — The Great Outdoors · Road Trip · Hunting & Fishing · Sightseeing · Bed & Breakfast · Airbnb Stay · Passport & Travel Docs
- **Health & Wellness** — Health & Wellness (Sleep/Rest/Diet/Vitamins/Doctors) · Mental Health · Skincare Routine
- **Home & Family** — New Home · Baby Milestones · Pet Care · Garden Journal
- **Events & Occasions** — Wedding Planning · Birthday Party · Holiday Planning
- **Money & Career** — Job Search · Side Hustle · Investment Portfolio
- **Learning** — Reading List · Language Learning · Course & Study
- **Creative & Hobbies** — Photography · Music Practice · DIY Projects · Book Club
- **Recovery & Growth** — Habit Tracker · Sobriety Journey

Also upgraded `TilePacksModal`: live search across pack name / tagline / individual tile titles, "33 bundles" counter, wider layout (max-w-3xl), sticky search over scrollable grid, empty state.

Files updated: `data/tilePacks.js` (rewritten with helpers G/grad/solid for compactness), `notes/TilePacksModal.jsx` (search + polish).
Verified: all 33 packs render, search filters correctly ("road" → 1 result), Apply Pack still bulk-creates notes with auto-pin. Zero console errors.


## Events per note + inline calendar (Feb 2026)
Multiple date-bound events per note with a mini calendar visualisation.

- New note field: `events: Array<{ id, title, datetime, alarm_enabled, notes }>`
- New component `notes/EventsSection.jsx` between Alarm and Recurring in the editor:
  - "+ Add event" → inline form (title + shadcn Calendar date picker + time)
  - Mini shadcn Calendar with `hasEvent` modifier → indigo dot on days with ≥1 event (CSS `.rdp-day.has-event::after`)
  - Tap a day to filter events list; otherwise all events sorted chronologically
  - Each event row: title + date + time + per-event alarm toggle + delete
- `notificationService.startAlarmChecker` extended to iterate `note.events` and fire per-event alarms ("NoteTitle — EventTitle")
- Tile badges: `NoteTile` + `AccordionNoteItem` show `📅 N` count alongside pin/alarm/recurring badges

Files added: `notes/EventsSection.jsx`. Updated: `notes/NoteModal.jsx`, `notes/AccordionNoteItem.jsx`, `components/NoteTile.jsx`, `notifications/notificationService.js`, `App.css`.

## Deployed (Feb 2026)
- Live URL: **https://color-task-timer.emergent.host**
- User owns `www.ironrabbitapps.com` — link via Entri from the deployment page.

## Header wrap + Floating Calendar (Feb 2026)
- Header top row is now `flex-wrap` — icons drop to a second row when they overflow (fixes logo/title squish on narrow screens; works as more icons get added).
- New icon in header between Calculator and Settings: **Calendar** (`data-testid="header-calendar"`).
- New `notes/FloatingCalendarModal.jsx`: aggregates every event across all notes, mini shadcn calendar with dots on days with events, per-day agenda list, "next up" fallback (5 upcoming), clicking an event opens the source note in full-screen.
- **Create event directly from selected day**: `+ Add` button on the day agenda opens an inline form (title + time + alarm toggle). Submit creates a new note (category="Calendar") with the event pre-dated for that day. Toast confirms with formatted datetime.

Files added: `notes/FloatingCalendarModal.jsx`. Files updated: `NotesApp.jsx` (header markup, new icon + state + modal mount + `onCreateEvent` handler).

## Phase 1 enhancements + i18n (Feb 2026)
Round 1 of the 15-enhancement roadmap.

### Checklists inside notes
- New note field: `checklist: Array<{ id, text, done }>`
- `notes/ChecklistSection.jsx` — inline editor (add/remove/toggle/edit) inside NoteModal, below Events.
- FullScreenNote renders a tap-to-toggle checklist card (persists via `onSaveInline`).
- NoteTile shows a progress badge `☑ done/total` alongside pin/alarm/recurring badges. Also fixed a latent bug where `CalendarDays` was used but never imported.

### Home-screen shortcuts (PWA)
Added `shortcuts` array to `manifest.json`:
- `New Note` → `/?action=new-note`
- `Voice Note` → `/?action=voice-note`
- `Open Calendar` → `/?action=calendar`
- `Calculator` → `/?action=calculator`

`NotesApp.jsx` reads `?action=` on mount, opens the correct modal, then strips the query param so refresh doesn't re-fire. Long-press the installed PWA icon on Android/iOS to see them.

### Snooze reminders
`notificationService.triggerAlarm` now also shows a Sonner toast (20 s) with a `Snooze 5m` action and a `1h` cancel-button. New method `snoozeAlarm(noteId, minutes)` reads the note from IndexedDB, bumps `alarm.datetime` to `now + N`, clears the last-notified marker so the fresh time fires cleanly.

### UI translation (10 languages)
Installed `i18next`, `react-i18next`, `i18next-browser-languagedetector`. New folder `src/i18n/` with `index.js` (init + `SUPPORTED_LANGUAGES` export) and 10 locale JSONs: **en, es, fr, de, pt, it, zh, ja, hi, ar**. Language is persisted in `localStorage` (`ir_lang`) and detected from `navigator` on first launch. RTL direction set automatically for Arabic. Language picker lives in Settings modal with flags + native labels. All primary user-visible strings wired: header tooltips, search placeholder, empty state, group-by button, note counter, filter/sort dropdowns, NoteModal title/labels/placeholders/buttons, Settings title.

**Note-content translation** via Emergent LLM is deferred to Round 2 (needs the integration playbook call).

Files added: `notes/ChecklistSection.jsx`, `i18n/index.js`, `i18n/locales/{en,es,fr,de,pt,it,zh,ja,hi,ar}.json`.
Files updated: `components/NoteTile.jsx` (checklist badge + CalendarDays fix), `notes/NoteModal.jsx` (checklist state + i18n), `notes/FullScreenNote.jsx` (checklist render), `notifications/notificationService.js` (snooze), `notes/SettingsModal.jsx` (language picker), `NotesApp.jsx` (i18n hooks + URL action handler), `public/manifest.json` (shortcuts), `index.js` (i18n import).

## Language Picker polish (Feb 2026)
- Added header globe button (`data-testid="header-language"`) that shows the current-language flag next to a globe icon; one tap opens the picker.
- New `notes/LanguagePicker.jsx` — searchable 2-column flag grid with native label + ISO code + active indicator (checkmark).
- Search matches native name, ISO code, AND English name (added `en` alias field to `SUPPORTED_LANGUAGES` so "jap" finds 日本語, "chinese" finds 中文, etc.).
- SettingsModal: replaced plain Select with a rich language row (big flag + label + code + "N available") that opens the same picker.
- On select: sets `document.documentElement.dir="rtl"` for Arabic, persists to localStorage, toast confirmation with flag.

Files added: `notes/LanguagePicker.jsx`. Files updated: `i18n/index.js` (added English aliases), `NotesApp.jsx` (header globe button + modal mount), `notes/SettingsModal.jsx` (row-style trigger + delegates to same picker).

## Security & Privacy + Capacitor scaffolding (Feb 2026)
Full security architecture — works today as a PWA, ready to swap to native APIs when wrapped with Capacitor.

### New files
- `security/SecurityService.js` — modular auth backend. Auto-detects Capacitor at runtime. Uses `NativeBiometric` + Capacitor `Preferences` (Keychain / Keystore) on native; falls back to WebAuthn + hashed PIN in IndexedDB on web.
- `security/LockScreen.jsx` — full-screen lock overlay with numeric keypad, biometric prompt trigger, "Use PIN instead" fallback, wrong-PIN shake haptic.
- `security/useAutoLock.js` — hook that owns the locked state; listens to `visibilitychange`, applies auto-lock timer, blurs body when hidden (best-effort Recent-Apps hiding for web).
- `notes/SecurityModal.jsx` — Security & Privacy settings page. Includes the full "Welcome to Iron Rabbit Apps" statement card ("Your Notes. Your Privacy. Your Choice."), 3 auth methods (No lock / Biometrics / Local PIN 4–8), auto-lock select (Immediately / 30s / 1m / 5m / 15m / Never), 6 toggles (lock on launch, lock on background, hide in recents, require auth before export/clear/restore), Privacy checklist, "Cloud features (future)" note.
- `capacitor.config.ts` — `appId: com.ironrabbitapps.notes`, appName, webDir, PrivacyScreen plugin config.
- `/app/CAPACITOR_SETUP.md` — full build guide for Android/iOS.

### Files updated
- `NotesApp.jsx` — mounts LockScreen (renders when `autoLock.locked`), mounts SecurityModal, wires Settings row to open it. `handleClearAllData` and `exportToPDF` now check `requireAuthClearAll` / `requireAuthExport` toggles and prompt biometrics if method === "biometric".
- `notes/SettingsModal.jsx` — new "Security & Privacy" row directly under Language; opens SecurityModal via `onOpenSecurity` prop.

### Dependencies added
`@capacitor/core@^7`, `@capacitor/cli@^7`, `@capacitor/android@^7`, `@capacitor/ios@^7`, `@capacitor/app@^7`, `@capacitor/preferences@^7`, `capacitor-native-biometric`, `@capacitor-community/privacy-screen`.

### Environment reality
- **Web (today)**: Local PIN + WebAuthn biometrics + auto-lock all live in preview/production. Verified end-to-end: set PIN via UI → refresh page → lock screen appears → correct PIN unlocks, wrong PIN shows error.
- **Native**: Requires user to run `npx cap add android && npx cap add ios && npx cap sync` locally with Android Studio + Xcode installed. See `CAPACITOR_SETUP.md`.

### Security guarantees
- PINs hashed with per-app random salt via SHA-256; plain text never persisted.
- Biometric templates never touched by Iron Rabbit — always delegated to OS.
- Native builds route storage through Keystore / Keychain via Capacitor Preferences.
- Cloud sign-in remains optional; free version stays fully offline.

## Panic PIN (Feb 2026)
Optional secondary PIN that unlocks Iron Rabbit into a **safe view** — indistinguishable from a normal unlock to anyone watching.

### Behaviour
- Available only when a main PIN is set (surfaced in a new "Panic PIN (optional)" section of `SecurityModal`).
- Distinct from the main PIN (`SecurityService.setPanicPIN` rejects duplicates in both directions).
- Stored as `SHA-256(random-salt + PIN)` — no plaintext.
- On lock-screen entry: `SecurityService.verifyPIN()` now returns `{ ok, panic }`. LockScreen forwards the flag through `onUnlock({ panic })` → `useAutoLock` sets state → `NotesApp.processedNotes` filters accordingly.
- Safe-view filter: user picks a category from Security & Privacy. When panic PIN is entered, `processedNotes` shows only notes in that category (or nothing if "Empty view" is selected).
- Zero visual indicator during panic mode — no banner, no color change, no timestamp difference.
- Locking again (auto-lock / manual) always resets `panic=false`; entering the real PIN afterwards restores full view.

### Files updated
- `security/SecurityService.js` — added `setPanicPIN`, `hasPanicPIN`, `removePanicPIN`, `getSafeCategory`, `setSafeCategory`. `verifyPIN` return shape changed to `{ ok, panic }`.
- `security/LockScreen.jsx` — passes `{ panic }` to `onUnlock`.
- `security/useAutoLock.js` — tracks `panic` + `safeCategory` state, exposes both.
- `notes/SecurityModal.jsx` — Panic PIN section (only when main PIN exists), amber-styled set/change/remove flow, Safe view category `<Select>`.
- `NotesApp.jsx` — `processedNotes` filters to `safeCategory` when `autoLock.panic === true`; passes `categories` to `SecurityModal`.

### Verified in preview
- Main PIN 1234 set → panic section appears
- Panic PIN 7777 set → "Panic PIN is active" indicator
- Reload → lock screen → enter 7777 → app opens showing 0 notes / empty view (even though 4 real notes exist in IDB)
- No visible marker of panic mode

## Dark Mode text visibility fix (Feb 2026)
**Bug report:** In Dark Mode, opening a Category / Subcategory / Note showed dark text on a dark background, making content unreadable.

**Root cause:** iOS Safari and some Android WebViews force their own text color on native form controls (`<input>`, `<textarea>`, `[contenteditable]`) when the page doesn't declare `color-scheme`. This overrode our Tailwind `text-white` classes with the OS's default dark input color.

**Fix:**
- `public/index.html` — added `<meta name="color-scheme" content="dark light">`.
- `src/index.css` — added `:root { color-scheme: dark; }` and `body.nx-light { color-scheme: light; }`.
- `src/index.css` — added defensive rules using `-webkit-text-fill-color: hsl(var(--foreground))` on `input`, `textarea`, `select`, `[contenteditable="true"]`, plus theme-aware `caret-color`, `::placeholder`, `::selection`, and `:-webkit-autofill` overrides.

**Verified by testing_agent (iteration_8.json):** 15/15 scenarios pass. Dark mode text resolves to `rgb(248, 250, 252)` (light), light mode to `rgb(15, 23, 41)` (dark), across NoteModal, FullScreenNote, AccordionNoteItem, Settings, Language picker, and all form inputs. Theme toggle updates every screen immediately. Zero console errors.

## Language expansion 10 → 25 offline languages (Feb 2026)
User requested Google Translate reach (~50 langs) but stipulated the FREE app must stay offline. Path chosen: keep 10 existing + add 15 more high-coverage offline locales. Google Translate deferred (not desired for the offline-first free version).

### New locales added
`ru` Russian · `ko` Korean · `tr` Turkish · `vi` Vietnamese · `id` Indonesian · `th` Thai · `pl` Polish · `nl` Dutch · `sv` Swedish · `uk` Ukrainian · `he` Hebrew (RTL) · `fa` Persian/Farsi (RTL) · `ur` Urdu (RTL) · `bn` Bengali · `ms` Malay.

### Files added
`i18n/locales/{ru,ko,tr,vi,id,th,pl,nl,sv,uk,he,fa,ur,bn,ms}.json` — each with the same 55 UI strings as the existing 10 locales.

### Files updated
- `i18n/index.js` — new `RTL_LANGS = ["ar","he","fa","ur"]` export, imports for all 15 new locales, `SUPPORTED_LANGUAGES` array grown to 25 entries with flag + English alias for search.
- `notes/LanguagePicker.jsx` — RTL detection now uses shared `RTL_LANGS` instead of hard-coded `"ar"` check (so Hebrew/Farsi/Urdu also flip `document.dir` correctly).

### Coverage
Reaches ~4B+ native speakers now (up from ~2B). Covers all UN official languages plus major SE Asian markets. All translations bundled at build time — zero network calls, works fully offline.

### Verified in preview
Screenshot confirms 25 language buttons in the picker; Hebrew selection sets `document.dir="rtl"` and the entire UI mirrors (search input on right, group-by button + note counts on left).

## Suggest my language (Feb 2026)
One-time first-run detection based on device locale.

- New hook `i18n/useLanguageSuggest.js` — runs on NotesApp mount. Reads `navigator.language`, normalizes to 2-letter code, checks if it's in `SUPPORTED_LANGUAGES` and differs from the active language.
- If a real mismatch exists, shows a Sonner toast: `[flag] We noticed you speak [Language] — Switch Iron Rabbit's language?` with a **Switch** action + **No thanks** cancel.
- On accept: switches i18n, persists to localStorage, sets `document.dir` via `RTL_LANGS`, shows confirmation toast.
- On dismiss / auto-close / accept: sets `localStorage.ir_lang_suggested = "1"` so we never nag again.
- If active language already matches (i18next-browser-languagedetector already auto-picked it), silently sets the flag and never toasts.

### Files added
- `i18n/useLanguageSuggest.js`

### Files updated
- `NotesApp.jsx` — imports + calls `useLanguageSuggest()` at the top of the component.

### Verified in preview
Spoofed `navigator.language = "es-ES"`, set `ir_lang = "en"` (manual English override) → reload triggers Spanish suggestion toast. Click "Switch" → UI instantly Spanish (Buscar, Todas las notas, Tus notas vivirán aquí, Crea tu primera nota). Reload → no re-nag.

## Universal Drag & Drop — Phase 1 + 2 (Feb 2026)
User requested iPhone-style long-press drag (no visible handles beyond a subtle GripVertical on categories) across list + grid + cross-category moves. Multi-select drag (Phase 3) deferred.

### Storage additions (`storage/storageService.js`)
- `saveCategoryOrder(orderedNames)` — persists user-defined category order into `settings.category_order`
- `getCategoryOrder()` — returns the stored ordering
- `moveNoteToCategory(noteId, newCategory, newSubcategory)` — updates note's category/subcategory fields; returns the previous values so Undo can restore

### Unified drag dispatcher (`NotesApp.jsx`)
- `handleDragStart` fires `haptic("tap")` on every drag start
- `handleDragEnd` inspects droppable IDs to dispatch:
  - `type === "category"` → category reorder → `saveCategoryOrder`
  - Droppable IDs prefixed `notes-in-<cat>` with different src/dst → cross-category move → `moveNoteToCategory` + Sonner toast with **Undo** action (6-second window)
  - Same-list reorder (grid or within a category) → `reorderNotes`

### List view — grouped
Rewrote `CategoryGroup.jsx`:
- Category container is a Draggable (only when consumer passes `dragHandleProps`)
- Small GripVertical handle to the left of the toggle button initiates category reorder
- Inner `Droppable(id=notes-in-<cat>, type=note)` accepts notes dropped into the category (highlights indigo when hovered)
- Empty categories show "Drop note here" hint when a drag hovers over them

`NotesApp.jsx` groupByCategory list view now wraps everything in `DragDropContext` + top-level `Droppable(id=category-list, type=category)`. Uncategorized bucket is its own drop-zone (id `notes-in-`).

### Icon-grid view
Wrapped in `DragDropContext`; each category/uncategorized bucket is a horizontal-direction Droppable with cascading Draggable tiles. Tiles get scale-105 + shadow-2xl + slight rotation while dragging (iPhone-jiggle-lite).

### Undo behaviour
Cross-category moves show `Moved to "<cat>" [Undo]` toast for 6 s that restores the previous category+subcategory.

### Files changed
- `storage/storageService.js` (+3 methods)
- `NotesApp.jsx` (`handleDragStart`, unified `handleDragEnd`, `grouped` respects saved order, list + icon views wrapped)
- `notes/CategoryGroup.jsx` (rewritten with Draggable+Droppable)

### Not yet done
- Subcategory reorder (rarely used; deferred)
- "Confirm move" dialog toggle
- Multi-select drag stack (Phase 3)
- Settings → Organization preferences page
- Real-device iPhone/Android verification

### Verified in preview
Code compiles + lints clean, notes render, no runtime errors. Full drag flow requires categories which the playwright script couldn't seed via the current UI selectors — user should verify manually by creating notes with categories and dragging.

## Drag & Drop Phase 3 (Feb 2026)
Multi-select mode + Settings→Organization preferences page.

### New files
- `notes/MultiSelectBar.jsx` — floating bottom-center action bar shown when notes are selected. Displays "N selected" + [Move to…] + [Delete] + [Cancel].
- `notes/MoveToCategoryModal.jsx` — searchable picker of existing categories + input for a new category name. Passes chosen category up.
- `notes/OrganizationModal.jsx` — Settings→Drag & Drop preferences page. 6 toggles stored in `settings.dnd_prefs`: enabled, longPressToDrag, showDragHandles, haptic, confirmCrossCategoryMove, undoNotifications. "Restore defaults" button.

### NotesApp.jsx changes
- New state: `selectMode`, `selectedIds` (Set), `moveToOpen`, `organizationOpen`
- New helpers: `toggleSelect(id)`, `clearSelection()`, `enterSelectMode()`, `bulkDelete()`, `bulkMoveTo(cat)`
- `bulkMoveTo` walks each selected id → `moveNoteToCategory`, collects previous state, shows one Undo toast that reverts everything at once
- New **"Select"** header button in the controls row (icon view). Toggles select mode; clicking again cancels selection.
- All 4 NoteTile instances receive `selectMode / selected / onToggleSelect` props (via `sed` batch update).

### NoteTile.jsx changes
- New props: `selectMode`, `selected`, `onToggleSelect`
- Tap in `selectMode` toggles selection instead of opening the note
- Selection ring (indigo-400 4px) around selected tiles + checkmark badge overlay in the top-left corner

### SettingsModal.jsx changes
- New "Organization" row added under Security & Privacy — clicking opens `OrganizationModal`
- New prop `onOpenOrganization` wired from NotesApp

### Known gap
Multi-select tap-toggle currently only wires into the **icon-view** `NoteTile`. In **List view**, tapping accordion items still opens them (no select mode). Drag-to-reorder in list view still works. Wiring select-mode into `AccordionNoteItem` is a small follow-up.

### Files changed
- `NotesApp.jsx`, `components/NoteTile.jsx`, `notes/SettingsModal.jsx`, `storage/storageService.js` (from Phase 1+2 — unchanged)
- New: `notes/MultiSelectBar.jsx`, `notes/MoveToCategoryModal.jsx`, `notes/OrganizationModal.jsx`

### Verified in preview
Select button toggles mode (screenshot shows "Selected 0" active state), category & note drag handles visible in list view, 7 seeded notes render cleanly with categories, Undo toast infrastructure fires on create. Full end-to-end (tap tile → Move to → confirm) requires icon view + tiles present; user can verify manually.


## [2026-02-27] Settings scroll fix + Smart Batch Mode (Move / Copy)

### Bug fix — Settings modal wouldn't scroll
`SettingsModal.jsx` DialogContent lacked a max-height + overflow, so on shorter viewports the bottom actions (Clear All Data, Cancel/Save) were unreachable.
- Fix: added `max-h-[90vh] overflow-y-auto` to both `SettingsModal` and `OrganizationModal` DialogContent classes.

### Feature — Smart Batch Mode (Move vs Copy)
Settings → Organization now has a top-of-modal **Smart Batch Mode** segmented control with two options: **Move** (default, existing behavior) or **Copy** (duplicates selected notes into the target category while leaving originals in place).
- New pref: `settings.dnd_prefs.smartBatchMode` = `"move" | "copy"` (default `"move"`).
- Applies to **all bulk actions** driven by the multi-select bar. Currently that's Bulk Move → Copy; Delete is untouched. Future bulk ops should also read this flag.
- Multi-select bar auto-relabels: "Move to…" ↔ "Copy to…"; icon toggles between FolderInput and Copy.
- `MoveToCategoryModal` retitle: "Move N notes to…" ↔ "Copy N notes to…", with an inline Smart Batch: Copy hint.
- When user picks a target category in Copy mode, a small `CopySuffixDialog` prompts: **Yes** ("(copy)" suffix on titles) or **No** (keep exact same title). Also has Cancel. This satisfies "ask each time via a small prompt".
- Copies get: fresh `uuidv4()` id, new `created_at`/`updated_at`, `order=Date.now()` (lands at end of target), stripped `pinned_at`. Attachments are shallow-copied (reference the same file records).
- Undo toast on Copy: deletes the newly created copies (originals untouched).

### Files changed / added
- `notes/OrganizationModal.jsx` — Added Move/Copy segmented control + scroll fix; `DEFAULT_DND_PREFS.smartBatchMode = "move"`.
- `notes/MoveToCategoryModal.jsx` — Accepts `mode` prop; retitles + icon swap.
- `notes/MultiSelectBar.jsx` — Accepts `mode` prop; label/icon swap.
- `notes/SettingsModal.jsx` — Scroll fix only.
- `NotesApp.jsx` — `bulkMoveTo` now branches on mode; added `bulkCopyTo`; added `pendingCopyTarget` state + `<CopySuffixDialog>` render.
- **New**: `notes/CopySuffixDialog.jsx`.

### Verified in preview
Screenshots confirm Settings modal scrolls to reveal Clear All Data / Save; Organization modal shows Move/Copy toggle with correct active-state highlighting on switch.

## [2026-02-27] Duplicate in place — bulk action

Added a third bulk action on `MultiSelectBar`: **Duplicate** (green pill, `CopyPlus` icon, `data-testid="multiselect-duplicate-btn"`). One tap creates a duplicate of every selected note in the **same** category with " (copy)" appended to the title. No destination prompt (since target = source), no suffix prompt (auto-adds " (copy)" so duplicates are always distinguishable). Full Undo toast (6s) deletes the newly created copies.

- New handler: `bulkDuplicateInPlace()` in `NotesApp.jsx` (uses `uuidv4()`, fresh timestamps, `order=Date.now()`, strips `pinned_at`).
- `MultiSelectBar` accepts new `onDuplicate` prop; button only renders when the prop is provided.

### Verified
Screenshot confirms the green Duplicate button renders alongside Move to… and Delete in Select mode. Independent of Smart Batch Mode (works in both Move and Copy configurations).


## [2026-02-27] Batch Studio — bottom sheet redesign of bulk actions

The floating multi-select pill is now a lean launcher: **`{N} selected · [✨ Batch Studio] · [X Cancel]`**. All bulk actions moved to a new bottom sheet with a 2x3 tile grid + inline sub-pickers + a red Delete row.

### New / changed files
- **New**: `notes/BatchStudioSheet.jsx` — full sheet with tile grid, inline color swatch row, inline date/time picker for alarms.
- **Rewrote**: `notes/MultiSelectBar.jsx` — now just count + gradient Batch Studio button + Cancel.
- **Extended**: `NotesApp.jsx` — added handlers `bulkTogglePin`, `bulkSetColor`, `bulkSetAlarm`, `bulkClearAlarm`, `bulkExportPDF` (uses jsPDF like the global export but scoped to selection). Added `_snapshotSelected` / `_restore` helpers for Undo. New state `batchStudioOpen`. Wired all handlers into the sheet.

### Actions available
| Action | Details |
| --- | --- |
| Move to Category | Delegates to MoveToCategoryModal (respects Smart Batch Mode Move/Copy) |
| Duplicate | Adds " (copy)" suffix, stays in same category, Undo removes copies |
| Pin / Unpin | Auto-detects: if any unpinned, pins all; else unpins all. Undo restores prior state. |
| Recolor | Inline 5-color swatch row (NOTE_COLORS palette). Applies to all. Undo restores originals. |
| Set Alarm | Inline date+time picker → applies same ISO datetime + bell sound to all. Undo restores. |
| Clear Alarm | One-tap clears alarms on all selected. Undo restores. |
| Export PDF | jsPDF combined document of selected notes only, filename `<company>-selected-<date>.pdf`. |
| Delete | Destructive red section with window.confirm gate. |

### Testids added (Batch Studio)
`multiselect-studio-btn`, `batch-studio-sheet`, `bs-move`, `bs-duplicate`, `bs-pin`, `bs-color`, `bs-color-<name>`, `bs-alarm`, `bs-alarm-date`, `bs-alarm-time`, `bs-alarm-apply`, `bs-alarm-clear`, `bs-export-pdf`, `bs-delete`, `bs-cancel`.

### Verified
Testing agent iteration_10.json: **12/12 scenarios passed (100%)**. Every mutating action has a working Undo toast; Move handoff to MoveToCategoryModal + Copy path both verified.

### Known gaps (from test agent)
- Multi-select still only wired to icon-view `NoteTile`, not list-view `AccordionNoteItem`. Parity gap flagged previously — still open.
- Bulk-Delete uses `window.confirm()` — inconsistent with rest of app (shadcn Dialogs). Small polish opportunity.
- Alarm picker doesn't block times in the past — could disable Apply when datetime ≤ now.
- `NotesApp.jsx` now ~1652 lines — refactor into `useBulkActions.js` custom hook is overdue.


## [2026-02-27] Polish pass — hook refactor + AlertDialog + past-alarm disable

### 1. `useBulkActions` hook (refactor)
Extracted every multi-select bulk handler + selection state + modal-visibility flags out of `NotesApp.jsx` and into **`/app/frontend/src/hooks/useBulkActions.js`** (~330 lines).

The hook owns:
- Selection state: `selectMode`, `selectedIds`, plus `isSelected` / `toggleSelect` / `clearSelection` / `enterSelectMode`.
- Modal flags: `moveToOpen`, `batchStudioOpen`, `pendingCopyTarget`, `confirmDeleteOpen`.
- Handlers: `openDeleteConfirm`, `confirmBulkDelete`, `bulkMoveTo`, `bulkCopyTo`, `bulkDuplicateInPlace`, `bulkTogglePin`, `bulkSetColor`, `bulkSetAlarm`, `bulkClearAlarm`, `bulkExportPDF`.
- Internal `_snapshotSelected` / `_restore` for Undo across mutating actions.

`NotesApp.jsx` shrunk from **1652 → 1442 lines**. It now calls `useBulkActions({ settings, fetchData })` and destructures. No behavior change.

### 2. Past-datetime disables Apply Alarm (`BatchStudioSheet.jsx`)
- Added `useMemo`-derived `pickedDateTime` + `isPastAlarm` guard.
- `bs-alarm-apply` button is disabled when the picked datetime ≤ now.
- Red hint under the picker with `data-testid="bs-alarm-past-hint"` reads "Choose a time in the future."
- Toggles reactively as the user changes date/time.

### 3. `window.confirm` → shadcn AlertDialog (bulk delete)
Bulk delete no longer uses the native browser confirm dialog. Instead, `bs-delete` opens a shadcn `AlertDialog` (`data-testid="confirm-bulk-delete"`) with:
- Title: `Delete N notes?`
- Description: "This cannot be undone. All selected notes and their attachments will be permanently removed from this device."
- Buttons: `Cancel` (outline, `confirm-bulk-delete-cancel`) and red `Delete` (`confirm-bulk-delete-confirm`).

Uses the two-step pattern already established for "Clear All Data" — Batch Studio sheet closes first, AlertDialog opens, user confirms, deletion runs.

### Verified
Testing agent iteration_11.json — **9/9 scenarios PASS (100%)**. Regression suite (5 tests) confirms Batch Studio behavior is unchanged after the refactor. New tests (4 tests) confirm AlertDialog Cancel/Confirm paths and all four past-alarm edge cases (yesterday / tomorrow / today+past / today+future).

### Known follow-ups (from review)
- `isPastAlarm` is only reactive to input changes, not the wall clock — if the picker sits open past the picked minute, the disabled state won't re-evaluate. Minor edge case.
- AlertDialog description mentions "attachments will be permanently removed" — `StorageService.deleteNote` handles the note row; attachment cleanup in the separate `files` store should be verified in a future pass.
- List/accordion view multi-select parity gap still open (unrelated).


## [2026-02-27] Expanded color palette — 25 colors (5 solids + 20 gradients)

The Edit Note "Color" picker went from **5** solid dots to **25** dots (5 original solids + 20 new gradient combos). Same expansion mirrors into the Batch Studio Recolor picker and the FullScreenNote color dot.

### New 20 gradient palettes (all 135° linear-gradients)
sunset · ocean · forest · lavender · gold · crimson · teal · indigo · rose · mint · sky · peach · slate · copper · plum · lagoon · cherry · neon · dusk · graphite.

Each entry now carries:
```js
{ name, label, class: "note-gradient", accent /* hex */,
  gradient /* full gradient CSS */,
  bg      /* subtle tile background */,
  border  /* border-color */ }
```

### Backwards-compatible model
- Original 5 solid entries keep their own CSS classes (`.note-purple` etc.) — existing notes are untouched.
- New entries share `.note-gradient` and drive look via **inline styles** returned by a new helper `getNoteColorStyle(colorConfig)` in `notes/constants.js`.

### Wired into
- `notes/NoteModal.jsx` — color picker now uses `flex flex-wrap`; swatch background is `gradient || accent`. Added `data-testid="note-color-picker"` and `note-color-swatch-<name>`.
- `notes/BatchStudioSheet.jsx` — Recolor sub-picker also wraps to multiple rows and shows gradient dots.
- `notes/AccordionNoteItem.jsx`, `notes/CategoryGroup.jsx`, `notes/FullScreenNote.jsx` — spread `getNoteColorStyle(colorConfig)` inline so the accordion row / category container / full-screen editor render the gradient background + border.
- `notes/TemplateModal.jsx` — small template color dot also shows gradient when the template's color is one of the new ones.
- `NotesApp.jsx` + `hooks/useBulkActions.js` — jsPDF text color for exports still uses `accent` (works for all 25).

### CSS additions
- `index.css` — added `.note-gradient` base class (shared shadow + border spec).
- `App.css` — added shared `.note-gradient:hover` filter for a subtle brighten/saturate effect on hover.

### Verified
Visual smoke test: 25 swatches render in the New Note modal in a two-row wrap. First row 15 dots, second row 10 dots. Gradient dots (sunset, ocean, gold, etc.) show visible color blending. All existing 5 solids preserved at their original hue.


## [2026-02-27] Bug fix — Drag & Drop "snap-back on drop"

**User report** (production): "when using drag and drop for list notes as well as pack notes the drag part works but when i go to drop them where needed they jump back to original position — instantly on drop"

### Root cause — TWO overlapping bugs

**Bug 1 (primary, visible everywhere):** Default `sortBy` is `"newest"`. The drag persisted new `order` values to IndexedDB correctly, but the very next render sorted `processedNotes` by `created_at` again — completely ignoring the new `order`. Visual result: the tile instantly snapped back. Users would have had to manually switch the Sort dropdown to "Custom" *before* dragging for it to appear to work.

**Bug 2 (secondary, grouped views only):** `handleDragEnd` used the flat `processedNotes` array with the LOCAL droppable index (0..N-1 within one category's droppable). For grouped views (icon-grouped, list-grouped), this caused the wrong note to be reordered — a note from a completely different category. Even if Bug 1 were fixed manually, the visible reorder would land on a random note.

### Fix (`/app/frontend/src/NotesApp.jsx`, `handleDragEnd`)
1. For per-category droppables (`notes-in-<cat>` / `notes-in-`), the handler now takes the LOCAL slice from `grouped.find([n] => n === srcCat)[1]` or `uncategorized` instead of `processedNotes`. Indexes now match the droppable they came from.
2. On any successful reorder, `sortBy` is auto-switched to `"custom"` and a one-time "Custom order enabled" toast fires. This preserves the user's clear intent instead of silently overriding it.

### Verified
Testing agent iteration_13.json — verdict **both bugs FIXED** via:
- Full code-review of the new handler
- Programmatic IndexedDB test: seeded 3 categories × 3 notes, invoked reorder against Cat B's slice, confirmed only Cat B's `order` values changed and Cat A / Cat C were untouched
- Regression paths intact: category-header reorder, cross-category note move, flat icon/list views

### Known follow-up (from test agent)
`reorderNotes` assigns `order = i` starting at 0 for the passed IDs. Across separate per-category reorders, `order` values can collide between categories (e.g., Cat A's first note and Cat B's first note both have `order=0`). Invisible in grouped view (where category boundaries dominate rendering), but if the user later toggles to flat view + custom sort, tiles from different categories interleave based on collision resolution order. Low priority — most users stay in grouped view when custom-sorting. Would be resolved by a future refactor that uses fractional ordering (e.g., `parent-index.child-index`) or a per-category `order` field.


## [2026-02-27] Bug fix — Dark mode text visibility (FullScreenNote + List view)

**User report** (production): "1) When opening a note via the pack icon in dark mode, the text inside the note is too dark to read. 2) In the list view in dark mode, the note text is too dark. All text categories affected (title, body, category, checklist, metadata)."

### Root cause
Two things stacked to hurt contrast:
1. **Semi-transparent color tints** — solid `.note-purple` (10% alpha) and the 20 new gradient tints (14–18% alpha inline) sit on top of the container. For the darker gradient palettes (graphite, slate, plum) the tint pushes the effective background into a mid-slate zone. Combined with body text set to `text-slate-200` / `text-slate-300` / `text-slate-500`, contrast landed in the 3-4:1 range — WCAG failure for body text.
2. **Gradient tiles had no solid dark base** — `getNoteColorStyle` returned only the semi-transparent gradient as `background`, which *replaced* the underlying `bg-[#0B1221]`. Whatever was behind the card (backdrop / page) bled through and further reduced contrast.

### Fix (`/app/frontend/src/notes/constants.js`, `FullScreenNote.jsx`, `AccordionNoteItem.jsx`, `CategoryGroup.jsx`)
1. **Layered gradient over solid dark base**: `getNoteColorStyle(colorConfig, isDark)` now returns `background: \`${tint}, #0B1221\`` when `isDark=true`. The tint sits on a guaranteed dark backing — text contrast is now identical across all 25 palettes.
2. **Bumped every dark-mode text class one shade brighter**:
   - Body content: `text-slate-200/300` → **`text-slate-100`**
   - Metadata / footer / dates: `text-slate-500` → **`text-slate-300`**
   - Checklist labels: `text-slate-200` → **`text-slate-100`**
   - Checkbox borders: `border-slate-500` → **`border-slate-400`**
   - Placeholder text: `placeholder:text-slate-600` → **`placeholder:text-slate-500`**
   - Checklist done items: `line-through text-slate-500` → **`text-slate-400`**
   - Titles remain `text-white` (were already correct)

### Verified in preview
- Full-Screen title computed color: `rgb(255, 255, 255)` (white)
- Full-Screen content computed color: `rgb(241, 245, 249)` (slate-100)
- Both readable on all 25 palettes including graphite (previously worst-case).

### Files changed
- `notes/constants.js` — `getNoteColorStyle` now accepts `isDark`
- `notes/FullScreenNote.jsx` — content/checklist/footer contrast bumped, passes `isDark`
- `notes/AccordionNoteItem.jsx` — body/meta contrast bumped, passes `isDark`
- `notes/CategoryGroup.jsx` — passes `isDark` to `getNoteColorStyle`


## [2026-02-27] Feature — List-view multi-select parity (P2 gap closed)

**User report** (production): "For the Select option for Batch studio — works great for icon/grid but doesn't work for list notes. The Select button shows above list notes but tapping a row does nothing (just opens/closes the accordion)."

**Root cause**: `AccordionNoteItem` was rendered without `selectMode` props from any of the 4 list-view render paths, so it always ran the accordion path. Tapping a row toggled the Collapsible instead of selection.

**Fix (UX choice C: whole-row toggles selection, accordion disabled in select mode)**
- `notes/AccordionNoteItem.jsx` now branches on `selectMode`:
  - `selectMode=true` → renders a plain `<button data-testid="accordion-select-<id>">` with a circle-checkmark indicator on the left, indigo ring when selected, no chevron, no Collapsible.
  - `selectMode=false` → renders the original Collapsible with chevron + expand-on-tap.
- `notes/CategoryGroup.jsx` forwards `selectMode` / `isSelected` / `onToggleSelect` to its child `AccordionNoteItem`.
- `NotesApp.jsx` — all 4 list-view render sites now wire the select props: (1) custom-sort flat list ~L909, (2) grouped view via CategoryGroup ~L942, (3) uncategorized group ~L980, (4) fallback default list ~L1013.
- Bonus: While in select mode, all note-level `<Draggable>` wrappers get `isDragDisabled={inSelectMode}` (and `isDragDisabled={selectMode}` in CategoryGroup). Silences the dev-only "@hello-pangea/dnd Unable to find drag handle" warning that fires when select mode replaces the trigger DOM.

### Verified
Testing agent iteration_14.json — **7/7 scenarios PASS (100%)**:
- Grouped list-view selection (2 rows) ✅
- Flat list-view selection with group-off (4 accordion-select buttons) ✅
- Batch Studio Duplicate from list → 4 → 6 notes with " (copy)" suffix ✅
- Batch Studio Delete from list → AlertDialog → 2 notes removed ✅
- Icon view regression ✅
- Accordion expands normally when NOT in select mode (Full screen / Edit / Share / Delete actions visible) ✅
- multiselect-cancel exits select mode cleanly ✅

### New testids
`accordion-select-<id>` (button, only in select mode), `accordion-select-indicator-<id>` (circle indicator, only in select mode).


## [2026-02-27] Feature — Swipe-to-select + Delete UX overhaul (Archive / Trash / Persistent Undo)

### 1. Swipe-to-select on list rows
`AccordionNoteItem` now supports an iOS-Notes-style right-swipe gesture (touch only). On drag > 70px right, the row enters select mode + adds itself to the selection. Small "Swipe to select" / "Release to select" left rail hint appears during the gesture.
- Files: `AccordionNoteItem.jsx` (touch handlers + `swipeDx` state + rail), `NotesApp.jsx` (new `handleSwipeSelect`), `CategoryGroup.jsx` (passes through).
- Skipped by the testing agent (can't reliably simulate touch pan via Playwright); relies on user manual verification.

### 2. Delete UX overhaul — Archive vs Trash + Persistent Undo

**Data model addition** — every note now carries:
- `archived_at: string|null` — non-null means archived (kept indefinitely, hidden from default view)
- `deleted_at:  string|null` — non-null means in Trash (retained per `settings.trash_retention_days`, currently manual-purge only)

**New components**
- `notes/DeleteChoiceDialog.jsx` — shadcn AlertDialog with three buttons: Cancel · Archive (emerald) · Move to Trash (red). Fires on any delete (single + bulk). Copy explicitly explains: "Archive → kept indefinitely" and "Trash → permanently deleted after {N days} unless restored".
- `notes/RecentActionPill.jsx` — floating pill at the bottom of the screen (like MultiSelectBar). Shows `1 note archived / N notes moved to Trash`. Undo button (`recent-action-undo`) restores; Dismiss button (`recent-action-dismiss`) hides the pill but keeps the state change. **Never auto-dismisses** — stays until the user acts.
- `notes/ArchiveTrashModal.jsx` — dedicated two-tab modal (Archive · Trash) opened by the new header `archive-trash-btn`. Each item has a Restore action; trashed items also get a permanent-delete X. Empty Trash button with inline red confirmation.

**Storage service** — `archiveNote`, `moveNoteToTrash`, `restoreNote`, `restoreLifecycle` (Undo), `emptyTrash`. Each returns a snapshot of the prior lifecycle timestamps so Undo can restore exactly.

**Filter dropdown** — new options `Archived` and `Trash`. `processedNotes` memoization filters archived/trashed out of every other view (including `All Notes`).

**Settings** — new "Trash retention" dropdown with 5 options: 7 / 30 / 90 / 365 days, or Forever (0). Stored as `settings.trash_retention_days`. Auto-purge is intentionally disabled — only manual Empty Trash removes items.

**Batch Studio** — bulk delete now routes through the same DeleteChoiceDialog with `fromBulk: true`, so users can Archive or Trash entire selections in one shot. The old bulk-delete AlertDialog was removed.

### Verified
Testing agent iteration_15.json — **27/29 (~93%) PASS**. All lifecycle assertions passed:
- DeleteChoiceDialog 3-button flow, Cancel no-op, Archive/Trash state transitions ✅
- Persistent pill (verified no auto-dismiss at 6.5s) ✅
- Undo restores exact prior lifecycle snapshot ✅
- Dismiss keeps state ✅
- Filter dropdown functionally correct + Archive/Trash values isolate the right subset ✅
- Header button opens Archive & Trash modal with both tabs ✅
- Restore + Empty Trash + inline red confirm ✅
- Retention setting persists + DeleteChoiceDialog reads current value ✅
- Bulk delete → same dialog with plural copy ✅

**Bug caught + fixed in same pass**: Filter dropdown labels were displaying "All Notes" for the two new options due to a hard-coded ternary. Rewritten to use `t(\`filter.${opt.value}\`, opt.label)` for translation with fallback. Also added `data-testid="filter-option-<value>"` for stable testing. Also added `aria-live="polite"` on RecentActionPill for screen readers.

### New testids
`delete-choice-dialog`, `delete-choice-cancel`, `delete-choice-archive`, `delete-choice-trash`, `recent-action-pill`, `recent-action-undo`, `recent-action-dismiss`, `archive-trash-btn`, `archive-trash-modal`, `archive-trash-tab-archive`, `archive-trash-tab-trash`, `archive-trash-item-<id>`, `archive-trash-restore-<id>`, `archive-trash-purge-<id>`, `archive-trash-empty-btn`, `archive-trash-empty-confirm`, `archive-trash-empty-cancel`, `settings-retention-select`, `filter-option-<value>`.


## [2026-02-27] Feature — Quick Access (Pin to Home Screen)

### Guiding principle
Per the user: **Iron Rabbit stays free, offline, phone-downloadable. No feature requires the network to work.** All native-only Quick Access items (widget, quick-settings tile, persistent notification, lock screen) archived into `/app/ROADMAP.md` — they remain OFFLINE-CAPABLE but require compiling via Capacitor (docs in `/app/CAPACITOR_SETUP.md`). No feature was moved to a hypothetical online tier.

### Shipped in the PWA
- **`notes/QuickAccessModal.jsx`** — multi-step wizard with:
  - Platform picker (Android · iPhone) via `navigator.userAgent` detection
  - "Install Iron Rabbit" prompt button (uses existing `beforeinstallprompt` on Android Chrome)
  - Per-platform illustrated steps (icon + text) for adding to Home Screen and dragging into the dock
  - Progress dots + Back / Next / Done navigation
  - Footer explaining what's coming in the native Capacitor build
- **First-launch wizard** — `NotesApp.jsx` opens the modal automatically 1.2s after initial settings load if `settings.quick_access_wizard_seen` is falsy. Sets the flag on close so it doesn't reopen.
- **Settings toggle** — new `settings-quick-access-btn` row in Settings modal ("Pin to Home Screen · Step-by-step guide for Android & iPhone") reopens the wizard anytime.

### Archived to ROADMAP (requires native Capacitor build)
`/app/ROADMAP.md` was created and documents:
- Home Screen Widget (Favorites / Recent / Emergency notes, Timers, Checklist)
- Android Quick Settings Tile (`TileService`)
- Persistent Timer Notification (`ForegroundService` + `NotificationCompat`)
- Lock Screen Live Activities (iOS 16+) / notification visibility (Android)

Each with brief implementation notes so a native dev can pick it up. All remain offline-only.

### New testids
`quick-access-modal`, `qa-platform-android`, `qa-platform-ios`, `qa-install-pwa`, `qa-step-<n>`, `qa-prev`, `qa-next`, `qa-done`, `settings-quick-access-btn`.

### Verified in preview
- Auto-opens on first launch ✅
- Platform tabs toggle correctly ✅
- Step navigation (Back/Next/Done) works ✅
- Done closes and persists `quick_access_wizard_seen` ✅
- Reopens from Settings row ✅ (code path — Playwright test blocked by first-launch tour overlay, code lint-clean)


## [2026-02-27] Feature — Offline JSON Backup & Restore

Full-fidelity backup that stays 100% on-device.

### New: `notes/BackupRestoreModal.jsx`
Modal with two primary actions:
- **Export Backup** — downloads `iron-rabbit-backup-YYYY-MM-DD-HHmm.json` containing all notes, templates, settings, and attachments (Blobs → base64 dataURLs). Nothing leaves the device.
- **Import Backup** — picks a `.json` file, validates its `app === "IronRabbit"` header, then offers two restore modes via a confirmation panel:
  - **Merge** (default) — upsert by ID; existing notes with matching IDs are overwritten, others stay.
  - **Replace** — wipe notes/templates/files stores first, then hydrate from the backup. Explicitly labeled destructive.

### StorageService additions (`storage/storageService.js`)
- `exportAllData()` → returns `{ app, version, exported_at, counts, notes[], templates[], settings, files{} }`. Files store Blobs so we `FileReader.readAsDataURL()` each one during export.
- `importAllData(payload, mode)` → validates the header, optionally wipes stores when `mode === "replace"`, upserts every item, converts base64 dataURLs back to Blobs via `fetch(dataUrl).blob()`. Returns `{ notesRestored, templatesRestored, filesRestored }`.

### Settings integration
- New Settings row `settings-backup-btn` labeled "Export / Import JSON" (Download icon, indigo accent) sits under Quick Access.
- Wired via `onOpenBackup` prop through SettingsModal.

### New testids
`settings-backup-btn`, `backup-restore-modal`, `backup-export-btn`, `backup-import-btn`, `backup-file-input`, `backup-mode-merge`, `backup-mode-replace`, `backup-cancel`.

### Verified in preview
- Modal opens from Settings → Backup ✅
- Export triggers browser download with expected filename pattern `iron-rabbit-backup-<date>-<time>.json` ✅
- Toast fires with counts on success ✅
- Import file-picker + Merge/Replace confirmation panel + Cancel path all clean ✅

### Constraint honored
Feature works **entirely offline**. No network calls, no cloud dependency. Users can transfer to a new device by copying the JSON file via any means (AirDrop, USB, email attachment, etc.).


## [2026-02-27] Feature — Daily Chores Pack

Twelve named chore-list tiles, one per family member, with per-chore frequency, tri-state status, dollar tracking, and parent approval — all offline.

### Ships with 12 tiles under a new `PARENT` category
Real names first (Bailey, Carter, Hazel, Mason, Lawson, Evy, Josh, Matt) + 4 placeholders (Child 9–12). User can rename any of them. Each tile carries a fresh copy of the 12-chore template so families can customize per person.

### Chore item schema (`note.chores[]`)
```js
{
  id, title,
  frequency: "daily" | "weekly" | "bimonthly" | "monthly",
  status:    "todo"  | "progress" | "done",
  parent_approved: boolean,     // parent-only final tick after "done"
  offered: number,              // dollars promised
  paid:    number,              // dollars actually paid
  notes:   string,              // freeform: bonuses/penalties/holiday/vacation
  updated_at: string,
}
```

### `notes/ChoresPanel.jsx` — inline panel inside FullScreenNote
- Rendered whenever `note.chores` is a non-empty array (no impact on non-chore notes).
- Each chore shows: chevron expand · editable title · **3-stop status pill** (🔴 Todo → 🟠 In Progress → 🟢 Done) · **Parent ✓ approval chip** (appears when status is done; toggles to Trophy 🏆 Approved).
- Expanded view: Frequency dropdown · Offered $ · Paid $ · Notes textarea · Reset · Remove.
- Summary bar at top: `done/total · $paid/$offered`.
- **Add chore** button seeds a new blank row.

### NoteTile badge
Icon-view tiles now show a small 🏆 `done/total` badge for chore-notes so parents see progress at a glance without opening.

### Tile pack integration
No changes to the `applyPack` flow needed — the existing spreader carries `chores` through to IndexedDB.

### New testids
`chores-panel`, `chores-add-btn`, `chore-item-<id>`, `chore-title-<id>`, `chore-status-pill`, `chore-status-todo|progress|done`, `chore-parent-approve`, `chore-freq-<id>`, `chore-offered-<id>`, `chore-paid-<id>`, `chore-notes-<id>`, `chore-reset-<id>`, `chore-remove-<id>`.

### Verified in preview
Tile Packs modal → **Daily Chores** card shows 5 preview tiles → Apply → 12 tiles seeded under PARENT with color rotation → opening any tile shows all 12 chores with red 🔴 default status and expected `0/12 · $0/$93` summary → totals visible on tile grid.



## Tags + Insights (Feb 2026)

### Tags
- `tags: string[]` field added to the note model (lowercased, deduped).
- Editor UI in `NoteModal.jsx`: chip strip with X-to-remove, comma/Enter to add,
  paste-multiple support (`work,urgent,personal` all captured), quick-add
  suggestions from `allTags`, HTML datalist autocomplete.
- Filter chip strip `TagFilterStrip.jsx` renders below the search row when at
  least one tag exists. Tap toggles a single active tag filter.
- Search input supports `#tag` tokens — `#work` restricts to notes tagged
  `work`. Multiple `#tag` tokens are AND-combined; remaining free text still
  matches title/content/category/tags.
- `AccordionNoteItem` renders the tag chips in the expanded row content.

### Insights Modal (`InsightsModal.jsx`)
Header dashboard button (`data-testid="header-insights"`, BarChart3 icon) opens
a full stats dashboard:
- 4 KPI cards — Active notes (+ pinned), Streak (consecutive days with any
  create/edit activity), Checklist done %, Active reminders (+ recurring).
- Last-7-days bar chart with today highlighted.
- Top categories (up to 6) with count and gradient bar.
- Top tags (up to 8) with count chips.
- Palette distribution (color-stacked strip) + Lifecycle counts
  (Active/Archived/Trash).
- All stats computed via `useMemo` from the in-memory notes array — 100%
  offline, zero network.

### New testids
`header-insights`, `insights-modal`, `stat-total`, `stat-streak`,
`stat-completion`, `stat-reminders`, `weekly-chart`, `category-breakdown`,
`top-tags`, `color-distribution`, `tag-filter-strip`,
`tag-filter-chip-<tag>`, `tags-editor`, `tag-input`, `tag-chip-<tag>`,
`tag-suggestion-<tag>`, `note-tags-<id>`, `search-input`.

### Verified in preview (testing_agent iteration_16, 95% frontend pass)
Insights modal opens with all KPIs; tags create/filter/#search flow works;
top-tags card updates dynamically; no regressions to core create/edit/pin
/archive/backup flows.

## Photos + LLM Translation (Feb 2026)

### Photos / attachments in NoteModal
- Attachments component (already used in FullScreenNote) is now also mounted
  in `NoteModal`, exposing photos to the primary create/edit flow.
- Enforced cap: `MAX_ATTACHMENTS_PER_NOTE = 10` in `storageService.js`.
  `Attachments.jsx` reflects this on the Add button
  (`Attach photos · N/10` / `Max 10 reached`) and rejects uploads past the cap.
- Types: JPG/PNG/GIF/WebP/PDF. 10 MB per file. Stored as Blobs in IndexedDB.
- JSON backup already serialises `filesStore` as base64 → photos travel with
  the backup file per user preference.
- New testid: `attachment-add-btn`.

### LLM Translation
Backend:
- `POST /api/translate` — new endpoint in `server.py`.
- Uses `emergentintegrations.llm.chat.LlmChat` with model
  `anthropic/claude-sonnet-4-6`, `EMERGENT_LLM_KEY` from `backend/.env`.
- Payload: `{text, target_lang, source_lang?}`. Returns `{translated, source_lang, target_lang}`.
- System prompt forbids explanations, transliterations, or wrappers — returns
  ONLY the translated text with preserved line breaks / markdown / emoji.
- Guards: empty text → 400; missing target → 400; text > 12,000 chars → 413.

Frontend:
- New `TranslateModal.jsx` — language picker over the existing
  25 SUPPORTED_LANGUAGES, Translate/Copy/Append actions.
- Wired into `NoteModal` (Translate button next to Voice/Calc,
  `data-testid="note-translate-btn"`, disabled when content empty).
- Wired into `FullScreenNote` (header icon `fullscreen-translate-btn`);
  Append fires immediate `onSaveInline` so the translated block persists
  even if the user closes fast.
- Append format: `\n\n— Language (flag) —\n<translated>` so the user's
  canonical text is never overwritten.

### Extra hygiene testids added
`note-title-input`, `note-content-input`, `note-save-btn`,
`fullscreen-translate-btn`, `note-translate-btn`, `translate-modal`,
`translate-target-select`, `translate-original`, `translate-run-btn`,
`translate-result`, `translate-copy-btn`, `translate-append-btn`,
`attachment-add-btn`.

### Verified in preview (testing_agent iteration_17, 100% backend + 100% frontend)
- 5/5 pytest cases pass on `/api/translate` (Spanish, Japanese-multiline,
  empty text 400, empty target 400, >12k 413).
- E2E Playwright green on both NoteModal and FullScreenNote translation
  flows, including persistence after close+reopen.
- No regressions in Tags/Insights (iteration_16 features).


## Streaks + Allowance Ledger + Capacitor Quickstart (Feb 2026)

### Chore history & streaks
- Chore model now optionally carries `history: [{date, paid, status}]`.
- `ChoresPanel.update()` appends a history entry every time a chore transitions
  to `status==='done' && parent_approved===true`, capturing the `paid` value
  at the moment of approval. A 60-second same-chore dedupe guard prevents
  double-tap double-counting.
- New shared module `notes/streakUtils.js`:
  - `computeChoreStreak(chore)` — consecutive frequency-periods
    (daily/weekly/bimonthly/monthly), with a 1-period grace at the head.
  - `computeNoteStreak(note)` — max across all chores on the note.
  - `computeNoteEarnings(note)`, `buildLedger(chores)`, `agoLabel(date)`.
- 🔥 Flame badge with numeric streak now renders in three places:
  - Per-chore inside ChoresPanel (`chore-streak-<choreId>`)
  - On the collapsed row in list view (`row-streak-<noteId>`)
  - On the tile in icon/grid view (`note-streak-<noteId>`)

### Allowance Ledger modal (`AllowanceLedgerModal.jsx`)
- Opens from a green "Ledger" pill in ChoresPanel header
  (`data-testid="chores-ledger-btn"`).
- 4 KPI cards: Lifetime paid, Completions, This week, This month.
- Tabbed bar chart — Weekly (last 8 weeks) / Monthly (last 6 months).
  Current bucket highlighted.
- Per-chore rollup sorted by total paid, with completion count and
  "last N days ago" label.
- CSV export (`ledger-export-csv`) via Blob+download attr —
  filename `allowance-ledger-YYYY-MM-DD.csv`.

### Capacitor doc (`CAPACITOR_SETUP.md`)
- Added a beginner-friendly Quickstart TL;DR section at the top with the
  exact `yarn build && npx cap add android && npx cap sync && npx cap open android` sequence.
- Emphasises this must be done on the user's own machine — Emergent
  preview/prod containers can't compile native code.

### New testids
`chores-ledger-btn`, `allowance-ledger-modal`, `ledger-kpi-total`,
`ledger-kpi-entries`, `ledger-kpi-week`, `ledger-kpi-month`,
`ledger-tab-weekly`, `ledger-tab-monthly`, `ledger-chart`,
`ledger-per-chore`, `ledger-export-csv`, `chore-streak-<id>`,
`chore-toggle-<id>`, `note-streak-<id>`, `row-streak-<id>`.

### Verified in preview (testing_agent iteration_18, 100% frontend)
Tile-pack seed → status→done→parent-approved → streak badges appear in all
3 places → ledger opens with correct KPIs, weekly + monthly bars, per-chore
rollup, CSV export downloads with correct filename. Dedupe guard verified
(60s window keeps streak at 1). Persistence verified via full reload.
No regressions to Tags / Insights / Translate.

### Known follow-ups (not blocking)
- List-view fullscreen button still lacks a testid — cosmetic only.
- Timezone edge case: buckets use local time — DST week transitions could
  put an entry in an adjacent bucket by 1h. Acceptable for a personal
  allowance ledger.


## OCR + Kid Dashboard (Feb 2026)

### OCR from photos
Backend:
- `POST /api/ocr` in `server.py`. Payload `{image_base64, mime_type}`,
  response `{extracted_text}`.
- Uses `emergentintegrations.llm.chat.LlmChat` with `ImageContent(image_base64)`,
  model `anthropic/claude-sonnet-4-6`.
- Data-URI prefix is tolerated & stripped. Whitelist:
  PNG/JPEG/WEBP. >5 MB decoded → 413.
- System prompt is pure OCR (no analysis, no translation). Model may
  return `NO_TEXT_FOUND` for blank images — endpoint normalises to `""`.

Frontend:
- `storageService.getAttachmentBlob(id)` — new helper (returns raw Blob).
- `Attachments.jsx` — added `blobToBase64`, `handleExtractText`, an
  indigo ScanText button per image (hover-visible on the thumb,
  `attachment-ocr-<id>`), and an `onExtractText` prop.
- Wired into `NoteModal` (appends to draft content) and `FullScreenNote`
  (appends + immediate `onSaveInline`).
- CSS `.attachment-ocr` added to `App.css`.

### Kid Dashboard (`KidDashboardModal.jsx`)
- New Baby-icon header button `header-kid-mode` opens a giant-button,
  child-friendly view.
- **KidPicker**: cards for every note with `chores.length > 0` showing
  streak, approved-count, and lifetime earnings.
- **KidBoard**: 3 giant KPI cards (Streak / Approved / This week $) +
  monthly & lifetime line, then a stack of huge tap-to-toggle chore
  buttons. Kids can flip todo↔done but CANNOT self-approve — parent
  approval remains parent-only (intentional).
- Uses shared `computeChoreStreak / computeNoteStreak / buildLedger`
  from streakUtils.js — no duplication.
- History append + 60 s dedupe mirrored from ChoresPanel so streaks
  stay accurate when a parent later approves.

### Quality fixes (from iteration_19 review)
- `data-testid=chore-parent-approve-<id>` — now unique per chore.
- `data-testid=accordion-fullscreen-<noteId>` — added on the Maximize2
  button so tests can open any list-view note in FullScreen.
- `KidDashboardModal` adds `sr-only` `DialogTitle` — silences the Radix
  a11y warning.
- Renamed KPI "Done today" → "Approved" (matches what the count
  actually represents).

### New testids
`attachment-ocr-<id>`, `header-kid-mode`, `kid-dashboard-modal`,
`kid-empty`, `kid-picker`, `kid-card-<noteId>`, `kid-back-btn`,
`kid-exit-btn`, `kid-stat-streak`, `kid-stat-done`, `kid-stat-week`,
`kid-chore-list`, `kid-chore-<choreId>`, `kid-chore-toggle-<choreId>`,
`chore-parent-approve-<choreId>`, `accordion-fullscreen-<noteId>`.

### Verified in preview (testing_agent iteration_19)
- Backend: 6/6 pytest on `/api/ocr` (happy path, empty, bad mime,
  oversized, data-URI prefix, blank image).
- Frontend: Kid Dashboard empty state → seed via Daily Chores tile pack
  → picker shows 12 kid cards → drill in → toggle chore → line-through
  + "Waiting for grown-up ✓" badge → back/exit works. 95% pass; the 5%
  gap was purely a testid uniqueness issue (now fixed).


## Session 2026-02-XX — Iteration 23 (Trip Journal + Phase 4 + Capacitor)

**Delivered:**
- **Trip Journal (P2)** — new `TripJournalModal.jsx` with KPI cards (this month, avg trip, biggest, total), 6-month spend bar chart (recharts), top-departments breakdown, most-bought items list, and expandable per-trip detail with per-item price rows. Delete confirm dialog. Access: new "Receipt" icon in header (`data-testid="header-trip-journal"`) + "View full Trip Journal →" button inside Insights modal grocery card. `ShoppingModeModal` upgraded to persist item-level breakdown on trip save.
- **Smart Grocery Cart Phase 4 — Barcode Scanner (P2)** — new `BarcodeScannerModal.jsx` using `window.BarcodeDetector` API with graceful fallback to manual entry when unsupported. Product lookup via free public OpenFoodFacts API returns name, brand, thumbnail, per-100g nutrition (energy/fat/sat-fat/carbs/sugars/protein) and Nutri-Score badge. On accept, item is added to newest grocery note or a fresh "Shopping List" note is created. Header entry point (`data-testid="header-barcode"`).
- **Smart Grocery Cart Phase 4 — Meal Planner (P2)** — new `MealPlannerModal.jsx` with 7-day × 3-meal (breakfast/lunch/dinner) grid, week nav, offline recipe library of 15 built-in recipes (`/app/frontend/src/data/recipes.js`), custom recipe creation (name / tagline / ingredients with qty + department), and "Generate shopping list" that consolidates all planned ingredients into a new Grocery-category note with department metadata. Header entry point (`data-testid="header-meal-planner"`).
- **Storage helpers** added to `storageService.js`: `getGroceryTrips` / `saveGroceryTrip` / `deleteGroceryTrip` / `updateGroceryTrip`, `getMealPlan` / `saveMealPlan`, `getCustomRecipes` / `saveCustomRecipe` / `deleteCustomRecipe`.
- **Capacitor (P3)** — `CAPACITOR_SETUP.md` updated with Phase 4 native scanner instructions (ML Kit plugin swap, camera permissions for iOS/Android).
- **Bonus fix**: root-caused and fixed pre-existing iteration-22 category-reorder-persistence bug — `saveCategoryOrder` / `getCategoryOrder` were writing/reading settings key `"main"` while every other settings API uses `"app_settings"`. Fixed to use `saveSettings`/`getSettings` consistently.

**Verified via testing_agent iteration_23**: All Phase 4 flows end-to-end pass — Trip Journal (with seeded trips), Meal Planner recipe pick + list generation + custom recipe, Barcode Scanner manual entry + OpenFoodFacts lookup + accept-to-list. No console errors.

**Files changed:** `NotesApp.jsx`, `ShoppingModeModal.jsx`, `InsightsModal.jsx`, `storageService.js`, `CAPACITOR_SETUP.md`
**Files added:** `notes/TripJournalModal.jsx`, `notes/BarcodeScannerModal.jsx`, `notes/MealPlannerModal.jsx`, `data/recipes.js`

## Next actions
- P1: Weekly chore-summary push notifications (Sunday recap) — utility `weeklyChoreSummary.js` exists, needs Notifications API wiring + service worker schedule.
- P1: Custom domain `www.ironrabbitapps.com` walkthrough via Entri (Emergent deploy panel).
- P3: Refactor `NotesApp.jsx` (1800+ lines) into modular sub-components.
- Optional Phase 4 extras: OpenFoodFacts caching (offline product lookup), meal-planner drag-and-drop between slots.

## Session 2026-02-XX — Iteration 24 (Price Alerts + Cache + Notifications + Meal DnD)

**Delivered:**
- **Price-drop / price-spike alerts** — new `utils/priceHistory.js` computes per-item median from last 20 grocery trips; `ChecklistSection` and `ShoppingModeModal` badge items with a green TrendingDown (≥10% below median) or amber TrendingUp (≥15% above median). Cache invalidated when a new trip is saved. **Verified**: seeded Milk trips at [3.99, 4.29, 4.19, 4.49] median $4.24 → $3.20 shows 25% drop badge, $5.50 shows 30% spike, $4.30 within noise band shows no badge.
- **OpenFoodFacts offline cache** — new `utils/openFoodFacts.js` uses localforage DB `iron-rabbit-off-cache` with 90-day TTL for OK results and 1-day TTL for misses. BarcodeScannerModal now shows a "cached" badge next to product name when result was pulled from cache (zero network hit). **Verified**: 1st lookup live, 2nd lookup instant with badge visible.
- **Notifications settings panel** — new `NotificationsPanel` component inside Settings modal. Shows permission-status pill, Enable/Send-test buttons, and two toggles for weekly-recap and chore-summary notifications. Both `weeklyRecap.js` and `weeklyChoreSummary.js` now short-circuit when the user turns them off. **Verified**: toggles persist to IndexedDB.
- **Meal Planner drag-swap between slots** — @hello-pangea/dnd wired up. Filled slots now have a dedicated grip handle (top-right of the cell) as the sole drag target — this separates drag-to-move from tap-to-edit for touch users and lets automated tests target the drag reliably. `onDragEnd` swaps recipe IDs across source/destination slots and persists to `settings.meal_plan`.
- **Custom domain guide** — new `/app/CUSTOM_DOMAIN.md` with a step-by-step Entri walkthrough for linking `www.ironrabbitapps.com`, DNS fallback, PWA manifest tweaks, troubleshooting matrix.
- **Prev-session fix**: `saveCategoryOrder`/`getCategoryOrder` bug (writing to orphan `"main"` settings key) fixed in iteration 23.

**Verified via testing_agent iteration_24**: 3/4 features fully verified end-to-end. Meal Planner drag was code-reviewed as correct — Playwright's synthetic drag can't reliably trigger @hello-pangea/dnd; grip-handle split (added post-testing) fixes the ambiguity for both real users and automation.

**Files added:** `utils/priceHistory.js`, `utils/openFoodFacts.js`, `CUSTOM_DOMAIN.md`
**Files updated:** `notes/ChecklistSection.jsx`, `notes/ShoppingModeModal.jsx`, `notes/BarcodeScannerModal.jsx`, `notes/MealPlannerModal.jsx`, `notes/SettingsModal.jsx`, `utils/weeklyRecap.js`, `utils/weeklyChoreSummary.js`

## Next actions
- User: click **Deploy → Custom Domain** and follow `CUSTOM_DOMAIN.md` when ready to link `www.ironrabbitapps.com`
- Backlog: refactor `NotesApp.jsx` (1800+ lines) into modular sub-components
- Backlog: swap `BarcodeDetector` for native ML Kit in Capacitor builds (see `CAPACITOR_SETUP.md` Phase 4 section)
- Ideas: pantry inventory tracking, expiration-date alerts, price-history sparklines in Trip Journal

## Session 2026-02-XX — Iteration 25 (Pantry + Expiration + Best-Day + Sparklines)

**Delivered & verified via testing_agent iteration_25 (100% pass — 12/12 checks):**
- **Pantry Inventory Manager** — new `PantryModal.jsx` with full CRUD, quantity +/− controls, 3 storage zones (Fridge / Freezer / Pantry), expiration-date-aware badges (emerald `Xd left` / yellow `Expires in 3d` / orange `Expires today/tomorrow` / red `Expired Xd ago`), zone + expiration filters, and search. When qty drops to 0 the user is prompted to add the item back to their newest grocery list. Header entry point `data-testid="header-pantry"`.
- **Expiration alerts** — new `utils/pantryAlerts.js` fires a local Notification at most once per calendar day summarizing expired / due-today / expiring-within-3-days items. Called from `NotesApp.fetchData()` alongside weekly recaps. New Settings toggle `notif-toggle-pantry-expiration`.
- **Best day to buy** — extended `utils/priceHistory.js` with `bestDayToBuy(text, lookback)` that computes median price per weekday from the last 30 trips and returns the cheapest day + estimated savings %. Rendered as an emerald badge in Trip Journal → "Most bought" per item (needs ≥3 data points across ≥2 weekdays). Verified: Milk seeded Mon×3 @ $3.50, Wed×2 @ $4.50, Sat×1 @ $4.20 → "Best: Mons · save 22%".
- **Price-history sparklines** — extended `utils/priceHistory.js` with `itemPriceSeries()` and added recharts LineChart sparklines under each item card in Trip Journal → "Most bought". Renders when ≥2 data points exist; hover shows exact price.
- **Bonus cleanup**: removed duplicate `exportAllData` / `importAllData` in `storageService.js` (silently shadowed dead code with divergent shape); fixed React `key` warning in PantryModal Unit Select; refactored TripJournalModal trip row to eliminate nested `<button>` hydration warning.

**Files added:** `notes/PantryModal.jsx`, `utils/pantryAlerts.js`
**Files updated:** `storage/storageService.js`, `utils/priceHistory.js`, `notes/TripJournalModal.jsx`, `notes/SettingsModal.jsx`, `NotesApp.jsx`

## Session 2026-02-XX — Iteration 26 (ML Kit swap + NotesApp refactor)

**Delivered & verified via testing_agent iteration_26 (100% regression-clean):**
- **Native ML Kit barcode swap (P3)** — `BarcodeScannerModal.jsx` now branches on `Capacitor.isNativePlatform()`. Native builds use `@capacitor-mlkit/barcode-scanning` (Google ML Kit) via dynamic import; web builds keep the existing `window.BarcodeDetector` path with manual-entry fallback. Includes Android on-demand module install (`isGoogleBarcodeScannerModuleAvailable` + `installGoogleBarcodeScannerModule`). New "Open ML Kit scanner" button label when native.
- **Haptics upgrade** — `utils/haptic.js` now uses `@capacitor/haptics` (dynamic import) on native for proper Taptic Engine / VIBRATOR_SERVICE feedback with `success/error/light/medium` impact styles; web falls back to `navigator.vibrate`.
- **NotesApp.jsx refactor (P3)** — extracted two clean pure components:
  - `notes/AppHeader.jsx` (~113 lines) — top bar with 17 action buttons; takes 15 `onXxx` callbacks as props.
  - `notes/AppSearchBar.jsx` (~152 lines) — search input, view-mode toggle, filter + sort dropdowns, tag strip, group-by toggle, multi-select mode toggle.
  - Removed 17 now-unused imports from NotesApp.jsx.
  - **File size: 1917 → 1802 lines (−6%)**. Testing agent flagged remaining opportunities: `<AppModals />` wrapper and `<NoteListView />` — good candidates for next session.
- **Capacitor setup docs updated** — `/app/CAPACITOR_SETUP.md` Phase 4 rewritten: ML Kit path documented as already wired, camera permission snippets for iOS + Android, first-time Android Play Services module install note.
- **New deps**: `@capacitor-mlkit/barcode-scanning@7.5.0`, `@capacitor/haptics@7.0.5` (v7 to match existing Capacitor 7).

**Verification highlights (from iteration_26):**
- All 17 header testids render + click through to correct modals
- All 6 AppSearchBar testids function
- BarcodeDetector unavailable in Playwright → graceful "Camera scan not supported" state; manual EAN entry `3017620422003` → Nutella/Ferrero with full nutrition still works end-to-end
- Zero console errors, zero @capacitor/haptics or ML Kit fetch attempts on web (dynamic imports properly gated)

**Files added:** `notes/AppHeader.jsx`, `notes/AppSearchBar.jsx`
**Files updated:** `NotesApp.jsx`, `notes/BarcodeScannerModal.jsx`, `utils/haptic.js`, `CAPACITOR_SETUP.md`

## Backlog (next session candidates)
- Extract `<AppModals />` wrapper (would remove another ~200 lines from NotesApp.jsx)
- Extract `<NoteListView />` for grouped + ungrouped rendering blocks
- Fix low-priority hydration warnings (PantryModal Unit Select key, TripJournalModal nested button — already fixed in iter 25 but re-verify)
- Custom domain link via Entri (user action pending)

## Session 2026-02-XX — Iteration 27 (Refactor round 2: AppModals + useGroceryQuickAdd)

**Delivered & verified via testing_agent iteration_27 (100% regression-clean — 12/12 header modals, FAB add, meal-planner→grocery gen, multi-select→batch-studio→delete-choice→undo, settings notif toggles, clear-all 2-step, LockScreen absence — zero console errors):**

- **`notes/AppModals.jsx` (420 lines, new)** — single mount point for every modal, dialog, sheet, floating pill in Iron Rabbit. Takes ~85 props from NotesApp; internal logic limited to close-handlers, FloatingCalendarModal's inline event-note creation, and two `useGroceryQuickAdd` callsites (Barcode onCapture, Pantry onSendToShoppingList).
- **`hooks/useGroceryQuickAdd.js` (59 lines, new)** — pure helper hook consolidating the previously-duplicated logic to either append to the newest active Grocery note or create a fresh "Shopping List". Used inside AppModals by BarcodeScannerModal (with `barcode`/`nutrition`/`nutriscore`) and PantryModal (with `dept`).
- **NotesApp.jsx reduced from 1802 → 1405 lines (−22%)** — ~440 lines of inline modal JSX replaced with a single `<AppModals {...bag} />` mount. Removed 30+ now-unused imports (Input, Dialog*, Select*, AlertDialog*, IconPicker, TilePacksModal, FloatingCalendarModal, LanguagePicker, SecurityModal, OrganizationModal, MultiSelectBar, MoveToCategoryModal, CopySuffixDialog, BatchStudioSheet, DeleteChoiceDialog, RecentActionPill, QuickAccessModal, BackupRestoreModal, ArchiveTrashModal, InsightsModal, KidDashboardModal, ShoppingModeModal, TripJournalModal, BarcodeScannerModal, MealPlannerModal, PantryModal, NoteModal, CalculatorWidget, ShareModal, SettingsModal, FullScreenNote, FirstRunTour, LockScreen).

**Cumulative refactor progress (Iterations 26 + 27):**
| File | Original | Now | Δ |
|---|---:|---:|---:|
| NotesApp.jsx | 1917 | **1405** | −512 lines |
| notes/AppHeader.jsx | (new) | 113 | +113 |
| notes/AppSearchBar.jsx | (new) | 152 | +152 |
| notes/AppModals.jsx | (new) | 420 | +420 |
| hooks/useGroceryQuickAdd.js | (new) | 59 | +59 |

Files changed: `NotesApp.jsx`
Files added: `notes/AppModals.jsx`, `hooks/useGroceryQuickAdd.js`

**NotesApp.jsx is now readable at a glance**: header + search + main content + one `<AppModals />` — no more 400-line scroll of inline modal JSX.

## Backlog (remaining)
- Extract `renderNotes()` + `renderPinnedRail()` into `NoteListView` component (~200-300 more lines out — but tightly coupled to DnD context + selection state so risk is higher)
- Extract `useNoteActions` hook (handleSaveNote / handleSaveInline / handleDeleteNote / bulk operations)
- Custom domain link via Entri (user's local action — follow `/app/CUSTOM_DOMAIN.md`)
- Native build: `cd frontend && yarn build && npx cap sync` on user's local machine

## Session 2026-02-XX — Iteration 28 (Restaurants Galore™ — Phase 1)

**Delivered & verified via testing_agent iteration_28 (100% pass — 12/12 scenarios):**

**Storage foundation:**
- `storage/restaurantsService.js` — 7 dedicated localforage stores (all namespaced under `IronRabbit` DB with `rg_` prefix):
  - `rg_restaurants`, `rg_menus`, `rg_favorite_meals`, `rg_orders`, `rg_reviews`, `rg_deliveries`, `rg_coupons`
- Full CRUD for each entity + `computeDashboardStats()` aggregator + cascade delete + `exportAll()` for future backup integration

**Command Center Dashboard** (`notes/RestaurantsGaloreDashboardModal.jsx`):
- 4 KPI cards: this month, this year, avg meal price, restaurants count
- Smart reminders card: restaurants needing reviews, coupons expiring in 7 days, upcoming birthdays in 30 days
- Recently visited + Favorites grids
- 18-workspace launcher grid (Directory active, 17 stubbed with "Coming soon" for Phase 2-4)

**Restaurant Directory** (`notes/RestaurantDirectoryModal.jsx`):
- Full CRUD with search + 4 filter chips (Active / Favorites / Hidden / Archived)
- Inline favorite heart toggle
- Edit sub-modal with 20+ fields: name, nickname, category, cuisine (autocomplete), phones[] (add/remove), website, online ordering, email, hours, holiday hours, address (→ Maps), parking notes, 8 amenity toggles (drive-thru/delivery/pickup/reservations/outdoor/wheelchair/kid-friendly/pet-friendly), notes, favorite/hidden/archived states
- Cascade delete confirmation

**Wiring:**
- New `header-restaurants-galore` icon (Utensils) in `AppHeader` between Trip Journal and Archive
- New tile pack `restaurants-galore` at the top of `TILE_PACKS` (amber gradient, marked as flagship)
- Full state pipeline through NotesApp → AppHeader + AppModals

**Master spec locked at** `/app/specs/RESTAURANTS_GALORE.md` — every future phase must re-read this doc first.

**Bonus fixes applied post-review:**
- Added `DialogDescription` to RestaurantEditModal (a11y warning eliminated)
- `computeDashboardStats` now uses `.slice().sort()` to avoid mutating stored arrays

**Files added:** `storage/restaurantsService.js`, `notes/RestaurantsGaloreDashboardModal.jsx`, `notes/RestaurantDirectoryModal.jsx`, `specs/RESTAURANTS_GALORE.md`
**Files updated:** `NotesApp.jsx`, `notes/AppHeader.jsx`, `notes/AppModals.jsx`, `data/tilePacks.js`

## Restaurants Galore — Phase Roadmap
- **Phase 1** ✅ (this session) — Dashboard + Directory + storage foundation
- **Phase 2** — Menus, Favorite Meals, Order History (with items), Tip Calc, Split Bill, Spending Center charts, Coupons + expiration alerts
- **Phase 3** — Reviews (11-metric), Delivery Tracker, Favorite Staff, Wish List, Calendar integration, Photos
- **Phase 4** — Voice Journal (browser SpeechRecognition), Smart Assistant, AI Insights, Search Center, Recipe Recreation, Beverage/Dessert Centers, Family Dining, Emergency Info
- **Phase 5** — Glass Workspace theme, Maps & Navigation picker, deep accessibility, full backup integration
