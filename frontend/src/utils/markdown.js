/**
 * Iron Rabbit — Markdown portability utilities.
 *
 * Notes are stored natively as JSON objects in IndexedDB. Markdown is a
 * portable exchange format only — never replaces internal storage.
 *
 * Format:
 *   ---
 *   title: My Note
 *   category: Work
 *   color: purple
 *   created_at: 2026-08-07T14:00:00Z
 *   updated_at: 2026-08-13T15:00:00Z
 *   ---
 *
 *   <note body — preserved verbatim, may already contain user Markdown>
 */

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

// Fields we serialise to the YAML front-matter. Anything else stays in the
// JSON native format only (attachments, checklists, etc. don't have a
// meaningful Markdown equivalent).
const EXPORTED_META_FIELDS = [
  "title",
  "category",
  "color",
  "pinned",
  "tags",
  "created_at",
  "updated_at",
];

/**
 * Escape a value for a single-line YAML scalar. Quotes only when the value
 * contains characters that would break plain-scalar parsing.
 */
function yamlScalar(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return "[" + value.map(yamlScalar).join(", ") + "]";
  }
  const str = String(value);
  // Force-quote if it contains YAML-significant chars or leading/trailing spaces
  if (
    str === "" ||
    /^[\s'"`\-?:,\[\]{}#&*!|>%@]/.test(str) ||
    /[:#]\s/.test(str) ||
    /["'\\\n\r\t]/.test(str) ||
    /^(true|false|null|~|yes|no)$/i.test(str) ||
    !isNaN(Number(str))
  ) {
    return `"${str.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return str;
}

/**
 * Parse a very small subset of YAML: `key: value` per line, string / number
 * / boolean / inline array. Sufficient for round-trip of our own emissions
 * and for the vast majority of real-world Markdown front-matter.
 */
function parseYaml(block) {
  const out = {};
  const lines = block.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (!key) continue;

    // Strip inline comment (only when unquoted)
    if (!val.startsWith('"') && !val.startsWith("'")) {
      const hash = val.indexOf(" #");
      if (hash !== -1) val = val.slice(0, hash).trim();
    }

    // Quoted string
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val
        .slice(1, -1)
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    } else if (val === "") {
      val = "";
    } else if (val === "true" || val === "false") {
      val = val === "true";
    } else if (val === "null" || val === "~") {
      val = null;
    } else if (val.startsWith("[") && val.endsWith("]")) {
      // Inline array
      const inner = val.slice(1, -1).trim();
      val = inner
        ? inner.split(",").map((s) => {
            const t = s.trim();
            if (
              (t.startsWith('"') && t.endsWith('"')) ||
              (t.startsWith("'") && t.endsWith("'"))
            )
              return t.slice(1, -1);
            return t;
          })
        : [];
    } else if (!isNaN(Number(val)) && val !== "") {
      // Keep dates as strings; only coerce pure numbers
      if (!/^\d{4}-\d{2}-\d{2}/.test(val)) val = Number(val);
    }
    out[key] = val;
  }
  return out;
}

/**
 * Serialise an Iron Rabbit note to a portable Markdown string with YAML
 * front-matter. Content is written verbatim — no re-formatting.
 */
export function noteToMarkdown(note) {
  if (!note) throw new Error("noteToMarkdown: note is required");

  const meta = {};
  for (const key of EXPORTED_META_FIELDS) {
    const value = note[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value === "") continue;
    meta[key] = value;
  }

  const yamlLines = Object.entries(meta).map(([k, v]) => `${k}: ${yamlScalar(v)}`);
  const frontMatter = ["---", ...yamlLines, "---"].join("\n");

  const body = (note.content || "").replace(/\r\n/g, "\n");
  // Ensure exactly one blank line between front-matter and body
  return `${frontMatter}\n\n${body}\n`;
}

/**
 * Parse a Markdown string (optionally with YAML front-matter) into a
 * note-shaped object. Missing metadata falls back to sensible defaults.
 * Returns `{ title, content, category, color, tags, created_at, updated_at, pinned }`.
 */
export function markdownToNote(mdText, filenameFallback = "Imported note") {
  const raw = String(mdText || "").replace(/\r\n/g, "\n");
  const match = raw.match(FRONT_MATTER_RE);

  let meta = {};
  let body = raw;
  if (match) {
    meta = parseYaml(match[1]);
    body = match[2].replace(/^\n+/, "");
  }

  const now = new Date().toISOString();
  const stripExt = (name) => name.replace(/\.(md|markdown|txt)$/i, "");

  const title =
    (typeof meta.title === "string" && meta.title.trim()) ||
    stripExt(filenameFallback).trim() ||
    "Imported note";

  return {
    title,
    content: body,
    category:
      typeof meta.category === "string" && meta.category.trim()
        ? meta.category.trim()
        : "General",
    color:
      typeof meta.color === "string" && meta.color.trim()
        ? meta.color.trim()
        : "slate",
    pinned: meta.pinned === true,
    tags: Array.isArray(meta.tags)
      ? meta.tags.filter((t) => typeof t === "string" && t.trim())
      : [],
    created_at:
      typeof meta.created_at === "string" ? meta.created_at : now,
    updated_at:
      typeof meta.updated_at === "string" ? meta.updated_at : now,
  };
}

/**
 * Sanitise a string so it's safe for use as a file name across OSes.
 * Falls back to `note` if nothing usable remains.
 */
export function safeFilename(name, ext = ".md") {
  const base = String(name || "")
    .replace(/[\x00-\x1f\x7f]/g, "")           // control chars
    .replace(/[<>:"/\\|?*]/g, "-")             // Win-illegal
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 120)
    .trim();
  return (base || "note") + ext;
}

/**
 * Trigger a browser download of arbitrary text as a file.
 */
export function downloadTextFile(text, filename, mime = "text/markdown;charset=utf-8") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Trigger a browser download of a Blob (used for the zip export).
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Bundle multiple notes into a ZIP containing one .md per note. Uses fflate.
 * Filenames are made unique by suffixing "-2", "-3", … when duplicates occur.
 * Returns the resulting Blob.
 */
export async function notesToZipBlob(notes) {
  if (!Array.isArray(notes) || notes.length === 0)
    throw new Error("notesToZipBlob: at least one note required");

  const { zip, strToU8 } = await import("fflate");
  const files = {};
  const used = new Set();

  for (const note of notes) {
    let name = safeFilename(note.title || "Untitled");
    if (used.has(name)) {
      const stem = name.replace(/\.md$/i, "");
      let i = 2;
      while (used.has(`${stem}-${i}.md`)) i++;
      name = `${stem}-${i}.md`;
    }
    used.add(name);
    files[name] = strToU8(noteToMarkdown(note));
  }

  return await new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => {
      if (err) return reject(err);
      resolve(new Blob([data], { type: "application/zip" }));
    });
  });
}

/**
 * Share a note as a .md file via the Web Share API (level 2) if the browser
 * supports sharing files. Falls back to a download otherwise. Returns
 * `{ shared: boolean, downloaded: boolean }`.
 */
export async function shareNoteAsMarkdown(note) {
  const text = noteToMarkdown(note);
  const filename = safeFilename(note.title || "note");
  try {
    if (typeof navigator !== "undefined" && navigator.canShare) {
      const file = new File([text], filename, { type: "text/markdown" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: note.title || "Iron Rabbit note",
        });
        return { shared: true, downloaded: false };
      }
    }
  } catch (err) {
    // AbortError is a user cancel — treat as no-op, not fallback
    if (err && err.name === "AbortError") {
      return { shared: false, downloaded: false, cancelled: true };
    }
  }
  downloadTextFile(text, filename);
  return { shared: false, downloaded: true };
}
