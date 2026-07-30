# Iron Rabbit Roadmap

_Last updated: 2026-02-08 (session 2)_

## Restaurants Galore Backlog

### P2 — Feature depth
- [ ] History-truncation hint in Smart Assistant when >20 turns are hit.
- [ ] Recipe photo attachment (per recipe step, offline).
- [ ] Family calendar integration — surface birthdays into the main Iron Rabbit calendar automatically.
- [ ] "Cook this again" quick-log inside Recipes.
- [ ] Attach photo → also link to Review (already partially supported by data model).

### P2 — Phase 5+ enhancements
- [ ] Glass workspace theme (frosted-blur backdrop) as an opt-in preference.
- [ ] Deep a11y sweep: focus rings on all launcher tiles, ARIA labels on star widgets, screen-reader tests.
- [ ] Backup schedule / auto-remind ("It's been 30 days since your last backup").
- [ ] Sync backup to cloud (opt-in) — Google Drive or WebDAV.
- [ ] Coupon photo attach — snap the physical coupon.
- [ ] Delivery driver phone quick-dial.

### P2 — Rest of Iron Rabbit
- Deep-link URL routing to a specific Restaurants Galore workspace (`/restaurants/menus`).
- Native Android app: expose Restaurants Galore as a home-screen widget.
- Multi-device conflict resolution when backup imported into a live store.
- Save tour_completed to localStorage synchronously on first Skip, so re-entrant modal opens can't re-trigger the tour in the same session.

## Deployment Backlog
- [ ] SiteGround: verify Restaurants Galore data survives PWA reinstall.
- [ ] Update `DEPLOY_TO_SITEGROUND.md` with Phase 2–6 asset size expectations.
- [ ] Add a new pre-flight check: max IndexedDB size warning if user has 200+ photos.

## Refactoring backlog
- `NotesApp.jsx` still ~1,450 lines. Extract restaurant state hooks into `useRestaurantsGaloreState()` hook.
- Move `AppModals.jsx` mount block for Restaurants Galore into its own `<RestaurantsGaloreModals />` component.
- Move phase-3/4/5/6 workspace files into `/notes/rg/` to match phase-2 structure.
