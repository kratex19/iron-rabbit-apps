import React from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import BrightnessSliders from "./BrightnessSliders";

/**
 * DisplayControlsButton — a single icon toggle that reveals the two
 * brightness sliders (Text + Background) inside a small glass popover.
 * Keeps the sliders hidden by default so they don't clutter the UI, but
 * makes them easy to find via a labeled icon.
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
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-8 w-8 ${isDark ? "text-white/70 hover:text-white hover:bg-white/10" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"} ${className}`}
          title={title}
          aria-label={title}
          data-testid={`${testidPrefix}-display-toggle`}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={6}
        className={`w-72 p-3 border ${isDark ? "bg-slate-900/95 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"} backdrop-blur-md`}
        data-testid={`${testidPrefix}-display-panel`}
      >
        <div className={`text-[11px] uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Display
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
