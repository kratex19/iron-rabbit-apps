// Streak Recovery Reminder — nudge the user on Sundays if the current week
// has no restaurant order logged AND they have an active streak that would
// otherwise consume the month's freeze to survive.
//
// Fired at most once per calendar week (keyed by the Monday-anchor ISO week
// start). Silent no-op when the user has no orders, no active streak, or is
// not on a Sunday.
import { toast } from "sonner";
import restaurantsService from "../storage/restaurantsService";

const NUDGE_KEY = "iron_rabbit_rg_recovery_nudge_v1";
const FREEZE_LEDGER_KEY = "iron_rabbit_rg_freeze_ledger_v1";

// Monday-anchored week key (matches useRestaurantStats.js)
const weekStartMs = (d) => {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  const day = (t.getDay() + 6) % 7; // 0=Mon..6=Sun
  t.setDate(t.getDate() - day);
  return t.getTime();
};

export async function maybeShowStreakRecoveryNudge() {
  try {
    const now = new Date();
    if (now.getDay() !== 0) return; // Only fire on Sundays
    const thisWeek = weekStartMs(now);

    // Already nudged this week? Skip.
    try {
      const last = localStorage.getItem(NUDGE_KEY);
      if (last && parseInt(last, 10) === thisWeek) return;
    } catch { /* private mode */ }

    const orders = await restaurantsService.listOrders().catch(() => []);
    if (!orders || orders.length === 0) return;

    // Any order in the current week?
    const orderInThisWeek = orders.some((o) => weekStartMs(o.date || o.created_at || 0) === thisWeek);
    if (orderInThisWeek) return;

    // Confirm there IS a streak to protect — check the previous week.
    const prevWeek = thisWeek - 7 * 24 * 60 * 60 * 1000;
    const orderInPrevWeek = orders.some((o) => weekStartMs(o.date || o.created_at || 0) === prevWeek);
    if (!orderInPrevWeek) return; // No active streak to save

    // Is this month's freeze still available? (If already spent, freeze
    // won't help; nudging is still useful — but we prioritise the "don't
    // burn your freeze" framing when one is available.)
    let freezeAvailable = true;
    try {
      const raw = localStorage.getItem(FREEZE_LEDGER_KEY);
      const ledger = raw ? JSON.parse(raw) || {} : {};
      const mk = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      freezeAvailable = !ledger[mk];
    } catch { /* noop */ }

    const description = freezeAvailable
      ? "Log even one order today and you'll keep the streak alive without burning this month's freeze."
      : "You've already used this month's freeze — logging an order today keeps the streak going.";

    toast("🔥 Keep the streak alive", {
      description,
      duration: 7000,
    });

    try { localStorage.setItem(NUDGE_KEY, String(thisWeek)); } catch { /* noop */ }
  } catch (err) {
    console.warn("Streak recovery nudge error:", err);
  }
}
