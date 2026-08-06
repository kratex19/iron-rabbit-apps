"""Tests for the two new endpoints in iteration 54:
- POST /api/community/tips/parse (LLM import-from-text)
- POST /api/community/digest/send (admin-only, Resend graceful-fail)
"""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "http://localhost:8001"
# Backend .env value — matches ADMIN_TOKEN
ADMIN_TOKEN = "irr-admin-8f3a2b91c4d7e6f5"


# ---------- /community/tips/parse ----------
class TestParseTips:
    def test_empty_text_returns_400(self):
        r = requests.post(f"{BASE_URL}/api/community/tips/parse", json={"text": ""}, timeout=15)
        assert r.status_code == 400, r.text
        assert "text is required" in r.text.lower()

    def test_too_long_text_returns_400(self):
        r = requests.post(
            f"{BASE_URL}/api/community/tips/parse",
            json={"text": "x" * 8001},
            timeout=15,
        )
        assert r.status_code == 400, r.text
        assert "too long" in r.text.lower()

    def test_valid_short_mixed_text_returns_cards(self):
        text = (
            "Batch your email into two windows per day. "
            "Use a shutdown ritual at 5pm — write tomorrow's top 3. "
            "Keep water on your desk to break the sitting habit."
        )
        r = requests.post(
            f"{BASE_URL}/api/community/tips/parse",
            json={"text": text},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "cards" in data and isinstance(data["cards"], list)
        assert 1 <= len(data["cards"]) <= 20
        for c in data["cards"]:
            assert isinstance(c["heading"], str) and c["heading"]
            assert isinstance(c["body"], str)
            assert len(c["heading"]) <= 120
            assert len(c["body"]) <= 800


# ---------- /community/digest/send ----------
class TestDigestSend:
    def test_no_admin_token_returns_401(self):
        r = requests.post(f"{BASE_URL}/api/community/digest/send", timeout=15)
        assert r.status_code == 401, r.text

    def test_wrong_admin_token_returns_401(self):
        r = requests.post(
            f"{BASE_URL}/api/community/digest/send",
            headers={"X-Admin-Token": "nope"},
            timeout=15,
        )
        assert r.status_code == 401, r.text

    def test_dry_run_returns_ok_true(self):
        r = requests.post(
            f"{BASE_URL}/api/community/digest/send?dry_run=1",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["dry_run"] is True
        assert "counts" in data
        assert "pending" in data["counts"] and "promoted" in data["counts"]
        assert isinstance(data["counts"]["pending"], int)
        assert isinstance(data["counts"]["promoted"], int)
        assert data.get("reason", "").startswith("dry_run")
        assert "chars" in data["reason"]

    def test_no_dry_run_graceful_fail_when_resend_missing(self):
        r = requests.post(
            f"{BASE_URL}/api/community/digest/send",
            headers={"X-Admin-Token": ADMIN_TOKEN},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is False
        assert data["dry_run"] is False
        assert data.get("reason") == "RESEND_API_KEY not configured on server"
        assert "counts" in data
