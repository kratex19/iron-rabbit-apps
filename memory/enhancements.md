# Iron Rabbit Apps — Deferred Enhancements

A running list of enhancements to pick up later. Reminded by user on 2026-07-22.

## Ready to Do When You Are

### 1. Go live at ironrabbitapps.com
- Deploy the app
- Point the `ironrabbitapps.com` domain (and `www.ironrabbitapps.com`) at the deployment
- Verify SSL certificate
- Test canonical URLs, sitemap.xml, robots.txt on the live domain

### 2. Publish Iron Rabbit Notes to app stores
- Google Play Console → publish → get URL like `https://play.google.com/store/apps/details?id=com.ironrabbit.notes`
- Apple App Store Connect → publish → get URL like `https://apps.apple.com/app/id0000000000`
- Paste both URLs into `/app/frontend/src/data/apps.js`:
  ```js
  playStoreUrl: "https://play.google.com/...",
  appStoreUrl: "https://apps.apple.com/...",
  ```
- "Soon" pills across the site automatically become real store buttons

### 3. Native app builds (when web version is stable)
- Wrap the offline PWA in Capacitor or Tauri for Android/iOS
- Both platforms already work in the browser — this is just packaging
- Icons ready at `/app/frontend/public/icon-192.png` and `icon-512.png`

## Nice-to-Haves (Not Blocking)

### From notes app itself
- ~~Note attachments (images/files stored as base64 in IndexedDB)~~ ✅ Done 2026-07-24 — see `components/Attachments.jsx` + `storageService.saveAttachment`
- ~~Category grouping with expandable containers (asterisk marker)~~ ✅ Done 2026-07-24 — see `CategoryGroup` in `NotesApp.jsx` + "Group by category" toggle
- Additional templates (more than the current 5 defaults)
- Drag-and-drop between categories (currently only within the same list)
- Import from other note apps (Google Keep, Apple Notes export formats)

### From company website
- Real customer testimonials (currently a placeholder card on Home)
- Email newsletter signup (would need a service like Buttondown or ConvertKit)
- Case studies / power-user profiles
- Press kit page (logos, screenshots, boilerplate copy)

### Future premium features (kept isolated behind `StorageService` interface)
- Optional cloud sync between devices
- Shared notes / collaboration
- Online backup (E2E encrypted)
- User accounts (only for premium features — free core stays account-less)

## Second App Ideas (When You're Ready to Build)
- **Iron Rabbit Calendar** — offline calendar following the same principles
- **Iron Rabbit Habits** — habit tracker with local streaks
- **Iron Rabbit Timer** — Pomodoro / focus timer
- **Iron Rabbit Passwords** — local-only password manager

Each new app is a single object added to `/app/frontend/src/data/apps.js` — the site scales automatically.

## Second Blog Post Ideas
- "How much a free offline app really costs to run" (spoiler: near zero)
- "Backing up your notes: 3 methods, ranked"
- "What we're building next" (once you decide on app #2)

Just append to `/app/frontend/src/data/posts.js` — no code changes needed.

---

**Last updated:** 2026-07-22
