"""Make the Art Book's web-sized pictures and thumbnails. Needs Pillow.

The four concept boards in references/ stay untouched; the Art Book window shows
a WebP copy of each and links the original. Every picture in the book gets a
small thumbnail for the contents page. Run after changing a picture:

    python3 tools/build-art-book.py
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/art-book'
THUMB = (176, 112)

# Concept board copies: name in the book, original it is made from.
BOARDS = {
    'concept-alley': 'references/approved-gameplay-target.png',
    'concept-augustus': 'references/augustus-character-concepts.png',
    'concept-environment': 'references/environment-concepts.png',
    'concept-enemies': 'references/enemies-hud-concepts.png',
}
# Thumbnail name, picture the Art Book shows. Keep in step with PICTURES in src/art-book.js.
PICTURES = {
    **{name: f'assets/art-book/{name}.webp' for name in BOARDS},
    'world-alley': 'assets/production/backgrounds/application-alley.webp',
    'world-city': 'assets/production/backgrounds/ship-it-city.webp',
    'world-growth': 'assets/production/backgrounds/growth-run.webp',
    'world-hq': 'assets/production/backgrounds/interview-hq.webp',
    **{f'play-{i}': f'assets/art-book/play-{i}.webp' for i in range(1, 5)},
    'sprites-augustus': 'assets/production/characters/hero-atlas.png',
    'sprites-enemies': 'assets/production/enemies/enemy-atlas.png',
    'sprites-terrain': 'assets/production/environment/terrain-atlas.png',
    'sprites-props': 'assets/production/environment/props-atlas.png',
    'sprites-furniture': 'assets/production/environment/furniture-atlas.png',
}

(OUT / 'thumbs').mkdir(parents=True, exist_ok=True)
for name, source in BOARDS.items():
    Image.open(ROOT / source).convert('RGB').save(OUT / f'{name}.webp', 'WEBP', quality=90, method=6)
for name, source in PICTURES.items():
    picture = Image.open(ROOT / source)
    picture = picture.convert('RGBA' if picture.mode in ('RGBA', 'LA', 'P') else 'RGB')
    # Sprite sheets are small pixel art: keep their edges hard. Paintings shrink smoothly.
    sheet = name.startswith('sprites-')
    picture.thumbnail(THUMB, Image.NEAREST if sheet and picture.width <= THUMB[0] * 2 else Image.LANCZOS)
    picture.save(OUT / 'thumbs' / f'{name}.webp', 'WEBP', quality=82, method=6)
    print(f'{name}: {Image.open(ROOT / source).size} from {source}')
