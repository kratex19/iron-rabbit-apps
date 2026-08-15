import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown, ChevronUp, Check, ImageIcon, Search, X } from "lucide-react";

/**
 * Picker for the 40 bundled header background presets that live under
 * `/header-presets/*.webp` with a `manifest.json` next to them. Sets the
 * caller's `header_bg` to the absolute preset URL so the existing
 * <img src=header_bg> rendering path works unchanged.
 *
 * Manifest v2 adds `category` + `tags` per preset so we can render
 * category tabs and a keyword search.
 */
export default function HeaderPresetPicker({ value, onChange, isDark }) {
  const [open, setOpen] = useState(false);
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [activeCat, setActiveCat] = useState("All");
  const [query, setQuery] = useState("");

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

  const tabs = useMemo(() => {
    if (!manifest) return [];
    const cats = manifest.categories || [];
    return [{ key: "All", count: manifest.presets.length }, ...cats];
  }, [manifest]);

  const visiblePresets = useMemo(() => {
    if (!manifest) return [];
    const q = query.trim().toLowerCase();
    return manifest.presets.filter((p) => {
      if (activeCat !== "All" && p.category !== activeCat) return false;
      if (!q) return true;
      const hay = [p.id, p.category, ...(p.tags || [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [manifest, activeCat, query]);

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
        <div className={`mt-2 rounded-md border p-2 space-y-2 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200 bg-white'}`} data-testid="settings-header-presets-panel">
          {loading && <div className={`text-xs py-6 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Loading presets…</div>}
          {err && <div className="text-xs text-red-400 py-2">Couldn't load presets: {err}</div>}
          {manifest && (
            <>
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1" data-testid="settings-header-presets-tabs">
                {tabs.map((t) => {
                  const active = activeCat === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveCat(t.key)}
                      className={`text-[11px] font-medium px-2 h-7 rounded-md flex items-center gap-1 transition-colors ${active ? 'bg-yellow-500 text-black' : (isDark ? 'bg-white/5 hover:bg-white/10 text-slate-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700')}`}
                      data-testid={`settings-header-preset-tab-${t.key.toLowerCase()}`}
                      aria-pressed={active}
                    >
                      {t.key}
                      <span className={`text-[10px] ${active ? 'text-black/70' : (isDark ? 'text-slate-500' : 'text-gray-500')}`}>({t.count})</span>
                    </button>
                  );
                })}
              </div>

              {/* Search box */}
              <div className={`relative`}>
                <Search className={`w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search presets (e.g. deer, sunset, lake)"
                  className={`w-full h-8 pl-7 pr-7 rounded-md text-xs border outline-none focus:ring-1 focus:ring-yellow-500/50 ${isDark ? 'bg-black/30 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200 text-gray-800 placeholder:text-gray-400'}`}
                  data-testid="settings-header-presets-search"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10"
                    aria-label="Clear search"
                    data-testid="settings-header-presets-search-clear"
                  >
                    <X className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
                  </button>
                )}
              </div>

              {/* Grid */}
              {visiblePresets.length === 0 ? (
                <div className={`text-xs py-6 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No presets match.</div>
              ) : (
                <div
                  className="grid gap-1.5 max-h-64 overflow-y-auto pr-1"
                  style={{ gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))" }}
                  data-testid="settings-header-presets-grid"
                >
                  {visiblePresets.map((p) => {
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
                        aria-label={`Preset ${p.id} — ${p.category}`}
                        title={`${p.category} · ${(p.tags || []).join(", ")}`}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
