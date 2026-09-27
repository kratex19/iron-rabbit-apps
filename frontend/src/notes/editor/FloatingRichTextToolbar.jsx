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
  GripVertical, RotateCw,
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
// Formatting primitives
// --------------------------------------------------------------------------
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

function surroundTextareaSelection(editor, prefix, suffix = prefix) {
  if (!editor || editor.tagName !== "TEXTAREA") return false;
  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  const value = editor.value;
  const before = value.slice(0, start);
  const middle = value.slice(start, end);
  const after = value.slice(end);
  const next = `${before}${prefix}${middle}${suffix}${after}`;
  // React tracks the last-known value on the DOM node. Setting
  // `editor.value = next` directly bypasses React's value-setter, so
  // NoteModal's controlled `onChange` never fires and the underlying
  // note state (and therefore storage) drifts from the DOM.
  // Using the native prototype setter forces React to observe the change
  // via its usual input event pipeline — same mechanism it uses when the
  // user types.
  try {
    const proto = window.HTMLTextAreaElement && window.HTMLTextAreaElement.prototype;
    const desc = proto && Object.getOwnPropertyDescriptor(proto, "value");
    if (desc && typeof desc.set === "function") {
      desc.set.call(editor, next);
    } else {
      editor.value = next;
    }
  } catch {
    editor.value = next;
  }
  editor.dispatchEvent(new Event("input", { bubbles: true }));
  const caret = start + prefix.length + middle.length;
  editor.setSelectionRange(caret, caret);
  editor.focus();
  return true;
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

  // ------ Position: hover just above the on-screen keyboard ------
  useEffect(() => {
    if (!isOpen) return;
    const place = () => {
      // CRITICAL: do NOT clobber Y while the user is dragging the toolbar.
      // Without this gate, `visualViewport.scroll` events fire mid-drag on
      // iOS/Android and the Y snap yanks the toolbar back to the keyboard
      // line, which is what produced the "wig out" oscillation.
      if (dragStateRef.current.dragging) return;
      const vv = window.visualViewport;
      const viewportH = vv ? vv.height : window.innerHeight;
      const viewportW = vv ? vv.width : window.innerWidth;
      const offsetTop = vv?.offsetTop || 0;
      const gap = isMobile ? 4 : 12; // "a few pixels" above the keyboard
      const height = orientation === "horizontal" ? HORIZONTAL_HEIGHT : 240;
      const width = orientation === "horizontal" ? Math.min(viewportW - 24, 520) : VERTICAL_WIDTH;
      const centeredX = Math.max(8, Math.round((viewportW - width) / 2));
      const y = Math.max(48, Math.round(offsetTop + viewportH - height - gap));
      setPos(prev => {
        if (!prev) return { x: centeredX, y };
        // Mobile: always snap Y to just-above-keyboard so the toolbar
        // visually travels with the keyboard. Keep X where the user dragged.
        if (isMobile) return { x: prev.x, y };
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
  }, [isOpen, orientation, isMobile]);

  // ------ Drag by grip only ------
  // Uses pointer capture on the handle itself, so pointermove/pointerup
  // are guaranteed to fire on the handle even if the finger leaves its
  // bounds. All coordinates come from the SAME pointer event stream,
  // eliminating the "different pointer ids" jump artefact that produced
  // the wig-out.
  const rafRef = useRef(0);
  const onGripPointerDown = useCallback((e) => {
    if (!pos) return;
    e.preventDefault();
    e.stopPropagation();
    const handleEl = e.currentTarget;
    try { handleEl.setPointerCapture?.(e.pointerId); } catch {}
    dragStateRef.current = {
      dragging: true,
      pointerId: e.pointerId,
      offX: e.clientX - pos.x,
      offY: e.clientY - pos.y,
    };
    const move = (ev) => {
      if (!dragStateRef.current.dragging) return;
      if (ev.pointerId !== dragStateRef.current.pointerId) return;
      const cx = ev.clientX;
      const cy = ev.clientY;
      // Coalesce with rAF so we don't thrash React on every pointermove.
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setPos({
          x: Math.max(4, Math.min(window.innerWidth - 60, cx - dragStateRef.current.offX)),
          y: Math.max(4, Math.min(window.innerHeight - 60, cy - dragStateRef.current.offY)),
        });
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
    // Bind on the handle (which owns pointer capture) so the stream is
    // atomic — no window-level races with scroll or other pointers.
    handleEl.addEventListener("pointermove", move);
    handleEl.addEventListener("pointerup", end);
    handleEl.addEventListener("pointercancel", end);
  }, [pos]);

  // ------ Tool actions ------
  const stub = (name) => () => toast.info(`${name} — coming in a follow-up`, { duration: 1800 });

  const applyFormat = useCallback((cmd, value = null, mdPrefix = null, mdSuffix = null) => {
    const editor = findActiveEditor();
    if (!editor) return;
    if (editor.tagName === "TEXTAREA" && mdPrefix !== null) {
      surroundTextareaSelection(editor, mdPrefix, mdSuffix ?? mdPrefix);
    } else {
      runExecCommand(editor, cmd, value);
    }
  }, []);

  const applyHeading = useCallback((level) => {
    const editor = findActiveEditor();
    if (!editor) return;
    if (editor.tagName === "TEXTAREA") {
      // Insert markdown-style heading marker at start of current line.
      const hashes = "#".repeat(level) + " ";
      const start = editor.selectionStart ?? 0;
      const value = editor.value;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      editor.value = value.slice(0, lineStart) + hashes + value.slice(lineStart);
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.setSelectionRange(start + hashes.length, start + hashes.length);
      editor.focus();
    } else {
      runExecCommand(editor, "formatBlock", `H${level}`);
    }
  }, []);

  const applyLink = useCallback(() => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    applyFormat("createLink", url, `[`, `](${url})`);
  }, [applyFormat]);

  const applyImage = useCallback(() => {
    const src = window.prompt("Image URL (public link)");
    if (!src) return;
    applyFormat("insertImage", src, `![image](`, `)`);
  }, [applyFormat]);

  // ------ Tool descriptor list ------
  const groups = useMemo(() => [
    {
      label: "text",
      tools: [
        { id: "aa", icon: Type, title: "Text style", stub: true },
        { id: "h1", icon: Heading1, title: "Heading 1", onClick: () => applyHeading(1) },
        { id: "h2", icon: Heading2, title: "Heading 2", onClick: () => applyHeading(2) },
        { id: "h3", icon: Heading3, title: "Heading 3", onClick: () => applyHeading(3) },
        { id: "bold", icon: Bold, title: "Bold", onClick: () => applyFormat("bold", null, "**") },
        { id: "italic", icon: Italic, title: "Italic", onClick: () => applyFormat("italic", null, "_") },
        { id: "underline", icon: Underline, title: "Underline", onClick: () => applyFormat("underline", null, "__") },
        { id: "strike", icon: Strikethrough, title: "Strikethrough", onClick: () => applyFormat("strikeThrough", null, "~~") },
        { id: "color", icon: Palette, title: "Text color", stub: true },
        { id: "highlight", icon: Highlighter, title: "Highlight", stub: true },
      ],
    },
    {
      label: "lists",
      tools: [
        { id: "align", icon: AlignLeft, title: "Alignment", stub: true },
        { id: "ul", icon: List, title: "Bulleted list", onClick: () => applyFormat("insertUnorderedList", null, "\n- ", "") },
        { id: "ol", icon: ListOrdered, title: "Numbered list", onClick: () => applyFormat("insertOrderedList", null, "\n1. ", "") },
        { id: "checklist", icon: ListChecks, title: "Checklist", onClick: () => applyFormat("insertUnorderedList", null, "\n- [ ] ", "") },
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
  ], [applyFormat, applyHeading, applyLink, applyImage]);

  // Absorb any pointer/click that reaches the container itself (i.e. the
  // gap regions between buttons) so it can't propagate through to the
  // underlying editor or modal chrome. This runs on the BUBBLE phase so
  // buttons and the scroller still get their events first — the container
  // only catches what fell into the ~4px gutters. Hoisted above the early
  // returns so hook order stays stable across renders (rules-of-hooks).
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
        onPointerDown={swallow}
        onMouseDown={swallow}
        onClick={swallow}
        onTouchStart={swallow}
      >
        {/* Drag handle — LEFT edge in horizontal, TOP edge in vertical */}
        <button
          type="button"
          data-testid="floating-rte-drag-handle"
          onPointerDown={onGripPointerDown}
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Move toolbar"
          className={`shrink-0 flex items-center justify-center ${isH ? "w-10 h-11 rounded-l-2xl border-r" : "w-11 h-10 rounded-t-2xl border-b"} ${isDark ? "border-white/10 bg-white/5" : "border-gray-300 bg-white/40"}`}
          style={{ touchAction: "none", cursor: "grab" }}
        >
          <GripVertical size={16} className={isDark ? "text-slate-300" : "text-slate-700"} />
        </button>

        {/* Scrollable tool row — its own gesture zone.
            `touch-action: pan-x` (horizontal) / `pan-y` (vertical) lets the
            browser natively handle finger-scrolling here WITHOUT stealing
            drag from the handle above. */}
        <div
          data-testid="floating-rte-scroller"
          className={`flex ${isH ? "flex-row overflow-x-auto overflow-y-hidden" : "flex-col overflow-y-auto overflow-x-hidden"} min-w-0`}
          style={{
            scrollbarWidth: "thin",
            WebkitOverflowScrolling: "touch",
            padding: 4,
            touchAction: isH ? "pan-x" : "pan-y",
            overscrollBehavior: "contain",
          }}
          onPointerDown={(e) => e.stopPropagation()}
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

        {/* Orientation toggle — RIGHT edge in horizontal, BOTTOM in vertical */}
        <button
          type="button"
          data-testid="floating-rte-rotate"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setOrientation(o => o === "horizontal" ? "vertical" : "horizontal")}
          aria-label="Rotate toolbar"
          style={{ touchAction: "manipulation" }}
          className={`shrink-0 flex items-center justify-center ${isH ? "w-9 h-11 rounded-r-2xl border-l" : "w-11 h-9 rounded-b-2xl border-t"} ${isDark ? "border-white/10 bg-white/5" : "border-gray-300 bg-white/40"}`}
        >
          <RotateCw size={14} className={isDark ? "text-slate-300" : "text-slate-700"} />
        </button>
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
