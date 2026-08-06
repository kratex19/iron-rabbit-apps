/**
 * QuickGuideProvider — root-level context that owns:
 *   • settings (enabled / auto_show / seen_ids / feedback / analytics buffer)
 *   • the currently-open guide article
 *   • the "origin" tag (which screen opened the guide) — captured now, used
 *     later when analytics is activated in Phase 7
 *
 * Storage: persists to StorageService `app_settings.quickguide.*` via the
 * existing settings pipeline. No new IndexedDB stores.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import StorageService from "../storage/storageService";
import { QG_STORAGE_KEY, QG_DEFAULT_STATE } from "./tokens";

// Bundled content (Phase 1: English only). Compiled from /content/en/*.json
// at import time by the JSON loader — one indexed map for O(1) lookup.
import manifest from "./content/manifest.json";
import IRR_1000 from "./content/en/IRR-1000.json";
import IRR_1100 from "./content/en/IRR-1100.json";
import IRR_1200 from "./content/en/IRR-1200.json";
import IRR_9000 from "./content/en/IRR-9000.json";

const BUNDLED_ARTICLES = [IRR_1000, IRR_1100, IRR_1200, IRR_9000];
const ARTICLE_INDEX = Object.fromEntries(BUNDLED_ARTICLES.map(a => [a.id, a]));

const QuickGuideContext = createContext(null);

function mergeState(loaded) {
  return { ...QG_DEFAULT_STATE, ...(loaded || {}), feedback: { ...QG_DEFAULT_STATE.feedback, ...((loaded && loaded.feedback) || {}) } };
}

export function QuickGuideProvider({ children }) {
  const [state, setState] = useState(QG_DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [openId, setOpenId] = useState(null);   // resource ID of the currently displayed guide
  const [origin, setOrigin] = useState(null);    // where the user opened it from (analytics-reserved)
  const [temporary, setTemporary] = useState(false); // triple-tap-when-disabled → one-shot

  // Hydrate from settings on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await StorageService.getSettings();
        const loaded = mergeState(settings?.[QG_STORAGE_KEY]);

        // FIRST-LAUNCH SEED: if seen_ids is empty on first read, seed with every
        // current article ID so auto-show only fires for genuinely new articles
        // in future releases (prevents flood on upgrade).
        if (!loaded.seen_ids || loaded.seen_ids.length === 0) {
          loaded.seen_ids = BUNDLED_ARTICLES.map(a => a.id);
        }
        loaded.content_version = manifest.content_version;

        if (!cancelled) {
          setState(loaded);
          setHydrated(true);
          // Persist the seeded seen_ids so we only do this once
          await StorageService.saveSettings({ [QG_STORAGE_KEY]: loaded });
        }
      } catch (e) {
        console.error("[QuickGuide] hydration failed:", e);
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (patch) => {
    const next = { ...state, ...patch };
    setState(next);
    try {
      await StorageService.saveSettings({ [QG_STORAGE_KEY]: next });
    } catch (e) {
      console.error("[QuickGuide] persist failed:", e);
    }
  }, [state]);

  const open = useCallback((resourceId, opts = {}) => {
    if (!ARTICLE_INDEX[resourceId]) {
      console.warn(`[QuickGuide] unknown resource id: ${resourceId}`);
      return;
    }
    setOrigin(opts.origin || null);
    setTemporary(!!opts.temporary);
    setOpenId(resourceId);
    // Emit dormant analytics event (buffered, never uploaded in Phase 1)
    _bufferEvent(state, persist, "guide_opened", { id: resourceId, origin: opts.origin || null, temporary: !!opts.temporary });
  }, [state, persist]);

  const close = useCallback(() => {
    if (openId) {
      _bufferEvent(state, persist, "guide_closed", { id: openId });
      // Mark as seen (both permanent and temporary opens count)
      if (!state.seen_ids.includes(openId)) {
        persist({ seen_ids: [...state.seen_ids, openId] });
      }
    }
    setOpenId(null);
    setOrigin(null);
    setTemporary(false);
  }, [openId, state, persist]);

  const isSeen = useCallback((id) => state.seen_ids.includes(id), [state.seen_ids]);

  const markSeen = useCallback((id) => {
    if (!state.seen_ids.includes(id)) {
      persist({ seen_ids: [...state.seen_ids, id] });
    }
  }, [state, persist]);

  const setEnabled = useCallback((enabled) => persist({ enabled }), [persist]);
  const setAutoShow = useCallback((auto_show) => persist({ auto_show }), [persist]);

  const resetTour = useCallback(async () => {
    // Clears Quick Guide seen_ids only. Does NOT re-arm FirstRunTour or QuickAccess.
    await persist({ seen_ids: [] });
  }, [persist]);

  const recordFeedback = useCallback(async (id, vote) => {
    const helpful = new Set(state.feedback.helpful_ids);
    const notHelpful = new Set(state.feedback.not_helpful_ids);
    // Remove from opposite set — last vote wins
    if (vote === "yes") { helpful.add(id); notHelpful.delete(id); }
    else { notHelpful.add(id); helpful.delete(id); }
    await persist({
      feedback: {
        ...state.feedback,
        helpful_ids: Array.from(helpful),
        not_helpful_ids: Array.from(notHelpful),
      },
    });
    _bufferEvent(state, persist, "guide_feedback", { id, vote });
  }, [state, persist]);

  const getArticle = useCallback((id) => ARTICLE_INDEX[id] || null, []);

  const value = useMemo(() => ({
    hydrated,
    state,
    openId,
    origin,
    temporary,
    open,
    close,
    isSeen,
    markSeen,
    setEnabled,
    setAutoShow,
    resetTour,
    recordFeedback,
    getArticle,
    articleCount: BUNDLED_ARTICLES.length,
    contentVersion: manifest.content_version,
  }), [hydrated, state, openId, origin, temporary, open, close, isSeen, markSeen, setEnabled, setAutoShow, resetTour, recordFeedback, getArticle]);

  return (
    <QuickGuideContext.Provider value={value}>
      {children}
    </QuickGuideContext.Provider>
  );
}

// Dormant analytics buffer — capped at 100. Never uploaded. Phase 7 will
// activate a sink adapter that drains the buffer. In Phase 1 events pile up
// silently and get dropped on rollover.
function _bufferEvent(state, persist, type, payload) {
  const buf = state.analytics_buffer || [];
  const next = [...buf, { t: type, at: new Date().toISOString(), ...payload }].slice(-100);
  persist({ analytics_buffer: next });
}

export function useQuickGuideContext() {
  const ctx = useContext(QuickGuideContext);
  if (!ctx) throw new Error("useQuickGuideContext must be used inside <QuickGuideProvider>");
  return ctx;
}
