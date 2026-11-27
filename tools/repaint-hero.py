#!/usr/bin/env python3
"""Repaint Augustus in the hero atlas to match the intro films.

Reads the approved atlas (assets/source/characters/hero-atlas-v1.png) and writes
assets/production/characters/hero-atlas.png with the same 18 frames, cells and anchors:

- a big round curly black afro, grown from his short hair and kept behind his face;
- a full black beard;
- the cream shirt closed over into a teal hoodie with darker teal brush-stroke stripes;
- charcoal trousers.

Every pixel that is not hair, beard, shirt, jacket or trousers is left as it was, so the
poses, outline, trainers and backpack stay exactly as approved. Needs Pillow and NumPy.
"""
import colorsys
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets/source/characters/hero-atlas-v1.png'
ATLAS = ROOT / 'assets/production/characters/hero-atlas.png'
META = ROOT / 'assets/production/characters/hero-atlas.json'
TITLE_SOURCE = ROOT / 'assets/source/characters/title-hero-v1.webp'
TITLE = ROOT / 'assets/production/characters/title-hero.webp'

AFRO = np.array([24, 18, 28])
AFRO_LIGHT = np.array([52, 48, 56])
AFRO_SHINE = np.array([80, 76, 86])
OUTLINE = np.array([14, 8, 18])
BEARD = np.array([22, 16, 24])
BEARD_LIGHT = np.array([52, 42, 58])
TEAL = np.array([22, 170, 168])
TEAL_LIGHT = np.array([70, 206, 196])
TEAL_DARK = np.array([8, 112, 118])
TEAL_SHADOW = np.array([6, 84, 92])


def classes(cell):
    """Hue, saturation and value planes for one 80 x 96 cell."""
    rgb = cell[..., :3].astype(np.float32) / 255
    hsv = np.zeros_like(rgb)
    for y in range(rgb.shape[0]):
        for x in range(rgb.shape[1]):
            hsv[y, x] = colorsys.rgb_to_hsv(*rgb[y, x])
    return hsv[..., 0], hsv[..., 1], hsv[..., 2]


def components(mask):
    """Label 4-connected regions; returns a label plane and the regions' sizes."""
    labels = np.zeros(mask.shape, np.int32)
    sizes = [0]
    h, w = mask.shape
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not labels[y, x]:
                n = len(sizes)
                stack, count = [(y, x)], 0
                labels[y, x] = n
                while stack:
                    cy, cx = stack.pop()
                    count += 1
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not labels[ny, nx]:
                            labels[ny, nx] = n
                            stack.append((ny, nx))
                sizes.append(count)
    return labels, sizes


def grow(mask, steps=1):
    out = mask.copy()
    for _ in range(steps):
        m = out.copy()
        m[1:] |= out[:-1]; m[:-1] |= out[1:]; m[:, 1:] |= out[:, :-1]; m[:, :-1] |= out[:, 1:]
        out = m
    return out


def repaint(cell, L=1, px=1):
    """Repaint one picture of him. L is how many times larger than the game sprite he is drawn,
    and px the size of one of the picture's pixel blocks."""
    cell = cell.copy()
    alpha = cell[..., 3]
    solid = alpha > 160
    hue, sat, val = classes(cell)
    rgb = cell[..., :3].astype(np.int32)
    yy, xx = np.mgrid[0:cell.shape[0], 0:cell.shape[1]]
    by, bx = yy // px, xx // px

    skin = solid & (hue > 0.02) & (hue < 0.1) & (sat > 0.45) & (val > 0.5)
    dark = solid & (val < 0.36) & ((hue > 0.85) | (hue < 0.06) | (sat < 0.3))
    eye = solid & (sat < 0.25) & (val > 0.7)

    # His hair is the biggest dark patch in the top part of the figure.
    rows = np.where(solid.any(axis=1))[0]
    top, bottom = rows[0], rows[-1]
    upper = yy < top + (bottom - top) * 0.5
    labels, sizes = components(dark & upper)
    hair = labels == int(np.argmax(sizes)) if len(sizes) > 1 else np.zeros_like(solid)

    # His face is the skin patch that touches the hair most (fists can be just as high).
    # A head is about 30 pixels from crown to chin, which keeps a raised hand off the face.
    hair_top = np.where(hair)[0].min() if hair.any() else top
    labels, sizes = components(skin & (yy < hair_top + 32 * L))
    near = grow(hair, round(3 * L))
    best, face = 0, None
    for n in range(1, len(sizes)):
        touch = int((near & (labels == n)).sum())
        if touch > best and sizes[n] > 25 * L * L:
            best, face = touch, labels == n
    if face is None:
        return cell
    fy, fx = np.where(face)
    face_top, face_bottom = fy.min(), fy.max()
    face_left, face_right = fx.min(), fx.max()
    face_w = face_right - face_left + 1
    face_cx = (face_left + face_right) / 2
    hy, hx = np.where(hair)
    hair_top = hy.min()
    eye_line = face_top + (face_bottom - face_top) * 0.38

    # Afro: a round, curly mass centred a little behind and above the face.
    radius = face_w * 1.1 + L
    cx = face_cx - face_w * 0.22
    cy = min(face_top + 1, hair_top + radius * 0.82)
    cy = max(cy, radius / 1.06 + 2 * px)  # room above, or the cell edge flattens the crown
    angle = np.arctan2(yy - cy, xx - cx)
    bumps = (1.1 * np.sin(angle * 11) + 0.6 * np.sin(angle * 5 + 1.3)) * L
    inside = np.hypot((xx - cx) * 1.0, (yy - cy) * 1.06) <= radius + bumps
    # In front of the face it stops at the forehead; behind, at the ear.
    # The front curves down into the forehead instead of jutting out like a cap's brim.
    front = xx > face_cx + face_w * 0.05
    inside &= ~(front & (yy > eye_line - 2 * L - (xx - face_cx - face_w * 0.05) * 0.9))
    inside &= xx <= face_right
    inside &= yy < face_top + (face_bottom - face_top) * 0.72
    # The big picture lights his hair with plum and magenta, which belongs to the afro as well.
    plum = solid & ((hue > 0.8) | (hue < 0.03)) & (val < 0.62) & (sat > 0.35) & (yy < eye_line)
    paintable = (alpha < 100) | hair | (dark & (yy < eye_line)) | (plum & (px > 1))
    afro = inside & paintable & ~skin & ~eye
    afro |= hair

    # Curls: short light dashes in staggered rows, more of them towards the top left.
    shade = (xx - cx) * 0.6 + (yy - cy)
    u, v = (bx + ((by // 4) % 2) * 2) % 4, by % 4
    curl = ((u == 0) & (v == 1)) | ((u == 1) & (v == 0)) | ((u == 2) & (v == 0)) | ((u == 3) & (v == 1))
    curl &= ((bx // 4 + by // 4) % 3 != 0)
    if px > 1:
        # Larger blocks read as knitting in a regular pattern, so the big picture scatters them.
        gh, gw = by.max() + 3, bx.max() + 3
        gy, gx = np.mgrid[0:gh, 0:gw]
        seed = (((gx * 73856093) ^ (gy * 19349663)) % 100) < 9
        arcs = seed.copy()  # each seed draws a small curl: up one block, then across and down
        arcs[:-1, 1:] |= seed[1:, :-1]
        arcs[:-1, 2:] |= seed[1:, :-2]
        arcs[:, 3:] |= seed[:, :-3]
        curl = arcs[by, bx]
    shine = curl & (shade < -radius * 0.45) & ((bx + by) % 3 == 0)
    colour = np.where(curl[..., None], AFRO_LIGHT, AFRO)
    colour = np.where(shine[..., None], AFRO_SHINE, colour)
    cell[afro, :3] = colour[afro]
    cell[afro, 3] = 255
    rim = afro & grow(~afro & (alpha < 100), px)
    cell[rim, :3] = OUTLINE

    # Beard: the dark pixels on the lower face go black, and it fills out by a pixel along the
    # jaw and two under the chin.
    lower = (yy > eye_line + 2 * L) & (yy <= face_bottom + 2 * L) & (xx >= face_left - L) & (xx <= face_right + L)
    beard = lower & solid & (dark | ((hue > 0.9) & (val < 0.5))) & ~afro
    jaw = skin & (yy > face_bottom - 4 * L) & grow(beard, px) & ~grow(eye, px)
    chin = (alpha < 100) & grow(beard & (yy >= face_bottom - L), 2 * px) & (yy > face_bottom) & (yy <= face_bottom + 2 * px)
    beard |= jaw | chin
    flecks = beard & ((bx * 3 + by * 5) % 7 == 0)
    cell[beard, :3] = BEARD
    cell[flecks, :3] = BEARD_LIGHT
    cell[beard, 3] = 255

    # Hoodie: the jacket's teal plus the cream shirt, with darker teal stripes.
    below_head = yy > face_bottom - 1
    teal = solid & (hue > 0.42) & (hue < 0.56) & (sat > 0.35) & (val > 0.25) & below_head
    labels, sizes = components(teal)
    jacket = np.isin(labels, [n for n in range(1, len(sizes)) if sizes[n] >= 15 * L * L])
    if px > 1:
        jacket &= yy < top + (bottom - top) * 0.72  # his trainers are teal too
    # The shirt's shading runs into orange, so a patch counts as shirt only when it holds some
    # pale cream and sits against the jacket; his hands are never pale.
    cream = solid & (hue > 0.08) & (hue < 0.2) & (sat > 0.08) & (sat < 0.8) & (val > 0.8) & below_head
    pale = solid & (sat < 0.5) & (val > 0.9)
    labels, sizes = components(cream & ~face)
    near_jacket = set(np.unique(labels[grow(jacket, round(6 * L)) & (labels > 0)]).tolist())
    keep = [n for n in near_jacket if n and (int((pale & (labels == n)).sum()) >= px * px or float(hue[labels == n].mean()) > 0.105)]
    cream = np.isin(labels, keep)
    if px > 1:
        # The big picture's shirt has thin orange folds; they go with it, but not his hands.
        orange = solid & (hue < 0.1) & (sat > 0.45) & ~face
        labels, sizes = components(orange)
        thin = np.isin(labels, [n for n in range(1, len(sizes)) if sizes[n] < 30 * px * px])
        cream |= thin & grow(cream, 2 * px)
    hoodie = jacket | cream
    light = (rgb.sum(axis=2) / 3)
    if px > 1:
        # The big picture's jacket is textured; shade from its smoothed lightness so the teal
        # comes out in clean bands instead of speckles.
        from PIL import ImageFilter
        lum = Image.fromarray(light.clip(0, 255).astype(np.uint8), 'L').filter(ImageFilter.BoxBlur(px * 2))
        light = np.asarray(lum).astype(np.float32)
    level = np.clip((light - 40) / 160, 0, 1)
    base = np.where((level > 0.72)[..., None], TEAL_LIGHT, np.where((level > 0.35)[..., None], TEAL, TEAL_DARK))
    hoodie_rows = np.where(hoodie.any(axis=1))[0]
    start = hoodie_rows[0] if len(hoodie_rows) else 0
    wobble = ((bx // 5) % 2)
    stripe = ((by - start // px + wobble) % 5 < 2)
    colour = np.where(stripe[..., None], np.where((level > 0.35)[..., None], TEAL_DARK, TEAL_SHADOW), base)
    cell[hoodie, :3] = colour[hoodie]

    # Trousers: violet navy to charcoal, keeping each pixel's lightness.
    trousers = solid & (hue > 0.6) & (hue < 0.86) & (sat > 0.2) & (val > 0.14) & (val < 0.55) & (yy > face_bottom + 8 * L)
    grey = (rgb[..., 0] * 0.3 + rgb[..., 1] * 0.45 + rgb[..., 2] * 0.25) * 1.12 + 8
    charcoal = np.stack([grey, grey, grey * 1.08], axis=-1).clip(0, 255)
    cell[trousers, :3] = charcoal[trousers].astype(np.uint8)
    return cell


def main():
    meta = json.loads(META.read_text())
    sheet = np.asarray(Image.open(SOURCE).convert('RGBA')).copy()
    out = sheet.copy()
    for name, f in meta['frames'].items():
        x, y, w, h = f['x'], f['y'], f['w'], f['h']
        out[y:y + h, x:x + w] = repaint(sheet[y:y + h, x:x + w])
    Image.fromarray(out, 'RGBA').save(ATLAS, optimize=True)
    print(f'hero atlas repainted: {len(meta["frames"])} frames -> {ATLAS.relative_to(ROOT)}')

    # The title screen's big running hero: about six times the sprite, in four-pixel blocks, with
    # room added above and behind for the afro.
    title = Image.open(TITLE_SOURCE).convert('RGBA')
    pad = Image.new('RGBA', (title.width + 40, title.height + 120))
    pad.alpha_composite(title, (40, 120))
    done = Image.fromarray(repaint(np.asarray(pad), L=6, px=4), 'RGBA')
    done = done.crop(done.getbbox())
    done.save(TITLE, 'WEBP', lossless=True, method=6)
    print(f'title hero repainted: {done.width} x {done.height} -> {TITLE.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
