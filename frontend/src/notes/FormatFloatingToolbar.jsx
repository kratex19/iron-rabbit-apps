import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, Strikethrough, Link as LinkIcon, CornerDownLeft } from "lucide-react";

/**
 * Floating formatting toolbar for Expanded Text's Tags & Formatting mode.
 *
 * Appears near the current selection (or caret) inside the contentEditable
 * div passed via `editableRef`. Compact chrome so it never permanently
 * consumes editor space.
 *
 * Buttons: P · H1 · H2 · H3 · Bold · Italic · Underline · Strikethrough ·
 * Link · Line Break
 *
 * Uses the legacy `document.execCommand` API. It is deprecated but still
 * universally supported in every current browser and is the cleanest
 * option for a small inline WYSIWYG. If/when browsers actually drop it,
 * the equivalent Selection/Range operations are a swap-out inside this
 * file; the rest of the app doesn't care.
 */
export default function FormatFloatingToolbar({ editableRef, onCommand, isDark }) {
  const [pos, setPos] = useState(null); // { top, left, arrow } | null
  const barRef = useRef(null);

  const hide = useCallback(() => setPos(null), []);

  const reposition = useCallback(() => {
    const el = editableRef.current;
    if (!el) return hide();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return hide();
    const range = sel.getRangeAt(0);

    // Only show while the caret / selection is inside the editable.
    if (!el.contains(range.startContainer)) return hide();

    // For an empty caret with no selection we anchor to the caret
    // position via a temporary marker rect. Otherwise use the selection
    // bounding box.
    let rect;
    if (range.collapsed) {
      // Create a zero-width range and grab its rect
      const clone = range.cloneRange();
      clone.collapse(true);
      const marker = document.createElement("span");
      marker.appendChild(document.createTextNode("\u200b"));
      clone.insertNode(marker);
      rect = marker.getBoundingClientRect();
      marker.remove();
      // Restore selection (insertNode moved it after the marker)
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      rect = range.getBoundingClientRect();
    }
    if (!rect || (rect.width === 0 && rect.height === 0 && rect.top === 0)) return hide();

    const wrapRect = el.getBoundingClientRect();
    const barW = 320; // approx
    const barH = 40;
    const margin = 8;

    // Prefer above the selection; if not enough space above the editable,
    // place below.
    const anchorTop = rect.top;
    const anchorBottom = rect.bottom;
    const spaceAbove = anchorTop - wrapRect.top;
    let top;
    if (spaceAbove > barH + margin) {
      top = anchorTop - wrapRect.top - barH - margin;
    } else {
      top = anchorBottom - wrapRect.top + margin;
    }

    // Horizontally centre on the selection but clamp inside the editable.
    let left = rect.left + rect.width / 2 - wrapRect.left - barW / 2;
    left = Math.max(0, Math.min(left, wrapRect.width - barW));

    setPos({ top, left });
  }, [editableRef, hide]);

  useEffect(() => {
    const onSel = () => reposition();
    const onKey = (e) => {
      if (e.key === "Escape") hide();
      else reposition();
    };
    document.addEventListener("selectionchange", onSel);
    document.addEventListener("keyup", onKey);
    window.addEventListener("resize", reposition);
    // First run — nothing selected yet so pos stays null.
    return () => {
      document.removeEventListener("selectionchange", onSel);
      document.removeEventListener("keyup", onKey);
      window.removeEventListener("resize", reposition);
    };
  }, [reposition, hide]);

  // Hide when clicking outside the editable AND outside the toolbar.
  useEffect(() => {
    const handler = (e) => {
      const el = editableRef.current;
      const bar = barRef.current;
      if (!el && !bar) return;
      if ((el && el.contains(e.target)) || (bar && bar.contains(e.target))) return;
      hide();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [editableRef, hide]);

  // Preserve selection when clicking a toolbar button — buttons should
  // not steal focus, so the range stays valid while we execCommand.
  const stopFocusSteal = (e) => e.preventDefault();

  const exec = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    // Return focus to the editable so the caret stays where the user
    // last was.
    editableRef.current?.focus();
    onCommand?.();
    // Reposition after the DOM settles.
    setTimeout(reposition, 0);
  };

  const applyBlock = (tag) => {
    // formatBlock with a tag name switches the current block-level element.
    document.execCommand("formatBlock", false, tag);
    editableRef.current?.focus();
    onCommand?.();
    setTimeout(reposition, 0);
  };

  const insertLineBreak = () => {
    document.execCommand("insertHTML", false, "<br>");
    editableRef.current?.focus();
    onCommand?.();
    setTimeout(reposition, 0);
  };

  const insertLink = () => {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    // Safe scheme check — same allowlist as the sanitiser.
    if (!/^(https?|mailto|tel):/i.test(url)) {
      window.alert("Link must start with http://, https://, mailto: or tel:");
      return;
    }
    exec("createLink", url);
  };

  if (!pos) return null;

  const btnCls = isDark
    ? "text-yellow-500 hover:text-yellow-300 hover:bg-white/10"
    : "text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100";
  const barCls = isDark
    ? "bg-slate-900/95 border-white/10 shadow-xl"
    : "bg-white/95 border-gray-200 shadow-lg";

  const iconBtn = (testid, title, onMouseDown, children) => (
    <button
      key={testid}
      type="button"
      title={title}
      aria-label={title}
      data-testid={testid}
      onMouseDown={(e) => { stopFocusSteal(e); onMouseDown(); }}
      className={`inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-semibold ${btnCls}`}
    >
      {children}
    </button>
  );

  return (
    <div
      ref={barRef}
      role="toolbar"
      aria-label="Text formatting"
      data-testid="fullscreen-format-toolbar"
      className={`absolute z-50 rounded-lg border backdrop-blur-md px-1 py-1 flex items-center gap-0.5 ${barCls}`}
      style={{ top: pos.top, left: pos.left }}
    >
      {iconBtn("fs-fmt-p", "Paragraph", () => applyBlock("P"), "P")}
      {iconBtn("fs-fmt-h1", "Heading 1", () => applyBlock("H1"), "H1")}
      {iconBtn("fs-fmt-h2", "Heading 2", () => applyBlock("H2"), "H2")}
      {iconBtn("fs-fmt-h3", "Heading 3", () => applyBlock("H3"), "H3")}
      <div className={`mx-0.5 w-px h-5 ${isDark ? "bg-white/10" : "bg-gray-200"}`} aria-hidden />
      {iconBtn("fs-fmt-bold", "Bold", () => exec("bold"), <Bold className="w-3.5 h-3.5" strokeWidth={2.6} />)}
      {iconBtn("fs-fmt-italic", "Italic", () => exec("italic"), <Italic className="w-3.5 h-3.5" strokeWidth={2.6} />)}
      {iconBtn("fs-fmt-underline", "Underline", () => exec("underline"), <Underline className="w-3.5 h-3.5" strokeWidth={2.6} />)}
      {iconBtn("fs-fmt-strike", "Strikethrough", () => exec("strikeThrough"), <Strikethrough className="w-3.5 h-3.5" strokeWidth={2.6} />)}
      <div className={`mx-0.5 w-px h-5 ${isDark ? "bg-white/10" : "bg-gray-200"}`} aria-hidden />
      {iconBtn("fs-fmt-link", "Link", insertLink, <LinkIcon className="w-3.5 h-3.5" strokeWidth={2.6} />)}
      {iconBtn("fs-fmt-br", "Line break", insertLineBreak, <CornerDownLeft className="w-3.5 h-3.5" strokeWidth={2.6} />)}
    </div>
  );
}
