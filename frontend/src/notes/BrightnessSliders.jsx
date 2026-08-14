import React, { useEffect, useRef } from "react";

/**
 * BrightnessSliders — two ultra-compact horizontal sliders that let the
 * user tune text brightness and background brightness for a single scoped
 * surface (Home body, Quick-Text NoteModal, or Expanded FullScreenNote).
 *
 * The sliders emit CSS custom properties on the parent surface (via inline
 * style) rather than changing global theme — so the effect is strictly
 * scoped to the container that mounts this component. Values are held in
 * a single settings key `ui_brightness: { text: 0..1, bg: 0..1 }` shared
 * across all three surfaces so the look is consistent everywhere.
 *
 * Defaults: text=0.70 (70% toward white), bg=0.30 (30% toward light).
 * Double-tap the thumb → reset that slider to its default.
 * Zero visible chrome — thin transparent track + subtle thumb.
 */

const DEFAULT_TEXT = 0.7;
const DEFAULT_BG = 0.3;
const FIRST_SEEN_KEY = "ir_brightness_sliders_seen";

/**
 * Turn a 0..1 slider position into an rgba() colour for text/background
 * on a dark base. `mix` = 0 → almost black, `mix` = 1 → almost white.
 * These are the values the CSS variables consume.
 */
export function brightnessToText(v) {
  // v=0 → black, v=1 → white. Preserve full opacity so text is readable.
  const g = Math.round(v * 255);
  return `rgb(${g}, ${g}, ${g})`;
}

export function brightnessToBg(v) {
  // v=0 → deep dark (#0B1221), v=1 → white; both semi-transparent so the
  // wallpaper still shows through per the app's glass aesthetic.
  const g = Math.round(v * 255);
  return `rgba(${g}, ${g}, ${g}, ${0.55 + v * 0.15})`;
}

export default function BrightnessSliders({ value, onChange, isDark, testidPrefix = "brightness" }) {
  const textVal = typeof value?.text === "number" ? value.text : DEFAULT_TEXT;
  const bgVal = typeof value?.bg === "number" ? value.bg : DEFAULT_BG;

  const textTapRef = useRef({ last: 0 });
  const bgTapRef = useRef({ last: 0 });
  const pulseRef = useRef(null);

  // One-time subtle pulse on first render (discoverability aid). We check
  // localStorage so the pulse fires only once per browser, not every mount.
  useEffect(() => {
    try {
      if (localStorage.getItem(FIRST_SEEN_KEY)) return undefined;
      const el = pulseRef.current;
      if (!el) return undefined;
      el.classList.add("ir-brightness-pulse");
      const t = setTimeout(() => {
        el.classList.remove("ir-brightness-pulse");
        try { localStorage.setItem(FIRST_SEEN_KEY, "1"); } catch (e) { /* ignore */ }
      }, 2400);
      return () => clearTimeout(t);
    } catch (e) {
      return undefined;
    }
  }, []);

  const commit = (patch) => {
    onChange && onChange({ text: textVal, bg: bgVal, ...patch });
  };

  const handleDoubleTap = (ref, resetTo, patchKey) => () => {
    const now = Date.now();
    if (now - ref.current.last < 350) {
      commit({ [patchKey]: resetTo });
    }
    ref.current.last = now;
  };

  const trackCls = isDark
    ? "w-full h-1 rounded-full bg-white/10 appearance-none cursor-pointer"
    : "w-full h-1 rounded-full bg-gray-200 appearance-none cursor-pointer";

  return (
    <div
      ref={pulseRef}
      className="w-full space-y-1.5 select-none"
      data-testid={`${testidPrefix}-sliders`}
    >
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={textVal}
        onChange={(e) => commit({ text: Number(e.target.value) })}
        onDoubleClick={handleDoubleTap(textTapRef, DEFAULT_TEXT, "text")}
        onTouchEnd={handleDoubleTap(textTapRef, DEFAULT_TEXT, "text")}
        aria-label="Text brightness"
        title="Text brightness (double-tap to reset)"
        className={`ir-brightness-slider ${trackCls}`}
        data-testid={`${testidPrefix}-text-slider`}
      />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={bgVal}
        onChange={(e) => commit({ bg: Number(e.target.value) })}
        onDoubleClick={handleDoubleTap(bgTapRef, DEFAULT_BG, "bg")}
        onTouchEnd={handleDoubleTap(bgTapRef, DEFAULT_BG, "bg")}
        aria-label="Background brightness"
        title="Background brightness (double-tap to reset)"
        className={`ir-brightness-slider ${trackCls}`}
        data-testid={`${testidPrefix}-bg-slider`}
      />
    </div>
  );
}

export { DEFAULT_TEXT, DEFAULT_BG };
