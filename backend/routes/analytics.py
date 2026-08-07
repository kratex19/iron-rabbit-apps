"""Community analytics events + admin summary endpoints."""
from __future__ import annotations

import asyncio
import json as _json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Request

from models.analytics import (
    CommunityEventsRequest,
    AnalyticsResponse, AnalyticsTipRow,
    RecoveryFunnelResponse, RecoveryWeekPoint,
)

from deps import db, require_admin, SLACK_WEBHOOK_URL, PUBLIC_APP_URL, SLACK_SIGNING_SECRET

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

_ALLOWED_EVENTS = {"impression", "open", "dismiss"}


@router.post("/community/events")
async def track_community_events(payload: CommunityEventsRequest):
    """Public: batch-insert lightweight analytics events for the featured tip.
    Anonymous — clients pass a random install UUID (stored in localStorage)
    so we can compute 'unique installs' without any user identity."""
    if not payload.events:
        return {"ok": True, "written": 0}
    now_dt = datetime.now(timezone.utc)
    docs = []
    for ev in payload.events[:50]:
        if ev.event not in _ALLOWED_EVENTS:
            continue
        tip_id = (ev.tip_id or "").strip()[:64]
        if not tip_id:
            continue
        install = (ev.install_id or "").strip()[:64] or None
        at_dt = now_dt
        if ev.at:
            try:
                at_dt = datetime.fromisoformat(ev.at.replace("Z", "+00:00"))
            except Exception:
                at_dt = now_dt
        docs.append({
            "id": str(uuid.uuid4()),
            "event": ev.event,
            "tip_id": tip_id,
            "install_id": install,
            "at": at_dt,
        })
    if docs:
        try:
            await db.community_events.insert_many(docs)
        except Exception:
            logger.exception("community_events insert_many failed")
            raise HTTPException(status_code=500, detail="Storage error")
    return {"ok": True, "written": len(docs)}


@router.get("/community/analytics", response_model=AnalyticsResponse, dependencies=[Depends(require_admin)])
async def community_analytics(days: int = 30):
    """Admin-only: per-tip event counts + unique installs over the last N days."""
    days = max(1, min(365, int(days or 30)))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    pipeline = [
        {"$match": {"at": {"$gte": since}}},
        {"$group": {
            "_id": {"tip_id": "$tip_id", "event": "$event"},
            "count": {"$sum": 1},
            "installs": {"$addToSet": "$install_id"},
        }},
    ]
    rows: Dict[str, Dict[str, Any]] = {}
    total = 0
    async for r in db.community_events.aggregate(pipeline):
        tip_id = r["_id"]["tip_id"]
        event = r["_id"]["event"]
        count = int(r["count"])
        total += count
        row = rows.setdefault(tip_id, {
            "tip_id": tip_id, "impressions": 0, "opens": 0, "dismisses": 0, "installs": set(),
        })
        if event == "impression":
            row["impressions"] += count
        elif event == "open":
            row["opens"] += count
        elif event == "dismiss":
            row["dismisses"] += count
        for inst in r["installs"]:
            if inst:
                row["installs"].add(inst)

    tip_ids = list(rows.keys())
    tips_meta: Dict[str, Dict[str, Any]] = {}
    if tip_ids:
        async for t in db.community_tips.find(
            {"id": {"$in": tip_ids}},
            {"_id": 0, "id": 1, "heading": 1, "resource_id": 1},
        ):
            tips_meta[t["id"]] = t

    tips: List[AnalyticsTipRow] = []
    for tid, row in rows.items():
        meta = tips_meta.get(tid, {})
        tips.append(AnalyticsTipRow(
            tip_id=tid,
            heading=meta.get("heading", "") or "(missing tip)",
            resource_id=meta.get("resource_id", "") or "",
            impressions=row["impressions"],
            opens=row["opens"],
            dismisses=row["dismisses"],
            unique_installs=len(row["installs"]),
        ))
    tips.sort(key=lambda t: (-t.opens, -t.impressions))
    return AnalyticsResponse(
        window_days=days,
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_events=total,
        tips=tips,
    )


@router.get(
    "/community/recovery/analytics",
    response_model=RecoveryFunnelResponse,
    dependencies=[Depends(require_admin)],
)
async def recovery_funnel(days: int = 30):
    """Admin-only: recovery-flow funnel counts over the last N days.

    `magic_link_share` is the fraction of *opens* that came from the emailed
    magic link vs manual entry from the Wall — the metric that answers
    'is the deep link worth the URL length?'. Zero when nobody opened either
    branch (avoids /0 in the client)."""
    days = max(1, min(365, int(days or 30)))
    since = datetime.now(timezone.utc) - timedelta(days=days)
    counts: Dict[str, int] = {}
    async for row in db.recovery_events.aggregate([
        {"$match": {"at": {"$gte": since}}},
        {"$group": {"_id": "$event", "n": {"$sum": 1}}},
    ]):
        counts[row["_id"]] = int(row["n"])
    magic = counts.get("magic_link_opened", 0)
    manual = counts.get("manual_entry_opened", 0)
    share = round(magic / (magic + manual), 3) if (magic + manual) else 0.0

    # Weekly series: last 4 completed 7-day windows, oldest → newest. Each
    # window is [now-7d*(i+1), now-7d*i). We do 4 parallel aggregates rather
    # than one big group so the shape stays simple.
    now = datetime.now(timezone.utc)
    weekly_series: List[RecoveryWeekPoint] = []
    for i in range(4, 0, -1):
        wstart = now - timedelta(days=7 * i)
        wend = now - timedelta(days=7 * (i - 1))
        wcounts: Dict[str, int] = {}
        async for row in db.recovery_events.aggregate([
            {"$match": {"at": {"$gte": wstart, "$lt": wend},
                        "event": {"$in": ["magic_link_opened", "manual_entry_opened"]}}},
            {"$group": {"_id": "$event", "n": {"$sum": 1}}},
        ]):
            wcounts[row["_id"]] = int(row["n"])
        w_magic = wcounts.get("magic_link_opened", 0)
        w_manual = wcounts.get("manual_entry_opened", 0)
        w_total = w_magic + w_manual
        w_share = round(w_magic / w_total, 3) if w_total else 0.0
        weekly_series.append(RecoveryWeekPoint(
            week_start=wstart.date().isoformat(),
            week_end=(wend - timedelta(seconds=1)).date().isoformat(),
            magic_link_opened=w_magic,
            manual_entry_opened=w_manual,
            magic_link_share=w_share,
            opens_total=w_total,
        ))

    return RecoveryFunnelResponse(
        window_days=days,
        generated_at=datetime.now(timezone.utc).isoformat(),
        email_sent=counts.get("email_sent", 0),
        magic_link_opened=magic,
        manual_entry_opened=manual,
        verify_failed=counts.get("verify_failed", 0),
        verify_success=counts.get("verify_success", 0),
        magic_link_share=share,
        weekly_series=weekly_series,
    )


# =============================================================================
# Drop-alert Slack ping — mirrors the client-side dashboard banner. Fires when
# ANY adjacent-week magic_link_share drop exceeds 20 percentage points and
# both weeks have opens. Idempotent per drop: keyed on `to.week_start` in the
# `recovery_alerts` collection so the same drop doesn't spam.
# =============================================================================
_DROP_ALERT_THRESHOLD = 20  # percentage points


async def _detect_and_ping_drop() -> Dict[str, Any]:
    """Compute the worst adjacent-week share drop >20pts (both weeks non-zero).
    If found and never previously pinged, POST to Slack + persist the marker.

    Also auto-dismisses active alerts whose *most recent* week has recovered
    to ≥65% magic-link share — so "the fire is out" reflects in the dashboard
    without a manual click. Audit trail stays intact via `auto_dismissed_at`.

    Returns a summary dict so callers can log the outcome."""
    now = datetime.now(timezone.utc)
    series: List[Dict[str, Any]] = []
    for i in range(4, 0, -1):
        wstart = now - timedelta(days=7 * i)
        wend = now - timedelta(days=7 * (i - 1))
        wcounts: Dict[str, int] = {}
        async for row in db.recovery_events.aggregate([
            {"$match": {"at": {"$gte": wstart, "$lt": wend},
                        "event": {"$in": ["magic_link_opened", "manual_entry_opened"]}}},
            {"$group": {"_id": "$event", "n": {"$sum": 1}}},
        ]):
            wcounts[row["_id"]] = int(row["n"])
        w_magic = wcounts.get("magic_link_opened", 0)
        w_manual = wcounts.get("manual_entry_opened", 0)
        w_total = w_magic + w_manual
        w_share = round(w_magic / w_total, 3) if w_total else 0.0
        series.append({
            "week_start": wstart.date().isoformat(),
            "week_end": (wend - timedelta(seconds=1)).date().isoformat(),
            "magic_link_share": w_share,
            "opens_total": w_total,
        })

    # Auto-dismiss: latest week has healthy share → the funnel has recovered,
    # so any lingering active alerts should quietly clear themselves. We
    # gate on the LATEST week only (not any week ≥65%) so a mid-window
    # bounce that then dips again doesn't dismiss prematurely.
    auto_dismissed_ids: List[str] = []
    if series and series[-1]["opens_total"] > 0 and series[-1]["magic_link_share"] >= 0.65:
        cursor = db.recovery_alerts.find({
            "$and": [
                {"$or": [{"dismissed_at": {"$exists": False}}, {"dismissed_at": None}]},
                {"$or": [
                    {"snooze_until": {"$exists": False}},
                    {"snooze_until": None},
                    {"snooze_until": {"$lt": now}},
                ]},
            ],
        })
        async for row in cursor:
            await db.recovery_alerts.update_one(
                {"_id": row["_id"]},
                {"$set": {
                    "dismissed_at": now,
                    "auto_dismissed_at": now,
                    "auto_dismissed_reason": "share_recovered",
                    "auto_dismissed_at_share": series[-1]["magic_link_share"],
                }},
            )
            auto_dismissed_ids.append(row.get("week_start", ""))

    # Largest qualifying drop across adjacent pairs.
    worst = None
    for i in range(1, len(series)):
        a, b = series[i - 1], series[i]
        if a["opens_total"] == 0 or b["opens_total"] == 0:
            continue
        delta = round((a["magic_link_share"] - b["magic_link_share"]) * 100)
        if delta > _DROP_ALERT_THRESHOLD and (not worst or delta > worst["delta"]):
            worst = {"delta": delta, "from": a, "to": b}

    if not worst:
        return {"alerted": False, "reason": "no qualifying drop",
                "auto_dismissed": auto_dismissed_ids}

    # Dedupe: don't re-alert if we already pinged for this exact `to.week_start`.
    marker_key = worst["to"]["week_start"]
    existing = await db.recovery_alerts.find_one({"week_start": marker_key})
    if existing:
        return {"alerted": False, "reason": "already alerted",
                "week_start": marker_key,
                "auto_dismissed": auto_dismissed_ids}

    posted = False
    if SLACK_WEBHOOK_URL:
        try:
            import requests as _requests
            summary = (
                f":warning: Iron Rabbit — recovery funnel alert · "
                f"{worst['delta']} pt drop week of {worst['to']['week_start']}"
            )
            blocks = [
                {"type": "section", "text": {
                    "type": "mrkdwn",
                    "text": (
                        f":warning: *Iron Rabbit — recovery funnel alert*\n"
                        f"Magic-link share dropped *{worst['delta']} points* week-over-week.\n"
                        f"• {worst['from']['week_start']} → {worst['from']['week_end']}: "
                        f"*{round(worst['from']['magic_link_share'] * 100)}%*\n"
                        f"• {worst['to']['week_start']} → {worst['to']['week_end']}: "
                        f"*{round(worst['to']['magic_link_share'] * 100)}%*\n"
                        f"Check recent email deliverability or landing-page copy."
                    ),
                }},
                # Interactive dismiss button — the `value` carries week_start so
                # the interactive handler can PATCH it without a lookup. Slack
                # only invokes the interactive endpoint if a Slack app + signing
                # secret are configured; otherwise the button opens the dashboard.
                {"type": "actions", "block_id": "recovery_alert_actions", "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Dismiss alert"},
                        "style": "primary",
                        "action_id": "dismiss_recovery_alert",
                        "value": worst["to"]["week_start"],
                    },
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Snooze 7d"},
                        "action_id": "snooze_recovery_alert",
                        "value": worst["to"]["week_start"],
                    },
                    *([{
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Open dashboard"},
                        "url": f"{PUBLIC_APP_URL}/admin/community",
                    }] if PUBLIC_APP_URL else []),
                ]},
                # Context row keeps the week_start visible even after a click.
                {"type": "context", "elements": [
                    {"type": "mrkdwn", "text": f":date: `week_start: {worst['to']['week_start']}`"},
                ]},
            ]
            await asyncio.to_thread(
                _requests.post,
                SLACK_WEBHOOK_URL,
                json={"text": summary, "blocks": blocks},
                timeout=8,
            )
            posted = True
        except Exception:
            logger.exception("slack drop-alert post failed")

    await db.recovery_alerts.insert_one({
        "week_start": marker_key,
        "delta": worst["delta"],
        "from_share": worst["from"]["magic_link_share"],
        "to_share": worst["to"]["magic_link_share"],
        "posted_to_slack": posted,
        "alerted_at": datetime.now(timezone.utc),
    })
    return {"alerted": True, "posted_to_slack": posted, "delta": worst["delta"],
            "week_start": marker_key, "auto_dismissed": auto_dismissed_ids}


@router.post("/admin/recovery/check-drop", dependencies=[Depends(require_admin)])
async def admin_check_drop_alert():
    """Admin-only: force-run the drop detector. Same idempotency rules —
    running twice for the same drop won't double-ping. Handy for testing."""
    return await _detect_and_ping_drop()


@router.get("/admin/recovery/alerts", dependencies=[Depends(require_admin)])
async def admin_recovery_alerts(limit: int = 5, include_dismissed: int = 0):
    """Admin-only: last N recovery-drop alerts (newest first).

    By default hides rows that have been dismissed or are currently snoozed —
    the panel is a live "still-relevant drops" view, not the full audit
    trail. Pass `?include_dismissed=1` to see everything (audit mode)."""
    limit = max(1, min(50, int(limit or 5)))
    q: Dict[str, Any] = {}
    if not include_dismissed:
        now = datetime.now(timezone.utc)
        # `dismissed_at` and `snooze_until` are added by PATCH — legacy rows
        # won't have them at all. `$exists:false` + explicit null both count
        # as "not dismissed / not snoozed".
        q = {
            "$and": [
                {"$or": [{"dismissed_at": {"$exists": False}}, {"dismissed_at": None}]},
                {"$or": [
                    {"snooze_until": {"$exists": False}},
                    {"snooze_until": None},
                    {"snooze_until": {"$lt": now}},
                ]},
            ],
        }
    docs = await db.recovery_alerts.find(q, {"_id": 0}).sort("alerted_at", -1).to_list(limit)
    # Datetime → ISO for JSON safety.
    for d in docs:
        for k in ("alerted_at", "dismissed_at", "snooze_until"):
            v = d.get(k)
            if isinstance(v, datetime):
                d[k] = v.isoformat()
    return {"alerts": docs}


@router.patch("/admin/recovery/alerts/{week_start}", dependencies=[Depends(require_admin)])
async def admin_patch_recovery_alert(week_start: str, payload: Dict[str, Any]):
    """Admin-only: acknowledge a drop.

    Actions:
      * `dismiss`  — set `dismissed_at` = now (removes from default view)
      * `snooze`   — set `snooze_until` = now + N days (default 7)
      * `restore`  — clear both fields (row reappears in default view)
    """
    action = str(payload.get("action") or "").strip().lower()
    if action not in {"dismiss", "snooze", "restore"}:
        raise HTTPException(status_code=400, detail="Unsupported action")

    doc = await db.recovery_alerts.find_one({"week_start": week_start})
    if not doc:
        raise HTTPException(status_code=404, detail="Alert not found")

    now = datetime.now(timezone.utc)
    if action == "dismiss":
        update = {"$set": {"dismissed_at": now}}
    elif action == "snooze":
        days = int(payload.get("days") or 7)
        days = max(1, min(30, days))
        update = {"$set": {"snooze_until": now + timedelta(days=days), "dismissed_at": None}}
    else:  # restore
        update = {"$set": {"dismissed_at": None, "snooze_until": None}}

    await db.recovery_alerts.update_one({"week_start": week_start}, update)
    return {"ok": True, "action": action}


# =============================================================================
# Slack interactive endpoint. Handles button clicks from the drop-alert
# message so admins can dismiss/snooze without opening the dashboard.
#
# Slack signs every callback with an HMAC-SHA256 signature over
#   `v0:{timestamp}:{raw_body}`  using the signing secret from the Slack app.
# We reject anything without a valid signature to prevent forgery.
#
# Not registered unless SLACK_SIGNING_SECRET is set — a missing secret means
# no Slack app is wired yet, so accepting the endpoint would be a footgun.
# =============================================================================
import hmac
import hashlib
import time as _time
from urllib.parse import parse_qs


def _verify_slack_signature(timestamp: str, body: bytes, signature: str) -> bool:
    """Constant-time HMAC verification per Slack docs. `timestamp` older than
    5 minutes is refused (replay-attack window)."""
    if not SLACK_SIGNING_SECRET or not timestamp or not signature:
        return False
    try:
        if abs(_time.time() - float(timestamp)) > 60 * 5:
            return False
    except ValueError:
        return False
    basestring = f"v0:{timestamp}:".encode() + body
    expected = "v0=" + hmac.new(
        SLACK_SIGNING_SECRET.encode(), basestring, hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/slack/interactive")
async def slack_interactive(request: Request):
    """Receiver for Slack Block Kit button clicks. Requires the Slack app's
    signing secret to be configured — otherwise returns 503 so misconfigured
    installs fail loudly."""
    if not SLACK_SIGNING_SECRET:
        raise HTTPException(status_code=503, detail="Slack interactivity not configured")

    body = await request.body()
    ts = request.headers.get("X-Slack-Request-Timestamp", "")
    sig = request.headers.get("X-Slack-Signature", "")
    if not _verify_slack_signature(ts, body, sig):
        raise HTTPException(status_code=401, detail="Invalid Slack signature")

    # Slack posts as form-urlencoded with a `payload` field holding JSON.
    form = parse_qs(body.decode("utf-8", errors="replace"))
    payload_raw = (form.get("payload") or [""])[0]
    try:
        payload = _json.loads(payload_raw)
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed payload")

    actions = payload.get("actions") or []
    if not actions:
        return {"text": "no action"}
    a = actions[0]
    action_id = a.get("action_id") or ""
    week_start = a.get("value") or ""
    if not week_start:
        return {"text": "missing week_start"}

    now = datetime.now(timezone.utc)
    if action_id == "dismiss_recovery_alert":
        await db.recovery_alerts.update_one(
            {"week_start": week_start},
            {"$set": {"dismissed_at": now, "dismissed_via": "slack"}},
        )
        summary = f":white_check_mark: Dismissed alert for week of {week_start}"
    elif action_id == "snooze_recovery_alert":
        await db.recovery_alerts.update_one(
            {"week_start": week_start},
            {"$set": {"snooze_until": now + timedelta(days=7), "snoozed_via": "slack"}},
        )
        summary = f":zzz: Snoozed alert for week of {week_start} (7 days)"
    else:
        return {"text": f"unknown action `{action_id}`"}

    # `replace_original: true` swaps the original message so the row shows as
    # handled. Slack expects a 200 within 3s; the update is quick.
    return {"replace_original": True, "text": summary}
