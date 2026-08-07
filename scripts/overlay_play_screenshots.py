#!/usr/bin/env python3
"""
Iron Rabbit — Play Store screenshot overlay/framing.

Reads the raw 8 shots produced by `capture_play_screenshots.py` and composites
a branded frame around each one:
  • top ribbon with the "IRON RABBIT" wordmark + brand dot
  • bottom band with a per-shot caption + one-line subline
  • subtle indigo→fuchsia gradient background so the raw screenshot floats

Each output is still 1080×1920, PNG, Play Store carousel-ready.

USAGE
-----
    python3 scripts/overlay_play_screenshots.py           # rebuild all 8
    python3 scripts/overlay_play_screenshots.py --only 04-wall-top

Raw shots live in:    frontend/public/screenshots/play/
Framed shots land in: frontend/public/screenshots/play/framed/
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("This script requires Pillow. Install with: pip install Pillow")

REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = REPO_ROOT / "frontend" / "public" / "screenshots" / "play"
OUT_DIR = RAW_DIR / "framed"

# Same brand palette as generate_play_assets.py so all Play artwork ships
# a coherent look.
INDIGO_DEEP = (30, 27, 75)
INDIGO      = (79, 70, 229)
FUCHSIA     = (168, 85, 247)
AMBER       = (245, 158, 11)
WHITE       = (248, 250, 252)
SLATE_400   = (148, 163, 184)

# ────────────────────────── shot metadata ──────────────────────────────────
# Caption tone: 3-4 words, verb-forward, benefit-first. Subline: one honest
# sentence that would fit in a Play Store description block.
CAPTIONS = {
    "01-home":              ("Notes that live on your phone",   "Offline-first. No account. No ads."),
    "02-note-fullscreen":   ("Focus, then write",                 "Full-screen editor with chores, checklists, and images."),
    "03-quick-guide":       ("A Quick Guide, always at hand",    "Community-authored tips promoted straight from the wall."),
    "04-wall-top":          ("Wall of thanks",                    "Every contributor whose tip made it into the guide."),
    "05-wall-recent-new":   ("Fresh names, front and centre",     "Toggle to Recent — new tippers earn a NEW ribbon."),
    "06-share-card":        ("Share your card, your way",         "Pick a theme. Downloads or native share, one tap."),
    "07-recover-dialog":    ("Never lose your nickname",           "Recover your @handle from a claimed email — safely."),
    "08-magic-link":        ("One-tap recovery",                   "Magic link jumps straight to the new-email step."),
}


# ────────────────────────── primitives ─────────────────────────────────────
def find_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Best-effort system font lookup (DejaVu / Liberation)."""
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ] if bold else [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


def vertical_gradient(w: int, h: int, top, bottom) -> Image.Image:
    """Top→bottom gradient using a scaled 1×h strip (fast + no per-pixel Python)."""
    strip = Image.new("RGB", (1, h))
    px = strip.load()
    for y in range(h):
        t = y / max(1, h - 1)
        px[0, y] = (
            int(top[0] * (1 - t) + bottom[0] * t),
            int(top[1] * (1 - t) + bottom[1] * t),
            int(top[2] * (1 - t) + bottom[2] * t),
        )
    return strip.resize((w, h), Image.BILINEAR)


def draw_wordmark(canvas: Image.Image, y: int) -> None:
    """Top ribbon: brand dot + "IRON RABBIT" in the accent tracking style."""
    d = ImageDraw.Draw(canvas)
    w = canvas.width
    dot_r = 8
    text = "IRON RABBIT"
    font = find_font(28, bold=True)
    bbox = d.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    total_w = dot_r * 2 + 14 + tw
    x0 = (w - total_w) // 2
    # amber brand dot
    d.ellipse([x0, y + 8, x0 + dot_r * 2, y + 8 + dot_r * 2], fill=AMBER)
    d.text((x0 + dot_r * 2 + 14, y), text, font=font, fill=(*WHITE, 255))


def draw_caption(canvas: Image.Image, top_y: int, headline: str, subline: str) -> None:
    """Bottom band: 2-line headline + 1-line subline, centred."""
    d = ImageDraw.Draw(canvas)
    w = canvas.width
    head_font = find_font(56, bold=True)
    sub_font  = find_font(28, bold=False)

    # Wrap headline into up to 2 lines by width. Simple greedy split.
    max_w = w - 96
    words = headline.split()
    lines: list[str] = []
    cur: list[str] = []
    for word in words:
        trial = (" ".join(cur + [word])).strip()
        bbox = d.textbbox((0, 0), trial, font=head_font)
        if bbox[2] - bbox[0] <= max_w or not cur:
            cur.append(word)
        else:
            lines.append(" ".join(cur))
            cur = [word]
    if cur:
        lines.append(" ".join(cur))
    lines = lines[:2]

    y = top_y
    for line in lines:
        bbox = d.textbbox((0, 0), line, font=head_font)
        tw = bbox[2] - bbox[0]
        d.text(((w - tw) // 2, y), line, font=head_font, fill=(*WHITE, 255))
        y += 68

    y += 6
    bbox = d.textbbox((0, 0), subline, font=sub_font)
    tw = bbox[2] - bbox[0]
    d.text(((w - tw) // 2, y), subline, font=sub_font, fill=(*SLATE_400, 255))


def frame_shot(raw_path: Path, headline: str, subline: str) -> Image.Image:
    """Composite the raw shot inside a branded 1080×1920 frame."""
    raw = Image.open(raw_path).convert("RGB")

    W, H = 1080, 1920
    # Reserved vertical bands.
    TOP_BAND = 90    # brand ribbon
    BOT_BAND = 400   # caption block

    # Available window for the raw shot.
    win_w = W - 60           # 30px side padding
    win_h = H - TOP_BAND - BOT_BAND - 40  # extra 40px inner padding above bot
    # Scale raw shot to fit while preserving aspect ratio.
    scale = min(win_w / raw.width, win_h / raw.height)
    new_w = int(raw.width * scale)
    new_h = int(raw.height * scale)
    thumb = raw.resize((new_w, new_h), Image.LANCZOS)

    # Background — vertical gradient with a soft indigo→deep tone.
    bg = vertical_gradient(W, H, INDIGO_DEEP, (10, 8, 30))

    # Soft accent glow behind the shot for depth.
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(
        [W // 2 - 500, TOP_BAND + 60, W // 2 + 500, TOP_BAND + 900],
        fill=(*INDIGO, 90),
    )
    glow = glow.filter(ImageFilter.GaussianBlur(radius=80))
    canvas = bg.convert("RGBA")
    canvas.alpha_composite(glow)

    # Rounded corners on the raw shot itself for a phone-mockup feel.
    corner = 40
    mask = Image.new("L", (new_w, new_h), 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (new_w, new_h)], radius=corner, fill=255)
    thumb_rgba = Image.new("RGBA", (new_w, new_h), (0, 0, 0, 0))
    thumb_rgba.paste(thumb, (0, 0), mask)

    # Drop shadow.
    shadow = Image.new("RGBA", (new_w + 60, new_h + 60), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(30, 30), (new_w + 30, new_h + 30)], radius=corner, fill=(0, 0, 0, 160),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=22))

    shot_x = (W - new_w) // 2
    shot_y = TOP_BAND + ((win_h - new_h) // 2)
    canvas.alpha_composite(shadow, (shot_x - 30, shot_y - 20))
    canvas.alpha_composite(thumb_rgba, (shot_x, shot_y))

    # Top brand ribbon + bottom caption.
    draw_wordmark(canvas, y=32)
    caption_top = H - BOT_BAND + 40
    draw_caption(canvas, top_y=caption_top, headline=headline, subline=subline)

    # Bottom accent line — thin amber underscore that ties every shot together.
    d = ImageDraw.Draw(canvas)
    d.rectangle([W // 2 - 40, H - 60, W // 2 + 40, H - 56], fill=(*AMBER, 255))

    return canvas.convert("RGB")


def main() -> int:
    parser = argparse.ArgumentParser(description="Iron Rabbit — screenshot framing")
    parser.add_argument("--only", help="Base name without .png (e.g. 04-wall-top)")
    parser.add_argument("--raw-dir", type=Path, default=RAW_DIR)
    parser.add_argument("--out-dir", type=Path, default=OUT_DIR)
    parser.add_argument(
        "--list-order",
        action="store_true",
        help="Print the Play carousel upload order from manifest.json and exit",
    )
    args = parser.parse_args()

    if args.list_order:
        import json
        manifest = args.out_dir / "manifest.json"
        if not manifest.exists():
            print(f"missing {manifest}")
            return 1
        m = json.loads(manifest.read_text())
        print("Play carousel upload order:")
        for row in m.get("carousel_order", []):
            print(f"  {row['position']:>2}. {row['file']:<28} — {row['caption']}")
        return 0

    args.out_dir.mkdir(parents=True, exist_ok=True)
    written = 0
    for base, (headline, subline) in CAPTIONS.items():
        if args.only and args.only != base:
            continue
        raw = args.raw_dir / f"{base}.png"
        if not raw.exists():
            print(f"  ! missing {raw} — run capture_play_screenshots.py first")
            continue
        out = args.out_dir / f"{base}.png"
        img = frame_shot(raw, headline, subline)
        img.save(out, "PNG", optimize=True)
        size = out.stat().st_size
        print(f"[framed] {out.relative_to(REPO_ROOT)}  ({size:,} bytes)")
        written += 1

    print(f"\nDone. {written} framed screenshot{'s' if written != 1 else ''}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
