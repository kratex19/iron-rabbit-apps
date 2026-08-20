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
          return { year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString(undefined, { month: "short" }), total: 0, count: 0 };
        });
        for (const o of sorted) {
          const d = new Date(o.date || o.created_at || 0);
          const b = buckets.find((x) => x.year === d.getFullYear() && x.month === d.getMonth());
          if (b) {
            const t = Number(o.total || 0);
            if (Number.isFinite(t)) b.total += t;
            b.count += 1;
          }
        }

        // "This month" is the last bucket
        const spendMonth = buckets[buckets.length - 1].total;

        // Weekly streak: count consecutive ISO-weeks (going back from *this week*)
        // where at least one order was recorded. Break on the first empty week —
        // UNLESS the user has a "streak freeze" available for the current
        // calendar month (Duolingo-style). One freeze is granted per calendar
        // month; the freeze is auto-consumed the moment a gap week would
        // otherwise break the streak, and the ledger is persisted so a second
        // reload doesn't double-charge or re-award it.
        const weekKey = (d) => {
          const t = new Date(d);
          t.setHours(0, 0, 0, 0);
          // Adjust to Monday of the week
          const day = (t.getDay() + 6) % 7; // 0=Mon..6=Sun
          t.setDate(t.getDate() - day);
          return t.getTime();
        };
        const orderWeeks = new Set(
          (sorted || [])
            .map((o) => o.date || o.created_at)
            .filter(Boolean)
            .map((d) => weekKey(d))
        );

        // Streak-freeze ledger — per calendar month. Shape:
        // { "YYYY-MM": true } means that month's freeze has been consumed.
        const FREEZE_LEDGER_KEY = "iron_rabbit_rg_freeze_ledger_v1";
        const monthKey = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        let ledger = {};
        try {
          const raw = localStorage.getItem(FREEZE_LEDGER_KEY);
          if (raw) ledger = JSON.parse(raw) || {};
        } catch { /* private mode */ }
        const currentMonthKey = monthKey(new Date());
        let freezeUsedThisMonth = !!ledger[currentMonthKey];

        let streakWeeks = 0;
        let freezeAppliedNow = false;
        const cursor = new Date();
        cursor.setHours(0, 0, 0, 0);
        // If current week has no orders yet, streak still counts from last-active
        // week (so a Monday-morning check doesn't reset the streak).
        while (streakWeeks < 260) {
          const k = weekKey(cursor);
          if (orderWeeks.has(k)) {
            streakWeeks += 1;
            cursor.setDate(cursor.getDate() - 7);
          } else if (streakWeeks === 0) {
            // Give this week a grace period — roll back to previous week
            cursor.setDate(cursor.getDate() - 7);
            const kPrev = weekKey(cursor);
            if (!orderWeeks.has(kPrev)) break;
          } else if (!freezeUsedThisMonth) {
            // Consume the current month's freeze to skip this gap.
            freezeUsedThisMonth = true;
            freezeAppliedNow = true;
            cursor.setDate(cursor.getDate() - 7);
          } else {
            break;
          }
        }

        // Persist freeze consumption ONLY when we actually used it during this
        // computation. This prevents accidentally burning a freeze on load
        // when the user has no active streak or when the freeze wasn't needed.
        if (freezeAppliedNow) {
          ledger[currentMonthKey] = true;
          try { localStorage.setItem(FREEZE_LEDGER_KEY, JSON.stringify(ledger)); } catch { /* noop */ }
        }
        const freezeAvailable = !freezeUsedThisMonth;

        // "Freezes used this year" — a rolling annual consistency stat. Counts
        // how many calendar months in the current year have consumed their
        // freeze. Max = number of months elapsed so far (so early-January
        // shows 0/1, mid-December shows N/12).
        const nowYear = new Date().getFullYear();
        const yearPrefix = `${nowYear}-`;
        const freezesUsedThisYear = Object.keys(ledger).filter(
          (k) => k.startsWith(yearPrefix) && ledger[k]
        ).length;
        const freezesGrantedThisYear = new Date().getMonth() + 1; // 1..12

        // Freeze Streak Trophies — awarded once, permanently, for finishing a
        // *past* calendar year with zero freezes consumed. To avoid gifting
        // trophies retroactively for years the user wasn't using the app, we
        // only award for years that (a) had at least one order logged AND
        // (b) have no entries in the freeze ledger for any month of that year.
        //
        // Trophy store shape: { "YYYY": { awarded_at: ISOString } }
        const TROPHY_KEY = "iron_rabbit_rg_freeze_trophies_v1";
        let trophyStore = {};
        try {
          const raw = localStorage.getItem(TROPHY_KEY);
          if (raw) trophyStore = JSON.parse(raw) || {};
        } catch { /* private mode */ }

        // Collect years the user has been active in (has any order logged).
        const orderYears = new Set();
        for (const o of (sorted || [])) {
          const d = new Date(o.date || o.created_at || 0);
          const yr = d.getFullYear();
          if (Number.isFinite(yr) && yr > 1970) orderYears.add(yr);
        }

        const newlyAwardedYears = [];
        const currentYear = nowYear;
        for (const yr of orderYears) {
          if (yr >= currentYear) continue; // only past, completed years
          const yrPrefix = `${yr}-`;
          const usedThatYear = Object.keys(ledger).some(
            (k) => k.startsWith(yrPrefix) && ledger[k]
          );
          if (!usedThatYear && !trophyStore[String(yr)]) {
            trophyStore[String(yr)] = { awarded_at: new Date().toISOString() };
            newlyAwardedYears.push(yr);
          }
        }
        if (newlyAwardedYears.length > 0) {
          try { localStorage.setItem(TROPHY_KEY, JSON.stringify(trophyStore)); } catch { /* noop */ }
        }
        // Sorted list of earned trophy years (newest first) for UI rendering.
        const trophies = Object.keys(trophyStore)
          .map((y) => ({ year: parseInt(y, 10), awarded_at: trophyStore[y]?.awarded_at || null }))
          .filter((t) => Number.isFinite(t.year))
          .sort((a, b) => b.year - a.year);

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
            streakWeeks,
            freezeAvailable,
            freezeUsedThisMonth,
            freezesUsedThisYear,
            freezesGrantedThisYear,
            currentYear: nowYear,
            trophies,
            newlyAwardedTrophyYears: newlyAwardedYears,
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
