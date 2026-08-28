# Iron Rabbit — Troubleshooting Playbook

This document lists the **first** questions to ask when a user reports the mobile app "looks wrong / corrupted / desktop-like / like an old version." **Always exhaust this list before escalating to deployment, CDN, DNS, Cloudflare, service-worker, or production-build diagnostics.**

Real incident log: on 2026-02-28 a user spent hours convinced Production was serving a stale/broken build. Deployer RCA confirmed v79 was live at the origin, all bundle hashes matched, CSS/JS contained the expected v79 markers. Root cause turned out to be Chrome for Android's **"Desktop site"** setting silently spoofing the viewport. Turning it off fixed everything instantly.

---

## ✅ First-check questions (ask these BEFORE any server-side investigation)

### 1. Is Chrome (or Firefox / Samsung Internet) "Desktop site" mode enabled?

**By far the most common cause of "the app looks corrupted on my phone."**

When Desktop site is on, the browser sends a desktop user-agent and reports a desktop-width viewport (typically ~980 px). Iron Rabbit's responsive architecture then renders the **desktop** layout on a **phone screen** — icons in one row, wider main container, tile grid with 5+ columns — which looks tiny and cramped on a phone. Users perceive this as "broken."

- **How to check on Android Chrome:** ⋮ menu → look for **"Desktop site"**. If it's ticked / highlighted, the site is being viewed as desktop.
- **Fix:** untick "Desktop site" → refresh. Immediately renders the mobile layout.
- **How to check on iOS Safari:** aA icon in the address bar → **"Request Mobile Website"** if it shows Desktop.
- **How to check on Samsung Internet:** ≡ menu → **"Desktop site"** toggle.

### 2. Is a stale service worker controlling the tab?

Fetching `https://app.ironrabbitapps.com/service-worker.js` and seeing `CACHE_NAME = 'iron-rabbit-v??'` only proves the **file** on the server is fresh. It does NOT prove that the SW *controlling their open tab* is up to date. The tab could still be run by an older registered SW.

- **Fastest test:** open the URL in an **incognito / private window** and hard-refresh. Zero SW, zero cache. If it looks correct there but wrong in the regular tab, the regular tab's SW is stale.
- **Fix on desktop:** DevTools (F12) → Application → Service Workers → **Unregister** → Storage → **Clear site data** → close & reopen the tab.
- **Fix on mobile PWA:** uninstall the PWA → reinstall from the site.
- **Hardening in place (v80+):** `/` and `/index.html` are no longer precached, `skipWaiting()` + `clients.claim()` are active, and the SW polls for updates on visibility change + every 30 min. Future deploys propagate within seconds.

### 3. Is browser zoom or OS text-scaling extreme?

Users with 200%+ browser zoom or "Extra Large" system text can trigger unexpected wrapping / clipping in a genuinely responsive layout. Check first before treating as a bug.

### 4. Was the app installed as a PWA and then updated?

PWAs cache aggressively. Sometimes the installed PWA continues running the shell from install-time even after a browser refresh. Fully closing the app (swipe away from app switcher) and reopening usually kicks the SW to check for updates.

### 5. Are they looking at the right URL?

- **Production** = `https://app.ironrabbitapps.com` (what real users see)
- **Preview** = `https://color-task-timer.preview.emergentagent.com` (dev/test environment)
- **Emergent chat's embedded preview iframe** = a browser iframe pointing at Preview; it caches aggressively and often shows stale content. **Never trust it for verification.** Always open the raw Preview URL in a real browser tab.

---

## 🛠 Diagnostic ladder (escalate ONLY if the first checks all pass)

Only after confirming: Desktop-site is off, SW is fresh (or incognito shows the same "broken" render), zoom is normal, and they're on the right URL:

1. **Client cache** — hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`)
2. **PWA cache** — DevTools → Application → Clear site data
3. **Service worker registration** — DevTools → Application → Service Workers → Unregister
4. **CDN edge cache** — deployer agent can fetch origin with `cache: no-store` and grep bundle contents for expected version markers (e.g., `ir-header-glass-strip` = v79+)
5. **Origin build** — deployer agent verifies build artifact hashes match what `index.html` references
6. **KV pointer / R2 slot** — deployer agent confirms the deployment slot pointer is promoted correctly
7. **DNS / custom domain** — last resort. Do not touch without user consent.

---

## 🧭 Key lesson for future agents & support conversations

Never diagnose a "corrupted mobile app" through the CDN/DNS/SW lens until you have confirmed the user's browser is not silently pretending to be a desktop. **Ask about Chrome's "Desktop site" setting first.** A single tap fixes what would otherwise appear to be a full production outage.
