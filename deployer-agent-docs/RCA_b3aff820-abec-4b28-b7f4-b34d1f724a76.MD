# RCA — Iron Rabbit Production "stale UI despite v79 service-worker" (app.ironrabbitapps.com)

**Deployment:** color-task-timer  |  **Active run:** b3aff820-abec-4b28-b7f4-b34d1f724a76 (redeploy, success, completed 2026-08-28T16:55:25Z)
**frontend_type:** cloudflare  |  **template:** fastapi_react_mongo_shadcn_base_image

## VERDICT: (a) — All origin/edge bundles definitively match v79. The stale UI is NOT at the edge, R2, KV, or build layer. It is a CLIENT-SIDE service-worker lifecycle problem.

I have **no Cloudflare tooling** (cannot read KV/R2/route bindings, cannot purge CF cache). Everything below was proven by fetching the live origin over HTTP (`cache: no-store`) and grepping the *actual served* bytes, plus inspecting the deployed source for the active run.

## Evidence (all fetched live from the serving origin)

1. **service-worker.js** (edge): `CACHE_NAME='iron-rabbit-v79'`, `RUNTIME='iron-rabbit-runtime-v34'`. Its own logic: **network-first for HTML**, cache-first for hashed static, precaches `/`, `/index.html`, `/manifest.json`.
2. **asset-manifest.json** (edge): `main.js → /static/js/main.e8834059.js`, `main.css → /static/css/main.12f8435e.css`.
3. **index.html** (edge, no-store): references **exactly** `/static/js/main.e8834059.js` + `/static/css/main.12f8435e.css` — identical to asset-manifest. No stale/older hash references.
4. **Served bundle grep (definitive):**
   - `GET /static/css/main.12f8435e.css` → 200, 184228 bytes → contains `ir-header-glass-strip` = **True**, `--ir-tile-min` = **True**
   - `GET /static/js/main.e8834059.js` → 200, 3572216 bytes → contains `header-icon-row` = **True**
5. **Deployed source (eph pod, pulled source for the active run)** contains all three markers: `src/index.css` (`--ir-tile-min`, `.ir-header-glass-strip`), `src/notes/AppHeader.jsx` (`data-testid="header-icon-row"`), and `public/service-worker.js` = v79. Build input was correct.

## Why the earlier checks were consistent with each other but still saw "old UI"
- On this platform a Cloudflare frontend serves **everything** (`service-worker.js`, `index.html`, `asset-manifest.json`, `/static/*`) from a **single R2 prefix** `DEPLOYMENT_NAME/TAG/build/` selected by **one** KV version pointer. There is no mechanism to serve the SW from one build and `/static/*` from another. Because the SW, the manifest, and the index.html hashes are all mutually consistent and v79, **the pointer and R2 are healthy and fully promoted.** Split-brain (items 3 & 4 of the request) is ruled out.
- The user verifying `service-worker.js` shows v79 at the URL proves the **file on the server** is v79. It does **not** prove which SW is **controlling their already-open page**. Those are different things.

## True root cause: stale controlling service worker on already-installed clients
The device is still being driven by a **previously-installed SW** whose precache (in an older `CACHE_NAME`, e.g. `iron-rabbit-v74`) holds the old `/` / `index.html` shell that references old bundle hashes. The v79 SW file exists on the server, but the browser has not activated it for that client yet (SW script-update check throttled/not triggered for a long-lived standalone PWA, or the previously-controlling SW predates the "network-first for HTML" logic and is serving the shell cache-first). Fetching the raw SW URL does not force the controlling SW to update.

This is why network-first-for-HTML in the *current* file doesn't help the affected users: that logic only runs once the v79 SW actually takes control.

## What is NOT the problem (explicitly)
- index.html is NOT referring to older bundle hashes (proven identical to asset-manifest).
- `/static/*` bundles are NOT stale — they contain the v79 markers.
- No KV/R2 partial-migration or split-brain.
- Nothing to purge at the edge, and no CF cache is masking it (the origin fetch returned no CF cache-hit headers on these paths). A Cloudflare purge would change nothing here — and is outside my toolset anyway.

## Remediation (in scope — no DNS / no custom-hostname / no CF-user changes)

**Immediate proof / per-device unblock (user, in a real browser):**
- DevTools → Application → Service Workers → **Unregister**, then hard reload; or Application → Storage → **Clear site data**; or toggle "Update on reload". After this the page will render v79 (origin is already v79). This confirms the diagnosis.

**Durable codebase fix (E1 — so existing installs self-heal without manual clearing):**
1. In the SW registration code (where `navigator.serviceWorker.register('/service-worker.js')` is called), add an explicit update + activation-prompt flow: call `registration.update()` on each load; listen for `updatefound` → new worker `statechange` to `installed` (with an existing controller) → post `{type:'SKIP_WAITING'}` to it and, on `controllerchange`, `window.location.reload()`. In the SW, handle that message with `self.skipWaiting()`. This forces waiting v79 workers to take over.
2. Bump **`RUNTIME`** alongside `CACHE_NAME` every release (currently pinned at `iron-rabbit-runtime-v34` while CACHE_NAME moved to v79). Because `activate` only deletes caches not in `[CACHE_NAME, RUNTIME]`, an unversioned RUNTIME is never purged; version it so the runtime cache is cleared on each activation.
3. Consider dropping `/` and `/index.html` from `PRECACHE_URLS` (or revalidating them on activate) so the app shell is never pinned to a build in the precache.
4. Ensure `service-worker.js` is served with `Cache-Control: no-cache` (it already appears fresh) so browsers re-check the script promptly.

## Answer to the requested (a)/(b)/(c)
**(a)** — All bundles match v79 at the origin; the asset layer is correct. Keep looking **client-side**: the stale render is a previously-installed service worker still controlling the page, not an edge/build artifact. Apply the SW update-prompt + RUNTIME-versioning fix above to make existing installs self-heal; have the affected user unregister the SW / clear site data to confirm immediately.
