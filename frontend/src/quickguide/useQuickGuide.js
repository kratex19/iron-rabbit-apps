/**
 * useQuickGuide — programmatic hook for any component that wants to
 * open a specific guide by ID.
 *
 * Example:
 *   const { open, isSeen, markSeen, article } = useQuickGuide("IRR-1000");
 */

import { useCallback } from "react";
import { useQuickGuideContext } from "./QuickGuideProvider";

export default function useQuickGuide(resourceId) {
  const ctx = useQuickGuideContext();
  const article = ctx.getArticle(resourceId);
  const open = useCallback((opts) => ctx.open(resourceId, opts), [ctx, resourceId]);
  const isSeen = ctx.isSeen(resourceId);
  const markSeen = useCallback(() => ctx.markSeen(resourceId), [ctx, resourceId]);
  return { open, isSeen, markSeen, article, ctx };
}
