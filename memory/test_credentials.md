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

