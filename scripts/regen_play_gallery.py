#!/usr/bin/env python3
"""Iron Rabbit — Play carousel regen entry point.

Runs both `capture_play_screenshots.py` (Playwright captures raw shots) and
`overlay_play_screenshots.py` (Pillow frames them) so `frontend/public/
screenshots/play/framed/` stays fresh after UI changes.

Designed to be invoked from either:
  * a shell (`python3 scripts/regen_play_gallery.py`)
  * the weekly APScheduler job in `server.py`
  * the admin-triggered endpoint `POST /api/admin/screenshots/regen`

Returns a small dict summary so callers can log/store it.
"""
from __future__ import annotations

import argparse
import asyncio
import importlib.util
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parent.parent
CAPTURE = REPO_ROOT / "scripts" / "capture_play_screenshots.py"
OVERLAY = REPO_ROOT / "scripts" / "overlay_play_screenshots.py"


def _load(name: str, path: Path):
    """Load a sibling script by path so we can call its main() without an
    extra subprocess. Playwright and Pillow are heavy — one process is nicer."""
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    return mod


async def regen(base_url: str | None = None) -> Dict[str, Any]:
    """Run capture + overlay end-to-end. Silent-fails on either half; the
    caller decides what to do with `error` / `files_written`."""
    started = datetime.now(timezone.utc)
    result: Dict[str, Any] = {
        "started_at": started.isoformat(),
        "captured": [],
        "framed": [],
        "error": None,
    }
    try:
        cap = _load("_regen_capture", CAPTURE)
        # Reuse the module's URL resolver so PUBLIC_APP_URL/preview-URL logic
        # stays in one place. `--only=all` is implicit via the default.
        url = base_url or cap.load_base_url()
        await cap.capture(url, "all", cap.OUT_DIR)
        result["captured"] = sorted(p.name for p in cap.OUT_DIR.glob("*.png"))
    except Exception as e:
        result["error"] = f"capture: {e}\n{traceback.format_exc()}"
        return result

    try:
        ovl = _load("_regen_overlay", OVERLAY)
        for base, (headline, subline) in ovl.CAPTIONS.items():
            raw = ovl.RAW_DIR / f"{base}.png"
            if not raw.exists():
                continue
            ovl.OUT_DIR.mkdir(parents=True, exist_ok=True)
            img = ovl.frame_shot(raw, headline, subline)
            out = ovl.OUT_DIR / f"{base}.png"
            img.save(out, "PNG", optimize=True)
        result["framed"] = sorted(p.name for p in ovl.OUT_DIR.glob("*.png") if p.name != "manifest.json")
    except Exception as e:
        result["error"] = f"overlay: {e}\n{traceback.format_exc()}"
        return result

    result["finished_at"] = datetime.now(timezone.utc).isoformat()
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Regenerate Iron Rabbit Play gallery")
    parser.add_argument("--url", help="Override base URL for capture (default: REACT_APP_BACKEND_URL)")
    args = parser.parse_args()
    result = asyncio.run(regen(args.url))
    if result.get("error"):
        print(f"FAIL:\n{result['error']}")
        return 1
    print(f"captured: {len(result.get('captured', []))} files")
    print(f"framed  : {len(result.get('framed', []))} files")
    print(f"finished: {result.get('finished_at')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
