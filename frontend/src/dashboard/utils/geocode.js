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

// Reverse geocode via BigDataCloud's client-side API (no key required,
// generous free tier, CORS-enabled). Falls back to Open-Meteo, then to
// bare lat/long text if both fail so the app never breaks.
export async function reverseGeocode(latitude, longitude) {
  // 1st attempt — BigDataCloud (reliable, city-level accuracy worldwide)
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url);
    if (res.ok) {
      const j = await res.json();
      const name = j.city || j.locality || j.principalSubdivision || j.countryName;
      if (name) {
        return {
          name,
          admin1: j.principalSubdivision || undefined,
          country: j.countryName || undefined,
          country_code: j.countryCode || undefined,
          latitude,
          longitude,
          display: `${name}${j.principalSubdivision ? ", " + j.principalSubdivision : ""}`,
        };
      }
    }
  } catch { /* fall through */ }

  // 2nd attempt — Open-Meteo's /search does support reverse-ish lookup for
  // some regions when we hand it just the coordinates as a query string.
  try {
    const url = `${GEO}?latitude=${latitude}&longitude=${longitude}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (res.ok) {
      const j = await res.json();
      const r = (j.results || [])[0];
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
    }
  } catch { /* fall through */ }

  // Final fallback — bare coordinates. Better than an empty label.
  return {
    name: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
    latitude,
    longitude,
    display: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
  };
}
