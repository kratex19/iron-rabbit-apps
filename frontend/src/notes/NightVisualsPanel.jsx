import React from "react";
import { Moon, Camera } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import BrightnessSliders, { brightnessToText, brightnessToBg } from "./BrightnessSliders";

/**
 * NightVisualsPanel — snapshot the user's preferred text + background
 * brightness for use as an automatic "night look" whenever Focus Mode
 * is active (manual toggle, timer, or scheduled window).
 *
 * Storage: `settings.focus_night_visuals = { enabled, ui_brightness: { text, bg } }`
 *
 * Consumer wiring lives in NotesApp: when Focus is active AND this
 * panel's `enabled` is true, the home page's `<main>` picks up
 * `focus_night_visuals.ui_brightness` instead of `settings.ui_brightness`.
 * Per-note saved brightness is left untouched — the override only fills
 * in for surfaces that already fall back to the global default.
 */
export default function NightVisualsPanel({
  value,
  onChange,
  currentBrightness,
  isDark,
}) {
  const cfg = value || { enabled: false, ui_brightness: null };
  const stored = cfg.ui_brightness || currentBrightness || { text: 0.35, bg: 0.15 };

  const chip = isDark
    ? "bg-black/20 border border-white/10"
    : "bg-gray-50 border border-gray-200";

  const snapshot = () => {
    onChange({
      enabled: cfg.enabled,
      ui_brightness: currentBrightness || stored,
    });
  };

  const updateBrightness = (next) => {
    onChange({ enabled: cfg.enabled, ui_brightness: next });
  };

  return (
    <div className={`rounded-md p-3 ${chip}`} data-testid="night-visuals-panel">
      <div className="flex items-center gap-3">
        <Moon className={`w-4 h-4 shrink-0 ${cfg.enabled ? "text-indigo-400" : (isDark ? "text-slate-500" : "text-gray-400")}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
            Night Visuals
          </div>
          <div className={`text-[11px] leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            When Focus Mode is active, dim the home page to these
            saved slider values automatically. Per-note brightness is
            preserved — this only overrides the global default.
          </div>
        </div>
        <Switch
          checked={!!cfg.enabled}
          onCheckedChange={(v) => onChange({ enabled: v, ui_brightness: cfg.ui_brightness || currentBrightness || stored })}
          data-testid="night-visuals-enabled"
          aria-label="Toggle Night Visuals"
        />
      </div>

      {cfg.enabled && (
        <div className={`mt-3 pt-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
          {/* Apply-to-notes toggle — when ON, every note surface
              (Quick Edit + FullScreen) paints with the night look
              during Focus, not just the home page. Saved per-note
              brightness values are untouched — this only overrides
              the painted colours while Focus is active. */}
          <div className={`mb-3 flex items-center gap-2 px-2 py-1.5 rounded ${isDark ? "bg-black/20" : "bg-white/60"}`}>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
                Apply to all notes
              </div>
              <div className={`text-[10px] leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                Extends the night look to Quick Edit and Expanded Text views. Off = home page only.
              </div>
            </div>
            <Switch
              checked={cfg.apply_to_notes !== false}
              onCheckedChange={(v) => onChange({ ...cfg, apply_to_notes: v })}
              data-testid="night-visuals-apply-to-notes"
              aria-label="Apply Night Visuals to all notes"
            />
          </div>

          {/* Live preview swatch */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-[10px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Preview
            </span>
            <div
              className="flex-1 h-8 rounded-md border flex items-center justify-center text-xs font-medium"
              style={{
                background: brightnessToBg(stored.bg ?? 0.15),
                color: brightnessToText(stored.text ?? 0.35),
                WebkitTextFillColor: brightnessToText(stored.text ?? 0.35),
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              }}
              data-testid="night-visuals-preview"
            >
              Sample note title
            </div>
          </div>

          {/* Snapshot button */}
          <button
            type="button"
            onClick={snapshot}
            className={`w-full mb-3 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
              isDark
                ? "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 border border-indigo-500/20"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
            }`}
            data-testid="night-visuals-snapshot"
            title="Copy your current home-page slider positions into the night look"
          >
            <Camera className="w-3.5 h-3.5" />
            Snapshot current sliders
          </button>

          {/* Editable sliders */}
          <BrightnessSliders
            value={stored}
            onChange={updateBrightness}
            isDark={isDark}
            testidPrefix="night-visuals-brightness"
          />
        </div>
      )}
    </div>
  );
}
