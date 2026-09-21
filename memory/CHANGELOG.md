## 2026-09-21 — v168: Repair #6 · Touch Cross-Category Drag = MOVE (not COPY)

**Two files touched, 14 net lines. Surgical.**

### Root cause (from iteration_90 audit)
`SortableTilesProvider.jsx` `handleDragStart` derived `modifier` only from `metaKey`/`ctrlKey`. Touch events don't carry keyboard modifiers, so `modifier === false` and the drag-end dispatch fired `mode='copy'` for every genuine touch cross-category drop. `NotesApp.handleCrossPackMove` then minted a fresh `uuidv4` clone.

### Fix
`handleDragStart` now also detects genuine touch input and promotes `modifier` to `true` for those drags. Detection uses state already available on the activator event — belt-and-suspenders for both sensors:
- **TouchSensor** activator: `TouchEvent` with `.touches.length > 0`.
- **PointerSensor** activator from touch: `PointerEvent` with `.pointerType === "touch"`.

`handleDragEnd` (L~224) dispatch line unchanged: `onCrossPackMove(sourcePackId, targetPackId, activeId, modifier ? 'move' : 'copy')`. Downstream `handleCrossPackMove` unchanged — its `move` branch (`StorageService.moveNoteToCategory`) already preserves note id / pack_id / pack_name / pack_accent / order / content / title while updating only category / category_path / subcategory / updated_at.

### Files changed (2)
- `frontend/src/components/SortableTilesProvider.jsx` — `handleDragStart` promotes `modifier` to true when `activatorEvent.touches.length > 0` OR `activatorEvent.pointerType === "touch"` (~L145-160).
- `frontend/public/service-worker.js` — `CACHE_NAME` bumped `iron-rabbit-v167` → `v168`.

### Files inspected but unchanged
- `NotesApp.jsx` `handleCrossPackMove` L1886-1946 — unchanged.
- `storage/storageService.js` `moveNoteToCategory` — unchanged.
- `SecurityService.js`, `RecentActionPill.jsx`, `BackupRestoreModal.jsx` — all unchanged.

### Preserved
- Desktop mouse WITHOUT Cmd/Ctrl → COPY (verified iteration_91).
- Desktop mouse WITH Cmd/Ctrl → MOVE (verified iteration_91).
- Repairs #1/#2/#2A/#3/#4/#5 source bytes untouched (verified via `git show --stat HEAD`).
- Category invariant `category === category_path[0]||''` and `subcategory === category_path[1]||''` holds after touch MOVE.
- Tile ID preserved, no uuidv4 minted, total note count unchanged.

### Verification (iteration_91)
| Test | Verdict | Evidence |
| --- | --- | --- |
| TEST 8A · touch cross-category MOVE | ✅ PASS | total 5→5, Groceries 3→2, Errands 2→3, t1 id preserved with category='Errands'/category_path=['Errands']/pack_id='test-pack-8', toast `Moved to "Errands"`, zero fresh uuidv4 |
| TEST 8A-RELOAD · persistence | ✅ PASS | reload → t1 still in Errands, total 5, IDs preserved |
| DESKTOP REGRESSION 1 · mouse no-modifier | ✅ PASS | total 5→6, t1 remained in Groceries, fresh uuidv4 in Errands, toast `Copied to "Errands"` (unchanged) |
| DESKTOP REGRESSION 2 · mouse Ctrl-held | ✅ PASS | total stays 5, t1 moved with id preserved, toast `Moved to "Errands"` (unchanged) |

### Reported (NOT fixed per Repair #6 stop-condition)
Repair #5 wobble co-existence test (2-pack layout on mobile viewport, mid-drag layout reflow) surfaced a **latent Repair #5 boundary-measurement issue** — `getBoundingClientRect()` at drop time can drift when the source-pack DOM reflows during a wide-wobble touch drag. Pre-Repair #6 this produced a mis-COPY (2 tiles in wrong places); post-Repair #6 it produces a mis-MOVE (1 tile in wrong category — same pack_id preserved, no uuidv4, total unchanged). Repair #6's mode-flip actually **improves** the worst-case wobble outcome (single mis-categorized tile vs. duplicated tile). Recommended future repair: snapshot srcRect at `handleDragStart` (or use an `IntersectionObserver`-driven live rect map) instead of measuring at drop time. Deferred to a future Repair #7 per spec.



## 2026-09-21 — v167: Repair #5 · Tile-Pack Drag/Reorder Duplication Bug

**Two files touched, surgical only, cross-pack semantics preserved.**

### Root cause (confirmed by iteration_85 audit + iteration_87 telemetry)
On mobile/touch, dnd-kit's `cascadedCollision` uses `pointerWithin` first. When a user drags a tile INSIDE their pack but the touch path even briefly grazes an adjacent pack's rect, `over.id` gets greedily resolved to the neighboring pack's droppable. `handleDragEnd` sees `targetPackId !== sourcePackId`, dispatches `onCrossPackMove` with default `'copy'` mode (no modifier key on touch), and `NotesApp.handleCrossPackMove` L1917 mints a new note via `uuidv4()` — silent duplicate in the neighbor pack while the original stayed put.

### Fix (Repair #5 hardened after iteration_86 failure)
Added a **live pointer tracker + fail-closed boundary check** to `SortableTilesProvider.jsx` — nothing else changed:

1. **`pointerRef` (useRef)** — populated from `event.activatorEvent` on `handleDragStart`, then kept live via `window.pointermove` + `window.touchmove` listeners attached for the duration of the drag. Guarantees we have the FINAL pointer position at drop time, not a stale mid-drag rect.
2. **`packContainerRefs` (Map)** — each `PackSection` registers its container DOM node via a `registerContainer` prop combined with dnd-kit's `setNodeRef`.
3. **Boundary check in `handleDragEnd`** — when `sourcePackId !== targetPackId`, look up the source pack's `getBoundingClientRect()` and check whether `pointerRef.current` (the LIVE pointer) is inside that rect.
   - Inside → silent no-op (user's clear intent was in-pack reorder that dnd-kit misclassified).
   - Missing rect OR missing pointer → **fail-CLOSED** silent no-op (safer than a silent duplicate).
   - Outside → real cross-pack drop, dispatch `onCrossPackMove` unchanged.
4. **Listeners always torn down**: at top of `handleDragEnd` (before any early return), inside `onDragCancel`, and in a `useEffect` unmount cleanup.

### Files changed (2)
- `frontend/src/components/SortableTilesProvider.jsx` — added imports (`useEffect`, `useRef`), `packContainerRefs`, `pointerRef`, `trackPointerMove` / `attach` / `detach`, unmount cleanup effect, seed logic in `handleDragStart`, boundary check in `handleDragEnd`, teardown in `onDragCancel`, `registerContainer` prop plumbed through `api.Section` → `PackSection` → `setCombinedRef`.
- `frontend/public/service-worker.js` — `CACHE_NAME` bumped `iron-rabbit-v166` → `v167`.

### Files inspected but intentionally unchanged
- `frontend/src/NotesApp.jsx` — `handleCrossPackMove` L1886, `handleSortableReorder` L1853, hello-pangea `handleDragEnd` L1633 — all bug-free; the defect was upstream in the collision boundary.
- `frontend/src/storage/storageService.js` — `reorderNotes` is order-only, no dupe possible.
- `frontend/src/components/SortableTileGrid.jsx` — ungrouped-grid variant unaffected.
- `frontend/src/components/NoteTile.jsx`, `frontend/src/data/aiToolsPack.js` — no drag logic.

### Explicitly preserved
- Same-pack reorder path (L186-198): tile IDs preserved, `reorderNotes` order-only.
- Cross-pack COPY default (no modifier held) unchanged.
- Cross-pack MOVE with Cmd/Ctrl unchanged.
- Empty-pack drop path unchanged.
- List view (hello-pangea) handler untouched.
- Tile Pack installation semantics untouched.
- All cross-pack COPY/MOVE metadata handling untouched.
- Repairs #1 (hierarchy), #2 & #2A (Undo), #3 (backup/restore integrity), #4 (biometric gate) intact.

### Verification
| Iteration | Scope | Result |
| --- | --- | --- |
| `iteration_85` | Phase 1 audit — reproduce and identify | ✅ bug confirmed at pointerWithin boundary |
| `iteration_86` | Phase 3.1 — first fix attempt (translated rect) | ❌ V1 failed; translated rect was stale after wobble |
| `iteration_87` | Phase 3.2 — hardened fix (live pointer + fail-closed) | ✅ 9/9 executed pass |

Test coverage (iteration_87): V1 mobile-wobble no-op ✅, V2 same-pack reorder (mobile + desktop) ✅, V3 legitimate cross-pack COPY (touch) ✅, V4 cross-pack MOVE (Ctrl+desktop) ✅, V5 consecutive drags ✅, V6 reload persistence ✅, V8 listener add/remove symmetry after cancel + subsequent drag ✅, R4 hierarchy invariants ✅. V7 (empty user-pack drop) skipped due to harness limitation — `allPacks` derives from categories that have notes; unrelated to Repair #5.

### Unrelated defects discovered — REPORTED ONLY (per spec, not fixed)
- Empty user-created categories aren't rendered as droppable packs in Grid view (only predefined TILE_PACKS render when empty). Not a Repair #5 regression; historical.
- Cross-pack COPY on touch is a footgun (no way to hold Cmd/Ctrl to move). Consider defaulting to 'move' on touch in a future repair. Not in Repair #5 scope.
- The reload-loop kill-switch in `index.html:73` (window.stop + SW unregister after 4 reloads in 15s) trips during rapid E2E iteration. Not a shipping concern; noteworthy for test tooling.



## 2026-09-21 — v166: Repair #4 · Biometric Auth Gate on ALL Manual Backup/Restore Paths

**Two paths gated, one existing SecurityService pattern, no serialization or UI changes.**

### Root cause fixed
Settings already exposed `requireAuthExport` and `requireAuthRestore`, but neither manual export/restore entry point enforced them. Both entry points must be gated for the toggles to be meaningful:
1. **Path A** — `NotesApp.handleBackup` / `handleRestore` (invoked from SettingsModal's Backup / Restore buttons).
2. **Path B** — `BackupRestoreModal.handleExport` / `handleFilePick` (invoked from the modal's own Export button and hidden file input).

Prior to this repair, both paths called `StorageService.exportAllData` / `importAllData` directly and skipped the biometric prompt entirely.

### Files changed (3)
- `frontend/src/NotesApp.jsx` — `handleBackup` (L1995) and `handleRestore` (L2018) now run the existing `getToggles() + getMethod() + verifyBiometric()` gate before any side effect. `handleRestore` moved input reset into `finally` so the same file can be re-picked after any exit (auth-fail, parse-fail, success).
- `frontend/src/notes/BackupRestoreModal.jsx` — imported `SecurityService`; identical gate added to `handleExport` (before `exportAllData`) and `handleFilePick` (before `file.text()` / `JSON.parse` / `setPendingPayload`). Existing `finally`-block input reset preserved.
- `frontend/public/service-worker.js` — `CACHE_NAME` bumped `iron-rabbit-v165` → `v166`.

### Files inspected but intentionally unchanged
- `frontend/src/security/SecurityService.js` — pattern already existed (`handleClearAllData`, `exportToPDF`); reused verbatim.
- `frontend/src/storage/storageService.js` — export/import serialization untouched (Repair #3 clean).
- `frontend/src/notes/SecurityModal.jsx` — toggle UI untouched.

### Gate semantics (identical across both paths)
```
if (toggles.requireAuthExport /* or requireAuthRestore */ && method === "biometric") {
  const ok = await SecurityService.verifyBiometric();
  if (!ok) { toast.error("Authentication failed"); return; }
}
```
- Prompt fires **only** when method === `"biometric"`. `"pin"` is already gated at app launch by the lock screen.
- When the toggle is OFF, behavior is **byte-identical** to pre-repair.
- Authentication runs **strictly before** any read/parse/write.

### Intentionally out of scope
- Markdown export/import (`handleExportAllMarkdown` / `handleImportMarkdown`) — per user directive, deferred to a future repair.
- `migrateFromBackend` (deprecated server-restore path) — separate future security review.

### Verification
| Test iteration | Coverage | Result |
| --- | --- | --- |
| `iteration_83` | 8 AUTH-GATE cases on `NotesApp` path (pass/fail × export/restore × biometric/PIN/toggle-off/order) | ✅ 8/8 pass |
| `iteration_84` | 9 MODAL-GATE cases on `BackupRestoreModal` path + 4 regressions | ✅ 9/9 pass; 4/4 regressions pass |
| `iteration_82` (inherited) | 14-dimension backup/restore round-trip fidelity | ✅ clean, no change since |

Repairs #1, #2, #2A, #3 all remain intact.



## 2026-09-21 — Repair #3 · Backup / Restore Data Integrity Audit — CLEAN (no code change)

Per Repair #3 spec: audit-first, code-change-only-if-a-real-defect-is-found. **Audit result: CLEAN — existing implementation passed every fidelity dimension. No source changes made. Cache stays at v165.**

### Files inspected (unchanged)
- `frontend/src/storage/storageService.js` — `exportAllData` L464-512, `importAllData` L514-596, `migrateFromBackend` L608-649, attachment blob store, settings store, templates store.
- `frontend/src/NotesApp.jsx` — `handleBackup` L1995, `handleRestore` L2008, `handleRestoreFromServer` L872.
- `frontend/src/notes/BackupRestoreModal.jsx`.

### Fidelity verified (round-trip via testing_agent · iteration_82)

| # | Dimension | Result |
| --- | --- | --- |
| 1 | Top-level `category_path=['Work']` | ✅ exact match |
| 2 | Subcategory `['Work','Projects']` | ✅ exact match |
| 3 | Deep 4-level `['Work','Projects','2026','January']` | ✅ no flattening |
| 4 | Uncategorized `[]`, `''`, `''` | ✅ array stays array, empty strings preserved |
| 5 | `pinned_categories` + `category_order` + `sticky_categories` | ✅ order preserved |
| 6 | `pinned_subcategory_paths` (nested arrays) | ✅ intact |
| 7 | Single attachment blob bytes | ✅ byte-for-byte identical + metadata |
| 8 | 3 attachments (png/jpeg/pdf) | ✅ all bytes + metadata + order |
| 9 | `sort_by='custom'` + `custom_sort_rules` + per-note `order` | ✅ preserved |
| 10 | Lifecycle `archived_at` / `deleted_at` | ✅ exact ISO preserved |
| 11 | Complete note (deep + tags + color + attachment + alarms + pinned + pack_id + timestamps + forward-compat `foo`) | ✅ every field |
| 12 | Empty database round-trip | ✅ no fake records |
| 13 | Mixed 12-note dataset deep-diff | ✅ zero diffs |
| 14 | `migrateFromBackend` static inspection | ✅ documented (see below) |
| Regression | Repair #1 invariant (`category === category_path[0]‖''`) | ✅ for every restored note |
| Regression | `recentAction` untouched by import | ✅ |
| Regression | Repairs #1 / #2 / #2A intact | ✅ |

### Why the existing implementation is correct
- **Notes**: `notesStore.setItem(note.id, note)` — full-object passthrough on both sides. No whitelist, no field filtering. Forward-compat fields survive.
- **Attachments**: `FileReader.readAsDataURL(blob)` → base64 data-URL → `fetch(dataURL).blob()` is losslessly reversible. Metadata (`name` / `type` / `size` / `created_at`) is passed through as a plain object.
- **Settings**: full-object write. Every documented pin / order / sort / sticky field is included because they all live on the single `app_settings` object.
- **Templates + preset title overrides**: full passthrough.
- **Empty DB**: `getAllNotes()` returns `[]`; `getTemplates()` returns `[]`; `filesStore.iterate` yields no entries → `files={}`. Import loops iterate zero times — no fake data.

### Informational findings (OUT OF Repair #3 scope, logged for future review)
- `migrateFromBackend` (server-restore entry) fetches `/api/settings` but never persists it to `settingsStore`; only notes and templates are written. Also does not fetch attachment blobs. This is a documented limitation of the deprecated backend migration path — the offline-first architecture no longer stores notes/attachments server-side. **Manual JSON backup/restore remains the fidelity-preserving path.** No repair applied per spec ("if it is already correct, leave it unchanged").

### Regression confirmation
Repairs #1, #2, and #2A all remain intact. Backup/restore does not touch hierarchy invariants, pin snapshots, undo state, custom ordering, Tile Pack metadata, or lifecycle timestamps.



## 2026-09-21 — v165: Repair #2A · Empty-Category & Move-to-Uncategorized Undo Integrity

**Two surgical follow-ups to Repair #2, no other behavior changed.**

**Root causes fixed**:
1. **Empty pinned category delete had no Undo pill** — `routeDeleteToChoice` fired `cleanupPinnedRefsForPath` then returned; the removed pin/order/sticky entries were unrecoverable.
2. **Move-to-Uncategorized dropped its cleanup snapshot** — `moveIdsToUncategorized` called cleanup with fire-and-forget semantics and `handleCategoryWarningMove` never captured note snapshots, so Undo could restore neither hierarchy nor pins.

**Files changed** (3 total):
- `frontend/src/NotesApp.jsx`
  - Empty-branch of `routeDeleteToChoice` now `await`s `cleanupPinnedRefsForPath`, captures the returned `pinSnap`, and issues `setRecentAction({ type: "category_removed", count: 1, label, undoSnap: new Map(), pinSnap })` — reuses the existing Undo architecture; empty Map is truthy so the guard passes; pill only shown when cleanup actually removed something.
  - `moveIdsToUncategorized(ids, path)` now returns `{ undoSnap, pinSnap }`; per-note undoSnap captures ONLY the hierarchy fields (`category`, `subcategory`, `category_path`) so Undo restores hierarchy without clobbering title/content/tags/attachments/alarms/pinned/pack/timestamps/order.
  - `handleCategoryWarningMove` wires the returned snapshots into `setRecentAction({ type: "uncategorize", ... })`.
  - `undoRecentAction` gained a type-branch: `"uncategorize"` uses `saveNote` to restore per-note hierarchy from snapshot (spread current note so unrelated fields survive concurrent edits); `"archive" / "trash"` unchanged; `"category_removed"` iterates its empty Map (no-op) then the shared pinSnap-splice path restores pins.
- `frontend/src/notes/RecentActionPill.jsx` — added label branches for `uncategorize` ("N notes moved to Uncategorized") and `category_removed` ("<name> removed") with existing pill visuals; icons via lucide `FolderInput`/`FolderMinus`. No visual redesign.
- `frontend/public/service-worker.js` — `CACHE_NAME` bumped `iron-rabbit-v164` → `v165`.

**Preserved** (per spec safety guards):
- `isPathUnder(candidate, ancestor)` segment matching from Repair #2 — deleting `["Work","Pro"]` still does NOT sweep `["Work","Project"]`, `["Work","Product"]`, or `["Personal","Projects"]`.
- Pin restoration reads CURRENT settings, splices only captured entries at their original indices, deduplicates via `.includes` / path-key equality, and preserves pins the user added AFTER the destructive action.
- Move/Copy (Repair #1), sorting, search, backup/restore, auth, Tile Packs, individual-note pins, all UI/CSS untouched.
- No duplicate `cleanupPinnedRefsForPath` calls anywhere.

**Verification** (testing agent iteration_81):
- **Test A** — Empty pinned category (Work) with pinned_categories/category_order/sticky_categories/pinned_subcategory_paths entries: delete removes all, pill shows `"Work" removed`, Undo restores every entry at its original index. ✅ PASS end-to-end via UI.
- **Test B (move-to-uncategorized)** — Logic verified by testing-agent code review (per-note hierarchy snapshot + pinSnap capture + saveNote restore all correct). UI trigger blocked by a **pre-existing** CategoryGroup filter (hides sub delete icon when sub is pinned) — unrelated to Repair #2A.
- No regressions in existing archive/trash Undo.

**Deferred (backlog, out of Repair #2A scope)**:
- Add `pinned-sub-delete-<label>` testid to Green rail item so users can move/trash a pinned subcategory without first unpinning it.
- Tile Pack DND duplication bug.
- Admin token in test files (security audit item).



## 2026-09-20 — v164: Repair #2 · Delete / Archive / Trash / Undo Integrity

**Root causes fixed**:
1. **Undo did not restore pins** — `undoRecentAction` restored lifecycle only, so pinned categories/subcategories deleted by a hierarchy operation stayed gone after Undo.
2. **Path matching used string prefix** — `cleanupPinnedRefsForPath` joined segments and used `startsWith`, so deleting `["Work","Pro"]` incorrectly swept up `["Work","Project"]` and `["Work","Product"]`. Same class of bug for `["Personal","Home"]` vs `["Personal","Homestead"]`.

**Files changed** (2 total, exactly what the fix required):
- `frontend/src/NotesApp.jsx` — `cleanupPinnedRefsForPath` rewritten to use segment-by-segment `isPathUnder` helper and to RETURN a `pinSnap` describing every removed entry with its original array index. `performArchive` and `performTrash` now capture that snapshot into `recentAction.pinSnap`. `undoRecentAction` now splices each removed entry back at its original position, deduplicating so pins the user added AFTER the destructive action are preserved.
- `frontend/public/service-worker.js` — `CACHE_NAME` bumped `iron-rabbit-v163` → `v164`.

**Not touched** (per spec safety guards): UI, CSS, sort, Move/Copy semantics from Repair #1, Tile Packs, backup/restore, auth, individual-note pin architecture, empty-category direct cleanup path (which has no undo pill).

**Verification** (all 10 acceptance tests):
| # | Test | Result |
| --- | --- | --- |
| T1 | Pinned top-level category — delete, undo restores at original index | ✅ PASS |
| T2 | Pinned subcategory — delete, undo restores | ✅ PASS |
| T3 | Deep pinned path 4 segments — delete, undo restores exact path | ✅ PASS |
| T4 | Similar prefixes (`Pro` vs `Project` vs `Product`) — critical bug fix | ✅ PASS |
| T5 | True descendants — all children swept, unrelated siblings kept | ✅ PASS |
| T6 | Unrelated category (Personal vs Work) untouched | ✅ PASS |
| T7 | Undo does NOT wipe pins added after cleanup | ✅ PASS |
| T8 | Multiple affected pins under one deletion — all restored | ✅ PASS |
| T9 | Normal note delete (empty path) — no pin sweep | ✅ PASS |
| T10 | Hierarchy data preservation — Repair #1 unchanged, Repair #2 writes only to `settings.*` never `notes.*` | ✅ documented |


## 2026-09-20 — v163: Repair #1 · Hierarchy Data Integrity for MOVE / COPY / BULK

**Root cause fixed**: MOVE / COPY paths wrote only `category` + `subcategory`, leaving stale `category_path` on the note. A note moved from `["Work","Projects","2026","January"]` → `["Personal"]` retained the old deep path, producing internally inconsistent records.

**Files changed** (exactly what the spec named, nothing else):
- `frontend/src/storage/storageService.js` — `moveNoteToCategory(noteId, newCategory, newSubcategory='', options={})` now derives + writes `category_path` alongside the two legacy fields. New optional `options.categoryPath` lets Undo restore a deep source path verbatim. `prev` snapshot now returns `{category, subcategory, category_path}`.
- `frontend/src/NotesApp.jsx` — cross-category COPY (L1590) and cross-pack COPY (L1750) now explicitly set `category_path` (no more spread-leak from `...original`). Cross-cat MOVE Undo (L1580) and cross-pack MOVE Undo (L1737) pass `{categoryPath: prev.category_path}` so deep paths round-trip.
- `frontend/src/hooks/useBulkActions.js` — `bulkMoveTo` Undo passes `categoryPath` (L116). `bulkCopyTo` copy object now sets `category_path` explicitly (L142). `bulkDuplicateInPlace` **intentionally untouched** (preserves source hierarchy via spread — correct per spec).
- `frontend/public/service-worker.js` — CACHE_NAME `iron-rabbit-v162` → `v163`.

**Consistency invariant enforced everywhere**:
```
note.category    === note.category_path[0] || ''
note.subcategory === note.category_path[1] || ''
```

**Verification**:
- Static: grep confirms all six Repairs (A–F) present in the compiled source. `bulkDuplicateInPlace` confirmed unmodified.
- Algorithmic: all 12 acceptance tests (T1–T12) pass — top-level MOVE, top→sub, deep-hierarchy MOVE, MOVE-to-Uncategorized, cross-cat COPY, bulk MOVE, bulk COPY, cross-pack MOVE, cross-pack COPY, deep-hierarchy UNDO, bulk MOVE + UNDO, unrelated-properties preservation.
- Live: app boots cleanly, seeds render, Batch Studio opens without error.

**No UI, CSS, sort, filter, hierarchy semantics, or Tile Pack semantics changed.**


## 2026-02-28 — v162: four surgical enhancements (legacy label + testids + rule drag + empty-state)

- **Legacy trigger label**: `frontend/src/notes/AppSearchBar.jsx` — conditional `<SelectItem value="category">By Category (legacy)</SelectItem>` rendered ONLY when `sortBy === "category"` so Radix can resolve the trigger label. Never appears in fresh state → cannot be re-selected once the user picks any other sort. Comparator + backward-compat unchanged.
- **Testids**: `data-testid="filter-trigger"` on the LEFT `SelectTrigger`, `data-testid="sort-trigger"` on the RIGHT. Each visible sort option now has `data-testid="sort-option-<value>"`; the legacy item has `data-testid="sort-option-category-legacy"`. No visual change.
- **Custom Priority long-press drag**: `frontend/src/notes/CustomPriorityEditor.jsx` — wrapped rule list in `<DragDropContext droppableId="custom-priority-rules">` + `<Droppable>` + `<Draggable>`. Each row gains a `<GripVertical>` handle with `data-testid="priority-rule-drag-<value>"`. `onDragEnd` guards on `droppableId === "custom-priority-rules"` so it can never interfere with the main notes DND. Existing chevron / remove buttons unchanged. Dedup + hierarchy protections intact.
- **Uncategorized empty-state card**: `frontend/src/NotesApp.jsx` `renderNotes()` short-circuit — when `filterBy === "uncategorized"` AND `processedNotes.length === 0` AND `!searchQuery`, render a friendly card with rusty-rabbit icon, headline "You're clean — no loose tiles", and subtitle. `data-testid="uncategorized-empty-state"`. Zero side effects — no container/pack/category/tile created.
- **Cache**: v161 → v162.
- **Tested (iteration_80.json)**: 7/7 spec groups PASS at 100%. Regression check confirms v161 RIGHT-dropdown order and all backward-compat seeds still work.



## 2026-02-28 — v161: RIGHT dropdown semantic clarification

- **Renamed user-facing labels only** — all internal ids preserved so every existing `settings.sort_by` value continues to work:
  * `priority` → **Custom** (was "Custom Priority")
  * `recently-edited` → **Edited — Newest First**
  * `recently-viewed` → **Viewed — Most Recent First**
- **RIGHT dropdown order** now matches spec exactly: Custom · Manual Order · Newest First · Oldest First · Edited — Newest First · Edited — Oldest First · Viewed — Most Recent First · Viewed — Oldest First · A → Z · Z → A.
- **Two new sort options added** with new internal ids: `edited-oldest` (`updated_at` ASC) and `viewed-oldest` (`last_viewed || updated_at` ASC). Both persisted via `settings.sort_by` and honored by `compareByRule`.
- **`By Category` removed from the visible RIGHT dropdown** but comparator retained as hidden backward-compat fallback: seeded `settings.sort_by="category"` reloads without crash and still sorts (per spec).
- **Custom Priority rule library** relabelled to match new terminology + gained the two new `edited-oldest` / `viewed-oldest` rules. `By Category` retained as a hidden rule for older rule lists.
- **Whitelist** in `NotesApp.jsx` load path expanded: `["custom","priority","newest","oldest","a-z","z-a","recently-viewed","viewed-oldest","recently-edited","edited-oldest","category"]`.
- **No LEFT-dropdown changes.** No Manual Order data touched. No hierarchy / pinned / Tile-Pack changes.
- **Cache**: `service-worker.js` v160 → v161.
- **Tested (iteration_79.json)**: 10/10 spec assertions PASS. Backward-compat proven for `category`, `recently-edited`, `recently-viewed`, `priority`+legacy rules.
- **Known minor UX gap**: legacy `sort_by="category"` renders a blank trigger label (comparator still sorts). Trivial polish item, not blocking.


## 2026-02-28 — v160: Nested <button> hydration fix + Path A re-verify

- **Hydration warning fixed**: `frontend/src/notes/CategoryGroup.jsx` (L87-130) and `frontend/src/notes/NestedSubGroup.jsx` (L96-141) — outer toggle wrappers converted from `<button>` to `<div role="button" tabIndex={0}>` with `onKeyDown` for Enter/Space, `aria-expanded`, and preserved classes/testids. `HierarchyPathButton` (which renders its own `<button>`) is now a legal descendant. `CategoryHeader.jsx` verified structurally clean (`HierarchyPathButton` is a sibling of the toggle button, not a child).
- **Priority Rule Icons** confirmed visible in `CustomPriorityEditor.jsx` — each rule row renders the lucide icon on the left of the label; no behavior change.
- **Path A independent re-verification** (iteration_78.json): Uncategorized filter data-integrity confirmed byte-identical across 13 notes; Custom Priority persistence + duplicate prevention pass; 0 hydration warnings across Grid/List/Nested-Subcategory paths.
- **No new features added** — Timeline preset skipped per user directive.
- **Cache**: `service-worker.js` v159 → v160.


## 2026-02-28 — v158/v159: Path A split — Manual Order vs Custom Priority + Uncategorized filter

- **Left dropdown (FILTER)** — added `Uncategorized` option (`frontend/src/notes/constants.js` `FILTER_OPTIONS`). Shows ONLY tiles with no `category` + no `subcategory` + empty `category_path`. Zero data mutation; pinned rails untouched. Filter branch in `NotesApp.jsx` `processedNotes` useMemo.
- **Right dropdown (SORT)** — renamed user-facing label of value `custom` from **"Custom Order"** → **"Manual Order"**. Internal id preserved so all existing `note.order` data + DND reorder flow is unchanged.
- **NEW SORT: `Custom Priority`** (value `priority`) — user-authored multi-level rule list persisted at `settings.custom_sort_rules`. Rules drawn from CUSTOM_PRIORITY_RULES: newest / oldest / a-z / z-a / recently-viewed / recently-edited / category. First rule wins; later rules act as tie-breakers.
- **Editor** — new `frontend/src/notes/CustomPriorityEditor.jsx`. Numbered list with Up/Down/Remove buttons; Add-rule dropdown lists only rules NOT already present (dedup at source). Rendered inline by `AppSearchBar` only when `sortBy === "priority"`.
- **Persistence** — sortBy now persisted at `settings.sort_by`; rehydrated on load; DND auto-switch to Manual Order also persists.
- **Zero data migration**. Tile Pack → Category → Subcategory → Tile hierarchy untouched. Pinned tiles/categories/subcategories rails unchanged. Custom Priority never creates, copies, moves, renames, or duplicates content.
- **Cache**: `service-worker.js` v157 → v159.
- **Tested (iteration_77.json)**: 17/18 initial spec passes; the one miss (sortBy not persisted) resolved in v159 (verified via preview reload + IndexedDB read: `{sort_by:'priority', ...}` survives reload).



## 2026-02-28 — v156: Focus dropdown "🌙 Nightly" option reuses existing schedule

- **NEW menu row** in `frontend/src/notes/FocusStatusChip.jsx` between "Until sunrise" and the divider before "Turn ON (indefinite)": `data-testid="focus-status-menu-nightly"` with the `Moon` lucide icon, matches existing row styling.
- **Behavior — no new scheduling code**:
  * If `settings.focus_schedule` is absent OR every day has `enabled=false` → informational toast: *"Configure a nightly schedule first — Open Settings → Focus Mode → Schedule Focus Mode to set your nightly hours."* No mutation.
  * If schedule has an enabled day AND `schedule.enabled === false` → merges `{ focus_schedule: { ...schedule, enabled: true } }` via existing `onActivate`. Toast: *"Nightly schedule enabled."* Per-day config preserved untouched.
  * If `schedule.enabled === true` already → toast *"Nightly schedule is already active."* No mutation.
- **Reuses existing overnight math** (`isInFocusWindow` in `notifications/notificationService.js`) — no new time logic. Overnight windows (e.g. 22:00 → 06:30) already handled by the schedule engine.
- **Wiring**: `focusSchedule={settings?.focus_schedule}` passed from `NotesApp.jsx` → `notes/AppHeader.jsx` → `FocusStatusChip`. `components/GlobalFocusChip.jsx` also passes `focusSchedule={settings.focus_schedule}` so the fullscreen-tile overlay chip works identically.
- **Cache**: `service-worker.js` `CACHE_NAME` bumped `iron-rabbit-v155` → `v156`.
- **Regression**: 30m / 1h / 2h / Until sunrise / Turn ON (indefinite) / How Focus works / Download guide (ZIP) unchanged. No Tile Pack, Pinned, hierarchy, tile ID, tile data-structure, drag-and-drop, or unrelated CSS changes.
- **Tested via testing agent (iteration_75.json)**: 11/11 assertions PASS — menu order, Case A/B/C toasts + mutation checks, overnight math verified, Turn ON + 30m regression.



## 2026-02-28 — v85: PWA "Add to Home Screen" install prompt

- **NEW `frontend/src/notes/InstallPrompt.jsx`**: subtle bottom-of-viewport toast that
  * captures `beforeinstallprompt` on Android Chrome / desktop Chrome → native install with one tap;
  * falls back to an iOS Safari instructional card (Share → Add to Home Screen) since iOS never fires BIP;
  * waits 20 s after landing before appearing;
  * persists dismissal / 14-day snooze / installed state in `localStorage` under `ir-install-prompt-state`;
  * auto-hides when `display-mode: standalone` is true;
  * respects `prefers-reduced-motion`.
- Wired into `NotesApp.jsx` next to Toaster/QuickGuideModal/WeeklyDigest.
- All buttons expose data-testids: `install-prompt`, `install-prompt-install`, `install-prompt-later`, `install-prompt-dismiss`.


## 2026-02-28 — v84: Landscape unlock + share preview + landscape polish

- **manifest.json**: `"orientation": "portrait-primary"` → `"any"` so the installed PWA rotates with the device. Users may need to reinstall the home-screen shortcut once (OS caches manifest at install time).
- **Open Graph / share preview**: Added `frontend/public/og-image.jpg` (1200×630, ~120 KB), `og-image.png` (same content), and `feature-graphic-1024x500.png` (Play Store feature graphic). Wired full OG + Twitter Card meta tags into `frontend/public/index.html` pointing to `https://app.ironrabbitapps.com/og-image.jpg`.
- **Landscape UI polish**: New `@media (orientation: landscape) and (max-height: 560px)` block in `frontend/src/index.css`. Compresses `--ir-container-pad-y`, `--ir-gap`, header rows, logo tile, and glass-strip icon buttons so short landscape viewports (rotated phones, split-screen) reclaim vertical space. Verified: header height drops to ~86 px in a 900×400 landscape.
- **iOS native note**: `IOS_BUILD.md` already documents that `Info.plist` must include all 4 `UISupportedInterfaceOrientations` when the Xcode project is generated — no code change here, just heads-up for future native build.


## 2026-02-18 — Depression-Era Gangsters (169-183) 🎩

- Received a 4×4 grid of Depression-era / prohibition / gangster themes.
- **Skipped panel (0,1)** — vintage movie marquee with "JACK OAKIE"
  burned in (real deceased actor's name = right-of-publicity risk in
  some U.S. states). Kept other in-scene text (Wall Street Crash
  newspaper, "FIRST NATIONAL BANK", "WANTED $10,000", "ROOMS 25¢") —
  these are generic period details, no IP.
- **Extracted 15 safe panels** as presets 169-183 under new
  **"Gangster"** category:
  - 169 tommy-gun quartet, 170 posed gangsters, 171 bank robbery run,
    172 Wall Street Crash paper, 173 industrial-city street,
    174 bourbon warehouse, 175 wanted poster, 176 backroom poker,
    177 bullet-riddled getaway car, 178 wet-street shooter,
    179 fedora + tommy + cash still-life, 180 prohibition still,
    181 "ROOMS 25¢" hotel, 182 street shootout with muzzle flash,
    183 vintage sedan on Brooklyn Bridge under NYC skyline
- **`manifest.json`** 168 → 183 presets. **`service-worker.js`** v32
  → v33.


## 2026-02-18 — Southern Category (149-168 + Moonshine Merge) 🥃

- User asked whether to call the moonshine batch "Moonshiners / Old
  South / Plantation Era" — recommended **"Southern"** (broader,
  avoids the historically-charged connotation of "Plantation Era",
  which typically means antebellum imagery not depicted here).
- Received a 5×4 (20 panel) ChatGPT grid. Detected layout: v-dividers
  305/613/921/1228, h-dividers 265/510/753.
- **Extracted all 20 panels** as presets 149-168:
  - Row 1: vintage-car dirt road, moonshiners with still, rustic cabin,
    moonshine truck night, bayou dock sunset
  - Row 2: general store, loaded moonshine truck, wooden rustic-country
    sign, porch group with dog, river-jug boat
  - Row 3: smoking cabin, moonshiners group by still, rustic cabin +
    car, moonshiners interior at table, "Slow Down" country sign
  - Row 4: steam train Whistle Stop, barrel truck, white country
    church at sunset, still + jugs distillery, rusty truck at cabin
- **Merged existing "Moonshine" (140-148) into "Southern"** — one chip
  for the whole vibe, easier to browse. Southern chip now shows **29**.
- **`manifest.json`** 148 → 168 presets. **`service-worker.js`** v31 →
  v32.


## 2026-02-18 — Presets 140-148 (Moonshine / Southern Americana) 🥃

- User sent a 4×3 grid of Southern-Americana / prohibition-era themes.
- **Flagged and skipped 3 IP-risky panels**: "Deliverance" movie still
  with title text burned in, Daisy Duke / General Lee (Dukes of
  Hazzard), and The Beverly Hillbillies title+cast. All would create
  Google-Play / App-Store rejection or takedown risk.
- **Extracted the 9 safe panels** via pixel-detected grid layout
  (v-dividers ~394/766/1144, h-dividers ~338/674):
  - **140** vintage cars on dirt road (Spanish moss)
  - **141** moonshiner with copper still + mason jar
  - **142** moonshine truck at night with barrels
  - **143** moonshine club drinking around table
  - **144** weathered general store with Coca-Cola sign + gas pumps
  - **145** sepia moonshiners group portrait with jugs
  - **146** B&W vintage car with clay-jug haul
  - **147** rusty forest truck loaded with moonshine barrels
  - **148** distillery interior with barrels + still
- **`manifest.json`** 139 → 148 presets. New category **Moonshine (9)**.
- **`service-worker.js`** v30 → v31.


## 2026-02-18 — Hunting/Fishing Upgrade (ChatGPT Extractions) 🎣

- User re-sent the same 3x3 hunting/fishing themes as a higher-quality
  ChatGPT-generated preview grid.
- Detected grid layout via pixel analysis: vertical dividers at
  x=511/1024, horizontal dividers at y=340/682. Each cell ~510×340.
- Extracted 9 panels, upscaled 1526px wide, center-cropped to 419 tall,
  re-saved as WebP quality 88 — replacing the Nano Banana versions of
  header-131 through header-139.
- Notable upgrades: 132 (deer with autumn tree stand + bokeh), 135
  (fly reel macro with rushing river background), 138 (marlin mid-leap
  with dramatic water splash).
- **`service-worker.js`** — v29 → v30.


## 2026-02-18 — Presets 131-139 (Hunting & Fishing) 🎣🏹

- User sent 2 preview grid screenshots. First grid (053-057, 059) held
  landscape themes that duplicate our existing 43-49 — **skipped**.
- Second grid (3x3) held 9 distinct hunting/fishing scenes. Generated
  each fresh with Nano Banana at native resolution (better than
  extracting panels from a downsized grid):
  - **131 Hunter Scouting** — camo hunter with binoculars on ridge
  - **132 Deer with Tree Stand** — buck at dawn autumn meadow
  - **133 Duck Hunter** — silhouette with waterfowl flock at sunset
  - **134 Fly Fisherman Mountains** — angler in mountain river
  - **135 Fly Gear Macro** — reel + rod + fly-lure box on mossy rock
  - **136 Fly Casting Sunset** — arced line at golden hour forest river
  - **137 Deep-Sea Boat** — rigged rods on boat at ocean sunset
  - **138 Marlin Leaping** — sport-fishing action, blue marlin airborne
  - **139 Angler Fighting Fish** — action shot bending rod on boat
- **`manifest.json`** — 130 → 139 presets. Category totals:
  Hunting **4** (66, 131-133), Fishing **7** (65, 134-139).
- **`service-worker.js`** — v28 → v29.


## 2026-02-18 — Presets 91-130 (Faith/Holiday/Culture Expansion) + Fixes 🎉

**40 new presets generated via Gemini Nano Banana**:
- **91-99 Faith**: Cross sunrise, mountain church, shepherd+lamb, calvary, bible+candle, stained-glass, praying hands, storm lighthouse, heaven's gates
- **100-103 Easter**: Sunrise cross+wildflowers, empty tomb, lilies+cross, decorated eggs
- **104-105 Faith**: Sea of Galilee, desert solitude
- **106-110 Christmas**: Nativity manger, tree+fireplace, snowy church, Santa's sleigh, ornaments+bokeh
- **111-115 Halloween**: Haunted mansion, jack-o'-lanterns, foggy graveyard, witch+cauldron, single carved pumpkin
- **116-120 NewYear**: Times Square, champagne toast, fireworks over skyline, midnight clock, rooftop party
- **121-125 Cinco de Mayo**: Fiesta spread, mariachi band, waving flag, food, papel picado banners
- **126-130 Lunar New Year**: Dragon dance, red lanterns, decorations, firecrackers, lion dance

**Fixes**:
- **header-56** — kept the user's higher-quality cathedral shot from earlier session
- **header-57 & header-91 restored** — user-uploaded artifacts on Aug 18 turned out to be 10-image *preview grids* (not individual images), which had briefly overwritten these two files. Regenerated both with Nano Banana: header-57 is now a stunning Yankee-style stadium panorama, header-91 is a wooden cross on a rocky mountain ridge at sunset.
- **`manifest.json`** — Now 130 presets across **31 categories** (was 15).
- **`service-worker.js`** — CACHE_NAME v27 → v28.
- **Cost**: ~$1.30 in EMERGENT_LLM_KEY credits total for this session (40 wishlist + 40 seasonal + 2 regens).
- **Verified**: `/dashboard/settings` renders 130 tiles + 32 chips; server manifest at 130.


## 2026-02-18 — Presets 65-74 (Genre Expansion via Nano Banana) 🎨

- Generated 10 more via `gemini-3.1-flash-image-preview` across the
  genres the user requested:
  - **65 Fishing** — solo fly fisherman on misty dawn lake
  - **66 Hunting** — bow hunter + dog silhouette on foggy ridge sunrise
  - **67 Country** — red barn + windmill + wheat field at golden hour
  - **68 Auto** — muscle car on winding canyon highway at sunset
  - **69 Auto** — weathered 1950s rusty pickup in prairie sunset
  - **70 Canyon** — Antelope-style slot canyon with light beam
  - **71 Camping** — glowing tent under Milky Way with campfire
  - **72 Underwater** — scuba diver photographing sea turtle on reef
  - **73 Robotics** — humanoid robot at high-tech workshop bench
  - **74 Space** — Earthrise over lunar surface (NASA-style)
- **`manifest.json`** grew 64 → 74. New categories: **Auto · Camping ·
  Canyon · Country · Fishing · Hunting · Robotics**. Full category
  count is now **21**.
- **`service-worker.js`** — CACHE_NAME v25 → v26.
- Cost: ~$0.30 in EMERGENT_LLM_KEY credits.


## 2026-02-18 — Presets 55-64 (Manhattan + Nano Banana Generated) 🎨

- **55 Manhattan Skyline** — user-supplied via `IronRabbit_Header_055_FINAL.zip`. Source was 800×500 content padded to 1600×500 with black; cropped center band to header aspect (3.64:1), resized, saved as WebP. Category: **Urban**.
- **56-64 generated via Gemini Nano Banana** (`gemini-3.1-flash-image-preview`) since ChatGPT's image gen was flaky for the user. Prompts crafted to lock single-scene panoramic composition. Cropped each result to 1526×419 header aspect.
  - 56 Cathedral · **Faith** · gothic interior with rose window
  - 57 Baseball Stadium · **Sports** · MLB night game panoramic
  - 58 Snowy Village · **Winter** · alpine chalets under starry mountain sky
  - 59 Coral Reef · **Underwater** · turtle + fish + sunbeams
  - 60 SpaceX Launch · **Space** · rocket at dusk with exhaust plume
  - 61 Hunting Cabin · **Nature** · Tetons behind log cabin & campfire
  - 62 Sci-Fi Alien City · **Sci-Fi** · glowing spires under ringed planet
  - 63 Trades Workshop · **Trades** · rustic craftsman shop w/ US flag
  - 64 Milky Way · **Sky** · Delicate Arch under galactic band
- **`manifest.json`** grew 55 → 64 presets. Category count doubled from 7 → **15**: Sunset 16 · Nature 14 · Water 8 · Wildlife 8 · Sky 7 · Patriotic 3 · **Faith 1 · Sci-Fi 1 · Space 1 · Sports 1 · Trades 1 · Underwater 1 · Urban 1 · Winter 1**.
- **`service-worker.js`** — CACHE_NAME v23 → v25.
- **`/tmp/gen_headers.py`** — Reusable generator script if user wants more.
- Verified at `/dashboard/settings`: 64 tiles render, 15 chips display correct counts.


## 2026-02-18 — Presets 51-54 (Partial Batch, 6 Held for Re-Export) ✅

- Received `IronRabbit_Headers_51-60_Verified.zip` — 10 files. After
  individual pixel-level review, only 4 were fully clean.
- **Shipped (4)** — renumbered to sequential ids so no gaps:
  - `header-51.webp` ← 051.jpg (mountain-lake sunset, **Sunset**)
  - `header-52.webp` ← 052.jpg (palm-beach sunset, **Sunset**)
  - `header-53.webp` ← 058.jpg (lake pier at sunset, **Sunset**)
  - `header-54.webp` ← 060.jpg (aurora borealis, **Sky**)
- **Held for re-export (6)** — visible top-edge composite bleed:
  053, 054, 055, 056 (clear fragments), 057, 059 (small
  top-left-corner artifacts).
- **`manifest.json`** — 50 → 54 presets. Categories now: **Sunset 16 ·
  Nature 13 · Water 8 · Wildlife 8 · Sky 6 · Patriotic 3**.
- **`service-worker.js`** — CACHE_NAME v22 → v23.
- Verified `/dashboard/settings`: 54 tiles, `header-51.webp` &
  `header-54.webp` both present, all chip counts correct.


## 2026-02-18 — Presets 41-50 (True Single-Scene Landscapes) ✅

- Received `IronRabbit_Headers_41-50_Fresh.zip` — 10 legitimate
  single-scene landscape images at 1600×500. Opened **each file
  individually** in the viewer (per new process) to verify: no
  composites, no dividers, no burned-in labels.
- **`public/header-presets/`** — Added 10 new WebPs (41-50) resized
  from 1600×500 → 1526×419 (match existing 1-40 dimensions),
  quality 82, method 6. File sizes 27-60 KB each.
- Content: mountain-lake sunset (41), tropical beach (42), alpine
  reflection (43), Tuscan hills (44), coastal cliffs (45), forest
  waterfall (46), Monument Valley (47), pier at pink sunset (48),
  lavender field (49), aurora borealis (50).
- **`manifest.json`** — 40 → 50 presets. Category counts refreshed:
  **Nature 13 · Sunset 13 · Water 8 · Wildlife 8 · Sky 5 · Patriotic 3**
  (was Sunset 7 / Water 5 / Sky 4).
- **`service-worker.js`** — CACHE_NAME v21 → v22 so devices grab the
  new manifest + assets; network-first rule for `/header-presets/*`
  from yesterday keeps refresh instant.
- Verified at `/dashboard/settings`: 50 preview tiles, chip row shows
  updated counts, "Sunset" chip filters to exactly 13 tiles.


## 2026-02-17 — Root Cause: SW Cached Deleted Presets 🔧

- Server-side had **zero** files above id 40 — verified via direct
  curl against the preview URL. Files were fully deleted last cycle.
  Users still saw them because the service worker's **cache-first
  rule with no revalidation** was serving deleted webp files from
  `iron-rabbit-runtime-v14` forever.
- **`service-worker.js`** — Bumped RUNTIME cache **v14 → v15** so
  every device flushes the stale preset webp files on next SW
  activation. Also added a dedicated **network-first** rule for
  `/header-presets/*` so future preset add/remove/rename operations
  propagate immediately instead of relying on a cache-version bump.
- After the update, hard-refreshing (or reinstalling the PWA) will
  show only the 40 clean presets, no ghost tiles.


## 2026-02-17 — Reverted 41-56 (Contact-Sheet Composites Again) 🔄

- The "hi-res" 41-56 batch turned out to be **2×2 / 3-panel contact
  sheets with number labels burned in** (same problem as the deleted
  41-130 set before). Agent's earlier grid inspection missed it —
  apology issued.
- **Deleted** all 90 leftover `.webp` files with id ≥ 41 from
  `/app/frontend/public/header-presets/` (8 from this batch + 82 old
  broken files still lying around from the 41-130 mess).
- **`manifest.json`** — Reverted presets 41-48; regenerated categories
  from the remaining 40 entries. Back to: **All 40 · Nature 13 ·
  Wildlife 8 · Sunset 7 · Water 5 · Sky 4 · Patriotic 3**.
- **`service-worker.js`** — CACHE_NAME v20 → v21 so devices flush the
  removed assets.
- Verified `/dashboard/settings`: chip row shows the original 7 chips;
  grid renders exactly 40 clean single-scene tiles.


## 2026-02-17 — Category Filter Chips ✅

- **`header-presets/manifest.json`** — Regenerated the top-level
  `categories` array (was stale and missing Trades/Tech). Now derived
  from the actual presets and sorted by count desc: **All (48) · Nature
  (13) · Wildlife (8) · Sunset (7) · Trades (7) · Water (5) · Sky (4) ·
  Patriotic (3) · Tech (1)**. The Home Header picker
  (`HeaderPresetPicker.jsx`) already had chip UI wired to
  `manifest.categories` — it now shows all 9 chips automatically.
- **`dashboard/pages/DashboardSettings.jsx`** — Added a chip row above
  the background grid. State: `activeCat` (default "All"). Chips are
  computed at render time from loaded presets so any future category
  additions surface automatically. Chip taps filter the grid; the empty
  state distinguishes between "no favorites" and "no presets in this
  category". Test IDs: `dash-settings-bg-chips`,
  `dash-settings-bg-chip-<lowercase>`.
- **`service-worker.js`** — CACHE_NAME v19 → v20 so devices refetch the
  updated manifest.
- Verified: Dashboard Settings renders 9 chips; tapping "Trades" filters
  the grid to exactly 7 tiles with zero console errors.


## 2026-02-17 — Shared Preset Pool & Trades/Tech Backgrounds ✅

- **`dashboard/DashboardLayout.jsx` + `pages/DashboardSettings.jsx`** —
  Dashboard now reads `/header-presets/manifest.json` (shared with the
  Home header picker) instead of the separate `/dash-backgrounds/` pool.
  Both surfaces now render the same 48 backgrounds. Fixes the "Weather
  app only shows 10 presets" bug.
- **`dashboard/state/dashboardStore.js`** — Added `migrateBgUrl()` in
  `loadSettings()` so existing users with stored
  `background_preset: "/dash-backgrounds/header-002.webp"` (3-digit) get
  transparently rewritten to `/header-presets/header-02.webp` (2-digit)
  on next hydrate. Same migration applies to the `favorites[]` array.
- **`public/header-presets/`** — Added 8 new WebP presets (41-48) at
  1526×419 with the "Trades & Tech" theme: excavator, tools+blueprint,
  laptop+city, welding, gears, blueprints, linemen at sunset, HVAC.
- **`manifest.json`** — Grew from 40 → 48 entries. New categories:
  **Trades** (7) and **Tech** (1). Full breakdown: Nature 13, Wildlife
  8, Sunset 7, Trades 7, Water 5, Sky 4, Patriotic 3, Tech 1.
- **`service-worker.js`** — CACHE_NAME bumped v17 → v18 → v19 so
  devices pull the new manifest + webp assets on next open.
- Verified: `/dashboard/settings` now renders 48 preview tiles (was 10)
  with both `header-41.webp` and `header-48.webp` in the pool.


## 2026-02-17 — Smart Cleanup Streak Nudge ✅

- **`utils/cleanupStreak.js`** — New pure-JS helper. `currentWeekKey()`
  emits ISO-week keys ("2026-W07"), `appendCurrentWeek(history)` adds
  the current week (deduped, capped at 26 weeks), and
  `computeStreak(history)` returns the count of consecutive weeks
  ending at the current or previous week.
- **`notes/StorageCleanupModal.jsx`** — After a successful Smart
  Cleanup delete, appends the current ISO-week to
  `settings.cleanup_history` and writes the computed `streak` into
  `settings.last_cleanup.streak`.
- **`notes/SettingsModal.jsx`** — When `streak >= 2` the recap card
  now shows a small orange pill "🔥 N-week streak" (lucide `Flame`).
- Verified end-to-end via IndexedDB injection: 3-week streak renders
  the pill correctly.


## 2026-02-17 — Smart Cleanup Recap Card ✅

- **`notes/StorageCleanupModal.jsx`** — After a successful Smart Cleanup
  delete, persists `settings.last_cleanup = { freed_bytes, files_count,
  at, dismissed_at }`. If the user taps Undo within the 10-second
  window, the recap is cleared so we don't claim savings that were
  reversed.
- **`notes/SettingsModal.jsx`** — When `last_cleanup.at` is within 24h
  and not dismissed, a small emerald *"Freed X MB · Y files today"*
  card renders at the top of Settings. Dismiss "×" persists to
  `dismissed_at` so it stays hidden. Test IDs
  `settings-cleanup-recap` and `settings-cleanup-recap-dismiss`.
- Verified end-to-end via IndexedDB injection + reload: recap card
  renders with correct copy, no console errors.


## 2026-02-17 — Smart Cleanup Undo Toast ✅

- **`storage/storageService.js`** — Added `restoreAttachments(snapshots, { saveNote })`. Re-writes blobs directly to `filesStore` (bypasses MIME/size validators for a restore) and re-attaches to each host note using the note's freshly-read state so concurrent edits during the undo window aren't clobbered.
- **`notes/StorageCleanupModal.jsx`** — `removeSelected()` now captures a `{ id, blob, meta, hostAttachments }` snapshot for every selected id BEFORE deletion. After deletion the success toast carries a 10-second **Undo** action that re-writes blobs and re-attaches them to their original notes, then refreshes.
- Confirm-dialog copy updated from *"This can't be undone"* to *"You'll have 10 seconds to Undo."*


## 2026-02-17 — Smart Cleanup Dry-Run Preview ✅

- **`notes/StorageCleanupModal.jsx`** — Inside the Smart Cleanup banner
  the "done" state now includes a horizontal thumbnail strip titled
  *"What will be removed — tap to keep"*. Each tile shows the image
  preview (or a file/image icon), a `BIG`/`DUPE` corner tag, and the
  size overlay. Tapping any tile deselects it (keeps that file) and the
  banner's header count + "Free X MB" button update live from
  `totals.selectedBytes`.
- `smartSummary` now carries `largestIds` and `dupeIds` arrays so the
  strip can label each tile without recomputing.


## 2026-02-17 — Smart Cleanup Nudge (Settings Storage Row) ✅

- **`notes/SettingsModal.jsx`** — When device storage ≥ 90%, the Storage
  row now shows a red "N% full" badge next to the label and a prominent
  emerald **"Smart Cleanup — free space now"** button above the regular
  "Free up space" button. Users can trigger Smart Cleanup even after
  dismissing the toast.
- **`notes/AppModals.jsx`** — Wires the new `onOpenSmartCleanup` prop to
  the existing `storageCleanupSmart` + `storageCleanupOpen` state.


## 2026-02-17 — Auto-Cleanup Suggestion (90% Storage) ✅

- **`storage/storageWarnings.js`** — Added a 90% "Smart Cleanup" toast tier
  between the existing 80% warning and 92% critical toasts. Toast carries
  an action button that opens the Storage Cleanup Wizard in pre-selected
  mode. Critical (92%) toast now also carries the same action. New
  `registerSmartCleanupHandler(fn)` API decouples the toast from React.
- **`NotesApp.jsx`** — Registers the smart-cleanup handler on mount;
  handler opens the cleanup modal with `smartPreselect=true`.
- **`notes/StorageCleanupModal.jsx`** — New `smartPreselect` prop. On open
  it perceptually hashes all images, picks the top-3 duplicate groups
  keeping the OLDEST copy in each, and merges those extras with the
  top-5 largest attachments overall into one selection. A green banner
  shows "Free X MB" with a one-tap Confirm button (final delete confirm
  is unchanged).
- **`notes/AppModals.jsx`** — Threads the new smart flag through and
  resets it on close.


# Iron Rabbit Changelog


## 2026-02-14 (part 8) — Icon + Screenshots + Play Docs + Security Audit

### Delivered in this pass
1. **iOS app icon** — composited existing brand foreground + background
   into an opaque 1024×1024 (Iron Rabbit's exact Android look, corners
   filled with brand indigo). Generated all iOS icon sizes via
   `npx capacitor-assets generate --ios` (installed as devDep). Files
   land in `frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/`.
2. **iPhone 6.7" screenshots** — captured at exact `1290×2796` via new
   Playwright script. Saved to
   `frontend/public/screenshots/ios/iphone-6.7/`.
3. **iPad Pro 12.9" screenshots** — captured at exact `2048×2732`.
   Saved to `frontend/public/screenshots/ios/ipad-12.9/`.
4. **Screenshot-mode URL flag** — new
   `frontend/src/utils/screenshotMode.js` reads `?screenshot=1`
   (or `?ss=1`). Wired into `QuickGuideButton` auto-open and NotesApp's
   `ThemeChooserModal` + `QuickAccessModal` auto-open effects. When the
   flag is set, all three suppress themselves for clean captures.
   `capture_ios_screenshots.py` uses the flag by default.
5. **`memory/PLAY_STORE_METADATA.md`** — mirror of the iOS metadata:
   app name, short + full descriptions (4000 chars), category, tags,
   contact, privacy-policy hosting note, graphics table, data-safety
   answers, content rating notes, target audience, "no ads / no IAP"
   answers, release-management recommendations.
6. **`memory/PLAY_CONSOLE_CHECKLIST.md`** — 6-step checkbox playbook:
   pre-console prep → create app → store listing → app content
   declarations → internal testing → production rollout (10 % → 50 %
   → 100 %). Includes common rejection reasons + fixes.
7. **Security audit on the production build** —
   - `/app/frontend/build` grepped for every secret pattern in
     `SECURITY_POLICY §3.3`: **zero hits**
   - `/app/frontend/ios` grepped: **zero hits**
   - `capacitor.config.ts` grepped: **zero hits**
   - Live values from `backend/.env` (ADMIN_TOKEN) do NOT appear in the
     web bundle — verified by literal-value substring match
   - `RESEND_API_KEY` and `SLACK_WEBHOOK_URL` are unset per Owner's
     v1.0 launch decision — nothing to leak
   - Only string mentions of env-var NAMES appear (as UI labels like
     "RESEND_API_KEY missing") — safe, not leaked values
   - Note (informational, not a policy violation): CRA source maps
     (`main.*.js.map`) ship by default. To strip, set
     `GENERATE_SOURCEMAP=false` in `frontend/.env` and rebuild

### Preservation compliance
- No UI change, no color change, no layout change, no functional change
- Android setup untouched (still no `frontend/android/` folder — same
  as before)
- No third-party integrations activated
- No credentials of the owner embedded in any surface



## 2026-02-14 (part 7) — iOS Platform Prep (Option E — Emergent-executed)

### Prepared inside this container
- **iOS platform added** via `npx cap add ios` (Capacitor 7)
- **`frontend/capacitor.config.ts`** — `appId` set to `com.ironrabbit.app`
  as requested; Android will inherit this on next `cap add android`
- **`frontend/ios/App/App.xcworkspace`** — full Xcode project generated
  (`.xcodeproj`, `.pbxproj`, `Podfile`, `AppDelegate.swift`, storyboards)
- **Bundle Identifier** confirmed `com.ironrabbit.app` in both Debug +
  Release build configs of `project.pbxproj`
- **`TARGETED_DEVICE_FAMILY = "1,2"`** — both iPhone and iPad enabled
- **`frontend/ios/App/App/Info.plist`** — Iron Rabbit permission strings
  added in plain English (camera, photo library, photo-add, Face ID);
  `NSUserActivityTypes` for future deep-link support
- **`frontend/assets/`** — source PNGs prepared for later asset
  generation: `splash.png` (2732², opaque, from existing 2048² brand
  splash upscaled with LANCZOS), `splash-dark.png` (same source),
  `icon-foreground.png` (1024², existing brand foreground upscaled),
  `icon-background.png` (1024², existing brand indigo bg upscaled)
- Owner declined auto-generation of icons (Option D). Default
  Capacitor placeholders remain; a two-command handoff is documented in
  `memory/IOS_BUILD_GUIDE.md` for the owner to run when a final opaque
  1024×1024 is ready

### New documentation
- **`memory/IOS_BUILD_GUIDE.md`** — compact 6-step build & submit guide
  (Prereqs, Xcode setup, on-device test, TestFlight, App Store review,
  troubleshooting cheatsheet, "what Emergent already did" recap)
- **`memory/APP_STORE_METADATA.md`** — fill-in template with pre-written
  copy for every App Store Connect field (name, subtitle, description,
  keywords, privacy answers matching the Security Policy, screenshot
  spec, review notes, phased-release recommendation)

### Security audit
- Grepped `/app/frontend/ios` for every secret pattern in
  `SECURITY_POLICY §3.3` — **zero hits**
- Bundle ID matches owner's request exactly; no personal Apple ID,
  Google credential, Resend key, admin token, or Slack secret embedded
- `Info.plist` contains only permission descriptions, no identifiers

### What the owner still needs (unavoidable Apple side)
1. Apple Developer Program membership ($99/yr)
2. macOS + Xcode 15.3+
3. Open workspace, pick their Team, hit Run
4. Archive → upload to TestFlight → submit for review

### Not done in this pass (deferred)
- App icons — owner opted D (hold off); placeholder in place
- Splash finalize — bundled inside the same `npx @capacitor/assets`
  command that will run when icons are ready
- Google Drive / Resend integrations — locked behind explicit approval
  per `SECURITY_POLICY.md`



## 2026-02-14 (part 6) — FullScreen toolbar palette unified

- All top-toolbar icons in `FullScreenNote` (Translate, Share, More,
  Delete, Display Controls, Close) now use `text-yellow-500` in dark mode
  — matching the alarm bell in the footer (`#eab308`, warm amber-orange)
- Hover states: `text-yellow-400` (a brighter tick), except Delete which
  keeps `hover:text-red-400` to preserve the destructive-action signal
- DisplayControlsButton `!seen` orange badge treatment still wins over the
  yellow default so the NEW attention state remains distinguishable


## 2026-02-14 (part 5) — Brightness sliders: full paint pipeline hardened

### Additional bugs reported
- **Home page**: sliders slid but changed NOTHING (no bg, no text repaint)
- **Quick Edit**: bg went black → *white* (should be black → transparent)
- **Full Screen text**: still didn't repaint even after direct inline color

### Root causes
1. Home `<main>` had no `background` style — only set the `color` inheritance
2. Home + Quick Edit relied on CSS `var(--ir-*)` indirection, which was
   sometimes ignored by the third-party `TextareaAutosize`
3. iOS/Android WebViews and some mobile Chrome builds ignore `color` on
   `<textarea>` in favor of `-webkit-text-fill-color`, which was never set

### Fix
- **`NotesApp.jsx`** — `<main>` now applies `background` + `color` as
  directly computed inline values (`brightnessToBg` / `brightnessToText`)
- **`NoteModal.jsx`** — same treatment on the Quick Edit textarea; added
  `useRef` + `useLayoutEffect` that runs on every `uiBrightness.text`
  change and imperatively sets both `color` and `-webkit-text-fill-color`
  with `!important`
- **`FullScreenNote.jsx`** — identical ref-based force-paint added

### Verification
- Bundle contains 10 `-webkit-text-fill-color` references (confirmed
  deployed)
- Lint clean on all touched files (pre-existing warnings only)
- Color math still verified: text(0)=black, text(1)=white, bg(0)=solid
  black, bg(1)=fully transparent


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
