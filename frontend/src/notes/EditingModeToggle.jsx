import React from "react";
import { Type, Code2, Sparkles } from "lucide-react";

/**
 * Editing-mode segmented control for Expanded Text.
 *
 *   [ T ]   [ T✦ ]   [ </> ]
 *
 * Sits centered underneath the existing yellow toolbar. Left and right
 * edges of the row are intentionally reserved for the future Associated-
 * Note/Category slide-in arrows, so this component only paints the
 * middle three icons.
 *
 * Visual language matches the existing yellow toolbar icons in
 * FullScreenNote (yellow-500 in dark, yellow-600 in light, subtle hover
 * background, and a filled amber background for the active mode — the
 * same active pattern DisplayControlsButton uses).
 *
 * Props:
 *  - mode: "text" | "format" | "html"
 *  - onChange: (nextMode) => void
 *  - isDark: boolean
 */
export default function EditingModeToggle({ mode, onChange, isDark }) {
  const activeCls = isDark
    ? "bg-yellow-400/15 text-yellow-300"
    : "bg-yellow-100 text-yellow-700";
  const idleCls = isDark
    ? "text-yellow-500 hover:text-yellow-400 hover:bg-white/5"
    : "text-yellow-600 hover:text-yellow-500 hover:bg-yellow-50";
  const btn = (m) => `inline-flex items-center justify-center h-8 w-9 rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 ${mode === m ? activeCls : idleCls}`;

  return (
    <div
      className="w-full flex items-center justify-center py-1.5"
      data-testid="fullscreen-editing-mode-toggle"
      role="tablist"
      aria-label="Expanded Text editing mode"
    >
      <div className={`inline-flex items-center gap-1 ${isDark ? "bg-black/20" : "bg-black/[0.03]"} rounded-lg p-0.5`}>
        {/* Regular Text — plain textarea */}
        <button
          type="button"
          role="tab"
          aria-selected={mode === "text"}
          onClick={() => onChange("text")}
          className={btn("text")}
          title="Regular Text — Normal text editing"
          data-testid="fullscreen-mode-text"
        >
          <Type className="w-4 h-4" strokeWidth={2.4} />
        </button>
        {/* Tags & Formatting — WYSIWYG */}
        <button
          type="button"
          role="tab"
          aria-selected={mode === "format"}
          onClick={() => onChange("format")}
          className={btn("format")}
          title="Tags & Formatting — Format text visually without writing HTML"
          data-testid="fullscreen-mode-format"
        >
          {/* T with a small sparkle in the top-right — kept minimal so the
              T stays dominant per the spec. */}
          <span className="relative inline-flex items-center justify-center w-4 h-4">
            <Type className="w-4 h-4" strokeWidth={2.4} />
            <Sparkles className="absolute -top-1 -right-1.5 w-2.5 h-2.5" strokeWidth={2.4} />
          </span>
        </button>
        {/* HTML source */}
        <button
          type="button"
          role="tab"
          aria-selected={mode === "html"}
          onClick={() => onChange("html")}
          className={btn("html")}
          title="HTML — Edit HTML source"
          data-testid="fullscreen-mode-html"
        >
          <Code2 className="w-4 h-4" strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
