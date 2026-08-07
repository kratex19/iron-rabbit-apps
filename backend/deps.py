"""Shared FastAPI dependencies + module-level singletons.

Everything imported here is safe to import from any route module. Keeps
individual route files small and avoids circular imports.
"""
from __future__ import annotations

import os
import logging
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Emergent LLM key — used across translation, OCR, community parsing.
EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

# Community / admin config
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "")
ADMIN_DIGEST_EMAIL = os.environ.get("ADMIN_DIGEST_EMAIL", "")
# Public URL used in transactional email links (magic-link recovery, etc.).
# Falls back to empty string — emails then omit the one-tap link.
PUBLIC_APP_URL = os.environ.get("PUBLIC_APP_URL", "").rstrip("/")
# Weekly Play-screenshot regen — guarded so preview env doesn't run it. Set
# to "1"/"true"/"yes" in production to enable.
SCREENSHOT_CRON_ENABLED = os.environ.get("SCREENSHOT_CRON_ENABLED", "").lower() in {"1", "true", "yes"}
# Optional Slack incoming-webhook URL — recovery-funnel drop alerts POST here.
# Missing/empty → alerts stay in-dashboard only.
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "").strip()

logger = logging.getLogger(__name__)


def require_admin(x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")) -> None:
    """FastAPI dependency: rejects when the request lacks a matching admin
    token. Empty ADMIN_TOKEN on the server disables all admin endpoints —
    safer default than an accidental match."""
    if not ADMIN_TOKEN or not x_admin_token or x_admin_token.strip() != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Admin token required")
