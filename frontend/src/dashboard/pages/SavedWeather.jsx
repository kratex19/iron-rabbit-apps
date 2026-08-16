import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { format, addDays } from "date-fns";
import { useDashboard } from "../DashboardLayout";
import WeatherIcon from "../components/WeatherIcon";

// Groups the daily forecast into Daily / Weekly / Monthly-ish tabs.
export default function SavedWeather() {
  const navigate = useNavigate();
  const { settings, weather } = useDashboard();
  const [tab, setTab] = useState("weekly");

  const d = weather.data;
  const days = React.useMemo(() => {
    if (!d?.daily?.time) return [];
    return d.daily.time.map((t, i) => ({
      date: new Date(t),
      code: d.daily.weather_code[i],
      hi: d.daily.temperature_2m_max[i],
      lo: d.daily.temperature_2m_min[i],
      pop: d.daily.precipitation_probability_max[i] ?? 0,
    }));
  }, [d]);

  const tUnit = d?.current_units?.temperature_2m || (settings.units === "C" ? "°C" : "°F");

  const shown = tab === "daily" ? days.slice(0, 1) : tab === "weekly" ? days.slice(0, 7) : days;

  return (
    <>
      <div className="ir-dash-subhead">
        <button className="ir-dash-icon-btn" onClick={() => navigate("/dashboard")} aria-label="Back" data-testid="saved-weather-back" style={{ background: "transparent", border: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div className="ir-dash-subhead-title">Saved Weather (Offline)</div>
        <button
          className="ir-dash-icon-btn"
          style={{ marginLeft: "auto" }}
          onClick={() => weather.refresh?.()}
          aria-label="Refresh"
          data-testid="saved-weather-refresh"
        >
          <RefreshCcw size={16} />
        </button>
      </div>

      <div className="ir-dash-card" data-testid="saved-weather-panel">
        <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
          {["daily", "weekly", "monthly"].map((k) => (
            <button
              key={k}
              className="ir-dash-btn ir-dash-btn--ghost"
              onClick={() => setTab(k)}
              data-testid={`saved-weather-tab-${k}`}
              style={{ background: tab === k ? "#fbbf24" : undefined, color: tab === k ? "#111827" : undefined, textTransform: "capitalize" }}
            >
              {k}
            </button>
          ))}
        </div>

        <div style={{ fontWeight: 600 }}>{settings.location?.display || "—"}</div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 12 }}>
          Last updated: {d?.updated_at ? format(new Date(d.updated_at), "MMM d, h:mm a") : "—"}
          {weather.offline && <span className="ir-dash-offline-pill" style={{ marginLeft: 8 }}>Offline</span>}
        </div>

        {shown.length === 0 ? (
          <div style={{ color: "#94a3b8", fontSize: 13, padding: "8px 0" }}>
            No saved data yet. Connect to the internet once to cache a forecast.
          </div>
        ) : (
          <div>
            {shown.map((row, i) => (
              <div className="ir-dash-daily-row" key={i} data-testid={`saved-weather-row-${i}`}>
                <div>{i === 0 ? "Today" : format(row.date, "EEE, MMM d")}</div>
                <div className="ir-dash-daily-icon"><WeatherIcon code={row.code} size={22} /></div>
                <div />
                <div><span className="ir-dash-daily-hi">{row.hi != null ? Math.round(row.hi) : "—"}{tUnit}</span> <span className="ir-dash-daily-lo">/ {row.lo != null ? Math.round(row.lo) : "—"}{tUnit}</span></div>
                <div className="ir-dash-daily-pop">{row.pop}%</div>
              </div>
            ))}
          </div>
        )}

        {tab === "monthly" && days.length < 20 && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
            Extended monthly forecast beyond {days.length} days isn't available from this provider.
          </div>
        )}
      </div>
    </>
  );
}
