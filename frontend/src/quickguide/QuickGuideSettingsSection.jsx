/**
 * QuickGuideSettingsSection — 6 rows injected into the existing SettingsModal.
 *
 * Locked design:
 *   1. Enable Quick Guides (toggle)
 *   2. Automatically show Quick Guides (toggle, default OFF)
 *   3. Reset Quick Guide Tour (button + confirm)
 *   4. Content version (read-only)
 *   5. Knowledge Distribution status (reserved, shows "Local only")
 *   6. About Quick Guides — opens the IRR-9000 meta guide
 *
 * Grouped under a collapsible "Quick Guides" heading, closed by default.
 */

import React, { useCallback, useMemo, useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, RotateCcw, Info, Cloud, Search, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useQuickGuideContext } from "./QuickGuideProvider";

// Score a single article against a lowercased query. Higher = better match.
// Title is worth 5x, summary 3x, keywords/synonyms 2x, card content 1x.
function scoreArticle(article, q) {
  if (!q) return 0;
  const hay = {
    title: (article.title || "").toLowerCase(),
    summary: (article.summary || "").toLowerCase(),
    keywords: (article.keywords || []).join(" ").toLowerCase(),
    synonyms: (article.synonyms || []).join(" ").toLowerCase(),
    cards: (article.cards || []).map(c => `${c.heading || ""} ${c.body || ""}`).join(" ").toLowerCase(),
    id: (article.id || "").toLowerCase(),
  };
  let score = 0;
  if (hay.title.includes(q)) score += 5;
  if (hay.summary.includes(q)) score += 3;
  if (hay.keywords.includes(q)) score += 2;
  if (hay.synonyms.includes(q)) score += 2;
  if (hay.cards.includes(q)) score += 1;
  if (hay.id.includes(q)) score += 4; // direct ID hits jump to top
  return score;
}

export default function QuickGuideSettingsSection({ isDark = true }) {
  const { state, hydrated, setEnabled, setAutoShow, resetTour, contentVersion, articleCount, open, getAllArticles } = useQuickGuideContext();
  const [expanded, setExpanded] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [query, setQuery] = useState("");

  const handleReset = useCallback(async () => {
    await resetTour();
    setConfirmingReset(false);
    toast.success("Quick Guide tour reset");
  }, [resetTour]);

  // Ranked search results (top 8). Empty query → no results shown.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return getAllArticles()
      .map(a => ({ article: a, score: scoreArticle(a, q) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [query, getAllArticles]);

  if (!hydrated) return null;

  const rowBase = "flex items-center justify-between py-2";
  const labelCls = isDark ? "text-sm text-slate-200" : "text-sm text-gray-800";
  const subCls = isDark ? "text-[11px] text-slate-500" : "text-[11px] text-gray-500";

  return (
    <div
      className={`rounded-xl border ${
        isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white"
      }`}
      data-testid="quickguide-settings-section"
    >
      {/* Section header — click to expand */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        data-testid="quickguide-settings-toggle"
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2">
          <HelpCircle className={`w-4 h-4 ${isDark ? "text-indigo-300" : "text-indigo-500"}`} />
          <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Quick Guides</span>
          <span className={subCls}>({articleCount} available)</span>
        </span>
        {expanded ? <ChevronDown className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} /> : <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-400" : "text-gray-500"}`} />}
      </button>

      {expanded && (
        <div className={`px-4 pb-4 space-y-1 ${isDark ? "border-t border-white/5" : "border-t border-gray-100"}`}>
          {/* Search bar — jump to any guide by keyword */}
          <div className="pt-3 pb-1">
            <div className={`relative flex items-center rounded-lg border ${isDark ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
              <Search className={`w-3.5 h-3.5 ml-2.5 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides — e.g. barcode, kid mode, backup…"
                className={`flex-1 h-9 px-2 bg-transparent outline-none text-sm ${
                  isDark ? "text-white placeholder:text-slate-500" : "text-gray-900 placeholder:text-gray-400"
                }`}
                data-testid="quickguide-search-input"
                aria-label="Search Quick Guides"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className={`w-7 h-7 mr-1 flex items-center justify-center rounded-full ${isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}
                  aria-label="Clear search"
                  data-testid="quickguide-search-clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {query.trim() && (
              <div className={`mt-2 rounded-lg border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"}`} data-testid="quickguide-search-results">
                {searchResults.length === 0 ? (
                  <div className={`px-3 py-4 text-xs text-center ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                    No guides match &ldquo;{query.trim()}&rdquo;.
                  </div>
                ) : (
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {searchResults.map(({ article }) => (
                      <li key={article.id}>
                        <button
                          type="button"
                          onClick={() => { open(article.id, { origin: "settings-search" }); setQuery(""); }}
                          className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${
                            isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                          }`}
                          data-testid={`quickguide-search-result-${article.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{article.title}</span>
                            <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-gray-400"}`}>{article.id}</span>
                          </div>
                          {article.summary && (
                            <span className={`text-[11px] leading-snug line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                              {article.summary}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Row 1 — Enable */}
          <div className={rowBase}>
            <div>
              <div className={labelCls}>Enable Quick Guides</div>
              <div className={subCls}>Show the ? button on every screen</div>
            </div>
            <Switch
              checked={state.enabled}
              onCheckedChange={setEnabled}
              data-testid="quickguide-toggle-enabled"
            />
          </div>

          {/* Row 2 — Auto-show */}
          <div className={rowBase}>
            <div>
              <div className={labelCls}>Automatically show Quick Guides</div>
              <div className={subCls}>Open a guide the first time you visit a screen</div>
            </div>
            <Switch
              checked={state.auto_show}
              onCheckedChange={setAutoShow}
              disabled={!state.enabled}
              data-testid="quickguide-toggle-auto"
            />
          </div>

          {/* Row 3 — Reset */}
          <div className={rowBase}>
            <div>
              <div className={labelCls}>Reset Quick Guide Tour</div>
              <div className={subCls}>Show every guide again on next visit</div>
            </div>
            {confirmingReset ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className={`text-xs h-8 px-2.5 rounded-lg ${isDark ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"}`}
                  data-testid="quickguide-reset-cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs h-8 px-2.5 rounded-lg bg-indigo-500 text-white"
                  data-testid="quickguide-reset-confirm"
                >
                  Reset
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingReset(true)}
                className={`inline-flex items-center gap-1 text-xs h-8 px-2.5 rounded-lg transition ${
                  isDark ? "bg-white/10 text-white hover:bg-white/15" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                data-testid="quickguide-reset-btn"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
          </div>

          {/* Row 4 — Content version */}
          <div className={rowBase}>
            <div className={labelCls}>Content version</div>
            <div className={`text-xs font-mono ${isDark ? "text-slate-400" : "text-gray-500"}`} data-testid="quickguide-content-version">
              {contentVersion}
            </div>
          </div>

          {/* Row 5 — Knowledge Distribution status (reserved) */}
          <div className={rowBase}>
            <div className="flex items-center gap-2">
              <Cloud className={`w-3.5 h-3.5 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              <div>
                <div className={labelCls}>Knowledge Distribution</div>
                <div className={subCls}>Sync guides from the web (coming later)</div>
              </div>
            </div>
            <span className={`text-[10px] uppercase tracking-wider ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Local only
            </span>
          </div>

          {/* Row 6 — About Quick Guides (opens the meta guide) */}
          <div className={rowBase}>
            <div className={labelCls}>About Quick Guides</div>
            <button
              type="button"
              onClick={() => open("IRR-9000", { origin: "settings" })}
              className="inline-flex items-center gap-1 text-xs h-8 px-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition"
              data-testid="quickguide-open-meta"
            >
              <Info className="w-3.5 h-3.5" /> Open
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
