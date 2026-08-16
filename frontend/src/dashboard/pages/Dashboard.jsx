import React, { useMemo } from "react";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { Cloud, ChevronRight, AlarmClock, TriangleAlert, ExternalLink, HardDriveDownload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useClock from "../hooks/useClock";
import { useDashboard } from "../DashboardLayout";
import WeatherIcon from "../components/WeatherIcon";
import { shortWeatherStatement } from "../utils/wmo";
import { providerUrlFor, PROVIDERS } from "../state/dashboardStore";

function EventGroup({ label, sub, events, onOpen }) {
  return (
    <div>
      <div className="ir-dash-event-group-title">
        <span>{label}</span>
        {sub && <span className="ir-dash-event-group-date">{sub}</span>}
      </div>
      {events.map((e) => (
        <div key={e.id} className="ir-dash-event-row" onClick={() => onOpen?.(e)} data-testid={`dash-event-row-${e.id}`}>
          <div className="ir-dash-event-time">{format(e.datetime, "h:mm a")}</div>
          <div className="ir-dash-event-bar" style={{ background: e.note_color || "#fbbf24" }} />
          <div>
            <div className="ir-dash-event-title">{e.title}</div>
            {e.location && <div className="ir-dash-event-loc">{e.location}</div>}
            {!e.location && e.note_title && e.note_title !== e.title && (
              <div className="ir-dash-event-loc">{e.note_title}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const now = useClock();
  const { settings, weather, events, openLocationPicker } = useDashboard();

  // Group events into Today / Tomorrow / Future dates
  const eventGroups = useMemo(() => {
    const todayStart = startOfDay(now);
    const upcoming = events.filter((e) => e.datetime >= todayStart);
    const groups = new Map();
    for (const e of upcoming) {
      const key = startOfDay(e.datetime).toISOString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(e);
    }
    const ordered = [...groups.entries()].sort(([a], [b]) => new Date(a) - new Date(b));
    return ordered.map(([iso, list]) => ({ date: new Date(iso), list }));
  }, [events, now]);

  const nextEvent = useMemo(() => events.find((e) => e.datetime >= now), [events, now]);

  const wmoCode = weather.data?.current?.weather_code ?? 3;
  const isDay = !!weather.data?.current?.is_day;
  const currentTemp = weather.data?.current?.temperature_2m;
  const tempUnit = weather.data?.current_units?.temperature_2m || (settings.units === "C" ? "°C" : "°F");
  const statement = weather.data
    ? shortWeatherStatement(weather.data.current, weather.data.hourly)
    : "Loading conditions…";

  // Severe weather alert — any hourly code >= 95 in the next 24h
  const severeAlert = useMemo(() => {
    const h = weather.data?.hourly;
    if (!h || !Array.isArray(h.weather_code)) return null;
    const nowMs = now.getTime();
    const soon = h.time
      .map((t, i) => ({ t: new Date(t), code: h.weather_code[i] }))
      .filter((x) => x.t.getTime() >= nowMs && x.t.getTime() <= nowMs + 24 * 3600e3)
      .find((x) => [95, 96, 99].includes(x.code));
    if (!soon) return null;
    return { title: "Severe Thunderstorm Watch", until: format(soon.t, "h:mm a") };
  }, [weather.data, now]);

  const openWeatherProvider = () => {
    const url = providerUrlFor(settings.provider, settings.location, settings.provider_custom_url);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Hero — clock */}
      <div className="ir-dash-hero">
        <div className="ir-dash-time" data-testid="dash-clock">{format(now, "h:mm")}</div>
        <div className="ir-dash-date" data-testid="dash-date">{format(now, "EEEE, MMMM d")}</div>
      </div>

      <div className="ir-dash-grid">
        {/* LEFT column — weather + traffic + alert */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Weather hero */}
          <div className="ir-dash-card" data-testid="dash-weather-panel">
            <div className="ir-dash-label">Today</div>
            <div className="ir-dash-weather-main">
              <div className="ir-dash-temp" data-testid="dash-weather-temp">
                {currentTemp != null ? Math.round(currentTemp) : "--"}{tempUnit}
              </div>
              <button
                aria-label="Open online weather"
                title={`Open ${PROVIDERS[settings.provider]?.label || "weather"}`}
                onClick={openWeatherProvider}
                style={{ background: "transparent", border: 0, cursor: "pointer" }}
                data-testid="dash-weather-icon-open-provider"
              >
                <WeatherIcon code={wmoCode} isDay={isDay} className="ir-dash-weather-icon" />
              </button>
            </div>
            <div className="ir-dash-weather-statement">{statement}</div>

            <div className="ir-dash-weather-actions">
              <button className="ir-dash-weather-action" onClick={openWeatherProvider} data-testid="dash-weather-live-btn">
                <Cloud size={18} />
                <div>
                  <div className="ir-dash-weather-action-title">Live Weather</div>
                  <div className="ir-dash-weather-action-sub">
                    <ExternalLink size={10} style={{ display: "inline", verticalAlign: -1, marginRight: 3 }} />
                    {PROVIDERS[settings.provider]?.label || "Online"}
                  </div>
                </div>
              </button>
              <button className="ir-dash-weather-action" onClick={() => navigate("/dashboard/saved-weather")} data-testid="dash-weather-saved-btn">
                <HardDriveDownload size={18} />
                <div>
                  <div className="ir-dash-weather-action-title">Saved Forecast</div>
                  <div className="ir-dash-weather-action-sub">Offline</div>
                </div>
              </button>
            </div>

            {weather.offline && (
              <div style={{ marginTop: 10 }}>
                <span className="ir-dash-offline-pill">Offline · showing saved</span>
              </div>
            )}
            {weather.error && !weather.data && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#fca5a5" }}>
                Couldn't reach weather service. <button className="ir-dash-btn ir-dash-btn--ghost" style={{ marginLeft: 6, padding: "2px 8px" }} onClick={openLocationPicker}>Set location</button>
              </div>
            )}
          </div>

          {/* Traffic — placeholder for V1 */}
          <div className="ir-dash-card ir-dash-card--compact" data-testid="dash-traffic-panel">
            <div className="ir-dash-label">Traffic</div>
            <div className="ir-dash-traffic-row" style={{ color: "#cbd5e1", fontSize: 13 }}>
              Traffic not configured yet.
            </div>
            <div className="ir-dash-traffic-sub" style={{ marginTop: 4 }}>
              A provider can be enabled in a future update.
            </div>
          </div>

          {/* Alert (only when present) */}
          {severeAlert && (
            <div className="ir-dash-card ir-dash-card--alert ir-dash-card--compact" data-testid="dash-alert-panel">
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <TriangleAlert className="ir-dash-inline-icon" size={20} />
                <div>
                  <div className="ir-dash-label" style={{ color: "#fbbf24" }}>Alert</div>
                  <div style={{ fontWeight: 600 }}>{severeAlert.title}</div>
                  <div style={{ fontSize: 12, color: "#fde68a", marginTop: 2 }}>Until {severeAlert.until}</div>
                </div>
              </div>
            </div>
          )}

          {/* Next event (only when present) */}
          {nextEvent && (
            <div className="ir-dash-card ir-dash-card--compact" data-testid="dash-next-event">
              <div className="ir-dash-label">Next</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <AlarmClock className="ir-dash-inline-icon" size={18} />
                <div>
                  <div style={{ fontWeight: 600 }}>{format(nextEvent.datetime, "h:mm a")} — {nextEvent.title}</div>
                  {nextEvent.location && <div style={{ fontSize: 12, color: "#94a3b8" }}>{nextEvent.location}</div>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT column — events list */}
        <div className="ir-dash-card" data-testid="dash-events-panel">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <div className="ir-dash-label" style={{ marginBottom: 0 }}>Upcoming</div>
            <button
              className="ir-dash-btn ir-dash-btn--ghost"
              style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
              onClick={() => navigate("/dashboard/events")}
              data-testid="dash-events-open-all"
            >
              All events <ChevronRight size={14} />
            </button>
          </div>

          <div className="ir-dash-events">
            {eventGroups.length === 0 && (
              <div style={{ color: "#94a3b8", fontSize: 13, padding: "16px 0" }}>
                No upcoming events. Add events to any Iron Rabbit note and they'll appear here.
              </div>
            )}
            {eventGroups.slice(0, 5).map((g) => (
              <EventGroup
                key={g.date.toISOString()}
                label={isToday(g.date) ? "Today" : isTomorrow(g.date) ? "Tomorrow" : format(g.date, "EEEE").toUpperCase()}
                sub={format(g.date, "EEEE, MMMM d")}
                events={g.list}
                onOpen={() => navigate("/dashboard/events")}
              />
            ))}
            {eventGroups.length > 5 && (
              <div className="ir-dash-event-more">+ {eventGroups.slice(5).reduce((n, g) => n + g.list.length, 0)} more events</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
