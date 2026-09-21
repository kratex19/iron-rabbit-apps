import React, { useEffect, useMemo, useRef, useState } from "react";
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
  onDelete,
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

  // Repair #5 · Pack container DOM refs — populated by PackSection via
  // `registerContainer` so `handleDragEnd` can measure the SOURCE pack's
  // bounding rect at drop time. Used ONLY to reject a false-positive
  // cross-pack resolve when the pointer never actually left the source
  // pack (dnd-kit's `pointerWithin` collision detector greedily returns
  // a neighboring pack's droppable on touch when the finger path grazes
  // the adjacent rect). No change to cross-pack semantics for real
  // drops that leave the source pack.
  const packContainerRefs = useRef(new Map());
  const registerContainer = (packId, node) => {
    if (node) packContainerRefs.current.set(packId, node);
    else packContainerRefs.current.delete(packId);
  };
  // Repair #7 · Source-pack rect snapshot. Repair #5 previously measured
  // the source container rect at DROP time via getBoundingClientRect(),
  // but a mid-drag DOM reflow (touch wobble on mobile grouped layouts)
  // can shift the rect by hundreds of pixels — making Repair #5's
  // containment predicate misfire and (under Repair #6) silently
  // MOVE the note out of its source pack. Snapshotting the rect at
  // drag-start — while layout is guaranteed stable — eliminates the
  // stale-rect class of false negatives. Cleared on end/cancel/unmount.
  const srcRectRef = useRef(null);
  // Repair #5 (hardened) · Live pointer tracker. `active.rect.translated`
  // can be stale after a mid-drag wobble on touch — the last-recorded
  // pointer position is the authoritative "where did the user let go"
  // signal for boundary decisions. Populated during drag by global
  // pointermove/touchmove listeners attached in handleDragStart and
  // torn down in handleDragEnd/Cancel.
  const pointerRef = useRef(null);
  const trackPointerMove = (e) => {
    const t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : e);
    if (typeof t.clientX === "number" && typeof t.clientY === "number") {
      pointerRef.current = { x: t.clientX, y: t.clientY };
    }
  };
  const attachPointerTracker = () => {
    if (typeof window === "undefined") return;
    window.addEventListener("pointermove", trackPointerMove, { passive: true });
    window.addEventListener("touchmove", trackPointerMove, { passive: true });
  };
  const detachPointerTracker = () => {
    if (typeof window === "undefined") return;
    window.removeEventListener("pointermove", trackPointerMove);
    window.removeEventListener("touchmove", trackPointerMove);
  };
  // Cleanup on unmount — guarantees no leaked listeners if the
  // component unmounts mid-drag.
  useEffect(() => {
    return () => { detachPointerTracker(); srcRectRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    const sourcePackId = noteToPack.get(id) || null;
    setActiveSourcePack(sourcePackId);
    // Repair #7 · snapshot the source pack's bounding rect NOW, while
    // layout is stable. Consumed by the Repair #5 containment check in
    // handleDragEnd. Freezing the rect eliminates the stale-rect
    // false-negatives seen when the DOM reflows mid-drag on mobile.
    if (sourcePackId) {
      const node = packContainerRefs.current.get(sourcePackId);
      if (node) {
        const r = node.getBoundingClientRect();
        srcRectRef.current = { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
      } else {
        srcRectRef.current = null;
      }
    } else {
      srcRectRef.current = null;
    }
    // Snapshot the modifier key at drag-start; dnd-kit's event has it.
    // Repair #6 · touch cross-category drag must MOVE (not COPY). A real
    // TouchEvent cannot carry Cmd/Ctrl, so we treat any drag that
    // originated from genuine touch input as if the modifier were held.
    // Detection uses the pointer/touch state already available on the
    // activator event — TouchSensor produces a TouchEvent (has
    // `.touches`); PointerSensor from touch produces a PointerEvent
    // with `.pointerType === "touch"`. Desktop mouse behavior (Cmd/Ctrl
    // = MOVE, no modifier = COPY) is preserved exactly.
    const orig = event.activatorEvent;
    const isTouchDrag = !!(orig && (
      (orig.touches && orig.touches.length > 0) ||
      orig.pointerType === "touch"
    ));
    setModifier(!!(orig && (orig.metaKey || orig.ctrlKey)) || isTouchDrag);
    // Repair #5 (hardened) · seed the pointer tracker with the
    // activator event position and start listening for live moves.
    const seed = orig && (orig.touches && orig.touches[0] ? orig.touches[0] : orig);
    if (seed && typeof seed.clientX === "number" && typeof seed.clientY === "number") {
      pointerRef.current = { x: seed.clientX, y: seed.clientY };
    } else {
      pointerRef.current = null;
    }
    attachPointerTracker();
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    // Repair #5 (hardened) · always tear down the pointer tracker
    // the moment the drag ends, regardless of which branch we take.
    // The last known pointer position is preserved in pointerRef.
    detachPointerTracker();
    // Repair #7 · consume the drag-start snapshot of the source rect
    // and clear it in the same breath so ANY early return below leaves
    // the ref clean for the next drag.
    const capturedSrcRect = srcRectRef.current;
    srcRectRef.current = null;
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

    // Repair #5 (hardened) — boundary false-positive check. Use the
    // LIVE pointer position (last pointermove/touchmove) instead of
    // `active.rect.translated` because the latter can be stale after
    // a mid-drag wobble on touch. FAIL CLOSED: if we cannot determine
    // either the source pack rect OR the live pointer position, do
    // NOT dispatch onCrossPackMove — better to silently ignore a
    // drag than to silently clone a note. Only genuine drops whose
    // FINAL pointer position clearly exits the source pack's rect
    // reach the cross-pack dispatch below.
    // Repair #7 · Prefer the drag-start snapshot of the source rect
    // (captured in handleDragStart while layout was stable). Falling
    // back to a live getBoundingClientRect() only if the snapshot is
    // missing preserves the fail-closed contract without weakening it.
    let srcRect = capturedSrcRect;
    if (!srcRect) {
      const srcNode = packContainerRefs.current.get(sourcePackId);
      srcRect = srcNode ? srcNode.getBoundingClientRect() : null;
    }
    const p = pointerRef.current;
    if (!srcRect || !p) return;
    if (
      p.x >= srcRect.left && p.x <= srcRect.right &&
      p.y >= srcRect.top && p.y <= srcRect.bottom
    ) {
      // Pointer never left the source pack — user's clear intent was
      // an in-pack reorder that dnd-kit misclassified. Silent no-op.
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
        onDelete={onDelete}
        registerContainer={registerContainer}
      />
    ),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={cascadedCollision}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { detachPointerTracker(); srcRectRef.current = null; setActiveNote(null); setActiveSourcePack(null); }}
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

function PackSection({ pack, gridStyle, testId, isDark, selectMode, isSelected, onToggleSelect, onOpen, onEdit, onDelete, registerContainer }) {
  // useDroppable makes the whole grid container a valid drop target
  // even when it has zero tiles, so users can move a note INTO an
  // empty pack.
  const { setNodeRef, isOver } = useDroppable({ id: `pack-container::${pack.id}` });
  const ids = pack.notes.map((n) => n.id);

  // Repair #5 — combine dnd-kit's droppable ref with a source-pack DOM
  // registry so `handleDragEnd` can measure this pack's bounding rect
  // at drop time (see boundary false-positive check above).
  const setCombinedRef = (node) => {
    setNodeRef(node);
    if (registerContainer) registerContainer(pack.id, node);
  };

  return (
    <SortableContext items={ids} strategy={rectSortingStrategy}>
      <div
        ref={setCombinedRef}
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
            onDelete={onDelete}
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

function SortableTile({ note, isDark, selectMode, selected, onToggleSelect, onOpen, onEdit, onDelete }) {
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
        onDelete={onDelete}
        dragHandleProps={listeners}
      />
    </div>
  );
}
