"""Backend tests for Community Tips + Admin Dashboard endpoints (iteration 53)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://color-task-timer.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
API = f"{BASE_URL}/api"


@pytest.fixture
def s():
    return requests.Session()


@pytest.fixture
def admin_headers():
    return {"X-Admin-Token": ADMIN_TOKEN}


@pytest.fixture
def created_tip(s):
    """Create a tip and cleanup after test."""
    r = s.post(f"{API}/community/tip", json={
        "heading": "TEST_heading",
        "body": "TEST_body content",
        "resource_id": "IRR-1000",
        "theme": "TEST_theme",
    })
    assert r.status_code == 200
    tip_id = r.json()["id"]
    yield tip_id
    # cleanup
    s.delete(f"{API}/community/tips/{tip_id}", headers={"X-Admin-Token": ADMIN_TOKEN})


# ---------------- /api/admin/verify ----------------
class TestAdminVerify:
    def test_no_token_401(self, s):
        r = s.post(f"{API}/admin/verify")
        assert r.status_code == 401

    def test_wrong_token_401(self, s):
        r = s.post(f"{API}/admin/verify", headers={"X-Admin-Token": "bogus"})
        assert r.status_code == 401

    def test_correct_token_200(self, s, admin_headers):
        r = s.post(f"{API}/admin/verify", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------------- POST /api/community/tip ----------------
class TestSubmitTip:
    def test_submit_ok(self, s):
        r = s.post(f"{API}/community/tip", json={
            "heading": "TEST_h", "body": "TEST_b", "resource_id": "IRR-1000", "theme": "x"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["ok"] is True
        assert isinstance(data["id"], str) and len(data["id"]) > 0
        # cleanup
        s.delete(f"{API}/community/tips/{data['id']}", headers={"X-Admin-Token": ADMIN_TOKEN})

    def test_missing_heading_and_body_400(self, s):
        r = s.post(f"{API}/community/tip", json={"heading": "", "body": "", "resource_id": "x"})
        assert r.status_code == 400

    def test_body_only_ok(self, s):
        r = s.post(f"{API}/community/tip", json={"heading": "", "body": "TEST_only body"})
        assert r.status_code == 200
        tid = r.json()["id"]
        s.delete(f"{API}/community/tips/{tid}", headers={"X-Admin-Token": ADMIN_TOKEN})


# ---------------- GET /api/community/tips ----------------
class TestListTips:
    def test_no_token_401(self, s):
        r = s.get(f"{API}/community/tips")
        assert r.status_code == 401

    def test_with_token_returns_list_and_counts(self, s, admin_headers, created_tip):
        r = s.get(f"{API}/community/tips", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "tips" in data and "counts" in data
        assert isinstance(data["tips"], list)
        assert set(["pending", "promoted", "rejected"]).issubset(data["counts"].keys())
        assert any(t["id"] == created_tip for t in data["tips"])

    def test_status_filter_pending(self, s, admin_headers, created_tip):
        r = s.get(f"{API}/community/tips?status_filter=pending", headers=admin_headers)
        assert r.status_code == 200
        for t in r.json()["tips"]:
            assert t["status"] == "pending"


# ---------------- Promote / Reject / Delete ----------------
class TestModerationActions:
    def test_promote_no_token_401(self, s, created_tip):
        r = s.post(f"{API}/community/tips/{created_tip}/promote")
        assert r.status_code == 401

    def test_promote_missing_id_404(self, s, admin_headers):
        r = s.post(f"{API}/community/tips/nonexistent-id-xyz/promote", headers=admin_headers)
        assert r.status_code == 404

    def test_promote_success(self, s, admin_headers, created_tip):
        r = s.post(f"{API}/community/tips/{created_tip}/promote", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "promoted"
        assert data["promoted_at"] is not None

    def test_reject_success_clears_promoted_at(self, s, admin_headers, created_tip):
        # first promote
        s.post(f"{API}/community/tips/{created_tip}/promote", headers=admin_headers)
        r = s.post(f"{API}/community/tips/{created_tip}/reject", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "rejected"
        assert data["promoted_at"] is None

    def test_delete_no_token_401(self, s, created_tip):
        r = s.delete(f"{API}/community/tips/{created_tip}")
        assert r.status_code == 401

    def test_delete_success(self, s, admin_headers):
        # create fresh so cleanup fixture doesn't collide
        c = s.post(f"{API}/community/tip", json={"heading": "TEST_del", "body": "b"}).json()
        r = s.delete(f"{API}/community/tips/{c['id']}", headers=admin_headers)
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # verify gone
        r2 = s.delete(f"{API}/community/tips/{c['id']}", headers=admin_headers)
        assert r2.status_code == 404


# ---------------- Public /api/community/promoted ----------------
class TestPromotedPublic:
    def test_public_no_token_ok(self, s):
        r = s.get(f"{API}/community/promoted")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_only_promoted_tips_visible(self, s, admin_headers):
        # create + promote
        c = s.post(f"{API}/community/tip", json={
            "heading": "TEST_promoted_h", "body": "TEST_promoted_b", "resource_id": "IRR-1000"
        }).json()
        tid = c["id"]
        try:
            s.post(f"{API}/community/tips/{tid}/promote", headers=admin_headers)
            r = s.get(f"{API}/community/promoted")
            assert r.status_code == 200
            items = r.json()
            match = [t for t in items if t["id"] == tid]
            assert len(match) == 1
            m = match[0]
            assert set(["id", "heading", "body", "resource_id", "promoted_at"]).issubset(m.keys())
            assert "status" not in m  # only public fields
        finally:
            s.delete(f"{API}/community/tips/{tid}", headers=admin_headers)


# ---------------- No-regression sanity ----------------
class TestNoRegression:
    def test_translate_still_works(self, s):
        r = s.post(f"{API}/translate", json={"text": "hello", "target_lang": "es"})
        # just check reachable (not necessarily 200 if LLM fails, but shouldn't 404)
        assert r.status_code in (200, 500, 503)
