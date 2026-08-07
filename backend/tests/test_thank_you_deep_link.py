"""Iteration 63 — verify the thank-you email now includes the Contributor Wall
deep-link CTA when a nickname is present + PUBLIC_APP_URL is set.

Since RESEND_API_KEY is empty on the preview env we monkey-patch
resend.Emails.send with a capture list and drive `_send_thank_you` directly.
"""
import os
import sys
import asyncio
import uuid
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from routes import community  # type: ignore  # noqa: E402


class _FakeResendEmails:
    calls = []

    @staticmethod
    def send(params):
        _FakeResendEmails.calls.append(params)
        return {"id": f"fake-{uuid.uuid4().hex[:8]}"}


def _install_fakes(monkeypatch):
    _FakeResendEmails.calls = []
    monkeypatch.setattr(community, "RESEND_API_KEY", "fake-key-for-test")
    monkeypatch.setattr(community, "SENDER_EMAIL", "test@example.com")
    monkeypatch.setattr(community, "PUBLIC_APP_URL", "https://example.com")

    class _FakeResend:
        api_key = None
        Emails = _FakeResendEmails
    monkeypatch.setitem(sys.modules, "resend", _FakeResend)


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture
def loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    yield loop
    loop.close()


def test_thank_you_includes_deep_link(monkeypatch, loop):
    _install_fakes(monkeypatch)
    tip = {
        "id": "tip-1",
        "heading": "TEST_iter63 heading",
        "body": "test body",
        "nickname": "veggie_wizard",
        "contributor_email": "someone@example.com",
        "contributor_opt_in": True,
    }
    # DB update at the end of _send_thank_you will hit real motor. Stub it.
    class _FakeUpdate:
        async def update_one(self, *a, **kw):
            return None
    monkeypatch.setattr(community.db, "community_tips", _FakeUpdate())

    loop.run_until_complete(community._send_thank_you(tip))
    assert len(_FakeResendEmails.calls) == 1
    html = _FakeResendEmails.calls[0]["html"]
    # CTA text + URL both present
    assert "See your card on the wall" in html
    assert "https://example.com/contributors?highlight=@veggie_wizard" in html


def test_thank_you_without_nickname_omits_deep_link(monkeypatch, loop):
    _install_fakes(monkeypatch)
    tip = {
        "id": "tip-2",
        "heading": "TEST_iter63 anonymous",
        "body": "anon body",
        "nickname": None,
        "contributor_email": "anon@example.com",
        "contributor_opt_in": True,
    }
    class _FakeUpdate:
        async def update_one(self, *a, **kw):
            return None
    monkeypatch.setattr(community.db, "community_tips", _FakeUpdate())

    loop.run_until_complete(community._send_thank_you(tip))
    html = _FakeResendEmails.calls[0]["html"]
    assert "See your card on the wall" not in html
    assert "/contributors?highlight=" not in html


def test_thank_you_without_public_app_url_omits_deep_link(monkeypatch, loop):
    _install_fakes(monkeypatch)
    monkeypatch.setattr(community, "PUBLIC_APP_URL", "")
    tip = {
        "id": "tip-3",
        "heading": "TEST_iter63 no-url",
        "body": "no url configured",
        "nickname": "veggie_wizard",
        "contributor_email": "someone@example.com",
        "contributor_opt_in": True,
    }
    class _FakeUpdate:
        async def update_one(self, *a, **kw):
            return None
    monkeypatch.setattr(community.db, "community_tips", _FakeUpdate())

    loop.run_until_complete(community._send_thank_you(tip))
    html = _FakeResendEmails.calls[0]["html"]
    assert "See your card on the wall" not in html
    # Byline (nickname mention) still there — only the CTA is gated
    assert "@veggie_wizard" in html
