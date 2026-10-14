import { test, expect, Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const metrics = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          __hefinSceneMetrics: Record<string, number | string | Record<string, number>>;
        }
      ).__hefinSceneMetrics,
  );
async function capable(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: false }) });
  });
}
async function open(page: Page) {
  await capable(page);
  await page.goto('/');
  const scene = page.locator('.cinematic-experience');
  await scene.scrollIntoViewIfNeeded();
  if ((page.viewportSize()?.width ?? 1440) <= 600)
    await scene.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(scene).toHaveAttribute('data-mode', 'interactive', { timeout: 30000 });
  return scene;
}

test('both genuine GLBs load, material controls and keyboard orbit reset work', async ({
  page,
}, info) => {
  const loaded: string[] = [];
  page.on('response', (r) => {
    if (r.url().endsWith('.glb') && r.ok()) loaded.push(r.url());
  });
  const scene = await open(page);
  expect(loaded).toHaveLength(2);
  await expect(page.locator('canvas')).toHaveCount(1);
  for (const mode of ['Glass', 'Wireframe', 'Hybrid']) {
    await scene.getByRole('button', { name: mode, exact: true }).click();
    await expect(scene.getByRole('button', { name: mode, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect((await metrics(page))['mode']).toBe(mode);
  }
  await scene.getByRole('button', { name: 'Orbit right' }).focus();
  await page.keyboard.press('Enter');
  expect((await metrics(page))['yaw']).toBeGreaterThan(0);
  await scene.getByRole('button', { name: 'Reset view' }).click();
  expect((await metrics(page))['yaw']).toBe(0);
  const initial = await metrics(page);
  if (process.env['HEFIN_SOFTWARE_TEST']) {
    expect(initial['quality']).toBe('software');
    expect(initial['dpr']).toBeLessThanOrEqual(0.65);
  }
  expect(initial['modelBytes']).toBeGreaterThan(1000000);
  await page.getByRole('link', { name: 'Experience Demo', exact: true }).click();
  await expect.poll(async () => (await metrics(page))['activeRenderers']).toBe(0);
  await writeFile(
    `../docs/task-03-scene-${info.project.name}.json`,
    JSON.stringify({ initial, disposed: await metrics(page) }, null, 2),
  );
});

test('a failed or corrupt GLB preserves a usable static preview', async ({ page }) => {
  await capable(page);
  await page.route('**/models/anatomical-brain.glb', (r) =>
    r.fulfill({ status: 200, contentType: 'model/gltf-binary', body: 'invalid model' }),
  );
  await page.goto('/');
  const scene = page.locator('.cinematic-experience');
  await scene.scrollIntoViewIfNeeded();
  if ((page.viewportSize()?.width ?? 1440) <= 600)
    await scene.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(page.locator('.cinematic-caption')).toContainText('3D unavailable');
  await expect(scene.locator('img')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('link', { name: 'Experience Demo', exact: true }).click();
  await expect(page).toHaveURL(/login$/);
});

test('navigation during delayed model loading leaves no late canvas', async ({ page }) => {
  await capable(page);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/models/*.glb', async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('/');
  const scene = page.locator('.cinematic-experience');
  await scene.scrollIntoViewIfNeeded();
  if ((page.viewportSize()?.width ?? 1440) <= 600)
    await scene.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(scene).toHaveAttribute('data-mode', 'loading');
  await page.getByRole('link', { name: 'Experience Demo', exact: true }).click();
  release();
  await page.waitForTimeout(500);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page).toHaveURL(/login$/);
});

test('scene is lazy and reduced motion does not request models', async ({ page }) => {
  const requests: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('.glb')) requests.push(r.url());
  });
  await capable(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('.cinematic-experience').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  expect(requests).toEqual([]);
  await expect(page.locator('.cinematic-fallback')).toBeVisible();
});

test('five viewport captures preserve composition, touch targets, and both themes', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'desktop', 'Five explicit sizes checked once.');
  // Five independent model initializations each retain their 30-second limit.
  test.setTimeout(180000);
  await capable(page);
  const report = [];
  for (const width of [375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/');
    const scene = page.locator('.cinematic-experience');
    await scene.scrollIntoViewIfNeeded();
    if (width > 600) {
      await expect(scene).toHaveAttribute('data-mode', 'interactive', { timeout: 30000 });
      await scene.getByRole('button', { name: 'Pause motion', exact: true }).click();
      await scene.getByRole('button', { name: 'Reset view' }).click();
      report.push({ width, metrics: await metrics(page) });
    } else await expect(page.locator('.cinematic-fallback')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    for (const b of await scene.locator('button').all()) {
      const bounds = await b.boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(38);
    }
    await scene.screenshot({ path: `../docs/task-03-cinematic-${width}.png` });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => (document.documentElement.dataset['theme'] = 'light'));
  await page.locator('.cinematic-section').screenshot({ path: '../docs/task-03-light.png' });
  await writeFile('../docs/task-03-performance.json', JSON.stringify(report, null, 2));
});

test('portal data is explicitly synthetic and disclosure is keyboard accessible', async ({
  page,
}) => {
  for (const role of ['patient', 'hospital', 'insurance', 'government']) {
    await page.goto(`/${role}/dashboard`);
    await expect(page.getByText('SIMULATED WORKSPACE')).toBeVisible();
    await expect(page.locator('.portal-metric')).toHaveCount(3);
    await expect(page.locator('tbody tr')).toHaveCount(3);
    await page.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('details')).toHaveAttribute('open', '');
    await expect(page.locator('details')).toContainText('No action is submitted');
  }
});
