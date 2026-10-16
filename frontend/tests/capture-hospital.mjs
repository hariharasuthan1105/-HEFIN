import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1100, height: 1100 } });
page.on('pageerror', (e) => console.log('PAGE_ERROR', e.message));
await page.goto('http://127.0.0.1:4200/');
await page.locator('.hospital-experience[data-mode="interactive"]').waitFor({ timeout: 60000 });
await page.getByRole('button', { name: 'Reset hospital', exact: true }).click();
await page.addStyleTag({
  content:
    'body *{visibility:hidden!important} h-smart-hospital-scene,h-smart-hospital-scene *{visibility:visible!important} .hero,.hero-visual,main,h-home-page{transform:none!important;animation:none!important} h-smart-hospital-scene{position:fixed!important;inset:0!important;z-index:9999;background:#071323}.hospital-viewport{min-height:0!important}.hospital-experience{height:100vh!important}',
});
await page.waitForTimeout(1500);
await page.locator('.hospital-canvas').screenshot({ path: '../docs/hospital-isometric.png' });
console.log(JSON.stringify(await page.evaluate(() => window.__hefinHospital)));
await browser.close();
