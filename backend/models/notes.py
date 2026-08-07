"""Note / template / settings Pydantic models."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


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
    color: str = "purple"
    category: str = ""
    subcategory: str = ""
    alarm: Optional[AlarmSettings] = None
    recurring: Optional[RecurringSettings] = None
    order: int = 0
    template_id: Optional[str] = None


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
    note_ids: List[str]


class AppSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "app_settings"
    logo_url: str = ""
    header_bg: str = (
        "https://images.unsplash.com/photo-1771814536315-ae11952227fc?crop=entropy&cs=srgb&fm=jpg"
        "&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHw0fHxkYXJrJTIwZnV0dXJpc3RpYyUyMGFic3RyYWN0JTIwdGV4dHVyZXxlbnwwfHx8fDE3NzMxNjM2OTR8MA"
        "&ixlib=rb-4.1.0&q=85"
    )
    website_url: str = "https://ironrabbitapps.com"
    company_name: str = "Iron Rabbit"


class SettingsUpdate(BaseModel):
    logo_url: Optional[str] = None
    header_bg: Optional[str] = None
    website_url: Optional[str] = None
    company_name: Optional[str] = None
