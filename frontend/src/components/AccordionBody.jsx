import React, { useEffect, useRef } from "react";

/**
 * AccordionBody — animated collapse/expand wrapper that doesn't
 * interfere with hello-pangea/dnd once the animation completes.
 *
 * Why not a pure-CSS approach:
 *   The previous `.ir-fold` wrapper used `display: grid` +
 *   `grid-template-rows: 0fr ↔ 1fr` + `overflow: clip` on an inner
 *   div. That combination broke drag-and-drop because RBD walks the
 *   ancestor chain looking for scrollable containers and reads
 *   `getBoundingClientRect()` on each ancestor. The persistent
 *   overflow/grid CSS confused its math, so tile drops "went all
 *   over the place" and category drag was disabled.
 *
 * How this fixes it:
 *   - When OPEN and idle, the wrapper `<div>` has no inline height /
 *     overflow / transition — RBD sees a vanilla ancestor and its
 *     scroll / position math stays correct.
 *   - When CLOSED and idle, `height: 0; overflow: hidden` — user
 *     can't drop into a collapsed section (matches intent).
 *   - During a transition, height is measured via `scrollHeight`
 *     and animated to/from 0 with a short cubic-bezier ease. Overflow
 *     is temporarily hidden to clip the growing content.
 *   - After the transition ends we drop the inline style so the
 *     open state returns to a plain `<div>`.
 *
 * Performance:
 *   Previous implementation used React state (`setStyle`) for every
 *   phase of the animation, causing **three full re-renders** of the
 *   whole subtree on each toggle. With deeply nested tile packs that
 *   meant hundreds of tiles re-rendering three times → visible
 *   stagger / skittish feel. The new implementation mutates
 *   `ref.current.style` directly and never calls setState during the
 *   animation, so children render exactly once.
 */
const DURATION = 220;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export default function AccordionBody({ open, children }) {
  const ref = useRef(null);
  const firstRun = useRef(true);
  // Track any in-flight rAF / timeout so a rapid re-toggle cancels
  // the previous animation cleanly.
  const cleanupRef = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    // Cancel any in-flight animation from a previous toggle.
    if (cleanupRef.current) cleanupRef.current();
    cleanupRef.current = null;

    if (firstRun.current) {
      firstRun.current = false;
      // Set idle style with no animation — packs shouldn't fly in on
      // first mount.
      if (open) {
        el.style.cssText = "";
      } else {
        el.style.height = "0px";
        el.style.overflow = "hidden";
      }
      return undefined;
    }

    if (open) {
      // FROM height:0 → measured target → clear (idle).
      // Start pinned at 0 so the transition has a defined starting frame.
      el.style.height = "0px";
      el.style.overflow = "hidden";
      el.style.transition = "";
      // Force layout so the browser commits the 0px starting point
      // before we set the target height.
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      const target = el.scrollHeight;
      const raf = requestAnimationFrame(() => {
        el.style.transition = `height ${DURATION}ms ${EASE}`;
        el.style.height = `${target}px`;
      });
      const t = setTimeout(() => {
        // Drop every inline style so RBD sees a plain <div> when idle.
        el.style.cssText = "";
      }, DURATION + 40);
      cleanupRef.current = () => {
        cancelAnimationFrame(raf);
        clearTimeout(t);
      };
    } else {
      // FROM height:auto → measured (fixed) → 0.
      const current = el.scrollHeight;
      el.style.height = `${current}px`;
      el.style.overflow = "hidden";
      el.style.transition = "";
      // Commit the fixed height first.
      // eslint-disable-next-line no-unused-expressions
      el.offsetHeight;
      const raf = requestAnimationFrame(() => {
        el.style.transition = `height ${DURATION}ms ${EASE}`;
        el.style.height = "0px";
      });
      cleanupRef.current = () => cancelAnimationFrame(raf);
    }

    return () => {
      if (cleanupRef.current) cleanupRef.current();
      cleanupRef.current = null;
    };
  }, [open]);

  return (
    <div ref={ref} data-accordion-body={open ? "open" : "closed"}>
      {children}
    </div>
  );
}
