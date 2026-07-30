# Iron Rabbit Roadmap

_Last updated: 2026-02-08 (session 12)_

## Restaurants Galore Backlog

### P2 — Feature depth (remaining)
- [ ] Recipe photo attachment per **step** (not just per recipe).
- [ ] Attach photo → also link to Review (data model already supports it via `review_id`; needs discoverability in Review editor).
- [ ] Voice journal transcript polish — auto-detect language.
- [x] Smart Assistant conversation persistence across sessions. ✅ session 6
- [x] Smart Assistant chat cost estimate badge. ✅ session 9
- [ ] History-truncation hint in Smart Assistant when >20 turns are hit.
- [x] Assistant Recipe Ideas — personalized dish suggestions saved straight into Recipes. ✅ session 8
- [x] Recipe rating (1-5 stars) fed into future Recipe Idea prompts. ✅ session 9
- [x] Cook Mode — step-by-step view with a per-step timer. ✅ session 9
- [x] Cook Timer — wall-clock accuracy + loud repeating alarm + browser notification. ✅ session 10
- [x] Cook Mode — Screen Wake Lock so phone stays unlocked between steps. ✅ session 11
- [x] Persistent Cook Session — resume mid-recipe after closing the app. ✅ session 12
- [x] Post-Cook Recipe Notes — prompt user for tweaks after finishing. ✅ session 12
- [x] Shopping List — aggregate recipe ingredients into a checkable dedup'd list. ✅ session 9
- [x] Grocery Aisle Grouping — auto-group shopping list by aisle. ✅ session 10
- [x] Aisle Overrides — manually reassign an item to a different aisle. ✅ session 11
- [ ] Refactor CookModeModal (~370 lines) into its own file (RestaurantWorkspacesP6.jsx is now ~1140 lines).

### P2 — Cloud sync polish
- [x] WebDAV: auto-schedule (weekly / monthly push). ✅ session 6
- [x] Google Drive: auto-schedule (skipped silently — needs interactive OAuth). ✅ session 6
- [x] "Show last-synced-at" indicator on Backup tile. ✅ session 7
- [x] Live sync-refresh — chip updates the moment a backup completes. ✅ session 8
- [x] Pull conflict guard — warn when a Pull would overwrite items edited more recently locally. ✅ session 8
- [x] Backup diff drill-down — expand a collection row to see the individual item names. ✅ session 8
- [x] Encrypted backups (client-side AES-GCM with a passphrase). ✅ session 6
- [x] Backup diff report — after a Pull, show what will change before committing Merge/Replace. ✅ session 7
- [x] Bump PBKDF2 to 600k iterations (OWASP 2023 SHA-256 guidance). ✅ session 7
- [x] Add `version` field to encrypted envelope for future format bumps. ✅ session 7

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
