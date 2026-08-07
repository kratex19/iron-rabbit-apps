#!/usr/bin/env python3
"""
Email all desktop-sized (1920×1080 landscape) Iron Rabbit screenshots
to a target address via Resend. Used to hand-off assets for the
ironrabbitapps.com website.

Sends from the configured SENDER_EMAIL, attaches:
  • 4 landscape hero shots from public/screenshots/ (1920×1080)
  • 9 desktop feature shots from public/screenshots/desktop/ (1920×1080)

Usage:
    python3 scripts/email_desktop_screenshots.py --to geegadget@yahoo.com
"""
from __future__ import annotations

import argparse
import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(REPO_ROOT / "backend" / ".env")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL   = os.environ.get("SENDER_EMAIL")

if not RESEND_API_KEY or not SENDER_EMAIL:
    sys.exit("RESEND_API_KEY / SENDER_EMAIL not set in backend/.env")

import resend
resend.api_key = RESEND_API_KEY

# --- Collect files ------------------------------------------------------
SCREENSHOT_ROOT = REPO_ROOT / "frontend" / "public" / "screenshots"

# 1) Landscape hero shots (1920×1080)
LANDSCAPE = [
    SCREENSHOT_ROOT / "kid-mode.png",
    SCREENSHOT_ROOT / "pantry-nutriscore.png",
    SCREENSHOT_ROOT / "meal-plan.png",
    SCREENSHOT_ROOT / "backup-restore.png",
]

# 2) Newly captured desktop feature shots (1920×1080)
DESKTOP_DIR = SCREENSHOT_ROOT / "desktop"
DESKTOP = sorted(DESKTOP_DIR.glob("*.png"))

ALL_FILES = [p for p in (LANDSCAPE + DESKTOP) if p.exists()]

if not ALL_FILES:
    sys.exit("no screenshot files found")

# --- Build attachments --------------------------------------------------
def encode(path: Path) -> dict:
    data = path.read_bytes()
    return {
        "filename": path.name,
        "content": base64.b64encode(data).decode("ascii"),
    }

def kb(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"

# --- HTML body ----------------------------------------------------------
def build_html(files: list[Path]) -> str:
    rows = "\n".join(
        f'<tr><td style="padding:4px 12px;color:#334155;">{i:02d}.</td>'
        f'<td style="padding:4px 12px;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;">{p.name}</td>'
        f'<td style="padding:4px 12px;color:#64748b;font-size:13px;text-align:right;">{kb(p)}</td></tr>'
        for i, p in enumerate(files, start=1)
    )
    return f"""
<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    <tr>
      <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:24px 28px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#c7d2fe;text-transform:uppercase;">Iron Rabbit · Asset Handoff</div>
        <h1 style="margin:6px 0 0 0;font-size:22px;color:#fff;font-weight:700;">Desktop screenshots for ironrabbitapps.com</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 28px;">
        <p style="margin:0 0 12px 0;font-size:15px;line-height:1.5;color:#334155;">
          Attached: <strong>{len(files)} desktop-sized screenshots</strong> (all 1920×1080 landscape, PNG)
          captured from the live Iron Rabbit preview app. Ready to drop into the website hero, feature strips,
          or blog posts.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;">#</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;">File</th>
              <th style="padding:8px 12px;text-align:right;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:600;">Size</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </table>
        <p style="margin:24px 0 0 0;font-size:13px;color:#64748b;line-height:1.5;">
          All shots are at native resolution (1920×1080) — no scaling needed for retina/hi-DPI website use.
          To re-generate at any time, run
          <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:12px;">python3 scripts/capture_desktop_screenshots.py</code>
          on the app pod.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#f8fafc;padding:16px 28px;font-size:12px;color:#94a3b8;text-align:center;">
        Iron Rabbit · Community-powered offline notes<br />
        <a href="https://ironrabbitapps.com" style="color:#4f46e5;text-decoration:none;">ironrabbitapps.com</a>
      </td>
    </tr>
  </table>
</body>
</html>
""".strip()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--to", required=True, help="Recipient email address")
    parser.add_argument("--subject", default="Iron Rabbit — desktop screenshots for ironrabbitapps.com")
    args = parser.parse_args()

    files = ALL_FILES
    total_bytes = sum(p.stat().st_size for p in files)
    print(f"attaching {len(files)} file(s), total {total_bytes / 1024:.0f} KB")
    for p in files:
        print(f"  • {p.name}  ({kb(p)})")

    params = {
        "from": f"Iron Rabbit <{SENDER_EMAIL}>",
        "to": [args.to],
        "subject": args.subject,
        "html": build_html(files),
        "attachments": [encode(p) for p in files],
    }
    print(f"\nsending to {args.to} from {SENDER_EMAIL} ...")
    result = resend.Emails.send(params)
    print(f"→ result: {result}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
