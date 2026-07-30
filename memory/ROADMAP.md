# Iron Rabbit Roadmap

_Last updated: 2026-02-08 (session 6)_

## Restaurants Galore Backlog

### P2 — Feature depth (remaining)
- [ ] Recipe photo attachment per **step** (not just per recipe).
- [ ] Attach photo → also link to Review (data model already supports it via `review_id`; needs discoverability in Review editor).
- [ ] Voice journal transcript polish — auto-detect language.
- [x] Smart Assistant conversation persistence across sessions. ✅ session 6
- [ ] History-truncation hint in Smart Assistant when >20 turns are hit.

### P2 — Cloud sync polish
- [x] WebDAV: auto-schedule (weekly / monthly push). ✅ session 6
- [x] Google Drive: auto-schedule (skipped silently — needs interactive OAuth). ✅ session 6
- [ ] "Show last-synced-at" indicator per destination.
- [ ] Conflict resolution when Pull would overwrite newer local data (currently: preview + Merge/Replace prompt covers this).
- [x] Encrypted backups (client-side AES-GCM with a passphrase). ✅ session 6
- [ ] Backup diff report — after a Pull, show what will change before committing Merge/Replace.
- [ ] Bump PBKDF2 to 600k iterations (OWASP 2023 SHA-256 guidance).
- [ ] Add `version` field to encrypted envelope for future format bumps.

### P2 — Look & feel
- [ ] Sound effects for Cook, Backup, Family sync (opt-in).
- [ ] Anniversary "Year in Review" digest (see previous finish's Potential Improvement).
- [ ] Dashboard mini-stats strip (spend this month, recipes cooked, upcoming birthdays).

### P2 — Rest of Iron Rabbit
- Deep-link URL routing to a specific Restaurants Galore workspace (`/restaurants/menus`).
- Native Android app: expose Restaurants Galore as a home-screen widget.
- Multi-device conflict resolution when backup imported into a live store.
- Save `tour_completed` to localStorage synchronously on first Skip.

## Deployment Backlog
- [ ] SiteGround: verify Restaurants Galore data survives PWA reinstall.
- [ ] Update `DEPLOY_TO_SITEGROUND.md` with the new /rg/ folder structure and Phase 6 asset size.
- [ ] Pre-flight check: max IndexedDB size warning if user has 200+ photos.

## Refactoring backlog
- `NotesApp.jsx` still ~1,460 lines. Extract restaurant state hooks into `useRestaurantsGaloreState()` hook.
- Move `AppModals.jsx` mount block for Restaurants Galore into its own `<RestaurantsGaloreModals />` component.
