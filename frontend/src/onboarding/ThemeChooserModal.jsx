import React, { useRef } from "react";
import { Moon, Sun, Check, Sparkles, X } from "lucide-react";

/**
 * First-launch theme picker. Shown once, only when the user has never
 * saved `theme_preference` and hasn't dismissed the chooser before.
 *
 * Rendered as a plain fixed overlay (not Radix Dialog) so it always
 * wins z-order against the Quick Guide + first-launch wizard that may
 * auto-open around the same time. Uses the semi-transparent glass
 * aesthetic (~45% dark base + backdrop-blur, white text) that matches
 * the note-expand surfaces.
 */
export default function ThemeChooserModal({ isOpen, onPick }) {
  const pickedRef = useRef(false);
  if (!isOpen) return null;

  const pick = (choice) => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    onPick(choice);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, pointerEvents: "auto" }}
      data-testid="theme-chooser-modal"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" style={{ pointerEvents: "auto" }} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg rounded-lg border border-white/10 p-6 text-white shadow-2xl"
        style={{
          background:
            "linear-gradient(180deg, rgba(15, 23, 42, 0.55) 0%, rgba(11, 18, 33, 0.65) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => pick("dark")}
          className="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10"
          aria-label="Close"
          data-testid="theme-chooser-close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[2px] text-indigo-300 mb-1">
          <Sparkles className="w-3.5 h-3.5" /> Choose your theme
        </div>
        <div className="text-xl font-semibold text-white">Pick the look that feels right</div>
        <div className="text-sm text-slate-300 mt-1">
          You can change this anytime from the sun/moon toggle in the header.
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4" data-testid="theme-chooser-cards">
          <ThemeCard
            id="dark"
            title="Dark"
            subtitle="Recommended · easy on the eyes"
            recommended
            onPick={() => pick("dark")}
            preview={
              <div
                className="rounded-md h-24 flex items-end p-2"
                style={{
                  background:
                    "radial-gradient(120% 120% at 30% 10%, rgba(139, 92, 246, 0.35) 0%, rgba(11, 18, 33, 0.45) 45%, rgba(11, 18, 33, 0.55) 100%)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div className="space-y-1 w-full">
                  <div className="h-1.5 rounded-full bg-white/80 w-3/4" />
                  <div className="h-1 rounded-full bg-white/40 w-1/2" />
                  <div className="h-1 rounded-full bg-white/40 w-2/3" />
                </div>
              </div>
            }
            icon={<Moon className="w-4 h-4" />}
          />
          <ThemeCard
            id="light"
            title="Light"
            subtitle="Bright · crisp for daytime"
            onPick={() => pick("light")}
            preview={
              <div
                className="rounded-md h-24 flex items-end p-2"
                style={{
                  background:
                    "radial-gradient(120% 120% at 30% 10%, rgba(255,255,255,0.85) 0%, rgba(241, 245, 249, 0.85) 100%)",
                }}
              >
                <div className="space-y-1 w-full">
                  <div className="h-1.5 rounded-full bg-slate-800/80 w-3/4" />
                  <div className="h-1 rounded-full bg-slate-500/60 w-1/2" />
                  <div className="h-1 rounded-full bg-slate-500/60 w-2/3" />
                </div>
              </div>
            }
            icon={<Sun className="w-4 h-4" />}
          />
        </div>

        <div className="mt-4 text-[11px] text-slate-400 flex items-start gap-2">
          <Check className="w-3.5 h-3.5 mt-0.5 text-emerald-400 flex-shrink-0" />
          <span>
            Both themes keep the semi-transparent glass style on note expands and modals so your
            wallpaper always shows through.
          </span>
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ id, title, subtitle, preview, icon, recommended, onPick }) {
  return (
    <button
      type="button"
      onClick={onPick}
      data-testid={`theme-chooser-${id}`}
      className="text-left rounded-lg overflow-hidden border border-white/15 hover:border-indigo-400/70 transition-all bg-white/5 hover:bg-white/10 backdrop-blur-md group relative"
    >
      {preview}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="w-5 h-5 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/80">
            {icon}
          </span>
          <span className="text-sm font-semibold text-white">{title}</span>
          {recommended && (
            <span className="ml-auto text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
              Recommended
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-400">{subtitle}</div>
      </div>
    </button>
  );
}
