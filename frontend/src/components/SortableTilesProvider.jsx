import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
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
 * Multi-pack sortable grid.
 *
 * Wraps ALL pack sections in a SINGLE `DndContext` so tiles can be
 * dragged from one pack into another. Each pack is its own
 * `SortableContext` (2D grid reorder via `rectSortingStrategy`).
 *
 * The parent renders using the render-prop `renderSection(sectionApi)`
 * so it can freely place headers / accordion wrappers / etc between
 * pack sections without breaking the shared drag context.
 *
 * Data model:
 *   packs: [{ id: string, notes: Note[] }]
 *     `id` is the category name for now — matches how NotesApp groups.
 *   onWithinPackReorder(packId, oldIndex, newIndex, newLocalOrder)
 *   onCrossPackMove(sourcePackId, targetPackId, noteId, moveMode)
 *     moveMode is either "move" (Cmd/Ctrl held) or "copy" (default).
 *
 * The parent uses `renderSection` like:
 *
 *   <SortableTilesProvider ...>
 *     {(api) => packs.map(pack => (
 *       <Wrapper key={pack.id}>
 *         <Header />
 *         <api.Section pack={pack} gridStyle={gridStyle} />
 *       </Wrapper>
 *     ))}
 *   </SortableTilesProvider>
 */
export default function SortableTilesProvider({
  packs,
  onWithinPackReorder,
  onCrossPackMove,
  isDark,
  selectMode,
  isSelected,
  onToggleSelect,
  onOpen,
  onEdit,
  children,
}) {
  const sensors = useSensors(
    // Grip is a dedicated zone so we can drop the touch delay to zero
    // and rely on movement distance alone — feels instant on phones
    // while still preventing accidental drags on tap.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const [activeNote, setActiveNote] = useState(null);
  // Track the source pack so cross-pack drops can look it up on end.
  const [activeSourcePack, setActiveSourcePack] = useState(null);
  const [modifier, setModifier] = useState(false);

  // Build a fast lookup: noteId -> packId
  const noteToPack = useMemo(() => {
    const m = new Map();
    for (const pack of packs) {
      for (const n of pack.notes) m.set(n.id, pack.id);
    }
    return m;
  }, [packs]);

  const findNote = (id) => {
    for (const pack of packs) {
      const n = pack.notes.find((n) => n.id === id);
      if (n) return n;
    }
    return null;
  };

  const handleDragStart = (event) => {
    const id = event.active.id;
    setActiveNote(findNote(id));
    setActiveSourcePack(noteToPack.get(id) || null);
    // Snapshot the modifier key at drag-start; dnd-kit's event has it.
    const orig = event.activatorEvent;
    setModifier(!!(orig && (orig.metaKey || orig.ctrlKey)));
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveNote(null);
    setActiveSourcePack(null);
    if (!over) return;

    // The over.id can be:
    //   - a note id (dropping onto another tile)
    //   - a pack container id `pack-container::<packId>` (empty pack)
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const sourcePackId = noteToPack.get(activeId);
    if (!sourcePackId) return;

    let targetPackId;
    if (typeof overId === "string" && overId.startsWith("pack-container::")) {
      targetPackId = overId.slice("pack-container::".length);
    } else {
      targetPackId = noteToPack.get(overId);
    }
    if (!targetPackId) return;

    if (sourcePackId === targetPackId) {
      // Same-pack 2D reorder
      const pack = packs.find((p) => p.id === sourcePackId);
      if (!pack) return;
      const ids = pack.notes.map((n) => n.id);
      const oldIndex = ids.indexOf(activeId);
      const newIndex = typeof overId === "string" && overId.startsWith("pack-container::")
        ? ids.length - 1
        : ids.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      const next = arrayMove(pack.notes, oldIndex, newIndex);
      onWithinPackReorder?.(sourcePackId, oldIndex, newIndex, next);
      return;
    }

    // Cross-pack drop — either MOVE (modifier held) or COPY (default).
    onCrossPackMove?.(sourcePackId, targetPackId, activeId, modifier ? "move" : "copy");
  };

  const api = {
    Section: (props) => (
      <PackSection
        {...props}
        isDark={isDark}
        selectMode={selectMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onOpen={onOpen}
        onEdit={onEdit}
      />
    ),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={cascadedCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setActiveNote(null); setActiveSourcePack(null); }}
    >
      {typeof children === "function" ? children(api) : children}
      <DragOverlay dropAnimation={null}>
        {activeNote ? (
          <div style={{ transform: "rotate(2deg)", opacity: 0.92, cursor: "grabbing" }}>
            <NoteTile note={activeNote} isDark={isDark} onOpen={() => {}} onEdit={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Custom collision detection: prefer pointer-within (best for cross-pack
// drops onto a different section's empty container) then fall back to
// closest-center (best for reordering within a dense grid of tiles).
function cascadedCollision(args) {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) return pointerCollisions;
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) return rectCollisions;
  return closestCenter(args);
}

function PackSection({ pack, gridStyle, testId, isDark, selectMode, isSelected, onToggleSelect, onOpen, onEdit }) {
  // useDroppable makes the whole grid container a valid drop target
  // even when it has zero tiles, so users can move a note INTO an
  // empty pack.
  const { setNodeRef, isOver } = useDroppable({ id: `pack-container::${pack.id}` });
  const ids = pack.notes.map((n) => n.id);

  return (
    <SortableContext items={ids} strategy={rectSortingStrategy}>
      <div
        ref={setNodeRef}
        className={`notes-grid rounded-lg transition-colors ${pack.notes.length === 0 ? "min-h-[140px]" : ""} ${isOver ? (isDark ? "ring-2 ring-indigo-400/60 bg-indigo-500/10" : "ring-2 ring-indigo-400/60 bg-indigo-50") : ""}`}
        style={gridStyle}
        data-testid={testId}
      >
        {pack.notes.map((note) => (
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
        {pack.notes.length === 0 && (
          <div
            className={`col-span-full flex items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
              isOver
                ? (isDark ? "border-indigo-400 bg-indigo-500/15 text-indigo-100" : "border-indigo-400 bg-indigo-50 text-indigo-700")
                : (isDark ? "border-white/15 text-slate-500" : "border-gray-300 text-gray-400")
            }`}
            style={{ minHeight: "140px", gridColumn: "1 / -1" }}
          >
            <span className="text-sm italic">
              {isOver ? "Drop tile here" : "Drop tiles here"}
            </span>
          </div>
        )}
      </div>
    </SortableContext>
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
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
        dragHandleProps={listeners}
      />
    </div>
  );
}
