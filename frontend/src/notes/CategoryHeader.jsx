import React from "react";
import { Sparkles, Pin, ChevronDown, GripVertical, Trash2 } from "lucide-react";
import { NOTE_COLORS } from "./constants";
import HierarchyPathButton from "./HierarchyPathButton";

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
export default function CategoryHeader({
  title, accent, notes, count, pinned = false, isDark,
  dragHandleProps = null, onToggle, isOpen,
  isPinnedTop = false, onTogglePinTop = null,
  onDeleteCategory = null,
  countNoun = { singular: "tile", plural: "tiles" },
  frameTone = null,
  hierarchyPath = null,
  onJumpToPath = null,
}) {
  // Optional colored frame around the header row itself (used by the
  // Blue / Yellow / Green pinned rails so each pinned section is
  // visually associated with its color).
  const FRAME_STYLES = {
    blue: isDark
      ? "border-2 border-blue-400/70 bg-blue-500/10"
      : "border-2 border-blue-400 bg-blue-50",
    yellow: isDark
      ? "border-2 border-amber-400/70 bg-amber-500/10"
      : "border-2 border-amber-400 bg-amber-50",
    green: isDark
      ? "border-2 border-emerald-400/70 bg-emerald-500/10"
      : "border-2 border-emerald-400 bg-emerald-50",
  };
  const frameClasses = frameTone && FRAME_STYLES[frameTone]
    ? `${FRAME_STYLES[frameTone]} rounded-2xl px-2 py-1.5`
    : "";
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
            ? { color: "#ffffff", WebkitTextFillColor: "#ffffff", textShadow: "0 1px 2px rgba(0,0,0,0.6)" }
            : undefined}
        >
          {title}
        </div>
        {typeof displayCount === "number" && (
          <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {displayCount} {displayCount === 1 ? countNoun.singular : countNoun.plural}
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

  // Visible drag grip — only when the parent passes dragHandleProps.
  // Splits the drag surface from the click surface so RBD's pointer
  // sensor never fights with the collapsible toggle's onClick.
  const gripEl = dragHandleProps ? (
    <span
      {...dragHandleProps}
      role="button"
      tabIndex={-1}
      aria-label={`Drag to reorder ${title}`}
      onClick={(e) => e.stopPropagation()}
      className={`shrink-0 -ml-0.5 mr-1 w-9 h-9 inline-flex items-center justify-center rounded-md cursor-grab active:cursor-grabbing touch-none ${isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-700 hover:bg-black/5"}`}
      data-testid={`category-drag-${title}`}
    >
      <GripVertical className="w-5 h-5" strokeWidth={2.2} />
    </span>
  ) : null;

  // Pin button — single behavior:
  //   tap = Pin to Top (bubble above non-pinned categories)
  // Colour states:
  //   amber (filled) = pinned to top
  //   muted (outline)  = not pinned
  const onPinClick = (e) => {
    e.stopPropagation();
    onTogglePinTop?.();
  };

  // Optional Grid-View hierarchy pop-out — reuses the same approved
  // blue rounded-square tree button from List View. Renders only when
  // caller supplies a non-empty `hierarchyPath`. Placed just before
  // the pin/trash controls so the header action group stays visually
  // aligned across the app.
  const hierarchyEl = (Array.isArray(hierarchyPath) && hierarchyPath.length > 0) ? (
    <HierarchyPathButton
      path={hierarchyPath}
      size="md"
      isDark={isDark}
      label={`Show hierarchy for ${title}`}
      testid={`category-hierarchy-grid-${title}`}
      onLongPress={onJumpToPath ? () => onJumpToPath(hierarchyPath) : null}
    />
  ) : null;

  const pinEl = onTogglePinTop ? (
    <button
      type="button"
      onClick={onPinClick}
      aria-label={isPinnedTop ? `Unpin ${title} from top` : `Pin ${title} to top`}
      className={`shrink-0 ml-1 w-9 h-9 inline-flex items-center justify-center rounded-md transition-colors ${
        isPinnedTop
          ? "text-amber-400 hover:bg-amber-500/10"
          : (isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-black/5")
      }`}
      title={isPinnedTop ? "Pinned to top — tap to unpin" : "Tap to pin to top"}
      data-testid={`category-pin-${title}`}
    >
      <Pin
        className="w-4 h-4"
        strokeWidth={2.4}
        fill={isPinnedTop ? "currentColor" : "none"}
      />
    </button>
  ) : null;

  const trashEl = onDeleteCategory ? (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onDeleteCategory(); }}
      aria-label={`Delete category ${title}`}
      title={`Delete category "${title}"`}
      className={`shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-md transition-colors ${
        isDark ? "text-slate-500 hover:text-red-300 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-500/10"
      }`}
      data-testid={`category-delete-${title}`}
    >
      <Trash2 className="w-4 h-4" strokeWidth={2.2} />
    </button>
  ) : null;

  if (isCollapsible) {
    return (
      <div
        className={`flex items-center gap-1 px-1 mb-2 rounded-md ${dragHandleProps ? "py-1 -mx-1 px-2" : ""} ${frameClasses}`}
        data-testid={`category-header-${title}`}
      >
        {gripEl}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          className="flex-1 flex items-center gap-2 text-left rounded-md p-1 -m-1 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
          data-testid={`category-toggle-${title}`}
        >
          {inner}
        </button>
        {hierarchyEl}
        {pinEl}
        {trashEl}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 px-1 mb-2 rounded-md ${dragHandleProps ? "py-1 -mx-1 px-2" : ""} ${frameClasses}`}
      data-testid={`category-header-${title}`}
    >
      {gripEl}
      <div className="flex-1 flex items-center gap-2">{inner}</div>
      {hierarchyEl}
      {pinEl}
      {trashEl}
    </div>
  );
}
