import React, { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BrightnessSliders from "./BrightnessSliders";

const NEW_BADGE_KEY = "ir_display_controls_seen";

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
        <div className={`mt-2 text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          Double-tap a slider or use the reset icon to restore defaults.
        </div>
      </PopoverContent>
    </Popover>
  );
}
