"""Iteration 56 — Contributor Thank-You + Featured Tip Analytics.

Covers:
- POST /api/community/tip with contributor_email/contributor_opt_in normalization
- GET  /api/community/tips exposes contributor fields
- POST /api/community/tips/{id}/promote fires _send_thank_you asynchronously
  (RESEND_API_KEY empty -> silent skip; thank_you_sent_at remains null)
- POST /api/community/events (public, no auth) filtering + write count + cap
- GET  /api/community/analytics (admin) counts + unique installs + sort + auth
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
API = f"{BASE_URL}/api"
ADMIN_HDR = {"X-Admin-Token": ADMIN_TOKEN}


@pytest.fixture(scope="module")
def created_tip_ids():
    ids = []
    yield ids
    # teardown
    for tid in ids:
        try:
            requests.delete(f"{API}/community/tips/{tid}", headers=ADMIN_HDR, timeout=10)
        except Exception:
            pass


# ---------- Contributor Thank-You ----------

def _submit_tip(payload):
    payload.setdefault("heading", "TEST_iter56 heading")
    payload.setdefault("body", payload.pop("text", "TEST_iter56 body content"))
    r = requests.post(f"{API}/community/tip", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    return r.json()


def test_submit_tip_with_valid_email_and_optin(created_tip_ids):
    body = _submit_tip({
        "text": "TEST_iter56 valid email tip",
        "resource_id": "test-guide",
        "resource_title": "Test Guide",
        "contributor_email": "  Iter56Alice@Example.COM  ",
        "contributor_opt_in": True,
    })
    assert body.get("ok") is True
    tip_id = body["id"]
    created_tip_ids.append(tip_id)

    # verify via admin listing
    r = requests.get(f"{API}/community/tips", headers=ADMIN_HDR, timeout=10)
    assert r.status_code == 200
    tips = {t["id"]: t for t in r.json()["tips"]}
    assert tip_id in tips
    t = tips[tip_id]
    assert t["contributor_email"] == "iter56alice@example.com"  # lowered + trimmed
    assert t["contributor_opt_in"] is True
    assert t["thank_you_sent_at"] is None


def test_submit_tip_invalid_email_stripped(created_tip_ids):
    body = _submit_tip({
        "text": "TEST_iter56 invalid email tip",
        "contributor_email": "not-an-email",
        "contributor_opt_in": True,
    })
    tip_id = body["id"]
    created_tip_ids.append(tip_id)
    r = requests.get(f"{API}/community/tips", headers=ADMIN_HDR, timeout=10)
    t = next(x for x in r.json()["tips"] if x["id"] == tip_id)
    assert t["contributor_email"] is None
    assert t["contributor_opt_in"] is False  # coerced


def test_submit_tip_optin_without_email(created_tip_ids):
    body = _submit_tip({
        "text": "TEST_iter56 optin no email",
        "contributor_opt_in": True,
    })
    tip_id = body["id"]
    created_tip_ids.append(tip_id)
    r = requests.get(f"{API}/community/tips", headers=ADMIN_HDR, timeout=10)
    t = next(x for x in r.json()["tips"] if x["id"] == tip_id)
    assert t["contributor_email"] is None
    assert t["contributor_opt_in"] is False


def test_promote_optin_tip_silent_skips_thank_you(created_tip_ids):
    # Submit opt-in tip
    body = _submit_tip({
        "text": "TEST_iter56 promote opt-in",
        "resource_id": "test-guide",
        "resource_title": "Test Guide",
        "contributor_email": "iter56bob@example.com",
        "contributor_opt_in": True,
    })
    tip_id = body["id"]
    created_tip_ids.append(tip_id)

    r = requests.post(f"{API}/community/tips/{tip_id}/promote", headers=ADMIN_HDR, timeout=10)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "promoted"

    # allow task to run
    time.sleep(1.5)
    r = requests.get(f"{API}/community/tips", headers=ADMIN_HDR, timeout=10)
    t = next(x for x in r.json()["tips"] if x["id"] == tip_id)
    assert t["thank_you_sent_at"] is None  # skipped bc RESEND_API_KEY empty
    assert t["status"] == "promoted"


# ---------- Analytics Events ----------

TEST_TIP_A = f"TEST_analytics_A_{uuid.uuid4().hex[:8]}"
TEST_TIP_B = f"TEST_analytics_B_{uuid.uuid4().hex[:8]}"


def test_events_public_no_auth_and_filters_invalid():
    payload = {"events": [
        {"event": "impression", "tip_id": TEST_TIP_A, "install_id": "inst-1"},
        {"event": "open",       "tip_id": TEST_TIP_A, "install_id": "inst-1"},
        {"event": "open",       "tip_id": TEST_TIP_A, "install_id": "inst-2"},
        {"event": "dismiss",    "tip_id": TEST_TIP_A, "install_id": "inst-2"},
        {"event": "impression", "tip_id": TEST_TIP_B, "install_id": "inst-1"},
        {"event": "open",       "tip_id": TEST_TIP_B, "install_id": "inst-3"},
        {"event": "click",      "tip_id": TEST_TIP_B, "install_id": "inst-3"},   # invalid — filtered
        {"event": "impression", "tip_id": "",         "install_id": "inst-x"},   # empty tip — filtered
    ]}
    r = requests.post(f"{API}/community/events", json=payload, timeout=10)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["ok"] is True
    assert data["written"] == 6  # 2 filtered


def test_events_cap_at_50():
    events = [{"event": "impression", "tip_id": TEST_TIP_A, "install_id": f"cap-{i}"} for i in range(75)]
    r = requests.post(f"{API}/community/events", json={"events": events}, timeout=15)
    assert r.status_code == 200
    assert r.json()["written"] == 50


def test_analytics_requires_admin():
    r = requests.get(f"{API}/community/analytics?days=30", timeout=10)
    assert r.status_code == 401


def test_analytics_aggregation_and_sort():
    r = requests.get(f"{API}/community/analytics?days=30", headers=ADMIN_HDR, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["window_days"] == 30
    assert "generated_at" in data
    assert data["total_events"] >= 6 + 50  # from prior two tests

    tips_by_id = {t["tip_id"]: t for t in data["tips"]}
    assert TEST_TIP_A in tips_by_id
    assert TEST_TIP_B in tips_by_id

    a = tips_by_id[TEST_TIP_A]
    assert a["impressions"] >= 1 + 50  # first test + cap test
    assert a["opens"] == 2
    assert a["dismisses"] == 1
    # unique installs across both event batches for tip A: inst-1, inst-2, cap-0..cap-49 => 52
    assert a["unique_installs"] >= 3

    b = tips_by_id[TEST_TIP_B]
    assert b["impressions"] == 1
    assert b["opens"] == 1
    assert b["dismisses"] == 0
    assert b["unique_installs"] == 2  # inst-1, inst-3
    assert b["heading"] == "(missing tip)"  # orphan (no matching community_tips doc)

    # Sort: opens desc, then impressions desc — verify globally
    opens_list = [t["opens"] for t in data["tips"]]
    assert opens_list == sorted(opens_list, reverse=True)


def test_events_empty_array():
    r = requests.post(f"{API}/community/events", json={"events": []}, timeout=10)
    assert r.status_code == 200
    assert r.json() == {"ok": True, "written": 0}


# ---------- Regression: existing endpoints ----------

def test_regression_featured_public():
    r = requests.get(f"{API}/community/featured", timeout=10)
    assert r.status_code == 200
    body = r.json()
    assert "total_promoted" in body


def test_regression_promoted_list_public():
    r = requests.get(f"{API}/community/promoted", timeout=10)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_regression_digest_status_admin():
    r = requests.get(f"{API}/community/digest/status", headers=ADMIN_HDR, timeout=10)
    assert r.status_code == 200
    assert "enabled" in r.json()


# ---------- Cleanup analytics events ----------

@pytest.fixture(scope="module", autouse=True)
def _cleanup_events():
    yield
    # Best-effort: purge test events via mongo directly (no API endpoint).
    try:
        import asyncio
        from motor.motor_asyncio import AsyncIOMotorClient
        mongo_url = os.environ["MONGO_URL"]
        db_name = os.environ["DB_NAME"]
        async def _run():
            client = AsyncIOMotorClient(mongo_url)
            await client[db_name].community_events.delete_many(
                {"tip_id": {"$in": [TEST_TIP_A, TEST_TIP_B]}}
            )
            client.close()
        asyncio.run(_run())
    except Exception as e:
        print(f"cleanup skipped: {e}")
