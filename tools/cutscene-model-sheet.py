"""Rebuild a cutscene reference sheet from the game's own art. Needs Pillow and DejaVu fonts. Usage: python3 THIS.py out.png"""
from PIL import Image, ImageDraw, ImageFont
import sys
from pathlib import Path
R = str(Path(__file__).resolve().parents[1]) + '/'
OUT = sys.argv[1]
W, H = 2400, 1620
BG = '#EEEAFB'; INK = '#251A43'; BLUE = '#173AC3'; CARD = '#FFFFFF'; MUTED = '#5B5486'
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans'
def font(s, b=False): return ImageFont.truetype(F + ('-Bold' if b else '') + '.ttf', s)
img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)

def card(x, y, w, h, title=None):
    d.rounded_rectangle((x+6, y+6, x+w+6, y+h+6), 14, fill='#CFC6F2')
    d.rounded_rectangle((x, y, x+w, y+h), 14, fill=CARD, outline=INK, width=3)
    if title:
        tw = d.textlength(title, font=font(26, True))
        d.rounded_rectangle((x+16, y-20, x+16+tw+36, y+20), 10, fill=BLUE, outline=INK, width=3)
        d.text((x+34, y-15), title, font=font(26, True), fill='white')

def paste_fit(src, box, pixel=False):
    x, y, w, h = box
    s = min(w / src.width, h / src.height)
    im = src.resize((max(1, int(src.width*s)), max(1, int(src.height*s))), Image.NEAREST if pixel else Image.LANCZOS)
    if im.mode == 'RGBA':
        img.paste(im, (x + (w-im.width)//2, y + (h-im.height)//2), im)
    else:
        img.paste(im, (x + (w-im.width)//2, y + (h-im.height)//2))
    return im

def frame(im_box):
    x, y, w, h = im_box; d.rectangle((x, y, x+w, y+h), outline=INK, width=3)

def text_block(x, y, lines, size=22, gap=8, width=None, bold_first=False, color=INK):
    f = font(size)
    for i, line in enumerate(lines):
        ff = font(size, True) if (bold_first and i == 0) else f
        words = line.split(' '); cur = ''
        for wd in words:
            t = (cur + ' ' + wd).strip()
            if width and d.textlength(t, font=ff) > width:
                d.text((x, y), cur, font=ff, fill=color); y += size + gap; cur = wd
            else: cur = t
        d.text((x, y), cur, font=ff, fill=color); y += size + gap
    return y

manga = Image.open(R+'assets/production/story/manga-panels.webp').convert('RGB')
atlas = Image.open(R+'assets/production/enemies/enemy-atlas.png').convert('RGBA')
hero = Image.open(R+'assets/production/characters/hero-atlas.png').convert('RGBA')
enemyc = Image.open(R+'references/enemies-hud-concepts.png').convert('RGB')
portrait = Image.open(R+'assets/production/characters/portrait-reference.png').convert('RGB')

# Title bar
d.rectangle((0, 0, W, 104), fill=BLUE); d.line((0, 104, W, 104), fill=INK, width=4)
d.text((40, 18), 'HIRE.EXE  /  CUTSCENE MODEL SHEET  v1', font=font(44, True), fill='white')
d.text((42, 70), 'Every new panel is drawn from this sheet. Everything on it is already in the game: nothing here is newly invented.', font=font(22), fill='#DCE3FF')

# ---- Augustus
ax, ay, aw, ah = 40, 150, 1150, 760
card(ax, ay, aw, ah, 'AUGUSTUS  /  THE ONE WHO MUST NEVER CHANGE')
faces = [(110, 0, 370, 260), (880, 0, 1140, 260), (860, 300, 1120, 560), (0, 300, 220, 560)]
fx = ax + 30
for i, c in enumerate(faces):
    b = (fx + i*272, ay + 44, 256, 256)
    paste_fit(manga.crop(c), b); frame(b)
d.text((ax+30, ay+310), 'Comic faces, cropped from the six panels already in the game', font=font(19), fill=MUTED)
# portrait + sprites row
b = (ax+30, ay+352, 230, 204); paste_fit(portrait, b); frame(b)
d.text((ax+30, ay+562), 'Approved portrait', font=font(19), fill=MUTED)
spr = [(0,0),(4,0),(3,2),(4,2)]
for i,(cx,cy) in enumerate(spr):
    cell = hero.crop((cx*80, cy*96, cx*80+80, cy*96+96))
    paste_fit(cell, (ax+290+i*150, ay+352, 140, 204), pixel=True)
d.text((ax+290, ay+562), 'In-game sprite: same outfit, same colours', font=font(19), fill=MUTED)
locks = ['Locked in every panel:',
 'Warm medium-brown skin. Short, dense, dark curly hair. Close, full beard. Big expressive brown eyes.',
 'Teal jacket worn open, sleeves pushed up. Cream T-shirt. Charcoal trousers. White and teal trainers.',
 'Teal backpack with an orange strap over his left shoulder.',
 'Same age, same build, same head size in every panel. No glasses, no hat, no jewellery.']
text_block(ax+30, ay+600, locks, size=21, gap=7, width=aw-60, bold_first=True)

# ---- Cast
cx0, cy0, cw, ch = 1230, 150, 1130, 760
card(cx0, cy0, cw, ch, 'THE CAST  /  IN-GAME DESIGNS, DRAWN IN THE SAME INK')
cast = [
 ('CV Filter', 'World 1 boss', enemyc.crop((212, 592, 358, 738)), False,
  'White and lilac robot, yellow siren light, cyan visor eyes, purple tie, blank chest plate.'),
 ('Scope Creep', 'World 2 boss', atlas.crop((128,128,256,256)), True,
  'Orange tracked machine, purple grabbing claws, yellow siren light, hazard stripes.'),
 ('The Algorithm', 'World 3 boss', atlas.crop((256,128,384,256)), True,
  'Floating lilac sphere, one big blue eye, ring of gold dots orbiting it.'),
 ('Final Review', 'World 4 boss', atlas.crop((384,128,512,256)), True,
  'White armoured robot, navy cape, gold trim, holds a glowing cyan folder.'),
 ('Interview host', 'Scene 5', manga.crop((900, 610, 1090, 860)), False,
  'Curly hair tied up, gold hoops, cream blouse, black trousers, warm smile.'),
]
colw = (cw - 40) // 5
for i, (name, role, im, px, desc) in enumerate(cast):
    x = cx0 + 20 + i*colw
    b = (x+8, cy0+50, colw-16, 260)
    d.rounded_rectangle((b[0], b[1], b[0]+b[2], b[1]+b[3]), 10, fill='#F6F3FF', outline='#CFC6F2', width=2)
    paste_fit(im, (b[0]+8, b[1]+8, b[2]-16, b[3]-16), pixel=px)
    d.text((x+8, cy0+326), name, font=font(24, True), fill=INK)
    d.text((x+8, cy0+358), role, font=font(19), fill=MUTED)
    text_block(x+8, cy0+392, [desc], size=19, gap=6, width=colw-24)
castnotes = ['Cast rules:',
 'No new characters. Nobody else appears in the background except blurred silhouettes.',
 'The bosses keep their exact shapes and colours from the game. They become comic-ink versions of themselves, never realistic robots.',
 'They have faces only where the sprite has one (visor, eye). Expressions come from eyes and posture.']
text_block(cx0+28, cy0+580, castnotes, size=20, gap=6, width=cw-60, bold_first=True)

# ---- Style
sx, sy, sw, sh = 40, 960, 2320, 620
card(sx, sy, sw, sh, 'THE LOOK  /  ONE COMIC, ONE FINISH')
b = (sx+30, sy+50, 560, 280); paste_fit(manga.crop((600, 0, 1200, 300)), b); frame(b)
d.text((sx+30, sy+338), 'Target finish: an existing panel', font=font(19), fill=MUTED)
b2 = (sx+620, sy+50, 560, 280); paste_fit(manga.crop((600, 300, 1200, 600)), b2); frame(b2)
d.text((sx+620, sy+338), 'Same ink, halftone and colour in every panel', font=font(19), fill=MUTED)
# settings
worlds = [('application-alley','1 Application Alley'),('ship-it-city','2 Ship It City'),('growth-run','3 Growth Run'),('interview-hq','4 Interview HQ')]
for i,(wid,label) in enumerate(worlds):
    bg = Image.open(R+f'assets/production/backgrounds/{wid}.webp').convert('RGB')
    bx = sx+1210 + (i%2)*545; by = sy+50 + (i//2)*150
    bb = (bx, by, 525, 120)
    w0 = bg.width; h0 = int(w0*120/525)
    paste_fit(bg.crop((0, (bg.height-h0)//2, w0, (bg.height-h0)//2+h0)), bb); frame(bb)
    d.rounded_rectangle((bx+8, by+8, bx+8+d.textlength(label, font=font(17, True))+16, by+34), 6, fill=INK)
    d.text((bx+16, by+11), label, font=font(17, True), fill='white')
d.text((sx+1210, sy+338), 'Settings: each scene takes the sky, light and colour of its world', font=font(19), fill=MUTED)
# palette
pal = ['#251A43','#343064','#173AC3','#B8ADF0','#45DDFC','#17AFA8','#72CD38','#D2EF62','#BD594F','#F39A60','#FFD35A','#FFF1CF','#FA5777']
for i, c in enumerate(pal):
    x = sx+30 + i*86; d.rounded_rectangle((x, sy+378, x+76, sy+430), 8, fill=c, outline=INK, width=2)
d.text((sx+30, sy+438), 'Game palette. Ink is deep plum, never pure black. No brown or beige paper tones.', font=font(19), fill=MUTED)
rules = ['Every panel:',
 'Landscape 1536 x 1024. The game shows the middle 2:1 band (it crops 128 pixels off the top and bottom), so heads, hands and props stay out of the top and bottom eighth. No panel borders.',
 'Bold plum ink outlines, flat colour with halftone dot shading, speed lines only for action beats.',
 'No words, letters, numbers, speech bubbles or logos anywhere in the art. The game adds all the text.',
 'Screens show simple shapes only (boxes, bars, a pixel tree), never readable writing.',
 'Rooms come from the locations sheet and never change between panels. Only the light through the window changes.']
text_block(sx+1210, sy+378, rules, size=20, gap=7, width=1090, bold_first=True)
img.save(OUT)
print('ok', img.size)
