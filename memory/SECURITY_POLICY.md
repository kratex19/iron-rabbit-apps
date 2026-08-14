# Iron Rabbit — Credential & Integration Security Policy

**Status:** ACTIVE · Do not violate any clause without written user approval
in this repo's issue log.

**Applies to:** every build of Iron Rabbit shipped to any user — PWA, Android
APK/AAB, iOS IPA, and any future distribution channel. Enforcement is the
responsibility of every contributor, human or AI.

---

## 0. Preamble

Iron Rabbit is being prepared for public distribution on Google Play (and
later the App Store). The app developer (hereafter "the owner") is exposing
their name and credentials to real end users. This document exists so that
**no credential belonging to the owner ever ends up in the downloadable
app, and no end user can ever access the owner's personal accounts through
Iron Rabbit.**

Any AI agent, contributor, or automated tool touching this repo must read and
follow this policy before writing code that references credentials, secrets,
tokens, keys, environment variables, OAuth flows, email delivery, or any
third-party service.

---

## 1. Google Drive Backup — REQUIREMENTS

### 1.1 Optional-only

- The Google Drive integration MUST be **fully opt-in**.
- Iron Rabbit MUST work end-to-end without a Drive connection.
- No user MUST be prompted to connect Drive as a launch experience,
  onboarding step, or first-run modal. Discovery lives in Settings only.

### 1.2 Per-user OAuth

- Each user MUST authenticate with **their own** Google account through
  Google's standard OAuth 2.0 Authorization Code + PKCE flow.
- The owner's Google account MUST NEVER be used for any user backup.
- No token, session, or credential belonging to the owner MUST be shipped
  in any build.

### 1.3 Scope minimization

- Iron Rabbit MUST request only the `drive.appdata` scope.
- Iron Rabbit MUST NOT request `drive`, `drive.file`, `drive.readonly`,
  `drive.metadata`, `drive.metadata.readonly`, or any other broader scope.
- Iron Rabbit MUST NOT request Gmail, Contacts, Calendar, Photos, People,
  or any non-Drive Google scope.

### 1.4 Isolation

- Each user's access/refresh tokens MUST live only on that user's device.
- Tokens MUST NEVER be transmitted to Iron Rabbit's backend.
- Tokens MUST be stored in Capacitor Secure Storage (native) or an
  encrypted IndexedDB record (PWA). They MUST NOT sit in `localStorage`
  in plain form.
- There MUST be no code path that reads user A's token from user B's
  device or vice versa.

### 1.5 Public identifiers only in the bundle

- The **Google OAuth Client ID** may be embedded in the frontend as
  `REACT_APP_GOOGLE_CLIENT_ID` — it is a public identifier per Google's
  official documentation.
- The **Google OAuth Client Secret** MUST NOT exist in this project.
  We use PKCE, which requires no secret.
- The Client ID SHOULD be restricted in Google Cloud Console to the
  Iron Rabbit bundle IDs, package names, and web origins.

### 1.6 Revocation & deletion

- Iron Rabbit MUST provide an in-app "Disconnect Google Drive" action
  that (a) revokes the local token, (b) offers one-tap deletion of the
  backup file from Drive, and (c) reverts the UI to the pre-connect
  state.
- Iron Rabbit MUST direct users to Google Account → Security → Third-
  party apps if they want to revoke access from Google's side.

### 1.7 Approval gate

- No Drive-related code MUST be added, activated, or wired until the
  owner explicitly approves the integration in writing (chat/issue).
- Merely providing a Client ID is NOT approval. Approval requires the
  owner to say (in words) "yes, wire the Google Drive integration."

---

## 2. Resend Email Service — REQUIREMENTS

### 2.1 Necessity check

- Do NOT add a `RESEND_API_KEY` because it is "available" or "recommended."
- Before adding it, identify every feature that actually needs it and
  present that list to the owner for approval.
- If no user-visible production feature needs it at launch, leave
  Resend unconfigured. The backend already handles a missing key
  gracefully by short-circuiting with `RESEND_API_KEY not configured`.

### 2.2 Server-side only

- `RESEND_API_KEY` MUST live in `backend/.env` and be loaded by the
  FastAPI process. It MUST NOT appear in:
  - The frontend source tree (`/app/frontend/**`)
  - Any React build artifact (`/app/frontend/build/**`)
  - Any Capacitor bundle (`android/**`, `ios/**`)
  - Any downloadable file (APK, AAB, IPA)
  - Any HTTP response body, header, or query string
  - Any log line, exception message, or analytics event
  - Any test fixture committed to git

### 2.3 Scope of use

- Iron Rabbit MUST use Resend only for the specific approved backend
  email functions (currently: admin community-digest email, tip-promotion
  thank-you email).
- Iron Rabbit MUST NOT let end users trigger arbitrary Resend sends.
  Every Resend call MUST be gated by admin authentication or a scheduled
  server job.

### 2.4 Approval gate

- The owner's Resend key MUST NOT be requested until the owner has
  explicitly approved the specific email feature that requires it.

---

## 3. Downloadable-App Credential Safety — ABSOLUTE

### 3.1 Prohibitions

The following MUST NEVER be present in any file shipped to a user
(APK, AAB, IPA, PWA bundle, web-embed script):

- The owner's personal Google account credentials.
- Any refresh token, access token, session cookie, or ID token issued
  to the owner personally.
- Any Google Cloud service-account JSON key.
- Any OAuth Client Secret (Google, Facebook, Twitter, Microsoft — any
  provider).
- The Resend API key or any other transactional-email provider key.
- SMTP passwords.
- Stripe secret keys (`sk_*`).
- Any backend admin token (e.g. `ADMIN_TOKEN`, `X-Admin-Token` value).
- Any MongoDB / Postgres / Redis connection string containing credentials.
- Any signing secret (JWT secret, webhook signing secret).
- Any private key (PEM, PKCS8, etc.).

### 3.2 Permitted in-bundle values

The following MAY appear in the downloadable app, subject to platform
restrictions:

- Public API base URLs (`REACT_APP_BACKEND_URL`).
- Public OAuth Client IDs (Google, Microsoft) using PKCE — these are
  identifiers, not secrets.
- Public analytics IDs (Firebase App ID, Segment write key for public
  clients — check each provider's documentation).
- Publishable payment keys (Stripe `pk_*` — publishable is safe by design).

### 3.3 Pre-release audit

Before every production build the following audit MUST pass:

    # Fail the build if any secret pattern is found in the shipped
    # frontend bundle.
    ! grep -rE '(RESEND_API_KEY|GOOGLE_CLIENT_SECRET|GOCSPX-|sk_live_|sk_test_|-----BEGIN [A-Z ]+PRIVATE KEY-----|MONGO_URL|ADMIN_TOKEN|SLACK_.*_SECRET|SLACK_.*_TOKEN)' \
      /app/frontend/build /app/android/app/src/main/assets 2>/dev/null

If the audit finds anything, the build MUST be blocked until the
offending value is moved to the backend or removed.

### 3.4 Per-integration checklist (before any activation)

For every third-party service the code touches, this checklist MUST
appear in the PR / commit message / hand-off note:

  - [ ] Owner has approved this specific integration in writing
  - [ ] Only backend-safe credentials go in `backend/.env`
  - [ ] Only public identifiers go in `frontend/.env`
  - [ ] No secret is `console.log`ged, echoed, or returned in an API
  - [ ] The pre-release audit script (§3.3) passes on the built bundle
  - [ ] Users authenticate with their own accounts where relevant
  - [ ] Documentation updated (this file, README, PRD, changelog)

---

## 4. Currently deployed status

| Item | Status | Owner action |
| --- | --- | --- |
| Google Drive OAuth Client ID | **NOT configured** — no code path uses it | Not requested |
| Google Drive Client Secret | **Will never exist** — PKCE flow only | — |
| Google Drive scope | Will request only `drive.appdata` when approved | Awaiting approval |
| Google Drive integration code | **NOT written** — awaiting §1.7 approval | Awaiting approval |
| Resend API key | **NOT configured** for v1.0 launch — owner approved skip on 2026-02-14 | Skipped for v1.0 |
| Resend usage | Backend-only, admin/scheduled paths only (deferred to v1.1+) | Deferred |
| Admin token in bundle? | **No** — server-side only, per §3 | Verified |
| Any owner-personal credential in the app? | **No** — verified | Verified |

**v1.0 launch decision (2026-02-14):** Owner explicitly approved shipping
the first production release **without** the Resend API key configured.
The community digest still works fully via the in-dashboard preview modal
(§ CHANGELOG 2026-02-14 part 2); no user-facing email is required at
launch. Adding Resend later is a config-only change (drop the key in
`backend/.env`, restart) — no code change is required.

## 5. Enforcement

Any change that violates §1, §2, or §3 MUST be reverted immediately upon
detection. AI agents (including E1 and any future agent) MUST refuse to
implement code that violates this policy and MUST cite the specific clause
being violated when doing so.

---

_Last reviewed: 2026-02-14_
_Owner authority: Iron Rabbit project owner_
