# Iron Rabbit — Privacy Policy

**Effective date:** February 8, 2026
**App:** Iron Rabbit (Android package: `com.ironrabbitapps.notes`)
**Publisher:** Iron Rabbit Apps

> **The short version:** Iron Rabbit stores everything on your device. We do not have a server that holds your notes, your photos, your voice recordings, your barcodes, your reminders, your PIN, or your account. We cannot see your data. Backups are only shared if *you* export them.

---

## 1. Data we collect on your device (never leaves your device)

The following data is written to **IndexedDB / on-device storage only** and is never transmitted to Iron Rabbit servers or any third party unless you explicitly export it:

| Category | Examples |
| --- | --- |
| Notes & Reminders | Titles, body text, checklists, categories, alarms, colors, drag order |
| Attachments | Photos or documents you attach to notes (stored as blobs in IndexedDB) |
| Voice Notes | Audio you record inside a note (stored on-device only) |
| Chores / Kid Mode | Tasks, completion status, celebration animation preferences |
| Shopping & Pantry | List items, scanned barcodes, product info fetched from Open Food Facts |
| Meal Plan | The weekly meal-plan grid you build |
| Settings | Theme, language, tile visibility, PIN hash (SHA-256 salted — never plain text) |
| Backups | Optional JSON files you generate and save yourself |

**We never see any of the above.** All reads and writes happen in your browser / native WebView.

## 2. Data we do NOT collect

- We do not have an analytics SDK.
- We do not have advertising SDKs.
- We do not have crash reporters that upload logs off your device.
- We do not collect device identifiers (IDFA, GAID, ANDROID_ID).
- We do not collect location.
- We do not collect contacts.
- We do not read your camera roll or gallery.

## 3. Camera & Microphone (opt-in per use)

- **Camera** is used only when *you* tap "Scan barcode" or "Take photo". Frames stay on-device and are processed by Android ML Kit (offline) or the browser's `BarcodeDetector`. Frames are not uploaded.
- **Microphone** is used only when *you* tap "Voice note". Recordings are stored on-device as blobs. They are not uploaded.

You can revoke either permission at any time from your OS settings.

## 4. Third-party services

Iron Rabbit talks to **exactly one** optional third-party service:

- **Open Food Facts** (https://openfoodfacts.org) — a public, non-commercial food-product database.
  - Called only when you scan a barcode inside the Pantry tile.
  - We send the barcode you scanned. We do **not** send any of your personal data, device ID, or IP-based identifier beyond what any HTTPS request naturally contains.
  - See their privacy policy: https://openfoodfacts.org/privacy

If you never open the Pantry barcode scanner, no network call to any third party ever happens.

## 5. Notifications

Iron Rabbit can send you reminders (weekly recap, chore summary, pantry expiry). These are **local notifications** scheduled by the OS on your device. There is no push server. Nothing is sent to Iron Rabbit.

## 6. Backups & Restore

You can export a JSON backup that contains everything above. It stays on your device unless *you* share it. Iron Rabbit never uploads it. If you share the file, you are responsible for what happens to it.

## 7. Children

Iron Rabbit is safe for family use. **Kid Mode** is a UI mode inside the app; it does not create a separate account and it does not send data anywhere. We do not knowingly collect data from anyone.

## 8. Security

- On-device PINs are hashed with **SHA-256 + a per-install salt**. Plain-text PINs are never stored.
- On native builds, secret settings use **iOS Keychain** or **Android EncryptedSharedPreferences** (Keystore-backed).
- Biometric prompts are handled entirely by the OS (BiometricPrompt / LocalAuthentication). Iron Rabbit never sees your fingerprint or face template.
- The app can hide its content in the OS task switcher (Recent Apps) via the Privacy Screen setting.

## 9. Deleting your data

- **In-app:** Settings → Data & Reset → "Delete everything".
- **OS-level:** Uninstall the app — Android/iOS purges the app's storage.
- Because nothing is on our servers, there is nothing for us to delete on our side.

## 10. Changes to this policy

If we ever change what data is collected, we will update this file and the effective date above, and we will ship an in-app notice on the next open.

## 11. Contact

Questions or requests? Email **privacy@ironrabbitapps.com**.

---

*Iron Rabbit is offline-first by design. If any future feature requires a server (for example, optional cross-device sync), we will document exactly what is sent, and it will always be opt-in.*
