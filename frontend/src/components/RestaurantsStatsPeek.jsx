import React, { useEffect, useRef } from "react";
import { Bookmark, Flame } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import useRestaurantStats from "../hooks/useRestaurantStats";

// Milestones that trigger a confetti + toast celebration.
const STREAK_MILESTONES = [4, 8, 12, 26, 52];
const MILESTONE_KEY = "iron_rabbit_rg_last_streak_milestone_v1";

/**
 * Ultra-compact stat peek shown in the collapsed row of the Live Stats
 * tile — chips for spend / wishlist / weekly streak. Also fires confetti
 * when the weekly-streak crosses a milestone.
 */
export default function RestaurantsStatsPeek({ isDark = true }) {
  const { stats } = useRestaurantStats();
  const celebratedRef = useRef(false);

  useEffect(() => {
    if (!stats || celebratedRef.current) return;
    const streak = stats.streakWeeks || 0;
    if (streak <= 0) return;

    // Find the highest milestone the user has already hit
    const currentMilestone = STREAK_MILESTONES.filter((m) => streak >= m).slice(-1)[0] || 0;
    let last = 0;
    try {
      const raw = localStorage.getItem(MILESTONE_KEY);
      last = raw ? parseInt(raw, 10) || 0 : 0;
    } catch { /* private mode */ }

    if (currentMilestone > last) {
      celebratedRef.current = true;
      try { localStorage.setItem(MILESTONE_KEY, String(currentMilestone)); } catch { /* noop */ }
      toast.success(`🔥 ${currentMilestone}-week streak logging orders — keep it going!`, {
        description: "Every week you log at least one order counts.",
        duration: 5000,
      });
      // Confetti — burst from top-center, warm palette
      confetti({
        particleCount: 90,
        spread: 70,
        startVelocity: 42,
        origin: { x: 0.5, y: 0.1 },
        colors: ["#fbbf24", "#f97316", "#ef4444", "#a855f7", "#fef3c7"],
        zIndex: 400,
      });
      // Second smaller burst for a fuller effect
      setTimeout(() => {
        confetti({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ["#fbbf24", "#f97316"], zIndex: 400 });
        confetti({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ["#fbbf24", "#f97316"], zIndex: 400 });
      }, 180);
    }
  }, [stats]);

  if (!stats) return null;

  const money = (n) => `$${(Number(n) || 0).toFixed(0)}`;
  const chipCls = isDark
    ? "bg-white/10 text-amber-200"
    : "bg-amber-100 text-amber-800";
  const chipMuted = isDark
    ? "bg-white/5 text-slate-300"
    : "bg-gray-100 text-gray-700";
  const chipStreak = isDark
    ? "bg-orange-500/15 text-orange-300"
    : "bg-orange-100 text-orange-700";

  return (
    <div className="flex items-center gap-1 flex-shrink-0" data-testid="rg-peek">
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold font-mono ${chipCls}`}
        title="Spend this calendar month"
        data-testid="rg-peek-spend"
      >
        {money(stats.spendMonth)}
      </span>
      <span
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${chipMuted}`}
        title={`${stats.wishlist} restaurant${stats.wishlist === 1 ? "" : "s"} on wish list`}
        data-testid="rg-peek-wishlist"
      >
        <Bookmark className="w-2.5 h-2.5" />
        {stats.wishlist}
      </span>
      {stats.streakWeeks > 0 && (
        <span
          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${chipStreak}`}
          title={`${stats.streakWeeks} week${stats.streakWeeks === 1 ? "" : "s"} logging orders`}
          data-testid="rg-peek-streak"
        >
          <Flame className="w-2.5 h-2.5" />
          {stats.streakWeeks}w
        </span>
      )}
    </div>
  );
}
