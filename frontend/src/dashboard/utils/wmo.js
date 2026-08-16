// Map WMO weather codes → { label, lucideIcon key }
// Lucide keys used: Sun, CloudSun, Cloud, Cloudy, CloudDrizzle, CloudRain,
// CloudRainWind, CloudSnow, CloudFog, CloudLightning, Zap.
export const WMO = {
  0:  { label: "Clear sky",              icon: "Sun" },
  1:  { label: "Mainly clear",           icon: "Sun" },
  2:  { label: "Partly cloudy",          icon: "CloudSun" },
  3:  { label: "Overcast",               icon: "Cloudy" },
  45: { label: "Fog",                    icon: "CloudFog" },
  48: { label: "Rime fog",               icon: "CloudFog" },
  51: { label: "Light drizzle",          icon: "CloudDrizzle" },
  53: { label: "Drizzle",                icon: "CloudDrizzle" },
  55: { label: "Heavy drizzle",          icon: "CloudDrizzle" },
  56: { label: "Freezing drizzle",       icon: "CloudDrizzle" },
  57: { label: "Freezing drizzle",       icon: "CloudDrizzle" },
  61: { label: "Light rain",             icon: "CloudRain" },
  63: { label: "Rain",                   icon: "CloudRain" },
  65: { label: "Heavy rain",             icon: "CloudRainWind" },
  66: { label: "Freezing rain",          icon: "CloudRain" },
  67: { label: "Freezing rain",          icon: "CloudRain" },
  71: { label: "Light snow",             icon: "CloudSnow" },
  73: { label: "Snow",                   icon: "CloudSnow" },
  75: { label: "Heavy snow",             icon: "CloudSnow" },
  77: { label: "Snow grains",            icon: "CloudSnow" },
  80: { label: "Light showers",          icon: "CloudRain" },
  81: { label: "Showers",                icon: "CloudRain" },
  82: { label: "Heavy showers",          icon: "CloudRainWind" },
  85: { label: "Snow showers",           icon: "CloudSnow" },
  86: { label: "Heavy snow showers",     icon: "CloudSnow" },
  95: { label: "Thunderstorms",          icon: "CloudLightning" },
  96: { label: "Thunderstorm w/ hail",   icon: "CloudLightning" },
  99: { label: "Thunderstorm w/ hail",   icon: "CloudLightning" },
};

export function describeWmo(code) {
  return WMO[code] || { label: "Unknown", icon: "Cloud" };
}

// Short, friendly natural-language weather statement for the hero panel.
export function shortWeatherStatement(current, hourly) {
  const c = describeWmo(current?.weather_code);
  // Look ahead in the next 12 hours for meaningful shifts
  if (hourly && Array.isArray(hourly.weather_code)) {
    const now = new Date();
    const future = hourly.time
      .map((t, i) => ({ t: new Date(t), code: hourly.weather_code[i], pop: hourly.precipitation_probability?.[i] ?? 0 }))
      .filter((x) => x.t > now && x.t < new Date(now.getTime() + 12 * 3600e3));
    const stormy = future.find((x) => [95, 96, 99].includes(x.code));
    const rainy  = future.find((x) => [61, 63, 65, 80, 81, 82].includes(x.code));
    const snowy  = future.find((x) => [71, 73, 75, 85, 86].includes(x.code));
    if (stormy) {
      const hr = stormy.t.getHours();
      const period = hr < 12 ? "this morning" : hr < 17 ? "this afternoon" : "this evening";
      return `Storms expected ${period}.`;
    }
    if (rainy) {
      const hr = rainy.t.getHours();
      const period = hr < 12 ? "this morning" : hr < 17 ? "this afternoon" : "this evening";
      return `Rain likely ${period}.`;
    }
    if (snowy) return "Snow expected soon.";
  }
  return `${c.label}.`;
}
