"""Turn the generated HQ room art into what the game loads.

Sources live in assets/source/hq-rooms/ and are never edited:
  wall-<room>.png        a flat elevation of the room's back wall, no furniture
  furniture-<room>.png   separate pieces of furniture on a transparent or flat magenta ground

A wall source may carry things the room must not show: a painted strip of floor, a painted lift
door, the generator's watermark. WALLS names the part of each source that is kept. The kept part
is tiled, mirrored at each join, to the width of a room.

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
# Room -> the floor it is on, the part of the source that is kept (left, top, right, bottom as
# fractions) and how it is laid out: 'centre' puts one copy mid-room, 'pair' joins two at mid-room.
WALLS = {
    'workshop': {'floor': 2, 'keep': (0, 0, 1, 1), 'layout': 'centre'},
    'boardroom': {'floor': 3, 'keep': (0.045, 0, 0.955, 0.893), 'layout': 'centre'},
    'reception': {'floor': 4, 'keep': (0.268, 0, 1, 0.895), 'layout': 'pair'},
}
# Corners of a furniture sheet that hold a generator's badge or watermark, as fractions.
SHEET_MARKS = [(0, 0, 0.06, 0.08), (0.72, 0.905, 1, 1)]
# Sheet -> rows of (piece, height in game pixels), in reading order. The hero is 58 tall.
SHEETS = {
    'workshop': [[('desk', 50), ('chest', 50), ('work_chair', 56)], [('bin', 36), ('shelf', 104), ('lamp', 38)]],
    'boardroom': [[('table', 48)], [('chair_side', 64), ('chair', 64), ('palm', 84), ('sideboard', 52)]],
    'reception': [[('reception', 62), ('armchair', 60), ('coffee_table', 32)], [('planter', 46), ('tree', 100), ('floor_lamp', 108)]],
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
    height, width = alpha.shape
    for x0, y0, x1, y1 in SHEET_MARKS:
        alpha[int(y0 * height):int(y1 * height), int(x0 * width):int(x1 * width)] = 0
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
        im = Image.open(SRC / f'wall-{room}.png').convert('RGB')
        x0, y0, x1, y1 = wall['keep']
        im = im.crop((round(x0 * im.width), round(y0 * im.height), round(x1 * im.width), round(y1 * im.height)))
        tile = im.resize((round(im.width * height / im.height), height), Image.Resampling.LANCZOS)
        flipped = tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        plate = Image.new('RGB', WALL_SIZE)
        # Start from mid-room and work outwards so the room reads the same from either lift.
        first = width // 2 - (tile.width if wall['layout'] == 'pair' else tile.width // 2)
        index = 0
        while first > 0:
            first -= tile.width; index -= 1
        for x in range(first, width, tile.width):
            mirrored = index % 2 == 0 if wall['layout'] == 'pair' else index % 2 != 0
            plate.paste(flipped if mirrored else tile, (x, 0)); index += 1
        plate.save(ROOT / f"assets/production/backgrounds/interview-room-{wall['floor']}.webp", quality=88, method=6)
        print(f"wall {room}: floor {wall['floor']}, tile {tile.width} wide")


if __name__ == '__main__':
    build_walls()
    build_furniture()
