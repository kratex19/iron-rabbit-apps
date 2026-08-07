#!/usr/bin/env python3
"""
Iron Rabbit — Desktop / website screenshot capture.

Captures 1920×1080 landscape screenshots of the live preview app for use on
`ironrabbitapps.com`. Not the same set as Play Store (which is 1080×1920
portrait) — this is optimised for hero/feature strips on the website.

Output: `/app/frontend/public/screenshots/desktop/*.png`
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from playwright.async_api import async_playwright, Page

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "frontend" / "public" / "screenshots" / "desktop"
ENV_FILE = REPO_ROOT / "frontend" / ".env"

VIEWPORT = {"width": 1920, "height": 1080}


def load_base_url() -> str:
    if not ENV_FILE.exists():
        sys.exit(f"missing {ENV_FILE}")
    for line in ENV_FILE.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    sys.exit("REACT_APP_BACKEND_URL not found in frontend/.env")


async def _goto(page: Page, url: str) -> None:
    """Reset via about:blank then navigate. Avoids ERR_ABORTED on same-URL nav."""
    try:
        await page.goto("about:blank")
    except Exception:
        pass
    await page.goto(url, wait_until="domcontentloaded")
    await page.wait_for_load_state("networkidle", timeout=8000)


async def _kill_quickguide(page: Page, tries: int = 5) -> None:
    """Repeatedly close the Quick Guide auto-open dialog + its confirm-Yes."""
    for _ in range(tries):
        # Try clicking QG close X specifically
        try:
            x = await page.query_selector('[data-testid="qg-close"]')
            if x:
                await x.click(force=True, timeout=800)
                await page.wait_for_timeout(250)
        except Exception:
            pass
        # Confirm "Yes" if the "Close Quick Guide?" alert is showing
        try:
            yes = await page.query_selector('button:has-text("Yes")')
            if yes:
                await yes.click(force=True, timeout=800)
                await page.wait_for_timeout(300)
        except Exception:
            pass
        # If still present, press escape
        try:
            still = await page.query_selector('[data-testid="qg-close"]')
            if not still:
                return
            await page.keyboard.press("Escape")
            await page.wait_for_timeout(200)
        except Exception:
            return


async def dismiss_overlays(page: Page) -> None:
    await _kill_quickguide(page)


async def wait_for(page: Page, selector: str, timeout: int = 6000) -> None:
    try:
        await page.wait_for_selector(selector, timeout=timeout)
    except Exception:
        await page.wait_for_timeout(1200)


# ---------- Shot definitions ----------

async def shot_home(page: Page, base: str) -> None:
    await _goto(page, f"{base}/")
    await dismiss_overlays(page)
    await wait_for(page, 'main, #root')
    await page.wait_for_timeout(700)


async def shot_note_fullscreen(page: Page, base: str) -> None:
    await _goto(page, f"{base}/")
    await dismiss_overlays(page)
    await page.wait_for_timeout(500)
    try:
        tile = await page.query_selector('[data-testid^="note-tile-"]')
        if tile:
            await tile.click(force=True)
            await page.wait_for_timeout(800)
    except Exception:
        pass


async def shot_quick_guide(page: Page, base: str) -> None:
    await _goto(page, f"{base}/")
    await dismiss_overlays(page)
    await page.wait_for_timeout(600)
    # Explicitly open QG for the home article via the header button
    try:
        btn = await page.query_selector('[data-testid="quickguide-btn-IRR-1000"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(900)
    except Exception:
        pass


async def shot_settings(page: Page, base: str) -> None:
    await _goto(page, f"{base}/")
    await dismiss_overlays(page)
    await page.wait_for_timeout(600)
    # Kill QG once more right before opening Settings — some renders re-nudge.
    await _kill_quickguide(page)
    try:
        btn = await page.query_selector('[data-testid="settings-btn"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(900)
            # If QG re-opened on top of settings, kill it again
            await _kill_quickguide(page)
    except Exception:
        pass


async def shot_wall_top(page: Page, base: str) -> None:
    await _goto(page, f"{base}/contributors")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    await page.evaluate("() => { try { localStorage.setItem('irr.wall_sort_mode', 'top'); } catch(e) {} }")
    await page.reload(wait_until="networkidle")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    await page.wait_for_timeout(700)


async def shot_wall_recent(page: Page, base: str) -> None:
    await _goto(page, f"{base}/contributors")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    try:
        btn = await page.query_selector('[data-testid="wall-sort-recent"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(500)
    except Exception:
        pass


async def shot_share_dialog(page: Page, base: str) -> None:
    await _goto(page, f"{base}/contributors")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    await page.wait_for_timeout(400)
    try:
        btn = await page.query_selector('[data-testid^="wall-share-"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(900)
    except Exception:
        pass


async def shot_recovery_dialog(page: Page, base: str) -> None:
    await _goto(page, f"{base}/contributors")
    await dismiss_overlays(page)
    await wait_for(page, '[data-testid="contributor-wall"]')
    await page.wait_for_timeout(400)
    try:
        btn = await page.query_selector('[data-testid^="wall-recover-"]')
        if btn:
            await btn.click(force=True)
            await page.wait_for_timeout(700)
    except Exception:
        pass


async def shot_magic_link(page: Page, base: str) -> None:
    target = f"{base}/recover?n=veggie_wizard&c=123456"
    await _goto(page, target)
    await dismiss_overlays(page)
    await page.wait_for_timeout(1200)
    dlg = await page.query_selector('[data-testid="recovery-dialog"]')
    if not dlg:
        await _goto(page, target)
        await page.wait_for_timeout(1200)
    await wait_for(page, '[data-testid="recovery-dialog"]', timeout=6000)
    await page.wait_for_timeout(500)


SHOTS = [
    ("01-home",             "home",             shot_home),
    ("02-note-fullscreen",  "note_fullscreen",  shot_note_fullscreen),
    ("03-quick-guide",      "quick_guide",      shot_quick_guide),
    ("04-settings",         "settings",         shot_settings),
    ("05-wall-top",         "wall_top",         shot_wall_top),
    ("06-wall-recent",      "wall_recent",      shot_wall_recent),
    ("07-share-card",       "share_dialog",     shot_share_dialog),
    ("08-recover-dialog",   "recovery_dialog",  shot_recovery_dialog),
    ("09-magic-link",       "magic_link",       shot_magic_link),
]


async def capture(base_url: str, only: str, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--no-sandbox"])
        context = await browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=1,
        )
        # Suppress first-run overlays for every page load in this session.
        await context.add_init_script(
            """() => {
                try {
                    localStorage.setItem('irr.qg.nudge_seen', 'true');
                    localStorage.setItem('iron_rabbit_qg_state_v1', JSON.stringify({
                        auto_show: false, nudge_seen: true, seen_ids: ['*'],
                    }));
                    localStorage.setItem('iron_rabbit_digest_last_shown', String(Date.now()));
                    localStorage.setItem('ir_first_launch_done', '1');
                    localStorage.setItem('ir_quick_access_done', '1');
                    localStorage.setItem('quickguide_seen', 'true');
                    localStorage.setItem('irr.qg.auto_open', 'false');
                } catch (e) {}
            }"""
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
    parser = argparse.ArgumentParser(description="Iron Rabbit — Desktop / website screenshot capture (1920×1080)")
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
