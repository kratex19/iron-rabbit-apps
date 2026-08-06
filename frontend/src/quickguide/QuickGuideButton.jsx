/**
 * QuickGuideButton — the `?` icon dropped into any screen's header.
 * The ONLY component every future screen author needs to touch.
 *
 * Behavior:
 *   • Tap when Quick Guides are enabled  → opens the guide
 *   • Tap when Quick Guides are disabled → tracks tap count.
 *     3 taps within QG_TOKENS.TRIPLE_TAP_WINDOW_MS opens the guide temporarily
 *     (does NOT permanently re-enable).
 *
 * Icon stays the familiar HelpCircle (`?`) — vocabulary is "Quick Guide" but
 * the icon is universally recognised.
 */

import React, { useCallback, useRef } from "react";
import { HelpCircle } from "lucide-react";
import { useQuickGuideContext } from "./QuickGuideProvider";
import { QG_TOKENS } from "./tokens";

export default function QuickGuideButton({
  resourceId,
  origin,
  isDark = true,
  className = "",
  size = "md", // "sm" | "md"
  ariaLabel,
}) {
  const { state, open, getArticle } = useQuickGuideContext();
  const tapTimestampsRef = useRef([]);

  const article = getArticle(resourceId);
  const disabled = !article; // no article registered → render nothing rather than a dead button

  const handleClick = useCallback(() => {
    if (state.enabled) {
      open(resourceId, { origin });
      return;
    }
    // Globally disabled — triple-tap detection
    const now = Date.now();
    const window = QG_TOKENS.TRIPLE_TAP_WINDOW_MS;
    const kept = tapTimestampsRef.current.filter(t => now - t <= window);
    kept.push(now);
    tapTimestampsRef.current = kept;
    if (kept.length >= QG_TOKENS.TRIPLE_TAP_REQUIRED) {
      tapTimestampsRef.current = [];
      open(resourceId, { origin, temporary: true });
    }
  }, [state.enabled, open, resourceId, origin]);

  if (disabled) return null;

  const sizeClasses = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel || `Open Quick Guide for ${article?.title || resourceId}`}
      title={state.enabled ? "Quick Guide" : "Quick Guides are turned off — triple-tap to peek"}
      data-testid={`quickguide-btn-${resourceId}`}
      className={`inline-flex items-center justify-center rounded-full transition ${sizeClasses} ${
        isDark
          ? "text-slate-300 hover:text-white hover:bg-white/10"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      } ${className}`}
    >
      <HelpCircle className={iconSize} strokeWidth={2} />
    </button>
  );
}
