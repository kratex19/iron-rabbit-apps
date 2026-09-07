import React, { useEffect, useState } from "react";
import { BellOff, X } from "lucide-react";

/**
 * FocusStatusChip — small header pill that appears whenever Focus Mode
 * is active. Shows the reason (manual / timer / schedule) and, for
 * timer mode, a live "X left" countdown that ticks every 30s.
 *
 * Tap → invokes `onCancel` which the parent uses to clear the manual
 * toggle + Focus-Now timer in one shot (schedule keeps working —
 * cancelling the chip mid-schedule-window would just re-activate on
 * the next tick, so we short-circuit that by pinning `focus_until` to
 * "0" which is falsy for the isFocusActive OR chain).
 *
 * Renders nothing when Focus is inactive so the header stays clean.
 */
export default function FocusStatusChip({ status, onCancel }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!status?.active) return undefined;
    const iv = setInterval(() => setTick((t) => t + 1), 30 * 1000);
    return () => clearInterval(iv);
  }, [status?.active]);

  if (!status || !status.active) return null;

  let label = "Focus active";
  if (status.until && Date.now() < status.until) {
    const ms = status.until - Date.now();
    const mins = Math.max(1, Math.round(ms / 60000));
    if (mins < 60) label = `Focus · ${mins}m left`;
    else {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      label = m === 0 ? `Focus · ${h}h left` : `Focus · ${h}h ${m}m left`;
    }
  } else if (status.manual) {
    label = "Focus · ON";
  } else if (status.scheduleActive) {
    label = "Focus · scheduled";
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded-full text-[10px] font-medium bg-indigo-500/25 text-indigo-100 border border-indigo-400/40 backdrop-blur-sm shrink-0"
      data-testid="focus-status-chip"
      aria-live="polite"
      title="Focus Mode is silencing alarm popups, sound and haptics"
    >
      <BellOff className="w-3 h-3" strokeWidth={2.4} />
      <span>{label}</span>
      {onCancel && (status.manual || (status.until && Date.now() < status.until)) && (
        <button
          type="button"
          onClick={onCancel}
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Cancel Focus Mode"
          data-testid="focus-status-cancel"
          title="Cancel Focus Mode now"
        >
          <X className="w-3 h-3" strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}
