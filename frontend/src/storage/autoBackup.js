/**
 * Auto-Backup — silent weekly export to the device's Downloads folder.
 *
 * Design principles:
 *   • Opt-in (default OFF) — respects Iron Rabbit's "no surprises" contract
 *   • Fully offline — reuses the existing StorageService.exportAllData()
 *   • Never wakes the user — fires when the user is already in the app AND
 *     at least 7 days have passed since the last auto-backup
 *   • Uses the browser Blob + <a download> trick that already works in the
 *     PWA and in the Capacitor Android WebView — no extra plugin required
 */
import { format } from "date-fns";
import StorageService from "./storageService";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Trigger a browser download for a JSON payload. Returns the filename.
function downloadJson(payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const filename = `iron-rabbit-autobackup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * If auto-backup is enabled AND at least 7 days have passed since the last
 * one, export now and stamp the settings. Never throws — silent failure is
 * safer than an error toast on cold boot.
 *
 * @returns {Promise<{ ran: boolean, filename?: string, reason?: string }>}
 */
export async function maybeRunAutoBackup() {
  try {
    const settings = await StorageService.getSettings();
    if (!settings?.auto_backup_enabled) return { ran: false, reason: "disabled" };

    const lastAt = settings.last_auto_backup_at ? new Date(settings.last_auto_backup_at).getTime() : 0;
    if (lastAt && Date.now() - lastAt < SEVEN_DAYS_MS) {
      return { ran: false, reason: "too-soon" };
    }

    const payload = await StorageService.exportAllData();
    const filename = downloadJson(payload);
    await StorageService.saveSettings({ last_auto_backup_at: new Date().toISOString() });
    return { ran: true, filename };
  } catch (err) {
    console.error("[AutoBackup] failed:", err);
    return { ran: false, reason: err?.message || "error" };
  }
}
