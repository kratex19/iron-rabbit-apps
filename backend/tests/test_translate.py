"""Tests for POST /api/translate (Emergent LLM-backed translation)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://color-task-timer.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestTranslateHappy:
    def test_translate_spanish_basic(self, client):
        r = client.post(f"{API}/translate", json={"text": "Buy milk and bread", "target_lang": "spanish"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["target_lang"] == "spanish"
        assert isinstance(data["translated"], str)
        assert len(data["translated"].strip()) > 0
        # sanity: expect Spanish tokens
        lo = data["translated"].lower()
        assert any(tok in lo for tok in ["leche", "pan", "compra"]), f"Unexpected Spanish translation: {data['translated']}"

    def test_translate_japanese_multiline_preserves_linebreaks(self, client):
        text = "Shopping:\n- Milk\n- Bread"
        r = client.post(f"{API}/translate", json={"text": text, "target_lang": "japanese"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        translated = data["translated"]
        assert translated.count("\n") >= 2, f"Line breaks not preserved: {translated!r}"
        assert data["target_lang"] == "japanese"


class TestTranslateErrors:
    def test_empty_text_returns_400(self, client):
        r = client.post(f"{API}/translate", json={"text": "", "target_lang": "spanish"}, timeout=15)
        assert r.status_code == 400
        assert "Text is required" in r.json().get("detail", "")

    def test_empty_target_returns_400(self, client):
        r = client.post(f"{API}/translate", json={"text": "hello", "target_lang": ""}, timeout=15)
        assert r.status_code == 400
        assert "Target language is required" in r.json().get("detail", "")

    def test_text_too_long_returns_413(self, client):
        big = "a " * 7000  # ~14000 chars
        r = client.post(f"{API}/translate", json={"text": big, "target_lang": "spanish"}, timeout=15)
        assert r.status_code == 413
