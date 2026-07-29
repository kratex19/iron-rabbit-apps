# Iron Rabbit Changelog

## 2026-02-08 — Restaurants Galore Phases 2–5 Complete ✅

### Phase 2 (fully wired + validated)
- **Menus** (`RestaurantMenusModal`) — CRUD with 30-day price sparkline via recharts, per-restaurant filter, categories, tags.
- **Favorite Meals** (`RestaurantMealsModal`) — Signature order per restaurant with custom requests, sauces, sides, dessert, drink.
- **Order History** (`RestaurantOrdersModal`) — Line items, tax, tip presets (15/18/20/25%) + custom, split-bill calculator (N-way with per-person total).
- **Spending Center** (`RestaurantSpendingModal`) — Recharts monthly bar chart + top-restaurants ranking.
- **Coupons** (`RestaurantCouponsModal`) — Codes with expiration alerts (expired / <7d / <30d), used toggle.

### Phase 3 (new file: `RestaurantWorkspacesP3.jsx`)
- **Reviews** — 11-metric 5-star rating (food, service, cleanliness, atmosphere, noise, portions, parking, value, packaging, accuracy, overall) + free-text comment.
- **Delivery Tracker** — driver name, times, minutes, food temp (hot/warm/cold), packaging + accuracy + driver rating, aggregate avg-time and avg-rating cards.
- **Favorite Staff** — per-restaurant server/bartender/host directory with role, phone, email, birthday, favorite flag.
- **Wish List** — restaurants to try with priority (Must try / High / Someday), cuisine, location, visited toggle.
- **Photos** — offline photo gallery with client-side resize to ≤1200px @ 85% JPEG, per-restaurant grid, full-screen preview.

### Phase 4 (new file: `RestaurantWorkspacesP4.jsx`)
- **Voice Journal** — browser SpeechRecognition (Web Speech API) with interim/final transcripts, per-restaurant tagging.
- **Search All** — cross-store fuzzy search over restaurants, menus, favorite meals, orders, reviews, coupons, staff, wishlist, voice entries.
- **Beverage Center / Dessert Center** — category-filtered menu views with per-restaurant grouping and stats (count/avg/min/max).
- **AI Insights** — opt-in POST to `/api/dining_insights` (Claude Sonnet via Emergent LLM key) returns 3-5 concise bullet insights.

### Phase 5 (new file: `RestaurantWorkspacesP5.jsx`)
- **Backup & Restore** — one-click export of ALL Restaurants Galore data to timestamped JSON, preview + Merge or Replace on import.
- **Maps Picker** — Google Maps / Waze / Apple Maps chooser sheet, wired into Directory rows (button "Directions" replaces the old plain Maps link).

### Storage layer
- Extended `restaurantsService.js` with 8 new stores: `staff`, `wishlist`, `photos`, `voice_journal` (plus existing `restaurants`, `menus`, `favorite_meals`, `orders`, `reviews`, `deliveries`, `coupons`).
- Added `importAll(data, mode)` with 'merge' and 'replace' modes; extended `exportAll()` and cascade delete accordingly.

### Backend
- New endpoint `POST /api/dining_insights` — accepts a stats JSON payload + optional question, returns formatted insights via Claude Sonnet 4.6. Nothing persisted server-side.

### Dashboard
- All 19 launcher tiles are now enabled (18 previously disabled "Coming soon"). New tile: **Backup**.
- Every workspace opens with a 150 ms transition from the Dashboard for smooth stacking.

### Regressions fixed (iteration_30 report)
- CouponsModal: `selectedR is not defined` ReferenceError removed.
- DeliveryEditor: `restaurant_id` now pre-seeded via `defaultRestaurantId` prop.
- CouponEditor: same pre-seed pattern applied.

### Testing
- `iteration_29.json` — Phase 5 + regression retest: PASS on all critical/high items; 3 minor bugs found.
- `iteration_30.json` — Regression retest for the 3 bugs: **100% PASS**.

## Prior sessions
See `PRD.md` for original problem statement, personas, and pre-2026-02 history.
