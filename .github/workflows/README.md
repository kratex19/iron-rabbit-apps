# Iron Rabbit — GitHub Actions release setup (one-time)

The workflow at `.github/workflows/android-release.yml` builds & signs a Play-ready AAB on GitHub's x86_64 Linux runners. Before running it for the first time you need to configure three secrets so the workflow can access your signing keystore.

## 1. Prepare the keystore base64 (locally)

On your Mac / Windows / Linux — the same machine where you already have `signing.keystore` backed up:

```bash
# macOS / Linux
base64 -i signing.keystore -o signing.keystore.b64
# then open signing.keystore.b64 in a text editor and copy ALL of it

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("signing.keystore")) | Set-Content signing.keystore.b64 -NoNewline
```

## 2. Add the 3 GitHub secrets

Go to your Iron Rabbit repo on GitHub → **Settings → Secrets and variables → Actions → New repository secret**. Add these three:

| Secret name | Value |
|---|---|
| `SIGNING_KEYSTORE_BASE64` | Paste the entire content of `signing.keystore.b64` |
| `SIGNING_KEYSTORE_PASSWORD` | `SEGaPl5xmzYF` (from `signing-key-info.txt` — both keystore and key passwords are identical) |
| `SIGNING_KEY_ALIAS` | `my-key-alias` |

Once saved, GitHub only shows their names, never the values.

## 3. Optional — pin the backend URL for the build

If your workflow needs `REACT_APP_BACKEND_URL` set to something other than `https://app.ironrabbitapps.com`, add a repo **Variable** (Settings → Variables → Actions) named `REACT_APP_BACKEND_URL`. Otherwise the workflow defaults to the production URL.

## 4. Run your first release

1. GitHub → repo → **Actions** tab
2. Left sidebar → **Android release AAB** workflow
3. Right side → **Run workflow** button
4. Fill in the inputs:
   - **versionName** — e.g. `1.0.1` (leave blank to use whatever is in `build.gradle`)
   - **versionCode** — e.g. `2` (integer, must be > the last Play Store release — required)
5. Click **Run workflow**

Wait ~5-8 minutes for the job to finish. Then:
- Open the completed run
- Scroll to **Artifacts** at the bottom
- Download the AAB (named like `iron-rabbit-1.0.1-vc2-20260901T...Z.aab`)
- Upload it manually to Google Play Console → Testing → Internal testing → Create new release

## 5. Safety features baked into the workflow

- **Verifies the AAB SHA-1 matches Play Console's registered upload key** before publishing the artifact. If the fingerprint drifts (e.g., someone rotates the keystore) the workflow fails loudly.
- **Concurrency lock** — only one release job runs at a time; prevents accidentally producing two AABs with the same versionCode.
- **Ephemeral keystore** — the keystore is base64-decoded onto the runner filesystem, used to sign, then shredded/deleted. The runner itself is destroyed after each job.
- **No auto-upload to Play** — you always download and upload the AAB manually. This is intentional: it keeps you in control of what actually reaches users.

## 6. Emergency: rotating the keystore

Only necessary if the keystore is compromised. Requires Google support ticket to reset the upload key (24-48 h). Full procedure documented in `RELEASE.md`. Do NOT rotate for routine reasons.
