import React from "react";
import * as LucideIcons from "lucide-react";
import { Bell, Repeat, Pin, CalendarDays, CheckSquare, Trophy, Flame, GripHorizontal } from "lucide-react";
import { getBackgroundStyle } from "./BackgroundPicker";
import { computeNoteStreak } from "../notes/streakUtils";
import { haptic } from "../utils/haptic";

/**
 * Icon-view tile for a note.
 * - Square, centred icon + title
 * - Editable per-note background (color / gradient / image)
 * - Small alarm/recurring indicators
 * - Click: open full-screen editor; edit btn on hover
 * - When `dragHandleProps` is passed, renders a visible grip in the
 *   top-left corner that owns the drag start. The rest of the tile
 *   stays as a click-to-open button. Splitting the drag surface from
 *   the click surface fixes hello-pangea/dnd's conflict with the
 *   tile's own `<button>` element + hover `transform` — previously
 *   this made drops "jump around" and forced the user to click far
 *   from the tile body to grab.
 */
export default function NoteTile({ note, onOpen, onEdit, onDelete, isDark = true, selectMode = false, selected = false, onToggleSelect, dragHandleProps = null }) {
  // When the user explicitly picks "No icon", `note.icon` is null → render
  // no icon at all (keeps the tile clean instead of showing a placeholder).
  const IconComp = note.icon && LucideIcons[note.icon] ? LucideIcons[note.icon] : null;
  const bgStyle = getBackgroundStyle(note.background);
  const hasAlarm = note.alarm?.enabled && note.alarm?.datetime;
  const hasRecurring = note.recurring?.enabled;
  const checklist = Array.isArray(note.checklist) ? note.checklist : [];
  const checklistDone = checklist.filter((c) => c.done).length;
  const checklistTotal = checklist.length;
  const chores = Array.isArray(note.chores) ? note.chores : [];
  const choresDone = chores.filter((c) => c.status === "done" && c.parent_approved).length;
  const choresTotal = chores.length;
  const streak = computeNoteStreak(note);

  const handleClick = (e) => {
    if (selectMode) { e.stopPropagation(); onToggleSelect?.(note.id); return; }
    onOpen(note);
    haptic("tap");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`note-tile group ${selected ? "ring-4 ring-indigo-400" : ""}`}
      style={bgStyle}
      data-testid={`note-tile-${note.id}`}
      aria-label={`Open ${note.title || "Untitled"}`}
    >
      {/* Drag grip — top-left corner, only rendered when the parent
          passes drag-handle props. Owns the pointer/touch listeners
          for RBD so the rest of the tile can stay a click-to-open
          button without event conflicts. */}
      {dragHandleProps && (
        <span
          {...dragHandleProps}
          role="button"
          tabIndex={-1}
          aria-label="Drag to reorder"
          onClick={(e) => e.stopPropagation()}
          className="note-tile-grip"
          data-testid={`note-tile-grip-${note.id}`}
        >
          <GripHorizontal className="w-5 h-5" strokeWidth={2.2} />
        </span>
      )}

      {/* Dark overlay for readability over images/light colors */}
      <span className="note-tile-overlay" aria-hidden="true" />

      {/* Selection checkmark overlay (only in select mode) */}
      {selectMode && (
        <span
          className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center border-2 z-10 ${
            selected ? "bg-indigo-500 border-indigo-500 text-white" : "bg-black/40 border-white/70"
          }`}
          data-testid={`note-select-${note.id}`}
          aria-hidden="true"
        >
          {selected && (
            <svg viewBox="0 0 12 12" className="w-3 h-3">
              <path d="M2.5 6.5L5 9l4.5-5.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      )}

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
        {checklistTotal > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-mono">
            <CheckSquare className="w-3 h-3" />{checklistDone}/{checklistTotal}
          </span>
        )}
        {choresTotal > 0 && (
          <span className="flex items-center gap-0.5 text-[10px] font-mono" title={`${choresDone} of ${choresTotal} chores approved`}>
            <Trophy className="w-3 h-3" />{choresDone}/{choresTotal}
          </span>
        )}
        {streak > 0 && (
          <span
            className="flex items-center gap-0.5 text-[10px] font-mono text-orange-300"
            title={`${streak}-period streak`}
            data-testid={`note-streak-${note.id}`}
          >
            <Flame className="w-3 h-3" />{streak}
          </span>
        )}
      </span>

      {/* Icon + title (front + center) */}
      <span className="note-tile-body">
        {IconComp && <IconComp className="note-tile-icon" strokeWidth={1.6} />}
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

      {/* Trash affordance (bottom-right) */}
      {onDelete && !selectMode && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(note.id);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.stopPropagation();
              e.preventDefault();
              onDelete(note.id);
            }
          }}
          className="note-tile-trash"
          data-testid={`note-tile-trash-${note.id}`}
          aria-label="Delete note"
        >
          <LucideIcons.Trash2 className="w-3.5 h-3.5" />
        </span>
      )}
    </button>
  );
}
