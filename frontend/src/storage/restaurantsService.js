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
const chatHistoryStore = mkStore("chat_history");
const shoppingStore    = mkStore("shopping_list");
const mealPlanStore    = mkStore("meal_plan");

const rid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// ----- Web Crypto AES-GCM helpers (PBKDF2 → AES-256-GCM) -----
// Envelope schema `version`:
//   1 = 2026-02-08 initial format (PBKDF2-SHA256 200k, then bumped to 600k)
// Iterations are always read from the envelope on decrypt so older files
// (produced when the constant was 200k) still open.
const ENVELOPE_VERSION = 1;
const PBKDF2_ITERS = 600000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64encode = (buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
};
const b64decode = (s) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

async function deriveKey(passphrase, salt, iterations = PBKDF2_ITERS) {
  const material = await window.crypto.subtle.importKey(
    "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"],
  );
  return await window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptJSON(obj, passphrase) {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, PBKDF2_ITERS);
  const ct = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(obj)),
  );
  return { salt: b64encode(salt), iv: b64encode(iv), ciphertext: b64encode(ct) };
}

async function decryptJSON(envelope, passphrase) {
  const salt = b64decode(envelope.salt);
  const iv = b64decode(envelope.iv);
  const ct = b64decode(envelope.ciphertext);
  // Honor the iterations recorded in the envelope so pre-600k backups still open.
  const iterations = Number(envelope.iterations) || PBKDF2_ITERS;
  const key = await deriveKey(passphrase, salt, iterations);
  const pt = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return JSON.parse(dec.decode(pt));
}

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
  async listPhotos({ restaurantId, orderId, reviewId, recipeId, couponId } = {}) {
    const all = await iterAll(photosStore);
    return all
      .filter(p => !restaurantId || p.restaurant_id === restaurantId)
      .filter(p => !orderId || p.order_id === orderId)
      .filter(p => !reviewId || p.review_id === reviewId)
      .filter(p => !recipeId || p.recipe_id === recipeId)
      .filter(p => !couponId || p.coupon_id === couponId)
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
  async logRecipeCook(id) {
    const existing = await recipesStore.getItem(id);
    if (!existing) return null;
    const record = {
      ...existing,
      cook_count: (existing.cook_count || 0) + 1,
      last_cooked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await recipesStore.setItem(id, record);
    return record;
  },
  // Set a 1-5 star rating (or 0 to clear) on a recipe.
  async rateRecipe(id, rating) {
    const existing = await recipesStore.getItem(id);
    if (!existing) return null;
    const r = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
    const record = { ...existing, rating: r, updated_at: new Date().toISOString() };
    await recipesStore.setItem(id, record);
    return record;
  },
  // Append a post-cook note to a recipe's rolling log. Latest note is shown
  // as "Last time: ..." on the recipe card so tweaks aren't forgotten.
  async addRecipeCookNote(id, text) {
    const clean = String(text || "").trim();
    if (!clean) return null;
    const existing = await recipesStore.getItem(id);
    if (!existing) return null;
    const entry = { text: clean.slice(0, 400), cooked_at: new Date().toISOString() };
    const notes = [...(existing.cook_notes || []), entry].slice(-20);
    const record = { ...existing, cook_notes: notes, updated_at: new Date().toISOString() };
    await recipesStore.setItem(id, record);
    return record;
  },

  // ================= COOK SESSION (single active) =================
  // Persist one in-progress cook session so the user can close the app or
  // switch recipes and resume where they left off. Kept in localStorage
  // (single record, tiny payload). Shape:
  //   { recipe_id, step_idx, ends_at (ISO|null), paused_remaining (sec|null), saved_at }
  saveCookSession(session) {
    if (!session || !session.recipe_id) { this.clearCookSession(); return; }
    const payload = { ...session, saved_at: new Date().toISOString() };
    try { localStorage.setItem("rg_cook_session", JSON.stringify(payload)); }
    catch { /* quota exceeded or storage unavailable */ }
  },
  loadCookSession() {
    try {
      const raw = localStorage.getItem("rg_cook_session");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  },
  clearCookSession() {
    try { localStorage.removeItem("rg_cook_session"); } catch { /* no-op */ }
  },

  // ================= SHOPPING LIST =================
  // Cross-recipe shopping list. Items are keyed by a normalized name so
  // adding the same ingredient from two recipes dedupes automatically.
  async listShoppingItems() {
    const all = await iterAll(shoppingStore);
    return all.sort((a, b) => {
      // Unchecked first, then by created_at ascending
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });
  },
  async addShoppingItems(items, { recipeId = null, recipeTitle = "" } = {}) {
    const now = new Date().toISOString();
    const all = await iterAll(shoppingStore);
    const norm = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const existingByKey = new Map(all.map((it) => [norm(it.name), it]));
    let added = 0, revived = 0;
    for (const raw of items) {
      const name = (raw || "").trim();
      if (!name) continue;
      const key = norm(name);
      const existing = existingByKey.get(key);
      if (existing) {
        // If already unchecked → skip; if checked → revive (uncheck) so it re-appears in cart
        if (existing.checked) {
          const record = {
            ...existing,
            checked: false,
            checked_at: null,
            updated_at: now,
            sources: Array.from(new Set([...(existing.sources || []), recipeTitle].filter(Boolean))),
          };
          await shoppingStore.setItem(existing.id, record);
          revived += 1;
        }
        continue;
      }
      const id = rid("shop");
      const record = {
        id, name, checked: false,
        recipe_id: recipeId,
        sources: recipeTitle ? [recipeTitle] : [],
        created_at: now, updated_at: now, checked_at: null,
      };
      await shoppingStore.setItem(id, record);
      existingByKey.set(key, record);
      added += 1;
    }
    return { added, revived };
  },
  async toggleShoppingItem(id) {
    const existing = await shoppingStore.getItem(id);
    if (!existing) return null;
    const now = new Date().toISOString();
    const nextChecked = !existing.checked;
    const record = {
      ...existing,
      checked: nextChecked,
      checked_at: nextChecked ? now : null,
      updated_at: now,
    };
    await shoppingStore.setItem(id, record);
    return record;
  },
  async deleteShoppingItem(id) {
    await shoppingStore.removeItem(id);
    return true;
  },
  // Manually override the auto-classified aisle for one item. Pass null to
  // clear the override and revert to keyword classification.
  async setShoppingItemAisle(id, aisleKey) {
    const existing = await shoppingStore.getItem(id);
    if (!existing) return null;
    const record = { ...existing, aisle_override: aisleKey || null, updated_at: new Date().toISOString() };
    await shoppingStore.setItem(id, record);
    return record;
  },
  async clearCheckedShoppingItems() {
    const all = await iterAll(shoppingStore);
    let removed = 0;
    for (const it of all) {
      if (it.checked) { await shoppingStore.removeItem(it.id); removed += 1; }
    }
    return removed;
  },
  async clearShoppingList() {
    await shoppingStore.clear();
    return true;
  },

  // ================= WEEKLY MEAL PLAN =================
  // Each entry pins ONE recipe to ONE date (multiple entries per date allowed).
  // Shape: {id, date: "YYYY-MM-DD", recipe_id, slot: "breakfast|lunch|dinner"|"", created_at, updated_at}
  async listMealPlan({ from, to } = {}) {
    const all = await iterAll(mealPlanStore);
    let rows = all;
    if (from) rows = rows.filter((r) => (r.date || "") >= from);
    if (to) rows = rows.filter((r) => (r.date || "") <= to);
    return rows.sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.created_at || "").localeCompare(b.created_at || ""));
  },
  async addMealPlanEntry({ date, recipe_id, slot = "" }) {
    if (!date || !recipe_id) return null;
    const id = rid("plan");
    const now = new Date().toISOString();
    const record = { id, date, recipe_id, slot, created_at: now, updated_at: now };
    await mealPlanStore.setItem(id, record);
    return record;
  },
  async deleteMealPlanEntry(id) {
    await mealPlanStore.removeItem(id);
    return true;
  },
  async clearMealPlanRange({ from, to }) {
    const all = await iterAll(mealPlanStore);
    let removed = 0;
    for (const r of all) {
      if ((!from || r.date >= from) && (!to || r.date <= to)) {
        await mealPlanStore.removeItem(r.id);
        removed += 1;
      }
    }
    return removed;
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

  // ================= SMART ASSISTANT CHAT HISTORY =================
  // Persists Smart Assistant conversation across sessions. Single sorted
  // rolling log; users can clear it explicitly.
  async listChatHistory({ limit = 200 } = {}) {
    const all = await iterAll(chatHistoryStore);
    return all
      .sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))
      .slice(-limit);
  },
  async appendChatMessage({ role, text }) {
    const now = new Date().toISOString();
    const id = rid("chat");
    const record = { id, role, text, created_at: now };
    await chatHistoryStore.setItem(id, record);
    // Rolling cap: trim to last 500 messages so a chatty user doesn't blow up IndexedDB
    const all = await iterAll(chatHistoryStore);
    if (all.length > 500) {
      all.sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
      const drop = all.slice(0, all.length - 500);
      for (const m of drop) await chatHistoryStore.removeItem(m.id);
    }
    return record;
  },
  async clearChatHistory() {
    await chatHistoryStore.clear();
    return true;
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
      chat_history: await iterAll(chatHistoryStore),
      shopping_list: await iterAll(shoppingStore),
      meal_plan: await iterAll(mealPlanStore),
    };
  },

  // ================= ENCRYPTED PAYLOAD HELPERS =================
  // Wraps `{meta, data}` in an AES-GCM envelope readable only with the same
  // passphrase. Envelope shape:
  //   { app, encrypted:true, kdf:"PBKDF2-SHA256", iterations, salt, iv,
  //     ciphertext, meta: {exported_at, counts, encrypted:true} }
  async encryptPayload(payload, passphrase) {
    if (!passphrase || passphrase.length < 4) {
      throw new Error("Passphrase must be at least 4 characters");
    }
    const { salt, iv, ciphertext } = await encryptJSON(payload, passphrase);
    const publicMeta = {
      ...(payload.meta || {}),
      encrypted: true,
    };
    return {
      app: "iron-rabbit@1.0",
      version: ENVELOPE_VERSION,
      encrypted: true,
      kdf: "PBKDF2-SHA256",
      iterations: PBKDF2_ITERS,
      salt, iv, ciphertext,
      meta: publicMeta,
    };
  },
  async decryptPayload(envelope, passphrase) {
    if (!envelope?.encrypted) throw new Error("Not an encrypted backup");
    if (!passphrase) throw new Error("Passphrase required");
    try {
      return await decryptJSON(envelope, passphrase);
    } catch (e) {
      throw new Error("Wrong passphrase or corrupted backup");
    }
  },
  isEncryptedPayload(obj) {
    return !!(obj && obj.encrypted === true && obj.ciphertext && obj.salt && obj.iv);
  },

  // ================= BACKUP DIFF REPORT =================
  // Compare an incoming backup payload against what's currently stored.
  // Returns per-collection counters + samples + conflict list.
  // Shape:
  //   {
  //     collections: {
  //       restaurants: {
  //         added: N, changed: N, unchanged: N, removed: N, conflicts: N,
  //         total_local, total_incoming,
  //         items: {
  //           added:    [{ id, name }],
  //           changed:  [{ id, name, local_updated_at, incoming_updated_at, conflict }],
  //           removed:  [{ id, name }],
  //         }
  //       }, ...
  //     },
  //     totals: { added, changed, unchanged, removed, conflicts }
  //   }
  //
  //  - "conflict" = an ID in both stores where local.updated_at is more
  //    recent than incoming.updated_at (i.e., accepting the backup would
  //    lose local edits).
  //  - "items" lists are capped at 20 per bucket to keep payload small.
  async computeBackupDiff(data) {
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
      chat_history: chatHistoryStore,
      shopping_list: shoppingStore,
      meal_plan: mealPlanStore,
    };
    const equal = (a, b) => {
      // Strip volatile timestamps so a plain re-export doesn't mark every
      // row as "changed". These fields are updated during normal use and
      // aren't part of the user-authored content.
      const VOLATILE = new Set(["updated_at", "last_ordered_at", "last_cooked_at", "taken_at"]);
      const strip = (o) => {
        const out = {};
        for (const [k, v] of Object.entries(o || {})) if (!VOLATILE.has(k)) out[k] = v;
        return out;
      };
      try { return JSON.stringify(strip(a || {})) === JSON.stringify(strip(b || {})); }
      catch { return false; }
    };
    // Best-effort human label for an item — different collections use
    // different fields, so try a small list.
    const labelOf = (it) => {
      if (!it) return "(unknown)";
      return (
        it.name || it.title || it.meal_name || it.code || it.order_number ||
        (it.role ? `${it.role}: ${(it.text || "").slice(0, 40)}` : "") ||
        (it.date ? `order ${it.date}` : "") ||
        it.id || "(unnamed)"
      );
    };
    const SAMPLE_CAP = 20;
    const collections = {};
    const totals = { added: 0, changed: 0, unchanged: 0, removed: 0, conflicts: 0 };

    for (const [key, store] of Object.entries(map)) {
      const incoming = Array.isArray(data?.[key]) ? data[key] : [];
      const local = await iterAll(store);
      const localById = new Map(local.map((it) => [it.id, it]));
      const incomingById = new Map(incoming.filter((it) => it && it.id).map((it) => [it.id, it]));

      const items = { added: [], changed: [], removed: [] };
      let added = 0, changed = 0, unchanged = 0, conflicts = 0;

      for (const [id, item] of incomingById) {
        const existing = localById.get(id);
        if (!existing) {
          added += 1;
          if (items.added.length < SAMPLE_CAP) items.added.push({ id, name: labelOf(item) });
        } else if (equal(existing, item)) {
          unchanged += 1;
        } else {
          changed += 1;
          const localTs = existing.updated_at || existing.created_at || null;
          const incTs = item.updated_at || item.created_at || null;
          const isConflict = !!(localTs && incTs && new Date(localTs) > new Date(incTs));
          if (isConflict) conflicts += 1;
          if (items.changed.length < SAMPLE_CAP) {
            items.changed.push({
              id, name: labelOf(item),
              local_updated_at: localTs,
              incoming_updated_at: incTs,
              conflict: isConflict,
            });
          }
        }
      }
      let removed = 0;
      for (const [id, item] of localById) {
        if (!incomingById.has(id)) {
          removed += 1;
          if (items.removed.length < SAMPLE_CAP) items.removed.push({ id, name: labelOf(item) });
        }
      }
      collections[key] = {
        added, changed, unchanged, removed, conflicts,
        total_local: local.length,
        total_incoming: incoming.length,
        items,
      };
      totals.added += added;
      totals.changed += changed;
      totals.unchanged += unchanged;
      totals.removed += removed;
      totals.conflicts += conflicts;
    }
    return { collections, totals };
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
      chat_history: chatHistoryStore,
      shopping_list: shoppingStore,
      meal_plan: mealPlanStore,
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
