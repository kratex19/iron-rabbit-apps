// OpenFoodFacts lookup with offline localforage cache.
// Successful lookups are cached for 90 days. Not-found / errors are cached
// briefly (24 h) so we don't hammer the API for barcodes that don't exist.

import localforage from "localforage";

const cache = localforage.createInstance({
  name: "iron-rabbit-off-cache",
  storeName: "products",
});

const OK_TTL = 90 * 24 * 60 * 60 * 1000;   // 90 days
const MISS_TTL = 24 * 60 * 60 * 1000;      // 1 day

/**
 * Fetch product data for a barcode. Returns:
 *   { state: "ok"|"not_found"|"offline"|"error", product?, cached? }
 * `product` shape: { name, brand, image, nutrition, nutriscore }
 */
export async function lookupBarcode(code) {
  if (!code) return { state: "error" };

  // 1) Try cache
  try {
    const hit = await cache.getItem(code);
    if (hit && hit.expires_at > Date.now()) {
      return { ...hit.data, cached: true };
    }
  } catch { /* ignore cache read errors */ }

  // 2) If offline, fall back gracefully
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { state: "offline" };
  }

  // 3) Live fetch from OpenFoodFacts
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`);
    const json = await res.json();
    if (json.status === 1 && json.product) {
      const p = json.product;
      const nutriments = p.nutriments || {};
      const stripPrefix = (t) => (t || "").replace(/^en:/, "").replace(/-/g, " ");
      const product = {
        code,
        name: p.product_name || p.product_name_en || "",
        brand: (p.brands || "").split(",")[0].trim(),
        image: p.image_thumb_url || p.image_front_thumb_url || p.image_url || "",
        quantity_label: p.quantity || "",
        nutrition: {
          energy_kcal_100g: nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal"] ?? null,
          fat_100g: nutriments["fat_100g"] ?? null,
          saturated_fat_100g: nutriments["saturated-fat_100g"] ?? null,
          carbs_100g: nutriments["carbohydrates_100g"] ?? null,
          sugars_100g: nutriments["sugars_100g"] ?? null,
          protein_100g: nutriments["proteins_100g"] ?? null,
          salt_100g: nutriments["salt_100g"] ?? null,
          serving_size: p.serving_size || null,
        },
        nutriscore: (p.nutriscore_grade || p.nutrition_grade_fr || "").toUpperCase() || null,
        nova_group: p.nova_group || null,
        ecoscore: (p.ecoscore_grade || "").toUpperCase() || null,
        ingredients_text: p.ingredients_text || p.ingredients_text_en || "",
        ingredients_list: (p.ingredients || []).map(i => i.text).filter(Boolean),
        additives: (p.additives_tags || []).map(stripPrefix),
        allergens: (p.allergens_tags || []).map(stripPrefix),
        traces: (p.traces_tags || []).map(stripPrefix),
        countries: (p.countries_tags || []).map(stripPrefix).slice(0, 6),
        categories: (p.categories_tags || []).map(stripPrefix).slice(0, 6),
        labels: (p.labels_tags || []).map(stripPrefix).slice(0, 8),
      };
      const payload = { state: "ok", product };
      try { await cache.setItem(code, { data: payload, expires_at: Date.now() + OK_TTL }); } catch { /* ignore */ }
      return payload;
    }
    const payload = { state: "not_found" };
    try { await cache.setItem(code, { data: payload, expires_at: Date.now() + MISS_TTL }); } catch { /* ignore */ }
    return payload;
  } catch {
    return { state: "error" };
  }
}

export async function clearBarcodeCache() {
  await cache.clear();
}

export async function barcodeCacheSize() {
  const keys = await cache.keys();
  return keys.length;
}
