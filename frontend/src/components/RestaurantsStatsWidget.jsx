import React, { useState } from "react";
import { Utensils, TrendingUp, Star, Bookmark, Truck, Ticket, DollarSign, ShoppingBag } from "lucide-react";
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
  // Toggle between "spend" (monthly $ total) and "orders" (monthly visit count).
  const [mode, setMode] = useState("spend");
  const isSpend = mode === "spend";
  const values = (buckets || []).map((b) => (isSpend ? b.total : b.count));
  const maxV = Math.max(...values, 1); // avoid 0-division
  const W = 200;
  const H = 34;
  const pad = 2;
  const step = values.length > 1 ? (W - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / maxV) * (H - pad * 2);
    return [x, y];
  });
  const pathD = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const areaD = `${pathD} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z`;

  const money = (n) => `$${(Number(n) || 0).toFixed(0)}`;
  const total6 = values.reduce((a, b) => a + b, 0);
  const formattedTotal = isSpend ? money(total6) : `${total6} order${total6 === 1 ? "" : "s"}`;
  const showDot = (v) => (isSpend ? v > 0 : v > 0);

  // Tapping a dot opens the Orders workspace filtered to that month.
  const jumpToMonth = (b) => {
    if (!b) return;
    window.dispatchEvent(new CustomEvent("rg:open-orders", {
      detail: { year: b.year, month: b.month, label: b.label },
    }));
  };

  const toggleBtn = (m, Icon, text) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      data-testid={`rg-widget-sparkline-mode-${m}`}
      aria-pressed={mode === m}
      className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-[9px] font-semibold uppercase tracking-wide transition-colors ${
        mode === m
          ? (isDark ? "bg-amber-400/20 text-amber-200" : "bg-amber-100 text-amber-800")
          : (isDark ? "text-slate-400 hover:bg-white/5" : "text-gray-500 hover:bg-gray-200")
      }`}
    >
      <Icon className="w-2.5 h-2.5" /> {text}
    </button>
  );

  return (
    <div className={`${cardBg} rounded-lg p-2`} data-testid="rg-widget-sparkline">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TrendingUp className="w-3 h-3 text-amber-400" />
        <div className={`text-[9px] uppercase tracking-wider ${label}`}>Last 6 months · {formattedTotal}</div>
        <div className="flex-1" />
        <div className={`inline-flex items-center rounded-md p-0.5 gap-0.5 ${isDark ? "bg-black/25" : "bg-white"}`}>
          {toggleBtn("spend", DollarSign, "Spend")}
          {toggleBtn("orders", ShoppingBag, "Orders")}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8 mt-1" role="img" aria-label={`6-month ${mode} trend`}>
        <defs>
          <linearGradient id="rg-spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {values.some((v) => v > 0) ? (
          <>
            <path d={areaD} fill="url(#rg-spark-fill)" />
            <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
            {points.map(([x, y], i) => (
              <g key={i} style={{ cursor: "pointer" }} onClick={() => jumpToMonth(buckets[i])} data-testid={`rg-spark-dot-${i}`}>
                <circle cx={x} cy={y} r="7" fill="transparent" />
                {showDot(values[i]) && <circle cx={x} cy={y} r="1.6" fill="#fbbf24">
                  <title>{`${buckets[i].label}: ${isSpend ? money(values[i]) : values[i] + " orders"}`}</title>
                </circle>}
              </g>
            ))}
          </>
        ) : (
          <text x={W / 2} y={H / 2 + 3} textAnchor="middle" fontSize="9" fill={isDark ? "#64748b" : "#94a3b8"}>
            {isSpend ? "No spend yet" : "No orders yet"}
          </text>
        )}
      </svg>
      <div className={`flex justify-between mt-0.5 text-[8px] uppercase tracking-wider ${label}`}>
        {(buckets || []).map((b, i) => (
          <button
            key={i}
            type="button"
            onClick={() => jumpToMonth(b)}
            data-testid={`rg-spark-label-${i}`}
            className={`px-1 rounded transition-colors hover:bg-white/10 ${i === (buckets.length - 1) ? `${value} font-semibold` : ""}`}
            style={{ border: 0, background: "transparent", cursor: "pointer", color: "inherit", fontSize: "inherit", lineHeight: "inherit" }}
          >
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
