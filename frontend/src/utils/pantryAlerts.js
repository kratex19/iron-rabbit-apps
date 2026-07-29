// Pantry expiration alerts — fires a local notification on app open when
// pantry items are expired or expiring in the next 3 days.
// Respects settings.notif_pantry_expiration (default: on) and only fires
// at most once per calendar day (settings.last_pantry_alert).

import { parseISO, differenceInCalendarDays, isSameDay } from "date-fns";
import StorageService from "../storage/storageService";
import notificationService from "../notifications/notificationService";

export async function maybeShowPantryAlerts() {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const settings = await StorageService.getSettings();
    if (settings?.notif_pantry_expiration === false) return;

    // Only alert once per day
    const now = new Date();
    const last = settings?.last_pantry_alert ? new Date(settings.last_pantry_alert) : null;
    if (last && isSameDay(last, now)) return;

    const items = await StorageService.getPantryItems();
    if (!items.length) return;

    const expired = [];
    const critical = []; // ≤1d
    const soon = [];     // ≤3d
    for (const it of items) {
      if (!it.expires_at) continue;
      try {
        const d = differenceInCalendarDays(parseISO(it.expires_at), now);
        if (d < 0) expired.push({ ...it, daysLeft: d });
        else if (d <= 1) critical.push({ ...it, daysLeft: d });
        else if (d <= 3) soon.push({ ...it, daysLeft: d });
      } catch { /* ignore */ }
    }

    const totalHits = expired.length + critical.length + soon.length;
    if (totalHits === 0) return;

    // Build a compact human-friendly summary
    const parts = [];
    if (expired.length) parts.push(`${expired.length} expired`);
    if (critical.length) parts.push(`${critical.length} due today/tomorrow`);
    if (soon.length) parts.push(`${soon.length} within 3 days`);
    const title = "Pantry check";
    const body = `${parts.join(" · ")}. Tap to review.`;

    try {
      // eslint-disable-next-line no-new
      new Notification(title, {
        body,
        tag: "iron-rabbit-pantry-alert",
        icon: "/icon-192.png",
      });
    } catch { /* ignore notification errors */ }

    await StorageService.saveSettings({ last_pantry_alert: now.toISOString() });
  } catch (err) {
    console.error("Pantry alert error:", err);
  }
}
