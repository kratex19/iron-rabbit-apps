import { useCallback, useEffect, useRef, useState } from "react";
import { loadWeatherCache, saveWeatherCache } from "../state/dashboardStore";

// Open-Meteo — free, no API key. Returns unified payload:
// { current, hourly, daily, alerts, updated_at, offline }
const BASE = "https://api.open-meteo.com/v1/forecast";

function buildUrl({ latitude, longitude, units }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    temperature_unit: units === "C" ? "celsius" : "fahrenheit",
    wind_speed_unit: units === "C" ? "kmh" : "mph",
    timezone: "auto",
    forecast_days: "10",
  });
  return `${BASE}?${params.toString()}`;
}

export default function useWeather(location, units = "F") {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [offline, setOffline] = useState(false);
  const cacheKeyRef = useRef(null);

  const cacheKey = location ? `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}|${units}` : null;

  // In-flight AbortController for the current Weather request. Kept in a ref
  // so both `fetchNow` and the effect cleanup can reach the SAME instance and
  // guarantee that leaving the Weather screen actually terminates the pending
  // request — previously the cleanup only flipped a `cancelled` flag, so the
  // fetch continued to completion after unmount and could keep IndexedDB /
  // network handles alive during the transition back to Home.
  const abortRef = useRef(null);

  const fetchNow = useCallback(async () => {
    if (!location) return { ok: false, error: "no-location" };
    // Abort any prior in-flight request before starting a new one so we never
    // have two concurrent fetches racing against the same cache key.
    if (abortRef.current) { try { abortRef.current.abort(); } catch { /* noop */ } }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        buildUrl({ latitude: location.latitude, longitude: location.longitude, units }),
        { signal: controller.signal }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const payload = {
        current: json.current,
        current_units: json.current_units,
        hourly: json.hourly,
        daily: json.daily,
        timezone: json.timezone,
        location,
        updated_at: Date.now(),
      };
      setData(payload);
      setOffline(false);
      cacheKeyRef.current = cacheKey;
      if (cacheKey) await saveWeatherCache(cacheKey, payload);
      return { ok: true };
    } catch (err) {
      // AbortError is expected when the user leaves Weather mid-request —
      // do not surface it as a failure and do not try to hydrate cache in
      // that case (the component is already unmounting).
      if (err && (err.name === "AbortError" || controller.signal.aborted)) {
        return { ok: false, error: "aborted" };
      }
      const msg = err.message || String(err);
      setError(msg);
      // Try cache fallback
      if (cacheKey) {
        const cached = await loadWeatherCache(cacheKey);
        if (cached) { setData(cached); setOffline(true); }
      }
      return { ok: false, error: msg };
    } finally {
      // Only clear the loading state for the CURRENT (still-active) request.
      // A stale controller means a newer fetchNow already superseded us.
      if (abortRef.current === controller) setLoading(false);
    }
  }, [location, units, cacheKey]);

  // Initial + on location/units change: load cached first for instant paint, then refresh
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!location) return;
      if (cacheKey) {
        const cached = await loadWeatherCache(cacheKey);
        if (cached && !cancelled) { setData(cached); setOffline(!navigator.onLine); }
      }
      await fetchNow();
    })();
    return () => {
      cancelled = true;
      // Real abort — terminate the in-flight fetch so it releases its
      // network/IDB handles before the Weather screen fully unmounts.
      if (abortRef.current) { try { abortRef.current.abort(); } catch { /* noop */ } }
    };
  }, [location?.latitude, location?.longitude, units]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, offline, refresh: fetchNow };
}
