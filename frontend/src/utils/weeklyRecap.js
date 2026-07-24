// Weekly recap notification — runs a check on app load and, if it's Sunday
// AND the user hasn't received a recap in the last 6 days, fires a local
// browser notification summarising the week.
import notificationService from "../notifications/notificationService";
import StorageService from "../storage/storageService";

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

export async function maybeShowWeeklyRecap(notes) {
  try {
    const now = new Date();
    const isSunday = now.getDay() === 0;
    if (!isSunday) return;

    const settings = await StorageService.getSettings();
    const lastRecap = settings?.last_recap ? new Date(settings.last_recap) : null;
    if (lastRecap && (now - lastRecap) < SIX_DAYS_MS) return; // already sent this week

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const created = notes.filter(n => new Date(n.created_at) >= weekAgo).length;
    const edited = notes.filter(n => new Date(n.updated_at) >= weekAgo).length;
    const categories = new Set(notes.map(n => n.category).filter(Boolean)).size;

    // Nothing to celebrate? skip.
    if (created + edited === 0) return;

    const title = "Iron Rabbit · Week in review";
    const body =
      `${created} new note${created === 1 ? "" : "s"}` +
      `${edited > 0 ? ` · ${edited} edit${edited === 1 ? "" : "s"}` : ""}` +
      `${categories > 0 ? ` · ${categories} categor${categories === 1 ? "y" : "ies"}` : ""}`;

    // Fire the browser notification (best-effort — no throw if permission missing)
    try {
      const granted = await notificationService.requestPermission?.();
      if (granted && "Notification" in window) {
        // eslint-disable-next-line no-new
        new Notification(title, { body, tag: "iron-rabbit-recap" });
      }
    } catch { /* ignore */ }

    // Persist so we don't fire again this week
    await StorageService.saveSettings({ last_recap: now.toISOString() });
  } catch (err) {
    console.error("Weekly recap error:", err);
  }
}
