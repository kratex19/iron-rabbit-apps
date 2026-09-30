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
  Heading1, Heading2, Heading3, Type,
  Bold, Italic, Underline, Strikethrough,
  List, ListOrdered, ListChecks,
  Undo2, Redo2,
  Link as LinkIcon, Image as ImageIcon,
  Network, ClipboardList,
  // Stubbed set
  AlignLeft, Palette, Highlighter, Scissors, Copy, ClipboardPaste,
  ScanLine, Camera, Mic, FileText, Printer, Share2,
} from "lucide-react";
import { FormsPackAdapter, HierarchyAdapter } from "./adapters";
import { plainTextToHtml } from "../../utils/htmlSanitize";

// --------------------------------------------------------------------------
// Small helper — find the active editor element (contentEditable or
// textarea) associated with NoteModal.  We probe the DOM instead of taking
// a ref prop so the toolbar remains 100% removable without editing
// NoteModal's internal state shape.
// --------------------------------------------------------------------------
function findActiveEditor() {
  const active = document.activeElement;
  if (active && (active.isContentEditable || active.tagName === "TEXTAREA")) {
    if (
      active.getAttribute("data-testid") === "note-content-input-html" ||
      active.getAttribute("data-testid") === "note-content-input"
    ) {
      return active;
    }
  }
  // Fallback: whichever NoteModal element is currently mounted.
  return (
    document.querySelector('[data-testid="note-content-input-html"]') ||
    document.querySelector('[data-testid="note-content-input"]') ||
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
    if (editor && typeof editor.focus === "function") editor.focus();
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
function wrapSelectionWithTag(editor, tagName) {
  if (!editor) return false;
  try { editor.focus(); } catch {}
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

function promoteTextareaWithInlineFormat(editor, format) {
  const tag = INLINE_TAG[format];
  if (!tag) return false;
  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  if (start === end) {
    toast.info("Select text to format", { duration: 1500 });
    return false;
  }
  const value = editor.value || "";
  const before = value.slice(0, start);
  const middle = value.slice(start, end);
  const after = value.slice(end);
  const marked = before + MARK_OPEN + middle + MARK_CLOSE + after;
  let html = plainTextToHtml(marked);
  html = html.split(MARK_OPEN).join(`<${tag}>`).split(MARK_CLOSE).join(`</${tag}>`);
  reactSetValue(editor, html);
  return true;
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
  if (!line.trim()) {
    toast.info("Type on a line first", { duration: 1500 });
    return false;
  }
  const marked = before + MARK_OPEN + line + MARK_CLOSE + after;
  let html = plainTextToHtml(marked);
  html = html.split(MARK_OPEN).join(`<${tag}>`).split(MARK_CLOSE).join(`</${tag}>`);
  reactSetValue(editor, html);
  return true;
}

// Refocus the freshly-mounted contentEditable after a textarea → HTML
// promotion. Uses two RAFs so React has committed the swap by the time
// we look for the element on real devices.
function focusHtmlEditorSoon() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const el = document.querySelector('[data-testid="note-content-input-html"]');
      if (el && typeof el.focus === "function") el.focus();
    });
  });
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

  // ------------------------------------------------------------------------
  // Mobile-only visibility contract (see Module 1 correction):
  //   1. Hidden until the Expanded Text Editor is focused AND the on-screen
  //      keyboard is up.
  //   2. Y is snapped to just-above-the-keyboard on every visualViewport
  //      change so it visually travels with the keyboard.
  //   3. Hidden again when the editor loses focus or the keyboard closes.
  //   4. Desktop behaviour is unchanged (always shown when open).
  // Scope: ONLY the Expanded Text Editor (i.e. the two `note-content-input*`
  // elements inside NoteModal). Other Tile Packs / editors are untouched.
  // ------------------------------------------------------------------------
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    try { return window.matchMedia("(pointer: coarse)").matches; } catch { return false; }
  }, []);
  const [editorFocused, setEditorFocused] = useState(false);
  const [keyboardUp, setKeyboardUp] = useState(false);

  // Track focus on the two known Expanded Text Editor targets.
  useEffect(() => {
    if (!isOpen) return;
    const isEditorEl = (el) => {
      if (!el || !el.getAttribute) return false;
      const id = el.getAttribute("data-testid");
      return id === "note-content-input-html" || id === "note-content-input";
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
  // the Radix Dialog content rect (Edit Note editor) intersected with
  // the visualViewport (so the on-screen keyboard shrinks the bottom
  // dynamically). Falls back to the layout viewport when the dialog
  // isn't found (e.g. toolbar mounted outside a dialog).
  const getUsableRect = useCallback(() => {
    const vv = window.visualViewport;
    const vvTop = vv?.offsetTop || 0;
    const vvBottom = vv ? vvTop + vv.height : window.innerHeight;
    let left = 0, right = window.innerWidth, top = 0, bottom = window.innerHeight;
    const dialog =
      document.querySelector('[role="dialog"][data-state="open"]') ||
      document.querySelector('[role="dialog"]') ||
      document.querySelector('[data-radix-dialog-content]');
    if (dialog) {
      const r = dialog.getBoundingClientRect();
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
      let ok = false;
      if (INLINE_TAG[format]) ok = promoteTextareaWithInlineFormat(editor, format);
      else if (BLOCK_TAG[format]) ok = promoteTextareaWithBlockFormat(editor, format);
      else if (format === "undo" || format === "redo") {
        // Native textarea undo/redo is browser-controlled — no-op here.
        toast.info(`${format[0].toUpperCase()}${format.slice(1)} works in HTML mode`, { duration: 1500 });
        return;
      } else {
        // Lists etc. — promote whole note to HTML first so subsequent
        // toolbar taps flow through the execCommand path below.
        toast.info("Add some text and select it first", { duration: 1500 });
        return;
      }
      if (ok) focusHtmlEditorSoon();
      return;
    }

    // contentEditable — native execCommand path.
    const execMap = {
      bold: ["bold"], italic: ["italic"], underline: ["underline"], strike: ["strikeThrough"],
      h1: ["formatBlock", "H1"], h2: ["formatBlock", "H2"], h3: ["formatBlock", "H3"],
      undo: ["undo"], redo: ["redo"],
      ul: ["insertUnorderedList"], ol: ["insertOrderedList"], checklist: ["insertUnorderedList"],
    };
    // Strikethrough gets a deterministic Range-based wrap (see
    // `wrapSelectionWithTag`). Everything else stays on execCommand so
    // Bold / Italic / Underline / Headings / Lists / Undo / Redo behave
    // exactly as they did yesterday.
    if (format === "strike") {
      wrapSelectionWithTag(editor, "s");
      return;
    }
    const spec = execMap[format];
    if (spec) runExecCommand(editor, spec[0], spec[1] ?? null);
  }, []);

  const applyLink = useCallback(() => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    const editor = findActiveEditor();
    if (!editor) return;
    if (editor.tagName === "TEXTAREA") {
      // Promote to HTML with the selected/typed URL wrapped in an <a>.
      const start = editor.selectionStart ?? 0;
      const end = editor.selectionEnd ?? 0;
      const value = editor.value || "";
      const label = end > start ? value.slice(start, end) : url;
      const before = value.slice(0, start);
      const after = value.slice(end);
      const marked = before + MARK_OPEN + label + MARK_CLOSE + after;
      let html = plainTextToHtml(marked);
      const safeUrl = url.replace(/"/g, "&quot;");
      html = html.split(MARK_OPEN).join(`<a href="${safeUrl}">`).split(MARK_CLOSE).join("</a>");
      reactSetValue(editor, html);
      focusHtmlEditorSoon();
    } else {
      runExecCommand(editor, "createLink", url);
    }
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
        { id: "aa", icon: Type, title: "Text style", stub: true },
        { id: "h1", icon: Heading1, title: "Heading 1", onClick: () => applyFormat("h1") },
        { id: "h2", icon: Heading2, title: "Heading 2", onClick: () => applyFormat("h2") },
        { id: "h3", icon: Heading3, title: "Heading 3", onClick: () => applyFormat("h3") },
        { id: "bold", icon: Bold, title: "Bold", onClick: () => applyFormat("bold") },
        { id: "italic", icon: Italic, title: "Italic", onClick: () => applyFormat("italic") },
        { id: "underline", icon: Underline, title: "Underline", onClick: () => applyFormat("underline") },
        { id: "strike", icon: Strikethrough, title: "Strikethrough", onClick: () => applyFormat("strike") },
        { id: "color", icon: Palette, title: "Text color", stub: true },
        { id: "highlight", icon: Highlighter, title: "Highlight", stub: true },
      ],
    },
    {
      label: "lists",
      tools: [
        { id: "align", icon: AlignLeft, title: "Alignment", stub: true },
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
        { id: "copy", icon: Copy, title: "Copy", stub: true },
        { id: "paste", icon: ClipboardPaste, title: "Paste", stub: true },
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
        { id: "pdf", icon: FileText, title: "Export PDF", stub: true },
        { id: "print", icon: Printer, title: "Print", stub: true },
        { id: "share", icon: Share2, title: "Share", stub: true },
      ],
    },
  ], [applyFormat, applyLink, applyImage]);

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
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-testid={`floating-rte-btn-${t.id}`}
                    title={t.title}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handle}
                    style={{ touchAction: "manipulation" }}
                    className={`shrink-0 w-9 h-9 mx-0.5 my-0.5 rounded-lg flex items-center justify-center ${t.accent ? "ring-1 ring-orange-500/50" : ""} hover:bg-white/10 active:scale-95 transition`}
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
