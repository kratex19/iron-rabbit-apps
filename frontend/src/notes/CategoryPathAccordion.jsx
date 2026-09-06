import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Plus, X, FolderTree, CornerDownRight } from "lucide-react";

/**
 * CategoryPathAccordion
 * ---------------------
 * Smoked-glass accordion picker for INFINITE nested categories.
 * Editing a note lets the user drill down an arbitrary path of
 * category segments (e.g. Work → Projects → Q1 → Roadmap …).
 *
 * Legacy notes carrying only { category, subcategory } are transparently
 * lifted into a 2-item path via `initialPath`, and on change we emit
 * the full array back so the caller can persist both the modern
 * `category_path` field and the legacy top-two segments for backwards
 * compatibility with grouping / filtering / PDF export.
 *
 * Suggestions:
 *  - Level 0: keys of `categories` (top-level categories that already exist)
 *  - Level 1: `categories[path[0]]` (existing subcategories for that top)
 *  - Deeper: any distinct segment at that depth found in `existingPaths`
 */
export default function CategoryPathAccordion({
  path,
  onChange,
  categories = {},
  existingPaths = [],
  isDark,
}) {
  const [open, setOpen] = useState(true);

  const segments = Array.isArray(path) ? path : [];

  // Build depth-indexed suggestion lists from existingPaths (union with
  // legacy `categories` map for level 0/1 completeness).
  const depthSuggestions = useMemo(() => {
    const byDepth = new Map();
    // Level 0 from categories map
    byDepth.set(0, new Set(Object.keys(categories)));
    // Level 1 from categories map (context-sensitive to path[0])
    if (segments[0] && Array.isArray(categories[segments[0]])) {
      byDepth.set(1, new Set(categories[segments[0]]));
    }
    // Any depth from existingPaths that MATCH the current prefix
    existingPaths.forEach((p) => {
      if (!Array.isArray(p)) return;
      p.forEach((seg, depth) => {
        // only accept if prefix up to `depth` matches current path
        const prefixMatch = segments.slice(0, depth).every((s, i) => (s || "") === (p[i] || ""));
        if (!prefixMatch) return;
        if (!byDepth.has(depth)) byDepth.set(depth, new Set());
        if (seg) byDepth.get(depth).add(seg);
      });
    });
    const out = {};
    byDepth.forEach((set, d) => { out[d] = Array.from(set).sort((a, b) => a.localeCompare(b)); });
    return out;
  }, [categories, existingPaths, segments]);

  const setSegment = (depth, value) => {
    const next = [...segments];
    next[depth] = value;
    // Trim trailing empties so we don't persist noise
    while (next.length > 0 && !String(next[next.length - 1] || "").trim()) next.pop();
    onChange(next);
  };

  const removeSegment = (depth) => {
    // Removing collapses everything beneath as well
    const next = segments.slice(0, depth);
    onChange(next);
  };

  const addSegment = () => {
    // Ensure the last segment has text before appending a new empty one
    const last = segments[segments.length - 1];
    if (segments.length > 0 && !String(last || "").trim()) return;
    onChange([...segments, ""]);
  };

  const shellClass = isDark
    ? "bg-white/[0.04] border-white/10 backdrop-blur-md"
    : "bg-white/60 border-gray-200 backdrop-blur-md";

  const chipClass = isDark
    ? "bg-white/[0.06] border-white/10 text-white"
    : "bg-white/70 border-gray-200 text-gray-800";

  return (
    <div
      className={`rounded-lg border overflow-hidden transition-colors ${shellClass}`}
      style={{
        // subtle inner smoked-glass tint
        boxShadow: isDark
          ? "inset 0 1px 0 rgba(255,255,255,0.04)"
          : "inset 0 1px 0 rgba(255,255,255,0.55)",
      }}
      data-testid="category-path-accordion"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
          isDark ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]"
        }`}
        data-testid="category-path-toggle"
      >
        <FolderTree className={`w-4 h-4 ${isDark ? "text-indigo-300" : "text-indigo-500"}`} />
        <span className={`text-xs font-medium ${isDark ? "text-slate-200" : "text-gray-700"}`}>
          Category path
        </span>
        <div className="flex-1 min-w-0">
          {segments.length > 0 && (
            <div
              className={`text-[10px] truncate ${isDark ? "text-slate-400" : "text-gray-500"}`}
              data-testid="category-path-preview"
            >
              {segments.filter(Boolean).join("  ›  ") || "Uncategorized"}
            </div>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""} ${
            isDark ? "text-slate-400" : "text-gray-500"
          }`}
        />
      </button>

      {open && (
        <div className={`px-3 pb-3 pt-1 space-y-1.5 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
          {segments.length === 0 && (
            <div className={`text-[11px] italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              No category yet. Add one below to nest as deeply as you like.
            </div>
          )}

          {segments.map((seg, depth) => {
            const listId = `cat-path-suggestions-${depth}`;
            const suggestions = depthSuggestions[depth] || [];
            return (
              <div
                key={depth}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${chipClass}`}
                style={{ marginLeft: `${depth * 12}px` }}
                data-testid={`category-path-row-${depth}`}
              >
                {depth === 0 ? (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                ) : (
                  <CornerDownRight className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-slate-400" : "text-gray-400"}`} />
                )}
                <span className={`text-[10px] uppercase tracking-wider shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  L{depth + 1}
                </span>
                <input
                  type="text"
                  value={seg}
                  list={listId}
                  onChange={(e) => setSegment(depth, e.target.value)}
                  placeholder={depth === 0 ? "e.g., Work" : "Sub-level name…"}
                  className={`flex-1 min-w-0 bg-transparent outline-none text-sm ${
                    isDark ? "text-white placeholder:text-slate-500" : "text-gray-900 placeholder:text-gray-400"
                  }`}
                  data-testid={`category-path-input-${depth}`}
                />
                {suggestions.length > 0 && (
                  <datalist id={listId}>
                    {suggestions.map((s) => <option key={s} value={s} />)}
                  </datalist>
                )}
                <button
                  type="button"
                  onClick={() => removeSegment(depth)}
                  className={`p-1 rounded transition-colors shrink-0 ${
                    isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-800 hover:bg-black/5"
                  }`}
                  aria-label={`Remove level ${depth + 1}`}
                  data-testid={`category-path-remove-${depth}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addSegment}
            disabled={segments.length > 0 && !String(segments[segments.length - 1] || "").trim()}
            className={`w-full flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 border border-indigo-500/20"
                : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
            }`}
            style={{ marginLeft: `${segments.length * 12}px` }}
            data-testid="category-path-add"
          >
            <Plus className="w-3.5 h-3.5" />
            {segments.length === 0 ? "Add category" : "Add sub-level"}
          </button>
        </div>
      )}
    </div>
  );
}
