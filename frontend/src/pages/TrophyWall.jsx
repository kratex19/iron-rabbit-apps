import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, ArrowLeft, Sparkles, Gift } from "lucide-react";
import TrophyShareCardModal from "../components/TrophyShareCardModal";
import YearlyWrapStoryModal from "../components/YearlyWrapStoryModal";

// A permanent /restaurants/trophies route that lays every earned Freeze
// Streak Trophy side-by-side. Great for Play Store screenshots — always
// looks polished even with an empty cabinet (renders a coaching state).
export default function TrophyWall() {
  const [trophies, setTrophies] = useState([]);
  const [shareYear, setShareYear] = useState(null);
  const [wrapYear, setWrapYear] = useState(null);

  useEffect(() => {
    let store = {};
    try {
      const raw = localStorage.getItem("iron_rabbit_rg_freeze_trophies_v1");
      store = raw ? JSON.parse(raw) : {};
    } catch { /* private mode */ }
    const list = Object.keys(store || {})
      .map((y) => ({ year: parseInt(y, 10), awarded_at: store[y]?.awarded_at || null }))
      .filter((t) => Number.isFinite(t.year))
      .sort((a, b) => b.year - a.year);
    setTrophies(list);
  }, []);

  const currentYear = new Date().getFullYear();
  const upcomingYears = useMemo(() => {
    // Show a couple of "locked" placeholder tiles so an empty wall never
    // looks lonely and there's always a target to aspire to.
    const shown = new Set(trophies.map((t) => t.year));
    const out = [];
    for (let y = currentYear - 1; y >= currentYear - 3 && out.length < 3; y--) {
      if (!shown.has(y)) out.push(y);
    }
    return out;
  }, [trophies, currentYear]);

  return (
    <div className="min-h-screen bg-[#0B1221] text-white" data-testid="trophy-wall-page">
      {/* Decorative amber wash */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        aria-hidden
        style={{
          background: "radial-gradient(1200px 520px at 50% -120px, rgba(251,191,36,0.35), transparent 70%)",
        }}
      />

      <header className="relative max-w-5xl mx-auto px-6 pt-8 pb-4 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          data-testid="trophy-wall-back"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <div className="text-[10px] uppercase tracking-widest text-amber-300/80">Restaurants Galore</div>
      </header>

      <main className="relative max-w-5xl mx-auto px-6 pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/25">
            <Trophy className="w-7 h-7 text-amber-300" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Trophy Wall</h1>
            <p className="text-sm text-slate-400 mt-0.5">Every year finished with zero freezes used. Tap a badge to share.</p>
          </div>
        </div>

        {/* Earned trophies */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4" data-testid="trophy-wall-grid">
          {trophies.map((t) => (
            <button
              key={t.year}
              type="button"
              onClick={() => setShareYear(t.year)}
              className="group relative aspect-[9/12] rounded-2xl overflow-hidden border border-amber-400/25 hover:border-amber-400/60 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              style={{
                background:
                  "linear-gradient(180deg, #78350f 0%, #b45309 55%, #1c1917 100%)",
              }}
              data-testid={`trophy-wall-card-${t.year}`}
              aria-label={`Share ${t.year} Freeze Streak Trophy`}
            >
              <div
                className="absolute inset-0"
                aria-hidden
                style={{
                  background:
                    "radial-gradient(60% 40% at 50% 30%, rgba(253,224,71,0.35), transparent 70%)",
                }}
              />
              <div className="relative h-full flex flex-col items-center justify-between p-4 text-center">
                <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">Iron Rabbit</div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-amber-200" />
                  </div>
                  <div className="text-5xl font-black text-amber-100 font-serif drop-shadow">{t.year}</div>
                  <div className="text-[10px] uppercase tracking-widest text-amber-100/90">Freeze Streak</div>
                </div>
                <div className="text-[10px] text-amber-100/60">Tap to share</div>
                <Sparkles className="absolute top-2 right-2 w-3.5 h-3.5 text-amber-200/70 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))}

          {trophies.length === 0 && (
            <div
              className="col-span-2 md:col-span-3 rounded-2xl border border-dashed border-white/15 p-8 text-center bg-white/[0.02]"
              data-testid="trophy-wall-empty"
            >
              <Trophy className="w-8 h-8 mx-auto text-slate-500 mb-3" />
              <div className="text-lg font-semibold">Your cabinet is empty — for now.</div>
              <div className="text-sm text-slate-400 mt-1">
                Finish any calendar year without needing a Streak Freeze and a permanent gold badge lands here.
              </div>
            </div>
          )}

          {/* Locked placeholders */}
          {upcomingYears.map((y) => (
            <div
              key={`locked-${y}`}
              className="aspect-[9/12] rounded-2xl border border-white/10 bg-white/[0.03] flex flex-col items-center justify-center p-4 text-center opacity-60"
              data-testid={`trophy-wall-locked-${y}`}
            >
              <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-2">
                <Trophy className="w-6 h-6 text-slate-500" />
              </div>
              <div className="text-3xl font-black text-slate-500 font-serif">{y}</div>
              <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">Not earned</div>
            </div>
          ))}
        </div>

        {/* Year Wrap launcher */}
        <div className="mt-8 rounded-2xl p-4 border border-white/10 bg-gradient-to-br from-amber-500/10 to-transparent flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20">
            <Gift className="w-5 h-5 text-amber-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold">Year Wrap · {currentYear - 1}</div>
            <div className="text-xs text-slate-400">Spend, top restaurants, longest streak — one tap.</div>
          </div>
          <button
            type="button"
            onClick={() => setWrapYear(currentYear - 1)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500 text-black hover:bg-amber-400"
            data-testid="trophy-wall-open-wrap"
          >
            Open Wrap
          </button>
        </div>
      </main>

      <TrophyShareCardModal
        open={shareYear !== null}
        onClose={() => setShareYear(null)}
        year={shareYear}
      />
      <YearlyWrapStoryModal
        open={wrapYear !== null}
        onClose={() => setWrapYear(null)}
        year={wrapYear}
      />
    </div>
  );
}
