from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
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
class CommunityTipRequest(BaseModel):
    heading: str
    body: str
    resource_id: Optional[str] = ""
    theme: Optional[str] = None


class CommunityTipResponse(BaseModel):
    ok: bool
    id: str


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
    doc = {
        "id": str(uuid.uuid4()),
        "heading": heading,
        "body": body,
        "resource_id": (payload.resource_id or "")[:20],
        "theme": (payload.theme or "")[:200],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        await db.community_tips.insert_one(doc)
    except Exception as e:
        logger.exception("Failed to store community tip: %s", e)
        raise HTTPException(status_code=500, detail="Storage error")
    return CommunityTipResponse(ok=True, id=doc["id"])


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
    client.close()
