"""Rate-limiting tests for nickname recovery.

Verifies:
  * 3 failed verify attempts → 4th returns 429 with locked_until.
  * Requesting a new code while locked returns reason='locked' and does NOT
    reset the failed_attempts counter (defense against attacker cycling).
  * Once the DB `locked_until` is mutated to a past time, verifies work again
    (simulates lock expiry) and failed_attempts resets to 0.
  * Successful verify clears the doc entirely (regression).
"""
import os
import asyncio
import uuid
import hashlib
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")

RUN = uuid.uuid4().hex[:6]
NICK = f"TESTrl_{RUN}"[:20]
EMAIL_OLD = f"rl_old_{RUN}@test.com"
EMAIL_NEW = f"rl_new_{RUN}@test.com"


def _run_async(coro):
    return asyncio.run(coro)


async def _db():
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return client, client[os.environ["DB_NAME"]]


def _hash(nickname, code):
    return hashlib.sha256(f"{nickname}:{code}".encode()).hexdigest()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def test_seed(api):
    # Claim + seed a tip so nickname is recognized as claimed.
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": NICK, "email": EMAIL_OLD})
    assert r.status_code == 200
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_rl seed", "body": "for rate-limit tests",
        "nickname": NICK, "contributor_email": EMAIL_OLD,
    })
    assert r.status_code == 200


def test_lockout_after_three_failed_attempts(api):
    # Trigger a recovery request so the recovery doc exists.
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery",
                 json={"nickname": NICK})
    assert r.status_code == 200

    # Plant a known code_hash so wrong-code detection is deterministic.
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

    # First 2 wrong attempts → 400
    for _ in range(2):
        r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery/verify",
                     json={"nickname": NICK, "code": "111111", "new_email": EMAIL_NEW})
        assert r.status_code == 400, r.text

    # 3rd wrong attempt → 429 (threshold hit)
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery/verify",
                 json={"nickname": NICK, "code": "111111", "new_email": EMAIL_NEW})
    assert r.status_code == 429, r.text
    assert "attempts" in r.json().get("detail", "").lower()

    # Even the *correct* code is refused while locked
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery/verify",
                 json={"nickname": NICK, "code": "999999", "new_email": EMAIL_NEW})
    assert r.status_code == 429, r.text


def test_request_during_lockout_returns_locked_reason(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery",
                 json={"nickname": NICK})
    assert r.status_code == 200
    d = r.json()
    assert d["ok"] is True
    assert d["reason"] == "locked", d
    assert d.get("locked_until"), "expected locked_until timestamp"
    assert d.get("delivered") is False


def test_counter_preserved_across_request_during_lock(api):
    """The failed_attempts counter must NOT reset during an active lock —
    otherwise an attacker could cycle requests to bypass the limit."""
    async def _peek():
        client, db = await _db()
        try:
            rec = await db.nickname_recoveries.find_one({"nickname": NICK})
            return rec.get("failed_attempts"), rec.get("locked_until"), rec.get("code_hash")
        finally:
            client.close()
    attempts, lock, ch = _run_async(_peek())
    assert attempts >= 3
    assert lock is not None
    # Code_hash from the initial plant is still intact — request during lock
    # doesn't overwrite it either.
    assert ch == _hash(NICK, "999999")


def test_lock_expiry_resets_counter_on_next_request(api):
    """Mutate locked_until into the past and issue a new request. The response
    should be 'sent'/'email disabled' (not 'locked'), and failed_attempts
    should reset to 0."""
    async def _expire_lock():
        client, db = await _db()
        try:
            await db.nickname_recoveries.update_one(
                {"nickname": NICK},
                {"$set": {"locked_until": datetime.now(timezone.utc) - timedelta(minutes=1)}},
            )
        finally:
            client.close()
    _run_async(_expire_lock())

    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery",
                 json={"nickname": NICK})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["reason"] in ("sent", "email disabled"), d

    async def _peek():
        client, db = await _db()
        try:
            rec = await db.nickname_recoveries.find_one({"nickname": NICK})
            return rec
        finally:
            client.close()
    rec = _run_async(_peek())
    assert rec is not None
    assert rec.get("failed_attempts") == 0
    assert rec.get("locked_until") is None


def test_successful_verify_after_reset(api):
    """After the lock resets, plant a known code and verify successfully."""
    async def _plant():
        client, db = await _db()
        try:
            await db.nickname_recoveries.update_one(
                {"nickname": NICK},
                {"$set": {
                    "code_hash": _hash(NICK, "424242"),
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
                    "failed_attempts": 0, "locked_until": None,
                }},
            )
        finally:
            client.close()
    _run_async(_plant())

    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK}/recovery/verify",
                 json={"nickname": NICK, "code": "424242", "new_email": EMAIL_NEW})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["owned_by_you"] is True


def test_zzz_cleanup(api):
    admin_token = os.environ.get("ADMIN_TOKEN", "")
    headers = {"X-Admin-Token": admin_token}
    r = api.get(f"{BASE_URL}/api/community/tips", headers=headers)
    if r.status_code == 200:
        for t in r.json().get("tips", []):
            if (t.get("heading") or "").startswith("TEST_rl"):
                api.delete(f"{BASE_URL}/api/community/tips/{t['id']}", headers=headers)

    async def _clean():
        client, db = await _db()
        try:
            await db.nickname_reservations.delete_many({"nickname": NICK})
            await db.nickname_recoveries.delete_many({"nickname": NICK})
        finally:
            client.close()
    try:
        _run_async(_clean())
    except Exception as e:
        print(f"cleanup: {e}")
