import { useEffect, useMemo, useState } from "react";
import StorageService from "../../storage/storageService";

// Read-only aggregator of events from:
//   1. Iron Rabbit notes' `events[]` arrays (existing calendar shape)
//   2. Restaurants Galore's `restaurants[].birthdays[]`
//   3. Restaurants Galore's coupons with a future `expires_at`
//
// Does NOT write, edit, migrate, or subscribe to any changes. If any
// restaurant store lookup fails we silently swallow — this must never
// break the dashboard.
export default function useEvents() {
  const [notes, setNotes] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await StorageService.getAllNotes();
        if (!cancelled) setNotes(Array.isArray(all) ? all : []);
      } catch {
        if (!cancelled) setNotes([]);
      }
      // Optional: pull restaurants + coupons for extra events. We import
      // the service lazily so the dashboard can still work if it fails.
      try {
        const mod = await import("../../storage/restaurantsService");
        const svc = mod.default || mod.RestaurantsService || mod;
        // Discover the right list methods without hardcoding — we accept
        // any of a few common names to stay forward-compatible.
        const getRestaurants = svc.listRestaurants || svc.getRestaurants || svc.getAllRestaurants;
        const getCoupons = svc.listCoupons || svc.getCoupons || svc.getAllCoupons;
        if (typeof getRestaurants === "function") {
          const r = await getRestaurants();
          if (!cancelled) setRestaurants(Array.isArray(r) ? r : []);
        }
        if (typeof getCoupons === "function") {
          const c = await getCoupons();
          if (!cancelled) setCoupons(Array.isArray(c) ? c : []);
        }
      } catch { /* silent — RG events are opt-in bonus */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const events = useMemo(() => {
    const out = [];
    const now = new Date();

    // 1. Note events
    for (const n of notes) {
      if (n?.deleted_at || n?.archived_at) continue;
      const list = Array.isArray(n.events) ? n.events : [];
      for (const e of list) {
        const dt = new Date(e.datetime);
        if (isNaN(dt.getTime())) continue;
        out.push({
          id: e.id || `${n.id}-${e.datetime}`,
          title: e.title || n.title || "Untitled",
          datetime: dt,
          alarm_enabled: !!e.alarm_enabled,
          location: e.location || "",
          note_id: n.id,
          note_title: n.title || "Untitled",
          note_color: n.color || null,
          note_category: n.category || null,
          source: "note",
        });
      }
    }

    // 2. Restaurant birthdays → next occurrence (this year or next)
    for (const r of restaurants) {
      if (r?.archived || r?.hidden) continue;
      const list = Array.isArray(r.birthdays) ? r.birthdays : [];
      for (const b of list) {
        try {
          const bd = new Date(b.date);
          if (isNaN(bd.getTime())) continue;
          const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate(), 9, 0);
          const target = thisYear >= now ? thisYear : new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate(), 9, 0);
          out.push({
            id: `rg-bday-${r.id}-${b.name || "guest"}-${target.toISOString()}`,
            title: `🎂 ${b.name || "Birthday"}`,
            datetime: target,
            alarm_enabled: false,
            location: r.name || "",
            note_id: null,
            note_title: r.name || "Restaurants Galore",
            note_color: "#ec4899",
            note_category: "Restaurants",
            source: "restaurant_birthday",
          });
        } catch { /* ignore */ }
      }
    }

    // 3. Coupons expiring in the future
    for (const c of coupons) {
      if (!c || c.used || !c.expires_at) continue;
      const dt = new Date(c.expires_at);
      if (isNaN(dt.getTime()) || dt < now) continue;
      const restaurant = restaurants.find((r) => r.id === c.restaurant_id);
      out.push({
        id: `rg-coupon-${c.id}`,
        title: `Coupon expires: ${c.description || c.code || "Coupon"}`,
        datetime: dt,
        alarm_enabled: false,
        location: restaurant?.name || "",
        note_id: null,
        note_title: restaurant?.name || "Coupon",
        note_color: "#f59e0b",
        note_category: "Restaurants",
        source: "restaurant_coupon",
      });
    }

    // Dedupe by title + minute (protects against RG "sync to notes" duplicates)
    const seen = new Set();
    const deduped = [];
    for (const e of out) {
      const key = `${e.title.toLowerCase().trim()}|${Math.floor(e.datetime.getTime() / 60000)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(e);
    }

    deduped.sort((a, b) => a.datetime - b.datetime);
    return deduped;
  }, [notes, restaurants, coupons]);

  return { events, loading };
}
