// HTML sanitiser for Expanded Text formatting mode.
// Uses DOMPurify with a strict allowlist matching the spec:
//   <p>, <h1>, <h2>, <h3>, <strong>, <em>, <u>, <s>, <a>, <br>
// Attributes are limited to `href`, `title`, `target`, `rel` on <a>.
// Links are forced to open in a new tab with `rel="noopener noreferrer"`
// so the app can never be navigated away from by a malicious paste.
import DOMPurify from "dompurify";

const CONFIG = {
  ALLOWED_TAGS: ["p", "h1", "h2", "h3", "strong", "em", "u", "s", "a", "br", "b", "i"],
  ALLOWED_ATTR: ["href", "title", "target", "rel"],
  ALLOW_DATA_ATTR: false,
  ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^:]*$)/i, // block javascript:, data: etc.
};

let hooked = false;
function ensureHook() {
  if (hooked) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      node.setAttribute("target", "_blank");
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  hooked = true;
}

// Returns a cleaned HTML string safe for `dangerouslySetInnerHTML`.
export function sanitizeHtml(dirty) {
  ensureHook();
  if (typeof dirty !== "string" || dirty.length === 0) return "";
  return DOMPurify.sanitize(dirty, CONFIG);
}

// Cheap heuristic to detect whether a stored `content` string is HTML
// (contains any tag from the allowlist) vs. plain text. Used to auto-pick
// the initial editing mode when opening an existing note.
const HTML_TAG_RE = /<(p|h1|h2|h3|strong|b|em|i|u|s|a|br)(\s[^>]*)?>/i;
export function looksLikeHtml(content) {
  return typeof content === "string" && HTML_TAG_RE.test(content);
}

// Convert plain text with newlines into safe HTML paragraphs. Used when
// the user first switches into T✦ (Tags & Formatting) mode on a note that
// has only ever been edited as plain text — so pressing Enter creates
// proper <p> blocks and the formatting toolbar can operate cleanly.
export function plainTextToHtml(text) {
  if (typeof text !== "string" || text.length === 0) return "";
  const escape = (s) => s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = text.split(/\n{2,}/).map((block) => {
    const inner = escape(block).replace(/\n/g, "<br>");
    return `<p>${inner}</p>`;
  });
  return paragraphs.join("");
}

// Reverse conversion — strip tags and collapse to plain text. Used only
// as a display fallback; content is never *stored* in stripped form.
export function htmlToPlainText(html) {
  if (typeof html !== "string" || html.length === 0) return "";
  const div = document.createElement("div");
  div.innerHTML = sanitizeHtml(html);
  // Replace <br> + block closers with newlines
  div.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  div.querySelectorAll("p, h1, h2, h3").forEach((el) => {
    el.append("\n\n");
  });
  return (div.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
}
