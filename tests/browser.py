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
        assert page.locator('.window-title img').evaluate("img => !img.dispatchEvent(new Event('dragstart', {bubbles:true, cancelable:true}))")
        if not mobile:
            label = page.locator('.window-title strong').bounding_box()
            x, y = label['x'], label['y'] + label['height'] / 2
            page.mouse.move(x+1,y)
            page.mouse.down()
            page.mouse.move(x+label['width']-1,y,steps=8)
            page.mouse.up()
            assert page.evaluate("window.getSelection().toString()") == ''
        page.screenshot(path=OUT/'title.jpg')
        activate = (lambda target: page.locator(target).tap()) if mobile else (lambda target: page.locator(target).click())
        expect(page.get_by_role('link', name='Read the cutscenes')).to_have_attribute('href', 'cutscenes.html')
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
        activate('#start-game')
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
        else:
            page.keyboard.down('ArrowRight')
            page.wait_for_function('HIRED_APP.state.player.x>170')
            page.keyboard.up('ArrowRight')
        page.screenshot(path=OUT/'gameplay.jpg')
        page.locator('#pause-button').click()
        page.locator('#resume-game').wait_for()
        page.locator('#sound-button').click()
        assert page.locator('#sound-button').get_attribute('aria-pressed') == 'true'
        page.locator('#sound-button').click()
        if mobile:
            page.set_viewport_size({'width':844,'height':390})
            page.locator('#resume-game').tap()
            for control in ['left','right','jump','dash','down']:
                box = page.locator(f'[data-control="{control}"]').bounding_box()
                assert box and box['x'] >= 0 and box['y'] + box['height'] <= 391
            page.screenshot(path=OUT/'landscape.jpg')
            page.set_viewport_size(options['viewport'])
        page.goto(base+'/cv.html')
        expect(page.locator('h1')).to_have_text('Augustus Edem')
        expect(page.get_by_role('heading', name='Selected products')).to_be_visible()
        with page.expect_download() as download:
            activate('a[download]')
        assert download.value.suggested_filename == 'Augustus-Edem-CV.pdf'
        assert download.value.path().read_bytes().startswith(b'%PDF-')
        page.screenshot(path=OUT/'cv.jpg', full_page=True)

        # Phase-specific checks use completed checkpoints so the four-world run
        # below can still use its own isolated portfolio save.
        page.evaluate('''() => localStorage.setItem('hired-exe:v04:solved-001',
            JSON.stringify({lastLevel:1,pendingScene:1,results:{0:{completed:true}}}))''')
        page.goto(base)
        activate('#start-game')
        expect(page.locator('#comic-title')).to_have_text('A quick addition')
        expect(page.locator('.comic-panel')).to_have_css('background-image', re.compile(r'v4/city-1\.webp'))
        activate('#scene-skip')
        assert page.evaluate("HIRED_APP.mode === 'playing' && HIRED_APP.state.levelIndex === 1")
        assert page.evaluate("HIRED_APP.progress.pendingScene === undefined")
        page.evaluate('''() => localStorage.setItem('hired-exe:v04:solved-001',
            JSON.stringify({lastLevel:3,pendingScene:4,results:{
                0:{completed:true},1:{completed:true},2:{completed:true},3:{completed:true}
            }}))''')
        page.reload()
        activate('#start-game')
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
        print('PASS CV download, saved chapter and cartoon interview ending', flush=True)

        page.goto(base+'/tests/playthrough.html')
        page.select_option('#layout','touch' if mobile else 'keyboard')
        page.click('#run')
        result = page.locator('#status')
        page.wait_for_function("['PASS','FAIL'].some(s=>document.querySelector('#status').textContent.startsWith(s))",timeout=320000)
        report = result.inner_text() + '\n' + page.locator('#results').inner_text()
        (OUT/'result.txt').write_text(report)
        print(report, flush=True)
        assert report.startswith('PASS'), report
        page.frame_locator('iframe').locator('#final-portfolio').wait_for()
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
        assert page.evaluate('HIRED_APP.assets.failed.length') == 0
        assert page.locator('#home-cv').get_attribute('href').startswith('data:application/pdf;base64,')
        assert page.locator('#home-cv').get_attribute('download') == 'Augustus-Edem-CV.pdf'
        activate('#start-game')
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
