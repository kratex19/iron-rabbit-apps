import React, { useState, useEffect, useRef } from "react";
import { Columns3, Minus, Plus, X } from "lucide-react";

/**
 * TilesColumnsButton
 * ────────────────────
 * Lets the user pick how many tile columns render in Grid (icon) view
 * for each device class. Sits between "Group by category" and "Select"
 * in the search toolbar.
 *
 * Storage — a single object at `settings.grid_columns`:
 *   {
 *     mobile_portrait:   3,
 *     mobile_landscape:  4,
 *     tablet_portrait:   5,
 *     tablet_landscape:  7,
 *     desktop:           8,
 *   }
 *
 * If the user has never customised, this object is undefined and the
 * base fluid `--ir-tile-min` grid (auto-fill) keeps working unchanged.
 *
 * Application is handled by `useEffectiveGridColumns` (companion hook)
 * which detects the current device class from the viewport and
 * exposes the resolved column count for `.notes-grid` inline style.
 */

// Device classes + their column-count limits (kept in sync with
// `useEffectiveGridColumns` below).
export const DEVICE_CLASSES = [
  { key: "mobile_portrait",  label: "Mobile portrait",  min: 1, max: 4,  default: 3 },
  { key: "mobile_landscape", label: "Mobile landscape", min: 2, max: 6,  default: 4 },
  { key: "tablet_portrait",  label: "Tablet portrait",  min: 2, max: 6,  default: 5 },
  { key: "tablet_landscape", label: "Tablet landscape", min: 3, max: 8,  default: 7 },
  { key: "desktop",          label: "Desktop",          min: 4, max: 10, default: 8 },
];

export const DEFAULT_GRID_COLUMNS = DEVICE_CLASSES.reduce((acc, d) => {
  acc[d.key] = d.default;
  return acc;
}, {});

export default function TilesColumnsButton({ isDark, gridColumns, onChange }) {
  const [open, setOpen] = useState(false);
  const popRef = useRef(null);
  const btnRef = useRef(null);

  const current = { ...DEFAULT_GRID_COLUMNS, ...(gridColumns || {}) };

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        popRef.current && !popRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const setValue = (key, value) => {
    const dc = DEVICE_CLASSES.find((d) => d.key === key);
    if (!dc) return;
    const clamped = Math.max(dc.min, Math.min(dc.max, value));
    onChange({ ...current, [key]: clamped });
  };

  const reset = () => onChange({ ...DEFAULT_GRID_COLUMNS });

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
          open
            ? isDark ? "bg-white/10 text-white" : "bg-gray-200 text-gray-800"
            : isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-700"
        }`}
        aria-expanded={open}
        title="Adjust tile columns per device"
        data-testid="tiles-columns-btn"
      >
        <Columns3 className="w-3.5 h-3.5" /> Tiles
      </button>

      {open && (
        <div
          ref={popRef}
          className={`absolute z-50 top-full right-0 mt-2 w-72 max-w-[calc(100vw-1rem)] rounded-xl border shadow-2xl ${
            isDark
              ? "bg-[#0B1221] border-white/15 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
          data-testid="tiles-columns-popover"
          role="dialog"
          aria-label="Tile columns per device"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Columns3 className="w-4 h-4" />
              Tile columns
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="opacity-70 hover:opacity-100"
              data-testid="tiles-columns-close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <ul className="p-3 space-y-2 text-xs">
            {DEVICE_CLASSES.map((dc) => {
              const value = current[dc.key];
              const canDec = value > dc.min;
              const canInc = value < dc.max;
              return (
                <li
                  key={dc.key}
                  className="flex items-center justify-between gap-2"
                  data-testid={`tiles-row-${dc.key}`}
                >
                  <span className="opacity-90">{dc.label}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setValue(dc.key, value - 1)}
                      disabled={!canDec}
                      aria-label={`Decrease ${dc.label} columns`}
                      className={`w-6 h-6 rounded flex items-center justify-center border ${
                        canDec
                          ? isDark
                            ? "border-white/20 hover:bg-white/10"
                            : "border-slate-300 hover:bg-slate-100"
                          : "opacity-30 cursor-not-allowed border-transparent"
                      }`}
                      data-testid={`tiles-dec-${dc.key}`}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span
                      className="w-6 text-center font-mono font-semibold"
                      data-testid={`tiles-val-${dc.key}`}
                    >
                      {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => setValue(dc.key, value + 1)}
                      disabled={!canInc}
                      aria-label={`Increase ${dc.label} columns`}
                      className={`w-6 h-6 rounded flex items-center justify-center border ${
                        canInc
                          ? isDark
                            ? "border-white/20 hover:bg-white/10"
                            : "border-slate-300 hover:bg-slate-100"
                          : "opacity-30 cursor-not-allowed border-transparent"
                      }`}
                      data-testid={`tiles-inc-${dc.key}`}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-end px-3 py-2 border-t border-inherit">
            <button
              type="button"
              onClick={reset}
              className={`text-[11px] px-2 py-1 rounded ${
                isDark ? "text-slate-300 hover:bg-white/5" : "text-slate-600 hover:bg-slate-100"
              }`}
              data-testid="tiles-columns-reset"
            >
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * useEffectiveGridColumns
 * ────────────────────────
 * Returns the currently-effective tile-column count based on viewport
 * width + orientation and the user's stored preference. Returns `null`
 * when the user has NEVER customised — signalling that the fluid
 * `auto-fill` `.notes-grid` default should keep running. Re-runs on
 * resize / orientation change so the grid reflows immediately.
 */
export function useEffectiveGridColumns(gridColumns) {
  const [columns, setColumns] = useState(() =>
    gridColumns ? resolveColumns(gridColumns) : null
  );

  useEffect(() => {
    if (!gridColumns) { setColumns(null); return; }
    const onResize = () => setColumns(resolveColumns(gridColumns));
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [gridColumns]);

  return columns;
}

function resolveColumns(gridColumns) {
  const merged = { ...DEFAULT_GRID_COLUMNS, ...(gridColumns || {}) };
  const w = typeof window === "undefined" ? 1024 : window.innerWidth;
  const h = typeof window === "undefined" ? 768 : window.innerHeight;
  const portrait = h >= w;
  if (w < 600)  return portrait ? merged.mobile_portrait : merged.mobile_landscape;
  if (w < 900)  return portrait ? merged.tablet_portrait : merged.mobile_landscape;
  if (w < 1400) return portrait ? merged.tablet_portrait : merged.tablet_landscape;
  return merged.desktop;
}
