import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:4201' + (process.argv.includes('--pages') ? '/-HEFIN' : '');
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: false }),
      configurable: true,
    });
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  const assets = [];
  page.on('response', (r) => {
    if (/\.(glb|wasm)$/.test(r.url())) assets.push({ url: r.url(), ok: r.ok() });
  });
  await page.goto(base + '/');
  await page.locator('h1').waitFor();
  assert.match(await page.locator('h1').innerText(), /Healthcare/);
  const beforeScene = await cdp.send('Performance.getMetrics');
  await page.locator('.cinematic-experience').scrollIntoViewIfNeeded();
  await page.locator('.cinematic-experience[data-mode="interactive"]').waitFor({ timeout: 30000 });
  assert.equal(await page.locator('canvas.cinematic-canvas').count(), 1);
  assert.equal(await page.evaluate(() => window.__hefinSceneMetrics), undefined);
  assert.equal(assets.filter((a) => a.url.endsWith('.glb')).length, 2);
  assert(assets.every((a) => a.ok && a.url.startsWith(base + '/assets/')));
  const afterScene = await cdp.send('Performance.getMetrics');
  const timing = await page.evaluate(async () => {
    const frames = [];
    let last = performance.now();
    await new Promise((resolve) => {
      function sample(now) {
        frames.push(now - last);
        last = now;
        if (frames.length < 90) requestAnimationFrame(sample);
        else resolve();
      }
      requestAnimationFrame(sample);
    });
    const sorted = frames.slice(1).sort((a, b) => a - b);
    return {
      navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
      rafMedianMs: sorted[Math.floor(sorted.length * 0.5)],
      rafP95Ms: sorted[Math.floor(sorted.length * 0.95)],
      resources: performance
        .getEntriesByType('resource')
        .filter((r) => /\.(glb|wasm|js|css|woff2)$/.test(r.name))
        .map((r) => ({
          name: new URL(r.name).pathname,
          bytes: r.encodedBodySize,
          duration: r.duration,
        })),
    };
  });
  await page.getByRole('button', { name: 'Glass', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: 'Glass', exact: true }).getAttribute('aria-pressed'),
    'true',
  );
  assert.equal(await page.getByRole('link', { name: 'Design system', exact: true }).count(), 0);
  await page.goto(base + '/design-system');
  await page.getByRole('heading', { name: 'Let’s get you back on track.' }).waitFor();
  await page.goto(base + '/hospital/dashboard');
  await page.getByRole('heading', { name: 'Hospital workspace', exact: true }).waitFor();
  const afterNavigation = await cdp.send('Performance.getMetrics');
  const heap = (snapshot) =>
    Object.fromEntries(
      snapshot.metrics
        .filter((m) => ['JSHeapUsedSize', 'JSHeapTotalSize', 'Nodes', 'Documents'].includes(m.name))
        .map((m) => [m.name, m.value]),
    );
  await writeFile(
    `../docs/task-03-production${process.argv.includes('--pages') ? '-pages' : ''}.json`,
    JSON.stringify(
      {
        timing,
        heapBeforeScene: heap(beforeScene),
        heapAfterScene: heap(afterScene),
        heapAfterNavigation: heap(afterNavigation),
        note: 'Local Chromium observation; rAF cadence is not GPU frame time. Heap includes the whole app and is not a leak proof.',
      },
      null,
      2,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    'PASS: production cinematic GLBs/Draco paths, material control, deep link, no debug metrics/design-system route/link, no console errors.',
    base,
  );
} finally {
  await browser.close();
}
