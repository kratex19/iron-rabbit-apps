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
 * First-launch nudge:
 *   • Until the user has opened ANY guide, the button gently pulses and shows
 *     a small "new" dot to draw attention. Once opened (or after ~15s of
 *     visibility on any screen), the nudge is dismissed permanently.
 *
 * Icon stays the familiar HelpCircle (`?`) — vocabulary is "Quick Guide" but
 * the icon is universally recognised.
 */

import React, { useCallback, useEffect, useRef } from "react";
import { HelpCircle } from "lucide-react";
import { useQuickGuideContext } from "./QuickGuideProvider";
import { QG_TOKENS } from "./tokens";

const NUDGE_AUTO_DISMISS_MS = 15000;

export default function QuickGuideButton({
  resourceId,
  origin,
  isDark = true,
  className = "",
  size = "md", // "sm" | "md"
  ariaLabel,
}) {
  const { state, open, getArticle, dismissNudge } = useQuickGuideContext();
  const tapTimestampsRef = useRef([]);

  const article = getArticle(resourceId);
  const disabled = !article; // no article registered → render nothing rather than a dead button
  const showNudge = !disabled && state.enabled && !state.nudge_seen;

  // Auto-dismiss the nudge after the button has been visible for a while,
  // so it never nags forever even if the user is exploring other screens.
  useEffect(() => {
    if (!showNudge) return;
    const t = setTimeout(() => { dismissNudge(); }, NUDGE_AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [showNudge, dismissNudge]);

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
      title={state.enabled ? (showNudge ? "New — tap for a quick guide" : "Quick Guide") : "Quick Guides are turned off — triple-tap to peek"}
      data-testid={`quickguide-btn-${resourceId}`}
      data-nudge={showNudge ? "on" : "off"}
      className={`relative inline-flex items-center justify-center rounded-full transition ${sizeClasses} ${
        isDark
          ? "text-slate-300 hover:text-white hover:bg-white/10"
          : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      } ${showNudge ? "qg-nudge" : ""} ${className}`}
    >
      <HelpCircle className={iconSize} strokeWidth={2} />
      {showNudge && (
        <span
          aria-hidden="true"
          className="qg-nudge-dot"
          data-testid={`quickguide-nudge-dot-${resourceId}`}
        />
      )}
    </button>
  );
}
