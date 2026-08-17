// Cleanup streak helper — turns a list of ISO-week keys stored in
// settings.cleanup_history into a "consecutive weeks" count so the
// Settings recap card can nudge users who keep the habit going.
//
// Week keys look like "2026-W07" (ISO 8601). History is kept in
// insertion order and capped at MAX_HISTORY entries elsewhere.

const MAX_HISTORY = 26; // ~6 months of weekly cleanups is plenty

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function currentWeekKey(now = new Date()) {
  return isoWeekKey(now);
}

function weekKeyOffset(offset, now = new Date()) {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + offset * 7);
  return isoWeekKey(d);
}

/**
 * Return the streak of consecutive weeks in `history` ending at either
 * the current week or last week (so a user who cleaned last week
 * hasn't lost their streak yet). Returns 0 if neither anchor matches.
 */
export function computeStreak(history = [], now = new Date()) {
  const set = new Set(Array.isArray(history) ? history : []);
  if (set.size === 0) return 0;
  const anchor = set.has(weekKeyOffset(0, now))
    ? 0
    : set.has(weekKeyOffset(-1, now))
      ? -1
      : null;
  if (anchor === null) return 0;
  let streak = 0;
  for (let i = anchor; i > anchor - MAX_HISTORY; i--) {
    if (set.has(weekKeyOffset(i, now))) streak++;
    else break;
  }
  return streak;
}

/**
 * Append the current week key to `history` (dedup, capped to
 * MAX_HISTORY). Pure — returns the new array.
 */
export function appendCurrentWeek(history = [], now = new Date()) {
  const wk = currentWeekKey(now);
  const list = Array.isArray(history) ? history.filter((k) => k !== wk) : [];
  list.push(wk);
  return list.slice(-MAX_HISTORY);
}
