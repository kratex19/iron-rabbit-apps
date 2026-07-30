// Restaurants Galore™ — Phase 5 modals.
//   • RestaurantBackupModal — Export / Import all Restaurants Galore data as JSON
//   • MapsPickerModal       — Google Maps / Waze / Apple Maps chooser

import React, { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Download, Upload, HardDriveDownload, MapPin, ExternalLink, Sparkles, Cloud, CloudUpload, CloudDownload, AlertCircle, Settings2, Lock, LockOpen, Timer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RestaurantsService from "../../storage/restaurantsService";
import "./glass-theme.css";

const APP_VERSION = "iron-rabbit@1.0";
const GLASS_KEY = "rg_glass_theme";
const LAST_BACKUP_KEY = "rg_last_backup_at";
const WEBDAV_CFG_KEY = "rg_webdav_cfg";
const GDRIVE_CID_KEY = "rg_gdrive_client_id";
export const SCHEDULE_CFG_KEY = "rg_backup_schedule";
// Schedule shape: { interval: "off"|"weekly"|"monthly", target: "local"|"webdav"|"gdrive", passphrase_hint: "" }

// Return days since the last successful backup, or Infinity if never backed up.
export function daysSinceLastBackup() {
  const iso = localStorage.getItem(LAST_BACKUP_KEY);
  if (!iso) return Infinity;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return Infinity;
  return Math.floor((Date.now() - then) / 86400000);
}

// Human-readable "synced X ago" label. Returns null if never backed up.
export function lastBackupLabel() {
  const iso = localStorage.getItem(LAST_BACKUP_KEY);
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return null;
  const ms = Date.now() - then;
  if (ms < 60_000) return "just now";
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// Build the full backup payload (used by all export paths — local, WebDAV, GDrive).
async function buildBackupPayload() {
  const dump = await RestaurantsService.exportAll();
  const meta = {
    app: APP_VERSION,
    exported_at: new Date().toISOString(),
    counts: Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
  };
  return { meta, data: dump };
}

// ---------------------------------------------------------------------------
// Auto-scheduled backup runner
// ---------------------------------------------------------------------------
// Called at app boot from NotesApp.jsx. Silently runs a backup if:
//   1. schedule.interval is "weekly" or "monthly"
//   2. days since last backup >= threshold for that interval
// Returns { ran: bool, reason: string, target: string, encrypted: bool }.
export async function runScheduledBackupIfDue() {
  let schedule = {};
  try { schedule = JSON.parse(localStorage.getItem("rg_backup_schedule") || "{}"); }
  catch { schedule = {}; }
  const interval = schedule.interval || "off";
  if (interval === "off" || (interval !== "weekly" && interval !== "monthly")) {
    return { ran: false, reason: "schedule off" };
  }
  const thresholdDays = interval === "weekly" ? 7 : 30;
  const last = localStorage.getItem("rg_last_auto_backup_at");
  const lastMs = last ? new Date(last).getTime() : 0;
  const dueMs = lastMs + thresholdDays * 86400000;
  if (Date.now() < dueMs) {
    return { ran: false, reason: "not due" };
  }

  const target = schedule.target || "local";
  const passphrase = schedule.passphrase || ""; // optional: not persisted by UI; users can set separately
  const wantEncrypt = !!passphrase;

  let payload = await buildBackupPayload();
  if (wantEncrypt) {
    try {
      payload = await RestaurantsService.encryptPayload(payload, passphrase);
    } catch (e) {
      return { ran: false, reason: "encrypt failed: " + (e.message || e) };
    }
  }

  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const filename = wantEncrypt
    ? `restaurants-galore-auto-${stamp}.rgenc`
    : `restaurants-galore-auto-${stamp}.json`;

  if (target === "local") {
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      return { ran: false, reason: "download failed: " + (e.message || e) };
    }
  } else if (target === "webdav") {
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem("rg_webdav_cfg") || "{}"); }
    catch { cfg = {}; }
    if (!cfg.url) return { ran: false, reason: "webdav not configured" };
    const base = (cfg.url || "").replace(/\/$/, "");
    const path = (cfg.path || "iron-rabbit-backup.json").replace(/^\//, "");
    const auth = "Basic " + btoa(`${cfg.user || ""}:${cfg.pass || ""}`);
    try {
      const res = await fetch(`${base}/${path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify(payload, null, 2),
      });
      if (!res.ok) return { ran: false, reason: `webdav HTTP ${res.status}` };
    } catch (e) {
      return { ran: false, reason: "webdav failed: " + (e.message || e) };
    }
  } else if (target === "gdrive") {
    // Google Drive requires an interactive OAuth consent — silent boot-time
    // uploads aren't possible without a prior refresh token. We skip and
    // let the user push manually from the Backup modal.
    return { ran: false, reason: "gdrive requires manual push (no silent OAuth)" };
  }

  const now = new Date().toISOString();
  localStorage.setItem("rg_last_auto_backup_at", now);
  localStorage.setItem("rg_last_backup_at", now);
  return { ran: true, target, encrypted: wantEncrypt };
}

// =========================================================================
// BACKUP / RESTORE
// =========================================================================
export function RestaurantBackupModal({ isOpen, onClose, isDark }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [glassOn, setGlassOn] = useState(() => localStorage.getItem(GLASS_KEY) === "1");

  // Encryption
  const [encryptOn, setEncryptOn] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [pendingEncrypted, setPendingEncrypted] = useState(null); // {envelope, filename} awaiting passphrase
  const [importPass, setImportPass] = useState("");
  const [diff, setDiff] = useState(null);
  const [diffMode, setDiffMode] = useState("merge"); // "merge" | "replace"

  // Schedule
  const [schedule, setSchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SCHEDULE_CFG_KEY) || "{}"); }
    catch { return {}; }
  });
  const persistSchedule = (next) => {
    setSchedule(next);
    localStorage.setItem(SCHEDULE_CFG_KEY, JSON.stringify(next));
  };

  // Apply/remove the body attribute so CSS can target every open dialog
  useEffect(() => {
    document.body.setAttribute("data-rg-glass", glassOn ? "true" : "false");
    localStorage.setItem(GLASS_KEY, glassOn ? "1" : "0");
  }, [glassOn]);

  // Compute the diff report whenever a preview is loaded
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!preview?.data) { setDiff(null); return; }
      try {
        const d = await RestaurantsService.computeBackupDiff(preview.data);
        if (!cancelled) setDiff(d);
      } catch {
        if (!cancelled) setDiff(null);
      }
    })();
    return () => { cancelled = true; };
  }, [preview]);

  // Build the final download payload — encrypted or plain — from the raw
  // {meta, data} payload. Throws if encryption is on but passphrase is missing.
  const maybeEncrypt = async (payload) => {
    if (!encryptOn) return { payload, ext: "json", mime: "application/json" };
    if (!passphrase || passphrase.length < 4) {
      throw new Error("Enter a passphrase of 4+ characters");
    }
    const envelope = await RestaurantsService.encryptPayload(payload, passphrase);
    return { payload: envelope, ext: "rgenc", mime: "application/octet-stream" };
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      const raw = await buildBackupPayload();
      const { payload, ext, mime } = await maybeEncrypt(raw);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `restaurants-galore-backup-${stamp}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      const suffix = encryptOn ? " (encrypted)" : "";
      toast.success(`Exported ${raw.meta.counts.restaurants || 0} restaurants${suffix}`);
    } catch (e) {
      toast.error(`Export failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  const handleFileSelect = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (RestaurantsService.isEncryptedPayload(parsed)) {
        setPendingEncrypted({ envelope: parsed, filename: file.name });
        setImportPass("");
        return;
      }
      if (!parsed.data) throw new Error("Invalid backup file — missing 'data' key");
      setPreview({ meta: parsed.meta || {}, data: parsed.data, filename: file.name });
    } catch (e) {
      toast.error(`Could not read file: ${e.message}`);
    }
  };

  const handleDecryptPending = async () => {
    if (!pendingEncrypted) return;
    if (!importPass) { toast.error("Enter the passphrase"); return; }
    setBusy(true);
    try {
      const decrypted = await RestaurantsService.decryptPayload(pendingEncrypted.envelope, importPass);
      if (!decrypted.data) throw new Error("Decrypted payload has no 'data' key");
      setPreview({ meta: decrypted.meta || pendingEncrypted.envelope.meta || {}, data: decrypted.data, filename: pendingEncrypted.filename + " (decrypted)" });
      setPendingEncrypted(null);
      setImportPass("");
      toast.success("Decrypted");
    } catch (e) {
      toast.error(e.message || "Decrypt failed");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (mode) => {
    if (!preview) return;
    setBusy(true);
    try {
      await RestaurantsService.importAll(preview.data, mode);
      toast.success(mode === "merge" ? "Merged into your library" : "Restored from backup");
      setPreview(null);
    } catch (e) {
      toast.error(`Import failed: ${e.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  // ================= WEBDAV SYNC =================
  const [webdav, setWebdav] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WEBDAV_CFG_KEY) || "{}"); }
    catch { return {}; }
  });
  const [webdavForm, setWebdavForm] = useState(false);

  const persistWebdav = (next) => {
    setWebdav(next);
    localStorage.setItem(WEBDAV_CFG_KEY, JSON.stringify(next));
  };
  const webdavAuth = () => "Basic " + btoa(`${webdav.user || ""}:${webdav.pass || ""}`);
  const webdavUrl = () => {
    const base = (webdav.url || "").replace(/\/$/, "");
    const path = (webdav.path || "iron-rabbit-backup.json").replace(/^\//, "");
    return `${base}/${path}`;
  };

  const handleWebdavPush = async () => {
    if (!webdav.url) { toast.error("Add your WebDAV URL first"); return; }
    setBusy(true);
    try {
      const raw = await buildBackupPayload();
      const { payload } = await maybeEncrypt(raw);
      const res = await fetch(webdavUrl(), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: webdavAuth() },
        body: JSON.stringify(payload, null, 2),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      const suffix = encryptOn ? " (encrypted)" : "";
      toast.success(`Pushed backup to ${new URL(webdav.url).hostname}${suffix}`);
    } catch (e) {
      toast.error(`WebDAV push failed: ${e.message || e}`);
    } finally { setBusy(false); }
  };
  const handleWebdavPull = async () => {
    if (!webdav.url) { toast.error("Add your WebDAV URL first"); return; }
    setBusy(true);
    try {
      const res = await fetch(webdavUrl(), {
        method: "GET",
        headers: { Authorization: webdavAuth() },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const parsed = await res.json();
      if (RestaurantsService.isEncryptedPayload(parsed)) {
        setPendingEncrypted({ envelope: parsed, filename: `webdav:${webdav.path || "backup"}` });
        setImportPass("");
        toast.info("Encrypted backup — enter passphrase to decrypt");
        return;
      }
      if (!parsed.data) throw new Error("Not a backup file");
      setPreview({ meta: parsed.meta || {}, data: parsed.data, filename: `webdav:${webdav.path || "backup.json"}` });
      toast.success("Loaded backup — preview below");
    } catch (e) {
      toast.error(`WebDAV pull failed: ${e.message || e}`);
    } finally { setBusy(false); }
  };

  // ================= GOOGLE DRIVE (via GIS token client) =================
  const [gdClientId, setGdClientId] = useState(() => localStorage.getItem(GDRIVE_CID_KEY) || "");
  const [gdClientIdForm, setGdClientIdForm] = useState(false);
  const [gdReady, setGdReady] = useState(false);

  // Load Google Identity Services once the modal opens (only if a client id is set)
  useEffect(() => {
    if (!isOpen || !gdClientId) return;
    if (window.google?.accounts?.oauth2) { setGdReady(true); return; }
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) return;
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true; s.defer = true;
    s.onload = () => setGdReady(true);
    document.body.appendChild(s);
  }, [isOpen, gdClientId]);

  const gdRequestToken = () => new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) return reject(new Error("Google client not ready"));
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: gdClientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (t) => t?.access_token ? resolve(t.access_token) : reject(new Error("No access token")),
      error_callback: (e) => reject(new Error(e?.message || "OAuth denied")),
    });
    client.requestAccessToken();
  });

  const gdFileName = "iron-rabbit-backup.json";

  const gdFindFileId = async (token) => {
    const q = encodeURIComponent(`name='${gdFileName}' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Drive search HTTP ${res.status}`);
    const data = await res.json();
    return data.files?.[0]?.id || null;
  };

  const handleGDrivePush = async () => {
    if (!gdClientId) { toast.error("Add your Google OAuth Client ID first"); return; }
    setBusy(true);
    try {
      const token = await gdRequestToken();
      const raw = await buildBackupPayload();
      const { payload } = await maybeEncrypt(raw);
      const existingId = await gdFindFileId(token);

      const boundary = "iron-rabbit-boundary-" + Date.now();
      const metadata = { name: gdFileName, mimeType: "application/json" };
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n` +
        `--${boundary}--`;

      const url = existingId
        ? `https://www.googleapis.com/upload/drive/v3/files/${existingId}?uploadType=multipart`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;
      const res = await fetch(url, {
        method: existingId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      });
      if (!res.ok) throw new Error(`Drive upload HTTP ${res.status}`);
      localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString());
      const suffix = encryptOn ? " (encrypted)" : "";
      toast.success((existingId ? "Updated Drive backup" : "Uploaded to Drive") + suffix);
    } catch (e) {
      toast.error(`Google Drive push failed: ${e.message || e}`);
    } finally { setBusy(false); }
  };

  const handleGDrivePull = async () => {
    if (!gdClientId) { toast.error("Add your Google OAuth Client ID first"); return; }
    setBusy(true);
    try {
      const token = await gdRequestToken();
      const existingId = await gdFindFileId(token);
      if (!existingId) throw new Error("No backup found in Drive");
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${existingId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Drive download HTTP ${res.status}`);
      const parsed = await res.json();
      if (RestaurantsService.isEncryptedPayload(parsed)) {
        setPendingEncrypted({ envelope: parsed, filename: `gdrive:${gdFileName}` });
        setImportPass("");
        toast.info("Encrypted backup — enter passphrase to decrypt");
        return;
      }
      if (!parsed.data) throw new Error("Not a valid backup");
      setPreview({ meta: parsed.meta || {}, data: parsed.data, filename: `gdrive:${gdFileName}` });
      toast.success("Loaded backup from Drive");
    } catch (e) {
      toast.error(`Google Drive pull failed: ${e.message || e}`);
    } finally { setBusy(false); }
  };

  const days = daysSinceLastBackup();
  const stale = days > 30 && isFinite(days);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-lg ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="backup-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><HardDriveDownload className="w-5 h-5 text-amber-400" /> Backup & Restore</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Export everything in your dining library to a JSON file — bring it back on any device.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className={`rounded-lg p-3 border flex items-center justify-between ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid="glass-toggle-row">
            <div>
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Glass workspace theme
              </div>
              <div className={`text-[11px] mt-0.5 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                Frosted-blur backdrop for every Restaurants Galore modal.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGlassOn(!glassOn)}
              className={`relative w-11 h-6 rounded-full transition-colors ${glassOn ? "bg-amber-500" : isDark ? "bg-white/20" : "bg-gray-300"}`}
              data-testid="glass-toggle"
              aria-pressed={glassOn}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${glassOn ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <div className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`}>
            <div className={`text-xs font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Export</div>
            <div className={`text-[11px] mb-2 ${isDark ? "text-slate-400" : "text-gray-600"}`}>
              Downloads a single .json file — restaurants, menus, orders, reviews, photos, and everything else.
              {isFinite(days) && (
                <span className={`ml-1 font-medium ${stale ? "text-amber-400" : isDark ? "text-slate-300" : "text-gray-700"}`}>
                  Last: {days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`}.
                </span>
              )}
            </div>
            {stale && (
              <div className={`text-[11px] mb-2 flex items-center gap-1.5 ${isDark ? "text-amber-300" : "text-amber-800"}`} data-testid="backup-stale-nudge">
                <AlertCircle className="w-3 h-3" /> It&apos;s been over 30 days — time for a fresh backup.
              </div>
            )}
            <Button onClick={handleExport} disabled={busy} className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white" data-testid="backup-export-btn">
              <Download className="w-4 h-4 mr-1" /> Download backup
            </Button>
          </div>

          <div className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid="encryption-panel">
            <div className="flex items-center justify-between mb-2">
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                {encryptOn ? <Lock className="w-3.5 h-3.5 text-emerald-400" /> : <LockOpen className="w-3.5 h-3.5 text-slate-400" />}
                Encrypt backups
                <span className={`text-[10px] font-normal ml-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>AES-256-GCM</span>
              </div>
              <button
                type="button"
                onClick={() => setEncryptOn(!encryptOn)}
                className={`relative w-11 h-6 rounded-full transition-colors ${encryptOn ? "bg-emerald-500" : isDark ? "bg-white/20" : "bg-gray-300"}`}
                data-testid="encrypt-toggle"
                aria-pressed={encryptOn}
                aria-label="Encrypt backups"
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${encryptOn ? "translate-x-5" : ""}`} />
              </button>
            </div>
            {encryptOn && (
              <div className="space-y-1.5">
                <Input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Enter a strong passphrase (4+ chars)"
                  className="h-8 text-xs"
                  data-testid="encrypt-passphrase"
                  autoComplete="new-password"
                />
                <div className={`text-[10px] leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Files export as <code>.rgenc</code>. The passphrase is never stored or transmitted — losing it means the backup can&apos;t be recovered.
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid="schedule-panel">
            <div className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"}`}>
              <Timer className="w-3.5 h-3.5 text-sky-400" /> Auto-backup schedule
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={schedule.interval || "off"}
                onChange={(e) => persistSchedule({ ...schedule, interval: e.target.value })}
                className={`h-8 rounded-md border px-2 text-xs ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                data-testid="schedule-interval"
              >
                <option value="off">Off</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
              <select
                value={schedule.target || "local"}
                onChange={(e) => persistSchedule({ ...schedule, target: e.target.value })}
                className={`h-8 rounded-md border px-2 text-xs ${isDark ? "bg-white/5 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900"}`}
                data-testid="schedule-target"
                disabled={schedule.interval === "off" || !schedule.interval}
              >
                <option value="local">Local download</option>
                <option value="webdav">WebDAV</option>
                <option value="gdrive">Google Drive</option>
              </select>
            </div>
            <div className={`text-[10px] mt-1.5 leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Runs on next app open once the interval has passed. Google Drive requires re-consent per session (skipped silently).
            </div>
            {(schedule.interval === "weekly" || schedule.interval === "monthly") && (
              <div className="mt-2 space-y-1">
                <Input
                  type="password"
                  value={schedule.passphrase || ""}
                  onChange={(e) => persistSchedule({ ...schedule, passphrase: e.target.value })}
                  placeholder="Optional: passphrase to encrypt auto-backups"
                  className="h-8 text-xs"
                  data-testid="schedule-passphrase"
                  autoComplete="new-password"
                />
                <div className={`text-[10px] leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  If set, auto-backups are AES-256 encrypted with this passphrase. Stored locally in your browser — clear it any time.
                </div>
              </div>
            )}
          </div>

          <div className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`}>
            <div className={`text-xs font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Restore</div>
            <div className={`text-[11px] mb-2 ${isDark ? "text-slate-400" : "text-gray-600"}`}>Pick a backup file to preview before merging or replacing.</div>
            <input ref={fileRef} type="file" accept="application/json,.json,.rgenc" onChange={(e) => handleFileSelect(e.target.files?.[0])} className="hidden" data-testid="backup-file-input" />
            <Button onClick={() => fileRef.current?.click()} disabled={busy} variant="outline" className="w-full h-9" data-testid="backup-choose-btn">
              <Upload className="w-4 h-4 mr-1" /> Choose file…
            </Button>
          </div>

          {/* WebDAV cloud sync */}
          <div className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid="webdav-panel">
            <div className="flex items-center justify-between mb-2">
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                <Cloud className="w-3.5 h-3.5 text-sky-400" /> WebDAV sync
                {webdav.url && <span className={`text-[10px] font-normal ml-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>{(() => { try { return new URL(webdav.url).hostname; } catch { return "configured"; } })()}</span>}
              </div>
              <button type="button" onClick={() => setWebdavForm(!webdavForm)} className={`text-[10px] flex items-center gap-1 ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`} data-testid="webdav-config-btn" aria-label="WebDAV settings">
                <Settings2 className="w-3 h-3" /> {webdavForm ? "Hide" : "Configure"}
              </button>
            </div>
            {webdavForm && (
              <div className="space-y-2 mb-2" data-testid="webdav-config-form">
                <Input value={webdav.url || ""} onChange={(e) => persistWebdav({ ...webdav, url: e.target.value })} placeholder="https://cloud.example.com/remote.php/dav/files/USER" className="h-8 text-xs" data-testid="webdav-url" />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={webdav.user || ""} onChange={(e) => persistWebdav({ ...webdav, user: e.target.value })} placeholder="username" className="h-8 text-xs" data-testid="webdav-user" />
                  <Input type="password" value={webdav.pass || ""} onChange={(e) => persistWebdav({ ...webdav, pass: e.target.value })} placeholder="app password" className="h-8 text-xs" data-testid="webdav-pass" />
                </div>
                <Input value={webdav.path || ""} onChange={(e) => persistWebdav({ ...webdav, path: e.target.value })} placeholder="iron-rabbit-backup.json" className="h-8 text-xs" data-testid="webdav-path" />
                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Credentials stay in your browser only. Never sent to Emergent.
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleWebdavPush} disabled={busy || !webdav.url} className="h-8 bg-sky-500 hover:bg-sky-600 text-white" data-testid="webdav-push-btn">
                <CloudUpload className="w-3.5 h-3.5 mr-1" /> Push
              </Button>
              <Button onClick={handleWebdavPull} disabled={busy || !webdav.url} variant="outline" className="h-8" data-testid="webdav-pull-btn">
                <CloudDownload className="w-3.5 h-3.5 mr-1" /> Pull
              </Button>
            </div>
          </div>

          {/* Google Drive */}
          <div className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`} data-testid="gdrive-panel">
            <div className="flex items-center justify-between mb-2">
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-white" : "text-gray-900"}`}>
                <svg viewBox="0 0 87.3 78" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/><path d="M43.65 25l-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/><path d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/><path d="M59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/><path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/></svg>
                Google Drive
                {gdClientId && <span className={`text-[10px] font-normal ml-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>configured</span>}
              </div>
              <button type="button" onClick={() => setGdClientIdForm(!gdClientIdForm)} className={`text-[10px] flex items-center gap-1 ${isDark ? "text-slate-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`} data-testid="gdrive-config-btn" aria-label="Google Drive settings">
                <Settings2 className="w-3 h-3" /> {gdClientIdForm ? "Hide" : "Configure"}
              </button>
            </div>
            {gdClientIdForm && (
              <div className="space-y-1 mb-2" data-testid="gdrive-config-form">
                <Input
                  value={gdClientId}
                  onChange={(e) => { setGdClientId(e.target.value); localStorage.setItem(GDRIVE_CID_KEY, e.target.value); }}
                  placeholder="123-abc.apps.googleusercontent.com"
                  className="h-8 text-xs font-mono"
                  data-testid="gdrive-client-id"
                />
                <div className={`text-[10px] leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  1) Create a Google Cloud project → OAuth Client ID (Web app). 2) Add your app URL as Authorized JavaScript origin. 3) Paste the Client ID above. Uses <code>drive.file</code> scope (only files this app creates).
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleGDrivePush} disabled={busy || !gdClientId || !gdReady} className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="gdrive-push-btn">
                <CloudUpload className="w-3.5 h-3.5 mr-1" /> Push
              </Button>
              <Button onClick={handleGDrivePull} disabled={busy || !gdClientId || !gdReady} variant="outline" className="h-8" data-testid="gdrive-pull-btn">
                <CloudDownload className="w-3.5 h-3.5 mr-1" /> Pull
              </Button>
            </div>
            {gdClientId && !gdReady && (
              <div className={`text-[10px] italic mt-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>Loading Google client…</div>
            )}
          </div>

          {pendingEncrypted && (
            <div className={`rounded-lg p-3 border-2 space-y-2 ${isDark ? "border-emerald-500/30 bg-emerald-500/5" : "border-emerald-300 bg-emerald-50"}`} data-testid="decrypt-panel">
              <div className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? "text-emerald-300" : "text-emerald-900"}`}>
                <Lock className="w-3.5 h-3.5" /> Encrypted backup — {pendingEncrypted.filename}
              </div>
              <Input
                type="password"
                value={importPass}
                onChange={(e) => setImportPass(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleDecryptPending(); }}
                placeholder="Passphrase"
                className="h-9"
                autoFocus
                data-testid="decrypt-passphrase"
              />
              <div className="flex gap-2">
                <Button onClick={handleDecryptPending} disabled={busy || !importPass} className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="decrypt-submit">Decrypt & Preview</Button>
                <Button onClick={() => { setPendingEncrypted(null); setImportPass(""); }} variant="outline" disabled={busy}>Cancel</Button>
              </div>
            </div>
          )}

          {preview && (
            <div className={`rounded-lg p-3 border-2 space-y-2 ${isDark ? "border-amber-500/30 bg-amber-500/5" : "border-amber-300 bg-amber-50"}`} data-testid="backup-preview">
              <div className={`text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-900"}`}>{preview.filename}</div>
              {preview.meta.exported_at && <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-600"}`}>Exported {new Date(preview.meta.exported_at).toLocaleString()}</div>}
              <div className={`text-[11px] ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                {Object.entries(preview.data).map(([k, v]) => (
                  <span key={k} className={`inline-block mr-2 mb-1 px-1.5 py-0.5 rounded ${isDark ? "bg-white/10" : "bg-white border border-gray-200"}`}>{k}: {Array.isArray(v) ? v.length : 0}</span>
                ))}
              </div>

              {/* ---------- Diff report ---------- */}
              {diff && (
                <div className={`rounded-md border p-2 space-y-1.5 ${isDark ? "bg-black/20 border-white/10" : "bg-white border-gray-200"}`} data-testid="backup-diff">
                  <div className="flex items-center justify-between">
                    <div className={`text-[11px] font-semibold ${isDark ? "text-slate-200" : "text-gray-800"}`}>What will change</div>
                    <div className={`inline-flex rounded-md border overflow-hidden text-[10px] ${isDark ? "border-white/10" : "border-gray-200"}`}>
                      <button type="button" onClick={() => setDiffMode("merge")} className={`px-2 py-0.5 ${diffMode === "merge" ? (isDark ? "bg-emerald-500/30 text-emerald-200" : "bg-emerald-500 text-white") : (isDark ? "text-slate-400" : "text-gray-500")}`} data-testid="diff-mode-merge">If Merge</button>
                      <button type="button" onClick={() => setDiffMode("replace")} className={`px-2 py-0.5 ${diffMode === "replace" ? (isDark ? "bg-red-500/30 text-red-200" : "bg-red-500 text-white") : (isDark ? "text-slate-400" : "text-gray-500")}`} data-testid="diff-mode-replace">If Replace</button>
                    </div>
                  </div>
                  <div className={`grid grid-cols-3 gap-1 text-[10px] font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`} data-testid="diff-totals">
                    <span className={`px-1.5 py-0.5 rounded ${isDark ? "bg-emerald-500/20 text-emerald-300" : "bg-emerald-100 text-emerald-800"}`}>+{diff.totals.added} added</span>
                    <span className={`px-1.5 py-0.5 rounded ${isDark ? "bg-sky-500/20 text-sky-300" : "bg-sky-100 text-sky-800"}`}>~{diff.totals.changed} changed</span>
                    {diffMode === "replace" ? (
                      <span className={`px-1.5 py-0.5 rounded ${isDark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-800"}`}>-{diff.totals.removed} removed</span>
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-slate-500" : "bg-gray-100 text-gray-500"}`}>{diff.totals.unchanged} kept</span>
                    )}
                  </div>
                  {(() => {
                    const rows = Object.entries(diff.collections).filter(([, c]) => {
                      if (diffMode === "replace") return c.added || c.changed || c.removed;
                      return c.added || c.changed;
                    });
                    if (rows.length === 0) {
                      return <div className={`text-[10px] italic ${isDark ? "text-slate-500" : "text-gray-500"}`}>Nothing to change — this backup matches your current library.</div>;
                    }
                    return (
                      <div className="space-y-0.5 max-h-32 overflow-y-auto pr-1" data-testid="diff-collections">
                        {rows.map(([key, c]) => (
                          <div key={key} className={`flex justify-between items-center text-[10px] ${isDark ? "text-slate-400" : "text-gray-600"}`} data-testid={`diff-row-${key}`}>
                            <span className="capitalize">{key.replace(/_/g, " ")}</span>
                            <span className="tabular-nums space-x-1.5">
                              {c.added > 0 && <span className={isDark ? "text-emerald-300" : "text-emerald-700"}>+{c.added}</span>}
                              {c.changed > 0 && <span className={isDark ? "text-sky-300" : "text-sky-700"}>~{c.changed}</span>}
                              {diffMode === "replace" && c.removed > 0 && <span className={isDark ? "text-red-300" : "text-red-700"}>-{c.removed}</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button onClick={() => handleImport("merge")} disabled={busy} className="flex-1 h-9 bg-emerald-500 hover:bg-emerald-600 text-white" data-testid="backup-merge-btn">Merge</Button>
                <Button onClick={() => { if (window.confirm("Replace ALL Restaurants Galore data? This cannot be undone.")) handleImport("replace"); }} disabled={busy} className="flex-1 h-9 bg-red-500 hover:bg-red-600 text-white" data-testid="backup-replace-btn">Replace all</Button>
                <Button onClick={() => setPreview(null)} variant="outline" disabled={busy}>Cancel</Button>
              </div>
              <div className={`text-[10px] italic ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                Merge keeps existing items and updates matching IDs. Replace deletes everything first.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =========================================================================
// MAPS PICKER (Google / Waze / Apple)
// =========================================================================
export function MapsPickerModal({ isOpen, onClose, isDark, address, name, coords }) {
  const q = encodeURIComponent(address || name || "");
  const links = coords ? {
    google: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
    waze: `https://www.waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`,
    apple: `https://maps.apple.com/?ll=${coords.lat},${coords.lng}&q=${q}`,
  } : {
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
    waze: `https://www.waze.com/ul?q=${q}&navigate=yes`,
    apple: `https://maps.apple.com/?q=${q}`,
  };
  const btn = (label, href, color, testid) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 rounded-lg p-3 border transition-colors ${isDark ? "bg-white/[0.03] border-white/10 hover:bg-white/10" : "bg-white border-gray-200 hover:bg-gray-100 shadow-sm"}`} data-testid={testid}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><MapPin className="w-4 h-4 text-white" /></div>
      <div className="flex-1">
        <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{label}</div>
        <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>{address || name}</div>
      </div>
      <ExternalLink className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
    </a>
  );
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-sm ${isDark ? "bg-[#0B1221] border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid="maps-picker">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}><MapPin className="w-5 h-5 text-amber-400" /> Directions</DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>Open in your favorite navigation app.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {btn("Google Maps", links.google, "bg-emerald-500", "maps-google-btn")}
          {btn("Waze", links.waze, "bg-sky-500", "maps-waze-btn")}
          {btn("Apple Maps", links.apple, "bg-slate-500", "maps-apple-btn")}
        </div>
      </DialogContent>
    </Dialog>
  );
}
