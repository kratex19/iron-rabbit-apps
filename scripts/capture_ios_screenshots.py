"""
Iron Rabbit — App Store screenshot capture (Playwright).

Renders the app at App-Store-required screen sizes and saves PNGs into
`frontend/public/screenshots/ios/`. Uses `?screenshot=1` URL flag to
suppress the Quick Guide + Theme Chooser modals so the shots are clean.

Sizes captured:
  • iPhone 6.7"  — 1290×2796 (Pro Max class, Apple's required size)
  • iPad Pro 12.9" — 2048×2732 (Apple's required size for iPad apps)

Runs in this container's headless Chromium via Playwright. Output is
committed to the repo so you can upload directly from App Store Connect
without a phone or tablet on hand.

Usage:
    python3 scripts/capture_ios_screenshots.py
"""

import asyncio
import os
import sys
from pathlib import Path

from playwright.async_api import async_playwright


BASE_URL = os.environ.get(
    "SCREENSHOT_BASE_URL",
    "https://color-task-timer.preview.emergentagent.com",
)
OUT_ROOT = Path("/app/frontend/public/screenshots/ios")

DEVICES = [
    {
        "name": "iphone-6.7",
        "width": 1290,
        "height": 2796,
        # Apple wants the exact pixel dimension of the required size — NOT a
        # Retina @3x image. Keep DPR = 1 so `screenshot()` writes the file at
        # 1290×2796 rather than 3870×8388.
        "device_scale_factor": 1,
        "is_mobile": True,
    },
    {
        "name": "ipad-12.9",
        "width": 2048,
        "height": 2732,
        "device_scale_factor": 1,
        "is_mobile": True,
    },
]

SHOTS = [
    {
        "id": "01-home",
        "url": f"{BASE_URL}/?screenshot=1",
        "wait": 2500,
    },
    {
        "id": "02-home-scrolled",
        "url": f"{BASE_URL}/?screenshot=1",
        "wait": 2500,
        "scroll_y": 600,
    },
]


async def capture_one(browser, device, shot):
    ctx = await browser.new_context(
        viewport={"width": device["width"], "height": device["height"]},
        device_scale_factor=device["device_scale_factor"],
        is_mobile=device["is_mobile"],
        has_touch=device["is_mobile"],
        user_agent=(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 "
            "Mobile/15E148 Safari/604.1"
        ),
    )
    page = await ctx.new_page()
    await page.goto(shot["url"], wait_until="networkidle", timeout=30000)
    await page.wait_for_timeout(shot["wait"])
    if shot.get("scroll_y"):
        await page.evaluate(f"window.scrollTo(0, {shot['scroll_y']})")
        await page.wait_for_timeout(600)
    out_dir = OUT_ROOT / device["name"]
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{shot['id']}.png"
    await page.screenshot(path=str(out_path), full_page=False, type="png")
    await ctx.close()
    return out_path


async def main():
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            for device in DEVICES:
                for shot in SHOTS:
                    out = await capture_one(browser, device, shot)
                    print(f"  OK {device['name']:12s}  {shot['id']:20s}  →  {out}")
        finally:
            await browser.close()


if __name__ == "__main__":
    print(f"Iron Rabbit App Store screenshot capture")
    print(f"  Base URL:   {BASE_URL}")
    print(f"  Output:     {OUT_ROOT}")
    print()
    asyncio.run(main())
    print()
    print("Done. Upload these directly to App Store Connect.")
