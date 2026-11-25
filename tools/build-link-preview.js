// Renders tools/link-preview.html to assets/social/link-preview.jpg, the 1200 x 630 picture
// that link cards show for hireexe.me. Needs Playwright with Chromium: node tools/build-link-preview.js
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve(__dirname, '..');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(root, 'tools/link-preview.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(root, 'assets/social/link-preview.jpg'), type: 'jpeg', quality: 88 });
  await browser.close();
})();
