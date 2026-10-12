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
    // `data-ir="irow"` — OR a WrapText container (`class` contains
    // "ir-wrap-box"). Any other <div> (e.g. pasted from the web) has
    // its wrapper removed so the content flattens into the surrounding
    // block flow, exactly as before <div> was allowed.
    if (node.tagName === "DIV") {
      const cls = node.getAttribute("class") || "";
      const dataIr = node.getAttribute("data-ir") || "";
      const isRow = /\bir-irow\b/.test(cls) && dataIr === "irow";
      const isWrap = /\bir-wrap-box\b/.test(cls);
      if (!isRow && !isWrap) {
        // Unwrap: move children into parent and remove the div.
        const parent = node.parentNode;
        if (parent) {
          while (node.firstChild) parent.insertBefore(node.firstChild, node);
          parent.removeChild(node);
        }
        return;
      }
      if (isWrap) {
        // No normalisation needed for the wrap container — the
        // producer (`applyWrapText` in FloatingRichTextToolbar) always
        // emits a well-formed structure with a trailing
        // `<p class="ir-wrap-tail">`. DOMPurify's default behavior
        // preserves children. Any stripped attributes other than
        // `class` are intentional (we never want `style`, `id`, etc.).
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

// ---- WrapText spacing normalization -----------------------------------
// Enforces the "always-editable-around-boxes" invariant required by the
// Edit Text contract:
//   • Between two consecutive `.ir-wrap-box` siblings → ≥ 1 node must
//     exist. If the slot is literally empty (no sibling of any kind,
//     not even whitespace), insert ONE `<p><br></p>` separator.
//   • After the last `.ir-wrap-box` child of the editor root → if the
//     wrap-box is the LAST child, append ONE `<p><br></p>` after it.
//
// This function is STRICTLY ADDITIVE — never deletes, merges, or
// re-orders. User-authored content (leading blank lines, mid-document
// typed text, intentionally-empty paragraphs) is preserved verbatim.
// Idempotent: after one pass every gap slot has ≥ 1 node, so a second
// invocation produces identical output.
//
// Operates on a direct DOM element (editor root). String form is handled
// by the `normalizeWrapBoxSpacingHtml` wrapper below.
function makeSeparator(doc) {
  const p = doc.createElement("p");
  p.appendChild(doc.createElement("br"));
  return p;
}

export function normalizeWrapBoxSpacingDom(root) {
  if (!root || root.nodeType !== 1) return;
  const doc = root.ownerDocument || document;
  // Leading-case: if the FIRST child of the editor root is a wrap-box,
  // prepend one `<p><br></p>` so the user always has an editable line
  // above it. Idempotent — once we've prepended, the first child is
  // the <p> and this branch no longer fires. Preserves user-authored
  // leading blank lines (if any node already precedes the first
  // wrap-box, we leave the leading region untouched).
  const firstEl = root.firstElementChild;
  if (firstEl
      && firstEl === root.firstChild
      && firstEl.classList
      && firstEl.classList.contains("ir-wrap-box")) {
    root.insertBefore(makeSeparator(doc), firstEl);
  }
  // Snapshot children — we mutate during iteration.
  const kids = Array.from(root.children);
  const isWrap = (el) => el && el.nodeType === 1
    && el.classList && el.classList.contains("ir-wrap-box");
  for (let i = 0; i < kids.length; i++) {
    const cur = kids[i];
    if (!isWrap(cur)) continue;
    // Between-case: next *immediate* sibling (any node type) missing.
    // `cur.nextSibling === null` means the LAST-child case; else if
    // next element sibling is a wrap AND there is NO node between
    // them, insert a separator.
    const nextSib = cur.nextSibling;         // any node (incl. text)
    const nextEl = cur.nextElementSibling;   // element only
    if (nextSib === null) {
      // Trailing-case: wrap is the last child → append one separator.
      root.appendChild(makeSeparator(doc));
      continue;
    }
    // If next element sibling is also a wrap AND `nextSib === nextEl`
    // (i.e. zero nodes in-between, not even whitespace text), insert.
    if (isWrap(nextEl) && nextSib === nextEl) {
      root.insertBefore(makeSeparator(doc), nextEl);
    }
  }
}

// String-form wrapper — parses `html`, normalises, serialises back.
// Used on the load path (post-sanitize) and the save path.
export function normalizeWrapBoxSpacing(html) {
  if (typeof html !== "string" || html.length === 0) return html;
  // Fast path: if no wrap-boxes at all, nothing to normalise.
  if (html.indexOf("ir-wrap-box") === -1) return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  normalizeWrapBoxSpacingDom(tmp);
  return tmp.innerHTML;
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
