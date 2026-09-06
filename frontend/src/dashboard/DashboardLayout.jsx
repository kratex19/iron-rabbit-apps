import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { MapPin, RefreshCcw, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import "./dashboard.css";
import DashboardTabBar from "./components/DashboardTabBar";
import LocationPickerModal from "./components/LocationPickerModal";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./state/dashboardStore";
import { getBrowserPosition, reverseGeocode } from "./utils/geocode";
import { isCssBackground } from "../utils/bgValue";
import useWeather from "./hooks/useWeather";
import useEvents from "./hooks/useEvents";

// Small pool of default backgrounds — shared with Iron Rabbit's header
// preset folder (`/header-presets`), so both the Home Page header picker
// and the Dashboard swipe cycler stay in sync as new presets are added.
export const DEFAULT_BACKGROUND_POOL = [
  "/header-presets/header-02.webp",
  "/header-presets/header-03.webp",
  "/header-presets/header-11.webp",
  "/header-presets/header-16.webp",
  "/header-presets/header-21.webp",
  "/header-presets/header-24.webp",
  "/header-presets/header-30.webp",
  "/header-presets/header-38.webp",
];

// Shared context for all sub-pages
export const DashboardCtx = React.createContext(null);
export function useDashboard() { return React.useContext(DashboardCtx); }

// Layout wrapper — provides context, background, top bar, and mounts child route.
export default function DashboardLayout() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  // Full preset manifest (with category + tags for the swipe preview toast)
  const [presetManifest, setPresetManifest] = useState([]);

  // Load the full clean-background pool once (used by the swipe cycler)
  useEffect(() => {
    fetch("/header-presets/manifest.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("no manifest"))))
      .then((m) => {
        if (Array.isArray(m?.presets) && m.presets.length) setPresetManifest(m.presets);
      })
      .catch(() => { /* fall back to DEFAULT_BACKGROUND_POOL */ });
  }, []);

  const availableBackgrounds = useMemo(() => (
    presetManifest.length
      ? presetManifest.map((p) => `/header-presets/${p.file}`)
      : DEFAULT_BACKGROUND_POOL
  ), [presetManifest]);

  // Helper: friendly display name for a background URL, e.g. "Nature · Forest"
  const presetInfoByUrl = useMemo(() => {
    const map = new Map();
    for (const p of presetManifest) {
      const url = `/header-presets/${p.file}`;
      const tag = (p.tags && p.tags[0]) ? p.tags[0].replace(/\b\w/g, (c) => c.toUpperCase()) : "";
      const label = [p.category, tag].filter(Boolean).join(" · ");
      map.set(url, { label: label || p.file.replace(/\.webp$/, ""), category: p.category, tags: p.tags || [] });
    }
    return map;
  }, [presetManifest]);
  const nameForBackground = useCallback((url) => presetInfoByUrl.get(url)?.label || null, [presetInfoByUrl]);

  // Hydrate settings and, if requested and possible, initial geolocation.
  // Also opportunistically upgrade older saved locations that only have
  // coordinates (no place name) by re-running reverseGeocode once.
  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      let next = s;
      if (s.use_geolocation && !s.location) {
        try {
          const pos = await getBrowserPosition();
          const loc = await reverseGeocode(pos.latitude, pos.longitude);
          next = { ...s, location: loc };
          await saveSettings(next);
        } catch { /* silent — user may block permission */ }
      } else if (s.location && Number.isFinite(s.location.latitude) && Number.isFinite(s.location.longitude)) {
        // Upgrade legacy location saved before reverse-geocode was reliable.
        const looksLikeCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(s.location.display || s.location.name || "");
        const missingName = !s.location.country && !s.location.admin1;
        if (looksLikeCoords || missingName) {
          try {
            const loc = await reverseGeocode(s.location.latitude, s.location.longitude);
            // Only replace if we actually got a real place name
            if (loc && loc.country) {
              next = { ...s, location: loc };
              await saveSettings(next);
            }
          } catch { /* silent — keep whatever we had */ }
        }
      }
      setSettings(next);
      setHydrated(true);
    })();
  }, []);

  const updateSettings = useCallback(async (patch) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((url) => {
    setSettings((prev) => {
      const favs = Array.isArray(prev.favorites) ? prev.favorites : [];
      const has = favs.includes(url);
      const nextFavs = has ? favs.filter((u) => u !== url) : [...favs, url];
      const next = { ...prev, favorites: nextFavs };
      saveSettings(next);
      return next;
    });
  }, []);

  const cycleBackground = useCallback((direction = 1) => {
    setSettings((prev) => {
      const fullPool = availableBackgrounds;
      const favs = Array.isArray(prev.favorites) ? prev.favorites.filter((u) => fullPool.includes(u)) : [];
      const pool = favs.length ? favs : fullPool;
      if (!pool.length) return prev;
      const currentIdx = pool.indexOf(prev.background_preset);
      // If current bg isn't in the active pool (favorites), jump to the first favorite
      const startIdx = currentIdx === -1 ? (direction > 0 ? -1 : 0) : currentIdx;
      const nextIdx = ((startIdx + direction) % pool.length + pool.length) % pool.length;
      const next = { ...prev, background_preset: pool[nextIdx] };
      saveSettings(next);
      return next;
    });
  }, [availableBackgrounds]);

  const weather = useWeather(settings.location, settings.units);
  const eventsData = useEvents();

  // Background choice: user override → deterministic pick from pool.
  // Value may be a URL (image) or a CSS color/gradient string.
  const backgroundUrl = useMemo(() => {
    if (settings.background_preset) return settings.background_preset;
    const key = settings.location ? Math.abs(Math.floor(settings.location.latitude + settings.location.longitude)) : 0;
    return DEFAULT_BACKGROUND_POOL[key % DEFAULT_BACKGROUND_POOL.length];
  }, [settings.background_preset, settings.location]);

  const bgStyle = useMemo(() => (
    isCssBackground(backgroundUrl)
      ? { background: backgroundUrl }
      : { backgroundImage: `url(${backgroundUrl})` }
  ), [backgroundUrl]);

  const dim = Math.max(0, Math.min(1, settings.background_dim ?? 0.35));

  const ctxValue = useMemo(() => ({
    settings, updateSettings,
    weather, events: eventsData.events, eventsLoading: eventsData.loading,
    openLocationPicker: () => setLocationPickerOpen(true),
    backgroundUrl,
    defaultBackgrounds: DEFAULT_BACKGROUND_POOL,
    availableBackgrounds,
    presetManifest,
    nameForBackground,
    toggleFavorite,
    cycleBackground,
  }), [settings, updateSettings, weather, eventsData, backgroundUrl, availableBackgrounds, presetManifest, nameForBackground, toggleFavorite, cycleBackground]);

  return (
    <div
      className="ir-dashboard-root"
      style={{ "--ir-dash-dim-top": String(dim * 0.4), "--ir-dash-dim-bottom": String(dim * 1.4) }}
      data-testid="dashboard-root"
    >
      <div className="ir-dash-bg" style={bgStyle} aria-hidden="true" />
      <div className="ir-dash-fg">
        <div className="ir-dash-topbar">
          <button
            className="ir-dash-icon-btn"
            onClick={() => navigate("/")}
            aria-label="Back to Iron Rabbit"
            title="Back to Iron Rabbit"
            data-testid="dash-back-to-app"
            style={{ background: "transparent", border: 0 }}
          >
            <ArrowLeft size={18} />
          </button>

          <button
            className="ir-dash-location"
            onClick={() => setLocationPickerOpen(true)}
            data-testid="dash-location-btn"
          >
            <MapPin size={14} />
            {(() => {
              const loc = settings.location;
              if (!loc) return <span>Set location</span>;
              const primary = loc.display || loc.name || "Location";
              const hasCoords = Number.isFinite(loc.latitude) && Number.isFinite(loc.longitude);
              const looksLikeCoords = /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(primary);
              return (
                <span className="ir-dash-location-text" data-testid="dash-location-text">
                  <span className="ir-dash-location-primary">{primary}</span>
                  {hasCoords && !looksLikeCoords && (
                    <span className="ir-dash-location-coords" data-testid="dash-location-coords">
                      {loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)}
                    </span>
                  )}
                </span>
              );
            })()}
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              className="ir-dash-icon-btn"
              onClick={async () => {
                // No location saved yet? Open the picker instead of silently doing nothing.
                if (!settings.location) {
                  toast.info("Set a location to fetch the forecast.");
                  setLocationPickerOpen(true);
                  return;
                }
                // Bail out gracefully if already refreshing
                if (weather.loading) return;
                try {
                  const result = await weather.refresh?.();
                  if (result?.ok === false) {
                    toast.error(`Refresh failed: ${result.error || "unknown error"}`);
                  } else {
                    toast.success("Weather updated");
                  }
                } catch (e) {
                  toast.error(`Refresh failed: ${e?.message || "unknown error"}`);
                }
              }}
              disabled={weather.loading}
              aria-label={weather.loading ? "Refreshing…" : (settings.location ? "Refresh weather" : "Set a location to fetch weather")}
              title={weather.loading ? "Refreshing…" : (settings.location ? "Refresh weather" : "Set a location to fetch weather")}
              data-testid="dash-refresh"
            >
              <RefreshCcw
                size={16}
                className={weather.loading ? "ir-dash-spin" : ""}
              />
            </button>
            <button
              className="ir-dash-icon-btn"
              onClick={() => navigate("/dashboard/settings")}
              aria-label="Dashboard settings"
              title="Dashboard settings"
              data-testid="dash-open-settings"
            >
              <SettingsIcon size={16} />
            </button>
          </div>
        </div>

        {hydrated ? (
          <DashboardCtx.Provider value={ctxValue}>
            <Outlet />
          </DashboardCtx.Provider>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#cbd5e1" }}>Loading…</div>
        )}

        <DashboardTabBar />

        <LocationPickerModal
          open={locationPickerOpen}
          onClose={() => setLocationPickerOpen(false)}
          onPick={(loc) => updateSettings({ location: loc, use_geolocation: false })}
        />
      </div>
    </div>
  );
}
