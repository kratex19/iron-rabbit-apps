"""Community analytics events + admin summary endpoints."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException

from deps import db, require_admin
from models.analytics import (
    CommunityEventsRequest,
    AnalyticsResponse, AnalyticsTipRow,
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
