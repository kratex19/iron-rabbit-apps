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
import { X, Search, Pencil, Plus, Trash2, Check } from "lucide-react";
import { useQuickGuideContext } from "./QuickGuideProvider";
import ResourceIdChip from "./ResourceIdChip";
import MoreHelpButton from "./MoreHelpButton";
import GuideFeedback from "./GuideFeedback";
import CloseConfirmDialog from "./CloseConfirmDialog";
import { searchArticles } from "./search";

export default function QuickGuideModal({ isDark = true }) {
  const { openId, close, getArticle, getAllArticles, open, history, state, upsertUserCard, deleteUserCard } = useQuickGuideContext();
  const article = openId ? getArticle(openId) : null;

  const [confirmingClose, setConfirmingClose] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCardId, setEditingCardId] = useState(null); // "new" or a user card id
  const [editHeading, setEditHeading] = useState("");
  const [editBody, setEditBody] = useState("");
  const searchInputRef = useRef(null);
  const scrollerRef = useRef(null);

  // Reset internal state whenever a new guide opens
  useEffect(() => {
    if (openId) {
      setConfirmingClose(false);
      setShowHint(false);
      setSearchOpen(false);
      setSearchQuery("");
      setEditingCardId(null);
      // Scroll strip back to the start
      requestAnimationFrame(() => {
        if (scrollerRef.current) scrollerRef.current.scrollLeft = 0;
      });
    }
  }, [openId]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  // Ranked results — excludes the currently open guide from suggestions
  const searchResults = useMemo(
    () => searchArticles(getAllArticles(), searchQuery, 6, { excludeId: openId }),
    [searchQuery, getAllArticles, openId]
  );

  // "Recently viewed" fallback shown when no query is entered.
  const historyArticles = useMemo(() => {
    return (history || [])
      .filter(id => id !== openId)
      .map(id => getArticle(id))
      .filter(Boolean)
      .slice(0, 6);
  }, [history, openId, getArticle]);

  const askClose = useCallback(() => setConfirmingClose(true), []);
  const confirmClose = useCallback(() => {
    setConfirmingClose(false);
    setShowHint(true);
    setTimeout(() => { setShowHint(false); close(); }, 1400);
  }, [close]);
  const cancelClose = useCallback(() => setConfirmingClose(false), []);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e) => { if (e.key === "Escape") setConfirmingClose(true); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId]);

  const beginNewCard = () => {
    setEditingCardId("new");
    setEditHeading("");
    setEditBody("");
  };

  const beginEditCard = (userCard) => {
    setEditingCardId(userCard.id);
    setEditHeading(userCard.heading || "");
    setEditBody(userCard.body || "");
  };

  const saveEdit = () => {
    if (!editHeading.trim() && !editBody.trim()) {
      setEditingCardId(null);
      return;
    }
    const payload = {
      heading: editHeading.trim() || "My note",
      body: editBody.trim(),
    };
    if (editingCardId && editingCardId !== "new") payload.id = editingCardId;
    upsertUserCard(openId, payload);
    setEditingCardId(null);
  };

  const cancelEdit = () => setEditingCardId(null);

  const removeCard = (id) => {
    deleteUserCard(openId, id);
    if (editingCardId === id) setEditingCardId(null);
  };

  if (!openId || !article) return null;

  const userCards = Array.isArray(state.user_cards?.[openId]) ? state.user_cards[openId] : [];
  const allCards = [
    ...article.cards.map((c, i) => ({ ...c, __kind: "shipped", __id: `s-${i}` })),
    ...userCards.map(c => ({ ...c, __kind: "user", __id: c.id })),
  ];

  return (
    <>
      <div
        className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        style={{ pointerEvents: "auto" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickguide-title"
        data-testid="quickguide-modal"
      >
        <div
          className={`relative w-full max-w-2xl rounded-2xl p-5 pb-4 shadow-2xl ${
            isDark ? "bg-[#0B1221] border border-white/10 text-white" : "bg-white border border-gray-200 text-gray-900"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2
              id="quickguide-title"
              className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-slate-400" : "text-gray-500"}`}
            >
              Quick Guide · <span className={isDark ? "text-white" : "text-gray-900"}>{article.title}</span>
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

          {/* Inline search panel */}
          {searchOpen && (
            <div className="mb-3" data-testid="quickguide-modal-search">
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
                            onClick={() => open(r.id, { origin: "modal-search" })}
                            className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                            data-testid={`quickguide-modal-search-result-${r.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{r.title}</span>
                              <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-gray-400"}`}>{r.id}</span>
                            </div>
                            {r.summary && (
                              <span className={`text-[11px] leading-snug line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{r.summary}</span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {!searchQuery.trim() && historyArticles.length > 0 && (
                <div className={`mt-2 rounded-lg border ${isDark ? "border-white/10 bg-white/[0.03]" : "border-gray-200 bg-white"}`}
                     data-testid="quickguide-modal-history">
                  <div className={`px-3 pt-2 pb-1 text-[10px] uppercase tracking-wide ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Recently viewed
                  </div>
                  <ul className="max-h-48 overflow-y-auto pb-1">
                    {historyArticles.map(r => (
                      <li key={`h-${r.id}`}>
                        <button
                          type="button"
                          onClick={() => open(r.id, { origin: "modal-history" })}
                          className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                          data-testid={`quickguide-modal-history-${r.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{r.title}</span>
                            <span className={`text-[10px] font-mono ${isDark ? "text-slate-500" : "text-gray-400"}`}>{r.id}</span>
                          </div>
                          {r.summary && (
                            <span className={`text-[11px] leading-snug line-clamp-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{r.summary}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Horizontal scroll strip of help cards + "+ Add" card at the end */}
          <div className={`text-[11px] mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            Swipe or scroll → {allCards.length} card{allCards.length === 1 ? "" : "s"}
          </div>
          <div
            ref={scrollerRef}
            className="qg-strip flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1"
            data-testid="quickguide-scroll-strip"
          >
            {allCards.map((c) => {
              const isUser = c.__kind === "user";
              const isEditing = editingCardId === c.__id;
              return (
                <div
                  key={c.__id}
                  className={`snap-center flex-shrink-0 w-64 rounded-xl p-3.5 border relative ${
                    isDark
                      ? isUser ? "bg-amber-500/5 border-amber-400/20" : "bg-white/5 border-white/10"
                      : isUser ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"
                  }`}
                  data-testid={`quickguide-card-${c.__id}`}
                >
                  {isEditing ? (
                    <div className="flex flex-col gap-2 h-full">
                      <input
                        value={editHeading}
                        onChange={(e) => setEditHeading(e.target.value)}
                        placeholder="Heading"
                        className={`h-8 px-2 rounded border text-sm font-semibold ${isDark ? "bg-black/20 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-gray-200 text-gray-900"}`}
                        maxLength={60}
                        data-testid="quickguide-card-edit-heading"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        placeholder="Add a tip, reminder, or shortcut you want to remember…"
                        className={`flex-1 min-h-[100px] px-2 py-1.5 rounded border text-xs resize-none ${isDark ? "bg-black/20 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-gray-200 text-gray-900"}`}
                        maxLength={400}
                        data-testid="quickguide-card-edit-body"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={saveEdit}
                          className="flex-1 h-7 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium inline-flex items-center justify-center gap-1"
                          data-testid="quickguide-card-save"
                        >
                          <Check className="w-3 h-3" /> Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className={`h-7 px-2 rounded-md text-xs ${isDark ? "text-slate-300 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"}`}
                          data-testid="quickguide-card-cancel"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {c.heading && (
                        <div className="flex items-start gap-1.5 mb-2">
                          <h3 className={`flex-1 text-sm font-semibold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>
                            {c.heading}
                          </h3>
                          {isUser && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => beginEditCard(c)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                                aria-label="Edit card"
                                data-testid={`quickguide-card-edit-${c.__id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCard(c.__id)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${isDark ? "text-slate-400 hover:text-red-300 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                                aria-label="Delete card"
                                data-testid={`quickguide-card-delete-${c.__id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <p className={`text-xs leading-relaxed whitespace-pre-wrap ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                        {c.body || "—"}
                      </p>
                      {isUser && (
                        <div className={`absolute bottom-1.5 right-2 text-[9px] uppercase tracking-wide ${isDark ? "text-amber-300/70" : "text-amber-600"}`}>
                          Yours
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {/* Add card */}
            <button
              type="button"
              onClick={beginNewCard}
              className={`snap-center flex-shrink-0 w-64 rounded-xl p-3.5 border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                isDark ? "border-white/15 text-slate-400 hover:border-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/5" : "border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
              data-testid="quickguide-card-add"
              aria-label="Add your own card"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1 0%,#ec4899 100%)" }}>
                <Plus className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-xs font-semibold">Add your own tip</div>
              <div className="text-[10px] text-center px-2">Save a shortcut, phrase, or reminder for this screen</div>
            </button>
          </div>

          {/* Feedback — always visible for horizontal layout */}
          <GuideFeedback resourceId={article.id} isDark={isDark} />

          {/* Footer — ID chip left, More Help right */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-black/5 dark:border-white/5">
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

