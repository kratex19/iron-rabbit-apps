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

// Detailed per-item history: raw price points sorted oldest-first for
// sparkline / trend rendering.
export async function itemPriceSeries(itemText, lookbackTrips = 30) {
  const trips = await StorageService.getGroceryTrips();
  const recent = trips
    .filter(t => Array.isArray(t.items) && t.items.length > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(-lookbackTrips);
  const key = (itemText || "").toLowerCase().trim();
  const series = [];
  for (const t of recent) {
    for (const it of t.items) {
      if ((it.text || "").toLowerCase().trim() !== key) continue;
      const price = Number(it.price);
      if (!price || price <= 0) continue;
      series.push({ date: t.date, price, dept: it.dept || "" });
    }
  }
  return series;
}

// Best day-of-week to buy each item, based on median price by weekday.
// Returns { day: 0-6, dayName, median, savings_pct, count } for items that
// have prices across at least 3 different weekdays.
export async function bestDayToBuy(itemText, lookbackTrips = 30) {
  const series = await itemPriceSeries(itemText, lookbackTrips);
  if (series.length < 3) return null;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const byDay = new Map(); // dayIdx → prices[]
  for (const p of series) {
    const d = new Date(p.date).getDay();
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d).push(p.price);
  }
  if (byDay.size < 2) return null; // need at least 2 different weekdays

  const medians = [];
  for (const [d, prices] of byDay.entries()) {
    const sorted = [...prices].sort((a, b) => a - b);
    const median = sorted.length % 2 === 1
      ? sorted[Math.floor(sorted.length / 2)]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
    medians.push({ day: d, dayName: dayNames[d], median, count: prices.length });
  }
  medians.sort((a, b) => a.median - b.median);
  const best = medians[0];
  const worst = medians[medians.length - 1];
  const savings_pct = worst.median > 0 ? ((worst.median - best.median) / worst.median) * 100 : 0;
  return {
    ...best,
    median: Number(best.median.toFixed(2)),
    worst_day: worst.dayName,
    worst_median: Number(worst.median.toFixed(2)),
    savings_pct: Number(savings_pct.toFixed(1)),
    total_points: series.length,
  };
}
