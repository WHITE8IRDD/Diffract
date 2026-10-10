#!/usr/bin/env python3
"""
generate_icons.py — render the Diffract prism logo to app icons.

Dependency-free (stdlib only): a tiny supersampled rasterizer draws the
prism mark described in public/icon.svg, then writes:

    src-tauri/icons/32x32.png
    src-tauri/icons/128x128.png
    src-tauri/icons/128x128@2x.png   (256 px)
    src-tauri/icons/icon.png         (512 px)
    src-tauri/icons/icon.ico         (multi-size, PNG-encoded)

Usage:  python3 scripts/generate_icons.py
"""

import os
import struct
import sys
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "src-tauri", "icons")

SS = 4  # supersampling factor for antialiasing


# ── color helpers ──────────────────────────────────────────────────────────

SPECTRUM = [
    (0.00, (255, 77, 109)),
    (0.18, (255, 158, 64)),
    (0.36, (255, 225, 77)),
    (0.54, (77, 255, 163)),
    (0.72, (77, 201, 255)),
    (0.88, (122, 108, 255)),
    (1.00, (210, 77, 255)),
]


def spectrum_color(t):
    t = max(0.0, min(1.0, t))
    for i in range(len(SPECTRUM) - 1):
        t0, c0 = SPECTRUM[i]
        t1, c1 = SPECTRUM[i + 1]
        if t0 <= t <= t1:
            f = (t - t0) / (t1 - t0) if t1 > t0 else 0.0
            return tuple(round(c0[k] + (c1[k] - c0[k]) * f) for k in range(3))
    return SPECTRUM[-1][1]


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c0, c1, t):
    return tuple(round(lerp(c0[k], c1[k], t)) for k in range(3))


GLASS_TOP = (61, 61, 77)
GLASS_BOT = (28, 28, 38)


# ── geometry tests (in 0..64 logo units) ───────────────────────────────────

def dist_point_segment(px, py, x0, y0, x1, y1):
    dx, dy = x1 - x0, y1 - y0
    if dx == 0 and dy == 0:
        return ((px - x0) ** 2 + (py - y0) ** 2) ** 0.5
    t = max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy)))
    cx, cy = x0 + t * dx, y0 + t * dy
    return ((px - cx) ** 2 + (py - cy) ** 2) ** 0.5


def point_in_triangle(px, py, a, b, c):
    def sign(p1, p2):
        return (p1[0] - p2[0]) * (p2[1] - p2[1]) - (p2[0] - p2[0]) * (p1[1] - p2[1])

    d1 = (px - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (py - b[1])
    d2 = (px - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (py - c[1])
    d3 = (px - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (py - a[1])
    neg = (d1 < 0) or (d2 < 0) or (d3 < 0)
    pos = (d1 > 0) or (d2 > 0) or (d3 > 0)
    return not (neg and pos)


def bary(px, py, a, b, c):
    """Barycentric coordinate along the glass gradient (vertex a = top)."""
    det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if det == 0:
        return 0.0
    l0 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / det
    return max(0.0, min(1.0, l0))


# ── sample one logo-space pixel → RGBA ─────────────────────────────────────

PRISM = ((32, 14), (48, 44), (16, 44))
SPECTRUM_RAYS = [
    ((40, 36), (62, 22)),
    ((41, 38), (62, 30)),
    ((42, 40), (62, 38)),
    ((43, 42), (62, 46)),
]


def sample(x, y):
    """Return (r, g, b, a) for logo-space point (x, y) in 0..64."""
    # incoming white beam (round-cap thick line)
    if dist_point_segment(x, y, 2, 30, 26, 30) <= 1.9:
        return (245, 245, 245, 255)

    # prism body
    a, b, c = PRISM
    if point_in_triangle(x, y, a, b, c):
        # vertical glass gradient (top lighter)
        t = (y - 14) / 30.0
        col = mix(GLASS_TOP, GLASS_BOT, max(0.0, min(1.0, t)))
        # stroke edge: dark slate rim
        d_edge = min(
            dist_point_segment(x, y, *a, *b),
            dist_point_segment(x, y, *b, *c),
            dist_point_segment(x, y, *c, *a),
        )
        if d_edge <= 0.9:
            col = (90, 90, 114)
        # inner highlight line from apex
        elif dist_point_segment(x, y, 32, 14, 20, 44) <= 0.7:
            col = mix(col, (138, 138, 168), 0.55)
        return (*col, 255)

    # spectrum rays (gradient along travel direction)
    for i, ((x0, y0), (x1, y1)) in enumerate(SPECTRUM_RAYS):
        if dist_point_segment(x, y, x0, y0, x1, y1) <= 1.9:
            t = i / max(1, len(SPECTRUM_RAYS) - 1) * 0.25 + (
                (x - 40) / 22.0
            ) * 0.75
            return (*spectrum_color(t), 255)

    return (0, 0, 0, 0)


# ── PNG / ICO writers ──────────────────────────────────────────────────────

def write_png(path, size):
    """Rasterize at SS× and box-filter down to `size`."""
    dim = size * SS
    rows = []
    for j in range(size):
        row = bytearray()
        for i in range(size):
            acc = [0, 0, 0, 0]
            for sj in range(SS):
                for si in range(SS):
                    x = (i * SS + si + 0.5) / SS / size * 64
                    y = (j * SS + sj + 0.5) / SS / size * 64
                    r, g, b, a = sample(x, y)
                    # premultiply-ish accumulation for clean edges
                    acc[0] += r * a
                    acc[1] += g * a
                    acc[2] += b * a
                    acc[3] += a
            n = SS * SS
            alpha = acc[3] // n
            if alpha == 0:
                row += bytes((0, 0, 0, 0))
            else:
                row += bytes((
                    min(255, (acc[0] // n) // max(1, alpha)),
                    min(255, (acc[1] // n) // max(1, alpha)),
                    min(255, (acc[2] // n) // max(1, alpha)),
                    alpha,
                ))
        rows.append(bytes(row))

    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        c += struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        return c

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)
    return png


def write_ico(path, pngs):
    """ICO container with PNG-encoded frames (sizes 32/128/256)."""
    n = len(pngs)
    header = struct.pack("<HHH", 0, 1, n)
    entries = b""
    offset = 6 + 16 * n
    payloads = b""
    for size, data in pngs:
        dim = 0 if size >= 256 else size
        entries += struct.pack(
            "<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset
        )
        payloads += data
        offset += len(data)
    with open(path, "wb") as f:
        f.write(header + entries + payloads)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    frames = []
    for name, size in (
        ("32x32.png", 32),
        ("128x128.png", 128),
        ("128x128@2x.png", 256),
        ("icon.png", 512),
    ):
        path = os.path.join(OUT_DIR, name)
        write_png(path, size)
        print(f"✓ {name}")
        if size <= 256:
            with open(path, "rb") as f:
                frames.append((size, f.read()))

    ico_path = os.path.join(OUT_DIR, "icon.ico")
    write_ico(ico_path, frames)
    print("✓ icon.ico")
    print(f"Icons written to {OUT_DIR}")


if __name__ == "__main__":
    sys.exit(main())
