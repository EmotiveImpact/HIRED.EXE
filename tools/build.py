"""Build the editable static site and two offline HTML editions. Python stdlib only."""
from pathlib import Path
import base64
import hashlib
import json
import mimetypes
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
DIST.mkdir(exist_ok=True)

def data_uri(path):
    mime = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

meta_paths = {
    'hero':'assets/production/characters/hero-atlas.json',
    'enemies':'assets/production/enemies/enemy-atlas.json',
    'terrain':'assets/production/environment/terrain-atlas.json',
    'props':'assets/production/environment/props-atlas.json'
}
meta = {k:json.loads((ROOT/p).read_text()) for k,p in meta_paths.items()}
(ROOT/'src/assets.js').write_text('globalThis.HIRED_ASSET_META = '+json.dumps(meta,separators=(',',':'))+';\n')

runtime_paths = {v['image'] for v in meta.values()}
runtime_paths.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets/production/backgrounds').glob('*.webp'))
runtime_paths.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets/production/enemies/icons').glob('*.png'))
runtime_paths.add('assets/production/characters/portrait-reference.png')
for path in runtime_paths:
    if not (ROOT/path).is_file():
        raise FileNotFoundError(path)
runtime_map = {p:data_uri(ROOT/p) for p in sorted(runtime_paths)}

def bind_static_images(html, mapping, symbol):
    def repl(match):
        path=match.group(1)
        if path not in mapping:
            return match.group(0)
        return 'src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" data-inline-src="'+path+'"'
    icon = 'assets/production/enemies/icons/terminal.png'
    html=html.replace(f'<link rel="icon" href="{icon}">', f'<link rel="icon" href="{mapping[icon]}">')
    html=re.sub(r'src="((?:assets|references)/[^"<>]+)"',repl,html)
    bootstrap='''\n<script>
globalThis.SYMBOL = MAPPING;
document.querySelectorAll('[data-inline-src]').forEach(el=>{el.src=globalThis.SYMBOL[el.dataset.inlineSrc];});
document.querySelectorAll('[data-zoom]').forEach(el=>{el.dataset.zoom=globalThis.SYMBOL[el.dataset.zoom]||el.dataset.zoom;});
document.querySelectorAll('a[href^="assets/"]').forEach(el=>{el.href=globalThis.SYMBOL[el.getAttribute('href')]||el.href;});
</script>\n'''.replace('SYMBOL',symbol).replace('MAPPING',json.dumps(mapping,separators=(',',':')))
    # Insert after markup and before any app code tries to read or draw images.
    script_pos=html.find('<script')
    return html[:script_pos]+bootstrap+html[script_pos:]

game_html=(ROOT/'index.html').read_text()
game_html=game_html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+(ROOT/'styles.css').read_text()+'\n</style>')
game_html=bind_static_images(game_html,runtime_map,'HIRED_EMBEDDED_ASSETS')
game_html=re.sub(r'<script src="([^"]+)"></script>',lambda m:'<script>\n'+(ROOT/m.group(1)).read_text().replace('</script','<\\/script')+'\n</script>',game_html)
game_html=game_html.replace('href="art-book.html"','href="HIRED-EXE-v0.4-ART-BOOK.html"')
(DIST/'HIRED-EXE-v0.4-PLAY.html').write_text(game_html)

art_html=(ROOT/'art-book.html').read_text()
art_paths={path for path in runtime_paths if not path.endswith('.webp')}
art_paths.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets/production/backgrounds').glob('*.png'))
for folder in ['references','assets/previews']:
    art_paths.update(str(p.relative_to(ROOT)) for p in (ROOT/folder).glob('*') if p.suffix.lower() in ['.png','.jpg','.webp'])
art_map={p:data_uri(ROOT/p) for p in sorted(art_paths)}
art_html=bind_static_images(art_html,art_map,'HIRED_ART_ASSETS')
art_html=art_html.replace('image.src = src; button.dataset.zoom = src;', 'image.src = globalThis.HIRED_ART_ASSETS?.[src] || src; button.dataset.zoom = globalThis.HIRED_ART_ASSETS?.[src] || src;')
art_html=art_html.replace("atlas.src = 'assets/production/characters/hero-atlas.png';", "atlas.src = globalThis.HIRED_ART_ASSETS?.['assets/production/characters/hero-atlas.png'] || 'assets/production/characters/hero-atlas.png';")
art_html=art_html.replace('href="index.html"','href="HIRED-EXE-v0.4-PLAY.html"')
def local_download(match):
    path=ROOT/match.group(1)
    if not path.is_file():
        raise FileNotFoundError(path)
    return 'href="'+data_uri(path)+'" download="'+path.name+'"'
# The catalogue's JSON buttons must work when this HTML is downloaded alone,
# just like its Markdown notes. Images are handled by the inline asset map.
art_html=re.sub(r'href="((?:docs/[^"<>]+)|(?:assets/[^"<>]+\.json))"',local_download,art_html)
(DIST/'HIRED-EXE-v0.4-ART-BOOK.html').write_text(art_html)

# The multi-file site is deliberately also kept: it is easier to edit and review.
for name in ['index.html','styles.css','art-book.html']:
    shutil.copy2(ROOT/name,DIST/name)
for name in ['src','assets','docs','references']:
    shutil.copytree(ROOT/name,DIST/name,dirs_exist_ok=True)

manifest=[]
for p in sorted((ROOT/'assets').rglob('*')):
    if p.is_file():
        rel=str(p.relative_to(ROOT))
        role='approved-reference' if '/reference/' in rel else 'concept' if '/concepts/' in rel else 'runtime-preview' if '/previews/' in rel else 'generated-source' if '/source/' in rel or p.stem.endswith(('-source','-cutout')) else 'production-asset'
        manifest.append({'path':rel,'role':role,'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ROOT/'docs/ASSET-MANIFEST.json').write_text(json.dumps({'format':1,'assets':manifest},indent=2)+'\n')
shutil.copy2(ROOT/'docs/ASSET-MANIFEST.json',DIST/'docs/ASSET-MANIFEST.json')
for name in ['HIRED-EXE-v0.4-PLAY.html','HIRED-EXE-v0.4-ART-BOOK.html']:
    p=DIST/name
    print(f'{name}: {p.stat().st_size/1048576:.1f} MiB')
print(f'Static site: {DIST}/index.html; {len(runtime_paths)} embedded runtime images; {len(manifest)} asset entries.')
