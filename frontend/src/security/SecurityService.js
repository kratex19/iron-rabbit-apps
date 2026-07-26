// security/SecurityService.js
// Modular auth backend: uses native APIs when running inside Capacitor,
// falls back to WebAuthn + hashed local PIN for the plain PWA / desktop.
//
// The public API is stable — swapping backends (web ↔ native) requires
// zero UI changes.

import StorageService from "../storage/storageService";

// Lazy Capacitor detection (avoids crashes when running as pure web PWA)
let CapacitorApp = null;
let NativeBiometric = null;
let NativePreferences = null;
let PrivacyScreen = null;
let isNativePlatform = false;

async function loadNativeModules() {
  try {
    const cap = await import("@capacitor/core");
    isNativePlatform = cap.Capacitor.isNativePlatform();
    if (!isNativePlatform) return;
    const [{ App }, { Preferences }, biometric, privacy] = await Promise.all([
      import("@capacitor/app"),
      import("@capacitor/preferences"),
      import("capacitor-native-biometric").catch(() => null),
      import("@capacitor-community/privacy-screen").catch(() => null),
    ]);
    CapacitorApp = App;
    NativePreferences = Preferences;
    NativeBiometric = biometric?.NativeBiometric || null;
    PrivacyScreen = privacy?.PrivacyScreen || null;
  } catch (_e) {
    isNativePlatform = false;
  }
}
loadNativeModules();

// ---------- Helpers ---------------------------------------------------------

const KEY_PIN_HASH = "sec_pin_hash";
const KEY_PIN_SALT = "sec_pin_salt";
const KEY_METHOD = "sec_method";           // "none" | "biometric" | "pin" | "password"
const KEY_AUTO_LOCK = "sec_autolock_ms";
const KEY_TOGGLES = "sec_toggles";         // JSON of security-toggle flags
const KEY_WEBAUTHN_CRED = "sec_webauthn_cred_id";

async function sha256(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randSalt(len = 16) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Storage abstraction — native uses Capacitor Preferences (Keychain / Keystore),
// web falls back to IndexedDB (via StorageService.settings).
async function secGet(key) {
  if (isNativePlatform && NativePreferences) {
    const { value } = await NativePreferences.get({ key });
    return value ?? null;
  }
  const settings = (await StorageService.getSettings()) || {};
  return settings[key] ?? null;
}

async function secSet(key, value) {
  if (isNativePlatform && NativePreferences) {
    if (value === null || value === undefined) {
      await NativePreferences.remove({ key });
    } else {
      await NativePreferences.set({ key, value: String(value) });
    }
    return;
  }
  const settings = (await StorageService.getSettings()) || {};
  const next = { ...settings, [key]: value };
  await StorageService.saveSettings(next);
}

// ---------- Toggles ---------------------------------------------------------

export const DEFAULT_TOGGLES = {
  lockOnLaunch: true,
  lockOnBackground: true,
  hideInRecents: false,
  requireAuthExport: false,
  requireAuthClearAll: true,
  requireAuthRestore: true,
};

export const AUTO_LOCK_OPTIONS = [
  { value: 0,        label: "Immediately" },
  { value: 30_000,   label: "After 30 seconds" },
  { value: 60_000,   label: "After 1 minute" },
  { value: 300_000,  label: "After 5 minutes" },
  { value: 900_000,  label: "After 15 minutes" },
  { value: -1,       label: "Never" },
];

// ---------- Public API ------------------------------------------------------

const SecurityService = {
  async isNative() {
    return isNativePlatform;
  },

  async getMethod() {
    return (await secGet(KEY_METHOD)) || "none";
  },
  async setMethod(method) {
    await secSet(KEY_METHOD, method);
  },
  async clearMethod() {
    await secSet(KEY_METHOD, "none");
    await secSet(KEY_PIN_HASH, null);
    await secSet(KEY_PIN_SALT, null);
    await secSet(KEY_WEBAUTHN_CRED, null);
  },

  async getAutoLockMs() {
    const v = await secGet(KEY_AUTO_LOCK);
    return v === null ? 60_000 : Number(v);
  },
  async setAutoLockMs(ms) {
    await secSet(KEY_AUTO_LOCK, ms);
  },

  async getToggles() {
    const raw = await secGet(KEY_TOGGLES);
    if (!raw) return { ...DEFAULT_TOGGLES };
    try { return { ...DEFAULT_TOGGLES, ...JSON.parse(raw) }; }
    catch { return { ...DEFAULT_TOGGLES }; }
  },
  async setToggles(t) {
    await secSet(KEY_TOGGLES, JSON.stringify(t));
    // Native: sync PrivacyScreen preference
    if (isNativePlatform && PrivacyScreen) {
      try {
        if (t.hideInRecents) await PrivacyScreen.enable();
        else await PrivacyScreen.disable();
      } catch (_e) { /* plugin may not be installed */ }
    }
  },

  // ---------- Local PIN ----------
  async setPIN(pin) {
    if (!/^\d{4,8}$/.test(pin)) throw new Error("PIN must be 4-8 digits");
    const salt = randSalt();
    const hash = await sha256(salt + pin);
    await secSet(KEY_PIN_SALT, salt);
    await secSet(KEY_PIN_HASH, hash);
    await secSet(KEY_METHOD, "pin");
  },
  async verifyPIN(pin) {
    const salt = await secGet(KEY_PIN_SALT);
    const hash = await secGet(KEY_PIN_HASH);
    if (!salt || !hash) return false;
    const check = await sha256(salt + pin);
    return check === hash;
  },
  async hasPIN() {
    return !!(await secGet(KEY_PIN_HASH));
  },
  async removePIN() {
    await secSet(KEY_PIN_HASH, null);
    await secSet(KEY_PIN_SALT, null);
    if ((await this.getMethod()) === "pin") await this.setMethod("none");
  },

  // ---------- Biometrics ----------
  async biometricAvailable() {
    if (isNativePlatform && NativeBiometric) {
      try {
        const res = await NativeBiometric.isAvailable();
        return !!res.isAvailable;
      } catch { return false; }
    }
    // Web fallback: WebAuthn user-verifying platform authenticator
    if (window.PublicKeyCredential &&
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch { return false; }
    }
    return false;
  },

  async enableBiometric() {
    const ok = await this.biometricAvailable();
    if (!ok) throw new Error("Biometrics not available on this device");
    if (isNativePlatform && NativeBiometric) {
      // Native: verify immediately to confirm the user can pass biometrics
      await NativeBiometric.verifyIdentity({
        reason: "Confirm to enable Iron Rabbit biometric lock",
        title: "Iron Rabbit",
        subtitle: "Enable biometric lock",
      });
      await secSet(KEY_METHOD, "biometric");
      return;
    }
    // Web: register a WebAuthn credential
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Iron Rabbit" },
        user: { id: userId, name: "iron-rabbit-user", displayName: "Iron Rabbit User" },
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    });
    if (!cred) throw new Error("Biometric registration cancelled");
    const rawId = new Uint8Array(cred.rawId);
    const b64 = btoa(String.fromCharCode(...rawId));
    await secSet(KEY_WEBAUTHN_CRED, b64);
    await secSet(KEY_METHOD, "biometric");
  },

  async verifyBiometric() {
    if (isNativePlatform && NativeBiometric) {
      try {
        await NativeBiometric.verifyIdentity({
          reason: "Unlock Iron Rabbit",
          title: "Iron Rabbit",
          subtitle: "Authenticate to continue",
        });
        return true;
      } catch { return false; }
    }
    // Web: WebAuthn get()
    const credB64 = await secGet(KEY_WEBAUTHN_CRED);
    if (!credB64) return false;
    try {
      const rawId = Uint8Array.from(atob(credB64), (c) => c.charCodeAt(0));
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [{ id: rawId, type: "public-key" }],
          userVerification: "required",
          timeout: 60000,
        },
      });
      return !!assertion;
    } catch {
      return false;
    }
  },

  // ---------- Unified unlock ----------
  async isEnabled() {
    const m = await this.getMethod();
    return m && m !== "none";
  },

  // Called by UI to run whatever the user chose. Returns bool.
  async authenticate() {
    const method = await this.getMethod();
    if (method === "biometric") return this.verifyBiometric();
    // For PIN / none, PIN entry is handled in the LockScreen UI; auth call
    // for "none" is trivially true.
    return method === "none";
  },
};

export default SecurityService;
