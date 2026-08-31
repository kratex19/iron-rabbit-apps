# Iron Rabbit — Release Guide

> **Baseline preserved: 2026-08-31**
> Android v1.0.0 (version code 1) is live on Google Play Internal Testing.
> This document describes how to safely build future updates.

---

## 1. Project identity (do NOT change these)

| Field | Value | Where it lives |
|---|---|---|
| **Application ID** | `com.ironrabbit.app` | `frontend/capacitor.config.ts`, `frontend/android/app/build.gradle`, `frontend/android/app/src/main/res/values/strings.xml` |
| **App name / launcher label** | `Iron Rabbit` | `capacitor.config.ts`, `strings.xml` |
| **Signing key alias** | `my-key-alias` | `frontend/android/keystore.properties` |
| **Signing certificate SHA-1** | `F7:B3:7B:57:A0:62:5B:D0:3D:10:37:FA:0C:15:04:FC:9A:E6:AE:3B` | Google Play Console → Setup → App integrity |
| **Signing certificate SHA-256** | `E8:CE:EF:85:A0:7A:B5:E7:08:2E:98:42:C7:77:CD:68:FF:B4:6D:4E:14:1F:07:7C:E3:0A:21:6B:9D:62:D5:F5` | (same page) |
| **Web deployment URL** | https://app.ironrabbitapps.com | Emergent production |
| **Play Console app** | Iron Rabbit (draft/internal testing) | https://play.google.com/console |

If any of the above change, the Google Play update pipeline will break. Preserve them exactly.

---

## 2. Current released version — **BASELINE**

| Field | Value |
|---|---|
| **versionName** | `1.0.0` |
| **versionCode** | `1` |
| **Play track** | Internal testing |
| **Release date** | 2026-08-31 |
| **AAB build method** | PWABuilder (TWA / Bubblewrap) → re-signed with the correct upload keystore |

---

## 3. Files you MUST back up externally (never committed to git)

These live inside this Emergent pod and are ignored by `.gitignore`. If the pod is reset, they are gone unless you also have copies elsewhere.

| File | Purpose | Recommended backup locations |
|---|---|---|
| `frontend/android/app/signing.keystore` | Upload key private key — required to sign every future AAB | 1Password (as file attachment), Google Drive (encrypted), iCloud Drive, external SSD, encrypted USB — **at least two of these** |
| `signing-key-info.txt` (from your original PWABuilder ZIP) | Contains the keystore + key passwords | 1Password (as secure note), password manager |

**If you lose `signing.keystore`, you cannot publish Play Store updates under `com.ironrabbit.app`.** Recovery requires filing an "Upload key reset" request with Google (24–48h review). Back it up in more than one place before you close this session.

---

## 4. Release workflow — building a future update

### Prerequisites (one time on your Mac or a Linux x86_64 machine)

1. Install **Node 18+** and **Yarn**
2. Install **Android Studio** (bundles Java 17 + Android SDK)
3. Clone the repo from GitHub (see section 5 below)
4. Restore `signing.keystore` and `keystore.properties` into `frontend/android/app/` and `frontend/android/` respectively — from your external backup (NOT git)

`keystore.properties` should look like this (you fill in the passwords from `signing-key-info.txt`):

```properties
storeFile=signing.keystore
storePassword=<from signing-key-info.txt>
keyAlias=my-key-alias
keyPassword=<from signing-key-info.txt>
```

### Step-by-step update

```bash
# 1. Edit code as needed. Test in the browser first (yarn start / preview URL).

# 2. Bump the version in frontend/android/app/build.gradle
#    - versionCode MUST increase (2, 3, 4, …). Google Play rejects duplicates.
#    - versionName should follow semver: 1.0.1, 1.1.0, etc.

# 3. Build the production web bundle:
cd frontend
yarn install
yarn build

# 4. Sync the bundle into the Android project:
npx cap sync android

# 5. Build & sign the AAB (uses keystore.properties auto-loaded by build.gradle):
cd android
./gradlew bundleRelease

# 6. Locate the AAB:
#    frontend/android/app/build/outputs/bundle/release/app-release.aab

# 7. Verify signature BEFORE upload (should match the SHA-1 above):
keytool -printcert -jarfile app/build/outputs/bundle/release/app-release.aab

# 8. Manually upload the .aab to Google Play Console → Testing → Internal testing
#    → Create new release. Do NOT automate this step.
```

### After first upload from a new machine

Google Play will accept the AAB **only if the SHA-1 fingerprint of `signing.keystore` matches** `F7:B3:7B:57:A0:62:5B:D0:3D:10:37:FA:0C:15:04:FC:9A:E6:AE:3B`. If you see a "wrong upload key" error, your `signing.keystore` is the wrong file — restore from backup.

---

## 5. Recovering the project from GitHub

If you ever need to rebuild the workspace from scratch:

```bash
git clone <your-github-repo-url> iron-rabbit
cd iron-rabbit/frontend
yarn install
# Restore secrets NOT in git:
#   - frontend/android/app/signing.keystore   (from your external backup)
#   - frontend/android/keystore.properties     (recreate — see section 4)
#   - frontend/.env                             (has REACT_APP_BACKEND_URL — copy from Emergent dashboard)
#   - backend/.env                              (has MONGO_URL, DB_NAME — copy from Emergent dashboard)
yarn build
```

Then follow section 4 to build a new AAB.

---

## 6. What is NOT committed (by design)

These are excluded via `.gitignore` and must be restored/regenerated on any fresh clone:

- `frontend/node_modules/` — regenerate with `yarn install`
- `frontend/build/` — regenerate with `yarn build`
- `frontend/android/.gradle/` and `frontend/android/build/` — Gradle regenerates
- `frontend/android/app/signing.keystore` — restore from external backup
- `frontend/android/keystore.properties` — recreate from `signing-key-info.txt`
- `frontend/android/local.properties` — auto-created by Gradle when you first open in Android Studio
- `android-sdk/`, `build-logs/` — pod-local artefacts, not needed elsewhere
- `frontend/public/downloads/` — build outputs, never publish
- `.env` files in `frontend/` and `backend/` — restore from Emergent secrets

---

## 7. Emergency contacts / references

- **Emergent support**: support@emergent.sh
- **Google Play Console**: https://play.google.com/console
- **Play upload-key reset docs**: https://support.google.com/googleplay/android-developer/answer/9842756
- **PWABuilder** (original AAB source): https://www.pwabuilder.com

---

*Last updated 2026-08-31. Preserve this doc; update the version table (section 2) with each Play Store release.*
