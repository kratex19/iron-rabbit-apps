/**
 * ResourceIdChip — the subtle mono ID + Copy button in the modal footer.
 *
 * `text-[10px] font-mono opacity-40 hover:opacity-100` per the locked design.
 * Invisible to normal users, gold-dust for support conversations.
 */

import React, { useState, useCallback } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { QG_TOKENS } from "./tokens";

export default function ResourceIdChip({ resourceId, isDark = true }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    // navigator.clipboard with document.execCommand fallback for older WebViews
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(resourceId);
      } else {
        const ta = document.createElement("textarea");
        ta.value = resourceId;
        ta.style.position = "fixed"; ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      setCopied(true);
      toast.success(`Copied ${resourceId}`, { duration: 1500 });
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      toast.error("Copy failed");
    }
  }, [resourceId]);

  return (
    <div className={`${QG_TOKENS.ID_CHIP_CLASSES} flex items-center gap-1.5`} data-testid="quickguide-id-chip">
      <span className={isDark ? "text-slate-400" : "text-gray-500"}>{resourceId}</span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copy ${resourceId}`}
        title={`Copy ${resourceId}`}
        data-testid="quickguide-id-copy"
        className={`inline-flex items-center justify-center rounded-md w-5 h-5 transition ${
          isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-gray-100 text-gray-500"
        }`}
      >
        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      </button>
    </div>
  );
}
