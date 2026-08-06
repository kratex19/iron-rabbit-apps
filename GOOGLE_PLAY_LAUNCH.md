# Iron Rabbit — Google Play Launch Checklist

Version target: **1.0.0** · Package: `com.ironrabbitapps.notes`

Everything in this file is what still needs to happen **on your local dev machine or in the Google Play Console** before you can publish. All in-app / repo-side work is done.

---

## ✅ Already done in the repo (Feb 8, 2026)

- [x] Manifest bumped to `version: 1.0.0`, longer store description, `theme_color` matches brand indigo (`#4F46E5`)
- [x] Real app icons generated — friendly white-rabbit face with carrot accent on indigo gradient. Placeholder "IR" square is gone.
  - `public/icon-192.png` — any-purpose
  - `public/icon-512.png` — any-purpose
  - `public/icon-1024.png` — Play Store listing hi-res
  - `public/icon-192-maskable.png` — 33% safe-zone, survives circle / squircle masks
  - `public/icon-512-maskable.png` — 33% safe-zone
  - `public/icon-foreground-432.png` — Android adaptive-icon foreground layer
  - `public/icon-background-432.png` — Android adaptive-icon background layer
  - `public/splash-2048.png` — 2048×2048 portrait splash
- [x] `manifest.json` now declares both `purpose: any` and `purpose: maskable` icons at 192 and 512
- [x] `capacitor.config.ts` — added `SplashScreen` and `LocalNotifications` plugin config; `androidScheme: 'https'`; `allowMixedContent: false`
- [x] `PRIVACY.md` created at repo root — publish it at a public URL before Play submission
- [x] `CAPACITOR_SETUP.md` documents camera + biometric permissions, ML Kit install flow, store submission steps
- [x] Backup / Restore verified end-to-end (iteration_48: 7/7 pass)
- [x] Offline persistence verified — writes survive reload across notes, settings, pantry, theme, language
- [x] Pantry barcode → OpenFoodFacts → ProductInfoAccordion flow verified
- [x] Service worker cache bumped to `iron-rabbit-v11`

---

## 🟨 To do on your Mac / Windows dev machine

### 1. Host the privacy policy publicly
Google Play requires a public URL. Options:
- Push `PRIVACY.md` to your GitHub repo and use the raw URL (`https://raw.githubusercontent.com/…/PRIVACY.md`).
- Better: put it on `https://ironrabbitapps.com/privacy` (rendered from Markdown or as HTML).
- Copy the final URL — you will paste it into Play Console → **Store presence → Store listing → Privacy policy**.

### 2. Generate the native Android project

```bash
cd frontend
yarn install
yarn build
npx cap add android         # first time only
npx cap sync
```

### 3. Wire up the adaptive icons in `android/app/src/main/res/`

After `cap sync`, replace the default launcher icons with the ones this repo now ships:

```
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
android/app/src/main/res/drawable/ic_launcher_foreground.xml
android/app/src/main/res/drawable/ic_launcher_background.xml
```

Easiest path: open **Android Studio → Right-click `res` → New → Image Asset → Launcher Icons (Adaptive & Legacy)** and point it at:
- Foreground: `frontend/public/icon-foreground-432.png`
- Background: `frontend/public/icon-background-432.png`

Then let Studio generate every density (mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi).

### 4. Wire up the splash screen

Studio → **Right-click `res` → New → Image Asset → Splash Screen** and point it at `frontend/public/splash-2048.png` with background `#020617`.

Verify in `android/app/src/main/res/drawable/splash.xml` (or the modern `values/themes.xml` `windowSplashScreenBackground`) that:
- Background = `#020617`
- Icon = the rabbit head only (crop from `splash-2048.png`)

### 5. Update permissions & metadata in `android/app/src/main/AndroidManifest.xml`

Inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

Inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.version"
    android:value="@integer/google_play_services_version" />
```

### 6. Bump native version

In `android/app/build.gradle`:

```groovy
defaultConfig {
    applicationId "com.ironrabbitapps.notes"
    minSdkVersion 24
    targetSdkVersion 34
    versionCode 1
    versionName "1.0.0"
}
```

Every future release increments `versionCode` by 1 (must be monotonic) and updates `versionName`.

### 7. Generate a signing key and sign the AAB

```bash
keytool -genkey -v -keystore iron-rabbit-upload.jks \
    -alias iron-rabbit -keyalg RSA -keysize 2048 -validity 10000
```

**Save the .jks file and the password in a password manager. Losing them = losing the ability to update this app.**

Add to `android/app/build.gradle`:

```groovy
signingConfigs {
    release {
        storeFile file("iron-rabbit-upload.jks")
        storePassword System.getenv("IR_KEYSTORE_PASS")
        keyAlias "iron-rabbit"
        keyPassword System.getenv("IR_KEY_PASS")
    }
}
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
        signingConfig signingConfigs.release
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

Then:

```bash
export IR_KEYSTORE_PASS=...
export IR_KEY_PASS=...
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

### 8. Test the release build on a real device

```bash
./gradlew installRelease
```

Smoke test:
- App icon on launcher shows the rabbit (not the default "IR" square)
- Splash shows the rabbit badge on `#020617` for ~2s, then fades
- Notes / Pantry / Kid Mode all open
- Barcode scanner asks for camera permission on first use, then works
- Reload the app → data still there
- Backup → export → restore works
- Airplane mode → everything except barcode lookup still works

### 9. Google Play Console setup

Go to https://play.google.com/console.

1. **Create app** → App name `Iron Rabbit`, default language English (US), Free.
2. **Store listing**:
   - Short description (80 chars): `Offline notes, chores, meal plan, pantry & shopping — all on your device.`
   - Full description (4000 chars): expand from `PRIVACY.md` + `README.md` intro.
   - App icon: upload `frontend/public/icon-512.png` (Play automatically uses the 1024 you supply for the Play Store listing itself — upload `icon-1024.png` there).
   - Feature graphic: **you still need this** — 1024×500 PNG, brand-colored with rabbit + tagline "Notes that live on your phone". Not in repo yet.
   - Phone screenshots: use the 4 in `public/screenshots/` — you need **min 2, max 8**. Consider adding 4 more (Kid Mode, Pantry with Nutri-Score, Meal Plan, Backup/Restore) before submitting.
3. **App content** → App category = *Productivity*, tags = "notes", "offline", "reminders".
4. **Privacy policy** → paste the public URL from step 1.
5. **Data safety form** → answer:
   - Data collected: **None** (all data on-device).
   - Data shared with third parties: **None**.
   - Purpose: N/A (nothing collected).
   - Security practices: "Data is encrypted in transit" (HTTPS to Open Food Facts), "Users can request data deletion" (Settings → Data & Reset).
6. **Target audience** → 13+ or 18+. Family policies apply if you tick "children" — Iron Rabbit's Kid Mode is fine as long as no ads / no analytics (both true).
7. **Content rating** → run the questionnaire; expect **Everyone**.
8. **Release** → Production track → Create new release → Upload `app-release.aab`.
9. **Review and roll out** → Google reviews in 1–7 days.

### 10. iOS (parallel path, optional first release)

```bash
cd frontend && yarn build && npx cap sync
npx cap open ios
```

- In Xcode: set your team, bump `CFBundleShortVersionString` to `1.0.0`, `CFBundleVersion` to `1`.
- Add `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`, `NSFaceIDUsageDescription` to `Info.plist`.
- Product → Archive → Distribute → TestFlight or App Store.

---

## 🔴 Known gaps still worth doing before public launch

- [x] ~~**Feature graphic (1024×500)**~~ — Generated: `frontend/public/feature-graphic-1024x500.png`
- [x] ~~**Additional screenshots**~~ — 8 screenshots ready in `frontend/public/screenshots/` (Kid Mode, Pantry Nutri-Score, Meal Plan, Backup, Notes list/create/expanded/fullscreen)
- [ ] **Privacy policy live URL** — the `PRIVACY.md` file must be hosted publicly (GitHub raw URL or `ironrabbitapps.com/privacy`)
- [ ] **Real device smoke test** — every claim above assumes the release build boots and works on a physical Android device. Test before submission.
- [ ] **Terms of Service** — Not strictly required by Play for a $0 productivity app with no accounts, but you should draft one.

---

## Reference

- Google Play Console: https://play.google.com/console
- Capacitor 7 docs: https://capacitorjs.com/docs
- Android adaptive icons: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- Data safety form: https://support.google.com/googleplay/android-developer/answer/10787469
