"""Tests for POST /api/dining_recipe_idea (iter_36)."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # fallback for backend .env if run inside container
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

URL = f"{BASE_URL}/api/dining_recipe_idea"


def _validate_shape(data):
    assert isinstance(data.get("title"), str) and data["title"].strip(), "title must be non-empty str"
    assert isinstance(data.get("cuisine"), str)
    assert isinstance(data.get("prep_time_min"), int)
    assert isinstance(data.get("servings"), int)
    assert isinstance(data.get("ingredients"), list) and len(data["ingredients"]) >= 5, "ingredients >= 5"
    assert all(isinstance(x, str) for x in data["ingredients"])
    assert isinstance(data.get("steps"), list) and len(data["steps"]) >= 4, "steps >= 4"
    assert all(isinstance(x, str) for x in data["steps"])
    assert isinstance(data.get("notes"), str)


def test_recipe_idea_with_stats_and_hint():
    payload = {
        "stats": {
            "top_restaurants": [{"name": "Pho 88", "cuisine": "Vietnamese", "favorite": True}],
            "family": [{"name": "Emma", "allergies": ["peanuts"]}],
        },
        "hint": "kid-friendly",
    }
    r = requests.post(URL, json=payload, timeout=90)
    assert r.status_code == 200, r.text
    _validate_shape(r.json())


def test_recipe_idea_with_empty_stats():
    # stats key present but empty — fully optional payload contents
    r = requests.post(URL, json={"stats": {}}, timeout=90)
    assert r.status_code == 200, r.text
    _validate_shape(r.json())


def test_recipe_idea_missing_stats_key():
    # Iter_37 fix: stats is now Optional[Dict[str, Any]] with default_factory=dict.
    r = requests.post(URL, json={}, timeout=90)
    assert r.status_code == 200, (
        f"Expected 200 for missing-stats per spec, got {r.status_code}. Body: {r.text[:400]}"
    )
    _validate_shape(r.json())


def test_recipe_idea_hint_only_no_stats():
    # Iter_37: hint-only payload (no stats key) still returns 200.
    r = requests.post(URL, json={"hint": "vegetarian"}, timeout=90)
    assert r.status_code == 200, r.text
    _validate_shape(r.json())


def test_recipe_idea_long_hint_truncated_silently():
    # Iter_37: hint capped server-side at 256 chars; a 1000-char hint should not crash.
    long_hint = "spicy " * 200  # 1200 chars
    r = requests.post(URL, json={"hint": long_hint}, timeout=90)
    assert r.status_code == 200, r.text
    _validate_shape(r.json())


# Regression — existing endpoint
def test_dining_insights_still_ok():
    r = requests.post(
        f"{BASE_URL}/api/dining_insights",
        json={"stats": {"top_restaurants": [{"name": "Pho 88"}]}},
        timeout=90,
    )
    assert r.status_code == 200, r.text
    assert isinstance(r.json().get("insights"), str) and r.json()["insights"].strip()
