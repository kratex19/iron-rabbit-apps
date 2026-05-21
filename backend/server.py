from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

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
    alarm: Optional[AlarmSettings] = None
    recurring: Optional[RecurringSettings] = None

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

class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_settings"
    logo_url: str = ""
    header_bg: str = "https://images.unsplash.com/photo-1771814536315-ae11952227fc?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHw0fHxkYXJrJTIwZnV0dXJpc3RpYyUyMGFic3RyYWN0JTIwdGV4dHVyZXxlbnwwfHx8fDE3NzMxNjM2OTR8MA&ixlib=rb-4.1.0&q=85"
    website_url: str = "https://otropis.com"
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

# Include the router in the main app
app.include_router(api_router)

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
