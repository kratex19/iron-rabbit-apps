"""Iteration 61 — Recovery Analytics + server-side funnel events.

Covers:
  * POST /api/community/recovery/track
      - {event:'magic_link_opened'} → 200 {ok:true} and doc in recovery_events
      - {event:'manual_entry_opened'} → 200 + doc
      - {event:'email_sent'} → 400 (server-only)
      - {event:'garbage'} → 400
  * GET /api/community/recovery/analytics
      - no admin token → 401/403
      - with admin token → 200 + full field set
      - days=7 query respected + values <= 30-day window
      - magic_link_share = magic / (magic + manual) rounded to 3
  * Server-side funnel:
      - request against CLAIMED nickname → 1 email_sent event written
      - verify wrong code → verify_failed written
      - verify correct code (plant hash) → verify_success written

Cleans up its own tips + reservations + recoveries. Also purges any test-
authored recovery_events docs so downstream counts stay clean.
"""
import os
import asyncio
import uuid
import hashlib
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "irr-admin-8f3a2b91c4d7e6f5")

RUN = uuid.uuid4().hex[:6]
NICK = f"TESTa61_{RUN}"[:20]
EMAIL_OLD = f"a61old_{RUN}@test.com"
EMAIL_NEW = f"a61new_{RUN}@test.com"

# We snapshot recovery_events window start at import time so the "before/after"
# math in the funnel tests is robust regardless of other test noise.
WINDOW_START = datetime.now(timezone.utc)


def _run_async(coro):
    return asyncio.run(coro)


async def _db():
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return client, client[os.environ["DB_NAME"]]


def _hash(nickname, code):
    return hashlib.sha256(f"{nickname}:{code}".encode()).hexdigest()


async def _count_events(event: str) -> int:
    client, db = await _db()
    try:
        return await db.recovery_events.count_documents({
            "event": event, "at": {"$gte": WINDOW_START},
        })
    finally:
        client.close()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Public track endpoint ----------
def test_track_magic_link_opened(api):
    before = _run_async(_count_events("magic_link_opened"))
    r = api.post(f"{BASE_URL}/api/community/recovery/track",
                 json={"event": "magic_link_opened"})
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True}
    after = _run_async(_count_events("magic_link_opened"))
    assert after == before + 1


def test_track_manual_entry_opened(api):
    before = _run_async(_count_events("manual_entry_opened"))
    r = api.post(f"{BASE_URL}/api/community/recovery/track",
                 json={"event": "manual_entry_opened"})
    assert r.status_code == 200, r.text
    after = _run_async(_count_events("manual_entry_opened"))
    assert after == before + 1


def test_track_rejects_email_sent(api):
    """Client cannot fabricate the server-only email_sent event."""
    before = _run_async(_count_events("email_sent"))
    r = api.post(f"{BASE_URL}/api/community/recovery/track",
                 json={"event": "email_sent"})
    assert r.status_code == 400
    after = _run_async(_count_events("email_sent"))
    assert after == before  # no insert


def test_track_rejects_verify_events(api):
    for ev in ("verify_success", "verify_failed"):
        r = api.post(f"{BASE_URL}/api/community/recovery/track",
                     json={"event": ev})
        assert r.status_code == 400, f"{ev} should be 400"


def test_track_rejects_garbage(api):
    r = api.post(f"{BASE_URL}/api/community/recovery/track",
                 json={"event": "definitely-not-an-event"})
    assert r.status_code == 400
    r = api.post(f"{BASE_URL}/api/community/recovery/track", json={})
    assert r.status_code == 400


# ---------- Admin analytics endpoint ----------
def test_analytics_requires_admin(api):
    r = api.get(f"{BASE_URL}/api/community/recovery/analytics")
    assert r.status_code in (401, 403)


def test_analytics_shape(api):
    r = api.get(f"{BASE_URL}/api/community/recovery/analytics",
                headers={"X-Admin-Token": ADMIN_TOKEN})
    assert r.status_code == 200, r.text
    d = r.json()
    for field in (
        "window_days", "generated_at",
        "email_sent", "magic_link_opened", "manual_entry_opened",
        "verify_failed", "verify_success", "magic_link_share",
    ):
        assert field in d, f"missing {field} in {d}"
    assert d["window_days"] == 30  # default
    assert isinstance(d["magic_link_share"], (int, float))


def test_analytics_share_ratio_math(api):
    r = api.get(f"{BASE_URL}/api/community/recovery/analytics",
                headers={"X-Admin-Token": ADMIN_TOKEN})
    d = r.json()
    magic = d["magic_link_opened"]
    manual = d["manual_entry_opened"]
    expected = round(magic / (magic + manual), 3) if (magic + manual) else 0.0
    assert d["magic_link_share"] == expected


def test_analytics_days_window_respected(api):
    r30 = api.get(f"{BASE_URL}/api/community/recovery/analytics",
                  headers={"X-Admin-Token": ADMIN_TOKEN}).json()
    r7 = api.get(f"{BASE_URL}/api/community/recovery/analytics?days=7",
                 headers={"X-Admin-Token": ADMIN_TOKEN}).json()
    assert r7["window_days"] == 7
    # 7-day counts must be <= 30-day counts
    for f in ("email_sent", "magic_link_opened", "manual_entry_opened",
              "verify_failed", "verify_success"):
        assert r7[f] <= r30[f], f"{f}: 7d={r7[f]} > 30d={r30[f]}"


# ---------- Server-side funnel events ----------
def test_seed_claimed_nickname(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": NICK, "email": EMAIL_OLD})
    assert r.status_code == 200
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter61 seed", "body": "for analytics tests",
        "nickname": NICK, "contributor_email": EMAIL_OLD,
    })
    assert r.status_code == 200


def test_email_sent_event_written_on_request(api):
    before = _run_async(_count_events("email_sent"))
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery",
                 json={"nickname": NICK})
    assert r.status_code == 200
    after = _run_async(_count_events("email_sent"))
    assert after == before + 1, f"expected +1 email_sent, got {before}->{after}"


def test_verify_failed_event_written(api):
    # Plant a known code_hash so wrong-code path is deterministic.
    async def _plant():
        client, db = await _db()
        try:
            await db.nickname_recoveries.update_one(
                {"nickname": NICK},
                {"$set": {
                    "code_hash": _hash(NICK, "999999"),
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
                    "failed_attempts": 0, "locked_until": None,
                }, "$unset": {"code": ""}},
            )
        finally:
            client.close()
    _run_async(_plant())

    before = _run_async(_count_events("verify_failed"))
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery/verify",
                 json={"nickname": NICK, "code": "111111", "new_email": EMAIL_NEW})
    assert r.status_code == 400
    after = _run_async(_count_events("verify_failed"))
    assert after == before + 1


def test_verify_success_event_written(api):
    # Plant a fresh known hash + reset attempts.
    async def _plant():
        client, db = await _db()
        try:
            await db.nickname_recoveries.update_one(
                {"nickname": NICK},
                {"$set": {
                    "code_hash": _hash(NICK, "424242"),
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
                    "failed_attempts": 0, "locked_until": None,
                }, "$unset": {"code": ""}},
                upsert=True,
            )
        finally:
            client.close()
    _run_async(_plant())

    before = _run_async(_count_events("verify_success"))
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery/verify",
                 json={"nickname": NICK, "code": "424242", "new_email": EMAIL_NEW})
    assert r.status_code == 200, r.text
    after = _run_async(_count_events("verify_success"))
    assert after == before + 1


# ---------- Cleanup ----------
def test_zzz_cleanup(api):
    headers = {"X-Admin-Token": ADMIN_TOKEN}
    r = api.get(f"{BASE_URL}/api/community/tips", headers=headers)
    if r.status_code == 200:
        for t in r.json().get("tips", []):
            if (t.get("heading") or "").startswith("TEST_iter61"):
                api.delete(f"{BASE_URL}/api/community/tips/{t['id']}", headers=headers)

    async def _clean():
        client, db = await _db()
        try:
            await db.nickname_reservations.delete_many({"nickname": NICK})
            await db.nickname_recoveries.delete_many({"nickname": NICK})
            # Purge test-authored recovery_events within our test window so
            # subsequent iterations aren't skewed. Server events written from
            # our seeded nickname are indistinguishable, so we prune the whole
            # test-run window — safe because this is a preview DB.
            await db.recovery_events.delete_many({"at": {"$gte": WINDOW_START}})
        finally:
            client.close()
    try:
        _run_async(_clean())
    except Exception as e:
        print(f"cleanup: {e}")
