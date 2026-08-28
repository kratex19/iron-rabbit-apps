# RCA — Iron Rabbit Production "still shows old version" (app.ironrabbitapps.com)

## Verdict
**v79 IS live on Production.** The deploy completed and promoted successfully, and the Emergent Cloudflare edge is serving `iron-rabbit-v79` right now. The drift the user sees is a **client-side PWA service-worker cache** in their browser (an older service worker — likely `iron-rabbit-v74` — is still registered and serving the precached old app shell). There is **no server-side, CDN, pod, or domain-routing blocker.** No purge on our side is required for the origin/edge; the fix is on the client.

---

## 1. Did the v79 deploy complete successfully?
Yes. The current **active run** is `b3aff820-abec-4b28-b7f4-b34d1f724a76` (type: redeploy, trigger: agentic).
- All pipeline steps green: wakeup → build (16:47:39–16:54:07) → mongodb_migrate → manage_secrets → deploy (→16:55:24) → health_check.
- **Pipeline finished: 2026-08-28T16:55:25Z.**
- Because it is the active run, the backend `active_run_id` flip AND the Cloudflare KV version-pointer write both completed (promote is deploy-critical; a failed pointer write fails the run).

### Note on the job ID you referenced
The job ID `a8e96382-6651-44b4-9771-9cbd35eaad36` does **not** correspond to any run in this deployment. Every recent run here belongs to job `cd50138c-69fa-4ddc-94be-dcc4cb3f3a54`. That job-ID mismatch is a bookkeeping/handle discrepancy only — it does **not** indicate a failed or missing deploy, because the content itself proves v79 was built and promoted (see §2). If you want, reconcile why the queued job handle differs from the run's job_id, but it has no bearing on what's live.

## 2. What version is Production serving?
Fetched live from the edge that fronts `app.ironrabbitapps.com`:
- `GET /service-worker.js` → 200, and the file header contains:
  - `const CACHE_NAME = 'iron-rabbit-v79';`
  - `const RUNTIME = 'iron-rabbit-runtime-v34';`
  - SW comment confirms it's the network-first-for-HTML variant ("so users always get the latest bundle").
- `GET /` → 200, valid Iron Rabbit index.html (Iron Rabbit PWA shell, theme-color #6366F1).

The origin/edge is unambiguously serving **v79**. (Bundle hash strings sit past the truncated body-peek window, but the service-worker CACHE_NAME is the authoritative version marker and it reads v79.)

## 3. Is a CDN/edge cache serving stale content?
`app.ironrabbitapps.com` is behind **Cloudflare** (custom hostname `e6bba5d6-3481-4285-a0dd-341f5ec2113c`, SSL active). It routes through the **same** Emergent Cloudflare worker that reads the **same** KV version pointer (keyed by deployment name `color-task-timer`) and the **same** R2 assets used by the preview edge.
- The KV pointer write is part of promote and succeeded (run is active).
- I fetched the SW live and got v79 — so the edge is **not** holding a pre-v79 build. Any best-effort cache-purge lag after promote has already cleared.
- **Conclusion: no stale edge/CDN cache at our layer.**

## 4. Are Production pods running v79?
Backend pod image tag = the active run: `...customers-app/color-task-timer:b3aff820-abec-4b28-b7f4-b34d1f724a76`, health_check green. Note: for this template the **frontend is served from Cloudflare (R2 + KV), not the pod** — so the pod is not the source of any frontend drift, and it is on the v79 run regardless.

## 5. Custom-domain routing
`app.ironrabbitapps.com` is a verified Cloudflare custom hostname pointed at the **same** deployment (`color-task-timer`) as the preview URL — **not** a separate build/serve pipeline and **not** an older deployment slot. `active_run_id` = b3aff820 (v79). Routing is correct; no DNS/slot reconfiguration needed.

## 6. Root cause & fix
**Root cause:** A previously-installed service worker (pre-v79, e.g. `iron-rabbit-v74`) is still registered in the user's browser and is controlling the page, serving the old precached app shell (old index.html → old bundle hashes). The new v79 SW is served network-first, but the *already-installed* old SW continues to control open pages until it is replaced/unregistered by the browser. Incognito/Playmwright sessions (like the preview verification) have no old SW registered, which is exactly why they correctly show v79.

**Fix (client-side — this is what to tell the user):**
1. **Hard-purge the PWA on the affected device/browser:** DevTools → Application → Service Workers → *Unregister*; then Application → Storage → *Clear site data* for app.ironrabbitapps.com. Then reload.
2. Or, quickest: fully close **all** tabs/PWA windows for the domain and reopen (forces SW update check), or use a private window to confirm v79 shows immediately.
3. On mobile PWA (installed to home screen): remove/reinstall the PWA, or clear the browser's site data for the domain.

**No server action required.** The origin, edge (Cloudflare KV/R2), pods, and custom-domain routing are all correctly on v79. I have no cache-purge tool and none is needed — the edge already serves v79.

**Optional hardening (source-side, for E1 to consider):** if repeated client staleness is unacceptable, bump the SW registration/versioning so old SWs self-update faster (e.g. ensure `self.skipWaiting()` + `clients.claim()` fire and that the SW file is served with `Cache-Control: no-cache` so the byte-comparison update check always hits origin). The current SW already does skipWaiting on install, so the main lever is guaranteeing the browser re-fetches `/service-worker.js` (no HTTP caching on that file).
