"""Tests for POST /api/ocr endpoint (Claude Sonnet 4.6 vision)."""
import base64
import io
import os

import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://color-task-timer.preview.emergentagent.com").rstrip("/")
OCR_URL = f"{BASE_URL}/api/ocr"


def _png_with_text(text_lines, size=(240, 80)) -> str:
    img = Image.new("RGB", size, "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except Exception:
        font = ImageFont.load_default()
    y = 8
    for line in text_lines:
        d.text((10, y), line, fill="black", font=font)
        y += 30
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def _blank_png(size=(120, 60)) -> str:
    img = Image.new("RGB", size, "white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


class TestOCR:
    def test_happy_path_two_lines(self):
        b64 = _png_with_text(["Buy Milk", "Buy Eggs"])
        r = requests.post(OCR_URL, json={"image_base64": b64, "mime_type": "image/png"}, timeout=60)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "extracted_text" in data
        txt = data["extracted_text"]
        assert "Buy Milk" in txt
        assert "Buy Eggs" in txt

    def test_empty_base64_returns_400(self):
        r = requests.post(OCR_URL, json={"image_base64": "", "mime_type": "image/png"}, timeout=15)
        assert r.status_code == 400
        assert "image_base64 is required" in r.json().get("detail", "")

    def test_unsupported_mime_returns_400(self):
        b64 = _blank_png()
        r = requests.post(OCR_URL, json={"image_base64": b64, "mime_type": "image/svg+xml"}, timeout=15)
        assert r.status_code == 400
        assert "Unsupported mime type" in r.json().get("detail", "")

    def test_oversized_payload_returns_413(self):
        # Craft a base64 string that decodes to > 5MB without needing an actual image
        fake = "A" * (8 * 1024 * 1024)  # ~6 MB decoded
        r = requests.post(OCR_URL, json={"image_base64": fake, "mime_type": "image/png"}, timeout=30)
        assert r.status_code == 413

    def test_data_uri_prefix_is_stripped(self):
        b64 = _png_with_text(["Hello"])
        data_uri = f"data:image/png;base64,{b64}"
        r = requests.post(OCR_URL, json={"image_base64": data_uri, "mime_type": "image/png"}, timeout=60)
        assert r.status_code == 200, r.text
        assert "Hello" in r.json()["extracted_text"]

    def test_blank_image_returns_empty_string(self):
        b64 = _blank_png()
        r = requests.post(OCR_URL, json={"image_base64": b64, "mime_type": "image/png"}, timeout=60)
        assert r.status_code == 200, r.text
        # Empty per spec (NO_TEXT_FOUND normalised)
        assert r.json()["extracted_text"] == ""
