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
- **Deep-Hierarchy Health Check** — Settings → "Fix orphaned notes" (v143).
- **Hierarchy Jump Shortcut** — long-press blue tree icon filters Home to that `category_path` prefix (v143).
- **Category/Subcategory pop-out redesign** — the Note Editor's Category-path picker is now a contained, viewport-safe floating panel matching the HierarchyPathButton visual language. Fixed 22rem cap (collapses to `100vw − 1.5rem` on narrow viewports), 60vh internal scroll for unlimited-depth chains, uniform w-4 tree-connector gutter so input width is identical at every depth, Enter-to-append shortcut. Data model + parent→child relationships + existing Hierarchy Pop-Out untouched (v144).
- **Repair #1 · Hierarchy Data Integrity (v163)** — Move/Copy/Bulk paths keep `category_path` in perfect sync with legacy `category`/`subcategory`.
- **Repair #2 · Delete/Archive/Trash/Undo Integrity (v164)** — `cleanupPinnedRefsForPath` returns a `pinSnap`; segment-by-segment `isPathUnder` matching replaces the string-prefix bug; Undo splices removed pins back at original indices without wiping pins added afterwards.
- **Repair #2A · Empty-Category & Move-to-Uncategorized Undo (v165)** — Empty pinned category delete now surfaces the Undo pill (`type: "category_removed"`) and restores its pin/order/sticky entries. Move-to-Uncategorized (`type: "uncategorize"`) now snapshots per-note hierarchy fields and restores both notes AND pins on Undo. Existing Undo UI/architecture untouched.
- **Repair #3 · Backup/Restore Data Integrity Audit (v165 · clean)** — Programmatic 14-dimension round-trip audit against `exportAllData` / `importAllData`. Every dimension passed with zero data-fidelity defects (deep hierarchy, Uncategorized, pins, nested pin paths, attachment blob bytes across image/PDF types, custom sort rules, lifecycle, empty DB, mixed 12-note dataset). NO CODE CHANGES REQUIRED per spec. Two informational findings on the deprecated `migrateFromBackend` path (does not persist server settings, does not fetch attachment blobs) logged as backlog — outside Repair #3 scope.
- **Repair #4 · Biometric Auth Gate on Manual Backup/Restore (v166)** — Existing `requireAuthExport` / `requireAuthRestore` toggles are now enforced on BOTH manual paths: `NotesApp.handleBackup/handleRestore` and `BackupRestoreModal.handleExport/handleFilePick`. Same 5-line pattern already used by `handleClearAllData` and `exportToPDF`. Prompt fires only when method === `"biometric"`; PIN method + toggle-OFF paths byte-identical to pre-repair. Verified by iteration_83 (8/8 AUTH-GATE) + iteration_84 (9/9 MODAL-GATE + 4/4 regressions). Markdown export/import intentionally out of scope.
- **Repair #5 · Tile-Pack Drag/Reorder Duplication (v167)** — Fixed mobile/touch same-pack reorder silently cloning a tile into an adjacent pack when the finger path grazed the neighbor's rect. Root cause: dnd-kit's `pointerWithin` greedy collision + default `'copy'` on touch. Fix: live pointer tracker (`pointermove`/`touchmove` global listeners) + fail-closed boundary check in `SortableTilesProvider.handleDragEnd` — if the FINAL pointer position is still inside the source pack's rect, the drag is a silent no-op. Cross-pack COPY/MOVE semantics preserved for genuine cross-pack drops. Verified iteration_85 (audit) → iteration_87 (9/9 executed pass, hardened after iteration_86 first-attempt failure).

## Backlog / Roadmap
- **P1**: Custom Menu Tile Prompt — waiting on user to provide prompt text for the 16th tile action.
- **P1**: Security — remove admin token exposed in test files.
- **P1**: Markdown export/import biometric gate — extend Repair #4 to `handleExportAllMarkdown` / `handleImportMarkdown` in `BackupRestoreModal.jsx` (deferred per user directive during Repair #4).
- **P1**: Server-migration hardening — `migrateFromBackend` should also persist `/api/settings` and fetch attachment blobs (informational finding from Repair #3).
- **P2**: Touch-default cross-pack mode — consider defaulting to `move` (not `copy`) on touch in `SortableTilesProvider` since there's no way to hold Cmd/Ctrl on touch (footgun noted during Repair #5).
- **P2**: Empty user-created category droppable — currently only predefined TILE_PACKS render as droppable when empty; user-created empty categories don't render as pack sections (unrelated finding from Repair #5).
- **P2**: Fix nested-`<button>` hydration console warning in `CategoryGroup.jsx` (HierarchyPathButton inside `category-toggle` button). Non-blocking, but pollutes DevTools console. Flagged in iter_63, iter_64, iter_65.
- **P2**: Add `pinned-sub-delete-<label>` testid on the Green pinned-sub-item so a pinned subcategory can be deleted/moved-to-Uncategorized without first unpinning it (blocker for full UI test coverage of Repair #2A · B).
- **P3**: Rich Notification Icon monochrome mask review for OS push icons.
- **P4**: Tile Pack Accordion default_open authoring toggle.
- **P5**: Add `data-testid="note-card-<id>"` to `<Draggable>` note rows for Playwright E2E DND coverage.

## Third-Party Integrations
- Open-Meteo (Weather) — no key
- BigDataCloud (Reverse Geocode) — no key
- Resend (email digest) — awaiting user API key (`RESEND_API_KEY` empty in .env)
- Slack (webhooks) — awaiting user webhook URL
- Gemini + OpenAI (community tip parser, insights) — via Emergent LLM Key
