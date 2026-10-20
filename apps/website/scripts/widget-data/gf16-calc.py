#!/usr/bin/env python3
# gf16-calc.py -- the 1200x630 share card for public/widgets/gf16-calc/.
# Every number on the card is read from the page the native widget.wasm (specs/widgets/gf16_calc.t27)
# writes for phi: widget-render.mjs loads it through the shared host protocol and prints the HTML,
# scrape() below only reads it. Nothing numeric is computed or typed here; only the layout words are.
# Run from apps/website: python3 scripts/widget-data/gf16-calc.py
import os
import re
import subprocess
from PIL import Image, ImageDraw, ImageFont

SITE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(SITE, "public", "widgets", "gf16-calc", "card.png")
BG, GREEN, GOLD, TEXT, MUTED, RED = "#000000", "#00ff88", "#ffd700", "#e8fff7", "#8fa9a0", "#ff4d6d"

RENDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "widget-render.mjs")


def scrape(html):
    """Read the numbers the card shows out of the page the native widget.wasm wrote (public/widgets/gf16-calc)."""
    txt = lambda s: re.sub(r"<[^>]+>", "", s).replace("\u2212", "-")   # the page prints a true minus; the card keeps the ASCII one
    card = lambda n: html.split("<section")[n]   # 1 the GF16 card, 2 the ternary card
    facts = dict(zip(*[iter([txt(m) for m in re.findall(r"<d[td][^>]*>(.*?)</d[td]>", card(1))])] * 2))
    hexs = re.search(r'g16-hex">0x([0-9A-F]+)<', html).group(1)
    s, e, m, bias = map(int, re.search(r"S(\d+) E(\d+) M(\d+), bias (\d+)", html).groups())
    glyph = {"T": -1, "0": 0, "1": 1}
    t = [glyph[c] for c in re.findall(r'class="g16-trit [^"]*"[^>]*>([T01])<', html)]
    ip = card(2).split('class="g16-point"')[0].count("g16-trit ")
    ok = re.search(r"(\d+) of (\d+) vectors", html)
    return {
        "input": facts["you typed"], "hex": "0x" + hexs, "bits": int(hexs, 16),
        "layout": {"s": s, "e": e, "m": m, "bits": s + e + m, "bias": bias},
        "decoded": facts["decoded, exactly"], "err": facts["error"], "rel": facts["relative error"],
        "exp": int(facts["exponent"].split(" ")[0]), "mant": int(facts["mantissa"].split(" ")[0]),
        "trits": t, "intTrits": ip, "tapprox": re.search(r"about ([-\d.e+]+)", html).group(1),
        "fracTrits": len(t) - ip, "ok": int(ok.group(1)), "n": int(ok.group(2)),
    }


def font(size, bold=False):
    home = os.environ.get("T27_FONT_DIR") or os.path.expanduser("~/Library/Fonts")
    for path in [os.path.join(home, "DejaVuSansMono-Bold.ttf" if bold else "DejaVuSansMono.ttf"),
                 "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf",
                 "/System/Library/Fonts/Menlo.ttc"]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main():
    run = subprocess.run(["node", RENDER, "gf16-calc"], cwd=SITE, capture_output=True, text=True)
    if run.returncode != 0:
        raise SystemExit(run.stderr)
    r = scrape(run.stdout)
    L = r["layout"]
    img = Image.new("RGB", (1200, 630), BG)
    d = ImageDraw.Draw(img)

    # Brand: a small point-down triangle and the name.
    d.polygon([(60, 52), (84, 52), (72, 72)], fill=GOLD)
    d.text((96, 46), "Trinity S³AI", font=font(26, True), fill=GOLD)
    d.text((1140, 50), "t27.ai/widgets/gf16-calc", font=font(20), fill=MUTED, anchor="ra")

    d.text((60, 104), "GF16 calculator", font=font(56, True), fill=TEXT)
    d.text((60, 174), f"phi = {r['input']}  ->  {r['hex']}", font=font(28), fill=MUTED)

    # Sixteen bits, coloured by field.
    nb = L["bits"]
    x0, x1, y0, h, gap = 60, 1140, 226, 88, 6
    w = (x1 - x0 - gap * (nb - 1)) / nb
    for j in range(nb):
        i = nb - 1 - j
        bit = (r["bits"] >> i) & 1
        col = GOLD if i == nb - 1 else GREEN if i >= L["m"] else TEXT
        bx = x0 + j * (w + gap)
        d.rounded_rectangle((bx, y0, bx + w, y0 + h), radius=8, outline=col, width=3,
                            fill="#14240f" if bit and col != TEXT else "#1c2422" if bit else None)
        d.text((bx + w / 2, y0 + h / 2), str(bit), font=font(44, True), fill=col if bit else MUTED, anchor="mm")
    # Field labels under the bits.
    spans = [("sign", 1, GOLD), (f"exponent {r['exp']} - {L['bias']}", L["e"], GREEN), (f"mantissa {r['mant']}/{2 ** L['m']}", L["m"], TEXT)]
    j = 0
    for name, width, col in spans:
        a = x0 + j * (w + gap)
        b = x0 + (j + width) * (w + gap) - gap
        d.line((a, y0 + h + 10, b, y0 + h + 10), fill=col, width=3)
        if width > 1:
            d.text(((a + b) / 2, y0 + h + 18), name, font=font(20, True), fill=col, anchor="ma")
        j += width

    d.text((60, 372), f"decoded  {r['decoded']}", font=font(34, True), fill="#ffffff")
    d.text((60, 418), f"error    {r['err']}   (relative {r['rel']})", font=font(24), fill=MUTED)

    # Balanced ternary of the same input.
    glyph = {-1: "T", 0: "0", 1: "1"}
    trits = r["trits"]
    s = "".join(glyph[t] for t in trits[: r["intTrits"]]) + "." + "".join(glyph[t] for t in trits[r["intTrits"]:])
    d.text((60, 470), "balanced ternary", font=font(22, True), fill=GOLD)
    tx = 60
    ty = 502
    for ch in s:
        col = GOLD if ch == "." else RED if ch == "T" else GREEN if ch == "1" else MUTED
        d.text((tx, ty), ch, font=font(40, True), fill=col)
        tx += 30
    d.text((tx + 20, ty + 10), f"~ {r['tapprox']}  ({r['fracTrits']} trits after the point)", font=font(22), fill=MUTED)

    d.text((60, 586), f"S{L['s']} E{L['e']} M{L['m']}, bias {L['bias']}  |  {r['ok']}/{r['n']} conformance vectors bit-exact  |  nothing leaves the page",
           font=font(20), fill=MUTED)
    img.save(OUT, optimize=True)
    size = os.path.getsize(OUT)
    assert size <= 1_000_000, size
    print(f"wrote {OUT} ({size} bytes)")


if __name__ == "__main__":
    main()
