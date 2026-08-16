import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { MapPin, RefreshCcw, Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import "./dashboard.css";
import DashboardTabBar from "./components/DashboardTabBar";
import LocationPickerModal from "./components/LocationPickerModal";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "./state/dashboardStore";
import { getBrowserPosition, reverseGeocode } from "./utils/geocode";
import useWeather from "./hooks/useWeather";
import useEvents from "./hooks/useEvents";

// Small pool of default backgrounds pulled from the existing 130 header presets
// (nature / sunset flavored to match the mockup). Never mutated; just referenced.
export const DEFAULT_BACKGROUND_POOL = [
  "/header-presets/header-02.webp",
  "/header-presets/header-03.webp",
  "/header-presets/header-05.webp",
  "/header-presets/header-08.webp",
  "/header-presets/header-11.webp",
  "/header-presets/header-16.webp",
  "/header-presets/header-21.webp",
  "/header-presets/header-24.webp",
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

  // Hydrate settings and, if requested and possible, initial geolocation
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

  const weather = useWeather(settings.location, settings.units);
  const eventsData = useEvents();

  // Background choice: user override → deterministic pick from pool
  const backgroundUrl = useMemo(() => {
    if (settings.background_preset) return settings.background_preset;
    const key = settings.location ? Math.abs(Math.floor(settings.location.latitude + settings.location.longitude)) : 0;
    return DEFAULT_BACKGROUND_POOL[key % DEFAULT_BACKGROUND_POOL.length];
  }, [settings.background_preset, settings.location]);

  const dim = Math.max(0, Math.min(1, settings.background_dim ?? 0.35));

  const ctxValue = useMemo(() => ({
    settings, updateSettings,
    weather, events: eventsData.events, eventsLoading: eventsData.loading,
    openLocationPicker: () => setLocationPickerOpen(true),
    backgroundUrl,
    defaultBackgrounds: DEFAULT_BACKGROUND_POOL,
  }), [settings, updateSettings, weather, eventsData, backgroundUrl]);

  return (
    <div
      className="ir-dashboard-root"
      style={{ "--ir-dash-dim-top": String(dim * 0.4), "--ir-dash-dim-bottom": String(dim * 1.4) }}
      data-testid="dashboard-root"
    >
      <div className="ir-dash-bg" style={{ backgroundImage: `url(${backgroundUrl})` }} aria-hidden="true" />
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
            <span>{settings.location?.display || settings.location?.name || "Set location"}</span>
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button
              className="ir-dash-icon-btn"
              onClick={() => weather.refresh?.()}
              aria-label="Refresh weather"
              title="Refresh weather"
              data-testid="dash-refresh"
            >
              <RefreshCcw size={16} />
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
