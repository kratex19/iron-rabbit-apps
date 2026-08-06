/**
 * GuideFeedback — 👍 / 👎 footer shown ONLY on the last card of a guide.
 *
 * Feedback is recorded locally in `app_settings.quickguide.feedback` — no
 * backend, no analytics, no network. When Knowledge Distribution ships
 * (Phase 5) this data becomes the editorial priority signal.
 */

import React, { useCallback, useState } from "react";
import { ThumbsUp, ThumbsDown, Check } from "lucide-react";
import { useQuickGuideContext } from "./QuickGuideProvider";
import { toast } from "sonner";

export default function GuideFeedback({ resourceId, isDark = true }) {
  const { state, recordFeedback } = useQuickGuideContext();
  const [voted, setVoted] = useState(() => {
    if (state.feedback.helpful_ids.includes(resourceId)) return "yes";
    if (state.feedback.not_helpful_ids.includes(resourceId)) return "no";
    return null;
  });

  const vote = useCallback(async (v) => {
    setVoted(v);
    await recordFeedback(resourceId, v);
    toast.success("Thanks — noted.", { duration: 1500 });
  }, [recordFeedback, resourceId]);

  return (
    <div
      className={`flex items-center justify-center gap-3 pt-3 pb-1 ${isDark ? "text-slate-300" : "text-gray-600"}`}
      data-testid="quickguide-feedback"
    >
      <span className="text-xs">Was this guide helpful?</span>
      <button
        type="button"
        onClick={() => vote("yes")}
        aria-label="Yes, this guide was helpful"
        data-testid="quickguide-feedback-yes"
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition ${
          voted === "yes"
            ? (isDark ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/40" : "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300")
            : (isDark ? "hover:bg-white/10" : "hover:bg-gray-100")
        }`}
      >
        {voted === "yes" ? <Check className="w-4 h-4" /> : <ThumbsUp className="w-4 h-4" />}
      </button>
      <button
        type="button"
        onClick={() => vote("no")}
        aria-label="No, this guide was not helpful"
        data-testid="quickguide-feedback-no"
        className={`inline-flex items-center justify-center w-8 h-8 rounded-full transition ${
          voted === "no"
            ? (isDark ? "bg-rose-500/25 text-rose-300 ring-1 ring-rose-400/40" : "bg-rose-100 text-rose-700 ring-1 ring-rose-300")
            : (isDark ? "hover:bg-white/10" : "hover:bg-gray-100")
        }`}
      >
        {voted === "no" ? <Check className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
      </button>
    </div>
  );
}
