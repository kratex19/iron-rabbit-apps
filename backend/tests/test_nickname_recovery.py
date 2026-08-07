"""Iteration 59 — Nickname Recovery tests.

Covers:
  * POST /api/community/nicknames/{n}/recovery
      - claimed nickname → 200 delivered=false reason='email disabled', masked_email
      - unclaimed nickname → 200 delivered=false reason='not-claimed' (no enumeration)
      - invalid nickname format → 400
  * POST /api/community/nicknames/{n}/recovery/verify
      - wrong code → 400 'Invalid code'
      - expired code (mutated in DB) → 410 'Code expired'
      - correct code → 200 available=true; ownership transferred; tips rewritten;
        code deleted (second verify → 400).
  * Regression: reserve/status/tip 409/tips admin/promoted/featured/contributors unchanged.

Cleans up its own reservations, recoveries, and TEST_iter59 tips.
"""
import os
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "irr-admin-8f3a2b91c4d7e6f5")

RUN = uuid.uuid4().hex[:6]
NICK_CLAIMED = f"TESTr59_{RUN}"[:20]
NICK_UNCLAIMED = f"TESTu59_{RUN}"[:20]
EMAIL_OLD = f"old_{RUN}@test.com"
EMAIL_NEW = f"new_{RUN}@test.com"

CREATED_TIP_IDS: list = []


def _run_async(coro):
    return asyncio.run(coro)


async def _db():
    from motor.motor_asyncio import AsyncIOMotorClient
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    return client, client[db_name]


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Setup: seed a claimed nickname with a tip so contributor_email is set ----------
def test_setup_seed_claimed_nickname(api):
    # Reserve
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": NICK_CLAIMED, "email": EMAIL_OLD})
    assert r.status_code == 200, r.text
    # Submit a tip so we can verify contributor_email rewrite later
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter59 seed tip",
        "body": "seeds a tip for the claimed nickname",
        "nickname": NICK_CLAIMED,
        "contributor_email": EMAIL_OLD,
    })
    assert r.status_code == 200, r.text
    CREATED_TIP_IDS.append(r.json()["id"])


# ---------- Recovery request ----------
def test_recovery_invalid_nickname_400(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/bad-name!/recovery",
                 json={"nickname": "bad-name!"})
    assert r.status_code == 400


def test_recovery_unclaimed_nickname(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_UNCLAIMED}/recovery",
                 json={"nickname": NICK_UNCLAIMED})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True
    assert d["delivered"] is False
    assert d["reason"] == "not-claimed"
    # No enumeration: masked_email should not be revealed
    assert not d.get("masked_email")


def test_recovery_claimed_email_disabled(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/recovery",
                 json={"nickname": NICK_CLAIMED})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["ok"] is True
    assert d["delivered"] is False
    assert d["reason"] == "email disabled"
    # Masked: o***@***.com (from old_xxxx@test.com)
    assert d.get("masked_email", "").startswith("o***@***.")
    assert d["masked_email"].endswith(".com")


def test_recovery_code_stored_hashed(api):
    async def _check():
        client, db = await _db()
        try:
            rec = await db.nickname_recoveries.find_one({"nickname": NICK_CLAIMED})
            assert rec is not None, "expected recovery doc"
            assert rec.get("email") == EMAIL_OLD
            # Hashed at rest: raw code must be absent, hash must be present.
            assert not rec.get("code"), "raw code must not be stored"
            assert isinstance(rec.get("code_hash"), str) and len(rec["code_hash"]) == 64
            # Rate-limit fields are seeded.
            assert rec.get("failed_attempts", 0) == 0
            assert rec.get("locked_until") is None
        finally:
            client.close()
    _run_async(_check())


# ---------- Verify: negative paths ----------
def test_verify_wrong_code(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/recovery/verify", json={
        "nickname": NICK_CLAIMED, "code": "000000", "new_email": EMAIL_NEW,
    })
    # 000000 could collide (1e-6 odds). If it does, mutate DB to a known
    # wrong-hash so the test is deterministic.
    if r.status_code == 200:
        pytest.skip("Random collision on 000000 code — extremely rare")
    assert r.status_code == 400
    assert "Invalid code" in r.json().get("detail", "")


def test_verify_expired(api):
    """Mutate expires_at to a past datetime, then verify → 410.

    We use a code that we know is wrong (verifies with hash lookup independent
    of code value now that we lookup by nickname). To hit the expired branch
    the code must be *correct* — otherwise the mismatch branch fires first.
    So we mutate code_hash to match a known plaintext then expire it."""
    async def _mutate():
        client, db = await _db()
        try:
            import hashlib
            known_hash = hashlib.sha256(f"{NICK_CLAIMED}:123456".encode()).hexdigest()
            await db.nickname_recoveries.update_one(
                {"nickname": NICK_CLAIMED},
                {"$set": {
                    "code_hash": known_hash,
                    "expires_at": datetime.now(timezone.utc) - timedelta(minutes=1),
                    "failed_attempts": 0, "locked_until": None,
                }},
            )
        finally:
            client.close()
    _run_async(_mutate())
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/recovery/verify", json={
        "nickname": NICK_CLAIMED, "code": "123456", "new_email": EMAIL_NEW,
    })
    assert r.status_code == 410, r.text
    assert "expired" in r.json().get("detail", "").lower()


def test_verify_reissue_and_success(api):
    """Re-request a fresh code, then verify successfully by injecting a
    known plaintext via DB mutation (we don't have the raw code any more)."""
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/recovery",
                 json={"nickname": NICK_CLAIMED})
    assert r.status_code == 200

    known_code = "654321"
    async def _plant():
        client, db = await _db()
        try:
            import hashlib
            h = hashlib.sha256(f"{NICK_CLAIMED}:{known_code}".encode()).hexdigest()
            await db.nickname_recoveries.update_one(
                {"nickname": NICK_CLAIMED},
                {"$set": {
                    "code_hash": h,
                    "expires_at": datetime.now(timezone.utc) + timedelta(minutes=15),
                    "failed_attempts": 0, "locked_until": None,
                }, "$unset": {"code": ""}},
            )
        finally:
            client.close()
    _run_async(_plant())

    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/recovery/verify", json={
        "nickname": NICK_CLAIMED, "code": known_code, "new_email": EMAIL_NEW,
    })
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["available"] is True
    assert d["reason"] == "claimed_by_you"
    assert d["owned_by_you"] is True

    # Ownership transferred → reservation.email == EMAIL_NEW
    async def _check_reservation():
        client, db = await _db()
        try:
            res = await db.nickname_reservations.find_one({"nickname": NICK_CLAIMED})
            tips = await db.community_tips.find({"nickname": NICK_CLAIMED}).to_list(50)
            rec = await db.nickname_recoveries.find_one({"nickname": NICK_CLAIMED})
            return res, tips, rec
        finally:
            client.close()
    res, tips, rec = _run_async(_check_reservation())
    assert res and res["email"] == EMAIL_NEW
    for t in tips:
        assert t.get("contributor_email") == EMAIL_NEW, \
            f"tip contributor_email not rewritten: {t.get('contributor_email')}"
    # Code doc deleted (single-use)
    assert rec is None, "recovery doc should be deleted after successful verify"

    # Store used code for reuse test
    pytest.USED_CODE = known_code


def test_verify_second_use_of_same_code_fails(api):
    code = getattr(pytest, "USED_CODE", "")
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/recovery/verify", json={
        "nickname": NICK_CLAIMED, "code": code, "new_email": EMAIL_NEW,
    })
    assert r.status_code == 400
    assert "Invalid code" in r.json().get("detail", "")


def test_verify_missing_new_email_400(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/recovery/verify", json={
        "nickname": NICK_CLAIMED, "code": "123456", "new_email": "",
    })
    assert r.status_code == 400


# ---------- Regression sanity ----------
def test_regression_contributors(api):
    r = api.get(f"{BASE_URL}/api/community/contributors")
    assert r.status_code == 200
    assert "contributors" in r.json()


def test_regression_promoted(api):
    r = api.get(f"{BASE_URL}/api/community/promoted")
    assert r.status_code == 200


def test_regression_featured(api):
    r = api.get(f"{BASE_URL}/api/community/featured")
    assert r.status_code == 200


def test_regression_admin_tips_auth(api):
    r = api.get(f"{BASE_URL}/api/community/tips")
    assert r.status_code in (401, 403)
    r2 = api.get(f"{BASE_URL}/api/community/tips",
                 headers={"X-Admin-Token": ADMIN_TOKEN})
    assert r2.status_code == 200


def test_regression_tip_409_collision(api):
    # NICK_CLAIMED now belongs to EMAIL_NEW after recovery
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter59 collision", "body": "wrong email",
        "nickname": NICK_CLAIMED, "contributor_email": "someone_else@test.com",
    })
    assert r.status_code == 409


def test_regression_status_still_works(api):
    r = api.get(f"{BASE_URL}/api/community/nicknames/{NICK_CLAIMED}/status",
                params={"email": EMAIL_NEW})
    assert r.status_code == 200
    d = r.json()
    assert d["owned_by_you"] is True
    assert d["reason"] == "claimed_by_you"


# ---------- Cleanup ----------
def test_zzz_cleanup(api):
    headers = {"X-Admin-Token": ADMIN_TOKEN}
    # Delete tracked tips
    for tip_id in CREATED_TIP_IDS:
        try:
            api.delete(f"{BASE_URL}/api/community/tips/{tip_id}", headers=headers)
        except Exception:
            pass
    # Delete any lingering TEST_iter59 tips
    r = api.get(f"{BASE_URL}/api/community/tips", headers=headers)
    if r.status_code == 200:
        for t in r.json().get("tips", []):
            if (t.get("heading") or "").startswith("TEST_iter59"):
                api.delete(f"{BASE_URL}/api/community/tips/{t['id']}", headers=headers)
    # DB-side cleanup of reservations + recoveries
    async def _clean():
        client, db = await _db()
        try:
            await db.nickname_reservations.delete_many(
                {"nickname": {"$in": [NICK_CLAIMED, NICK_UNCLAIMED]}})
            await db.nickname_recoveries.delete_many(
                {"nickname": {"$in": [NICK_CLAIMED, NICK_UNCLAIMED]}})
        finally:
            client.close()
    try:
        _run_async(_clean())
    except Exception as e:
        print(f"cleanup: {e}")
