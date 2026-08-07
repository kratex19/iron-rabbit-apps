"""Iteration 57 — Post-refactor regression + Nickname + Contributor Wall.

Covers every previously-passing endpoint after the server.py -> deps/models/routes
split, plus the new nickname field + /api/community/contributors endpoint.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "irr-admin-8f3a2b91c4d7e6f5")
ADMIN_HDR = {"X-Admin-Token": ADMIN_TOKEN}
API = f"{BASE_URL}/api"


# --------------------- root + notes CRUD (regression) ---------------------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200


def test_notes_crud_and_reorder():
    payload = {"title": "TEST_iter57 note", "content": "hello", "color": "#fff"}
    r = requests.post(f"{API}/notes", json=payload)
    assert r.status_code == 201, r.text
    note = r.json()
    note_id = note["id"]
    assert note["title"] == payload["title"]

    r = requests.get(f"{API}/notes")
    assert r.status_code == 200
    assert any(n["id"] == note_id for n in r.json())

    r = requests.get(f"{API}/notes/{note_id}")
    assert r.status_code == 200

    r = requests.put(f"{API}/notes/{note_id}", json={"title": "TEST_iter57 updated"})
    assert r.status_code == 200
    assert r.json()["title"] == "TEST_iter57 updated"

    r = requests.post(f"{API}/notes/reorder", json={"note_ids": [note_id]})
    assert r.status_code == 200

    r = requests.delete(f"{API}/notes/{note_id}")
    assert r.status_code == 200
    r = requests.get(f"{API}/notes/{note_id}")
    assert r.status_code == 404


def test_templates_crud():
    r = requests.post(f"{API}/templates", json={
        "name": "TEST_iter57 tpl", "title": "t", "content": "c", "color": "#fff"
    })
    assert r.status_code == 201, r.text
    tid = r.json()["id"]

    r = requests.get(f"{API}/templates")
    assert r.status_code == 200
    assert any(t["id"] == tid for t in r.json())

    r = requests.delete(f"{API}/templates/{tid}")
    assert r.status_code == 200


def test_categories():
    r = requests.get(f"{API}/categories")
    assert r.status_code == 200
    assert isinstance(r.json(), (list, dict))


def test_settings_get_put():
    r = requests.get(f"{API}/settings")
    assert r.status_code == 200
    original = r.json()
    r = requests.put(f"{API}/settings", json={"app_name": original.get("app_name") or "Iron Rabbit"})
    assert r.status_code == 200


# --------------------- community regression + nickname ---------------------
_created_tips = []


def _submit(nickname=None, heading="TEST_iter57 tip", body="body text"):
    payload = {"heading": heading, "body": body, "resource_id": "abc", "theme": "test"}
    if nickname is not None:
        payload["nickname"] = nickname
    r = requests.post(f"{API}/community/tip", json=payload)
    assert r.status_code == 200, r.text
    tid = r.json()["id"]
    _created_tips.append(tid)
    return tid


def _get_tip(tid):
    r = requests.get(f"{API}/community/tips", headers=ADMIN_HDR)
    assert r.status_code == 200
    for t in r.json()["tips"]:
        if t["id"] == tid:
            return t
    return None


def test_community_tip_valid_nickname_persists():
    tid = _submit(nickname="chef_max")
    t = _get_tip(tid)
    assert t is not None
    assert t["nickname"] == "chef_max"


def test_community_tip_case_preserved():
    tid = _submit(nickname="Chef_Max_2")
    t = _get_tip(tid)
    assert t["nickname"] == "Chef_Max_2"


@pytest.mark.parametrize("bad", ["", "  ", "a", "with space", "sym!bol", "toolong_" + "x" * 20, "hy-phen"])
def test_community_tip_invalid_nickname_coerced_to_null(bad):
    tid = _submit(nickname=bad)
    t = _get_tip(tid)
    assert t["nickname"] is None, f"Expected None for {bad!r}, got {t['nickname']!r}"


def test_community_tips_admin_lists():
    r = requests.get(f"{API}/community/tips", headers=ADMIN_HDR)
    assert r.status_code == 200
    data = r.json()
    assert "tips" in data and "counts" in data


def test_community_tips_admin_requires_auth():
    r = requests.get(f"{API}/community/tips")
    assert r.status_code == 401


def test_admin_verify():
    assert requests.post(f"{API}/admin/verify").status_code == 401
    assert requests.post(f"{API}/admin/verify", headers=ADMIN_HDR).status_code == 200


def test_promote_reject_delete_and_nickname_flows_downstream():
    tid = _submit(nickname="iter57_promo")
    r = requests.post(f"{API}/community/tips/{tid}/promote", headers=ADMIN_HDR)
    assert r.status_code == 200
    assert r.json()["status"] == "promoted"
    assert r.json()["nickname"] == "iter57_promo"

    # /community/promoted includes nickname
    r = requests.get(f"{API}/community/promoted")
    assert r.status_code == 200
    row = next((x for x in r.json() if x["id"] == tid), None)
    assert row is not None
    assert row["nickname"] == "iter57_promo"

    # /community/featured includes nickname when applicable (tip may not be chosen; just ensure schema)
    r = requests.get(f"{API}/community/featured")
    assert r.status_code == 200
    body = r.json()
    if body.get("tip") is not None:
        assert "nickname" in body["tip"]

    # /community/contributors — public, no auth
    r = requests.get(f"{API}/community/contributors")
    assert r.status_code == 200
    contribs = r.json()
    assert "contributors" in contribs and "total" in contribs
    match = next((c for c in contribs["contributors"] if c["nickname"] == "iter57_promo"), None)
    assert match is not None
    assert match["tip_count"] >= 1
    assert match["latest_heading"]

    # reject
    r = requests.post(f"{API}/community/tips/{tid}/reject", headers=ADMIN_HDR)
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"

    # delete permanently
    r = requests.delete(f"{API}/community/tips/{tid}", headers=ADMIN_HDR)
    assert r.status_code == 200
    _created_tips.remove(tid)


def test_contributors_anonymous_never_appear():
    # Submit anonymous (no nickname) and promote it. Should NOT show up.
    tid = _submit(nickname=None, heading="TEST_iter57 anon promo")
    r = requests.post(f"{API}/community/tips/{tid}/promote", headers=ADMIN_HDR)
    assert r.status_code == 200
    r = requests.get(f"{API}/community/contributors")
    assert r.status_code == 200
    nicks = [c["nickname"] for c in r.json()["contributors"]]
    assert "" not in nicks
    assert None not in nicks


def test_contributors_sorted_by_tip_count_desc():
    r = requests.get(f"{API}/community/contributors")
    assert r.status_code == 200
    counts = [c["tip_count"] for c in r.json()["contributors"]]
    assert counts == sorted(counts, reverse=True)


def test_contributors_is_public_no_auth():
    r = requests.get(f"{API}/community/contributors")
    assert r.status_code == 200


# --------------------- digest (admin) ---------------------
def test_digest_status_has_scheduler_next_run():
    r = requests.get(f"{API}/community/digest/status", headers=ADMIN_HDR)
    assert r.status_code == 200
    body = r.json()
    assert "scheduler_next_run" in body
    # Scheduler must be wired via server.startup
    assert body["scheduler_next_run"] is not None


def test_digest_toggle_roundtrip():
    r = requests.get(f"{API}/community/digest/status", headers=ADMIN_HDR)
    assert r.status_code == 200
    original_enabled = bool(r.json().get("enabled"))
    # Toggle off then back to original state
    r = requests.post(f"{API}/community/digest/toggle", json={"enabled": not original_enabled}, headers=ADMIN_HDR)
    assert r.status_code == 200
    assert r.json()["enabled"] == (not original_enabled)
    r = requests.post(f"{API}/community/digest/toggle", json={"enabled": original_enabled}, headers=ADMIN_HDR)
    assert r.status_code == 200


def test_digest_send_dry_run():
    r = requests.post(f"{API}/community/digest/send?dry_run=true", headers=ADMIN_HDR)
    assert r.status_code == 200


def test_digest_unsubscribe_public():
    # Missing token -> should still return a page (not 500). Endpoint typically 400 on bad input.
    r = requests.get(f"{API}/community/digest/unsubscribe?token=invalid")
    assert r.status_code in (200, 400, 404)


# --------------------- analytics ---------------------
def test_analytics_events_public():
    r = requests.post(f"{API}/community/events", json={"events": []})
    assert r.status_code == 200


def test_analytics_admin_requires_auth():
    r = requests.get(f"{API}/community/analytics")
    assert r.status_code == 401
    r = requests.get(f"{API}/community/analytics", headers=ADMIN_HDR)
    assert r.status_code == 200


# --------------------- misc ---------------------
def test_translate_when_llm_configured_or_503():
    r = requests.post(f"{API}/translate", json={"text": "hello", "target_lang": "es"})
    # Either translated (200) or 503 if LLM disabled
    assert r.status_code in (200, 503)


def test_product_barcode_nutella():
    r = requests.get(f"{API}/product/3017620422003", timeout=15)
    # Open Food Facts may be flaky — accept 200 or 502/504 gracefully
    assert r.status_code in (200, 404, 502, 504)
    if r.status_code == 200:
        body = r.json()
        assert body.get("barcode") == "3017620422003" or "product" in body or "name" in body


# --------------------- Cleanup ---------------------
def test_zzz_cleanup():
    for tid in list(_created_tips):
        requests.delete(f"{API}/community/tips/{tid}", headers=ADMIN_HDR)
