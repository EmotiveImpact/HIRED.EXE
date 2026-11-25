"""Turn the generated art for the Feed, Growth Run's chase, into what the game loads.

Sources live in assets/source/feed/ and are never edited. Each is drawn on a flat green ground
and carries the generator's marks in two corners, which are cut away here:
  feed-front-<x>.png   the leading edge of the Feed, running off the left of the picture
  feed-body.png        a wall of posts, used as the scrolling body behind the leading edge
  feed-icons.png       six icons in two rows: heart, like, bell, badge, bubble, share

Outputs:
  assets/production/enemies/feed-atlas.png/.json   the leading edge and the icons, cut out
  assets/production/enemies/feed-body.webp         one tile of the body, repeating both ways

The atlas notes where the leading face stands in the art (`edge`), which the game lines up with
the Feed's position, and the tip of the crest (`crest`), where the icons fly from.

Usage: python3 tools/build-feed-art.py [front]      front is a, b or c; the default is FRONT
Requires Pillow and NumPy, used for build tooling only.
"""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/source/feed'
OUT = ROOT / 'assets/production/enemies'
FRONT = 'a'
FRONT_HEIGHT = 560           # a little taller than the screen, so it can bob without showing an end
ICONS = [['heart', 'like', 'bell'], ['badge', 'bubble', 'share']]
ICON_HEIGHT = 26
BODY_TILE = (12, 626, 1418, 1752)   # from the middle of one dark gap to the middle of another
BODY_WIDTH = 320
# The generator's marks, as fractions of the picture: a badge top left, a logo bottom right.
MARKS = [(0, 0, 0.10, 0.045), (0.66, 0.935, 1, 1)]


def matte(im):
    """Colour and alpha for a picture on flat green, with the corner marks cleared."""
    rgb = np.asarray(im.convert('RGB')).astype(np.float32)
    height, width = rgb.shape[:2]
    # The right-hand edge is always bare ground.
    key = np.median(rgb[: int(height * 0.9), -40:].reshape(-1, 3), axis=0)
    distance = np.sqrt(((rgb - key) ** 2).sum(axis=2))
    alpha = np.clip((distance - 40) / 60, 0, 1)
    # Anything still mostly green is ground showing through a soft edge, as long as it joins the
    # ground outside: a green screen inside the art is left alone.
    greenish = (rgb[..., 1] > rgb[..., 0] * 1.35) & (rgb[..., 1] > rgb[..., 2] * 1.35) & (rgb[..., 1] > 120)
    alpha[greenish & outside((alpha < 0.5) | greenish)] = 0
    for x0, y0, x1, y1 in MARKS:
        alpha[int(y0 * height): int(y1 * height), int(x0 * width): int(x1 * width)] = 0
    # Pull the cut in by a pixel so no green rim survives the scaling down.
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) / 255
    return rgb, alpha


def outside(ground):
    """The part of `ground` that is joined to the border of the picture, found at quarter size."""
    small = ground[::4, ::4]
    seen = np.zeros_like(small)
    seen[0], seen[-1], seen[:, 0], seen[:, -1] = small[0], small[-1], small[:, 0], small[:, -1]
    while True:
        grown = seen.copy()
        grown[1:] |= seen[:-1]; grown[:-1] |= seen[1:]; grown[:, 1:] |= seen[:, :-1]; grown[:, :-1] |= seen[:, 1:]
        grown &= small
        if (grown == seen).all():
            break
        seen = grown
    return np.kron(seen, np.ones((4, 4), dtype=bool))[: ground.shape[0], : ground.shape[1]]


def cut(rgb, alpha, box):
    x0, y0, x1, y1 = box
    return Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1] * 255]).astype(np.uint8), 'RGBA')


def build_front(which):
    path = SRC / f'feed-front-{which}.png'
    rgb, alpha = matte(Image.open(path))
    height, width = alpha.shape
    # The badge in the top left corner sits on the art, so the picture starts below it.
    top = int(MARKS[0][3] * height)
    solid = alpha > 0.5
    columns = np.nonzero(solid[top:].any(axis=0))[0]
    right = int(columns.max()) + 1
    art = cut(rgb, alpha, (0, top, right, height))
    scale = FRONT_HEIGHT / art.height
    art = art.resize((round(art.width * scale), FRONT_HEIGHT), Image.Resampling.LANCZOS)
    # Melt the cut left-hand side into the body that scrolls behind it.
    a = np.asarray(art).copy()
    fade = min(48, art.width // 4)
    a[:, :fade, 3] = (a[:, :fade, 3] * np.linspace(0, 1, fade)[None, :]).astype(np.uint8)
    art = Image.fromarray(a, 'RGBA')
    # Where the leading face stands: the usual reach of the lower two thirds of the picture.
    shape = np.asarray(art)[..., 3] > 127
    reach = [np.nonzero(row)[0].max() for row in shape[FRONT_HEIGHT // 3:] if row.any()]
    edge = int(np.percentile(reach, 60))
    # The tip of the crest: the furthest point forward in the upper half.
    upper = shape[: FRONT_HEIGHT // 2]
    tip_x = int(np.nonzero(upper.any(axis=0))[0].max())
    tip_y = int(np.nonzero(upper[:, tip_x])[0].mean())
    return art, edge, [tip_x, tip_y], str(path.relative_to(ROOT))


def build_icons():
    path = SRC / 'feed-icons.png'
    rgb, alpha = matte(Image.open(path))
    height, width = alpha.shape
    icons = []
    for r, names in enumerate(ICONS):
        for c, name in enumerate(names):
            x0, x1 = width * c // 3, width * (c + 1) // 3
            y0, y1 = height * r // 2, height * (r + 1) // 2
            ys, xs = np.nonzero(alpha[y0:y1, x0:x1] > 0.5)
            if not len(xs):
                sys.exit(f'{path.name}: nothing found for {name}')
            art = cut(rgb, alpha, (x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1))
            art = art.resize((max(2, round(art.width * ICON_HEIGHT / art.height)), ICON_HEIGHT), Image.Resampling.LANCZOS)
            icons.append((name, art))
    return icons, str(path.relative_to(ROOT))


def build_body():
    im = Image.open(SRC / 'feed-body.png').convert('RGB').crop(BODY_TILE)
    tile = im.resize((BODY_WIDTH, round(im.height * BODY_WIDTH / im.width)), Image.Resampling.LANCZOS)
    tile.save(OUT / 'feed-body.webp', quality=90, method=6)
    return tile.size


def main():
    which = sys.argv[1] if len(sys.argv) > 1 else FRONT
    front, edge, crest, front_source = build_front(which)
    icons, icon_source = build_icons()
    body_size = build_body()
    pad = 2
    width = front.width + pad + max(art.width for _, art in icons)
    canvas = Image.new('RGBA', (width, FRONT_HEIGHT))
    canvas.alpha_composite(front, (0, 0))
    meta = {
        'image': 'assets/production/enemies/feed-atlas.png', 'size': list(canvas.size), 'edge': edge, 'crest': crest,
        'body': {'image': 'assets/production/enemies/feed-body.webp', 'size': list(body_size)},
        'frames': {'front': {'x': 0, 'y': 0, 'w': front.width, 'h': front.height, 'source': front_source}},
    }
    y = 0
    for name, art in icons:
        canvas.alpha_composite(art, (front.width + pad, y))
        meta['frames'][name] = {'x': front.width + pad, 'y': y, 'w': art.width, 'h': art.height, 'source': icon_source}
        y += art.height + pad
    canvas.save(OUT / 'feed-atlas.png', optimize=True)
    (OUT / 'feed-atlas.json').write_text(json.dumps(meta, indent=2) + '\n')
    print(f'front {which}: {front.width}x{front.height}, face at {edge}, crest at {crest}; body tile {body_size[0]}x{body_size[1]}')


if __name__ == '__main__':
    main()
