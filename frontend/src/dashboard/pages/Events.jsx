import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, StickyNote } from "lucide-react";
import { format, isToday, isTomorrow, startOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { useDashboard } from "../DashboardLayout";

// Read-only event list. Grouped by day, filterable by Day/Week/Month.
// Events are pulled from the existing Iron Rabbit notes (read-only).
export default function Events() {
  const navigate = useNavigate();
  const { events, eventsLoading } = useDashboard();
  const [range, setRange] = useState("day");

  const now = new Date();
  const filtered = useMemo(() => {
    if (range === "day") return events.filter((e) => isWithinInterval(e.datetime, { start: startOfDay(now), end: new Date(startOfDay(now).getTime() + 2 * 24 * 3600e3) }));
    if (range === "week") return events.filter((e) => isWithinInterval(e.datetime, { start: startOfWeek(now), end: endOfWeek(now) }));
    if (range === "month") return events.filter((e) => isWithinInterval(e.datetime, { start: startOfMonth(now), end: endOfMonth(now) }));
    return events;
  }, [events, range, now]);

  // Group by date
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      const key = startOfDay(e.datetime).toISOString();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()].sort(([a], [b]) => new Date(a) - new Date(b));
  }, [filtered]);

  return (
    <>
      <div className="ir-dash-subhead">
        <button className="ir-dash-icon-btn" onClick={() => navigate("/dashboard")} aria-label="Back" data-testid="events-back" style={{ background: "transparent", border: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <div className="ir-dash-subhead-title">Events</div>
      </div>

      <div className="ir-dash-card" data-testid="events-panel">
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {["day", "week", "month"].map((k) => (
            <button
              key={k}
              className="ir-dash-btn ir-dash-btn--ghost"
              onClick={() => setRange(k)}
              data-testid={`events-range-${k}`}
              style={{ background: range === k ? "#fbbf24" : undefined, color: range === k ? "#111827" : undefined, textTransform: "capitalize" }}
            >
              {k}
            </button>
          ))}
        </div>

        {eventsLoading && <div style={{ color: "#94a3b8", padding: 8 }}>Loading events…</div>}

        {!eventsLoading && groups.length === 0 && (
          <div style={{ color: "#94a3b8", fontSize: 13, padding: "20px 0", textAlign: "center" }}>
            <StickyNote style={{ display: "inline", marginRight: 6, verticalAlign: -3 }} size={16} />
            No events in this range. Add events to any Iron Rabbit note and they'll appear here.
          </div>
        )}

        {groups.map(([iso, list]) => {
          const d = new Date(iso);
          return (
            <div key={iso} data-testid={`events-group-${iso}`}>
              <div className="ir-dash-event-group-title">
                <span>{isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEEE").toUpperCase()}</span>
                <span className="ir-dash-event-group-date">{format(d, "EEEE, MMMM d")}</span>
              </div>
              {list.map((e) => (
                <div key={e.id} className="ir-dash-event-row" data-testid={`events-item-${e.id}`}>
                  <div className="ir-dash-event-time">{format(e.datetime, "h:mm a")}</div>
                  <div className="ir-dash-event-bar" style={{ background: e.note_color || "#fbbf24" }} />
                  <div>
                    <div className="ir-dash-event-title">{e.title}</div>
                    {e.location && <div className="ir-dash-event-loc">{e.location}</div>}
                    {e.note_title && e.note_title !== e.title && (
                      <div className="ir-dash-event-loc">From: {e.note_title}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8", textAlign: "center" }}>
          Events come from your existing Iron Rabbit notes. Add or edit them there to update this list.
        </div>
      </div>
    </>
  );
}
