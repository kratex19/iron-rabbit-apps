import React, { useMemo, useRef } from "react";
import { Hash, X } from "lucide-react";

/**
 * Horizontal chip strip of every tag currently in use.
 * Clicking a chip toggles filtering by that tag; clicking the active chip
 * clears the filter.
 */
export default function TagFilterStrip({ notes, activeTag, onSelectTag, isDark }) {
  const scrollRef = useRef(null);

  const tagCounts = useMemo(() => {
    const map = new Map();
    for (const n of notes) {
      if (n.archived_at || n.deleted_at) continue;
      const tags = Array.isArray(n.tags) ? n.tags : [];
      for (const raw of tags) {
        const t = String(raw || "").trim().toLowerCase();
        if (!t) continue;
        map.set(t, (map.get(t) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes]);

  if (tagCounts.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1"
      style={{ scrollbarWidth: "thin" }}
      data-testid="tag-filter-strip"
    >
      <div className={`shrink-0 flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        <Hash className="w-3 h-3" /> Tags
      </div>
      {tagCounts.map(([tag, count]) => {
        const isActive = activeTag === tag;
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onSelectTag(isActive ? null : tag)}
            className={`shrink-0 h-7 px-2.5 rounded-full text-xs font-medium flex items-center gap-1 border transition-all ${
              isActive
                ? "bg-indigo-500 border-indigo-500 text-white shadow-md scale-105"
                : isDark
                ? "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
            title={isActive ? "Clear filter" : `Filter by #${tag}`}
            data-testid={`tag-filter-chip-${tag}`}
          >
            <span>#{tag}</span>
            <span className={`text-[10px] px-1 rounded ${isActive ? "bg-white/20" : isDark ? "bg-white/10" : "bg-gray-100"}`}>
              {count}
            </span>
            {isActive && <X className="w-3 h-3 ml-0.5" />}
          </button>
        );
      })}
    </div>
  );
}
