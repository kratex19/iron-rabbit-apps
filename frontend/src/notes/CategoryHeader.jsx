import React from "react";
import { Sparkles, Pin, ChevronDown } from "lucide-react";
import { NOTE_COLORS } from "./constants";

/**
 * Styled section header that mimics the pack-card header in
 * TilePacksModal: a colored square (accent gradient/color) with a
 * white Sparkles icon, followed by the section name in a bold semibold
 * label and a subtle count badge.
 *
 * Props:
 *   title      – section label (e.g., "PINNED", "IDEAS", or a category name)
 *   accent     – optional CSS color or gradient string. If not passed, we
 *                derive it from the first note's `color` field.
 *   notes      – optional list of notes in this section; used to derive
 *                a fallback accent and the count badge.
 *   count      – optional override for the count badge
 *   pinned     – if true, replaces the Sparkles glyph with a Pin icon.
 *   isDark
 *   onToggle   – optional; if provided the header becomes a tappable
 *                collapse trigger and shows a rotating chevron on the
 *                right. Parent owns the open/closed state.
 *   isOpen     – open/closed state paired with onToggle.
 */
export default function CategoryHeader({ title, accent, notes, count, pinned = false, isDark, dragHandleProps = null, onToggle, isOpen }) {
  const derived = accent || (() => {
    // 1. Prefer the pack's own accent if any note in this group was applied
    //    from a Tile Pack (kept in sync with the pack card in TilePacksModal).
    const withPack = Array.isArray(notes) ? notes.find(n => n?.pack_accent) : null;
    if (withPack) return withPack.pack_accent;
    // 2. Fall back to the first note's color from NOTE_COLORS.
    const first = Array.isArray(notes) ? notes.find(n => n?.color) : null;
    const cfg = first ? NOTE_COLORS.find(c => c.name === first.color) : null;
    return cfg?.gradient || cfg?.accent || "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)";
  })();
  const displayCount = count ?? (Array.isArray(notes) ? notes.length : undefined);
  const Ico = pinned ? Pin : Sparkles;

  const isCollapsible = typeof onToggle === "function";

  const inner = (
    <>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
        style={{ background: derived }}
        aria-hidden="true"
      >
        <Ico className="w-4 h-4 text-white" strokeWidth={pinned ? 2.5 : 2} />
      </div>
      <div className="min-w-0 flex-1 text-left">
        <div
          className={`text-sm truncate transition-colors ${
            isOpen
              ? "font-bold"
              : isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"
          }`}
          style={isOpen
            ? { color: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }
            : undefined}
        >
          {title}
        </div>
        {typeof displayCount === "number" && (
          <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {displayCount} {displayCount === 1 ? "tile" : "tiles"}
          </div>
        )}
      </div>
      {isCollapsible && (
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-slate-400" : "text-gray-500"}`}
          aria-hidden="true"
        />
      )}
    </>
  );

  if (isCollapsible) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!!isOpen}
        className={`w-full flex items-center gap-2 px-1 mb-2 rounded-md transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"} ${dragHandleProps ? "cursor-grab active:cursor-grabbing select-none py-1 -mx-1 px-2" : "py-1"}`}
        data-testid={`category-header-${title}`}
        {...(dragHandleProps || {})}
      >
        {inner}
      </button>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-1 mb-2 rounded-md ${dragHandleProps ? "cursor-grab active:cursor-grabbing select-none py-1 -mx-1 px-2 hover:bg-black/5 dark:hover:bg-white/5" : ""}`}
      data-testid={`category-header-${title}`}
      {...(dragHandleProps || {})}
    >
      {inner}
    </div>
  );
}
