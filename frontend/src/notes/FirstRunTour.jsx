import React, { useState, useEffect } from "react";
import { X, Zap, Package, LayoutGrid, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// A minimal 3-step onboarding overlay shown on first visit. Auto-marks
// itself complete via the onDismiss callback.
const STEPS = [
  {
    icon: LayoutGrid,
    title: "Two ways to see your notes",
    body: "Toggle between compact list rows and a colourful icon-tile grid. Try it — top bar, right of the search.",
  },
  {
    icon: Zap,
    title: "One-tap Quick Add",
    body: "Tap the lightning icon and pick any icon — Shopping Cart, Dumbbell, Meds — and we'll create the note for you with the right title & style.",
  },
  {
    icon: Package,
    title: "Ready-made Tile Packs",
    body: "Not sure where to start? Apply a Fitness or Meal Planner pack and get a whole system ready in one tap.",
  },
];

export default function FirstRunTour({ open, onDismiss, isDark = true }) {
  const [step, setStep] = useState(0);

  useEffect(() => { if (open) setStep(0); }, [open]);

  if (!open) return null;
  const S = STEPS[step];
  const Ico = S.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      data-testid="first-run-tour"
    >
      <div
        className={`relative w-full max-w-md rounded-2xl p-6 ${isDark ? "bg-[#0B1221] border border-white/10" : "bg-white border border-gray-200"}`}
      >
        <button
          type="button"
          onClick={onDismiss}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`}
          aria-label="Skip tour"
          data-testid="tour-skip"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full flex-1 transition-all ${i === step ? "bg-indigo-500" : isDark ? "bg-white/10" : "bg-gray-200"}`}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)" }}>
            <Ico className="w-5 h-5 text-white" strokeWidth={2} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}>{S.title}</h3>
            <p className={`text-sm mt-2 leading-relaxed ${isDark ? "text-slate-300" : "text-gray-600"}`}>{S.body}</p>
          </div>
        </div>

        <div className="flex gap-2 items-center justify-between mt-6">
          <button
            type="button"
            onClick={onDismiss}
            className={`text-xs ${isDark ? "text-slate-500 hover:text-slate-300" : "text-gray-400 hover:text-gray-600"}`}
            data-testid="tour-skip-inline"
          >
            Skip
          </button>
          <Button
            onClick={() => isLast ? onDismiss() : setStep(s => s + 1)}
            size="sm"
            className="bg-indigo-500 hover:bg-indigo-600 text-white h-9 px-4"
            data-testid={isLast ? "tour-finish" : "tour-next"}
          >
            {isLast ? (
              <>Got it <Sparkles className="w-3.5 h-3.5 ml-1.5" /></>
            ) : (
              <>Next <ChevronRight className="w-3.5 h-3.5 ml-0.5" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
