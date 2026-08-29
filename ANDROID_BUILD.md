# Iron Rabbit — Android / Google Play Build Guide

Companion doc to `IOS_BUILD.md`. Everything on the codebase side is wired for Capacitor Android — this walkthrough covers **generating the Android project, technical build settings for Google Play, and every field the Play Console will ask you for.**

---

## ✅ What is already wired up

| Item | Status | File |
|---|---|---|
| Capacitor Android plugin | Installed | `frontend/package.json` (`@capacitor/android@^7`) |
| Capacitor config (bundle id, splash, plugins) | Configured | `frontend/capacitor.config.ts` |
| App icon (1024×1024) | Present | `frontend/public/icon-1024.png` |
| Adaptive-icon foreground/background layers | Present | `frontend/public/icon-foreground-432.png`, `frontend/public/icon-background-432.png` |
| Maskable icons | Present | `frontend/public/icon-192-maskable.png`, `frontend/public/icon-512-maskable.png` |
| Play Store Feature Graphic (1024×500) | Present | `frontend/public/feature-graphic-1024x500.png` |
| PWA manifest `orientation: any` | Set | `frontend/public/manifest.json` |
| `androidScheme: 'https'` (allows secure fetch of packaged assets) | Set | `capacitor.config.ts` |

---

## 🛠  Prerequisites

1. **Android Studio Hedgehog (2023.1.1) or later** — https://developer.android.com/studio
2. **Java 17** (bundled with Android Studio, or `brew install --cask temurin17`)
3. **Node 18+** and **Yarn**
4. **Google Play Developer account** (`$25 one-time`) — https://play.google.com/console

---

## 🚀 Step 1 — Generate the Android project (one time)

Run these once on your Mac (or Windows/Linux — Android is cross-platform, unlike iOS):

```bash
cd frontend

# 1. Install JS deps
yarn install

# 2. Build the production web bundle
yarn build

# 3. Add the Android platform to the project
npx cap add android

# 4. Copy the web bundle + configure the project
npx cap sync android

# 5. Open the project in Android Studio
npx cap open android
```

Android Studio will now open `frontend/android/`. Wait for Gradle to finish its first sync (~3–5 minutes on a fresh install — it downloads the Android SDK if you don't already have it).

---

## 🛠 Step 2 — Configure build settings

Once Android Studio has synced, open **`frontend/android/app/build.gradle`** and confirm/set these values:

```gradle
android {
    namespace "com.ironrabbit.app"
    compileSdk 34                     // Play Store requires SDK 34+ as of Aug 2024
    defaultConfig {
        applicationId "com.ironrabbit.app"
        minSdkVersion 22              // Capacitor 7 minimum (Android 5.1+)
        targetSdkVersion 34           // MUST be 34 or higher for Play submission
        versionCode 1                 // integer, +1 on every submission
        versionName "1.0.0"           // user-visible string
    }
    // ...
}
```

**Every submission → bump `versionCode` by 1** (integer) and update `versionName` (e.g. `1.0.0` → `1.0.1`).

### Icons

After `npx cap sync android` the following are auto-generated from `frontend/public/`:

- `android/app/src/main/res/mipmap-*/ic_launcher.png` — legacy square icon
- `android/app/src/main/res/mipmap-*/ic_launcher_round.png` — legacy round icon
- `android/app/src/main/res/mipmap-*/ic_launcher_foreground.png` — adaptive-icon foreground
- `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` — adaptive-icon spec

If icons look wrong or you swap the source rabbit later, regenerate with:

```bash
cd frontend
npx @capacitor/assets generate --iconBackgroundColor '#3c2a1d' --androidProject ./android
```

(`#3c2a1d` is the rusted-brown padding color used in the maskable icons — matches the frame.)

### Splash screen

Already configured in `capacitor.config.ts`. The `androidScaleType: 'CENTER_CROP'` + `backgroundColor: '#020617'` (slate-950) is applied automatically on sync.

### Permissions

Iron Rabbit is offline-first with **zero required Android permissions**. If you enable optional features later (camera scanning, notifications), Capacitor plugins auto-declare them in `AndroidManifest.xml`.

Current `AndroidManifest.xml` should contain **no** `<uses-permission>` lines for a clean install — great for Play Store review (fewer permissions = fewer questions).

---

## 🔐 Step 3 — Create your app signing key

Google Play requires every APK/AAB to be signed. Run this **once** and store the keystore file somewhere safe (Dropbox/1Password — if you lose it, you can never publish updates to this app).

```bash
cd frontend/android/app

keytool -genkey -v -keystore ironrabbit-release.keystore \
    -alias ironrabbit -keyalg RSA -keysize 2048 -validity 10000
```

It will ask for:
- **Keystore password** — save in 1Password
- **Key password** — same as keystore is fine
- Your name / org / city / country

Then create `frontend/android/keystore.properties` (add to `.gitignore`):

```properties
storeFile=app/ironrabbit-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=ironrabbit
keyPassword=YOUR_KEY_PASSWORD
```

And edit `frontend/android/app/build.gradle` (top of file):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}
```

---

## 📦 Step 4 — Build the release AAB (App Bundle)

Google Play now **requires AAB (Android App Bundle)** — not APK.

In Android Studio:
1. Top menu → **Build → Generate Signed Bundle / APK**
2. Choose **Android App Bundle**
3. Point at `ironrabbit-release.keystore`, enter passwords
4. Build variant: **release**
5. Wait ~2–5 minutes

Or via CLI:

```bash
cd frontend/android
./gradlew bundleRelease
```

The output lands at `frontend/android/app/build/outputs/bundle/release/app-release.aab`. That's the file you upload to the Play Console.

---

## 🏪 Step 5 — Google Play Console settings

At https://play.google.com/console → **Create app** and fill in the following. Fields are grouped by Console page.

### App details

| Field | Value |
|---|---|
| App name | `Iron Rabbit` |
| Default language | `English (United States)` |
| App or game | **App** |
| Free or paid | **Free** |
| Declarations — Play policies | Confirm all boxes |

### Store listing

| Field | Value |
|---|---|
| Short description (80 char) | `All-in-one productivity toolkit. Offline. Private. Yours.` |
| Full description (4000 char) | See draft in `memory/APP_STORE_METADATA.md` |
| App icon | Upload `frontend/public/icon-512.png` (512×512, ≤1 MB) |
| Feature graphic | Upload `frontend/public/feature-graphic-1024x500.png` (1024×500) |
| Phone screenshots (min 2, max 8) | Capture from any Android emulator running Iron Rabbit — Play requires 320–3840 px per side, 16:9 or 9:16 |
| Tablet screenshots (optional but boosts listing) | Same, from an Android tablet emulator |
| App category | `Productivity` |
| Tags | `Notes`, `Tasks`, `Offline`, `Privacy` |
| Contact email | Your dev email |
| Website (optional) | `https://app.ironrabbitapps.com` |
| Privacy policy URL | `https://app.ironrabbitapps.com/privacy` — already served from `memory/PRIVACY_POLICY.md` |

### App content (mandatory questionnaires)

| Section | Answer |
|---|---|
| **Privacy policy** | Paste the URL from above |
| **App access** | *All functionality available without special access* |
| **Ads** | *No, my app doesn't contain ads* |
| **Content rating** | Complete the IARC questionnaire → likely **Everyone** for Iron Rabbit |
| **Target audience** | Age: 13+ (or 18+ if you want to skip the extra family-policy hoops) |
| **News app** | No |
| **COVID-19 contact tracing** | No |
| **Data safety** | Iron Rabbit is offline-first → **Data collected: None. Data shared: None.** All processing happens on-device. Users' notes never leave their phone unless they opt into a future backup feature. |
| **Government apps** | No |
| **Financial features** | No |
| **Health features** | No |
| **Actions on Google** | No |

### App releases (the AAB upload)

1. Left sidebar → **Production** (or **Internal testing** for a smoke run first — recommended)
2. **Create new release**
3. Play App Signing → **Use Google-generated key** (Google manages the app-signing key on your behalf; you keep the upload key you generated in Step 3)
4. Upload `app-release.aab`
5. Release name auto-fills to `1.0.0 (1)` — keep or edit
6. **Release notes** (all supported languages) — e.g. `Initial release`
7. **Save → Review release → Roll out**

First submission takes **1–7 days** to review. Updates typically clear in a few hours.

### Recommended pre-launch flow

- Upload first to **Internal testing** (up to 100 testers you invite by email). Test on real devices for 24–48h.
- Then promote the same build to **Closed testing** → **Open testing** → **Production**.

---

## 📦 What lives where (after `npx cap add android`)

```
frontend/
├── capacitor.config.ts             ← bundle id, splash, plugin config (shared with iOS)
├── package.json
├── build/                          ← yarn-build output bundled into the Android app
└── android/
    ├── app/
    │   ├── build.gradle            ← compileSdk / targetSdk / versionCode / versionName / signing
    │   ├── ironrabbit-release.keystore  ← YOUR KEY — never commit, back it up
    │   └── src/main/
    │       ├── AndroidManifest.xml
    │       ├── java/com/ironrabbit/app/MainActivity.java
    │       └── res/
    │           ├── mipmap-*/       ← launcher icons (auto-generated from public/icon-1024.png)
    │           ├── drawable/       ← splash + notification icons
    │           └── values/         ← app_name, colors, strings
    ├── keystore.properties         ← passwords for signing (gitignored)
    ├── build.gradle                ← root gradle config
    └── gradle/                     ← Gradle wrapper
```

Add to `.gitignore` before you commit:

```gitignore
android/app/*.keystore
android/keystore.properties
android/.gradle/
android/build/
android/app/build/
android/local.properties
```

---

## 🩹 Common gotchas

| Symptom | Fix |
|---|---|
| Gradle sync fails: "SDK location not found" | Android Studio → **File → Project Structure → SDK Location** → point to your Android SDK (usually `~/Library/Android/sdk`) |
| "Manifest merger failed" after adding a plugin | `npx cap sync android` — this re-merges plugin manifests into `AndroidManifest.xml` |
| Web changes don't appear in emulator | `yarn build && npx cap copy android` (skips pods; faster than `sync`) |
| Play Console rejects AAB — "target SDK too low" | Bump `targetSdkVersion` in `app/build.gradle` to at least `34` and rebuild |
| Icon shows a white square on Android 8+ | Regenerate adaptive icons: `npx @capacitor/assets generate --iconBackgroundColor '#3c2a1d' --androidProject ./android` |
| Play reviewer flags "unnecessary permissions" | Check `AndroidManifest.xml` — remove any `<uses-permission>` for a feature you don't use. Capacitor plugins add these; only install the plugins you actually need |
| App crashes on cold start on Android <9 | Confirm `minSdkVersion 22` in `app/build.gradle` — going lower breaks Capacitor 7 |
| Splash flashes white before rendering | Ensure `capacitor.config.ts` → `SplashScreen.backgroundColor` matches `manifest.json` `background_color` (`#020617`) |

---

## 🔄 Updating the app after code changes

```bash
cd frontend
yarn build              # rebuild web bundle
npx cap copy android    # push web bundle → Android project (fast, no gradle work)
# In Android Studio: Cmd+R / Shift+F10 to run in emulator
# For a new Play release: Build → Generate Signed Bundle → upload the new AAB
```

If you added/removed a Capacitor plugin, run `npx cap sync android` instead of `copy`.

---

## 📱 Optional next steps

- **Play Store screenshots** — Use an emulator (Pixel 7 for phone, Pixel Tablet for tablet). Framing tool: https://developer.android.com/distribute/marketing-tools/device-art-generator
- **Play Store promo video** — 30 s YouTube link, added in Store listing
- **Deep links** — if you want `https://ironrabbitapps.com/...` links to open the native app, add an `assetlinks.json` file to your marketing site + `<intent-filter>` in `AndroidManifest.xml`
- **In-app updates** — install `@capacitor-community/in-app-review` if you want a review prompt after a positive user action

Good luck with the launch!
