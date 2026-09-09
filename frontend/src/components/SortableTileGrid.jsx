import React from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import NoteTile from "./NoteTile";

/**
 * SortableTileGrid — 2D grid reorder for note tiles.
 *
 * The previous drag library (hello-pangea/dnd) is a 1D list library.
 * It reorders row-by-row but can't drop between two specific tiles
 * within the SAME row. dnd-kit's `rectSortingStrategy` computes drop
 * targets in 2D so tiles slide out of the way and open a gap exactly
 * where the pointer is — including horizontal insertion points.
 *
 * This component wraps a single category's (or flat) tile grid. The
 * outer category drag (whole pack reorder) still uses hello-pangea/dnd
 * from NotesApp.jsx — the two libraries coexist because they only
 * register listeners on their own DOM subtrees.
 *
 * Props:
 *   notes         — the array of note objects to display (order = current)
 *   onReorder(fromIndex, toIndex, notes) — persist the new order
 *   isDark, selectMode, isSelected, onToggleSelect
 *   onOpen(note), onEdit(note)
 *   gridStyle     — inline style for the grid container (columns, gap)
 *   testId        — optional data-testid for the grid container
 */
export default function SortableTileGrid({
  notes,
  onReorder,
  isDark,
  selectMode,
  isSelected,
  onToggleSelect,
  onOpen,
  onEdit,
  gridStyle,
  testId,
}) {
  // Sensors — PointerSensor for mouse/pen, TouchSensor for phones,
  // KeyboardSensor for accessibility. A tiny distance/delay threshold
  // prevents accidental drags on click/tap.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const ids = notes.map((n) => n.id);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(notes, oldIndex, newIndex);
    onReorder?.(oldIndex, newIndex, next);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="notes-grid rounded-lg" style={gridStyle} data-testid={testId}>
          {notes.map((note) => (
            <SortableTile
              key={note.id}
              note={note}
              isDark={isDark}
              selectMode={selectMode}
              selected={isSelected ? isSelected(note.id) : false}
              onToggleSelect={onToggleSelect}
              onOpen={onOpen}
              onEdit={onEdit}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableTile({ note, isDark, selectMode, selected, onToggleSelect, onOpen, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id });

  // Apply dnd-kit's transform WITHOUT any CSS transition on the
  // wrapper — same lesson as the hello-pangea fix: fighting
  // transitions with a per-frame transform update makes drops jitter.
  // dnd-kit provides its own `transition` (fires between sort steps,
  // not during the active drag) so we apply that as-is.
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 30 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <NoteTile
        note={note}
        isDark={isDark}
        selectMode={selectMode}
        selected={selected}
        onToggleSelect={onToggleSelect}
        onOpen={onOpen}
        onEdit={onEdit}
        // dnd-kit `listeners` become the grip's drag handle props.
        // The NoteTile renders a small ⋮⋮ pill and only THAT element
        // owns the drag. Rest of the tile stays click-to-open.
        dragHandleProps={listeners}
      />
    </div>
  );
}
