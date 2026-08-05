"""Backend tests for Iron Rabbit — Pantry barcode proxy + regression."""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fall back to reading frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ===== /api/product/{barcode} proxy tests =====
class TestProductProxy:
    def test_nutella_lookup(self, client):
        r = client.get(f"{API}/product/3017620422003", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "nutella" in (d.get("name") or "").lower()
        assert d.get("nutriscore_grade") == "E"
        assert d.get("nova_group") == 4
        assert isinstance(d.get("additives"), list) and len(d["additives"]) > 0
        assert d.get("image_url")

    def test_coca_cola_lookup(self, client):
        r = client.get(f"{API}/product/5449000000996", timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("name")
        assert d.get("barcode") == "5449000000996"

    def test_invalid_barcode_404(self, client):
        r = client.get(f"{API}/product/0000000000000", timeout=20)
        assert r.status_code == 404

    def test_malformed_barcode_400(self, client):
        r = client.get(f"{API}/product/abc", timeout=10)
        assert r.status_code == 400

    def test_cache_speedup(self, client):
        # Warm
        client.get(f"{API}/product/3017620422003", timeout=20)
        t0 = time.time()
        r = client.get(f"{API}/product/3017620422003", timeout=20)
        elapsed = time.time() - t0
        assert r.status_code == 200
        # Cached should be very fast — well under 1s
        assert elapsed < 1.0, f"Cached lookup too slow: {elapsed}s"


# ===== Regression tests =====
class TestNotesCRUD:
    def test_notes_flow(self, client):
        title = f"TEST_note_{uuid.uuid4().hex[:8]}"
        # POST
        r = client.post(f"{API}/notes", json={"title": title, "content": "hello"}, timeout=10)
        assert r.status_code in (200, 201), r.text
        created = r.json()
        note_id = created.get("id")
        assert note_id
        assert created.get("title") == title

        # GET list
        r = client.get(f"{API}/notes", timeout=10)
        assert r.status_code == 200
        ids = [n.get("id") for n in r.json()]
        assert note_id in ids

        # PUT
        r = client.put(f"{API}/notes/{note_id}", json={"title": title, "content": "updated"}, timeout=10)
        assert r.status_code in (200, 204)

        # Verify update
        r = client.get(f"{API}/notes", timeout=10)
        found = next((n for n in r.json() if n.get("id") == note_id), None)
        assert found and found.get("content") == "updated"

        # DELETE
        r = client.delete(f"{API}/notes/{note_id}", timeout=10)
        assert r.status_code in (200, 204)

        # Verify deletion
        r = client.get(f"{API}/notes", timeout=10)
        ids = [n.get("id") for n in r.json()]
        assert note_id not in ids


class TestOtherEndpoints:
    def test_templates_get(self, client):
        r = client.get(f"{API}/templates", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_settings_get(self, client):
        r = client.get(f"{API}/settings", timeout=10)
        assert r.status_code == 200
