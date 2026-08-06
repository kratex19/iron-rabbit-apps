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

import React, { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuickGuideContext } from "./QuickGuideProvider";
import QuickGuideCard from "./QuickGuideCard";
import ResourceIdChip from "./ResourceIdChip";
import MoreHelpButton from "./MoreHelpButton";
import GuideFeedback from "./GuideFeedback";
import CloseConfirmDialog from "./CloseConfirmDialog";
import { QG_TOKENS } from "./tokens";

const SWIPE_THRESHOLD_PX = 60;

export default function QuickGuideModal({ isDark = true }) {
  const { openId, close, getArticle } = useQuickGuideContext();
  const article = openId ? getArticle(openId) : null;

  const [index, setIndex] = useState(0);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const touchStartX = useRef(null);

  // Reset to first card whenever a new guide opens
  useEffect(() => {
    if (openId) {
      setIndex(0);
      setConfirmingClose(false);
      setShowHint(false);
    }
  }, [openId]);

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
