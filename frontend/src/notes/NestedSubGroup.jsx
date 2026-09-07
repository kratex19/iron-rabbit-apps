import React, { useState, useMemo } from "react";
import { Bell, ChevronDown, CornerDownRight } from "lucide-react";
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

/**
 * Recursive smoked-glass sub-group renderer used INSIDE CategoryGroup.
 * Rendering starts at `depth = 1` (level 0 = the top-level category
 * already handled by CategoryGroup itself).
 */
export default function NestedSubGroup(props) {
  const {
    label, notes: bucketNotes, depth, isDark,
    onEdit, onDelete, onShare, onFullScreen, onTogglePin,
    selectMode, isSelected, onToggleSelect, onSwipeSelect,
  } = props;
  // Local alias for the recursive call. Referencing the component by a
  // different local identifier in JSX sidesteps a Babel + react-refresh
  // traversal bug that infinite-loops on JSX self-references.
  const Self = NestedSubGroup;
  const [isOpen, setIsOpen] = useState(false);

  // Notes belonging to THIS exact depth (no deeper path segment).
  const directNotes = useMemo(
    () => bucketNotes.filter((n) => getPath(n).length === depth + 1),
    [bucketNotes, depth]
  );
  // Notes with deeper paths, bucketed by the next segment.
  const deeperBuckets = useMemo(() => {
    const m = new Map();
    for (const n of bucketNotes) {
      const p = getPath(n);
      if (p.length <= depth + 1) continue;
      const key = p[depth + 1] || "(unnamed)";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(n);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bucketNotes, depth]);

  const alarmCount = bucketNotes.filter((n) => n.alarm?.enabled).length;

  const shellBg = isDark ? "bg-white/[0.035]" : "bg-white/60";
  const shellBorder = isDark ? "border-white/10" : "border-gray-200";

  return (
    <div
      className={`rounded-md border overflow-hidden ${shellBg} ${shellBorder} backdrop-blur-md mb-1.5`}
      style={{ boxShadow: isDark ? "inset 0 1px 0 rgba(255,255,255,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.4)" }}
      data-testid={`nested-subgroup-${depth}-${label}`}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
          isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]"
        }`}
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
            ? { color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }
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

      {isOpen && (
        <div className={`px-2 pb-1.5 pt-1 border-t ${shellBorder}`}>
          {deeperBuckets.map(([subLabel, subNotes]) => (
            <Self
              key={subLabel}
              label={subLabel}
              notes={subNotes}
              depth={depth + 1}
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
          {directNotes.map((note) => (
            <AccordionNoteItem
              key={note.id}
              note={note}
              onEdit={onEdit}
              onDelete={onDelete}
              onShare={onShare}
              onFullScreen={onFullScreen}
              onTogglePin={onTogglePin}
              isDark={isDark}
              selectMode={selectMode}
              selected={isSelected ? isSelected(note.id) : false}
              onToggleSelect={onToggleSelect}
              onSwipeSelect={onSwipeSelect}
            />
          ))}
          {directNotes.length === 0 && deeperBuckets.length === 0 && (
            <div className={`text-center text-[11px] italic py-1.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              No notes
            </div>
          )}
        </div>
      )}
    </div>
  );
}
