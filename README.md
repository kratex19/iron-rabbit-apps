# Iron Rabbit

Offline-first, privacy-respecting productivity toolkit — notes, tasks, calendar, meal planner, pantry scanner, kid mode, and more. Everything runs on-device via IndexedDB.

- **Live web app**: https://app.ironrabbitapps.com
- **Google Play**: `com.ironrabbit.app` (Internal Testing as of 2026-08-31)
- **Tech stack**: React 19 (Create React App via CRACO), FastAPI backend, MongoDB, Capacitor 7 for Android/iOS packaging, service-worker + IndexedDB (`localforage`) for offline

---

## 1. Repository layout

```
/app
├── backend/                       FastAPI server (/api/*)
├── frontend/                      React app (PWA + Capacitor wrapper)
│   ├── src/                       React source
│   ├── public/                    Static assets, manifest.json, service-worker.js
│   ├── capacitor.config.ts        Capacitor bundle config (appId com.ironrabbit.app)
│   └── android/                   Native Android project (Capacitor-generated)
├── memory/                        Product docs, PRD, changelog, roadmap
├── RELEASE.md                     Google Play release procedure  ← read this before publishing
└── README.md                      You are here
```

Deeper docs:
- `RELEASE.md` — how to build and ship Android updates to Play Store
- `IOS_BUILD.md` — Capacitor iOS packaging for the App Store
- `ANDROID_BUILD.md` — background reference for native Android build
- `memory/PRD.md` — Product requirements
- `memory/CHANGELOG.md` — Release-by-release changes
- `memory/TROUBLESHOOTING.md` — Known issues + fixes

---

## 2. Running locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
yarn install
yarn start
```

Environment variables required (never commit these):
- `frontend/.env` → `REACT_APP_BACKEND_URL`
- `backend/.env` → `MONGO_URL`, `DB_NAME`

---

## 3. Making future edits safely

1. **Never change `com.ironrabbit.app`** — it's the Play Store package identity.
2. **Never delete or replace `frontend/android/app/signing.keystore`** — see `RELEASE.md`.
3. When bumping for a Play release, increment `versionCode` in `frontend/android/app/build.gradle` (integer, must be strictly greater than the last published value).
4. Test on the preview URL before pushing to production.
5. Deploy to web via Emergent's deploy button; deploy to Play via `RELEASE.md` workflow.

---

## 4. Recovering from GitHub

```bash
git clone <your-github-repo-url> iron-rabbit
cd iron-rabbit
```

Then restore the files that are excluded from git (see `RELEASE.md` section 6 for the full list):
- `frontend/android/app/signing.keystore` (from your external backup)
- `frontend/android/keystore.properties` (recreate from `signing-key-info.txt`)
- `frontend/.env` and `backend/.env` (from Emergent secrets)

Follow `RELEASE.md` sections 4 and 5 for full recovery + release procedure.

---

## 5. Current release state (2026-08-31)

| Field | Value |
|---|---|
| Android application ID | `com.ironrabbit.app` |
| Android versionName | `1.0.0` |
| Android versionCode | `1` |
| Play track | Internal Testing |
| Signing certificate SHA-1 | `F7:B3:7B:57:A0:62:5B:D0:3D:10:37:FA:0C:15:04:FC:9A:E6:AE:3B` |

Any change to the top four values needs to be intentional and version-code-incrementing (except the app ID and SHA-1, which are permanent).
