import React from "react";
import { Copy } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Small prompt that asks the user whether copied notes should get
 * a " (copy)" suffix appended to their title. Used by the Smart Batch
 * Mode = "copy" flow when duplicating notes into another category.
 */
export default function CopySuffixDialog({
  isOpen, onClose, count = 0, targetCategory = "", onConfirm, isDark,
}) {
  const label = targetCategory || "Uncategorized";
  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose && onClose()}>
      <DialogContent
        className={`max-w-sm ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="copy-suffix-dialog"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Copy className="w-5 h-5 text-indigo-500" />
            Copy {count} note{count === 1 ? "" : "s"} to &quot;{label}&quot;
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Add a &quot; (copy)&quot; suffix to the copied titles so you can tell them apart?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 mt-2">
          <Button
            onClick={() => onConfirm(true)}
            className="w-full h-10 bg-indigo-500 hover:bg-indigo-600 text-white"
            data-testid="copy-suffix-yes"
          >
            Yes — add &quot; (copy)&quot; suffix
          </Button>
          <Button
            onClick={() => onConfirm(false)}
            variant="outline"
            className={`w-full h-10 ${isDark ? "border-white/10 text-slate-200 hover:bg-white/5" : ""}`}
            data-testid="copy-suffix-no"
          >
            No — keep exact same title
          </Button>
          <button
            type="button"
            onClick={onClose}
            className={`text-xs mt-1 underline ${isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"}`}
            data-testid="copy-suffix-cancel"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
