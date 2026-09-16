import React, { useEffect, useRef, useState } from "react";

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
 *   - When OPEN and idle, we render a plain `<div>` with no inline
 *     style at all — RBD sees a vanilla ancestor and its scroll /
 *     position math stays correct.
 *   - When CLOSED and idle, `height: 0; overflow: hidden` — user
 *     can't drop into a collapsed section (matches intent).
 *   - During a transition, height is measured via `scrollHeight`
 *     and animated to/from 0 with a 500 ms cubic-bezier ease.
 *     Overflow is temporarily hidden to clip the growing content.
 *   - After the transition ends we drop the inline style so the
 *     open state returns to a plain `<div>` and any subsequent
 *     children additions (new tiles) size naturally.
 */
const DURATION = 220;

export default function AccordionBody({ open, children }) {
  const ref = useRef(null);
  // Initial style is idle: `{}` if open (plain div → RBD-transparent),
  // or `{height:0, overflow:'hidden'}` if closed. First-render is NOT
  // an animation — we don't want packs to fly in on mount.
  const [style, setStyle] = useState(open ? {} : { height: 0, overflow: "hidden" });
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      // Keep the initial idle style — no animation on mount.
      return undefined;
    }
    const el = ref.current;
    if (!el) return undefined;

    if (open) {
      // FROM height:0 → measured target → auto (idle).
      const target = el.scrollHeight;
      setStyle({ height: 0, overflow: "hidden" });
      const raf = requestAnimationFrame(() => {
        setStyle({
          height: `${target}px`,
          overflow: "hidden",
          transition: `height ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
        });
      });
      // After the animation completes, drop the inline style so the
      // wrapper reverts to a plain <div>. RBD walks ancestors and
      // finds nothing weird — drag-and-drop math stays correct.
      const t = setTimeout(() => setStyle({}), DURATION + 40);
      return () => { cancelAnimationFrame(raf); clearTimeout(t); };
    }

    // FROM height:auto → measured (fixed) → 0.
    const current = el.scrollHeight;
    setStyle({ height: `${current}px`, overflow: "hidden" });
    const raf = requestAnimationFrame(() => {
      setStyle({
        height: 0,
        overflow: "hidden",
        transition: `height ${DURATION}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <div ref={ref} style={style} data-accordion-body={open ? "open" : "closed"}>
      {children}
    </div>
  );
}
