#!/usr/bin/env python3
"""Cut the painted afro hero sheet into the game's hero atlas and the title-screen hero.

Source: assets/source/characters/afro/hero-sheet-afro.webp, an 18-pose sheet painted on CapCut
(Seedream 5.5) from assets/source/characters/prompts/hero-sheet-afro.txt: three rows of six poses
on flat magenta, in the order listed in SHEET_ORDER.

Writes, keeping the atlas layout and metadata unchanged (80 x 96 cells, anchor [40, 92]):
  assets/production/characters/hero-atlas.png
  assets/production/characters/title-hero.webp
Run tools/build.py afterwards.
"""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from PIL import ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SHEET = ROOT / 'assets/source/characters/afro/hero-sheet-afro.webp'
META = ROOT / 'assets/production/characters/hero-atlas.json'
ATLAS = ROOT / 'assets/production/characters/hero-atlas.png'
TITLE = ROOT / 'assets/production/characters/title-hero.webp'
# The run cycle is painted separately, eight frames in one row, so the legs truly alternate.
RUN_SHEET = ROOT / 'assets/source/characters/afro/hero-run-afro.webp'
RUN_FRAMES = [f'run_{i}' for i in range(8)]
RUN_FPS = 14

SHEET_ORDER = ['idle_0', 'idle_1', 'idle_2', 'run_0', 'run_1', 'run_2',
               'run_3', 'run_4', 'run_5', 'jump_0', 'jump_1', 'fall_0',
               'dash_0', 'dash_1', 'hurt_0', 'crouch_0', 'victory_0', 'victory_1']
HERO_HEIGHT = 78      # standing height in game pixels (the old hero stood 77 to 79)
TITLE_POSE = 'run_1'  # the title screen shows him mid-stride, facing right (from the main sheet)
TITLE_HEIGHT = 136    # drawn at this height in art pixels, then saved in four-pixel blocks
TITLE_BLOCK = 4
OUTLINE = (32, 18, 46, 255)  # the art bible's deep violet line


def key_magenta(rgb):
    """Opacity from distance to the magenta backdrop (soft at the rim, so it scales cleanly).
    How magenta the backdrop is varies between paintings, so it is measured from the border."""
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    # Magenta: red and blue high, green low. Measure how far green sits below red and blue.
    mag = np.minimum(r, b) - g
    border = np.concatenate([mag[:8].ravel(), mag[-8:].ravel(), mag[:, :8].ravel(), mag[:, -8:].ravel()])
    back = float(np.median(border))
    alpha = np.clip((back * 0.8 - mag) / (back * 0.4), 0, 1)
    # Despill: pull pink fringes towards neutral.
    spill = np.clip(mag - 40, 0, None) * (1 - alpha)
    out = rgb.astype(np.float32).copy()
    out[..., 0] -= spill * 0.5
    out[..., 2] -= spill * 0.5
    return np.clip(out, 0, 255), alpha


def no_shine(img):
    """Some run frames were painted with a grey shine on top of the afro and some without; take it
    out so the hair does not flicker as he runs. The top fifth of each pose is only hair and line."""
    a = np.asarray(img).copy()
    top = a[: int(a.shape[0] * 0.22)]
    c = top[..., :3].astype(int)
    solid = top[..., 3] > 0
    dark = solid & (c.mean(-1) < 45)
    hair = np.median(c[dark], axis=0) if dark.any() else np.array([25, 20, 25])
    reddish = c[..., 0] - c[..., 2] > 12
    top[solid & ((c.mean(-1) > 55) | reddish), :3] = hair.astype(np.uint8)
    return Image.fromarray(a, 'RGBA')


def afro_width(img):
    """Width of the hair across the top third of a pose: the steadiest measure of his size."""
    al = np.asarray(img)[..., 3] > 0
    top = al[: int(al.shape[0] * 0.3)]
    return np.median([np.ptp(r.nonzero()[0]) for r in top[len(top) // 2:] if r.any()])


def runs(mask_1d, gap):
    """Spans of True separated by at least `gap` False entries."""
    spans, start, last = [], None, None
    for i, v in enumerate(mask_1d):
        if v:
            if start is None:
                start = i
            elif i - last > gap:
                spans.append((start, last + 1))
                start = i
            last = i
    if start is not None:
        spans.append((start, last + 1))
    return spans


def figures(sheet, order=SHEET_ORDER, rows_wanted=3, per_row=6):
    rgb = np.asarray(sheet.convert('RGB'))
    rgb, alpha = key_magenta(rgb)
    solid = alpha > 0.5
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    rows = [r for r in runs(solid.sum(1) > 3, 12) if r[1] - r[0] > 100]
    assert len(rows) == rows_wanted, f'expected {rows_wanted} rows, found {rows}'
    out, names = {}, iter(order)
    for y0, y1 in rows:
        cols = [c for c in runs(solid[y0:y1].sum(0) > 2, 8) if c[1] - c[0] > 40]
        assert len(cols) == per_row, f'expected {per_row} poses in row {y0}, found {cols}'
        for x0, x1 in cols:
            box = solid[y0:y1, x0:x1]
            ys = np.where(box.sum(1) > 0)[0]
            img = Image.fromarray(rgba[y0 + ys[0]:y0 + ys[-1] + 1, x0:x1], 'RGBA')
            img.info['box'] = [int(x0), int(y0 + ys[0]), int(x1), int(y0 + ys[-1] + 1)]
            out[next(names)] = img
    return out


def erode(mask):
    return np.asarray(Image.fromarray(mask.astype(np.uint8) * 255).filter(ImageFilter.MinFilter(3))) > 0


def shrink(img, scale):
    """Box-filter down (premultiplied, so no dark or pink halos), then harden the edge."""
    w, h = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    a = np.asarray(img).astype(np.float32) / 255
    pre = np.dstack([a[..., :3] * a[..., 3:4], a[..., 3:4]])
    small = np.asarray(Image.fromarray((pre * 255).astype(np.uint8), 'RGBA').resize((w, h), Image.BOX)).astype(np.float32) / 255
    al = small[..., 3:4]
    col = np.where(al > 0.01, small[..., :3] / np.maximum(al, 1e-3), 0)
    hard = (al[..., 0] > 0.45)
    res = np.dstack([np.clip(col * 255, 0, 255), hard * 255]).astype(np.uint8)
    return Image.fromarray(res, 'RGBA')


def palette(images, colours):
    """One shared palette for every frame, so his skin and hoodie do not shift between poses."""
    strip = np.concatenate([np.asarray(i)[..., :3][np.asarray(i)[..., 3] > 0] for i in images])
    strip = strip.reshape(1, -1, 3)
    return Image.fromarray(strip, 'RGB').quantize(colours, method=Image.Quantize.MEDIANCUT)


def unpink(a, solid):
    """Backdrop fringe: magenta-tinted pixels near the rim become line, any inside lose the tint."""
    c = a[..., :3].astype(int)
    pink = solid & (c[..., 0] - c[..., 1] > 22) & (c[..., 2] - c[..., 1] > 22)
    near = solid & ~erode(erode(erode(solid)))
    a[pink & near] = OUTLINE
    inside = pink & ~near
    grey = c[inside].mean(-1, keepdims=True).astype(np.uint8)
    a[inside, :3] = np.repeat(grey, 3, -1)


def crisp(img, pal):
    """Flatten to the shared palette and close the silhouette with the violet line."""
    a = np.asarray(img).copy()
    solid = a[..., 3] > 0
    unpink(a, solid)
    rgb = Image.fromarray(a[..., :3], 'RGB').quantize(palette=pal, dither=Image.Dither.NONE).convert('RGB')
    a[..., :3] = np.asarray(rgb)
    # Any edge pixel that is not already dark becomes the outline colour.
    edge = solid & ~erode(solid)
    lum = a[..., :3].astype(int).sum(-1)
    a[edge & (lum > 200)] = OUTLINE
    unpink(a, solid)
    a[~solid] = 0
    return Image.fromarray(a, 'RGBA')


def main():
    meta = json.loads(META.read_text())
    cw, ch = meta['cell']
    ax, ay = meta['anchor']
    poses = figures(Image.open(SHEET))
    stand = np.mean([poses[k].height for k in ('idle_0', 'idle_1', 'idle_2')])
    scale = HERO_HEIGHT / stand
    title_pose = poses[TITLE_POSE]
    lift = {}
    if RUN_SHEET.exists():
        # The run frames come from their own sheet, sized so his stride matches the old run height,
        # and lifted off the anchor by as much as he leaves the ground in the painting.
        run = figures(Image.open(RUN_SHEET), RUN_FRAMES, 1, len(RUN_FRAMES))
        stand_afro = np.median([afro_width(poses[k]) for k in ('idle_0', 'idle_1', 'idle_2')])
        run_scale = scale * stand_afro / np.median([afro_width(run[k]) for k in RUN_FRAMES])
        ground = max(run[k].info['box'][3] for k in RUN_FRAMES)
        for i, name in enumerate(RUN_FRAMES):
            poses[name] = no_shine(run[name])
            poses[name].info['box'] = run[name].info['box']
            lift[name] = round((ground - run[name].info['box'][3]) * run_scale)
            if name not in meta['frames']:
                slot = 18 + i - 6
                meta['frames'][name] = {'x': (slot % 6) * cw, 'y': (slot // 6) * ch, 'w': cw, 'h': ch, 'anchor': [ax, ay]}
        meta['size'] = [6 * cw, ch * (1 + max(f['y'] for f in meta['frames'].values()) // ch)]
        meta['animations']['run'] = {'frames': RUN_FRAMES, 'fps': RUN_FPS, 'loop': True}
        meta['runSource'] = str(RUN_SHEET.relative_to(ROOT))
    scales = {name: (run_scale if name in lift else scale) for name in meta['frames']}
    atlas = Image.new('RGBA', tuple(meta['size']))
    shrunk = {name: shrink(poses[name], scales[name]) for name in meta['frames']}
    pal = palette(shrunk.values(), 40)
    for name, f in meta['frames'].items():
        small = crisp(shrunk[name], pal)
        # Feet on the anchor line; centred on the body's mass so the head does not jump between frames.
        al = np.asarray(small)[..., 3] > 0
        cx = np.average(np.arange(small.width), weights=al.sum(0))
        x = round(f['x'] + ax - cx)
        x = min(max(x, f['x']), f['x'] + cw - small.width)
        y = f['y'] + ay - small.height + 1 - lift.get(name, 0)
        if y < f['y']:
            small = small.crop((0, f['y'] - y, small.width, small.height))
            y = f['y']
        atlas.alpha_composite(small, (x, y))
        bb = small.getbbox()
        f['bounds'] = [x - f['x'] + bb[0], y - f['y'] + bb[1], bb[2] - bb[0], bb[3] - bb[1]]
        f['sourceRect'] = poses[name].info['box']
    atlas.save(ATLAS, optimize=True)
    meta['source'] = str(SHEET.relative_to(ROOT))
    meta['sourceSha256'] = hashlib.sha256(SHEET.read_bytes()).hexdigest()
    META.write_text(json.dumps(meta, indent=2) + '\n')
    print(f'hero atlas cut: {len(meta["frames"])} frames at {scale:.3f} -> {ATLAS.relative_to(ROOT)}')

    big = shrink(title_pose, TITLE_HEIGHT / title_pose.height)
    title = crisp(big, palette([big], 48))
    title = title.crop(title.getbbox())
    title = title.resize((title.width * TITLE_BLOCK, title.height * TITLE_BLOCK), Image.NEAREST)
    title.save(TITLE, 'WEBP', lossless=True, method=6)
    print(f'title hero cut: {title.width} x {title.height} -> {TITLE.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
