import React from "react";
import { Bookmark, Flame } from "lucide-react";
import useRestaurantStats from "../hooks/useRestaurantStats";

/**
 * Ultra-compact stat peek shown in the collapsed row of the Live Stats
 * tile — chips for spend / wishlist / weekly streak.
 */
export default function RestaurantsStatsPeek({ isDark = true }) {
  const { stats } = useRestaurantStats();
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
