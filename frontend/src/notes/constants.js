// Shared constants for the Notes app.
// Extracted from the original monolithic NotesApp.jsx.

import { GripVertical, CalendarDays, ArrowUpAZ, ArrowDownAZ, Clock, Pencil, Tag, Filter } from "lucide-react";

// Note color palette.
// - Solid entries (first 5) use their own CSS class (`.note-<name>`).
// - Gradient entries share `.note-gradient` and drive their look via inline
//   styles at the render site (see `getNoteColorStyle` below).
// `accent` is the dominant hex for the swatch dot, category color, and PDF export.
// `gradient` (optional) is the swatch preview + tile fill.
// `bg` / `border` (optional) are the tile background/border overrides.
export const NOTE_COLORS = [
  // --- Original 5 solids (kept for backwards compatibility) ---
  { name: "purple", label: "Electric Purple", class: "note-purple", accent: "#a855f7" },
  { name: "cyan",   label: "Neon Cyan",       class: "note-cyan",   accent: "#06b6d4" },
  { name: "lime",   label: "Acid Green",      class: "note-lime",   accent: "#84cc16" },
  { name: "pink",   label: "Hot Pink",        class: "note-pink",   accent: "#ec4899" },
  { name: "orange", label: "Solar Orange",    class: "note-orange", accent: "#f97316" },

  // --- 20 gradient palettes ---
  { name: "sunset",    label: "Sunset",     class: "note-gradient", accent: "#f97316",
    gradient: "linear-gradient(135deg, #f97316 0%, #ec4899 100%)",
    bg:       "linear-gradient(135deg, rgba(249,115,22,0.14) 0%, rgba(236,72,153,0.14) 100%)",
    border:   "rgba(236, 72, 153, 0.45)" },
  { name: "ocean",     label: "Ocean",      class: "note-gradient", accent: "#06b6d4",
    gradient: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
    bg:       "linear-gradient(135deg, rgba(6,182,212,0.14) 0%, rgba(59,130,246,0.14) 100%)",
    border:   "rgba(59, 130, 246, 0.45)" },
  { name: "forest",    label: "Forest",     class: "note-gradient", accent: "#059669",
    gradient: "linear-gradient(135deg, #84cc16 0%, #059669 100%)",
    bg:       "linear-gradient(135deg, rgba(132,204,22,0.14) 0%, rgba(5,150,105,0.14) 100%)",
    border:   "rgba(5, 150, 105, 0.45)" },
  { name: "lavender",  label: "Lavender",   class: "note-gradient", accent: "#c084fc",
    gradient: "linear-gradient(135deg, #c084fc 0%, #ec4899 100%)",
    bg:       "linear-gradient(135deg, rgba(192,132,252,0.14) 0%, rgba(236,72,153,0.14) 100%)",
    border:   "rgba(192, 132, 252, 0.45)" },
  { name: "gold",      label: "Gold",       class: "note-gradient", accent: "#eab308",
    gradient: "linear-gradient(135deg, #fde047 0%, #d97706 100%)",
    bg:       "linear-gradient(135deg, rgba(253,224,71,0.14) 0%, rgba(217,119,6,0.14) 100%)",
    border:   "rgba(217, 119, 6, 0.45)" },
  { name: "crimson",   label: "Crimson",    class: "note-gradient", accent: "#dc2626",
    gradient: "linear-gradient(135deg, #ef4444 0%, #be123c 100%)",
    bg:       "linear-gradient(135deg, rgba(239,68,68,0.14) 0%, rgba(190,18,60,0.14) 100%)",
    border:   "rgba(190, 18, 60, 0.45)" },
  { name: "teal",      label: "Teal Mist",  class: "note-gradient", accent: "#14b8a6",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%)",
    bg:       "linear-gradient(135deg, rgba(20,184,166,0.14) 0%, rgba(6,182,212,0.14) 100%)",
    border:   "rgba(20, 184, 166, 0.45)" },
  { name: "indigo",    label: "Indigo Sky", class: "note-gradient", accent: "#6366f1",
    gradient: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
    bg:       "linear-gradient(135deg, rgba(99,102,241,0.14) 0%, rgba(168,85,247,0.14) 100%)",
    border:   "rgba(99, 102, 241, 0.45)" },
  { name: "rose",      label: "Rose",       class: "note-gradient", accent: "#f43f5e",
    gradient: "linear-gradient(135deg, #f43f5e 0%, #db2777 100%)",
    bg:       "linear-gradient(135deg, rgba(244,63,94,0.14) 0%, rgba(219,39,119,0.14) 100%)",
    border:   "rgba(244, 63, 94, 0.45)" },
  { name: "mint",      label: "Mint",       class: "note-gradient", accent: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #84cc16 100%)",
    bg:       "linear-gradient(135deg, rgba(16,185,129,0.14) 0%, rgba(132,204,22,0.14) 100%)",
    border:   "rgba(16, 185, 129, 0.45)" },
  { name: "sky",       label: "Sky",        class: "note-gradient", accent: "#0ea5e9",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
    bg:       "linear-gradient(135deg, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.14) 100%)",
    border:   "rgba(14, 165, 233, 0.45)" },
  { name: "peach",     label: "Peach",      class: "note-gradient", accent: "#fb923c",
    gradient: "linear-gradient(135deg, #fb923c 0%, #f472b6 100%)",
    bg:       "linear-gradient(135deg, rgba(251,146,60,0.14) 0%, rgba(244,114,182,0.14) 100%)",
    border:   "rgba(251, 146, 60, 0.45)" },
  { name: "slate",     label: "Slate",      class: "note-gradient", accent: "#64748b",
    gradient: "linear-gradient(135deg, #94a3b8 0%, #475569 100%)",
    bg:       "linear-gradient(135deg, rgba(148,163,184,0.14) 0%, rgba(71,85,105,0.14) 100%)",
    border:   "rgba(100, 116, 139, 0.45)" },
  { name: "copper",    label: "Copper",     class: "note-gradient", accent: "#ea580c",
    gradient: "linear-gradient(135deg, #ea580c 0%, #dc2626 100%)",
    bg:       "linear-gradient(135deg, rgba(234,88,12,0.14) 0%, rgba(220,38,38,0.14) 100%)",
    border:   "rgba(234, 88, 12, 0.45)" },
  { name: "plum",      label: "Plum",       class: "note-gradient", accent: "#7c3aed",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
    bg:       "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(79,70,229,0.14) 100%)",
    border:   "rgba(124, 58, 237, 0.45)" },
  { name: "lagoon",    label: "Lagoon",     class: "note-gradient", accent: "#0891b2",
    gradient: "linear-gradient(135deg, #22d3ee 0%, #14b8a6 100%)",
    bg:       "linear-gradient(135deg, rgba(34,211,238,0.14) 0%, rgba(20,184,166,0.14) 100%)",
    border:   "rgba(20, 184, 166, 0.45)" },
  { name: "cherry",    label: "Cherry",     class: "note-gradient", accent: "#db2777",
    gradient: "linear-gradient(135deg, #db2777 0%, #b91c1c 100%)",
    bg:       "linear-gradient(135deg, rgba(219,39,119,0.14) 0%, rgba(185,28,28,0.14) 100%)",
    border:   "rgba(219, 39, 119, 0.45)" },
  { name: "neon",      label: "Neon",       class: "note-gradient", accent: "#84cc16",
    gradient: "linear-gradient(135deg, #a3e635 0%, #22d3ee 100%)",
    bg:       "linear-gradient(135deg, rgba(163,230,53,0.14) 0%, rgba(34,211,238,0.14) 100%)",
    border:   "rgba(34, 211, 238, 0.45)" },
  { name: "dusk",      label: "Dusk",       class: "note-gradient", accent: "#4f46e5",
    gradient: "linear-gradient(135deg, #4f46e5 0%, #ec4899 100%)",
    bg:       "linear-gradient(135deg, rgba(79,70,229,0.14) 0%, rgba(236,72,153,0.14) 100%)",
    border:   "rgba(79, 70, 229, 0.45)" },
  { name: "graphite",  label: "Graphite",   class: "note-gradient", accent: "#475569",
    gradient: "linear-gradient(135deg, #475569 0%, #1e293b 100%)",
    bg:       "linear-gradient(135deg, rgba(71,85,105,0.18) 0%, rgba(30,41,59,0.18) 100%)",
    border:   "rgba(71, 85, 105, 0.55)" },
];

/**
 * Returns inline style for a note colour config. Solid palette entries
 * return null (their CSS class already covers them). Gradient entries
 * return `{ background, borderColor }` so components can spread this
 * directly onto the container that already has `note-gradient` as a class.
 *
 * In dark mode the tint gradient is layered over a translucent `#0B1221`
 * base (55% alpha) so the wallpaper / app background shows through — while
 * `text-slate-100`/`text-white` still has enough backing to stay readable
 * on any palette. Fully-opaque `#0B1221` was making note cards feel like
 * cutouts rather than glass on top of the wallpaper.
 */
export function getNoteColorStyle(colorConfig, isDark = true) {
  if (!colorConfig || !colorConfig.gradient) return null;
  const tint = colorConfig.bg || colorConfig.gradient;
  return {
    background: isDark ? `${tint}, rgba(11, 18, 33, 0.55)` : tint,
    borderColor: colorConfig.border || colorConfig.accent,
  };
}

export const SOUND_OPTIONS = [
  { value: "bell",   label: "Bell",   icon: "🔔" },
  { value: "chime",  label: "Chime",  icon: "✨" },
  { value: "signal", label: "Signal", icon: "📢" },
];

export const SORT_OPTIONS = [
  { value: "custom",           label: "Manual Order",     icon: GripVertical },
  { value: "priority",         label: "Custom Priority",  icon: Filter },
  { value: "newest",           label: "Newest First",     icon: CalendarDays },
  { value: "oldest",           label: "Oldest First",     icon: CalendarDays },
  { value: "a-z",              label: "A → Z",            icon: ArrowUpAZ },
  { value: "z-a",              label: "Z → A",            icon: ArrowDownAZ },
  { value: "recently-viewed",  label: "Recently Viewed",  icon: Clock },
  { value: "recently-edited",  label: "Recently Edited",  icon: Pencil },
  { value: "category",         label: "By Category",      icon: Tag },
];

// Sort modes that are valid as user-authored Custom Priority RULES.
// Excludes "custom" (Manual Order is not a rule) and "priority" itself
// (rules can't reference the mode they belong to). Rendered by
// CustomPriorityEditor.jsx and consumed by the priority comparator in
// NotesApp.jsx `processedNotes` useMemo.
export const CUSTOM_PRIORITY_RULES = [
  { value: "newest",           label: "Newest First",     icon: CalendarDays },
  { value: "oldest",           label: "Oldest First",     icon: CalendarDays },
  { value: "a-z",              label: "A → Z",            icon: ArrowUpAZ },
  { value: "z-a",              label: "Z → A",            icon: ArrowDownAZ },
  { value: "recently-viewed",  label: "Recently Viewed",  icon: Clock },
  { value: "recently-edited",  label: "Recently Edited",  icon: Pencil },
  { value: "category",         label: "By Category",      icon: Tag },
];

export const FILTER_OPTIONS = [
  { value: "all",           label: "All Notes" },
  { value: "uncategorized", label: "Uncategorized" },
  { value: "today",         label: "Today" },
  { value: "week",          label: "This Week" },
  { value: "month",         label: "This Month" },
  { value: "archived",      label: "Archived" },
  { value: "trash",         label: "Trash" },
];

export const DEFAULT_TEMPLATES = [
  { name: "Work Meeting",       title: "Meeting Notes",  content: "Attendees:\n\nAgenda:\n\nAction Items:\n",                 color: "cyan",   category: "Work",     icon: "Presentation", background: { type: "gradient", value: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)" } },
  { name: "Daily Standup",      title: "Daily Standup",  content: "Yesterday:\n\nToday:\n\nBlockers:\n",                      color: "lime",   category: "Work",     icon: "Users",        background: { type: "gradient", value: "linear-gradient(135deg, #86efac 0%, #059669 100%)" } },
  { name: "Shopping List",      title: "Shopping List",  content: "- \n- \n- \n",                                             color: "orange", category: "Personal", icon: "ShoppingCart", background: { type: "gradient", value: "linear-gradient(135deg, #f97316 0%, #db2777 100%)" } },
  { name: "Health Appointment", title: "Doctor Visit",   content: "Date:\nTime:\nDoctor:\nNotes:\n",                          color: "pink",   category: "Health",   icon: "Stethoscope",  background: { type: "gradient", value: "linear-gradient(135deg, #fbcfe8 0%, #be123c 100%)" } },
  { name: "Project Task",       title: "Task",           content: "Description:\n\nDeadline:\n\nSteps:\n1. \n2. \n3. \n",     color: "purple", category: "Work",     icon: "Target",       background: { type: "gradient", value: "linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)" } },
];
