# Iron Rabbit Apps - Company Website + Notes App

## What's Live

### Public Website (otropis.com)
- **Home** (`/`) — Hero, value props, featured app, why-us, CTA band
- **Apps** (`/apps`) — Auto-generated list from `data/apps.js`
- **App Detail** (`/apps/:slug`) — Screenshots-ready page with features, FAQs, version history
- **About** (`/about`) — Mission
- **Support** (`/support`) — Contact card + FAQ
- **Privacy** (`/privacy`) — Full policy
- **Terms** (`/terms`) — Full terms
- **Contact** (`/contact`) — Form opens user's email client (no server)
- **404** — Not found page

### Notes App (embedded)
- **`/apps/iron-rabbit-notes/launch`** — Full offline notes app

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

## Bug Fix (verified iteration_4.json)
Auto-migration on first load pulls user's old notes from backend into local IndexedDB. Manual "Recover Old Notes from Server" button in Settings for retries. Toasts only show when work happened. StrictMode-safe.
