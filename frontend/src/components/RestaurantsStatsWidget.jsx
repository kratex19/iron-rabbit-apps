import React, { useEffect, useState } from "react";
import { Utensils, TrendingUp, Star, Bookmark, Truck, Ticket } from "lucide-react";
import restaurantsService from "../storage/restaurantsService";

/**
 * Live-data widget rendered inside a note tile when
 * note.special_action === "restaurants_stats_widget".
 *
 * Pulls counts + spend directly from the restaurants IndexedDB stores.
 * Refreshes on mount (which happens each time the accordion row expands).
 */
export default function RestaurantsStatsWidget({ isDark = true }) {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [restaurants, wishlist, orders, reviews, coupons] = await Promise.all([
          restaurantsService.listRestaurants({ includeArchived: false, includeHidden: true }),
          restaurantsService.listWishlist(),
          restaurantsService.listOrders(),
          restaurantsService.listReviews().catch(() => []),
          restaurantsService.listCoupons({ includeUsed: false, includeExpired: false }).catch(() => []),
        ]);

        // Sort orders by date desc so [0] is the most recent
        const sortedOrders = [...(orders || [])].sort((a, b) => {
          const da = new Date(a.date || a.created_at || 0).getTime();
          const db = new Date(b.date || b.created_at || 0).getTime();
          return db - da;
        });
        const last = sortedOrders[0] || null;

        // Sum of orders whose date is in the current calendar month
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const spendMonth = sortedOrders.reduce((sum, o) => {
          const d = new Date(o.date || o.created_at || 0);
          if (d.getFullYear() === y && d.getMonth() === m) {
            const t = Number(o.total || 0);
            return sum + (Number.isFinite(t) ? t : 0);
          }
          return sum;
        }, 0);

        // Resolve last-order restaurant name (best-effort)
        let lastRestName = "";
        if (last?.restaurant_id) {
          const r = (restaurants || []).find((x) => x.id === last.restaurant_id);
          lastRestName = r?.name || "";
        }

        if (!cancelled) {
          setStats({
            restaurants: (restaurants || []).length,
            wishlist: (wishlist || []).length,
            reviews: (reviews || []).length,
            coupons: (coupons || []).length,
            spendMonth,
            last: last ? {
              date: last.date || last.created_at,
              restaurant: lastRestName,
              total: Number(last.total || 0),
            } : null,
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || String(e));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const label = isDark ? "text-slate-300" : "text-gray-600";
  const value = isDark ? "text-white" : "text-gray-900";
  const cardBg = isDark ? "bg-white/5 border border-white/10" : "bg-gray-50 border border-gray-200";

  const money = (n) => `$${(Number(n) || 0).toFixed(2)}`;
  const dateShort = (d) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
    catch { return "—"; }
  };

  if (err) return (
    <div className={`text-xs ${label}`}>Live stats unavailable ({err})</div>
  );
  if (!stats) return (
    <div className={`text-xs ${label}`} data-testid="rg-widget-loading">Loading live restaurant stats…</div>
  );

  const cells = [
    { icon: Utensils,   label: "Restaurants", value: stats.restaurants, testid: "rg-widget-restaurants" },
    { icon: Bookmark,   label: "Wish list",   value: stats.wishlist,    testid: "rg-widget-wishlist" },
    { icon: TrendingUp, label: "Spend this month", value: money(stats.spendMonth), testid: "rg-widget-spend-month" },
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
