"""Turn the generated HQ room art into what the game loads.

Sources live in assets/source/hq-rooms/ and are never edited:
  wall-<room>.png, wall-<room>-b.png   two stretches of the room's back wall as flat elevations, no furniture
  furniture-<room>.png                 separate pieces of furniture on a transparent or flat magenta ground

A room is wider than one wall image, so WALLS lists the stretches that make up its wall from left
to right and the part of each that is kept. A stretch may carry something the room must not show,
such as a painted lift door, and the kept part leaves it out.

Outputs:
  assets/production/backgrounds/interview-room-<n>.webp   one wall plate per room, at the size it is drawn
  assets/production/environment/furniture-atlas.png/.json  cut-out furniture at the size it is drawn

Each piece is found as a separate object on its sheet, in reading order, and scaled to the height
given below. Its width follows from the art; src/levels.js carries the same sizes and a test
compares the two. Requires Pillow and NumPy, used for build tooling only.
"""
from pathlib import Path
import json
import sys
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / 'assets/source/hq-rooms'
WALL_SIZE = (1190, 448)
# Room -> the floor it is on and its wall from left to right: (source, kept span as fractions of
# its width). The departing lift stands in front of the last 180 pixels or so of each plate.
WALLS = {
    'workshop': {'floor': 2, 'sections': [('wall-workshop-b', 0, 0.46), ('wall-workshop', 0, 1)]},
    'boardroom': {'floor': 3, 'sections': [('wall-boardroom-b', 0.02, 0.57), ('wall-boardroom', 0, 1)]},
    'reception': {'floor': 4, 'sections': [('wall-reception-b', 0, 0.72), ('wall-reception', 0.205, 1)]},
}
# Sheet -> rows of (piece, height in game pixels), in reading order. The hero is 58 tall.
SHEETS = {
    'workshop': [[('desk', 48), ('chest', 48), ('stool', 44)], [('bin', 50), ('shelf', 100), ('lamp', 36)]],
    'boardroom': [[('table', 46)], [('chair_side', 66), ('chair', 66), ('palm', 104), ('sideboard', 112)]],
    'reception': [[('reception', 64), ('armchair', 62), ('coffee_table', 36)], [('planter', 50), ('tree', 100), ('floor_lamp', 110)]],
}


def matte(im):
    """Alpha for a sheet: its own if it has one, otherwise distance from the flat ground colour."""
    rgba = np.asarray(im.convert('RGBA')).astype(np.float32)
    if (rgba[..., 3] < 16).mean() > 0.05:
        return rgba[..., :3], rgba[..., 3] / 255
    rgb = rgba[..., :3]
    edge = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    key = np.median(edge, axis=0)
    distance = np.sqrt(((rgb - key) ** 2).sum(axis=2))
    alpha = np.clip((distance - 30) / 50, 0, 1)
    # Pull the cut in by a pixel so no rim of the ground colour survives the scaling down.
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(5))) / 255
    return rgb, alpha


def objects(alpha, rows):
    """Bounding boxes of the separate objects, grouped into `rows` bands and read left to right."""
    step = 4
    solid = alpha[::step, ::step] > 0.5
    # Close small gaps so thin legs and lamp arms stay with their piece.
    grown = solid.copy()
    for _ in range(3):
        g = grown.copy()
        g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
        grown = g
    seen = np.zeros_like(grown)
    boxes = []
    for y, x in zip(*np.nonzero(grown)):
        if seen[y, x]:
            continue
        stack, x0, y0, x1, y1, count = [(y, x)], x, y, x, y, 0
        seen[y, x] = True
        while stack:
            cy, cx = stack.pop(); count += 1
            x0, y0, x1, y1 = min(x0, cx), min(y0, cy), max(x1, cx), max(y1, cy)
            for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                if 0 <= ny < grown.shape[0] and 0 <= nx < grown.shape[1] and grown[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True; stack.append((ny, nx))
        if count > grown.size * 0.002:
            boxes.append([x0 * step, y0 * step, (x1 + 1) * step, (y1 + 1) * step])
    height = alpha.shape[0]
    bands = [[] for _ in range(rows)]
    for box in boxes:
        bands[min(rows - 1, int((box[1] + box[3]) / 2 / height * rows))].append(box)
    return [sorted(band) for band in bands]


def tight(alpha, box):
    x0, y0, x1, y1 = box
    ys, xs = np.nonzero(alpha[y0:y1, x0:x1] > 0.5)
    return [x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1]


def build_furniture():
    pieces = []
    for sheet, rows in SHEETS.items():
        path = SRC / f'furniture-{sheet}.png'
        rgb, alpha = matte(Image.open(path))
        found = objects(alpha, len(rows))
        for band, wanted in zip(found, rows):
            if len(band) != len(wanted):
                sys.exit(f'{path.name}: expected {[n for n, _ in wanted]} but found {len(band)} objects at {band}')
            for box, (name, height) in zip(band, wanted):
                x0, y0, x1, y1 = tight(alpha, box)
                cut = np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1] * 255]).astype(np.uint8)
                art = Image.fromarray(cut, 'RGBA')
                width = max(2, round(art.width * height / art.height / 2) * 2)
                art = art.resize((width, height), Image.Resampling.LANCZOS)
                pieces.append((name, art, str(path.relative_to(ROOT)), [int(v) for v in (x0, y0, x1, y1)]))
    pad, atlas_width = 2, 512
    x = y = row_height = 0
    places = []
    for name, art, source, rect in pieces:
        if x + art.width + pad > atlas_width:
            x, y, row_height = 0, y + row_height + pad, 0
        places.append((x, y)); x += art.width + pad; row_height = max(row_height, art.height)
    canvas = Image.new('RGBA', (atlas_width, y + row_height))
    meta = {'image': 'assets/production/environment/furniture-atlas.png', 'size': list(canvas.size), 'frames': {}}
    for (name, art, source, rect), (px, py) in zip(pieces, places):
        canvas.alpha_composite(art, (px, py))
        meta['frames'][name] = {'x': px, 'y': py, 'w': art.width, 'h': art.height, 'source': source, 'sourceRect': rect}
    out = ROOT / 'assets/production/environment'
    canvas.save(out / 'furniture-atlas.png', optimize=True)
    (out / 'furniture-atlas.json').write_text(json.dumps(meta, indent=2) + '\n')
    print('furniture:', ', '.join(f"{n} {f['w']}x{f['h']}" for n, f in meta['frames'].items()))


def build_walls():
    width, height = WALL_SIZE
    for room, wall in WALLS.items():
        plate, x = Image.new('RGB', WALL_SIZE), 0
        for source, left, right in wall['sections']:
            im = Image.open(SRC / f'{source}.png').convert('RGB')
            im = im.crop((round(left * im.width), 0, round(right * im.width), im.height))
            im = im.resize((round(im.width * height / im.height), height), Image.Resampling.LANCZOS)
            plate.paste(im, (x, 0)); x += im.width
        if x < width - 32:
            sys.exit(f'{room}: the wall is {x} wide and the room needs {width}')
        if x < width:
            # The last few pixels stand behind the departing lift; repeat the edge to fill them.
            plate.paste(plate.crop((2 * x - width, 0, x, height)).transpose(Image.Transpose.FLIP_LEFT_RIGHT), (x, 0))
        plate.save(ROOT / f"assets/production/backgrounds/interview-room-{wall['floor']}.webp", quality=88, method=6)
        print(f"wall {room}: floor {wall['floor']}, sections {x} wide for a {width} plate")


if __name__ == '__main__':
    build_walls()
    build_furniture()
