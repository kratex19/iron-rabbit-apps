// Friendly display title for a header preset, used by both the Home Page
// HeaderPresetPicker and the Weather Dashboard preset grid.
//
// Priority:
//   1. User-set custom rename (persisted in localStorage — see below).
//   2. Explicit `preset.title` from manifest.json (e.g. "Yard Ball Sunset").
//   3. Otherwise fall back to a title-cased first tag + category, e.g.
//      { category: "Nature", tags: ["forest"] }  →  "Forest Nature".
//   4. Final fallback: the raw preset id.

const OVERRIDES_KEY = "iron_rabbit_preset_title_overrides_v1";

// Fire a synthetic event so any mounted picker can re-render when a title
// changes elsewhere (e.g. Home Page rename → Dashboard picker refreshes).
const OVERRIDES_EVENT = "iron-rabbit-preset-overrides-changed";

export function loadTitleOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // Coerce all values to trimmed strings
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export function saveTitleOverride(id, title) {
  const overrides = loadTitleOverrides();
  const clean = String(title || "").trim();
  if (clean) overrides[id] = clean;
  else delete overrides[id];
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
    window.dispatchEvent(new CustomEvent(OVERRIDES_EVENT));
  } catch { /* storage full / private mode — silent */ }
  return overrides;
}

export function clearTitleOverride(id) {
  return saveTitleOverride(id, "");
}

// Subscribe to override changes. Returns an unsubscribe fn.
export function subscribeTitleOverrides(cb) {
  const handler = () => cb(loadTitleOverrides());
  window.addEventListener(OVERRIDES_EVENT, handler);
  window.addEventListener("storage", handler); // cross-tab sync
  return () => {
    window.removeEventListener(OVERRIDES_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function toTitleCase(s) {
  return String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function getPresetTitle(preset, overrides) {
  if (!preset) return "";
  const map = overrides || loadTitleOverrides();
  const override = preset.id != null ? map[String(preset.id)] : null;
  if (override && override.trim()) return override.trim();
  if (typeof preset.title === "string" && preset.title.trim()) return preset.title.trim();
  const firstTag = Array.isArray(preset.tags) && preset.tags.length ? toTitleCase(preset.tags[0]) : "";
  const cat = preset.category ? toTitleCase(preset.category) : "";
  if (firstTag && cat && firstTag.toLowerCase() !== cat.toLowerCase()) return `${firstTag} ${cat}`;
  return firstTag || cat || `Preset ${preset.id || ""}`.trim();
}

// Auto-derived title only — ignores any user override. Used by the rename
// modal so it can offer a "Reset" button and know when to persist.
export function getPresetDefaultTitle(preset) {
  return getPresetTitle(preset, {});
}

// A slightly richer string for accessibility (`alt` attribute) — includes
// the category so screen readers announce "Forest Nature — Nature header
// background" instead of just "Forest Nature".
export function getPresetAlt(preset, overrides) {
  const t = getPresetTitle(preset, overrides);
  const cat = preset?.category ? toTitleCase(preset.category) : "";
  if (cat && !t.toLowerCase().includes(cat.toLowerCase())) return `${t} — ${cat} header background`;
  return `${t} header background`;
}

// Search-friendly haystack: id + title + category + tags.
export function getPresetSearchHay(preset, overrides) {
  return [
    preset?.id,
    getPresetTitle(preset, overrides),
    preset?.category,
    ...(Array.isArray(preset?.tags) ? preset.tags : []),
  ].filter(Boolean).join(" ").toLowerCase();
}
