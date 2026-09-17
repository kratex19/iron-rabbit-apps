import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Settings, Upload, Image as ImageIcon, Download, HardDrive, Cloud,
  Smartphone, Trash2, Globe, ChevronRight, ShieldCheck, LayoutGrid, Sparkles, Bell, BellOff, MessageSquareQuote,
  Palette, Paperclip, Flame, Wrench, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PinnedHub from "./PinnedHub";
import FocusModeSchedule from "./FocusModeSchedule";
import FocusNowTimer from "./FocusNowTimer";
import NightVisualsPanel from "./NightVisualsPanel";
import StorageService from "../storage/storageService";
import notificationService from "../notifications/notificationService";
import { SUPPORTED_LANGUAGES } from "../i18n";
import LanguagePicker from "./LanguagePicker";
import QuickGuideButton from "../quickguide/QuickGuideButton";
import QuickGuideSettingsSection from "../quickguide/QuickGuideSettingsSection";
import HeaderPresetPicker from "./HeaderPresetPicker";
import BackgroundPicker from "../components/BackgroundPicker";
import { isCssBackground, bgObjToString, stringToBgObj, resolveBackgroundStyle } from "../utils/bgValue";
import { computeStreak } from "../utils/cleanupStreak";

/**
 * App-level settings — brand (name/logo/header), backup/restore,
 * PWA install, storage usage, clear-data.
 */
export default function SettingsModal({
  isOpen, onClose, settings, onSave, onBackup, onRestore, onClearData,
  onInstallPWA, canInstallPWA, storageInfo, onRestoreFromServer, onOpenSecurity, onOpenOrganization, onOpenQuickAccess, onOpenBackup, onOpenThemeChooser, onOpenStorageCleanup, onOpenSmartCleanup, onSyncPackColors, onFixOrphanedNotes, onForceRefresh, isDark,
}) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({ logo_url: "", header_bg: "", website_url: "", company_name: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  // Home Page header background picker: reused for both "Choose a color"
  // (allowedTabs: color) and "Choose a gradient" (allowedTabs: gradient).
  const [headerBgPicker, setHeaderBgPicker] = useState({ open: false, tab: "color" });
  // Recap card: mirror of settings.last_cleanup, cleared locally when the
  // user dismisses so the card disappears without waiting for a parent
  // settings-prop refresh.
  const [recap, setRecap] = useState(null);
  const currentLng = SUPPORTED_LANGUAGES.find(
    (l) => l.code === (i18n.language || "en").split("-")[0]
  );

  useEffect(() => { if (settings) setFormData(settings); }, [settings]);
  useEffect(() => {
    if (!isOpen) return;
    const lc = settings?.last_cleanup;
    if (!lc?.at || lc?.dismissed_at) { setRecap(null); return; }
    const ageMs = Date.now() - Date.parse(lc.at);
    if (isFinite(ageMs) && ageMs >= 0 && ageMs < 24 * 60 * 60 * 1000) {
      setRecap(lc);
    } else {
      setRecap(null);
    }
  }, [isOpen, settings]);

  const dismissRecap = async () => {
    setRecap(null);
    try {
      await StorageService.saveSettings({
        last_cleanup: { ...(settings?.last_cleanup || {}), dismissed_at: new Date().toISOString() },
      });
    } catch { /* non-fatal */ }
  };

  const handleSave = async () => {
    setSaving(true);
    // Apply attachment limits to StorageService immediately so the change
    // is live without needing a page reload.
    if (formData?.attachment_limits) {
      StorageService.configureAttachmentLimits(formData.attachment_limits);
    }
    await onSave(formData);
    setSaving(false);
    onClose();
    toast.success("Saved!");
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Logo must be under 10MB"); return; }
    setUploadingLogo(true);
    try {
      const dataUrl = await StorageService.uploadImage(file);
      setFormData(prev => ({ ...prev, logo_url: dataUrl }));
      toast.success("Logo loaded!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to load image");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleHeaderUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Header image must be under 5MB"); return; }
    setUploadingHeader(true);
    try {
      const dataUrl = await StorageService.uploadImage(file);
      setFormData(prev => ({ ...prev, header_bg: dataUrl }));
      toast.success("Header image loaded!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to load image");
    } finally {
      setUploadingHeader(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`ir-modal-wide max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Settings className="w-5 h-5 text-indigo-500" /> {t("settings.title")}
            <span className="ml-auto">
              <QuickGuideButton resourceId="IRR-1200" origin="settings" isDark={isDark} size="sm" />
            </span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure app branding, backup and restore your data, install as PWA, or clear all data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {recap && (
            <div
              className={`relative rounded-lg p-3 border-2 flex items-center gap-2.5 ${
                isDark ? "border-emerald-400/50 bg-emerald-500/10" : "border-emerald-400 bg-emerald-50"
              }`}
              data-testid="settings-cleanup-recap"
            >
              <Sparkles className={`w-5 h-5 shrink-0 ${isDark ? "text-emerald-300" : "text-emerald-600"}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold flex items-center gap-1.5 flex-wrap ${isDark ? "text-emerald-100" : "text-emerald-900"}`}>
                  <span>
                    Freed {(recap.freed_bytes / (1024 * 1024)).toFixed(recap.freed_bytes < 1024 * 1024 ? 3 : 2)} MB · {recap.files_count} file{recap.files_count === 1 ? "" : "s"} today
                  </span>
                  {(() => {
                    const streak = recap.streak ?? computeStreak(settings?.cleanup_history);
                    if (streak < 2) return null;
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isDark
                            ? "bg-orange-500/25 text-orange-200 border border-orange-400/50"
                            : "bg-orange-100 text-orange-700 border border-orange-300"
                        }`}
                        title={`${streak} weeks in a row — keep it up!`}
                        data-testid="settings-cleanup-recap-streak"
                      >
                        <Flame className="w-3 h-3" /> {streak}-week streak
                      </span>
                    );
                  })()}
                </div>
                <div className={`text-[11px] ${isDark ? "text-emerald-200/70" : "text-emerald-800/70"}`}>
                  Nice sweep — Smart Cleanup keeps your device breathing.
                </div>
              </div>
              <button
                type="button"
                onClick={dismissRecap}
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  isDark ? "text-emerald-200/70 hover:bg-white/10" : "text-emerald-700/70 hover:bg-emerald-100"
                }`}
                title="Hide"
                data-testid="settings-cleanup-recap-dismiss"
              >
                <span className="text-lg leading-none">×</span>
              </button>
            </div>
          )}
          <QuickGuideSettingsSection isDark={isDark} />
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Globe className="w-3.5 h-3.5" /> {t("settings.language")}
            </label>
            <button
              type="button"
              onClick={() => setLangPickerOpen(true)}
              className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                isDark
                  ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
              }`}
              data-testid="settings-language-btn"
            >
              <span className="text-xl leading-none">{currentLng?.flag || "🌐"}</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">{currentLng?.label || "English"}</div>
                <div className={`text-[10px] uppercase font-mono ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  {currentLng?.code || "en"} · {SUPPORTED_LANGUAGES.length} available
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
            </button>
          </div>

          {/* Security & Privacy row */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <ShieldCheck className="w-3.5 h-3.5" /> Security &amp; Privacy
            </label>
            <button
              type="button"
              onClick={() => { onClose(); setTimeout(() => onOpenSecurity && onOpenSecurity(), 200); }}
              className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                isDark
                  ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
              }`}
              data-testid="settings-security-btn"
            >
              <span className="text-xl leading-none">🔒</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">App Lock &amp; Privacy</div>
                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  PIN · Biometrics · Auto-lock · Privacy statement
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
            </button>
          </div>

          {/* Organization row */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <LayoutGrid className="w-3.5 h-3.5" /> Organization
            </label>
            <button
              type="button"
              onClick={() => { onClose(); setTimeout(() => onOpenOrganization && onOpenOrganization(), 200); }}
              className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                isDark
                  ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
              }`}
              data-testid="settings-organization-btn"
            >
              <span className="text-xl leading-none">↕️</span>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Drag &amp; Drop</div>
                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Long-press · Handles · Haptic · Undo · Confirm moves
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
            </button>
          </div>

          {/* Theme picker row */}
          {onOpenThemeChooser && (
            <div>
              <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Palette className="w-3.5 h-3.5" /> Theme
              </label>
              <button
                type="button"
                onClick={() => { onClose(); setTimeout(() => onOpenThemeChooser && onOpenThemeChooser(), 200); }}
                className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                  isDark
                    ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
                }`}
                data-testid="settings-theme-chooser-btn"
              >
                <Palette className="w-4 h-4 text-indigo-400" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Change theme</div>
                  <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Dark or Light — with translucent glass style
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              </button>
            </div>
          )}

          {/* Quick Access row */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Smartphone className="w-3.5 h-3.5" /> Quick Access
            </label>
            <button
              type="button"
              onClick={() => { onClose(); setTimeout(() => onOpenQuickAccess && onOpenQuickAccess(), 200); }}
              className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                isDark
                  ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
              }`}
              data-testid="settings-quick-access-btn"
            >
              <Smartphone className="w-4 h-4 text-indigo-400" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Pin to Home Screen</div>
                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Step-by-step guide for Android &amp; iPhone
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
            </button>
          </div>

          {/* Backup & Restore row */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Download className="w-3.5 h-3.5" /> Backup &amp; Restore
            </label>
            <button
              type="button"
              onClick={() => { onClose(); setTimeout(() => onOpenBackup && onOpenBackup(), 200); }}
              className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                isDark
                  ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
              }`}
              data-testid="settings-backup-btn"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Export / Import JSON</div>
                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Save every note + attachment to a single offline file
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
            </button>
            {/* Auto-backup toggle — opt-in weekly export to Downloads */}
            <div
              className={`mt-2 rounded-md border px-3 py-2 flex items-center gap-3 ${isDark ? "bg-black/20 border-white/10" : "bg-gray-50 border-gray-200"}`}
              data-testid="settings-auto-backup-row"
            >
              <div className="flex-1">
                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>Automatic weekly backup</div>
                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Silently saves a backup file to Downloads every 7 days
                </div>
              </div>
              <Switch
                checked={!!settings.auto_backup_enabled}
                onCheckedChange={(v) => onSave({ ...settings, auto_backup_enabled: v })}
                data-testid="settings-auto-backup-toggle"
              />
            </div>
            {/* Pinned favourites hub — counts across all pin sources + clear-all + weekly suggestions */}
            <div className="mt-2">
              <PinnedHub isDark={isDark} />
            </div>
          </div>

          {/* Notifications row */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Bell className="w-3.5 h-3.5" /> Notifications
            </label>
            <NotificationsPanel isDark={isDark} />
          </div>

          {/* Focus Mode row — user-facing "quiet hours" toggle. When ON:
              in-app alarm popups + sound + haptic are all silenced;
              OS notifications still land on the lock screen but with
              `silent: true` so nothing beeps. Ideal for late-night use. */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <BellOff className="w-3.5 h-3.5" /> Focus Mode
            </label>
            <div
              className={`rounded-md p-3 flex items-center gap-3 ${
                isDark ? "bg-black/20 border border-white/10" : "bg-gray-50 border border-gray-200"
              }`}
              data-testid="focus-mode-panel"
            >
              <BellOff className={`w-4 h-4 shrink-0 ${settings.focus_mode ? "text-indigo-400" : (isDark ? "text-slate-500" : "text-gray-400")}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-800"}`}>
                  Focus Mode — ON now
                </div>
                <div className={`text-[11px] leading-snug ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Manual override. Silences alarm popups, sound, and haptics right now until you switch it off. Lock-screen notifications still fire silently.
                </div>
              </div>
              <Switch
                checked={!!settings.focus_mode}
                onCheckedChange={(v) => onSave({ ...settings, focus_mode: v })}
                data-testid="focus-mode-toggle"
                aria-label="Toggle Focus Mode now"
              />
            </div>
            {/* Focus Now — chip row that pins Focus ON for a limited
                window without hunting through the manual toggle or the
                schedule. Uses `settings.focus_until` timestamp. */}
            <div className="mt-2">
              <FocusNowTimer
                value={settings.focus_until}
                onChange={(next) => onSave({ ...settings, focus_until: next })}
                location={settings.location}
                isDark={isDark}
              />
            </div>
            {/* Per-day schedule picker — auto-toggles Focus Mode during
                user-defined nightly windows without needing to remember
                to flip the manual switch. */}
            <div className="mt-2">
              <FocusModeSchedule
                value={settings.focus_schedule}
                onChange={(next) => onSave({ ...settings, focus_schedule: next })}
                isDark={isDark}
              />
            </div>
            {/* Night Visuals — snapshot current text/bg brightness for
                automatic use whenever Focus Mode is active (manual,
                timer or schedule). */}
            <div className="mt-2">
              <NightVisualsPanel
                value={settings.focus_night_visuals}
                onChange={(next) => onSave({ ...settings, focus_night_visuals: next })}
                currentBrightness={settings.ui_brightness}
                isDark={isDark}
              />
            </div>
          </div>

          {/* Community Dashboard row — hidden admin surface. Present in Settings
              so the maintainer can moderate submitted tips from any device.  */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <MessageSquareQuote className="w-3.5 h-3.5" /> Community
            </label>
            <a
              href="/admin/community"
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                isDark
                  ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                  : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
              }`}
              data-testid="settings-community-dashboard"
            >
              <MessageSquareQuote className="w-4 h-4 text-emerald-400" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">Community Dashboard</div>
                <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                  Admin-only · review + promote submitted tips
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
            </a>
          </div>

          {/* Sync pack colors row */}
          {onSyncPackColors && (
            <div>
              <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Sparkles className="w-3.5 h-3.5" /> Tile packs
              </label>
              <button
                type="button"
                onClick={onSyncPackColors}
                className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                  isDark
                    ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
                }`}
                data-testid="settings-sync-pack-colors"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Sync pack colors</div>
                  <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Match previously-applied tiles back to their pack accents
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              </button>
            </div>
          )}

          {/* Force refresh — nuclear cache-bust escape hatch. If a
              fresh deploy has not reached the user's PWA (stale
              service worker, cached bundle) they can tap this to
              unregister every SW, delete every cache, and reload.
              Notes are in IndexedDB and are NOT touched. */}
          {onForceRefresh && (
            <div>
              <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <RefreshCw className="w-3.5 h-3.5" /> App shell
              </label>
              <button
                type="button"
                onClick={onForceRefresh}
                className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                  isDark
                    ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
                }`}
                data-testid="settings-force-refresh"
              >
                <RefreshCw className="w-4 h-4 text-sky-400" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Force refresh app</div>
                  <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Clears the cached PWA shell and reloads. Your notes stay safe. Use if a recent update hasn't appeared.
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              </button>
            </div>
          )}

              legacy notes with populated category_path but empty or
              drifted legacy category/subcategory fields. Idempotent. */}
          {onFixOrphanedNotes && (
            <div>
              <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Wrench className="w-3.5 h-3.5" /> Hierarchy health
              </label>
              <button
                type="button"
                onClick={onFixOrphanedNotes}
                className={`w-full flex items-center gap-3 rounded-md h-11 px-3 transition-colors ${
                  isDark
                    ? "bg-black/20 border border-white/10 hover:bg-white/5 text-white"
                    : "bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-800"
                }`}
                data-testid="settings-fix-orphaned-notes"
              >
                <Wrench className="w-4 h-4 text-emerald-400" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">Fix orphaned notes</div>
                  <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                    Repairs any pre-v142 notes where legacy category / subcategory drifted from the deep category_path
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${isDark ? "text-slate-500" : "text-gray-400"}`} />
              </button>
            </div>
          )}

          {/* Accordion effect for Tile Packs in grid view */}
          <div>
            <label className={`text-xs mb-1.5 block flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <Sparkles className="w-3.5 h-3.5" /> Tile Packs — Accordion Effect
            </label>
            <div className={`text-[10px] mb-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Tap a pack title in Grid view to expand or collapse it. List view is unaffected.
            </div>
            <div className="grid grid-cols-3 gap-1.5" data-testid="settings-pack-accordion-mode">
              {[
                { key: "off",    label: "Off" },
                { key: "open",   label: "Open by default" },
                { key: "closed", label: "Closed by default" },
              ].map((opt) => {
                const active = (formData.pack_accordion_mode || "off") === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, pack_accordion_mode: opt.key }))}
                    className={`h-10 rounded-md px-2 text-[11px] font-medium border transition-colors ${
                      active
                        ? "bg-indigo-500 border-indigo-400 text-white"
                        : isDark
                          ? "bg-black/20 border-white/10 text-slate-300 hover:bg-white/5"
                          : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid={`settings-pack-accordion-${opt.key}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keep pack visible when empty — makes empty packs stay on
              screen so users can drop tiles into a freshly-emptied
              destination without the pack disappearing. */}
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <label className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Sparkles className="w-3.5 h-3.5" /> Keep pack visible when empty
              </label>
              <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                Empty packs stay on the home grid as a drop-only zone. Handy when reorganizing.
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!formData.keep_empty_categories}
              onClick={() => setFormData((prev) => ({ ...prev, keep_empty_categories: !prev.keep_empty_categories }))}
              className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${formData.keep_empty_categories ? "bg-indigo-500" : (isDark ? "bg-white/10" : "bg-gray-200")}`}
              data-testid="settings-keep-empty-categories"
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${formData.keep_empty_categories ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{t("settings.company_name")}</label>
            <Input value={formData.company_name} onChange={(e) => setFormData(prev => ({ ...prev, company_name: e.target.value }))} className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} data-testid="settings-company-name" />
          </div>

          {/* Logo Upload Section */}
          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Logo</label>
            <div className="flex gap-2 items-start">
              {formData.logo_url && (
                <img src={formData.logo_url} alt="Logo preview" className="w-12 h-12 rounded-lg object-cover border border-white/20 flex-shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  value={formData.logo_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, logo_url: e.target.value }))}
                  placeholder="Paste URL or upload below"
                  className={`h-9 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-500' : ''}`}
                  data-testid="settings-logo-url"
                />
                <label className={`flex items-center justify-center gap-2 h-9 rounded-md cursor-pointer transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600'}`}>
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                  {uploadingLogo ? (
                    <span className="text-xs">Uploading...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span className="text-xs">Upload from device</span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Header Background Upload Section */}
          <div>
            <label className={`text-xs mb-1.5 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Header Background</label>
            <div className="space-y-2">
              {formData.header_bg && (
                <div className="relative w-full h-16 rounded-lg overflow-hidden border border-white/20">
                  {isCssBackground(formData.header_bg) ? (
                    <div className="w-full h-full" style={resolveBackgroundStyle(formData.header_bg)} />
                  ) : (
                    <img src={formData.header_bg} alt="Header preview" className="w-full h-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, header_bg: "" }))}
                    className="absolute top-1.5 right-1.5 h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 bg-black/60 hover:bg-black/80 text-white backdrop-blur-sm transition-colors"
                    data-testid="settings-header-clear"
                    aria-label="Clear header background"
                    title="Clear header background"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear
                  </button>
                </div>
              )}
              <Input
                value={formData.header_bg}
                onChange={(e) => setFormData(prev => ({ ...prev, header_bg: e.target.value }))}
                placeholder="Paste URL or upload below"
                className={`h-9 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-500' : ''}`}
                data-testid="settings-header-bg"
              />
              <HeaderPresetPicker
                value={formData.header_bg}
                onChange={(url) => setFormData(prev => ({ ...prev, header_bg: url }))}
                isDark={isDark}
              />
              <label className={`flex items-center justify-center gap-2 h-9 rounded-md cursor-pointer transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600'}`}>
                <input type="file" accept="image/*" onChange={handleHeaderUpload} className="hidden" disabled={uploadingHeader} />
                {uploadingHeader ? (
                  <span className="text-xs">Uploading...</span>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4" />
                    <span className="text-xs">Upload from device</span>
                  </>
                )}
              </label>

              {/* Color + Gradient row (matches the two buttons above) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setHeaderBgPicker({ open: true, tab: "color" })}
                  className={`flex items-center justify-center gap-2 h-9 rounded-md transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600'}`}
                  data-testid="settings-header-choose-color"
                >
                  <Palette className="w-4 h-4" />
                  <span className="text-xs">Choose a color</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHeaderBgPicker({ open: true, tab: "gradient" })}
                  className={`flex items-center justify-center gap-2 h-9 rounded-md transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300' : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600'}`}
                  data-testid="settings-header-choose-gradient"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs">Choose a gradient</span>
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Website URL</label>
            <Input value={formData.website_url} onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))} className={`h-9 ${isDark ? 'bg-black/20 border-white/10 text-white' : ''}`} data-testid="settings-website-url" />
          </div>

          {/* Backup & Restore Section */}
          <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <label className={`text-xs mb-2 flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <HardDrive className="w-3.5 h-3.5" /> Backup & Restore
            </label>
            <div className="flex gap-2">
              <Button
                onClick={onBackup}
                variant="outline"
                size="sm"
                className={`flex-1 h-9 ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : ''}`}
                data-testid="backup-btn"
              >
                <Download className="w-4 h-4 mr-1.5" /> Export Backup
              </Button>
              <label className={`flex-1 h-9 flex items-center justify-center gap-1.5 rounded-md cursor-pointer transition-colors text-sm border ${isDark ? 'bg-transparent hover:bg-white/5 border-white/10 text-slate-300' : 'bg-transparent hover:bg-gray-50 border-gray-200 text-gray-700'}`}>
                <input type="file" accept=".json" onChange={onRestore} className="hidden" data-testid="restore-input" />
                <Upload className="w-4 h-4" /> Restore File
              </label>
            </div>
            {onRestoreFromServer && (
              <Button
                onClick={onRestoreFromServer}
                variant="outline"
                size="sm"
                className={`w-full h-9 mt-2 ${isDark ? 'border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
                data-testid="restore-server-btn"
              >
                <Cloud className="w-4 h-4 mr-1.5" /> Recover Old Notes from Server
              </Button>
            )}
          </div>

          {/* Storage Usage */}
          {storageInfo && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                  <HardDrive className="w-3.5 h-3.5" /> Storage Used
                  {Number(storageInfo.percentUsed) >= 90 && (
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isDark ? "bg-red-500/20 text-red-300 border border-red-500/40" : "bg-red-100 text-red-700 border border-red-200"
                      }`}
                      data-testid="settings-storage-critical-badge"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> {storageInfo.percentUsed}% full
                    </span>
                  )}
                </span>
                <span className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-gray-700'}`} data-testid="storage-usage">
                  {storageInfo.usageMB} MB / {storageInfo.quotaMB} MB
                </span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                <div
                  className={`h-full transition-all ${storageInfo.percentUsed > 80 ? 'bg-red-500' : storageInfo.percentUsed > 50 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(storageInfo.percentUsed, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                {storageInfo.percentUsed}% used · All data stored locally on your device
              </p>
              {Number(storageInfo.percentUsed) >= 90 && onOpenSmartCleanup && (
                <Button
                  onClick={onOpenSmartCleanup}
                  size="sm"
                  className="w-full h-8 mt-2 text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                  data-testid="settings-open-smart-cleanup"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Smart Cleanup — free space now
                </Button>
              )}
              {onOpenStorageCleanup && (
                <Button
                  onClick={onOpenStorageCleanup}
                  variant="outline"
                  size="sm"
                  className={`w-full h-8 mt-2 text-xs ${isDark ? "border-indigo-500/40 text-indigo-300 hover:bg-indigo-500/10" : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"}`}
                  data-testid="settings-open-storage-cleanup"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Free up space
                </Button>
              )}
            </div>
          )}

          {/* PWA Install Button */}
          {canInstallPWA && (
            <Button
              onClick={onInstallPWA}
              variant="outline"
              className={`w-full h-9 ${isDark ? 'border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10' : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
              data-testid="pwa-install-btn"
            >
              <Smartphone className="w-4 h-4 mr-1.5" /> Install as App
            </Button>
          )}

          {/* Trash retention (auto-purge age) */}
          <div className={`p-3 rounded-md ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
            <div className={`text-sm mb-0.5 flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
              <Trash2 className="w-4 h-4" /> Trash retention
            </div>
            <div className={`text-[11px] mb-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              Deletions never auto-purge — only manual Empty Trash removes them.
            </div>
            <select
              value={formData.trash_retention_days ?? 7}
              onChange={(e) => setFormData(prev => ({ ...prev, trash_retention_days: parseInt(e.target.value, 10) }))}
              className={`w-full h-9 text-xs rounded-md px-2 border ${isDark ? "bg-black/20 border-white/10 text-white" : "bg-white border-gray-200"}`}
              data-testid="settings-retention-select"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
              <option value={365}>1 year</option>
              <option value={0}>Forever (never auto-purge)</option>
            </select>
          </div>

          {/* Photo & File attachment limits */}
          <div className={`p-3 rounded-md ${isDark ? "bg-white/5" : "bg-gray-50"}`} data-testid="settings-attachment-limits">
            <div className={`text-sm mb-0.5 flex items-center gap-1.5 ${isDark ? "text-slate-200" : "text-gray-800"}`}>
              <Paperclip className="w-4 h-4" /> Photos & Files per Note
            </div>
            <div className={`text-[11px] mb-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
              How many attachments Quick Edit / Expanded Text allow, and the max size per file.
            </div>
            <div className="grid grid-cols-3 gap-2">
              <label className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"} flex flex-col gap-1`}>
                <span>Max images</span>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={formData.attachment_limits?.max_images ?? 10}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attachment_limits: { ...(prev.attachment_limits || {}), max_images: parseInt(e.target.value, 10) || 1 }
                  }))}
                  className={`h-8 text-xs ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                  data-testid="settings-max-images"
                />
              </label>
              <label className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"} flex flex-col gap-1`}>
                <span>Max files</span>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  value={formData.attachment_limits?.max_files ?? 10}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attachment_limits: { ...(prev.attachment_limits || {}), max_files: parseInt(e.target.value, 10) || 0 }
                  }))}
                  className={`h-8 text-xs ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                  data-testid="settings-max-files"
                />
              </label>
              <label className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-500"} flex flex-col gap-1`}>
                <span>Max MB each</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={formData.attachment_limits?.max_mb ?? 10}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    attachment_limits: { ...(prev.attachment_limits || {}), max_mb: parseInt(e.target.value, 10) || 1 }
                  }))}
                  className={`h-8 text-xs ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
                  data-testid="settings-max-mb"
                />
              </label>
            </div>
            <p className={`text-[10px] mt-2 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              Images: 1–50 · Files: 0–50 · Size: 1–100 MB
            </p>
          </div>

          {/* Clear All Data */}
          <div className={`border-t pt-3 ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
            <Button
              onClick={onClearData}
              variant="outline"
              size="sm"
              className={`w-full h-9 text-red-500 hover:text-red-400 ${isDark ? 'border-red-500/30 hover:bg-red-500/10' : 'border-red-200 hover:bg-red-50'}`}
              data-testid="clear-data-btn"
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Clear All Data
            </Button>
            <p className={`text-xs mt-1.5 text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Permanently deletes all notes, templates and settings
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className={`flex-1 h-9 ${isDark ? 'border-white/10 text-slate-300' : ''}`}>{t("action.cancel")}</Button>
            <Button onClick={handleSave} disabled={saving} data-testid="settings-save-btn" className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-600 text-white">
              {saving ? "..." : t("action.save")}
            </Button>
          </div>
        </div>
      </DialogContent>

      <LanguagePicker
        isOpen={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
        isDark={isDark}
      />

      {/* Home Page header color / gradient picker */}
      <BackgroundPicker
        isOpen={headerBgPicker.open}
        onClose={() => setHeaderBgPicker(p => ({ ...p, open: false }))}
        value={stringToBgObj(formData.header_bg)}
        onSelect={(bg) => setFormData(prev => ({ ...prev, header_bg: bgObjToString(bg) }))}
        isDark={isDark}
        initialTab={headerBgPicker.tab}
        allowedTabs={["color", "gradient"]}
        title={headerBgPicker.tab === "gradient" ? "Header gradient" : "Header color"}
        description={headerBgPicker.tab === "gradient"
          ? "Pick a preset gradient or build your own — shown behind the app header."
          : "Pick a color — shown behind the app header."}
      />
    </Dialog>
  );
}

// ============================================================================
// Notifications Panel — permission status + weekly recap toggle + test button
// ============================================================================
function NotificationsPanel({ isDark }) {
  const [status, setStatus] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  );
  const [prefs, setPrefs] = useState({ weekly_recap: true, chore_summary: true, pantry_expiration: true, auto_detect: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await StorageService.getSettings();
      let autoDetect = true;
      try { autoDetect = localStorage.getItem("ir_auto_detect_reminders") !== "0"; }
      catch { /* ignore */ }
      setPrefs({
        weekly_recap: s?.notif_weekly_recap !== false,
        chore_summary: s?.notif_chore_summary !== false,
        pantry_expiration: s?.notif_pantry_expiration !== false,
        auto_detect: autoDetect,
      });
      setLoading(false);
    })();
  }, []);

  const requestPermission = async () => {
    if (typeof Notification === "undefined") {
      toast.error("Your browser doesn't support notifications");
      return;
    }
    const granted = await notificationService.requestPermission();
    setStatus(Notification.permission);
    if (granted) toast.success("Notifications enabled");
    else toast.error("Notifications blocked in browser settings");
  };

  const savePref = async (key, val) => {
    const next = { ...prefs, [key]: val };
    setPrefs(next);
    // Auto-detect is a per-device toggle → stays in localStorage so it
    // ships alongside the other client-only alarm settings.
    if (key === "auto_detect") {
      try { localStorage.setItem("ir_auto_detect_reminders", val ? "1" : "0"); }
      catch { /* ignore */ }
      return;
    }
    await StorageService.saveSettings({
      notif_weekly_recap: next.weekly_recap,
      notif_chore_summary: next.chore_summary,
    });
  };

  const fireTest = async () => {
    if (status !== "granted") { toast.error("Grant permission first"); return; }
    // Route through the shared service so we go through
    // `ServiceWorkerRegistration.showNotification()` on mobile (direct
    // `new Notification()` throws `Illegal constructor` on Chrome PWAs).
    try {
      await notificationService.showNotification("Iron Rabbit · Test", {
        body: "Nice — notifications are working. Weekly recaps will fire on Sunday evenings.",
        tag: "iron-rabbit-test",
      });
    } catch { toast.error("Test notification failed"); }
  };

  const chipCls = isDark
    ? "bg-black/20 border border-white/10 text-white"
    : "bg-gray-50 border border-gray-200 text-gray-800";

  const badgeCls =
    status === "granted" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
    : status === "denied" ? "bg-red-500/20 text-red-300 border border-red-500/30"
    : status === "unsupported" ? "bg-slate-500/20 text-slate-300 border border-slate-500/30"
    : "bg-amber-500/20 text-amber-300 border border-amber-500/30";

  if (loading) return null;

  return (
    <div className={`rounded-md p-3 ${chipCls}`} data-testid="notifications-panel">
      <div className="flex items-center gap-3 mb-3">
        <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeCls}`} data-testid="notifications-permission-status">
          {status === "granted" ? "Enabled" : status === "denied" ? "Blocked" : status === "unsupported" ? "Not supported" : "Not asked"}
        </div>
        {status !== "granted" && status !== "unsupported" && (
          <button
            type="button"
            onClick={requestPermission}
            className="text-xs px-3 py-1 ml-auto rounded-md bg-indigo-500 hover:bg-indigo-600 text-white"
            data-testid="notifications-enable-btn"
          >
            Enable
          </button>
        )}
        {status === "granted" && (
          <button
            type="button"
            onClick={fireTest}
            className={`text-xs px-3 py-1 ml-auto rounded-md ${isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-white border border-gray-200 hover:bg-gray-100 text-gray-800"}`}
            data-testid="notifications-test-btn"
          >
            Send test
          </button>
        )}
      </div>
      <div className="space-y-2.5">
        <NotifToggle
          label="Auto-detect reminders from titles"
          hint="Uses phrases like “tomorrow at 8am” in a NEW note title to set an alarm automatically"
          checked={prefs.auto_detect}
          onChange={(v) => savePref("auto_detect", v)}
          isDark={isDark}
          testid="notif-toggle-auto-detect"
        />
        <NotifToggle
          label="Weekly week-in-review"
          hint="Sundays · summary of notes created + edits + categories"
          checked={prefs.weekly_recap}
          onChange={(v) => savePref("weekly_recap", v)}
          isDark={isDark}
          testid="notif-toggle-weekly-recap"
        />
        <NotifToggle
          label="Weekly chore + allowance summary"
          hint="Sunday evenings · per-kid earnings + streak"
          checked={prefs.chore_summary}
          onChange={(v) => savePref("chore_summary", v)}
          isDark={isDark}
          testid="notif-toggle-chore-summary"
        />
        <NotifToggle
          label="Pantry expiration alerts"
          hint="Once a day · items expired or expiring within 3 days"
          checked={prefs.pantry_expiration}
          onChange={(v) => savePref("pantry_expiration", v)}
          isDark={isDark}
          testid="notif-toggle-pantry-expiration"
        />
      </div>
      <div className={`text-[10px] mt-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
        Fires locally when you open the app — no server, 100% offline.
      </div>
    </div>
  );
}

function NotifToggle({ label, hint, checked, onChange, isDark, testid }) {
  return (
    <label className="flex items-center gap-4 cursor-pointer py-1" data-testid={testid}>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? "bg-emerald-500" : isDark ? "bg-white/10" : "bg-gray-300"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[18px]" : "translate-x-0.5"}`} />
      </button>
      <div className="flex-1 min-w-0">
        <div className={`text-xs font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{label}</div>
        <div className={`text-[10px] mt-0.5 ${isDark ? "text-slate-500" : "text-gray-500"}`}>{hint}</div>
      </div>
    </label>
  );
}
