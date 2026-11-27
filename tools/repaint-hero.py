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


def repaint(cell):
    cell = cell.copy()
    alpha = cell[..., 3]
    solid = alpha > 160
    hue, sat, val = classes(cell)
    rgb = cell[..., :3].astype(np.int32)
    yy, xx = np.mgrid[0:cell.shape[0], 0:cell.shape[1]]

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
    labels, sizes = components(skin & (yy < hair_top + 32))
    near = grow(hair, 3)
    best, face = 0, None
    for n in range(1, len(sizes)):
        touch = int((near & (labels == n)).sum())
        if touch > best and sizes[n] > 25:
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
    radius = face_w * 1.1 + 1
    cx = face_cx - face_w * 0.22
    cy = min(face_top + 1, hair_top + radius * 0.82)
    cy = max(cy, radius / 1.06 + 2)  # room above, or the cell edge flattens the crown
    angle = np.arctan2(yy - cy, xx - cx)
    bumps = 1.1 * np.sin(angle * 11) + 0.6 * np.sin(angle * 5 + 1.3)
    inside = np.hypot((xx - cx) * 1.0, (yy - cy) * 1.06) <= radius + bumps
    # In front of the face it stops at the forehead; behind, at the ear.
    # The front curves down into the forehead instead of jutting out like a cap's brim.
    front = xx > face_cx + face_w * 0.05
    inside &= ~(front & (yy > eye_line - 2 - (xx - face_cx - face_w * 0.05) * 0.9))
    inside &= xx <= face_right
    inside &= yy < face_top + (face_bottom - face_top) * 0.72
    paintable = (alpha < 100) | hair | (dark & (yy < eye_line))
    afro = inside & paintable & ~skin & ~eye
    afro |= hair

    # Curls: short light dashes in staggered rows, more of them towards the top left.
    shade = (xx - cx) * 0.6 + (yy - cy)
    u, v = (xx + ((yy // 4) % 2) * 2) % 4, yy % 4
    curl = ((u == 0) & (v == 1)) | ((u == 1) & (v == 0)) | ((u == 2) & (v == 0)) | ((u == 3) & (v == 1))
    curl &= ((xx // 4 + yy // 4) % 3 != 0)
    shine = curl & (shade < -radius * 0.45) & ((xx + yy) % 3 == 0)
    edge = afro & ~grow(~afro, 1)
    colour = np.where(curl[..., None], AFRO_LIGHT, AFRO)
    colour = np.where(shine[..., None], AFRO_SHINE, colour)
    cell[afro, :3] = colour[afro]
    cell[afro, 3] = 255
    rim = afro & grow(~afro & (alpha < 100), 1)
    cell[rim, :3] = OUTLINE

    # Beard: the dark pixels on the lower face go black, and it fills out by a pixel along the
    # jaw and two under the chin.
    lower = (yy > eye_line + 2) & (yy <= face_bottom + 2) & (xx >= face_left - 1) & (xx <= face_right + 1)
    beard = lower & solid & (dark | ((hue > 0.9) & (val < 0.5))) & ~afro
    jaw = skin & (yy > face_bottom - 4) & grow(beard, 1) & ~grow(eye, 1)
    chin = (alpha < 100) & grow(beard & (yy >= face_bottom - 1), 2) & (yy > face_bottom) & (yy <= face_bottom + 2)
    beard |= jaw | chin
    flecks = beard & ((xx * 3 + yy * 5) % 7 == 0)
    cell[beard, :3] = BEARD
    cell[flecks, :3] = BEARD_LIGHT
    cell[beard, 3] = 255

    # Hoodie: the jacket's teal plus the cream shirt, with darker teal stripes.
    below_head = yy > face_bottom - 1
    teal = solid & (hue > 0.42) & (hue < 0.56) & (sat > 0.35) & (val > 0.25) & below_head
    labels, sizes = components(teal)
    jacket = np.isin(labels, [n for n in range(1, len(sizes)) if sizes[n] >= 15])
    # The shirt's shading runs into orange, so a patch counts as shirt only when it holds some
    # pale cream and sits against the jacket; his hands are never pale.
    cream = solid & (hue > 0.08) & (hue < 0.2) & (sat > 0.08) & (sat < 0.8) & (val > 0.8) & below_head
    pale = solid & (sat < 0.5) & (val > 0.9)
    labels, sizes = components(cream & ~face)
    near_jacket = set(np.unique(labels[grow(jacket, 6) & (labels > 0)]).tolist())
    keep = [n for n in near_jacket if n and (int((pale & (labels == n)).sum()) >= 1 or float(hue[labels == n].mean()) > 0.105)]
    cream = np.isin(labels, keep)
    hoodie = jacket | cream
    light = (rgb.sum(axis=2) / 3)
    level = np.clip((light - 40) / 160, 0, 1)
    base = np.where((level > 0.72)[..., None], TEAL_LIGHT, np.where((level > 0.35)[..., None], TEAL, TEAL_DARK))
    hoodie_rows = np.where(hoodie.any(axis=1))[0]
    start = hoodie_rows[0] if len(hoodie_rows) else 0
    wobble = ((xx // 5) % 2)
    stripe = ((yy - start + wobble) % 5 < 2)
    colour = np.where(stripe[..., None], np.where((level > 0.35)[..., None], TEAL_DARK, TEAL_SHADOW), base)
    cell[hoodie, :3] = colour[hoodie]

    # Trousers: violet navy to charcoal, keeping each pixel's lightness.
    trousers = solid & (hue > 0.6) & (hue < 0.86) & (sat > 0.2) & (val > 0.14) & (val < 0.55) & (yy > face_bottom + 8)
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


if __name__ == '__main__':
    main()
