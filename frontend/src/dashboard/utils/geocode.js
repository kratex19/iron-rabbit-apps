// Simple wrapper around Open-Meteo's free geocoding API — no key required.
const GEO = "https://geocoding-api.open-meteo.com/v1/search";

export async function searchLocations(name, count = 5) {
  if (!name || name.trim().length < 2) return [];
  const url = `${GEO}?name=${encodeURIComponent(name.trim())}&count=${count}&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return (json.results || []).map((r) => ({
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    country_code: r.country_code,
    latitude: r.latitude,
    longitude: r.longitude,
    display: `${r.name}${r.admin1 ? ", " + r.admin1 : ""}${r.country_code ? ", " + r.country_code : ""}`,
  }));
}

// Attempt browser geolocation. Returns { latitude, longitude } or throws.
export function getBrowserPosition(options = { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }) {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) return reject(new Error("Geolocation not available"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      options
    );
  });
}

// Reverse geocode via Open-Meteo (best-effort — falls back to lat/long text).
export async function reverseGeocode(latitude, longitude) {
  try {
    const url = `${GEO}?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("geo failed");
    const json = await res.json();
    const r = (json.results || [])[0];
    if (r) {
      return {
        name: r.name,
        admin1: r.admin1,
        country: r.country,
        country_code: r.country_code,
        latitude,
        longitude,
        display: `${r.name}${r.admin1 ? ", " + r.admin1 : ""}`,
      };
    }
  } catch { /* ignore */ }
  return {
    name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
    latitude,
    longitude,
    display: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
  };
}
