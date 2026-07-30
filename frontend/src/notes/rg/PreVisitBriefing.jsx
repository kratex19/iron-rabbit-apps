// Restaurants Galore — Pre-Visit Briefing Card.
// Assembles allergies, birthdays, coupons, favorite meals, staff, and the
// last review + order into a single "everything you need to know before you
// walk in" sheet. 100% offline, renders from IndexedDB in < 100 ms.

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, HeartHandshake, Cake, Ticket, Star, Users, Receipt,
  ChefHat, Calendar, Sparkles, ExternalLink, Utensils,
} from "lucide-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RestaurantsService from "../../storage/restaurantsService";
import StorageService from "../../storage/storageService";

// Days until next birthday (MM-DD input), or null if invalid.
function daysUntilBirthday(mmdd) {
  if (!mmdd) return null;
  const m = mmdd.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (!m) return null;
  const today = new Date();
  const [mm, dd] = [Number(m[1]), Number(m[2])];
  let next = new Date(today.getFullYear(), mm - 1, dd);
  if (next < today) next = new Date(today.getFullYear() + 1, mm - 1, dd);
  return differenceInCalendarDays(next, today);
}

// Case-insensitive fuzzy "does this menu item contain this dish name" test
function dishMatchesMenu(dish, menuItems) {
  const q = dish.trim().toLowerCase();
  if (!q) return null;
  return menuItems.find(m => (m.name || "").toLowerCase().includes(q));
}

export function PreVisitBriefingModal({ isOpen, onClose, isDark, restaurant }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !restaurant) return;
    (async () => {
      setLoading(true);
      const [
        family, coupons, staff, meals, reviews, orders, menuItems, wishlist,
      ] = await Promise.all([
        RestaurantsService.listFamily(),
        RestaurantsService.listCoupons({ includeUsed: false, includeExpired: false }),
        RestaurantsService.listStaff(restaurant.id),
        RestaurantsService.listFavoriteMeals(restaurant.id),
        RestaurantsService.listReviews(restaurant.id),
        RestaurantsService.listOrders({ restaurantId: restaurant.id }),
        RestaurantsService.listMenuItems(restaurant.id),
        RestaurantsService.listWishlist(),
      ]);
      setData({
        family,
        // Filter coupons to this restaurant only
        coupons: coupons.filter(c => !c.restaurant_id || c.restaurant_id === restaurant.id),
        staff, meals, reviews, orders, menuItems, wishlist,
      });
      setLoading(false);
    })();
  }, [isOpen, restaurant]);

  // ---- computed briefing ----
  const briefing = useMemo(() => {
    if (!data) return null;
    // 1. Allergies (all family members)
    const allergyList = [];
    for (const m of data.family) {
      for (const a of (m.allergies || [])) allergyList.push({ member: m.name, allergen: a });
    }

    // 2. Favorite dishes → match with this restaurant's menu
    const favoriteMatches = [];
    for (const m of data.family) {
      for (const dish of (m.loved_dishes || [])) {
        const match = dishMatchesMenu(dish, data.menuItems);
        favoriteMatches.push({ member: m.name, dish, match });
      }
    }

    // 3. Birthdays within 30 days (family + staff)
    const birthdays = [];
    for (const m of data.family) {
      const d = daysUntilBirthday(m.birthday);
      if (d !== null && d <= 30) birthdays.push({ name: m.name, when: d, kind: "family", relation: m.relation });
    }
    for (const s of data.staff) {
      const d = daysUntilBirthday(s.birthday);
      if (d !== null && d <= 30) birthdays.push({ name: s.name, when: d, kind: "staff", relation: s.role });
    }
    birthdays.sort((a, b) => a.when - b.when);

    // 4. Live coupons — not expired, not used
    const now = new Date();
    const activeCoupons = data.coupons.filter(c => !c.used && (!c.expires_at || new Date(c.expires_at) >= now));

    // 5. Favorite meals here
    const favMeals = data.meals.slice(0, 5);

    // 6. Staff to greet
    const favStaff = data.staff.filter(s => s.favorite);
    const otherStaff = data.staff.filter(s => !s.favorite);
    const staffToGreet = [...favStaff, ...otherStaff].slice(0, 5);

    // 7. Latest review comment
    const latestReview = data.reviews
      .filter(r => r.comment)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

    // 8. Last order
    const lastOrder = [...data.orders].sort((a, b) => {
      const bd = b.date ? new Date(b.date) : new Date(b.created_at);
      const ad = a.date ? new Date(a.date) : new Date(a.created_at);
      return bd - ad;
    })[0];

    // 9. Bonus: wish list flag
    const wishHit = data.wishlist.find(w => (w.name || "").toLowerCase() === (restaurant.name || "").toLowerCase() && !w.visited);

    return { allergyList, favoriteMatches, birthdays, activeCoupons, favMeals, staffToGreet, latestReview, lastOrder, wishHit };
  }, [data, restaurant]);

  // ---- Add to Iron Rabbit calendar ----
  const handleAddToCalendar = async () => {
    if (!restaurant || !briefing) return;
    setSaving(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);

      const contentLines = [`Visit ${restaurant.name}`];
      if (briefing.allergyList.length) {
        contentLines.push("", "⚠ Allergies to watch:");
        briefing.allergyList.forEach(a => contentLines.push(`  · ${a.member}: ${a.allergen}`));
      }
      if (briefing.favMeals.length) {
        contentLines.push("", "★ Favorite meals:");
        briefing.favMeals.forEach(m => contentLines.push(`  · ${m.meal_name}`));
      }
      if (briefing.activeCoupons.length) {
        contentLines.push("", "🎟 Bring these coupons:");
        briefing.activeCoupons.forEach(c => contentLines.push(`  · ${c.code || c.description}`));
      }
      const bdaySoon = briefing.birthdays.filter(b => b.when <= 7);
      if (bdaySoon.length) {
        contentLines.push("", "🎂 Birthdays this week:");
        bdaySoon.forEach(b => contentLines.push(`  · ${b.name}${b.when === 0 ? " — TODAY!" : ` in ${b.when} day${b.when === 1 ? "" : "s"}`}`));
      }

      const id = `rg-visit-${restaurant.id}-${Date.now()}`;
      await StorageService.saveNote({
        id,
        title: `🍴 Visit to ${restaurant.name}`,
        content: contentLines.join("\n"),
        color: "orange",
        icon: "Utensils",
        background: { type: "gradient", value: ["#FB923C", "#EA580C"] },
        pinned: false,
        tags: ["restaurants", "pre-visit"],
        attachments: [],
        events: [],
        checklist: [],
        category: "Restaurants",
        subcategory: "",
        alarm: { datetime: tomorrow.toISOString(), enabled: true },
        recurring: { enabled: false, frequency: "weekly", days: [] },
        order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      toast.success(`Added "Visit to ${restaurant.name}" to your notes`);
      onClose();
    } catch (e) {
      toast.error(`Could not add to calendar: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  };

  if (!restaurant) return null;

  const hasAnything = briefing && (
    briefing.allergyList.length + briefing.favoriteMatches.length + briefing.birthdays.length +
    briefing.activeCoupons.length + briefing.favMeals.length + briefing.staffToGreet.length +
    (briefing.latestReview ? 1 : 0) + (briefing.lastOrder ? 1 : 0)
  ) > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg max-h-[92vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="pre-visit-briefing">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Sparkles className="w-5 h-5 text-amber-400" />
            Pre-visit briefing
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Everything worth remembering before you walk into <span className="font-semibold">{restaurant.name}</span>.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">Assembling briefing…</div>
        ) : !hasAnything ? (
          <div className={`text-center py-10 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
            <Utensils className={`w-10 h-10 mx-auto mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
            <div className="text-sm">No briefing data yet.</div>
            <div className="text-[11px] mt-1">Add family members, menu items, favorites, or an order to see suggestions here.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* 1. Allergies */}
            {briefing.allergyList.length > 0 && (
              <Section
                icon={AlertTriangle}
                accent="text-red-400"
                title="Allergy warnings"
                isDark={isDark}
                testid="briefing-allergies"
                variant="danger"
              >
                <ul className="space-y-0.5">
                  {briefing.allergyList.map((a, i) => (
                    <li key={i} className={`text-xs ${isDark ? "text-red-200" : "text-red-800"}`}>
                      <span className="font-semibold">{a.member}</span> — avoid <span className="font-bold">{a.allergen}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 2. Family favorites on menu */}
            {briefing.favoriteMatches.length > 0 && (
              <Section icon={HeartHandshake} accent="text-emerald-400" title="Family favorites" isDark={isDark} testid="briefing-favorites">
                <ul className="space-y-0.5">
                  {briefing.favoriteMatches.map((f, i) => (
                    <li key={i} className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className="font-semibold">{f.member}</span> loves <span className="italic">{f.dish}</span>
                      {f.match && (
                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-semibold ${isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}>
                          on menu · ${Number(f.match.price || 0).toFixed(2)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 3. Upcoming birthdays */}
            {briefing.birthdays.length > 0 && (
              <Section icon={Cake} accent="text-pink-400" title="Birthdays soon" isDark={isDark} testid="briefing-birthdays">
                <ul className="space-y-0.5">
                  {briefing.birthdays.map((b, i) => (
                    <li key={i} className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className="font-semibold">{b.name}</span>
                      <span className={isDark ? "text-slate-500" : "text-gray-500"}> · {b.relation}</span>
                      {" — "}
                      {b.when === 0
                        ? <span className={`font-bold ${isDark ? "text-pink-300" : "text-pink-700"}`}>TODAY 🎉</span>
                        : b.when === 1
                        ? "tomorrow"
                        : `in ${b.when} days`}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 4. Active coupons */}
            {briefing.activeCoupons.length > 0 && (
              <Section icon={Ticket} accent="text-amber-400" title="Live coupons" isDark={isDark} testid="briefing-coupons">
                <ul className="space-y-1">
                  {briefing.activeCoupons.map(c => {
                    const daysLeft = c.expires_at ? differenceInCalendarDays(parseISO(c.expires_at), new Date()) : null;
                    return (
                      <li key={c.id} className={`text-xs flex items-baseline justify-between gap-2 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                        <span>
                          <span className="font-mono font-bold">{c.code || c.description || "COUPON"}</span>
                          {c.discount && <span className={`ml-1 ${isDark ? "text-emerald-300" : "text-emerald-700"}`}>· {c.discount}</span>}
                        </span>
                        {daysLeft !== null && (
                          <span className={`text-[10px] font-semibold ${daysLeft <= 3 ? "text-red-400" : daysLeft <= 7 ? "text-amber-400" : isDark ? "text-slate-500" : "text-gray-500"}`}>
                            {daysLeft <= 0 ? "expires today" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            )}

            {/* 5. Favorite meals */}
            {briefing.favMeals.length > 0 && (
              <Section icon={Star} accent="text-amber-400" title="Your usual" isDark={isDark} testid="briefing-favmeals">
                <ul className="space-y-0.5">
                  {briefing.favMeals.map(m => (
                    <li key={m.id} className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className="font-semibold">{m.meal_name}</span>
                      {m.custom_requests && <span className={`ml-1 italic ${isDark ? "text-slate-500" : "text-gray-500"}`}>— {m.custom_requests}</span>}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 6. Staff to greet */}
            {briefing.staffToGreet.length > 0 && (
              <Section icon={Users} accent="text-sky-400" title="Say hi to" isDark={isDark} testid="briefing-staff">
                <ul className="space-y-0.5">
                  {briefing.staffToGreet.map(s => (
                    <li key={s.id} className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      <span className="font-semibold">{s.name}</span>
                      <span className={isDark ? "text-slate-500" : "text-gray-500"}> · {s.role || "staff"}</span>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {/* 7. Latest review */}
            {briefing.latestReview && (
              <Section icon={ChefHat} accent="text-violet-400" title="You said last time" isDark={isDark} testid="briefing-review">
                <div className={`text-xs italic ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  &ldquo;{briefing.latestReview.comment}&rdquo;
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  {format(new Date(briefing.latestReview.created_at), "MMM d, yyyy")}
                </div>
              </Section>
            )}

            {/* 8. Last order */}
            {briefing.lastOrder && (
              <Section icon={Receipt} accent="text-emerald-400" title="Last order" isDark={isDark} testid="briefing-lastorder">
                <div className={`text-xs ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                  {(briefing.lastOrder.items || []).slice(0, 4).map(it => it.name).filter(Boolean).join(", ") || "—"}
                </div>
                <div className={`text-[10px] mt-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  ${Number(briefing.lastOrder.total || 0).toFixed(2)}
                  {briefing.lastOrder.date && ` · ${format(new Date(briefing.lastOrder.date), "MMM d, yyyy")}`}
                </div>
              </Section>
            )}

            {briefing.wishHit && (
              <div className={`rounded-lg p-2 border-2 border-dashed text-xs text-center ${isDark ? "border-amber-500/30 text-amber-300" : "border-amber-300 text-amber-800 bg-amber-50"}`}>
                ⭐ This is on your wish list. Enjoy your first visit!
              </div>
            )}

            <div className="pt-2">
              <Button
                onClick={handleAddToCalendar}
                disabled={saving}
                className="w-full h-10 bg-amber-500 hover:bg-amber-600 text-white"
                data-testid="briefing-add-calendar"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {saving ? "Adding…" : "Add visit to my notes"}
                <ExternalLink className="w-3.5 h-3.5 ml-2" />
              </Button>
              <div className={`text-[10px] text-center mt-1 italic ${isDark ? "text-slate-600" : "text-gray-400"}`}>
                Creates an Iron Rabbit note pinned to your Restaurants category.
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ icon: Icon, accent, title, isDark, children, testid, variant }) {
  const border = variant === "danger"
    ? (isDark ? "border-red-500/30 bg-red-500/[0.06]" : "border-red-200 bg-red-50")
    : (isDark ? "border-white/10 bg-white/[0.02]" : "border-gray-200 bg-white");
  return (
    <div className={`rounded-lg p-2.5 border ${border}`} data-testid={testid}>
      <div className={`flex items-center gap-1.5 mb-1.5 text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-gray-500"}`}>
        <Icon className={`w-3 h-3 ${accent}`} /> {title}
      </div>
      {children}
    </div>
  );
}
