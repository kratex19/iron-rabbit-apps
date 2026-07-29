# Iron Rabbit — Native App (Android / iOS) Build Guide

Iron Rabbit is a **Progressive Web App** that is also wrapped with **Capacitor** so it can be built as a native Android and iOS app. The web build continues to work exactly the same; the native builds add real native APIs for biometrics, secure storage, and privacy-screen support.

---

## ⚡ Quickstart (TL;DR)

You need to do this **on your own computer** — the Emergent preview/prod environments can't compile native code.

**Android APK, easiest path** (15–20 min after installs):

```bash
# One-time
git clone <your repo url>          # or "Save to GitHub" from Emergent, then clone
cd iron-rabbit/frontend
yarn install
yarn build                         # produces /frontend/build
npx cap add android                # first time only
npx cap sync

# Then open in Android Studio
npx cap open android
# → In Android Studio: Build → Build Bundle(s) / APK → Build APK(s)
# → Grab the .apk from android/app/build/outputs/apk/debug/
```

Sideload the `.apk` to your phone and you're running the native app. No Play Store needed.

**iOS TestFlight** (same idea, macOS-only, ~30 min):

```bash
yarn build && npx cap sync
npx cap open ios
# → In Xcode: pick your team, Product → Archive → Distribute → TestFlight
```

---

## What lives where

| Layer | Where | Purpose |
| --- | --- | --- |
| React source | `frontend/src/` | UI, business logic, IndexedDB storage |
| Capacitor config | `frontend/capacitor.config.ts` | App ID, name, plugin config |
| Security backend | `frontend/src/security/SecurityService.js` | Auto-detects Capacitor. Uses **WebAuthn + IndexedDB** in the browser and swaps to **native BiometricPrompt / LocalAuthentication + Keychain / Keystore** when running natively. |
| Native project (Android) | `frontend/android/` *(generated)* | Standard Android Studio project |
| Native project (iOS) | `frontend/ios/` *(generated)* | Standard Xcode project |

---

## Prerequisites (once, on your local dev machine)

- **Node.js 20+** (Capacitor 7 works with Node 20; upgrade to Node 22 if you switch to Cap 8)
- **Yarn** (`npm install -g yarn`)
- **For Android**: Android Studio + Android SDK 33+, JDK 17
- **For iOS**: macOS + Xcode 15+ + CocoaPods (`sudo gem install cocoapods`)

---

## First-time setup

```bash
# 1. Get the latest web build
cd frontend
yarn install
yarn build         # emits ./build

# 2. Add native platforms (this creates the ios/ and android/ folders)
npx cap add android
npx cap add ios

# 3. Copy the web build into the native shells
npx cap sync
```

That's it — the native projects now contain your app.

---

## Iterating

Whenever you change React code:

```bash
yarn build && npx cap sync
```

Then:

- **Android**: `npx cap open android` → hit ▶ Run in Android Studio
- **iOS**: `npx cap open ios` → hit ▶ Run in Xcode

---

## Installed native plugins

| Plugin | Purpose |
| --- | --- |
| `@capacitor/app` | Background / foreground state (auto-lock timing) |
| `@capacitor/preferences` | Secure key/value storage (Keychain on iOS, Keystore-backed SharedPreferences on Android) |
| `capacitor-native-biometric` | Fingerprint / Face ID / Touch ID prompts via native APIs |
| `@capacitor-community/privacy-screen` | Hides app content in the OS task switcher (Recent Apps) |

`SecurityService` picks the right backend at runtime — no code changes needed to switch.

---

## Phase 4 native enhancements (optional add-ons)

The Meal Planner, Trip Journal, and Barcode Scanner ship as **web-native** in the PWA build (using `BarcodeDetector`, `getUserMedia`, IndexedDB, and OpenFoodFacts). To get a smoother native experience — faster barcode scanning, background nutrition sync, home-screen widget — add these plugins:

```bash
# From frontend/
yarn add @capacitor-mlkit/barcode-scanning        # Google ML Kit — much faster than BarcodeDetector, works offline
yarn add @capacitor/haptics                       # Better haptic feedback than the web Vibration API
yarn add @capacitor/local-notifications           # Fire the weekly grocery/chore digest without a background tab
npx cap sync
```

### Barcode Scanner (native path)

`frontend/src/notes/BarcodeScannerModal.jsx` currently uses `window.BarcodeDetector`. To switch to ML Kit on native builds, add this runtime guard around the scan loop (search for `startCamera`):

```js
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";

if (Capacitor.isNativePlatform()) {
  const result = await BarcodeScanner.scan();
  if (result.barcodes?.[0]) setScanned({ code: result.barcodes[0].rawValue });
} else {
  // existing web code
}
```

### Camera permission (required for scanner)

**Android** — `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

**iOS** — `ios/App/App/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Iron Rabbit uses the camera to scan barcodes and add products to your shopping list.</string>
```

---

## Store submission checklist

**Android (Google Play):**
- Increment `versionCode` in `android/app/build.gradle`
- Generate signed AAB: Build → Generate Signed Bundle in Android Studio
- Upload to Play Console

**iOS (App Store):**
- Increment `CFBundleShortVersionString` in `ios/App/App/Info.plist`
- Archive: Product → Archive in Xcode
- Upload to App Store Connect via Organizer

---

## Adding the app permissions

**Android** — `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

**iOS** — `ios/App/App/Info.plist`:
```xml
<key>NSFaceIDUsageDescription</key>
<string>Iron Rabbit uses Face ID to keep your notes private.</string>
```

---

## Security guarantees

- ❌ Iron Rabbit **never** stores biometric templates, device PINs, or device passwords.
- ✅ Biometric auth is handled 100% by the OS (BiometricPrompt / LocalAuthentication).
- ✅ Local PINs are stored as `SHA-256(salt + PIN)` — plain text is never persisted.
- ✅ On native builds, secret storage is written via Capacitor Preferences → **iOS Keychain** and **Android EncryptedSharedPreferences (Keystore-backed)**.
- ✅ Cloud sign-in is optional; the free version works fully offline.
