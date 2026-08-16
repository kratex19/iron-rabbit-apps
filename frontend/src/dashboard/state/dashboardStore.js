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
  version: 1,
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

// ---- Settings API ----
export async function loadSettings() {
  const saved = (await settingsStore.getItem("main")) || {};
  return { ...DEFAULT_SETTINGS, ...saved };
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
