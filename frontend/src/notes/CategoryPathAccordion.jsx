import React, { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Plus, X, FolderTree } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import StorageService from "../storage/storageService";

/**
 * CategoryPathAccordion - Visual Restoration (November 2, 2026)
 * 
 * VISUAL: Original row-based UI with M/L1/L2/L3 indicators, textarea inputs
 * DATA: Nested category_tree architecture (M + unlimited SC depth)
 * 
 * CRITICAL REQUIREMENTS:
 * - All rows aligned at far left (NO progressive indenting)
 * - Hierarchy shown via M, L1, L2, L3... indicators only
 * - Wide floating container, no horizontal scroll
 * - One M per note (uses note title)
 * - Green plus creates SC under selected parent
 * - Preserve nested parent-child relationships
 */
export default function CategoryPathAccordion({
  path,
  onChange,
  categories = {},
  existingPaths = [],
  isDark,
  noteTitle = "",
}) {
  const [open, setOpen] = useState(false);
  const [categoryTree, setCategoryTree] = useState({});
  const scrollRef = useRef(null);
  const inputRefs = useRef([]);
  
  const segments = Array.isArray(path) ? path : [];
  const mainCategory = segments[0] || null;
  
  // DIAGNOSTIC: Log whenever segments change
  useEffect(() => {
    console.log(`📊 CategoryPathAccordion RE-RENDERED`);
    console.log(`   path prop:`, JSON.stringify(path));
    console.log(`   segments:`, JSON.stringify(segments));
    console.log(`   segments.length:`, segments.length);
  }, [path, segments]);

  // Load category tree from storage when popover opens
  useEffect(() => {
    if (!open) return;
    
    const loadTree = async () => {
      try {
        const tree = await StorageService.getCategoryTree();
        setCategoryTree(tree);
      } catch (err) {
        console.error("Failed to load category tree:", err);
      }
    };
    
    loadTree();
  }, [open]);

  // Keep input ref array trimmed
  useEffect(() => {
    inputRefs.current.length = segments.length;
  }, [segments.length]);

  // Auto-grow textarea heights
  useEffect(() => {
    inputRefs.current.forEach((el) => {
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    });
  }, [segments, open]);

  // Set a segment value
  const setSegment = (depth, value) => {
    const next = [...segments];
    next[depth] = value;
    // Trim empty trailing segments
    while (next.length > 0 && !String(next[next.length - 1] || "").trim()) {
      next.pop();
    }
    onChange(next);
  };

  // Remove segment (move up hierarchy)
  const removeSegment = (depth) => {
    const next = segments.slice(0, depth);
    onChange(next);
  };

  // Add Main Category (M)
  const addMainCategory = async () => {
    if (!noteTitle || !noteTitle.trim()) {
      alert("Note must have a title to create a Main Category");
      return;
    }
    
    try {
      await StorageService.addCategoryToTree(null, noteTitle.trim());
      const updatedTree = await StorageService.getCategoryTree();
      setCategoryTree(updatedTree);
      onChange([noteTitle.trim()]);
    } catch (err) {
      console.error("Failed to add main category:", err);
      alert("Failed to add category. Please try again.");
    }
  };

  // Add child level (SC) beneath current depth
  const addChildLevel = async (depth) => {
    console.log(`🟢 GREEN-PLUS CLICKED: depth=${depth}`);
    console.log(`   Current segments:`, JSON.stringify(segments));
    console.log(`   Current path prop:`, JSON.stringify(path));
    
    // Create new path: parent segments up to and including clicked row + empty child
    const newPath = segments.slice(0, depth + 1).concat([""]);
    console.log(`   Computed newPath:`, JSON.stringify(newPath));
    console.log(`   Calling onChange with newPath...`);
    
    onChange(newPath);
    
    console.log(`   onChange called. Waiting for re-render...`);
    
    // Focus new input (which is now at index depth + 1)
    requestAnimationFrame(() => {
      console.log(`   RAF: Attempting to focus input at index ${depth + 1}`);
      const el = inputRefs.current[depth + 1];
      if (el) {
        console.log(`   RAF: Input element found, focusing...`);
        try { el.focus(); } catch { /* noop */ }
        try { el.scrollIntoView({ block: "nearest" }); } catch { /* noop */ }
      } else {
        console.log(`   RAF: ⚠️ Input element NOT found at index ${depth + 1}`);
        console.log(`   RAF: inputRefs.current length =`, inputRefs.current.length);
      }
    });
  };

  // Save category to tree when user types
  const saveCategoryToTree = async (depth, name) => {
    if (!name || !name.trim()) return;
    
    try {
      const parentPath = depth > 0 ? segments.slice(0, depth) : null;
      await StorageService.addCategoryToTree(parentPath, name.trim());
      const updatedTree = await StorageService.getCategoryTree();
      setCategoryTree(updatedTree);
    } catch (err) {
      console.error("Failed to save category:", err);
    }
  };

  const preview = segments.filter(Boolean).join("  ›  ");
  const hasPath = segments.length > 0 && preview.length > 0;

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
        collisionPadding={12}
        avoidCollisions
        sticky="always"
        className={`p-0 overflow-hidden rounded-lg border-2 shadow-xl w-[min(28rem,calc(100vw-1.5rem))] ${
          isDark
            ? "bg-[#0B1221] border-blue-500/60 text-slate-200"
            : "bg-white border-blue-400 text-gray-800"
        }`}
        style={{
          maxWidth: "calc(100vw - 1.5rem)",
        }}
        onOpenAutoFocus={(e) => {
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
        {/* Panel Header */}
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

        {/* Scrollable Body - ALL ROWS ALIGNED LEFT */}
        <div
          ref={scrollRef}
          className="max-h-[60vh] overflow-y-auto overflow-x-hidden py-2.5 px-3 space-y-1.5"
          data-testid="category-path-scroll"
        >
          {segments.length === 0 && (
            <div
              className={`text-[11px] italic px-1 ${
                isDark ? "text-slate-500" : "text-gray-400"
              }`}
            >
              No category yet. Add one below to nest as deeply as you like.
            </div>
          )}

          {/* CATEGORY ROWS - NO PROGRESSIVE INDENTING */}
          {segments.map((seg, depth) => {
            return (
              <div
                key={depth}
                className={`flex items-start gap-1.5 rounded-md border px-2 py-1.5 min-w-0 w-full ${
                  isDark
                    ? "bg-white/[0.04] border-white/10"
                    : "bg-gray-50 border-gray-200"
                }`}
                data-testid={`category-path-row-${depth}`}
              >
                {/* Icon Gutter - Uniform w-4 width */}
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

                {/* Level Indicator - M, L1, L2, L3, etc. */}
                <span
                  className={`text-[10px] uppercase tracking-wider shrink-0 tabular-nums ${
                    isDark ? "text-blue-300/80" : "text-blue-600/80"
                  }`}
                >
                  {depth === 0 ? "M" : `L${depth}`}
                </span>

                {/* Textarea Input - Auto-grow, word-wrap */}
                <textarea
                  ref={(el) => { inputRefs.current[depth] = el; }}
                  rows={1}
                  maxLength={120}
                  value={seg}
                  onChange={(e) => setSegment(depth, e.target.value)}
                  onBlur={(e) => {
                    const val = e.target.value.trim();
                    if (val) saveCategoryToTree(depth, val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (String(seg || "").trim()) {
                        addChildLevel(depth);
                      }
                    }
                  }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  placeholder={depth === 0 ? "e.g., Work" : "Sub-level name…"}
                  className={`flex-1 min-w-0 w-0 bg-transparent outline-none text-sm px-1 py-0.5 resize-none overflow-hidden leading-snug whitespace-pre-wrap break-words ${
                    isDark
                      ? "text-white placeholder:text-slate-500"
                      : "text-gray-900 placeholder:text-gray-400"
                  }`}
                  data-testid={`category-path-input-${depth}`}
                />

                {/* Green Plus Button - Add child SC */}
                <button
                  type="button"
                  onClick={() => addChildLevel(depth)}
                  className={`p-1 rounded transition-colors shrink-0 ${
                    isDark
                      ? "text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      : "text-green-600 hover:text-green-700 hover:bg-green-50"
                  }`}
                  aria-label={`Add sub-level under ${seg || `level ${depth + 1}`}`}
                  data-testid={`category-path-add-child-${depth}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>

                {/* Gray X Button - Remove level */}
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

          {/* Add Category / Add Sub-level Button */}
          {mainCategory ? (
            <button
              type="button"
              onClick={() => {
                if (segments.length > 0 && !String(segments[segments.length - 1] || "").trim()) {
                  return; // Don't add if last segment is empty
                }
                onChange([...segments, ""]);
                requestAnimationFrame(() => {
                  const el = inputRefs.current[segments.length];
                  if (el) {
                    try { el.focus(); } catch { /* noop */ }
                    try { el.scrollIntoView({ block: "nearest" }); } catch { /* noop */ }
                  }
                });
              }}
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
              Add sub-level
            </button>
          ) : (
            <button
              type="button"
              onClick={addMainCategory}
              disabled={!noteTitle || !noteTitle.trim()}
              className={`w-full flex items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
                !noteTitle || !noteTitle.trim()
                  ? "opacity-50 cursor-not-allowed"
                  : isDark
                  ? "bg-blue-500/15 hover:bg-blue-500/25 text-blue-100 border border-blue-500/30"
                  : "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200"
              }`}
              data-testid="category-path-add"
            >
              <Plus className="w-3.5 h-3.5" />
              Add category
            </button>
          )}

          {(!noteTitle || !noteTitle.trim()) && !mainCategory && (
            <p className={`text-[10px] text-center mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Note must have a title first
            </p>
          )}
        </div>

        {/* Footer Instructions */}
        <div
          className={`px-3 py-1.5 text-[10px] border-t flex items-center gap-1.5 ${
            isDark
              ? "border-blue-500/20 text-slate-500 bg-blue-500/5"
              : "border-blue-100 text-gray-400 bg-blue-50/50"
          }`}
        >
          <span className="font-medium text-green-600">Green +</span> adds child category · Press Enter to add sub-level
        </div>
      </PopoverContent>
    </Popover>
  );
}
