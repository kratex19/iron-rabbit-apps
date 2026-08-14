import React, { useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Download, Upload, DatabaseBackup, FileWarning, ArrowUpFromLine, Merge, Replace,
  FileDown, FileUp, FileText,
} from "lucide-react";
import StorageService from "../storage/storageService";
import QuickGuideButton from "../quickguide/QuickGuideButton";
import { markdownToNote, notesToZipBlob, downloadBlob } from "../utils/markdown";

/**
 * Offline JSON backup / restore modal. Everything stays on-device:
 * export writes to a downloaded file, import reads from a picked file.
 * No network involved.
 */
export default function BackupRestoreModal({ isOpen, onClose, onDataChanged, isDark }) {
  const fileInputRef = useRef(null);
  const mdInputRef = useRef(null);
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

  // -------- Markdown portability --------
  const handleExportAllMarkdown = async () => {
    try {
      setBusy(true);
      const notes = await StorageService.getAllNotes();
      if (!notes.length) {
        toast.error("No notes to export");
        return;
      }
      const blob = await notesToZipBlob(notes);
      downloadBlob(blob, `iron-rabbit-notes-${format(new Date(), "yyyy-MM-dd-HHmm")}.zip`);
      toast.success(`Exported ${notes.length} note${notes.length === 1 ? "" : "s"} to .md zip`);
    } catch (e) {
      toast.error(`Export failed: ${e.message || "unknown error"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleImportMarkdown = async (e) => {
    const picked = Array.from(e.target.files || []);
    if (mdInputRef.current) mdInputRef.current.value = "";
    if (!picked.length) return;

    // Whitelist file types
    const allowed = /\.(md|markdown|txt)$/i;
    const valid = picked.filter((f) => allowed.test(f.name));
    const rejected = picked.filter((f) => !allowed.test(f.name));

    if (!valid.length) {
      toast.error("No .md/.markdown/.txt files in selection");
      return;
    }

    try {
      setBusy(true);
      let ok = 0;
      const failed = [];
      for (const file of valid) {
        try {
          const text = await file.text();
          const draft = markdownToNote(text, file.name);
          const now = new Date().toISOString();
          const noteId =
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `md-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await StorageService.saveNote({
            id: noteId,
            ...draft,
            attachments: [],
            events: [],
            checklist: [],
            updated_at: draft.updated_at || now,
            created_at: draft.created_at || now,
          });
          ok++;
        } catch (err) {
          failed.push(file.name);
        }
      }
      onDataChanged && onDataChanged();
      if (ok) toast.success(`Imported ${ok} Markdown note${ok === 1 ? "" : "s"}`);
      if (failed.length) toast.error(`Failed: ${failed.join(", ")}`);
      if (rejected.length) toast.error(`Skipped non-Markdown: ${rejected.map((f) => f.name).join(", ")}`);
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

            {/* --- Markdown portability --- */}
            <div className={`mt-3 pt-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
              <div className={`flex items-center gap-2 text-[10px] uppercase tracking-wider mb-2 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                <FileText className="w-3 h-3" /> Markdown portability
              </div>
              <button
                type="button"
                onClick={handleExportAllMarkdown}
                disabled={busy}
                className={`w-full flex items-center gap-3 rounded-md p-3 mb-2 border transition-colors ${
                  isDark
                    ? "bg-amber-500/15 border-amber-400/40 hover:bg-amber-500/25 text-white"
                    : "bg-amber-50 border-amber-200 hover:bg-amber-100 text-gray-900"
                }`}
                data-testid="backup-export-md-all-btn"
              >
                <span className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-amber-500/30 text-amber-200" : "bg-amber-500 text-white"}`}>
                  <FileDown className="w-5 h-5" />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">Export All as .md (zip)</div>
                  <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>One .md file per note with YAML front-matter. Portable to Obsidian, Notion, etc.</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => mdInputRef.current?.click()}
                disabled={busy}
                className={`w-full flex items-center gap-3 rounded-md p-3 border transition-colors ${
                  isDark
                    ? "bg-sky-500/15 border-sky-400/40 hover:bg-sky-500/25 text-white"
                    : "bg-sky-50 border-sky-200 hover:bg-sky-100 text-gray-900"
                }`}
                data-testid="backup-import-md-btn"
              >
                <span className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-sky-500/30 text-sky-200" : "bg-sky-500 text-white"}`}>
                  <FileUp className="w-5 h-5" />
                </span>
                <div className="flex-1 text-left">
                  <div className="text-sm font-semibold">Import Markdown</div>
                  <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>Pick one or more .md / .markdown / .txt files. Each becomes a note.</div>
                </div>
              </button>

              <input
                ref={mdInputRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                multiple
                className="hidden"
                onChange={handleImportMarkdown}
                data-testid="backup-md-file-input"
              />
            </div>
          </div>
        ) : (
          /* Import confirmation — richer summary card + Merge/Replace picker */
          <div className={`p-3 rounded-md border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}>
            <div className={`flex items-start gap-2 text-xs mb-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              <FileWarning className="w-4 h-4 mt-0.5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <div className={`text-[10px] uppercase tracking-wide mb-1 ${isDark ? "text-slate-500" : "text-gray-500"}`}>
                  Backup contents
                </div>
                {(() => {
                  const data = pendingPayload.data || pendingPayload;
                  const notes = pendingPayload.counts?.notes ?? data.notes?.length ?? 0;
                  const files = pendingPayload.counts?.files ?? Object.keys(data.files || {}).length;
                  const templates = data.templates?.length ?? 0;
                  const settings = data.settings || {};
                  const pinsC = settings.bg_pins?.colors?.length ?? 0;
                  const pinsG = settings.bg_pins?.gradients?.length ?? 0;
                  const iconPins = Array.isArray(settings.icon_pins) ? settings.icon_pins.length : 0;
                  const exported = pendingPayload.exported_at;
                  const version = pendingPayload.version || "—";
                  const rows = [
                    { label: "Notes",              value: notes },
                    { label: "Attachments",        value: files },
                    { label: "Templates",          value: templates },
                    { label: "Pinned backgrounds", value: pinsC + pinsG },
                    { label: "Pinned icons",       value: iconPins },
                  ];
                  return (
                    <>
                      <ul className="space-y-0.5 mb-2" data-testid="backup-summary-list">
                        {rows.map(r => (
                          <li key={r.label} className="flex items-baseline justify-between gap-2">
                            <span>{r.label}</span>
                            <span className={`font-mono text-[11px] ${isDark ? "text-white" : "text-gray-900"}`} data-testid={`backup-summary-${r.label.toLowerCase().replace(/\s+/g, "-")}`}>
                              {r.value}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className={`flex items-center justify-between pt-2 border-t text-[10px] ${isDark ? "border-white/10 text-slate-500" : "border-gray-200 text-gray-500"}`}>
                        <span>File v{version}</span>
                        {exported && (
                          <span title={exported}>
                            {format(new Date(exported), "MMM d, yyyy HH:mm")}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">Choose how to restore:</div>
                    </>
                  );
                })()}
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
