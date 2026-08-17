// Isolated storage for the Weather & Calendar Dashboard module.
// Keeps a completely separate localforage namespace so it can never
// collide with, or accidentally mutate, the existing Iron Rabbit stores.
import localforage from "localforage";

const settingsStore = localforage.createInstance({
  name: "IronRabbitDashboard",
  storeName: "settings",
  description: "Dashboard-only settings (location, provider, units, background)",
});

const weatherCacheStore = localforage.createInstance({
  name: "IronRabbitDashboard",
  storeName: "weather_cache",
  description: "Cached Open-Meteo weather payloads for offline viewing",
});

// ---- Default settings ----
export const DEFAULT_SETTINGS = {
  version: 2,
  // Location
  location: null, // { name, latitude, longitude, admin1, country_code }
  use_geolocation: true,
  // Units
  units: "F", // "F" | "C"
  // Provider link (what opens when you tap the weather icon)
  provider: "accuweather", // accuweather | weatherbug | weather_com | wunderground | nws | custom
  provider_custom_url: "",
  // Appearance
  background_preset: null, // relative URL under /header-presets/*.webp
  background_dim: 0.35, // 0-1 dark overlay strength
  // Update behaviour
  auto_update: true,
  update_interval_minutes: 60,
  // Widget layout — split across two columns so users can drag between them
  widgets_left: ["weather", "traffic", "alert", "next"],
  widgets_right: ["events"],
  // Widget visibility — user can hide any widget except "weather"
  widget_hidden: [],
  // Starred favorite backgrounds — URLs under /header-presets/*.webp.
  // When at least one is starred, swipe-to-cycle uses this subset instead
  // of the full preset pool.
  favorites: [],
};

// Well-known weather provider URL builders (opened externally on icon tap)
export const PROVIDERS = {
  accuweather: {
    label: "AccuWeather",
    url: (loc) => loc
      ? `https://www.accuweather.com/en/search-locations?query=${encodeURIComponent(loc.name || `${loc.latitude},${loc.longitude}`)}`
      : "https://www.accuweather.com/",
  },
  weatherbug: {
    label: "WeatherBug",
    url: (loc) => loc
      ? `https://www.weatherbug.com/weather-forecast/now/${encodeURIComponent(loc.name || `${loc.latitude},${loc.longitude}`)}`
      : "https://www.weatherbug.com/",
  },
  weather_com: {
    label: "Weather.com",
    url: (loc) => loc
      ? `https://weather.com/search/enhancedlocalsearch?where=${encodeURIComponent(loc.name || `${loc.latitude},${loc.longitude}`)}`
      : "https://weather.com/",
  },
  wunderground: {
    label: "Weather Underground",
    url: (loc) => loc
      ? `https://www.wunderground.com/weather/${encodeURIComponent(loc.name || `${loc.latitude},${loc.longitude}`)}`
      : "https://www.wunderground.com/",
  },
  nws: {
    label: "NWS (weather.gov)",
    url: (loc) => loc
      ? `https://forecast.weather.gov/MapClick.php?lat=${loc.latitude}&lon=${loc.longitude}`
      : "https://www.weather.gov/",
  },
  custom: { label: "Custom URL", url: (_, custom) => custom || "" },
};

export function providerUrlFor(providerKey, location, customUrl) {
  const entry = PROVIDERS[providerKey] || PROVIDERS.accuweather;
  try { return entry.url(location, customUrl); } catch { return "https://www.accuweather.com/"; }
}

// Migrate any URLs still pointing at the deprecated `/dash-backgrounds/`
// pool (with 3-digit filenames) to the shared Iron Rabbit `/header-presets/`
// pool (with 2-digit filenames). Idempotent — safe to run every hydrate.
function migrateBgUrl(url) {
  if (typeof url !== "string") return url;
  if (!url.startsWith("/dash-backgrounds/")) return url;
  return url
    .replace("/dash-backgrounds/", "/header-presets/")
    .replace(/header-0*(\d+)\.webp$/, (_, n) => `header-${String(n).padStart(2, "0")}.webp`);
}

// ---- Settings API ----
export async function loadSettings() {
  const saved = (await settingsStore.getItem("main")) || {};
  const merged = { ...DEFAULT_SETTINGS, ...saved };
  const migratedPreset = migrateBgUrl(merged.background_preset);
  const migratedFavs = Array.isArray(merged.favorites)
    ? merged.favorites.map(migrateBgUrl)
    : [];
  const needsWrite =
    migratedPreset !== merged.background_preset ||
    migratedFavs.some((u, i) => u !== merged.favorites[i]);
  if (needsWrite) {
    const next = { ...merged, background_preset: migratedPreset, favorites: migratedFavs };
    await settingsStore.setItem("main", next);
    return next;
  }
  return merged;
}
export async function saveSettings(next) {
  await settingsStore.setItem("main", next);
  return next;
}

// ---- Weather cache API ----
// key = `${lat.toFixed(3)},${lng.toFixed(3)}`
export async function saveWeatherCache(key, payload) {
  await weatherCacheStore.setItem(key, { ...payload, cached_at: Date.now() });
}
export async function loadWeatherCache(key) {
  return await weatherCacheStore.getItem(key);
}
