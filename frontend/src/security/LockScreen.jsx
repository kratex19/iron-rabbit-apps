import React, { useEffect, useState, useCallback } from "react";
import { Fingerprint, Lock, Delete, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import SecurityService from "./SecurityService";

/**
 * Full-screen lock overlay. Rendered above everything when locked.
 * - Biometric method: attempts prompt immediately, offers "Use PIN" fallback if a PIN is also set.
 * - PIN method: 6-digit style pad (accepts 4-8).
 */
export default function LockScreen({ isOpen, onUnlock, isDark = true }) {
  const [method, setMethod] = useState("none");
  const [hasPINFallback, setHasPINFallback] = useState(false);
  const [showPINPad, setShowPINPad] = useState(false);
  const [pin, setPIN] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const bootstrap = useCallback(async () => {
    if (!isOpen) return;
    const m = await SecurityService.getMethod();
    const pinAvail = await SecurityService.hasPIN();
    setMethod(m);
    setHasPINFallback(pinAvail && m !== "pin");
    setShowPINPad(m === "pin");
    setPIN("");
    setError("");

    if (m === "biometric") {
      // Fire the biometric prompt automatically after paint
      setTimeout(() => attemptBiometric(), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => { bootstrap(); }, [bootstrap]);

  const attemptBiometric = async () => {
    setBusy(true);
    try {
      const ok = await SecurityService.verifyBiometric();
      if (ok) { setBusy(false); onUnlock({ panic: false }); return; }
      setError("Authentication failed");
    } catch (e) {
      setError(e?.message || "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  const submitPIN = async (val) => {
    if (val.length < 4) return;
    setBusy(true);
    const result = await SecurityService.verifyPIN(val);
    setBusy(false);
    if (result.ok) { onUnlock({ panic: !!result.panic }); return; }
    setError("Wrong PIN");
    setPIN("");
    if (navigator.vibrate) navigator.vibrate(150);
  };

  const onDigit = (d) => {
    setError("");
    const next = (pin + d).slice(0, 8);
    setPIN(next);
    if (next.length >= 4) {
      // Auto-attempt at 4 digits, otherwise wait for user to press OK
    }
  };
  const onBack = () => { setError(""); setPIN((p) => p.slice(0, -1)); };
  const onSubmit = () => submitPIN(pin);

  if (!isOpen) return null;

  const bgBase = isDark ? "bg-[#020617]" : "bg-white";
  const textBase = isDark ? "text-white" : "text-gray-900";

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center ${bgBase} ${textBase}`} data-testid="lock-screen">
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
          <ShieldCheck className="w-10 h-10 text-indigo-500" />
        </div>
        <h1 className="text-2xl font-bold">Iron Rabbit</h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>App is locked</p>
      </div>

      {method === "biometric" && !showPINPad && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={attemptBiometric}
            disabled={busy}
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${
              isDark ? "bg-indigo-500/20 hover:bg-indigo-500/30" : "bg-indigo-100 hover:bg-indigo-200"
            }`}
            data-testid="lock-biometric-btn"
          >
            <Fingerprint className={`w-12 h-12 ${busy ? "animate-pulse" : ""} text-indigo-500`} />
          </button>
          <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            {busy ? "Waiting for biometrics…" : "Tap to authenticate"}
          </p>
          {error && <p className="text-xs text-red-400" data-testid="lock-error">{error}</p>}
          {hasPINFallback && (
            <button
              type="button"
              onClick={() => setShowPINPad(true)}
              className="text-xs text-indigo-400 underline mt-2"
              data-testid="lock-use-pin-btn"
            >
              Use PIN instead
            </button>
          )}
        </div>
      )}

      {showPINPad && (
        <div className="flex flex-col items-center gap-5" data-testid="lock-pin-pad">
          {/* PIN dots */}
          <div className="flex gap-3">
            {Array.from({ length: Math.max(4, pin.length) }).slice(0, 8).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full border-2 transition-colors ${
                  i < pin.length
                    ? "bg-indigo-500 border-indigo-500"
                    : isDark ? "border-slate-600" : "border-gray-300"
                }`}
              />
            ))}
          </div>
          {error && <p className="text-xs text-red-400" data-testid="lock-error">{error}</p>}
          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-64">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onDigit(String(n))}
                disabled={busy || pin.length >= 8}
                className={`h-16 rounded-full text-2xl font-light transition-colors ${
                  isDark
                    ? "bg-white/5 hover:bg-white/10 active:bg-white/20 text-white"
                    : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900"
                }`}
                data-testid={`lock-key-${n}`}
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy || pin.length < 4}
              className={`h-16 rounded-full text-xs font-semibold transition-colors ${
                pin.length >= 4
                  ? "bg-indigo-500 text-white hover:bg-indigo-600"
                  : isDark ? "bg-white/5 text-slate-500" : "bg-gray-100 text-gray-400"
              }`}
              data-testid="lock-submit"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => onDigit("0")}
              disabled={busy || pin.length >= 8}
              className={`h-16 rounded-full text-2xl font-light transition-colors ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 active:bg-white/20 text-white"
                  : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-900"
              }`}
              data-testid="lock-key-0"
            >
              0
            </button>
            <button
              type="button"
              onClick={onBack}
              disabled={busy || pin.length === 0}
              className={`h-16 rounded-full flex items-center justify-center transition-colors ${
                isDark
                  ? "bg-white/5 hover:bg-white/10 active:bg-white/20 text-slate-300"
                  : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-500"
              }`}
              data-testid="lock-back"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>
          {method === "biometric" && hasPINFallback && (
            <button
              type="button"
              onClick={() => { setShowPINPad(false); setPIN(""); }}
              className="text-xs text-indigo-400 underline mt-2"
            >
              Use biometrics instead
            </button>
          )}
        </div>
      )}

      {method === "none" && (
        <div className="flex flex-col items-center gap-3">
          <Lock className="w-10 h-10 text-slate-500" />
          <p className="text-sm text-slate-400">No security method configured</p>
          <button
            type="button"
            onClick={onUnlock}
            className="px-4 py-2 rounded-md bg-indigo-500 text-white text-sm hover:bg-indigo-600"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
