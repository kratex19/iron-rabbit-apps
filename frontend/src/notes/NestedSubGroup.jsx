import React, { useState, useMemo } from "react";
import { Bell, ChevronDown, CornerDownRight, GripVertical, Pin, Trash2 } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import AccordionNoteItem from "./AccordionNoteItem";

/**
 * Extract the nested category path off a note. Prefers the modern
 * `category_path` array; falls back to legacy `category`/`subcategory`.
 */
function getPath(n) {
  const modern = Array.isArray(n?.category_path) ? n.category_path : null;
  if (modern && modern.length > 0) return modern.map((s) => String(s || "").trim()).filter(Boolean);
  return [n?.category, n?.subcategory].map((s) => String(s || "").trim()).filter(Boolean);
}

// Droppable-id scheme for nested paths. `notes-at-path::A|B|C` means
// "drop lands as a note whose category_path === [A, B, C]".
export const NESTED_DROPPABLE_PREFIX = "notes-at-path::";
export const NESTED_DROPPABLE_SEP = "|";
export function encodeNestedDroppableId(pathArr) {
  return NESTED_DROPPABLE_PREFIX + pathArr
    .map((s) => String(s || "").replace(NESTED_DROPPABLE_SEP, "/"))
    .join(NESTED_DROPPABLE_SEP);
}

// Path serialization used to key pinned subcategory paths.
export const SUBCAT_KEY_SEP = "\u241E";
export function subcatPathKey(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((s) => String(s || "").trim())
    .join(SUBCAT_KEY_SEP);
}

/**
 * Recursive smoked-glass sub-group renderer used INSIDE CategoryGroup.
 * Rendering starts at `depth = 1` (level 0 = the top-level category
 * already handled by CategoryGroup itself).
 *
 * Drag-and-drop is enabled: this sub-group is itself a Droppable
 * (dropping a note here reassigns its `category_path` to this level's
 * full path), and every note attached AT this depth is a Draggable.
 */
export default function NestedSubGroup(props) {
  const {
    label, notes: bucketNotes, depth, isDark,
    ancestorPath = [],
    onEdit, onDelete, onShare, onFullScreen, onTogglePin,
    selectMode, isSelected, onToggleSelect, onSwipeSelect,
    pinnedSubKeys = null, onTogglePinSub = null,
    onDeleteSubcategory = null,
  } = props;
  const Self = NestedSubGroup;

  const [isOpen, setIsOpen] = useState(false);

  const fullPath = useMemo(() => [...ancestorPath, label], [ancestorPath, label]);
  const fullPathKey = useMemo(() => subcatPathKey(fullPath), [fullPath]);
  const isPinnedSub = !!(pinnedSubKeys && pinnedSubKeys.has(fullPathKey));
  const droppableId = useMemo(() => encodeNestedDroppableId(fullPath), [fullPath]);

  const directNotes = useMemo(
    () => bucketNotes.filter((n) => getPath(n).length === depth + 1),
    [bucketNotes, depth]
  );
  const deeperBuckets = useMemo(() => {
    const m = new Map();
    for (const n of bucketNotes) {
      const p = getPath(n);
      if (p.length <= depth + 1) continue;
      const key = p[depth + 1] || "(unnamed)";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(n);
    }
    // Filter out sub-buckets that are pinned — they render in the
    // Green pinned-subcategories rail at the top of the page.
    const arr = Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
    if (!pinnedSubKeys) return arr;
    return arr.filter(([subLabel]) => !pinnedSubKeys.has(subcatPathKey([...fullPath, subLabel])));
  }, [bucketNotes, depth, fullPath, pinnedSubKeys]);

  const alarmCount = bucketNotes.filter((n) => n.alarm?.enabled).length;

  // Transparent shell — inherits the parent CategoryGroup's colored gradient
  // so nested subs read as belonging to the parent surface. Only a subtle
  // border keeps them slightly distinct (per user spec: no smoked-glass).
  const shellBorder = isDark ? "border-white/10" : "border-gray-200";

  return (
    <div
      className={`relative rounded-md border overflow-hidden bg-transparent ${shellBorder} mb-1.5`}
      data-testid={`nested-subgroup-${depth}-${label}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
          onTogglePinSub && onDeleteSubcategory ? "pr-16" : onTogglePinSub || onDeleteSubcategory ? "pr-9" : ""
        } ${isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]"}`}
        data-testid={`nested-subgroup-toggle-${label}`}
      >
        <CornerDownRight className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-slate-400" : "text-gray-400"}`} />
        <span className={`text-[10px] uppercase tracking-wider shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
          L{depth + 1}
        </span>
        <span
          className={`text-sm truncate flex-1 transition-colors ${
            isOpen
              ? 'font-bold'
              : isDark ? 'text-white font-medium' : 'text-gray-800 font-medium'
          }`}
          style={isOpen
            ? { color: '#ffffff', WebkitTextFillColor: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }
            : undefined}
        >
          {label}
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] flex-shrink-0 ${isDark ? "" : "text-gray-800 border-gray-300"}`}
        >
          {bucketNotes.length}
        </Badge>
        {alarmCount > 0 && <Bell className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""} ${
            isDark ? "text-slate-400" : "text-gray-500"
          }`}
        />
      </button>
      {onTogglePinSub && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePinSub(fullPath); }}
          aria-label={isPinnedSub ? `Unpin subcategory ${label}` : `Pin subcategory ${label}`}
          title={isPinnedSub ? "Pinned subcategory — tap to unpin" : "Tap to pin subcategory to top"}
          className={`absolute right-1 top-1 w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors ${
            isPinnedSub
              ? "text-emerald-400 hover:bg-emerald-500/10"
              : (isDark ? "text-slate-500 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-black/5")
          }`}
          data-testid={`subcategory-pin-${label}`}
        >
          <Pin className="w-3.5 h-3.5" strokeWidth={2.4} fill={isPinnedSub ? "currentColor" : "none"} />
        </button>
      )}
      {onDeleteSubcategory && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDeleteSubcategory(fullPath); }}
          aria-label={`Delete subcategory ${label}`}
          title={`Delete subcategory "${label}"`}
          className={`absolute right-9 top-1 w-7 h-7 inline-flex items-center justify-center rounded-md transition-colors ${
            isDark ? "text-slate-500 hover:text-red-300 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-500/10"
          }`}
          data-testid={`subcategory-delete-${label}`}
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
      )}

      {isOpen && (
        <Droppable droppableId={droppableId} type="note">
          {(dropProv, dropSnap) => (
            <div
              ref={dropProv.innerRef}
              {...dropProv.droppableProps}
              className={`px-2 pb-1.5 pt-1 border-t transition-colors ${shellBorder} ${
                dropSnap.isDraggingOver ? (isDark ? "bg-indigo-500/10" : "bg-indigo-50") : ""
              }`}
              data-testid={`nested-subgroup-body-${label}`}
            >
              {deeperBuckets.map(([subLabel, subNotes]) => (
                <Self
                  key={subLabel}
                  label={subLabel}
                  notes={subNotes}
                  depth={depth + 1}
                  ancestorPath={fullPath}
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
                  pinnedSubKeys={pinnedSubKeys}
                  onTogglePinSub={onTogglePinSub}
                  onDeleteSubcategory={onDeleteSubcategory}
                />
              ))}
              {directNotes.map((note, idx) => (
                <Draggable
                  key={note.id}
                  draggableId={`note-${note.id}`}
                  index={idx}
                  isDragDisabled={selectMode}
                >
                  {(prov, snap) => (
                    <div ref={prov.innerRef} {...prov.draggableProps}>
                      <div className="flex items-start gap-1">
                        <span
                          {...prov.dragHandleProps}
                          className={`mt-2 shrink-0 touch-none cursor-grab active:cursor-grabbing ${
                            isDark ? "text-slate-500 hover:text-white" : "text-gray-400 hover:text-gray-700"
                          }`}
                          aria-label="Drag note"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <AccordionNoteItem
                            note={note}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onShare={onShare}
                            onFullScreen={onFullScreen}
                            onTogglePin={onTogglePin}
                            isDark={isDark}
                            isDragging={snap.isDragging}
                            selectMode={selectMode}
                            selected={isSelected ? isSelected(note.id) : false}
                            onToggleSelect={onToggleSelect}
                            onSwipeSelect={onSwipeSelect}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {dropProv.placeholder}
              {directNotes.length === 0 && deeperBuckets.length === 0 && (
                <div className={`text-center text-[11px] italic py-1.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  {dropSnap.isDraggingOver ? "Drop note here" : "No notes"}
                </div>
              )}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
}
