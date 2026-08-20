import React, { useEffect, useRef, useState } from "react";
import { Utensils, TrendingUp, Star, Bookmark, Truck, Ticket, DollarSign, ShoppingBag, GitCompare, Snowflake, Trophy } from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
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

      {/* Freeze Inventory — consistency mini-stat */}
      <FreezeInventory stats={stats} isDark={isDark} />

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
 * Freeze Inventory Center — compact "Freezes used YYYY: N/12" row shown
 * inside the Live Stats widget. Includes a 12-dot capacity bar so long-
 * streak users can see their consistency at a glance (each dot is one
 * month of the current year; filled = freeze consumed, hollow = clean).
 *
 * Also shows the "Freeze Streak Trophy" cabinet: a gold badge per past
 * calendar year the user finished without consuming any freezes. Newly
 * awarded trophies pop with a confetti + toast celebration (once).
 */
function FreezeInventory({ stats, isDark }) {
  const label = isDark ? "text-slate-300" : "text-gray-600";
  const value = isDark ? "text-white" : "text-gray-900";
  const cardBg = isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200";
  const used = stats.freezesUsedThisYear ?? 0;
  const granted = stats.freezesGrantedThisYear ?? 12;
  const year = stats.currentYear ?? new Date().getFullYear();
  const trophies = stats.trophies || [];
  const clean = granted - used;
  const dots = Array.from({ length: 12 }, (_, i) => i < used ? "used" : (i < granted ? "clean" : "future"));
  const dotClass = (state) => {
    if (state === "used") return isDark ? "bg-sky-400/80" : "bg-sky-500";
    if (state === "clean") return isDark ? "bg-white/25" : "bg-gray-300";
    return isDark ? "bg-white/5" : "bg-gray-200";
  };

  // Celebrate any trophies that were awarded during this hook load.
  const celebratedRef = useRef(false);
  useEffect(() => {
    if (celebratedRef.current) return;
    const fresh = stats.newlyAwardedTrophyYears || [];
    if (fresh.length === 0) return;
    celebratedRef.current = true;
    const list = fresh.slice().sort((a, b) => b - a);
    toast.success(`🏆 Freeze Streak Trophy${list.length > 1 ? "s" : ""} unlocked!`, {
      description: `${list.join(", ")} — a full calendar year with zero freezes used. Consistency legend.`,
      duration: 6500,
    });
    confetti({
      particleCount: 120,
      spread: 85,
      startVelocity: 48,
      origin: { x: 0.5, y: 0.15 },
      colors: ["#fbbf24", "#f59e0b", "#eab308", "#fef3c7", "#facc15"],
      zIndex: 400,
    });
    setTimeout(() => {
      confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0.05, y: 0.6 }, colors: ["#fbbf24", "#f59e0b"], zIndex: 400 });
      confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 0.95, y: 0.6 }, colors: ["#fbbf24", "#f59e0b"], zIndex: 400 });
    }, 220);
  }, [stats.newlyAwardedTrophyYears]);

  const explainTrophy = (yr) => {
    toast(`🏆 ${yr} · Freeze Streak Trophy`, {
      description: `You finished ${yr} without needing a single freeze. Nothing but clean weeks.`,
      duration: 4200,
    });
  };

  const trophyChipCls = isDark
    ? "bg-amber-400/15 text-amber-200 hover:bg-amber-400/25 border-amber-400/30"
    : "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300";

  return (
    <div className={`${cardBg} rounded-lg p-2`} data-testid="rg-widget-freeze-inventory">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Snowflake className="w-3 h-3 text-sky-400" />
        <div className={`text-[9px] uppercase tracking-wider ${label}`}>Freezes used · {year}</div>
        <div className="flex-1" />
        <div className={`text-[10px] font-mono ${value}`} data-testid="rg-widget-freeze-count">
          <span className={isDark ? "text-sky-300" : "text-sky-700"}>{used}</span>
          <span className={label}>/{granted}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1.5" aria-label={`${used} of ${granted} freezes consumed this year`}>
        {dots.map((state, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${dotClass(state)}`}
            title={`${new Date(year, i, 1).toLocaleDateString(undefined, { month: "short" })} ${year}`}
            data-testid={`rg-widget-freeze-dot-${i}`}
          />
        ))}
      </div>
      <div className={`text-[9px] mt-1 ${label}`}>
        {clean === granted
          ? "Perfect year — no freezes used yet."
          : clean > 0
            ? `${clean} clean month${clean === 1 ? "" : "s"} · ${used} auto-forgiven gap${used === 1 ? "" : "s"}.`
            : `Every month this year needed a freeze — nice save.`}
      </div>

      {/* Trophy cabinet — one chip per past year finished with zero freezes. */}
      {trophies.length > 0 && (
        <div className="mt-2 pt-2 border-t border-white/5" data-testid="rg-widget-trophy-cabinet">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <div className={`text-[9px] uppercase tracking-wider ${label}`}>Freeze Streak Trophies</div>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {trophies.map((t) => (
              <button
                key={t.year}
                type="button"
                onClick={() => explainTrophy(t.year)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ${trophyChipCls}`}
                title={`${t.year} — zero freezes used. Tap for details.`}
                data-testid={`rg-widget-trophy-${t.year}`}
              >
                <Trophy className="w-2.5 h-2.5" />
                {t.year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tiny SVG sparkline of the last 6 calendar months of order data.
 * No external chart lib — computed inline from the `buckets` array.
 *
 * Modes:
 *  - "spend"   → single filled area of monthly $ totals (amber)
 *  - "orders"  → single line of monthly order counts (amber)
 *  - "compare" → dual-axis overlay: spend (emerald filled) + orders (amber
 *                dashed line), each scaled to its own y-axis so the two very
 *                different magnitudes can be visually compared.
 */
function SpendSparkline({ buckets, isDark }) {
  const label = isDark ? "text-slate-300" : "text-gray-600";
  const value = isDark ? "text-white" : "text-gray-900";
  const cardBg = isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200";
  // Toggle between "spend" (monthly $ total), "orders" (monthly visit count),
  // and "compare" (both series drawn together with a dual y-axis).
  const [mode, setMode] = useState("spend");
  const isCompare = mode === "compare";
  const isSpend = mode === "spend";
  const spendVals = (buckets || []).map((b) => b.total);
  const orderVals = (buckets || []).map((b) => b.count);
  const values = isSpend ? spendVals : orderVals; // single-mode primary series
  const maxSpend = Math.max(...spendVals, 1);
  const maxOrders = Math.max(...orderVals, 1);
  const maxV = Math.max(...values, 1); // avoid 0-division (single mode only)
  const W = 200;
  const H = 34;
  const pad = 2;
  const n = (buckets || []).length;
  const step = n > 1 ? (W - pad * 2) / (n - 1) : 0;
  const buildPoints = (vals, max) => vals.map((v, i) => {
    const x = pad + i * step;
    const y = H - pad - (v / max) * (H - pad * 2);
    return [x, y];
  });
  const points = buildPoints(values, maxV);
  const spendPoints = buildPoints(spendVals, maxSpend);
  const orderPoints = buildPoints(orderVals, maxOrders);
  const toPath = (pts) => pts.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const pathD = toPath(points);
  const areaD = points.length ? `${pathD} L${points[points.length - 1][0]},${H} L${points[0][0]},${H} Z` : "";
  const spendPathD = toPath(spendPoints);
  const spendAreaD = spendPoints.length ? `${spendPathD} L${spendPoints[spendPoints.length - 1][0]},${H} L${spendPoints[0][0]},${H} Z` : "";
  const orderPathD = toPath(orderPoints);

  const money = (n) => `$${(Number(n) || 0).toFixed(0)}`;
  const totalSpend = spendVals.reduce((a, b) => a + b, 0);
  const totalOrders = orderVals.reduce((a, b) => a + b, 0);
  const formattedTotal = isCompare
    ? `${money(totalSpend)} · ${totalOrders} orders`
    : (isSpend ? money(totalSpend) : `${totalOrders} order${totalOrders === 1 ? "" : "s"}`);

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

  const emerald = "#10b981";
  const amber = "#fbbf24";
  const hasAny = spendVals.some((v) => v > 0) || orderVals.some((v) => v > 0);

  return (
    <div className={`${cardBg} rounded-lg p-2`} data-testid="rg-widget-sparkline">
      <div className="flex items-center gap-1.5 flex-wrap">
        <TrendingUp className="w-3 h-3 text-amber-400" />
        <div className={`text-[9px] uppercase tracking-wider ${label}`}>Last 6 months · {formattedTotal}</div>
        <div className="flex-1" />
        <div className={`inline-flex items-center rounded-md p-0.5 gap-0.5 ${isDark ? "bg-black/25" : "bg-white"}`}>
          {toggleBtn("spend", DollarSign, "Spend")}
          {toggleBtn("orders", ShoppingBag, "Orders")}
          {toggleBtn("compare", GitCompare, "Both")}
        </div>
      </div>
      {isCompare && hasAny && (
        <div className="flex items-center gap-2 mt-1 text-[9px]">
          <span className="inline-flex items-center gap-1" style={{ color: emerald }}>
            <span className="inline-block w-2 h-2 rounded-sm" style={{ background: emerald }} /> Spend $ (left)
          </span>
          <span className="inline-flex items-center gap-1" style={{ color: amber }}>
            <span className="inline-block w-3 h-[2px]" style={{ background: amber, borderTop: `2px dashed ${amber}` }} /> Orders # (right)
          </span>
        </div>
      )}
      <div className="relative">
        {isCompare && hasAny && (
          <>
            <div
              className="absolute left-0 top-0 text-[8px] font-mono leading-none"
              style={{ color: emerald }}
              aria-hidden
            >{money(maxSpend)}</div>
            <div
              className="absolute right-0 top-0 text-[8px] font-mono leading-none"
              style={{ color: amber }}
              aria-hidden
            >{maxOrders}</div>
            <div
              className="absolute left-0 bottom-0 text-[8px] font-mono leading-none opacity-70"
              style={{ color: emerald }}
              aria-hidden
            >$0</div>
            <div
              className="absolute right-0 bottom-0 text-[8px] font-mono leading-none opacity-70"
              style={{ color: amber }}
              aria-hidden
            >0</div>
          </>
        )}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-8 mt-1" role="img" aria-label={`6-month ${mode} trend`}>
          <defs>
            <linearGradient id="rg-spark-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="rg-spark-fill-emerald" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={emerald} stopOpacity="0.45" />
              <stop offset="100%" stopColor={emerald} stopOpacity="0" />
            </linearGradient>
          </defs>
          {hasAny ? (
            isCompare ? (
              <>
                {/* Spend series — filled emerald area + solid line */}
                <path d={spendAreaD} fill="url(#rg-spark-fill-emerald)" />
                <path d={spendPathD} fill="none" stroke={emerald} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                {/* Orders series — dashed amber overlay */}
                <path d={orderPathD} fill="none" stroke={amber} strokeWidth="1.5" strokeDasharray="3 2" strokeLinejoin="round" strokeLinecap="round" />
                {/* Combined hit targets — tapping any month opens Orders */}
                {spendPoints.map(([x], i) => (
                  <g key={i} style={{ cursor: "pointer" }} onClick={() => jumpToMonth(buckets[i])} data-testid={`rg-spark-dot-${i}`}>
                    <rect x={x - step / 2} y="0" width={step || 8} height={H} fill="transparent" />
                    {spendVals[i] > 0 && <circle cx={x} cy={spendPoints[i][1]} r="1.6" fill={emerald}>
                      <title>{`${buckets[i].label}: ${money(spendVals[i])} · ${orderVals[i]} order${orderVals[i] === 1 ? "" : "s"}`}</title>
                    </circle>}
                    {orderVals[i] > 0 && <circle cx={x} cy={orderPoints[i][1]} r="1.6" fill={amber} />}
                  </g>
                ))}
              </>
            ) : (
              <>
                <path d={areaD} fill="url(#rg-spark-fill)" />
                <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                {points.map(([x, y], i) => (
                  <g key={i} style={{ cursor: "pointer" }} onClick={() => jumpToMonth(buckets[i])} data-testid={`rg-spark-dot-${i}`}>
                    <circle cx={x} cy={y} r="7" fill="transparent" />
                    {values[i] > 0 && <circle cx={x} cy={y} r="1.6" fill="#fbbf24">
                      <title>{`${buckets[i].label}: ${isSpend ? money(values[i]) : values[i] + " orders"}`}</title>
                    </circle>}
                  </g>
                ))}
              </>
            )
          ) : (
            <text x={W / 2} y={H / 2 + 3} textAnchor="middle" fontSize="9" fill={isDark ? "#64748b" : "#94a3b8"}>
              {isCompare ? "No orders yet" : isSpend ? "No spend yet" : "No orders yet"}
            </text>
          )}
        </svg>
      </div>
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
