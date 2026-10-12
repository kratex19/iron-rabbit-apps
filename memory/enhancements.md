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

### Deferred to post-Google-Play launch (2026-02-12) — editor polish
_User asked to park these three until after Play Store release. All partial/design work already prototyped during the WrapText repair cycle; starting points below so a future agent (or me after context compaction) can resume cleanly._

1. **Autosave Opt-In** — debounced autosave bound to a user setting so dismissing the modal never loses content.
   - **New setting:** `autosave_notes` (boolean, default `false`) persisted via the existing `settings` store.
   - **UI:** add a Switch row inside `/app/frontend/src/notes/SettingsModal.jsx` immediately under `settings-auto-backup-toggle` (same pattern — `onCheckedChange={(v) => onSave({ ...settings, autosave_notes: v })}`). Label: "Autosave open note". Subtitle: "Silently saves changes every ~1.5 s while editing".
   - **Logic:** in `/app/frontend/src/notes/NoteModal.jsx` add a `useEffect` with 1500 ms debounce on `[title, content, settings?.autosave_notes]`. Fires `onSave(currentState)` only when enabled AND (title non-empty OR content non-empty). **Must NOT close the modal** — reuse the exact `handleSave` normalize → sanitize → persist path so stored shape is identical to manual Save.
   - **Edge cases to handle:** brand-new unsaved notes (require some content first), concurrent manual Save (cancel the pending debounce when manual Save fires), unmount cleanup (flush final pending save on close only if setting enabled).
   - **Default off** → zero behaviour change for users who don't opt in.

2. **Mobile Toolbar Height Clamp** — keep the vertical toolbar inside `visualViewport.height` on short mobile screens with the keyboard open.
   - **Problem:** current vertical `maxHeight: "calc(100vh - 24px)"` at `/app/frontend/src/notes/editor/FloatingRichTextToolbar.jsx` line ~3654 ignores keyboard-shrunken viewport. On a landscape 500 px phone with keyboard open, the toolbar overflows past the keyboard.
   - **Fix:** inside the existing `place` effect (line ~2609) that already calls `getUsableRect()`, additionally capture `rect.bottom` into state (`setUsableBottom(rect.bottom)`). Replace the vertical `maxHeight` inline style with reactive clamp: `Math.max(140, (usableBottom ?? window.innerHeight) - (pos?.y ?? 0) - 8)`.
   - **Inner scroller already handles the overflow** — `scrollerRef` has `overflow-y-auto` + `maxHeight: 100%` (line ~3755), so clamping the outer container is enough; tool strip will scroll internally.
   - **Do NOT change** horizontal mode, drag / snap logic, keyboard-detection effect, or `getUsableRect`.
   - **Manual test:** 900×500 viewport → open note → switch toolbar to vertical → confirm last tool reachable via scroll, nothing past the usable rect.

3. **"Write…" Placeholder Audit** (P2 from handoff) — the stray prompt that appears at the top of the editor area is not synced with the actual focus/content state.
   - **Starting point:** `textarea[placeholder="Write..."]` is the native textarea placeholder in `/app/frontend/src/notes/NoteModal.jsx`. Also check `NotesApp.jsx` for any custom "Write..." render path that may double up with the native placeholder when the textarea is empty but the HTML editor is active.
   - **Fix direction:** either hide the native placeholder once the editor has been promoted to contenteditable, OR consolidate to a single source. Do NOT touch the ZWSP anchoring / format-first typing (frozen).

### Already shipped during this cycle (do NOT re-implement)
- ✅ **Wrap-box caret escape** (2026-02-10) — Return at end of empty tail now exits the box; see `FloatingRichTextToolbar.jsx` keydown handler.
- ✅ **Spacing invariant: trailing + between-boxes** (2026-02-10) — `normalizeWrapBoxSpacingDom` enforces ≥1 node after last box and between adjacent boxes.
- ✅ **Spacing invariant: leading paragraph** (2026-02-10) — same helper prepends `<p><br></p>` when first child is a wrap-box.
- ✅ **Smart Separator Hint** (2026-02-12) — auto-added separators carry `class="ir-wrap-sep"` and show subtle "Tap to write…" ghost **only inside live editors**; see `App.css` `[contenteditable="true"] .ir-wrap-sep:has(br:only-child)::before`.

### Hint copy localisation (small follow-up)
- `.ir-wrap-sep` ghost text is currently hard-coded `'Tap to write…'` in `App.css`. Pipe through i18n so non-English users see localised copy. Options: expose the string via a CSS custom property set from JS using the active locale, OR move the ::before rendering into a React portal that reads from `t(…)`.


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

**Last updated:** 2026-02-12 — parked three editor-polish items (Autosave Opt-In, Mobile Toolbar Height Clamp, "Write…" Placeholder Audit) for post-Google-Play launch.
