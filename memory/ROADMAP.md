# Iron Rabbit Roadmap

_Last updated: 2026-02-08_

## Restaurants Galore Backlog

### P1 — polish / next agent
- [ ] Silence the residual React "unique key prop" warning in `RestaurantDeliveryModal` (non-blocking; observed in iteration_30 after saving).
- [ ] Small helper `openNewWith(defaults)` in workspaces to avoid future copy-paste bugs like the `selectedR` ReferenceError.
- [ ] Split `RestaurantWorkspaces.jsx` (~860 lines) into `RestaurantMenus.jsx`, `RestaurantOrders.jsx`, `RestaurantSpending.jsx`, `RestaurantCoupons.jsx` for maintainability.

### P1 — feature depth
- [ ] Smart Assistant chat panel (multi-turn conversation over dining data, keep sessions in IndexedDB).
- [ ] Recipe Recreation — link a menu item to a saved home-recipe note.
- [ ] Family Dining — guests / dietary restrictions / birthdays view (data already partly exists).
- [ ] Photos: attach a photo to an order or review directly (currently only per-restaurant).
- [ ] Calendar integration — surface staff birthdays + upcoming wish-list "someday" nudges into main Iron Rabbit calendar.

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

## Deployment Backlog
- [ ] SiteGround: verify Restaurants Galore data survives PWA reinstall.
- [ ] Update `DEPLOY_TO_SITEGROUND.md` with Phase 2–5 asset size expectations.
- [ ] Add a new pre-flight check: max IndexedDB size warning if user has 200+ photos.

## Refactoring backlog
- `NotesApp.jsx` still 1,443 lines. Extract restaurant state hooks into `useRestaurantsGaloreState()` hook.
- Move `AppModals.jsx` mount block for Restaurants Galore into its own `<RestaurantsGaloreModals />` component.
