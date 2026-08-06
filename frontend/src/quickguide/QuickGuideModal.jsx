/**
 * QuickGuideModal — the swipe carousel that opens when the user taps `?`.
 *
 * Design rules (locked v1.1):
 *   • Title: "Quick Guide"
 *   • Independent of FirstRunTour / QuickAccess (mirrors visual style via tokens, does NOT import them)
 *   • Bottom-left: ResourceIdChip
 *   • Bottom-right: MoreHelpButton (visible but disabled)
 *   • Last card only: GuideFeedback
 *   • Close [X] → CloseConfirmDialog → "You can reopen…" hint
 *   • Swipe (touch), chevrons (mouse), and keyboard ← → arrows all navigate
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useQuickGuideContext } from "./QuickGuideProvider";
import QuickGuideCard from "./QuickGuideCard";
import ResourceIdChip from "./ResourceIdChip";
import MoreHelpButton from "./MoreHelpButton";
import GuideFeedback from "./GuideFeedback";
import CloseConfirmDialog from "./CloseConfirmDialog";
import { QG_TOKENS } from "./tokens";
import { searchArticles } from "./search";

const SWIPE_THRESHOLD_PX = 60;

export default function QuickGuideModal({ isDark = true }) {
  const { openId, close, getArticle, getAllArticles, open } = useQuickGuideContext();
  const article = openId ? getArticle(openId) : null;

  const [index, setIndex] = useState(0);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);
  const touchStartX = useRef(null);

  // Reset to first card whenever a new guide opens
  useEffect(() => {
    if (openId) {
      setIndex(0);
      setConfirmingClose(false);
      setShowHint(false);
      setSearchOpen(false);
      setSearchQuery("");
    }
  }, [openId]);

  // Focus the search input when the search bar opens
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Ranked results — excludes the currently open guide from suggestions
  const searchResults = useMemo(
    () => searchArticles(getAllArticles(), searchQuery, 6, { excludeId: openId }),
    [searchQuery, getAllArticles, openId]
  );

  const total = article?.cards?.length || 0;
  const isLast = total > 0 && index === total - 1;

  const goNext = useCallback(() => setIndex(i => Math.min(total - 1, i + 1)), [total]);
  const goPrev = useCallback(() => setIndex(i => Math.max(0, i - 1)), []);

  // Keyboard nav
  useEffect(() => {
    if (!openId) return;
    const onKey = (e) => {
      if (e.key === "Escape") { setConfirmingClose(true); return; }
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, goNext, goPrev]);

  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > SWIPE_THRESHOLD_PX) goPrev();
    else if (dx < -SWIPE_THRESHOLD_PX) goNext();
    touchStartX.current = null;
  };

  const askClose = useCallback(() => setConfirmingClose(true), []);

  const confirmClose = useCallback(() => {
    setConfirmingClose(false);
    setShowHint(true);
    // Show the hint for a moment before actually closing
    setTimeout(() => { setShowHint(false); close(); }, 1400);
  }, [close]);

  const cancelClose = useCallback(() => setConfirmingClose(false), []);

  if (!openId || !article) return null;

  const card = article.cards[index];

  return (
    <>
      <div
        className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        style={{ pointerEvents: "auto" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickguide-title"
        data-testid="quickguide-modal"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={`relative w-full max-w-md rounded-2xl p-6 pb-4 shadow-2xl transition-all duration-[${QG_TOKENS.FADE_DURATION_MS}ms] ${
            isDark
              ? "bg-[#0B1221] border border-white/10 text-white"
              : "bg-white border border-gray-200 text-gray-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2
              id="quickguide-title"
              className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}
            >
              Quick Guide
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSearchOpen(v => !v)}
                aria-label={searchOpen ? "Close search" : "Search Quick Guides"}
                aria-expanded={searchOpen}
                data-testid="quickguide-search-toggle"
                title="Search all guides"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  searchOpen
                    ? isDark ? "bg-indigo-500/20 text-indigo-200" : "bg-indigo-100 text-indigo-700"
                    : isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={askClose}
                aria-label="Close Quick Guide"
                data-testid="quickguide-close-btn"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Inline search panel — jumps between guides without leaving the modal */}
          {searchOpen && (
            <div className="mb-4" data-testid="quickguide-modal-search">
              <div className={`relative flex items-center rounded-lg border ${isDark ? "border-white/10 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                <Search className={`w-3.5 h-3.5 ml-2.5 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search all guides…"
                  className={`flex-1 h-9 px-2 bg-transparent outline-none text-sm ${
                    isDark ? "text-white placeholder:text-slate-500" : "text-gray-900 placeholder:text-gray-400"
                  }`}
                  data-testid="quickguide-modal-search-input"
                  aria-label="Search all Quick Guides"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className={`w-7 h-7 mr-1 flex items-center justify-center rounded-full ${isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-gray-200 text-gray-500"}`}
                    aria-label="Clear search"
                    data-testid="quickguide-modal-search-clear"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <div className={`mt-2 rounded-lg border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"}`}>
                  {searchResults.length === 0 ? (
                    <div className={`px-3 py-3 text-xs text-center ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                      No other guides match &ldquo;{searchQuery.trim()}&rdquo;.
                    </div>
                  ) : (
                    <ul className="max-h-48 overflow-y-auto py-1">
                      {searchResults.map(({ article: r }) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onClick={() => { open(r.id, { origin: "modal-search" }); }}
                            className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${
                              isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                            }`}
                            data-testid={`quickguide-modal-search-result-${r.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{r.title}</span>
                              <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-gray-400"}`}>{r.id}</span>
                            </div>
                            {r.summary && (
                              <span className={`text-[11px] leading-snug line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                                {r.summary}
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
          )}

          {/* Progress dots */}
          <div className="flex gap-1.5 mb-5" aria-hidden="true">
            {article.cards.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full flex-1 transition-all ${
                  i === index ? "bg-indigo-500" : isDark ? "bg-white/10" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Card */}
          <div style={{ minHeight: 190 }}>
            <QuickGuideCard card={card} isDark={isDark} />
          </div>

          {/* Feedback footer — last card only */}
          {isLast && <GuideFeedback resourceId={article.id} isDark={isDark} />}

          {/* Navigation row */}
          <div className="flex items-center justify-between mt-5">
            <button
              type="button"
              onClick={goPrev}
              disabled={index === 0}
              aria-label="Previous card"
              data-testid="quickguide-prev"
              className={`inline-flex items-center gap-1 text-xs h-8 px-2.5 rounded-lg transition ${
                index === 0
                  ? isDark ? "text-slate-600 cursor-not-allowed" : "text-gray-300 cursor-not-allowed"
                  : isDark ? "text-slate-300 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <span className={`text-xs ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              {index + 1} of {total}
            </span>
            <button
              type="button"
              onClick={isLast ? askClose : goNext}
              aria-label={isLast ? "Finish" : "Next card"}
              data-testid={isLast ? "quickguide-finish" : "quickguide-next"}
              className="inline-flex items-center gap-1 text-xs font-medium h-8 px-3 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition"
            >
              {isLast ? "Got it" : "Next"} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Footer row — ID chip left, More Help right */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/5 dark:border-white/5">
            <ResourceIdChip resourceId={article.id} isDark={isDark} />
            <MoreHelpButton isDark={isDark} />
          </div>
        </div>
      </div>

      <CloseConfirmDialog
        open={confirmingClose}
        isDark={isDark}
        onYes={confirmClose}
        onNo={cancelClose}
      />

      {/* Post-confirmation transient hint toast */}
      {showHint && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] max-w-sm px-4 py-3 rounded-xl shadow-xl bg-indigo-600 text-white text-sm text-center"
          data-testid="quickguide-hint"
        >
          You can reopen Quick Guides anytime by tapping ? or enable automatic Quick Guides in Settings.
        </div>
      )}
    </>
  );
}
