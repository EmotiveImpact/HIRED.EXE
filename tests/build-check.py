"""Offline structural checks for the static site and standalone editions.

Run after `python3 tools/build.py`: `python3 tests/build-check.py`.
Uses Python's standard library and Node's vm.Script parser. Does not launch a
browser, execute application scripts, mock the DOM or make network requests.
"""
from __future__ import annotations

import base64
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
IMAGE_SUFFIXES = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
COMPANIONS = {
    'HIRE-EXE-v0.4-PLAY.html': {'HIRE-EXE-v0.4-ART-BOOK.html'},
    'HIRE-EXE-v0.4-ART-BOOK.html': {'HIRE-EXE-v0.4-PLAY.html'},
}


class Page(HTMLParser):
    def __init__(self, path: Path):
        super().__init__(convert_charrefs=True)
        self.path = path
        self.source = path.read_text()
        self.scripts: list[dict[str, str]] = []
        self.styles: list[str] = []
        self.elements: list[tuple[str, dict[str, str]]] = []
        self.script: dict[str, str] | None = None
        self.style: list[str] | None = None
        self.feed(self.source)
        self.close()

    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        self.elements.append((tag, attr))
        if tag == 'script':
            self.script = {'src': attr.get('src', ''), 'text': ''}
        elif tag == 'style':
            self.style = []

    def handle_endtag(self, tag):
        if tag == 'script' and self.script is not None:
            self.scripts.append(self.script)
            self.script = None
        elif tag == 'style' and self.style is not None:
            self.styles.append(''.join(self.style))
            self.style = None

    def handle_data(self, text):
        if self.script is not None:
            self.script['text'] += text
        elif self.style is not None:
            self.style.append(text)


def unpack_data(value: str) -> tuple[str, bytes]:
    assert value.startswith('data:'), 'Expected an embedded data URI'
    header, payload = value.split(',', 1)
    mime = header[5:].split(';')[0]
    assert ';base64' in header, f'Non-base64 embedded payload: {mime}'
    raw = base64.b64decode(payload, validate=True)
    assert raw, f'Empty embedded payload: {mime}'
    signatures = {
        'image/png': raw.startswith(b'\x89PNG\r\n\x1a\n'),
        'image/jpeg': raw.startswith(b'\xff\xd8\xff') and raw.endswith(b'\xff\xd9'),
        'image/gif': raw.startswith((b'GIF87a', b'GIF89a')),
        'image/webp': raw.startswith(b'RIFF') and raw[8:12] == b'WEBP',
    }
    if mime.startswith('image/'):
        assert signatures.get(mime, False), f'Invalid {mime} magic bytes'
    elif mime == 'application/pdf':
        assert raw.startswith(b'%PDF-'), 'Invalid PDF magic bytes'
    elif mime == 'application/json':
        json.loads(raw)
    else:
        raw.decode('utf-8')
    return mime, raw


def extract_assignment(page: Page, symbol: str):
    match = re.search(r'globalThis\.' + re.escape(symbol) + r'\s*=\s*', page.source)
    assert match, f'{page.path.name}: missing {symbol}'
    return json.JSONDecoder().raw_decode(page.source[match.end():])[0]


def relative_target(value: str):
    if not value or value.startswith(('#', 'data:')):
        return None
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None
    return unquote(parsed.path)


def check_local_references(page: Page):
    checked = 0
    for tag, attrs in page.elements:
        for attr in ('src', 'href', 'data-zoom', 'data-inline-src'):
            value = attrs.get(attr)
            if not value:
                continue
            target = relative_target(value)
            if target:
                assert (page.path.parent / target).is_file(), f'{page.path.name}: missing {attr}={target}'
                checked += 1
    return checked


def check_styles(page: Page, standalone: bool):
    styles = list(page.styles)
    for tag, attrs in page.elements:
        if tag == 'link' and attrs.get('rel') == 'stylesheet':
            assert not standalone, f'{page.path.name}: external stylesheet remains'
            target = relative_target(attrs.get('href', ''))
            assert target, f'{page.path.name}: remote stylesheet dependency'
            styles.append((page.path.parent / target).read_text())
    for css in styles:
        assert not re.search(r'@import\b', css, re.I), f'{page.path.name}: imported stylesheet'
        for match in re.finditer(r'url\(\s*[\'\"]?([^\)\'\"]+)', css, re.I):
            value = match.group(1).strip()
            if value.startswith('data:'):
                unpack_data(value)
            elif value.startswith('#'):
                continue
            else:
                assert not standalone, f'{page.path.name}: non-embedded CSS resource {value}'
                target = relative_target(value)
                assert target and (page.path.parent / target).is_file(), f'{page.path.name}: missing CSS resource {value}'


def expected_images():
    metadata = {}
    for name, path in {
        'hero': 'assets/production/characters/hero-atlas.json',
        'enemies': 'assets/production/enemies/enemy-atlas.json',
        'terrain': 'assets/production/environment/terrain-atlas.json',
        'props': 'assets/production/environment/props-atlas.json',
        'furniture': 'assets/production/environment/furniture-atlas.json',
        'feed': 'assets/production/enemies/feed-atlas.json',
    }.items():
        metadata[name] = json.loads((ROOT / path).read_text())
    runtime = {entry['image'] for entry in metadata.values()}
    runtime.update(entry['body']['image'] for entry in metadata.values() if 'body' in entry)
    for folder, pattern in [('assets/production/backgrounds', '*.webp'), ('assets/production/enemies/icons', '*.png')]:
        runtime.update(str(p.relative_to(ROOT)) for p in (ROOT / folder).glob(pattern))
    runtime.add('assets/production/characters/portrait-reference.png')
    runtime.add('assets/production/story/manga-panels.webp')
    runtime.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets/directors-board').rglob('*.webp'))
    runtime.update(str(p.relative_to(ROOT)) for p in (ROOT / 'assets/production/story/panels-v2').glob('*.jpg'))
    gallery = {path for path in runtime if not path.endswith('.webp') and '/story/panels-v2/' not in path}
    gallery.update(str(p.relative_to(ROOT)) for p in (ROOT/'assets/production/backgrounds').glob('*.png'))
    for folder in ('references', 'assets/previews'):
        gallery.update(str(p.relative_to(ROOT)) for p in (ROOT / folder).iterdir() if p.suffix.lower() in IMAGE_SUFFIXES)
    return runtime, gallery, metadata


def check_bundle(page: Page, symbol: str, expected: set[str]):
    mapping = extract_assignment(page, symbol)
    assert set(mapping) == expected, f'{page.path.name}: embedded inventory differs: {set(mapping) ^ expected}'
    for path, value in mapping.items():
        mime, raw = unpack_data(value)
        assert mime.startswith('image/'), f'{path}: expected an embedded image'
        assert raw == (ROOT / path).read_bytes(), f'{path}: embedded bytes differ from source'
    navigation = set()
    downloads = []
    static_images = 0
    for tag, attrs in page.elements:
        src = attrs.get('src', '')
        if src:
            assert src.startswith('data:'), f'{page.path.name}: external src={src}'
            unpack_data(src)
            static_images += tag == 'img'
        inline_path = attrs.get('data-inline-src')
        if inline_path:
            assert inline_path in mapping, f'{page.path.name}: unresolved inline image {inline_path}'
        zoom = attrs.get('data-zoom')
        if zoom:
            assert zoom in mapping or zoom.startswith('data:'), f'{page.path.name}: unresolved zoom {zoom}'
        href = attrs.get('href', '')
        if href.startswith('data:'):
            mime, _ = unpack_data(href)
            if tag == 'link' and attrs.get('rel') == 'icon':
                assert mime.startswith('image/'), 'Invalid embedded favicon'
                continue
            assert attrs.get('download'), f'{page.path.name}: embedded file link is not downloadable'
            downloads.append(attrs['download'])
        elif (target := relative_target(href)):
            assert target in COMPANIONS[page.path.name], f'{page.path.name}: non-embedded companion link {target}'
            assert (DIST / target).is_file(), f'Missing companion {target}'
            navigation.add(target)
    check_styles(page, standalone=True)
    assert all(not script['src'] for script in page.scripts), f'{page.path.name}: external scripts remain'
    return {'images': len(mapping), 'static_image_elements': static_images,
            'inline_scripts': len(page.scripts), 'download_links': len(downloads),
            'unique_downloads': sorted(set(downloads)), 'companion_navigation': sorted(navigation)}


def main():
    runtime, gallery, metadata = expected_images()
    play = Page(DIST / 'HIRE-EXE-v0.4-PLAY.html')
    art = Page(DIST / 'HIRE-EXE-v0.4-ART-BOOK.html')
    report = {
        'game': check_bundle(play, 'HIRED_EMBEDDED_ASSETS', runtime),
        'art_book': check_bundle(art, 'HIRED_ART_ASSETS', gallery),
    }
    pdf = 'assets/cv/Augustus-Edem-CV.pdf'
    cv_mime, cv_bytes = unpack_data(extract_assignment(play, 'HIRED_EMBEDDED_CV'))
    assert cv_mime == 'application/pdf' and cv_bytes == (ROOT / pdf).read_bytes(), 'Embedded CV is stale'
    assert (DIST / pdf).read_bytes() == cv_bytes, 'Published CV differs from the standalone download'
    assert extract_assignment(play, 'HIRED_ASSET_META') == metadata, 'Embedded atlas metadata is stale'
    # The desktop's four system sounds are embedded whole, and the site publishes the same files.
    sounds = extract_assignment(play, 'HIRED_EMBEDDED_SOUNDS')
    assert set(sounds) == {f'assets/sounds/windows31/{name}.wav' for name in ('tada', 'chimes', 'chord', 'ding')}, 'System sounds missing'
    for path, value in sounds.items():
        header, payload = value.split(',', 1)
        raw = base64.b64decode(payload, validate=True)
        assert header.startswith('data:audio/') and raw[:4] == b'RIFF' and raw[8:12] == b'WAVE', f'{path}: not a WAV'
        assert raw == (ROOT / path).read_bytes() == (DIST / path).read_bytes(), f'{path}: embedded sound differs from source'
    report['game']['sounds'] = len(sounds)

    # Check literal runtime image URLs and the complete enumerated background set.
    runtime_literals = set()
    # assets.js also records generated-source provenance; those source plates
    # are not requested by the runtime renderer and need not be embedded here.
    for path in (ROOT / 'src/app.js', ROOT / 'src/renderer.js'):
        runtime_literals.update(re.findall(r'[\'\"](assets/[^\'\"\n]+\.(?:png|jpg|jpeg|webp|gif))[\'\"]', path.read_text()))
    assert runtime_literals <= runtime, f'Runtime image paths absent from map: {runtime_literals - runtime}'
    assert 'HIRED_EMBEDDED_ASSETS?.[path] || path' in play.source, 'Runtime asset lookup missing'

    assert 'image.src = globalThis.HIRED_ART_ASSETS?.[src] || src;' in art.source, 'Dynamic world image is not mapped'
    assert 'button.dataset.zoom = globalThis.HIRED_ART_ASSETS?.[src] || src;' in art.source, 'Dynamic world zoom is not mapped'
    assert "atlas.src = globalThis.HIRED_ART_ASSETS?.['assets/production/characters/hero-atlas.png']" in art.source, 'Animated hero atlas is not mapped'
    assert "el.dataset.zoom=globalThis.HIRED_ART_ASSETS[el.dataset.zoom]" in art.source, 'Static gallery zoom is not mapped'
    for i in range(1, 5):
        assert f'assets/previews/world-{i}.jpg' in gallery, f'Actual world capture {i} missing'
    for slug in ('application-alley', 'ship-it-city', 'growth-run', 'interview-hq'):
        assert f'assets/production/backgrounds/{slug}.webp' in runtime, f'World background {slug} missing'
    assert len([name for name in report['art_book']['unique_downloads'] if name.endswith('.json')]) == 4, 'Four atlas JSON downloads must be embedded'

    sources = []
    checked_references = 0
    for path in (folder / name for folder in (ROOT, DIST) for name in ('index.html', 'art-book.html', 'cv.html')):
        page = Page(path)
        checked_references += check_local_references(page)
        check_styles(page, standalone=False)
        for i, script in enumerate(page.scripts):
            if script['src']:
                target = relative_target(script['src'])
                assert target, f'{path.name}: remote script dependency'
                code = (path.parent / target).read_text()
                filename = str(path.parent / target)
            else:
                code, filename = script['text'], str(path) + f':inline-{i + 1}'
            sources.append({'filename': filename, 'code': code})
    for page in (play, art):
        for i, script in enumerate(page.scripts):
            sources.append({'filename': page.path.name + f':inline-{i + 1}', 'code': script['text']})
    node = shutil.which('node')
    assert node, 'Node is required for JavaScript syntax verification'
    parser = "const fs=require('fs'),vm=require('vm');const entries=JSON.parse(fs.readFileSync(0,'utf8'));for(const e of entries)new vm.Script(e.code,{filename:e.filename});process.stdout.write(JSON.stringify({parsed:entries.length}));"
    result = subprocess.run([node, '-e', parser], input=json.dumps(sources), text=True, capture_output=True, check=True)
    report['javascript_scripts_parsed'] = json.loads(result.stdout)['parsed']
    report['relative_source_references_checked'] = checked_references
    report['actual_jpeg_captures'] = 4
    report['scope'] = 'Offline structure, syntax and embedded bytes only; no browser execution or visual revalidation.'
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
