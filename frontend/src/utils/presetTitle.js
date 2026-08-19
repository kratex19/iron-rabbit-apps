// Friendly display title for a header preset, used by both the Home Page
// HeaderPresetPicker and the Weather Dashboard preset grid.
//
// Priority:
//   1. Explicit `preset.title` if present (e.g. "Yard Ball Sunset").
//   2. Otherwise fall back to a title-cased first tag + category, e.g.
//      { category: "Nature", tags: ["forest"] }  →  "Forest Nature".
//   3. Final fallback: the raw preset id.

function toTitleCase(s) {
  return String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function getPresetTitle(preset) {
  if (!preset) return "";
  if (typeof preset.title === "string" && preset.title.trim()) return preset.title.trim();
  const firstTag = Array.isArray(preset.tags) && preset.tags.length ? toTitleCase(preset.tags[0]) : "";
  const cat = preset.category ? toTitleCase(preset.category) : "";
  if (firstTag && cat && firstTag.toLowerCase() !== cat.toLowerCase()) return `${firstTag} ${cat}`;
  return firstTag || cat || `Preset ${preset.id || ""}`.trim();
}

// A slightly richer string for accessibility (`alt` attribute) — includes
// the category so screen readers announce "Forest Nature — Nature header
// background" instead of just "Forest Nature".
export function getPresetAlt(preset) {
  const t = getPresetTitle(preset);
  const cat = preset?.category ? toTitleCase(preset.category) : "";
  if (cat && !t.toLowerCase().includes(cat.toLowerCase())) return `${t} — ${cat} header background`;
  return `${t} header background`;
}

// Search-friendly haystack: id + title + category + tags.
export function getPresetSearchHay(preset) {
  return [
    preset?.id,
    getPresetTitle(preset),
    preset?.category,
    ...(Array.isArray(preset?.tags) ? preset.tags : []),
  ].filter(Boolean).join(" ").toLowerCase();
}
