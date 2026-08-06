import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download, Upload, DatabaseBackup, FileWarning, ArrowUpFromLine, Merge, Replace,
} from "lucide-react";
import StorageService from "../storage/storageService";
import QuickGuideButton from "../quickguide/QuickGuideButton";

/**
 * Offline JSON backup / restore modal. Everything stays on-device:
 * export writes to a downloaded file, import reads from a picked file.
 * No network involved.
 */
export default function BackupRestoreModal({ isOpen, onClose, onDataChanged, isDark }) {
  const fileInputRef = useRef(null);
  const [pendingPayload, setPendingPayload] = useState(null); // parsed backup awaiting mode choice
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      setBusy(true);
      const payload = await StorageService.exportAllData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `iron-rabbit-backup-${format(new Date(), "yyyy-MM-dd-HHmm")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const notesCount = payload?.data?.notes?.length || 0;
      const filesCount = Object.keys(payload?.data?.files || {}).length;
      toast.success(`Exported ${notesCount} note${notesCount === 1 ? "" : "s"} · ${filesCount} file${filesCount === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setBusy(false);
    }
  };

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      // Accept both "Iron Rabbit" (current export) and legacy "IronRabbit"
      const appTag = payload?.app;
      if (appTag !== "Iron Rabbit" && appTag !== "IronRabbit") {
        toast.error("Not an Iron Rabbit backup file");
        return;
      }
      setPendingPayload(payload);
    } catch {
      toast.error("Could not read that file — is it a valid JSON backup?");
    } finally {
      // reset input so same file can be picked twice
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const runImport = async (mode) => {
    if (!pendingPayload) return;
    try {
      setBusy(true);
      const summary = await StorageService.importAllData(pendingPayload, mode);
      setPendingPayload(null);
      onDataChanged && onDataChanged();
      const nCount = summary?.notesRestored ?? summary?.notes ?? 0;
      const fCount = summary?.filesRestored ?? summary?.files ?? 0;
      toast.success(
        `${mode === "replace" ? "Restored" : "Merged"} ${nCount} note${nCount === 1 ? "" : "s"} · ${fCount} file${fCount === 1 ? "" : "s"}`
      );
      onClose();
    } catch (e) {
      toast.error(`Import failed: ${e.message || "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`max-w-md max-h-[85vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="backup-restore-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <DatabaseBackup className="w-5 h-5 text-indigo-400" /> Backup &amp; Restore
            <span className="ml-auto"><QuickGuideButton resourceId="IRR-1800" origin="backup" isDark={isDark} size="sm" /></span>
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Export every note, attachment, template, and setting to a single offline JSON file.
            Restore later on this device or transfer to a new phone. Nothing leaves your device.
          </DialogDescription>
        </DialogHeader>

        {!pendingPayload ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleExport}
              disabled={busy}
              className={`w-full flex items-center gap-3 rounded-md p-3 border transition-colors ${
                isDark
                  ? "bg-indigo-500/15 border-indigo-400/40 hover:bg-indigo-500/25 text-white"
                  : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-gray-900"
              }`}
              data-testid="backup-export-btn"
            >
              <span className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-indigo-500/30 text-indigo-200" : "bg-indigo-500 text-white"}`}>
                <Download className="w-5 h-5" />
              </span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">Export Backup</div>
                <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>Downloads a single .json file with everything.</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className={`w-full flex items-center gap-3 rounded-md p-3 border transition-colors ${
                isDark
                  ? "bg-emerald-500/15 border-emerald-400/40 hover:bg-emerald-500/25 text-white"
                  : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-gray-900"
              }`}
              data-testid="backup-import-btn"
            >
              <span className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-emerald-500/30 text-emerald-200" : "bg-emerald-500 text-white"}`}>
                <Upload className="w-5 h-5" />
              </span>
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">Import Backup</div>
                <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>Pick a .json backup to restore.</div>
              </div>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleFilePick}
              data-testid="backup-file-input"
            />
          </div>
        ) : (
          /* Import confirmation — pick Merge vs Replace */
          <div className={`p-3 rounded-md border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
            <div className={`flex items-start gap-2 text-xs mb-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              <FileWarning className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
              <div>
                Backup contains <strong>{pendingPayload.counts?.notes ?? pendingPayload.data?.notes?.length ?? pendingPayload.notes?.length ?? 0}</strong> notes and <strong>{pendingPayload.counts?.files ?? Object.keys(pendingPayload.data?.files || pendingPayload.files || {}).length}</strong> attachments.
                Choose how to restore:
              </div>
            </div>
            <button
              type="button"
              onClick={() => runImport("merge")}
              disabled={busy}
              className={`w-full flex items-center gap-3 rounded-md p-3 mb-2 border transition-colors ${
                isDark ? "bg-indigo-500/15 border-indigo-400/40 hover:bg-indigo-500/25 text-white" : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-gray-900"
              }`}
              data-testid="backup-mode-merge"
            >
              <Merge className="w-4 h-4 text-indigo-400" />
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">Merge</div>
                <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>Add backup on top of what&apos;s here (matching IDs overwrite).</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => runImport("replace")}
              disabled={busy}
              className={`w-full flex items-center gap-3 rounded-md p-3 mb-2 border transition-colors ${
                isDark ? "bg-red-500/15 border-red-400/40 hover:bg-red-500/25 text-white" : "bg-red-50 border-red-200 hover:bg-red-100 text-gray-900"
              }`}
              data-testid="backup-mode-replace"
            >
              <Replace className="w-4 h-4 text-red-400" />
              <div className="flex-1 text-left">
                <div className="text-sm font-semibold">Replace</div>
                <div className={`text-[11px] ${isDark ? "text-red-300" : "text-red-700"}`}>Wipe current notes/attachments first, then restore. Destructive.</div>
              </div>
            </button>
            <Button
              variant="outline"
              onClick={() => setPendingPayload(null)}
              className={`w-full ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}`}
              data-testid="backup-cancel"
            >
              <ArrowUpFromLine className="w-4 h-4 mr-1.5 rotate-180" /> Cancel
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
