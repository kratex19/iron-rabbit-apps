"""Miscellaneous LLM-backed and 3rd-party proxy endpoints:
translate, OCR, dining insights/recipe idea, Open Food Facts product proxy."""
from __future__ import annotations

import asyncio
import json as _json
import logging
import re
import uuid
from typing import Any, Dict, List, Optional

import requests as _requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from deps import EMERGENT_LLM_KEY

router = APIRouter(prefix="/api")
logger = logging.getLogger(__name__)


# ---------------- TRANSLATE ----------------
class TranslateRequest(BaseModel):
    text: str
    target_lang: str
    source_lang: Optional[str] = None


class TranslateResponse(BaseModel):
    translated: str
    source_lang: Optional[str] = None
    target_lang: str


@router.post("/translate", response_model=TranslateResponse)
async def translate_text(payload: TranslateRequest):
    """Translate a note's text via the Emergent LLM (Claude Sonnet 4.6).
    Preserves line breaks. Returns only the translated text."""
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


# ---------------- OCR ----------------
class OCRRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/png"


class OCRResponse(BaseModel):
    extracted_text: str


_OCR_ALLOWED_MIME = {"image/png", "image/jpeg", "image/jpg", "image/webp"}


@router.post("/ocr", response_model=OCRResponse)
async def ocr_image(payload: OCRRequest):
    """Extract every piece of visible text from an image using Claude
    Sonnet 4.6 vision. Returns the extracted text only — no analysis."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")

    b64 = (payload.image_base64 or "").strip()
    if b64.startswith("data:"):
        try:
            b64 = b64.split(",", 1)[1]
        except IndexError:
            raise HTTPException(status_code=400, detail="Malformed data URI")
    if not b64:
        raise HTTPException(status_code=400, detail="image_base64 is required")

    mime = (payload.mime_type or "").lower().strip()
    if mime not in _OCR_ALLOWED_MIME:
        raise HTTPException(status_code=400, detail=f"Unsupported mime type: {mime}. Use PNG/JPEG/WEBP.")

    if int(len(b64) * 3 / 4) > 5 * 1024 * 1024:
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


# ---------------- DINING INSIGHTS (Restaurants Galore — FROZEN feature, endpoint preserved) ----------------
class DiningInsightsRequest(BaseModel):
    stats: Dict[str, Any]
    question: Optional[str] = None
    history: Optional[List[Dict[str, str]]] = None


class DiningInsightsResponse(BaseModel):
    insights: str


@router.post("/dining_insights", response_model=DiningInsightsResponse)
async def dining_insights(payload: DiningInsightsRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")
    if not payload.stats:
        raise HTTPException(status_code=400, detail="stats payload is required")

    from emergentintegrations.llm.chat import LlmChat, UserMessage

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
        transcript = []
        for m in payload.history[-20:]:
            role = "User" if m.get("role") == "user" else "Assistant"
            text = (m.get("text") or "").strip()
            if text:
                transcript.append(f"{role}: {text}")
        if transcript:
            parts.append("PRIOR CONVERSATION:\n" + "\n".join(transcript))
    parts.append(f"QUESTION:\n{question}")
    try:
        result = await chat.send_message(UserMessage(text="\n\n".join(parts)))
    except Exception as e:
        logger.exception("Dining insights call failed")
        raise HTTPException(status_code=502, detail=f"Insights failed: {str(e)[:200]}")

    insights = str(result or "").strip()
    if not insights:
        raise HTTPException(status_code=502, detail="Empty response from model")
    return DiningInsightsResponse(insights=insights)


# ---------------- RECIPE IDEA ----------------
class RecipeIdeaRequest(BaseModel):
    stats: Optional[Dict[str, Any]] = Field(default_factory=dict)
    hint: Optional[str] = None


class RecipeIdeaResponse(BaseModel):
    title: str
    cuisine: Optional[str] = ""
    prep_time_min: Optional[int] = None
    servings: Optional[int] = None
    ingredients: List[str] = Field(default_factory=list)
    steps: List[str] = Field(default_factory=list)
    notes: str = ""


@router.post("/dining_recipe_idea", response_model=RecipeIdeaResponse)
async def dining_recipe_idea(payload: RecipeIdeaRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="LLM key not configured on server")

    from emergentintegrations.llm.chat import LlmChat, UserMessage

    stats_json = _json.dumps(payload.stats or {}, default=str)[:8000]
    hint = (payload.hint or "").strip()[:256]

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

    try:
        result = await chat.send_message(UserMessage(text="\n\n".join(parts)))
    except Exception as e:
        logger.exception("Recipe idea call failed")
        raise HTTPException(status_code=502, detail=f"Recipe idea failed: {str(e)[:200]}")

    raw = str(result or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
    try:
        data = _json.loads(raw)
    except Exception:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise HTTPException(status_code=502, detail="Model returned non-JSON output")
        try:
            data = _json.loads(m.group(0))
        except Exception:
            raise HTTPException(status_code=502, detail="Model returned malformed JSON")

    def _s(v, d=""): return str(v).strip() if v is not None else d
    def _i(v):
        try: return int(v)
        except Exception: return None
    def _list(v):
        return [str(x).strip() for x in v if str(x).strip()] if isinstance(v, list) else []

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


# ---------------- OPEN FOOD FACTS PROXY ----------------
_OFF_CACHE: Dict[str, Any] = {}


@router.get("/product/{barcode}")
async def get_product_info(barcode: str):
    """Look up a product by barcode/UPC via Open Food Facts. Returns a
    normalized shape used by the Pantry item's Product Health & Info accordion.
    Returns 404 if not found. Caches successful hits in-process."""
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
    result = {
        "barcode": key,
        "name": p.get("product_name") or p.get("generic_name") or "",
        "brand": (p.get("brands") or "").split(",")[0].strip(),
        "quantity_label": p.get("quantity") or "",
        "image_url": p.get("image_front_url") or p.get("image_url"),
        "ingredients_text": p.get("ingredients_text") or "",
        "ingredients_list": ingredients_list,
        "additives": [t.replace("en:", "") for t in (p.get("additives_tags") or [])],
        "allergens": [t.replace("en:", "") for t in (p.get("allergens_tags") or [])],
        "countries_sold": [t.replace("en:", "") for t in (p.get("countries_tags") or [])],
        "nutriscore_grade": (p.get("nutriscore_grade") or "").upper() or None,
        "nova_group": p.get("nova_group"),
        "ecoscore_grade": (p.get("ecoscore_grade") or "").upper() or None,
        "categories": [t.replace("en:", "") for t in (p.get("categories_tags") or [])][:8],
        "labels": [t.replace("en:", "") for t in (p.get("labels_tags") or [])][:8],
        "source": "openfoodfacts",
    }
    _OFF_CACHE[key] = result
    return result
