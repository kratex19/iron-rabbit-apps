// ==========================================================================
// Iron Rabbit — Floating Rich-Text Editor · Module 1
// --------------------------------------------------------------------------
// Self-contained, removable, mobile-first floating toolbar that attaches to
// the existing Expanded Text Editor (NoteModal) without touching its
// content model, storage, or the existing "T | Tags | HTML | ?" top bar.
//
// SCOPE (module 1):
//   • Draggable via a dedicated 3-bar grip on the LEFT edge only.
//   • Horizontal (default) OR vertical (90° rotated) orientation.
//   • Inner tool row is independently scrollable — scroll never repositions
//     the toolbar (only the grip does).
//   • ~15 real tools: H1/H2/H3, B/I/U/S, bulleted/numbered/checklist,
//     Undo, Redo, Link, Image, 🌳 Hierarchy, 📋 Insert Form.
//     Everything else from the 35-tool spec is a stub with a "coming soon"
//     toast and a stable data-testid, so future wiring is a one-liner.
//   • Formatting hooks into the SAME contentEditable that NoteModal already
//     renders (`[data-testid="note-content-input-html"]`) via
//     `document.execCommand`.  When the editor is in plain textarea mode
//     (`[data-testid="note-content-input"]`) tools fall back to markdown-
//     style surround-selection insertion so nothing throws.
//   • Uses `window.visualViewport` to sit just above the on-screen keyboard
//     on mobile.  Falls back to bottom:16px on desktop.
//   • Zero external state, zero new persistence, zero Quick Guide changes,
//     zero routing changes, zero storage changes.
// ==========================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Menu, ArrowUpDown, ArrowLeftRight,
  Heading1, Heading2, Heading3, Type, CaseSensitive, Pilcrow,
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, ListChecks,
  Undo2, Redo2,
  Link as LinkIcon, Image as ImageIcon,
  Network, ClipboardList,
  CornerDownLeft, WrapText,
  // Stubbed set
  AlignLeft, Palette, Highlighter, Scissors, Copy, ClipboardPaste,
  ScanLine, Camera, Mic, FileText, Printer, Share2,
} from "lucide-react";
import { FormsPackAdapter, HierarchyAdapter } from "./adapters";
import { plainTextToHtml, sanitizeHtml } from "../../utils/htmlSanitize";

// --------------------------------------------------------------------------
// Small helper — find the active editor element (contentEditable or
// textarea) associated with NoteModal OR the FullScreenNote editor.  We
// probe the DOM instead of taking a ref prop so the toolbar remains 100%
// removable without editing either host's internal state shape.
//
// The toolbar binds to whichever Expanded Text Editor is currently
// mounted:
//   • NoteModal      → "note-content-input"  (textarea)
//                      "note-content-input-html" (contentEditable)
//   • FullScreenNote → "fullscreen-content-input"        (textarea, text mode)
//                      "fullscreen-content-input-html"   (textarea, html mode)
//                      "fullscreen-content-input-format" (contentEditable)
// Priority order favours the HTML/format contentEditable because that is
// where rich formatting actually renders.
// --------------------------------------------------------------------------
const EDITOR_TESTIDS = [
  // contentEditable targets first — rich-text operations prefer these
  "note-content-input-html",
  "fullscreen-content-input-format",
  // textarea targets second (plaintext / raw-html editing)
  "note-content-input",
  "fullscreen-content-input",
  "fullscreen-content-input-html",
];
const EDITOR_SELECTOR = EDITOR_TESTIDS
  .map((id) => `[data-testid="${id}"]`)
  .join(",");

function findActiveEditor() {
  const active = document.activeElement;
  if (active && (active.isContentEditable || active.tagName === "TEXTAREA")) {
    const id = active.getAttribute && active.getAttribute("data-testid");
    if (id && EDITOR_TESTIDS.includes(id)) return active;
  }
  // Fallback: priority order from EDITOR_TESTIDS — first match wins.
  for (const id of EDITOR_TESTIDS) {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (el) return el;
  }
  return null;
}

// Find the active contentEditable editor (NoteModal `note-content-input-html`
// or FullScreenNote `fullscreen-content-input-format`). Used by the history
// manager and checklist-click delegation, both of which only make sense on
// the rich-text surface.
function findActiveHtmlEditor() {
  return (
    document.querySelector('[data-testid="note-content-input-html"]') ||
    document.querySelector('[data-testid="fullscreen-content-input-format"]') ||
    null
  );
}

// --------------------------------------------------------------------------
// Formatting primitives — REAL rich-text only.
// Two paths:
//   1) Editor is <textarea> (plain-text mode). Promote the note to HTML by
//      wrapping the selected range in a real HTML tag (<strong>/<em>/<u>/
//      <s>) or converting the current line into a <h1>/<h2>/<h3>. The
//      promoted HTML string is written back through React's native value
//      setter so NoteModal's `onChange` fires, `looksLikeHtml(content)`
//      flips to true on the next render, and the modal automatically
//      swaps textarea → contentEditable. We refocus the new element after
//      paint so subsequent formatting operates on the live contentEditable.
//   2) Editor is contentEditable (HTML mode). Use native execCommand,
//      which produces real <strong>/<em>/<u>/<s>/<h1..3> nodes that the
//      existing sanitiser + storage layer already handle.
// No Markdown markers (**, __, ~~, ##, etc.) are ever inserted anywhere.
// --------------------------------------------------------------------------

// --------------------------------------------------------------------------
// HistoryStack — custom multi-level undo/redo for the HTML editor.
//
// `document.execCommand("undo"/"redo")` traverses the browser's own stack,
// which (a) does not include programmatic `innerHTML = …` writes (used by
// the textarea → HTML promotion in this toolbar), and (b) has no API for
// snapshotting formatting commands. Per spec §9/§10 we need a stack that:
//   • groups continuous typing (debounced snapshot) into one entry
//   • records an immediate snapshot before + after every toolbar command
//   • supports many undo/redo levels (cap at 200 to bound memory)
//   • discards the redo branch when the user edits after an undo
//   • restores both innerHTML AND a serialized caret location
// Caret location is serialized as a path through child-node indices +
// offset — robust across innerHTML swaps.
// --------------------------------------------------------------------------
function serializeSelection(root) {
  try {
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.startContainer)) return null;
    const path = (node) => {
      const indices = [];
      let n = node;
      while (n && n !== root) {
        const parent = n.parentNode;
        if (!parent) return null;
        indices.unshift(Array.prototype.indexOf.call(parent.childNodes, n));
        n = parent;
      }
      return indices;
    };
    return {
      startPath: path(range.startContainer),
      startOffset: range.startOffset,
      endPath: path(range.endContainer),
      endOffset: range.endOffset,
    };
  } catch { return null; }
}
function restoreSelection(root, saved) {
  if (!saved) return;
  try {
    const resolve = (indices) => {
      let n = root;
      for (const i of indices) {
        if (!n || !n.childNodes || !n.childNodes[i]) return null;
        n = n.childNodes[i];
      }
      return n;
    };
    const startNode = resolve(saved.startPath);
    const endNode = resolve(saved.endPath);
    if (!startNode || !endNode) return;
    const sel = window.getSelection();
    const r = document.createRange();
    const sLen = (startNode.textContent || "").length;
    const eLen = (endNode.textContent || "").length;
    r.setStart(startNode, Math.min(saved.startOffset, sLen));
    r.setEnd(endNode, Math.min(saved.endOffset, eLen));
    sel.removeAllRanges();
    sel.addRange(r);
  } catch { /* fail silent — caret just goes to end */ }
}

class HistoryStack {
  constructor(max = 200) {
    this.stack = [];
    this.pointer = -1;
    this.max = max;
    this._timer = null;
    this._pending = null;
  }
  _trim() {
    if (this.stack.length > this.max) {
      const drop = this.stack.length - this.max;
      this.stack.splice(0, drop);
      this.pointer -= drop;
    }
  }
  _push(entry) {
    // Discard any redo branch beyond the current pointer.
    this.stack.splice(this.pointer + 1);
    const last = this.stack[this.pointer];
    if (last && last.html === entry.html) return;
    this.stack.push(entry);
    this.pointer = this.stack.length - 1;
    this._trim();
  }
  flush() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (this._pending) { this._push(this._pending); this._pending = null; }
  }
  snapshotImmediate(root) {
    this.flush();
    this._push({ html: root.innerHTML, sel: serializeSelection(root) });
  }
  // Called from input events — debounces to group continuous typing.
  snapshotDebounced(root, delay = 800) {
    this._pending = { html: root.innerHTML, sel: serializeSelection(root) };
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      if (this._pending) { this._push(this._pending); this._pending = null; }
      this._timer = null;
    }, delay);
  }
  canUndo() { return this.pointer > 0; }
  canRedo() { return this.pointer < this.stack.length - 1; }
  undo() { this.flush(); if (!this.canUndo()) return null; this.pointer--; return this.stack[this.pointer]; }
  redo() { this.flush(); if (!this.canRedo()) return null; this.pointer++; return this.stack[this.pointer]; }
  resetTo(html, sel) {
    this.stack = [{ html, sel }];
    this.pointer = 0;
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    this._pending = null;
  }
}


// React tracks the last-known value on inputs/textareas. Setting `.value`
// directly bypasses that tracker so NoteModal's controlled `onChange`
// never fires. Using the native prototype setter is the standard React
// escape hatch for programmatic value writes.
function reactSetValue(el, next) {
  try {
    const proto = window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype;
    const desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && typeof desc.set === "function") {
      desc.set.call(el, next);
    } else {
      el.value = next;
    }
  } catch {
    el.value = next;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function runExecCommand(editor, command, value = null) {
  try {
    // Fix E.1 — avoid Android-Chrome's selection-collapse-on-focus bug.
    // Calling `.focus()` on an already-focused contentEditable collapses
    // the active selection to offset 0 on Android Chrome / Capacitor
    // WebViews. For `formatBlock` this is harmless (it operates on the
    // containing block, not the selection range) which is why H1/H2/H3
    // feels reliable. For `bold`/`italic`/`underline` which DO operate
    // on the range, the collapse turns the command into a pending-state
    // toggle with no visible effect — forcing the user to tap again.
    // We only re-focus when focus has genuinely drifted elsewhere.
    if (editor && typeof editor.focus === "function" && document.activeElement !== editor) {
      editor.focus();
    }
    // execCommand is deprecated but universally supported and still the
    // simplest cross-browser bridge to contentEditable formatting.
    document.execCommand(command, false, value);
    // Fire input event so React-controlled contentEditables observing
    // change propagate correctly.
    editor?.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

// --------------------------------------------------------------------------
// Fix E.2 — selection stashing for Android touch events.
//
// Even with `onPointerDown.preventDefault()` on every tool button,
// Android Chrome's `touchstart` can transfer focus BEFORE our pointer
// handler fires (focus-follows-tap heuristic). By the time `click`
// synthesises and `applyFormat` runs, the editor's selection has been
// collapsed to offset 0 and `document.execCommand("bold")` silently
// no-ops against the user's original range.
//
// Fix: stash the editor's selection at the earliest moment we can get
// our hands on it — the button's `onPointerDown`, which runs BEFORE
// touchstart's default actions are committed on most Android builds.
// `applyFormat` then checks whether the live selection has drifted and,
// if so, restores the stashed range before dispatching the command.
//
// The stash is keyed by the editor element so multiple
// `FloatingRichTextToolbar` instances (NoteModal + FullScreenNote) don't
// clobber each other. On textarea we rely on the browser's native
// selectionStart/End preservation and skip the stash.
// --------------------------------------------------------------------------
const SELECTION_STASH = { editor: null, range: null, start: 0, end: 0 };

function stashSelection() {
  const editor = findActiveEditor();
  if (!editor) return;
  if (editor.tagName === "TEXTAREA") {
    // Textarea retains selectionStart/End across focus loss natively —
    // no manual stash is needed. We still record the editor pointer so
    // `restoreStashedSelectionIfNeeded` knows which element the stash
    // applies to.
    SELECTION_STASH.editor = editor;
    SELECTION_STASH.range = null;
    SELECTION_STASH.start = editor.selectionStart ?? 0;
    SELECTION_STASH.end = editor.selectionEnd ?? 0;
    return;
  }
  try {
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    SELECTION_STASH.editor = editor;
    SELECTION_STASH.range = range.cloneRange();
  } catch { /* noop */ }
}

function restoreStashedSelectionIfNeeded(editor) {
  if (!editor) return;
  if (SELECTION_STASH.editor !== editor) return;
  if (editor.tagName === "TEXTAREA") return; // native preservation
  if (!SELECTION_STASH.range) return;
  const sel = window.getSelection && window.getSelection();
  if (!sel) return;
  const live = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  // Restore only when the live selection has drifted — collapsed when it
  // was previously a range, or landed outside the editor entirely. If
  // the user still has an intact selection in the editor, leave it alone.
  const stashedWasRange = !SELECTION_STASH.range.collapsed;
  const liveIsBroken =
    !live
    || !editor.contains(live.commonAncestorContainer)
    || (stashedWasRange && live.collapsed);
  if (!liveIsBroken) return;
  try {
    // Guard: the stashed range nodes may have been removed by a prior
    // DOM mutation (e.g. React re-render). Verify the common ancestor
    // is still attached inside the editor before restoring.
    if (!editor.contains(SELECTION_STASH.range.commonAncestorContainer)) return;
    sel.removeAllRanges();
    sel.addRange(SELECTION_STASH.range);
  } catch { /* noop */ }
}

// --------------------------------------------------------------------------
// Deterministic tag wrap (used for Strikethrough).
//
// `document.execCommand("strikeThrough")` on the user's Android Chrome
// nests the strike element inside any existing formatting ancestor, so
// applying Strike to text that overlaps a <u> region — or that had
// underline mode toggled on for the selection — produces
//   <u><strike>...</strike></u>
// which renders as BOTH underline AND line-through. Empirically
// reproduced in this environment: after `execCommand('underline')`
// followed by `execCommand('strikeThrough')` on the same range, we get
// `<u><strike>hello</strike></u>`.
//
// The fix: bypass execCommand for Strike and wrap the selection in a
// fresh <s> node via a direct Range mutation. This is browser-agnostic,
// doesn't inherit ambient command modes, and produces plain
// `<s>text</s>` markup that the sanitiser accepts and the CSS renders
// as line-through ONLY. Underline is completely untouched.
// --------------------------------------------------------------------------
// Fix I — reliable format-first-then-type for inline formats in
// contentEditable mode.
//
// Problem: `document.execCommand("bold")` on a collapsed caret relies
// on the browser's native "pending inline formatting" state. Chrome
// desktop supports this correctly (verified in preview), but Capacitor
// Android WebView drops the pending state before the next keystroke
// lands, so the user sees the Bold button light up but their typing
// stays plain.
//
// Fix: skip native pending-state for inline collapsed-caret taps and
// instead insert a `<tag class="ir-pending-inline">\u200B</tag>` marker
// at the caret. The caret lands AFTER the ZWSP, inside the tag. When
// the user types, the characters land inside the tag — pending-state
// is implicit in the DOM structure instead of a browser flag that
// Capacitor can forget.
//
// On the first `input` event that lengthens the marker beyond the
// ZWSP, a document-level listener strips the ZWSP and the
// `.ir-pending-inline` class, leaving a clean `<strong>text</strong>`
// (or em / u / s).
//
// Toggle-off: if the user taps the same inline format while the caret
// is still inside a pending marker (they changed their mind before
// typing), we unwrap the marker and leave the caret where it was.
//
// This helper is INLINE-only (bold / italic / underline / strike).
// H1 / H2 / H3 continue through the unchanged formatBlock path.
const PENDING_INLINE_CLASS = "ir-pending-inline";

function insertInlinePendingMarker(editor, format) {
  const tag = INLINE_TAG[format];
  if (!tag || !editor) return false;
  const sel = window.getSelection && window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!range.collapsed) return false;
  if (!editor.contains(range.startContainer)) return false;

  // --------------------------------------------------------------------
  // Toggle-off: find the NEAREST ancestor matching this format (any —
  // pending-marker class OR a committed <strong>/<em>/<u>/<s>). If the
  // caret already lives in such an ancestor, the user wants to exit it:
  //   • Pending marker + still only a ZWSP inside → unwrap the marker
  //     entirely (user tapped format twice, no text committed yet).
  //   • Committed inline tag with real text → move the caret to the
  //     position immediately AFTER the ancestor in its parent, so the
  //     next keystrokes land in plain text. The committed tag stays
  //     intact — this matches Chrome/Google-Docs toggle-off behaviour.
  // --------------------------------------------------------------------
  const matchTags = { bold: ["B", "STRONG"], italic: ["I", "EM"], underline: ["U"], strike: ["S", "STRIKE", "DEL"] };
  const targetTags = matchTags[format] || [];
  let node = range.startContainer;
  if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  let ancestor = null;
  while (node && node !== editor) {
    if (node.tagName && targetTags.includes(node.tagName)) { ancestor = node; break; }
    node = node.parentElement;
  }
  if (ancestor) {
    try {
      const isPending = ancestor.classList && ancestor.classList.contains(PENDING_INLINE_CLASS);
      const txt = (ancestor.textContent || "");
      const onlyZwsp = txt === ZWSP || txt === "";
      const parent = ancestor.parentNode;
      if (!parent) return false;
      if (isPending && onlyZwsp) {
        // Pure pending-marker toggle: remove it, caret where it was.
        const indexInParent = Array.prototype.indexOf.call(parent.childNodes, ancestor);
        parent.removeChild(ancestor);
        const nr = document.createRange();
        const safeIdx = Math.min(indexInParent, parent.childNodes.length);
        nr.setStart(parent, safeIdx);
        nr.setEnd(parent, safeIdx);
        sel.removeAllRanges(); sel.addRange(nr);
      } else {
        // Committed inline: exit by moving caret to just after the
        // ancestor in its parent. The user's prior formatted text is
        // preserved verbatim. We also insert a zero-width space node
        // sibling after the ancestor so the caret has a stable text
        // anchor to live in — plain contentEditable sometimes "sticks"
        // the caret back inside the ancestor without this hint. The
        // ZWSP is stripped on the next real keystroke by
        // `cleanupPendingInlineMarkers` (which iterates all pending
        // markers; we also run a tiny inline cleanup for stray exit
        // anchors below).
        const exitAnchor = document.createTextNode(ZWSP);
        exitAnchor.__irExitAnchor = true; // marker for cleanup
        if (ancestor.nextSibling) parent.insertBefore(exitAnchor, ancestor.nextSibling);
        else parent.appendChild(exitAnchor);
        const nr = document.createRange();
        nr.setStart(exitAnchor, 1);
        nr.setEnd(exitAnchor, 1);
        sel.removeAllRanges(); sel.addRange(nr);
      }
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    } catch { return false; }
  }

  // --------------------------------------------------------------------
  // Fresh insert: no matching ancestor → create a pending marker at the
  // caret, position the caret inside AFTER the ZWSP. User keystrokes
  // land inside the marker — formatted.
  // --------------------------------------------------------------------
  try {
    const marker = document.createElement(tag);
    marker.setAttribute("class", PENDING_INLINE_CLASS);
    marker.appendChild(document.createTextNode(ZWSP));
    range.insertNode(marker);
    const nr = document.createRange();
    nr.setStart(marker.firstChild, 1);
    nr.setEnd(marker.firstChild, 1);
    sel.removeAllRanges(); sel.addRange(nr);
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch { return false; }
}

// Scan all `.ir-pending-inline` markers in the editor and promote any
// that now contain real user text (i.e. length > 1 beyond the ZWSP) to
// permanent inline tags by stripping the ZWSP + the pending class.
// Markers that still contain only the ZWSP are left alone so the user
// can chain more format taps (B → I → U → type).
//
// Also strips exit-anchor ZWSPs (plain text nodes stamped with
// `__irExitAnchor`) once the user has typed past them. These are the
// tiny caret-anchor nodes we inject when toggling OFF a committed
// inline format — the ZWSP keeps the caret visible outside the tag;
// once a real char lands next to it we no longer need the padding.
function cleanupPendingInlineMarkers(editor) {
  if (!editor) return;
  try {
    const markers = editor.querySelectorAll("." + PENDING_INLINE_CLASS);
    markers.forEach((m) => {
      const text = m.textContent || "";
      if (text === ZWSP || text.length === 0) return;
      let n = m.firstChild;
      while (n) {
        if (n.nodeType === Node.TEXT_NODE && n.data && n.data.indexOf(ZWSP) !== -1) {
          n.data = n.data.replace(new RegExp(ZWSP, "g"), "");
          if (!n.data) {
            const nxt = n.nextSibling;
            m.removeChild(n);
            n = nxt;
            continue;
          }
        }
        n = n.nextSibling;
      }
      m.classList.remove(PENDING_INLINE_CLASS);
      if (m.classList.length === 0) m.removeAttribute("class");
    });
    // Exit-anchor ZWSP cleanup. We walk every text node in the editor
    // (cheap — editors are tiny), check for the JS-side flag, and if
    // the node now contains > 1 character the ZWSP has done its job
    // and can go.
    const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT, null);
    let n;
    const toClean = [];
    while ((n = walker.nextNode())) {
      if (n.__irExitAnchor && (n.data || "").length > 1) toClean.push(n);
    }
    toClean.forEach((n) => {
      n.data = n.data.replace(new RegExp(ZWSP, "g"), "");
      n.__irExitAnchor = false;
    });
  } catch { /* noop */ }
}


function wrapSelectionWithTag(editor, tagName) {
  if (!editor) return false;
  // Fix E.1 — see runExecCommand. Only focus if focus has drifted away;
  // calling .focus() on an already-focused contentEditable on Android
  // Chrome collapses the selection, which turns this helper into a
  // silent no-op (range.collapsed → early return) exactly matching the
  // "Strike needs multiple taps" symptom reported on-device.
  try {
    if (document.activeElement !== editor) editor.focus();
  } catch {}
  const sel = window.getSelection && window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return false;
  // Guard: ensure the selection lives inside the editor we were handed
  // (avoid formatting text that has scrolled or drifted outside).
  if (!editor.contains(range.commonAncestorContainer)) return false;
  try {
    const wrapper = document.createElement(tagName);
    // extractContents + appendChild works even when the selection
    // crosses element boundaries (surroundContents throws in that case).
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    // Restore selection to the wrapped content so a follow-up format
    // click continues to act on the same text.
    sel.removeAllRanges();
    const nr = document.createRange();
    nr.selectNodeContents(wrapper);
    sel.addRange(nr);
    // Notify React that the DOM changed so NoteModal's handleHtmlInput
    // syncs the new HTML into `content` state (and therefore storage).
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

// Fix F — strike toggle. When the caret / selection already lives
// inside an `<s>` (or `<strike>` / `<del>`) ancestor, re-tapping Strike
// should REMOVE the formatting, matching how Bold/Italic/Underline
// behave via native execCommand. The existing `wrapSelectionWithTag`
// unconditionally wraps, producing `<s><s>text</s></s>` on the second
// tap — which the user caught during Android testing.
//
// Strategy: find the nearest strike ancestor that is wholly contained
// in the editor; unwrap it by replacing the <s> with its own children,
// then restore the selection to span those children. The caret-is-
// inside-formatted-text active-state detector (`refreshActive`) already
// walks the same tag names, so the button correctly lights up / clears.
//
// This helper is strike-only on purpose — Bold/Italic/Underline/H1-H3
// paths remain exactly as they were, so this fix cannot regress any
// confirmed-working command.
function unwrapStrikeAtSelection(editor) {
  if (!editor) return false;
  const sel = window.getSelection && window.getSelection();
  if (!sel || sel.rangeCount === 0) return false;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return false;
  // Walk up from the selection's start container to find the nearest
  // strike ancestor still contained within the editor.
  let node = range.startContainer;
  if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
  let strike = null;
  while (node && node !== editor) {
    const t = node.tagName;
    if (t === "S" || t === "STRIKE" || t === "DEL") { strike = node; break; }
    node = node.parentElement;
  }
  if (!strike) return false;
  try {
    const parent = strike.parentNode;
    if (!parent) return false;
    // Capture the first/last children before unwrap so we can restore
    // the selection to span exactly the un-struck text — not a tag.
    const firstChild = strike.firstChild;
    const lastChild = strike.lastChild;
    // Move each child of <s> out, in order, into the parent at the
    // position <s> currently occupies.
    while (strike.firstChild) parent.insertBefore(strike.firstChild, strike);
    parent.removeChild(strike);
    if (firstChild && lastChild) {
      const nr = document.createRange();
      nr.setStartBefore(firstChild);
      nr.setEndAfter(lastChild);
      sel.removeAllRanges();
      sel.addRange(nr);
    }
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

// Map of format key → inline tag used when promoting a plain textarea
// into HTML mode. Kept in sync with the sanitiser allowlist in
// utils/htmlSanitize.js so the promoted markup round-trips through
// storage cleanly.
const INLINE_TAG = { bold: "strong", italic: "em", underline: "u", strike: "s" };
const BLOCK_TAG = { h1: "h1", h2: "h2", h3: "h3" };

// Split plaintext-with-markers into HTML paragraphs while preserving the
// markers verbatim, then swap them back to real tags. This gives us
// selection-preserving wrapping without any Markdown intermediate step.
const MARK_OPEN = "\u0001IR_OPEN\u0001";
const MARK_CLOSE = "\u0001IR_CLOSE\u0001";

// Promotion marker — a transient class we stamp onto the newly-wrapped
// tag inside the HTML we hand to React. After the contentEditable mounts
// and React commits the new innerHTML, we locate `.ir-caret-target`,
// restore selection to it, then strip the class. The class is on the
// DOMPurify ALLOWED_ATTR list so it survives sanitize.
const CARET_TARGET_CLASS = "ir-caret-target";
// Zero-width space — used as a caret anchor inside otherwise-empty
// promoted elements (format-first-then-type flow). Browsers keep inline
// elements around when they contain at least one character, giving us a
// stable Range target. The ZWSP is deleted the moment we finish
// positioning the caret so the user never types past an invisible char.
const ZWSP = "\u200B";

function promoteTextareaWithInlineFormat(editor, format) {
  const tag = INLINE_TAG[format];
  if (!tag) return false;
  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  const value = editor.value || "";

  if (start !== end) {
    // Existing path (Fix B): user has a selection — wrap it in the
    // inline tag and tell focusHtmlEditorSoon to re-select the inner
    // contents so chaining B → I → U keeps working.
    const before = value.slice(0, start);
    const middle = value.slice(start, end);
    const after = value.slice(end);
    const marked = before + MARK_OPEN + middle + MARK_CLOSE + after;
    let html = plainTextToHtml(marked);
    html = html
      .split(MARK_OPEN).join(`<${tag} class="${CARET_TARGET_CLASS}">`)
      .split(MARK_CLOSE).join(`</${tag}>`);
    reactSetValue(editor, html);
    return "range";
  }

  // Fix D — format-first-then-type (no selection). Promote the textarea
  // while preserving any existing text and the exact caret position,
  // then signal the pending inline format. focusHtmlEditorSoon will
  // land the caret at the promoted spot and toggle execCommand(<format>)
  // so the next keystroke inherits bold/italic/underline — matching
  // the way every mainstream rich-text editor behaves.
  //
  // Caret anchor strategy: we insert `<b class="ir-caret-target">\u200B</b>`
  // at the caret position. `<b>` + `class` + a ZWSP survive the
  // sanitiser round-trip, and the ZWSP keeps the empty inline alive
  // through contentEditable mount (browsers collapse truly-empty inline
  // elements). The marker is torn down in focusHtmlEditorSoon.
  const before = value.slice(0, start);
  const after = value.slice(start);
  const marked = before + MARK_OPEN + ZWSP + MARK_CLOSE + after;
  let html = plainTextToHtml(marked);
  if (!html) {
    // Empty textarea → emit a minimal paragraph that owns the marker.
    html = `<p>${MARK_OPEN}${ZWSP}${MARK_CLOSE}</p>`;
  }
  html = html
    .split(MARK_OPEN).join(`<b class="${CARET_TARGET_CLASS}">`)
    .split(MARK_CLOSE).join(`</b>`);
  reactSetValue(editor, html);
  return `pending-inline:${format}`;
}

function promoteTextareaWithBlockFormat(editor, format) {
  const tag = BLOCK_TAG[format];
  if (!tag) return false;
  const value = editor.value || "";
  const caret = editor.selectionStart ?? 0;
  const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
  const nextNl = value.indexOf("\n", caret);
  const lineEnd = nextNl === -1 ? value.length : nextNl;
  const before = value.slice(0, lineStart);
  const line = value.slice(lineStart, lineEnd);
  const after = value.slice(lineEnd);

  if (line.trim()) {
    // Existing path (Fix B): wrap the non-empty line in <h1>|<h2>|<h3>
    // and park the caret at the end of the promoted block so H1 → H2
    // → H3 re-levelling works.
    const marked = before + MARK_OPEN + line + MARK_CLOSE + after;
    let html = plainTextToHtml(marked);
    html = html
      .split(MARK_OPEN).join(`<${tag} class="${CARET_TARGET_CLASS}">`)
      .split(MARK_CLOSE).join(`</${tag}>`);
    reactSetValue(editor, html);
    return "collapsed-end";
  }

  // Fix D — format-first-then-type on an empty line (or empty note).
  // Promote preserving the surrounding text and emit an empty block of
  // the chosen tag, with a ZWSP marker so the Range has somewhere to
  // anchor. On mount, focusHtmlEditorSoon strips the ZWSP, drops a <br>
  // into the empty block so the caret has a visible home, and leaves
  // the user ready to type directly into the heading.
  const marked = before + MARK_OPEN + ZWSP + MARK_CLOSE + after;
  let html = plainTextToHtml(marked);
  if (!html) {
    html = `<${tag} class="${CARET_TARGET_CLASS}">${ZWSP}</${tag}>`;
  } else {
    html = html
      .split(MARK_OPEN).join(`<${tag} class="${CARET_TARGET_CLASS}">`)
      .split(MARK_CLOSE).join(`</${tag}>`);
  }
  reactSetValue(editor, html);
  return "block-empty";
}

// Refocus the freshly-mounted contentEditable after a textarea → HTML
// promotion AND restore selection inside the `.ir-caret-target` wrapper
// so subsequent toolbar operations find a valid Range to act on. Works
// for either host (NoteModal's `note-content-input-html` or
// FullScreenNote's `fullscreen-content-input-format`).
// `mode` is the return value of a promote* helper:
//   • "range"                    → select the full contents (inline w/ selection)
//   • "collapsed-end"            → caret at end (block on non-empty line)
//   • "pending-inline:<format>"  → caret at marker, strip marker, exec toggle
//                                   (Fix D — inline format-first-then-type)
//   • "block-empty"              → caret inside empty block, strip ZWSP + ensure <br>
//                                   (Fix D — block format-first-then-type)
//   • true | falsy               → focus only, no selection restore (legacy)
function focusHtmlEditorSoon(mode = true) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = findActiveHtmlEditor();
      if (!el || typeof el.focus !== "function") return;
      el.focus();
      if (mode === true || mode === false || !mode) return;

      const target = el.querySelector(`.${CARET_TARGET_CLASS}`);
      if (!target) return;

      const sel = window.getSelection && window.getSelection();
      if (!sel) return;

      try {
        if (mode === "range") {
          const range = document.createRange();
          range.selectNodeContents(target);
          sel.removeAllRanges(); sel.addRange(range);
          cleanupCaretMarker(target);
        } else if (mode === "collapsed-end") {
          const range = document.createRange();
          let node = target;
          while (node && node.lastChild) node = node.lastChild;
          if (node && node.nodeType === Node.TEXT_NODE) {
            range.setStart(node, node.data.length);
            range.setEnd(node, node.data.length);
          } else {
            range.selectNodeContents(target); range.collapse(false);
          }
          sel.removeAllRanges(); sel.addRange(range);
          cleanupCaretMarker(target);
        } else if (typeof mode === "string" && mode.startsWith("pending-inline:")) {
          // Place caret at the ZWSP position inside the <b> marker,
          // then dissolve the marker (strip ZWSP + unwrap) so the user
          // is left with a bare caret in the parent paragraph. Toggling
          // execCommand(<format>) activates the pending inline state so
          // the first typed character comes out in that format.
          const fmt = mode.slice("pending-inline:".length);
          dissolveInlineCaretMarker(el, target, sel);
          try {
            document.execCommand(fmt === "strike" ? "strikeThrough" : fmt);
          } catch { /* execCommand is best-effort; worst case the user
                       sees their first char unformatted and can tap the
                       button once more */ }
        } else if (mode === "block-empty") {
          // Caret inside the empty block. Strip the ZWSP so the first
          // keystroke doesn't trail an invisible char, and plant a <br>
          // so the empty block holds a visible line height on all
          // browsers.
          let node = target.firstChild;
          const range = document.createRange();
          if (node && node.nodeType === Node.TEXT_NODE) {
            node.data = "";
          }
          // Ensure a <br> placeholder — this is what Chrome itself
          // writes into empty <p> blocks during contentEditable init.
          if (!target.querySelector("br") && !target.textContent) {
            target.appendChild(document.createElement("br"));
          }
          range.setStart(target, 0); range.setEnd(target, 0);
          sel.removeAllRanges(); sel.addRange(range);
          cleanupCaretMarker(target);
        }
      } catch { /* fail silent — focus alone is still a usable fallback */ }

      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

// Remove the `.ir-caret-target` sentinel class once we've used it to
// restore selection. Leaves the element itself in place.
function cleanupCaretMarker(target) {
  try {
    target.classList.remove(CARET_TARGET_CLASS);
    if (target.classList.length === 0) target.removeAttribute("class");
  } catch { /* noop */ }
}

// Dissolve the inline `<b class="ir-caret-target">ZWSP</b>` marker used
// by the pending-inline flow. The caret ends up at the position the
// marker occupied inside its parent block, with no stray <b> and no
// invisible chars left over. If anything in this dissolve throws, we
// fall back to simply positioning the caret inside the marker and
// stripping the class — the user still gets a caret in the right block.
function dissolveInlineCaretMarker(editor, target, sel) {
  const parent = target.parentNode;
  if (!parent) { cleanupCaretMarker(target); return; }
  try {
    // Place caret immediately before the marker in its parent so
    // subsequent typing goes into the parent's text flow.
    const range = document.createRange();
    const indexOfMarker = Array.prototype.indexOf.call(parent.childNodes, target);
    // Pull marker's children (should be a single ZWSP text node) out
    // and discard — we don't want them in the parent.
    while (target.firstChild) target.removeChild(target.firstChild);
    parent.removeChild(target);
    // If the parent is now empty (common when promoting an empty
    // textarea), seed it with a <br> so Chrome maintains a visible
    // caret line and formatBlock has something to re-wrap later.
    if (!parent.firstChild) {
      parent.appendChild(document.createElement("br"));
    }
    // Position caret at the index the marker used to occupy. clamp to
    // parent's current childNodes.length since we just mutated it.
    const safeIdx = Math.min(indexOfMarker, parent.childNodes.length);
    range.setStart(parent, safeIdx);
    range.setEnd(parent, safeIdx);
    sel.removeAllRanges(); sel.addRange(range);
    // Refocus so the pending execCommand toggle lands on the right
    // selection.
    try { editor.focus(); } catch { /* noop */ }
  } catch {
    cleanupCaretMarker(target);
  }
}

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------
// These match the rendered outer-box size (button height + 4px padding +
// 1px border top/bottom). They only matter for the "sit above the keyboard"
// Y calculation on mobile; getting them off by a few px is what determines
// whether the toolbar overshoots into the keyboard area.
const HORIZONTAL_HEIGHT = 50;
const VERTICAL_WIDTH = 50;

export default function FloatingRichTextToolbar({ isDark = true, isOpen = true }) {
  const [pos, setPos] = useState(null);            // { x, y } in viewport coords
  const [orientation, setOrientation] = useState("horizontal");
  const [pickerOpen, setPickerOpen] = useState(null); // null | "forms" | "hierarchy"
  const dragStateRef = useRef({ dragging: false, offX: 0, offY: 0 });
  const scrollerRef = useRef(null);

  // Custom undo/redo stack (spec §9/§10). Scoped per toolbar lifetime —
  // which is per modal-open — so each note gets a fresh history.
  const historyRef = useRef(null);
  const historyEditorRef = useRef(null);
  if (!historyRef.current) historyRef.current = new HistoryStack(200);

  // ------------------------------------------------------------------------
  // History manager binding + interactive checklist delegation.
  // Runs as long as the toolbar is open. Polls document for the HTML
  // editor (which may not exist initially if the note is in textarea
  // mode) and primes/rebinds whenever it swaps in or out.
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const history = historyRef.current;
    let currentEl = null;
    let onInput = null;

    const attach = (el) => {
      if (currentEl === el) return;
      detach();
      currentEl = el;
      historyEditorRef.current = el;
      if (!el) return;
      history.resetTo(el.innerHTML, serializeSelection(el));
      onInput = () => history.snapshotDebounced(el);
      el.addEventListener("input", onInput);
    };
    const detach = () => {
      if (currentEl && onInput) {
        currentEl.removeEventListener("input", onInput);
      }
      currentEl = null;
      onInput = null;
      historyEditorRef.current = null;
    };

    // Poll for the HTML editor mount/unmount every 250ms. Cheap; the
    // alternative is a MutationObserver which has subtler lifecycle.
    const poll = () => {
      const el = findActiveHtmlEditor();
      if (el !== currentEl) attach(el);
    };
    poll();
    const timer = setInterval(poll, 250);

    // Interactive checklist click toggle. Delegated at document level so
    // we only need one listener regardless of how many checklist UL's
    // the user has in the note.
    const onDocClick = (e) => {
      const li = e.target && e.target.closest && e.target.closest("ul.ir-checklist > li");
      if (!li) return;
      // Only toggle when the user clicks the box area (left of the text).
      // Approx: anywhere within 1.75rem (~28px) of the LI's left edge.
      const rect = li.getBoundingClientRect();
      if (e.clientX - rect.left > 28) return;
      const next = li.getAttribute("data-ir-check") === "1" ? "0" : "1";
      li.setAttribute("data-ir-check", next);
      // Notify React so the host editor picks up the DOM change and
      // persists. Works for either NoteModal or FullScreenNote.
      const editor = li.closest(
        '[data-testid="note-content-input-html"],[data-testid="fullscreen-content-input-format"]'
      );
      if (editor) {
        editor.dispatchEvent(new Event("input", { bubbles: true }));
        if (historyRef.current) historyRef.current.snapshotImmediate(editor);
      }
      e.preventDefault();
    };
    document.addEventListener("click", onDocClick);

    return () => {
      clearInterval(timer);
      detach();
      document.removeEventListener("click", onDocClick);
    };
  }, [isOpen]);


  // ------------------------------------------------------------------------
  // Mobile-only visibility contract (see Module 1 correction):
  //   1. Hidden until the Expanded Text Editor is focused AND the on-screen
  //      keyboard is up.
  //   2. Y is snapped to just-above-the-keyboard on every visualViewport
  //      change so it visually travels with the keyboard.
  //   3. Hidden again when the editor loses focus or the keyboard closes.
  //   4. Desktop behaviour is unchanged (always shown when open).
  // Scope: ALL known Expanded Text Editor targets — NoteModal
  // (`note-content-input*`) and FullScreenNote
  // (`fullscreen-content-input*`). Other Tile Packs / editors are untouched.
  // ------------------------------------------------------------------------
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
  }, []);
  const [editorFocused, setEditorFocused] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);

  // ------------------------------------------------------------------------
  // Fix C — active-state detection for toolbar highlighting (Edit Text).
  //
  // Logic ported from `FormatFloatingToolbar.refreshActive` (the inner
  // Expanded Text toolbar, which the user has already validated works
  // correctly). We walk the ancestor chain from the caret / selection
  // start up to the nearest editable root and look for matching tag
  // names. We deliberately DO NOT use `document.queryCommandState`
  // because the Module 1 toolbar uses direct DOM wrappers (<s> for
  // strike, class-tagged <ul.ir-checklist> for checklists) that
  // execCommand doesn't know about — queryCommandState would under-
  // report Strikethrough and over-report Underline on Capacitor
  // WebViews. The ancestor walk is the single source of truth.
  //
  // When the active editor is a <textarea> (plain-text mode in
  // NoteModal before the first promotion, or `text`/`html` mode in
  // ExpandedTextEditor), there is no inline markup to detect, so every
  // flag stays false. This is correct behaviour — pressing Bold in a
  // textarea goes through the promotion path which switches modes.
  //
  // Scope note: this adds visual-only state. It cannot regress
  // Expanded Text because:
  //   • The inner FormatFloatingToolbar continues to run its own
  //     highlight logic completely independently.
  //   • We never mutate the DOM here — only read it.
  // ------------------------------------------------------------------------
  const [active, setActive] = useState({
    bold: false, italic: false, underline: false, strike: false,
    link: false,
    block: null, // "P" | "H1" | "H2" | "H3" | null
  });

  const refreshActive = useCallback(() => {
    const editor = findActiveEditor();
    if (!editor) {
      setActive((prev) => (prev.bold || prev.italic || prev.underline || prev.strike || prev.link || prev.block)
        ? { bold: false, italic: false, underline: false, strike: false, link: false, block: null }
        : prev);
      return;
    }
    // Textarea has no inline markup to detect.
    if (editor.tagName === "TEXTAREA") {
      setActive((prev) => (prev.bold || prev.italic || prev.underline || prev.strike || prev.link || prev.block)
        ? { bold: false, italic: false, underline: false, strike: false, link: false, block: null }
        : prev);
      return;
    }
    const sel = window.getSelection && window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!editor.contains(range.startContainer)) return;
    let bold = false, italic = false, underline = false, strike = false, link = false;
    let block = null;
    let node = range.startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    while (node && node !== editor) {
      const tag = node.tagName;
      if (tag === "B" || tag === "STRONG") bold = true;
      else if (tag === "I" || tag === "EM") italic = true;
      else if (tag === "U") underline = true;
      else if (tag === "S" || tag === "STRIKE" || tag === "DEL") strike = true;
      else if (tag === "A") link = true;
      else if (!block && (tag === "P" || tag === "H1" || tag === "H2" || tag === "H3")) {
        // Fix G — stop the ancestor walk at block boundaries. Inline
        // formats CANNOT validly wrap block elements (P/H1/H2/H3), so
        // any <b>/<strong>/<i>/etc. that still exists above a block
        // boundary is either stale (left over from a prior React
        // re-render) or Capacitor-WebView-emitted invalid markup. Not
        // breaking out here was the root of the Android "Bold lights
        // up inside H1" bug: a <strong> ancestor of the whole editor
        // (from an earlier promote-with-inline operation) was being
        // detected even after the heading was applied.
        block = tag;
        break;
      }
      node = node.parentElement;
    }
    setActive((prev) =>
      prev.bold === bold && prev.italic === italic && prev.underline === underline
        && prev.strike === strike && prev.link === link && prev.block === block
        ? prev
        : { bold, italic, underline, strike, link, block }
    );
  }, []);

  // Listen for selection + focus changes while the toolbar is open and
  // keep `active` in sync. Also refresh once after every DOM-mutating
  // tool action — `runExecCommand`, `wrapSelectionWithTag`, and the
  // history restore path all dispatch `input` events on the editor,
  // so a document-level `input` listener gives us a free hook with no
  // changes to applyFormat / applyLink / applyImage call sites.
  useEffect(() => {
    if (!isOpen) return;
    const onSel = () => refreshActive();
    const onFocusIn = () => refreshActive();
    const onInput = (e) => {
      // Only refresh when the input event originates from one of our
      // known editor targets — ignore stray inputs from title fields,
      // tag inputs, etc.
      const t = e.target;
      if (!t || !t.getAttribute) return;
      const id = t.getAttribute("data-testid");
      if (id && EDITOR_TESTIDS.includes(id)) {
        // Fix I — promote any `.ir-pending-inline` markers whose
        // content has grown past the ZWSP to permanent inline tags.
        // Runs BEFORE the active-state refresh so refreshActive sees
        // the clean DOM.
        cleanupPendingInlineMarkers(t);
        // Defer one frame so DOM mutations from the format op have
        // committed before we walk ancestors.
        requestAnimationFrame(refreshActive);
      }
    };
    document.addEventListener("selectionchange", onSel);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("input", onInput, true);
    // Prime on mount so the state is correct even if the caret is
    // already sitting inside a formatted run (e.g. reopening a note).
    refreshActive();
    return () => {
      document.removeEventListener("selectionchange", onSel);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("input", onInput, true);
    };
  }, [isOpen, refreshActive]);

  // Track focus on the known Expanded Text Editor targets.
  useEffect(() => {
    if (!isOpen) return;
    const isEditorEl = (el) => {
      if (!el || !el.getAttribute) return false;
      const id = el.getAttribute("data-testid");
      return !!id && EDITOR_TESTIDS.includes(id);
    };
    const onFocusIn = (e) => { if (isEditorEl(e.target)) setEditorFocused(true); };
    const onFocusOut = (e) => {
      if (!isEditorEl(e.target)) return;
      // Small deferral so tapping a toolbar button (which momentarily
      // steals focus) doesn't collapse the toolbar mid-interaction.
      setTimeout(() => {
        const active = document.activeElement;
        if (!isEditorEl(active)) setEditorFocused(false);
      }, 80);
    };
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    // Prime state if the editor is already focused when the toolbar mounts.
    if (isEditorEl(document.activeElement)) setEditorFocused(true);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [isOpen]);

  // Detect soft keyboard visibility via visualViewport shrinkage.
  // A ~120px delta reliably distinguishes an open on-screen keyboard from
  // browser chrome / toolbars in both portrait and landscape.
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const check = () => {
      const delta = window.innerHeight - vv.height;
      setKeyboardUp(delta > 120);
    };
    check();
    vv.addEventListener("resize", check);
    vv.addEventListener("scroll", check);
    window.addEventListener("orientationchange", check);
    return () => {
      vv.removeEventListener("resize", check);
      vv.removeEventListener("scroll", check);
      window.removeEventListener("orientationchange", check);
    };
  }, [isOpen]);

  // ------------------------------------------------------------------------
  // Manual JS-driven tool-strip scroll.
  // Radix Dialog wraps its content in `react-remove-scroll`, which installs
  // a document-level `touchmove` listener that calls preventDefault() on
  // any touch NOT inside its explicit `shards` list. Our toolbar is
  // portalled to `document.body` (to escape the Dialog's stacking context)
  // and therefore is not a shard — so `react-remove-scroll` kills the
  // browser's native pan-x / pan-y scroll for the tool strip. That is why
  // CSS-only fixes (`touch-action: pan-x`, `overflow-x: auto`, `flex-1`)
  // could satisfy structural tests yet fail on-device.
  //
  // Fix: bypass native scroll entirely for this scroller. Listen for touch
  // events on the scroller element itself and drive `scrollLeft` /
  // `scrollTop` from the finger delta. Programmatic scroll always works —
  // preventDefault only blocks the browser's default scroll GESTURE, not
  // scripted `Element.scrollLeft = ...` writes. Independent of Radix,
  // react-remove-scroll's shard list, and Dialog's event pipeline.
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!isOpen) return;
    const el = scrollerRef.current;
    if (!el) return;
    const isH = orientation === "horizontal";
    let state = null; // { x0, y0, sl0, st0, moved }

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length !== 1) { state = null; return; }
      const t = e.touches[0];
      state = { x0: t.clientX, y0: t.clientY, sl0: el.scrollLeft, st0: el.scrollTop, moved: false };
    };
    const onTouchMove = (e) => {
      if (!state || !e.touches || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - state.x0;
      const dy = t.clientY - state.y0;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) state.moved = true;
      // Finger LEFT means content should scroll RIGHT (i.e. scrollLeft
      // increases). Standard direct-manipulation panning.
      if (isH) el.scrollLeft = state.sl0 - dx;
      else     el.scrollTop  = state.st0 - dy;
      // Once past the tap threshold, cancel the browser's own scroll
      // attempt AND the compat click that would otherwise fire on a
      // button under the finger at touchend.
      if (state.moved && e.cancelable) e.preventDefault();
    };
    const onTouchEnd = () => {
      const s = state;
      state = null;
      if (s && s.moved) {
        // Swallow the one compat click that fires after a scroll gesture,
        // so a tool button doesn't accidentally activate when the user
        // was just panning.
        const stopOnce = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
          el.removeEventListener("click", stopOnce, true);
        };
        el.addEventListener("click", stopOnce, true);
        setTimeout(() => el.removeEventListener("click", stopOnce, true), 400);
      }
    };

    // touchmove MUST be non-passive so preventDefault works. React's
    // synthetic touchmove is passive on some builds, hence native
    // addEventListener directly on the DOM node.
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd,   { passive: true });
    el.addEventListener("touchcancel",onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      el.removeEventListener("touchcancel",onTouchEnd);
    };
  }, [isOpen, orientation, pos]);


  // ------ Position: hover just above the on-screen keyboard ------
  // (Depends on `getUsableRect`, declared just below the visibility
  // gate effects but above this position effect — see below.)
  const rafRef = useRef(0);
  // Compute the usable rect the toolbar is allowed to occupy. This is
  // the host editor's visible container (Radix Dialog for NoteModal or
  // the `fullscreen-note` panel for FullScreenNote) intersected with
  // the visualViewport (so the on-screen keyboard shrinks the bottom
  // dynamically). Falls back to the layout viewport when neither host
  // is found (e.g. toolbar mounted outside a known container).
  const getUsableRect = useCallback(() => {
    const vv = window.visualViewport;
    const vvTop = vv?.offsetTop || 0;
    const vvBottom = vv ? vvTop + vv.height : window.innerHeight;
    let left = 0, right = window.innerWidth, top = 0, bottom = window.innerHeight;
    const host =
      document.querySelector('[role="dialog"][data-state="open"]') ||
      document.querySelector('[role="dialog"]') ||
      document.querySelector('[data-radix-dialog-content]') ||
      document.querySelector('[data-testid="fullscreen-note"]');
    if (host) {
      const r = host.getBoundingClientRect();
      left = r.left; right = r.right; top = r.top; bottom = r.bottom;
    }
    // Intersect with the visible viewport so the keyboard reduces the
    // bottom boundary and the toolbar can never be dragged under it.
    bottom = Math.min(bottom, vvBottom);
    top = Math.max(top, vvTop);
    // Guard against zero/negative sizes (dialog animating in).
    if (right - left < 40) { left = 0; right = window.innerWidth; }
    if (bottom - top < 40) { top = 0; bottom = window.innerHeight; }
    return { left, right, top, bottom };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const place = () => {
      // CRITICAL: do NOT clobber Y while the user is dragging the toolbar.
      // Without this gate, `visualViewport.scroll` events fire mid-drag on
      // iOS/Android and the Y snap yanks the toolbar back to the keyboard
      // line, which is what produced the "wig out" oscillation.
      if (dragStateRef.current.dragging) return;
      const rect = getUsableRect();
      const gap = isMobile ? 4 : 12; // "a few pixels" above the keyboard
      const height = orientation === "horizontal" ? HORIZONTAL_HEIGHT : 240;
      const width = orientation === "horizontal" ? Math.min(rect.right - rect.left - 24, 520) : VERTICAL_WIDTH;
      const centeredX = Math.max(rect.left + 8, Math.round(rect.left + (rect.right - rect.left - width) / 2));
      const y = Math.round(rect.bottom - height - gap);
      setPos(prev => {
        if (!prev) return { x: centeredX, y: Math.max(rect.top, y) };
        // Mobile: always snap Y to just-above-keyboard so the toolbar
        // visually travels with the keyboard. Keep X where the user
        // dragged, but re-clamp it against the current usable rect
        // (dialog resize, orientation change, keyboard resize).
        if (isMobile) {
          const maxX = Math.max(rect.left, rect.right - width);
          return {
            x: Math.max(rect.left, Math.min(maxX, prev.x)),
            y: Math.max(rect.top, y),
          };
        }
        // Desktop: preserve user-dragged position (existing behaviour).
        return prev;
      });
    };
    place();
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    window.addEventListener("orientationchange", place);
    return () => {
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
      window.removeEventListener("orientationchange", place);
    };
  }, [isOpen, orientation, isMobile, getUsableRect]);

  // ------ Drag by grip only ------
  // Uses pointer capture on the handle itself, so pointermove/pointerup
  // are guaranteed to fire on the handle even if the finger leaves its
  // bounds. All coordinates come from the SAME pointer event stream,
  // eliminating the "different pointer ids" jump artefact that produced
  // the wig-out.
  const onGripPointerDown = useCallback((e) => {
    if (!pos) return;
    e.preventDefault();
    e.stopPropagation();
    const handleEl = e.currentTarget;
    // Toolbar bbox — needed for containment so we clamp the whole box,
    // not just the top-left corner.
    const toolbarEl = handleEl.closest('[data-testid="floating-rte-toolbar"]');
    const tbRect = toolbarEl?.getBoundingClientRect();
    const tbW = tbRect ? tbRect.width : 100;
    const tbH = tbRect ? tbRect.height : 44;
    try { handleEl.setPointerCapture?.(e.pointerId); } catch {}
    dragStateRef.current = {
      dragging: true,
      pointerId: e.pointerId,
      offX: e.clientX - pos.x,
      offY: e.clientY - pos.y,
      tbW,
      tbH,
    };
    const move = (ev) => {
      if (!dragStateRef.current.dragging) return;
      if (ev.pointerId !== dragStateRef.current.pointerId) return;
      const cx = ev.clientX;
      const cy = ev.clientY;
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const rect = getUsableRect();
        const w = dragStateRef.current.tbW;
        const h = dragStateRef.current.tbH;
        // Clamp the ENTIRE toolbar bounding box inside the usable rect.
        // If the toolbar is wider/taller than the rect (unusual, tiny
        // dialogs), pin to the top-left corner rather than producing NaN.
        const maxX = Math.max(rect.left, rect.right - w);
        const maxY = Math.max(rect.top, rect.bottom - h);
        const nextX = Math.max(rect.left, Math.min(maxX, cx - dragStateRef.current.offX));
        const nextY = Math.max(rect.top,  Math.min(maxY, cy - dragStateRef.current.offY));
        setPos({ x: nextX, y: nextY });
      });
    };
    const end = (ev) => {
      if (ev.pointerId !== dragStateRef.current.pointerId) return;
      dragStateRef.current.dragging = false;
      dragStateRef.current.pointerId = null;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      try { handleEl.releasePointerCapture?.(ev.pointerId); } catch {}
      handleEl.removeEventListener("pointermove", move);
      handleEl.removeEventListener("pointerup", end);
      handleEl.removeEventListener("pointercancel", end);
    };
    handleEl.addEventListener("pointermove", move);
    handleEl.addEventListener("pointerup", end);
    handleEl.addEventListener("pointercancel", end);
  }, [pos, getUsableRect]);

  // ------ Tool actions — REAL rich text, no Markdown fallback ------
  const stub = (name) => () => toast.info(`${name} — coming in a follow-up`, { duration: 1800 });

  // Unified format entry point. `format` is a semantic key
  // ("bold" | "italic" | "underline" | "strike" | "h1" | "h2" | "h3"
  //  | "ul" | "ol" | "checklist" | "undo" | "redo")
  // Branches on the live editor kind:
  //   • <textarea>       → promote note to HTML with real tags.
  //   • contentEditable  → native execCommand.
  const applyFormat = useCallback((format) => {
    const editor = findActiveEditor();
    if (!editor) return;

    if (editor.tagName === "TEXTAREA") {
      // Fix E.2 — the textarea branch reads selectionStart / End from
      // the stash because Android touchstart may have blurred the
      // textarea before `click` fires. Textareas preserve those offsets
      // across focus loss, but only on the element that owned the
      // selection — so if focus has drifted elsewhere the live editor
      // may be undefined. Prefer the stashed editor + offsets when they
      // match the resolved editor.
      if (SELECTION_STASH.editor === editor && SELECTION_STASH.range === null) {
        try {
          editor.focus();
          editor.setSelectionRange(SELECTION_STASH.start, SELECTION_STASH.end);
        } catch { /* noop */ }
      }
      // Promote helpers now return a selection-restoration mode string
      // ("range" | "collapsed-end") instead of a plain boolean — see Fix B
      // (preserve selection across textarea→HTML mount swap). We forward
      // that mode to focusHtmlEditorSoon so H1 → H2 → H3 chaining and
      // consecutive inline formats stop misfiring on the Edit Text path.
      let mode = false;
      if (INLINE_TAG[format]) mode = promoteTextareaWithInlineFormat(editor, format);
      else if (BLOCK_TAG[format]) mode = promoteTextareaWithBlockFormat(editor, format);
      else if (format === "undo" || format === "redo") {
        // Native textarea undo/redo is browser-controlled — no-op here.
        toast.info(`${format[0].toUpperCase()}${format.slice(1)} works in HTML mode`, { duration: 1500 });
        return;
      } else if (format === "p") {
        // Already plaintext — "P" is the implicit mode. No-op.
        return;
      } else {
        // Lists, Checklist, Clear-format etc. — require HTML mode. Prompt
        // the user to apply any inline format first (which auto-promotes).
        toast.info("Add some text and select it first", { duration: 1500 });
        return;
      }
      if (mode) focusHtmlEditorSoon(mode);
      return;
    }

    // contentEditable — native execCommand path.
    // Fix E.2 — restore stashed selection if Android touchstart stole
    // focus between pointerdown and click. No-op if the live selection
    // is still intact (desktop + well-behaved mobile paths).
    restoreStashedSelectionIfNeeded(editor);
    const execMap = {
      bold: ["bold"], italic: ["italic"], underline: ["underline"], strike: ["strikeThrough"],
      h1: ["formatBlock", "H1"], h2: ["formatBlock", "H2"], h3: ["formatBlock", "H3"],
      p: ["formatBlock", "P"],
      ul: ["insertUnorderedList"], ol: ["insertOrderedList"],
      clearFormat: ["removeFormat"],
    };
    const history = historyRef.current;
    // Fix I was removed in v194 — the ZWSP-anchored pending marker
    // caused character reordering on Capacitor Android ("Oldb" when the
    // user typed "Bold"). The marker's input-event cleanup fired on
    // every keystroke and mutated the text node under the caret,
    // which Android's text-insertion heuristic interpreted by moving
    // the caret to a sibling anchor. We revert to the simpler path:
    //   • Range selection → wrap with execCommand (strike uses direct
    //     DOM wrap) — unchanged, verified working.
    //   • Collapsed caret → delegate to native execCommand pending-
    //     state. Chrome desktop honours this correctly; Capacitor
    //     Android drops it before the next keystroke so the typed text
    //     comes out plain. That is a lesser bug than character
    //     reordering AND is the baseline Chrome behaviour, not a
    //     regression we introduced. A proper format-first-type path
    //     needs a beforeinput interceptor — scheduled as a follow-up
    //     once we can test incremental iterations on-device.
    // Strikethrough gets a deterministic Range-based wrap (see
    // `wrapSelectionWithTag`). Everything else stays on execCommand so
    // Bold / Italic / Underline / Headings / Lists behave exactly as
    // before.
    //
    // Fix F — toggle behaviour. If the selection already lives inside
    // an existing <s>/<strike>/<del>, re-tapping Strike must REMOVE it
    // instead of wrapping again. We check via `active.strike` (populated
    // by refreshActive's ancestor walk — the same mechanism that lights
    // up the toolbar button) which is the source of truth we already
    // trust elsewhere.
    if (format === "strike") {
      if (history) history.snapshotImmediate(editor);
      if (active.strike) {
        unwrapStrikeAtSelection(editor);
      } else {
        wrapSelectionWithTag(editor, "s");
      }
      if (history) history.snapshotImmediate(editor);
      return;
    }
    // Multi-level undo/redo — custom stack, NOT execCommand. See
    // HistoryStack above for why.
    if (format === "undo" || format === "redo") {
      if (!history) return;
      const entry = format === "undo" ? history.undo() : history.redo();
      if (!entry) {
        toast.info(format === "undo" ? "Nothing to undo" : "Nothing to redo", { duration: 1200 });
        return;
      }
      editor.innerHTML = entry.html;
      restoreSelection(editor, entry.sel);
      // Notify React so NoteModal syncs its state + storage.
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    // Interactive checklist — real UL with class + per-LI data-ir-check.
    // We let execCommand build the <ul><li> skeleton, then upgrade it.
    if (format === "checklist") {
      if (history) history.snapshotImmediate(editor);
      runExecCommand(editor, "insertUnorderedList");
      // Find the UL that now contains the caret and upgrade it.
      try {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          let node = sel.getRangeAt(0).startContainer;
          while (node && node !== editor && node.nodeName !== "UL") node = node.parentNode;
          if (node && node.nodeName === "UL") {
            node.classList.add("ir-checklist");
            node.querySelectorAll(":scope > li").forEach((li) => {
              if (!li.hasAttribute("data-ir-check")) li.setAttribute("data-ir-check", "0");
            });
            editor.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      } catch { /* noop */ }
      if (history) history.snapshotImmediate(editor);
      return;
    }
    const spec = execMap[format];
    if (spec) {
      if (history) history.snapshotImmediate(editor);
      runExecCommand(editor, spec[0], spec[1] ?? null);
      // Fix G — defensive cleanup after formatBlock. Some Capacitor
      // Android WebView builds emit `<h1><strong>text</strong></h1>`
      // (or wrap the heading in <strong>) when `document.execCommand(
      // "formatBlock", "H1")` runs on a paragraph whose containing block
      // had any residual Bold pending-state. Desktop Chrome produces a
      // clean `<h1>text</h1>` so this didn't surface in the preview
      // tests. The user reported this exact symptom from on-device
      // testing ("H1 looks bold and the Bold button lights up").
      //
      // We only run this cleanup for the three heading commands, so
      // nothing else (Bold / Italic / Underline / Strike / Lists /
      // Clear-format) is affected. Inside the resulting heading we
      // unwrap any direct <b> or <strong> whose text content equals
      // the entire heading's text — that signature matches a "wrap
      // whole heading in redundant inline bold" state and never
      // matches a user-intentional partial-word bold inside a heading,
      // which would have a shorter textContent.
      if (format === "h1" || format === "h2" || format === "h3") {
        try {
          const headingTag = (BLOCK_TAG[format] || "").toUpperCase();
          // Find all headings in the editor; cleanup is cheap and
          // scoped by selector so other blocks are untouched.
          editor.querySelectorAll("h1,h2,h3").forEach((h) => {
            if (h.tagName !== headingTag) return;
            const headingText = (h.textContent || "").trim();
            if (!headingText) return;
            // Walk direct inline-bold children only; a nested word-
            // level bold would be deeper (e.g. inside a text run) and
            // thus not a direct child.
            Array.from(h.children).forEach((child) => {
              const t = child.tagName;
              if (t !== "B" && t !== "STRONG") return;
              const childText = (child.textContent || "").trim();
              // Only unwrap when the <strong> covers the whole heading
              // — that's the signature of unintentional/emitted bold.
              if (childText !== headingText) return;
              while (child.firstChild) h.insertBefore(child.firstChild, child);
              h.removeChild(child);
            });
          });
          editor.dispatchEvent(new Event("input", { bubbles: true }));
        } catch { /* noop — leave the DOM as execCommand produced it */ }
      }
      if (history) history.snapshotImmediate(editor);
    }
  }, [active.strike]);

  // Line break (§12) — inserts a <br> at caret without starting a new
  // paragraph/block, distinct from pressing Return which commits to the
  // next <p>.
  const insertLineBreak = useCallback(() => {
    const editor = findActiveEditor();
    if (!editor) return;
    if (editor.tagName === "TEXTAREA") {
      // Plain mode: insert a newline character at caret.
      const start = editor.selectionStart ?? 0;
      const end = editor.selectionEnd ?? 0;
      const next = editor.value.slice(0, start) + "\n" + editor.value.slice(end);
      reactSetValue(editor, next);
      editor.setSelectionRange(start + 1, start + 1);
      return;
    }
    const history = historyRef.current;
    if (history) history.snapshotImmediate(editor);
    runExecCommand(editor, "insertLineBreak");
    if (history) history.snapshotImmediate(editor);
  }, []);

  // Copy (§14) — current selection, falls back to the whole editor if
  // nothing is selected. Writes HTML and plaintext to the clipboard so
  // rich-text destinations keep formatting.
  const doCopy = useCallback(async () => {
    const editor = findActiveEditor();
    if (!editor) return;
    const sel = window.getSelection && window.getSelection();
    let html = "", text = "";
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const container = document.createElement("div");
      container.appendChild(range.cloneContents());
      html = container.innerHTML;
      text = container.textContent || "";
    } else {
      html = editor.innerHTML || editor.value || "";
      text = editor.textContent || editor.value || "";
    }
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([text], { type: "text/plain" }),
        })]);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        document.execCommand("copy");
      }
      toast.success("Copied", { duration: 1000 });
    } catch {
      toast.error("Copy blocked by the browser", { duration: 1500 });
    }
  }, []);

  // Paste (§15) — reads clipboard and inserts at caret. Prefers HTML
  // (sanitized) when available, falls back to plaintext.
  const doPaste = useCallback(async () => {
    const editor = findActiveEditor();
    if (!editor) return;
    try {
      let html = "", text = "";
      if (navigator.clipboard && navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            if (item.types.includes("text/html") && !html) {
              const blob = await item.getType("text/html");
              html = await blob.text();
            }
            if (item.types.includes("text/plain") && !text) {
              const blob = await item.getType("text/plain");
              text = await blob.text();
            }
          }
        } catch { /* permission denied — fall back below */ }
      }
      if (!text && navigator.clipboard?.readText) {
        try { text = await navigator.clipboard.readText(); } catch { /* ignore */ }
      }
      if (!html && !text) {
        toast.error("Clipboard permission denied", { duration: 1500 });
        return;
      }
      const history = historyRef.current;
      if (editor.tagName === "TEXTAREA") {
        const start = editor.selectionStart ?? 0;
        const end = editor.selectionEnd ?? 0;
        const next = editor.value.slice(0, start) + (text || "") + editor.value.slice(end);
        reactSetValue(editor, next);
        editor.setSelectionRange(start + text.length, start + text.length);
      } else {
        if (history) history.snapshotImmediate(editor);
        if (html) {
          runExecCommand(editor, "insertHTML", sanitizeHtml(html));
        } else {
          runExecCommand(editor, "insertText", text);
        }
        if (history) history.snapshotImmediate(editor);
      }
    } catch {
      toast.error("Paste failed", { duration: 1500 });
    }
  }, []);

  // Export current note as PDF (§18) via the browser's print pipeline.
  // Opens a hidden iframe populated with the note's HTML + minimal
  // styling, then calls `print()`. User picks "Save as PDF" in the
  // native print dialog. Zero new dependencies, works offline.
  const exportPdf = useCallback(() => {
    const editor = findActiveEditor();
    if (!editor) return;
    const html = editor.tagName === "TEXTAREA"
      ? plainTextToHtml(editor.value || "")
      : (editor.innerHTML || "");
    const titleEl =
      document.querySelector('[data-testid="note-title-input"]') ||
      document.querySelector('[data-testid="fullscreen-title-input"]');
    const title = titleEl?.value || "Note";
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Pop-up blocked — allow pop-ups and try again", { duration: 2500 });
      return;
    }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title.replace(/</g, "&lt;")}</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; color: #000; padding: 2rem; max-width: 7in; margin: auto; line-height: 1.5; }
  h1 { font-size: 2em; margin: 0.8em 0 0.4em; }
  h2 { font-size: 1.5em; margin: 0.7em 0 0.3em; }
  h3 { font-size: 1.2em; margin: 0.6em 0 0.2em; }
  p  { margin: 0.4em 0; }
  ul, ol { margin: 0.4em 0 0.4em 1.5em; }
  ul.ir-checklist { list-style: none; padding-left: 0; }
  ul.ir-checklist > li { padding-left: 1.5em; position: relative; }
  ul.ir-checklist > li::before { content: "☐"; position: absolute; left: 0; }
  ul.ir-checklist > li[data-ir-check="1"]::before { content: "☑"; }
  ul.ir-checklist > li[data-ir-check="1"] { opacity: 0.65; text-decoration: line-through; }
  a { color: #0366d6; }
  @media print { @page { margin: 0.6in; } }
</style></head><body><h1>${title.replace(/</g, "&lt;")}</h1>${sanitizeHtml(html)}</body></html>`);
    w.document.close();
    // Give the new window a moment to lay out before invoking print.
    setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 250);
  }, []);

  const applyLink = useCallback(() => {
    const editor = findActiveEditor();
    if (!editor) return;
    // Figure out whether the user already has a selection; if yes, use
    // the selected text as the link label and only prompt for URL. If
    // no selection, prompt for BOTH label and URL (spec §17).
    let hasSelection = false, selText = "";
    if (editor.tagName === "TEXTAREA") {
      hasSelection = (editor.selectionEnd ?? 0) > (editor.selectionStart ?? 0);
      if (hasSelection) selText = editor.value.slice(editor.selectionStart, editor.selectionEnd);
    } else {
      const sel = window.getSelection && window.getSelection();
      if (sel && sel.rangeCount && !sel.isCollapsed) {
        hasSelection = true; selText = sel.toString();
      }
    }
    let label = selText;
    if (!hasSelection) {
      label = window.prompt("Link text") || "";
      if (!label) return;
    }
    const url = window.prompt("Enter URL", "https://");
    if (!url) return;
    const safeUrl = url.replace(/"/g, "&quot;");
    const history = historyRef.current;
    if (editor.tagName === "TEXTAREA") {
      const start = editor.selectionStart ?? 0;
      const end = editor.selectionEnd ?? 0;
      const value = editor.value || "";
      const before = value.slice(0, start);
      const after = value.slice(end);
      const marked = before + MARK_OPEN + label + MARK_CLOSE + after;
      let html = plainTextToHtml(marked);
      html = html.split(MARK_OPEN).join(`<a href="${safeUrl}">`).split(MARK_CLOSE).join("</a>");
      reactSetValue(editor, html);
      focusHtmlEditorSoon();
      return;
    }
    if (history) history.snapshotImmediate(editor);
    if (hasSelection) {
      runExecCommand(editor, "createLink", url);
    } else {
      // Insert new <a>text</a> at caret.
      runExecCommand(editor, "insertHTML", `<a href="${safeUrl}">${label.replace(/</g, "&lt;")}</a>`);
    }
    if (history) history.snapshotImmediate(editor);
  }, []);

  const applyImage = useCallback(() => {
    const src = window.prompt("Image URL (public link)");
    if (!src) return;
    const editor = findActiveEditor();
    if (!editor) return;
    if (editor.tagName === "TEXTAREA") {
      toast.info("Add some text first, then insert image in Format mode", { duration: 1800 });
      return;
    }
    runExecCommand(editor, "insertImage", src);
  }, []);

  // ------ Tool descriptor list ------
  const groups = useMemo(() => [
    {
      label: "text",
      tools: [
        // Aa — "clear inline formatting" at the current selection.
        // Does NOT touch headings (which are block-level); applies to
        // Bold/Italic/Underline/Strike inside the selection.
        { id: "aa", icon: CaseSensitive, title: "Aa — clear inline format", onClick: () => applyFormat("clearFormat") },
        { id: "p",  icon: Pilcrow, title: "Paragraph", onClick: () => applyFormat("p") },
        { id: "h1", icon: Heading1, title: "Heading 1", onClick: () => applyFormat("h1") },
        { id: "h2", icon: Heading2, title: "Heading 2", onClick: () => applyFormat("h2") },
        { id: "h3", icon: Heading3, title: "Heading 3", onClick: () => applyFormat("h3") },
        { id: "bold", icon: Bold, title: "Bold", onClick: () => applyFormat("bold") },
        { id: "italic", icon: Italic, title: "Italic", onClick: () => applyFormat("italic") },
        { id: "underline", icon: Underline, title: "Underline", onClick: () => applyFormat("underline") },
        { id: "strike", icon: Strikethrough, title: "Strikethrough", onClick: () => applyFormat("strike") },
        { id: "color", icon: Palette, title: "Text color", stub: true },
        { id: "highlight", icon: Highlighter, title: "Highlight", stub: true },
        { id: "br", icon: CornerDownLeft, title: "Line break", onClick: insertLineBreak },
      ],
    },
    {
      label: "lists",
      tools: [
        { id: "align", icon: AlignLeft, title: "Alignment", stub: true },
        { id: "wrap", icon: WrapText, title: "Wrap", stub: true },
        { id: "ul", icon: List, title: "Bulleted list", onClick: () => applyFormat("ul") },
        { id: "ol", icon: ListOrdered, title: "Numbered list", onClick: () => applyFormat("ol") },
        { id: "checklist", icon: ListChecks, title: "Checklist", onClick: () => applyFormat("checklist") },
      ],
    },
    {
      label: "history",
      tools: [
        { id: "undo", icon: Undo2, title: "Undo", onClick: () => applyFormat("undo") },
        { id: "redo", icon: Redo2, title: "Redo", onClick: () => applyFormat("redo") },
        { id: "cut", icon: Scissors, title: "Cut", stub: true },
        { id: "copy", icon: Copy, title: "Copy", onClick: doCopy },
        { id: "paste", icon: ClipboardPaste, title: "Paste", onClick: doPaste },
      ],
    },
    {
      label: "insert",
      tools: [
        { id: "link", icon: LinkIcon, title: "Insert link", onClick: applyLink },
        { id: "image", icon: ImageIcon, title: "Insert image", onClick: applyImage },
        { id: "hierarchy", icon: Network, title: "🌳 Hierarchy", onClick: () => setPickerOpen("hierarchy"), accent: true },
        { id: "insert-form", icon: ClipboardList, title: "Insert Form", onClick: () => setPickerOpen("forms"), accent: true },
      ],
    },
    {
      label: "capture",
      tools: [
        { id: "scan", icon: ScanLine, title: "Scan", stub: true },
        { id: "camera", icon: Camera, title: "Camera", stub: true },
        { id: "voice", icon: Mic, title: "Voice-to-text", stub: true },
        { id: "pdf", icon: FileText, title: "Export PDF", onClick: exportPdf },
        { id: "print", icon: Printer, title: "Print", stub: true },
        { id: "share", icon: Share2, title: "Share", stub: true },
      ],
    },
  ], [applyFormat, applyLink, applyImage, insertLineBreak, doCopy, doPaste, exportPdf]);

  // Container-level `onClick` swallow ONLY. Earlier iterations also
  // swallowed pointerdown / mousedown / touchstart here to keep taps in
  // the gap gutters from leaking to elements underneath — but since we
  // portal to document.body with an explicit top z-index and the
  // container itself is opaque to pointer events (`pointerEvents:auto`),
  // the browser's hit test already routes every event in the toolbar
  // rect to the toolbar. Calling `stopPropagation` on `pointerdown` /
  // `touchstart` inside a scroll container can prevent Chromium and
  // WebKit's compositor from claiming the pointer stream for native
  // panning, which is exactly what was killing the tool-strip scroll
  // gesture on-device. So we keep just `onClick` swallow — a bubble-
  // phase click still fires AFTER the child button's own onClick, so it
  // never blocks legitimate button taps, but it prevents any stray
  // click on a gap gutter from bubbling out.
  const swallow = useCallback((e) => { e.stopPropagation(); }, []);

  if (!isOpen || !pos) return null;
  // Mobile visibility gate: only show when the Expanded Text Editor is
  // focused AND the on-screen keyboard is up. Desktop is unaffected.
  if (isMobile && (!editorFocused || !keyboardUp)) return null;

  // ------ Styling ------
  const isH = orientation === "horizontal";
  const glass = isDark
    ? "bg-black/55 backdrop-blur-md border-white/10"
    : "bg-white/70 backdrop-blur-md border-gray-300/70";
  const accentBorder = "ring-1 ring-orange-500/60";
  const iconColor = "text-orange-400";
  const stubColor = isDark ? "text-slate-500/70" : "text-slate-400/80";

  // Fix C — map a tool-id → the key on `active` state that governs its
  // highlight. Any id missing from this map is a non-highlightable tool
  // (undo/redo/copy/paste/link/image/etc.) and simply never activates.
  // Blocks (p/h1/h2/h3) read from `active.block`.
  const isToolActive = (id) => {
    switch (id) {
      case "bold": return !!active.bold;
      case "italic": return !!active.italic;
      case "underline": return !!active.underline;
      case "strike": return !!active.strike;
      case "p": return active.block === "P";
      case "h1": return active.block === "H1";
      case "h2": return active.block === "H2";
      case "h3": return active.block === "H3";
      case "link": return !!active.link;
      default: return false;
    }
  };

  const containerStyle = {
    left: pos.x,
    top: pos.y,
    position: "fixed",
    // z-index 2147483000 — sits above Radix Dialog portals (2147483647
    // reserved for browser UI) but stays comfortably below system chrome.
    // We portal to document.body below, but keep the explicit z-index so
    // stacking is deterministic if a future ancestor introduces a new
    // stacking context.
    zIndex: 2147483000,
    maxWidth: isH ? "calc(100vw - 24px)" : undefined,
    maxHeight: isH ? undefined : "calc(100vh - 24px)",
    // touchAction on the container is deliberately `auto` — the three
    // interaction zones each declare their own touch-action:
    //   • drag handle → `none`      (drag captures the pointer)
    //   • tool scroller → `pan-x`   (horizontal panning only)
    //   • buttons     → `manipulation` (fast tap, no double-tap zoom)
    // Setting `none` at the container would intersect with descendants
    // per the touch-action spec and defeat the scroller.
    touchAction: "auto",
    // Guarantee the toolbar is opaque to pointer events end-to-end so
    // taps in the ~4-6px gaps between icon buttons don't fall through
    // to the editor / modal buttons beneath.
    pointerEvents: "auto",
  };

  const toolbar = (
    <>
      <div
        data-testid="floating-rte-toolbar"
        className={`select-none flex ${isH ? "flex-row" : "flex-col"} items-stretch rounded-2xl border ${glass} ${accentBorder} shadow-2xl`}
        style={containerStyle}
        onClick={swallow}
      >
        {/* Fixed CONTROL ZONE — drag handle + orientation, ALWAYS at the
            leading edge (top in vertical, left in horizontal). Sits
            OUTSIDE the scrollable tool strip so it never scrolls away. */}
        <div
          data-testid="floating-rte-controls"
          className={`shrink-0 flex ${isH ? "flex-row" : "flex-col"} items-stretch ${isH ? "rounded-l-2xl border-r" : "rounded-t-2xl border-b"} ${isDark ? "border-white/10 bg-white/5" : "border-gray-300 bg-white/40"}`}
        >
          {/* Drag handle (☰) — the ONLY area used to reposition the toolbar. */}
          <button
            type="button"
            data-testid="floating-rte-drag-handle"
            onPointerDown={onGripPointerDown}
            onMouseDown={(e) => e.preventDefault()}
            aria-label="Move toolbar"
            className={`shrink-0 flex items-center justify-center w-10 h-11`}
            style={{ touchAction: "none", cursor: "grab" }}
          >
            <Menu size={18} className={isDark ? "text-slate-300" : "text-slate-700"} />
          </button>
          {/* Divider between handle and orientation control */}
          <div className={`${isH ? "w-px h-6 self-center" : "h-px w-6 self-center"} ${isDark ? "bg-white/10" : "bg-gray-300"}`} />
          {/* Orientation control — two-arrow icon indicating the target
              orientation. Horizontal shows ↕ (tap to go vertical),
              vertical shows ↔ (tap to go horizontal). NEVER a refresh
              icon. */}
          <button
            type="button"
            data-testid="floating-rte-rotate"
            // Fix A — mobile tap-focus theft. onMouseDown.preventDefault
            // alone is insufficient on Android Chrome: touchstart (and
            // the pointerdown that mirrors it) transfer focus BEFORE
            // mousedown fires. Adding onPointerDown.preventDefault moves
            // the focus-theft block earlier in the event sequence so the
            // editor's selection survives the tap. The browser still
            // dispatches `click` after pointerup, so onClick fires
            // normally on both touch and mouse paths.
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setOrientation(o => o === "horizontal" ? "vertical" : "horizontal")}
            aria-label={isH ? "Switch to vertical toolbar" : "Switch to horizontal toolbar"}
            style={{ touchAction: "manipulation" }}
            className={`shrink-0 flex items-center justify-center w-10 h-11 hover:bg-white/10 active:scale-95 transition`}
          >
            {isH
              ? <ArrowUpDown    size={16} className={isDark ? "text-slate-300" : "text-slate-700"} />
              : <ArrowLeftRight size={16} className={isDark ? "text-slate-300" : "text-slate-700"} />}
          </button>
        </div>

        {/* Scrollable tool row — its own gesture zone.
            `touch-action: pan-x` (horizontal) / `pan-y` (vertical) lets the
            browser natively handle finger-scrolling here WITHOUT stealing
            drag from the handle in the control zone.

            CRITICAL sizing note: the scroller MUST have `flex-1` and
            `min-w-0` / `min-h-0` in its cross-axis, otherwise the flex
            algorithm sizes it to fit its ~1000px of tool content and
            `overflow-*: auto` has no viewport to overflow against — the
            container just grows off-screen instead of scrolling. Also
            constrain the main-axis dimension so the browser has a
            fixed-size viewport to pan against. */}
        <div
          ref={scrollerRef}
          data-testid="floating-rte-scroller"
          className={`flex ${isH
            ? "flex-row overflow-x-auto overflow-y-hidden min-w-0"
            : "flex-col overflow-y-auto overflow-x-hidden min-h-0"} flex-1`}
          style={{
            scrollbarWidth: "thin",
            WebkitOverflowScrolling: "touch",
            padding: 4,
            touchAction: isH ? "pan-x" : "pan-y",
            overscrollBehavior: "contain",
            // Explicit main-axis cap. Without this, the scroller can still
            // report its scrollWidth as its clientWidth on some engines
            // (Safari) and refuse to scroll. flex-1 sets flex-basis:0 so
            // the scroller stretches to fill remaining space in the
            // toolbar — that IS its viewport for overflow.
            ...(isH ? { maxWidth: "100%" } : { maxHeight: "100%" }),
          }}
        >
          {groups.map((g, gi) => (
            <div
              key={g.label}
              className={`flex ${isH ? "flex-row items-center" : "flex-col items-center"} shrink-0`}
              data-testid={`floating-rte-group-${g.label}`}
            >
              {g.tools.map((t) => {
                const Icon = t.icon;
                const handle = t.onClick || stub(t.title);
                const activeNow = isToolActive(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`floating-rte-btn-${t.id}`}
                    data-active={activeNow ? "true" : "false"}
                    title={t.title}
                    // Fix A — mobile tap-focus theft. See the rotate
                    // button above for the full rationale. In short:
                    // pointerdown fires BEFORE focus transfer on Android
                    // Chrome, so preventing default there is what keeps
                    // the editor's selection alive for the subsequent
                    // execCommand / wrap / promote operation.
                    //
                    // Fix E.2 — belt-and-suspenders: stash the editor's
                    // current selection synchronously here, BEFORE any
                    // compatibility event has a chance to collapse it.
                    // `applyFormat` restores from the stash if the live
                    // selection has drifted by the time `click` fires.
                    onPointerDown={(e) => {
                      stashSelection();
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      stashSelection();
                      e.preventDefault();
                    }}
                    onClick={handle}
                    style={{ touchAction: "manipulation" }}
                    // Fix C — active-state highlight. When the caret is
                    // inside a run of this format, the button gets a
                    // solid orange ring + tinted background so the user
                    // can see at a glance which formats are already
                    // applied. `t.accent` (static per-tool accent for
                    // Hierarchy / Insert Form) is preserved as a
                    // fallback for tools that are never "active".
                    className={`shrink-0 w-9 h-9 mx-0.5 my-0.5 rounded-lg flex items-center justify-center ${
                      activeNow
                        ? "ring-2 ring-orange-500 bg-orange-500/15"
                        : (t.accent ? "ring-1 ring-orange-500/50" : "")
                    } hover:bg-white/10 active:scale-95 transition`}
                  >
                    <Icon size={16} className={t.stub ? stubColor : iconColor} />
                  </button>
                );
              })}
              {gi < groups.length - 1 && (
                <div className={`${isH ? "w-px h-6 mx-1" : "h-px w-6 my-1"} ${isDark ? "bg-white/10" : "bg-gray-300"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ---- Forms Pack picker (read-only preview) ---- */}
      {pickerOpen === "forms" && (
        <div className="fixed inset-0 z-[2147483001] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={() => setPickerOpen(null)}>
          <div
            className={`w-full max-w-md rounded-2xl border ${isDark ? "bg-slate-900 border-white/10 text-slate-100" : "bg-white border-gray-200 text-slate-900"} p-4`}
            onClick={(e) => e.stopPropagation()}
            data-testid="floating-rte-forms-picker"
          >
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList size={18} className="text-orange-400" />
              <h3 className="text-base font-semibold">Insert Form</h3>
            </div>
            <p className={`text-xs mb-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
              Live from your Tile / Forms Packs. Insertion lands in Module 2.
            </p>
            <div className="max-h-72 overflow-y-auto -mx-1">
              {FormsPackAdapter.listPacks().map(p => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`floating-rte-forms-pack-${p.id}`}
                  onClick={() => toast.info(`"${p.name}" — insertion arrives with Module 2`, { duration: 2000 })}
                  className={`w-full text-left px-3 py-2 mx-1 rounded-lg flex items-center gap-2 hover:bg-white/5`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.accent }} />
                  <span className="text-sm">{p.name}</span>
                  <span className={`ml-auto text-[10px] ${isDark ? "text-slate-500" : "text-slate-500"}`}>{p.tileCount} tiles</span>
                </button>
              ))}
              {FormsPackAdapter.listPacks().length === 0 && (
                <div className={`text-sm text-center py-6 ${isDark ? "text-slate-500" : "text-slate-500"}`}>No Forms Packs available.</div>
              )}
            </div>
            <div className="flex justify-end mt-3">
              <button
                type="button"
                data-testid="floating-rte-forms-picker-close"
                onClick={() => setPickerOpen(null)}
                className="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/15"
              >Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Hierarchy picker (read-only preview) ---- */}
      {pickerOpen === "hierarchy" && (
        <HierarchyPreviewDialog isDark={isDark} onClose={() => setPickerOpen(null)} />
      )}
    </>
  );

  // Portal to document.body so the toolbar escapes NoteModal's Radix
  // Dialog stacking context. Without this, the modal's transformed /
  // isolated content wrapper becomes the toolbar's containing block for
  // z-index purposes, which is exactly what allowed underlying editor
  // controls to swallow taps intended for the toolbar.
  if (typeof document === "undefined") return toolbar;
  return createPortal(toolbar, document.body);
}

// --------------------------------------------------------------------------
// Hierarchy preview — reads notes from IndexedDB in read-only mode and
// projects the live tree via HierarchyAdapter.buildTree.  No writes.
// --------------------------------------------------------------------------
function HierarchyPreviewDialog({ isDark, onClose }) {
  const [tree, setTree] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const { StorageService } = await import("../../storage/storageService");
        const notes = await StorageService.getAllNotes();
        setTree(HierarchyAdapter.buildTree(notes));
      } catch {
        setTree([]);
      }
    })();
  }, []);

  const renderNode = (node, depth = 0) => (
    <div key={`${depth}-${node.name}`} className="text-sm">
      <div
        className="flex items-center gap-2 py-1"
        style={{ paddingLeft: depth * 14 }}
        data-testid={`floating-rte-hierarchy-node-${node.name}`}
      >
        <Network size={12} className="text-orange-400 shrink-0" />
        <span>{node.name}</span>
      </div>
      {node.children.map(child => renderNode(child, depth + 1))}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`w-full max-w-md rounded-2xl border ${isDark ? "bg-slate-900 border-white/10 text-slate-100" : "bg-white border-gray-200 text-slate-900"} p-4`}
        onClick={(e) => e.stopPropagation()}
        data-testid="floating-rte-hierarchy-picker"
      >
        <div className="flex items-center gap-2 mb-3">
          <Network size={18} className="text-orange-400" />
          <h3 className="text-base font-semibold">Hierarchy Preview</h3>
        </div>
        <p className={`text-xs mb-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
          Live categories from your notes. Placement lands in Module 2.
        </p>
        <div className="max-h-72 overflow-y-auto -mx-1 pl-1">
          {tree === null && <div className="text-xs opacity-70 py-4 text-center">Loading…</div>}
          {tree && tree.length === 0 && <div className="text-xs opacity-70 py-4 text-center">No categories yet.</div>}
          {tree && tree.map(node => renderNode(node))}
        </div>
        <div className="flex justify-end mt-3">
          <button
            type="button"
            data-testid="floating-rte-hierarchy-picker-close"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm bg-white/10 hover:bg-white/15"
          >Close</button>
        </div>
      </div>
    </div>
  );
}
