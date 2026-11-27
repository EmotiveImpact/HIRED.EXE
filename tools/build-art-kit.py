"""Turn the generated scenery layers and sprite sheets into what the game loads.

Sources live in assets/source/kit/ and are never edited. Sprite sheets and cut-out layers are
drawn on one flat key colour (green, magenta or red, whichever the art itself does not use). Most
sources carry the generator's marks in two corners, which are cut away here.

Outputs:
  assets/production/environment/kit-atlas.png/.json   every small sprite, cut out at the size the
                                                      game draws it, plus where the scenery lives
  assets/production/backgrounds/<world>-<layer>.webp  the layers of a world painted in layers
  assets/production/characters/title-hero.webp        the hero on the title screen, by way of
                                                      tools/repaint-hero.py (afro and hoodie)

Then run tools/build.py, which copies the atlas's JSON into src/assets.js.

Usage: python3 tools/build-art-kit.py
Requires Pillow and NumPy, used for build tooling only.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/source/kit'
BACKGROUNDS = ROOT / 'assets/production/backgrounds'
ATLAS = ROOT / 'assets/production/environment/kit-atlas'
TITLE_HERO = ROOT / 'assets/source/characters/title-hero-v1.webp'  # repaint-hero.py finishes it
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


def unmarked(im, feather=48, also=()):
    """A full picture with both marks painted out, each with the same place on the other side of
    the picture, mirrored. Good for skies and treetops, where one side looks much like the other.
    `also` names more boxes to paint out the same way."""
    data = np.asarray(im.convert('RGBA')).astype(np.float32)
    mirror = data[:, ::-1]
    height, width = data.shape[:2]
    for x0, y0, x1, y1 in [*marks(im), *also]:
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


def crisp(im, height, colours=28, outline=(46, 30, 78)):
    """A large sprite brought down to game pixels so it stays sharp: averaged rather than
    resampled, sharpened, held to a small palette and ringed with a dark violet outline, which also
    hides any trace of the key colour round its edge. It comes out two pixels taller than asked."""
    im = trim(im)[0]
    width = max(1, round(im.width * height / im.height))
    data = np.asarray(im.convert('RGBA')).astype(np.float32)
    data[..., :3] *= data[..., 3:] / 255
    small = np.asarray(Image.fromarray(data.clip(0, 255).astype(np.uint8), 'RGBA').resize((width, height), Image.BOX)).astype(np.float32)
    alpha = small[..., 3:]
    small[..., :3] = np.where(alpha > 0, small[..., :3] * 255 / np.maximum(alpha, 1), 0)
    rgb = Image.fromarray(small[..., :3].clip(0, 255).astype(np.uint8), 'RGB')
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=2))
    rgb = np.asarray(rgb.quantize(colors=colours, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB'))
    out = np.zeros((height + 2, width + 2, 4), np.uint8)
    out[1:-1, 1:-1, :3] = rgb
    out[1:-1, 1:-1, 3] = (small[..., 3] > 128) * 255
    solid = out[..., 3] > 0
    ring = ~solid & (np.roll(solid, 1, 0) | np.roll(solid, -1, 0) | np.roll(solid, 1, 1) | np.roll(solid, -1, 1))
    out[ring] = (*outline, 255)
    return Image.fromarray(out, 'RGBA')


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
    import subprocess, sys
    subprocess.run([sys.executable, str(ROOT / 'tools/repaint-hero.py')], check=True)


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
    sheet = dehaloed(matte(Image.open(SRC / 'alley-movers.png'), keep_marks=True))
    logo = marks(sheet)[1]
    plane = crisp(sheet.crop((240, 90, 910, 560)), 51, colours=64)
    banner, banner_meta = cloth(sheet, (1150, 110, 2290, 560), 28)
    basket = balloon(sheet, (1730, 850, 2130, 1420))
    # One gull, wings up; for the second beat of its wings the upper half is pressed flat.
    gull = crisp(sheet.crop((390, 910, 810, 1225)), 17, colours=64)
    body = gull.height * 11 // 19
    glide = Image.new('RGBA', gull.size)
    glide.paste(sized(gull.crop((0, 0, gull.width, body)), width=gull.width, height=body // 2), (0, body - body // 2))
    glide.alpha_composite(gull.crop((0, body, gull.width, gull.height)), (0, body))
    frames = {
        'plane': plane,
        'banner': banner,
        'gull_0': gull,
        'gull_1': glide,
        'balloon': crisp(basket, 56, colours=64),
    }
    # The tow rope leaves the plane at its tail, halfway down the fin's root.
    tail = np.where(np.asarray(plane)[..., 3][:, :6].any(axis=1))[0]
    extra = {'plane': {'tow': int(tail.mean())}}
    return frames, extra, banner_meta


# --- Layers ---------------------------------------------------------------------------------------

def stitched(names, joins, band=48):
    """Several pictures of one scene, each carrying on from the last, joined into one long picture.

    Each picture after the first was painted as the next stretch to the right of the one before,
    so the two share what crosses between them: the deck, the trees, the buildings under the
    bridge. `joins` gives, for each pair, the column in the left picture and the column in the
    right picture where they match best (found by comparing strips of the two); the pictures are
    cut there and cross-faded over `band` pixels."""
    pictures = [np.asarray(Image.open(SRC / name).convert('RGB')).astype(np.float32) for name in names]
    whole, half, start = pictures[0], band // 2, 0
    fade = np.linspace(0, 1, band)[None, :, None]
    for picture, (left, right) in zip(pictures[1:], joins):
        # `start` is where the last picture added begins in the joined one.
        cut = start + left
        mid = whole[:, cut - half:cut + half] * (1 - fade) + picture[:, right - half:right + half] * fade
        whole = np.concatenate([whole[:, :cut - half], mid, picture[:, right + half:]], axis=1)
        start = cut - right
    return Image.fromarray(whole.clip(0, 255).astype(np.uint8), 'RGB')


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


def spread(mask, size):
    """A mask grown by `size` pixels each way, as a square."""
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (size + 1, size)
        total = np.cumsum(np.pad(mask, pad).astype(np.int32), axis=axis)
        lead = np.take(total, range(2 * size + 1, total.shape[axis]), axis=axis)
        mask = (lead - np.take(total, range(0, total.shape[axis] - 2 * size - 1), axis=axis)) > 0
    return mask


def front_bank(im, start, tree, crown=60, rim=20):
    """The front bank of trees lifted out of a painted picture, from row `start` down: whatever is
    tree-coloured, with the boughs and trunks it closes round. A tree has a crown at least twice
    `crown` pixels across; thin lines of the same colour on the buildings behind, and the scraps
    of far trees seen between them, do not, and are left out. `rim` is how far a crown's leaves
    may stick out from its round."""
    data = np.asarray(im.convert('RGB'))[start:]
    r, g, b = (data[..., c].astype(np.int32) for c in range(3))
    height, width = r.shape
    leaves = ~spread(~spread(tree(r, g, b), 4), 4)          # gaps between leaves close
    # Whatever cannot be reached from above without crossing leaves is inside a tree.
    reach = Image.new('L', (width, height + 1))
    reach.paste(Image.fromarray((leaves * 255).astype(np.uint8), 'L'), (0, 1))
    ImageDraw.floodfill(reach, (0, 0), 128)
    solid = np.asarray(reach)[1:] != 128
    crowns = spread(~spread(~solid, crown), crown)          # only what is as wide as a crown
    alpha = spread(crowns, rim) & solid
    return Image.fromarray(np.dstack([data, alpha * 255]).astype(np.uint8), 'RGBA')


def save_layers(world, layers, scene):
    """Write a world's layers and note them in its scene, back to front."""
    scene['layers'] = []
    for name, (im, how) in layers.items():
        path = BACKGROUNDS / f'{world}-{name}.webp'
        if im.mode == 'RGB':
            im.save(path, 'WEBP', quality=90, method=6)
        elif im.width > SCREEN[0]:
            # A long joined layer is several screens of painting: kept lossless it would weigh
            # over a megabyte, and at this quality the loss cannot be seen. Its edges stay exact.
            im.save(path, 'WEBP', quality=95, alpha_quality=100, method=6)
        else:
            im.save(path, 'WEBP', lossless=True, method=6)
        scene['layers'].append({'image': str(path.relative_to(ROOT)), **how})
    return scene


# The viaduct is three pictures, each painted as the next stretch to the right of the last and joined
# where they match (see `stitched`). The row of treetops in front is a picture of its own.
ALLEY_ART = {
    'near': ('alley-near-2.png', 'alley-near-3.png', 'alley-near-4.png'),
    'near_joins': ((1552, 472), (2520, 524)),
}
ALLEY = {'scale': 0.4, 'near': 40, 'trees': 100}


def open_ground(clear, least=600, step=4):
    """Where a picture on a red ground is open ground: the stretches of red that reach the top of the
    picture or are as big as the opening of an arch, with a few pixels round them for their soft
    edges. A red tree or roof makes patches of red too; those are small and closed in. Returns the
    open ground itself, and the same with its edges."""
    height, width = clear.shape
    rows, cols = height // step, width // step
    small = clear[:rows * step, :cols * step].reshape(rows, step, cols, step).all(axis=(1, 3))
    keep, todo = np.zeros_like(small), small.copy()
    while todo.any():
        y, x = np.argwhere(todo)[0]
        # A copy, so the fill is written to the picture that is read back.
        canvas = Image.fromarray(todo.astype(np.uint8) * 255, 'L').copy()
        ImageDraw.floodfill(canvas, (int(x), int(y)), 128)
        region = np.asarray(canvas) == 128
        # A half arch at either end is open ground too: the layer goes on, mirrored, past its ends.
        if region.sum() >= least or region[0].any() or region[:, 0].any() or region[:, -1].any():
            keep |= region
        todo &= ~region
    big = np.zeros_like(clear)
    big[:rows * step, :cols * step] = np.repeat(np.repeat(keep, step, axis=0), step, axis=1)
    return big, spread(big, step + 3)


def alley_layers():
    sky = unmarked(Image.open(SRC / 'alley-sky.png')).convert('RGB').resize(SCREEN, Image.LANCZOS)
    far = matte(Image.open(SRC / 'alley-far.png'))
    whole = stitched(ALLEY_ART['near'], ALLEY_ART['near_joins'])
    keyed = np.asarray(matte(whole, keep_marks=True)).copy()
    # Only open ground keys out: the red trees and terracotta roofs keep their own colour. Through
    # the wide arch the ground shows as a deeper red down the lane; that goes too.
    paint = np.asarray(whole).astype(np.int32)
    red = (paint[..., 0] > 205) & (paint[..., 1] < 70) & (paint[..., 2] < 70)
    core, ground = open_ground(red)
    keyed[~ground, :3] = paint[~ground]
    keyed[~ground, 3] = 255
    keyed[core & red, 3] = 0
    # Round each arch the dark line picks up the red of the ground. It goes back to the stone's own
    # dark violet.
    r, g, b = (keyed[..., c].astype(np.int32) for c in range(3))
    keyed[ground & (keyed[..., 3] > 0) & (g < 45) & (r > b) & (r > 60)] = (62, 26, 98, 255)
    near = Image.fromarray(keyed, 'RGBA')
    # A row of treetops close up, painted on its own, slides in front.
    trees = matte(Image.open(SRC / 'alley-trees-1.png'))
    scale = ALLEY['scale']
    return save_layers('application-alley', {
        'sky': (sky, {'speed': 0.02, 'drift': 3}),
        'far': (layer(far, 0.375, -125, haze=(176, 196, 240), haze_from=(255, 345)), {'speed': 0.07}),
        'near': (layer(near, scale, ALLEY['near']), {'speed': 0.18}),
        'trees': (layer(trees, 0.44, ALLEY['trees']), {'speed': 0.3}),
    }, {'behind': 2, 'float': {'sprite': 'balloon', 'at': [260, 104]},
        'flock': {'sprite': 'gull', 'count': 3, 'y': 150, 'beat': 4}})


# --- Ship It City ---------------------------------------------------------------------------------

def shaved(im, tinted, depth=8):
    """A cut-out with the ground's colour taken off its rim, a ring of pixels at a time."""
    data = np.asarray(im).copy()
    for _ in range(depth):
        solid = data[..., 3] > 0
        inside = solid.copy()
        for axis in (0, 1):
            for step in (1, -1):
                inside &= np.roll(solid, step, axis=axis)
        r, g, b = (data[..., c].astype(np.int32) for c in range(3))
        gone = solid & ~inside & tinted(r, g, b)
        if not gone.any():
            break
        data[gone, 3] = 0
    return Image.fromarray(data, 'RGBA')


def dehaloed(im, depth=8, light=150):
    """A cut-out with the pale rim taken off. The movers were painted with a dark outline and a thin
    white or cream line outside it, like a sticker's edge, which shows as a white ring once the
    ground is gone. Light pixels are peeled off the rim a ring at a time, which stops at the dark
    outline; where a sprite has no such rim nothing is taken."""
    data = np.asarray(im).copy()
    for _ in range(depth):
        solid = data[..., 3] > 0
        inside = solid.copy()
        for axis in (0, 1):
            for step in (1, -1):
                inside &= np.roll(solid, step, axis=axis)
        rgb = data[..., :3].astype(np.int32)
        level = (rgb[..., 0] * 3 + rgb[..., 1] * 6 + rgb[..., 2]) // 10
        gone = solid & ~inside & ((level > light) | (data[..., 3] < 200))
        if not gone.any():
            break
        data[gone, 3] = 0
    return Image.fromarray(data, 'RGBA')


def unpinked(im, lead=45):
    """The magenta ground's cast taken out of a cut-out: wherever red and blue both stand well clear
    of green (nothing painted in Ship It City is that colour), they are brought down to it."""
    data = np.asarray(im).astype(np.int32)
    r, g, b = data[..., 0], data[..., 1], data[..., 2]
    pink = (data[..., 3] > 0) & (r > g + lead) & (b > g + lead)
    level = g + lead // 2
    data[..., 0] = np.where(pink, np.minimum(r, level), r)
    data[..., 2] = np.where(pink, np.minimum(b, level + 10), b)
    return Image.fromarray(data.astype(np.uint8), 'RGBA')


def city_layers():
    """Ship It City's skyline, and its bridge, factories and trees, are each one painted picture
    on a flat ground. The front bank of trees is lifted out of the second to slide by itself."""
    # A scrap of a building is painted into the clouds on the right.
    sky = unmarked(Image.open(SRC / 'city-sky.png'), also=[(2290, 270, 2560, 470)]).convert('RGB').resize(SCREEN, Image.LANCZOS)
    far = matte(stitched(CITY_ART['far'], CITY_ART['far_joins']), keep_marks=True)
    whole = stitched(CITY_ART['near'], CITY_ART['near_joins'])
    near = unpinked(matte(whole, keep_marks=True))
    # Leaves are greener than they are red and blue, or dark and teal in their shade; the lit
    # windows behind them are bright and as blue as they are green.
    trees = front_bank(whole, CITY_ART['trees'], lambda r, g, b: (g > r + 20) & ((g > b + 15) | ((g < 130) & (g > b - 12))), rim=36)
    scale = 0.375
    return save_layers('ship-it-city', {
        'sky': (sky, {'speed': 0.02, 'drift': 3}),
        'far': (layer(far, scale, CITY['far'], haze=(226, 176, 196), haze_from=CITY['haze']), {'speed': 0.07}),
        'near': (layer(near, scale, CITY['near']), {'speed': 0.18}),
        'trees': (layer(trees, 0.5, SCREEN[1] - round(trees.height * 0.5)), {'speed': 0.3}),
    }, {'behind': 2, 'rail': round(CITY_ART['deck'] * scale) + CITY['near'], 'train': 'freight',
        'float': {'sprite': 'airship', 'at': [300, 96]},
        'flock': {'sprite': 'drone', 'count': 2, 'y': 170, 'beat': 12},
        'smoke': {'layer': 2, 'from': [[round(x * scale), round(y * scale) + CITY['near']] for x, y in CITY_ART['chimneys']]}})


# The bridge is four pictures and the skyline two, each painted as the next stretch to the right of
# the last and joined where they match (see `stitched`). Where things are in the joined picture, in its own pixels: the
# bridge deck the train runs on, the top of each chimney, and the row the front trees are lifted from.
CITY_ART = {
    'near': ('city-near-2.png', 'city-near-3.png', 'city-near-4.png', 'city-near-5.png'),
    'near_joins': ((2000, 24), (2484, 908), (1792, 548)),
    'far': ('city-far-2.png', 'city-far-3.png'),
    'far_joins': ((1796, 648),),
    'deck': 716,
    'chimneys': ((574, 438), (1040, 183), (1606, 408), (3498, 290), (4612, 517)),
    'trees': 1100,
}
CITY = {'far': -70, 'near': 7, 'haze': (250, 350)}


def city_traffic():
    soft = matte(Image.open(SRC / 'city-movers.png'), keep_marks=True)
    sheet = dehaloed(soft)
    frames = {
        'airship': crisp(sheet.crop((280, 170, 950, 695)), 49, colours=64),
        'drone_0': crisp(sheet.crop((1256, 208, 1724, 584)), 22, colours=64),
        'drone_1': crisp(sheet.crop((1868, 192, 2272, 568)), 26, colours=64),
        # A faint line is drawn under the wheels: the train stops just above it.
        'freight': crisp(sheet.crop((284, 744, 2284, 1040)), 40),
        'puff_0': cut(soft, (308, 1204, 472, 1340), width=11),
        'puff_1': cut(soft, (500, 1164, 704, 1340), width=15),
        'puff_2': cut(soft, (732, 1104, 1004, 1336), width=20),
    }
    return frames, {}


# --- Growth Run -----------------------------------------------------------------------------------

# The track is several pictures, each painted as the next stretch to the right of the last and joined
# where they match (see `stitched`). In the joined picture's own pixels: the top of the track the
# train runs on, the row the front blossom is lifted from, and how much is left off each end when
# it is lifted.
GROWTH_ART = {
    'near': ('growth-near-2.png', 'growth-near-3.png', 'growth-near-4.png'),
    'near_joins': ((2532, 44), (2532, 44)),
    'track': 580,
    'trees': 1030,
    'ends': (250, 310),
}
GROWTH = {'far': -60, 'near': 59}


def growth_layers():
    """Growth Run's track, buildings and blossom are one painted picture on a flat ground. The
    front bank of blossom is lifted out of it to slide by itself."""
    sky = unmarked(Image.open(SRC / 'growth-sky.png')).convert('RGB').resize(SCREEN, Image.LANCZOS)
    far = matte(Image.open(SRC / 'growth-far.png'))
    whole = stitched(GROWTH_ART['near'], GROWTH_ART['near_joins'])
    green = lambda r, g, b: (g > r + 24) & (g > b + 24)
    near = shaved(matte(whole, keep_marks=True), green)
    # Petals are redder than they are green, no bluer than they are red, and never yellow: the
    # violet buildings behind them are bluer and their lit windows yellower. The far trees that
    # show at either end of the picture, behind the pillars, are left out with those ends.
    petal = lambda r, g, b: (r > 170) & (r > g + 25) & (r > b - 10) & (b > g - 10)
    left, right = GROWTH_ART['ends']
    trees = front_bank(whole.crop((left, 0, whole.width - right, whole.height)), GROWTH_ART['trees'], petal, rim=12)
    scale = 0.375
    return save_layers('growth-run', {
        'sky': (sky, {'speed': 0.02, 'drift': 2}),
        'far': (layer(far, scale, GROWTH['far'], haze=(98, 92, 204), haze_from=(260, 360)), {'speed': 0.07}),
        'near': (layer(near, scale, GROWTH['near']), {'speed': 0.18}),
        'trees': (layer(trees, 0.4, SCREEN[1] - round(trees.height * 0.4)), {'speed': 0.3}),
    }, {'behind': 2, 'rail': round(GROWTH_ART['track'] * scale) + GROWTH['near'], 'train': 'maglev',
        'float': {'sprite': 'screenship', 'at': [520, 92]},
        'flock': {'sprite': 'courier', 'count': 2, 'y': 160, 'beat': 12},
        'rocket': {'sprite': 'rocket', 'behind': 1, 'x': 640, 'every': 46, 'climb': 15}})


def growth_traffic():
    green = lambda r, g, b: (g > r + 24) & (g > b + 24)
    sheet = dehaloed(shaved(matte(Image.open(SRC / 'growth-movers.png'), keep_marks=True), green))
    # Three carriages make a short train, so the middle one rides three times.
    train, box = trim(sheet.crop((640, 716, 2400, 1184)))
    first, second = 1140 - 640 - box[0], 1712 - 640 - box[0]
    long = Image.new('RGBA', (train.width + 2 * (second - first), train.height))
    long.paste(train.crop((0, 0, second, train.height)), (0, 0))
    for i in (1, 2):
        long.paste(train.crop((first, 0, second, train.height)), (first + i * (second - first), 0))
    long.paste(train.crop((second, 0, train.width, train.height)), (second + 2 * (second - first), 0))
    frames = {
        'screenship': crisp(sheet.crop((180, 64, 1028, 628)), 45, colours=64),
        'courier_0': crisp(sheet.crop((1128, 200, 1764, 504)), 13, colours=64),
        'courier_1': crisp(sheet.crop((1848, 204, 2456, 504)), 13, colours=64),
        'rocket': crisp(sheet.crop((84, 668, 456, 1380)), 37, colours=64),
        'maglev': crisp(long, 42),
    }
    return frames, {}


# --- Bosses ---------------------------------------------------------------------------------------

# Each boss is one picture of four poses in a row on green: at rest, winding up, attacking and
# open to a stomp (Final Review: calm, asking, reading, satisfied). They are kept at one scale, set
# by the first pose, so a slumped pose is shorter rather than enlarged.
BOSS_HEIGHT = 108


def pose_runs(alpha, count, gap=8):
    """The column spans of `count` figures standing in a row, split where the picture is clear.
    Effects that float a little apart (stars, dust, light lines) join the nearest figure."""
    used = np.where(alpha.any(axis=0))[0]
    runs = [[used[0], used[0]]]
    for x in used[1:]:
        if x - runs[-1][1] > gap:
            runs.append([x, x])
        else:
            runs[-1][1] = x
    while len(runs) > count:
        gaps = [runs[i + 1][0] - runs[i][1] for i in range(len(runs) - 1)]
        i = int(np.argmin(gaps))
        runs[i:i + 2] = [[runs[i][0], runs[i + 1][1]]]
    # Two figures whose effects touch are parted at the thinnest column between them.
    while len(runs) < count:
        i = int(np.argmax([x1 - x0 for x0, x1 in runs]))
        x0, x1 = runs[i]
        third = (x1 - x0) // 3
        cut = x0 + third + int(np.argmin(alpha[:, x0 + third:x1 - third].sum(axis=0)))
        runs[i:i + 1] = [[x0, cut], [cut + 1, x1]]
    return runs


def boss_poses():
    frames = {}
    for boss in ('recruitmentbot', 'scopecreep', 'algorithm', 'finalreview'):
        sheet = dehaloed(matte(Image.open(SRC / f'boss-{boss}.png'), sample=(0.0, 0.0, 1.0, 0.04), keep_marks=True))
        alpha = np.asarray(sheet)[..., 3] > 40
        runs = pose_runs(alpha, 4)
        poses = [trim(sheet.crop((x0, 0, x1 + 1, sheet.height)))[0] for x0, x1 in runs]
        scale = BOSS_HEIGHT / poses[0].height
        for i, pose in enumerate(poses):
            frames[f'boss_{boss}_{i}'] = crisp(pose, max(8, round(pose.height * scale)), colours=64)
    return frames, {}


# --- Final Interview HQ ---------------------------------------------------------------------------

# The atrium is two pictures, the second painted as the next stretch to the right of the first and
# joined where they match (see `stitched`). Its glass is a flat red ground, so the view slides
# behind the frame.
HQ_ART = {
    'near': ('hq-near-1.png', 'hq-near-2.png'),
    'near_joins': ((2116, 892),),
}


def hq_layers():
    """Final Interview HQ's ground floor: the view of the city at sunrise, seen through the glass
    of the atrium the level runs through, and the atrium's frame of arches, balconies and planters
    in front of it. The plane, balloon and gulls pass outside the glass."""
    view = Image.open(SRC / 'hq-view-1.png').convert('RGB').resize(SCREEN, Image.LANCZOS)
    whole = stitched(HQ_ART['near'], HQ_ART['near_joins'])
    atrium = matte(whole, sample=(0.45, 0.25, 0.55, 0.4), keep_marks=True)
    return save_layers('interview-hq', {
        'view': (view, {'speed': 0.03, 'drift': 1, 'haze': 'rgba(214,226,255,.12)'}),
        'atrium': (layer(atrium, 0.375, 0), {'speed': 0.15}),
    }, {'behind': 1, 'float': {'sprite': 'balloon', 'at': [600, 96]},
        'flock': {'sprite': 'gull', 'count': 3, 'y': 140, 'beat': 4}})


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


# --- Doors ----------------------------------------------------------------------------------------

# Each world starts at one door and ends at another. Two pictures of four doors in a row on green;
# each door is found by the clear columns either side of it and brought down like the bosses.
# `gaps` is how close to the ground's own colour a closed-in gap must be to key out as well.
DOORS = {
    'doors-a.png': (('postbox', 'container', 'rocketlift', 'boardroom'), 30),
    'doors-b.png': (('shopfront', 'loadingbay', 'chartarch', 'goldlift'), 0),
}
# Each door's drawn height in game pixels, so its way in clears the hero (about 79 px tall) and
# the rocket stands taller than him. The renderer draws every door at its sprite's own height.
DOOR_HEIGHTS = {
    'shopfront': 230, 'postbox': 150, 'loadingbay': 210, 'container': 156,
    'chartarch': 150, 'rocketlift': 210, 'goldlift': 166, 'boardroom': 128,
}


def doors():
    green = lambda r, g, b: (g > r + 24) & (g > b + 24)
    frames = {}
    for name, (kinds, gaps) in DOORS.items():
        paint = Image.open(SRC / name).convert('RGB')
        keyed = np.asarray(matte(paint, sample=(0.0, 0.0, 1.0, 0.04), keep_marks=True)).copy()
        # Only the open ground keys out, and gaps that are the ground's own colour exactly (under a
        # sign, through a gantry): the green button and the ivy on a door keep their colour. The
        # second picture's button is close to its ground, so it keys only open ground.
        rgb = np.asarray(paint).astype(np.float32)
        key = np.median(rgb[: rgb.shape[0] // 25].reshape(-1, 3), axis=0)
        gap = np.sqrt(((rgb - key) ** 2).sum(axis=2)) < gaps
        _, ground = open_ground(keyed[..., 3] == 0)
        kept = ~ground & ~gap
        keyed[kept, :3] = np.asarray(paint)[kept]
        keyed[kept, 3] = 255
        sheet = dehaloed(shaved(Image.fromarray(keyed, 'RGBA'), green))
        runs = pose_runs(np.asarray(sheet)[..., 3] > 40, len(kinds))
        for kind, (x0, x1) in zip(kinds, runs):
            door = trim(sheet.crop((x0, 0, x1 + 1, sheet.height)))[0]
            frames[f'door_{kind}'] = crisp(door, DOOR_HEIGHTS[kind] - 2, colours=64)
    return frames, {}


def main():
    BACKGROUNDS.mkdir(parents=True, exist_ok=True)
    frames, extra, banner = alley_traffic()
    for more in (city_traffic(), growth_traffic(), signs(), machinery(), pickups(), boss_poses(), doors()):
        frames.update(more[0])
        extra.update(more[1])
    title_hero()
    scenery = {'0': alley_layers(), '1': city_layers(), '2': growth_layers(), '3': hq_layers()}
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
