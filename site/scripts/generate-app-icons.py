#!/usr/bin/env python3
"""Generate opaque iOS AppIcon + Android mipmaps from assets/icon-only.png."""
from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "icon-only.png"
BG = (10, 5, 5)  # #0a0505
ASSETS = ROOT / "assets"

DENSITIES = {
    "ldpi": 36,
    "mdpi": 48,
    "hdpi": 72,
    "xhdpi": 96,
    "xxhdpi": 144,
    "xxxhdpi": 192,
}
FG_SIZES = {
    "ldpi": 81,
    "mdpi": 108,
    "hdpi": 162,
    "xhdpi": 216,
    "xxhdpi": 324,
    "xxxhdpi": 432,
}


def make_1024(src: Image.Image) -> Image.Image:
    size = 1024
    max_side = int(size * 0.78)
    ratio = min(max_side / src.width, max_side / src.height)
    nw, nh = int(src.width * ratio), int(src.height * ratio)
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    base = Image.new("RGBA", (size, size), (*BG, 255))
    base.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return base.convert("RGB")


def make_foreground(src: Image.Image, size: int = 432) -> Image.Image:
    fg = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    max_side = int(size * 0.66)
    ratio = min(max_side / src.width, max_side / src.height)
    nw, nh = int(src.width * ratio), int(src.height * ratio)
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    fg.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return fg


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing {SRC}")
    src = Image.open(SRC).convert("RGBA")
    icon = make_1024(src)
    fg = make_foreground(src)
    bg = Image.new("RGB", (432, 432), BG)

    ASSETS.mkdir(parents=True, exist_ok=True)
    icon.save(ASSETS / "app-icon-1024.png", "PNG")
    fg.save(ASSETS / "app-icon-foreground.png", "PNG")
    bg.save(ASSETS / "app-icon-background.png", "PNG")

    ios = ROOT / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
    if ios.parent.exists():
        icon.save(ios, "PNG")
        print(f"OK iOS {ios}")

    android_res = ROOT / "android/app/src/main/res"
    if android_res.exists():
        for dens, px in DENSITIES.items():
            d = android_res / f"mipmap-{dens}"
            d.mkdir(parents=True, exist_ok=True)
            launcher = icon.resize((px, px), Image.Resampling.LANCZOS)
            launcher.save(d / "ic_launcher.png", "PNG")
            launcher.save(d / "ic_launcher_round.png", "PNG")
            fsz = FG_SIZES[dens]
            fg.resize((fsz, fsz), Image.Resampling.LANCZOS).save(
                d / "ic_launcher_foreground.png", "PNG"
            )
            bg.resize((fsz, fsz), Image.Resampling.LANCZOS).save(
                d / "ic_launcher_background.png", "PNG"
            )
            print(f"OK Android mipmap-{dens}")

    print("OK icons generated")


if __name__ == "__main__":
    main()
