"""Write src/cv-text.js (CV.TXT in Notepad) from cv.html, so the two never drift apart.

Run after any change to cv.html: `python3 tools/cv-text.py`.
`python3 tools/cv-text.py --check` exits non-zero when src/cv-text.js is out of date.
"""
import re
import sys
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'cv.html'
TARGET = ROOT / 'src' / 'cv-text.js'

# Reading order for plain text: each page's main column, then its sidebar, with the close last.
ORDER = ['abnormal', 'profile', 'live', 'how', 'experience', 'works',
         'tools', 'links', 'range', 'practical', 'education', 'next']

HEADER = """// CV.TXT, the plain text version of the CV that opens in Notepad on the desktop.
// Generated from cv.html by tools/cv-text.py: edit cv.html, then run that script.
globalThis.HIRED_CV_TXT = `"""


def text(node):
    """Visible text with the page's curly apostrophes made plain for Notepad."""
    t = node.get_text(' ', strip=True) if hasattr(node, 'get_text') else str(node)
    t = re.sub(r'\s+', ' ', t).replace('’', "'").replace('‘', "'").replace('×', 'x')
    return re.sub(r' ([.,:;])', r'\1', t)


def join(items):
    return ', '.join(items)


def section(sec):
    h2 = sec.find('h2')
    lines = [text(h2).upper(), '']
    for child in sec.find_all(recursive=False):
        if child.name == 'h2':
            continue
        if child.name == 'article':
            h3 = child.find('h3')
            if h3:
                name, _, what = text(h3).partition(' | ')
                sep = ', ' if sec.get('aria-labelledby') == 'experience' else ': '
                lines.append(name + (sep + what if what else ''))
            for p in child.find_all('p'):
                if 'cta' in p.get('class', []):
                    lines.append('')
                lines.append(text(p))
            lines.append('')
        elif child.name == 'div' and 'group' in child.get('class', []):
            label = text(child.find(class_='label'))
            lines.append(f"{label}: {join([text(li) for li in child.find_all('li')])}.")
        elif child.name == 'p' and 'item' in child.get('class', []):
            b = child.find('b')
            label = text(b)
            b.extract()
            lines.append(f'{label}: {text(child)}')
        elif child.name == 'p':
            lines.append(text(child))
            nxt = child.find_next_sibling()
            if nxt is not None and nxt.name == 'article':
                lines.append('')
    while lines and lines[-1] == '':
        lines.pop()
    return '\n'.join(lines)


def build():
    soup = BeautifulSoup(SOURCE.read_text(encoding='utf-8'), 'html.parser')
    header = soup.find('header')
    contact = [text(c) for c in header.find(class_='contact').find_all(recursive=False)]
    parts = [text(header.find('h1')).upper(), text(header.find(class_='role')), ' | '.join(contact)]
    sections = {s['aria-labelledby']: s for s in soup.find_all('section')}
    missing = [k for k in ORDER if k not in sections] + [k for k in sections if k not in ORDER]
    if missing:
        raise SystemExit(f'cv-text.py: sections out of step with ORDER: {missing}')
    body = '\n\n\n'.join(section(sections[k]) for k in ORDER)
    out = '\n'.join(parts) + '\n\n\n' + body + '\n'
    if '`' in out or '${' in out:
        raise SystemExit('cv-text.py: the CV text contains characters a template literal cannot hold')
    return HEADER + out + '`;\n'


if __name__ == '__main__':
    generated = build()
    if '--check' in sys.argv:
        if TARGET.read_text(encoding='utf-8') != generated:
            raise SystemExit('src/cv-text.js is out of date: run python3 tools/cv-text.py')
        print('src/cv-text.js matches cv.html')
    else:
        TARGET.write_text(generated, encoding='utf-8')
        print(f'Wrote {TARGET.relative_to(ROOT)}')
