# Iron Rabbit — iOS Build & Submit Guide

_Everything below assumes the iOS project has already been prepared by
Emergent (which it has — see `frontend/ios/App/App.xcworkspace`). This
guide only covers the steps that genuinely require you at a Mac._

---

## Prerequisites (one-time)

1. **A Mac** running macOS 14.0 (Sonoma) or newer.
2. **Xcode 15.3+** from the Mac App Store (free, ~10 GB).
3. **Apple Developer Program membership** — $99/year at
   [developer.apple.com/enroll](https://developer.apple.com/enroll/).
4. Your **Apple ID** signed into Xcode (Xcode → Settings → Accounts).

---

## 1. Get the project on your Mac

    git clone <your-iron-rabbit-repo> ~/iron-rabbit
    cd ~/iron-rabbit/frontend

    # Install web deps + build the web bundle Capacitor will wrap
    yarn install
    yarn build

    # Sync the freshly built web assets into the iOS project
    npx cap sync ios

    # Open Xcode
    npx cap open ios

---

## 2. In Xcode

1. In the left sidebar, click the blue **App** project at the top.
2. Under **Signing & Capabilities**:
   - **Team**: pick your Apple Developer Program team from the dropdown.
   - Leave **Automatically manage signing** checked.
   - **Bundle Identifier** should already read `com.ironrabbit.app`.
3. Under **General → Deployment Info**:
   - iOS minimum target: **14.0** (matches Capacitor 7's default).
   - **iPhone** and **iPad** are both checked (already configured).
4. Under **Targets → App → Info** you should already see all the Iron
   Rabbit permission strings — no edits needed.

---

## 3. Test on your iPhone / iPad

1. Plug your device in via USB.
2. Trust the Mac on first connect.
3. In Xcode, choose your device from the top scheme dropdown (next to
   the ▶︎ button).
4. Hit **⌘R** (Run). Iron Rabbit installs and launches on your device.
5. On the device, go to Settings → General → VPN & Device Management →
   trust your developer certificate (only needed the first time).

---

## 4. Ship to TestFlight

1. In Xcode, choose **Any iOS Device (arm64)** as the destination.
2. **Product → Archive**. Wait ~5 minutes.
3. In the Organizer window that opens: **Distribute App →
   App Store Connect → Upload**.
4. Xcode signs and uploads. ~10 minutes.
5. Sign in to [App Store Connect](https://appstoreconnect.apple.com/).
6. **My Apps → Iron Rabbit → TestFlight** — your build appears once
   Apple finishes processing (~15 min after upload).
7. Add yourself and any beta testers under **Internal Testing**.
8. Testers install via the free **TestFlight** iOS app.

---

## 5. Submit for App Store review

1. In App Store Connect, go to **Iron Rabbit → App Store → + Version**.
2. Fill in listing fields — copy is pre-written in
   `memory/APP_STORE_METADATA.md`.
3. Upload the screenshots you already took at 1920x1080 for Play Store
   plus at least one **iPhone 6.7"** screenshot (App Store requirement).
4. Under **App Privacy**, answer "Yes / No" to each question using the
   pre-written answers in the metadata file.
5. Select the TestFlight build you uploaded.
6. **Submit for Review**. Apple usually replies in 24-48 hours.

---

## When something goes wrong

| Problem | Fix |
| --- | --- |
| Xcode says "Failed to register bundle identifier" | Change the Bundle ID to `com.ironrabbit.app-<yourinitials>` — Apple requires globally unique IDs and someone may have registered ours first. |
| Xcode says "No profiles for ... were found" | Xcode → Settings → Accounts → your Apple ID → Manage Certificates → +. Then Product → Clean Build Folder → run again. |
| App Store Connect rejects icon for "transparent pixels" | Regenerate icons via `npx @capacitor/assets generate --ios` after replacing `assets/icon-only.png` with a fully-opaque source. |
| Web bundle changes aren't showing up | `yarn build && npx cap sync ios` — always run both after any web-side change. |
| App crashes on launch on device | Xcode → Window → Devices and Simulators → your device → View Device Logs. Filter by "Iron Rabbit". |

---

## What Emergent already did (so you don't have to)

- Added the iOS platform (`npx cap add ios`)
- Set Bundle ID to `com.ironrabbit.app`
- Wrote every permission string in `Info.plist`
- Prepared launch splash source (`frontend/assets/splash.png`, 2732×2732)
- Wrote the App Store listing copy in `memory/APP_STORE_METADATA.md`
- Ran a security audit — no personal credentials of yours are anywhere
  in the iOS bundle

## What you need to do before submitting (icon + splash finalize)

The Xcode project currently ships with **Capacitor's default placeholder
icon and splash**. Before submitting to the App Store you MUST replace
these with Iron Rabbit's own artwork. This is a two-command job once you
have your final PNG:

    # 1. Drop your final, opaque, 1024×1024 icon PNG at:
    #    frontend/assets/icon-only.png       (required)
    #    frontend/assets/icon-only-dark.png  (optional — iOS 17 dark tint)
    #
    # 2. Then from `frontend/`, run once:
    cd frontend
    npx @capacitor/assets generate --ios

That single command reads `frontend/assets/` and writes every required
icon and splash size into `frontend/ios/App/App/Assets.xcassets/`. Commit
the result and re-open Xcode; no manual resizing.

Reminder: iOS rejects icons with alpha channels or transparent pixels
anywhere. The source PNG must be a **fully opaque** 1024×1024 image.
