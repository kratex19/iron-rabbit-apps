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
import { X, Search, Pencil, Plus, Trash2, Check, GripVertical, Share2, Palette, Sparkles, Upload, QrCode, Send } from "lucide-react";
import { toast } from "sonner";
import { useQuickGuideContext } from "./QuickGuideProvider";
import ResourceIdChip from "./ResourceIdChip";
import MoreHelpButton from "./MoreHelpButton";
import GuideFeedback from "./GuideFeedback";
import CloseConfirmDialog from "./CloseConfirmDialog";
import { searchArticles } from "./search";
import { shareCardAsImage, shareCardAsQr } from "./shareCard";
import { BACKGROUND_COLORS, BACKGROUND_GRADIENTS } from "../data/noteIcons";
import StorageService from "../storage/storageService";
import PasteTipsDialog from "../admin/PasteTipsDialog";
import CommunityShareDialog from "./CommunityShareDialog";
import { ClipboardPaste } from "lucide-react";

// Compact theme palette — 4 solids + 4 gradients. Enough to feel personal
// without ballooning the card edit UI. Users still get the full picker
// experience when styling note tiles.
const CARD_THEME_COLORS = ["#4338ca", "#0284c7", "#0d9488", "#e11d48"];
const CARD_THEME_GRADIENTS = [
  BACKGROUND_GRADIENTS[0].value, // Sunset
  BACKGROUND_GRADIENTS[1].value, // Ocean
  BACKGROUND_GRADIENTS[3].value, // Aurora
  BACKGROUND_GRADIENTS[10].value || BACKGROUND_GRADIENTS[0].value, // Golden Hour
];

export default function QuickGuideModal({ isDark = true }) {
  const { openId, close, getArticle, getAllArticles, open, history, state, upsertUserCard, deleteUserCard, reorderUserCards, pendingImport, clearPendingImport, communityTips } = useQuickGuideContext();
  const article = openId ? getArticle(openId) : null;

  const [confirmingClose, setConfirmingClose] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCardId, setEditingCardId] = useState(null); // "new" or a user card id
  const [editHeading, setEditHeading] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editTheme, setEditTheme] = useState(null); // { type: "color"|"gradient", value: "..." } | null
  const [dragCardId, setDragCardId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [shareDialogCard, setShareDialogCard] = useState(null); // card object to open share dialog with
  const [consentGranted, setConsentGranted] = useState(false);
  const searchInputRef = useRef(null);

  // Load current sharing consent so the dialog can hide the consent copy
  // for repeat sharers.
  useEffect(() => {
    let cancelled = false;
    StorageService.getSettings().then(s => {
      if (!cancelled) setConsentGranted(!!s?.community_consent);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [shareDialogCard]);
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
    setEditTheme(null);
  };

  const beginEditCard = (userCard) => {
    setEditingCardId(userCard.id);
    setEditHeading(userCard.heading || "");
    setEditBody(userCard.body || "");
    setEditTheme(userCard.theme || null);
  };

  const saveEdit = () => {
    if (!editHeading.trim() && !editBody.trim()) {
      setEditingCardId(null);
      return;
    }
    const payload = {
      heading: editHeading.trim() || "My note",
      body: editBody.trim(),
      theme: editTheme,
    };
    if (editingCardId && editingCardId !== "new") payload.id = editingCardId;
    upsertUserCard(openId, payload);
    setEditingCardId(null);
  };

  const cancelEdit = () => setEditingCardId(null);

  // Card Import — accept a shared card PNG dropped anywhere on the modal.
  // Calls the /api/ocr backend (Claude Sonnet vision) to extract text, then
  // opens the edit form pre-filled with the OCR'd heading + body.
  const [importing, setImporting] = useState(false);
  const [dropHover, setDropHover] = useState(false);

  const importCardFromFile = useCallback(async (file) => {
    if (!file || !file.type?.startsWith("image/")) {
      toast.error("Drop a PNG or JPG card image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too big — under 5 MB please");
      return;
    }
    setImporting(true);
    try {
      const b64 = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const base = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${base}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: b64, mime_type: file.type }),
      });
      if (!res.ok) throw new Error(`OCR ${res.status}`);
      const { extracted_text: text } = await res.json();
      if (!text?.trim()) {
        toast.error("No text found on that image");
        return;
      }
      // Split OCR output → first non-empty line becomes heading, rest becomes body.
      const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
      // Strip our own header/footer boilerplate if present.
      const filtered = lines.filter(l =>
        !/IRON RABBIT.*QUICK GUIDE/i.test(l) &&
        !/^IRR-\d+$/i.test(l) &&
        !/ironrabbitapps\.com/i.test(l)
      );
      const heading = filtered.shift() || "Imported tip";
      const body = filtered.join("\n").trim();
      // Open the edit form pre-filled — user confirms + saves.
      setEditingCardId("new");
      setEditHeading(heading.slice(0, 60));
      setEditBody(body.slice(0, 400));
      setEditTheme(null);
      toast.success("Text extracted — review + save");
    } catch (e) {
      console.error("[QuickGuide] OCR import failed:", e);
      toast.error("Import failed — try a clearer image");
    } finally {
      setImporting(false);
      setDropHover(false);
    }
  }, []);

  const onModalDragOver = (e) => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setDropHover(true);
    }
  };
  const onModalDragLeave = () => setDropHover(false);
  const onModalDrop = (e) => {
    if (!e.dataTransfer?.files?.length) return;
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    importCardFromFile(file);
  };

  const removeCard = (id) => {
    deleteUserCard(openId, id);
    if (editingCardId === id) setEditingCardId(null);
  };

  const shareCard = async (card) => {
    if (sharingId) return;
    setSharingId(card.__id);
    try {
      const result = await shareCardAsImage({
        heading: card.heading,
        body: card.body,
        theme: card.theme,
        resourceId: article?.id,
        guideTitle: article?.title,
      });
      if (result.kind === "downloaded") toast.success("Tip saved to Downloads");
      else if (result.kind === "shared") toast.success("Tip shared");
    } catch (e) {
      console.error("[QuickGuide] share failed:", e);
      toast.error("Couldn't share — try again");
    } finally {
      setSharingId(null);
    }
  };

  const shareCardQr = async (card) => {
    if (sharingId) return;
    setSharingId(`qr-${card.__id}`);
    try {
      const result = await shareCardAsQr({
        heading: card.heading,
        body: card.body,
        theme: card.theme,
        resourceId: article?.id,
        guideTitle: article?.title,
      });
      if (result.kind === "downloaded") toast.success("QR card saved to Downloads");
      else if (result.kind === "shared") toast.success("QR shared");
    } catch (e) {
      console.error("[QuickGuide] QR share failed:", e);
      toast.error("Couldn't build QR — try again");
    } finally {
      setSharingId(null);
    }
  };

  // Open the polished community-share dialog. Keeps consent logic in one
  // place — the dialog itself handles the opt-in email flow.
  const submitToCommunity = async (card) => {
    setShareDialogCard(card);
  };

  const handleShareConfirm = async (payload) => {
    try {
      if (payload.remember_consent) {
        await StorageService.saveSettings({ community_consent: true });
      }
      const base = process.env.REACT_APP_BACKEND_URL;
      const res = await fetch(`${base}/api/community/tip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heading: payload.heading,
          body: payload.body,
          resource_id: article?.id || "",
          theme: payload.theme || null,
          contributor_email: payload.contributor_email || undefined,
          contributor_opt_in: payload.contributor_opt_in || false,
          nickname: payload.nickname || undefined,
        }),
      });
      if (!res.ok) throw new Error(`submit ${res.status}`);
      toast.success(payload.contributor_opt_in
        ? "Thanks — tip submitted. We'll email you if it goes live."
        : "Thanks — tip submitted");
      setShareDialogCard(null);
    } catch (e) {
      console.error("[QuickGuide] community submit failed:", e);
      toast.error("Couldn't submit — try again");
    }
  };

  // HTML5 drag-and-drop reorder for user cards. We ignore drags that start
  // from shipped cards or land on shipped cards — reorder only affects the
  // user_cards[resourceId] array.
  const onDragStart = (e, cardId, isUser) => {
    if (!isUser) return;
    setDragCardId(cardId);
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", cardId); } catch { /* Safari quirks */ }
  };
  const onDragOver = (e, cardId, isUser) => {
    if (!isUser || !dragCardId || dragCardId === cardId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverId !== cardId) setDragOverId(cardId);
  };
  const onDragLeave = (cardId) => {
    if (dragOverId === cardId) setDragOverId(null);
  };
  const onDrop = (e, cardId, isUser) => {
    if (!isUser) return;
    e.preventDefault();
    if (dragCardId && dragCardId !== cardId) {
      reorderUserCards(openId, dragCardId, cardId);
    }
    setDragCardId(null);
    setDragOverId(null);
  };
  const onDragEnd = () => { setDragCardId(null); setDragOverId(null); };

  if (!openId || !article) return null;

  const userCards = Array.isArray(state.user_cards?.[openId]) ? state.user_cards[openId] : [];
  const communityCardsForGuide = (communityTips || []).filter(t => t.resource_id === openId);
  const allCards = [
    ...article.cards.map((c, i) => ({ ...c, __kind: "shipped", __id: `s-${i}` })),
    ...communityCardsForGuide.map(c => ({
      heading: c.heading,
      body: c.body,
      __kind: "community",
      __id: `c-${c.id}`,
    })),
    ...userCards.map(c => ({ ...c, __kind: "user", __id: c.id })),
  ];

  const acceptPendingImport = () => {
    if (!pendingImport) return;
    upsertUserCard(openId, {
      heading: pendingImport.heading || "Imported tip",
      body: pendingImport.body || "",
    });
    clearPendingImport();
    toast.success("Tip saved to your cards");
    // Scroll to the end so the new card is visible
    requestAnimationFrame(() => {
      if (scrollerRef.current) scrollerRef.current.scrollLeft = scrollerRef.current.scrollWidth;
    });
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        style={{ pointerEvents: "auto" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quickguide-title"
        data-testid="quickguide-modal"
        onDragOver={onModalDragOver}
        onDragLeave={onModalDragLeave}
        onDrop={onModalDrop}
      >
        <div
          className={`relative w-full max-w-2xl rounded-2xl p-5 pb-4 shadow-2xl ${
            isDark ? "bg-[#0B1221] border border-white/10 text-white" : "bg-white border border-gray-200 text-gray-900"
          } ${dropHover ? "ring-4 ring-indigo-400/70" : ""}`}
          onClick={(e) => e.stopPropagation()}
        >
          {(dropHover || importing) && (
            <div className="absolute inset-0 z-40 rounded-2xl bg-indigo-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 pointer-events-none"
                 data-testid="quickguide-import-overlay">
              <Upload className="w-8 h-8 text-white" />
              <div className="text-white text-sm font-semibold">
                {importing ? "Reading your card…" : "Drop to import as a card"}
              </div>
              <div className="text-white/70 text-[11px]">PNG or JPG, under 5 MB</div>
            </div>
          )}
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

          {/* Pending QR-import preview — user scanned a tip and needs to confirm before it lands on their cards */}
          {pendingImport && (
            <div
              className={`mb-3 rounded-xl border p-3 flex flex-col gap-2 ${
                isDark ? "bg-indigo-500/10 border-indigo-400/30" : "bg-indigo-50 border-indigo-200"
              }`}
              data-testid="quickguide-import-preview"
            >
              <div className="flex items-center gap-2">
                <QrCode className={`w-4 h-4 ${isDark ? "text-indigo-300" : "text-indigo-600"}`} />
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>
                  Import this tip?
                </div>
              </div>
              <div>
                <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  {pendingImport.heading || "Imported tip"}
                </div>
                {pendingImport.body && (
                  <div className={`text-xs mt-1 whitespace-pre-wrap ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                    {pendingImport.body}
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={acceptPendingImport}
                  className="flex-1 h-8 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium inline-flex items-center justify-center gap-1"
                  data-testid="quickguide-import-accept"
                >
                  <Check className="w-3.5 h-3.5" /> Save to my cards
                </button>
                <button
                  type="button"
                  onClick={clearPendingImport}
                  className={`h-8 px-3 rounded-md text-xs ${isDark ? "text-slate-300 hover:bg-white/10" : "text-gray-600 hover:bg-gray-100"}`}
                  data-testid="quickguide-import-cancel"
                >
                  Discard
                </button>
              </div>
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
              const isCommunity = c.__kind === "community";
              const isEditing = editingCardId === c.__id;
              const isDragging = dragCardId === c.__id;
              const isDropTarget = dragOverId === c.__id;
              const isSharing = sharingId === c.__id;
              return (
                <div
                  key={c.__id}
                  draggable={isUser && !isEditing}
                  onDragStart={(e) => onDragStart(e, c.__id, isUser)}
                  onDragOver={(e) => onDragOver(e, c.__id, isUser)}
                  onDragLeave={() => onDragLeave(c.__id)}
                  onDrop={(e) => onDrop(e, c.__id, isUser)}
                  onDragEnd={onDragEnd}
                  style={isUser && !isEditing && c.theme ? { background: c.theme.value } : undefined}
                  className={`snap-center flex-shrink-0 w-64 rounded-xl p-3.5 border relative transition-transform overflow-hidden ${
                    isUser && !isEditing && c.theme
                      ? "border-white/20 text-white"
                      : isCommunity
                        ? isDark ? "bg-emerald-500/5 border-emerald-400/20" : "bg-emerald-50 border-emerald-200"
                        : isDark
                          ? isUser ? "bg-amber-500/5 border-amber-400/20" : "bg-white/5 border-white/10"
                          : isUser ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"
                  } ${isDragging ? "opacity-40 scale-95 cursor-grabbing" : ""} ${
                    isDropTarget ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent" : ""
                  } ${isUser && !isEditing ? "cursor-grab" : ""}`}
                  data-testid={`quickguide-card-${c.__id}`}
                >
                  {/* Dim overlay when the card has a themed background — makes text readable */}
                  {isUser && !isEditing && c.theme && (
                    <span className="absolute inset-0 bg-black/25 pointer-events-none" aria-hidden="true" />
                  )}                  {isEditing ? (
                    <div className="flex flex-col gap-2 h-full relative z-10">
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
                        className={`flex-1 min-h-[80px] px-2 py-1.5 rounded border text-xs resize-none ${isDark ? "bg-black/20 border-white/10 text-white placeholder:text-slate-500" : "bg-white border-gray-200 text-gray-900"}`}
                        maxLength={400}
                        data-testid="quickguide-card-edit-body"
                      />
                      {/* Theme picker — solid + gradient row */}
                      <div className="flex items-center gap-1.5 flex-wrap" data-testid="quickguide-card-theme-picker">
                        <Palette className={`w-3 h-3 flex-shrink-0 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
                        <button
                          type="button"
                          onClick={() => setEditTheme(null)}
                          className={`w-5 h-5 rounded-full border flex items-center justify-center text-[8px] ${
                            !editTheme ? "border-white ring-2 ring-indigo-500" : "border-white/20"
                          } ${isDark ? "bg-black/30 text-slate-400" : "bg-white text-gray-400"}`}
                          aria-label="No theme"
                          title="No theme"
                          data-testid="quickguide-card-theme-none"
                        >
                          ∅
                        </button>
                        {CARD_THEME_COLORS.map(hex => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setEditTheme({ type: "color", value: hex })}
                            className={`w-5 h-5 rounded-full border ${
                              editTheme?.value === hex ? "border-white ring-2 ring-indigo-500" : "border-white/20"
                            }`}
                            style={{ background: hex }}
                            aria-label={`Theme ${hex}`}
                            title={hex}
                            data-testid={`quickguide-card-theme-color-${hex}`}
                          />
                        ))}
                        {CARD_THEME_GRADIENTS.map((g, i) => (
                          <button
                            key={`g-${i}`}
                            type="button"
                            onClick={() => setEditTheme({ type: "gradient", value: g })}
                            className={`w-5 h-5 rounded-full border ${
                              editTheme?.value === g ? "border-white ring-2 ring-indigo-500" : "border-white/20"
                            }`}
                            style={{ background: g }}
                            aria-label={`Gradient theme ${i + 1}`}
                            title="Gradient"
                            data-testid={`quickguide-card-theme-gradient-${i}`}
                          />
                        ))}
                      </div>
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
                    <div className="relative z-10">
                      {c.heading && (
                        <div className="flex items-start gap-1.5 mb-2">
                          {isUser && (
                            <GripVertical className={`w-3 h-3 mt-0.5 flex-shrink-0 ${c.theme ? "text-white/70" : isDark ? "text-amber-300/60" : "text-amber-500"}`} aria-hidden="true" />
                          )}
                          <h3 className={`flex-1 text-sm font-semibold leading-tight ${
                            c.theme ? "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.5)]" : isDark ? "text-white" : "text-gray-900"
                          }`}>
                            {c.heading}
                          </h3>
                          {isUser && (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => shareCard(c)}
                                disabled={isSharing}
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${c.theme ? "text-white/80 hover:bg-white/20" : isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"} disabled:opacity-50`}
                                aria-label="Share as image"
                                title="Share as image"
                                data-testid={`quickguide-card-share-${c.__id}`}
                              >
                                <Share2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => shareCardQr(c)}
                                disabled={!!sharingId}
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${c.theme ? "text-white/80 hover:bg-white/20" : isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"} disabled:opacity-50`}
                                aria-label="Share as QR"
                                title="Share as QR — scannable by any camera"
                                data-testid={`quickguide-card-share-qr-${c.__id}`}
                              >
                                <QrCode className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => submitToCommunity(c)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${c.theme ? "text-white/80 hover:bg-white/20" : isDark ? "text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"}`}
                                aria-label="Submit to community"
                                title="Submit anonymously to help other users"
                                data-testid={`quickguide-card-submit-${c.__id}`}
                              >
                                <Send className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => beginEditCard(c)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${c.theme ? "text-white/80 hover:bg-white/20" : isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
                                aria-label="Edit card"
                                data-testid={`quickguide-card-edit-${c.__id}`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeCard(c.__id)}
                                className={`w-5 h-5 rounded-md flex items-center justify-center ${c.theme ? "text-white/80 hover:bg-red-500/30" : isDark ? "text-slate-400 hover:text-red-300 hover:bg-red-500/10" : "text-gray-400 hover:text-red-600 hover:bg-red-50"}`}
                                aria-label="Delete card"
                                data-testid={`quickguide-card-delete-${c.__id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      <p className={`text-xs leading-relaxed whitespace-pre-wrap ${
                        c.theme ? "text-white/95 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]" : isDark ? "text-slate-300" : "text-gray-600"
                      }`}>
                        {c.body || "—"}
                      </p>
                      {isUser && (
                        <div className={`absolute bottom-1.5 right-2 text-[9px] uppercase tracking-wide ${
                          c.theme ? "text-white/70" : isDark ? "text-amber-300/70" : "text-amber-600"
                        }`}>
                          Yours
                        </div>
                      )}
                      {isCommunity && (
                        <div className={`absolute bottom-1.5 right-2 text-[9px] uppercase tracking-wide flex items-center gap-1 ${
                          isDark ? "text-emerald-300/80" : "text-emerald-600"
                        }`} data-testid={`quickguide-community-badge-${c.__id}`}>
                          {c.nickname ? (
                            <>
                              <span className="normal-case tracking-normal text-emerald-200/90" data-testid={`quickguide-community-nick-${c.__id}`}>
                                @{c.nickname}
                              </span>
                              <span className="opacity-50">·</span>
                            </>
                          ) : null}
                          Community
                        </div>
                      )}
                    </div>
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
            {/* Import from image — drop a shared card PNG or tap to browse */}
            <label
              className={`snap-center flex-shrink-0 w-64 rounded-xl p-3.5 border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer ${
                isDark ? "border-white/15 text-slate-400 hover:border-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/5" : "border-gray-300 text-gray-500 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50"
              }`}
              data-testid="quickguide-card-import"
              aria-label="Import card from image"
            >
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(e) => e.target.files?.[0] && importCardFromFile(e.target.files[0])}
                className="hidden"
                data-testid="quickguide-card-import-input"
              />
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981 0%,#0284c7 100%)" }}>
                <Upload className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-xs font-semibold">Import from image</div>
              <div className="text-[10px] text-center px-2">Drop or tap to bring a shared card back to text</div>
            </label>
            {/* Paste multiple tips — LLM structures them into cards in bulk */}
            <button
              type="button"
              onClick={() => setPasteOpen(true)}
              className={`snap-center flex-shrink-0 w-64 rounded-xl p-3.5 border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${
                isDark ? "border-white/15 text-slate-400 hover:border-fuchsia-400 hover:text-fuchsia-300 hover:bg-fuchsia-500/5" : "border-gray-300 text-gray-500 hover:border-fuchsia-500 hover:text-fuchsia-600 hover:bg-fuchsia-50"
              }`}
              data-testid="quickguide-card-paste"
              aria-label="Paste multiple tips"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#a855f7 0%,#ec4899 100%)" }}>
                <ClipboardPaste className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-xs font-semibold">Paste multiple tips</div>
              <div className="text-[10px] text-center px-2">AI splits a chunk of text into clean cards</div>
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

      <PasteTipsDialog
        isOpen={pasteOpen}
        onClose={() => setPasteOpen(false)}
        mode="quickguide"
        resourceId={openId}
        onSaveAsUserCards={(cards) => {
          // Add each parsed card to this guide via provider. upsertUserCard
          // generates its own id when we omit it, so we just spread heading/body.
          cards.forEach(c => upsertUserCard(openId, { heading: c.heading, body: c.body }));
          // Auto-scroll to the newly-added end of the strip.
          requestAnimationFrame(() => {
            if (scrollerRef.current) scrollerRef.current.scrollLeft = scrollerRef.current.scrollWidth;
          });
        }}
      />
      <CommunityShareDialog
        isOpen={!!shareDialogCard}
        onClose={() => setShareDialogCard(null)}
        card={shareDialogCard}
        consentGranted={consentGranted}
        onConfirm={handleShareConfirm}
      />
    </>
  );
}

