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
// Bumped whenever this file is materially changed. Rendered as a tiny
// label in the corner of the floating toolbar so we can confirm at a
// glance which build is running on a given device (e.g. to rule out
// stale service-worker caches).
const BUILD_STAMP = "v47-insertHTML";

export default function FormatFloatingToolbar({ editableRef, onCommand, isDark }) {
  const [pos, setPos] = useState(null); // { top, left, arrow } | null
  // Which inline/block formats are currently active under the caret. We
  // read this off `document.queryCommandState` (for bold/italic/etc.) and
  // the nearest block-level ancestor's tag (for P/H1/H2/H3). Refreshed
  // on every selectionchange so the dots track the caret live.
  const [active, setActive] = useState({
    bold: false, italic: false, underline: false, strike: false,
    block: null, // "P" | "H1" | "H2" | "H3" | null
    link: false,
  });
  const barRef = useRef(null);
  const suppressedRef = useRef(false);
  const savedRangeRef = useRef(null);

  const hide = useCallback(() => setPos(null), []);

  // Refresh the "which formats does the caret currently sit inside" map.
  // We DO NOT rely on queryCommandState (it disagrees with the manual
  // wrappers we now use, and misfires in Capacitor WebViews). Instead
  // we walk the DOM ancestor chain from the caret to the editable root
  // and look for matching tag names.
  const refreshActive = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.startContainer)) return;
    let bold = false, italic = false, underline = false, strike = false, link = false;
    let node = range.startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    let block = null;
    while (node && node !== el) {
      const tag = node.tagName;
      if (tag === "B" || tag === "STRONG") bold = true;
      else if (tag === "I" || tag === "EM") italic = true;
      else if (tag === "U") underline = true;
      else if (tag === "S" || tag === "STRIKE" || tag === "DEL") strike = true;
      else if (tag === "A") link = true;
      else if (!block && (tag === "P" || tag === "H1" || tag === "H2" || tag === "H3")) block = tag;
      node = node.parentElement;
    }
    setActive({ bold, italic, underline, strike, block, link });
  }, [editableRef]);

  const reposition = useCallback(() => {
    if (suppressedRef.current) return;
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
    const onSel = () => {
      // Snapshot the current range whenever the user selects inside the
      // editable. We consult this snapshot inside exec/applyBlock/etc.
      // so any focus loss (touch tap on a toolbar button, browser quirk)
      // doesn't destroy the user's selection.
      const el = editableRef.current;
      const sel = window.getSelection();
      if (el && sel && sel.rangeCount > 0) {
        const r = sel.getRangeAt(0);
        // Only snapshot NON-COLLAPSED ranges inside the editable. This
        // keeps the last real selection intact even after focus briefly
        // collapses the caret into a toolbar button on touch devices —
        // if we saved every collapsed intermediate the "select then
        // tap Bold" workflow would race the browser and toggleInline
        // would see nothing to wrap.
        if (!r.collapsed && el.contains(r.startContainer) && el.contains(r.endContainer)) {
          savedRangeRef.current = r.cloneRange();
        }
      }
      reposition();
      refreshActive();
    };
    // Any real character typed (or a paragraph split via Enter) hides the
    // toolbar until the user clicks a new cursor position. Modifier-only
    // presses (Shift, Alt, Ctrl, arrows, Escape) don't count as "typing",
    // so a shortcut like Cmd+B leaves the toolbar visible.
    const onKeyDown = (e) => {
      if (e.key === "Escape") { suppressedRef.current = true; return hide(); }
      const isTyping =
        e.key.length === 1 ||
        e.key === "Enter" ||
        e.key === "Backspace" ||
        e.key === "Delete";
      const modifier = e.metaKey || e.ctrlKey || e.altKey;
      if (isTyping && !modifier) {
        suppressedRef.current = true;
        hide();
      }
    };
    document.addEventListener("selectionchange", onSel);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", reposition);
    // First mount — read the initial state (in case the caret is
    // already inside a formatted run).
    refreshActive();
    return () => {
      document.removeEventListener("selectionchange", onSel);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", reposition);
    };
  }, [reposition, hide, refreshActive, editableRef]);

  // Hide when clicking outside the editable AND outside the toolbar.
  // A click INSIDE the editable clears the suppress flag so the toolbar
  // can reappear (this is the "user clicks a beginning point with cursor"
  // moment from the spec).
  useEffect(() => {
    const handler = (e) => {
      const el = editableRef.current;
      const bar = barRef.current;
      if (!el && !bar) return;
      if (bar && bar.contains(e.target)) return;
      if (el && el.contains(e.target)) {
        suppressedRef.current = false;
        // Give the browser a tick to move the caret, then reposition.
        setTimeout(reposition, 0);
        return;
      }
      hide();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [editableRef, hide, reposition]);

  // Preserve selection when clicking a toolbar button — buttons should
  // not steal focus, so the range stays valid while we execCommand.
  const stopFocusSteal = (e) => e.preventDefault();

  // Restore the last-seen editable selection into `window.getSelection()`
  // right before running a command. Combined with `preventDefault` on the
  // button's mousedown/touchstart, this guarantees execCommand runs
  // against the user's *intended* range even on iOS/Android where touch
  // taps briefly move focus onto the button before mousedown fires.
  //
  // IMPORTANT: if the live selection is ALREADY inside the editable, we
  // keep it as-is. Overwriting a good live caret with the (possibly
  // stale) savedRangeRef caused the "cursor jumps to before the first
  // line" bug when tapping the line-break / block buttons right after
  // typing. This helper is READ-ONLY on savedRangeRef — the onSel handler
  // in the useEffect above is the single source of truth for updates, and
  // it only stores NON-COLLAPSED ranges. This is what lets Bold/Italic/
  // Underline/Strike find the user's last real selection even if the
  // live caret has collapsed on button tap.
  const restoreSelection = () => {
    const el = editableRef.current;
    if (!el) return false;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const live = sel.getRangeAt(0);
      if (el.contains(live.startContainer) && el.contains(live.endContainer)) {
        el.focus();
        return true;
      }
    }
    const r = savedRangeRef.current;
    if (!r) return false;
    if (!el.contains(r.startContainer) || !el.contains(r.endContainer)) return false;
    el.focus();
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(r);
    return true;
  };

  // ---- Manual inline formatting (bypasses execCommand entirely) ------
  //
  // `document.execCommand` behaves inconsistently across browsers and
  // WebViews (notably Android Capacitor + iOS WKWebView), often silently
  // failing on selections that span partial text nodes. We instead do the
  // DOM manipulation ourselves — extract the selected range, wrap it in
  // the desired tag, insert it back, and re-select. If the entire
  // selection is already inside a matching tag, we UNWRAP it (toggle
  // off) so the same button both adds AND removes the formatting.

  const findAncestorTag = (node, root, tagName) => {
    while (node && node !== root) {
      if (node.nodeType === Node.ELEMENT_NODE && node.tagName === tagName) return node;
      node = node.parentNode;
    }
    return null;
  };

  const unwrapElement = (el) => {
    const parent = el.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    parent.removeChild(el);
    parent.normalize();
  };

  const toggleInline = (tagName) => {
    const editable = editableRef.current;
    if (!editable) return;
    // Restore the last-good selection first. If the current live
    // selection is collapsed but our savedRangeRef isn't, that means
    // touch focus collapsed the caret — restore forces the real range
    // back onto window.getSelection().
    restoreSelection();
    let sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    let range = sel.getRangeAt(0);
    // Second-chance restore — if we somehow ended up collapsed even
    // after restoreSelection (a browser quirk), pull the saved range
    // directly.
    if (range.collapsed && savedRangeRef.current && !savedRangeRef.current.collapsed) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      range = sel.getRangeAt(0);
    }
    if (range.collapsed) return;

    const upper = tagName.toUpperCase();
    const startAnc = findAncestorTag(range.startContainer, editable, upper);
    const endAnc = findAncestorTag(range.endContainer, editable, upper);

    // Simple unwrap case — whole selection sits inside a single matching
    // tag. Remove it, keeping the text.
    if (startAnc && startAnc === endAnc) {
      const text = startAnc.textContent;
      const parent = startAnc.parentNode;
      unwrapElement(startAnc);
      const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, null);
      let n;
      while ((n = walker.nextNode())) {
        if ((n.textContent || "").includes(text)) {
          const nr = document.createRange();
          const idx = n.textContent.indexOf(text);
          nr.setStart(n, idx);
          nr.setEnd(n, idx + text.length);
          sel.removeAllRanges();
          sel.addRange(nr);
          savedRangeRef.current = nr.cloneRange();
          break;
        }
      }
      return;
    }

    // Wrap case — extract the range, wrap it in the new tag, re-insert.
    try {
      const wrap = document.createElement(tagName);
      wrap.appendChild(range.extractContents());
      range.insertNode(wrap);
      wrap.parentNode?.normalize();
      const nr = document.createRange();
      nr.selectNodeContents(wrap);
      sel.removeAllRanges();
      sel.addRange(nr);
      savedRangeRef.current = nr.cloneRange();
    } catch (err) {
      // Very complex multi-block selection — fall back to execCommand
      // (deprecated but universally supported for the trivial cases).
      try {
        document.execCommand(
          tagName === "b" ? "bold" :
          tagName === "i" ? "italic" :
          tagName === "u" ? "underline" : "strikeThrough",
          false, null
        );
      } catch { /* noop */ }
    }
  };

  // Restore the last non-collapsed selection onto window.getSelection()
  // before running an execCommand. On touch devices tapping a toolbar
  // button can collapse the live caret; the saved range (populated by
  // the onSel handler on every non-collapsed selection) is the source
  // of truth for "what did the user last highlight".
  const restoreForCommand = () => {
    const el = editableRef.current;
    if (!el) return;
    const sel = window.getSelection();
    const live = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const liveGood = live && !live.collapsed
      && el.contains(live.startContainer)
      && el.contains(live.endContainer);
    if (liveGood) { el.focus(); return; }
    const saved = savedRangeRef.current;
    if (!saved || saved.collapsed) return;
    if (!el.contains(saved.startContainer) || !el.contains(saved.endContainer)) return;
    el.focus();
    const s = window.getSelection();
    s.removeAllRanges();
    s.addRange(saved.cloneRange());
  };

  const exec = (cmd, arg = null) => {
    // Bold / Italic / Underline / Strike — wrap the selected text with
    // an explicit tag via `insertHTML`. This is the SAME execCommand
    // path used by the (working) Line-break button, so it's known-good
    // on this device. Native `execCommand("bold")` was silently no-op-ing
    // in the Capacitor Android WebView while `formatBlock` worked.
    const inlineTag =
      cmd === "bold"          ? "b" :
      cmd === "italic"        ? "i" :
      cmd === "underline"     ? "u" :
      cmd === "strikeThrough" ? "s" : null;

    if (inlineTag) {
      restoreForCommand();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0);
        if (!range.collapsed) {
          const text = range.toString();
          const escaped = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          try {
            document.execCommand(
              "insertHTML", false, `<${inlineTag}>${escaped}</${inlineTag}>`
            );
          } catch { /* noop */ }
        }
      }
    } else {
      // Anything else (createLink etc.) uses execCommand directly.
      restoreForCommand();
      try { document.execCommand(cmd, false, arg); } catch { /* noop */ }
    }
    editableRef.current?.focus();
    onCommand?.();
    refreshActive();
    setTimeout(reposition, 0);
  };

  const applyBlock = (tag) => {
    restoreSelection();
    document.execCommand("formatBlock", false, tag);
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    editableRef.current?.focus();
    onCommand?.();
    refreshActive();
    setTimeout(reposition, 0);
  };

  const insertLineBreak = () => {
    restoreSelection();
    document.execCommand("insertHTML", false, "<br>");
    editableRef.current?.focus();
    onCommand?.();
    setTimeout(reposition, 0);
  };

  const linkBusyRef = useRef(false);
  const insertLink = () => {
    // Re-entrancy guard — on Capacitor Android WebViews, tapping the Link
    // button can queue an emulated `mousedown` that fires AFTER
    // `window.prompt` closes. A time-based debounce doesn't work because
    // the prompt blocks the JS thread (and clock) for the whole duration
    // of the user typing. A boolean flag survives the blocking prompt
    // and is only cleared once the queued events have had a chance to
    // drain, so the second dispatch is swallowed.
    if (linkBusyRef.current) return;
    linkBusyRef.current = true;
    const clearBusy = () => { setTimeout(() => { linkBusyRef.current = false; }, 500); };

    // Snapshot the exact range BEFORE opening window.prompt — the prompt
    // steals focus from the contentEditable and the browser collapses
    // the selection, so we cannot rely on the live selection after the
    // prompt returns. If the user had text selected, that's the anchor
    // text for the link; if not, we insert the URL itself as anchor text.
    const el = editableRef.current;
    let snapshot = null;
    const liveSel = window.getSelection();
    if (el && liveSel && liveSel.rangeCount > 0) {
      const r = liveSel.getRangeAt(0);
      if (el.contains(r.startContainer) && el.contains(r.endContainer)) {
        snapshot = r.cloneRange();
      }
    }
    if (!snapshot && savedRangeRef.current) {
      snapshot = savedRangeRef.current.cloneRange();
    }

    const url = window.prompt("Link URL", "https://");
    if (!url || url.trim() === "https://") { clearBusy(); return; }
    if (!/^(https?|mailto|tel):/i.test(url)) {
      window.alert("Link must start with http://, https://, mailto: or tel:");
      clearBusy();
      return;
    }

    // Put the saved range back onto window.getSelection() so createLink
    // has something to wrap.
    if (el && snapshot) {
      el.focus();
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(snapshot);
    }

    // If the selection is collapsed (no text was highlighted), insert the
    // URL itself as the anchor text so the link is still visible.
    const sel2 = window.getSelection();
    if (sel2 && sel2.rangeCount > 0 && sel2.getRangeAt(0).collapsed) {
      try { document.execCommand("insertText", false, url); } catch { /* noop */ }
      // Re-select the just-inserted text so createLink wraps it.
      const s = window.getSelection();
      if (s && s.rangeCount > 0) {
        const r = s.getRangeAt(0);
        const end = r.endOffset;
        const start = Math.max(0, end - url.length);
        try {
          const nr = document.createRange();
          nr.setStart(r.endContainer, start);
          nr.setEnd(r.endContainer, end);
          s.removeAllRanges();
          s.addRange(nr);
        } catch { /* noop */ }
      }
    }

    try { document.execCommand("createLink", false, url); } catch { /* noop */ }
    editableRef.current?.focus();
    onCommand?.();
    refreshActive();
    setTimeout(reposition, 0);
    clearBusy();
  };

  if (!pos) return null;

  const btnCls = isDark
    ? "text-yellow-500 hover:text-yellow-300 hover:bg-white/10"
    : "text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100";
  const barCls = isDark
    ? "bg-black/20 border-white/5"
    : "bg-black/[0.03] border-gray-200";
  // Yellow dot indicator painted beneath each icon when that format
  // matches the current caret run. Kept tiny (4 px) so it feels like a
  // status LED, not a second icon.
  const dotCls = isDark ? "bg-yellow-300" : "bg-yellow-600";

  const iconBtn = (testid, title, onMouseDown, children, isActive = false) => (
    <button
      key={testid}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      data-testid={testid}
      data-active={isActive ? "true" : "false"}
      onMouseDown={(e) => { stopFocusSteal(e); onMouseDown(); }}
      onTouchStart={(e) => { e.preventDefault(); onMouseDown(); }}
      className={`relative inline-flex items-center justify-center h-8 w-8 rounded-md text-sm font-semibold ${btnCls}`}
    >
      {children}
      {isActive && (
        <span
          aria-hidden
          className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${dotCls}`}
        />
      )}
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
      {iconBtn("fs-fmt-p", "Paragraph", () => applyBlock("P"), "P", active.block === "P")}
      {iconBtn("fs-fmt-h1", "Heading 1", () => applyBlock("H1"), "H1", active.block === "H1")}
      {iconBtn("fs-fmt-h2", "Heading 2", () => applyBlock("H2"), "H2", active.block === "H2")}
      {iconBtn("fs-fmt-h3", "Heading 3", () => applyBlock("H3"), "H3", active.block === "H3")}
      <div className={`mx-0.5 w-px h-5 ${isDark ? "bg-white/10" : "bg-gray-200"}`} aria-hidden />
      {iconBtn("fs-fmt-bold", "Bold", () => exec("bold"), <Bold className="w-3.5 h-3.5" strokeWidth={2.6} />, active.bold)}
      {iconBtn("fs-fmt-italic", "Italic", () => exec("italic"), <Italic className="w-3.5 h-3.5" strokeWidth={2.6} />, active.italic)}
      {iconBtn("fs-fmt-underline", "Underline", () => exec("underline"), <Underline className="w-3.5 h-3.5" strokeWidth={2.6} />, active.underline)}
      {iconBtn("fs-fmt-strike", "Strikethrough", () => exec("strikeThrough"), <Strikethrough className="w-3.5 h-3.5" strokeWidth={2.6} />, active.strike)}
      <div className={`mx-0.5 w-px h-5 ${isDark ? "bg-white/10" : "bg-gray-200"}`} aria-hidden />
      {iconBtn("fs-fmt-link", "Link", insertLink, <LinkIcon className="w-3.5 h-3.5" strokeWidth={2.6} />, active.link)}
      {iconBtn("fs-fmt-br", "Line break", insertLineBreak, <CornerDownLeft className="w-3.5 h-3.5" strokeWidth={2.6} />, false)}
      {/* Build stamp — helps confirm which bundle is running on a device
          when a fix has shipped. Tiny, opaque, non-interactive. */}
      <span
        className={`ml-1 pl-1 text-[8px] font-mono opacity-40 select-none ${isDark ? "text-yellow-200 border-l border-white/10" : "text-yellow-800 border-l border-gray-300"}`}
        data-testid="fs-fmt-build-stamp"
        aria-hidden
      >
        {BUILD_STAMP}
      </span>
    </div>
  );
}
