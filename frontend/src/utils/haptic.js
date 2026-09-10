// Small haptic-feedback helper.
// On native builds (Capacitor iOS / Android) it uses @capacitor/haptics which
// gives proper Taptic-Engine feedback. On the web it falls back to
// navigator.vibrate. Silently no-ops on unsupported platforms.

import { Capacitor } from "@capacitor/core";

let nativeHapticsPromise = null;
async function nativeHaptics() {
  if (nativeHapticsPromise) return nativeHapticsPromise;
  nativeHapticsPromise = import("@capacitor/haptics").then(m => m).catch(() => null);
  return nativeHapticsPromise;
}

const IS_NATIVE = (() => {
  try { return Capacitor?.isNativePlatform?.() === true; } catch { return false; }
})();

const VIBRATE = typeof navigator !== "undefined" ? navigator?.vibrate?.bind(navigator) : null;

const patterns = {
  tap:       10,             // light tap on any interactive element
  success:   [10, 40, 20],
  error:     [30, 60, 30],
  long:      35,             // long press / delete
  milestone: [40, 80, 40, 80, 40],  // strong "you're done!" pulse for
                                    // pack apply, focus timer expire,
                                    // backup export, cross-pack drop,
                                    // pin toggle, etc.
};

export function haptic(type = "tap") {
  if (IS_NATIVE) {
    // Fire and forget — never block UI on haptics.
    nativeHaptics().then((mod) => {
      if (!mod) return;
      try {
        if (type === "success")   return mod.Haptics.notification({ type: mod.NotificationType.Success });
        if (type === "error")     return mod.Haptics.notification({ type: mod.NotificationType.Error });
        if (type === "long")      return mod.Haptics.impact({ style: mod.ImpactStyle.Medium });
        if (type === "milestone") return mod.Haptics.impact({ style: mod.ImpactStyle.Heavy });
        return mod.Haptics.impact({ style: mod.ImpactStyle.Light });
      } catch { /* ignore */ }
    });
    return;
  }
  if (!VIBRATE) return;
  try { VIBRATE(patterns[type] ?? patterns.tap); } catch { /* ignore */ }
}
