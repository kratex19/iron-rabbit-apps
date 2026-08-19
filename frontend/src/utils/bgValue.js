// Shared helpers for the Home Page header + Weather Dashboard background surfaces.
// A background value can be one of:
//   1. an image URL       — "/header-presets/header-42.webp" or "https://..." or "data:image/..."
//   2. a CSS solid color  — "#e11d48" or "rgb(...)"
//   3. a CSS gradient     — "linear-gradient(135deg, #f97316 0%, #db2777 100%)"
//   4. empty / null       — no background override
//
// Both surfaces store the value as a single string field.

// Detect whether a string is a CSS color/gradient (rather than an image URL).
export function isCssBackground(str) {
  if (!str || typeof str !== "string") return false;
  const s = str.trim().toLowerCase();
  return (
    s.startsWith("#") ||
    s.startsWith("rgb(") || s.startsWith("rgba(") ||
    s.startsWith("hsl(") || s.startsWith("hsla(") ||
    s.startsWith("linear-gradient(") ||
    s.startsWith("radial-gradient(") ||
    s.startsWith("conic-gradient(")
  );
}

// Convert the picker's { type, value } shape into a single string for storage.
// Returns "" when the caller clears the background.
export function bgObjToString(bg) {
  if (!bg) return "";
  if (bg.type === "color" || bg.type === "gradient") return String(bg.value || "");
  if (bg.type === "image") return String(bg.value || "");
  return "";
}

// Reverse: convert a stored string back into { type, value } for the picker
// so it can highlight the current selection.
export function stringToBgObj(str) {
  if (!str) return null;
  if (!isCssBackground(str)) return { type: "image", value: str };
  const lower = str.trim().toLowerCase();
  if (lower.startsWith("linear-gradient(") || lower.startsWith("radial-gradient(") || lower.startsWith("conic-gradient(")) {
    return { type: "gradient", value: str };
  }
  return { type: "color", value: str };
}

// Turn a stored string into a React style object suitable for both
// full-page dashboard backgrounds and the app header strip.
// `size` controls how images are rendered — "cover" for full-page, "cover" for header.
export function resolveBackgroundStyle(str, { size = "cover", position = "center" } = {}) {
  if (!str) return {};
  if (isCssBackground(str)) {
    return { background: str };
  }
  return {
    backgroundImage: `url(${str})`,
    backgroundSize: size,
    backgroundPosition: position,
    backgroundRepeat: "no-repeat",
  };
}
