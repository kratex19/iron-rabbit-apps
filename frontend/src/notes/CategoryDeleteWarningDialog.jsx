import React from "react";
import { FolderOpen, Trash2, X, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Pre-step confirmation shown when the user taps the trash icon on a
 * category or subcategory header. Before touching the underlying notes,
 * we ask what should happen to them:
 *
 *   A — Move all notes to Uncategorized (safe; notes survive, category vanishes)
 *   B — Continue to trash → hands off to the standard Archive/Trash dialog
 *   Cancel — no-op
 *
 * Kept intentionally dumb: parent owns the state and handlers.
 */
export default function CategoryDeleteWarningDialog({
  isOpen, onClose, targetLabel, targetKind = "category",
  count = 0, onMoveToUncategorized, onContinueToTrash, isDark,
}) {
  const noun = count === 1 ? "note" : "notes";
  return (
    <AlertDialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent
        className={`${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="category-delete-warning-dialog"
      >
        <AlertDialogHeader>
          <AlertDialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            You are about to trash {count} {noun}
          </AlertDialogTitle>
          <AlertDialogDescription className={`${isDark ? "text-slate-300" : "text-gray-600"} leading-relaxed`}>
            The {targetKind}{" "}
            <strong className={isDark ? "text-white" : "text-gray-900"}>
              &ldquo;{targetLabel}&rdquo;
            </strong>{" "}
            contains <strong>{count}</strong> {noun}. Are you sure you want to continue?
            <span className={`block mt-3 text-[13px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <span className="inline-flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5" /> <strong>Move to Uncategorized</strong>
              </span>
              &nbsp;— keeps every {noun.replace(/s$/, "")} but removes the {targetKind}.
            </span>
            <span className={`block mt-1 text-[13px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              <span className="inline-flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> <strong>Continue to trash</strong>
              </span>
              &nbsp;— opens the Archive / Trash chooser for all {count} {noun}.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            className={isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}
            data-testid="category-delete-warning-cancel"
          >
            <X className="w-4 h-4 mr-1.5" /> Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onMoveToUncategorized}
            className={`${isDark ? "bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30" : "bg-sky-100 text-sky-800 hover:bg-sky-200 border border-sky-300"}`}
            data-testid="category-delete-warning-move-uncategorized"
          >
            <FolderOpen className="w-4 h-4 mr-1.5" /> Move to Uncategorized
          </AlertDialogAction>
          <AlertDialogAction
            onClick={onContinueToTrash}
            className="bg-red-500 hover:bg-red-600 text-white"
            data-testid="category-delete-warning-continue"
          >
            <Trash2 className="w-4 h-4 mr-1.5" /> Continue to trash
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
