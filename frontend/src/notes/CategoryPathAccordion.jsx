import React, { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Plus, X, FolderTree, CornerDownRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * CategoryPathAccordion
 * ---------------------
 * Contained, viewport-safe picker for INFINITE nested categories used
 * inside the Note Editor / "Make New Tile" workflow.
 *
 * VISUAL LANGUAGE — matches `HierarchyPathButton` (blue-bordered
 * floating pop-out, tree-connector rows, internal scroll). The panel
 * NEVER pushes the surrounding editor wide, NEVER overflows the
 * viewport, and scales down to phone widths automatically.
 *
 * DATA MODEL — unchanged. Consumer contract is:
 *   props.path        string[] — current category_path segments
 *   props.onChange    (next: string[]) => void
 *   props.categories  { [top]: string[] } — legacy 2-level map for
 *                      suggestions at L1/L2
 *   props.existingPaths string[][] — every distinct path already in
 *                      use, powering depth-context suggestions at any
 *                      depth (parent → child logic is unchanged).
 *
 * The Category → Subcategory → Sub-sub-… relationships and the
 * authoritative source of truth (`category_path`) are preserved
 * exactly as before. This file only changes CONTAINMENT and LAYOUT.
 */
export default function CategoryPathAccordion({
  path,
  onChange,
  categories = {},
  existingPaths = [],
  isDark,
}) {
  const [open, setOpen] = useState(false);
  const scrollRef = useRef(null);
  const inputRefs = useRef([]);

  const segments = Array.isArray(path) ? path : [];

  // Build depth-indexed suggestion lists from existingPaths (union with
  // the legacy `categories` map for level 0/1 completeness). Suggestions
  // at deeper levels are filtered to only those whose ANCESTOR prefix
  // matches the segments the user has typed so far — so the parent →
  // child hierarchy relationships are honoured, not flattened.
  const depthSuggestions = useMemo(() => {
    const byDepth = new Map();
    byDepth.set(0, new Set(Object.keys(categories)));
    if (segments[0] && Array.isArray(categories[segments[0]])) {
      byDepth.set(1, new Set(categories[segments[0]]));
    }
    existingPaths.forEach((p) => {
      if (!Array.isArray(p)) return;
      p.forEach((seg, depth) => {
        const prefixMatch = segments
          .slice(0, depth)
          .every((s, i) => (s || "") === (p[i] || ""));
        if (!prefixMatch) return;
        if (!byDepth.has(depth)) byDepth.set(depth, new Set());
        if (seg) byDepth.get(depth).add(seg);
      });
    });
    const out = {};
    byDepth.forEach((set, d) => {
      out[d] = Array.from(set).sort((a, b) => a.localeCompare(b));
    });
    return out;
  }, [categories, existingPaths, segments]);

  const setSegment = (depth, value) => {
    const next = [...segments];
    next[depth] = value;
    while (next.length > 0 && !String(next[next.length - 1] || "").trim()) next.pop();
    onChange(next);
  };

  const removeSegment = (depth) => {
    const next = segments.slice(0, depth);
    onChange(next);
  };

  const addSegment = () => {
    const last = segments[segments.length - 1];
    if (segments.length > 0 && !String(last || "").trim()) return;
    onChange([...segments, ""]);
    // Focus the freshly-added input once the popover has rendered it,
    // and scroll it into view so the "Add sub-level" button reveals the
    // input the user is expected to type into.
    requestAnimationFrame(() => {
      const el = inputRefs.current[segments.length];
      if (el) {
        try { el.focus(); } catch { /* noop */ }
        try { el.scrollIntoView({ block: "nearest" }); } catch { /* noop */ }
      }
    });
  };

  // Keep the input ref array trimmed to the current segment count so
  // stale refs never point to unmounted rows.
  useEffect(() => {
    inputRefs.current.length = segments.length;
  }, [segments.length]);

  const preview = segments.filter(Boolean).join("  ›  ");
  const hasPath = segments.length > 0 && preview.length > 0;

  // Trigger row — matches the previous compact accordion header so the
  // surrounding note editor layout is unchanged.
  const triggerClasses = `w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
    isDark
      ? "bg-white/[0.04] border-white/10 hover:bg-white/[0.06]"
      : "bg-white/70 border-gray-200 hover:bg-black/[0.02]"
  } rounded-lg border`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={triggerClasses}
          data-testid="category-path-toggle"
        >
          <FolderTree
            className={`w-4 h-4 shrink-0 ${isDark ? "text-blue-300" : "text-blue-500"}`}
          />
          <span
            className={`text-[11px] font-medium shrink-0 ${
              isDark ? "text-blue-200" : "text-blue-700"
            }`}
          >
            Category path
          </span>
          <div className="flex-1 min-w-0">
            <div
              className={`text-[10px] truncate ${
                hasPath
                  ? isDark ? "text-slate-300" : "text-gray-700"
                  : isDark ? "text-slate-500 italic" : "text-gray-400 italic"
              }`}
              data-testid="category-path-preview"
            >
              {hasPath ? preview : "Tap to add category…"}
            </div>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform shrink-0 ${
              open ? "rotate-180" : ""
            } ${isDark ? "text-slate-400" : "text-gray-500"}`}
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        // Blue-bordered floating panel — same visual language as
        // HierarchyPathButton. Radix's Floating-UI backing keeps the
        // panel fully in view: it will flip / shift / shrink whenever
        // it would otherwise overflow the viewport.
        collisionPadding={12}
        avoidCollisions
        sticky="always"
        className={`p-0 overflow-hidden rounded-lg border-2 shadow-xl w-[min(22rem,calc(100vw-1.5rem))] ${
          isDark
            ? "bg-[#0B1221] border-blue-500/60 text-slate-200"
            : "bg-white border-blue-400 text-gray-800"
        }`}
        onOpenAutoFocus={(e) => {
          // Don't yank focus onto a random button on open — let the
          // deepest input claim it if there is one, otherwise let the
          // "Add sub-level" button receive focus naturally.
          e.preventDefault();
          requestAnimationFrame(() => {
            const last = inputRefs.current[segments.length - 1];
            if (last) {
              try { last.focus(); } catch { /* noop */ }
            }
          });
        }}
        data-testid="category-path-panel"
      >
        {/* Panel header — mirrors HierarchyPathButton's popover header */}
        <div
          className={`px-3 py-2 text-[11px] uppercase tracking-wider flex items-center gap-1.5 ${
            isDark
              ? "text-blue-300 bg-blue-500/10 border-b border-blue-500/30"
              : "text-blue-700 bg-blue-50 border-b border-blue-200"
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          Category path
        </div>

        {/* Scrollable body — capped at 60vh so long chains never grow
            the panel off-screen. All level rows share the same left
            gutter regardless of depth (tree connectors show ancestry
            visually) so the input width never shrinks with depth and
            the panel never overflows horizontally. */}
        <div
          ref={scrollRef}
          className={`max-h-[60vh] overflow-y-auto overflow-x-hidden py-2.5 px-3 space-y-1.5`}
          data-testid="category-path-scroll"
        >
          {segments.length === 0 && (
            <div
              className={`text-[11px] italic px-1 ${
                isDark ? "text-slate-500" : "text-gray-400"
              }`}
            >
              No category yet. Add one below to nest as deeply as you like — the panel scrolls if the tree grows large.
            </div>
          )}

          {segments.map((seg, depth) => {
            const listId = `cat-path-suggestions-${depth}`;
            const suggestions = depthSuggestions[depth] || [];
            return (
              <div
                key={depth}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 ${
                  isDark
                    ? "bg-white/[0.04] border-white/10"
                    : "bg-gray-50 border-gray-200"
                }`}
                data-testid={`category-path-row-${depth}`}
              >
                {/* Tree-connector prefix — unified w-4 gutter so the
                    input column width is IDENTICAL at every depth.
                    L0 shows a folder glyph; L1+ shows `└──` which
                    matches the HierarchyPathButton popover style. */}
                <span className="w-4 shrink-0 inline-flex items-center justify-center" aria-hidden="true">
                  {depth === 0 ? (
                    <FolderTree
                      className={`w-3.5 h-3.5 ${
                        isDark ? "text-blue-300" : "text-blue-500"
                      }`}
                    />
                  ) : (
                    <span
                      className={`font-mono text-[11px] leading-none select-none ${
                        isDark ? "text-slate-500" : "text-gray-400"
                      }`}
                    >
                      └
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] uppercase tracking-wider shrink-0 tabular-nums ${
                    isDark ? "text-blue-300/80" : "text-blue-600/80"
                  }`}
                >
                  L{depth + 1}
                </span>
                <input
                  ref={(el) => { inputRefs.current[depth] = el; }}
                  type="text"
                  value={seg}
                  list={listId}
                  onChange={(e) => setSegment(depth, e.target.value)}
                  onKeyDown={(e) => {
                    // Enter on a filled row appends a deeper level so
                    // the user can build a chain without reaching for
                    // the mouse.
                    if (e.key === "Enter" && String(seg || "").trim()) {
                      e.preventDefault();
                      addSegment();
                    }
                  }}
                  placeholder={depth === 0 ? "e.g., Work" : "Sub-level name…"}
                  className={`flex-1 min-w-0 w-0 bg-transparent outline-none text-sm px-1 ${
                    isDark
                      ? "text-white placeholder:text-slate-500"
                      : "text-gray-900 placeholder:text-gray-400"
                  }`}
                  data-testid={`category-path-input-${depth}`}
                />
                {suggestions.length > 0 && (
                  <datalist id={listId}>
                    {suggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
                <button
                  type="button"
                  onClick={() => removeSegment(depth)}
                  className={`p-1 rounded transition-colors shrink-0 ${
                    isDark
                      ? "text-slate-400 hover:text-white hover:bg-white/10"
                      : "text-gray-400 hover:text-gray-800 hover:bg-black/5"
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
            disabled={
              segments.length > 0 &&
              !String(segments[segments.length - 1] || "").trim()
            }
            className={`w-full flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              isDark
                ? "bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 border border-blue-500/30"
                : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
            }`}
            data-testid="category-path-add"
          >
            <Plus className="w-3.5 h-3.5" />
            {segments.length === 0 ? "Add category" : "Add sub-level"}
          </button>
        </div>

        {/* Panel footer — hint line, mirrors HierarchyPathButton's tip
            row for visual consistency. */}
        <div
          className={`px-3 py-1.5 text-[10px] border-t flex items-center gap-1.5 ${
            isDark
              ? "border-blue-500/20 text-slate-500 bg-blue-500/5"
              : "border-blue-100 text-gray-400 bg-blue-50/50"
          }`}
        >
          <CornerDownRight className="w-3 h-3 shrink-0" />
          Press Enter on a level to append a deeper sub-level.
        </div>
      </PopoverContent>
    </Popover>
  );
}
