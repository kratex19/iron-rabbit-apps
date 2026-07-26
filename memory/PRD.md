# Iron Rabbit Apps - Company Website + Notes App

## What's Live

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
