// HTML sanitiser for Expanded Text formatting mode.
// Uses DOMPurify with a strict allowlist matching the spec:
//   <p>, <h1>, <h2>, <h3>, <strong>, <em>, <u>, <s>, <a>, <br>, <ul>, <ol>, <li>
// Attributes are limited to `href`, `title`, `target`, `rel` on <a>,
// plus `class` and `data-ir-check` for interactive checklist items
// (needed by Module 1 checklist tool). Links are forced to open in a new
// tab with `rel="noopener noreferrer"` so the app can never be navigated
// away from by a malicious paste.
import DOMPurify from "dompurify";

const CONFIG = {
  ALLOWED_TAGS: [
    "p", "h1", "h2", "h3",
    "strong", "em", "u", "s", "a", "br", "b", "i", "strike", "del",
    "ul", "ol", "li",
    // <span class="ir-size-* ir-color-*"> — text appearance via Aa dropdown.
    // `class` is already on the ALLOWED_ATTR list; `style` remains blocked.
    "span",
    // <div class="ir-irow" data-ir="irow"> — INLINE 3-zone row container.
    // `<div>` is otherwise stripped by the post-sanitize hook unless it is
    // a properly-formed INLINE row. This is the only tag addition for
    // Module 1 INLINE support.
    "div",
  ],
  ALLOWED_ATTR: [
    "href", "title", "target", "rel", "class", "data-ir-check",
    // INLINE row attributes. These are structural markers DOMPurify
    // needs to allow so the serialized HTML round-trips cleanly:
    //   • data-ir  → "irow" on the <div>, "cell" on each inner <span>
    //   • data-pos → "left" | "center" | "right" on each inner <span>
    //   • contenteditable → "true" on each cell so the cell remains
    //     independently editable even after a round-trip.
    "data-ir", "data-pos", "contenteditable",
  ],
  ALLOW_DATA_ATTR: false,  // only `data-ir-check` / `data-ir` / `data-pos` via explicit allowlist above
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
    // Strip bare <div>s. We only permit `<div>` when it is a
    // well-formed INLINE row — i.e. `class` contains "ir-irow" AND
    // `data-ir="irow"`. Any other <div> (e.g. pasted from the web)
    // has its wrapper removed so the content flattens into the
    // surrounding block flow, exactly as before <div> was allowed.
    if (node.tagName === "DIV") {
      const cls = node.getAttribute("class") || "";
      const dataIr = node.getAttribute("data-ir") || "";
      const isRow = /\bir-irow\b/.test(cls) && dataIr === "irow";
      if (!isRow) {
        // Unwrap: move children into parent and remove the div.
        const parent = node.parentNode;
        if (parent) {
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
        }
        return;
      }
      // Normalize an INLINE row: enforce exactly 3 cell children,
      // discard any stray text/non-cell children (DOMPurify may leave
      // whitespace text nodes between cells). This keeps saved HTML
      // consistent and prevents half-formed rows from accumulating.
      const kids = Array.from(node.childNodes);
      const cells = kids.filter((n) =>
        n.nodeType === 1
        && n.tagName === "SPAN"
        && /\bir-icell\b/.test(n.getAttribute("class") || "")
        && n.getAttribute("data-ir") === "cell"
      );
      kids.forEach((n) => { if (!cells.includes(n)) node.removeChild(n); });
      // Clamp to exactly 3 cells. If more, drop the extras. If fewer,
      // leave as-is — the renderer handles missing cells gracefully.
      cells.slice(3).forEach((n) => node.removeChild(n));
    }
    // On INLINE cell spans, enforce `contenteditable="true"` so the
    // cell is editable when the note is reopened. If `contenteditable`
    // was stripped for any reason, set it back.
    if (node.tagName === "SPAN" && node.getAttribute("data-ir") === "cell") {
      node.setAttribute("contenteditable", "true");
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
const HTML_TAG_RE = /<(p|h1|h2|h3|strong|b|em|i|u|s|a|br|strike|del|ul|ol|li)(\s[^>]*)?>/i;
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
