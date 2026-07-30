"""Test dining_insights endpoint with history for Smart Assistant multi-turn."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Fallback: read from frontend/.env
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL"):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass


def test_dining_insights_with_history():
    url = f"{BASE_URL}/api/dining_insights"
    payload = {
        "stats": {
            "summary": {
                "monthly_spend": 50,
                "total_orders": 5,
                "total_restaurants": 3,
            }
        },
        "question": "Follow up",
        "history": [
            {"role": "user", "text": "first q"},
            {"role": "assistant", "text": "first a"},
        ],
    }
    r = requests.post(url, json=payload, timeout=60)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:500]}"
    data = r.json()
    assert "insights" in data
    assert isinstance(data["insights"], str)
    assert len(data["insights"]) > 0


def test_dining_insights_no_history_still_works():
    url = f"{BASE_URL}/api/dining_insights"
    payload = {
        "stats": {"summary": {"monthly_spend": 100, "total_orders": 10}},
    }
    r = requests.post(url, json=payload, timeout=60)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:500]}"
    assert "insights" in r.json()


def test_dining_insights_missing_stats_400():
    url = f"{BASE_URL}/api/dining_insights"
    r = requests.post(url, json={"stats": {}}, timeout=15)
    assert r.status_code == 400
