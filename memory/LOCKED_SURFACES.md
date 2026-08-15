# 🔒 LOCKED SURFACES — Do Not Touch Without Password

**Owner:** Iron Rabbit user
**Locked on:** 2026-02-15
**Password to unlock:** `2020`

Any agent (main agent, subagents, code review, testing, security audit, refactor,
deployment) MUST NOT modify the code paths listed below unless the user has
provided the password `2020` **in the current message**. If the password is not
present, refuse the change and ask the user to authorize with the password.

This lock supersedes any general "improvement", refactor suggestion, lint fix,
formatter run, dedupe pass, or auto-cleanup. Deletion, renaming, refactoring,
"tidying", or moving these files/blocks also counts as a modification.

---

## What is locked

The user has verified in **Star Mode (Dark Theme)** that the following work
perfectly:

### A. Expanded Text (FullScreenNote) — List View + Grid View
1. **Brightness Sliders** — text slider and background slider behaviour
2. **Per-note Persistence** — `note.ui_brightness` save/restore round-trip
3. **Background Opacity** — BG=0% → solid black, BG=100% → fully transparent
   (page beneath shows through)
4. **Text Color Painting** — Text slider linearly maps 0..1 to
   black..white and paints without cascade issues

### B. Quick Edit (NoteModal) — List View + Grid View
5. **Text Slider** — text lightens to bright white / darkens to black
6. **Background Slider** — text content area only, 100% opaque black → 0%
   opacity (clear). Uses a light underlay to make transparency visible.
7. **Persistence (Auto-save)** — dragging sliders on an existing note
   silently saves `ui_brightness` via `onSaveInline` (debounced 250 ms).
   Survives Cancel/close. New-note flow still uses the normal Save path.
8. **All existing CSS / layout / other form fields / top bar buttons** of
   the Quick Edit dialog — the user may adjust the top bar later, but the
   sliders, content textarea styling, and their auto-save wiring are locked.

## Locked files & regions

### 1. `/app/frontend/src/notes/BrightnessSliders.jsx`
- `brightnessToText(v)` — the linear grayscale mapping (lines ~29–33)
- `brightnessToBg(v)` — the linear alpha mapping (lines ~35–40)
- `DEFAULT_TEXT = 0.7`, `DEFAULT_BG = 0.3`
- Slider markup, double-tap reset behaviour, and reset button

### 2. `/app/frontend/src/notes/FullScreenNote.jsx`
- The **backdrop overlay** `<div data-testid="fullscreen-backdrop">` and its
  `style={{ background: brightnessToBg(...) }}` — this is what makes the BG
  slider actually change opacity.
- The **card container** style block — deliberately does NOT paint its own
  black layer (that was the bug we just fixed).
- The **textarea colour-forcing** `useLayoutEffect` that sets `color` and
  `-webkit-text-fill-color` with `!important` via ref.
- The `noteBrightness` state initialisation from `note.ui_brightness`.
- **Brightness restore is keyed on `note?.id` ONLY.** Do NOT re-add
  `note?.updated_at` to its dependency array — that caused the mid-drag
  reset bug where the slider snapped back to the last-saved value while
  the user was still dragging (fixed with password `2020` on 2026-02-15).
- The `handleBrightnessChange` wrapper that flags the note dirty and lets the
  debounced auto-save fold `ui_brightness` back into the note.
- The auto-save `useEffect` that includes `ui_brightness: noteBrightness` in
  the patch sent to `onSaveInline`.
- The note-change `useEffect` that restores `noteBrightness` from
  `note.ui_brightness` on note switch.

### 2b. `/app/frontend/src/notes/NoteModal.jsx` (Quick Edit)
- The **content textarea + light underlay** block (`<div className="relative
  rounded-md overflow-hidden">` wrapping the underlay div + `TextareaAutosize`
  with `data-testid="note-content-input"`). The underlay is what makes BG=100%
  visibly clear on the dark modal card.
- The **textarea colour-forcing** `useLayoutEffect` that sets `color` +
  `-webkit-text-fill-color` with `!important` on the ref.
- The **`brightnessAutoSaveRef` + debounced auto-save `useEffect`** that
  fires `onSaveInline(id, { ui_brightness })` on slider drag for existing
  notes only. Do not remove the dirty-flag gating or the initial-mount skip.
- The `noteBrightness` state initialisation from `note.ui_brightness` and
  the note-change `useEffect` at ~line 95 that restores it on note switch.
- The `ui_brightness: noteBrightness` field inside `handleSave`'s payload.
- The `onSaveInline` prop passed from `AppModals.jsx` (`p.handleSaveInline`).

### 3. `/app/frontend/src/NotesApp.jsx`
- `handleSaveInline(noteId, patch)` — the passthrough that merges
  `ui_brightness` into the existing note without stripping it.
- `handleSaveNote(noteData, noteId)` — the create/update path that preserves
  `ui_brightness` in the enriched note.
- `handleBrightnessChange(next)` — the global settings-brightness setter used
  as the fallback for new notes.

### 4. `/app/frontend/src/storage/storageService.js`
- `saveNote(note)` — the passthrough that stores the whole note object
  (including `ui_brightness`) as-is. Must not filter/whitelist fields.

## What is NOT locked (i.e. still open for work)

- Home Page brightness behaviour (user will address next)
- **Quick Edit dialog top bar / non-slider chrome** — the user may still
  tweak the header buttons and the surrounding form fields; those are NOT
  covered by the Quick Edit lock. Only the sliders, content textarea +
  underlay, and the auto-save wiring are locked.
- **Light Mode (Moon Mode)** behaviour of any of the above
- New notes' default global brightness (`settings.ui_brightness`)
- The `DisplayControlsButton` popover chrome (only the sliders inside are
  locked, not the popover wrapper's position/appearance)

## Sentinel markers in code

Each locked region has a code comment near the top starting with:

```
// 🔒 LOCKED (star-mode expanded text) — see /app/memory/LOCKED_SURFACES.md
// Password required to modify: 2020
```

If you see that marker, **stop** and check whether the user's current message
contains `2020`. If not, do not edit that block. Route the request back to the
user for password confirmation.

## Unlock procedure

To modify anything above, the user must say something like:

> "Unlock with 2020, then change the text slider default to 0.5."

Once unlocked for the message, apply only the exact change requested, then
re-lock (leave the sentinel comments in place).
