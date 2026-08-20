import { useEffect, useState } from "react";
import restaurantsService from "../storage/restaurantsService";

/**
 * Fetches Restaurants Galore workspace aggregates in one shot.
 * Used by both the collapsed-row Peek and the expanded Live Stats widget.
 *
 * Returns { stats, err } — stats stays null until first load.
 */
export default function useRestaurantStats() {
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

        const sorted = [...(orders || [])].sort((a, b) => {
          const da = new Date(a.date || a.created_at || 0).getTime();
          const db = new Date(b.date || b.created_at || 0).getTime();
          return db - da;
        });
        const last = sorted[0] || null;

        // Monthly spend across the last 6 calendar months (oldest → newest)
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const buckets = Array.from({ length: 6 }, (_, i) => {
          const d = new Date(y, m - (5 - i), 1);
          return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString(undefined, { month: "short" }), total: 0 };
        });
        for (const o of sorted) {
          const d = new Date(o.date || o.created_at || 0);
          const b = buckets.find((x) => x.year === d.getFullYear() && x.month === d.getMonth());
          if (b) {
            const t = Number(o.total || 0);
            if (Number.isFinite(t)) b.total += t;
          }
        }

        // "This month" is the last bucket
        const spendMonth = buckets[buckets.length - 1].total;

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
            trend: buckets,
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

  return { stats, err };
}
