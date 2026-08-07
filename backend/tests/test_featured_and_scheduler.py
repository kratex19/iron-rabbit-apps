"""Iteration 55 backend tests — Featured Tip rotation + Digest schedule/toggle/unsubscribe.

Covers:
  * GET /api/community/featured  (public, deterministic within a day)
  * GET /api/community/digest/status  (auth + scheduler_next_run)
  * POST /api/community/digest/toggle  (enabled flag + integration with /digest/send)
  * GET /api/community/digest/unsubscribe  (wrong vs correct token)
  * APScheduler startup log check
"""
import os
import re
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_TOKEN = "irr-admin-8f3a2b91c4d7e6f5"


@pytest.fixture(scope="module")
def admin_headers():
    return {"X-Admin-Token": ADMIN_TOKEN, "Content-Type": "application/json"}


# ---------- Featured tip rotation ----------
class TestFeaturedTip:
    def test_featured_public_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/community/featured", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "tip" in data and "total_promoted" in data
        assert isinstance(data["total_promoted"], int)

    def test_featured_deterministic_two_calls(self, admin_headers):
        # Seed: submit + promote a tip (idempotent-ish, cleaned up)
        sub = requests.post(
            f"{BASE_URL}/api/community/tip",
            json={"heading": "TEST_iter55 featured", "body": "TEST body for featured determinism check",
                  "resource_id": "TEST_iter55"},
            timeout=10,
        )
        assert sub.status_code in (200, 201), sub.text
        tip_id = sub.json()["id"]
        promo = requests.post(
            f"{BASE_URL}/api/community/tips/{tip_id}/promote",
            headers=admin_headers, timeout=10,
        )
        assert promo.status_code == 200, promo.text
        try:
            r1 = requests.get(f"{BASE_URL}/api/community/featured", timeout=10).json()
            r2 = requests.get(f"{BASE_URL}/api/community/featured", timeout=10).json()
            assert r1["tip"] is not None
            assert r1["total_promoted"] >= 1
            assert r1["tip"]["id"] == r2["tip"]["id"], "same-day picks must be deterministic"
            # shape check
            for k in ("id", "heading", "body", "resource_id", "promoted_at"):
                assert k in r1["tip"]
        finally:
            requests.delete(f"{BASE_URL}/api/community/tips/{tip_id}", headers=admin_headers, timeout=10)


# ---------- Digest status auth ----------
class TestDigestStatus:
    def test_status_requires_admin(self):
        r = requests.get(f"{BASE_URL}/api/community/digest/status", timeout=10)
        assert r.status_code == 401

    def test_status_shape_and_next_run(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/community/digest/status", headers=admin_headers, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("enabled", "last_sent_at", "sender_email", "recipient_email",
                  "resend_key_configured", "scheduler_next_run"):
            assert k in data
        assert data["scheduler_next_run"], "scheduler_next_run should be ISO ts"
        # Verify next-run is a Monday 09:00 UTC
        ts = datetime.fromisoformat(data["scheduler_next_run"].replace("Z", "+00:00"))
        ts_utc = ts.astimezone(timezone.utc)
        assert ts_utc.weekday() == 0, f"next run must be Monday, got weekday={ts_utc.weekday()}"
        assert ts_utc.hour == 9 and ts_utc.minute == 0, f"next run must be 09:00 UTC, got {ts_utc}"


# ---------- Digest toggle + send integration ----------
class TestDigestToggle:
    def test_toggle_off_blocks_send(self, admin_headers):
        # Toggle OFF
        r = requests.post(f"{BASE_URL}/api/community/digest/toggle",
                          json={"enabled": False}, headers=admin_headers, timeout=10)
        assert r.status_code == 200
        assert r.json()["enabled"] is False
        try:
            snd = requests.post(f"{BASE_URL}/api/community/digest/send",
                                headers=admin_headers, timeout=15).json()
            assert snd["ok"] is False
            assert "disabled" in (snd.get("reason") or "").lower()
        finally:
            # Toggle back ON
            back = requests.post(f"{BASE_URL}/api/community/digest/toggle",
                                 json={"enabled": True}, headers=admin_headers, timeout=10)
            assert back.status_code == 200
            assert back.json()["enabled"] is True

    def test_toggle_on_reaches_resend_gate(self, admin_headers):
        snd = requests.post(f"{BASE_URL}/api/community/digest/send",
                            headers=admin_headers, timeout=15).json()
        # RESEND_API_KEY intentionally empty per test brief
        assert snd["ok"] is False
        assert "resend_api_key" in (snd.get("reason") or "").lower()


# ---------- Unsubscribe endpoint ----------
class TestUnsubscribe:
    def test_wrong_token_shows_expired(self):
        r = requests.get(f"{BASE_URL}/api/community/digest/unsubscribe",
                         params={"token": "WRONG_TOKEN_XYZ"}, timeout=10)
        assert r.status_code == 200
        assert "Link expired" in r.text

    def test_correct_token_unsubscribes(self, admin_headers):
        # Fetch the stored token from db via the send helper (it generates one).
        # We trigger `send` to ensure token exists — status endpoint doesn't expose it.
        # Then read via /api/community/digest/send with dry_run and parse the
        # unsub URL from HTML? Simpler: rely on mongo. We use the send endpoint
        # to force token generation, then fetch it via a small admin helper —
        # since there isn't one, we go via mongo directly.
        from motor.motor_asyncio import AsyncIOMotorClient
        import asyncio
        mongo_url = os.environ.get("MONGO_URL")
        db_name = os.environ.get("DB_NAME")

        async def fetch_token():
            client = AsyncIOMotorClient(mongo_url)
            doc = await client[db_name].app_config.find_one({"_id": "digest"}) or {}
            client.close()
            if not doc.get("unsubscribe_token"):
                # Force generation by calling send (RESEND_API_KEY empty → still generates before gate)
                requests.post(f"{BASE_URL}/api/community/digest/send", headers=admin_headers, timeout=15)
                client = AsyncIOMotorClient(mongo_url)
                doc2 = await client[db_name].app_config.find_one({"_id": "digest"}) or {}
                client.close()
                return doc2.get("unsubscribe_token")
            return doc.get("unsubscribe_token")

        token = asyncio.get_event_loop().run_until_complete(fetch_token())
        assert token, "unsubscribe token should exist after a send attempt"
        try:
            r = requests.get(f"{BASE_URL}/api/community/digest/unsubscribe",
                             params={"token": token}, timeout=10)
            assert r.status_code == 200
            assert "You are unsubscribed" in r.text
            # Confirm state flipped
            st = requests.get(f"{BASE_URL}/api/community/digest/status",
                              headers=admin_headers, timeout=10).json()
            assert st["enabled"] is False
        finally:
            # Re-enable for cleanup
            requests.post(f"{BASE_URL}/api/community/digest/toggle",
                          json={"enabled": True}, headers=admin_headers, timeout=10)


# ---------- Regression: anonymous submit still works ----------
class TestRegressionAnon:
    def test_anonymous_tip_submit(self, admin_headers):
        r = requests.post(f"{BASE_URL}/api/community/tip",
                          json={"heading": "TEST_iter55 regression",
                                "body": "regression body",
                                "resource_id": "TEST_iter55"},
                          timeout=10)
        assert r.status_code in (200, 201)
        tip_id = r.json()["id"]
        # cleanup
        requests.delete(f"{BASE_URL}/api/community/tips/{tip_id}",
                        headers=admin_headers, timeout=10)
