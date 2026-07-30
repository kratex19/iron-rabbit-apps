// Restaurants Galore™ — Phase 5 modals.
//   • RestaurantBackupModal — Export / Import all Restaurants Galore data as JSON
//   • MapsPickerModal       — Google Maps / Waze / Apple Maps chooser

import React, { useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import { Download, Upload, HardDriveDownload, MapPin, ExternalLink, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import RestaurantsService from "../storage/restaurantsService";
import "./rg/glass-theme.css";

const APP_VERSION = "iron-rabbit@1.0";
const GLASS_KEY = "rg_glass_theme";

// =========================================================================
// BACKUP / RESTORE
// =========================================================================
export function RestaurantBackupModal({ isOpen, onClose, isDark }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);
  const [glassOn, setGlassOn] = useState(() => localStorage.getItem(GLASS_KEY) === "1");

  // Apply/remove the body attribute so CSS can target every open dialog
  useEffect(() => {
    document.body.setAttribute("data-rg-glass", glassOn ? "true" : "false");
    localStorage.setItem(GLASS_KEY, glassOn ? "1" : "0");
  }, [glassOn]);

  const handleExport = async () => {
    setBusy(true);
    try {
      const dump = await RestaurantsService.exportAll();
      const meta = {
        app: APP_VERSION,
        exported_at: new Date().toISOString(),
        counts: Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, Array.isArray(v) ? v.length : 0])),
      };
      const payload = { meta, data: dump };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
      a.href = url;
      a.download = `restaurants-galore-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${meta.counts.restaurants || 0} restaurants + all data`);
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
      if (!parsed.data) throw new Error("Invalid backup file — missing 'data' key");
      setPreview({ meta: parsed.meta || {}, data: parsed.data, filename: file.name });
    } catch (e) {
      toast.error(`Could not read file: ${e.message}`);
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
            <div className={`text-[11px] mb-2 ${isDark ? "text-slate-400" : "text-gray-600"}`}>Downloads a single .json file — restaurants, menus, orders, reviews, photos, and everything else.</div>
            <Button onClick={handleExport} disabled={busy} className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-white" data-testid="backup-export-btn">
              <Download className="w-4 h-4 mr-1" /> Download backup
            </Button>
          </div>

          <div className={`rounded-lg p-3 border ${isDark ? "bg-white/[0.02] border-white/10" : "bg-white border-gray-200"}`}>
            <div className={`text-xs font-semibold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Restore</div>
            <div className={`text-[11px] mb-2 ${isDark ? "text-slate-400" : "text-gray-600"}`}>Pick a backup file to preview before merging or replacing.</div>
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={(e) => handleFileSelect(e.target.files?.[0])} className="hidden" data-testid="backup-file-input" />
            <Button onClick={() => fileRef.current?.click()} disabled={busy} variant="outline" className="w-full h-9" data-testid="backup-choose-btn">
              <Upload className="w-4 h-4 mr-1" /> Choose file…
            </Button>
          </div>

          {preview && (
            <div className={`rounded-lg p-3 border-2 space-y-2 ${isDark ? "border-amber-500/30 bg-amber-500/5" : "border-amber-300 bg-amber-50"}`} data-testid="backup-preview">
              <div className={`text-xs font-semibold ${isDark ? "text-amber-300" : "text-amber-900"}`}>{preview.filename}</div>
              {preview.meta.exported_at && <div className={`text-[10px] ${isDark ? "text-slate-400" : "text-gray-600"}`}>Exported {new Date(preview.meta.exported_at).toLocaleString()}</div>}
              <div className={`text-[11px] ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                {Object.entries(preview.data).map(([k, v]) => (
                  <span key={k} className={`inline-block mr-2 mb-1 px-1.5 py-0.5 rounded ${isDark ? "bg-white/10" : "bg-white border border-gray-200"}`}>{k}: {Array.isArray(v) ? v.length : 0}</span>
                ))}
              </div>
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
