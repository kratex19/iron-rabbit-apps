/**
 * QuickGuideCard — renders one card of a guide.
 *
 * Card contract (from locked schema v1):
 *   { heading, body, icon, media }
 *
 * `body` is Markdown-lite — a purpose-built ~40-line renderer with zero deps.
 * Supported: **bold**, *italic*, `code`, [links](url), blank-line paragraphs.
 */

import React from "react";
import * as Lucide from "lucide-react";

// Purpose-built Markdown-lite renderer (no react-markdown, zero deps).
function renderInline(text) {
  // Escape HTML first to prevent any injection risk
  let s = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // Links [text](url) — safe subset only (http, https, mailto)
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+|mailto:[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline">$1</a>');
  // Bold **text**
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *text*
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  // Inline code `text`
  s = s.replace(/`([^`\n]+)`/g, '<code class="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 text-[0.9em]">$1</code>');
  return s;
}

function MarkdownLite({ text }) {
  if (!text) return null;
  const paragraphs = String(text).split(/\n\n+/);
  return (
    <>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className="leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderInline(p) }}
        />
      ))}
    </>
  );
}

// Map lucide-react kebab-case names to the exported component name
function iconOf(name) {
  if (!name) return Lucide.Sparkles;
  const pascal = name.split("-").map(s => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  return Lucide[pascal] || Lucide.Sparkles;
}

export default function QuickGuideCard({ card, isDark = true }) {
  const Ico = iconOf(card.icon);
  return (
    <div className="flex items-start gap-3" data-testid="quickguide-card">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)" }}
      >
        <Ico className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className={`text-lg font-semibold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
          {card.heading}
        </h3>
        <div className={`text-sm mt-2 leading-relaxed space-y-2 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
          <MarkdownLite text={card.body} />
        </div>
        {/* Media slot reserved per locked design — screenshot / illustration / animation.
            Phase 1 always null; renderer treats unknown types as no-op. */}
        {card.media?.src && card.media?.type === "screenshot" && (
          <img
            src={card.media.src}
            alt={card.media.alt || ""}
            loading="lazy"
            className="mt-3 rounded-lg border border-black/5"
          />
        )}
      </div>
    </div>
  );
}
