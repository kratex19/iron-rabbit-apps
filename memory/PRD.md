# Iron Rabbit — Product Requirements Document

## Original Problem Statement
Iron Rabbit is a highly-polished offline-first PWA React app with:
- 3-tier pinning architecture (Pinned Notes, Categories, Subcategories)
- Complex 2D Grid Drag-and-Drop
- Deep recursive category hierarchies via `category_path` (no arbitrary depth limits)
- Curated Tile Packs (behavior locked)
- Fluid, container-based responsive design
- IndexedDB persistence via localforage
- Aggressive PWA cache lifecycle management

## Core Requirements
- Offline-first: all note state in IndexedDB
- Deep hierarchy: `category_path` array is source of truth; `category === category_path[0] || ''`
- Serpentine visual: L1–4 forward, L5–8 reverse, L9–12 forward, L13–16 reverse (Repair #8)
- Backup/Restore: biometric auth-gated (Repair #4)
- Drag/drop: desktop mouse = COPY, Ctrl/Meta = MOVE; touch cross-category = MOVE (Repair #6)
- PWA cache: bump `CACHE_NAME` on every frontend change (currently `iron-rabbit-v171`)

## What's Been Implemented
See `/app/memory/CHANGELOG.md` for the full timeline.

### Feb 2026 Session
- **Repair #1**: category/category_path invariant enforcement
- **Repair #2A**: Empty-Category / Uncategorized undo integrity
- **Repair #3**: Backup/Restore data audit (no code change required)
- **Repair #4**: Biometric auth gate on ALL manual Backup/Restore paths
- **Repair #5**: Tile Pack DND duplication fix (srcRect bounds check)
- **Repair #6**: Touch cross-category drag defaults to MOVE
- **Repair #7**: Fix stale source rect during touch drag (snapshot at drag-start)
- **Repair #8**: Deep-hierarchy serpentine visual direction (L5+)
- **TEST 11**: Final cross-repair regression audit — PASS
- **Repair #9** (2026-02-28): Fix New Note template-selection premature-unmount bug
- **Repair #10** (2026-02-28): Admin token cleanup — env-only in tests, redacted reports/memo, moved leaky ZIPs out of public/
- **Repair #11** (2026-02-28): Stale backup links in backup.html replaced with disabled-state notice
- **TEST 11 v2**: Post-Repair-#11 regression audit — PASS
- **Repair #12 diagnostic** (read-only): confirmed NO regression at v172; template flow works
- **v172 published to production** (2026-02-28)
- **Re Color glitch repair** (2026-02-28, v173): bulkSetColor now writes matching note.background alongside note.color so grid tile fill + border stay consistent
- **Featured Image — Phase 2** (2026-02-28, v175): optional per-note Featured Image (hero banner in FullScreenNote, chip editor in NoteModal). Reuses existing StorageService filesStore; blob-lifecycle safe (Change/Remove/Delete cleanups); backup/restore inherited; curated Tile Packs untouched. Validated PASS via iteration_103.
- **Featured Image — Phase 3** (2026-02-28, v176): ✳️ Sparkle header button in FullScreenNote (left of Translate). Empty → Add picker; with-image → Change/Remove menu. Tap-pulse animation. Shares handleFile/handleRemove with Phase 2 — no duplication. Validated PASS via iteration_104.
- **Featured Image — Phase 3A** (2026-02-28, v177): hero variant simplified to presentation-only (empty→null, no Change/Remove chips), image container `w-[95%] mx-auto`, image `object-contain max-h-[70vh]` preserving original aspect ratio. Star is sole Featured Image control. Validated PASS via iteration_105.
- **Duplicate Startup Icon Fix** (2026-09-24, v179): empty-state rabbit img → NotebookPen lucide glyph, eliminates same-icon-twice overlap in Chrome Incognito / fresh users. Validated PASS via iteration_108.
- **Repair #4 — AI Tools Tile Pack SHELVED** (2026-09-24, v180): temporarily closed via `SHOW_AI_TOOLS_PACK=false` conditional spread in `tilePacks.js`. Underlying files (`aiToolsPack.js` + `aiToolsPack.raw.json`) preserved intact for future rebuild. Pre-shelf ZIP at `/app/.local_backups_offline/IronRabbit_pre-Repair4_iron-rabbit-v179_2026-09-24.zip`. Validated PASS via iteration_111.
- **Module 1 — FloatingRichTextToolbar wired into FullScreenNote** (2026-10-01, v184): reused the existing toolbar component in `FullScreenNote.jsx` with zero duplication. Expanded the toolbar's DOM-selector whitelist (`EDITOR_TESTIDS`, `findActiveHtmlEditor`, `isEditorEl`, `getUsableRect`, PDF title fallback, checklist `.closest`) to recognize `fullscreen-content-input`, `fullscreen-content-input-html`, `fullscreen-content-input-format`, and `fullscreen-note` host panel. No change to HistoryStack, checklist delegation, portal/Radix guard, direct-DOM strikethrough, or scroll logic. Verified via Playwright: toolbar portals to BODY with full icon row visible on the FullScreenNote editor; NoteModal path remains intact.
  - Files changed: `/app/frontend/src/notes/editor/FloatingRichTextToolbar.jsx` (whitelist expansion only), `/app/frontend/src/notes/FullScreenNote.jsx` (one import + one `<FloatingRichTextToolbar isOpen={isOpen} isDark={isDark} />` mount)
  - Cache bumped `v183/v70` → `v184/v71`
  - Root cause: `if (!isOpen) return null;` in `TemplateModal.jsx` synchronously unmounted the nested Radix Dialog mid-pointer-event, causing parent NoteModal to close via `onPointerDownOutside`
  - Fix: removed early return so Radix owns lifecycle; added defensive `onOpenChange={(open) => { if (!open) onClose(); }}` guard in NoteModal
  - Cache bumped `v170` → `v171`
  - Validation: PASS on all 14 steps (iteration_98.json)

## Architecture
```
/app/frontend/
├── public/service-worker.js       (CACHE_NAME versioning, currently v171)
├── src/
│   ├── NotesApp.jsx               (Core app — needs refactor, >3300 lines)
│   ├── components/
│   │   └── SortableTilesProvider.jsx  (DND, srcRectRef, isTouchDrag→MOVE)
│   ├── notes/
│   │   ├── NoteModal.jsx          (New/Edit note dialog; hosts TemplateModal)
│   │   ├── TemplateModal.jsx      (Template picker — Repair #9 lifecycle fix)
│   │   ├── AppModals.jsx          (Root-level modal wiring)
│   │   ├── NestedSubGroup.jsx     (Deep hierarchy + serpentine bands)
│   │   ├── BackupRestoreModal.jsx (Biometric-gated export/import)
│   │   └── constants.js
│   └── storage/storageService.js  (localforage wrapper)
```

## Prioritized Backlog

### P1
- [x] Admin token cleanup — Repair #10 complete (2026-02-28, v172)
- [ ] Custom Menu Tile Prompt — wire the 16th tile's custom action (blocked on user prompt)

### P2
- [ ] Pinned-Sub Trash Icon — delete affordance on green pinned-sub items
- [ ] Markdown Auth Extension — extend Repair #4 to Markdown export/import handlers
- [ ] Refactor bloated `NotesApp.jsx` (>3300 lines)

### P3
- [ ] Rich Notification Icon — monitor OS push mask requirements
- [ ] Tile Pack Accordion Default State — `default_open` boolean on packs
- [ ] `data-testid="note-card-<id>"` on `<Draggable>` note items for E2E precision

## Testing Status
- Test reports: `/app/test_reports/iteration_81.json` … `iteration_98.json`
- Test credentials: `/app/memory/test_credentials.md`
- Last audit: TEST 11 (iteration_97) — PASS
- Last repair: Repair #9 (iteration_98) — PASS

## Third-Party Integrations
- Open-Meteo (weather)
- BigDataCloud (reverse geocode)
- Resend (emails — user API key pending)
- Slack (webhooks — user API key pending)
- Gemini / OpenAI — via Emergent LLM Key
