#!/usr/bin/env python3
"""
Iron Rabbit — Play Store screenshot capture.

Captures 8 phone-portrait screenshots (1080×1920) from the live preview URL
and writes them to `/app/frontend/public/screenshots/play/`. The set is
built for the current launch listing and highlights:

  01 — Notes home            (main app surface)
  02 — Full-screen note      (writing focus)
  03 — Quick Guide           (Community tips + guides)
  04 — Contributor Wall      (public thank-you board, "Top" sort)
  05 — Contributor Wall Recent + NEW ribbon
  06 — Share Card dialog     (WallShareDialog with themes)
  07 — Nickname Recovery     (manual entry step 1)
  08 — Magic-Link Recovery   (/recover landing with code pre-filled)

USAGE
-----
    python3 scripts/capture_play_screenshots.py                # capture all
    python3 scripts/capture_play_screenshots.py --only wall_top
    python3 scripts/capture_play_screenshots.py --url https://…  # override

The script uses the same REACT_APP_BACKEND_URL that the preview app uses,
loaded from `/app/frontend/.env`. Playwright is already available in the
container.

Play Store phone requirements: PNG or JPEG, 320-3840 px on each side,
aspect ratio between 9:16 and 16:9. 1080×1920 sits square in the sweet spot.
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright, Page

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "frontend" / "public" / "screenshots" / "play"
ENV_FILE = REPO_ROOT / "frontend" / ".env"

# Play Store phone-portrait spec — 9:16 is the tallest allowed. 1080×1920 is
# the modern standard and renders crisply on both listing carousel + device.
VIEWPORT = {"width": 1080, "height": 1920}
DEVICE_SCALE = 1  # already high resolution; extra DPR just bloats file size


def load_base_url() -> str:
    if not ENV_FILE.exists():
        sys.exit(f"missing {ENV_FILE}")
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    sys.exit("REACT_APP_BACKEND_URL not found in frontend/.env")


async def wait_for(page: Page, selector: str, timeout: int = 8000) -> None:
    try:
        await page.wait_for_selector(selector, timeout=timeout)
    except Exception:
        # Selectors that don't materialise fall back to a fixed pause rather
        # than aborting — some screens are context-dependent (empty DB etc).
        await page.wait_for_timeout(1500)


async def dismiss_overlays(page: Page) -> None:
    """First-run nudges (Quick Guide auto-open, weekly digest, service worker
    banners) would poison every screenshot. Kill them all before shooting."""
    await page.evaluate(
        """() => {
            // Silence one-shot educational modals for the capture session.
            try {
                localStorage.setItem('irr.qg.nudge_seen', 'true');
                localStorage.setItem('iron_rabbit_qg_state_v1', JSON.stringify({
                    auto_show: false, nudge_seen: true, seen_ids: ['*'],
                }));
                localStorage.setItem('iron_rabbit_digest_last_shown', String(Date.now()));
            } catch (e) {}
        }"""
    )
    # Close any modal / dialog left open from a previous shot in the same run.
    for sel in ('[role="dialog"] [aria-label="Close"]', '.qg-strip [aria-label="Close"]'):
        try:
            btn = await page.query_selector(sel)
            if btn:
                await btn.click(force=True)
                await page.wait_for_timeout(200)
        except Exception:
            pass


# --------------------------------------------------------------------------
# Shot definitions — each returns a coroutine that (a) navigates + (b) sets
# up any state on the page, then delegates the actual `screenshot()` call to
# the driver below.
# --------------------------------------------------------------------------
async def shot_home(page: Page, base: str) -> None:
    await page.goto(f"{base}/", wait_until="networkidle")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="notes-list"], main, #root')
    await page.wait_for_timeout(600)


async def shot_note_fullscreen(page: Page, base: str) -> None:
    await page.goto(f"{base}/", wait_until="networkidle")
    await dismiss_overlays(page)
    await page.wait_for_timeout(600)
    # Open the first tile if any; otherwise leave the empty-state visible.
    try:
        tile = await page.query_selector('[data-testid^="note-tile-"]')
        if tile:
            await tile.click(force=True)
            await page.wait_for_timeout(700)
    except Exception:
        pass


async def shot_quick_guide(page: Page, base: str) -> None:
    await page.goto(f"{base}/", wait_until="networkidle")
    await dismiss_overlays(page)
    await page.wait_for_timeout(400)
    try:
        btn = await page.query_selector('[data-testid="quickguide-button"], [aria-label*="Quick Guide" i]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(900)
    except Exception:
        pass


async def shot_wall_top(page: Page, base: str) -> None:
    await page.goto(f"{base}/contributors", wait_until="networkidle")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    # Force default "Top" sort so the shot is deterministic across runs.
    await page.evaluate("() => { try { localStorage.setItem('irr.wall_sort_mode', 'top'); } catch(e) {} }")
    await page.reload(wait_until="networkidle")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    await page.wait_for_timeout(700)


async def shot_wall_recent(page: Page, base: str) -> None:
    await page.goto(f"{base}/contributors", wait_until="networkidle")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    # Click "Recent" toggle so the NEW ribbon shot has fresh cards on top.
    try:
        btn = await page.query_selector('[data-testid="wall-sort-recent"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(400)
    except Exception:
        pass


async def shot_share_dialog(page: Page, base: str) -> None:
    await page.goto(f"{base}/contributors", wait_until="networkidle")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    await page.wait_for_timeout(400)
    # Open the share dialog on the first contributor.
    try:
        btn = await page.query_selector('[data-testid^="wall-share-"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(900)
    except Exception:
        pass


async def shot_recovery_dialog(page: Page, base: str) -> None:
    await page.goto(f"{base}/contributors", wait_until="networkidle")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    await page.wait_for_timeout(400)
    # "Not you? Recover this nickname" on the first non-mine card.
    try:
        btn = await page.query_selector('[data-testid^="wall-recover-"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(700)
    except Exception:
        pass


async def shot_magic_link(page: Page, base: str) -> None:
    # Uses a demo nickname + placeholder code so the screenshot renders the
    # step-2 form; server will 400 on submit but we never submit here.
    target = f"{base}/recover?n=veggie_wizard&c=123456"
    await page.goto(target, wait_until="domcontentloaded")
    await dismiss_overlays(page)
    # The app's service worker sometimes triggers a reload on first cross-route
    # navigation which drops the query string. Wait for the dialog; if it's
    # not there, the SW ate the params — reload once with the params re-added.
    await page.wait_for_timeout(1200)
    dlg = await page.query_selector('[data-testid="recovery-dialog"]')
    if not dlg:
        await page.goto(target, wait_until="networkidle")
        await page.wait_for_timeout(1200)
    await wait_for(page, '[data-testid="recovery-dialog"]', timeout=6000)
    await page.wait_for_timeout(500)


SHOTS = [
    ("01-home",             "home",             shot_home),
    ("02-note-fullscreen",  "note_fullscreen",  shot_note_fullscreen),
    ("03-quick-guide",      "quick_guide",      shot_quick_guide),
    ("04-wall-top",         "wall_top",         shot_wall_top),
    ("05-wall-recent-new",  "wall_recent",      shot_wall_recent),
    ("06-share-card",       "share_dialog",     shot_share_dialog),
    ("07-recover-dialog",   "recovery_dialog",  shot_recovery_dialog),
    ("08-magic-link",       "magic_link",       shot_magic_link),
]


async def capture(base_url: str, only: str, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        context = await browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=DEVICE_SCALE,
            is_mobile=True,
        )
        page = await context.new_page()

        for name, slug, fn in SHOTS:
            if only != "all" and only != slug:
                continue
            path = out_dir / f"{name}.png"
            print(f"[{slug}]  → {path.relative_to(REPO_ROOT)}")
            try:
                await fn(page, base_url)
                await page.screenshot(path=str(path), full_page=False, type="png")
            except Exception as e:
                print(f"  ! shot failed: {e}")

        await browser.close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Iron Rabbit — Play Store screenshot capture")
    parser.add_argument("--url", help="Override base URL (default: REACT_APP_BACKEND_URL)")
    parser.add_argument(
        "--only",
        choices=["all"] + [s[1] for s in SHOTS],
        default="all",
        help="Capture a single shot",
    )
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR, help="Override output dir")
    args = parser.parse_args()

    base = (args.url or load_base_url()).rstrip("/")
    print(f"base URL: {base}")
    print(f"out dir : {args.out_dir}")
    print(f"viewport: {VIEWPORT['width']}x{VIEWPORT['height']}\n")

    try:
        asyncio.run(capture(base, args.only, args.out_dir))
    except KeyboardInterrupt:
        return 130
    return 0


if __name__ == "__main__":
    sys.exit(main())
