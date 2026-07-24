// Small haptic-feedback helper backed by the Vibration API.
// Silently no-ops on browsers/devices without support.
const VIBRATE = navigator?.vibrate?.bind(navigator);

const patterns = {
  tap:     10,          // light tap on any interactive element
  success: [10, 40, 20],
  error:   [30, 60, 30],
  long:    35,          // long press / delete
};

export function haptic(type = "tap") {
  if (!VIBRATE) return;
  try { VIBRATE(patterns[type] ?? patterns.tap); } catch { /* ignore */ }
}
