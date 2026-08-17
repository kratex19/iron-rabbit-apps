// Small helper that surfaces a friendly toast when the browser's
// storage quota is running low. Kept isolated so we don't rewrite
// StorageService and so the check can be triggered from multiple call
// sites (app boot, after any attachment upload).
import { toast } from "sonner";

const WARN_THRESHOLD = 0.80;   // 80% triggers the first warning
const CRITICAL_THRESHOLD = 0.92; // 92% escalates to error toast
const RESET_THRESHOLD = 0.70;  // dropping below 70% re-arms the toast

let hasWarned = false;
let hasCriticalWarned = false;

async function getStoragePct() {
  if (!('storage' in navigator) || !('estimate' in navigator.storage)) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (!quota) return null;
    return { usage, quota, pct: usage / quota };
  } catch { return null; }
}

/**
 * Check quota and toast if we've crossed the warning/critical thresholds.
 * Deduped so a single session won't spam the user — a toast fires at most
 * once per session per level, re-armed when usage drops below RESET_THRESHOLD.
 * Silently no-ops on browsers without the Storage API.
 */
export async function checkStorageQuota() {
  const info = await getStoragePct();
  if (!info) return null;
  const { pct, usage, quota } = info;

  // Reset flags if the user has cleared enough space
  if (pct < RESET_THRESHOLD) {
    hasWarned = false;
    hasCriticalWarned = false;
    return info;
  }

  const usedMB = (usage / (1024 * 1024)).toFixed(0);
  const quotaMB = (quota / (1024 * 1024)).toFixed(0);
  const percent = Math.round(pct * 100);

  if (pct >= CRITICAL_THRESHOLD && !hasCriticalWarned) {
    hasCriticalWarned = true;
    hasWarned = true;
    toast.error(`Device storage almost full (${percent}%)`, {
      description: `${usedMB} MB used of ${quotaMB} MB. New uploads may fail — clear some notes or attachments soon.`,
      duration: 8000,
      id: "storage-critical",
    });
  } else if (pct >= WARN_THRESHOLD && !hasWarned) {
    hasWarned = true;
    toast.warning(`Storage ${percent}% full`, {
      description: `${usedMB} MB used of ${quotaMB} MB — consider removing old notes or attachments soon.`,
      duration: 6000,
      id: "storage-warning",
    });
  }
  return info;
}

// For manual override (tests / debug)
export function _resetStorageWarnings() {
  hasWarned = false;
  hasCriticalWarned = false;
}
