#!/usr/bin/env python3
"""
generate_icons.py — pack the Diffract brand badge into app icons.

The badge artwork lives in `public/brand/diffract-badge.svg`. Its PNG renders
are committed under `public/brand/png/` (badge-16 … badge-512), so this script
needs no rasteriser and no network access — it only repackages them:

    src-tauri/icons/32x32.png
    src-tauri/icons/128x128.png
    src-tauri/icons/128x128@2x.png   (256 px)
    src-tauri/icons/icon.png         (512 px)
    src-tauri/icons/icon.ico         (16/32/48/64/128/256 PNG entries)

To change the logo: replace the SVG, re-render the PNGs at the sizes above
(any SVG renderer works), then run this script.

Usage:  python3 scripts/generate_icons.py
"""

import os
import shutil
import struct
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PNG_DIR = os.path.join(ROOT, "public", "brand", "png")
OUT_DIR = os.path.join(ROOT, "src-tauri", "icons")

# (source PNG, destination file in src-tauri/icons)
DIRECT = [
    ("badge-32.png", "32x32.png"),
    ("badge-128.png", "128x128.png"),
    ("badge-256.png", "128x128@2x.png"),
    ("badge-512.png", "icon.png"),
]

# ICO entries (PNG-encoded; supported by Windows Vista and later).
ICO_SIZES = [16, 32, 48, 64, 128, 256]


def png_size(data: bytes) -> tuple[int, int]:
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG file")
    width, height = struct.unpack(">II", data[16:24])
    return width, height


def build_ico(entries: list[bytes]) -> bytes:
    header = struct.pack("<HHH", 0, 1, len(entries))
    directory = b""
    offset = 6 + 16 * len(entries)
    for data in entries:
        w, h = png_size(data)
        # ICO stores 256 as 0.
        directory += struct.pack(
            "<BBBBHHII",
            0 if w >= 256 else w,
            0 if h >= 256 else h,
            0,
            0,
            1,
            32,
            len(data),
            offset,
        )
        offset += len(data)
    return header + directory + b"".join(entries)


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)

    for src_name, dst_name in DIRECT:
        src = os.path.join(PNG_DIR, src_name)
        if not os.path.exists(src):
            print(f"missing {src}", file=sys.stderr)
            return 1
        shutil.copyfile(src, os.path.join(OUT_DIR, dst_name))
        print(f"wrote {dst_name}")

    ico_entries = []
    for size in ICO_SIZES:
        src = os.path.join(PNG_DIR, f"badge-{size}.png")
        if not os.path.exists(src):
            print(f"missing {src}", file=sys.stderr)
            return 1
        with open(src, "rb") as f:
            ico_entries.append(f.read())
    ico_path = os.path.join(OUT_DIR, "icon.ico")
    with open(ico_path, "wb") as f:
        f.write(build_ico(ico_entries))
    print(f"wrote icon.ico ({len(ico_entries)} sizes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
