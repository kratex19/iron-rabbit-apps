import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

/**
 * useBackGuard — turns the hardware / browser Back button into a
 * "tap twice to exit" prompt at the app root, so a stray tap never
 * kicks the user out of Iron Rabbit.
 *
 * How it works:
 *   • On mount at a guarded path, push a duplicate `history` entry so
 *     the first Back tap consumes that entry (no visible change).
 *   • Listen for `popstate`. If we're still at a guarded path when it
 *     fires, show a "Tap Back again to exit" toast and push the guard
 *     entry again. The user stays put.
 *   • If a second `popstate` fires within `windowMs`, allow the exit
 *     (don't re-push). Chrome/Samsung will navigate out to the previous
 *     site or close the tab as expected.
 *
 * The guard only activates for the paths listed in `guardedPaths` — on
 * inner routes (/dashboard/*, /site/*) Back still works naturally so
 * users can navigate back one screen at a time.
 */
const GUARDED_PATHS = ["/", "/apps/iron-rabbit-notes/launch"];
const WINDOW_MS = 2000;

export default function useBackGuard() {
  const location = useLocation();
  const isGuardedRef = useRef(false);
  const lastPromptAtRef = useRef(0);

  // Track whether the current path is one we should guard.
  useEffect(() => {
    isGuardedRef.current = GUARDED_PATHS.includes(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Push the guard entry only if we're currently at a guarded path.
    const pushGuard = () => {
      if (!isGuardedRef.current) return;
      try {
        window.history.pushState({ irBackGuard: true }, "", window.location.href);
      } catch { /* SecurityError in some in-app browsers — ignore */ }
    };
    pushGuard();

    const onPopState = () => {
      if (!isGuardedRef.current) return;

      const now = Date.now();
      const withinWindow = now - lastPromptAtRef.current < WINDOW_MS;

      if (withinWindow) {
        // Second Back inside the window — let it through (do not re-push).
        return;
      }

      // First Back — swallow it, show a prompt, and re-arm.
      lastPromptAtRef.current = now;
      toast("Tap Back again to exit Iron Rabbit", {
        duration: WINDOW_MS,
        id: "ir-back-guard",
      });
      pushGuard();
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
}

/** Zero-DOM component that installs the guard from inside <BrowserRouter>. */
export function BackGuard() {
  useBackGuard();
  return null;
}
