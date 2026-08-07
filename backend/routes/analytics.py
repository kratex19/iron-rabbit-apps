"""Community analytics events + admin summary endpoints."""
from __future__ import annotations

import asyncio
import json as _json
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from deps import db, require_admin, SLACK_WEBHOOK_URL
from models.analytics import (
    CommunityEventsRequest,
    AnalyticsResponse, AnalyticsTipRow,
    RecoveryFunnelResponse, RecoveryWeekPoint,
)

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
        return {"alerted": False, "reason": "no qualifying drop"}

    # Dedupe: don't re-alert if we already pinged for this exact `to.week_start`.
    marker_key = worst["to"]["week_start"]
    existing = await db.recovery_alerts.find_one({"week_start": marker_key})
    if existing:
        return {"alerted": False, "reason": "already alerted", "week_start": marker_key}

    posted = False
    if SLACK_WEBHOOK_URL:
        try:
            import requests as _requests
            text = (
                f":warning: *Iron Rabbit — recovery funnel alert*\n"
                f"Magic-link share dropped *{worst['delta']} points* week-over-week.\n"
                f"• {worst['from']['week_start']} → {worst['from']['week_end']}: "
                f"*{round(worst['from']['magic_link_share'] * 100)}%*\n"
                f"• {worst['to']['week_start']} → {worst['to']['week_end']}: "
                f"*{round(worst['to']['magic_link_share'] * 100)}%*\n"
                f"Check recent email deliverability or landing-page copy."
            )
            await asyncio.to_thread(
                _requests.post,
                SLACK_WEBHOOK_URL,
                json={"text": text},
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
            "week_start": marker_key}


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
