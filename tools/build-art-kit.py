"""Turn the generated scenery layers and sprite sheets into what the game loads.

Sources live in assets/source/kit/ and are never edited. Sprite sheets and cut-out layers are
drawn on one flat key colour (green, magenta or red, whichever the art itself does not use), and
every source carries the generator's marks in two corners, which are cut away here.

Outputs:
  assets/production/environment/kit-atlas.png/.json   every small sprite, cut out at the size the
                                                      game draws it, plus where the scenery lives
  assets/production/backgrounds/<world>-<layer>.webp  the layers of a world painted in layers
  assets/production/characters/title-hero.webp        the hero on the title screen

Then run tools/build.py, which copies the atlas's JSON into src/assets.js.

Usage: python3 tools/build-art-kit.py
Requires Pillow and NumPy, used for build tooling only.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/source/kit'
BACKGROUNDS = ROOT / 'assets/production/backgrounds'
ATLAS = ROOT / 'assets/production/environment/kit-atlas'
TITLE_HERO = ROOT / 'assets/production/characters/title-hero.webp'
SCREEN = (960, 540)
# The generator's marks, as fractions of the picture: a badge top left, a logo bottom right.
MARKS = [(0, 0, 0.10, 0.07), (0.80, 0.93, 1, 1)]


def matte(im, sample=(0.4, 0.0, 0.6, 0.03)):
    """Colour and alpha for a picture on a flat key colour, with the corner marks cleared.

    `sample` is a part of the picture that is always bare ground, as fractions.
    """
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    height, width = rgb.shape[:2]
    x0, y0, x1, y1 = sample
    patch = rgb[int(y0 * height): max(int(y1 * height), int(y0 * height) + 4), int(x0 * width): int(x1 * width)]
    key = np.median(patch.reshape(-1, 3), axis=0)
    distance = np.sqrt(((rgb - key) ** 2).sum(axis=2))
    alpha = np.clip((distance - 60) / 70, 0, 1)
    for mx0, my0, mx1, my1 in MARKS:
        alpha[int(my0 * height): int(my1 * height), int(mx0 * width): int(mx1 * width)] = 0
    # Take the key colour's cast out of soft edges, so no coloured fringe is left round a sprite.
    lead = int(np.argmax(key))
    others = [c for c in range(3) if c != lead] if key[lead] > 180 and sorted(key)[1] < 110 else None
    if others is None:
        # Magenta: red and blue lead together, so hold them down to green's level plus a little.
        if key[0] > 180 and key[2] > 180 and key[1] < 110:
            edge = (alpha > 0) & (alpha < 1)
            limit = rgb[..., 1] + 40
            for c in (0, 2):
                rgb[..., c] = np.where(edge & (rgb[..., c] > limit), limit, rgb[..., c])
    else:
        edge = (alpha > 0) & (alpha < 1)
        limit = np.maximum(rgb[..., others[0]], rgb[..., others[1]]) + 10
        rgb[..., lead] = np.where(edge & (rgb[..., lead] > limit), limit, rgb[..., lead])
    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def trim(im):
    """The picture cut down to what is not clear, and the box that was kept."""
    alpha = np.asarray(im)[..., 3] > 40
    rows, cols = np.where(alpha.any(axis=1))[0], np.where(alpha.any(axis=0))[0]
    box = (int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1)
    return im.crop(box), box


def part(im, box):
    """A part of a picture given as fractions (left, top, right, bottom)."""
    width, height = im.size
    x0, y0, x1, y1 = box
    return im.crop((int(x0 * width), int(y0 * height), int(x1 * width), int(y1 * height)))


def sized(im, width=None, height=None):
    """Scaled to a width or a height in game pixels, keeping its shape, with hard-edged alpha."""
    if width is None:
        width = max(1, round(im.width * height / im.height))
    elif height is None:
        height = max(1, round(im.height * width / im.width))
    # Scale colour with alpha taken into account, so clear pixels do not darken the edges.
    data = np.asarray(im).astype(np.float32)
    data[..., :3] *= data[..., 3:] / 255
    small = np.asarray(Image.fromarray(data.clip(0, 255).astype(np.uint8), 'RGBA').resize((width, height), Image.LANCZOS)).astype(np.float32)
    alpha = small[..., 3:]
    small[..., :3] = np.where(alpha > 0, small[..., :3] * 255 / np.maximum(alpha, 1), 0)
    small[..., 3] = np.where(small[..., 3] > 110, 255, 0)
    return Image.fromarray(small.clip(0, 255).astype(np.uint8), 'RGBA')
