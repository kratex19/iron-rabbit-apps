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

  // ── Text-mode "keep the tags, add plaintext beneath" state ─────────
  // When the user switches from Format/HTML mode INTO Text mode, we
  // freeze the current HTML as the "preserved" prefix and show a
  // plaintext render of it in the textarea. Anything the user types in
  // Text mode is treated as an APPENDED plain-text tail — we commit it
  // back to the parent as `preservedHtml + plainTextToHtml(appended)`
  // so switching BACK to Format/HTML preserves every tag they had,
  // with the new plaintext appended as fresh paragraphs. If the user
  // edits the preserved-plaintext region itself, we abandon HTML
  // preservation for THIS session and fall back to a plaintext value —
  // sane default for the "start fresh" case.
  const [textBuffer, setTextBuffer] = useState("");
  const [preservedHtml, setPreservedHtml] = useState(null);
  // Reinitialise the text-mode buffer every time we ENTER text mode.
  // Deliberately depends ONLY on `mode` (and note-swap via value length
  // heuristics is handled by the format-mode value effect below), so
  // routine parent re-renders while we're mid-typing don't clobber
  // the buffer or the caret.
  useEffect(() => {
    if (mode !== "text") return;
    if (looksLikeHtml(value)) {
      setPreservedHtml(value);
      setTextBuffer(htmlToPlainText(value));
    } else {
      setPreservedHtml(null);
      setTextBuffer(value || "");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleTextChange = (e) => {
    const next = e.target.value;
    setTextBuffer(next);
    if (preservedHtml) {
      const preservedPlain = htmlToPlainText(preservedHtml);
      if (next === preservedPlain) {
        // No user addition yet — keep value as the preserved HTML.
        onChange(preservedHtml);
        return;
      }
      if (next.startsWith(preservedPlain)) {
        // User APPENDED to the plaintext view. Fold the added tail back
        // into the HTML as new paragraph(s) so Format/HTML mode still
        // shows every original tag intact.
        const appended = next.slice(preservedPlain.length);
        onChange(preservedHtml + plainTextToHtml(appended));
        return;
      }
      // User edited the middle of the preserved-plaintext region. We
      // can't safely map that edit back to the HTML tree, so drop
      // preservation and commit as plaintext.
      setPreservedHtml(null);
      onChange(next);
      return;
    }
    onChange(next);
  };

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

  // Click handler — inside a contentEditable, browsers do NOT navigate
  // <a> clicks (they just place the caret). Give the user a way to open
  // links they just inserted: tap opens in a new tab. Shift/Alt/Ctrl-
  // click leaves the default (caret-place) behaviour so power users can
  // still edit link text if needed.
  const handleEditableClick = useCallback((e) => {
    const a = e.target.closest && e.target.closest("a");
    if (!a || !a.href) return;
    if (e.shiftKey || e.altKey || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    try { window.open(a.href, "_blank", "noopener,noreferrer"); } catch { /* noop */ }
  }, []);

  if (mode === "text") {
    // Text-mode display is driven by the local `textBuffer` state above,
    // NOT the raw parent `value`. This keeps the textarea's DOM output
    // clean (no double-newline injection on every keystroke) while the
    // parent value is committed as HTML behind the scenes so tags added
    // in Format/HTML mode survive the round-trip.
    return (
      <TextareaAutosize
        ref={textareaRef}
        value={textBuffer}
        onChange={handleTextChange}
        placeholder={placeholder}
        minRows={3}
        className={`fs-content-input w-full bg-transparent border-0 outline-none resize-none text-base leading-relaxed font-sans ${isDark ? "fs-placeholder-dark" : "fs-placeholder-light"}`}
        style={{
          color: textColor,
          // WebKit / mobile browsers inherit `-webkit-text-fill-color`
          // from an ancestor with a `color: white` cascade and use it to
          // paint text, ignoring plain `color`. Setting it explicitly
          // inline makes the slider value survive re-mounts on cold
          // reopen even if the ref-forcing useLayoutEffect hasn't
          // landed by first paint.
          WebkitTextFillColor: textColor,
        }}
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
        onClick={handleEditableClick}
        placeholder={placeholder}
        data-testid="fullscreen-content-input-format"
        className={`fs-content-input fs-content-editable w-full bg-transparent border-0 outline-none text-base leading-relaxed font-sans ${isDark ? "fs-placeholder-dark" : "fs-placeholder-light"}`}
        style={{
          color: textColor,
          // Same WebKit belt-and-suspenders as text mode above — the
          // contentEditable inherits `-webkit-text-fill-color` from
          // ancestors and needs an explicit inline override so the
          // slider value survives cold reopens on mobile browsers.
          WebkitTextFillColor: textColor,
          minHeight: "6rem",
        }}
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
