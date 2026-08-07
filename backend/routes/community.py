"""Community tip endpoints: submit, list, promote, reject, delete, promoted,
featured, parse, contributors. Digest + analytics have their own routers."""
from __future__ import annotations

import asyncio
import json as _json
import logging
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from deps import (
    db, EMERGENT_LLM_KEY,
    RESEND_API_KEY, SENDER_EMAIL,
    require_admin,
)
from models.community import (
    CommunityTipRequest, CommunityTipResponse, CommunityTip, CommunityTipList,
    PromotedTip, FeaturedTipResponse,
    ParseTipsRequest, ParseTipsResponse, ParsedCard,
    Contributor, ContributorsResponse,
    NicknameReserveRequest, NicknameStatusResponse,
    NicknameRecoveryRequestBody, NicknameRecoveryVerifyBody, NicknameRecoveryResponse,
)

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)

# Nicknames: alphanumeric + underscore, 2-20 chars. Kept intentionally strict
# so they render cleanly next to headings and don't collide with markdown.
_NICKNAME_RE = re.compile(r"^[A-Za-z0-9_]{2,20}$")


def _sanitize_nickname(value: Optional[str]) -> Optional[str]:
    """Normalize a submitted nickname. Returns None for absent/invalid input
    so the DB never stores '' or garbage. Case is preserved as typed."""
    if value is None:
        return None
    v = str(value).strip()
    if not v:
        return None
    if not _NICKNAME_RE.match(v):
        return None
    return v


def _normalize_tip_row(d: Dict[str, Any]) -> Dict[str, Any]:
    """Fill defaults for legacy MongoDB rows so pydantic validation never crashes."""
    d.setdefault("status", "pending")
    d.setdefault("promoted_at", None)
    d.setdefault("resource_id", "")
    d.setdefault("theme", "")
    d.setdefault("contributor_email", None)
    d.setdefault("contributor_opt_in", False)
    d.setdefault("thank_you_sent_at", None)
    d.setdefault("nickname", None)
    return d


async def _nickname_owner_email(nickname: str) -> Optional[str]:
    """Find the email that has claimed this nickname, if any.

    Priority order (implicit reservation):
      1. explicit reservation in `nickname_reservations`
      2. first tip that used this nickname + a non-empty contributor_email
    Anonymous prior use (nickname without any email) leaves the name free
    for later explicit claim by an email owner.
    Returns lowercased email or None if free."""
    # Explicit reservation wins
    r = await db.nickname_reservations.find_one({"nickname": nickname})
    if r and r.get("email"):
        return str(r["email"]).lower()
    # Implicit: first tip that paired this nickname + email
    doc = await db.community_tips.find_one(
        {"nickname": nickname, "contributor_email": {"$exists": True, "$nin": [None, ""]}},
        {"_id": 0, "contributor_email": 1},
        sort=[("created_at", 1)],
    )
    if doc and doc.get("contributor_email"):
        return str(doc["contributor_email"]).lower()
    return None


@router.post("/community/tip", response_model=CommunityTipResponse)
async def submit_community_tip(payload: CommunityTipRequest):
    """Anonymously receive a Quick Guide tip. Nothing that identifies the
    sender is stored — only what they typed and the guide it belongs to.

    Nickname reservation: if a nickname has already been claimed (via
    explicit reservation OR by a prior tip with a matching email), the
    submission must use the same email or we reject with 409."""
    heading = (payload.heading or "").strip()[:120]
    body = (payload.body or "").strip()[:800]
    if not heading and not body:
        raise HTTPException(status_code=400, detail="heading or body required")
    contributor_email = (payload.contributor_email or "").strip().lower()[:200]
    if contributor_email and "@" not in contributor_email:
        contributor_email = ""
    contributor_opt_in = bool(payload.contributor_opt_in) and bool(contributor_email)
    nickname = _sanitize_nickname(payload.nickname)
    if nickname:
        owner = await _nickname_owner_email(nickname)
        # Owner exists AND either the incoming email is missing OR different → block.
        if owner and (not contributor_email or contributor_email != owner):
            raise HTTPException(
                status_code=409,
                detail=f"Nickname '@{nickname}' is claimed. Include the original owner's email to reuse it, or pick another.",
            )
    doc = {
        "id": str(uuid.uuid4()),
        "heading": heading,
        "body": body,
        "resource_id": (payload.resource_id or "")[:20],
        "theme": (payload.theme or "")[:200],
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "promoted_at": None,
        "contributor_email": contributor_email or None,
        "contributor_opt_in": contributor_opt_in,
        "thank_you_sent_at": None,
        "nickname": nickname,
    }
    try:
        await db.community_tips.insert_one(doc)
    except Exception as e:
        logger.exception("Failed to store community tip: %s", e)
        raise HTTPException(status_code=500, detail="Storage error")
    return CommunityTipResponse(ok=True, id=doc["id"])


@router.get("/community/tips", response_model=CommunityTipList, dependencies=[Depends(require_admin)])
async def list_community_tips(status_filter: Optional[str] = None):
    """Admin-only: list submitted tips. Optional `status_filter=pending|promoted|rejected`."""
    query: Dict[str, Any] = {}
    if status_filter is not None:
        if status_filter not in ("pending", "promoted", "rejected"):
            raise HTTPException(status_code=400, detail="Invalid status_filter")
        query = (
            {"$or": [{"status": "pending"}, {"status": {"$exists": False}}]}
            if status_filter == "pending"
            else {"status": status_filter}
        )
    docs = await db.community_tips.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for d in docs:
        _normalize_tip_row(d)
    counts = {"pending": 0, "promoted": 0, "rejected": 0}
    async for row in db.community_tips.aggregate([{"$group": {"_id": "$status", "n": {"$sum": 1}}}]):
        key = row["_id"] or "pending"
        counts[key] = counts.get(key, 0) + int(row["n"])
    return CommunityTipList(tips=[CommunityTip(**d) for d in docs], counts=counts)


@router.post("/community/tips/{tip_id}/promote", response_model=CommunityTip, dependencies=[Depends(require_admin)])
async def promote_community_tip(tip_id: str):
    """Admin-only: mark a submitted tip as promoted. Fires a warm thank-you
    email async (silent-skip when Resend isn't configured)."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.community_tips.update_one(
        {"id": tip_id}, {"$set": {"status": "promoted", "promoted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tip not found")
    doc = _normalize_tip_row(await db.community_tips.find_one({"id": tip_id}, {"_id": 0}))
    if doc.get("contributor_opt_in") and doc.get("contributor_email") and not doc.get("thank_you_sent_at"):
        asyncio.create_task(_send_thank_you(doc))
    return CommunityTip(**doc)


@router.post("/community/tips/{tip_id}/reject", response_model=CommunityTip, dependencies=[Depends(require_admin)])
async def reject_community_tip(tip_id: str):
    """Admin-only: reject a tip (soft-delete so it can be restored)."""
    result = await db.community_tips.update_one(
        {"id": tip_id}, {"$set": {"status": "rejected", "promoted_at": None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tip not found")
    return CommunityTip(**_normalize_tip_row(await db.community_tips.find_one({"id": tip_id}, {"_id": 0})))


@router.delete("/community/tips/{tip_id}", dependencies=[Depends(require_admin)])
async def delete_community_tip(tip_id: str):
    """Admin-only: hard-delete a tip permanently."""
    result = await db.community_tips.delete_one({"id": tip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tip not found")
    return {"ok": True}


@router.get("/community/promoted", response_model=List[PromotedTip])
async def list_promoted_tips():
    """Public: promoted tips for the Quick Guide's Community cards."""
    docs = await db.community_tips.find(
        {"status": "promoted"},
        {"_id": 0, "id": 1, "heading": 1, "body": 1, "resource_id": 1, "promoted_at": 1, "nickname": 1},
    ).sort("promoted_at", -1).to_list(500)
    for d in docs:
        d.setdefault("resource_id", "")
        d.setdefault("promoted_at", None)
        d.setdefault("nickname", None)
    return [PromotedTip(**d) for d in docs]


@router.post("/admin/verify", dependencies=[Depends(require_admin)])
async def admin_verify():
    """Ping endpoint for the admin gate — 200 when the header token matches."""
    return {"ok": True}


@router.get("/community/featured", response_model=FeaturedTipResponse)
async def featured_community_tip():
    """Public: deterministic pick of one promoted tip by today's UTC date."""
    docs = await db.community_tips.find(
        {"status": "promoted"},
        {"_id": 0, "id": 1, "heading": 1, "body": 1, "resource_id": 1, "promoted_at": 1, "nickname": 1},
    ).sort("promoted_at", -1).to_list(500)
    if not docs:
        return FeaturedTipResponse(tip=None, total_promoted=0)
    idx = datetime.now(timezone.utc).date().toordinal() % len(docs)
    chosen = docs[idx]
    chosen.setdefault("resource_id", "")
    chosen.setdefault("promoted_at", None)
    chosen.setdefault("nickname", None)
    return FeaturedTipResponse(tip=PromotedTip(**chosen), total_promoted=len(docs))


@router.get("/community/nicknames/{nickname}/status", response_model=NicknameStatusResponse)
async def nickname_status(nickname: str, email: Optional[str] = None):
    """Public availability check for the share dialog."""
    clean = _sanitize_nickname(nickname)
    if not clean:
        return NicknameStatusResponse(nickname=nickname, available=False, reason="invalid")
    email_norm = (email or "").strip().lower()
    owner = await _nickname_owner_email(clean)
    if not owner:
        return NicknameStatusResponse(nickname=clean, available=True, reason="free")
    if email_norm and email_norm == owner:
        return NicknameStatusResponse(nickname=clean, available=True, reason="claimed_by_you", owned_by_you=True)
    return NicknameStatusResponse(nickname=clean, available=False, reason="taken")


@router.post("/community/nicknames/reserve", response_model=NicknameStatusResponse)
async def reserve_nickname(payload: NicknameReserveRequest):
    """Explicit pre-claim of a nickname. Idempotent for same (nickname,email)."""
    clean = _sanitize_nickname(payload.nickname)
    if not clean:
        raise HTTPException(status_code=400, detail="Invalid nickname format")
    email_norm = (payload.email or "").strip().lower()[:200]
    if not email_norm or "@" not in email_norm:
        raise HTTPException(status_code=400, detail="Valid email required")
    owner = await _nickname_owner_email(clean)
    if owner and owner != email_norm:
        raise HTTPException(status_code=409, detail=f"Nickname '@{clean}' is already claimed by another email")
    await db.nickname_reservations.update_one(
        {"nickname": clean},
        {"$set": {
            "nickname": clean,
            "email": email_norm,
            "reserved_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return NicknameStatusResponse(nickname=clean, available=True, reason="claimed_by_you", owned_by_you=True)



def _mask_email(email: str) -> str:
    """Return a redacted address safe to display: a***@d***.com."""
    if not email or "@" not in email:
        return ""
    local, _, domain = email.partition("@")
    _, _, dtail = domain.rpartition(".")
    return f"{local[:1]}***@***.{dtail}"


@router.post("/community/nicknames/{nickname}/recovery", response_model=NicknameRecoveryResponse)
async def request_nickname_recovery(nickname: str, payload: NicknameRecoveryRequestBody):
    """Public: request an unlock code for a claimed nickname. Code is
    emailed to the ORIGINAL owner. Silent-fails (delivered=false) when
    Resend isn't configured — matches the digest pattern."""
    clean = _sanitize_nickname(nickname)
    if not clean:
        raise HTTPException(status_code=400, detail="Invalid nickname format")
    owner = await _nickname_owner_email(clean)
    if not owner:
        return NicknameRecoveryResponse(ok=True, delivered=False, reason="not-claimed")

    import secrets
    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    await db.nickname_recoveries.update_one(
        {"nickname": clean},
        {"$set": {
            "nickname": clean, "email": owner, "code": code,
            "expires_at": expires_at,
            "requested_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )

    delivered = False
    if RESEND_API_KEY and SENDER_EMAIL:
        try:
            import resend as _resend
            _resend.api_key = RESEND_API_KEY
            html = (
                '<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#0B1221;'
                'font-family:-apple-system,sans-serif;">'
                '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
                'style="max-width:520px;margin:0 auto;background:#FFF;border-radius:16px;overflow:hidden;">'
                '<tr><td style="padding:24px;background:linear-gradient(135deg,#6366F1,#EC4899);color:#FFF;">'
                '<div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;opacity:.9;">Iron Rabbit</div>'
                f'<div style="font-size:22px;font-weight:700;margin-top:4px;">Recover @{clean}</div>'
                '</td></tr>'
                '<tr><td style="padding:20px 24px;font-size:15px;color:#0F172A;line-height:1.6;">'
                f'Someone (probably you) asked to reclaim <strong>@{clean}</strong>. Enter this code in the app to move ownership to a new email:'
                f'<div style="margin:20px 0;padding:16px;text-align:center;background:#F1F5F9;border-radius:8px;font-size:32px;font-weight:800;letter-spacing:6px;color:#0F172A;">{code}</div>'
                '<div style="font-size:12px;color:#64748B;">Code expires in 30 minutes. Ignore this email if you didn&#39;t request it.</div>'
                '</td></tr></table></body></html>'
            )
            await asyncio.to_thread(_resend.Emails.send, {
                "from": f"Iron Rabbit <{SENDER_EMAIL}>",
                "to": [owner],
                "subject": f"Iron Rabbit — unlock code for @{clean}",
                "html": html,
            })
            delivered = True
        except Exception:
            logger.exception("nickname recovery email failed")

    return NicknameRecoveryResponse(
        ok=True, delivered=delivered,
        reason="sent" if delivered else "email disabled",
        masked_email=_mask_email(owner),
    )


@router.post("/community/nicknames/{nickname}/recovery/verify", response_model=NicknameStatusResponse)
async def verify_nickname_recovery(nickname: str, payload: NicknameRecoveryVerifyBody):
    """Public: submit unlock code + new_email to transfer ownership. Single-use."""
    clean = _sanitize_nickname(nickname)
    if not clean or clean != _sanitize_nickname(payload.nickname):
        raise HTTPException(status_code=400, detail="Invalid nickname")
    new_email = (payload.new_email or "").strip().lower()[:200]
    if not new_email or "@" not in new_email:
        raise HTTPException(status_code=400, detail="Valid new_email required")
    code = (payload.code or "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="Code required")

    rec = await db.nickname_recoveries.find_one({"nickname": clean, "code": code})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid code")
    expires = rec.get("expires_at")
    if isinstance(expires, str):
        try: expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
        except Exception: expires = None
    # BSON dates come back naive from motor — coerce to UTC before compare.
    if expires and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if not expires or expires < datetime.now(timezone.utc):
        await db.nickname_recoveries.delete_one({"_id": rec["_id"]})
        raise HTTPException(status_code=410, detail="Code expired — request a new one")

    old_email = rec.get("email")
    await db.nickname_reservations.update_one(
        {"nickname": clean},
        {"$set": {
            "nickname": clean, "email": new_email,
            "reserved_at": datetime.now(timezone.utc).isoformat(),
            "recovered": True,
        }},
        upsert=True,
    )
    await db.community_tips.update_many(
        {"nickname": clean, "contributor_email": old_email},
        {"$set": {"contributor_email": new_email}},
    )
    await db.nickname_recoveries.delete_one({"_id": rec["_id"]})
    return NicknameStatusResponse(
        nickname=clean, available=True, reason="claimed_by_you", owned_by_you=True,
    )




@router.get("/community/contributors", response_model=ContributorsResponse)
async def list_contributors():
    """Public: aggregate promoted tips by nickname. Powers the Contributor Wall.
    Only tips with a non-empty nickname show up here."""
    pipeline = [
        {"$match": {"status": "promoted", "nickname": {"$exists": True, "$nin": [None, ""]}}},
        {"$sort": {"promoted_at": -1}},
        {"$group": {
            "_id": "$nickname",
            "tip_count": {"$sum": 1},
            "latest_promoted_at": {"$first": "$promoted_at"},
            "latest_heading": {"$first": "$heading"},
        }},
        {"$sort": {"tip_count": -1, "latest_promoted_at": -1}},
    ]
    rows: List[Contributor] = []
    async for r in db.community_tips.aggregate(pipeline):
        rows.append(Contributor(
            nickname=r["_id"] or "",
            tip_count=int(r["tip_count"]),
            latest_promoted_at=r.get("latest_promoted_at"),
            latest_heading=r.get("latest_heading") or "",
        ))
    return ContributorsResponse(contributors=rows, total=len(rows))


@router.post("/community/tips/parse", response_model=ParseTipsResponse)
async def parse_tips_from_text(payload: ParseTipsRequest):
    """Split pasted text into clean {heading, body} cards via the Emergent LLM.
    Shared by the admin bulk-import flow and the Quick Guide paste-multiple flow."""
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if len(text) > 8000:
        raise HTTPException(status_code=400, detail="text is too long (max 8000 chars)")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    system_msg = (
        "You are a tip-formatter for the Iron Rabbit app. You will receive raw, "
        "possibly-messy text containing one or more short productivity/organization "
        "tips. Split it into individual cards. For each card provide:\n"
        "  - heading: max 60 chars, imperative or descriptive title.\n"
        "  - body: max 300 chars, clear one- or two-sentence explanation.\n"
        "Rules: no emojis, no markdown, plain UTF-8 only. Never invent tips that "
        "aren't in the source. If the text is truly a single tip, return one card. "
        "If it's clearly not tip-like, return an empty array.\n"
        "Return ONLY valid minified JSON matching exactly this shape:\n"
        '{"cards":[{"heading":"...","body":"..."}]}'
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"parse-tips-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    try:
        result = await chat.send_message(UserMessage(text=f"TEXT:\n{text}"))
    except Exception as e:
        logger.exception("parse_tips_from_text LLM call failed")
        raise HTTPException(status_code=502, detail=f"Parse failed: {str(e)[:200]}")

    raw = str(result or "").strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    first_brace = raw.find("{")
    last_brace = raw.rfind("}")
    if first_brace >= 0 and last_brace > first_brace:
        raw = raw[first_brace:last_brace + 1]

    try:
        parsed = _json.loads(raw)
    except Exception:
        logger.warning("parse_tips_from_text: model did not return JSON: %s", raw[:200])
        raise HTTPException(status_code=502, detail="Could not parse model output")

    raw_cards = parsed.get("cards") if isinstance(parsed, dict) else None
    if not isinstance(raw_cards, list):
        raise HTTPException(status_code=502, detail="Model output missing `cards` array")

    cards: List[ParsedCard] = []
    for c in raw_cards[:20]:
        if not isinstance(c, dict):
            continue
        heading = str(c.get("heading") or "").strip()[:120]
        body = str(c.get("body") or "").strip()[:800]
        if not heading and not body:
            continue
        cards.append(ParsedCard(heading=heading or "Untitled tip", body=body))
    return ParseTipsResponse(cards=cards)


# =============================================================================
# Thank-you email (fired by promote endpoint). Kept in this module so its
# lifecycle stays next to the tip it belongs to.
# =============================================================================
async def _send_thank_you(tip: Dict[str, Any]) -> None:
    """Warm 'your tip is live' email to a contributor who opted in."""
    if not RESEND_API_KEY or not SENDER_EMAIL:
        logger.info("thank-you skipped: Resend not configured (tip %s)", tip.get("id"))
        return
    to_addr = str(tip.get("contributor_email") or "").strip().lower()
    if not to_addr or "@" not in to_addr:
        return
    heading = str(tip.get("heading") or "your tip")

    def esc(s: str) -> str:
        return (s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

    body_html = ""
    if tip.get("body"):
        body_html = '<br><span style="color:#475569;font-size:14px;">' + esc(tip.get("body") or "") + '</span>'
    nickname = tip.get("nickname")
    byline_html = (
        f'<div style="margin-top:6px;font-size:12px;color:#64748B;">— @{esc(nickname)}</div>'
        if nickname else ""
    )
    html = (
        '<!DOCTYPE html><html><body style="margin:0;padding:24px;'
        'background:#0B1221;font-family:-apple-system,BlinkMacSystemFont,sans-serif;">'
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" '
        'style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:16px;'
        'overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.15);">'
        '<tr><td style="padding:24px 24px 8px;background:linear-gradient(135deg,#10B981,#0284C7);'
        'color:#FFFFFF;">'
        '<div style="font-size:12px;text-transform:uppercase;letter-spacing:1.5px;opacity:0.9;">'
        'Iron Rabbit</div>'
        '<div style="font-size:22px;font-weight:700;margin-top:4px;">Your tip just went live 🎉</div>'
        '</td></tr>'
        '<tr><td style="padding:20px 24px;font-size:15px;color:#0F172A;line-height:1.6;">'
        'Hey — a quick note to say your tip'
        f'<div style="margin:12px 0;padding:12px 14px;border-left:3px solid #10B981;'
        f'background:#F0FDF4;border-radius:0 8px 8px 0;">'
        f'<strong>{esc(heading)}</strong>'
        f'{body_html}{byline_html}'
        '</div>'
        'just went live in Iron Rabbit and is being seen by folks opening the '
        'Quick Guide right now. Thanks for making the app better for everyone.'
        '<div style="margin-top:24px;font-size:13px;color:#64748B;">— The Iron Rabbit team</div>'
        '</td></tr>'
        '<tr><td style="padding:0 24px 20px;font-size:11px;color:#94A3B8;text-align:center;">'
        'You received this because you opted in to promotion updates when submitting your tip. '
        'No further emails will be sent unless another of your tips is promoted.'
        '</td></tr>'
        '</table></body></html>'
    )
    import resend as _resend
    _resend.api_key = RESEND_API_KEY
    params = {
        "from": f"Iron Rabbit <{SENDER_EMAIL}>",
        "to": [to_addr],
        "subject": f"Your Iron Rabbit tip is live — {heading[:60]}",
        "html": html,
    }
    try:
        email = await asyncio.to_thread(_resend.Emails.send, params)
    except Exception as e:
        logger.exception("thank-you send failed for tip %s: %s", tip.get("id"), e)
        return
    email_id = (email or {}).get("id") if isinstance(email, dict) else None
    await db.community_tips.update_one(
        {"id": tip.get("id")},
        {"$set": {
            "thank_you_sent_at": datetime.now(timezone.utc).isoformat(),
            "thank_you_email_id": email_id,
        }},
    )
    logger.info("thank-you sent for tip %s → %s (id=%s)", tip.get("id"), to_addr, email_id)
