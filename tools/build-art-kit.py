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


def banded(im, cuts, heights, width):
    """A sprite rebuilt from horizontal bands, each scaled to its own height: `cuts` are the rows
    where one band ends and the next begins, in the sprite's own pixels."""
    rows = [0, *cuts, im.height]
    out = Image.new('RGBA', (width, sum(heights)))
    y = 0
    for top, bottom, height in zip(rows, rows[1:], heights):
        out.paste(sized(im.crop((0, top, im.width, bottom)), width=width, height=height), (0, y))
        y += height
    return out


def tiled(im, box, width, height):
    """A part of a sprite that repeats end to end, scaled to the size of one repeat."""
    return sized(im.crop(box), width=width, height=height)


# --- Signs ----------------------------------------------------------------------------------------

SIGN = {'width': 186, 'frame': (16, 14), 'face': 38, 'legs': 22}


def sign(sheet, box):
    """One sign at the size the levels allow for it. Its frame keeps its thickness as far as there
    is room, and its dark face is pressed to the height of two lines. Returns the sprite and where
    the face is in it."""
    im = trim(sheet.crop(box))[0]
    data = np.asarray(im).astype(np.int32)
    solid = data[..., 3] > 128
    centre = data[im.height * 2 // 5, im.width // 2, :3]
    face = (np.abs(data[..., :3] - centre).sum(axis=2) < 30) & solid

    def run(counts, need, through):
        """The unbroken stretch through `through` where the count stays above `need`."""
        start = end = through
        while start > 0 and counts[start - 1] > need: start -= 1
        while end < len(counts) - 1 and counts[end + 1] > need: end += 1
        return np.arange(start, end + 1)

    rows = run(face.sum(axis=1), im.width * 0.4, im.height * 2 // 5)
    cols = run(face[rows[0]: rows[-1] + 1].sum(axis=0), len(rows) * 0.4, im.width // 2)
    wide = np.where(solid.sum(axis=1) > im.width * 0.6)[0]
    board = wide[-1] + 1                           # below this there are only legs
    scale = SIGN['width'] / im.width
    top = min(SIGN['frame'][0], round(rows[0] * scale))
    foot = min(SIGN['frame'][1], round((board - rows[-1] - 1) * scale))
    out = banded(im, [rows[0], rows[-1] + 1, board], [top, SIGN['face'], foot, SIGN['legs']], SIGN['width'])
    left, right = round(cols[0] * scale), round((cols[-1] + 1) * scale)
    return out, {'face': [left, top, right - left, SIGN['face']]}


def signs():
    sheet = matte(Image.open(SRC / 'signs.png'))
    boxes = [(470, 170, 1240, 690), (1310, 170, 2100, 690), (460, 770, 1240, 1280), (1310, 770, 2100, 1280)]
    frames, extra = {}, {}
    for world, box in enumerate(boxes):
        frames[f'sign_{world}'], extra[f'sign_{world}'] = sign(sheet, box)
    return frames, extra


# --- Level machinery ------------------------------------------------------------------------------

def level(im, keep=lambda r, g, b: (r > 190) & (g > 150) & (b < 120)):
    """A sprite drawn at a slant turned to lie flat, by the long axis of its main colour (yellow
    unless told otherwise)."""
    data = np.asarray(im).astype(np.float32)
    main = keep(data[..., 0], data[..., 1], data[..., 2]) & (data[..., 3] > 128)
    ys, xs = np.where(main)
    points = np.stack([xs - xs.mean(), ys - ys.mean()])
    values, vectors = np.linalg.eigh(np.cov(points))
    axis = vectors[:, np.argmax(values)]
    angle = np.degrees(np.arctan2(axis[1], axis[0]))
    return trim(im.rotate(angle, resample=Image.BICUBIC, expand=True))[0]


def mirrored_right(im, box, clear):
    """A sprite the same on both sides, whose right side lies partly under the logo: inside
    `clear` (the logo's box, in the sheet's pixels) it is replaced by its left side, mirrored."""
    data = np.asarray(im.crop(box)).copy()
    solid = data[..., 3] > 128
    cols = np.where(solid[: (clear[1] - box[1])].any(axis=0))[0]
    axis = cols[0] + cols[-1]                       # a column x mirrors to axis - x
    for y in range(max(0, clear[1] - box[1]), data.shape[0]):
        for x in range(max(0, clear[0] - box[0]), data.shape[1]):
            data[y, x] = data[y, axis - x] if 0 <= axis - x < clear[0] - box[0] else 0
    return Image.fromarray(data, 'RGBA')


def machinery():
    a = matte(Image.open(SRC / 'machinery-a.png'))
    b = matte(Image.open(SRC / 'machinery-b.png'), keep_marks=True)
    frames, extra = {}, {}

    # The press: the lower half of its head, and a rod that repeats up to the ceiling.
    head = trim(a.crop((100, 140, 630, 700)))[0]
    frames['press'] = sized(head.crop((0, head.height // 2, head.width, head.height)), width=102, height=50)
    rod = trim(a.crop((880, 130, 1070, 700)))[0]
    frames['rod'] = sized(rod.crop((0, 120, rod.width, 360)), width=34, height=48)
    frames['rod_foot'] = sized(rod.crop((0, rod.height - 110, rod.width, rod.height)), width=34, height=22)

    # The spring: its pad keeps its thickness and the coil is pressed under it.
    spring = trim(a.crop((1330, 260, 1830, 690)))[0]
    data = np.asarray(spring).astype(np.int32)
    pad = np.where(((data[..., 0] > 200) & (data[..., 1] > 150) & (data[..., 2] < 110) & (data[..., 3] > 128)).sum(axis=1) > 20)[0]
    under = int(pad[-1]) + 14
    frames['spring'] = banded(spring, [under], [9, 13], 48)
    frames['spring_down'] = banded(spring, [under], [9, 4], 48)

    # The conveyor: its row of chevrons, from one gap to another, repeats along the belt.
    belt = trim(a.crop((60, 940, 640, 1240)))[0]
    frames['belt'] = tiled(belt, (95, 0, 445, 205), 132, 16)
    # The speed strip: two ends, and one group of arrows that repeats between them.
    strip = trim(a.crop((630, 950, 1320, 1240)))[0]
    lane = (0, 0, strip.width, 132)
    frames['boost_left'] = sized(strip.crop((0, 0, 70, 132)), width=7, height=11)
    frames['boost'] = tiled(strip, (118, 0, 268, 132), 30, 11)
    frames['boost_right'] = sized(strip.crop((strip.width - 70, 0, strip.width, 132)), width=7, height=11)

    for name, box in (('orb_cyan', (1420, 910, 1800, 1290)), ('orb_purple', (2030, 910, 2420, 1290))):
        frames[name] = cut(a, box, width=20)

    # The gate: cap, a run of the shaft that repeats, and base.
    pillar = b.crop((160, 60, 680, 1390))
    gate = 44 / 378
    frames['gate_cap'] = sized(trim(pillar.crop((0, 0, 520, 200)))[0], width=round(431 * gate) + 1)
    frames['gate_shaft'] = sized(pillar.crop((234 - 160 - 4, 381 - 60, 612 - 160 + 4, 1001 - 60)), width=45, height=72)
    frames['gate_base'] = sized(trim(pillar.crop((0, 1080, 520, 1330)))[0], width=round(482 * gate) + 1)

    # The keyword tag, turned to lie flat with its string to the left: its two ends, and a plain
    # run between them that stretches to the length of the word.
    tag = level(trim(b.crop((700, 50, 1320, 630)))[0])
    yellow = np.asarray(tag).astype(np.int32)
    body = np.where(((yellow[..., 0] > 190) & (yellow[..., 1] > 150) & (yellow[..., 2] < 120)).sum(axis=0) > tag.height * 0.3)[0]
    if body.mean() < tag.width / 2:                # the string is on the right: turn it round
        tag = tag.transpose(Image.FLIP_LEFT_RIGHT)
    small = sized(tag, height=26)
    frames['tag_left'] = small.crop((0, 0, small.width - 22, 26))
    frames['tag_mid'] = small.crop((small.width - 22, 0, small.width - 18, 26))
    frames['tag_right'] = small.crop((small.width - 8, 0, small.width, 26))

    frames['bell'] = cut(b, (1450, 40, 2040, 640), width=30)
    frames['padlock'] = cut(b, (790, 740, 1250, 1380), width=28)
    logo = marks(b)[1]
    frames['warning'] = sized(trim(mirrored_right(b, (1450, 780, 2110, 1420), logo))[0], width=38)
    return frames, extra


# --- Pickups and the title screen -----------------------------------------------------------------

def pickups():
    sheet = matte(Image.open(SRC / 'pickups.png'))
    frames = {
        'pickup_gpt': cut(sheet, (230, 120, 1030, 790), width=40),
        'pickup_cld': cut(sheet, (1280, 120, 2084, 790), width=40),
        'pickup_cof': cut(sheet, (170, 880, 950, 1620), width=36),
        'pickup_zip': cut(sheet, (1280, 940, 2084, 1728), width=38),
    }
    # Each card has a blank label, where the game writes the three letters it is known by.
    extra = {name: {'label': [frames[name].width // 2, round(frames[name].height * 0.69)]} for name in ('pickup_gpt', 'pickup_cld')}
    return frames, extra


def title_hero():
    hero = trim(matte(Image.open(SRC / 'title-hero.png')))[0]
    # Few colours, as pixel art has: the picture stays sharp when the page enlarges it.
    small = sized(hero, height=480).quantize(96, method=Image.FASTOCTREE, dither=Image.NONE).convert('RGBA')
    small.save(TITLE_HERO, 'WEBP', lossless=True, method=6)


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
    petal = (r > 140) & (r > g + 36) & (b > g + 24) & (b < r + 12)     # the pinks `blossom` lays down
    # A column's canopy begins where leaves carry on for a while, so one stray pixel starts nothing.
    found = (leaf | petal).astype(np.int32)
    ahead = np.cumsum(np.concatenate([found, np.zeros((16, found.shape[1]), np.int32)]), axis=0)
    steady = ((ahead[16:] - ahead[:-16] + found) >= 14) & (found > 0)
    first = np.where(steady.any(axis=0), steady.argmax(axis=0), len(steady))
    # No column starts higher than its neighbours do: a spike one pixel wide is not a tree.
    near = np.pad(first, 4, mode='edge')
    first = np.maximum(first, np.median(np.stack([near[i: i + len(first)] for i in range(9)]), axis=0).astype(int))
    canopy = np.arange(len(steady))[:, None] >= first[None]
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
    # The dark line round each arch picks up the red of the ground. It goes back to the stone's
    # own dark violet.
    data = np.asarray(near).copy()
    r, g, b = (data[..., c].astype(np.int32) for c in range(3))
    data[(data[..., 3] > 0) & (g < 45) & (r > b) & (r > 60)] = (62, 26, 98, 255)
    near = Image.fromarray(data, 'RGBA')
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
    for more in (signs(), machinery(), pickups()):
        frames.update(more[0])
        extra.update(more[1])
    title_hero()
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
