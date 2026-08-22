import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { sanitizeHtml, looksLikeHtml, plainTextToHtml, htmlToPlainText } from "../utils/htmlSanitize";
import FormatFloatingToolbar from "./FormatFloatingToolbar";

/**
 * ExpandedTextEditor — the three-mode Expanded Text editor.
 *
 *  - mode="text"    → plain textarea (existing behavior, ref-forced color)
 *  - mode="format"  → contentEditable div with a floating formatting toolbar
 *  - mode="html"    → textarea showing/editing the raw HTML source
 *
 * The single source of truth is `value` (== note.content). The editor
 * calls `onChange(nextValue)` on every edit; switching modes never
 * destroys the underlying string — it only re-renders it.
 *
 * Props:
 *  - value: string
 *  - onChange: (next: string) => void
 *  - mode: "text" | "format" | "html"
 *  - textColor: css color string (forced via ref for iOS/Android WebViews)
 *  - textareaRef: forwarded ref used by FullScreenNote's ref-forcing effect
 *  - isDark: boolean
 *  - placeholder: string
 */
export default function ExpandedTextEditor({
  value,
  onChange,
  mode,
  textColor,
  textareaRef,
  isDark,
  placeholder = "Start writing…",
}) {
  const editableRef = useRef(null);
  // Last HTML we programmatically set into the editable so we can avoid
  // clobbering the user's caret on every keystroke. The editable owns
  // the DOM state while focused; we only reset it when `value` diverges
  // (e.g. mode change or external update).
  const lastAppliedHtmlRef = useRef(null);

  // When the user switches INTO format mode from plain text we auto-
  // upgrade the string to paragraphs so the WYSIWYG has a proper block
  // structure to hang formatting on. When they switch INTO text mode
  // from HTML/format, we DON'T strip tags — the user asked us not to
  // lose content on mode change. Regular mode just shows the raw string
  // in a textarea (spec allows it — "Regular Text = normal text editing").
  const upgradedRef = useRef(false);
  useEffect(() => {
    if (mode === "format" && !upgradedRef.current) {
      upgradedRef.current = true;
      if (typeof value === "string" && value.length > 0 && !looksLikeHtml(value)) {
        onChange(plainTextToHtml(value));
      }
    }
    if (mode !== "format") upgradedRef.current = false;
  }, [mode]);

  // Push `value` into the contentEditable when it changes externally.
  // While the editable is FOCUSED we deliberately leave the DOM alone —
  // resetting `innerHTML` here would clobber the caret (the classic bug
  // where pressing Enter after a sentence sends the caret to position 0
  // because DOMPurify normalises the browser-inserted block wrapper and
  // we then overwrite the DOM with the "clean" copy). The editable is
  // authoritative while focused; sanitisation happens on save instead.
  useLayoutEffect(() => {
    if (mode !== "format") return;
    const el = editableRef.current;
    if (!el) return;
    if (document.activeElement === el) return; // don't clobber caret
    const clean = sanitizeHtml(value || "");
    if (lastAppliedHtmlRef.current === clean && el.innerHTML === clean) return;
    el.innerHTML = clean;
    lastAppliedHtmlRef.current = clean;
  }, [value, mode]);

  // Ref-forced color for the contentEditable (matches the textarea trick).
  useLayoutEffect(() => {
    if (mode !== "format") return;
    const el = editableRef.current;
    if (!el || !textColor) return;
    el.style.setProperty("color", textColor, "important");
    el.style.setProperty("-webkit-text-fill-color", textColor, "important");
  }, [textColor, mode]);

  // Ask the browser to wrap Enter-created blocks in <p> instead of the
  // default <div>. This keeps the DOM aligned with our HTML allowlist so
  // pressing Enter creates a new paragraph that survives the sanitiser
  // on save. execCommand is deprecated but this specific setting is
  // still respected by every modern browser and there is no supported
  // replacement.
  useEffect(() => {
    if (mode !== "format") return;
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* noop */ }
  }, [mode]);

  const handleEditableInput = useCallback(() => {
    const el = editableRef.current;
    if (!el) return;
    // Do NOT sanitize inside input (breaks caret). We sanitize on save.
    const html = el.innerHTML;
    lastAppliedHtmlRef.current = html;
    onChange(html);
  }, [onChange]);

  // Paste handler — always paste as plain text so no external formatting
  // (font faces, colors, remote images…) leaks in.
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    if (typeof text === "string") {
      // Escape then insert as text nodes to keep it XSS-proof
      document.execCommand("insertText", false, text);
    }
  }, []);

  if (mode === "text") {
    return (
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        minRows={3}
        className={`fs-content-input w-full bg-transparent border-0 outline-none resize-none text-base leading-relaxed font-sans ${isDark ? "fs-placeholder-dark" : "fs-placeholder-light"}`}
        style={{ color: textColor }}
        data-testid="fullscreen-content-input"
        aria-label="Note content"
      />
    );
  }

  if (mode === "html") {
    return (
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="<p>HTML source…</p>"
        minRows={3}
        spellCheck={false}
        className={`fs-content-input w-full bg-transparent border-0 outline-none resize-none text-sm leading-relaxed font-mono placeholder:opacity-60 ${isDark ? "text-emerald-300" : "text-emerald-800"}`}
        // Note: html mode uses a monospace green tint by design — this
        // does not affect Regular / Format modes, which continue to
        // honour the per-note text brightness slider exactly as before.
        data-testid="fullscreen-content-input-html"
        aria-label="Note HTML source"
      />
    );
  }

  // mode === "format"
  return (
    <div className="relative w-full" data-testid="fullscreen-content-format-wrap">
      <div
        ref={editableRef}
        role="textbox"
        contentEditable
        suppressContentEditableWarning
        aria-multiline
        aria-label="Note content"
        spellCheck
        onInput={handleEditableInput}
        onBlur={handleEditableInput}
        onPaste={handlePaste}
        placeholder={placeholder}
        data-testid="fullscreen-content-input-format"
        className={`fs-content-input fs-content-editable w-full bg-transparent border-0 outline-none text-base leading-relaxed font-sans ${isDark ? "fs-placeholder-dark" : "fs-placeholder-light"}`}
        style={{ color: textColor, minHeight: "6rem" }}
      />
      <FormatFloatingToolbar
        editableRef={editableRef}
        isDark={isDark}
        onCommand={handleEditableInput}
      />
    </div>
  );
}

// Public helper — sanitises the stored value once, right before it hits
// IndexedDB via the auto-save. Kept as a static export so FullScreenNote
// can call it inline without importing the sanitiser module directly.
export { sanitizeHtml, htmlToPlainText };
