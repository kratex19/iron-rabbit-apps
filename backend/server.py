"""FastAPI entry point — thin bootstrap only.

Route definitions live in `routes/*.py`. Shared connections + config in
`deps.py`. Pydantic models in `models/*.py`. This file wires them all
together and owns the app lifecycle (CORS, startup, shutdown, cron).
"""
from __future__ import annotations

import logging
import os
from typing import Optional

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from deps import client, db, logger as _deps_logger, SCREENSHOT_CRON_ENABLED  # noqa: F401 — ensures dotenv/db loaded once
from routes.notes import router as notes_router
from routes.community import router as community_router
from routes.digest import router as digest_router, send_digest_now
from routes import digest as digest_module  # for scheduler handle binding
from routes.analytics import router as analytics_router
from routes.analytics import _detect_and_ping_drop
from routes.misc import router as misc_router
from routes.misc import _run_screenshot_regen

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Wire routers. Order doesn't matter, but community/digest come first for
# readability — they're where the interesting stuff lives.
app.include_router(notes_router)
app.include_router(community_router)
app.include_router(digest_router)
app.include_router(analytics_router)
app.include_router(misc_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================== WEEKLY DIGEST SCHEDULER ==================
_scheduler: Optional[AsyncIOScheduler] = None


async def _weekly_digest_job():
    """Cron entry-point. Silent when nothing is pending so we never spam."""
    try:
        result = await send_digest_now(dry_run=False, force_when_empty=False)
        logger.info("weekly_digest job result: %s", result.model_dump())
    except Exception:
        logger.exception("weekly_digest job crashed")


@app.on_event("startup")
async def _start_scheduler():
    """Register the weekly cron and TTL index once per process."""
    global _scheduler
    if _scheduler is not None:
        return  # already registered — avoid double-scheduling on reload
    # 180-day TTL on analytics events so long-term storage stays bounded.
    try:
        await db.community_events.create_index(
            "at", expireAfterSeconds=180 * 24 * 60 * 60, name="events_ttl",
        )
    except Exception:
        logger.exception("could not create community_events TTL index")

    # 90-day TTL on recovery funnel events — smaller window since the metric
    # only informs the current-launch magic-link-vs-manual decision.
    try:
        await db.recovery_events.create_index(
            "at", expireAfterSeconds=90 * 24 * 60 * 60, name="recovery_events_ttl",
        )
    except Exception:
        logger.exception("could not create recovery_events TTL index")

    # Unique nickname reservation — prevents concurrent-write races.
    try:
        await db.nickname_reservations.create_index(
            "nickname", unique=True, name="nickname_unique",
        )
    except Exception:
        logger.exception("could not create nickname_reservations unique index")

    _scheduler = AsyncIOScheduler(timezone="UTC")
    _scheduler.add_job(
        _weekly_digest_job,
        trigger=CronTrigger(day_of_week="mon", hour=9, minute=0, timezone="UTC"),
        id="weekly_digest",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    # Weekly recovery-funnel drop check — Monday 08:30 UTC, before the 09:00
    # digest so the admin sees the alert alongside the digest send. Runs
    # regardless of SLACK_WEBHOOK_URL: without one it still records the
    # marker so a later config change doesn't re-fire old drops.
    async def _drop_alert_job():
        try:
            result = await _detect_and_ping_drop()
            logger.info("recovery drop-alert job result: %s", result)
        except Exception:
            logger.exception("recovery drop-alert job crashed")
    _scheduler.add_job(
        _drop_alert_job,
        trigger=CronTrigger(day_of_week="mon", hour=8, minute=30, timezone="UTC"),
        id="weekly_drop_alert",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    # Weekly Play-carousel regen — Sunday 07:00 UTC, before Monday launch
    # review. Guarded by SCREENSHOT_CRON_ENABLED so preview env doesn't
    # burn cycles regenerating a gallery nobody uploads from here.
    if SCREENSHOT_CRON_ENABLED:
        async def _screenshot_cron_job():
            try:
                result = await _run_screenshot_regen("cron")
                logger.info("screenshot regen cron result: %s", result)
            except Exception:
                logger.exception("screenshot regen cron crashed")
        _scheduler.add_job(
            _screenshot_cron_job,
            trigger=CronTrigger(day_of_week="sun", hour=7, minute=0, timezone="UTC"),
            id="weekly_screenshots",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        logger.info("weekly_screenshots scheduler started (Sun 07:00 UTC)")
    _scheduler.start()
    # Expose the scheduler handle to the digest router so /digest/status can
    # report the next-run time.
    digest_module.scheduler = _scheduler
    logger.info("weekly_digest scheduler started (Mon 09:00 UTC)")


@app.on_event("shutdown")
async def _shutdown():
    try:
        if _scheduler and _scheduler.running:
            _scheduler.shutdown(wait=False)
    except Exception:
        pass
    client.close()
