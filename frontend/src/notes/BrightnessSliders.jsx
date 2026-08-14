import React, { useEffect, useRef } from "react";
import { Type, SquareDashed, RotateCcw } from "lucide-react";

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
    ? "flex-1 h-1.5 rounded-full bg-white/20 appearance-none cursor-pointer"
    : "flex-1 h-1.5 rounded-full bg-gray-300 appearance-none cursor-pointer";

  const labelCls = isDark ? "text-slate-300" : "text-gray-600";
  const chipCls = isDark
    ? "px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-slate-200 min-w-[34px] text-center tabular-nums"
    : "px-1.5 py-0.5 text-[10px] rounded bg-gray-200 text-gray-700 min-w-[34px] text-center tabular-nums";
  const resetBtnCls = isDark
    ? "p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
    : "p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors";

  return (
    <div
      ref={pulseRef}
      className="w-full space-y-2 select-none"
      data-testid={`${testidPrefix}-sliders`}
    >
      <div className="flex items-center gap-2">
        <Type className={`w-3.5 h-3.5 shrink-0 ${labelCls}`} aria-hidden="true" />
        <span className={`text-[11px] w-8 shrink-0 ${labelCls}`}>Text</span>
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
        <span className={chipCls} data-testid={`${testidPrefix}-text-value`}>{Math.round(textVal * 100)}%</span>
        <button
          type="button"
          onClick={() => commit({ text: DEFAULT_TEXT })}
          className={resetBtnCls}
          title="Reset text brightness"
          aria-label="Reset text brightness"
          data-testid={`${testidPrefix}-text-reset`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <SquareDashed className={`w-3.5 h-3.5 shrink-0 ${labelCls}`} aria-hidden="true" />
        <span className={`text-[11px] w-8 shrink-0 ${labelCls}`}>BG</span>
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
        <span className={chipCls} data-testid={`${testidPrefix}-bg-value`}>{Math.round(bgVal * 100)}%</span>
        <button
          type="button"
          onClick={() => commit({ bg: DEFAULT_BG })}
          className={resetBtnCls}
          title="Reset background brightness"
          aria-label="Reset background brightness"
          data-testid={`${testidPrefix}-bg-reset`}
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export { DEFAULT_TEXT, DEFAULT_BG };
