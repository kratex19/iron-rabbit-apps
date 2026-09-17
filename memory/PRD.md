# Iron Rabbit — Product Requirements Document

## Original Problem Statement
Iron Rabbit is a highly polished, offline-first PWA (React + IndexedDB + FastAPI backend for sync/community features). The user requires continuous architectural and UI refinements to sustain a delightful, tactile note-taking experience with a 3-tier pinning architecture, deep recursive category hierarchies, curated Tile Packs, and complex 2D Grid drag-and-drop.

## Core Product Requirements
- **Offline-first PWA** with IndexedDB as the source of truth; Service Worker handles cache/versioning.
- **Fluid container-based responsive design** — no arbitrary breakpoints; content adapts to viewport width.
- **3-tier pinning architecture**:
  - 🔵 **Blue rail** — pinned notes (flat, top-level)
  - 🟡 **Yellow rail** — pinned categories (always visible even when empty)
  - 🟢 **Green rail** — pinned nested subcategories (`pinned_subcategory_paths[]`)
- **Deep recursive category hierarchy** via `category_path` (unlimited depth). Legacy `category`/`subcategory` fields stay in sync with `category_path[0]` and `category_path[1]` on every save.
- **Curated Tile Packs (36 packs)** — behavior & structure locked. No hierarchy icons inside packs.
- **Accordion-based category grouping** with locked timings:
  - List View: **220 ms** (do not alter)
  - Grid View: **360 ms open / 400 ms close**
- **Blue Tree/Hierarchy icon** (`HierarchyPathButton.jsx`) on category/subcategory rows in both List and Grid views. Viewport-safe Radix Popover.
- **Data integrity**: When a note carries a `category_path`, the array is the sole source of truth; `category`/`subcategory` are re-derived from it on every save and never allowed to drift.

## User Language Preference
English only.

## Data Model (Frontend IndexedDB — `IronRabbit`/`notes`)
- `id: uuid`
- `title, content, color, icon, background`
- `category: string` — mirror of `category_path[0]`
- `subcategory: string` — mirror of `category_path[1]`
- `category_path: string[]` — full deep hierarchy (source of truth)
- `pinned: bool` — Blue-rail flag (for flat notes)
- `tags, attachments, events, checklist, alarm, recurring`
- `pack_id, pack_name, pack_accent` — for Tile Pack lineage
- `ui_brightness, order, created_at, updated_at, last_viewed`

## Settings Model
- `pinned_categories: string[]` — Yellow rail
- `pinned_subcategory_paths: string[][]` — Green rail (arrays of segments)
- `category_order: string[]` — user drag-order for top-level categories
- `sticky_categories: string[]` — always-visible categories
- `keep_empty_categories: bool` — retains empty categories as drop targets
- `pack_accordion_mode` — initial open/closed state for tile packs
- `view_mode: 'list' | 'icon'`

## Key Rules
1. **PWA Cache Bust** — MUST bump `CACHE_NAME` in `/app/frontend/public/service-worker.js` on every frontend change, and remind the user to hard-refresh or use Incognito.
2. **Locked accordion timings** — List View is 220 ms locked at the component level. Grid View overrides via props.
3. **Curated Tile Packs** are untouchable.
4. **Deployments** — only when the user explicitly hits the blue Publish button.

## Implementation Snapshot (as of Feb 2026)
- Deep-hierarchy save chain (`NoteModal.handleSave` → `handleSaveNote` → `grouped` useMemo → `CategoryGroup` → `NestedSubGroup`) verified end-to-end at 4-level and 5-level depths (iteration_64).
- 3-tier pinning rails always visible with colored rounded borders (v122–128).
- `CategoryDeleteWarningDialog` pre-trash flow (v123–124).
- Focus Mode ZIP guide (v129).
- Zero-rerender AccordionBody animator (v135–140).
- Grid View 3-tile cap for mobile portrait (v131–133).
- `HierarchyPathButton` in List + Grid category/subcategory headers (v130–141).
- Deep-hierarchy flattening bug fix (v142).
- Post-v142 strict data+render verification (iteration_64 — 5/5 passed).

## Backlog / Roadmap
- **P1**: Custom Menu Tile Prompt — waiting on user to provide prompt text for the 16th tile action.
- **P1**: Security — remove admin token exposed in test files.
- **P2**: Move-to-Uncategorized Undo pill — one-tap reversal after bulk move.
- **P2**: Fix nested-`<button>` hydration console warning in `CategoryGroup.jsx` (HierarchyPathButton inside `category-toggle` button). Non-blocking, but pollutes DevTools console.
- **P3**: Rich Notification Icon monochrome mask review for OS push icons.
- **P3**: Deep-Hierarchy Health Check — Settings action "Fix orphaned notes" to rewrite legacy fields for any pre-v142 records missing `category`/`subcategory` when `category_path` is populated.
- **P3**: Hierarchy Jump Shortcut — long-press / right-click on the blue tree icon to filter Home to that path.

## Third-Party Integrations
- Open-Meteo (Weather) — no key
- BigDataCloud (Reverse Geocode) — no key
- Resend (email digest) — awaiting user API key (`RESEND_API_KEY` empty in .env)
- Slack (webhooks) — awaiting user webhook URL
- Gemini + OpenAI (community tip parser, insights) — via Emergent LLM Key
