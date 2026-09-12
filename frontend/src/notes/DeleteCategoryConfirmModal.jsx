import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Trash2 } from "lucide-react";

/**
 * Confirmation dialog for deleting a category or a subcategory.
 *
 * Type-to-confirm: the user must type the exact `name` before the
 * destructive button enables (matches the "safer for cascades" style
 * the user picked).
 *
 * For subcategories that contain deeper descendants (nested subs OR
 * notes), the dialog surfaces two options:
 *   - "Delete everything below" → cascade delete (all descendant notes)
 *   - "Move descendants up one level" → strip one segment from each
 *     descendant's `category_path` so notes hop into the parent scope.
 *
 * The parent (NotesApp) executes the chosen action via `onConfirm`.
 *
 * Props:
 *   isOpen            — controls visibility
 *   onClose()         — dismiss without deleting
 *   name              — display name (last path segment for subs, plain for cats)
 *   path              — full path (['A','B']); flat categories pass [name]
 *   descendantCount   — total notes underneath (for cascade preview)
 *   subChildCount     — count of nested sub buckets (0 → simple cascade)
 *   isDark
 *   onConfirm(mode)   — mode ∈ {"cascade","moveUp"} — invoked when user confirms
 */
export default function DeleteCategoryConfirmModal({
  isOpen, onClose, name, path, descendantCount = 0, subChildCount = 0,
  isDark, onConfirm,
}) {
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState("cascade");
  const isSubcategory = Array.isArray(path) && path.length >= 2;
  const hasDescendants = subChildCount > 0 || descendantCount > 0;
  const showMoveUp = isSubcategory && hasDescendants;

  useEffect(() => {
    if (isOpen) {
      setTyped("");
      setMode("cascade");
    }
  }, [isOpen, name]);

  const canConfirm = typed.trim() === (name || "").trim() && typed.trim().length > 0;

  const submit = () => {
    if (!canConfirm) return;
    onConfirm?.(mode);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent
        className={`max-w-md ${isDark ? "bg-slate-900 border-white/10 text-white" : "bg-white text-gray-900"}`}
        data-testid="delete-category-confirm-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete {isSubcategory ? "subcategory" : "category"}?
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-600"}>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className={`rounded-md px-3 py-2 ${isDark ? "bg-white/[0.04] border border-white/10" : "bg-gray-50 border border-gray-200"}`}>
            <div className="text-xs opacity-70 mb-0.5">
              {isSubcategory ? "Subcategory path" : "Category"}
            </div>
            <div className="font-semibold break-words">
              {isSubcategory ? path.join(" / ") : name}
            </div>
            <div className={`text-xs mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              {descendantCount === 0
                ? "No notes underneath."
                : `Contains ${descendantCount} note${descendantCount === 1 ? "" : "s"}${subChildCount > 0 ? ` across ${subChildCount} nested subcategor${subChildCount === 1 ? "y" : "ies"}` : ""}.`}
            </div>
          </div>

          {showMoveUp && (
            <div className="space-y-2">
              <div className={`text-xs font-medium ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                What happens to the notes underneath?
              </div>
              <label className={`flex items-start gap-2 rounded-md px-3 py-2 cursor-pointer ${
                mode === "cascade"
                  ? (isDark ? "bg-red-500/10 border border-red-400/30" : "bg-red-50 border border-red-200")
                  : (isDark ? "bg-white/[0.03] border border-white/10 hover:bg-white/[0.05]" : "bg-white border border-gray-200 hover:bg-gray-50")
              }`}>
                <input
                  type="radio"
                  name="delete-mode"
                  value="cascade"
                  checked={mode === "cascade"}
                  onChange={() => setMode("cascade")}
                  className="mt-0.5"
                  data-testid="delete-mode-cascade"
                />
                <div className="flex-1">
                  <div className="text-xs font-medium">Delete everything below</div>
                  <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    All {descendantCount} note{descendantCount === 1 ? "" : "s"} will be permanently removed.
                  </div>
                </div>
              </label>
              <label className={`flex items-start gap-2 rounded-md px-3 py-2 cursor-pointer ${
                mode === "moveUp"
                  ? (isDark ? "bg-indigo-500/10 border border-indigo-400/30" : "bg-indigo-50 border border-indigo-200")
                  : (isDark ? "bg-white/[0.03] border border-white/10 hover:bg-white/[0.05]" : "bg-white border border-gray-200 hover:bg-gray-50")
              }`}>
                <input
                  type="radio"
                  name="delete-mode"
                  value="moveUp"
                  checked={mode === "moveUp"}
                  onChange={() => setMode("moveUp")}
                  className="mt-0.5"
                  data-testid="delete-mode-move-up"
                />
                <div className="flex-1">
                  <div className="text-xs font-medium">Move notes up one level</div>
                  <div className={`text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                    Descendants keep the rest of their path but this segment is stripped out.
                  </div>
                </div>
              </label>
            </div>
          )}

          <div>
            <label className={`text-xs mb-1 block ${isDark ? "text-slate-300" : "text-gray-700"}`}>
              Type <span className="font-mono font-semibold">{name}</span> to confirm
            </label>
            <Input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={name}
              className={isDark ? "bg-black/20 border-white/10 text-white" : ""}
              data-testid="delete-category-confirm-input"
              autoFocus
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-2">
          <Button
            variant="outline"
            onClick={onClose}
            className={isDark ? "bg-transparent border-white/20 text-white hover:bg-white/10" : ""}
            data-testid="delete-category-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!canConfirm}
            className="bg-red-500 hover:bg-red-600 text-white disabled:opacity-40"
            data-testid="delete-category-confirm"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            {mode === "moveUp" ? "Delete & Move" : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
