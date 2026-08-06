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

  // Functional-updater persist: computes next from LATEST state, avoiding
  // stale-closure races when multiple writes happen in one action (e.g.
  // recordFeedback needs to write feedback AND buffer an analytics event —
  // both must start from the freshest snapshot).
  const persist = useCallback((patchOrFn) => {
    let nextSnapshot = null;
    setState(prev => {
      const patch = typeof patchOrFn === "function" ? patchOrFn(prev) : patchOrFn;
      nextSnapshot = { ...prev, ...patch };
      return nextSnapshot;
    });
    // Persist after React commits the new state. Fire-and-forget — retry not needed for Phase 1.
    if (nextSnapshot) {
      const toSave = nextSnapshot;
      Promise.resolve().then(async () => {
        try {
          await StorageService.saveSettings({ [QG_STORAGE_KEY]: toSave });
        } catch (e) {
          console.error("[QuickGuide] persist failed:", e);
        }
      });
    }
  }, []);

  // Dormant analytics buffer — capped at 100 events. Never uploaded in Phase 1.
  // Uses functional updater so it composes safely with other writes in the same action.
  const bufferEvent = useCallback((type, payload) => {
    persist(prev => ({
      analytics_buffer: [
        ...(prev.analytics_buffer || []),
        { t: type, at: new Date().toISOString(), ...payload },
      ].slice(-100),
    }));
  }, [persist]);

  const open = useCallback((resourceId, opts = {}) => {
    if (!ARTICLE_INDEX[resourceId]) {
      console.warn(`[QuickGuide] unknown resource id: ${resourceId}`);
      return;
    }
    setOrigin(opts.origin || null);
    setTemporary(!!opts.temporary);
    setOpenId(resourceId);
    bufferEvent("guide_opened", { id: resourceId, origin: opts.origin || null, temporary: !!opts.temporary });
  }, [bufferEvent]);

  const close = useCallback(() => {
    if (openId) {
      // Single functional update — merges seen_ids AND buffers 'guide_closed' in one snapshot.
      persist(prev => {
        const seen = prev.seen_ids.includes(openId) ? prev.seen_ids : [...prev.seen_ids, openId];
        const buf = [
          ...(prev.analytics_buffer || []),
          { t: "guide_closed", at: new Date().toISOString(), id: openId },
        ].slice(-100);
        return { seen_ids: seen, analytics_buffer: buf };
      });
    }
    setOpenId(null);
    setOrigin(null);
    setTemporary(false);
  }, [openId, persist]);

  const isSeen = useCallback((id) => state.seen_ids.includes(id), [state.seen_ids]);

  const markSeen = useCallback((id) => {
    persist(prev => prev.seen_ids.includes(id) ? {} : { seen_ids: [...prev.seen_ids, id] });
  }, [persist]);

  const setEnabled = useCallback((enabled) => persist({ enabled }), [persist]);
  const setAutoShow = useCallback((auto_show) => persist({ auto_show }), [persist]);

  const resetTour = useCallback(() => {
    // Clears Quick Guide seen_ids only. Does NOT re-arm FirstRunTour or QuickAccess.
    persist({ seen_ids: [] });
  }, [persist]);

  const recordFeedback = useCallback((id, vote) => {
    // Single functional update — writes feedback AND buffers analytics event in one snapshot.
    persist(prev => {
      const helpful = new Set(prev.feedback.helpful_ids);
      const notHelpful = new Set(prev.feedback.not_helpful_ids);
      if (vote === "yes") { helpful.add(id); notHelpful.delete(id); }
      else { notHelpful.add(id); helpful.delete(id); }
      const feedback = {
        ...prev.feedback,
        helpful_ids: Array.from(helpful),
        not_helpful_ids: Array.from(notHelpful),
      };
      const buf = [
        ...(prev.analytics_buffer || []),
        { t: "guide_feedback", at: new Date().toISOString(), id, vote },
      ].slice(-100);
      return { feedback, analytics_buffer: buf };
    });
  }, [persist]);

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

export function useQuickGuideContext() {
  const ctx = useContext(QuickGuideContext);
  if (!ctx) throw new Error("useQuickGuideContext must be used inside <QuickGuideProvider>");
  return ctx;
}
