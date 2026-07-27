import { differenceInCalendarDays, differenceInCalendarWeeks, differenceInCalendarMonths, startOfDay, subDays, subWeeks, subMonths, startOfWeek, startOfMonth } from "date-fns";

/**
 * Shared streak & ledger helpers for chores.
 *
 * A chore now optionally carries a `history[]` of the form:
 *   [{ date: ISOString, paid: Number, status: "done" }, ...]
 *
 * The status pill in ChoresPanel appends to this array whenever a chore
 * transitions to (done + parent_approved). That is the raw signal all
 * streak/ledger computations below build on.
 */

const STEP = {
  daily:     { unit: "day",   sub: subDays,   start: startOfDay,  diff: differenceInCalendarDays },
  weekly:    { unit: "week",  sub: subWeeks,  start: startOfWeek, diff: differenceInCalendarWeeks },
  bimonthly: { unit: "week",  sub: (d, n) => subWeeks(d, n * 2), start: startOfWeek, diff: (a, b) => Math.floor(differenceInCalendarWeeks(a, b) / 2) },
  monthly:   { unit: "month", sub: subMonths, start: startOfMonth, diff: differenceInCalendarMonths },
};

/**
 * Consecutive completed periods (of the chore's own frequency) ending "now"
 * (or the last completed period). Returns 0 if the last completion happened
 * more than one full period ago.
 */
export function computeChoreStreak(chore, now = new Date()) {
  const hist = Array.isArray(chore?.history) ? chore.history : [];
  if (hist.length === 0) return 0;
  const step = STEP[chore.frequency] || STEP.daily;
  const bins = new Set(hist.map(h => step.start(new Date(h.date)).toISOString()));
  let cursor = step.start(now);
  // Grace period: if the most recent bin is exactly one period before now, still count.
  if (!bins.has(cursor.toISOString())) {
    cursor = step.sub(cursor, 1);
    if (!bins.has(cursor.toISOString())) return 0;
  }
  let streak = 0;
  while (bins.has(cursor.toISOString())) {
    streak++;
    cursor = step.sub(cursor, 1);
    if (streak > 500) break; // guardrail
  }
  return streak;
}

/**
 * Note-level streak = the *max* streak across every chore on the note.
 * Falls back to 0 if the note has no chores or no completion history.
 */
export function computeNoteStreak(note) {
  const chores = Array.isArray(note?.chores) ? note.chores : [];
  if (chores.length === 0) return 0;
  return chores.reduce((max, c) => Math.max(max, computeChoreStreak(c)), 0);
}

/**
 * Total lifetime allowance earned across the note's chore history.
 * Uses `paid` values recorded at the moment of approval.
 */
export function computeNoteEarnings(note) {
  const chores = Array.isArray(note?.chores) ? note.chores : [];
  return chores.reduce((sum, c) => {
    const hist = Array.isArray(c.history) ? c.history : [];
    return sum + hist.reduce((s, h) => s + (Number(h.paid) || 0), 0);
  }, 0);
}

/**
 * Roll history entries into weekly/monthly buckets for the ledger view.
 * Returns { weekly: [{ startISO, label, total }, ...], monthly: [...] }
 * covering the last 8 weeks and last 6 months.
 */
export function buildLedger(chores, now = new Date()) {
  const flat = [];
  for (const c of chores || []) {
    const hist = Array.isArray(c.history) ? c.history : [];
    for (const h of hist) {
      flat.push({ ...h, choreTitle: c.title, choreId: c.id, date: new Date(h.date) });
    }
  }

  // Weekly buckets (last 8 weeks)
  const weekly = [];
  for (let i = 7; i >= 0; i--) {
    const wkStart = startOfWeek(subWeeks(now, i));
    const wkEnd = startOfWeek(subWeeks(now, i - 1));
    const rows = flat.filter(h => h.date >= wkStart && h.date < wkEnd);
    const total = rows.reduce((s, h) => s + (Number(h.paid) || 0), 0);
    weekly.push({
      startISO: wkStart.toISOString(),
      label: `${wkStart.getMonth() + 1}/${wkStart.getDate()}`,
      total,
      count: rows.length,
    });
  }

  // Monthly buckets (last 6 months)
  const monthly = [];
  const monthLabels = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (let i = 5; i >= 0; i--) {
    const mStart = startOfMonth(subMonths(now, i));
    const mEnd = startOfMonth(subMonths(now, i - 1));
    const rows = flat.filter(h => h.date >= mStart && h.date < mEnd);
    const total = rows.reduce((s, h) => s + (Number(h.paid) || 0), 0);
    monthly.push({
      startISO: mStart.toISOString(),
      label: `${monthLabels[mStart.getMonth()]} '${String(mStart.getFullYear()).slice(-2)}`,
      total,
      count: rows.length,
    });
  }

  // Per-chore rollup
  const perChore = (chores || []).map(c => {
    const hist = Array.isArray(c.history) ? c.history : [];
    return {
      id: c.id,
      title: c.title,
      count: hist.length,
      total: hist.reduce((s, h) => s + (Number(h.paid) || 0), 0),
      lastCompleted: hist.length > 0 ? new Date(hist[hist.length - 1].date) : null,
    };
  }).sort((a, b) => b.total - a.total);

  const grandTotal = perChore.reduce((s, c) => s + c.total, 0);

  return { weekly, monthly, perChore, grandTotal, flat };
}

/**
 * Return a friendly label describing how long ago a date was.
 * (Used in the ledger table.)
 */
export function agoLabel(date, now = new Date()) {
  if (!date) return "—";
  const d = differenceInCalendarDays(now, new Date(date));
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}
