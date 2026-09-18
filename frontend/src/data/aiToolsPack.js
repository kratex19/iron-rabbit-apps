/**
 * AI Tools — 100 Free AI Tools pack.
 *
 * The 100 tools + their canonical URLs + their 20-category grouping
 * come from `./aiToolsPack.raw.json`, which is the AUTHORITATIVE source
 * supplied by the user. This module ONLY normalizes those records into
 * the shape the existing Tile Pack system expects (see
 * `./tilePacks.js` for the shape). It never invents, alters, or
 * substitutes tool names, categories, descriptions, or URLs.
 *
 * Each note gets:
 *   - title            = raw.tile_title              (verbatim)
 *   - category         = raw.category                (verbatim — keeps the
 *                                                    numeric prefix so the
 *                                                    home list stays in
 *                                                    the source ordering)
 *   - category_path    = [raw.category]              (single-level, plugs
 *                                                    into the CURRENT
 *                                                    Iron Rabbit unlimited-
 *                                                    depth hierarchy)
 *   - url / external_url = raw.outbound_url          (verbatim)
 *   - special_action   = "open_external_url"         (existing tile
 *                                                    handler routes taps
 *                                                    into `window.open`)
 *   - tags             = ["AI"] + any raw tag strings
 *   - pack_id / pack_name / pack_accent               (ownership metadata
 *                                                    already understood by
 *                                                    the rest of the app)
 *   - pack_source_key  = "<category>::<position>::<title>" — deterministic
 *                        key used for dedup + safe uninstall. Never
 *                        collides with user-generated content.
 */
import raw from "./aiToolsPack.raw.json";

// Small, category-appropriate icon + gradient assignment. Icons are all
// lucide names already present in the app. Gradients are inlined so this
// file has zero cross-dependencies on tilePacks.js.
const CATEGORY_STYLE = {
  "01 Chat & Assistants":         { icon: "MessageSquare",  bg: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" },
  "02 Content Writing":           { icon: "PenLine",        bg: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)" },
  "03 Image Generation":          { icon: "Image",          bg: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)" },
  "04 Photo Editing":             { icon: "ImageDown",      bg: "linear-gradient(135deg, #f59e0b 0%, #db2777 100%)" },
  "05 Video Generation":          { icon: "Video",          bg: "linear-gradient(135deg, #dc2626 0%, #7c2d12 100%)" },
  "06 Audio & Voice":             { icon: "Mic",            bg: "linear-gradient(135deg, #10b981 0%, #064e3b 100%)" },
  "07 Transcription":             { icon: "FileAudio",      bg: "linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)" },
  "08 Presentations":             { icon: "Presentation",   bg: "linear-gradient(135deg, #f97316 0%, #b45309 100%)" },
  "09 Productivity":              { icon: "Zap",            bg: "linear-gradient(135deg, #eab308 0%, #a16207 100%)" },
  "10 Research & Search":         { icon: "Search",         bg: "linear-gradient(135deg, #0ea5e9 0%, #1e40af 100%)" },
  "11 Code Assistance":           { icon: "Code2",          bg: "linear-gradient(135deg, #22c55e 0%, #14532d 100%)" },
  "12 Data & Analytics":          { icon: "BarChart3",      bg: "linear-gradient(135deg, #8b5cf6 0%, #4c1d95 100%)" },
  "13 Marketing & SEO":           { icon: "TrendingUp",     bg: "linear-gradient(135deg, #f43f5e 0%, #881337 100%)" },
  "14 Social Media":              { icon: "Share2",         bg: "linear-gradient(135deg, #a855f7 0%, #6b21a8 100%)" },
  "15 Design & Creativity":       { icon: "Palette",        bg: "linear-gradient(135deg, #ec4899 0%, #be185d 100%)" },
  "16 Education & Learning":      { icon: "GraduationCap",  bg: "linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)" },
  "17 Automation & Workflow":     { icon: "Workflow",       bg: "linear-gradient(135deg, #64748b 0%, #0f172a 100%)" },
  "18 AI Detectors & Humanizers": { icon: "ShieldCheck",    bg: "linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)" },
  "19 Finance & Business":        { icon: "Briefcase",      bg: "linear-gradient(135deg, #059669 0%, #052e16 100%)" },
  "20 Miscellaneous":             { icon: "Sparkles",       bg: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)" },
};
const FALLBACK_STYLE = { icon: "Sparkles", bg: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" };

const PACK_ID = "ai-tools-100-free";
const PACK_NAME = "AI Tools — 100 Free AI Tools";
const PACK_ACCENT = "#8b5cf6";

const tiles = Array.isArray(raw?.tiles) ? raw.tiles : [];

const notes = tiles.map((t) => {
  const style = CATEGORY_STYLE[t.category] || FALLBACK_STYLE;
  const rawTagList = typeof t.tags === "string"
    ? t.tags.split(",").map((s) => s.trim()).filter(Boolean)
    : Array.isArray(t.tags) ? t.tags.filter(Boolean) : [];
  const category = String(t.category || "").trim();
  return {
    title: String(t.tile_title || "").trim(),
    content: `${String(t.description || "").trim()}\n\nOpen: ${t.outbound_url}`.trim(),
    color: "indigo",
    icon: style.icon,
    background: { type: "gradient", value: style.bg },
    // Category kept verbatim from source. `category_path` plugs into the
    // CURRENT Iron Rabbit unlimited-depth hierarchy — a single-level
    // path renders identically to a legacy top-level category and
    // participates in all subcategory drag / rename / delete flows.
    category,
    category_path: category ? [category] : [],
    // Outbound URL is preserved verbatim.
    url: t.outbound_url,
    external_url: t.outbound_url,
    special_action: "open_external_url",
    tags: Array.from(new Set(["AI", ...rawTagList])),
    // Dedup + safe-uninstall handle. Category+position+title makes each
    // key stable across re-installs and identifies pack-owned tiles
    // uniquely even for the several titles that repeat across categories
    // (e.g. ChatGPT appears in cats 01, 02, 12, 16).
    pack_source_key: `${category}::${t.position}::${t.tile_title}`,
    pack_tile: true,
  };
});

// The pack object exported here has the exact same shape the existing
// TILE_PACKS entries use (see `./tilePacks.js`). Registration is a
// simple spread inside that array — no other Tile Pack code changes.
const AI_TOOLS_100_PACK = {
  id: PACK_ID,
  name: PACK_NAME,
  tagline: "20 categories × 5 tools each — 100 curated free AI utilities. Every tile opens the tool's official site.",
  accent: PACK_ACCENT,
  notes,
};

export default AI_TOOLS_100_PACK;
export { PACK_ID as AI_TOOLS_PACK_ID };
