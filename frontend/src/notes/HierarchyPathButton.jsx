import React from "react";
import { ListTree, Home, Folder, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/**
 * Compact "show hierarchy" button used in List View category and
 * subcategory rows.
 *
 * Visual:
 *   • Blue rounded-square button with a white branching-tree glyph
 *     (lucide `ListTree`). Two sizes — "sm" for subcategory rows and
 *     "md" for main category rows.
 *
 * Interaction:
 *   • Tap on mobile / click on desktop opens a popover that renders
 *     the full path from Home → … → this item using indented
 *     connectors. Hovering (desktop) also opens the popover — moving
 *     away closes it unless the user clicked. The popover itself is
 *     scrollable (max-height) so extremely deep hierarchies do not
 *     stretch the row and never cause horizontal page overflow.
 *
 * Props:
 *   path — array of strings from the root category down to and
 *          including this item (e.g. ["Outdoors", "Weather", "Watch"]).
 *   size — "sm" (default for subcategories) | "md" (default for cats).
 *   label— accessible name shown by screen readers.
 *   isDark
 *   testid
 */
export default function HierarchyPathButton({
  path,
  size = "sm",
  label,
  isDark = false,
  testid,
}) {
  const clean = (Array.isArray(path) ? path : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  const sizes = size === "md"
    ? { box: "w-6 h-6 rounded-md", icon: "w-3.5 h-3.5" }
    : { box: "w-5 h-5 rounded-md", icon: "w-3 h-3" };

  const buttonEl = (
    <button
      type="button"
      onClick={(e) => e.stopPropagation()}
      aria-label={label || "Show hierarchy"}
      title={label || "Show hierarchy"}
      data-testid={testid || "hierarchy-path-button"}
      className={`shrink-0 inline-flex items-center justify-center ${sizes.box} bg-blue-500 hover:bg-blue-400 text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300`}
    >
      <ListTree className={sizes.icon} strokeWidth={2.4} />
    </button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{buttonEl}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        className={`w-72 max-w-[calc(100vw-2rem)] p-0 overflow-hidden ${
          isDark
            ? "bg-[#0B1221] border-white/10 text-slate-200"
            : "bg-white border-gray-200 text-gray-800"
        }`}
        onClick={(e) => e.stopPropagation()}
        data-testid="hierarchy-path-popover"
      >
        <div className={`px-3 py-2 text-[11px] uppercase tracking-wider ${isDark ? "text-slate-400 border-b border-white/10" : "text-gray-500 border-b border-gray-100"}`}>
          Hierarchy path
        </div>
        <div className="max-h-72 overflow-y-auto py-2 px-3 text-sm">
          <div className={`flex items-center gap-1.5 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
            <Home className="w-3.5 h-3.5 shrink-0" />
            <span className="font-medium">Home</span>
          </div>
          {clean.length === 0 && (
            <div className={`mt-1 pl-6 text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              (This item lives at the root.)
            </div>
          )}
          {clean.map((seg, i) => {
            const isLast = i === clean.length - 1;
            // Match the mockup's popup style: folder glyph for
            // intermediate segments, file glyph for the current
            // (leaf) item. Purely visual — hierarchy data is unchanged.
            const NodeIcon = isLast ? FileText : Folder;
            return (
              <div
                key={`${i}-${seg}`}
                className="flex items-start"
                style={{ paddingLeft: `${(i + 1) * 14}px` }}
                data-testid={`hierarchy-path-node-${i}`}
              >
                <span
                  className={`select-none font-mono text-[11px] leading-6 mr-1 ${
                    isDark ? "text-slate-500" : "text-gray-400"
                  }`}
                  aria-hidden="true"
                >
                  └──
                </span>
                <NodeIcon
                  className={`w-3.5 h-3.5 mt-1 mr-1.5 shrink-0 ${
                    isLast
                      ? "text-blue-500"
                      : isDark ? "text-amber-300" : "text-amber-500"
                  }`}
                  aria-hidden="true"
                />
                <span
                  className={`leading-6 break-words ${
                    isLast
                      ? isDark ? "text-white font-semibold" : "text-gray-900 font-semibold"
                      : isDark ? "text-slate-300" : "text-gray-700"
                  }`}
                >
                  {seg}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
