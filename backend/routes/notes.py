"""Notes + templates + settings + uploads + root."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

import aiofiles
from fastapi import APIRouter, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse

from deps import db, UPLOADS_DIR
from models.notes import (
    Note, NoteCreate, NoteUpdate,
    NoteTemplate, NoteTemplateCreate,
    ReorderRequest,
    AppSettings, SettingsUpdate,
)

router = APIRouter(prefix="/api")


@router.get("/")
async def root():
    return {"message": "LuminaTask API"}


@router.post("/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
async def create_note(note_input: NoteCreate):
    note = Note(**note_input.model_dump())
    doc = note.model_dump()
    await db.notes.insert_one(doc)
    return note


@router.get("/notes", response_model=List[Note])
async def get_notes():
    return await db.notes.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@router.get("/notes/{note_id}", response_model=Note)
async def get_note(note_id: str):
    note = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.put("/notes/{note_id}", response_model=Note)
async def update_note(note_id: str, note_update: NoteUpdate):
    existing = await db.notes.find_one({"id": note_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Note not found")

    update_data = {k: v for k, v in note_update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if "alarm" in update_data and update_data["alarm"]:
        update_data["alarm"] = update_data["alarm"].model_dump() if hasattr(update_data["alarm"], "model_dump") else update_data["alarm"]
    if "recurring" in update_data and update_data["recurring"]:
        update_data["recurring"] = update_data["recurring"].model_dump() if hasattr(update_data["recurring"], "model_dump") else update_data["recurring"]

    await db.notes.update_one({"id": note_id}, {"$set": update_data})
    return await db.notes.find_one({"id": note_id}, {"_id": 0})


@router.delete("/notes/{note_id}")
async def delete_note(note_id: str):
    result = await db.notes.delete_one({"id": note_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    return {"message": "Note deleted"}


@router.post("/notes/reorder")
async def reorder_notes(reorder: ReorderRequest):
    for index, note_id in enumerate(reorder.note_ids):
        await db.notes.update_one({"id": note_id}, {"$set": {"order": index}})
    return {"message": "Notes reordered"}


@router.post("/templates", response_model=NoteTemplate, status_code=status.HTTP_201_CREATED)
async def create_template(template_input: NoteTemplateCreate):
    template = NoteTemplate(**template_input.model_dump())
    await db.templates.insert_one(template.model_dump())
    return template


@router.get("/templates", response_model=List[NoteTemplate])
async def get_templates():
    return await db.templates.find({}, {"_id": 0}).to_list(100)


@router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}


@router.get("/categories")
async def get_categories():
    """All unique categories and subcategories across notes."""
    notes = await db.notes.find({}, {"_id": 0, "category": 1, "subcategory": 1}).to_list(1000)
    categories: dict = {}
    for note in notes:
        cat = note.get("category", "")
        subcat = note.get("subcategory", "")
        if cat:
            categories.setdefault(cat, set())
            if subcat:
                categories[cat].add(subcat)
    return {cat: list(subs) for cat, subs in categories.items()}


@router.get("/settings", response_model=AppSettings)
async def get_settings():
    settings = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not settings:
        default = AppSettings()
        await db.settings.insert_one(default.model_dump())
        return default
    return settings


@router.put("/settings", response_model=AppSettings)
async def update_settings(settings_update: SettingsUpdate):
    update_data = {k: v for k, v in settings_update.model_dump().items() if v is not None}
    existing = await db.settings.find_one({"id": "app_settings"}, {"_id": 0})
    if not existing:
        default = AppSettings(**update_data)
        await db.settings.insert_one(default.model_dump())
        return default
    await db.settings.update_one({"id": "app_settings"}, {"$set": update_data})
    return await db.settings.find_one({"id": "app_settings"}, {"_id": 0})


@router.post("/upload/logo")
async def upload_logo(file: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, png, gif, webp, svg")
    ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "png"
    filename = f"logo_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)
    return {"url": f"/api/uploads/{filename}"}


@router.post("/upload/header")
async def upload_header(file: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, png, gif, webp")
    ext = file.filename.split(".")[-1] if "." in (file.filename or "") else "jpg"
    filename = f"header_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOADS_DIR / filename
    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)
    return {"url": f"/api/uploads/{filename}"}


@router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    filepath = UPLOADS_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)
