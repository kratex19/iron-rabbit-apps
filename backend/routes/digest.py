"""Community digest email endpoints + core send helper (shared with the
weekly cron in server.py)."""
from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse

from deps import (
    db, RESEND_API_KEY, SENDER_EMAIL, ADMIN_DIGEST_EMAIL,
    require_admin,
)
from models.digest import (
    DigestSendResponse, DigestStatusResponse, DigestToggleRequest,
)

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

# APScheduler handle — set by server.py after startup so /digest/status can
# report the next run time. Kept as a module attribute for late binding.
scheduler = None


def _render_digest_html(pending: List[Dict[str, Any]], promoted_recent: List[Dict[str, Any]], generated_at: str, unsubscribe_url: Optional[str] = None, funnel_line: Optional[Dict[str, Any]] = None) -> str:
    """Inline-styled HTML digest. Email HTML must never rely on external CSS."""
    def esc(s: str) -> str:
        return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    def row(t: Dict[str, Any]) -> str:
        return (
            '<tr><td style="padding:12px 16px;border-bottom:1px solid #E5E7EB;'
            'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif;'
            'font-size:14px;color:#0F172A;">'
            f'<div style="font-weight:600;color:#0F172A;">{esc(t.get("heading",""))}</div>'
            f'<div style="margin-top:4px;color:#475569;font-size:13px;">{esc(t.get("body",""))}</div>'
            f'<div style="margin-top:6px;font-size:11px;color:#94A3B8;">'
            f'{esc(t.get("resource_id") or "—")} · {esc(t.get("created_at","")[:10])}'
            '</div></td></tr>'
        )

    pending_rows = "".join(row(t) for t in pending) or (
        '<tr><td style="padding:24px 16px;text-align:center;color:#94A3B8;'
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;">'
        'No new pending tips this week.</td></tr>'
    )
    promoted_rows = "".join(row(t) for t in promoted_recent) or ""

    # Recovery funnel one-liner — a tiny "green day" summary so a healthy
    # week doesn't require opening the dashboard to know it. Only rendered
    # when funnel_line was supplied and has actual open activity.
    funnel_html = ''
    if funnel_line and funnel_line.get("opens_total", 0) > 0:
        share_pct = round(funnel_line.get("share", 0.0) * 100)
        active = int(funnel_line.get("active_alerts", 0))
        alert_txt = (
            f'<span style="color:#B45309;">{active} active drop alert{"" if active == 1 else "s"}</span>'
            if active > 0
            else '<span style="color:#059669;">no active drop alerts</span>'
        )
        funnel_html = (
            '<tr><td style="padding:16px 24px 4px;font-family:-apple-system,sans-serif;'
            'font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748B;'
            'font-weight:600;">Recovery funnel</td></tr>'
            '<tr><td style="padding:0 24px 12px;font-family:-apple-system,sans-serif;'
            'font-size:14px;color:#0F172A;line-height:1.5;">'
            f'<strong>{share_pct}%</strong> magic-link share this week '
            f'<span style="color:#94A3B8;">'
            f'({funnel_line.get("magic", 0)} magic + {funnel_line.get("manual", 0)} manual) — '
            f'</span>{alert_txt}.'
            '</td></tr>'
        )

    unsubscribe_html = ''
    if unsubscribe_url:
        unsubscribe_html = (
            '<tr><td style="padding:8px 24px 20px;font-family:-apple-system,sans-serif;'
            'font-size:11px;color:#94A3B8;text-align:center;border-top:1px solid #E5E7EB;">'
            'You are receiving this because you enabled weekly Iron Rabbit digests. '
            f'<a href="{esc(unsubscribe_url)}" style="color:#6366F1;text-decoration:underline;">'
            'Unsubscribe</a> to stop future emails. You can re-enable them anytime in the admin dashboard.'
            '</td></tr>'
        )

    return (
        '<!DOCTYPE html><html><body style="margin:0;padding:24px;'
        'background:#0B1221;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:640px;margin:0 auto;background:#FFFFFF;border-radius:16px;'
        'overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.15);">'
        '<tr><td style="padding:24px 24px 16px;background:linear-gradient(135deg,#6366F1,#EC4899);'
        'color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">'
        '<div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.9;">'
        'Iron Rabbit</div>'
        '<div style="font-size:22px;font-weight:700;margin-top:4px;">Community Digest</div>'
        f'<div style="font-size:12px;opacity:0.85;margin-top:4px;">Generated {esc(generated_at)}</div>'
        '</td></tr>'
        + funnel_html +
        '<tr><td style="padding:20px 24px 8px;font-family:-apple-system,sans-serif;'
        'font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748B;'
        'font-weight:600;">Pending review</td></tr>'
        f'<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{pending_rows}</table></td></tr>'
        + (
            '<tr><td style="padding:20px 24px 8px;font-family:-apple-system,sans-serif;'
            'font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#64748B;'
            'font-weight:600;">Recently promoted</td></tr>'
            f'<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">{promoted_rows}</table></td></tr>'
            if promoted_recent else ''
        ) +
        '<tr><td style="padding:20px 24px 24px;font-family:-apple-system,sans-serif;'
        'font-size:12px;color:#94A3B8;text-align:center;">'
        'Open the Community Dashboard to moderate.'
        '</td></tr>'
        + unsubscribe_html +
        '</table></body></html>'
    )


async def _load_digest_config() -> Dict[str, Any]:
    """Read the single app_config doc keyed by _id='digest'. Defaults fill in
    when the doc is missing so first-run works without a migration."""
    doc = await db.app_config.find_one({"_id": "digest"}) or {}
    return {
        "enabled": bool(doc.get("enabled", True)),
        "last_sent_at": doc.get("last_sent_at"),
        "unsubscribe_token": doc.get("unsubscribe_token") or "",
    }


async def _ensure_unsubscribe_token() -> str:
    """Generate + store the unsubscribe token if missing. Idempotent."""
    cfg = await _load_digest_config()
    if cfg["unsubscribe_token"]:
        return cfg["unsubscribe_token"]
    tok = str(uuid.uuid4()).replace("-", "")
    await db.app_config.update_one(
        {"_id": "digest"}, {"$set": {"unsubscribe_token": tok}}, upsert=True,
    )
    return tok


async def send_digest_now(*, dry_run: bool = False, force_when_empty: bool = True) -> DigestSendResponse:
    """Core digest routine shared by the admin API endpoint and the weekly
    cron. Returns a DigestSendResponse; the callers wrap it into a route
    response or a log line."""
    cfg = await _load_digest_config()
    pending = await db.community_tips.find(
        {"$or": [{"status": "pending"}, {"status": {"$exists": False}}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)
    promoted_recent = await db.community_tips.find(
        {"status": "promoted"}, {"_id": 0},
    ).sort("promoted_at", -1).to_list(10)

    # Recovery-funnel summary for the past 7 days. Kept inline (no separate
    # helper import) so the digest keeps its self-contained shape.
    from datetime import timedelta as _timedelta
    now_utc = datetime.now(timezone.utc)
    since = now_utc - _timedelta(days=7)
    open_counts: Dict[str, int] = {}
    async for r in db.recovery_events.aggregate([
        {"$match": {"at": {"$gte": since},
                    "event": {"$in": ["magic_link_opened", "manual_entry_opened"]}}},
        {"$group": {"_id": "$event", "n": {"$sum": 1}}},
    ]):
        open_counts[r["_id"]] = int(r["n"])
    magic = open_counts.get("magic_link_opened", 0)
    manual = open_counts.get("manual_entry_opened", 0)
    opens_total = magic + manual
    active_alerts = await db.recovery_alerts.count_documents({
        "$and": [
            {"$or": [{"dismissed_at": {"$exists": False}}, {"dismissed_at": None}]},
            {"$or": [
                {"snooze_until": {"$exists": False}},
                {"snooze_until": None},
                {"snooze_until": {"$lt": now_utc}},
            ]},
        ],
    })
    funnel_line = {
        "share": (magic / opens_total) if opens_total else 0.0,
        "magic": magic,
        "manual": manual,
        "opens_total": opens_total,
        "active_alerts": active_alerts,
    }

    counts = {"pending": len(pending), "promoted": len(promoted_recent)}
    if not force_when_empty and counts["pending"] == 0:
        return DigestSendResponse(
            ok=True, counts=counts, dry_run=dry_run,
            reason="skipped · no pending tips",
            sent_to=ADMIN_DIGEST_EMAIL or None,
        )

    generated_at = datetime.now(timezone.utc).strftime("%b %d, %Y %H:%M UTC")
    unsub_token = await _ensure_unsubscribe_token()
    public_base = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")
    if not public_base:
        public_base = (os.environ.get("CORS_ORIGINS", "").split(",")[0] or "").strip().rstrip("/")
    unsubscribe_url = f"{public_base}/api/community/digest/unsubscribe?token={unsub_token}" if public_base else None
    html = _render_digest_html(pending, promoted_recent, generated_at, unsubscribe_url, funnel_line=funnel_line)

    if dry_run:
        return DigestSendResponse(
            ok=True, counts=counts, dry_run=True,
            sent_to=ADMIN_DIGEST_EMAIL or None,
            reason=f"dry_run · {len(html)} chars",
        )
    if not cfg["enabled"]:
        return DigestSendResponse(ok=False, counts=counts, dry_run=False,
                                  reason="digest disabled (unsubscribed)")
    if not RESEND_API_KEY:
        return DigestSendResponse(ok=False, counts=counts, dry_run=False,
                                  reason="RESEND_API_KEY not configured on server")
    if not ADMIN_DIGEST_EMAIL or not SENDER_EMAIL:
        return DigestSendResponse(ok=False, counts=counts, dry_run=False,
                                  reason="ADMIN_DIGEST_EMAIL or SENDER_EMAIL not configured on server")

    import resend as _resend
    _resend.api_key = RESEND_API_KEY
    params = {
        "from": f"Iron Rabbit <{SENDER_EMAIL}>",
        "to": [ADMIN_DIGEST_EMAIL],
        "subject": f"Iron Rabbit — Community Digest ({counts['pending']} pending)",
        "html": html,
    }
    try:
        email = await asyncio.to_thread(_resend.Emails.send, params)
    except Exception as e:
        logger.exception("Resend send failed")
        return DigestSendResponse(ok=False, counts=counts, dry_run=False,
                                  reason=f"Resend error: {str(e)[:200]}")

    await db.app_config.update_one(
        {"_id": "digest"},
        {"$set": {"last_sent_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return DigestSendResponse(
        ok=True, counts=counts, dry_run=False,
        sent_to=ADMIN_DIGEST_EMAIL,
        email_id=(email or {}).get("id") if isinstance(email, dict) else None,
    )


@router.post("/community/digest/send", response_model=DigestSendResponse, dependencies=[Depends(require_admin)])
async def send_community_digest(dry_run: bool = False):
    """Admin-only: fire the digest immediately. `?dry_run=1` previews only."""
    return await send_digest_now(dry_run=dry_run, force_when_empty=True)


async def _digest_status_dict() -> DigestStatusResponse:
    cfg = await _load_digest_config()
    next_run = None
    try:
        job = scheduler.get_job("weekly_digest") if scheduler else None
        if job and job.next_run_time:
            next_run = job.next_run_time.astimezone(timezone.utc).isoformat()
    except Exception:
        pass
    return DigestStatusResponse(
        enabled=cfg["enabled"],
        last_sent_at=cfg["last_sent_at"],
        sender_email=SENDER_EMAIL or "",
        recipient_email=ADMIN_DIGEST_EMAIL or "",
        resend_key_configured=bool(RESEND_API_KEY),
        scheduler_next_run=next_run,
    )


@router.get("/community/digest/status", response_model=DigestStatusResponse, dependencies=[Depends(require_admin)])
async def digest_status():
    """Admin-only: on/off flag + last-sent stamp for the dashboard chip."""
    return await _digest_status_dict()


@router.post("/community/digest/toggle", response_model=DigestStatusResponse, dependencies=[Depends(require_admin)])
async def digest_toggle(payload: DigestToggleRequest):
    """Admin-only: flip the digest on/off flag from the dashboard."""
    await db.app_config.update_one(
        {"_id": "digest"}, {"$set": {"enabled": bool(payload.enabled)}}, upsert=True,
    )
    return await _digest_status_dict()


@router.get("/community/digest/unsubscribe")
async def digest_unsubscribe(token: str):
    """Public: unsubscribe link inside each digest email. Never leaks whether
    the token matched — the confirmation page adapts."""
    cfg = await _load_digest_config()
    matched = bool(token) and token == cfg["unsubscribe_token"]
    if matched:
        await db.app_config.update_one(
            {"_id": "digest"}, {"$set": {"enabled": False}}, upsert=True,
        )
    body = (
        '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Iron Rabbit — Digest paused</title></head>'
        '<body style="margin:0;padding:48px 24px;background:#0B1221;color:#F1F5F9;'
        'font-family:-apple-system,sans-serif;text-align:center;">'
        '<div style="max-width:480px;margin:0 auto;background:#0F172A;border:1px solid rgba(255,255,255,0.1);'
        'border-radius:20px;padding:32px;">'
        '<div style="width:48px;height:48px;margin:0 auto 16px;border-radius:50%;'
        'background:linear-gradient(135deg,#6366F1,#EC4899);"></div>'
        '<div style="font-size:20px;font-weight:700;margin-bottom:8px;">'
        + ('You are unsubscribed' if matched else 'Link expired')
        + '</div>'
        '<div style="font-size:14px;color:#94A3B8;line-height:1.6;">'
        + ('Weekly Iron Rabbit digest emails have been paused. You can re-enable them anytime from the Community Dashboard.'
           if matched else
           'This unsubscribe link is no longer valid. If you meant to stop future digests, sign in to the admin dashboard and toggle "Weekly digest" off.')
        + '</div></div></body></html>'
    )
    return HTMLResponse(content=body)
