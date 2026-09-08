/**
 * FeaturedTipStrip — a subtle "Tip of the day" strip mounted on the notes
 * home screen. Fetches one deterministically-picked promoted community tip
 * from `/api/community/featured` and renders it as a compact, dismissible
 * card. Silent (renders null) when no promoted tips exist so contributors
 * always feel seen but new installs never see an empty state.
 *
 * Rotation: server-side chooses the tip by today's UTC date → same tip all
 * day, changes at midnight UTC. Zero client state = no cache drift.
 *
 * Persistence: the user can hide the strip for the current day via
 * localStorage['irr.featured_tip_hidden_date']. Tapping the sparkle re-opens
 * the guide if the tip has a resource_id.
 */

import React, { useEffect, useState, useCallback } from "react";
import { Sparkles, X, ArrowUpRight, Heart } from "lucide-react";
import { useQuickGuideContext } from "../quickguide/QuickGuideProvider";
import { trackCommunityEvent } from "../utils/communityAnalytics";

const HIDDEN_KEY = "irr.featured_tip_hidden_date";
// Per-tip view counter used to auto-dim the strip after the user has
// seen the same tip a few times so it stops competing with the notes
// list. Not dismissed — just faded so it's still one tap away.
const VIEWS_KEY = "irr.featured_tip_views";
const DIM_AFTER_VIEWS = 3;

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC-ish (browser TZ close enough for a soft dismiss)
}

function readViews() {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function writeViews(v) {
  try { localStorage.setItem(VIEWS_KEY, JSON.stringify(v)); } catch { /* quota */ }
}

export default function FeaturedTipStrip({ isDark = true }) {
  const [tip, setTip] = useState(null);
  const [hiddenToday, setHiddenToday] = useState(() => {
    try { return localStorage.getItem(HIDDEN_KEY) === todayKey(); } catch { return false; }
  });
  // Persisted per-tip view counter. When the counter for the currently
  // shown tip clears DIM_AFTER_VIEWS, the strip renders in a subdued
  // "seen-enough" style so it stops shouting at the user.
  const [viewCount, setViewCount] = useState(0);
  const { open, getArticle } = useQuickGuideContext();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = process.env.REACT_APP_BACKEND_URL;
        if (!base) return;
        const res = await fetch(`${base}/api/community/featured`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.tip) {
          setTip(data.tip);
          // Fire one "impression" per strip mount when the strip is visible.
          // Read hiddenToday via localStorage rather than closure to avoid
          // re-firing the effect on dismiss.
          let hidden = false;
          try { hidden = localStorage.getItem(HIDDEN_KEY) === todayKey(); } catch (e) { /* ignore */ }
          if (!hidden) {
            trackCommunityEvent("impression", data.tip.id);
            // Bump the per-tip view counter so we can auto-dim once
            // the user has clearly noticed the same tip enough times.
            const views = readViews();
            const next = { ...views, [data.tip.id]: (views[data.tip.id] || 0) + 1 };
            writeViews(next);
            setViewCount(next[data.tip.id]);
          }
        }
      } catch (e) {
        // Silent — the strip degrades to invisible when offline.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(() => {
    if (tip?.id) trackCommunityEvent("dismiss", tip.id);
    setHiddenToday(true);
    try { localStorage.setItem(HIDDEN_KEY, todayKey()); } catch (e) { /* quota */ }
  }, [tip]);

  if (!tip || hiddenToday) return null;

  // Auto-dim after N impressions so tips the user has clearly noticed
  // stop competing with their notes. Still tappable — dimming lowers
  // opacity + collapses the body/description but keeps the strip
  // present so contributors always feel seen.
  const seenEnough = viewCount > DIM_AFTER_VIEWS;

  // Only offer the "Open guide" affordance when the tip's home guide still
  // ships — never link to a stale/removed resource id.
  const canOpen = !!(tip.resource_id && getArticle(tip.resource_id));

  return (
    <div
      className={`mb-3 rounded-xl border overflow-hidden group transition-opacity duration-300 ${
        isDark
          ? "bg-emerald-500/[0.06] border-emerald-400/25"
          : "bg-emerald-50 border-emerald-200"
      } ${seenEnough ? "opacity-45 hover:opacity-100 focus-within:opacity-100" : ""}`}
      data-testid="featured-tip-strip"
      data-seen-enough={seenEnough ? "true" : "false"}
    >
      <div className="flex items-start gap-3 p-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#10b981 0%,#0284c7 100%)" }}>
          <Sparkles className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-emerald-300/90" : "text-emerald-700"}`}>
            Community · Tip of the day
            {tip.nickname && (
              <span className={`ml-2 normal-case tracking-normal ${isDark ? "text-emerald-200/70" : "text-emerald-600"}`} data-testid="featured-tip-nickname">
                · shared by @{tip.nickname}
              </span>
            )}
          </div>
          <div className={`text-sm font-semibold mt-0.5 truncate ${isDark ? "text-white" : "text-gray-900"}`} data-testid="featured-tip-heading">
            {tip.heading}
          </div>
          {tip.body && !seenEnough && (
            <div className={`text-xs mt-0.5 line-clamp-2 ${isDark ? "text-slate-300" : "text-gray-600"}`} data-testid="featured-tip-body">
              {tip.body}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canOpen && (
            <button
              type="button"
              onClick={() => {
                trackCommunityEvent("open", tip.id);
                open(tip.resource_id, "featured-strip");
              }}
              className={`h-7 px-2 rounded-md text-xs inline-flex items-center gap-1 transition-colors ${
                isDark
                  ? "text-emerald-300 hover:bg-emerald-500/10"
                  : "text-emerald-700 hover:bg-emerald-100"
              }`}
              data-testid="featured-tip-open"
            >
              Open guide <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
          <a
            href="/contributors"
            target="_blank"
            rel="noopener noreferrer"
            className={`h-7 px-2 rounded-md text-xs inline-flex items-center gap-1 transition-colors ${
              isDark
                ? "text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/5"
                : "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
            }`}
            data-testid="featured-tip-meet"
            title="Meet the tippers"
          >
            <Heart className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={dismiss}
            className={`w-7 h-7 rounded-md inline-flex items-center justify-center transition-colors ${
              isDark ? "text-slate-500 hover:text-white hover:bg-white/5" : "text-gray-400 hover:text-gray-800 hover:bg-gray-100"
            }`}
            aria-label="Hide today's tip"
            data-testid="featured-tip-dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
