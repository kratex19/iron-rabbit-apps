import React, { useMemo, useRef, useState, useCallback } from "react";
import { format, isToday, isTomorrow, startOfDay } from "date-fns";
import { Cloud, ChevronRight, AlarmClock, TriangleAlert, ExternalLink, HardDriveDownload, GripVertical, Eye, EyeOff, LayoutGrid, Check, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import useClock from "../hooks/useClock";
import { useDashboard } from "../DashboardLayout";
import WeatherIcon from "../components/WeatherIcon";
import { shortWeatherStatement } from "../utils/wmo";
import { providerUrlFor, PROVIDERS } from "../state/dashboardStore";

const ALL_WIDGETS = ["weather", "traffic", "alert", "next", "events"];
const WIDGET_LABELS = {
  weather: "Weather",
  traffic: "Traffic",
  alert: "Alert",
  next: "Next Event",
  events: "Events",
};

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

function relativeTimeAgo(ms, now) {
  if (!ms) return null;
  const diff = Math.max(0, (now?.getTime?.() || Date.now()) - ms);
  const s = Math.floor(diff / 1000);
  if (s < 30) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return m === 1 ? "1 min ago" : `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return h === 1 ? "1 h ago" : `${h} h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "1 day ago" : `${d} days ago`;
}

function WeatherWidget({ weather, settings, tempUnit, currentTemp, wmoCode, isDay, statement, openWeatherProvider, openLocationPicker, navigate, now }) {
  const updatedAgo = weather.data?.updated_at ? relativeTimeAgo(weather.data.updated_at, now) : null;
  return (
    <div className="ir-dash-card" data-testid="dash-weather-panel">
      <div className="ir-dash-label">Today</div>
      <div className="ir-dash-weather-main">
        <div className="ir-dash-temp" data-testid="dash-weather-temp">
          {currentTemp != null ? Math.round(currentTemp) : "--"}{tempUnit}
        </div>
        <button aria-label="Open online weather" title={`Open ${PROVIDERS[settings.provider]?.label || "weather"}`}
          onClick={openWeatherProvider}
          style={{ background: "transparent", border: 0, cursor: "pointer" }}
          data-testid="dash-weather-icon-open-provider">
          <WeatherIcon code={wmoCode} isDay={isDay} className="ir-dash-weather-icon" />
        </button>
      </div>
      <div className="ir-dash-weather-statement">{statement}</div>
      {updatedAgo && (
        <div
          data-testid="dash-weather-updated-ago"
          style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, letterSpacing: 0.2 }}
          title={new Date(weather.data.updated_at).toLocaleString()}
        >
          Updated {updatedAgo}{weather.offline ? " · offline" : ""}
        </div>
      )}
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
  );
}

function TrafficWidget() {
  return (
    <div className="ir-dash-card ir-dash-card--compact" data-testid="dash-traffic-panel">
      <div className="ir-dash-label">Traffic</div>
      <div className="ir-dash-traffic-row" style={{ color: "#cbd5e1", fontSize: 13 }}>Traffic not configured yet.</div>
      <div className="ir-dash-traffic-sub" style={{ marginTop: 4 }}>A provider can be enabled in a future update.</div>
    </div>
  );
}

function AlertWidget({ alert }) {
  if (!alert) return null;
  return (
    <div className="ir-dash-card ir-dash-card--alert ir-dash-card--compact" data-testid="dash-alert-panel">
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <TriangleAlert className="ir-dash-inline-icon" size={20} />
        <div>
          <div className="ir-dash-label" style={{ color: "#fbbf24" }}>Alert</div>
          <div style={{ fontWeight: 600 }}>{alert.title}</div>
          <div style={{ fontSize: 12, color: "#fde68a", marginTop: 2 }}>Until {alert.until}</div>
        </div>
      </div>
    </div>
  );
}

function NextEventWidget({ nextEvent }) {
  if (!nextEvent) return null;
  return (
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
  );
}

function EventsWidget({ eventGroups, navigate }) {
  return (
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
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const now = useClock();
  const { settings, updateSettings, weather, events, openLocationPicker, cycleBackground, nameForBackground } = useDashboard();
  const [editMode, setEditMode] = useState(false);
  const [swipeHint, setSwipeHint] = useState(null); // "prev" | "next" | null
  const [previewName, setPreviewName] = useState(null);

  // Ensure both columns together contain every widget exactly once
  const { leftIds, rightIds } = useMemo(() => {
    const left = Array.isArray(settings.widgets_left) ? settings.widgets_left.filter((k) => ALL_WIDGETS.includes(k)) : [];
    const right = Array.isArray(settings.widgets_right) ? settings.widgets_right.filter((k) => ALL_WIDGETS.includes(k)) : [];
    const seen = new Set([...left, ...right]);
    const missing = ALL_WIDGETS.filter((k) => !seen.has(k));
    // Default routing for previously-missing widgets: events → right, others → left
    for (const k of missing) {
      if (k === "events") right.push(k);
      else left.push(k);
    }
    return { leftIds: left, rightIds: right };
  }, [settings.widgets_left, settings.widgets_right]);

  const widgetHidden = Array.isArray(settings.widget_hidden) ? settings.widget_hidden : [];

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

  const renderWidgetBody = (key) => {
    switch (key) {
      case "weather": return <WeatherWidget {...{ weather, settings, tempUnit, currentTemp, wmoCode, isDay, statement, openWeatherProvider, openLocationPicker, navigate, now }} />;
      case "traffic": return <TrafficWidget />;
      case "alert":   return <AlertWidget alert={severeAlert} />;
      case "next":    return <NextEventWidget nextEvent={nextEvent} />;
      case "events":  return <EventsWidget eventGroups={eventGroups} navigate={navigate} />;
      default: return null;
    }
  };

  const isEmpty = (key) => {
    if (key === "alert") return !severeAlert;
    if (key === "next")  return !nextEvent;
    return false;
  };

  // Cross-column DnD
  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    const from = source.droppableId === "col-left" ? [...leftIds] : [...rightIds];
    const to = destination.droppableId === "col-left" ? (source.droppableId === "col-left" ? from : [...leftIds]) : (source.droppableId === "col-right" ? from : [...rightIds]);
    const [moved] = from.splice(source.index, 1);
    if (source.droppableId === destination.droppableId) {
      from.splice(destination.index, 0, moved);
      if (destination.droppableId === "col-left") updateSettings({ widgets_left: from });
      else                                        updateSettings({ widgets_right: from });
    } else {
      to.splice(destination.index, 0, moved);
      if (destination.droppableId === "col-left") updateSettings({ widgets_left: to,   widgets_right: from });
      else                                        updateSettings({ widgets_right: to,  widgets_left:  from });
    }
  };

  const toggleHidden = (key) => {
    if (key === "weather") return;
    const nextHidden = widgetHidden.includes(key) ? widgetHidden.filter((k) => k !== key) : [...widgetHidden, key];
    updateSettings({ widget_hidden: nextHidden });
  };

  // ---- Swipe on hero clock area to cycle backgrounds ----
  const swipeStart = useRef(null);
  const onSwipeStart = useCallback((e) => {
    const t = e.touches ? e.touches[0] : e;
    swipeStart.current = { x: t.clientX, y: t.clientY, at: Date.now() };
  }, []);
  const onSwipeEnd = useCallback((e) => {
    const s = swipeStart.current;
    if (!s) return;
    const t = e.changedTouches ? e.changedTouches[0] : e;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const elapsed = Date.now() - s.at;
    swipeStart.current = null;
    // Require a mostly-horizontal, > 60px, < 800ms swipe
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.2 || elapsed > 800) return;
    const dir = dx < 0 ? 1 : -1;
    cycleBackground(dir);
    setSwipeHint(dir > 0 ? "next" : "prev");
    setTimeout(() => setSwipeHint(null), 700);
  }, [cycleBackground]);

  // Show the incoming background's friendly name for ~1.4s whenever the
  // background_preset changes (works for swipe AND arrow/keyboard triggers).
  const lastBgRef = useRef(settings.background_preset);
  React.useEffect(() => {
    if (settings.background_preset && settings.background_preset !== lastBgRef.current) {
      lastBgRef.current = settings.background_preset;
      const name = nameForBackground(settings.background_preset);
      if (name) {
        setPreviewName(name);
        const t = setTimeout(() => setPreviewName(null), 1400);
        return () => clearTimeout(t);
      }
    }
  }, [settings.background_preset, nameForBackground]);

  // Column renderer helper
  const renderColumn = (droppableId, ids) => (
    <Droppable droppableId={droppableId}>
      {(dropProvided, dropSnap) => (
        <div
          ref={dropProvided.innerRef}
          {...dropProvided.droppableProps}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            minHeight: editMode ? 80 : undefined,
            borderRadius: 14,
            padding: editMode ? 8 : 0,
            border: editMode ? `1px dashed ${dropSnap.isDraggingOver ? "#fbbf24" : "rgba(255,255,255,0.15)"}` : undefined,
            background: editMode ? (dropSnap.isDraggingOver ? "rgba(251,191,36,0.06)" : "rgba(0,0,0,0.15)") : undefined,
            transition: "background 0.15s ease, border-color 0.15s ease",
          }}
          data-testid={`dash-column-${droppableId}`}
        >
          {ids.map((key, idx) => {
            const hidden = widgetHidden.includes(key);
            const empty = isEmpty(key);
            if (!editMode && (hidden || empty)) return null;
            return (
              <Draggable key={key} draggableId={key} index={idx} isDragDisabled={!editMode}>
                {(dragProvided, snap) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    style={{ ...dragProvided.draggableProps.style, opacity: hidden ? 0.4 : 1 }}
                    data-testid={`dash-widget-${key}`}
                  >
                    {editMode && (
                      <div style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                        padding: "6px 10px", marginBottom: 6, borderRadius: 10,
                        background: "rgba(0,0,0,0.42)", border: "1px dashed rgba(255,255,255,0.18)",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span {...dragProvided.dragHandleProps} style={{ cursor: "grab", color: "#cbd5e1" }} data-testid={`dash-widget-handle-${key}`}>
                            <GripVertical size={16} />
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#e5e7eb" }}>
                            {WIDGET_LABELS[key]}
                            {empty && <span style={{ marginLeft: 6, color: "#94a3b8", fontWeight: 400 }}>(nothing to show right now)</span>}
                          </span>
                        </div>
                        {key !== "weather" && (
                          <button
                            className="ir-dash-icon-btn"
                            onClick={() => toggleHidden(key)}
                            aria-label={hidden ? "Show" : "Hide"}
                            data-testid={`dash-widget-hide-${key}`}
                            style={{ width: 28, height: 28, background: "transparent", border: 0 }}
                          >
                            {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        )}
                      </div>
                    )}
                    <div style={{
                      boxShadow: snap.isDragging ? "0 12px 40px rgba(0,0,0,0.5)" : undefined,
                      transform: snap.isDragging ? "scale(1.01)" : undefined,
                      transition: "transform 0.15s ease",
                    }}>
                      {(hidden || empty) ? (
                        editMode ? (
                          <div className="ir-dash-card ir-dash-card--compact" style={{ opacity: 0.5, fontSize: 12, color: "#94a3b8" }}>
                            {hidden ? "Hidden" : "No content"}
                          </div>
                        ) : null
                      ) : renderWidgetBody(key)}
                    </div>
                  </div>
                )}
              </Draggable>
            );
          })}
          {dropProvided.placeholder}
          {editMode && ids.length === 0 && (
            <div style={{ color: "#94a3b8", fontSize: 12, padding: 12, textAlign: "center" }}>
              Drop widgets here
            </div>
          )}
        </div>
      )}
    </Droppable>
  );

  return (
    <>
      {/* Hero — clock with swipe-to-cycle-background */}
      <div
        className="ir-dash-hero"
        onTouchStart={onSwipeStart}
        onTouchEnd={onSwipeEnd}
        onPointerDown={onSwipeStart}
        onPointerUp={onSwipeEnd}
        style={{ touchAction: "pan-y", userSelect: "none", position: "relative" }}
        data-testid="dash-hero"
      >
        <div className="ir-dash-time" data-testid="dash-clock">{format(now, "h:mm")}</div>
        <div className="ir-dash-date" data-testid="dash-date">{format(now, "EEEE, MMMM d")}</div>
        <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          Swipe to change background{Array.isArray(settings.favorites) && settings.favorites.length ? ` · ${settings.favorites.length} ★ favorite${settings.favorites.length === 1 ? "" : "s"}` : ""}
        </div>
        {previewName && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -14,
              transform: "translateX(-50%)",
              background: "rgba(0,0,0,0.65)",
              border: "1px solid rgba(255,255,255,0.16)",
              backdropFilter: "blur(10px)",
              color: "#fef3c7",
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.05em",
              whiteSpace: "nowrap",
              animation: "ir-dash-preview-toast 1400ms ease-out forwards",
              pointerEvents: "none",
              zIndex: 3,
            }}
            data-testid="dash-bg-preview-name"
          >
            {previewName}
          </div>
        )}
        {swipeHint && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              [swipeHint === "next" ? "right" : "left"]: 20,
              transform: "translateY(-50%)",
              width: 48, height: 48, borderRadius: 999,
              background: "rgba(0,0,0,0.5)", color: "#fbbf24",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ir-dash-swipe-pulse 700ms ease-out forwards",
              pointerEvents: "none",
            }}
            data-testid={`dash-swipe-indicator-${swipeHint}`}
          >
            {swipeHint === "next" ? <ChevronRight size={26} /> : <ChevronLeft size={26} />}
          </div>
        )}
      </div>

      {/* Edit widgets toggle */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          className="ir-dash-btn ir-dash-btn--ghost"
          onClick={() => setEditMode((v) => !v)}
          data-testid="dash-toggle-edit-widgets"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px", fontSize: 12 }}
          title="Reorder, move between columns, or hide widgets"
        >
          {editMode ? <Check size={14} /> : <LayoutGrid size={14} />}
          {editMode ? "Done" : "Edit widgets"}
        </button>
      </div>

      <div className="ir-dash-grid">
        <DragDropContext onDragEnd={onDragEnd}>
          {renderColumn("col-left", leftIds)}
          {renderColumn("col-right", rightIds)}
        </DragDropContext>
      </div>
    </>
  );
}
