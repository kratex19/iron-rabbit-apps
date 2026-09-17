import React, { useRef, useState } from "react";
import { ListTree, Home, Folder, FileText } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { haptic } from "../utils/haptic";

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
 *     connectors. The popover is scrollable (max-height) so extremely
 *     deep hierarchies do not stretch the row and never cause
 *     horizontal page overflow.
 *   • LONG-PRESS (≥ 500 ms) — if the caller supplies `onLongPress`,
 *     the popover is suppressed and the callback fires instead. This
 *     drives the "jump to this category" shortcut (Home filters to
 *     just this path). Works with touch and mouse.
 *
 * Props:
 *   path — array of strings from the root category down to and
 *          including this item (e.g. ["Outdoors", "Weather", "Watch"]).
 *   size — "sm" (default for subcategories) | "md" (default for cats).
 *   label — accessible name shown by screen readers.
 *   onLongPress — optional callback fired on long-press. Receives no
 *                 args; the caller has `path` in scope.
 *   isDark
 *   testid
 */
export default function HierarchyPathButton({
  path,
  size = "sm",
  label,
  onLongPress = null,
  isDark = false,
  testid,
}) {
  const clean = (Array.isArray(path) ? path : [])
    .map((s) => String(s || "").trim())
    .filter(Boolean);

  const sizes = size === "md"
    ? { box: "w-6 h-6 rounded-md", icon: "w-3.5 h-3.5" }
    : { box: "w-5 h-5 rounded-md", icon: "w-3 h-3" };

  // Controlled popover state so long-press can suppress opening.
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const firedLongPressRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPointerDown = (e) => {
    if (!onLongPress) return;
    firedLongPressRef.current = false;
    // Only left mouse button; touch has no `button` info so it passes.
    if (e.pointerType === "mouse" && e.button !== 0) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      firedLongPressRef.current = true;
      try { haptic("milestone"); } catch { /* noop */ }
      // Ensure popover stays closed
      setOpen(false);
      onLongPress();
    }, 500);
  };

  const onPointerUpOrLeave = () => {
    clearTimer();
  };

  const handleClick = (e) => {
    // Never let the click bubble into the parent header toggle.
    e.stopPropagation();
    if (firedLongPressRef.current) {
      // Consume the click that follows the long-press so the popover
      // doesn't flash open right after we navigated / filtered.
      e.preventDefault();
      firedLongPressRef.current = false;
      return;
    }
    setOpen((v) => !v);
  };

  const buttonEl = (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUpOrLeave}
      onPointerLeave={onPointerUpOrLeave}
      onPointerCancel={onPointerUpOrLeave}
      onContextMenu={(e) => { if (onLongPress) e.preventDefault(); }}
      aria-label={label || "Show hierarchy"}
      title={onLongPress
        ? `${label || "Show hierarchy"} — long-press to filter Home to this path`
        : (label || "Show hierarchy")}
      data-testid={testid || "hierarchy-path-button"}
      className={`shrink-0 inline-flex items-center justify-center ${sizes.box} bg-blue-500 hover:bg-blue-400 text-white shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 select-none touch-none`}
    >
      <ListTree className={sizes.icon} strokeWidth={2.4} />
    </button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{buttonEl}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        // 12-px viewport padding on all edges — Radix uses Floating UI
        // under the hood, which will now automatically shift or flip
        // the popover to stay fully in view instead of extending off
        // the right side on narrower windows or when the trigger sits
        // near the edge of the container.
        collisionPadding={12}
        avoidCollisions
        sticky="always"
        className={`w-[min(18rem,calc(100vw-1.5rem))] p-0 overflow-hidden ${
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
        {onLongPress && clean.length > 0 && (
          <div
            className={`px-3 py-1.5 text-[10px] border-t ${
              isDark ? "border-white/10 text-slate-500" : "border-gray-100 text-gray-400"
            }`}
          >
            Tip — long-press this icon to filter Home to just this path.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
