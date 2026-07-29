// Price-history utilities.
// Reads settings.grocery_trips[] and computes per-item median price from
// the last N trips. Used by ChecklistSection to badge items when the current
// price is meaningfully lower (or higher) than the running median.

import StorageService from "../storage/storageService";

// In-memory cache — invalidated when a new trip is saved (caller can reset).
let cache = null;

/**
 * Build a map of { itemKey → { median, count, lastPrice, priceHistory[] } }
 * itemKey is the lowercased+trimmed item text.
 */
export async function buildPriceHistory(lookbackTrips = 20) {
  const trips = await StorageService.getGroceryTrips();
  const recent = trips
    .filter(t => Array.isArray(t.items) && t.items.length > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, lookbackTrips);

  const byItem = new Map();
  for (const t of recent) {
    for (const it of t.items) {
      const price = Number(it.price);
      if (!price || price <= 0) continue;
      const key = (it.text || "").toLowerCase().trim();
      if (!key) continue;
      const cur = byItem.get(key) || { key, text: it.text, prices: [], dates: [] };
      cur.prices.push(price);
      cur.dates.push(t.date);
      byItem.set(key, cur);
    }
  }

  const map = new Map();
  for (const entry of byItem.values()) {
    const sorted = [...entry.prices].sort((a, b) => a - b);
    const median =
      sorted.length % 2 === 1
        ? sorted[Math.floor(sorted.length / 2)]
        : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    map.set(entry.key, {
      text: entry.text,
      median: Number(median.toFixed(2)),
      min: Number(sorted[0].toFixed(2)),
      max: Number(sorted[sorted.length - 1].toFixed(2)),
      count: sorted.length,
      lastPrice: entry.prices[0],
    });
  }
  cache = map;
  return map;
}

/**
 * Get the price-signal for a single item at a given entered price.
 * Requires at least 2 historical price points to give a signal.
 * Returns:
 *   { kind: "drop"|"spike"|"normal"|null, median, delta, pct }
 */
export function priceSignal(itemText, currentPrice, history) {
  const map = history || cache;
  if (!map || !itemText || !currentPrice) return null;
  const key = itemText.toLowerCase().trim();
  const rec = map.get(key);
  if (!rec || rec.count < 2) return null; // need at least 2 data points
  const price = Number(currentPrice);
  if (!price || price <= 0) return null;

  const delta = price - rec.median;
  const pct = (delta / rec.median) * 100;
  let kind = "normal";
  if (pct <= -10) kind = "drop";        // 10%+ under median → good deal
  else if (pct >= 15) kind = "spike";   // 15%+ over median → warning
  else kind = null;                     // within noise band, no badge
  return kind ? { kind, median: rec.median, delta: Number(delta.toFixed(2)), pct: Number(pct.toFixed(1)), count: rec.count } : null;
}

export function clearPriceHistoryCache() {
  cache = null;
}

export function getCachedHistory() {
  return cache;
}
