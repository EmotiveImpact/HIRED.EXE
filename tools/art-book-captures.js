// Takes the Art Book's four "in the game" pictures from the running game: the
// canvas alone, a few seconds into each world. Needs Playwright and a served
// copy of the site:
//   python3 -m http.server 8000 &
//   node tools/art-book-captures.js http://localhost:8000/
// Then run tools/build-art-book.py to remake the thumbnails.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const base = process.argv[2] || 'http://localhost:8000/';
const out = path.join(__dirname, '..', 'assets', 'art-book');

(async () => {
  const browser = await chromium.launch();
  for (let world = 0; world < 4; world++) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(base);
    await page.waitForTimeout(600);
    await page.keyboard.press('Escape');
    await page.locator('#start-game').dblclick();
    await page.locator('#choose-world').click({ timeout: 20000 });
    await page.locator('#world-' + world).click();
    await page.locator('#scene-skip').click({ timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(870);
    await page.keyboard.press('Space');
    await page.waitForTimeout(250);
    const url = await page.evaluate(() => document.getElementById('game').toDataURL('image/webp', 0.92));
    await page.keyboard.up('KeyD');
    fs.writeFileSync(path.join(out, `play-${world + 1}.webp`), Buffer.from(url.split(',')[1], 'base64'));
    await page.close();
  }
  await browser.close();
})();
