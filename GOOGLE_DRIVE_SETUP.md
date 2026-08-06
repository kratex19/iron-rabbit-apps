# Google Drive Sync — Setup Checklist

**Status:** Foundation ready, awaiting your Google Cloud credentials before wiring in.

This document exists because Google Drive sync requires **you** (the account owner) to complete a one-time Google Cloud Console setup that we can't automate. Once you have the four values below, come back and paste them — the client code is a small addition on top of the Local Auto-Backup that already ships in v1.0.

---

## What we already have (Local Auto-Backup — option B)

- ✅ Weekly silent export to Downloads folder — no account, no cloud, no touching a file
- ✅ Opt-in via Settings → "Automatic weekly backup"
- ✅ Uses existing `StorageService.exportAllData()` — same file format as manual export
- ✅ Timestamp stamped in `app_settings.last_auto_backup_at` — never runs twice in the same week
- ✅ Silent failure on error — no cold-boot error toasts

For most users, this is sufficient. Google Drive is the **upgrade path** for users who want cross-device sync.

---

## What you need to gather (30–60 min, one-time)

### 1. Create a Google Cloud project
- Go to https://console.cloud.google.com
- New Project → name `Iron Rabbit Drive Sync`
- Note the **Project ID** (auto-generated, e.g. `iron-rabbit-drive-482619`)

### 2. Enable the Drive API
- APIs & Services → **Library**
- Search "Google Drive API" → **Enable**

### 3. Configure the OAuth consent screen
- APIs & Services → **OAuth consent screen**
- User type: **External** (Publishing status will start as "Testing" — that's fine for the first 100 users)
- App name: `Iron Rabbit`
- User support email: your email
- Developer contact: your email
- **Scopes** → Add:
  - `https://www.googleapis.com/auth/drive.appdata` — the recommended minimal scope. Users see "See, edit, create, and delete only the specific Google Drive files you use with this app."
- Test users → add your own Gmail so you can test before Google verifies

### 4. Create OAuth 2.0 Client ID
- APIs & Services → **Credentials** → **Create Credentials** → **OAuth client ID**
- Application type: **Web application**
- Name: `Iron Rabbit Web`
- **Authorized JavaScript origins:**
  - `https://ironrabbitapps.com` (production)
  - `http://localhost:3000` (local dev, optional)
  - `https://your-preview-url.preview.emergentagent.com` (Emergent preview)
- **Authorized redirect URIs:**
  - `https://ironrabbitapps.com/auth/drive/callback`
  - Same three variants for localhost/preview if you want to test outside prod
- Click **Create**
- **Copy the Client ID** (looks like `1234-xxx.apps.googleusercontent.com`)

### 5. (Only when you're ready to ship publicly) Google Verification
- To take the app out of "Testing" and let unlimited real users connect, submit the OAuth consent screen for review.
- With scope `drive.appdata` this is a **light review** (~3–5 business days). Full Drive scope needs a security assessment ($5–15k, months) — so we're deliberately avoiding it.

---

## What to bring back to us next session

Paste these into chat and we'll wire the sync UI + upload/list/download flow:

```
GOOGLE_DRIVE_CLIENT_ID = <the Client ID from step 4>
GOOGLE_DRIVE_PROJECT_ID = <the Project ID from step 1>
```

That's it — no client secret needed because we'll use the Google Identity Services JS SDK's implicit token flow (no backend required for a pure client-side PWA/Capacitor app using `drive.appdata`).

---

## Client-side flow we'll build (preview)

Once you provide the Client ID, the wiring is roughly:

1. Load `https://accounts.google.com/gsi/client` in `index.html`
2. Add `SettingsModal` → **Connect Google Drive** button
3. On tap: `google.accounts.oauth2.initTokenClient({ client_id, scope: "drive.appdata" })` → user picks Google account → we get a short-lived access token
4. Use token to `PATCH /upload/drive/v3/files?uploadType=multipart` with the JSON backup blob into the app data folder
5. Weekly auto-backup uses the token if present, else falls back to Downloads folder (already shipped)
6. `Restore from Drive` lists files in `spaces=appDataFolder`, user picks one, we download + hand it to the existing Restore Preview flow

Total additional code: ~200 lines. All client-side.

---

## Play Console updates needed at ship time

**Data safety form:**
- Data types collected: **App activity → Other actions** (backup file contents)
- Purpose: **App functionality** (sync across devices)
- Optional/required: **Optional** (user must tap Connect)
- Encrypted in transit: **Yes** (HTTPS via Google API)
- Users can request deletion: **Yes** (Disconnect button clears the token; user can also revoke at myaccount.google.com/permissions)

---

## Why not skip Drive entirely?

Local Auto-Backup handles the 80% case. Drive is worth adding for:
- **Multi-device users** — phone + tablet with the same data
- **Phone-loss recovery** — cheaper insurance than the phone's own backup
- **Family sharing** — one Drive account across parent + kid devices

If none of those apply to your users, you can skip this and just ship v1.0 as-is.
