# Iron Rabbit — Play Submission Day-Of Walkthrough

A tight, one-page playbook for going from *repo → live on Google Play* in a single afternoon on your Mac.
Everything referenced here is already generated inside this repo. For deep detail, see [`GOOGLE_PLAY_LAUNCH.md`](./GOOGLE_PLAY_LAUNCH.md).

**Total time estimate:** ~90 minutes hands-on + 1–7 days Google review.

---

## Pre-flight (5 min)

1. Update the repo on your Mac: `git pull` (or "Save to GitHub" from the platform, then clone locally).
2. Open **Terminal** in `frontend/`.
3. Confirm you have:
   - Node 20+ (`node -v`)
   - Yarn (`yarn -v`)
   - Android Studio Hedgehog+ (open once so Gradle warms up)
   - A phone or emulator to smoke-test on

---

## Step 1 — Host the Privacy Policy (5 min)

Google will not approve without a **public URL**.

**Fastest path:** commit `PRIVACY.md` to a public GitHub repo and use the "View raw" URL.
**Prettier path:** paste the markdown into a page at `https://ironrabbitapps.com/privacy`.

Copy the final URL — you'll paste it into Play Console → *Store listing → Privacy policy*.

---

## Step 2 — Build the web assets (3 min)

```bash
cd frontend
yarn install
yarn build
```

Expected: `frontend/build/` populated with the offline-first PWA bundle.

---

## Step 3 — Add + sync Android (5 min, first time only)

```bash
npx cap add android      # only the first time
npx cap sync
```

This creates `frontend/android/` and drops the built `build/` into `android/app/src/main/assets/public/`.

---

## Step 4 — Wire the launcher icon & splash (10 min, Android Studio)

Open `frontend/android` in Android Studio.

**Adaptive icon:**
1. Right-click `res` → **New → Image Asset → Launcher Icons (Adaptive & Legacy)**
2. Foreground: `frontend/public/icon-foreground-432.png`
3. Background: `frontend/public/icon-background-432.png`
4. Finish → Studio generates every density.

**Splash screen:**
1. Right-click `res` → **New → Image Asset → Splash Screen**
2. Point at `frontend/public/splash-2048.png`
3. Background hex: `#020617`

Verify `AndroidManifest.xml` has these lines inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

## Step 5 — Bump native version & sign (10 min)

Edit `android/app/build.gradle`:
```groovy
defaultConfig {
    applicationId "com.ironrabbitapps.notes"
    minSdkVersion 24
    targetSdkVersion 34
    versionCode 1
    versionName "1.0.0"
}
```

**Generate signing key (once, ever):**
```bash
keytool -genkey -v -keystore iron-rabbit-upload.jks \
    -alias iron-rabbit -keyalg RSA -keysize 2048 -validity 10000
```

⚠️ Back up the `.jks` file AND the passwords in 1Password/Bitwarden. Losing them = permanently locked out of publishing updates.

Add release signing block from [`GOOGLE_PLAY_LAUNCH.md` §7](./GOOGLE_PLAY_LAUNCH.md#7-generate-a-signing-key-and-sign-the-aab).

Build the release bundle:
```bash
export IR_KEYSTORE_PASS=...
export IR_KEY_PASS=...
cd android && ./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

---

## Step 6 — Smoke-test the release build on a real device (10 min)

```bash
./gradlew installRelease
```

**Test checklist:**
- [ ] Launcher shows the rabbit icon (not a default square)
- [ ] Splash: `#020617` background → rabbit → app in ~2s
- [ ] Home loads, Quick Guide `?` button pulses (first-launch nudge)
- [ ] Create a note, add attachment, close app, reopen → data persists
- [ ] Pantry → barcode scan asks for camera permission → works
- [ ] Settings → Backup → export → clear → import → all data restored
- [ ] Airplane mode → everything except barcode lookup still works
- [ ] Pin a custom background color, close app, reopen → pin still there

If anything fails: fix locally, re-run steps 2 → 5 → 6.

---

## Step 7 — Google Play Console (30 min, first time)

Go to https://play.google.com/console (one-time $25 developer registration if you haven't already).

### Create app
- **App name:** `Iron Rabbit`
- **Default language:** English (United States)
- **App or Game:** App
- **Free or paid:** Free
- Accept declarations → **Create**

### Store listing
- **Short description (80 chars):**
  `Offline notes, chores, meal plan, pantry & shopping — all on your device.`
- **Full description:** Paste from `PLAY_STORE_LISTING.md`.
- **App icon:** upload `frontend/public/icon-512.png`
- **Feature graphic:** upload `frontend/public/feature-graphic-1024x500.png`
- **Phone screenshots (min 2, max 8):** upload all 8 from `frontend/public/screenshots/`
- **App category:** Productivity
- **Tags:** notes, offline, reminders, chores, family

### App content (mandatory forms)
1. **Privacy policy** → paste your public URL from Step 1
2. **App access** → "All functionality available without special access"
3. **Ads** → "No, my app does not contain ads"
4. **Content rating** → run the IARC questionnaire (expect **Everyone**)
5. **Target audience** → 13+ (safest given Kid Mode isn't a directed-to-children product)
6. **Data safety form:**
   - Data collected: **None**
   - Data shared: **None**
   - Encryption in transit: **Yes** (HTTPS to Open Food Facts only)
   - Data deletion: **Yes** — via Settings → Data & Reset
7. **News app / Government / Financial features:** No / No / No
8. **Health & fitness:** No
9. **COVID-19 contact tracing:** No

### Release
1. **Production → Create new release**
2. Upload `app-release.aab`
3. Release name: `1.0.0 — Initial Launch`
4. Release notes:
   > Iron Rabbit is here. Offline notes, chores, meal plans, a pantry with barcode scanning, and Kid Mode — all living on your phone. No accounts, no analytics, no data leaving your device.
5. **Save → Review release → Roll out to Production**

---

## Step 8 — Wait & watch (1–7 days)

- Google emails you when review finishes.
- If rejected: they'll cite the exact policy — most common issue is a missing privacy URL or a permission that isn't declared.
- Once approved: the app is live at `https://play.google.com/store/apps/details?id=com.ironrabbitapps.notes`.

---

## Post-launch first-24-hour checklist

- [ ] Download the live app on a fresh device
- [ ] Grab the Play Store URL and pop it into `manifest.json` `related_applications` for the web version
- [ ] Announce on your channels (Twitter, LinkedIn, mailing list)
- [ ] Watch Play Console → **Vitals** for ANRs or crashes (should be 0 for a WebView app)
- [ ] Reply to the first few reviews personally — it moves the algorithm

---

## Troubleshooting quick refs

| Symptom | Fix |
| --- | --- |
| Gradle sync fails on `cap sync` | Delete `android/` and run `npx cap add android` again |
| `bundleRelease` errors on missing signing | Verify `IR_KEYSTORE_PASS` & `IR_KEY_PASS` are exported in the same shell |
| Rabbit icon looks pixelated | Regenerate via `python3 scripts/generate_play_assets.py` |
| Play Store review rejects "Privacy policy not accessible" | Publicly host `PRIVACY.md` and re-paste the URL |
| App boots to blank white | Service worker cache issue — bump `iron-rabbit-v11` in `sw.js` and rebuild |

---

## What's already done (relax about these)

- ✅ Real app icons (adaptive + maskable + 1024 hi-res)
- ✅ Feature graphic (1024×500)
- ✅ 8 store screenshots
- ✅ Splash screen assets
- ✅ Capacitor config (splash, notifications, privacy screen)
- ✅ `PRIVACY.md` and `PLAY_STORE_LISTING.md` copy
- ✅ Quick Guide help system on 10 screens
- ✅ Offline persistence verified end-to-end
- ✅ Backup/Restore verified (including new pinned backgrounds)

Only the Mac-side commands and Play Console clicks remain.
