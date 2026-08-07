"""Tests for iteration 58 — Nickname Reservations (implicit + explicit).

Covers:
  * GET  /api/community/nicknames/{nickname}/status
  * POST /api/community/nicknames/reserve
  * POST /api/community/tip 409 collision behaviour (implicit + explicit)
  * Validation errors (400)
  * Regression: featured, contributors, promoted still work.

Test data is prefixed TEST_iter58_ + cleaned in test_zzz_cleanup.
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "irr-admin-8f3a2b91c4d7e6f5")

# Unique run-scoped nickname suffix so re-runs don't collide.
RUN = uuid.uuid4().hex[:6]
NICK_EXPLICIT = f"TESTe58_{RUN}"[:20]
NICK_IMPLICIT = f"TESTi58_{RUN}"[:20]
NICK_FREE = f"TESTf58_{RUN}"[:20]
EMAIL_A = f"a_{RUN}@test.com"
EMAIL_B = f"b_{RUN}@test.com"

CREATED_TIP_IDS: list = []


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Nickname status endpoint ----------
def test_status_free(api):
    r = api.get(f"{BASE_URL}/api/community/nicknames/{NICK_FREE}/status")
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["available"] is True
    assert d["reason"] == "free"
    assert d["owned_by_you"] is False


def test_status_invalid_format(api):
    # Nickname regex is strict — hyphen is invalid
    r = api.get(f"{BASE_URL}/api/community/nicknames/bad-name/status")
    assert r.status_code == 200
    d = r.json()
    assert d["available"] is False
    assert d["reason"] == "invalid"


# ---------- Explicit reservation flow ----------
def test_reserve_new_nickname(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": NICK_EXPLICIT, "email": EMAIL_A})
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["reason"] == "claimed_by_you"
    assert d["owned_by_you"] is True
    assert d["available"] is True


def test_reserve_idempotent_same_email(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": NICK_EXPLICIT, "email": EMAIL_A})
    assert r.status_code == 200
    assert r.json()["reason"] == "claimed_by_you"


def test_reserve_different_email_conflict(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": NICK_EXPLICIT, "email": EMAIL_B})
    assert r.status_code == 409, r.text


def test_status_after_reserve_owner(api):
    r = api.get(f"{BASE_URL}/api/community/nicknames/{NICK_EXPLICIT}/status",
                params={"email": EMAIL_A})
    assert r.status_code == 200
    d = r.json()
    assert d["available"] is True
    assert d["reason"] == "claimed_by_you"
    assert d["owned_by_you"] is True


def test_status_after_reserve_stranger(api):
    r = api.get(f"{BASE_URL}/api/community/nicknames/{NICK_EXPLICIT}/status",
                params={"email": EMAIL_B})
    assert r.status_code == 200
    d = r.json()
    assert d["available"] is False
    assert d["reason"] == "taken"
    assert d["owned_by_you"] is False


# ---------- Reserve validation ----------
def test_reserve_invalid_nickname_400(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": "bad-name!", "email": EMAIL_A})
    assert r.status_code == 400
    assert "Invalid nickname format" in r.json().get("detail", "")


def test_reserve_missing_email_400(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": f"okname_{RUN}"[:20], "email": ""})
    assert r.status_code == 400
    assert "Valid email required" in r.json().get("detail", "")


def test_reserve_malformed_email_400(api):
    r = api.post(f"{BASE_URL}/api/community/nicknames/reserve",
                 json={"nickname": f"okname2_{RUN}"[:20], "email": "notanemail"})
    assert r.status_code == 400


# ---------- Tip submission collision ----------
def test_tip_submit_conflict_wrong_email(api):
    # NICK_EXPLICIT owned by EMAIL_A; submit with EMAIL_B → 409
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter58 conflict tip",
        "body": "should fail",
        "nickname": NICK_EXPLICIT,
        "contributor_email": EMAIL_B,
    })
    assert r.status_code == 409, r.text


def test_tip_submit_ok_owner_email(api):
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter58 owner tip",
        "body": "should succeed",
        "nickname": NICK_EXPLICIT,
        "contributor_email": EMAIL_A,
    })
    assert r.status_code == 200, r.text
    tip_id = r.json()["id"]
    CREATED_TIP_IDS.append(tip_id)


def test_tip_submit_conflict_no_email(api):
    # Owned nickname but no email supplied → 409
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter58 anon on owned",
        "body": "should fail",
        "nickname": NICK_EXPLICIT,
    })
    assert r.status_code == 409


# ---------- Implicit reservation via tip submission ----------
def test_implicit_reservation_first_tip(api):
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter58 implicit first",
        "body": "seeds implicit reservation",
        "nickname": NICK_IMPLICIT,
        "contributor_email": EMAIL_A,
    })
    assert r.status_code == 200
    CREATED_TIP_IDS.append(r.json()["id"])


def test_implicit_reservation_second_wrong_email(api):
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter58 implicit collide",
        "body": "should fail — different email",
        "nickname": NICK_IMPLICIT,
        "contributor_email": EMAIL_B,
    })
    assert r.status_code == 409


def test_implicit_reservation_same_email_ok(api):
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter58 implicit same",
        "body": "should pass",
        "nickname": NICK_IMPLICIT,
        "contributor_email": EMAIL_A,
    })
    assert r.status_code == 200
    CREATED_TIP_IDS.append(r.json()["id"])


# ---------- Regression sanity ----------
def test_regression_contributors_public(api):
    r = api.get(f"{BASE_URL}/api/community/contributors")
    assert r.status_code == 200
    assert "contributors" in r.json()


def test_regression_featured_public(api):
    r = api.get(f"{BASE_URL}/api/community/featured")
    assert r.status_code == 200
    d = r.json()
    assert "tip" in d and "total_promoted" in d


def test_regression_promoted_public(api):
    r = api.get(f"{BASE_URL}/api/community/promoted")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_regression_admin_tips_requires_token(api):
    r = api.get(f"{BASE_URL}/api/community/tips")
    assert r.status_code in (401, 403)
    r2 = api.get(f"{BASE_URL}/api/community/tips",
                 headers={"X-Admin-Token": ADMIN_TOKEN})
    assert r2.status_code == 200


def test_regression_anonymous_tip_no_nickname(api):
    r = api.post(f"{BASE_URL}/api/community/tip", json={
        "heading": "TEST_iter58 anon",
        "body": "no nickname → always ok",
    })
    assert r.status_code == 200
    CREATED_TIP_IDS.append(r.json()["id"])


def test_regression_notes_crud(api):
    payload = {"title": "TEST_iter58 note", "content": "test"}
    r = api.post(f"{BASE_URL}/api/notes", json=payload)
    assert r.status_code in (200, 201), r.text
    nid = r.json().get("id")
    g = api.get(f"{BASE_URL}/api/notes/{nid}")
    assert g.status_code == 200
    d = api.delete(f"{BASE_URL}/api/notes/{nid}")
    assert d.status_code in (200, 204)


# ---------- Cleanup ----------
def test_zzz_cleanup(api):
    """Delete TEST_iter58 tips + reservations directly via admin & DB helpers."""
    headers = {"X-Admin-Token": ADMIN_TOKEN}
    for tip_id in CREATED_TIP_IDS:
        try:
            api.delete(f"{BASE_URL}/api/community/tips/{tip_id}", headers=headers)
        except Exception:
            pass
    # Also clean any leftover TEST_iter58 tips
    r = api.get(f"{BASE_URL}/api/community/tips", headers=headers)
    if r.status_code == 200:
        for t in r.json().get("tips", []):
            if (t.get("heading") or "").startswith("TEST_iter58"):
                api.delete(f"{BASE_URL}/api/community/tips/{t['id']}", headers=headers)
    # Reservations: no admin endpoint → go direct via mongo
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")
        if mongo_url and db_name:
            async def _clean():
                client = AsyncIOMotorClient(mongo_url)
                await client[db_name].nickname_reservations.delete_many(
                    {"nickname": {"$in": [NICK_EXPLICIT, NICK_IMPLICIT, NICK_FREE]}}
                )
                client.close()
            asyncio.run(_clean())
    except Exception as e:
        print(f"Reservation cleanup skipped: {e}")
