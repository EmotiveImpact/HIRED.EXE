#!/usr/bin/env python3
"""Cut the portrait beside the hearts from the painted afro hero sheet, so the face in the corner
is the man on the screen.

Source: the first standing pose of assets/source/characters/afro/hero-sheet-afro.webp (see
tools/cut-hero-sheet.py). The earlier portrait, a crop of the short-haired concept, is kept as
assets/source/characters/portrait-reference-v1.png.

Writes assets/production/characters/portrait-reference.png. Run tools/build.py afterwards.
"""
import importlib.util
from pathlib import Path

from PIL import Image
from PIL import ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/production/characters/portrait-reference.png'
SIZE = 160           # square; the game shows it at 30 to 53 pixels
HEAD = 0.5           # how much of the standing pose, from the top, is hair, face and beard
SKY = [(52, 136, 228), (104, 184, 250)]  # the old portrait's blue, top to bottom

spec = importlib.util.spec_from_file_location('cut_hero_sheet', ROOT / 'tools/cut-hero-sheet.py')
sheet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sheet)


def main():
    pose = sheet.figures(Image.open(sheet.SHEET))['idle_0']
    side = round(pose.height * HEAD)
    # Square on the head: the afro is the widest thing in the top half, so centre on it.
    alpha = pose.crop((0, 0, pose.width, side)).split()[3]
    left, _, right, _ = alpha.getbbox()
    cx = (left + right) // 2
    head = pose.crop((cx - side // 2, 0, cx - side // 2 + side, side))
    back = Image.new('RGB', (side, side))
    draw = ImageDraw.Draw(back)
    for y in range(side):
        t = y / (side - 1)
        draw.line([(0, y), (side, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(*SKY)))
    # A little air around the hair, then down to size in whole blocks so the pixels stay square.
    pad = round(side * 0.06)
    canvas = Image.new('RGB', (side + 2 * pad, side + 2 * pad))
    canvas.paste(back.resize(canvas.size))
    canvas.paste(head, (pad, 2 * pad), head)
    canvas.resize((SIZE, SIZE), Image.BOX).quantize(48, dither=Image.Dither.NONE).convert('RGB').save(OUT, optimize=True)
    print('wrote', OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
