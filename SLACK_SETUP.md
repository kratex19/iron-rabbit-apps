# Slack — Recovery Alert Wiring

Iron Rabbit posts recovery-funnel drop alerts to Slack and lets you dismiss
or snooze them from the message itself. This doc gets you from zero to a
button-clickable ack in about 10 minutes.

> **Prereqs**
> * A Slack workspace you can install apps into
> * The Iron Rabbit backend deployed with a public HTTPS URL (Slack won't
>   POST to `localhost` or a preview URL that changes on each build)

---

## 1. Create the Slack app

1. Go to <https://api.slack.com/apps> → **Create New App** → **From scratch**
2. **App name**: `Iron Rabbit — Recovery Alerts`
3. Pick your workspace → **Create App**

## 2. Add an incoming webhook (for the outbound ping)

1. In the app sidebar: **Incoming Webhooks** → toggle **Activate** ON
2. Scroll down → **Add New Webhook to Workspace**
3. Pick the channel that should receive alerts (e.g. `#iron-rabbit-alerts`)
4. Copy the webhook URL — it looks like:
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX
   ```
5. Set it in the backend env:
   ```
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX
   ```
6. Restart the backend.

> ✅ **Checkpoint**: `curl -X POST $API/api/admin/recovery/check-drop -H "X-Admin-Token: ..."`
> should now drop a formatted card into your channel (assuming a real drop
> exists — otherwise the response says `"no qualifying drop"`).

## 3. Enable interactivity (so the buttons work)

The `Dismiss` and `Snooze 7d` buttons Slack renders need a public URL to
POST back to.

1. In the app sidebar: **Interactivity & Shortcuts** → toggle **On**
2. **Request URL**: paste your public backend URL + `/api/slack/interactive`
   ```
   https://api.your-domain.com/api/slack/interactive
   ```
3. **Save Changes**

## 4. Grab the signing secret (the security-critical bit)

Slack signs every callback so the backend can verify it wasn't forged.

1. In the app sidebar: **Basic Information**
2. Scroll to **App Credentials** → **Signing Secret** → **Show** → copy it
3. Set in the backend env:
   ```
   SLACK_SIGNING_SECRET=abcdef0123456789…
   ```
4. Restart the backend.

## 5. Test end-to-end

```bash
export API=https://api.your-domain.com
export ADMIN=<your admin token>

# 1. Trigger an alert manually (assumes real drop data, else it says "no drop")
curl -X POST "$API/api/admin/recovery/check-drop" -H "X-Admin-Token: $ADMIN"

# 2. Open Slack — you should see the card in the channel you picked.
# 3. Click "Dismiss alert" — the message should swap to
#      "✅ Dismissed alert for week of YYYY-MM-DD"
# 4. Confirm the audit row:
curl "$API/api/admin/recovery/alerts?include_dismissed=1" -H "X-Admin-Token: $ADMIN"
# → the row now has "dismissed_via": "slack"
```

---

## Behaviour details

* **No workspace → no problem.** If `SLACK_WEBHOOK_URL` is empty, drop
  alerts still persist to `recovery_alerts` (audit + dashboard) but no
  Slack post is attempted. The dashboard's "dashboard-only" tag surfaces
  this.
* **Signing secret required for buttons.** Without `SLACK_SIGNING_SECRET`
  set, `POST /api/slack/interactive` returns **503** so a misconfigured
  install fails loudly instead of silently accepting forged clicks.
* **Replay-attack window: 5 minutes.** Slack's timestamp is checked
  before the HMAC compare; anything older is refused.
* **Idempotent.** Clicking the button twice, refreshing the message,
  or having the weekly cron re-run all produce the same outcome — one
  dismissed row keyed on `week_start`.
* **Auto-dismiss stays boss.** If a week's magic-link share climbs
  back above `AUTO_DISMISS_SHARE_THRESHOLD` (default **65%**), the
  Monday 08:30 UTC cron will auto-dismiss even active-and-unclicked
  alerts. The row keeps `auto_dismissed_reason: "share_recovered"`
  for the audit trail.

---

## Rotating the signing secret

1. Slack app → **Basic Information** → **Regenerate**
2. Update `SLACK_SIGNING_SECRET` in the backend env
3. Restart the backend
4. Old signatures immediately stop verifying (401)

## Uninstalling

1. Slack app → **Basic Information** → **Delete App** (bottom of page)
2. Unset `SLACK_WEBHOOK_URL` and `SLACK_SIGNING_SECRET` in the backend env
3. Restart the backend — dashboard-only alert mode resumes; no data lost.
