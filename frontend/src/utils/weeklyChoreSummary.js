// Weekly chore-summary notification. On Sunday evenings (>= 6pm local),
// if the user has any chores notes with activity this week, fire ONE
// notification per kid summarising earnings + streak. Runs at most once
// per Sunday per kid — de-duped via `last_kid_summary` map in settings.
import notificationService from "../notifications/notificationService";
import StorageService from "../storage/storageService";
import { computeNoteStreak, buildLedger } from "../notes/streakUtils";

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

export async function maybeShowWeeklyChoreSummary(notes) {
  try {
    const now = new Date();
    // Fire only Sunday evening onwards so the week is effectively wrapped.
    if (now.getDay() !== 0 || now.getHours() < 18) return;

    const kidNotes = (notes || []).filter(
      n => Array.isArray(n.chores) && n.chores.length > 0 && !n.archived_at && !n.deleted_at
    );
    if (kidNotes.length === 0) return;

    const settings = await StorageService.getSettings();
    // Respect user preference from Settings → Notifications
    if (settings?.notif_chore_summary === false) return;
    const lastMap = (settings && settings.last_kid_summary) || {};

    // Best-effort permission request; if denied, silently skip.
    let granted = false;
    try { granted = await notificationService.requestPermission?.(); } catch { /* ignore */ }
    if (!granted || !("Notification" in window)) return;

    const updated = { ...lastMap };
    for (const n of kidNotes) {
      const prev = lastMap[n.id] ? new Date(lastMap[n.id]) : null;
      if (prev && (now - prev) < SIX_DAYS_MS) continue;

      const ledger = buildLedger(n.chores || []);
      const week = ledger.weekly[ledger.weekly.length - 1]?.total || 0;
      const streak = computeNoteStreak(n);
      if (week <= 0 && streak <= 0) continue; // nothing worth celebrating

      const kidName = (n.title || "Chores").trim();
      const parts = [];
      if (week > 0) parts.push(`earned $${week.toFixed(2)} this week 🎉`);
      if (streak > 0) parts.push(`${streak}-day streak 🔥`);
      const body = `${kidName} ${parts.join(" · ")}`;

      try {
        // eslint-disable-next-line no-new
        new Notification("Iron Rabbit · Chore summary", { body, tag: `iron-rabbit-chore-${n.id}` });
      } catch { /* ignore per-kid failure */ }
      updated[n.id] = now.toISOString();
    }

    // Only persist if we actually fired at least one
    if (JSON.stringify(updated) !== JSON.stringify(lastMap)) {
      await StorageService.saveSettings({ last_kid_summary: updated });
    }
  } catch (err) {
    console.error("Weekly chore summary error:", err);
  }
}
