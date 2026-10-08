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

## 🔒 FROZEN — Text Tools (Module 1) Baseline
**Checkpoint:** Service worker `v197 / v84` (2026-02-28).
**Status:** Confirmed working on Android Preview (user-verified).
**Scope of freeze — DO NOT modify without an explicit, named request from the user:**
- H1 / H2 / H3
- Bold / Italic / Underline / Strikethrough
- Formatting active-state highlighting
- Format-first typing behaviour (ZWSP-anchor mechanism)
- Format-switch sibling-emergence logic
- Caret / selection handling
- Editor focus handling
- Toolbar layout, scrolling, orientation, drag behaviour

**Deferred (do NOT fix while addressing other work):**
- "Write…" placeholder visible in editor area — separate future bug. Must not touch Text Tools when fixing.

## What's Been Implemented
See `/app/memory/CHANGELOG.md` for the full timeline.

### Feb 2026 Session (latest first)
- **Module 1 — Highlighter (text background color) (2026-02-28, v207/v94)**:
  Wired the existing Highlighter toolbar icon. Opens a floating palette panel
  (same portal + overlay + touch-isolation pattern as the Aa panel) with 16
  translucent background colors + "No highlight" + "Clear highlight". Uses
  the SAME per-span format-first mechanism as Aa Color: wraps selection in
  `<span class="ir-hl-X">...</span>` for non-collapsed selections, or inserts
  a pending `<span class="ir-pending-inline ir-hl-X">` at the caret for
  format-first-then-type. New `applyHighlight` helper + `readActiveHighlight`
  for the toolbar active-state ring. Translucent (rgba 0.35-0.55) so text on
  top stays readable at every brightness setting. Independent of Aa Size, Aa
  Color, B/I/U/S — all four axes can stack on the same text run. Sanitiser
  needed zero changes (`<span>` + `class` already on the allowlist).
- **Module 1 — Line-height proportional + defensive inline inheritance
  (2026-02-28, v206/v93)**: The editor was inheriting Tailwind `text-sm`'s
  fixed `line-height: 1.25rem` (20px). At Aa Size XL (21px) lines collided;
  at SM (11.9px) they had awkward gaps. Fix was CSS-only:
  1. Added `line-height: 1.5` (unitless) to `.fs-content-editable` and
     `.fs-content-editable p` so lines scale with the current font-size.
  2. Added defensive `font-size: inherit; line-height: inherit` on
     `strong,b,em,i,u,s,strike,del` so no future utility can secretly
     resize an inline format.
  No JS touched; frozen Text Tools, Aa panel, drag handle, viewport anchor,
  active-ring — all left as-is.
- **Module 1 — Aa drag coord fix + document-level typography scaling
  (2026-02-28, v205/v92)**:
  1. **Drag coord**: previous drag used `getBoundingClientRect()` (visual
     coords) while writing CSS `top/left` (layout coords), so with any
     non-zero `vvOffset` the panel drifted away from the finger. Rewrote the
     drag math in visual space: capture visual-rect at drag start, compute
     new visual position from finger delta, clamp in visual space, convert
     back to layout coords by subtracting `vvOffset`. Verified: finger moves
     -180px → panel + handle both move -180px, 0px drift. Also lowered the
     restrictive upper boundary from ~48px to 2px so the panel can travel
     almost to the top of the visible viewport.
  2. **Typography scaling**: Aa Size now sets the EDITOR ROOT's font-size via
     a class on `.fs-content-editable` (not inline spans). Headings use
     `em`-based CSS (`H1 1.5em / H2 1.3em / H3 1.15em`), so the whole
     typographic hierarchy scales as ONE coherent system. Verified: ratios
     H1/P, H2/P, H3/P stay at 1.50 / 1.30 / 1.15 for Small, Normal, Large,
     and Extra Large — the hierarchy is preserved exactly across sizes.
     Legacy per-span `ir-size-*` CSS kept for backward compat with saved
     notes. Clear-format now also strips the root size class.
- **Module 1 — Aa viewport anchor + active ring + height reduction + Clear-format
  (2026-02-28, v204/v91)**: Four surgical fixes on top of the Aa panel:
  1. Panel is now truly viewport-anchored. Dropped the resize-based re-compute
     (which was using a stale `anchor` DOMRect and dragging the panel when the
     Android keyboard opened). Added a `visualViewport` scroll/resize listener
     that paints a `translate3d` correction on the panel, defeating any
     ancestor-transform or inner-editor-scroll that would otherwise break
     `position: fixed`. Verified: typing 40+ extra paragraphs and scrolling the
     editor leaves the panel at the same viewport coordinates.
  2. Aa toolbar button now lights up with the same orange ring the frozen
     B/I/U/S/P/H1/H2/H3 tools use. Driven by a new `active.aa` flag read from
     the caret's ancestor `<span>` classes (`ir-size-*` / `ir-color-*`).
     Independent of the P/block active state as spec'd.
  3. Panel padding/gaps tightened for ~20% shorter height while keeping all
     chips comfortably tappable.
  4. "Clear formatting" now ALSO strips the Aa appearance classes from the
     caret's ancestor `<span>` — `execCommand("removeFormat")` ignores custom
     classes, so Aa stayed lit after Clear. Now Aa de-activates correctly.
- **Module 1 — Aa size/color independence fix (2026-02-28, v202/v89)**: When
  the browser cloned a pending `<span>` on Enter, the cloned span carried the
  previous line's axis class (e.g. `ir-size-xl`) into the new paragraph. A
  single-axis tap in the new line therefore stacked silently with the stale
  class. Added `ownedSpanRef` to the Aa panel — it points to the pending
  span the current panel session has already touched. `applyAppearanceChange`
  now accepts that ref and resets BOTH axes on an unowned empty-pending span
  before applying the picked class (treating Enter-clones as orphans), while
  preserving the stacking case for genuine same-session multi-axis picks.
  Verified via the full test matrix (size-only, color-only, size+color,
  change-size, change-color) — each line now carries ONLY the classes the
  user explicitly chose.
- **Module 1 — Aa panel drag handle (2026-02-28, v201/v88)**: Added a dedicated
  "Move" handle at the top of the Aa panel so users can reposition the overlay
  when it covers the text they're typing. The handle uses pointer-capture +
  clamp-to-viewport so the finger can slide off and the panel can never be
  dragged completely off-screen. Size chips and color swatches remain plain
  tap targets — only the handle initiates a drag. A module-scoped
  `aaLastUserPos` persists the dragged location for the rest of the editor
  session so re-opening Aa doesn't snap the panel back over the user's text.
  Editor + toolbar don't move during the drag (verified via coordinate
  snapshots). Works in both horizontal and vertical toolbar orientations.
- **Module 1 — Aa color visual fix (2026-02-28, v200/v87)**: Text color was
  being written to the DOM correctly but rendering as grey because the editor
  inherits `-webkit-text-fill-color` (from a brightness-scope ancestor), which
  overrides plain `color` in WebKit/Blink. Added matching
  `-webkit-text-fill-color` to all 16 `.ir-color-*` classes. CSS-only change,
  no JS touched. Paragraph (P) + Color + Size now coexist as expected.
- **Module 1 — Aa touch-through fix (2026-02-28, v199/v86)**: Wrapped the Aa
  panel + backdrop into a single full-viewport `.ir-aa-overlay` layer that
  owns ALL hit-testing while open. Added `pointer-events: auto` +
  `touch-action: manipulation` to the wrap and every chip/swatch/button, and
  `stopPropagation` on pointer/mouse/touch/click handlers. Verified via
  `document.elementFromPoint` at the center of every control — all resolve
  to the Aa chip, zero tunnel to underlying UI (editor, tile-accent colors,
  modal body, categories). Visual design unchanged.
- **Module 1 — Aa Text Appearance dropdown (2026-02-28, v198/v85)**: Added a
  floating smoked-glass dropdown anchored to the Aa toolbar button. Contains:
  size chips (Small/Normal/Large/Extra Large → `0.85em/1em/1.25em/1.5em`),
  a 16-swatch color palette, and a Clear-Format button. Rendered via
  `createPortal` to `document.body` at `z-index: 2147483646` — pure overlay,
  does NOT shift the toolbar or editor. Flips above/left when clipped.
  Reuses the existing ZWSP + pending-marker + caret-target mechanism, with a
  new `promoteTextareaWithAppearance` helper for the textarea → contentEditable
  promotion. Size/color stack across axes; within an axis the current class is
  swapped (empty pending → mutate in-place, committed → emerge to sibling).
  Sanitiser gained `<span>` on the ALLOWED_TAGS list (class-only). Removed the
  obsolete standalone `color` toolbar stub (now inside Aa); kept `highlight`
  stub for future extension. Frozen Text Tools (H1/H2/H3/B/I/U/S) **not
  touched** — verified via regression typing in the preview.
- **Module 1 — Format-first state transition (2026-02-28, v197/v84)**: When caret
  is inside an inline-format ancestor (B/I/U/S, pending or committed) and user
  taps a different inline format, the new format now becomes a SIBLING of the
  previous one (not a nested child). Empty pending ancestors dissolve; committed
  ancestors are preserved and the caret emerges just after them. Also cleans up
  stale empty-pending descendants left behind by earlier taps. Fix in
  `FloatingRichTextToolbar.jsx` at the inline-collapsed-caret branch (~L1565).
  H1/H2/H3 untouched. Existing-text selection path untouched (collapsed-only).

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
- **Edit Text toolbar repair — Fixes A + B** (2026-10-02, v185): Fix A — added `onPointerDown={(e)=>e.preventDefault()}` to rotate + all tool buttons (keeps `onMouseDown`) so Android `touchstart` can't steal selection focus before mousedown fires. Fix B — `promoteTextareaWithInlineFormat` / `promoteTextareaWithBlockFormat` now stamp a `class="ir-caret-target"` on the newly-wrapped tag and return a selection-restoration mode (`"range"` | `"collapsed-end"`); `focusHtmlEditorSoon(mode)` restores selection after the textarea→HTML mount swap, so H1 → H2 → H3 chaining and consecutive inline formats stop misfiring. HistoryStack, checklist delegation, portal/Radix guard, direct-DOM strikethrough, manual scroll — all untouched. Cache bumped `v184/v71` → `v185/v72`.
- **Edit Text toolbar — Fix C (active-state highlighting)** (2026-10-02, v186): added `active` state + `refreshActive()` ancestor walk (ported verbatim from `FormatFloatingToolbar`) + document-level `selectionchange` / `focusin` / `input` listeners while open + `isToolActive(id)` lookup + highlight ring class on tool buttons + `data-active` attribute for testing. Bold/Italic/Underline/Strike/P/H1/H2/H3/Link buttons light up when the caret is inside that format. `FormatFloatingToolbar` left completely untouched. Cache bumped `v185/v72` → `v186/v73`.
- **Edit Text toolbar — Fix D (format-first-then-type)** (2026-10-02, v187): `promoteTextareaWithInlineFormat` with collapsed caret now emits a ZWSP-anchored `<b class="ir-caret-target">` marker and returns `"pending-inline:<format>"`; `focusHtmlEditorSoon` strips the marker and fires `document.execCommand(format)` so pending-state activates and the next keystroke inherits bold/italic/underline. `promoteTextareaWithBlockFormat` with empty line emits `<h#>ZWSP</h#>` and returns `"block-empty"`; `focusHtmlEditorSoon` strips ZWSP, seeds a `<br>` placeholder, places caret inside. Added `dissolveInlineCaretMarker` + `cleanupCaretMarker` helpers. Existing select-first path (`"range"` / `"collapsed-end"` modes) preserved. Cache bumped `v186/v73` → `v187/v74`.
- **Edit Text toolbar — Fix E (inline command reliability on Android)** (2026-10-02, v188): root cause was `editor.focus()` inside `runExecCommand` + `wrapSelectionWithTag` collapsing an already-focused contentEditable's selection to offset 0 on Android Chrome. H1/H2/H3 was immune (operates on containing block, not range) which is why only Bold/Italic/Underline/Strike felt skittish. E.1 — both helpers now only call `.focus()` when `document.activeElement !== editor`. E.2 — added `SELECTION_STASH` module-level ref with `stashSelection()` (called on every tool button `onPointerDown` + `onMouseDown`) and `restoreStashedSelectionIfNeeded()` (called at the top of `applyFormat`'s contentEditable branch). Textarea branch restores `selectionStart`/`selectionEnd` from the stash too. Verified via Playwright single-tap on Bold / Italic / Underline / Strike / H1 across a cold `<textarea>`, all applied on the first tap and highlighted correctly. Cache bumped `v187/v74` → `v188/v75`.
  - Edit Text FloatingRichTextToolbar is now considered the **finished reference implementation** per user's directive — Expanded Text parity work is next in the sequence and intentionally deferred.
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
