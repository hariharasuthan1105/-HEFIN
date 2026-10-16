import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const scene = '.hospital-experience';
async function ready(page: import('@playwright/test').Page) {
  await page.goto('/');
  const load = page.getByRole('button', { name: 'Explore hospital in 3D', exact: true });
  if ((page.viewportSize()?.width ?? 1440) <= 600) await load.click();
  await expect(page.locator(scene)).toHaveAttribute('data-mode', 'interactive', { timeout: 60000 });
  await expect
    .poll(() => page.evaluate(() => (window as any).__hefinHospital?.frames), { timeout: 20000 })
    .toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Reset hospital', exact: true }).click();
}
const metric = (page: import('@playwright/test').Page, key: string) =>
  page.evaluate((k) => (window as any).__hefinHospital[k], key);

test('hospital geometry, camera controls, screenshots and cleanup', async ({ page }, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  const badAssets: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => {
    if (r.url().includes('/assets/') && r.status() >= 400) badAssets.push(r.url());
  });
  await ready(page);
  if (process.env['HEFIN_SOFTWARE_TEST']) {
    expect(await metric(page, 'quality')).toBe('software');
    fs.writeFileSync(
      '../docs/hospital-software-performance.json',
      JSON.stringify(await page.evaluate(() => (window as any).__hefinHospital), null, 2),
    );
  }
  expect(await metric(page, 'triangles')).toBeGreaterThan(100000);
  expect(await metric(page, 'calls')).toBeLessThan(45);
  const canvas = page.locator('.hospital-canvas');
  const initial = await metric(page, 'distance');
  await page.getByRole('button', { name: 'Zoom into hospital', exact: true }).click();
  await expect.poll(() => metric(page, 'distance')).toBeLessThan(initial * 0.95);
  await page.getByRole('button', { name: 'Zoom out of hospital', exact: true }).click();
  await expect.poll(() => metric(page, 'distance')).toBeGreaterThan(initial * 0.9);
  await canvas.scrollIntoViewIfNeeded();
  const angle = await metric(page, 'azimuth');
  if (info.project.name === 'desktop') {
    const b = (await canvas.boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.55, b.y + b.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.85, b.y + b.height * 0.6, { steps: 12 });
    await page.mouse.up();
  } else {
    const b = (await canvas.boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: b.x + b.width * 0.35, y: b.y + b.height * 0.5 }],
    });
    for (let i = 1; i <= 8; i++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: b.x + b.width * (0.35 + i * 0.04), y: b.y + b.height * 0.5 }],
      });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await expect
    .poll(async () => Math.abs((await metric(page, 'azimuth')) - angle))
    .toBeGreaterThan(0.15);
  await page.getByRole('button', { name: 'Reset hospital', exact: true }).click();
  await expect.poll(() => metric(page, 'distance')).toBeCloseTo(initial, 0);
  await page.locator(scene).screenshot({ path: `../docs/hospital-${info.project.name}.png` });
  await page.screenshot({ path: `../docs/hospital-page-${info.project.name}.png`, fullPage: true });
  if (info.project.name === 'desktop') {
    // Larger capture of the same production viewer, not a replacement render or reference image.
    await page.addStyleTag({
      content:
        'body *{visibility:hidden!important} h-smart-hospital-scene,h-smart-hospital-scene *{visibility:visible!important} .hero,.hero-visual,main,h-home-page{transform:none!important;animation:none!important} h-smart-hospital-scene{position:fixed!important;inset:0!important;z-index:9999;background:#071323}.hospital-viewport{min-height:0!important}.hospital-experience{height:100vh!important}',
    });
    await page.setViewportSize({ width: 1100, height: 1100 });
    await page.getByRole('button', { name: 'Reset hospital', exact: true }).click();
    await page.waitForTimeout(700);
    await canvas.screenshot({ path: '../docs/hospital-isometric.png' });
    for (const view of ['Front', 'Side', 'Top']) {
      await page.locator(scene).getByRole('button', { name: view, exact: true }).click();
      await page.waitForTimeout(700);
      await canvas.screenshot({ path: `../docs/hospital-${view.toLowerCase()}.png` });
    }
    fs.writeFileSync(
      '../docs/hospital-performance.json',
      JSON.stringify(await page.evaluate(() => (window as any).__hefinHospital), null, 2),
    );
  }
  expect(errors).toEqual([]);
  expect(badAssets).toEqual([]);
  await page.locator(scene).getByRole('link', { name: 'Hospital portal' }).click();
  await expect.poll(() => metric(page, 'active')).toBe(0);
  await expect(page.locator('.hospital-canvas')).toHaveCount(0);
});

test('hospital respects reduced motion and handles failed model download', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator(scene)).toHaveAttribute('data-mode', 'static');
  await expect(page.locator('.hospital-canvas')).toHaveCount(0);
  await page.route('**/smart-hospital.glb', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.getByRole('button', { name: 'Explore hospital in 3D', exact: true }).click();
  await expect(page.locator(scene)).toHaveAttribute('data-mode', 'static');
  await expect(page.locator('.hospital-scene-caption')).toContainText('unavailable');
  await expect(page.locator('.hospital-fallback')).toBeVisible();
  expect(
    await page.locator('.hospital-fallback').evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(0);
});

test('hospital motion, physical zoom, responsive sizing and context-loss recovery', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await ready(page);
  if (process.env['HEFIN_SOFTWARE_TEST']) {
    expect(await metric(page, 'quality')).toBe('software');
    fs.writeFileSync(
      '../docs/hospital-software-performance.json',
      JSON.stringify(await page.evaluate(() => (window as any).__hefinHospital), null, 2),
    );
  }
  const canvas = page.locator('.hospital-canvas');
  await page.getByRole('button', { name: 'Rotate hospital', exact: true }).click();
  const start = await metric(page, 'azimuth');
  await expect
    .poll(async () => Math.abs((await metric(page, 'azimuth')) - start))
    .toBeGreaterThan(0.01);
  await page.getByRole('button', { name: 'Pause hospital', exact: true }).click();
  await page.waitForTimeout(1200);
  const still = await metric(page, 'azimuth');
  await page.waitForTimeout(400);
  expect(await metric(page, 'azimuth')).toBeCloseTo(still, 3);
  await canvas.scrollIntoViewIfNeeded();
  const before = await metric(page, 'distance');
  const box = (await canvas.boundingBox())!;
  if (info.project.name === 'desktop') {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -400);
  } else {
    const cdp = await page.context().newCDPSession(page),
      cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { id: 1, x: cx - 25, y: cy },
        { id: 2, x: cx + 25, y: cy },
      ],
    });
    for (let i = 1; i <= 6; i++)
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { id: 1, x: cx - 25 - i * 5, y: cy },
          { id: 2, x: cx + 25 + i * 5, y: cy },
        ],
      });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  await expect.poll(() => metric(page, 'distance')).toBeLessThan(before * 0.96);
  await page.getByRole('button', { name: 'Reset hospital', exact: true }).click();
  await page.setViewportSize({ width: info.project.name === 'desktop' ? 768 : 375, height: 950 });
  await canvas.scrollIntoViewIfNeeded();
  await expect.poll(() => canvas.evaluate((c) => c.clientWidth)).toBeGreaterThan(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await canvas.screenshot({
    path: `../docs/hospital-${info.project.name === 'desktop' ? 'tablet' : '375'}.png`,
  });
  await canvas.evaluate((c: HTMLCanvasElement) =>
    c.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(),
  );
  await expect(page.locator(scene)).toHaveAttribute('data-mode', 'static');
  await expect.poll(() => metric(page, 'active')).toBe(0);
  await expect(page.locator('.hospital-fallback')).toBeVisible();
});
