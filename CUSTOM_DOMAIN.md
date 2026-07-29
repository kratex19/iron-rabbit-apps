# Iron Rabbit — Custom Domain Setup (`www.ironrabbitapps.com`)

This guide walks you through linking your custom domain to your deployed Iron Rabbit PWA using Emergent's built-in Entri integration. No terminal work, no code — everything happens in the Emergent deploy dashboard.

---

## Prerequisites

- Iron Rabbit has been **deployed** at least once from Emergent (you'll have a `*.emergentagent.com` preview + production URL).
- You **own** the domain `ironrabbitapps.com` (registered at any provider — GoDaddy, Namecheap, Google Domains, Cloudflare Registrar, Porkbun, etc.).
- You can log into the domain registrar's DNS panel (needed only if you choose the DNS route).

---

## Recommended: One-click Entri flow (~2 minutes)

Emergent bundles [Entri](https://entri.com) — a domain-connect service that automatically configures DNS at your registrar with a single OAuth-style approval. This is the fastest, safest path.

1. Open your Emergent workspace and click the **Deploy** button (top-right).
2. In the deploy panel, scroll to **Custom Domain**.
3. Enter `www.ironrabbitapps.com` in the input and click **Add domain**.
4. Emergent will show two options:
   - **"Connect automatically via Entri"** ← click this.
   - "Configure DNS manually" (fallback — see below).
5. A popup asks you to sign into your **domain registrar**. Pick from the list (Namecheap, GoDaddy, Google, Cloudflare, etc.). If your registrar isn't listed, use the manual route.
6. Approve the DNS changes Entri requests. Behind the scenes it will add:
   - a `CNAME` record for `www` → your Emergent deployment
   - an `A` (apex) record redirect from `ironrabbitapps.com` → `www.ironrabbitapps.com`
7. Wait for the green **Connected · SSL active** badge (usually 1–5 minutes; occasionally up to an hour for propagation).

Once you see the green badge, your app is live at:
- `https://www.ironrabbitapps.com` — primary
- `https://ironrabbitapps.com` — auto-redirects to `www`

**SSL is automatic.** Emergent provisions a Let's Encrypt certificate and auto-renews it. You don't need to install or upload anything.

---

## Fallback: Manual DNS configuration

If your registrar isn't supported by Entri (rare — check the list first), you can add DNS records yourself.

1. In the deploy panel's **Custom Domain** dialog, click **"Configure DNS manually"**.
2. Copy the CNAME target that Emergent shows (looks like `abc123.emergentagent.com`).
3. Log in to your domain registrar's DNS panel.
4. Add these records:
   | Type  | Host   | Value                           | TTL     |
   |-------|--------|---------------------------------|---------|
   | CNAME | `www`  | `<paste-from-emergent>`         | 3600    |
   | ALIAS or ANAME | `@` (root) | `<paste-from-emergent>`  | 3600    |

   > If your registrar doesn't support `ALIAS`/`ANAME` at the root, use an `A` record pointing to the IP shown in the Emergent dialog. Cloudflare, DNSimple, Netlify DNS, and Vercel DNS all support ALIAS/ANAME.

5. Save DNS. Wait 5–30 minutes for propagation.
6. Return to Emergent → the domain status should flip to **Connected · SSL active**.

Verify manually if needed:
```
dig www.ironrabbitapps.com CNAME +short
```

---

## After the domain is live

### Update your PWA manifest (optional but polishes install UX)

Once your custom domain is verified, iOS and Android will use it as the app's identity when users install. No code change is strictly required — the `manifest.json` uses relative URLs — but if you want to be explicit, edit `/app/frontend/public/manifest.json`:

```json
{
  "start_url": "https://www.ironrabbitapps.com/",
  "scope": "https://www.ironrabbitapps.com/"
}
```

Redeploy after this change.

### Update marketing links

Anywhere you have shared the `*.emergentagent.com` preview URL (README, README screenshots, app store listing, social bios), swap to `https://www.ironrabbitapps.com`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "SSL pending" for >1 hour | Confirm DNS propagation — Emergent needs to see the CNAME to trigger cert issuance. Some registrars cache for up to 24h. |
| Site loads but shows "not secure" | Cert not yet issued. Wait 5–10 min after DNS resolves, then hard-refresh (Cmd/Ctrl + Shift + R). |
| Old preview URL still shows | Chrome caches PWAs aggressively. On the device: Settings → Apps → Iron Rabbit → **Clear cache**. Or open in a private window. |
| `ironrabbitapps.com` (apex) doesn't redirect | Your registrar may not support ALIAS/ANAME at root — add an A record pointing to the IP Emergent provides in the manual dialog. |
| Entri popup won't open | Disable popup blockers, or use the manual DNS route. |

---

## What happens on redeploy

Every time you redeploy Iron Rabbit from Emergent, your custom domain stays wired up automatically. No re-verification, no cert renewal action needed.

---

**When you're ready**, click Deploy → Custom Domain → paste `www.ironrabbitapps.com` → follow Entri. Should be live in under 5 minutes.
