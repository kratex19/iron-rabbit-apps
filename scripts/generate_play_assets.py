#!/usr/bin/env python3
"""
Iron Rabbit — Play Store asset generator.

One command rebuilds every static asset needed for a Google Play release:
launcher icons (any-purpose + maskable + adaptive layers), splash, favicon,
Play Store hi-res icon, and the 1024x500 Feature Graphic banner.

USAGE
-----
Regenerate everything:
    python3 scripts/generate_play_assets.py

Regenerate a subset:
    python3 scripts/generate_play_assets.py --only icons
    python3 scripts/generate_play_assets.py --only feature-graphic
    python3 scripts/generate_play_assets.py --only splash

List what would be written without touching disk:
    python3 scripts/generate_play_assets.py --dry-run

OUTPUTS
-------
All PNGs land in `/app/frontend/public/` and are consumed by:
  • `public/manifest.json` (PWA icons + screenshots array)
  • Android Studio Asset Studio (adaptive icon foreground + background)
  • Play Console listing (feature graphic + hi-res icon + phone screenshots)

BRAND TOKENS
------------
INDIGO       #4F46E5     primary
INDIGO_DARK  #312E81
INDIGO_DEEP  #1E1B4B     gradient outer edge
AMBER        #F59E0B     carrot / accent
PINK         #F472B6     inner-ear
WHITE        #F8FAFC     rabbit body
DARK_BG      #020617     splash / feature graphic bg

Requires only Pillow. On the Emergent container it's pre-installed.
Add to requirements if running locally: `pip install Pillow`.
"""

from __future__ import annotations

import argparse
import math
import random
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except ImportError:
    sys.exit("This script requires Pillow. Install with: pip install Pillow")

# ─── paths ─────────────────────────────────────────────────────────────────
REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC = REPO_ROOT / "frontend" / "public"

# ─── brand palette ─────────────────────────────────────────────────────────
INDIGO      = (79, 70, 229)
INDIGO_DARK = (49, 46, 129)
INDIGO_DEEP = (30, 27, 75)
AMBER       = (245, 158, 11)
AMBER_LIGHT = (253, 224, 71)
PINK        = (244, 114, 182)
WHITE       = (248, 250, 252)
GREEN_500   = (34, 197, 94)
DARK_BG     = (2, 6, 23)


# ─── low-level primitives ──────────────────────────────────────────────────
def radial_gradient(size: int) -> Image.Image:
    """Radial-ish gradient centre-INDIGO → edge-INDIGO_DARK, non-transparent."""
    img = Image.new("RGB", (size, size), INDIGO_DEEP)
    px = img.load()
    cx, cy = size / 2, size / 2
    max_d = math.hypot(cx, cy)
    for y in range(size):
        for x in range(size):
            t = min(1.0, (math.hypot(x - cx, y - cy) / max_d) * 1.15)
            px[x, y] = (
                int(INDIGO[0] * (1 - t) + INDIGO_DARK[0] * t),
                int(INDIGO[1] * (1 - t) + INDIGO_DARK[1] * t),
                int(INDIGO[2] * (1 - t) + INDIGO_DARK[2] * t),
            )
    return img.convert("RGBA")


def rounded_square(size: int, radius_ratio: float = 0.22) -> Image.Image:
    """Rounded-square masked radial gradient (RGBA with transparent corners)."""
    r = int(size * radius_ratio)
    grad = radial_gradient(size).convert("RGB")
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (size, size)], radius=r, fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(grad, (0, 0), mask)
    return out


def horizontal_gradient(w: int, h: int, left, right, bias: float = 1.0) -> Image.Image:
    """Left→right gradient. bias>1 slows the transition, <1 speeds it."""
    img = Image.new("RGB", (w, h), left)
    px = img.load()
    for x in range(w):
        t = (x / (w - 1)) ** bias
        r = int(left[0] * (1 - t) + right[0] * t)
        g = int(left[1] * (1 - t) + right[1] * t)
        b = int(left[2] * (1 - t) + right[2] * t)
        for y in range(h):
            px[x, y] = (r, g, b)
    return img


def soft_glow(canvas: Image.Image, cx: float, cy: float, r: float, color, opacity: int = 120) -> None:
    """Composite a blurry radial disc onto `canvas` — used for depth accents."""
    layer = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).ellipse([cx - r, cy - r, cx + r, cy + r], fill=(*color, opacity))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=int(r * 0.45)))
    canvas.alpha_composite(layer)


def sprinkle_grain(img: Image.Image, amount: int = 5) -> None:
    """Tiny per-pixel jitter so gradients don't feel flat / AI-slick."""
    px = img.load()
    for _ in range(int(img.width * img.height * 0.015)):
        x = random.randint(0, img.width - 1)
        y = random.randint(0, img.height - 1)
        p = px[x, y]
        j = random.randint(-amount, amount)
        if len(p) == 4:
            px[x, y] = (
                max(0, min(255, p[0] + j)),
                max(0, min(255, p[1] + j)),
                max(0, min(255, p[2] + j)),
                p[3],
            )
        else:
            px[x, y] = (
                max(0, min(255, p[0] + j)),
                max(0, min(255, p[1] + j)),
                max(0, min(255, p[2] + j)),
            )


def find_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Best-effort system font lookup (DejaVu / Liberation)."""
    bold_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf",
    ]
    reg_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]
    for p in (bold_paths if bold else reg_paths):
        if Path(p).exists():
            return ImageFont.truetype(p, size=size)
    return ImageFont.load_default()


# ─── the rabbit ────────────────────────────────────────────────────────────
def draw_rabbit(canvas: Image.Image, cx: float, cy: float, scale: float) -> None:
    """Draw the Iron Rabbit face at (cx, cy) with world-space `scale`.

    scale=size*0.66 fits a 33% safe-zone (maskable icons).
    scale=size*0.80 fits a 10% safe-zone (any-purpose icons + feature graphic).
    """
    d = ImageDraw.Draw(canvas)
    S = scale

    # Ears — outer white, inner pink
    for sign, offx in ((-1, -0.15), (1, 0.15)):
        ex = cx + offx * S
        ey = cy - 0.42 * S
        ew, eh = 0.22 * S, 0.58 * S
        d.ellipse([ex - ew / 2, ey - eh / 2, ex + ew / 2, ey + eh / 2], fill=WHITE)
        d.ellipse(
            [ex - ew * 0.28, ey - eh * 0.36, ex + ew * 0.28, ey + eh * 0.38],
            fill=PINK,
        )

    # Head
    head_r = 0.44 * S
    head_cy = cy + 0.08 * S
    d.ellipse([cx - head_r, head_cy - head_r, cx + head_r, head_cy + head_r], fill=WHITE)

    # Cheeks
    for sign in (-1, 1):
        d.ellipse(
            [
                cx + sign * 0.24 * S - 0.06 * S,
                head_cy + 0.10 * S - 0.04 * S,
                cx + sign * 0.24 * S + 0.06 * S,
                head_cy + 0.10 * S + 0.04 * S,
            ],
            fill=PINK,
        )

    # Eyes + highlights
    eye_r = 0.04 * S
    for sign in (-1, 1):
        ex = cx + sign * 0.14 * S
        ey = head_cy - 0.05 * S
        d.ellipse([ex - eye_r, ey - eye_r, ex + eye_r, ey + eye_r], fill=INDIGO_DEEP)
        d.ellipse(
            [
                ex - eye_r * 0.7,
                ey - eye_r * 0.7,
                ex - eye_r * 0.1,
                ey - eye_r * 0.1,
            ],
            fill=WHITE,
        )

    # Nose
    nose_w = 0.06 * S
    nose_y = head_cy + 0.06 * S
    d.polygon(
        [
            (cx - nose_w / 2, nose_y),
            (cx + nose_w / 2, nose_y),
            (cx, nose_y + nose_w * 0.8),
        ],
        fill=AMBER,
    )

    # Mouth — friendly smile
    d.arc(
        [cx - 0.06 * S, nose_y + 0.02 * S, cx + 0.06 * S, nose_y + 0.10 * S],
        start=20, end=160, fill=INDIGO_DEEP, width=max(2, int(0.008 * S)),
    )

    # Whiskers
    whisker_len = 0.14 * S
    for sign in (-1, 1):
        for yoff in (-0.02 * S, 0.02 * S):
            d.line(
                [
                    (cx + sign * 0.20 * S, nose_y + yoff),
                    (cx + sign * (0.20 * S + whisker_len), nose_y + yoff + sign * 0.02 * S),
                ],
                fill=INDIGO_DEEP, width=max(1, int(0.006 * S)),
            )

    # Carrot accent (bottom-right of head)
    car_cx, car_cy = cx + 0.36 * S, head_cy + 0.28 * S
    d.polygon(
        [
            (car_cx - 0.055 * S, car_cy - 0.09 * S),
            (car_cx + 0.055 * S, car_cy - 0.09 * S),
            (car_cx, car_cy + 0.11 * S),
        ],
        fill=AMBER,
    )
    d.polygon(
        [
            (car_cx - 0.055 * S, car_cy - 0.09 * S),
            (car_cx + 0.055 * S, car_cy - 0.09 * S),
            (car_cx, car_cy - 0.17 * S),
        ],
        fill=GREEN_500,
    )


# ─── composed assets ───────────────────────────────────────────────────────
def render_icon(size: int, maskable: bool = False) -> Image.Image:
    """Full launcher icon. Maskable variant uses 66% safe zone."""
    bg = radial_gradient(size) if maskable else rounded_square(size, 0.22)
    canvas = bg.copy()
    draw_rabbit(canvas, cx=size / 2, cy=size / 2, scale=size * (0.66 if maskable else 0.80))
    return canvas


def render_splash(size: int = 2048) -> Image.Image:
    """Splash: dark bg + centred rabbit badge with soft drop shadow."""
    img = Image.new("RGB", (size, size), DARK_BG).convert("RGBA")
    badge_size = int(size * 0.42)
    badge = rounded_square(badge_size, 0.22)
    draw_rabbit(badge, cx=badge_size / 2, cy=badge_size / 2, scale=badge_size * 0.80)
    shadow = Image.new("RGBA", (badge_size + 60, badge_size + 60), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(30, 30), (badge_size + 30, badge_size + 30)],
        radius=int(badge_size * 0.22),
        fill=(0, 0, 0, 140),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=24))
    img.alpha_composite(shadow, ((size - shadow.width) // 2, (size - shadow.height) // 2 + 20))
    img.paste(badge, ((size - badge_size) // 2, (size - badge_size) // 2), badge)
    return img.convert("RGB")


def render_feature_graphic(w: int = 1024, h: int = 500) -> Image.Image:
    """Google Play Feature Graphic — 1024×500 required by the store listing."""
    bg = horizontal_gradient(w, h, INDIGO_DEEP, INDIGO, bias=1.2).convert("RGBA")
    soft_glow(bg, cx=180, cy=430, r=260, color=AMBER, opacity=45)
    soft_glow(bg, cx=820, cy=250, r=280, color=(129, 140, 248), opacity=70)

    # Rabbit badge (right side)
    badge_size = 340
    badge = rounded_square(badge_size, 0.22)
    draw_rabbit(badge, cx=badge_size / 2, cy=badge_size / 2, scale=badge_size * 0.80)
    shadow = Image.new("RGBA", (badge_size + 60, badge_size + 60), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        [(30, 30), (badge_size + 30, badge_size + 30)],
        radius=int(badge_size * 0.22),
        fill=(0, 0, 0, 150),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=22))
    badge_x = w - badge_size - 80
    badge_y = (h - badge_size) // 2
    bg.alpha_composite(shadow, (badge_x - 30, badge_y - 20))
    bg.alpha_composite(badge, (badge_x, badge_y))

    # Text (left side)
    d = ImageDraw.Draw(bg)
    brand_font = find_font(24, bold=True)
    d.text((80, 105), "IRON RABBIT", font=brand_font, fill=(200, 205, 240, 255))
    d.ellipse([280, 118, 290, 128], fill=AMBER)

    tag_font = find_font(56, bold=True)
    for i, (text, color) in enumerate([
        ("Notes that live", WHITE),
        ("on your", WHITE),
        ("phone.", AMBER),
    ]):
        d.text((80, 155 + i * 70), text, font=tag_font, fill=(*color, 255))

    sub_font = find_font(22, bold=False)
    d.text(
        (80, 395),
        "Offline-first  \u00b7  No account  \u00b7  No ads  \u00b7  No tracking",
        font=sub_font,
        fill=(190, 195, 225, 255),
    )

    sprinkle_grain(bg, amount=5)
    return bg.convert("RGB")


def render_adaptive_foreground(size: int = 432) -> Image.Image:
    """Android adaptive-icon foreground layer — transparent, rabbit only."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw_rabbit(canvas, cx=size / 2, cy=size / 2, scale=size * 0.66)
    return canvas


# ─── build spec ────────────────────────────────────────────────────────────
BUILD_SPEC = {
    "icons": [
        ("icon-192.png",           lambda: render_icon(192,  maskable=False)),
        ("icon-512.png",           lambda: render_icon(512,  maskable=False)),
        ("icon-192-maskable.png",  lambda: render_icon(192,  maskable=True)),
        ("icon-512-maskable.png",  lambda: render_icon(512,  maskable=True)),
        ("icon-1024.png",          lambda: render_icon(1024, maskable=False)),
        ("favicon.png",            lambda: render_icon(48,   maskable=False)),
        ("icon-foreground-432.png", lambda: render_adaptive_foreground(432)),
        ("icon-background-432.png", lambda: radial_gradient(432)),
    ],
    "splash": [
        ("splash-2048.png", lambda: render_splash(2048)),
    ],
    "feature-graphic": [
        ("feature-graphic-1024x500.png", lambda: render_feature_graphic(1024, 500)),
    ],
}


def main() -> int:
    parser = argparse.ArgumentParser(description="Iron Rabbit — Play Store asset generator")
    parser.add_argument(
        "--only",
        choices=list(BUILD_SPEC.keys()) + ["all"],
        default="all",
        help="Regenerate a subset. Defaults to all.",
    )
    parser.add_argument("--dry-run", action="store_true", help="Print outputs without writing files.")
    parser.add_argument("--out-dir", type=Path, default=PUBLIC, help="Override output directory.")
    args = parser.parse_args()

    groups = list(BUILD_SPEC) if args.only == "all" else [args.only]
    args.out_dir.mkdir(parents=True, exist_ok=True)

    written = 0
    for group in groups:
        for name, fn in BUILD_SPEC[group]:
            out = args.out_dir / name
            if args.dry_run:
                print(f"[dry-run] would write {out}")
                continue
            img = fn()
            img.save(out, "PNG", optimize=True)
            size = out.stat().st_size
            print(f"[{group}] {out.relative_to(REPO_ROOT)}  ({size:,} bytes)")
            written += 1

    if args.dry_run:
        print("Dry-run complete.")
    else:
        print(f"\nDone. {written} asset{'s' if written != 1 else ''} written to {args.out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
