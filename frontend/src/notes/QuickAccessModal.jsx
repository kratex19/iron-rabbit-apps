import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Smartphone, Share2, Plus, Bookmark, ArrowUp, MoreVertical, LayoutGrid,
  ChevronRight, ChevronLeft, Download, Check,
} from "lucide-react";

/**
 * Detects the user's platform for platform-specific install instructions.
 * Returns 'ios' | 'android' | 'desktop'.
 */
function detectPlatform() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const IOS_STEPS = [
  { icon: Share2,     text: "Tap the Share button in Safari's toolbar (a box with an ↑ arrow)." },
  { icon: Plus,       text: "Scroll down and tap 'Add to Home Screen'." },
  { icon: Bookmark,   text: "Tap 'Add' in the top-right — the Iron Rabbit icon appears on your home screen." },
  { icon: ArrowUp,    text: "Long-press the icon and drag it into the Dock along the bottom for one-tap access." },
];

const ANDROID_STEPS = [
  { icon: MoreVertical, text: "Tap Chrome's ⋮ menu (three dots in the top-right)." },
  { icon: Plus,         text: "Choose 'Install app' or 'Add to Home screen'." },
  { icon: Bookmark,     text: "Confirm — Iron Rabbit installs as a real app and lands on your home screen." },
  { icon: ArrowUp,      text: "Long-press the Iron Rabbit icon and drag it into your dock along the bottom." },
];

/**
 * Multi-step wizard shown either from Settings (data-testid `quick-access-modal`)
 * or automatically on first launch (see settings.quick_access_wizard_seen).
 * Explains how to pin Iron Rabbit to the user's home screen dock for one-tap access.
 * Also offers the PWA install prompt when available.
 */
export default function QuickAccessModal({
  isOpen, onClose, canInstallPWA, onInstallPWA, isDark,
}) {
  const [platform, setPlatform] = useState("android");
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setPlatform(detectPlatform());
      setStep(0);
    }
  }, [isOpen]);

  const steps = platform === "ios" ? IOS_STEPS : ANDROID_STEPS;
  const isLast = step >= steps.length - 1;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className={`max-w-md max-h-[90vh] overflow-y-auto ${isDark ? "bg-[#0B1221] border-white/10" : "bg-white border-gray-200"}`}
        data-testid="quick-access-modal"
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            <Smartphone className="w-5 h-5 text-indigo-400" /> Quick Access
          </DialogTitle>
          <DialogDescription className={isDark ? "text-slate-400" : "text-gray-500"}>
            Get to Iron Rabbit in one tap by pinning it to your home-screen dock.
          </DialogDescription>
        </DialogHeader>

        {/* Platform picker */}
        <div className={`flex gap-1 p-1 rounded-md mb-3 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
          {[
            { key: "android", label: "Android" },
            { key: "ios",     label: "iPhone / iPad" },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setPlatform(key); setStep(0); }}
              className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                platform === key
                  ? (isDark ? "bg-indigo-500/25 text-indigo-200" : "bg-white text-indigo-700 shadow-sm")
                  : (isDark ? "text-slate-400 hover:bg-white/5" : "text-gray-600 hover:bg-white/50")
              }`}
              data-testid={`qa-platform-${key}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Optional native PWA install button (Android Chrome only) */}
        {platform === "android" && canInstallPWA && (
          <button
            type="button"
            onClick={onInstallPWA}
            className={`w-full flex items-center gap-3 rounded-md p-3 mb-3 border ${
              isDark ? "bg-indigo-500/15 border-indigo-400/40 hover:bg-indigo-500/25" : "bg-indigo-50 border-indigo-200 hover:bg-indigo-100"
            }`}
            data-testid="qa-install-pwa"
          >
            <span className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-indigo-500/30 text-indigo-200" : "bg-indigo-500 text-white"}`}>
              <Download className="w-5 h-5" />
            </span>
            <div className="flex-1 text-left">
              <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Install Iron Rabbit</div>
              <div className={`text-[11px] ${isDark ? "text-indigo-300" : "text-indigo-700"}`}>One-tap install as a real app</div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </button>
        )}

        {/* Current step */}
        <div className={`rounded-md p-4 mb-3 border ${isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`} data-testid={`qa-step-${step}`}>
          <div className="flex items-start gap-3">
            <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? "bg-indigo-500/20 text-indigo-300" : "bg-indigo-100 text-indigo-700"}`}>
              {React.createElement(steps[step].icon, { className: "w-5 h-5" })}
            </span>
            <div className="flex-1">
              <div className={`text-[11px] font-mono mb-1 ${isDark ? "text-slate-500" : "text-gray-400"}`}>
                STEP {step + 1} / {steps.length}
              </div>
              <div className={`text-sm leading-relaxed ${isDark ? "text-slate-100" : "text-gray-800"}`}>
                {steps[step].text}
              </div>
            </div>
          </div>
        </div>

        {/* Step navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className={`h-10 ${isDark ? "border-white/10 text-slate-300 hover:bg-white/5" : ""}`}
            data-testid="qa-prev"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex-1 flex justify-center gap-1.5">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-indigo-500" : `w-1.5 ${isDark ? "bg-white/20" : "bg-gray-300"}`}`}
              />
            ))}
          </div>
          {!isLast ? (
            <Button
              onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
              className="h-10 bg-indigo-500 hover:bg-indigo-600 text-white"
              data-testid="qa-next"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={onClose}
              className="h-10 bg-emerald-500 hover:bg-emerald-600 text-white"
              data-testid="qa-done"
            >
              <Check className="w-4 h-4 mr-1" /> Done
            </Button>
          )}
        </div>

        {/* Skip and never remind — closing the modal via any path already
            flags settings.quick_access_wizard_seen = true, so a single
            explicit link makes the "don't show me this again" affordance
            obvious for users who don't want to walk the steps. */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            className={`text-xs underline ${isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-500 hover:text-gray-700"}`}
            data-testid="qa-skip-forever"
          >
            Skip and never remind
          </button>
        </div>

        {/* Coming-in-native footer */}
        <div className={`mt-4 pt-3 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
          <div className={`flex items-start gap-2 text-[11px] ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            <LayoutGrid className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Coming in the native Iron Rabbit</strong> (offline-only, no online required): home-screen widget, Android quick-settings tile, persistent timer notification with Pause/Resume/Stop, and lock-screen support. Roadmap: <code>/ROADMAP.md</code>.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
