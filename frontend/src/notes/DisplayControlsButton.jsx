import React, { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BrightnessSliders, { brightnessToText, brightnessToBg } from "./BrightnessSliders";

const NEW_BADGE_KEY = "ir_display_controls_seen";

// Relative luminance per WCAG 2.1 § 1.4.3.
// r/g/b are 0-255. Returns 0..1.
function relLuminance(r, g, b) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

// Blend rgba(r,g,b,a) over an opaque base (default white). Returns rgb.
function flattenOverBase(fg, base) {
  const [fr, fg2, fb, fa] = fg;
  const [br, bg, bb] = base;
  return [
    Math.round(fr * fa + br * (1 - fa)),
    Math.round(fg2 * fa + bg * (1 - fa)),
    Math.round(fb * fa + bb * (1 - fa)),
  ];
}

// WCAG contrast ratio between two rgb colors (both opaque). 1..21.
function contrastRatio(rgb1, rgb2) {
  const L1 = relLuminance(...rgb1);
  const L2 = relLuminance(...rgb2);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

// WCAG rating for body text (14pt regular / 18pt bold uses the same
// thresholds — 4.5 for AA, 7 for AAA).
function ratingFor(ratio) {
  if (ratio >= 7) return { label: "AAA", tone: "emerald" };
  if (ratio >= 4.5) return { label: "AA", tone: "sky" };
  if (ratio >= 3) return { label: "AA-Large", tone: "amber" };
  return { label: "Fail", tone: "rose" };
}

/**
 * Small preview strip inside the Display popover. Shows a sample of
 * body text painted with the current text-brightness color over the
 * current background-brightness value (blended against the ambient
 * page — white for light theme, near-black for dark theme). Also
 * surfaces the WCAG contrast ratio + rating so the user knows if the
 * combination is actually readable.
 */
function ContrastSwatch({ value, isDark, testidPrefix }) {
  const t = value?.text ?? 0.7;
  const b = value?.bg ?? 0.3;
  const textColor = brightnessToText(t);
  const bgOverlay = brightnessToBg(b); // rgba(0,0,0, 1-b)

  // Compute the effective background the reader will see after the
  // black overlay flattens over the ambient page color.
  const pageBase = isDark ? [11, 18, 33] : [255, 255, 255]; // #0B1221 vs white
  const bgRgba = [0, 0, 0, Math.max(0, Math.min(1, 1 - b))];
  const effectiveBg = flattenOverBase(bgRgba, pageBase);
  const textRgb = [Math.round(t * 255), Math.round(t * 255), Math.round(t * 255)];
  const ratio = contrastRatio(textRgb, effectiveBg);
  const rating = ratingFor(ratio);

  const toneClass = {
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    sky:     "bg-sky-500/20 text-sky-300 border-sky-500/40",
    amber:   "bg-amber-500/20 text-amber-300 border-amber-500/40",
    rose:    "bg-rose-500/20 text-rose-300 border-rose-500/40",
  }[rating.tone];

  return (
    <div
      className="mt-3 rounded-lg border overflow-hidden"
      style={{
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
      }}
      data-testid={`${testidPrefix}-contrast-swatch`}
    >
      <div
        className="px-3 py-2.5 text-sm leading-snug font-medium"
        style={{
          background: bgOverlay,
          color: textColor,
          WebkitTextFillColor: textColor,
        }}
        data-testid={`${testidPrefix}-contrast-preview`}
      >
        Aa — The quick brown fox.
      </div>
      <div className={`px-3 py-1.5 flex items-center justify-between text-[10px] ${isDark ? "bg-black/30" : "bg-gray-50"}`}>
        <span className={isDark ? "text-slate-400" : "text-gray-500"}>
          Contrast <span className="tabular-nums font-semibold" data-testid={`${testidPrefix}-contrast-ratio`}>{ratio.toFixed(2)}:1</span>
        </span>
        <span
          className={`px-1.5 py-0.5 rounded border text-[9px] font-bold tracking-wider ${toneClass}`}
          data-testid={`${testidPrefix}-contrast-rating`}
        >
          {rating.label}
        </span>
      </div>
    </div>
  );
}

/**
 * DisplayControlsButton — a single icon toggle that reveals the two
 * brightness sliders (Text + Background) inside a small glass popover.
 * Keeps the sliders hidden by default so they don't clutter the UI, but
 * makes them easy to find via a labeled icon.
 *
 * A one-time orange "NEW" pulse badge is shown until the user opens the
 * panel for the first time (localStorage flag: `ir_display_controls_seen`).
 *
 * Used on the Home page (via AppHeader), inside NoteModal (Quick Edit),
 * and inside FullScreenNote (Expanded).
 */
export default function DisplayControlsButton({
  value,
  onChange,
  isDark,
  testidPrefix = "display",
  side = "bottom",
  align = "end",
  className = "",
  title = "Display brightness",
}) {
  const [seen, setSeen] = useState(true);

  // On mount, check whether the user has ever opened the Display panel.
  // If not, render the orange NEW badge as a visual affordance.
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(NEW_BADGE_KEY) === "1");
    } catch (e) { /* private mode — leave badge on */ }
  }, []);

  const markSeen = () => {
    if (seen) return;
    setSeen(true);
    try { localStorage.setItem(NEW_BADGE_KEY, "1"); } catch (e) { /* ignore */ }
  };

  return (
    <Popover onOpenChange={(open) => { if (open) markSeen(); }}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative h-8 w-8 ${!seen ? "bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/50 ring-2 ring-orange-300 animate-pulse" : (isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")} ${className}`}
          title={title}
          aria-label={title}
          data-testid={`${testidPrefix}-display-toggle`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {!seen && (
            <span
              className="absolute -top-1 -right-1 flex h-3.5 w-3.5"
              aria-hidden="true"
              data-testid={`${testidPrefix}-display-new-badge`}
            >
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 ring-2 ring-white"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        className={`w-72 p-3 border ${isDark ? "bg-slate-900/95 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} backdrop-blur-md`}
        data-testid={`${testidPrefix}-display-panel`}
      >
        <div className={`text-[11px] uppercase tracking-wider mb-2 flex items-center justify-between ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          <span>Display</span>
          {!seen && <span className="text-[9px] font-bold text-orange-500 tracking-widest">NEW</span>}
        </div>
        <BrightnessSliders
          value={value}
          onChange={onChange}
          isDark={isDark}
          testidPrefix={testidPrefix}
        />
        <ContrastSwatch value={value} isDark={isDark} testidPrefix={testidPrefix} />
        <div className={`mt-2 text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          Double-tap a slider or use the reset icon to restore defaults.
        </div>
      </PopoverContent>
    </Popover>
  );
}
