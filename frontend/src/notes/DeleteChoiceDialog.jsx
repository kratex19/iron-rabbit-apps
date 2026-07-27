import React from "react";
import { Archive, Trash2, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Two-choice destructive prompt. Replaces every native browser confirm() for
 * "delete note" flows (single + bulk). User picks Archive (keep forever) or
 * Trash (retain per settings, restorable). Cancel does nothing.
 */
export default function DeleteChoiceDialog({
  isOpen, onClose, count = 1, retentionLabel = "7 days",
  onArchive, onTrash, isDark,
}) {
  const plural = count === 1 ? "" : "s";
  const noun = count === 1 ? "this note" : `${count} notes`;
  return (
    <AlertDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent
        className={`${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="delete-choice-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={isDark ? "text-white" : "text-gray-900"}>
            Are you sure?
          </AlertDialogTitle>
          <AlertDialogDescription className={`${isDark ? "text-slate-300" : "text-gray-500"} leading-relaxed`}>
            What should happen to {noun}?
            <span className={`block mt-2 text-[13px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <span className="inline-flex items-center gap-1"><Archive className="w-3.5 h-3.5" /> <strong>Archive</strong></span>
              &nbsp;— hidden from your notes but kept indefinitely. Restore anytime.
            </span>
            <span className={`block mt-1 text-[13px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <span className="inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> <strong>Trash</strong></span>
              &nbsp;— moved to Trash and permanently deleted after <strong>{retentionLabel}</strong> unless restored. Empty Trash removes it now.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            className={isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}
            data-testid="delete-choice-cancel"
          >
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onArchive}
            className={`${isDark ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30" : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300"}`}
            data-testid="delete-choice-archive"
          >
            <Archive className="w-4 h-4 mr-1.5" /> Archive
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onTrash}
            className="bg-red-500 hover:bg-red-600 text-white"
            data-testid="delete-choice-trash"
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Move to Trash
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
