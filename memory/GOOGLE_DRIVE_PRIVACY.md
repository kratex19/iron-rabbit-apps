# Iron Rabbit — Google Drive Backup: Privacy & Consent

*Draft one-pager suitable for the in-app consent modal, the Play Store listing,
and the App Privacy Nutrition Label. Written in plain English — no legalese.*

---

## What this feature does

Iron Rabbit is offline-first: every note, chore, reminder, checklist, and
attachment lives in your device's on-device storage (IndexedDB). "Back up to
Google Drive" is an **optional** add-on that lets you copy that same data to
**your own Google Drive** so you can restore it on another device or after a
reinstall.

## What we ask permission for

When you tap "Back up to Google Drive", Google will show a standard consent
screen. We only request **one** scope:

    https://www.googleapis.com/auth/drive.appdata

That scope is Google's most restricted Drive scope. With it, Iron Rabbit can:

* ✅ Create files inside a **hidden app-data folder** that only Iron Rabbit can
     see.
* ✅ Read those files back when you tap "Restore".
* ✅ Delete or overwrite those files when you back up again.

Iron Rabbit **cannot**:

* ❌ See your Docs, Sheets, Slides, photos, or any other Drive files.
* ❌ See folders you or anyone else created in Drive.
* ❌ Share files with anyone.
* ❌ See your Gmail, Contacts, Calendar, or any other Google product.

## What actually gets uploaded

* Your notes (title, body, colors, categories, tags, alarms, recurring
  schedules, checklists, events, completions).
* Your app settings (chosen theme, brightness preferences, tile packs).
* Attachments (images, PDFs) you've added to notes — same items that already
  live in your device storage.
* A small manifest describing the backup (device name, app version,
  timestamp).

## What is **not** uploaded

* Any note or draft marked as **local-only** or in the **Trash**.
* Anything you have not created in Iron Rabbit itself.
* Diagnostic logs, telemetry, or usage analytics — Iron Rabbit does not
  collect or upload any of these.

## Where the data lives

* Inside your own Google Drive, in a hidden folder Google names
  `appDataFolder` — visible only to Iron Rabbit, invisible in the normal
  Drive UI.
* Nothing goes to Iron Rabbit's servers. Our backend never sees your notes,
  your Drive token, or your Google account.

## Who can see the data

* **You** — you can list your Iron Rabbit backup files at any time via
  Google's "Drive Apps" settings and delete them there.
* **Iron Rabbit** running on your signed-in device, using the token Google
  gives it after you consent.
* **Nobody else.** No admin, no employee, no server-side process reads it.

## Turning it off / deleting the backup

You can revoke access three ways, any of which stops all future sync
immediately:

1. In Iron Rabbit → Settings → "Sign out of Google Drive" (also offers a
   one-tap "Delete backup from Drive").
2. In Google Account → **Security → Third-party apps with account access**
   → "Iron Rabbit" → "Remove access".
3. In Drive → **Settings → Manage Apps → Iron Rabbit → Options → Delete
   hidden app data**.

## Data retention

* On Drive: whatever you keep — Iron Rabbit does not enforce a retention
  window. Deleting from Drive (or revoking access) removes it permanently.
* On our servers: **zero**. We store no copy of your notes on any Iron
  Rabbit server, ever.

## Children (COPPA / GDPR-K)

Iron Rabbit is a general-audience productivity app. If you are under 13 (or
under 16 in the EU), do **not** enable Google Drive backup unless a parent or
guardian has approved it and completed Google's own account-linking flow.

## Play Store "Data safety" summary (for our listing)

| Category | Collected? | Shared? | Purpose | Optional? |
| --- | --- | --- | --- | --- |
| Notes / user-created content | Yes (device only) | No | App functionality | — |
| Notes → Google Drive (opt-in) | Only if you enable | No third-party sharing | Cross-device sync | **Yes, off by default** |
| Personal info, contacts, location, health, financial, browsing history | No | No | — | — |
| Diagnostics / crash logs | No | No | — | — |

## App Store (iOS) "Nutrition Label" summary

| Category | Linked to you? | Used for tracking? |
| --- | --- | --- |
| User Content (notes) | Not linked, unless you enable Drive backup — then linked to your Google account **only in your own Drive** | No |
| Identifiers | Not collected | — |
| Everything else | Not collected | — |

## Consent modal copy (draft)

> **Back up to Google Drive?**
>
> Iron Rabbit will sign you in with **your** Google account and save an
> encrypted backup of your notes to a private folder in **your** Drive —
> a folder only Iron Rabbit can see.
>
> - We only ask for the `drive.appdata` scope.
> - Nothing goes to Iron Rabbit's servers.
> - You can turn this off any time in Settings, and delete the backup with
>   one tap.
>
> By continuing you agree to our Privacy Policy and Google's Terms of
> Service.
>
> [ Cancel ]   [ **Sign in with Google** ]

---

## Implementation notes (internal — not user-facing)

* Only request `drive.appdata`. Never `drive` or `drive.file`.
* Use the **PKCE Authorization Code flow**. No Client Secret in the app.
* Store the refresh token in Capacitor Secure Storage on native builds, and
  in `IndexedDB` (encrypted with a device-derived key) on the PWA.
* Never send the access token to Iron Rabbit's backend — all Drive API calls
  originate from the device.
* Log **no** Drive metadata on Iron Rabbit servers; do not include Drive
  file IDs in analytics events.
* Provide an in-app "Delete backup from Drive" button that calls
  `files.list` on the appdata folder + `files.delete` on every result.
* Show the backup manifest (last backup time, size, device name) on the
  Settings screen so users always know what's up there.
