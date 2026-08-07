/**
 * ContributorWall — public "thanks to the tippers" page.
 *
 * Mounted at BOTH `/contributors` (short public URL) and `/community/wall`
 * (nested with existing community pages). Same component, same content.
 *
 * Fetches `/api/community/contributors` — only tips with a valid nickname
 * are aggregated, so anonymous contributors stay anonymous. Renders a grid
 * on desktop (cards with tip count + newest heading), and collapses to a
 * simple list on mobile (single column, tighter spacing).
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Heart, ArrowLeft, Loader2, AtSign, Share2, Search, X, KeyRound } from "lucide-react";
import WallShareDialog from "./WallShareDialog";
import NicknameRecoveryDialog from "./NicknameRecoveryDialog";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

export default function ContributorWall() {
  const [contributors, setContributors] = useState(null);
  const [error, setError] = useState(false);
  const [shareTarget, setShareTarget] = useState(null);
  const [recoveryTarget, setRecoveryTarget] = useState(null);
  const [ownedNicks, setOwnedNicks] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      setOwnedNicks(JSON.parse(localStorage.getItem("irr.owned_nicknames") || "[]"));
    } catch (e) { /* ignore */ }
  }, []);

  const filteredContributors = useMemo(() => {
    if (!contributors) return [];
    const q = query.trim().toLowerCase();
    if (!q) return contributors;
    return contributors.filter(c =>
      (c.nickname || "").toLowerCase().includes(q) ||
      (c.latest_heading || "").toLowerCase().includes(q)
    );
  }, [contributors, query]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const base = process.env.REACT_APP_BACKEND_URL;
        const res = await fetch(`${base}/api/community/contributors`);
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        if (!cancelled) setContributors(Array.isArray(data?.contributors) ? data.contributors : []);
      } catch (e) {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0B1221] text-white" data-testid="contributor-wall">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Back to Iron Rabbit"
            data-testid="wall-back-link"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg,#10b981 0%,#0284c7 100%)" }}>
            <Heart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Thanks to these tippers</h1>
            <div className="text-xs text-slate-400 mt-0.5">
              Everyone whose tips have been promoted into Iron Rabbit&apos;s Quick Guide
            </div>
          </div>
        </div>

        {/* Loading / error / empty */}
        {contributors === null && !error && (
          <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading contributors…
          </div>
        )}
        {error && (
          <div className="text-center py-16 text-slate-500 text-sm" data-testid="wall-error">
            Couldn&apos;t load the wall right now. Please try again shortly.
          </div>
        )}
        {contributors && contributors.length === 0 && (
          <div className="text-center py-16 text-slate-500" data-testid="wall-empty">
            <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <div className="text-sm">
              No named contributors yet. Add a nickname when you share a tip and you might
              be the first to land here.
            </div>
          </div>
        )}

        {/* Content — grid on desktop, single column on mobile */}
        {contributors && contributors.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold flex items-center gap-2">
                <span>{contributors.length} {contributors.length === 1 ? "contributor" : "contributors"}</span>
                <span className="text-slate-600">·</span>
                <span>sorted by tips promoted</span>
              </div>
              <div className="flex-1" />
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Find a tipper…"
                  className="pl-8 pr-7 h-9 rounded-md bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-xs w-52 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  data-testid="wall-filter-input"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10"
                    aria-label="Clear filter"
                    data-testid="wall-filter-clear"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            {filteredContributors.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-sm" data-testid="wall-filter-no-results">
                No contributors matching &ldquo;{query}&rdquo;.
              </div>
            ) : (
            <ul
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              data-testid="wall-list"
            >
              {filteredContributors.map(c => {
                const isMine = ownedNicks.includes(c.nickname);
                return (
                <li
                  key={c.nickname}
                  className={`rounded-xl border p-4 transition-colors relative ${
                    isMine
                      ? "border-emerald-400/40 bg-emerald-500/[0.06] hover:bg-emerald-500/[0.09]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                  }`}
                  data-testid={`wall-contributor-${c.nickname}`}
                >
                  {isMine && (
                    <div className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500 text-white" data-testid={`wall-mine-badge-${c.nickname}`}>
                      You
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold" style={{ background: "linear-gradient(135deg,#10b981,#0284c7)" }}>
                      {(c.nickname || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate flex items-center gap-1">
                        <AtSign className="w-3 h-3 text-slate-500" />
                        {c.nickname}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {c.tip_count} {c.tip_count === 1 ? "tip promoted" : "tips promoted"}
                        {c.latest_promoted_at && (
                          <span> · latest {formatDate(c.latest_promoted_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {c.latest_heading && (
                    <div className="text-xs text-slate-300 line-clamp-2 mb-3" title={c.latest_heading}>
                      {c.latest_heading}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setShareTarget(c)}
                    className="w-full h-8 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-slate-200 transition-colors"
                    data-testid={`wall-share-${c.nickname}`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    {isMine ? "Share your card" : "Share this contributor"}
                  </button>
                  {!isMine && (
                    <button
                      type="button"
                      onClick={() => setRecoveryTarget(c)}
                      className="w-full h-7 mt-1 rounded-md text-[10px] inline-flex items-center justify-center gap-1 text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
                      data-testid={`wall-recover-${c.nickname}`}
                    >
                      <KeyRound className="w-3 h-3" />
                      Not you? Recover this nickname
                    </button>
                  )}
                </li>
                );
              })}
            </ul>
            )}
          </>
        )}

        {/* Footer CTA */}
        <div className="mt-10 pt-6 border-t border-white/5 text-center text-xs text-slate-500">
          Want to see your name on the wall? Share a tip from any Quick Guide with a nickname
          — if it gets promoted, you&apos;ll land here automatically.
        </div>
      </div>

      <WallShareDialog
        isOpen={!!shareTarget}
        contributor={shareTarget}
        onClose={() => setShareTarget(null)}
      />
      <NicknameRecoveryDialog
        isOpen={!!recoveryTarget}
        nickname={recoveryTarget?.nickname}
        onClose={() => setRecoveryTarget(null)}
      />
    </div>
  );
}
