import React, { useRef } from "react";
import { Sparkles, Pin, ChevronDown, GripVertical } from "lucide-react";
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
export default function CategoryHeader({
  title, accent, notes, count, pinned = false, isDark,
  dragHandleProps = null, onToggle, isOpen,
  isSticky = false, onToggleSticky = null,
  isPinnedTop = false, onTogglePinTop = null,
}) {
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

  // Pin button with two behaviors:
  //   • Tap        → toggle sticky-position (locked at current index)
  //   • Long-press → toggle pin-to-top     (bubble above non-pinned)
  // Colour states are mutually exclusive:
  //   amber (filled) = pinned to top
  //   indigo (outline) = sticky-locked
  //   muted (outline)  = neither
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);

  const startLongPress = () => {
    longPressFiredRef.current = false;
    if (!onTogglePinTop) return;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      onTogglePinTop();
    }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const onPinClick = (e) => {
    e.stopPropagation();
    if (longPressFiredRef.current) {
      // Long-press already fired the top-pin toggle — don't also
      // fire the sticky tap.
      longPressFiredRef.current = false;
      return;
    }
    onToggleSticky?.();
  };

  const pinEl = (onToggleSticky || onTogglePinTop) ? (
    <button
      type="button"
      onClick={onPinClick}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerLeave={cancelLongPress}
      onPointerCancel={cancelLongPress}
      aria-label={isPinnedTop
        ? `Unpin ${title} from top`
        : isSticky
          ? `Unlock ${title} position`
          : `Tap to lock ${title} position, long-press to pin to top`}
      className={`shrink-0 ml-1 w-9 h-9 inline-flex items-center justify-center rounded-md transition-colors ${
        isPinnedTop
          ? "text-amber-400 hover:bg-amber-500/10"
          : isSticky
            ? (isDark ? "text-indigo-300 hover:bg-white/10" : "text-indigo-500 hover:bg-black/5")
            : (isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-black/5")
      }`}
      title={isPinnedTop
        ? "Pinned to top — tap to unpin, long-press again to lock in place"
        : isSticky
          ? "Locked in place — tap to unlock, long-press to pin to top"
          : "Tap to lock position · Long-press to pin to top"}
      data-testid={`category-pin-${title}`}
    >
      <Pin
        className="w-4 h-4"
        strokeWidth={2.4}
        fill={isPinnedTop || isSticky ? "currentColor" : "none"}
      />
    </button>
  ) : null;

  if (isCollapsible) {
    return (
      <div
        className={`w-full flex items-center gap-1 px-1 mb-2 rounded-md ${dragHandleProps ? "py-1 -mx-1 px-2" : "py-1"}`}
        data-testid={`category-header-${title}`}
      >
        {gripEl}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!!isOpen}
          className={`flex-1 flex items-center gap-2 rounded-md transition-colors text-left ${isDark ? "hover:bg-white/5" : "hover:bg-black/5"} py-1 px-1`}
          data-testid={`category-toggle-${title}`}
        >
          {inner}
        </button>
        {pinEl}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 px-1 mb-2 rounded-md ${dragHandleProps ? "py-1 -mx-1 px-2" : ""}`}
      data-testid={`category-header-${title}`}
    >
      {gripEl}
      <div className="flex-1 flex items-center gap-2">{inner}</div>
      {pinEl}
    </div>
  );
}
