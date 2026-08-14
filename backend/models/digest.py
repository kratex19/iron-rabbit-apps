"""Community digest email Pydantic models."""
from __future__ import annotations

from typing import Dict, Optional

from pydantic import BaseModel


class DigestSendResponse(BaseModel):
    ok: bool
    sent_to: Optional[str] = None
    counts: Dict[str, int]
    email_id: Optional[str] = None
    dry_run: bool = False
    reason: Optional[str] = None
    # Populated on dry_run so the admin dashboard can render a preview modal
    # before broadcasting. Never returned on real sends.
    html: Optional[str] = None
    subject: Optional[str] = None


class DigestStatusResponse(BaseModel):
    enabled: bool
    last_sent_at: Optional[str] = None
    sender_email: str = ""
    recipient_email: str = ""
    resend_key_configured: bool = False
    scheduler_next_run: Optional[str] = None


class DigestToggleRequest(BaseModel):
    enabled: bool
