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


## Bug Fix (verified iteration_4.json)
Auto-migration on first load pulls user's old notes from backend into local IndexedDB. Manual "Recover Old Notes from Server" button in Settings for retries. Toasts only show when work happened. StrictMode-safe.
