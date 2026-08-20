import React from "react";
import { Utensils, TrendingUp, Star, Bookmark, Truck, Ticket } from "lucide-react";
import useRestaurantStats from "../hooks/useRestaurantStats";

/**
 * Live-data widget rendered inside a note tile when
 * note.special_action === "restaurants_stats_widget".
 *
 * Reads from `useRestaurantStats` (which pulls from `restaurantsService`
 * IndexedDB stores) and renders a stats grid, last-order card, and a
 * 6-month spend sparkline.
 */
export default function RestaurantsStatsWidget({ isDark = true }) {
  const { stats, err } = useRestaurantStats();

  const label = isDark ? "text-slate-300" : "text-gray-600";
  const value = isDark ? "text-white" : "text-gray-900";
  const cardBg = isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200";

  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const dateShort = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
    catch { return "—"; }
  };

  if (err) return <div className={`text-xs ${label}`}>Live stats unavailable ({err})</div>;
  if (!stats) return <div className={`text-xs ${label}`} data-testid="rg-widget-loading">Loading live restaurant stats…</div>;

  const cells = [
    { icon: Utensils,   label: "Restaurants", value: stats.restaurants, testid: "rg-widget-restaurants" },
    { icon: Bookmark,   label: "Wish list",   value: stats.wishlist,    testid: "rg-widget-wishlist" },
    { icon: TrendingUp, label: "Spend / mo",  value: money(stats.spendMonth), testid: "rg-widget-spend-month" },
    { icon: Star,       label: "Reviews",     value: stats.reviews,     testid: "rg-widget-reviews" },
    { icon: Ticket,     label: "Coupons",     value: stats.coupons,     testid: "rg-widget-coupons" },
  ];

  return (
    <div className="flex flex-col gap-2" data-testid="rg-widget">
      <div className="grid grid-cols-3 gap-2">
        {cells.map((c) => (
          <div key={c.label} className={`${cardBg} rounded-lg p-2`} data-testid={c.testid}>
            <div className="flex items-center gap-1.5">
              <c.icon className="w-3 h-3 text-amber-400" />
              <div className={`text-[9px] uppercase tracking-wider ${label}`}>{c.label}</div>
            </div>
            <div className={`text-sm font-semibold mt-0.5 ${value}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* 6-month spend sparkline */}
      <SpendSparkline buckets={stats.trend} isDark={isDark} />

      <div className={`${cardBg} rounded-lg p-2`} data-testid="rg-widget-last-order">
        <div className="flex items-center gap-1.5">
          <Truck className="w-3 h-3 text-amber-400" />
          <div className={`text-[9px] uppercase tracking-wider ${label}`}>Last order</div>
        </div>
        {stats.last ? (
          <div className={`text-xs mt-0.5 ${value}`}>
            <span className="font-semibold">{stats.last.restaurant || "Restaurant"}</span>
            <span className={`ml-2 ${label}`}>{dateShort(stats.last.date)}</span>
            <span className={`ml-2 ${label}`}>· {money(stats.last.total)}</span>
          </div>
        ) : (
          <div className={`text-xs mt-0.5 ${label}`}>No orders yet</div>
        )}
      </div>
    </div>
  );
}

/**
 * Tiny SVG sparkline of the last 6 calendar months of order spend.
 * No external chart lib — computed inline from the `buckets` array.
 */
function SpendSparkline({ buckets, isDark }) {
  const label = isDark ? "text-slate-300" : "text-gray-600";
  const value = isDark ? "text-white" : "text-gray-900";
  const cardBg = isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200";
  const totals = (buckets || []).map((b) => b.total);
  const maxV = Math.max(...totals, 1); // avoid 0-division
  const W = 200;
  const H = 34;
  const pad = 2;
  const step = totals.length > 1 ? (W - pad * 2) / (totals.length - 1) : 0;
  const points = totals.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / maxV) * (H - pad * 2);
    return [x, y];
  });
  const pathD = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const areaD = `${pathD} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z`;

  const money = (n) => `$${(Number(n) || 0).toFixed(0)}`;
  const total6 = totals.reduce((a, b) => a + b, 0);

  return (
    <div className={`${cardBg} rounded-lg p-2`} data-testid="rg-widget-sparkline">
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3 text-amber-400" />
        <div className={`text-[9px] uppercase tracking-wider ${label}`}>Last 6 months · {money(total6)}</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8 mt-1" role="img" aria-label="6-month spend trend">
        <defs>
          <linearGradient id="rg-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {totals.some((v) => v > 0) ? (
          <>
            <path d={areaD} fill="url(#rg-spark-fill)" />
            <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            {points.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.6" fill="#fbbf24" />
            ))}
          </>
        ) : (
          <text x={W / 2} y={H / 2 + 3} textAnchor="middle" fontSize="9" fill={isDark ? "#64748b" : "#94a3b8"}>No spend yet</text>
        )}
      </svg>
      <div className={`flex justify-between mt-0.5 text-[8px] uppercase tracking-wider ${label}`}>
        {(buckets || []).map((b, i) => (
          <span key={i} className={i === (buckets.length - 1) ? value + " font-semibold" : ""}>{b.label}</span>
        ))}
      </div>
    </div>
  );
}
