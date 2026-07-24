# Iron Rabbit Apps - Company Website + Notes App

## What's Live

### Public Website (moving to ironrabbitapps.com)
Nested under `/site` in the current preview (will be relocated to `ironrabbitapps.com` when the domain is live).
- **Home** (`/site`) — Hero, value props, featured app, why-us, CTA band
- **Apps** (`/site/apps`) — Auto-generated list from `data/apps.js`
- **App Detail** (`/site/apps/:slug`) — Screenshots-ready page with features, FAQs, version history
- **About** (`/site/about`) — Mission
- **Support** (`/site/support`) — Contact card + FAQ
- **Privacy** (`/site/privacy`) — Full policy
- **Terms** (`/site/terms`) — Full terms
- **Contact** (`/site/contact`) — Form opens user's email client (no server)
- **Blog** (`/site/blog`, `/site/blog/:slug`)
- **404** — Not found page

### Notes App (default landing)
- **`/`** — Full offline notes app (default route)
- **`/apps/iron-rabbit-notes/launch`** — Legacy alias, still works

## Architecture
- **Single source of truth** for apps: `/app/frontend/src/data/apps.js`
  - To add an app: append an object with slug, name, tagline, features, FAQs, version history, store URLs
  - It automatically appears on Home (featured), Apps listing, and gets its own detail page
- **Layout components** in `/app/frontend/src/site/components/` (Header, Footer, Layout, AppCard)
- **Pages** in `/app/frontend/src/site/pages/`
- **Notes app** preserved as `/app/frontend/src/NotesApp.jsx`
- **Router** in `/app/frontend/src/App.js` with react-router-dom v7

## SEO
- ✅ Per-page `<title>` and meta description via `usePageMeta`
- ✅ `robots.txt` and `sitemap.xml` in `/public`
- ✅ Manifest.json for PWA install
- ✅ Semantic HTML (header/main/footer/section)

## Design System
- **Palette**: Cream (#FAF7F2) + Charcoal (#1C1917) + Burnt Sienna (#B34A2C)
- **Font**: Manrope + JetBrains Mono (for tech accents)
- **Style**: Editorial, warm, professional — not the generic tech blue/purple


## Routing Pivot (Feb 2026)
- Notes App is now the default landing at `/` (previously company website).
- Company website moved under `/site/*` — will migrate to `www.ironrabbitapps.com` (newly purchased) once DNS is set up.
- All internal Links, `<Navigate>` redirects, and Header/Footer nav updated to `/site/*`.
- `data/apps.js` `webAppUrl` → `/` (Launch button opens Notes at root).
- Brand tld updated to `ironrabbitapps.com` in Header, Footer, and default IndexedDB settings (existing users keep their stored value).
- Legacy `/apps/iron-rabbit-notes/launch` kept as alias for backward compatibility.

## Bug Fix (verified iteration_4.json)
Auto-migration on first load pulls user's old notes from backend into local IndexedDB. Manual "Recover Old Notes from Server" button in Settings for retries. Toasts only show when work happened. StrictMode-safe.
