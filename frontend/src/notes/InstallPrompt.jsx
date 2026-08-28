import React, { useEffect, useState, useCallback } from "react";
import { X, Share, Plus, Download } from "lucide-react";
import { haptic } from "../utils/haptic";

/**
 * Subtle "Add to Home Screen" hint.
 *
 * Two paths:
 *  1. Android Chrome / desktop Chrome: capture `beforeinstallprompt`,
 *     show a soft toast, call `prompt()` on tap.
 *  2. iOS Safari: no BIP event exists → detect iOS Safari not-in-
 *     standalone and show a short instructional card (Share → Add to
 *     Home Screen).
 *
 * Dismissal / installation persists in localStorage so we never nag.
 * First appearance is delayed 20 s after a fresh visit so the user
 * has a moment with the app before the hint slides in.
 */

const STORAGE_KEY = "ir-install-prompt-state";
const APPEAR_DELAY_MS = 20000;      // 20 s after landing
const SNOOZE_DAYS = 14;              // "Later" hides the hint for 2 weeks

const readState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};
const writeState = (patch) => {
  try {
    const next = { ...readState(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch { /* storage disabled — ignore */ }
};

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIOS = () => /iPad|iPhone|iPod/.test(window.navigator.userAgent);
const isSafari = () =>
  /Safari/.test(window.navigator.userAgent) &&
  !/CriOS|FxiOS|EdgiOS/.test(window.navigator.userAgent);

export default function InstallPrompt({ isDark = true }) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [mode, setMode] = useState("chrome"); // "chrome" | "ios"

  const shouldSkip = useCallback(() => {
    if (isStandalone()) return true;
    const state = readState();
    if (state.installed) return true;
    if (state.dismissed) return true;
    if (state.snoozedUntil && Date.now() < state.snoozedUntil) return true;
    return false;
  }, []);

  useEffect(() => {
    if (shouldSkip()) return;

    let showTimer = null;

    const onBip = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode("chrome");
      showTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    };

    const onInstalled = () => {
      writeState({ installed: true });
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    // iOS Safari fallback — no BIP event fires.
    if (isIOS() && isSafari() && !isStandalone()) {
      setMode("ios");
      showTimer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (showTimer) clearTimeout(showTimer);
    };
  }, [shouldSkip]);

  if (!visible) return null;

  const dismiss = () => {
    haptic("tap");
    writeState({ dismissed: true });
    setVisible(false);
  };

  const snooze = () => {
    haptic("tap");
    writeState({ snoozedUntil: Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000 });
    setVisible(false);
  };

  const install = async () => {
    haptic("tap");
    if (!deferredPrompt) return;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        writeState({ installed: true });
      } else {
        writeState({ snoozedUntil: Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000 });
      }
    } catch { /* prompt already consumed — ignore */ }
    setDeferredPrompt(null);
    setVisible(false);
  };

  const surfaceCls = isDark
    ? "bg-slate-900/95 border-white/15 text-slate-100"
    : "bg-white/95 border-slate-200 text-slate-900";

  return (
    <div
      role="dialog"
      aria-label="Install Iron Rabbit to home screen"
      data-testid="install-prompt"
      className="fixed z-[80] left-1/2 -translate-x-1/2 w-[min(92vw,26rem)] pointer-events-auto"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        animation: "ir-install-slide-up 320ms ease-out",
      }}
    >
      <div
        className={`relative flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${surfaceCls}`}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-400/40"
          style={{ width: "2.5rem", height: "2.5rem" }}
        >
          <Download className="w-5 h-5 text-indigo-300" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold leading-tight">
            {mode === "ios" ? "Add Iron Rabbit to Home Screen" : "Install Iron Rabbit"}
          </div>
          <div className="text-xs opacity-75 mt-0.5 leading-snug">
            {mode === "ios" ? (
              <span className="inline-flex items-center flex-wrap gap-1">
                Tap
                <Share className="w-3.5 h-3.5 inline-block mx-0.5" />
                <span className="font-medium">Share</span>
                <span aria-hidden>→</span>
                <Plus className="w-3.5 h-3.5 inline-block mx-0.5" />
                <span className="font-medium">Add to Home Screen</span>
              </span>
            ) : (
              "Faster launches, works offline, home-screen icon — no store needed."
            )}
          </div>

          <div className="mt-2.5 flex items-center gap-2">
            {mode === "chrome" && (
              <button
                type="button"
                onClick={install}
                data-testid="install-prompt-install"
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Install
              </button>
            )}
            <button
              type="button"
              onClick={snooze}
              data-testid="install-prompt-later"
              className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors ${
                isDark ? "hover:bg-white/10 text-slate-300" : "hover:bg-black/5 text-slate-600"
              }`}
            >
              Not now
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          data-testid="install-prompt-dismiss"
          className={`shrink-0 rounded-lg p-1 transition-colors ${
            isDark ? "hover:bg-white/10 text-slate-400" : "hover:bg-black/5 text-slate-500"
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style>{`
        @keyframes ir-install-slide-up {
          from { opacity: 0; transform: translate(-50%, 1rem); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="install-prompt"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
