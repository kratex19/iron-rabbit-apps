"""Iteration 62: weekly_series on /api/community/recovery/analytics."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/") or "https://color-task-timer.preview.emergentagent.com"
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "")
HEADERS = {"X-Admin-Token": ADMIN_TOKEN}


def _get(days=None):
    url = f"{BASE_URL}/api/community/recovery/analytics"
    if days is not None:
        url += f"?days={days}"
    r = requests.get(url, headers=HEADERS, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


def test_weekly_series_shape():
    data = _get(30)
    assert "weekly_series" in data
    ws = data["weekly_series"]
    assert isinstance(ws, list)
    assert len(ws) == 4
    for w in ws:
        for k in ("week_start", "week_end", "magic_link_opened", "manual_entry_opened", "magic_link_share", "opens_total"):
            assert k in w, f"missing {k}"
        assert isinstance(w["magic_link_opened"], int)
        assert isinstance(w["manual_entry_opened"], int)
        assert isinstance(w["opens_total"], int)
        assert isinstance(w["magic_link_share"], float)
        assert 0.0 <= w["magic_link_share"] <= 1.0
        # ISO date parseable
        from datetime import date
        date.fromisoformat(w["week_start"])
        date.fromisoformat(w["week_end"])


def test_weekly_series_oldest_to_newest():
    ws = _get(30)["weekly_series"]
    for i in range(len(ws) - 1):
        assert ws[i]["week_start"] <= ws[i + 1]["week_start"]


def test_weekly_series_math():
    ws = _get(30)["weekly_series"]
    for w in ws:
        total = w["magic_link_opened"] + w["manual_entry_opened"]
        assert w["opens_total"] == total
        expected = round(w["magic_link_opened"] / total, 3) if total else 0.0
        assert abs(w["magic_link_share"] - expected) < 1e-9


def test_weekly_series_independent_of_days_param():
    a = _get(7)["weekly_series"]
    b = _get(90)["weekly_series"]
    # weekly_series should be identical between different days params (uses fixed 4-week window)
    # Note: week_end uses "now" at the moment of query, so allow minor date shift
    assert len(a) == len(b) == 4
    for wa, wb in zip(a, b):
        assert wa["magic_link_opened"] == wb["magic_link_opened"]
        assert wa["manual_entry_opened"] == wb["manual_entry_opened"]
        assert wa["opens_total"] == wb["opens_total"]
        assert wa["magic_link_share"] == wb["magic_link_share"]


def test_top_level_totals_reflect_days_window():
    a = _get(7)
    b = _get(90)
    assert a["window_days"] == 7
    assert b["window_days"] == 90
    # 90d totals must be >= 7d totals
    assert b["magic_link_opened"] >= a["magic_link_opened"]
    assert b["manual_entry_opened"] >= a["manual_entry_opened"]


def test_admin_auth_required():
    r = requests.get(f"{BASE_URL}/api/community/recovery/analytics", timeout=10)
    assert r.status_code in (401, 403)
