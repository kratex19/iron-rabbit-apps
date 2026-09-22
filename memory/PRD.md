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
