"""Community tips + share + featured + parse Pydantic models."""
from __future__ import annotations

from typing import Dict, List, Optional

from pydantic import BaseModel


class CommunityTipRequest(BaseModel):
    heading: str
    body: str
    resource_id: Optional[str] = ""
    theme: Optional[str] = None
    # Optional contributor opt-in. When both provided, admin promote flow
    # triggers a warm "your tip is live" email via Resend. Absent = totally
    # anonymous, preserved historical behaviour.
    contributor_email: Optional[str] = None
    contributor_opt_in: Optional[bool] = False
    # Optional public byline. Alphanumeric + underscore, max 20 chars.
    # Rendered on Community-badged cards, FeaturedTipStrip, and Contributor Wall.
    nickname: Optional[str] = None


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
    nickname: Optional[str] = None


class CommunityTipList(BaseModel):
    tips: List[CommunityTip]
    counts: Dict[str, int]


class PromotedTip(BaseModel):
    id: str
    heading: str
    body: str
    resource_id: str = ""
    promoted_at: Optional[str] = None
    nickname: Optional[str] = None


class FeaturedTipResponse(BaseModel):
    tip: Optional[PromotedTip] = None
    total_promoted: int = 0


class ParseTipsRequest(BaseModel):
    text: str


class ParsedCard(BaseModel):
    heading: str
    body: str


class ParseTipsResponse(BaseModel):
    cards: List[ParsedCard]


class Contributor(BaseModel):
    nickname: str
    tip_count: int
    latest_promoted_at: Optional[str] = None
    latest_heading: str = ""


class ContributorsResponse(BaseModel):
    contributors: List[Contributor]
    total: int


class NicknameReserveRequest(BaseModel):
    nickname: str
    email: str


class NicknameStatusResponse(BaseModel):
    nickname: str
    available: bool
    reason: str = ""  # "free" | "claimed_by_you" | "taken" | "invalid"
    owned_by_you: bool = False


class NicknameRecoveryRequestBody(BaseModel):
    nickname: str


class NicknameRecoveryVerifyBody(BaseModel):
    nickname: str
    code: str
    new_email: str


class NicknameRecoveryResponse(BaseModel):
    ok: bool
    delivered: bool = False
    reason: str = ""
    masked_email: Optional[str] = None
