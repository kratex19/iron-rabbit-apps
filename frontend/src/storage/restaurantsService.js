// Restaurants Galore™ — offline-first storage layer.
//
// Uses 7 separate localforage instances for rich schemas that don't fit
// the notes model. Every store is namespaced under the same 'IronRabbit'
// DB so backup/restore can iterate them by name.
//
// Data shapes (JSDoc reference):
//
// Restaurant
//   { id, name, nickname, category, cuisine, phones[], website, online_url,
//     email, hours, holiday_hours, address, parking_notes,
//     tags: { drive_thru, delivery, pickup, reservations, outdoor_seating,
//             pet_friendly, wheelchair, kid_friendly },
//     notes, favorite: bool, hidden: bool, archived: bool,
//     favorite_parking, default_navigator, birthdays[],
//     created_at, updated_at }
//
// MenuItem
//   { id, restaurant_id, category, name, description, price, calories,
//     photo_id, available: bool, discontinued: bool,
//     price_history: [{ price, date }],
//     nutrition: { protein, fat, carbs, fiber, sugar, sodium },
//     diet: { vegetarian, vegan, keto, gluten_free, dairy_free },
//     allergies[], created_at, updated_at }
//
// FavoriteMeal
//   { id, restaurant_id, meal_name, drink, dessert, side, sauces[],
//     cooking_pref, custom_requests[], last_ordered_at, order_count,
//     created_at, updated_at }
//
// Order
//   { id, restaurant_id, date, time, order_number, items[],
//     subtotal, tax, tip, delivery_fee, discount, coupon_id, gift_card_id,
//     total, who_paid, split_bill[], payment_method, receipt_photo_id,
//     notes, created_at }
//
// Review
//   { id, restaurant_id, order_id, ratings: { food, service, cleanliness,
//     atmosphere, noise, portions, parking, value, packaging, accuracy, overall },
//     comment, photos[], created_at }
//
// Delivery
//   { id, order_id, restaurant_id, order_time, driver_name, delivery_time,
//     arrival_time, minutes, food_temp: 'hot'|'warm'|'cold',
//     packaging_quality, accuracy, driver_rating, created_at }
//
// Coupon
//   { id, restaurant_id, code, description, discount, expires_at,
//     used: bool, used_at, loyalty_number, created_at }

import localforage from "localforage";

const mkStore = (name) => localforage.createInstance({
  name: "IronRabbit",
  storeName: `rg_${name}`,
  description: `Restaurants Galore — ${name}`,
});

const restaurantsStore = mkStore("restaurants");
const menusStore       = mkStore("menus");
const favoriteMealsStore = mkStore("favorite_meals");
const ordersStore      = mkStore("orders");
const reviewsStore     = mkStore("reviews");
const deliveriesStore  = mkStore("deliveries");
const couponsStore     = mkStore("coupons");
const staffStore       = mkStore("staff");
const wishlistStore    = mkStore("wishlist");
const photosStore      = mkStore("photos");
const voiceJournalStore = mkStore("voice_journal");
const recipesStore     = mkStore("recipes");
const familyStore      = mkStore("family");

const rid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

async function iterAll(store) {
  const out = [];
  await store.iterate((v) => { out.push(v); });
  return out;
}

const RestaurantsService = {
  // ================= RESTAURANTS =================
  async listRestaurants({ includeArchived = false, includeHidden = true } = {}) {
    const all = await iterAll(restaurantsStore);
    return all
      .filter(r => (includeArchived || !r.archived) && (includeHidden || !r.hidden))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  },
  async getRestaurant(id) {
    return await restaurantsStore.getItem(id);
  },
  async saveRestaurant(r) {
    const now = new Date().toISOString();
    const record = {
      created_at: r.created_at || now,
      // defaults for missing fields
      phones: [],
      tags: {},
      favorite: false,
      hidden: false,
      archived: false,
      ...r,
      id: r.id || rid("rest"),
      updated_at: now,
    };
    await restaurantsStore.setItem(record.id, record);
    return record;
  },
  async deleteRestaurant(id) {
    // Cascade: remove menus + favorite meals + orders + reviews + deliveries + coupons + staff + photos for this restaurant
    for (const store of [menusStore, favoriteMealsStore, ordersStore, reviewsStore, deliveriesStore, couponsStore, staffStore, photosStore]) {
      const items = await iterAll(store);
      for (const it of items) {
        if (it.restaurant_id === id) await store.removeItem(it.id);
      }
    }
    await restaurantsStore.removeItem(id);
    return true;
  },

  // ================= MENUS =================
  async listMenuItems(restaurantId) {
    const all = await iterAll(menusStore);
    return all
      .filter(m => !restaurantId || m.restaurant_id === restaurantId)
      .sort((a, b) => (a.category || "").localeCompare(b.category || "") || (a.name || "").localeCompare(b.name || ""));
  },
  async saveMenuItem(item) {
    const now = new Date().toISOString();
    const existing = item.id ? await menusStore.getItem(item.id) : null;
    const history = existing?.price_history || [];
    // If price changed, snapshot old price into history
    if (existing && Number(existing.price) !== Number(item.price) && existing.price != null) {
      history.push({ price: Number(existing.price), date: existing.updated_at || now });
    }
    const record = {
      created_at: existing?.created_at || now,
      price_history: history,
      ...item,
      id: item.id || rid("menu"),
      updated_at: now,
    };
    await menusStore.setItem(record.id, record);
    return record;
  },
  async deleteMenuItem(id) {
    await menusStore.removeItem(id);
    return true;
  },

  // ================= FAVORITE MEALS =================
  async listFavoriteMeals(restaurantId) {
    const all = await iterAll(favoriteMealsStore);
    return all
      .filter(m => !restaurantId || m.restaurant_id === restaurantId)
      .sort((a, b) => (b.order_count || 0) - (a.order_count || 0));
  },
  async saveFavoriteMeal(m) {
    const now = new Date().toISOString();
    const record = {
      created_at: m.created_at || now,
      order_count: 0,
      ...m,
      id: m.id || rid("fav"),
      updated_at: now,
    };
    await favoriteMealsStore.setItem(record.id, record);
    return record;
  },
  async deleteFavoriteMeal(id) {
    await favoriteMealsStore.removeItem(id);
    return true;
  },

  // ================= ORDERS =================
  async listOrders({ restaurantId, since, until } = {}) {
    const all = await iterAll(ordersStore);
    return all
      .filter(o => (!restaurantId || o.restaurant_id === restaurantId))
      .filter(o => (!since || new Date(o.date) >= new Date(since)))
      .filter(o => (!until || new Date(o.date) <= new Date(until)))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },
  async saveOrder(o) {
    const record = {
      created_at: o.created_at || new Date().toISOString(),
      items: [],
      split_bill: [],
      ...o,
      id: o.id || rid("order"),
    };
    await ordersStore.setItem(record.id, record);
    return record;
  },
  async deleteOrder(id) {
    await ordersStore.removeItem(id);
    return true;
  },

  // ================= REVIEWS =================
  async listReviews(restaurantId) {
    const all = await iterAll(reviewsStore);
    return all
      .filter(r => !restaurantId || r.restaurant_id === restaurantId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },
  async saveReview(r) {
    const record = {
      created_at: r.created_at || new Date().toISOString(),
      ratings: {},
      photos: [],
      ...r,
      id: r.id || rid("rev"),
    };
    await reviewsStore.setItem(record.id, record);
    return record;
  },
  async deleteReview(id) {
    await reviewsStore.removeItem(id);
    return true;
  },

  // ================= DELIVERIES =================
  async listDeliveries(restaurantId) {
    const all = await iterAll(deliveriesStore);
    return all.filter(d => !restaurantId || d.restaurant_id === restaurantId);
  },
  async saveDelivery(d) {
    const record = {
      created_at: d.created_at || new Date().toISOString(),
      ...d,
      id: d.id || rid("del"),
    };
    await deliveriesStore.setItem(record.id, record);
    return record;
  },
  async deleteDelivery(id) {
    await deliveriesStore.removeItem(id);
    return true;
  },

  // ================= COUPONS =================
  async listCoupons({ includeUsed = true, includeExpired = true } = {}) {
    const now = new Date();
    const all = await iterAll(couponsStore);
    return all
      .filter(c => includeUsed || !c.used)
      .filter(c => includeExpired || !c.expires_at || new Date(c.expires_at) >= now)
      .sort((a, b) => {
        if (!a.expires_at) return 1;
        if (!b.expires_at) return -1;
        return new Date(a.expires_at) - new Date(b.expires_at);
      });
  },
  async saveCoupon(c) {
    const record = {
      created_at: c.created_at || new Date().toISOString(),
      used: false,
      ...c,
      id: c.id || rid("coup"),
    };
    await couponsStore.setItem(record.id, record);
    return record;
  },
  async deleteCoupon(id) {
    await couponsStore.removeItem(id);
    return true;
  },

  // ================= FAVORITE STAFF =================
  async listStaff(restaurantId) {
    const all = await iterAll(staffStore);
    return all
      .filter(s => !restaurantId || s.restaurant_id === restaurantId)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  },
  async saveStaff(s) {
    const now = new Date().toISOString();
    const record = {
      created_at: s.created_at || now,
      ...s,
      id: s.id || rid("staff"),
      updated_at: now,
    };
    await staffStore.setItem(record.id, record);
    return record;
  },
  async deleteStaff(id) {
    await staffStore.removeItem(id);
    return true;
  },

  // ================= WISH LIST =================
  async listWishlist() {
    const all = await iterAll(wishlistStore);
    return all.sort((a, b) => (a.priority || 99) - (b.priority || 99));
  },
  async saveWishlistItem(w) {
    const record = {
      created_at: w.created_at || new Date().toISOString(),
      visited: false,
      ...w,
      id: w.id || rid("wish"),
    };
    await wishlistStore.setItem(record.id, record);
    return record;
  },
  async deleteWishlistItem(id) {
    await wishlistStore.removeItem(id);
    return true;
  },

  // ================= PHOTOS =================
  async listPhotos({ restaurantId, orderId, reviewId } = {}) {
    const all = await iterAll(photosStore);
    return all
      .filter(p => !restaurantId || p.restaurant_id === restaurantId)
      .filter(p => !orderId || p.order_id === orderId)
      .filter(p => !reviewId || p.review_id === reviewId)
      .sort((a, b) => new Date(b.taken_at || b.created_at) - new Date(a.taken_at || a.created_at));
  },
  async savePhoto(p) {
    const record = {
      created_at: p.created_at || new Date().toISOString(),
      taken_at: p.taken_at || new Date().toISOString(),
      ...p,
      id: p.id || rid("photo"),
    };
    await photosStore.setItem(record.id, record);
    return record;
  },
  async deletePhoto(id) {
    await photosStore.removeItem(id);
    return true;
  },

  // ================= VOICE JOURNAL =================
  async listVoiceJournal(restaurantId) {
    const all = await iterAll(voiceJournalStore);
    return all
      .filter(v => !restaurantId || v.restaurant_id === restaurantId)
      .sort((a, b) => new Date(b.taken_at || b.created_at) - new Date(a.taken_at || a.created_at));
  },
  async saveVoiceJournalEntry(v) {
    const record = {
      created_at: v.created_at || new Date().toISOString(),
      taken_at: v.taken_at || new Date().toISOString(),
      ...v,
      id: v.id || rid("voice"),
    };
    await voiceJournalStore.setItem(record.id, record);
    return record;
  },
  async deleteVoiceJournalEntry(id) {
    await voiceJournalStore.removeItem(id);
    return true;
  },

  // ================= RECIPE RECREATION =================
  async listRecipes({ menuItemId, restaurantId } = {}) {
    const all = await iterAll(recipesStore);
    return all
      .filter(r => !menuItemId || r.menu_item_id === menuItemId)
      .filter(r => !restaurantId || r.restaurant_id === restaurantId)
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));
  },
  async saveRecipe(r) {
    const now = new Date().toISOString();
    const record = {
      created_at: r.created_at || now,
      ingredients: [],
      steps: [],
      tags: [],
      ...r,
      id: r.id || rid("recipe"),
      updated_at: now,
    };
    await recipesStore.setItem(record.id, record);
    return record;
  },
  async deleteRecipe(id) {
    await recipesStore.removeItem(id);
    return true;
  },

  // ================= FAMILY DINING =================
  async listFamily() {
    const all = await iterAll(familyStore);
    return all.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  },
  async saveFamilyMember(m) {
    const now = new Date().toISOString();
    const record = {
      created_at: m.created_at || now,
      allergies: [],
      dietary: [],
      loved_dishes: [],
      hated_dishes: [],
      ...m,
      id: m.id || rid("fam"),
      updated_at: now,
    };
    await familyStore.setItem(record.id, record);
    return record;
  },
  async deleteFamilyMember(id) {
    await familyStore.removeItem(id);
    return true;
  },

  // ================= AGGREGATE INSIGHTS =================
  async computeDashboardStats() {
    const [restaurants, orders, reviews, coupons] = await Promise.all([
      iterAll(restaurantsStore),
      iterAll(ordersStore),
      iterAll(reviewsStore),
      iterAll(couponsStore),
    ]);

    const activeRestaurants = restaurants.filter(r => !r.archived);
    const favoriteRestaurants = activeRestaurants.filter(r => r.favorite);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const monthOrders = orders.filter(o => new Date(o.date) >= monthStart);
    const yearOrders  = orders.filter(o => new Date(o.date) >= yearStart);

    const sum = (arr, key) => arr.reduce((s, o) => s + (Number(o[key]) || 0), 0);
    const monthly_spend = sum(monthOrders, "total");
    const yearly_spend  = sum(yearOrders, "total");
    const avg_meal_price = orders.length ? sum(orders, "total") / orders.length : 0;

    // Most recent 5 restaurants by last visit
    const recentVisits = orders
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(o => activeRestaurants.find(r => r.id === o.restaurant_id))
      .filter(Boolean);

    // Restaurants that have orders but no reviews
    const reviewedIds = new Set(reviews.map(r => r.restaurant_id));
    const orderedIds  = new Set(orders.map(o => o.restaurant_id));
    const needsReview = activeRestaurants.filter(r =>
      orderedIds.has(r.id) && !reviewedIds.has(r.id)
    );

    // Coupons expiring in the next 7 days
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const expiringCoupons = coupons.filter(c =>
      !c.used && c.expires_at && new Date(c.expires_at) <= soon && new Date(c.expires_at) >= now
    );

    // Upcoming birthdays across all restaurants (next 30 days)
    const upcomingBirthdays = [];
    for (const r of activeRestaurants) {
      for (const b of (r.birthdays || [])) {
        try {
          const bd = new Date(b.date);
          const thisYear = new Date(now.getFullYear(), bd.getMonth(), bd.getDate());
          const target = thisYear >= now ? thisYear : new Date(now.getFullYear() + 1, bd.getMonth(), bd.getDate());
          const days = Math.ceil((target - now) / (24 * 60 * 60 * 1000));
          if (days <= 30) upcomingBirthdays.push({ name: b.name, restaurant: r.name, days, date: target.toISOString() });
        } catch { /* ignore malformed dates */ }
      }
    }
    upcomingBirthdays.sort((a, b) => a.days - b.days);

    return {
      total_restaurants: activeRestaurants.length,
      total_favorites: favoriteRestaurants.length,
      total_orders: orders.length,
      total_reviews: reviews.length,
      monthly_spend: Number(monthly_spend.toFixed(2)),
      yearly_spend: Number(yearly_spend.toFixed(2)),
      avg_meal_price: Number(avg_meal_price.toFixed(2)),
      recent_visits: recentVisits,
      favorites: favoriteRestaurants.slice(0, 6),
      needs_review: needsReview.slice(0, 5),
      expiring_coupons: expiringCoupons.slice(0, 5),
      upcoming_birthdays: upcomingBirthdays.slice(0, 5),
    };
  },

  // ================= EXPORT ALL (backup) =================
  async exportAll() {
    return {
      restaurants: await iterAll(restaurantsStore),
      menus: await iterAll(menusStore),
      favorite_meals: await iterAll(favoriteMealsStore),
      orders: await iterAll(ordersStore),
      reviews: await iterAll(reviewsStore),
      deliveries: await iterAll(deliveriesStore),
      coupons: await iterAll(couponsStore),
      staff: await iterAll(staffStore),
      wishlist: await iterAll(wishlistStore),
      photos: await iterAll(photosStore),
      voice_journal: await iterAll(voiceJournalStore),
      recipes: await iterAll(recipesStore),
      family: await iterAll(familyStore),
    };
  },

  // ================= IMPORT ALL (restore) =================
  async importAll(data, mode = "merge") {
    if (!data || typeof data !== "object") throw new Error("No data to import");
    const map = {
      restaurants: restaurantsStore,
      menus: menusStore,
      favorite_meals: favoriteMealsStore,
      orders: ordersStore,
      reviews: reviewsStore,
      deliveries: deliveriesStore,
      coupons: couponsStore,
      staff: staffStore,
      wishlist: wishlistStore,
      photos: photosStore,
      voice_journal: voiceJournalStore,
      recipes: recipesStore,
      family: familyStore,
    };
    if (mode === "replace") {
      for (const s of Object.values(map)) await s.clear();
    }
    let restored = 0;
    for (const [key, store] of Object.entries(map)) {
      const arr = Array.isArray(data[key]) ? data[key] : [];
      for (const item of arr) {
        if (!item || !item.id) continue;
        await store.setItem(item.id, item);
        restored += 1;
      }
    }
    return { restored, mode };
  },
};

export default RestaurantsService;
