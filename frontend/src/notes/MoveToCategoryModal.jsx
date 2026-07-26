import React, { useState } from "react";
import { FolderInput, Copy } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Modal that asks the user which category to move (or copy) the
 * selected notes into. Reads Smart Batch Mode via `mode` prop
 * ("move" | "copy") to update its labels accordingly.
 */
export default function MoveToCategoryModal({
  isOpen, onClose, categories = [], count = 0, onMove, isDark, mode = "move",
}) {
  const [customCat, setCustomCat] = useState("");
  const isCopy = mode === "copy";
  const verb = isCopy ? "Copy" : "Move";
  const Icon = isCopy ? Copy : FolderInput;

  const pick = (cat) => {
    onMove(cat);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-sm ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white"}`} data-testid="moveto-modal">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Icon className="w-5 h-5 text-indigo-500" /> {verb} {count} note{count === 1 ? "" : "s"} to…
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Pick an existing category or type a new one.
            {isCopy && (
              <span className="block mt-1 text-[11px] text-indigo-400">
                Smart Batch: <strong>Copy</strong> mode — originals stay in place.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {categories.length === 0 && (
            <div className={`text-xs italic ${isDark ? "text-slate-500" : "text-gray-400"}`}>
              No existing categories — type one below.
            </div>
          )}
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => pick(cat)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                isDark ? "bg-white/5 hover:bg-white/10 text-white" : "bg-gray-50 hover:bg-gray-100 text-gray-800"
              }`}
              data-testid={`moveto-cat-${cat}`}
            >
              {cat}
            </button>
          ))}
          <button
            type="button"
            onClick={() => pick("")}
            className={`w-full text-left rounded-md px-3 py-2 text-sm italic ${
              isDark ? "bg-white/5 hover:bg-white/10 text-slate-400" : "bg-gray-50 hover:bg-gray-100 text-gray-500"
            }`}
            data-testid="moveto-uncategorized"
          >
            Uncategorized (no category)
          </button>
        </div>

        <div className="mt-2 flex gap-2">
          <Input
            value={customCat}
            onChange={(e) => setCustomCat(e.target.value)}
            placeholder="New category name…"
            className={`h-9 text-xs ${isDark ? "bg-black/20 border-white/10 text-white" : ""}`}
            data-testid="moveto-new-input"
          />
          <Button
            onClick={() => customCat.trim() && pick(customCat.trim())}
            disabled={!customCat.trim()}
            className="h-9 px-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
            data-testid="moveto-create"
          >
            {verb}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
