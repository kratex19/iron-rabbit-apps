import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Trash2, Palette, FileText, Package, Sparkles as SparklesIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import StorageService from "../storage/storageService";

const ICON_RECENTS_KEY = "iron_rabbit_icon_recents_v1";
const BG_RECENTS_KEY   = "iron_rabbit_bg_recents_v1";
const SUGGESTION_MS    = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadLocal(key, empty) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : empty;
  } catch { return empty; }
}

/**
 * Pinned Hub — one-stop Settings card that:
 *   • Shows how many pins you have across colors, gradients, icons,
 *     templates, and packs
 *   • One-tap "Clear all pins" to spring-clean everything
 *   • Suggests three recent-but-unpinned items after the app has been in
 *     use for at least a week, so favourites collect themselves
 */
export default function PinnedHub({ isDark = true }) {
  const [settings, setSettings] = useState(null);
  const [recents, setRecents] = useState({
    icons:    { recents: [], pinned: [] },
    bgColors: [],
  });

  const refresh = useCallback(async () => {
    try {
      const s = await StorageService.getSettings();
      setSettings(s || {});
    } catch (e) { console.error("[PinnedHub] load failed:", e); }
    const iconLocal = loadLocal(ICON_RECENTS_KEY, { recents: [], pinned: [] });
    const bgLocal   = loadLocal(BG_RECENTS_KEY,   { colors: [] });
    setRecents({
      icons:    iconLocal,
      bgColors: Array.isArray(bgLocal.colors) ? bgLocal.colors : [],
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Stamp the "first use" timestamp the first time this card mounts so we
  // can hide the suggestions section for users who just installed. Cheap
  // and idempotent thanks to the guard.
  useEffect(() => {
    if (!settings) return;
    if (settings.first_use_at) return;
    StorageService.saveSettings({ first_use_at: new Date().toISOString() })
      .then(() => setSettings(prev => ({ ...(prev || {}), first_use_at: new Date().toISOString() })))
      .catch(() => { /* silent */ });
  }, [settings]);

  const counts = useMemo(() => {
    const bgPins = settings?.bg_pins || {};
    return {
      bgColors:     Array.isArray(bgPins.colors)     ? bgPins.colors.length     : 0,
      bgGradients:  Array.isArray(bgPins.gradients)  ? bgPins.gradients.length  : 0,
      icons:        Array.isArray(settings?.icon_pins)     ? settings.icon_pins.length     : 0,
      templates:    Array.isArray(settings?.template_pins) ? settings.template_pins.length : 0,
      packs:        Array.isArray(settings?.pack_pins)     ? settings.pack_pins.length     : 0,
    };
  }, [settings]);

  const total = counts.bgColors + counts.bgGradients + counts.icons + counts.templates + counts.packs;

  const clearAll = async () => {
    if (!window.confirm("Clear every pin? This won't delete anything else — just unpins colors, gradients, icons, templates and packs.")) return;
    try {
      await StorageService.saveSettings({
        bg_pins: { colors: [], gradients: [] },
        icon_pins: [],
        template_pins: [],
        pack_pins: [],
      });
      // Also drop pins from localStorage recents caches
      const iconLocal = loadLocal(ICON_RECENTS_KEY, { recents: [], pinned: [] });
      localStorage.setItem(ICON_RECENTS_KEY, JSON.stringify({ ...iconLocal, pinned: [] }));
      const bgLocal = loadLocal(BG_RECENTS_KEY, {});
      localStorage.setItem(BG_RECENTS_KEY, JSON.stringify({ ...bgLocal, pinnedColors: [], pinnedGradients: [] }));

      toast.success("All pins cleared");
      refresh();
    } catch (e) {
      toast.error("Couldn't clear pins — try again");
    }
  };

  // Suggested pins: top-3 recent-but-unpinned items after 7 days of use.
  const suggestions = useMemo(() => {
    if (!settings?.first_use_at) return [];
    const installed = new Date(settings.first_use_at).getTime();
    if (Date.now() - installed < SUGGESTION_MS) return [];

    const iconPinned = new Set(settings?.icon_pins || []);
    const bgColorPinned = new Set(settings?.bg_pins?.colors || []);

    const iconPicks = (recents.icons.recents || [])
      .filter(name => !iconPinned.has(name))
      .slice(0, 2)
      .map(name => ({ type: "icon", value: name }));

    const colorPicks = (recents.bgColors || [])
      .filter(hex => !bgColorPinned.has(hex))
      .slice(0, 1)
      .map(hex => ({ type: "color", value: hex }));

    return [...iconPicks, ...colorPicks].slice(0, 3);
  }, [settings, recents]);

  const pinSuggestion = async (item) => {
    try {
      if (item.type === "icon") {
        const next = [item.value, ...(settings?.icon_pins || []).filter(n => n !== item.value)];
        await StorageService.saveSettings({ icon_pins: next });
      } else if (item.type === "color") {
        const cur = settings?.bg_pins || {};
        const nextColors = [item.value, ...(cur.colors || []).filter(v => v !== item.value)];
        await StorageService.saveSettings({ bg_pins: { colors: nextColors, gradients: cur.gradients || [] } });
      }
      toast.success("Pinned");
      refresh();
    } catch { toast.error("Couldn't pin — try again"); }
  };

  const rows = [
    { key: "bgColors",    label: "Background colors",    value: counts.bgColors,    Ico: Palette },
    { key: "bgGradients", label: "Background gradients", value: counts.bgGradients, Ico: SparklesIcon },
    { key: "icons",       label: "Icons",                value: counts.icons,       Ico: SparklesIcon },
    { key: "templates",   label: "Templates",            value: counts.templates,   Ico: FileText },
    { key: "packs",       label: "Tile packs",           value: counts.packs,       Ico: Package },
  ];

  return (
    <div
      className={`rounded-md border ${isDark ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200"}`}
      data-testid="settings-pinned-hub"
    >
      <div className="px-3 pt-2.5 pb-1.5 flex items-center gap-2">
        <Star className={`w-4 h-4 ${isDark ? "text-amber-300" : "text-amber-600"} fill-current`} />
        <div className="flex-1">
          <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>Pinned favourites</div>
          <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            {total === 0 ? "Nothing pinned yet — tap any ★ across the app" : `${total} pinned across the app`}
          </div>
        </div>
      </div>
      {total > 0 && (
        <ul className={`px-3 py-1 space-y-0.5 text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`} data-testid="pinned-hub-counts">
          {rows.filter(r => r.value > 0).map(r => (
            <li key={r.key} className="flex items-center gap-2">
              <r.Ico className={`w-3 h-3 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              <span className="flex-1">{r.label}</span>
              <span className={`font-mono text-[11px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid={`pinned-hub-count-${r.key}`}>
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <div className={`px-3 py-2 mt-1 border-t ${isDark ? "border-white/5" : "border-gray-200"}`} data-testid="pinned-hub-suggestions">
          <div className={`text-[10px] uppercase tracking-wide mb-1.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            You use these a lot — pin them?
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => {
              const isIcon = s.type === "icon";
              const Ico = isIcon ? (LucideIcons[s.value] || null) : null;
              return (
                <button
                  key={`${s.type}-${s.value}-${i}`}
                  type="button"
                  onClick={() => pinSuggestion(s)}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] transition-colors ${
                    isDark ? "bg-white/5 border border-white/10 text-white hover:bg-amber-400/20 hover:border-amber-400/40" : "bg-white border border-gray-200 text-gray-800 hover:bg-amber-50 hover:border-amber-300"
                  }`}
                  data-testid={`pinned-hub-suggest-${s.type}-${s.value}`}
                  title="Pin this"
                >
                  {isIcon && Ico ? (
                    <Ico className="w-3 h-3" />
                  ) : (
                    <span className="w-3 h-3 rounded-full" style={{ background: s.value }} />
                  )}
                  <span className="truncate max-w-[7rem]">{isIcon ? s.value : s.value}</span>
                  <Star className="w-3 h-3 opacity-60" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {total > 0 && (
        <div className="px-3 pb-2.5 pt-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className={`h-7 text-[11px] px-2 ${isDark ? "text-slate-400 hover:text-red-300 hover:bg-red-500/10" : "text-gray-500 hover:text-red-600 hover:bg-red-50"}`}
            data-testid="pinned-hub-clear-all"
          >
            <Trash2 className="w-3 h-3 mr-1" /> Clear all pins
          </Button>
        </div>
      )}
    </div>
  );
}
