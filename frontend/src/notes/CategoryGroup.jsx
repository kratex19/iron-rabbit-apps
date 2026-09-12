import React, { useState, useMemo } from "react";
import { Bell, ChevronDown, GripVertical, Sparkles, Pin } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { NOTE_COLORS, getNoteColorStyle } from "./constants";
import AccordionNoteItem from "./AccordionNoteItem";
import NestedSubGroup, { encodeNestedDroppableId } from "./NestedSubGroup";
import AccordionBody from "../components/AccordionBody";

function getPath(n) {
  const modern = Array.isArray(n?.category_path) ? n.category_path : null;
  if (modern && modern.length > 0) return modern.map((s) => String(s || "").trim()).filter(Boolean);
  return [n?.category, n?.subcategory].map((s) => String(s || "").trim()).filter(Boolean);
}

/**
 * "Container note" that groups every note sharing the same TOP-LEVEL
 * category. When any child carries a deeper `category_path`, the body
 * switches from a flat drag-drop list to a nested smoked-glass tree
 * (recursive `NestedSubGroup`).
 *
 * Drag-and-drop of individual notes remains ENABLED at the top level
 * only (i.e. inside `CategoryGroup`s that don't contain nested paths).
 */
export default function CategoryGroup({
  category, notes: children, onEdit, onDelete, onShare, onFullScreen, onTogglePin,
  isDark, dragHandleProps, isDragging,
  selectMode = false, isSelected, onToggleSelect, onSwipeSelect,
  isPinnedTop = false, onTogglePinTop = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const colorConfig = useMemo(() => {
    const counts = {};
    children.forEach(n => { counts[n.color] = (counts[n.color] || 0) + 1; });
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "purple";
    return NOTE_COLORS.find(c => c.name === winner) || NOTE_COLORS[0];
  }, [children]);
  const headerAccent = useMemo(() => {
    const withPack = children.find(n => n?.pack_accent);
    return withPack?.pack_accent || colorConfig.gradient || colorConfig.accent;
  }, [children, colorConfig]);
  const alarmCount = children.filter(n => n.alarm?.enabled).length;

  const hasNestedPaths = useMemo(() => children.some((n) => getPath(n).length > 1), [children]);
  const nestedBuckets = useMemo(() => {
    if (!hasNestedPaths) return [];
    const m = new Map();
    for (const n of children) {
      const p = getPath(n);
      if (p.length <= 1) continue;
      const key = p[1] || "(unnamed)";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(n);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [children, hasNestedPaths]);
  const directTopLevelNotes = useMemo(
    () => (hasNestedPaths ? children.filter((n) => getPath(n).length <= 1) : children),
    [children, hasNestedPaths]
  );

  return (
    <div
      className={`category-group ${colorConfig.class} ${isDark ? '' : 'light'} rounded-lg border overflow-hidden mb-2 transition-shadow ${isDragging ? "shadow-2xl ring-2 ring-indigo-400/50 scale-[1.02]" : ""}`}
      style={getNoteColorStyle(colorConfig, isDark) || undefined}
      data-testid={`category-group-${category}`}
    >
      <div className="w-full flex items-center gap-2 p-3 text-left">
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            aria-label="Drag to reorder category"
            className={`shrink-0 -ml-1 mr-1 touch-none cursor-grab active:cursor-grabbing ${isDark ? "text-slate-500 hover:text-white" : "text-gray-400 hover:text-gray-700"}`}
            data-testid={`category-drag-${category}`}
          >
            <GripVertical className="w-4 h-4" />
          </span>
        )}
        <button
          type="button"
          onClick={() => setIsOpen(v => !v)}
          aria-expanded={isOpen}
          className={`flex-1 flex items-center gap-2 text-left cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'} rounded`}
          data-testid={`category-toggle-${category}`}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md"
            style={{ background: headerAccent }}
            aria-hidden="true"
          >
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span
            className={`text-sm truncate flex-1 transition-colors ${
              isOpen
                ? 'font-bold'
                : isDark ? 'text-white font-semibold' : 'text-gray-900 font-semibold'
            }`}
            style={isOpen
              ? { color: '#ffffff', WebkitTextFillColor: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }
              : undefined}
            data-testid="category-title"
          >{category}</span>
          <Badge variant="outline" className={`text-xs flex-shrink-0 ${isDark ? '' : 'text-gray-800 border-gray-300'}`} data-testid="category-count">{children.length}</Badge>
          {alarmCount > 0 && <Bell className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
          <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
        </button>
        {onTogglePinTop && (
          <PinToggle
            title={category}
            isDark={isDark}
            isPinnedTop={isPinnedTop}
            onTogglePinTop={onTogglePinTop}
          />
        )}
      </div>

      {hasNestedPaths ? (
        <Droppable droppableId={encodeNestedDroppableId([category])} type="note">
          {(dropProv, dropSnap) => (
            <AccordionBody open={isOpen}>
            <div
              ref={dropProv.innerRef}
              {...dropProv.droppableProps}
              className={`category-children pl-3 pr-1 pb-1.5 pt-1.5 border-t transition-colors ${
                isDark ? "border-white/10" : "border-gray-200"
              } ${dropSnap.isDraggingOver ? (isDark ? "bg-indigo-500/10" : "bg-indigo-50") : ""}`}
              data-testid={`category-children-${category}`}
            >
              {nestedBuckets.map(([subLabel, subNotes]) => (
                <NestedSubGroup
                  key={subLabel}
                  label={subLabel}
                  notes={subNotes}
                  depth={1}
                  ancestorPath={[category]}
                  isDark={isDark}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onShare={onShare}
                  onFullScreen={onFullScreen}
                  onTogglePin={onTogglePin}
                  selectMode={selectMode}
                  isSelected={isSelected}
                  onToggleSelect={onToggleSelect}
                  onSwipeSelect={onSwipeSelect}
                />
              ))}
              {directTopLevelNotes.map((note, idx) => (
                <Draggable
                  key={note.id}
                  draggableId={`note-${note.id}`}
                  index={idx}
                  isDragDisabled={selectMode}
                >
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.draggableProps}>
                      <AccordionNoteItem
                        note={note}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onShare={onShare}
                        onFullScreen={onFullScreen}
                        onTogglePin={onTogglePin}
                        isDark={isDark}
                        dragHandleProps={prov.dragHandleProps}
                        isDragging={snap.isDragging}
                        selectMode={selectMode}
                        selected={isSelected ? isSelected(note.id) : false}
                        onToggleSelect={onToggleSelect}
                        onSwipeSelect={onSwipeSelect}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {dropProv.placeholder}
            </div>
            </AccordionBody>
          )}
        </Droppable>
      ) : (
        <Droppable droppableId={`notes-in-${category}`} type="note">
          {(dropProv, dropSnap) => (
            <AccordionBody open={isOpen}>
            <div
              ref={dropProv.innerRef}
              {...dropProv.droppableProps}
              className={`category-children pl-4 pr-1 pb-1 pt-1 border-t transition-colors ${
                isDark ? "border-white/10" : "border-gray-200"
              } ${dropSnap.isDraggingOver ? (isDark ? "bg-indigo-500/10" : "bg-indigo-50") : ""}`}
              data-testid={`category-children-${category}`}
            >
              {children.map((note, index) => (
                <Draggable key={note.id} draggableId={`note-${note.id}`} index={index} isDragDisabled={selectMode}>
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.draggableProps}>
                      <AccordionNoteItem
                        note={note}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onShare={onShare}
                        onFullScreen={onFullScreen}
                        onTogglePin={onTogglePin}
                        isDark={isDark}
                        dragHandleProps={prov.dragHandleProps}
                        isDragging={snap.isDragging}
                        selectMode={selectMode}
                        selected={isSelected ? isSelected(note.id) : false}
                        onToggleSelect={onToggleSelect}
                        onSwipeSelect={onSwipeSelect}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {dropProv.placeholder}
              {children.length === 0 && (
                <div className={`text-center text-xs italic py-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  {dropSnap.isDraggingOver ? "Drop note here" : "No notes"}
                </div>
              )}
            </div>
            </AccordionBody>
          )}
        </Droppable>
      )}
    </div>
  );
}

// Small helper — single-behavior pin button. Tap = pin to top.
function PinToggle({ title, isDark, isPinnedTop, onTogglePinTop }) {
  const click = (e) => {
    e.stopPropagation();
    onTogglePinTop?.();
  };
  return (
    <button
      type="button"
      onClick={click}
      aria-label={isPinnedTop ? `Unpin ${title} from top` : `Pin ${title} to top`}
      className={`shrink-0 w-9 h-9 inline-flex items-center justify-center rounded-md transition-colors ${
        isPinnedTop
          ? "text-amber-400 hover:bg-amber-500/10"
          : (isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-black/5")
      }`}
      title={isPinnedTop ? "Pinned to top — tap to unpin" : "Tap to pin to top"}
      data-testid={`category-pin-${title}`}
    >
      <Pin className="w-4 h-4" strokeWidth={2.4} fill={isPinnedTop ? "currentColor" : "none"} />
    </button>
  );
}
