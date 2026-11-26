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
ATLAS_WIDTH = 512


def marks(im):
    """Where the generator's marks sit, in pixels: a badge top left and a logo bottom right."""
    width, height = im.size
    return [(0, 0, 150, 130), (width - 672, height - 142, width, height)]


def matte(im, sample=(0.4, 0.0, 0.6, 0.03), keep_marks=False):
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
    if not keep_marks:
        for mx0, my0, mx1, my1 in marks(im):
            alpha[my0:my1, mx0:mx1] = 0
    # Take the key colour's cast out of soft edges, so no coloured fringe is left round a sprite.
    edge = (alpha > 0) & (alpha < 1)
    low, mid, high = np.argsort(key)
    if key[high] > 180 and key[mid] < 110:
        # One colour leads (green or red): hold it down to the stronger of the other two.
        limit = np.maximum(rgb[..., low], rgb[..., mid]) + 10
        rgb[..., high] = np.where(edge & (rgb[..., high] > limit), limit, rgb[..., high])
    elif key[mid] > 120 and key[low] < 110:
        # Two lead together (magenta, pink): hold both down to the third, plus a little.
        limit = rgb[..., low] + 40
        for c in (mid, high):
            rgb[..., c] = np.where(edge & (rgb[..., c] > limit), limit, rgb[..., c])
    out = np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def unmarked(im, feather=48):
    """A full picture with both marks painted out, each with the same place on the other side of
    the picture, mirrored. Good for skies and treetops, where one side looks much like the other."""
    data = np.asarray(im.convert('RGBA')).astype(np.float32)
    mirror = data[:, ::-1]
    height, width = data.shape[:2]
    for x0, y0, x1, y1 in marks(im):
        x0, y0, x1, y1 = max(0, x0 - feather), max(0, y0 - feather), min(width, x1 + feather), min(height, y1 + feather)
        ys, xs = np.mgrid[y0:y1, x0:x1]
        # How far inside the box a pixel is, counted from the sides that are not the picture's edge.
        inside = np.full(ys.shape, float(feather))
        if x0 > 0: inside = np.minimum(inside, xs - x0)
        if x1 < width: inside = np.minimum(inside, x1 - 1 - xs)
        if y0 > 0: inside = np.minimum(inside, ys - y0)
        if y1 < height: inside = np.minimum(inside, y1 - 1 - ys)
        mix = np.clip(inside / feather, 0, 1)[..., None]
        data[y0:y1, x0:x1] = data[y0:y1, x0:x1] * (1 - mix) + mirror[y0:y1, x0:x1] * mix
    return Image.fromarray(data.clip(0, 255).astype(np.uint8), 'RGBA')


def trim(im):
    """The picture cut down to what is not clear, and the box that was kept."""
    alpha = np.asarray(im)[..., 3] > 40
    rows, cols = np.where(alpha.any(axis=1))[0], np.where(alpha.any(axis=0))[0]
    box = (int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1)
    return im.crop(box), box


def sized(im, width=None, height=None):
    """Scaled to a width or a height in game pixels, keeping its shape, with hard-edged alpha."""
    if width is None:
        width = max(1, round(im.width * height / im.height))
    elif height is None:
        height = max(1, round(im.height * width / im.width))
    # Scale colour with alpha taken into account, so clear pixels do not darken the edges.
    data = np.asarray(im.convert('RGBA')).astype(np.float32)
    data[..., :3] *= data[..., 3:] / 255
    small = np.asarray(Image.fromarray(data.clip(0, 255).astype(np.uint8), 'RGBA').resize((width, height), Image.LANCZOS)).astype(np.float32)
    alpha = small[..., 3:]
    small[..., :3] = np.where(alpha > 0, small[..., :3] * 255 / np.maximum(alpha, 1), 0)
    small[..., 3] = np.where(small[..., 3] > 110, 255, 0)
    small[..., :3] *= small[..., 3:] / 255
    return Image.fromarray(small.clip(0, 255).astype(np.uint8), 'RGBA')


def cut(sheet, box, **size):
    """One sprite from a matted sheet: a box in the sheet's pixels, trimmed and scaled."""
    return sized(trim(sheet.crop(box))[0], **size)


# --- Application Alley's sky traffic -------------------------------------------------------------

def balloon(sheet, box):
    """The balloon, whose basket lies half under the generator's logo. The clean left side of the
    basket is run out to the right, row by row, and closed with the same outline."""
    data = np.asarray(sheet.crop(box)).copy()
    solid = data[..., 3] > 128
    cols = np.where(solid[: data.shape[0] // 2].any(axis=0))[0]
    axis = (cols[0] + cols[-1] + 1) // 2
    logo = marks(sheet)[1]
    clean = logo[0] - box[0]                       # columns left of this are untouched
    for y in range(max(0, logo[1] - box[1]), data.shape[0]):
        run = np.where(solid[y, :clean])[0]
        if not len(run):
            continue
        left = run[0]
        right = 2 * axis - left
        outline = data[y, left: min(left + 12, clean)].copy()
        fill = data[y, clean - 6: clean].copy()
        for x in range(clean, right):
            data[y, x] = fill[(x - clean) % len(fill)]
        data[y, right - len(outline): right] = outline[::-1]
        data[y, right:, 3] = 0
    # Whatever else stands in the logo's box is the logo.
    rows = np.arange(data.shape[0])[:, None] >= logo[1] - box[1]
    left_clear = ~solid[:, :clean].any(axis=1)[:, None]
    data[..., 3] = np.where(rows & left_clear & (np.arange(data.shape[1])[None] >= clean), 0, data[..., 3])
    return Image.fromarray(data, 'RGBA')


def cloth(sheet, box, height):
    """The banner's cloth pulled straight and stripped of its ropes and stitching, as a short
    piece: two ends and a plain middle that the game runs out to the length of its line.

    The art's cloth sags and its stitches are not evenly spaced, so the game ripples the cloth
    and sews the hem itself.
    """
    data = np.asarray(sheet.crop(box)).astype(np.float32)
    r, g, b, a = (data[..., c] for c in range(4))
    cream = (r > 215) & (g > 195) & (b > 140) & (a > 128)
    tall = cream.sum(axis=0)
    good = np.where(tall > 0.8 * np.median(tall[tall > 0]))[0]
    x0, x1 = good[0], good[-1] + 1
    top = np.array([np.where(cream[:, x])[0][0] for x in range(x0, x1)])
    bottom = np.array([np.where(cream[:, x])[0][-1] for x in range(x0, x1)])
    smooth = lambda v: np.array([np.median(v[max(0, i - 20): i + 21]) for i in range(len(v))])
    top, bottom = smooth(top), smooth(bottom)
    # Stitches become cloth: each takes the usual colour of the cloth in its column.
    red = (r > 150) & (g < 140) & (b < 140) & (r > g + 60)
    grown = red.copy()
    for dy, dx in ((0, 1), (1, 0), (0, -1), (-1, 0)):
        for step in (2, 4):
            grown |= np.roll(red, (dy * step, dx * step), axis=(0, 1))
    solid = a > 128
    rim = int(np.median([top[i] - np.where(solid[: int(top[i]), x])[0][0] for i, x in enumerate(range(x0, x1)) if solid[: int(top[i]), x].any()]))
    tall_out = 240
    out = np.zeros((tall_out, x1 - x0, 4), np.float32)
    for i, x in enumerate(range(x0, x1)):
        column = data[:, x].copy()
        plain = np.median(column[cream[:, x] & ~grown[:, x]], axis=0)
        column[grown[:, x] & (np.arange(len(column)) > top[i]) & (np.arange(len(column)) < bottom[i])] = plain
        rows = np.linspace(top[i] - rim, bottom[i] + rim, tall_out).round().astype(int).clip(0, len(column) - 1)
        out[:, i] = column[rows]
    out[..., 3] = 255
    ink = np.median(out[:4].reshape(-1, 4), axis=0)
    edge = np.tile(ink, (tall_out, rim, 1))
    straight = Image.fromarray(np.concatenate([edge, out, edge], axis=1).clip(0, 255).astype(np.uint8), 'RGBA')
    small = sized(straight, height=height)
    end, middle = 8, 8
    centre = small.width // 2
    piece = Image.new('RGBA', (end * 2 + middle, height))
    piece.paste(small.crop((0, 0, end, height)), (0, 0))
    piece.paste(small.crop((centre - middle // 2, 0, centre + middle // 2, height)), (end, 0))
    piece.paste(small.crop((small.width - end, 0, small.width, height)), (end + middle, 0))
    return piece, {'left': end, 'right': end, 'tow': height // 2, 'line': height // 2, 'hem': 4}


def alley_traffic():
    sheet = matte(Image.open(SRC / 'alley-movers.png'), keep_marks=True)
    logo = marks(sheet)[1]
    plane = cut(sheet, (240, 90, 910, 560), width=76)
    banner, banner_meta = cloth(sheet, (1150, 110, 2290, 560), 28)
    basket = balloon(sheet, (1730, 850, 2130, 1420))
    # One gull, wings up; for the second beat of its wings the upper half is pressed flat.
    gull = cut(sheet, (390, 910, 810, 1225), width=26)
    body = gull.height * 11 // 19
    glide = Image.new('RGBA', gull.size)
    glide.paste(sized(gull.crop((0, 0, gull.width, body)), width=gull.width, height=body // 2), (0, body - body // 2))
    glide.alpha_composite(gull.crop((0, body, gull.width, gull.height)), (0, body))
    frames = {
        'plane': plane,
        'banner': banner,
        'train': cut(sheet, (300, 600, 2310, 846), height=36),
        'gull_0': gull,
        'gull_1': glide,
        'balloon': sized(trim(basket)[0], width=40),
    }
    # The tow rope leaves the plane at its tail, halfway down the fin's root.
    tail = np.where(np.asarray(plane)[..., 3][:, :6].any(axis=1))[0]
    extra = {'plane': {'tow': int(tail.mean())}}
    return frames, extra, banner_meta


# --- Layers ---------------------------------------------------------------------------------------

def layer(im, scale, top, haze=None, haze_from=None):
    """A cut-out layer as the game draws it: scaled, and set `top` pixels down a strip as tall as
    the screen. `haze` is a colour the layer melts into below `haze_from`, to the foot of the strip."""
    small = sized(im, width=round(im.width * scale))
    strip = Image.new('RGBA', (small.width, SCREEN[1]))
    strip.paste(small, (0, top))
    if haze:
        data = np.asarray(strip).astype(np.float32)
        ys = np.arange(SCREEN[1], dtype=np.float32)[:, None]
        mix = np.clip((ys - haze_from[0]) / (haze_from[1] - haze_from[0]), 0, 1)[..., None]
        seen = data[..., 3:] > 0
        colour = np.array(haze, np.float32)
        data[..., :3] = np.where(seen, data[..., :3] * (1 - mix) + colour * mix, colour)
        data[..., 3] = np.where((seen[..., 0]) | (ys >= haze_from[1]), 255, 0)
        strip = Image.fromarray(data.clip(0, 255).astype(np.uint8), 'RGBA')
    return strip


def blossom(im, rows, lift):
    """Flat pink treetops given leaves: each pink pixel takes the light and shade of the green
    canopy `lift` pixels below it, in pinks."""
    data = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = (data[..., c] for c in range(3))
    pink = (r > 200) & (b > 200) & (g > 100) & (g < 200)
    pink[: rows[0]] = False
    pink[rows[1]:] = False
    below = np.roll(data, -lift, axis=0)
    light = np.clip((below @ np.array([0.3, 0.59, 0.11], np.float32) - 80) / 130, 0, 1)[..., None]
    ramp = [np.array(c, np.float32) for c in ((150, 62, 150), (236, 124, 214), (255, 214, 244))]
    shade = np.where(light < 0.5, ramp[0] + (ramp[1] - ramp[0]) * light * 2, ramp[1] + (ramp[2] - ramp[1]) * (light * 2 - 1))
    data = np.where(pink[..., None], shade, data)
    return Image.fromarray(data.clip(0, 255).astype(np.uint8), 'RGB')


def treetops(im, start):
    """The canopy on its own, from row `start` down: everything from the first leaf in each column
    to the foot of the picture. What stands behind the trees there is neither green nor pink."""
    data = np.asarray(im.convert('RGB'))[start:].astype(np.int32)
    r, g, b = (data[..., c] for c in range(3))
    leaf = (g > r + 12) & (g > b - 40) | (g > r + 40)                  # greens and the teal shade
    petal = (r > g + 36) & (b > g + 24) & (b < r + 12)                 # the pinks `blossom` lays down
    canopy = np.maximum.accumulate(leaf | petal, axis=0)
    out = np.dstack([data, np.where(canopy, 255, 0)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def without_rows(im, start, end):
    """A picture with a band of rows taken out and the rest closed up."""
    data = np.asarray(im)
    return Image.fromarray(np.concatenate([data[:start], data[end:]]), im.mode)


def alley_layers():
    sky = unmarked(Image.open(SRC / 'alley-sky.png')).convert('RGB').resize(SCREEN, Image.LANCZOS)
    far = matte(Image.open(SRC / 'alley-far.png'))
    whole = blossom(unmarked(Image.open(SRC / 'alley-near.png')), (900, 1180), 240)
    # The viaduct's deck is drawn very deep: a plain band comes out of it.
    near = matte(without_rows(whole, 664, 752), keep_marks=True)
    # The same canopy again, larger and nearer, in front of the viaduct's feet.
    trees = treetops(whole, 960)
    out = {
        'sky': (sky, {'speed': 0.02, 'drift': 3}),
        'far': (layer(far, 0.375, -125, haze=(176, 196, 240), haze_from=(255, 345)), {'speed': 0.07}),
        'near': (layer(near, 0.3, 134), {'speed': 0.18}),
        'trees': (layer(trees, 0.36, 367), {'speed': 0.3}),
    }
    scene = {'layers': [], 'behind': 2, 'rail': 308, 'balloon': [260, 104], 'gulls': 150}
    for name, (im, how) in out.items():
        path = BACKGROUNDS / f'application-alley-{name}.webp'
        if im.mode == 'RGB':
            im.save(path, 'WEBP', quality=90, method=6)
        else:
            im.save(path, 'WEBP', lossless=True, method=6)
        scene['layers'].append({'image': str(path.relative_to(ROOT)), **how})
    return scene


# --- The atlas ------------------------------------------------------------------------------------

def pack(frames, extra):
    """Every sprite on one sheet, tallest first along shelves, with a clear pixel between them."""
    order = sorted(frames, key=lambda name: (-frames[name].height, name))
    x = y = shelf = 0
    places = {}
    for name in order:
        im = frames[name]
        if x + im.width > ATLAS_WIDTH:
            x, y, shelf = 0, y + shelf + 1, 0
        places[name] = (x, y)
        x += im.width + 1
        shelf = max(shelf, im.height)
    sheet = Image.new('RGBA', (ATLAS_WIDTH, y + shelf))
    meta = {}
    for name in sorted(frames):
        im = frames[name]
        sheet.paste(im, places[name])
        meta[name] = {'x': places[name][0], 'y': places[name][1], 'w': im.width, 'h': im.height, **extra.get(name, {})}
    return sheet, meta


def main():
    BACKGROUNDS.mkdir(parents=True, exist_ok=True)
    frames, extra, banner = alley_traffic()
    scenery = {'0': alley_layers()}
    sheet, meta = pack(frames, extra)
    sheet.save(ATLAS.with_suffix('.png'), optimize=True)
    ATLAS.with_suffix('.json').write_text(json.dumps({
        'image': str(ATLAS.with_suffix('.png').relative_to(ROOT)),
        'size': list(sheet.size),
        'frames': meta,
        'banner': banner,
        'scenery': scenery,
    }, indent=2) + '\n')
    print(f'kit atlas {sheet.size[0]} x {sheet.size[1]}, {len(meta)} sprites; scenery for worlds {", ".join(scenery)}')


if __name__ == '__main__':
    main()
