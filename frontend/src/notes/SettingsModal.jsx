import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Settings, Upload, Image as ImageIcon, Download, HardDrive, Cloud,
  Smartphone, Trash2, Globe, ChevronRight, ShieldCheck, LayoutGrid, Sparkles, Bell, MessageSquareQuote,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PinnedHub from "./PinnedHub";
import StorageService from "../storage/storageService";
import notificationService from "../notifications/notificationService";
import { SUPPORTED_LANGUAGES } from "../i18n";
import LanguagePicker from "./LanguagePicker";
import QuickGuideButton from "../quickguide/QuickGuideButton";
import QuickGuideSettingsSection from "../quickguide/QuickGuideSettingsSection";

/**
 * App-level settings — brand (name/logo/header), backup/restore,
 * PWA install, storage usage, clear-data.
 */
export default function SettingsModal({
  isOpen, onClose, settings, onSave, onBackup, onRestore, onClearData,
  onInstallPWA, canInstallPWA, storageInfo, onRestoreFromServer, onOpenSecurity, onOpenOrganization, onOpenQuickAccess, onOpenBackup, onOpenThemeChooser, onSyncPackColors, isDark,
}) {
  const { t, i18n } = useTranslation();
  const [formData, setFormData] = useState({ logo_url: "", header_bg: "", website_url: "", company_name: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingHeader, setUploadingHeader] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const currentLng = SUPPORTED_LANGUAGES.find(
    (l) => l.code === (i18n.language || "en").split("-")[0]
  );

  useEffect(() => { if (settings) setFormData(settings); }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(formData);
    setSaving(false);
    onClose();
    toast.success("Saved!");
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
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
      <DialogContent className={`max-w-md max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="settings-modal">
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
                <div className="w-full h-16 rounded-lg overflow-hidden border border-white/20">
                  <img src={formData.header_bg} alt="Header preview" className="w-full h-full object-cover" />
                </div>
              )}
              <Input
                value={formData.header_bg}
                onChange={(e) => setFormData(prev => ({ ...prev, header_bg: e.target.value }))}
                placeholder="Paste URL or upload below"
                className={`h-9 text-xs ${isDark ? 'bg-black/20 border-white/10 text-white placeholder:text-slate-500' : ''}`}
                data-testid="settings-header-bg"
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
            <Button onClick={handleSave} disabled={saving} className="flex-1 h-9 bg-indigo-500 hover:bg-indigo-600 text-white">
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
  const [prefs, setPrefs] = useState({ weekly_recap: true, chore_summary: true, pantry_expiration: true });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const s = await StorageService.getSettings();
      setPrefs({
        weekly_recap: s?.notif_weekly_recap !== false,
        chore_summary: s?.notif_chore_summary !== false,
        pantry_expiration: s?.notif_pantry_expiration !== false,
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
    await StorageService.saveSettings({
      notif_weekly_recap: next.weekly_recap,
      notif_chore_summary: next.chore_summary,
    });
  };

  const fireTest = () => {
    if (status !== "granted") { toast.error("Grant permission first"); return; }
    try {
      // eslint-disable-next-line no-new
      new Notification("Iron Rabbit · Test", {
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
      <div className="space-y-1.5">
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
    <label className="flex items-center gap-3 cursor-pointer" data-testid={testid}>
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
        <div className={`text-[10px] ${isDark ? "text-slate-500" : "text-gray-500"}`}>{hint}</div>
      </div>
    </label>
  );
}
