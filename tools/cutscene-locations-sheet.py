"""Rebuild a cutscene reference sheet from the game's own art. Needs Pillow and DejaVu fonts. Usage: python3 THIS.py out.png"""
from PIL import Image, ImageDraw, ImageFont
import sys
from pathlib import Path
R = str(Path(__file__).resolve().parents[1]) + '/'
OUT = sys.argv[1]
W, H = 2400, 1540
BG = '#EEEAFB'; INK = '#251A43'; BLUE = '#173AC3'; MUTED = '#5B5486'
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans'
def font(s, b=False): return ImageFont.truetype(F + ('-Bold' if b else '') + '.ttf', s)
img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
def card(x, y, w, h, title):
    d.rounded_rectangle((x+6, y+6, x+w+6, y+h+6), 14, fill='#CFC6F2')
    d.rounded_rectangle((x, y, x+w, y+h), 14, fill='white', outline=INK, width=3)
    tw = d.textlength(title, font=font(26, True))
    d.rounded_rectangle((x+16, y-20, x+16+tw+36, y+20), 10, fill=BLUE, outline=INK, width=3)
    d.text((x+34, y-15), title, font=font(26, True), fill='white')
def paste_fit(src, box):
    x, y, w, h = box; s = min(w/src.width, h/src.height)
    im = src.resize((int(src.width*s), int(src.height*s)), Image.LANCZOS)
    img.paste(im, (x+(w-im.width)//2, y+(h-im.height)//2))
    d.rectangle((x, y, x+w, y+h), outline=INK, width=3)
def text_block(x, y, lines, size=21, gap=7, width=None, bold_first=False):
    for i, line in enumerate(lines):
        ff = font(size, bold_first and i == 0); cur = ''
        for wd in line.split(' '):
            t = (cur+' '+wd).strip()
            if width and d.textlength(t, font=ff) > width:
                d.text((x, y), cur, font=ff, fill=INK); y += size+gap; cur = wd
            else: cur = t
        d.text((x, y), cur, font=ff, fill=INK); y += size+gap
    return y
def label(x, y, t, size=17):
    d.text((x, y), t, font=font(size, True), fill=INK)

manga = Image.open(R+'assets/production/story/manga-panels.webp').convert('RGB')
def cell(i): c, r = i % 2, i // 2; return manga.crop((c*600, r*300, c*600+600, r*300+300))

d.rectangle((0, 0, W, 104), fill=BLUE); d.line((0, 104, W, 104), fill=INK, width=4)
d.text((40, 18), 'HIRE.EXE  /  LOCATIONS SHEET  v1', font=font(44, True), fill='white')
d.text((42, 70), 'Two rooms only. Each is built once and looks the same from every angle. Only the light through the window changes.', font=font(22), fill='#DCE3FF')

# ---------- Home studio
x0, y0, w0, h0 = 40, 150, 2320, 800
card(x0, y0, w0, h0, 'LOCATION A  /  AUGUSTUS\'S HOME STUDIO  /  SCENES 1, 2, 3 AND 4')
for i, (ci, cap) in enumerate([(0, 'Existing panel: the desk and window'), (3, 'Existing panel: the editing monitor'), (4, 'Existing panel: the same room, darker')]):
    b = (x0+30 + i*500, y0+50, 480, 240); paste_fit(cell(ci), b)
    d.text((b[0], y0+298), cap, font=font(18), fill=MUTED)
# floor plan
px, py, pw, ph = x0+1540, y0+50, 740, 520
d.rectangle((px, py, px+pw, py+ph), fill='#F6F3FF', outline=INK, width=5)
d.text((px, py-2-24+0), '', font=font(1))
# window on back wall
d.rectangle((px+180, py-8, px+600, py+8), fill='#45DDFC', outline=INK, width=3); label(px+300, py+14, 'BIG WINDOW: CITY SKYLINE')
# desk under window
d.rectangle((px+150, py+50, px+630, py+150), fill='#B8ADF0', outline=INK, width=3); label(px+330, py+90, 'LONG DESK')
d.rectangle((px+250, py+60, px+340, py+90), fill='#343064'); label(px+232, py+124, 'LAPTOP', 15)
d.rectangle((px+400, py+56, px+540, py+74), fill='#343064'); label(px+402, py+124, 'BIG MONITOR', 15)
d.ellipse((px+580, py+58, px+620, py+98), fill='#F39A60', outline=INK, width=3); label(px+500, py+158, 'ORANGE DESK LAMP', 15)
# chair
d.ellipse((px+330, py+190, px+410, py+270), fill='#343064', outline=INK, width=3); label(px+300, py+278, 'GREY DESK CHAIR', 15)
# shelf left wall
d.rectangle((px+8, py+60, px+60, py+380), fill='#BD594F', outline=INK, width=3)
for k in range(5): d.ellipse((px+16, py+80+k*58, px+52, py+116+k*58), outline='#FFF1CF', width=3)
label(px+70, py+210, 'SHELF: FILM REELS,', 15); label(px+70, py+230, 'BOOKS, GAME CONSOLE', 15)
# plants
for (a, b) in [(px+60, py+20), (px+640, py+20)]:
    d.ellipse((a, b, a+50, b+50), fill='#72CD38', outline=INK, width=3)
label(px+115, py+34, 'PLANT', 15); label(px+650, py+76, 'PLANT', 15)
# door
d.rectangle((px-8, py+420, px+8, py+500), fill='#FFD35A', outline=INK, width=3); label(px+20, py+450, 'DOOR (visitors enter here)', 15)
# camera
d.polygon([(px+640, py+460), (px+700, py+430), (px+700, py+490)], fill=INK); label(px+470, py+500, 'USUAL CAMERA', 15)
d.text((px, py+ph+10), 'Floor plan, seen from above', font=font(18), fill=MUTED)
locks = ['Locked description (paste into every home studio prompt):',
 'A small, tidy studio flat. A long desk runs along the back wall under one big window that looks out over the city skyline. On the desk: an open silver laptop in the middle, a large monitor to its right, and an orange angle-poise lamp at the right-hand end. Augustus sits on a dark grey desk chair facing the window. A tall shelf on the left wall holds film reels, a few books and a small games console. One trailing plant hangs top left and a second plant sits on the right end of the windowsill. The door is on the left wall, near the front. Inside, the room is lit by the lamp (warm orange pool) and the screens (cyan glow); everything else falls into deep navy and plum shadow. No posters, no logos, no readable text on any screen.']
yy = text_block(x0+30, y0+340, locks, size=21, gap=7, width=1480, bold_first=True)
# window light swatches
lights = [('Scene 1: night', '#1B2350', 'Navy sky, crescent moon, lit windows'), ('Scene 2: sunset', '#F08A4B', 'Warm orange sun, long shadows'), ('Scene 3: twilight', '#7A3FB0', 'Violet and magenta sky, neon signs'), ('Scene 4: dawn', '#F6B7A8', 'Pale pink and gold sunrise')]
for i, (t, c, sub) in enumerate(lights):
    bx = x0+30 + i*372; by = y0+610
    d.rounded_rectangle((bx, by, bx+352, by+70), 10, fill=c, outline=INK, width=3)
    d.text((bx+14, by+8), t, font=font(20, True), fill='white' if i in (0, 2) else INK)
    d.text((bx+14, by+38), sub, font=font(16), fill='white' if i in (0, 2) else INK)
d.text((x0+30, y0+694), 'The window is the only thing that changes between scenes. Same desk, same lamp, same shelf, same plants, same chair.', font=font(20, True), fill=INK)
d.text((x0+30, y0+726), 'Visitors (CV Filter, Scope Creep, The Algorithm) come in through the door or float beside the desk. They never replace any furniture.', font=font(20), fill=INK)

# ---------- Interview room
x1, y1, w1, h1 = 40, 1010, 2320, 480
card(x1, y1, w1, h1, 'LOCATION B  /  INTERVIEW ROOM AT SOLVED STUDIO  /  SCENE 5')
paste_fit(cell(5), (x1+30, y1+50, 640, 320)); d.text((x1+30, y1+378), 'Existing panel: the interview room', font=font(18), fill=MUTED)
qx, qy, qw, qh = x1+1700, y1+50, 580, 380
d.rectangle((qx, qy, qx+qw, qy+qh), fill='#F6F3FF', outline=INK, width=5)
d.rectangle((qx-8, qy+40, qx+8, qy+300), fill='#45DDFC', outline=INK, width=3); label(qx+20, qy+150, 'TALL WINDOW', 15)
d.rectangle((qx+280, qy+120, qx+480, qy+220), fill='#B8ADF0', outline=INK, width=3); label(qx+322, qy+160, 'HOST\'S DESK', 15)
d.rectangle((qx+370, qy+128, qx+470, qy+144), fill='#343064')
d.ellipse((qx+190, qy+140, qx+260, qy+210), fill='#17AFA8', outline=INK, width=3); label(qx+120, qy+226, 'TEAL CHAIR (Augustus)', 15)
d.ellipse((qx+505, qy+150, qx+537, qy+182), fill='#FFF1CF', outline=INK, width=2); label(qx+500, qy+190, 'HOST', 15)
for (a, b) in [(qx+20, qy+10), (qx+20, qy+320)]: d.ellipse((a, b, a+44, b+44), fill='#72CD38', outline=INK, width=3)
d.rectangle((qx+250, qy-8, qx+350, qy+8), fill='#FFD35A', outline=INK, width=3); label(qx+220, qy+16, 'FRAMED PICTURE', 15)
d.text((qx, qy+qh+8), 'Floor plan, seen from above', font=font(18), fill=MUTED)
locks2 = ['Locked description (paste into every interview room prompt):',
 'A bright, airy studio office in clear morning daylight. A tall multi-pane window on the left looks out on sunny red-brick buildings and trees. Big leafy plants stand either side of the window. On the right, a white desk with a monitor showing a simple pixel-art level (a tree, a green hill, blue sky), a pen pot and a white mug. Augustus sits in a teal office chair facing the desk. The interview host stands or sits behind it. Warm white walls, one framed picture with no readable text. No company logo anywhere.']
text_block(x1+700, y1+50, locks2, size=21, gap=7, width=960, bold_first=True)
img.save(OUT); print('ok')
