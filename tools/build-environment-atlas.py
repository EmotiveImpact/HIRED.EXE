"""Pack generated RGBA artwork into deterministic game atlas cells.

Only crops and nearest-neighbour scaling are applied; artwork remains in assets/source.
Run from any directory. Requires Pillow, used for build tooling only.
"""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/production/environment'
OUT.mkdir(parents=True, exist_ok=True)
TILES = ['grass','grass_flower','brick','vine','hazard','metal','brick_metal','vent',
         'neon','tech','magenta','window','stone_gold','stone','stone_ivy','glass']
PROPS = ['cafe','tree','pink_tree','arch','career_block','crate','terminal','ladder',
         'grass_platform','metal_platform','neon_platform','stone_platform',
         'banner','satellite','lamp','portal']

def pack(kind, names, cell, is_tile=False):
    im = Image.open(ROOT / f'assets/source/{kind}-generated.png').convert('RGBA')
    canvas = Image.new('RGBA', (4*cell, 4*cell))
    meta = {'image': f'assets/production/environment/{kind}-atlas.png',
            'size': list(canvas.size), 'cell': [cell,cell], 'frames': {},
            'source': f'assets/source/{kind}-generated.png'}
    for i, name in enumerate(names):
        col, row = i%4, i//4
        # Generated sheets are visually regular, not a guaranteed pixel grid.
        # These inspected source bands exclude the neighbouring row's taller props.
        row_bands = [(0,320),(345,620),(645,850),(870,1254)] if not is_tile else [(0,320),(340,620),(635,915),(925,1254)]
        x_edges = [0,325,630,940,1254] if not is_tile else [0,314,627,941,1254]
        bounds = (x_edges[col],row_bands[row][0],x_edges[col+1],row_bands[row][1])
        crop = im.crop(bounds)
        box = crop.getchannel('A').point(lambda x: 255 if x>32 else 0).getbbox()
        if not box:
            raise ValueError(f'Empty source cell: {name}')
        art = crop.crop(box)
        if is_tile:
            art = art.resize((cell,cell), Image.Resampling.NEAREST)
            px, py = col*cell, row*cell
        else:
            scale = (cell-16)/max(art.size)
            art = art.resize((max(1,round(art.width*scale)),max(1,round(art.height*scale))), Image.Resampling.NEAREST)
            px = col*cell + (cell-art.width)//2
            py = row*cell + cell-8-art.height
        canvas.alpha_composite(art,(px,py))
        meta['frames'][name] = {'x':px,'y':py,'w':art.width,'h':art.height,
              'anchor':[art.width/2,art.height],
              'sourceRect':[bounds[0]+box[0],bounds[1]+box[1],bounds[0]+box[2],bounds[1]+box[3]]}
    canvas.save(OUT / f'{kind}-atlas.png', optimize=True)
    (OUT / f'{kind}-atlas.json').write_text(json.dumps(meta,indent=2)+'\n')
    print(f'{kind}: {len(names)} frames in {canvas.width} x {canvas.height}')

pack('terrain', TILES, 96, True)
pack('props', PROPS, 192)
