import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Plus, X, Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const rid = () => Math.random().toString(36).slice(2, 10);

/**
 * Multi-event editor with an inline calendar visualisation. Days that have
 * at least one event are marked with a dot on the mini calendar. Users can
 * add / delete events and toggle a per-event alarm.
 */
export default function EventsSection({ value = [], onChange, isDark }) {
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(null);
  const [newTime, setNewTime] = useState("09:00");
  const [selectedDay, setSelectedDay] = useState(null);

  const events = Array.isArray(value) ? value : [];
  const eventDates = events.map(e => new Date(e.datetime));
  const sorted = [...events].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

  const addEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    const [h, m] = newTime.split(":").map(Number);
    const dt = new Date(newDate);
    dt.setHours(h, m, 0, 0);
    const evt = {
      id: rid(),
      title: newTitle.trim(),
      datetime: dt.toISOString(),
      alarm_enabled: false,
      notes: "",
    };
    onChange([...events, evt]);
    setNewTitle(""); setNewDate(null); setNewTime("09:00"); setShowAdd(false);
  };
  const removeEvent = (id) => onChange(events.filter(e => e.id !== id));
  const toggleAlarm = (id) => onChange(events.map(e => e.id === id ? { ...e, alarm_enabled: !e.alarm_enabled } : e));

  const eventsForDay = selectedDay
    ? sorted.filter(e => new Date(e.datetime).toDateString() === selectedDay.toDateString())
    : sorted;

  return (
    <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
          <CalendarDays className="w-3.5 h-3.5" /> Events {events.length > 0 && `(${events.length})`}
        </label>
        <Button
          type="button" size="sm" variant="ghost"
          onClick={() => setShowAdd(v => !v)}
          className={`h-7 text-xs ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600'}`}
          data-testid="event-add-btn"
        >
          <Plus className="w-3.5 h-3.5 mr-0.5" /> {showAdd ? "Cancel" : "Add event"}
        </Button>
      </div>

      {/* Add-event form */}
      {showAdd && (
        <div className={`p-2.5 rounded-md mb-2 space-y-2 ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Event title (e.g., Soccer practice)"
            className={`h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-500' : 'bg-white border-gray-200'}`}
            data-testid="event-title-input"
          />
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={`flex-1 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} data-testid="event-date-btn">
                  {newDate ? format(newDate, "MMM d, yyyy") : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className={`p-0 ${isDark ? 'bg-[#0B1221] border-white/10' : ''}`}>
                <Calendar mode="single" selected={newDate} onSelect={setNewDate} />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className={`w-24 h-8 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`}
              data-testid="event-time-input"
            />
            <Button size="sm" onClick={addEvent} disabled={!newTitle.trim() || !newDate} className="h-8 bg-indigo-500 hover:bg-indigo-600 text-white text-xs" data-testid="event-save-btn">
              Save
            </Button>
          </div>
        </div>
      )}

      {/* Mini calendar with event dots */}
      {events.length > 0 && (
        <div className="mb-2 flex justify-center">
          <Calendar
            mode="single"
            selected={selectedDay}
            onSelect={setSelectedDay}
            modifiers={{ hasEvent: eventDates }}
            modifiersClassNames={{ hasEvent: "has-event" }}
            className="p-2"
          />
        </div>
      )}

      {/* Events list */}
      {eventsForDay.length > 0 && (
        <div className="space-y-1.5" data-testid="events-list">
          {eventsForDay.map(evt => (
            <div key={evt.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{evt.title}</div>
                <div className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  {format(new Date(evt.datetime), "MMM d, yyyy · HH:mm")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggleAlarm(evt.id)}
                className={`p-1 rounded ${evt.alarm_enabled ? 'text-yellow-400' : isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}
                title={evt.alarm_enabled ? "Alarm on" : "Alarm off"}
                data-testid={`event-alarm-${evt.id}`}
              >
                {evt.alarm_enabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => removeEvent(evt.id)}
                className={`p-1 rounded ${isDark ? 'text-slate-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
                title="Delete event"
                data-testid={`event-delete-${evt.id}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
