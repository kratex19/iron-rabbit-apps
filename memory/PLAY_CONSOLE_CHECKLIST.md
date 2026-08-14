# Iron Rabbit — Google Play Console Setup Checklist

Follow top to bottom. Each step is designed to be completed in one
sitting; the whole flow takes ~45 minutes if you have all the assets
ready.

---

## Before you open Play Console

- [ ] **Google Play Developer account** — sign up at
      `play.google.com/console`. One-time **$25 USD** fee. Requires ID
      verification (photo of a government ID + a selfie) — set aside
      time for that.
- [ ] **A signed Android App Bundle (.aab)** — build with
      `npx cap add android && npx cap sync android && cd android
      && ./gradlew bundleRelease` (or Android Studio → Build → Generate
      Signed Bundle). Store the signing keystore somewhere safe; if you
      lose it you lose control of the listing.
- [ ] **App icon 512×512** — regenerate from `frontend/assets/icon-only.png`
      via `npx @capacitor/assets generate --android`.
- [ ] **Feature graphic 1024×500** — already in
      `frontend/public/feature-graphic-1024x500.png`.
- [ ] **At least 2 phone screenshots** — reuse
      `frontend/public/screenshots/ios/iphone-6.7/*` (Play accepts them).
- [ ] **Privacy policy URL** — a live web page. If you don't have a
      site yet, publish the plain-HTML version of
      `memory/GOOGLE_DRIVE_PRIVACY.md` on GitHub Pages or Vercel.

---

## Step 1 — Create the app in Play Console

- [ ] Play Console → **Create app**.
- [ ] App name: **Iron Rabbit**
- [ ] Default language: **English (United States)** or your own
- [ ] App or game: **App**
- [ ] Free or paid: **Free**
- [ ] Accept the Developer Program Policies + US export laws checkboxes.
- [ ] Click **Create app**.

## Step 2 — Fill Store presence

Left sidebar → **Grow → Store presence → Main store listing**.

- [ ] App name, short description, full description — copy from
      `memory/PLAY_STORE_METADATA.md`.
- [ ] Upload the app icon (512×512).
- [ ] Upload the feature graphic (1024×500).
- [ ] Upload 2+ phone screenshots.
- [ ] Category → **Productivity**.
- [ ] Tags → **Reminders, To-do lists, Habit tracking**.
- [ ] Contact details → your support email + optional website.
- [ ] Privacy policy → the live URL you set up.
- [ ] **Save**.

## Step 3 — App content declarations

Left sidebar → **Policy → App content**.

- [ ] **Privacy policy** — paste the URL, save.
- [ ] **App access** → "All functionality is available without any
      special access" — save.
- [ ] **Ads** → "No, my app does not contain ads" — save.
- [ ] **Content ratings** — run the IARC questionnaire. Answer "No" to
      every violence / sexual / drugs / gambling question. Save.
- [ ] **Target audience and content** — Age 13+, no children,
      not appealing to children — save.
- [ ] **News apps** → "No" — save.
- [ ] **COVID-19 contact-tracing** → "No" — save.
- [ ] **Data safety** → follow the wizard, answer per the table in
      `memory/PLAY_STORE_METADATA.md`. Save.
- [ ] **Government apps** → "No" — save.
- [ ] **Financial features** → "None" — save.
- [ ] **Health features** → "None" — save.

Play Console will surface a green tick beside each section when done.
All must be green before you can submit.

## Step 4 — Set up your first release

Left sidebar → **Testing → Internal testing** (start here, not
Production).

- [ ] **Create new release**.
- [ ] Upload your `.aab` file.
- [ ] Release name → `1.0.0` (auto-filled from the AAB's versionName).
- [ ] Release notes → leave blank for v1.0.
- [ ] **Save**, then **Review release**.
- [ ] **Start rollout to Internal testing**.
- [ ] Add yourself + up to 100 email addresses under **Testers**.
- [ ] Testers install via the Play Store opt-in URL Google gives you.

## Step 5 — Graduate to Production

Only after Internal testing looks good on your own device:

- [ ] Left sidebar → **Testing → Closed testing** (optional stepping
      stone with a wider tester group) — repeat step 4 pattern.
- [ ] Left sidebar → **Production → Create new release**.
- [ ] Upload the same `.aab` (or a fresh one if you've bumped versions).
- [ ] Review the release, then start rollout at **10 %**.
- [ ] Monitor Play Console → **Quality → Android vitals** for the first
      48 hours (crash rate < 1 %, ANR rate < 0.5 %).
- [ ] Ramp to **50 %** at 48 h, **100 %** at 72 h if metrics stay green.

## Step 6 — Post-launch

- [ ] **Managed publishing** — turn ON in **Publishing overview** so
      future updates require your explicit approval before hitting the
      store.
- [ ] Set up **weekly review alerts** in Play Console →
      Communications → Notifications.
- [ ] Add the beta-testing opt-in URL to your Iron Rabbit `About`
      screen (optional but nice).

---

## Common rejection reasons + fixes

| Symptom | Fix |
| --- | --- |
| "Broken functionality" | Google's bot couldn't launch the app — usually a missing signing config. Rebuild with `--release` and re-sign. |
| "Deceptive behavior" — permissions | Every dangerous permission needs a runtime prompt AND a plain-English purpose in the store listing. Iron Rabbit uses local notifications and camera; both are already documented in `IOS_BUILD_GUIDE.md` and mirrored on Android. |
| "Privacy policy" mismatch | The URL you pasted must be live and reachable. Test in incognito before submitting. |
| "Data safety" mismatch | Every "no data collected" must be true. If you enable Google Drive later, re-answer the wizard immediately. |
| "Metadata refers to another platform" | Search your description for "App Store," "iPhone," "iOS" — Play rejects listings that mention Apple. |

---

## When to escalate to a Play Console support ticket

- If a rejection references a policy without linking to the exact
  section, click "Contact us" on the rejection screen. Response time is
  usually 2 business days.
- If you're locked out of your developer account, follow
  `support.google.com/googleplay/android-developer` — never share your
  login with anyone.
