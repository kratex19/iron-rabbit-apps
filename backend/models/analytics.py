"""Community analytics events + admin summary Pydantic models."""
from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel


class CommunityEvent(BaseModel):
    event: str            # "impression" | "open" | "dismiss"
    tip_id: str
    install_id: Optional[str] = None
    at: Optional[str] = None  # client-supplied ISO — defaulted server-side


class CommunityEventsRequest(BaseModel):
    events: List[CommunityEvent]


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


# --- Recovery-flow funnel analytics ----------------------------------------
# Tracks whether users complete recovery via the emailed magic link or via
# manual code entry (so we can decide if the deep link earns its URL length).
class RecoveryEventRequest(BaseModel):
    event: str  # "magic_link_opened" | "manual_entry_opened"


class RecoveryFunnelResponse(BaseModel):
    window_days: int
    generated_at: str
    email_sent: int = 0
    magic_link_opened: int = 0
    manual_entry_opened: int = 0
    verify_failed: int = 0
    verify_success: int = 0
    magic_link_share: float = 0.0  # opens attributable to the magic link
