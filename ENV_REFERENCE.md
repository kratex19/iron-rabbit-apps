# Iron Rabbit — Environment Variable Reference

Single source of truth for every environment variable used by the backend and scheduler in **Launch Mode**. On a fresh clone, copy the relevant keys into `/app/backend/.env` and (for the frontend) `/app/frontend/.env`.

> ⚠️ Never commit real secrets. Protected keys (`MONGO_URL`, `DB_NAME`, `REACT_APP_BACKEND_URL`) are pre-configured in the Emergent pod environment — do not overwrite them.

---

## 1. Core Backend (required — pre-provisioned)

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `MONGO_URL` | MongoDB connection string used by every route. | `mongodb://localhost:27017` | ✅ |
| `DB_NAME` | Mongo database name for all Iron Rabbit collections. | `iron_rabbit` | ✅ |
| `CORS_ORIGINS` | Comma-separated allowed origins for FastAPI CORS. | `*` | ✅ |

**Used in:** `backend/server.py`, every route under `backend/routes/`.

---

## 2. Frontend (required — pre-provisioned)

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `REACT_APP_BACKEND_URL` | Public HTTPS base URL the React app calls (`${URL}/api/...`). | `https://iron-rabbit.preview.emergentagent.com` | ✅ |

**Used in:** `frontend/src/**/*.jsx` (all `fetch` / `axios` calls).

---

## 3. Admin & Authentication

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `ADMIN_TOKEN` | Bearer token required by every `/api/admin/*` endpoint. | `super-secret-admin-token` | ✅ |
| `ADMIN_DIGEST_EMAIL` | Recipient of the Weekly Health Digest email. | `founder@ironrabbit.app` | ✅ (for digest) |

**Used in:** `backend/deps.py` (`require_admin`), `backend/routes/digest.py`.

---

## 4. Emergent LLM (Tip Parsing / OCR)

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `EMERGENT_LLM_KEY` | Universal Emergent LLM key for Claude/GPT/Gemini calls used by the paste-tip parser. | `sk-emergent-xxxxxxxx` | ✅ (for tip parsing) |

**Used in:** `backend/routes/community.py` (paste-tips ingestion), any LLM-parsing utilities.

---

## 5. Resend (Transactional Email)

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `RESEND_API_KEY` | API key for [Resend](https://resend.com) — sends magic-link recovery, thank-you promo, and weekly digest emails. | `re_xxxxxxxxxxxx` | ✅ (for emails) |
| `SENDER_EMAIL` | Verified "From" address in your Resend domain. | `hello@ironrabbit.app` | ✅ (for emails) |
| `PUBLIC_APP_URL` | Base URL embedded in deep-links (magic recovery, thank-you promoted tips, Wall highlights). | `https://ironrabbit.app` | ✅ (for emails) |

**Used in:** `backend/routes/community.py` (magic links, thank-you promos), `backend/routes/digest.py`.

---

## 6. Slack (Drop-Alert Ping + Interactivity)

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `SLACK_WEBHOOK_URL` | Incoming webhook that receives Recovery Funnel drop alerts. | `https://hooks.slack.com/services/T.../B.../xxx` | Optional |
| `SLACK_SIGNING_SECRET` | Verifies signed payloads from Slack's Interactivity API (Reply-to-Ack). | `abcd1234deadbeef...` | Optional |

**Used in:** `backend/routes/analytics.py` (drop detection + Slack interactivity).
**Setup guide:** see `/app/SLACK_SETUP.md`.

If either is unset, Slack pings gracefully no-op and interactivity endpoints return 503.

---

## 7. Recovery Funnel Auto-Dismiss

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `AUTO_DISMISS_SHARE_THRESHOLD` | Recovery share (0–1) that triggers auto-clearing of an active drop alert once the funnel bounces back. Higher = stricter. | `0.35` | Optional (default `0.35`) |

**Used in:** `backend/routes/analytics.py` (auto-dismiss on recovery). Surfaced to admins via the Audit Trail view.

---

## 8. Automation / Cron Toggles

| Variable | Purpose | Example | Required |
|---|---|---|---|
| `SCREENSHOT_CRON_ENABLED` | `"true"` to enable the weekly Playwright screenshot regen job (Play Store carousel). | `true` | Optional (default off) |

**Used in:** `backend/server.py` (APScheduler bootstrap), `scripts/regen_play_gallery.py`.

---

## Quick-start `.env` skeleton (backend)

```env
# Core (pre-provisioned — do not change)
MONGO_URL=mongodb://localhost:27017
DB_NAME=iron_rabbit
CORS_ORIGINS=*

# Admin
ADMIN_TOKEN=change-me
ADMIN_DIGEST_EMAIL=founder@ironrabbit.app

# LLM
EMERGENT_LLM_KEY=

# Email (Resend)
RESEND_API_KEY=
SENDER_EMAIL=hello@ironrabbit.app
PUBLIC_APP_URL=https://ironrabbit.app

# Slack (optional)
SLACK_WEBHOOK_URL=
SLACK_SIGNING_SECRET=

# Recovery auto-dismiss
AUTO_DISMISS_SHARE_THRESHOLD=0.35

# Cron
SCREENSHOT_CRON_ENABLED=false
```

---

## Related docs
- `/app/SLACK_SETUP.md` — Slack webhook + interactivity setup
- `/app/GOOGLE_DRIVE_SETUP.md` — Drive sync (blocked; awaiting OAuth Client ID)
- `/app/CAPACITOR_SETUP.md` — Android wrapper build steps
- `/app/GOOGLE_PLAY_LAUNCH.md` — Play Store submission checklist
