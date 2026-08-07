from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import aiofiles
import shutil

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Emergent LLM (universal) key — used only for the /api/translate endpoint.
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ================== MODELS ==================

class AlarmSettings(BaseModel):
    enabled: bool = False
    datetime: Optional[str] = None
    sound: str = "bell"  # bell, chime, signal
    haptic: bool = False

class RecurringSettings(BaseModel):
    enabled: bool = False
    frequency: str = "weekly"  # daily, weekly, monthly
    days: List[int] = []  # 0-6 for weekly (Mon-Sun), 1-31 for monthly

class NoteBase(BaseModel):
    title: str
    content: str = ""
    color: str = "purple"  # purple, cyan, lime, pink, orange
    category: str = ""  # user-defined category/tag
    subcategory: str = ""  # subcategory under main category
    alarm: Optional[AlarmSettings] = None
    recurring: Optional[RecurringSettings] = None
    order: int = 0  # for drag-and-drop ordering
    template_id: Optional[str] = None  # if created from template

class NoteCreate(NoteBase):
    pass

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    alarm: Optional[AlarmSettings] = None
    recurring: Optional[RecurringSettings] = None
    last_viewed: Optional[str] = None

class Note(NoteBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_viewed: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class NoteTemplate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    title: str = ""
    content: str = ""
    color: str = "purple"
    category: str = ""
    subcategory: str = ""

class NoteTemplateCreate(BaseModel):
    name: str
    title: str = ""
    content: str = ""
    color: str = "purple"
    category: str = ""
    subcategory: str = ""

class ReorderRequest(BaseModel):
    note_ids: List[str]  # ordered list of note IDs

class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_settings"
    logo_url: str = ""
    header_bg: str = "https://images.unsplash.com/photo-1771814536315-ae11952227fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHw0fHxkYXJrJTIwZnV0dXJpc3RpYyUyMGFic3RyYWN0JTIwdGV4dHVyZXxlbnwwfHx8fDE3NzMxNjM2OTR8MA&ixlib=rb-4.1.0&q=85"
    website_url: str = "https://ironrabbitapps.com"
    company_name: str = "Iron Rabbit"

class SettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    header_bg: Optional[str] = None
    website_url: Optional[str] = None
    company_name: Optional[str] = None

# ================== NOTES ENDPOINTS ==================

@api_router.get("/")
async def root():
    return {"message": "LuminaTask API"}

from fastapi import status
from fastapi.responses import JSONResponse

@api_router.post("/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
async def create_note(note_input: NoteCreate):
    note = Note(**note_input.model_dump())
    doc = note.model_dump()
    await db.notes.insert_one(doc)
    return note

@api_router.get("/notes", response_model=List[Note])
async def get_notes():
    notes = await db.notes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return notes

@api_router.get("/notes/{note_id}", response_model=Note)
async def get_note(note_id: str):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

@api_router.put("/notes/{note_id}", response_model=Note)
async def update_note(note_id: str, note_update: NoteUpdate):
    existing = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")
    
    update_data = {k: v for k, v in note_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if "alarm" in update_data and update_data["alarm"]:
        update_data["alarm"] = update_data["alarm"].model_dump() if hasattr(update_data["alarm"], 'model_dump') else update_data["alarm"]
    
    if "recurring" in update_data and update_data["recurring"]:
        update_data["recurring"] = update_data["recurring"].model_dump() if hasattr(update_data["recurring"], 'model_dump') else update_data["recurring"]
    
    await db.notes.update_one({"id": note_id}, {"$set": update_data})
    updated = await db.notes.find_one({"id": note_id}, {"_id": 0})
    return updated

@api_router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    result = await db.notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}

# ================== REORDER ENDPOINT ==================

@api_router.post("/notes/reorder")
async def reorder_notes(reorder: ReorderRequest):
    for index, note_id in enumerate(reorder.note_ids):
        await db.notes.update_one({"id": note_id}, {"$set": {"order": index}})
    return {"message": "Notes reordered"}

# ================== TEMPLATES ENDPOINTS ==================

@api_router.post("/templates", response_model=NoteTemplate, status_code=status.HTTP_201_CREATED)
async def create_template(template_input: NoteTemplateCreate):
    template = NoteTemplate(**template_input.model_dump())
    doc = template.model_dump()
    await db.templates.insert_one(doc)
    return template

@api_router.get("/templates", response_model=List[NoteTemplate])
async def get_templates():
    templates = await db.templates.find({}, {"_id": 0}).to_list(100)
    return templates

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

# ================== CATEGORIES ENDPOINT ==================

@api_router.get("/categories")
async def get_categories():
    """Get all unique categories and subcategories"""
    notes = await db.notes.find({}, {"_id": 0, "category": 1, "subcategory": 1}).to_list(1000)
    categories = {}
    for note in notes:
        cat = note.get("category", "")
        subcat = note.get("subcategory", "")
        if cat:
            if cat not in categories:
                categories[cat] = set()
            if subcat:
                categories[cat].add(subcat)
    # Convert sets to lists for JSON
    return {cat: list(subs) for cat, subs in categories.items()}

# ================== SETTINGS ENDPOINTS ==================

@api_router.get("/settings", response_model=AppSettings)
async def get_settings():
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not settings:
        default = AppSettings()
        await db.settings.insert_one(default.model_dump())
        return default
    return settings

@api_router.put("/settings", response_model=AppSettings)
async def update_settings(settings_update: SettingsUpdate):
    update_data = {k: v for k, v in settings_update.model_dump().items() if v is not None}
    
    existing = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not existing:
        default = AppSettings(**update_data)
        await db.settings.insert_one(default.model_dump())
        return default
    
    await db.settings.update_one({"id": "app_settings"}, {"$set": update_data})
    updated = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    return updated

# ================== FILE UPLOAD ENDPOINTS ==================

@api_router.post("/upload/logo")
async def upload_logo(file: UploadFile = File(...)):
    """Upload a logo image file"""
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, png, gif, webp, svg")
    
    # Generate unique filename
    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"logo_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    # Save file
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Return the URL path
    return {"url": f"/api/uploads/{filename}"}

@api_router.post("/upload/header")
async def upload_header(file: UploadFile = File(...)):
    """Upload a header background image file"""
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, png, gif, webp")
    
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"header_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    
    async with aiofiles.open(filepath, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"url": f"/api/uploads/{filename}"}

@api_router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files"""
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)

# ================== TRANSLATION ENDPOINT ==================
class TranslateRequest(BaseModel):
    text: str
    target_lang: str  # human-readable language name, e.g. "Spanish", "Japanese"
    source_lang: Optional[str] = None  # optional; "auto" if omitted


class TranslateResponse(BaseModel):
    translated: str
    source_lang: Optional[str] = None
    target_lang: str


@api_router.post("/translate", response_model=TranslateResponse)
async def translate_text(payload: TranslateRequest):
    """Translate a note's text to a target language using the Emergent
    universal LLM key. Preserves line breaks. Returns only the translated
    text (no explanation, no extra prose)."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")
    text = (payload.text or "").strip()
    target = (payload.target_lang or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")
    if not target:
        raise HTTPException(status_code=400, detail="Target language is required")
    if len(text) > 12000:
        raise HTTPException(status_code=413, detail="Text too long (max 12,000 chars per request)")

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    src_hint = f"from {payload.source_lang} " if payload.source_lang and payload.source_lang != "auto" else ""
    system_msg = (
        "You are a professional literary translator. Translate the user's text "
        f"{src_hint}into {target}. "
        "Rules: (1) preserve line breaks, bullet marks, numbered lists, checklist markers, "
        "and any inline markdown or emoji; (2) do NOT add explanations, notes, transliterations, "
        "romanisation, or wrappers; (3) return ONLY the translated text and nothing else; "
        "(4) if the input is already in the target language, return it unchanged."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"translate-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    try:
        result = await chat.send_message(UserMessage(text=text))
    except Exception as e:
        logger.exception("Translation call failed")
        raise HTTPException(status_code=502, detail=f"Translation failed: {str(e)[:200]}")

    translated = str(result or "").strip()
    if not translated:
        raise HTTPException(status_code=502, detail="Empty translation from model")
    return TranslateResponse(
        translated=translated,
        source_lang=payload.source_lang or "auto",
        target_lang=target,
    )


# ================== OCR ENDPOINT ==================

class OCRRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/png"


class OCRResponse(BaseModel):
    extracted_text: str


_OCR_ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


@api_router.post("/ocr", response_model=OCRResponse)
async def ocr_image(payload: OCRRequest):
    """Extract every piece of visible text from an image using Claude
    Sonnet 4.6 vision. Returns the extracted text only — no descriptions,
    no analysis."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")

    b64 = (payload.image_base64 or "").strip()
    if b64.startswith("data:"):
        # Tolerate data URIs; strip the header.
        try:
            b64 = b64.split(",", 1)[1]
        except IndexError:
            raise HTTPException(status_code=400, detail="Malformed data URI")
    if not b64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    mime = (payload.mime_type or "").lower().strip()
    if mime not in _OCR_ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported mime type: {mime}. Use PNG/JPEG/WEBP.")

    # Approximate base64 size (bytes): len * 3/4
    approx_bytes = int(len(b64) * 3 / 4)
    if approx_bytes > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (>5 MB decoded)")

    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

    system_msg = (
        "You are an OCR engine. Extract EVERY piece of visible text from the "
        "user's image in reading order (top-to-bottom, left-to-right). "
        "Preserve line breaks between distinct visual lines. Preserve bullet "
        "markers, numbers, and checkbox states. Do NOT describe the image, "
        "do NOT add commentary, do NOT translate — return ONLY the text as it "
        "appears. If no text is visible, return the single word: NO_TEXT_FOUND."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"ocr-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    try:
        result = await chat.send_message(UserMessage(
            text="Extract all visible text from this image.",
            file_contents=[ImageContent(image_base64=b64)],
        ))
    except Exception as e:
        logger.exception("OCR call failed")
        raise HTTPException(status_code=502, detail=f"OCR failed: {str(e)[:200]}")

    text = str(result or "").strip()
    if text == "NO_TEXT_FOUND":
        text = ""
    return OCRResponse(extracted_text=text)


# ================== COMMUNITY TIPS ENDPOINT ==================
from fastapi import Header

ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")


def _require_admin(token: Optional[str]) -> None:
    """Validate the admin bearer token. Rejects when the env token is unset
    (safer default: no admin access rather than an empty match)."""
    if not ADMIN_TOKEN or not token or token.strip() != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Admin token required")


class CommunityTipRequest(BaseModel):
    heading: str
    body: str
    resource_id: Optional[str] = ""
    theme: Optional[str] = None
    # Optional contributor opt-in: when both provided, the admin promote flow
    # will send a friendly "your tip is live" email via Resend. Absent =
    # totally anonymous, current behaviour preserved.
    contributor_email: Optional[str] = None
    contributor_opt_in: Optional[bool] = False


class CommunityTipResponse(BaseModel):
    ok: bool
    id: str


class CommunityTip(BaseModel):
    id: str
    heading: str
    body: str
    resource_id: str = ""
    theme: str = ""
    status: str = "pending"  # pending | promoted | rejected
    created_at: str
    promoted_at: Optional[str] = None
    contributor_email: Optional[str] = None
    contributor_opt_in: bool = False
    thank_you_sent_at: Optional[str] = None


class CommunityTipList(BaseModel):
    tips: List[CommunityTip]
    counts: Dict[str, int]


@api_router.post("/community/tip", response_model=CommunityTipResponse)
async def submit_community_tip(payload: CommunityTipRequest):
    """Anonymously receive a user-authored Quick Guide tip. Nothing that
    identifies the sender is stored — only what the user typed and the
    guide it belongs to. Used to seed the shipped article backlog with
    real-world tips over time."""
    heading = (payload.heading or "").strip()[:120]
    body = (payload.body or "").strip()[:800]
    if not heading and not body:
        raise HTTPException(status_code=400, detail="heading or body required")
    # Simple email sanity check (no regex-heavy validator — Resend rejects
    # obviously bad addresses at send time anyway).
    contributor_email = (payload.contributor_email or "").strip().lower()[:200]
    if contributor_email and "@" not in contributor_email:
        contributor_email = ""
    contributor_opt_in = bool(payload.contributor_opt_in) and bool(contributor_email)
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
    }
    try:
        await db.community_tips.insert_one(doc)
    except Exception as e:
        logger.exception("Failed to store community tip: %s", e)
        raise HTTPException(status_code=500, detail="Storage error")
    return CommunityTipResponse(ok=True, id=doc["id"])


@api_router.get("/community/tips", response_model=CommunityTipList)
async def list_community_tips(
    status_filter: Optional[str] = None,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    """Admin-only: list submitted tips. Optional `status_filter=pending|promoted|rejected`."""
    _require_admin(x_admin_token)
    query: Dict[str, Any] = {}
    if status_filter is not None:
        if status_filter not in ("pending", "promoted", "rejected"):
            raise HTTPException(status_code=400, detail="Invalid status_filter")
        if status_filter == "pending":
            # Legacy rows created before the status field existed count as pending.
            query = {"$or": [{"status": "pending"}, {"status": {"$exists": False}}]}
        else:
            query = {"status": status_filter}
    docs = await db.community_tips.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Normalize legacy rows without a status field.
    for d in docs:
        d.setdefault("status", "pending")
        d.setdefault("promoted_at", None)
        d.setdefault("resource_id", "")
        d.setdefault("theme", "")
        d.setdefault("contributor_email", None)
        d.setdefault("contributor_opt_in", False)
        d.setdefault("thank_you_sent_at", None)
    counts_pipeline = [{"$group": {"_id": "$status", "n": {"$sum": 1}}}]
    counts = {"pending": 0, "promoted": 0, "rejected": 0}
    async for row in db.community_tips.aggregate(counts_pipeline):
        # Missing `status` (legacy rows) shows up here as _id=None → treat as pending.
        key = row["_id"] or "pending"
        counts[key] = counts.get(key, 0) + int(row["n"])
    return CommunityTipList(tips=[CommunityTip(**d) for d in docs], counts=counts)


@api_router.post("/community/tips/{tip_id}/promote", response_model=CommunityTip)
async def promote_community_tip(
    tip_id: str,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    """Admin-only: mark a submitted tip as promoted. Promoted tips are
    surfaced by the public /api/community/promoted endpoint and shown as
    read-only community cards inside the Quick Guide modal. If the contributor
    opted in with an email, we also fire a warm 'your tip is live' note."""
    _require_admin(x_admin_token)
    now = datetime.now(timezone.utc).isoformat()
    result = await db.community_tips.update_one(
        {"id": tip_id}, {"$set": {"status": "promoted", "promoted_at": now}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tip not found")
    doc = await db.community_tips.find_one({"id": tip_id}, {"_id": 0})
    doc.setdefault("resource_id", "")
    doc.setdefault("theme", "")
    # Fire-and-forget thank-you (never blocks the response). Silent-skip when
    # opt-in wasn't given, or Resend isn't configured yet.
    if doc.get("contributor_opt_in") and doc.get("contributor_email") and not doc.get("thank_you_sent_at"):
        asyncio.create_task(_send_thank_you(doc))
    return CommunityTip(**doc)


async def _send_thank_you(tip: Dict[str, Any]) -> None:
    """Warm confirmation email to a contributor whose tip was promoted."""
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
        f'{body_html}'
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
        {"$set": {"thank_you_sent_at": datetime.now(timezone.utc).isoformat(),
                  "thank_you_email_id": email_id}},
    )
    logger.info("thank-you sent for tip %s → %s (id=%s)", tip.get("id"), to_addr, email_id)


@api_router.post("/community/tips/{tip_id}/reject", response_model=CommunityTip)
async def reject_community_tip(
    tip_id: str,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    """Admin-only: reject a tip (soft-delete so it can be restored later)."""
    _require_admin(x_admin_token)
    result = await db.community_tips.update_one(
        {"id": tip_id}, {"$set": {"status": "rejected", "promoted_at": None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tip not found")
    doc = await db.community_tips.find_one({"id": tip_id}, {"_id": 0})
    doc.setdefault("resource_id", "")
    doc.setdefault("theme", "")
    return CommunityTip(**doc)


@api_router.delete("/community/tips/{tip_id}")
async def delete_community_tip(
    tip_id: str,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    """Admin-only: hard-delete a tip permanently."""
    _require_admin(x_admin_token)
    result = await db.community_tips.delete_one({"id": tip_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tip not found")
    return {"ok": True}


class PromotedTip(BaseModel):
    id: str
    heading: str
    body: str
    resource_id: str = ""
    promoted_at: Optional[str] = None


@api_router.get("/community/promoted", response_model=List[PromotedTip])
async def list_promoted_tips():
    """Public: promoted tips, surfaced inside the Quick Guide modal as
    read-only community cards. No admin token required."""
    docs = await db.community_tips.find(
        {"status": "promoted"},
        {"_id": 0, "id": 1, "heading": 1, "body": 1, "resource_id": 1, "promoted_at": 1},
    ).sort("promoted_at", -1).to_list(500)
    for d in docs:
        d.setdefault("resource_id", "")
        d.setdefault("promoted_at", None)
    return [PromotedTip(**d) for d in docs]


@api_router.post("/admin/verify")
async def admin_verify(x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    """Simple ping for the admin gate — returns 200 with the token match, 401 otherwise."""
    _require_admin(x_admin_token)
    return {"ok": True}


# ================== IMPORT-FROM-TEXT (LLM CARD PARSER) ==================
class ParseTipsRequest(BaseModel):
    text: str


class ParsedCard(BaseModel):
    heading: str
    body: str


class ParseTipsResponse(BaseModel):
    cards: List[ParsedCard]


@api_router.post("/community/tips/parse", response_model=ParseTipsResponse)
async def parse_tips_from_text(payload: ParseTipsRequest):
    """Split a pasted chunk of text into clean {heading, body} cards using the
    Emergent LLM. Used from both the admin bulk-import flow AND the Quick Guide
    "Paste multiple tips" flow — same endpoint, same output shape."""
    text = (payload.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    if len(text) > 8000:
        raise HTTPException(status_code=400, detail="text is too long (max 8000 chars)")
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json as _json

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
    # Strip common wrappers (```json ... ```)
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    # Isolate the JSON object if the model added prose
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
    for c in raw_cards[:20]:  # hard cap: never accept more than 20 cards per paste
        if not isinstance(c, dict):
            continue
        heading = str(c.get("heading") or "").strip()[:120]
        body = str(c.get("body") or "").strip()[:800]
        if not heading and not body:
            continue
        cards.append(ParsedCard(heading=heading or "Untitled tip", body=body))
    return ParseTipsResponse(cards=cards)


# ================== COMMUNITY DIGEST EMAIL ==================
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "")
ADMIN_DIGEST_EMAIL = os.environ.get("ADMIN_DIGEST_EMAIL", "")


class DigestSendResponse(BaseModel):
    ok: bool
    sent_to: Optional[str] = None
    counts: Dict[str, int]
    email_id: Optional[str] = None
    dry_run: bool = False
    reason: Optional[str] = None


def _render_digest_html(pending: List[Dict[str, Any]], promoted_recent: List[Dict[str, Any]], generated_at: str, unsubscribe_url: Optional[str] = None) -> str:
    """Render a table-based HTML digest email. Inline styles only — the
    playbook rules for email HTML strictly forbid external CSS/fonts."""
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

    unsubscribe_html = ''
    if unsubscribe_url:
        unsubscribe_html = (
            '<tr><td style="padding:8px 24px 20px;font-family:-apple-system,sans-serif;'
            'font-size:11px;color:#94A3B8;text-align:center;border-top:1px solid #E5E7EB;">'
            f'You are receiving this because you enabled weekly Iron Rabbit digests. '
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


# --- Digest config helpers -----------------------------------------------------
# Config lives in a single-doc app_config collection keyed by _id='digest'.
# Keeps things simple: no migrations, defaults fill in when the doc is missing.
async def _load_digest_config() -> Dict[str, Any]:
    doc = await db.app_config.find_one({"_id": "digest"}) or {}
    return {
        "enabled": bool(doc.get("enabled", True)),
        "last_sent_at": doc.get("last_sent_at"),
        "unsubscribe_token": doc.get("unsubscribe_token") or "",
    }


async def _ensure_unsubscribe_token() -> str:
    """Generate and store the unsubscribe token if missing. Idempotent."""
    cfg = await _load_digest_config()
    if cfg["unsubscribe_token"]:
        return cfg["unsubscribe_token"]
    tok = str(uuid.uuid4()).replace("-", "")
    await db.app_config.update_one(
        {"_id": "digest"}, {"$set": {"unsubscribe_token": tok}}, upsert=True,
    )
    return tok


async def _send_digest_now(*, dry_run: bool = False, force_when_empty: bool = True) -> "DigestSendResponse":
    """Core digest routine — shared by the admin API endpoint and the weekly
    cron. Returns a DigestSendResponse-like dict; the API layer wraps it."""
    cfg = await _load_digest_config()
    pending = await db.community_tips.find(
        {"$or": [{"status": "pending"}, {"status": {"$exists": False}}]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(50)
    promoted_recent = await db.community_tips.find(
        {"status": "promoted"}, {"_id": 0},
    ).sort("promoted_at", -1).to_list(10)

    counts = {"pending": len(pending), "promoted": len(promoted_recent)}
    if not force_when_empty and counts["pending"] == 0:
        return DigestSendResponse(ok=True, counts=counts, dry_run=dry_run,
                                  reason="skipped · no pending tips",
                                  sent_to=ADMIN_DIGEST_EMAIL or None)

    generated_at = datetime.now(timezone.utc).strftime("%b %d, %Y %H:%M UTC")
    unsub_token = await _ensure_unsubscribe_token()
    # Public unsubscribe link — safe to expose; the token is single-purpose.
    public_base = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")
    if not public_base:
        # Fallback: infer from CORS origin (first entry) so the link still works.
        public_base = (os.environ.get("CORS_ORIGINS", "").split(",")[0] or "").strip().rstrip("/")
    unsubscribe_url = f"{public_base}/api/community/digest/unsubscribe?token={unsub_token}" if public_base else None
    html = _render_digest_html(pending, promoted_recent, generated_at, unsubscribe_url)

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

    now_iso = datetime.now(timezone.utc).isoformat()
    await db.app_config.update_one(
        {"_id": "digest"}, {"$set": {"last_sent_at": now_iso}}, upsert=True,
    )
    return DigestSendResponse(
        ok=True, counts=counts, dry_run=False,
        sent_to=ADMIN_DIGEST_EMAIL,
        email_id=(email or {}).get("id") if isinstance(email, dict) else None,
    )


@api_router.post("/community/digest/send", response_model=DigestSendResponse)
async def send_community_digest(
    dry_run: bool = False,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    """Admin-only: fire the digest immediately. Supports `?dry_run=1`."""
    _require_admin(x_admin_token)
    return await _send_digest_now(dry_run=dry_run, force_when_empty=True)


class DigestStatusResponse(BaseModel):
    enabled: bool
    last_sent_at: Optional[str] = None
    sender_email: str = ""
    recipient_email: str = ""
    resend_key_configured: bool = False
    scheduler_next_run: Optional[str] = None


@api_router.get("/community/digest/status", response_model=DigestStatusResponse)
async def digest_status(x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")):
    """Admin-only: return the digest on/off flag + last-sent stamp so the
    dashboard can show a chip. Also reports whether Resend is configured."""
    _require_admin(x_admin_token)
    cfg = await _load_digest_config()
    next_run = None
    try:
        job = _scheduler.get_job("weekly_digest") if _scheduler else None
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


class DigestToggleRequest(BaseModel):
    enabled: bool


@api_router.post("/community/digest/toggle", response_model=DigestStatusResponse)
async def digest_toggle(
    payload: DigestToggleRequest,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    """Admin-only: flip the digest on/off flag from the dashboard."""
    _require_admin(x_admin_token)
    await db.app_config.update_one(
        {"_id": "digest"}, {"$set": {"enabled": bool(payload.enabled)}}, upsert=True,
    )
    return await digest_status(x_admin_token=x_admin_token)


@api_router.get("/community/digest/unsubscribe")
async def digest_unsubscribe(token: str):
    """Public: unsubscribe link inside the digest email. Compares against the
    stored per-install token and disables future weekly sends when it matches.
    Returns a simple HTML confirmation page either way (never leaks whether
    the token was right)."""
    from fastapi.responses import HTMLResponse
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


# ================== FEATURED COMMUNITY TIP + ANALYTICS ==================
class FeaturedTipResponse(BaseModel):
    tip: Optional[PromotedTip] = None
    total_promoted: int = 0


@api_router.get("/community/featured", response_model=FeaturedTipResponse)
async def featured_community_tip():
    """Public: deterministic pick of one promoted tip based on today's date.
    Returns `{tip: null, total_promoted: 0}` when nothing has been promoted
    yet — the home screen can degrade gracefully without knowing the API."""
    docs = await db.community_tips.find(
        {"status": "promoted"},
        {"_id": 0, "id": 1, "heading": 1, "body": 1, "resource_id": 1, "promoted_at": 1},
    ).sort("promoted_at", -1).to_list(500)
    if not docs:
        return FeaturedTipResponse(tip=None, total_promoted=0)
    # Deterministic index from today's UTC date — same tip all day, no jitter.
    today = datetime.now(timezone.utc).date()
    idx = today.toordinal() % len(docs)
    chosen = docs[idx]
    chosen.setdefault("resource_id", "")
    chosen.setdefault("promoted_at", None)
    return FeaturedTipResponse(tip=PromotedTip(**chosen), total_promoted=len(docs))


class CommunityEvent(BaseModel):
    event: str            # "impression" | "open" | "dismiss"
    tip_id: str
    install_id: Optional[str] = None
    at: Optional[str] = None  # client-supplied ISO — we default server-side


class CommunityEventsRequest(BaseModel):
    events: List[CommunityEvent]


_ALLOWED_EVENTS = {"impression", "open", "dismiss"}


@api_router.post("/community/events")
async def track_community_events(payload: CommunityEventsRequest):
    """Public: batch-insert lightweight analytics events for the featured tip.
    Anonymous — clients pass a random install UUID (stored in localStorage)
    so we can compute 'unique installs' without any user identity."""
    if not payload.events:
        return {"ok": True, "written": 0}
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for ev in payload.events[:50]:  # hard cap per call
        if ev.event not in _ALLOWED_EVENTS:
            continue
        tip_id = (ev.tip_id or "").strip()[:64]
        if not tip_id:
            continue
        install = (ev.install_id or "").strip()[:64] or None
        docs.append({
            "id": str(uuid.uuid4()),
            "event": ev.event,
            "tip_id": tip_id,
            "install_id": install,
            "at": ev.at or now,
        })
    if docs:
        try:
            await db.community_events.insert_many(docs)
        except Exception:
            logger.exception("community_events insert_many failed")
            raise HTTPException(status_code=500, detail="Storage error")
    return {"ok": True, "written": len(docs)}


class AnalyticsTipRow(BaseModel):
    tip_id: str
    heading: str = ""
    resource_id: str = ""
    impressions: int = 0
    opens: int = 0
    dismisses: int = 0
    unique_installs: int = 0


class AnalyticsResponse(BaseModel):
    window_days: int
    generated_at: str
    total_events: int
    tips: List[AnalyticsTipRow]


@api_router.get("/community/analytics", response_model=AnalyticsResponse)
async def community_analytics(
    days: int = 30,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    """Admin-only: per-tip event counts + unique installs over the last N days."""
    _require_admin(x_admin_token)
    days = max(1, min(365, int(days or 30)))
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
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
            "tip_id": tip_id, "impressions": 0, "opens": 0, "dismisses": 0,
            "installs": set(),
        })
        if event == "impression": row["impressions"] += count
        elif event == "open": row["opens"] += count
        elif event == "dismiss": row["dismisses"] += count
        for inst in r["installs"]:
            if inst: row["installs"].add(inst)

    # Enrich with tip metadata.
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
    # Sort by opens desc, then impressions desc
    tips.sort(key=lambda t: (-t.opens, -t.impressions))
    return AnalyticsResponse(
        window_days=days,
        generated_at=datetime.now(timezone.utc).isoformat(),
        total_events=total,
        tips=tips,
    )


# ================== DINING INSIGHTS ENDPOINT ==================
class DiningInsightsRequest(BaseModel):
    stats: Dict[str, Any]  # arbitrary summary computed on the client
    question: Optional[str] = None  # optional user question
    history: Optional[List[Dict[str, str]]] = None  # optional prior turns: [{role:'user'|'assistant', text:'...'}]


class DiningInsightsResponse(BaseModel):
    insights: str


@api_router.post("/dining_insights", response_model=DiningInsightsResponse)
async def dining_insights(payload: DiningInsightsRequest):
    """Turn Restaurants Galore stats into a short, human-readable
    analysis. Purely opt-in — no data is stored server-side."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")
    if not payload.stats:
        raise HTTPException(status_code=400, detail="stats payload is required")

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json as _json

    stats_json = _json.dumps(payload.stats, default=str)[:8000]
    question = (payload.question or "Give me 3-5 concise insights about my dining habits, spending patterns, and any smart suggestions to save money or discover something new. Keep it warm, punchy, bullet-formatted.").strip()

    system_msg = (
        "You are a friendly personal dining analyst and chat assistant. You "
        "will receive a JSON summary of a person's restaurant history "
        "(monthly spend, top restaurants, favorites, review averages, "
        "coupon expirations, etc). Answer their question using only the data "
        "provided.\n"
        "Formatting rules for FIRST-TURN or bullet requests: (1) 3-5 short "
        "bullet points max; (2) each bullet begins with • ; (3) use concrete "
        "numbers where possible; (4) no fluff, no headers, no disclaimers, "
        "no 'as an AI'; (5) if data is thin, say so and suggest what to log next.\n"
        "Formatting rules for FOLLOW-UP CHAT turns (when history is present): "
        "answer conversationally in 1-3 sentences, but still cite the numbers "
        "from the stats. Do not repeat the entire bullet list unless asked."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"dining-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    parts = [f"STATS:\n{stats_json}"]
    if payload.history:
        # Serialize prior turns into a plain-text transcript so we can send a
        # single message (emergentintegrations LlmChat's session_id is local, so
        # we replay history verbatim to preserve context).
        transcript = []
        for m in payload.history[-20:]:
            role = "User" if m.get("role") == "user" else "Assistant"
            text = (m.get("text") or "").strip()
            if text:
                transcript.append(f"{role}: {text}")
        if transcript:
            parts.append("PRIOR CONVERSATION:\n" + "\n".join(transcript))
    parts.append(f"QUESTION:\n{question}")
    prompt = "\n\n".join(parts)
    try:
        result = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("Dining insights call failed")
        raise HTTPException(status_code=502, detail=f"Insights failed: {str(e)[:200]}")

    insights = str(result or "").strip()
    if not insights:
        raise HTTPException(status_code=502, detail="Empty response from model")
    return DiningInsightsResponse(insights=insights)


# ================== RECIPE IDEA ENDPOINT ==================
class RecipeIdeaRequest(BaseModel):
    stats: Optional[Dict[str, Any]] = Field(default_factory=dict)  # summary of restaurants/orders/family etc.
    hint: Optional[str] = None  # optional user steer (e.g. "vegetarian", "kid-friendly", "quick weeknight")


class RecipeIdeaResponse(BaseModel):
    title: str
    cuisine: Optional[str] = ""
    prep_time_min: Optional[int] = None
    servings: Optional[int] = None
    ingredients: List[str] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list)
    notes: str = ""


@api_router.post("/dining_recipe_idea", response_model=RecipeIdeaResponse)
async def dining_recipe_idea(payload: RecipeIdeaRequest):
    """Suggest an original at-home recipe personalized to the user's dining
    history. Returns strict JSON so the frontend can drop it straight into
    the Recipe Recreation store."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")

    from emergentintegrations.llm.chat import LlmChat, UserMessage
    import json as _json
    import re

    stats_json = _json.dumps(payload.stats or {}, default=str)[:8000]
    hint = (payload.hint or "").strip()[:256]  # cap to prevent prompt-injection-length abuse

    system_msg = (
        "You are a creative home-cook recipe designer. Given a JSON summary "
        "of the user's dining history (favorite cuisines, family allergies, "
        "recent orders, loved dishes), propose ONE original at-home recipe "
        "they would love — inspired by their patterns but not a carbon copy. "
        "Respect any allergies/dietary tags found in family.\n\n"
        "If stats contains `rated_recipes`, treat items rated 4-5 stars as "
        "flavor/technique the user loves (build on them) and items rated "
        "1-2 stars as things to AVOID repeating. Never propose the same "
        "title as an existing rated recipe.\n\n"
        "Return ONLY a JSON object with these keys (no prose, no markdown "
        "fences, no comments): title (str), cuisine (str), prep_time_min "
        "(int, 10-90), servings (int, 1-8), ingredients (array of strings, "
        "one per item with quantity, 5-15 items), steps (array of strings, "
        "4-10 steps), notes (str, one warm sentence).\n"
        "Rules: (1) title should be inviting, not generic; (2) ingredients "
        "must be shopping-list ready with amounts; (3) steps should be "
        "concise imperatives; (4) no allergen the user has flagged; "
        "(5) output valid JSON parseable by JSON.parse."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"recipe-idea-{uuid.uuid4()}",
        system_message=system_msg,
    ).with_model("anthropic", "claude-sonnet-4-6")

    parts = [f"STATS:\n{stats_json}"]
    if hint:
        parts.append(f"USER HINT:\n{hint}")
    parts.append("Return the JSON now.")
    prompt = "\n\n".join(parts)

    try:
        result = await chat.send_message(UserMessage(text=prompt))
    except Exception as e:
        logger.exception("Recipe idea call failed")
        raise HTTPException(status_code=502, detail=f"Recipe idea failed: {str(e)[:200]}")

    raw = str(result or "").strip()
    # Strip common markdown fences if the model wraps its output
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = _json.loads(raw)
    except Exception:
        # Try to find the JSON blob inside surrounding text
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise HTTPException(status_code=502, detail="Model returned non-JSON output")
        try:
            data = _json.loads(m.group(0))
        except Exception:
            raise HTTPException(status_code=502, detail="Model returned malformed JSON")

    # Coerce and validate keys
    def _s(v, d=""):
        return str(v).strip() if v is not None else d
    def _i(v):
        try: return int(v)
        except Exception: return None
    def _list(v):
        if isinstance(v, list): return [str(x).strip() for x in v if str(x).strip()]
        return []

    title = _s(data.get("title"))
    if not title:
        raise HTTPException(status_code=502, detail="Recipe missing title")
    return RecipeIdeaResponse(
        title=title,
        cuisine=_s(data.get("cuisine")),
        prep_time_min=_i(data.get("prep_time_min")),
        servings=_i(data.get("servings")),
        ingredients=_list(data.get("ingredients")),
        steps=_list(data.get("steps")),
        notes=_s(data.get("notes")),
    )


# Include the router in the main app
app.include_router(api_router)


# ========== Open Food Facts proxy — barcode → product info ==========
# Backend proxy: normalized shape, caches in memory for the process lifetime,
# and shields the client from OFF's rate-limits.
_OFF_CACHE: Dict[str, Any] = {}


@app.get("/api/product/{barcode}")
async def get_product_info(barcode: str):
    """Look up a product by barcode/UPC via Open Food Facts.
    Returns a normalized shape used by the Pantry item's Product Health & Info accordion.
    Returns 404 if not found. Caches successful hits in-process.
    """
    import asyncio
    import requests as _requests

    key = barcode.strip()
    if not key or not key.isdigit() or len(key) < 6 or len(key) > 20:
        raise HTTPException(status_code=400, detail="Invalid barcode format")

    if key in _OFF_CACHE:
        return _OFF_CACHE[key]

    def _fetch():
        url = f"https://world.openfoodfacts.org/api/v2/product/{key}.json"
        headers = {"User-Agent": "IronRabbit/1.0 (offline-first PWA)"}
        r = _requests.get(url, headers=headers, timeout=8)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()

    try:
        data = await asyncio.to_thread(_fetch)
    except Exception as e:
        logger.warning(f"OFF lookup failed for {key}: {e}")
        raise HTTPException(status_code=502, detail="Product lookup service unavailable")

    if not data or data.get("status") != 1 or "product" not in data:
        raise HTTPException(status_code=404, detail="Product not found")

    p = data["product"]
    ingredients_list = [i.get("text", "") for i in (p.get("ingredients") or []) if i.get("text")]
    additives = [t.replace("en:", "") for t in (p.get("additives_tags") or [])]
    allergens = [t.replace("en:", "") for t in (p.get("allergens_tags") or [])]
    countries = [t.replace("en:", "") for t in (p.get("countries_tags") or [])]

    result = {
        "barcode": key,
        "name": p.get("product_name") or p.get("generic_name") or "",
        "brand": (p.get("brands") or "").split(",")[0].strip(),
        "quantity_label": p.get("quantity") or "",
        "image_url": p.get("image_front_url") or p.get("image_url"),
        "ingredients_text": p.get("ingredients_text") or "",
        "ingredients_list": ingredients_list,
        "additives": additives,
        "allergens": allergens,
        "countries_sold": countries,
        "nutriscore_grade": (p.get("nutriscore_grade") or "").upper() or None,
        "nova_group": p.get("nova_group"),
        "ecoscore_grade": (p.get("ecoscore_grade") or "").upper() or None,
        "categories": [t.replace("en:", "") for t in (p.get("categories_tags") or [])][:8],
        "labels": [t.replace("en:", "") for t in (p.get("labels_tags") or [])][:8],
        "source": "openfoodfacts",
    }

    _OFF_CACHE[key] = result
    return result


app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    try:
        if _scheduler and _scheduler.running:
            _scheduler.shutdown(wait=False)
    except Exception:
        pass
    client.close()


# ================== WEEKLY DIGEST SCHEDULER ==================
# Uses APScheduler in-process — no external cron needed. Job fires every
# Monday at 09:00 UTC and calls _send_digest_now(dry_run=False,
# force_when_empty=False) which skips silently when nothing is pending.
# The digest_config's `enabled` flag gates real sends (unsubscribe respected).
from apscheduler.schedulers.asyncio import AsyncIOScheduler  # noqa: E402
from apscheduler.triggers.cron import CronTrigger  # noqa: E402

_scheduler: Optional[AsyncIOScheduler] = None


async def _weekly_digest_job():
    """Cron entry-point. Silent when there's nothing to report so we never
    spam an inbox with 'no news' messages."""
    try:
        result = await _send_digest_now(dry_run=False, force_when_empty=False)
        logger.info("weekly_digest job result: %s", result.model_dump())
    except Exception:
        logger.exception("weekly_digest job crashed")


@app.on_event("startup")
async def _start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return  # already registered — avoid double-scheduling on reload
    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        _weekly_digest_job,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0, timezone="UTC"),
        id="weekly_digest",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("weekly_digest scheduler started (Mon 09:00 UTC)")
