"""Run with Playwright browsers installed. Uses a disposable origin and context."""
import argparse
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'evidence'


def run(profile, base):
    OUT.mkdir(exist_ok=True)
    with sync_playwright() as pw:
        mobile = profile != 'desktop'
        engine = pw.webkit if profile == 'iphone' else pw.chromium
        options = pw.devices[{'iphone':'iPhone 13', 'android':'Pixel 7'}[profile]] if mobile else {'viewport': {'width':1280,'height':800}}
        browser = engine.launch()
        context = browser.new_context(**options)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('response', lambda response: errors.append(f'{response.status} {response.url}') if response.status >= 400 else None)
        page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
        page.goto(base)
        page.locator('#start-game').wait_for()
        assert page.locator('#desktop').evaluate("el => (getComputedStyle(el).userSelect || getComputedStyle(el).webkitUserSelect) === 'none'")
        assert page.locator('#start-game img').evaluate("img => !img.dispatchEvent(new Event('dragstart', {bubbles:true, cancelable:true}))")
        if not mobile:
            label = page.locator('#start-game strong').bounding_box()
            x, y = label['x'], label['y'] + label['height'] / 2
            page.mouse.move(x+1,y)
            page.mouse.down()
            page.mouse.move(x+label['width']-1,y,steps=8)
            page.mouse.up()
            assert page.evaluate("window.getSelection().toString()") == ''
        # Accidental browser gestures: nothing reloads, bounces, zooms or selects the page, and a long
        # press raises no browser menu. A mouse keeps its right-click.
        gestures = page.evaluate("""() => {
            const html = getComputedStyle(document.documentElement), body = getComputedStyle(document.body), item = document.querySelector('#start-game');
            const menu = pointerType => !item.dispatchEvent(new PointerEvent('contextmenu', {bubbles:true, cancelable:true, pointerType}));
            return {over: [html.overscrollBehaviorY, body.overscrollBehaviorY], touch: html.touchAction, select: body.userSelect || body.webkitUserSelect,
                    scale: document.querySelector('meta[name=viewport]').content.includes('maximum-scale=1'), menus: [menu('touch'), menu('mouse')],
                    all: !document.body.dispatchEvent(new KeyboardEvent('keydown', {key:'a', ctrlKey:true, bubbles:true, cancelable:true}))}; }""")
        assert gestures == {'over':['none','none'], 'touch':'pan-x pan-y', 'select':'none', 'scale':True, 'menus':[True, False], 'all':True}, gestures
        if profile == 'android':
            # On a touch screen the page itself cannot scroll, so there is nothing to pull.
            assert page.evaluate("getComputedStyle(document.documentElement).overflowY") == 'hidden'
            touches = context.new_cdp_session(page)
            def swipe(x, y, dy, fingers=1):
                """A real swipe from (x, y). Returns True when the page cancelled every move of it."""
                page.evaluate("() => { if (!window.__moves) window.addEventListener('touchmove', e => window.__moves.push(e.defaultPrevented)); window.__moves = []; }")
                at = lambda k: [{'x': x + i*80, 'y': y + dy*k/6, 'id': i} for i in range(fingers)]
                touches.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':at(0)})
                for k in range(1, 7):
                    touches.send('Input.dispatchTouchEvent', {'type':'touchMove', 'touchPoints':at(k)})
                    page.wait_for_timeout(16)
                touches.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
                page.wait_for_timeout(200)
                moves = page.evaluate("window.__moves")
                return bool(moves) and all(moves)
            def centre(selector):
                box = page.locator(selector).bounding_box()
                return box['x'] + box['width']/2, box['y'] + box['height']/2
            # A pull down on the desktop, on an icon, or with two fingers goes nowhere.
            assert swipe(200, 500, 250) and swipe(*centre('#games-group'), 200) and swipe(150, 400, 120, fingers=2)
            assert page.evaluate("scrollY + document.body.scrollTop") == 0
        page.screenshot(path=OUT/'title.jpg')
        activate = (lambda target: page.locator(target).tap()) if mobile else (lambda target: page.locator(target).click())
        # As in Windows 3.1, a program item opens with a double-click (a tap on a phone).
        def open_item(target):
            item = page.locator(target)
            item.tap() if mobile else item.dblclick()
        def launch():
            open_item('#start-game')
        expect(page.locator('#game-window')).to_be_hidden()
        expect(page.locator('#desk-netscape')).to_have_attribute('href','https://solved.studio/')
        # Submarine (final).exe is there from the start, with no save needed, in the Games group.
        expect(page.locator('#games-window #desk-sub')).to_have_count(1)
        # Only the main group starts open. The others wait as icons, clear of it.
        expect(page.locator('#main-window')).to_be_visible()
        for name in ('accessories', 'games', 'internet', 'working'):
            expect(page.locator(f'#{name}-window')).to_be_hidden()
            expect(page.locator(f'#{name}-group')).to_be_visible()
        apart = '''() => { const r = [...document.querySelectorAll('.pm-group-win:not([hidden])')].map(w => w.getBoundingClientRect());
            return r.every((a, i) => r.every((b, j) => i >= j || a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top)); }'''
        below = '''() => { const icons = [...document.querySelectorAll('.pm-group-icon')].filter(i => i.offsetParent).map(i => i.getBoundingClientRect());
            return [...document.querySelectorAll('.pm-group-win:not([hidden])')].every(w => icons.every(i => w.getBoundingClientRect().bottom <= i.top + 1)); }'''
        snug = "[...document.querySelectorAll('.pm-group-win:not([hidden]) .pm-items')].every(b => b.scrollHeight <= b.clientHeight + 1)"
        # Every group window opens at one standard size, whatever it holds: it never grows to fit its icons.
        standard = "new Set([...document.querySelectorAll('.pm-group-win:not([hidden])')].map(w => w.offsetWidth + 'x' + w.offsetHeight)).size === 1"
        assert page.evaluate(below) and page.evaluate(snug) and page.evaluate(standard)
        assert page.locator('#main-window').evaluate("w => w.offsetWidth <= 4 * 90 + 16")
        # The Internet group links Edem's own sites, and Working On the projects in progress.
        for item, url in {'#desk-link-vimeo':'https://vimeo.com/emotiveimpact', '#desk-link-vlume':'https://vlumeaudio.com/', '#desk-link-cairn':'https://cairnmac.com/',
                          '#desk-link-emotive-impact':'https://emotiveimpact.io/', '#desk-work-saleane':'https://saleane.vercel.app/', '#desk-work-nospoilers':'https://nospoilers.dev/',
                          '#desk-work-drafthr':'https://drafthr.io/', '#desk-work-lumalook':'https://lumalook.app/', '#desk-work-commune':'https://ourcommune.io/'}.items():
            expect(page.locator(item)).to_have_attribute('href', url)
            expect(page.locator(item)).to_have_attribute('target', '_blank')
            # Each link has a picture of its own, drawn in the sixteen Windows colours.
            expect(page.locator(f'{item} .pm-glyph-art svg')).to_have_count(1)
        assert page.evaluate("new Set([...document.querySelectorAll('[id^=desk-link-] .pm-glyph-art, [id^=desk-work-] .pm-glyph-art')].map(g => g.innerHTML)).size") == 9
        expect(page.locator('#internet-window .pm-item')).to_have_count(5)
        expect(page.locator('#working-window .pm-item')).to_have_count(5)
        # Program Manager's menus drop over the group window without moving it.
        group = page.locator('#main-window')
        before = group.bounding_box()
        activate('#pm-file')
        expect(page.locator('#pm-exit')).to_be_visible()
        assert group.bounding_box() == before
        activate('#pm-window')
        expect(page.locator('#pm-exit')).to_be_hidden()
        expect(page.locator('#pm-window-main')).to_be_visible()
        activate('#pm-window-main')
        expect(page.locator('#pm-window-main')).to_be_hidden()
        expect(page.locator('#start-game strong')).to_have_text('HIRE.EXE')
        # Help > About Program Manager, then Exit Windows > Cancel keeps the session.
        activate('#pm-help')
        activate('#pm-about')
        expect(page.locator('#about-ok')).to_be_visible()
        activate('#about-ok')
        activate('#pm-file')
        activate('#pm-exit')
        expect(page.locator('#exit-cancel')).to_be_visible()
        activate('#exit-cancel')
        expect(page.locator('#start-game')).to_be_visible()
        # The portfolio window is gone from the desktop; the film work is the Video Portfolio link.
        expect(page.locator('#skip-portfolio')).to_have_count(0)
        expect(page.locator('#desk-link-vimeo')).to_contain_text('Video Portfolio')
        # README.TXT is the first icon: an old-style README saying what this is and where everything is.
        assert page.locator('#main-window .pm-item').first.get_attribute('id') == 'home-readme'
        # CV.PDF is the CV as the PDF itself, opened in the browser's own viewer.
        expect(page.locator('#home-cv-pdf')).to_contain_text('CV.PDF')
        expect(page.locator('#home-cv-pdf .pm-glyph-art svg')).to_have_count(1)
        assert page.locator('#home-cv-pdf').get_attribute('href') == 'assets/cv/Augustus-Edem-CV.pdf'
        assert page.locator('#home-cv-pdf').get_attribute('target') == '_blank'
        assert page.request.get(base+'/assets/cv/Augustus-Edem-CV.pdf').body().startswith(b'%PDF-')
        open_item('#home-readme')
        notepad = page.locator('.notepad-window')
        expect(notepad.locator('.w31-title')).to_have_text('Notepad - README.TXT')
        for line in ('WHAT THIS IS', 'WHERE EVERYTHING IS', 'Hire Augustus.exe: Run this last.', 'KNOWN ISSUES', 'double-click HIRE.EXE'):
            assert line in notepad.locator('.notepad-text').input_value(), line
        activate('.notepad-window #dialog-close')
        # CV.TXT opens in Notepad, with Notepad's own menus and the plain text CV.
        open_item('#home-cv-txt')
        expect(notepad.locator('.w31-title')).to_have_text('Notepad - CV.TXT')
        expect(notepad.locator('.notepad-text')).to_have_value(re.compile(r'^AUGUSTUS EDEM'))
        for line in ('IN THE WORKS', 'NoSpoilers:', 'drafthr.io', 'lumalook.app', 'ourcommune.io'):
            assert line in notepad.locator('.notepad-text').input_value(), line
        assert notepad.locator('.notepad-text').evaluate('a => a.readOnly') == mobile
        # The CV is there to be read and copied: its text can be selected and scrolled by touch,
        # but a pull down from its top is not passed on to the browser.
        assert notepad.locator('.notepad-text').evaluate("a => (getComputedStyle(a).userSelect || getComputedStyle(a).webkitUserSelect) === 'text'")
        assert notepad.locator('.notepad-text').evaluate("a => a.dispatchEvent(new PointerEvent('contextmenu', {bubbles:true, cancelable:true, pointerType:'touch'}))")
        if profile == 'android':
            box = notepad.locator('.notepad-text').bounding_box()
            x, y = box['x'] + box['width']/2, box['y'] + box['height']/2
            assert swipe(x, y, 150)
            assert not swipe(x, y + 60, -150)
            assert notepad.locator('.notepad-text').evaluate('a => a.scrollTop') > 50
            # Let the fling run out: a tap during one only stops it.
            page.wait_for_timeout(1200)
            notepad.locator('.notepad-text').evaluate('a => { a.scrollTop = 0; }')
        activate('#notepad-search')
        activate('#notepad-find-menu')
        page.locator('#notepad-find').fill('ravensbourne')
        page.keyboard.press('Enter')
        assert notepad.locator('.notepad-text').evaluate('a => a.value.slice(a.selectionStart, a.selectionEnd)') == 'Ravensbourne'
        activate('#notepad-file')
        activate('#notepad-exit')
        expect(notepad).to_have_count(0)
        # Accessories starts as a group icon. Opened, it is the same size as the main group, though it holds one icon.
        # With room it sits beside the main group; on a phone it opens over it, a step down and to the right.
        open_item('#accessories-group')
        expect(page.locator('#accessories-window')).to_be_visible()
        assert page.evaluate(standard) and page.evaluate(snug) and (mobile or (page.evaluate(apart) and page.evaluate(below)))
        assert page.evaluate("(() => { const a = document.querySelector('#main-window'), b = document.querySelector('#accessories-window'); return b.offsetLeft > a.offsetLeft && b.offsetTop >= a.offsetTop; })()")
        open_item('#desk-calc')
        expect(page.locator('#game-window')).to_be_hidden()
        for key in ('2', '+', '2', '='):
            page.get_by_role('button', name=key, exact=True).click()
        expect(page.locator('.calc-display')).to_have_text('4')
        page.get_by_role('button', name='MS', exact=True).click()
        page.get_by_role('button', name='C', exact=True).click()
        for key in ('2','0','0','+','1','0','%','Enter'):
            page.keyboard.press(key)
        expect(page.locator('.calc-display')).to_have_text('220')
        page.keyboard.press('Enter')
        expect(page.locator('.calc-display')).to_have_text('240')
        page.get_by_role('button', name='MR', exact=True).click()
        expect(page.locator('.calc-display')).to_have_text('4')
        activate('#dialog-close')
        # Put Accessories back to an icon.
        activate('#accessories-window .w31-min')
        expect(page.locator('#accessories-group')).to_be_visible()
        # Games holds Jargon: a group of two or more matching buzzwords clears, and Undo brings it back.
        open_item('#games-group')
        assert page.evaluate(standard) and page.evaluate(snug) and (mobile or (page.evaluate(apart) and page.evaluate(below)))
        open_item('#desk-jargon')
        tiles = page.locator('.jargon-window .jg-tile')
        expect(tiles).to_have_count(108)
        c, r = page.evaluate('''() => {
            for (const t of document.querySelectorAll('.jg-tile')) {
                const c = +t.dataset.c, r = +t.dataset.r;
                for (const n of [`[data-c="${c + 1}"][data-r="${r}"]`, `[data-c="${c}"][data-r="${r + 1}"]`])
                    if (document.querySelector('.jg-tile' + n)?.classList[1] === t.classList[1]) return [c, r];
            }
        }''')
        activate(f'.jg-tile[data-c="{c}"][data-r="{r}"]')
        expect(tiles).not_to_have_count(108)
        expect(page.locator('.jg-status')).to_contain_text('removed')
        activate('#jg-game')
        activate('#jg-undo')
        expect(tiles).to_have_count(108)
        # A minimised game comes back as it was when its item is opened again.
        activate(f'.jg-tile[data-c="{c}"][data-r="{r}"]')
        left = tiles.count()
        activate('.jargon-window .w31-min')
        open_item('#desk-jargon')
        expect(page.locator('.jargon-window')).to_be_visible()
        expect(tiles).to_have_count(left)
        # A best score another tab saved survives this window changing level.
        page.evaluate("localStorage.setItem('hired-exe:jargon:v1', JSON.stringify({level: 'mid', best: {junior: 0, mid: 4321, senior: 0}}))")
        activate('#jg-game')
        activate('#jg-level-junior')
        stored = page.evaluate("JSON.parse(localStorage.getItem('hired-exe:jargon:v1'))")
        assert stored['best']['mid'] == 4321 and stored['level'] == 'junior', stored
        page.evaluate("localStorage.removeItem('hired-exe:jargon:v1')")
        if mobile:
            # On a landscape phone the whole board still fits inside the window.
            page.set_viewport_size({'width':844,'height':390})
            fits = page.evaluate('''() => {
                const body = document.querySelector('.jargon-window .modal-body').getBoundingClientRect();
                const win = document.querySelector('.jargon-window').getBoundingClientRect();
                const low = Math.max(...[...document.querySelectorAll('.jg-tile')].map(t => t.getBoundingClientRect().bottom));
                return {low, body: body.bottom, top: win.top, bottom: win.bottom, height: innerHeight};
            }''')
            page.set_viewport_size(options['viewport'])
            assert fits['low'] <= fits['body'] + 0.5 and fits['top'] >= 0 and fits['bottom'] <= fits['height'] + 0.5, fits
        activate('.jargon-window #dialog-close')
        activate('#games-window .w31-min')
        expect(page.locator('#games-group')).to_be_visible()
        # Hire Augustus.exe runs Setup, asks for Disk 2, and ends with email and the Internet group.
        open_item('#desk-setup')
        activate('#setup-continue')
        # Minimised, Setup copies up to Disk 2 and then holds the prompt until its window is back.
        activate('.setup-window .w31-min')
        gauge = page.locator('.setup-gauge')
        expect(gauge).to_have_attribute('aria-valuenow', '46', timeout=30000)
        page.wait_for_timeout(1000)
        expect(page.locator('.w31-message')).to_have_count(0)
        # Opening Hire Augustus.exe again brings back the same install, not a new Welcome screen.
        open_item('#desk-setup')
        expect(gauge).to_be_visible()
        expect(gauge).to_have_attribute('aria-valuenow', '46')
        disk = page.locator('.w31-message', has_text='Disk 2')
        disk.wait_for(timeout=30000)
        disk.locator('.w31-buttons button').click()
        page.locator('#setup-email').wait_for(timeout=40000)
        # Send an Email shows the address in a box to copy; there is no Internet button.
        expect(page.locator('#setup-internet')).to_have_count(0)
        page.screenshot(path=OUT/'setup-complete.jpg')
        activate('#setup-email')
        expect(page.locator('#setup-address')).to_have_value(re.compile(r'^[^@\s]+@[^@\s]+$'))
        # The address can be selected by hand as well as with Copy.
        assert page.locator('#setup-address').evaluate("a => (getComputedStyle(a).userSelect || getComputedStyle(a).webkitUserSelect) === 'text'")
        activate('#setup-copy')
        expect(page.locator('#setup-copied')).not_to_be_empty()
        activate('#setup-email-ok')
        expect(page.locator('.setup-email-box')).to_have_count(0)
        activate('#setup-close')
        expect(page.locator('.setup-window')).to_have_count(0)
        open_item('#internet-group')
        expect(page.locator('#desk-link-vimeo')).to_have_attribute('href', 'https://vimeo.com/emotiveimpact')
        # Each Internet item's command line opens its own page from File > Run.
        assert page.evaluate(r'''() => { const seen = []; const real = window.open; window.open = u => { seen.push(u); return null; };
            Hired.progman.run('C:\\NETSCAPE\\NETSCAPE.EXE https://vimeo.com/emotiveimpact'); window.open = real; return seen; }''') == ['https://vimeo.com/emotiveimpact']
        activate('#internet-window .w31-min')
        expect(page.locator('#internet-group')).to_be_visible()
        launch()
        activate('#replay-scenes')
        expect(page.locator('.replay-frame')).to_be_visible()
        activate('#gallery-back')
        page.goto(base+'/director.html')
        frames = page.locator('article img')
        expect(frames).to_have_count(28)
        assert frames.evaluate_all('async imgs => {await Promise.all(imgs.map(i => {i.loading="eager"; return i.decode()})); return imgs.every(i => i.naturalWidth > 0)}')
        page.get_by_role('button', name='Disapprove / rerender').first.click()
        page.locator('textarea').first.fill('Hold the reaction')
        page.reload()
        page.locator('#filter').select_option('Rerender')
        expect(page.locator('article:visible')).to_have_count(1)
        expect(page.locator('textarea:visible')).to_have_value('Hold the reaction')
        with page.expect_download() as review_download:
            page.get_by_role('button', name='Download review notes').click()
        import json
        with open(review_download.value.path()) as review_file:
            review = json.load(review_file)
        assert len(review['shots']) == 28 and review['shots'][0]['direction'] == 'Hold the reaction'
        page.goto(base+'/cutscenes.html')
        shots = page.locator('figure img')
        expect(shots).to_have_count(28)
        decoded = shots.evaluate_all("""async images => {
            await Promise.all(images.map(img => { img.loading = 'eager'; return img.decode(); }));
            return images.map(img => [img.currentSrc, img.naturalWidth]);
        }""")
        assert len({url for url, _ in decoded}) == 28
        assert all(width >= 640 for _, width in decoded)
        expect(page.locator('figure').nth(26)).to_contain_text('Same answer.')
        page.get_by_role('link', name='Play HIRE.EXE').click()
        launch()
        activate('#title-play')
        assert page.locator('#comic-title').inner_text() == 'One PDF'
        for _ in range(4):
            activate('#scene-next')
        assert page.locator('.comic-burst .comic-illustration').is_visible()
        page.screenshot(path=OUT/'cutscene.jpg', animations='disabled')
        for _ in range(4): activate('#scene-next')
        activate('#scene-next')
        if mobile:
            jump = page.locator('[data-control="jump"]')
            assert jump.is_visible()
            jump.tap()
            page.wait_for_function('HIRED_APP.state.player.jumps > 0')
            if profile == 'android':
                # Send two real, independently tracked browser contacts.
                cdp = context.new_cdp_session(page)
                def point(selector, pointer):
                    box = page.locator(selector).bounding_box()
                    return {'x':box['x'] + box['width']/2, 'y':box['y'] + box['height']/2, 'id':pointer}
                right = point('[data-control="right"]',1)
                dash = point('[data-control="dash"]',2)
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[right]})
                cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[right,dash]})
                page.wait_for_function('HIRED_APP.state.player.x>140 && HIRED_APP.state.player.dashCooldown>0')
                cdp.send('Input.dispatchTouchEvent',{'type':'touchCancel','touchPoints':[]})
                assert page.locator('.is-held').count() == 0
                # A thumb sliding off the controls, or a swipe on the picture, moves the game and not the page.
                assert swipe(*centre('[data-control="down"]'), -120) and swipe(*centre('[data-control="jump"]'), -200) and swipe(*centre('#game'), 200)
                assert swipe(*centre('#game-window .titlebar'), 250)
                assert page.evaluate("scrollY + document.body.scrollTop") == 0
        else:
            page.keyboard.down('ArrowRight')
            page.wait_for_function('HIRED_APP.state.player.x>170')
            page.keyboard.up('ArrowRight')
        page.screenshot(path=OUT/'gameplay.jpg')
        # The world's theme plays on Sea Trial's sound engine. Pausing stops it, the sound
        # button silences everything, and resuming carries on. (WebKit may keep audio locked.)
        hears = profile != 'iphone'
        if hears:
            page.wait_for_function("HIRED_APP.sound?.state === 'running' && HIRED_APP.sound.song === 'alley'")
        if profile == 'android':
            assert 'jump' in page.evaluate('HIRED_APP.sound.log')
        page.locator('#pause-button').click()
        page.locator('#resume-game').wait_for()
        if hears:
            page.wait_for_function('HIRED_APP.sound.song === null')
        page.locator('#sound-button').click()
        assert page.locator('#sound-button').get_attribute('aria-pressed') == 'false'
        if hears:
            assert page.evaluate('HIRED_APP.sound.muted')
        page.locator('#sound-button').click()
        if mobile:
            page.set_viewport_size({'width':844,'height':390})
            page.locator('#resume-game').tap()
            if hears:
                page.wait_for_function("HIRED_APP.sound.song === 'alley' && !HIRED_APP.sound.muted")
            for control in ['left','right','jump','dash','down']:
                box = page.locator(f'[data-control="{control}"]').bounding_box()
                assert box and box['x'] >= 0 and box['y'] + box['height'] <= 391
            page.screenshot(path=OUT/'landscape.jpg')
            page.set_viewport_size(options['viewport'])
        page.goto(base+'/cv.html')
        expect(page.locator('h1')).to_have_text('Augustus Edem')
        for heading in ('The abnormal bit', 'Shipped', 'In the works', 'Build, automate, grow', 'Experience'):
            expect(page.get_by_role('heading', name=heading, exact=True)).to_be_visible()
        with page.expect_download() as download:
            activate('a[download]')
        assert download.value.suggested_filename == 'Augustus-Edem-CV.pdf'
        assert download.value.path().read_bytes().startswith(b'%PDF-')
        page.screenshot(path=OUT/'cv.jpg', full_page=True)

        # Picking a later world must offer its intro once, including after reload.
        page.goto(base)
        launch()
        activate('#choose-world')
        activate('#world-2')
        expect(page.locator('#comic-title')).to_have_text('Both of them')
        activate('#scene-skip')
        assert page.evaluate('HIRED_APP.state.levelIndex === 2')
        page.reload()
        launch()
        activate('#choose-world')
        activate('#world-2')
        assert page.evaluate("HIRED_APP.mode === 'playing' && HIRED_APP.state.levelIndex === 2")

        # Phase-specific checks use completed checkpoints so the four-world run
        # below can still use its own isolated portfolio save.
        page.evaluate('''() => localStorage.setItem('hired-exe:v04:solved-001',
            JSON.stringify({lastLevel:1,pendingScene:1,results:{0:{completed:true}}}))''')
        page.goto(base)
        launch()
        activate('#title-play')
        expect(page.locator('#comic-title')).to_have_text('A quick addition')
        expect(page.locator('.comic-panel')).to_have_css('background-image', re.compile(r'v5/city-1\.webp'))
        activate('#scene-skip')
        assert page.evaluate("HIRED_APP.mode === 'playing' && HIRED_APP.state.levelIndex === 1")
        assert page.evaluate("HIRED_APP.progress.pendingScene === undefined")
        activate('#pause-button')
        activate('#pause-home')
        open_item('#games-group')
        open_item('#desk-sub')
        # The window is just the game. Its controls live on the canvas: Space or the left half
        # dives, X or the right half fires, so the submarine can dive and shoot together.
        sea = page.locator('.sea-view')
        expect(page.locator('#sea-start, .sea-dive, #sea-fire')).to_have_count(0)
        expect(sea).to_be_focused()
        # Like any application, the game window has a blue title bar with its name and a close button.
        expect(page.locator('.sea-window .small-title')).to_contain_text('Submarine (final).exe')
        expect(page.locator('.sea-window #dialog-close')).to_be_visible()
        # It has sound: title music from the start, and an on/off button beside the window buttons.
        sound_log = lambda: page.evaluate("document.querySelector('.sea-view').seaSound().log")
        expect(page.locator('.sea-window .sea-sound')).to_have_attribute('aria-pressed', 'true')
        assert 'music:title' in sound_log(), sound_log()
        if profile != 'desktop':
            # On a phone the window is a controller: the browser's own touch gestures (selection,
            # callouts, zoom, scrolling) are cancelled for every touch on the game.
            page.evaluate("() => { window.__seaTouches = []; document.addEventListener('touchstart', e => window.__seaTouches.push(e.defaultPrevented), {passive:true}); }")
        if profile == 'desktop':
            page.keyboard.down('Space')
            page.wait_for_timeout(150)
            page.keyboard.down('x')
            page.wait_for_timeout(600)
            page.keyboard.up('x')
            page.keyboard.up('Space')
        elif profile == 'android':
            box = sea.bounding_box()
            points = [{'x':box['x']+box['width']*share, 'y':box['y']+box['height']/2, 'id':i} for i, share in ((1, 0.25), (2, 0.75))]
            cdp = context.new_cdp_session(page)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':points[:1]})
            page.wait_for_timeout(150)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchStart', 'touchPoints':points})
            page.wait_for_timeout(600)
            cdp.send('Input.dispatchTouchEvent', {'type':'touchEnd', 'touchPoints':[]})
        else:
            box = sea.bounding_box()
            sea.tap(position={'x':box['width']*0.75, 'y':box['height']/2})
        expect(sea).to_have_attribute('data-shots', re.compile(r'^[1-9]'))
        assert {'dive', 'music:level', 'fire'} <= set(sound_log()), sound_log()
        if profile != 'desktop':
            assert page.evaluate("window.__seaTouches.length > 0 && window.__seaTouches.every(Boolean)"), page.evaluate("window.__seaTouches")
            assert page.evaluate("getSelection().toString() === ''")
        if profile != 'iphone':
            expect(sea).to_have_attribute('data-hits', '1')
        expect(page.locator('#sea-status')).to_have_text('Clipped a harbour gate. Have another go.', timeout=12000)
        assert {'crash', 'music:lost'} <= set(sound_log()), sound_log()
        activate('.sea-sound')
        expect(page.locator('.sea-sound')).to_have_attribute('aria-pressed', 'false')
        activate('.sea-sound')
        expect(page.locator('.sea-sound')).to_have_attribute('aria-pressed', 'true')
        activate('#dialog-close')
        # On a phone the Games folder opens over the main one; put it away before launching.
        activate('#games-window .w31-min')
        launch()
        activate('#title-play')
        assert page.evaluate("HIRED_APP.mode === 'playing' && HIRED_APP.state.levelIndex === 1")

        page.evaluate('''() => localStorage.setItem('hired-exe:v04:solved-001',
            JSON.stringify({lastLevel:3,pendingScene:4,results:{
                0:{completed:true},1:{completed:true},2:{completed:true},3:{completed:true}
            }}))''')
        page.reload()
        launch()
        activate('#title-play')
        expect(page.locator('#comic-title')).to_have_text('Thursday at James’s')
        expect(page.locator('#comic-dialogue strong').first).to_have_text('James')
        expect(page.locator('.comic-panel')).to_have_css('background-image', re.compile(r'office-1\.webp'))
        activate('#scene-next')
        expect(page.locator('.comic-panel')).to_have_css('background-image', re.compile(r'office-2\.webp'))
        page.screenshot(path=OUT/'james.jpg', animations='disabled')
        activate('#scene-skip')
        for answer in (0, 0, 1):
            activate(f'#answer-{answer}')
            activate('#interview-next')
        expect(page.locator('#comic-title')).to_have_text('Thursday at James’s')
        activate('#scene-next')
        expect(page.locator('.comic-panel')).to_have_css('background-image', re.compile(r'office-4\.webp'))
        page.screenshot(path=OUT/'offer.jpg', animations='disabled')
        activate('#scene-next')
        expect(page.locator('#final-cv')).to_have_attribute('href', 'cv.html')
        expect(page.locator('#overlay')).to_contain_text('fictional hiring journey')
        page.evaluate("localStorage.removeItem('hired-exe:v04:solved-001')")
        # The visitor log notes this visit's moments, and sends nothing from a test server.
        moments = page.evaluate("Hired.track.log.map(e => e.n)")
        assert 'Arrived' in moments and 'Game completed' in moments and page.evaluate("Hired.track.live") is False, moments
        # A pasted link shows the title-screen card.
        assert page.locator('meta[property="og:image"]').get_attribute('content') == 'https://hireexe.me/assets/social/link-preview.jpg'
        assert page.request.get(base+'/assets/social/link-preview.jpg').body().startswith(b'\xff\xd8')
        print('PASS CV download, saved chapter and cartoon interview ending', flush=True)

        page.goto(base+'/tests/playthrough.html')
        page.select_option('#layout','touch' if mobile else 'keyboard')
        page.click('#run')
        result = page.locator('#status')
        crashed = []
        page.on('crash', lambda _: crashed.append('page crashed'))
        try:
            page.wait_for_function("['PASS','FAIL'].some(s=>document.querySelector('#status').textContent.startsWith(s))",timeout=320000)
        except Exception as error:
            # Say where the run was and whether frames were still arriving, so a timeout can be told from a stall.
            where = ['no report from the page']
            try:
                where = [result.inner_text(), page.locator('#results').inner_text(), 'frames in 2 s: ' + str(page.evaluate(
                    "() => new Promise(done => { let n = 0; const tick = () => { n++; requestAnimationFrame(tick); }; requestAnimationFrame(tick); setTimeout(() => done(n), 2000); })"))]
                page.screenshot(path=OUT/'stalled.jpg')
            except Exception as second:
                where.append(f'could not read the page: {second}')
            report = '\n'.join(['Playthrough did not finish', *crashed, *where])
            (OUT/'result.txt').write_text(report)
            raise AssertionError(report) from error
        report = result.inner_text() + '\n' + page.locator('#results').inner_text()
        (OUT/'result.txt').write_text(report)
        print(report, flush=True)
        assert report.startswith('PASS'), report
        page.frame_locator('iframe').locator('#final-worlds').wait_for()
        page.locator('iframe').screenshot(path=OUT/'ending.jpg')
        # WebKit's offline transport also rejects a file:// main document.
        # Load the actual files while denying and recording every HTTP(S) request.
        external_requests = []
        def reject_network(route):
            external_requests.append(route.request.url)
            route.abort()
        context.route(re.compile(r'^https?://'), reject_network)
        page.goto((ROOT/'dist/HIRE-EXE-v0.4-PLAY.html').as_uri())
        page.locator('#start-game').wait_for()
        # CV.TXT and CV.PDF replace the old CV web page icon.
        expect(page.locator('#home-cv')).to_have_count(0)
        assert page.locator('#home-cv-pdf').get_attribute('href').startswith('data:application/pdf;base64,')
        assert page.locator('#home-cv-pdf').get_attribute('download') == 'Augustus-Edem-CV.pdf'
        launch()
        activate('#title-play')
        assert page.evaluate('HIRED_APP.assets.failed.length') == 0
        assert page.locator('.comic-illustration').evaluate("el => el.style.backgroundImage.startsWith('url(\"data:image/webp')")
        activate('#scene-next')
        expect(page.locator('#comic-dialogue p').last).to_have_text(
            'What did you do with the PDF?'
        )
        activate('#scene-skip')
        assert page.evaluate("HIRED_APP.mode") == 'playing'
        page.goto((ROOT/'dist/HIRE-EXE-v0.4-ART-BOOK.html').as_uri())
        page.locator('[data-go="components"]').first.click()
        page.select_option('#animation-select','victory')
        assert page.locator('#hero-preview').is_visible()
        assert page.evaluate("Object.keys(HIRED_ART_ASSETS).some(path=>path.endsWith('world-4.jpg'))")
        assert not external_requests, external_requests
        assert not errors, errors
        browser.close()


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('profile', choices=['desktop','android','iphone'])
    profile=parser.parse_args().profile
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(SimpleHTTPRequestHandler,directory=ROOT))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        run(profile, f'http://127.0.0.1:{server.server_port}')
    finally:
        server.shutdown()
