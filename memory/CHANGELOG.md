# Iron Rabbit Changelog

## 2026-02-08 (session 2) — P1 Batch Complete ✅

### P1a — Refactor of Phase 2 workspaces
- `RestaurantWorkspaces.jsx` (was 860 lines) is now a thin barrel; per-workspace files live in `/app/frontend/src/notes/rg/`:
  - `_shared.jsx` (Field / RestaurantPicker / css helpers)
  - `RestaurantMenus.jsx` (~200 lines)
  - `RestaurantMeals.jsx` (~140 lines)
  - `RestaurantOrders.jsx` (~300 lines with new attach-photo section)
  - `RestaurantSpending.jsx` (~120 lines)
  - `RestaurantCoupons.jsx` (~150 lines)

### P1b — Data-loss bug fix (silent)
- `restaurantsService.js` — 10 `save*()` methods now put `id: X.id || rid('...')` **AFTER** the spread. Previously `...X` would splat `id: undefined` on top of the freshly-generated id, causing every new record to be stored under the literal key `"undefined"` and overwrite the previous one. Root cause of the mysterious "unique key prop" warnings in DeliveryModal and (potentially) silent data loss for new menu items, orders, reviews, coupons, staff, wishlist, photos, and voice entries.

### P1c — Smart Assistant multi-turn chat
- New modal `RestaurantSmartAssistantModal` in `RestaurantWorkspacesP6.jsx`.
- Persists messages in component state for the session (offline-first spirit).
- Suggests prompts on empty state, shows typing indicator, cites data-driven answers.
- Backend `/api/dining_insights` extended with optional `history: List[{role,text}]` — transcript is replayed to preserve multi-turn context (last 20 turns).
- New launcher tile: **Smart assistant** (previously aliased to AI Insights).

### P1d — Recipe Recreation workspace
- New IndexedDB store `rg_recipes` linked to menu items (or freeform).
- New modal `RestaurantRecipesModal` with ingredients + steps (one per line) + prep time + servings.
- New launcher tile: **Recipes** (`launcher-recipes`).

### P1e — Family Dining workspace
- New IndexedDB store `rg_family` for dining party members.
- Tracks allergies (with red warning), dietary preferences, favorite dishes, nope-list, birthday, kid flag.
- New modal `RestaurantFamilyModal` + `family-editor`.
- New launcher tile: **Family dining** (`launcher-family`).

### P1f — Attach photo to order
- OrderEditor gains a **Photos (N)** section on saved orders.
- File picker → client-side JPEG resize to ≤1200px @ 85% → stored via `savePhoto({ order_id })`.
- Hover reveals per-photo delete button.
- Section is gated to edit-mode only (attach after first save).

### Dashboard
- 21 total launcher tiles (was 19). Smart assistant now points to the chat, AI insights uses the Sparkles icon for one-shot analysis.

### Testing
- `iteration_31.json` — Full P1 batch validation, **100% PASS**. Zero React warnings, zero console errors.

### Small polish (this session)
- Added `data-testid="order-edit-${id}"` and `order-delete-${id}` for automated Order test targeting.
- Removed dead-code hint text (section is gated to edit-mode).

---

## 2026-02-08 (session 1) — Restaurants Galore Phases 2–5 Complete ✅

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
- Extended `restaurantsService.js` with new stores: `staff`, `wishlist`, `photos`, `voice_journal`, `recipes`, `family` (plus existing `restaurants`, `menus`, `favorite_meals`, `orders`, `reviews`, `deliveries`, `coupons`).
- Added `importAll(data, mode)` with 'merge' and 'replace' modes; extended `exportAll()` and cascade delete accordingly.

### Backend
- New endpoint `POST /api/dining_insights` — accepts a stats JSON payload + optional question + optional history, returns formatted insights via Claude Sonnet 4.6. Nothing persisted server-side.

## Prior sessions
See `PRD.md` for original problem statement, personas, and pre-2026-02 history.
