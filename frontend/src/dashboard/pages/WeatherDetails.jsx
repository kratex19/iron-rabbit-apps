import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useDashboard } from "../DashboardLayout";
import WeatherIcon from "../components/WeatherIcon";
import { describeWmo } from "../utils/wmo";
import { providerUrlFor, PROVIDERS } from "../state/dashboardStore";

export default function WeatherDetails() {
  const navigate = useNavigate();
  const { settings, updateSettings, weather } = useDashboard();

  const d = weather.data;
  const cur = d?.current;
  const hourly = d?.hourly;
  const tUnit = d?.current_units?.temperature_2m || (settings.units === "C" ? "°C" : "°F");
  const wUnit = d?.current_units?.wind_speed_10m || (settings.units === "C" ? "km/h" : "mph");
  const toggleUnits = () => updateSettings({ units: settings.units === "C" ? "F" : "C" });

  const openProvider = () => {
    const url = providerUrlFor(settings.provider, settings.location, settings.provider_custom_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const nextHours = React.useMemo(() => {
    if (!hourly?.time) return [];
    const now = Date.now();
    return hourly.time
      .map((t, i) => ({ t: new Date(t), temp: hourly.temperature_2m?.[i], pop: hourly.precipitation_probability?.[i], code: hourly.weather_code?.[i] }))
      .filter((x) => x.t.getTime() >= now)
      .slice(0, 6);
  }, [hourly]);

  return (
    <>
      <div className="ir-dash-subhead">
        <button className="ir-dash-icon-btn" onClick={() => navigate("/dashboard")} aria-label="Back" data-testid="weather-details-back" style={{ background: "transparent", border: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div className="ir-dash-subhead-title">Weather Details</div>
        <button
          type="button"
          onClick={toggleUnits}
          className="ir-dash-btn ir-dash-btn--ghost"
          data-testid="weather-details-units-toggle"
          aria-label={`Switch to ${settings.units === "C" ? "Fahrenheit" : "Celsius"}`}
          title={`Switch to ${settings.units === "C" ? "Fahrenheit" : "Celsius"}`}
          style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 12, fontWeight: 600 }}
        >
          °{settings.units === "C" ? "C" : "F"}
        </button>
      </div>

      <div className="ir-dash-card" data-testid="weather-details-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>{settings.location?.display || "—"}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>
              Updated: {d?.updated_at ? format(new Date(d.updated_at), "MMM d, h:mm a") : "—"}
              {weather.offline && <span className="ir-dash-offline-pill" style={{ marginLeft: 8 }}>Offline</span>}
            </div>
          </div>

          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ fontSize: 60, fontWeight: 200, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {cur?.temperature_2m != null ? Math.round(cur.temperature_2m) : "--"}{tUnit}
            </div>
            <WeatherIcon code={cur?.weather_code ?? 3} isDay={!!cur?.is_day} size={64} className="ir-dash-daily-icon" />
          </div>
        </div>

        <div style={{ fontSize: 15, marginTop: 8, color: "#e5e7eb" }}>{describeWmo(cur?.weather_code).label}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10, marginTop: 14, fontSize: 13, color: "#cbd5e1" }}>
          <div className="ir-dash-row"><span className="ir-dash-row-label">Feels like</span><span>{cur?.apparent_temperature != null ? Math.round(cur.apparent_temperature) + tUnit : "—"}</span></div>
          <div className="ir-dash-row"><span className="ir-dash-row-label">Humidity</span><span>{cur?.relative_humidity_2m != null ? cur.relative_humidity_2m + "%" : "—"}</span></div>
          <div className="ir-dash-row"><span className="ir-dash-row-label">Wind</span><span>{cur?.wind_speed_10m != null ? Math.round(cur.wind_speed_10m) + " " + wUnit : "—"}</span></div>
          <div className="ir-dash-row"><span className="ir-dash-row-label">Sunrise</span><span>{d?.daily?.sunrise?.[0] ? format(new Date(d.daily.sunrise[0]), "h:mm a") : "—"}</span></div>
        </div>

        {nextHours.length > 0 && (
          <div className="ir-dash-hourly" data-testid="weather-details-hourly">
            {nextHours.map((h, i) => (
              <div key={i}>
                <div className="ir-dash-hourly-lbl">{i === 0 ? "Now" : format(h.t, "h a").toLowerCase()}</div>
                <div className="ir-dash-hourly-icon"><WeatherIcon code={h.code} size={18} /></div>
                <div style={{ fontWeight: 600 }}>{h.temp != null ? Math.round(h.temp) + "°" : "—"}</div>
                <div style={{ color: "#93c5fd", fontSize: 11 }}>{h.pop ?? 0}%</div>
              </div>
            ))}
          </div>
        )}

        <button className="ir-dash-btn ir-dash-btn--ghost" style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8 }} onClick={openProvider} data-testid="weather-details-open-provider">
          Open in {PROVIDERS[settings.provider]?.label || "Online Weather"} <ExternalLink size={14} />
        </button>
      </div>
    </>
  );
}
