import React, { useState, useMemo } from "react";
import { format, isSameDay, startOfDay } from "date-fns";
import { CalendarDays, Bell, ArrowRight, Plus, X, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Floating calendar overview. Aggregates every event across all notes,
 * marks days that have any event on the mini calendar, and lists the
 * scheduled items for the selected day. Clicking an event jumps to the
 * source note (via `onOpenNote`). Users can also add a new event
 * directly from the selected day via `onCreateEvent`.
 */
export default function FloatingCalendarModal({
  isOpen,
  onClose,
  notes = [],
  onOpenNote,
  onCreateEvent,
  isDark,
}) {
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [addingEvent, setAddingEvent] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");
  const [alarmOn, setAlarmOn] = useState(true);

  // Flatten every note's events into a single sortable list
  const allEvents = useMemo(() => {
    const out = [];
    for (const n of notes) {
      const events = Array.isArray(n.events) ? n.events : [];
      for (const e of events) {
        const dt = new Date(e.datetime);
        if (isNaN(dt.getTime())) continue;
        out.push({
          id: e.id,
          title: e.title || n.title || "Untitled",
          datetime: dt,
          alarm_enabled: !!e.alarm_enabled,
          noteId: n.id,
          noteTitle: n.title || "Untitled",
          noteColor: n.color || "purple",
        });
      }
    }
    return out.sort((a, b) => a.datetime - b.datetime);
  }, [notes]);

  const eventDates = useMemo(
    () => allEvents.map((e) => e.datetime),
    [allEvents]
  );

  const eventsForDay = useMemo(
    () =>
      selectedDay
        ? allEvents.filter((e) => isSameDay(e.datetime, selectedDay))
        : [],
    [allEvents, selectedDay]
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    return allEvents.filter((e) => e.datetime >= now).slice(0, 5);
  }, [allEvents]);

  const handleOpenNote = (noteId) => {
    if (onOpenNote) onOpenNote(noteId);
    onClose();
  };

  const resetAddForm = () => {
    setAddingEvent(false);
    setNewTitle("");
    setNewTime("09:00");
    setAlarmOn(true);
  };

  const submitEvent = () => {
    if (!newTitle.trim() || !selectedDay) return;
    const [h, m] = newTime.split(":").map(Number);
    const dt = new Date(selectedDay);
    dt.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
    if (onCreateEvent) {
      onCreateEvent({
        title: newTitle.trim(),
        datetime: dt.toISOString(),
        alarm_enabled: alarmOn,
      });
    }
    resetAddForm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`max-w-md ${
          isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"
        }`}
        data-testid="floating-calendar-modal"
      >
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${
              isDark ? "text-white" : "text-gray-900"
            }`}
          >
            <CalendarDays className="w-5 h-5 text-indigo-500" /> Calendar
          </DialogTitle>
          <DialogDescription
            className={isDark ? "text-slate-400" : "text-gray-500"}
          >
            {allEvents.length === 0
              ? "No events scheduled yet — add events to any note."
              : `${allEvents.length} event${
                  allEvents.length === 1 ? "" : "s"
                } across your notes.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div
            className={`rounded-lg flex justify-center ${
              isDark ? "bg-white/5" : "bg-gray-50"
            }`}
          >
            <Calendar
              mode="single"
              selected={selectedDay}
              onSelect={(d) => d && setSelectedDay(d)}
              modifiers={{ hasEvent: eventDates }}
              modifiersClassNames={{
                hasEvent:
                  "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:rounded-full after:bg-indigo-400",
              }}
              className={isDark ? "text-white" : ""}
            />
          </div>

          {/* Selected day agenda */}
          <div>
            <div
              className={`text-xs font-semibold mb-2 flex items-center justify-between ${
                isDark ? "text-slate-300" : "text-gray-700"
              }`}
            >
              <span>
                {selectedDay ? format(selectedDay, "EEEE, MMM d") : "Agenda"}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-normal ${
                    isDark ? "text-slate-500" : "text-gray-400"
                  }`}
                >
                  {eventsForDay.length} event
                  {eventsForDay.length === 1 ? "" : "s"}
                </span>
                {!addingEvent && onCreateEvent && (
                  <button
                    type="button"
                    onClick={() => setAddingEvent(true)}
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                      isDark
                        ? "bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30"
                        : "bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                    }`}
                    data-testid="calendar-add-event-btn"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
            </div>

            {addingEvent && (
              <div
                className={`rounded-md p-2 mb-2 space-y-2 border ${
                  isDark
                    ? "bg-white/5 border-indigo-500/40"
                    : "bg-indigo-50 border-indigo-200"
                }`}
                data-testid="calendar-add-event-form"
              >
                <Input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submitEvent();
                    if (e.key === "Escape") resetAddForm();
                  }}
                  placeholder="Event title (e.g., Dentist appointment)"
                  className={`h-8 text-xs ${
                    isDark
                      ? "bg-black/20 border-white/10 text-white placeholder:text-slate-500"
                      : ""
                  }`}
                  data-testid="calendar-add-title-input"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className={`h-8 text-xs w-28 ${
                      isDark
                        ? "bg-black/20 border-white/10 text-white"
                        : ""
                    }`}
                    data-testid="calendar-add-time-input"
                  />
                  <button
                    type="button"
                    onClick={() => setAlarmOn((v) => !v)}
                    title={alarmOn ? "Alarm on" : "Alarm off"}
                    className={`h-8 w-8 rounded-md flex items-center justify-center transition-colors ${
                      alarmOn
                        ? "bg-amber-400/20 text-amber-400"
                        : isDark
                        ? "bg-white/5 text-slate-500"
                        : "bg-gray-100 text-gray-400"
                    }`}
                    data-testid="calendar-add-alarm-toggle"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                  <div className="ml-auto flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={resetAddForm}
                      className={`h-8 px-2 ${
                        isDark ? "text-slate-400 hover:text-white" : ""
                      }`}
                      data-testid="calendar-add-cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={submitEvent}
                      disabled={!newTitle.trim()}
                      className="h-8 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
                      data-testid="calendar-add-save"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" /> Save
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {eventsForDay.length === 0 ? (
              <div
                className={`text-xs italic px-2 py-3 rounded-md ${
                  isDark
                    ? "text-slate-500 bg-white/5"
                    : "text-gray-400 bg-gray-50"
                }`}
              >
                Nothing scheduled for this day.
                {upcoming.length > 0 && (
                  <>
                    <div
                      className={`text-[10px] font-semibold not-italic mt-3 mb-1 ${
                        isDark ? "text-slate-400" : "text-gray-500"
                      }`}
                    >
                      NEXT UP
                    </div>
                    <div className="space-y-1">
                      {upcoming.map((e) => (
                        <button
                          key={e.id}
                          onClick={() => handleOpenNote(e.noteId)}
                          className={`w-full text-left rounded px-2 py-1.5 flex items-center gap-2 not-italic transition-colors ${
                            isDark
                              ? "bg-white/5 hover:bg-white/10 text-white"
                              : "bg-white hover:bg-gray-100 text-gray-900 border border-gray-200"
                          }`}
                          data-testid={`upcoming-event-${e.id}`}
                        >
                          <span className="text-[10px] text-indigo-400 font-mono w-14 shrink-0">
                            {format(e.datetime, "MMM d")}
                          </span>
                          <span className="text-xs truncate flex-1">
                            {e.title}
                          </span>
                          <ArrowRight className="w-3 h-3 opacity-60 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {eventsForDay.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => handleOpenNote(e.noteId)}
                    className={`w-full text-left rounded-md px-2.5 py-2 flex items-center gap-2 transition-colors ${
                      isDark
                        ? "bg-white/5 hover:bg-white/10 text-white"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-900 border border-gray-200"
                    }`}
                    data-testid={`day-event-${e.id}`}
                  >
                    <span
                      className={`text-[11px] font-mono w-12 shrink-0 ${
                        isDark ? "text-indigo-300" : "text-indigo-600"
                      }`}
                    >
                      {format(e.datetime, "HH:mm")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate leading-tight">
                        {e.title}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          isDark ? "text-slate-500" : "text-gray-500"
                        }`}
                      >
                        {e.noteTitle}
                      </div>
                    </div>
                    {e.alarm_enabled && (
                      <Bell className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
