import React, { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Check, ImageIcon } from "lucide-react";

/**
 * Picker for the 40 bundled header background presets that live under
 * `/header-presets/*.webp` with a `manifest.json` next to them. Sets the
 * caller's `header_bg` to the absolute preset URL so the existing
 * <img src=header_bg> rendering path works unchanged.
 */
export default function HeaderPresetPicker({ value, onChange, isDark }) {
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchStartedRef = useRef(false);
  useEffect(() => {
    if (!open || fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    setLoading(true);
    fetch("/header-presets/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m) => setManifest(m))
      .catch((e) => { setErr(e.message); fetchStartedRef.current = false; })
      .finally(() => setLoading(false));
  }, [open]);

  const isSelected = (file) => {
    if (!value) return false;
    return value.endsWith(`/header-presets/${file}`) || value === `/header-presets/${file}`;
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 h-9 rounded-md px-3 transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600'}`}
        data-testid="settings-header-presets-toggle"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-xs">
          <ImageIcon className="w-4 h-4" />
          Choose from presets
          {manifest && <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>({manifest.presets.length})</span>}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className={`mt-2 rounded-md border p-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-white'}`} data-testid="settings-header-presets-panel">
          {loading && <div className={`text-xs py-6 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Loading presets…</div>}
          {err && <div className="text-xs text-red-400 py-2">Couldn't load presets: {err}</div>}
          {manifest && (
            <div
              className="grid gap-1.5 max-h-64 overflow-y-auto pr-1"
              style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
              data-testid="settings-header-presets-grid"
            >
              {manifest.presets.map((p) => {
                const url = `/header-presets/${p.file}`;
                const selected = isSelected(p.file);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onChange(url)}
                    className={`relative rounded overflow-hidden border transition-all group ${selected ? 'ring-2 ring-yellow-500 border-yellow-500' : (isDark ? 'border-white/10 hover:border-white/30' : 'border-gray-200 hover:border-gray-400')}`}
                    style={{ aspectRatio: "16 / 5" }}
                    data-testid={`settings-header-preset-${p.id}`}
                    aria-label={`Preset ${p.id}`}
                    title={`Preset ${p.id}`}
                  >
                    <img
                      src={url}
                      alt={`Header preset ${p.id}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {selected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-black" />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 text-[9px] font-mono px-1 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      #{p.id}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
