# Iron Rabbit — Test Credentials

The app is fully offline-first (IndexedDB). No login accounts exist.

## App-lock PINs (local device only)
- Main PIN: `1234`
- Panic PIN: `7777`

These are set only when the user opens Settings → Security and enables the PIN lock. In a fresh browser context there is no lock — the app opens straight to the notes list.

## Admin token (Community Dashboard)
- URL: `/admin/community`
- Token: `irr-admin-8f3a2b91c4d7e6f5`

Set in `/app/backend/.env` as `ADMIN_TOKEN`. Required to review, promote, or reject submitted community tips via the admin endpoints:
- `GET /api/community/tips` (list, header `X-Admin-Token`)
- `POST /api/community/tips/{id}/promote`
- `POST /api/community/tips/{id}/reject`
- `DELETE /api/community/tips/{id}`
- `POST /api/admin/verify` (used by the AdminGate UI)
- `POST /api/community/tips/parse` — public LLM parser for "Import from Text" (Emergent LLM key)
- `POST /api/community/digest/send` — admin-only Resend email dispatch. Currently returns `{ok:false, reason:"RESEND_API_KEY not configured on server"}` until the user provides a Resend API key. Supports `?dry_run=1` to preview without sending.

## Resend (pending user)
- `RESEND_API_KEY` — empty in .env; user to provide (starts with `re_...`)
- `SENDER_EMAIL=digest@ironrabbitapps.com` (requires DNS records on ironrabbitapps.com — user acknowledged)
- `ADMIN_DIGEST_EMAIL=help@ironrabbitapps.com`

