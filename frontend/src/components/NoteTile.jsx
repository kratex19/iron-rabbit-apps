import React from "react";
import * as LucideIcons from "lucide-react";
import { Bell, Repeat, StickyNote, Pin } from "lucide-react";
import { getBackgroundStyle } from "./BackgroundPicker";
import { haptic } from "../utils/haptic";

/**
 * Icon-view tile for a note.
 * - Square, centred icon + title
 * - Editable per-note background (color / gradient / image)
 * - Small alarm/recurring indicators
 * - Click: open full-screen editor; edit btn on hover
 */
export default function NoteTile({ note, onOpen, onEdit, isDark = true }) {
  const IconComp = note.icon && LucideIcons[note.icon] ? LucideIcons[note.icon] : StickyNote;
  const bgStyle = getBackgroundStyle(note.background);
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;

  return (
    <button
      type="button"
      onClick={() => { haptic("tap"); onOpen(note); }}
      className="note-tile group"
      style={bgStyle}
      data-testid={`note-tile-${note.id}`}
      aria-label={`Open ${note.title || "Untitled"}`}
    >
      {/* Dark overlay for readability over images/light colors */}
      <span className="note-tile-overlay" aria-hidden="true" />

      {/* Badges */}
      <span className="note-tile-badges" aria-hidden="true">
        {note.pinned && <Pin className="w-3 h-3" />}
        {hasAlarm && <Bell className="w-3 h-3" />}
        {hasRecurring && <Repeat className="w-3 h-3" />}
        {note.events?.length > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-mono">
            <CalendarDays className="w-3 h-3" />{note.events.length}
          </span>
        )}
      </span>

      {/* Icon + title (front + center) */}
      <span className="note-tile-body">
        <IconComp className="note-tile-icon" strokeWidth={1.6} />
        <span className="note-tile-title" title={note.title}>
          {note.title || "Untitled"}
        </span>
      </span>

      {/* Edit affordance */}
      <span
        role="button"
        tabIndex={-1}
        onClick={(e) => {
          e.stopPropagation();
          onEdit(note);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.stopPropagation();
            e.preventDefault();
            onEdit(note);
          }
        }}
        className="note-tile-edit"
        data-testid={`note-tile-edit-${note.id}`}
        aria-label="Edit note"
      >
        <LucideIcons.Pencil className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}
