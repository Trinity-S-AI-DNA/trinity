#!/usr/bin/env python3
"""pin-map-card.py -- draw public/widgets/pin-map/card.png: the XC7A200T 676-ball package as chip art.

Nothing on the card is typed in here. The package (rows, columns, banks, which balls prjxray-db
lists) comes from public/widgets/pin-map/pins.json; which balls the Wukong XDC lights, and which
the lint flags, comes from running the page's own xdc.js in node on demos.json; the colours come
from the custom properties in public/widgets/pin-map/tool.css. IMAGE_ALT in
specs/widgets/pin-map.t27 quotes the counts, so this script refuses to draw a card the alt text
does not describe.

Usage: node scripts/widget-data/pin-map.mjs && python3 scripts/widget-data/pin-map-card.py
"""
import json
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SITE = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DIR = os.path.join(SITE, "public/widgets/pin-map")
PINS = os.path.join(DIR, "pins.json")
CSS = os.path.join(DIR, "tool.css")
SPEC = os.path.join(SITE, "specs/widgets/pin-map.t27")
OUT = os.path.join(DIR, "card.png")
DEMO = "wukong"

W, H, S = 1200, 630, 2  # drawn at S times the size, then reduced, for smooth edges
BLACK, GREEN, RED, GOLD, TEXT, MUTED, SUBTLE = "#000000", "#00ff88", "#ff4d6d", "#ffd700", "#e8fff7", "#adc9c0", "#8fa9a0"
BRAND = "Trinity S\u00b3AI"

LINT_JS = r"""
import { readFileSync } from 'node:fs'
import { parseXdc, lintXdc, summarize } from './scripts/widget-data/pin-map-xdc.js'
const P = JSON.parse(readFileSync('public/widgets/pin-map/pins.json', 'utf8'))
const D = JSON.parse(readFileSync('public/widgets/pin-map/demos.json', 'utf8'))
const d = D.find((x) => x.id === process.argv[1])
const pins = new Map(P.pins.map((p) => [p[0], { bank: p[1], fn: p[4], type: p[5] }]))
const lint = lintXdc(parseXdc(d.text), { rows: P.rows, cols: P.cols, pins }, new Map())
const bad = [...new Set(lint.findings.filter((f) => f.sev === 'error').map((f) => f.ball))]
console.log(JSON.stringify({ balls: lint.ports.map((p) => p.ball), bad, sum: summarize(lint), path: d.path, commit: d.commit }))
"""


def font(size, bold=False):
    for path, index in (("/System/Library/Fonts/Menlo.ttc", 1 if bold else 0),
                        ("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else
                         "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 0)):
        if os.path.exists(path):
            return ImageFont.truetype(path, size * S, index=index)
    return ImageFont.load_default()


def hex_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def css_vars():
    return {k: v for k, v in re.findall(r"--(pm-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})", open(CSS).read())}


def ball_sprite(rgb, r, lit=False):
    """A shaded solder ball: lambert from the top left, a specular spot, a dark rim."""
    n = 2 * r + 2
    y, x = np.mgrid[0:n, 0:n].astype(np.float32)
    dx, dy = (x - r - 0.5) / r, (y - r - 0.5) / r
    d2 = dx * dx + dy * dy
    inside = d2 <= 1.0
    z = np.sqrt(np.clip(1.0 - d2, 0, 1))
    lx, ly, lz = -0.45, -0.55, 0.70
    lam = np.clip(dx * lx + dy * ly + z * lz, 0, 1)
    spec = np.clip(lam, 0, 1) ** (18 if not lit else 10)
    base = np.array(rgb, np.float32) / 255.0
    amb = 0.30 if not lit else 0.55
    col = base[None, None, :] * (amb + (1 - amb) * lam[..., None]) + spec[..., None] * (0.55 if not lit else 0.8)
    rim = np.clip((d2 - 0.82) / 0.18, 0, 1)[..., None]
    col = col * (1 - 0.45 * rim)
    alpha = np.clip((1.0 - d2) * r * 1.2, 0, 1) * inside
    out = np.dstack([np.clip(col, 0, 1) * 255, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def mute(rgb, k=0.74):
    """Bank colours a little darker and greyer, so the lit balls own the card."""
    g = sum(rgb) / 3
    return tuple(int((c * 0.75 + g * 0.25) * k) for c in rgb)


def main():
    P = json.load(open(PINS))
    lint = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", LINT_JS, DEMO], cwd=SITE, text=True))
    rows, cols = P["rows"], P["cols"]
    listed = {p[0]: p for p in P["pins"]}
    balls = rows and len(rows) * cols
    bad = set(lint["bad"])
    lit = [b for b in lint["balls"] if b not in bad]
    s = lint["sum"]

    alt = re.search(r'pub const IMAGE_ALT : str = "(.*)";', open(SPEC).read()).group(1)
    need = [f"{balls} balls", f"{len(rows)} by {cols} grid", f"places {s['ports']} ports",
            f"{len(lit)} balls glow green", f"{len(bad)} glow red"]
    missing = [n for n in need if n not in alt]
    if missing or s["ok"] != len(lit) or s["flaggedBalls"] != len(bad):
        sys.exit(f"pin-map-card: IMAGE_ALT in {SPEC} does not say {missing}; run pin-map.mjs and update it first")

    v = css_vars()
    bank_rgb = {int(k.split("-")[-1]): hex_rgb(c) for k, c in v.items() if k.startswith("pm-bank-")}
    unlisted_rgb = hex_rgb(v["pm-type-unlisted"])
    substrate, edge = hex_rgb(v["pm-substrate"]), hex_rgb(v["pm-substrate-edge"])
    for b in P["banks"]:
        if b["id"] not in bank_rgb:
            sys.exit(f"pin-map-card: tool.css has no --pm-bank-{b['id']}")

    img = Image.new("RGB", (W * S, H * S), BLACK)
    g = ImageDraw.Draw(img)

    # Faint board traces behind everything.
    for i in range(0, W * S, 40 * S):
        g.line([(i, 0), (i, H * S)], fill=(0, 22, 14), width=1)
    for j in range(0, H * S, 40 * S):
        g.line([(0, j), (W * S, j)], fill=(0, 22, 14), width=1)

    pitch, r = 21 * S, 8 * S
    side = cols * pitch
    x0, y0 = 46 * S, (H * S - side) // 2
    pad = 14 * S
    # Substrate with a soft shadow, an edge, and the A1 chamfer in gold.
    shadow = Image.new("L", img.size, 0)
    ImageDraw.Draw(shadow).rounded_rectangle([x0 - pad + 8 * S, y0 - pad + 10 * S, x0 + side + pad + 8 * S, y0 + side + pad + 10 * S], radius=18 * S, fill=170)
    shadow = shadow.filter(ImageFilter.GaussianBlur(14 * S))
    img = Image.composite(Image.new("RGB", img.size, (0, 0, 0)), img, shadow)
    g = ImageDraw.Draw(img)
    g.rounded_rectangle([x0 - pad, y0 - pad, x0 + side + pad, y0 + side + pad], radius=18 * S, fill=substrate, outline=edge, width=3 * S)
    g.rounded_rectangle([x0 - pad + 8 * S, y0 - pad + 8 * S, x0 + side + pad - 8 * S, y0 + side + pad - 8 * S], radius=12 * S, outline=(18, 40, 32), width=1 * S)
    g.polygon([(x0 - pad, y0 - pad + 30 * S), (x0 - pad, y0 - pad + 12 * S), (x0 - pad + 12 * S, y0 - pad), (x0 - pad + 30 * S, y0 - pad)], fill=GOLD)
    g.text((x0 - pad + 4 * S, y0 - pad - 26 * S), "A1", font=font(16, True), fill=GOLD)

    sprites = {}

    def sprite(key, rgb, lit_=False):
        if key not in sprites:
            sprites[key] = ball_sprite(rgb, r, lit_)
        return sprites[key]

    # Balls prjxray-db does not list: drawn as smaller dark pads, not as anything they might be.
    small = ball_sprite(unlisted_rgb, int(r * 0.7))
    glow = Image.new("RGB", img.size, (0, 0, 0))
    gg = ImageDraw.Draw(glow)
    centres = {}
    for ri, row in enumerate(rows):
        for c in range(1, cols + 1):
            ball = f"{row}{c}"
            cx, cy = x0 + (c - 0.5) * pitch, y0 + (ri + 0.5) * pitch
            centres[ball] = (cx, cy)
            if ball in bad:
                spr, gc = sprite("bad", hex_rgb(RED), True), hex_rgb(RED)
            elif ball in lit:
                spr, gc = sprite("lit", hex_rgb(GREEN), True), hex_rgb(GREEN)
            elif ball in listed:
                bank = listed[ball][1]
                spr, gc = sprite(f"b{bank}", mute(bank_rgb[bank])), None
            else:
                spr, gc = small, None
            off = (spr.size[0]) // 2
            img.paste(spr, (int(cx - off), int(cy - off)), spr)
            if gc:
                gg.ellipse([cx - r * 1.9, cy - r * 1.9, cx + r * 1.9, cy + r * 1.9], fill=gc)
    glow = glow.filter(ImageFilter.GaussianBlur(9 * S))
    img = ImageChops.add(img, ImageChops.multiply(glow, Image.new("RGB", img.size, (150, 150, 150))))
    g = ImageDraw.Draw(img)

    # Right side: the words, every number from the data above.
    X = 664 * S
    g.polygon([(X, 50 * S), (X + 24 * S, 50 * S), (X + 12 * S, 70 * S)], fill=GREEN)
    g.text((X + 38 * S, 44 * S), BRAND, font=font(26, True), fill=GREEN)
    g.text((X, 100 * S), "Pin map", font=font(64, True), fill=GREEN)
    g.text((X, 182 * S), "XC7A200T, 676-ball package", font=font(26, True), fill=TEXT)
    g.text((X, 218 * S), f"{len(rows)} x {cols} = {balls} balls, {len(listed)} in prjxray-db", font=font(19), fill=MUTED)
    g.text((X, 244 * S), f"{len(P['banks'])} banks; {balls - len(listed)} power, ground, dedicated", font=font(19), fill=MUTED)

    g.rounded_rectangle([X - 4 * S, 290 * S, W * S - 40 * S, 500 * S], radius=14 * S, outline=(0, 90, 50), width=2 * S)
    g.text((X + 20 * S, 306 * S), f"Our Wukong XDC: {s['ports']} ports", font=font(24, True), fill=TEXT)
    g.text((X + 20 * S, 344 * S), str(len(lit)), font=font(66, True), fill=GREEN)
    g.text((X + 130 * S, 368 * S), "on user IO", font=font(24), fill=GREEN)
    g.text((X + 20 * S, 418 * S), str(len(bad)), font=font(66, True), fill=RED)
    g.text((X + 130 * S, 442 * S), "on balls with no user IO", font=font(24), fill=RED)

    # Bank chips, in the page's colours.
    bx, by = X - 4 * S, 526 * S
    for b in P["banks"]:
        lab = str(b["id"])
        g.ellipse([bx, by, bx + 14 * S, by + 14 * S], fill=bank_rgb[b["id"]])
        g.text((bx + 18 * S, by - 3 * S), lab, font=font(15), fill=SUBTLE)
        bx += (18 + 9 * len(lab) + 9) * S
    g.text((W * S - 40 * S, 580 * S), "Lint your XDC: t27.ai/widgets/pin-map/", font=font(20, True), fill=GREEN, anchor="ra")

    img = img.resize((W, H), Image.LANCZOS)
    img.save(OUT, optimize=True)
    print(f"pin-map-card: wrote {OUT} ({os.path.getsize(OUT)} bytes); {s['ports']} ports, {len(lit)} lit, {len(bad)} flagged, from {lint['path']} @ {lint['commit'][:9]}")


if __name__ == "__main__":
    main()
