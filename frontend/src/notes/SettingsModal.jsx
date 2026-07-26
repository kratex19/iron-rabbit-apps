import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Settings, Upload, Image as ImageIcon, Download, HardDrive, Cloud,
  Smartphone, Trash2, Globe, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import StorageService from "../storage/storageService";
import { SUPPORTED_LANGUAGES } from "../i18n";
import LanguagePicker from "./LanguagePicker";

/**
 * App-level settings — brand (name/logo/header), backup/restore,
 * PWA install, storage usage, clear-data.
 */
export default function SettingsModal({
  isOpen, onClose, settings, onSave, onBackup, onRestore, onClearData,
  onInstallPWA, canInstallPWA, storageInfo, onRestoreFromServer, isDark,
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
      <DialogContent className={`max-w-md ${isDark ? 'bg-[#0B1221] border-white/10' : 'bg-white border-gray-200'}`} data-testid="settings-modal">
        <DialogHeader>
          <DialogTitle className={`font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            <Settings className="w-5 h-5 text-indigo-500" /> {t("settings.title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configure app branding, backup and restore your data, install as PWA, or clear all data.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
