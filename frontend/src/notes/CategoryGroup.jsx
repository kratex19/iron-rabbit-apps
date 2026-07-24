import React, { useState, useMemo } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NOTE_COLORS } from "./constants";
import AccordionNoteItem from "./AccordionNoteItem";

/**
 * "Container note" that groups every note sharing the same category.
 * Visually matches AccordionNoteItem but marks its dot with an asterisk.
 */
export default function CategoryGroup({ category, notes: children, onEdit, onDelete, onShare, onFullScreen, isDark }) {
  const [isOpen, setIsOpen] = useState(false);
  // Pick color from most common child color (ties → first)
  const colorConfig = useMemo(() => {
    const counts = {};
    children.forEach(n => { counts[n.color] = (counts[n.color] || 0) + 1; });
    const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "purple";
    return NOTE_COLORS.find(c => c.name === winner) || NOTE_COLORS[0];
  }, [children]);
  const alarmCount = children.filter(n => n.alarm?.enabled).length;

  return (
    <div className={`category-group ${colorConfig.class} ${isDark ? '' : 'light'} rounded-lg border overflow-hidden mb-2`} data-testid={`category-group-${category}`}>
      <button
        type="button"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        className={`w-full flex items-center gap-2 p-3 text-left cursor-pointer transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}
        data-testid={`category-toggle-${category}`}
      >
        <div className="relative flex items-center gap-0.5 flex-shrink-0" aria-hidden="true">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorConfig.accent }} />
          <span className="font-bold text-lg leading-none" style={{ color: colorConfig.accent }}>*</span>
        </div>
        <span className={`font-semibold truncate flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`} data-testid="category-title">{category}</span>
        <Badge variant="outline" className={`text-xs flex-shrink-0 ${isDark ? '' : 'text-gray-800 border-gray-300'}`} data-testid="category-count">{children.length}</Badge>
        {alarmCount > 0 && <Bell className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
        <ChevronDown className={`w-4 h-4 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
      </button>
      {isOpen && (
        <div className={`category-children pl-4 pr-1 pb-1 pt-1 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`} data-testid={`category-children-${category}`}>
          {children.map(note => (
            <AccordionNoteItem
              key={note.id}
              note={note}
              onEdit={onEdit}
              onDelete={onDelete}
              onShare={onShare}
              onFullScreen={onFullScreen}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
