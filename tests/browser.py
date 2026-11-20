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
        page.screenshot(path=OUT/'title.jpg')
        activate = (lambda target: page.locator(target).tap()) if mobile else (lambda target: page.locator(target).click())
        activate('#start-game')
        assert page.locator('#comic-title').inner_text() == 'Forty boxes'
        for _ in range(7):
            activate('#scene-next')
        assert page.locator('.comic-burst .comic-illustration').is_visible()
        page.screenshot(path=OUT/'cutscene.jpg', animations='disabled')
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
        activate('#start-game')
        assert page.locator('.comic-illustration').evaluate("el => el.style.backgroundImage.startsWith('url(\"data:image/webp')")
        activate('#scene-next')
        expect(page.locator('#comic-dialogue p')).to_have_text(
            'Box seven. Years of experience. I’ve got twenty. The dropdown stops at five.'
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
