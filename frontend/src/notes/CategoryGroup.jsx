import React, { useState, useMemo } from "react";
import { Bell, ChevronDown, GripVertical, Sparkles } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { NOTE_COLORS, getNoteColorStyle } from "./constants";
import AccordionNoteItem from "./AccordionNoteItem";

/**
 * "Container note" that groups every note sharing the same category.
 * When wrapped in a DragDropContext:
 *   - The container itself is a Draggable (categories can be reordered).
 *   - Its inner body is a Droppable (notes can be dropped INTO the category).
 */
export default function CategoryGroup({
  category, notes: children, onEdit, onDelete, onShare, onFullScreen, onTogglePin,
  isDark, dragHandleProps, isDragging,
  selectMode = false, isSelected, onToggleSelect, onSwipeSelect,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const colorConfig = useMemo(() => {
    const counts = {};
    children.forEach(n => { counts[n.color] = (counts[n.color] || 0) + 1; });
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "purple";
    return NOTE_COLORS.find(c => c.name === winner) || NOTE_COLORS[0];
  }, [children]);
  const alarmCount = children.filter(n => n.alarm?.enabled).length;

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
            style={{ background: colorConfig.gradient || colorConfig.accent }}
            aria-hidden="true"
          >
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <span className={`font-semibold text-sm truncate flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="category-title">{category}</span>
          <Badge variant="outline" className={`text-xs flex-shrink-0 ${isDark ? '' : 'text-gray-800 border-gray-300'}`} data-testid="category-count">{children.length}</Badge>
          {alarmCount > 0 && <Bell className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
          <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
        </button>
      </div>

      {/* Inner drop-zone: notes can be dragged INTO this category */}
      <Droppable droppableId={`notes-in-${category}`} type="note">
        {(dropProv, dropSnap) => (
          <div
            ref={dropProv.innerRef}
            {...dropProv.droppableProps}
            className={`category-children pl-4 pr-1 pb-1 pt-1 border-t transition-colors ${
              isDark ? "border-white/10" : "border-gray-200"
            } ${dropSnap.isDraggingOver ? (isDark ? "bg-indigo-500/10" : "bg-indigo-50") : ""} ${isOpen ? "" : "hidden"}`}
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
            {/* Empty-state drop hint when a note is being hovered over an empty category */}
            {children.length === 0 && (
              <div className={`text-center text-xs italic py-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                {dropSnap.isDraggingOver ? "Drop note here" : "No notes"}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
