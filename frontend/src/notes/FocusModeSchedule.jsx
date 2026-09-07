import React, { useMemo } from "react";
import { Clock, Repeat, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { isInFocusWindow } from "../notifications/notificationService";

/**
 * FocusModeSchedule — per-day nightly schedule picker for the
 * Focus Mode "silence in-app alarms" toggle.
 *
 * Schema stored on `settings.focus_schedule`:
 *   {
 *     enabled: boolean,      // master schedule toggle
 *     recurring: boolean,    // repeat every week (default true)
 *     days: {
 *       sun: { enabled, start: "HH:MM", end: "HH:MM" },
 *       mon: { ... }, ... sat: { ... }
 *     }
 *   }
 *
 * Overnight windows are supported: if `end <= start` the window
 * straddles midnight (e.g. Sun 22:00 → Mon 06:30).
 */

const DAY_ORDER = [
  { key: "sun", label: "Sunday" },
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
];

const DEFAULT_DAY = { enabled: false, start: "22:00", end: "06:30" };

export function defaultFocusSchedule() {
  const days = {};
  for (const { key } of DAY_ORDER) {
    // Default: Sunday-through-Thursday nights enabled (weekdays) so the
    // picker isn't empty on first open. User can adjust or disable.
    const isWeekNight = key === "sun" || key === "mon" || key === "tue" || key === "wed" || key === "thu";
    days[key] = {
      enabled: isWeekNight,
      start: "22:00",
      end: "06:30",
    };
  }
  return { enabled: false, recurring: true, days };
}

export default function FocusModeSchedule({ value, onChange, isDark }) {
  const schedule = value || defaultFocusSchedule();

  const activeNow = useMemo(() => isInFocusWindow(new Date(), schedule), [schedule]);

  const updateSchedule = (patch) => onChange({ ...schedule, ...patch });
  const updateDay = (key, patch) => {
    const currentDay = schedule.days?.[key] || DEFAULT_DAY;
    onChange({
      ...schedule,
      days: {
        ...(schedule.days || {}),
        [key]: { ...currentDay, ...patch },
      },
    });
  };

  const chip = isDark
    ? "bg-black/20 border border-white/10"
    : "bg-gray-50 border border-gray-200";
  const timeInput = isDark
    ? "h-8 text-xs bg-black/30 border-white/10 text-white"
    : "h-8 text-xs bg-white border-gray-200 text-gray-900";

  return (
    <div className={`rounded-md p-3 ${chip}`} data-testid="focus-mode-schedule">
      {/* Master enable + status */}
      <div className="flex items-center gap-3">
        <Clock className={`w-4 h-4 shrink-0 ${schedule.enabled ? "text-indigo-400" : (isDark ? "text-slate-500" : "text-gray-400")}`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
            Schedule Focus Mode
          </div>
          <div className={`text-[11px] leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            {schedule.enabled
              ? (activeNow
                  ? "Currently active — alarms silenced by schedule."
                  : "Enabled — will activate on the next scheduled window.")
              : "Off — only the manual toggle above will silence alarms."}
          </div>
        </div>
        <Switch
          checked={!!schedule.enabled}
          onCheckedChange={(v) => updateSchedule({ enabled: v })}
          data-testid="focus-schedule-enabled"
          aria-label="Toggle Focus Mode schedule"
        />
      </div>

      {schedule.enabled && (
        <>
          {/* Recurring toggle */}
          <div className={`mt-3 flex items-center gap-2 pt-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
            <Repeat className={`w-3.5 h-3.5 ${schedule.recurring ? "text-indigo-400" : (isDark ? "text-slate-500" : "text-gray-400")}`} />
            <label
              htmlFor="focus-schedule-recurring"
              className={`text-[11px] flex-1 cursor-pointer ${isDark ? "text-slate-300" : "text-gray-600"}`}
            >
              Recurring — repeat this schedule every week
            </label>
            <Switch
              id="focus-schedule-recurring"
              checked={schedule.recurring !== false}
              onCheckedChange={(v) => updateSchedule({ recurring: v })}
              data-testid="focus-schedule-recurring"
            />
          </div>

          {/* Per-day rows */}
          <div className="mt-2 space-y-1.5">
            {DAY_ORDER.map(({ key, label }) => {
              const day = schedule.days?.[key] || DEFAULT_DAY;
              const crossesMidnight = (() => {
                if (!day.start || !day.end) return false;
                return day.end <= day.start;
              })();
              return (
                <div
                  key={key}
                  className={`flex flex-wrap items-center gap-2 px-2 py-1.5 rounded ${
                    day.enabled
                      ? (isDark ? "bg-indigo-500/[0.08]" : "bg-indigo-50/60")
                      : ""
                  }`}
                  data-testid={`focus-schedule-day-${key}`}
                >
                  <button
                    type="button"
                    onClick={() => updateDay(key, { enabled: !day.enabled })}
                    className={`min-w-[92px] text-left text-xs font-medium transition-colors ${
                      day.enabled
                        ? (isDark ? "text-indigo-200" : "text-indigo-700")
                        : (isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-500 hover:text-gray-700")
                    }`}
                    data-testid={`focus-schedule-day-toggle-${key}`}
                  >
                    {label}
                  </button>
                  <Switch
                    checked={!!day.enabled}
                    onCheckedChange={(v) => updateDay(key, { enabled: v })}
                    aria-label={`Enable Focus Mode on ${label}`}
                  />
                  <div className="flex items-center gap-1.5 ml-auto">
                    <Input
                      type="time"
                      value={day.start || "22:00"}
                      onChange={(e) => updateDay(key, { start: e.target.value })}
                      disabled={!day.enabled}
                      className={`${timeInput} w-[92px] disabled:opacity-40`}
                      data-testid={`focus-schedule-day-start-${key}`}
                      aria-label={`${label} start time`}
                    />
                    <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>→</span>
                    <Input
                      type="time"
                      value={day.end || "06:30"}
                      onChange={(e) => updateDay(key, { end: e.target.value })}
                      disabled={!day.enabled}
                      className={`${timeInput} w-[92px] disabled:opacity-40`}
                      data-testid={`focus-schedule-day-end-${key}`}
                      aria-label={`${label} end time`}
                    />
                  </div>
                  {crossesMidnight && day.enabled && (
                    <span className={`text-[9px] uppercase tracking-wider ml-1 ${isDark ? "text-indigo-300" : "text-indigo-600"}`} title="Ends after midnight, on the next day">
                      +1d
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <p className={`text-[10px] mt-2 leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
            Tip: set a day's end time earlier than the start (e.g. 22:00 → 06:30) to
            span into the next morning. The manual toggle above always overrides the schedule.
          </p>
        </>
      )}
    </div>
  );
}
