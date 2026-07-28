import React from "react";
import { Sparkles, Pin } from "lucide-react";
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
 */
export default function CategoryHeader({ title, accent, notes, count, pinned = false, isDark }) {
  const derived = accent || (() => {
    const first = Array.isArray(notes) ? notes.find(n => n?.color) : null;
    const cfg = first ? NOTE_COLORS.find(c => c.name === first.color) : null;
    return cfg?.gradient || cfg?.accent || "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)";
  })();
  const displayCount = count ?? (Array.isArray(notes) ? notes.length : undefined);
  const Ico = pinned ? Pin : Sparkles;

  return (
    <div className="flex items-center gap-2 px-1 mb-2" data-testid={`category-header-${title}`}>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
        style={{ background: derived }}
        aria-hidden="true"
      >
        <Ico className="w-4 h-4 text-white" strokeWidth={pinned ? 2.5 : 2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={`font-semibold text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}>
          {title}
        </div>
        {typeof displayCount === "number" && (
          <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {displayCount} {displayCount === 1 ? "tile" : "tiles"}
          </div>
        )}
      </div>
    </div>
  );
}
