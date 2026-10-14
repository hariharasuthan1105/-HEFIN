import { test, expect, Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
type Metrics = {
  created: number;
  disposed: number;
  activeRenderers: number;
  activeLoops: number;
  frames: number;
  geometries: number;
  materials: number;
  textures: number;
  dpr: number;
  drawCalls: number;
  triangles: number;
  framing: { maxAbsX: number; maxAbsY: number; distance: number; width: number; height: number };
};
const metrics = (page: Page) =>
  page.evaluate(() => (window as unknown as { __hefinSceneMetrics: Metrics }).__hefinSceneMetrics);
async function capableDevice(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: false }),
      configurable: true,
    });
  });
}
async function interactive(page: Page) {
  await capableDevice(page);
  await page.goto('/');
  const scene = page.locator('.cinematic-experience');
  await scene.scrollIntoViewIfNeeded();
  if ((page.viewportSize()?.width ?? 1440) <= 600)
    await page.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(scene).toHaveAttribute('data-mode', 'interactive', { timeout: 30000 });
  await expect(page.locator('canvas.cinematic-canvas')).toHaveCount(1);
}
test('hero actions, workflow and roadmap have real destinations and state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore HEFIN', exact: true }).click();
  await expect(page).toHaveURL(/#mission$/);
  await expect(page.locator('#mission')).toBeInViewport();
  await page.getByRole('button', { name: '04 Insurer', exact: false }).click();
  await expect(page.locator('.workflow-detail')).toContainText('A human reviewer');
  await page.getByRole('button', { name: '02 / PROPOSED Pilot' }).click();
  await expect(page.locator('.roadmap-detail')).toContainText('No signed partnerships');
  await page.getByRole('link', { name: 'Experience Demo', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});
test('reduced motion and low-power devices keep an honest static fallback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('.cinematic-caption')).toContainText('Reduced motion');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.cinematic-fallback')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Explore in 3D' })).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: true }),
      configurable: true,
    });
  });
  await page.reload();
  await expect(page.locator('.cinematic-caption')).toContainText('Low-power');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Explore in 3D' })).toBeVisible();
});
test('WebGL failure falls back without blocking routes', async ({ page }) => {
  await capableDevice(page);
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (...args: unknown[]) {
      if (args[0] === 'webgl2') return null;
      return Reflect.apply(original, this, args);
    } as typeof original;
  });
  await page.goto('/');
  await page.locator('.cinematic-experience').scrollIntoViewIfNeeded();
  if ((page.viewportSize()?.width ?? 1440) <= 600)
    await page.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(page.locator('.cinematic-caption')).toContainText('3D unavailable');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.cinematic-fallback')).toBeVisible();
  await page.getByRole('link', { name: 'Hospital portal', exact: false }).click();
  await expect(page).toHaveURL(/\/hospital\/dashboard$/);
});
test('real 3D pauses offscreen, supports controls and disposes all owned resources', async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await interactive(page);
  await expect.poll(async () => (await metrics(page)).frames).toBeGreaterThan(3);
  const initial = await metrics(page);
  if (process.env['CI']) console.log('Scene render sample:', JSON.stringify(initial));
  expect(initial.activeRenderers).toBe(1);
  expect(initial.activeLoops).toBe(1);
  expect(initial.dpr).toBeLessThanOrEqual(testInfo.project.name === 'mobile' ? 1 : 1.5);
  expect(initial.triangles).toBeGreaterThan(100);
  expect(initial.geometries).toBeGreaterThan(5);
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect.poll(async () => (await metrics(page)).activeLoops).toBe(0);
  const frozen = (await metrics(page)).frames;
  await page.waitForTimeout(300);
  expect((await metrics(page)).frames).toBe(frozen);
  await page.getByRole('button', { name: 'Reset view', exact: true }).click();
  expect((await metrics(page)).frames).toBeGreaterThan(frozen);
  await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await expect.poll(async () => (await metrics(page)).activeLoops).toBe(1);
  await page.locator('#workflow').scrollIntoViewIfNeeded();
  await expect.poll(async () => (await metrics(page)).activeLoops).toBe(0);
  const offscreen = (await metrics(page)).frames;
  await page.waitForTimeout(300);
  expect((await metrics(page)).frames).toBe(offscreen);
  await page.locator('.cinematic-experience').scrollIntoViewIfNeeded();
  await expect.poll(async () => (await metrics(page)).activeLoops).toBe(1);
  await page.getByRole('button', { name: 'Static view', exact: true }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect((await metrics(page)).activeRenderers).toBe(0);
  expect((await metrics(page)).geometries).toBe(0);
  expect((await metrics(page)).materials).toBe(0);
  await page.getByRole('button', { name: 'Explore in 3D' }).click();
  await expect(page.locator('.cinematic-experience')).toHaveAttribute('data-mode', 'interactive', {
    timeout: 30000,
  });
  await page.getByRole('link', { name: 'Experience Demo', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  const clean = await metrics(page);
  expect(clean.activeLoops).toBe(0);
  expect(clean.activeRenderers).toBe(0);
  expect(clean.geometries).toBe(0);
  expect(clean.materials).toBe(0);
  expect(clean.textures).toBe(0);
  expect(clean.created).toBe(clean.disposed);
  expect(errors).toEqual([]);
  await testInfo.attach('render-counters', {
    body: JSON.stringify({ initial, clean }, null, 2),
    contentType: 'application/json',
  });
  await writeFile(
    `../docs/task-03-render-${testInfo.project.name}.json`,
    JSON.stringify({ initial, clean }, null, 2),
  );
});
test('calculated camera fit contains the campus through live resize and pointer orbit', async ({
  page,
}, testInfo) => {
  test.skip(
    // Several resizes and pointer operations share one initialized renderer.
    testInfo.project.name !== 'desktop',
    'This test resizes the same live renderer through all four sizes.',
  );
  test.setTimeout(180000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await interactive(page);
  const samples: unknown[] = [];
  for (const width of [1440, 768, 375, 1024]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('.cinematic-experience').scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await expect.poll(async () => (await metrics(page)).framing.width).toBeGreaterThan(100);
    const viewport = await page.locator('.cinematic-viewport').boundingBox();
    if (!viewport) throw new Error('Hospital viewport is not visible');
    for (const [x, y] of [
      [0.03, 0.03],
      [0.97, 0.03],
      [0.97, 0.97],
      [0.03, 0.97],
    ]) {
      await page.mouse.move(viewport.x + viewport.width * x!, viewport.y + viewport.height * y!);
      await page.waitForTimeout(400);
      const value = await metrics(page);
      expect(value.framing.maxAbsX).toBeLessThan(1);
      expect(value.framing.maxAbsY).toBeLessThan(1);
      expect(value.activeRenderers).toBe(1);
      expect(value.activeLoops).toBe(1);
      samples.push({ viewportWidth: width, pointer: [x, y], ...value.framing });
    }
    await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.getByRole('button', { name: 'Reset view', exact: true }).click();
    await page
      .locator('.cinematic-experience')
      .screenshot({ path: `../docs/task-03-camera-${width}.png` });
    await page.getByRole('button', { name: 'Resume motion', exact: true }).click();
  }
  await writeFile('../docs/task-03-framing.json', JSON.stringify(samples, null, 2));
});
test('hidden documents stop rendering and visible documents resume one loop', async ({ page }) => {
  await interactive(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await metrics(page)).activeLoops).toBe(0);
  const frames = (await metrics(page)).frames;
  await page.waitForTimeout(300);
  expect((await metrics(page)).frames).toBe(frames);
  await page.evaluate(() => {
    delete (document as unknown as { hidden?: boolean }).hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(async () => (await metrics(page)).activeLoops).toBe(1);
  await expect.poll(async () => (await metrics(page)).frames).toBeGreaterThan(frames);
});
test('route cycles and changing motion preference do not duplicate render loops', async ({
  page,
}) => {
  test.setTimeout(180000);
  await interactive(page);
  for (let i = 0; i < 3; i++) {
    await page.getByRole('link', { name: 'Experience Demo', exact: true }).click();
    await expect.poll(async () => (await metrics(page)).activeRenderers).toBe(0);
    await page.getByRole('link', { name: 'HEFIN home', exact: true }).first().click();
    await page.locator('.cinematic-experience').scrollIntoViewIfNeeded();
    if ((page.viewportSize()?.width ?? 1440) <= 600)
      await page.getByRole('button', { name: 'Explore in 3D' }).click();
    await expect(page.locator('.cinematic-experience')).toHaveAttribute(
      'data-mode',
      'interactive',
      { timeout: 30000 },
    );
    expect((await metrics(page)).activeRenderers).toBe(1);
    expect((await metrics(page)).activeLoops).toBe(1);
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.cinematic-caption')).toContainText('Reduced motion');
  expect((await metrics(page)).activeLoops).toBe(0);
  expect((await metrics(page)).created).toBe((await metrics(page)).disposed);
  await expect(page.locator('canvas')).toHaveCount(0);
});
test('context loss releases renderer and shows original reference', async ({ page }) => {
  await interactive(page);
  await page
    .locator('canvas')
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext(),
    );
  await expect(page.locator('.cinematic-caption')).toContainText('3D unavailable');
  await expect(page.locator('.cinematic-fallback')).toBeVisible();
  expect((await metrics(page)).activeLoops).toBe(0);
  expect((await metrics(page)).activeRenderers).toBe(0);
});
test('requested breakpoints remain readable and overflow-free', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'All requested sizes are checked once.');
  test.setTimeout(180000);
  await capableDevice(page);
  for (const width of [375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Experience Demo', exact: true })).toBeVisible();
    await page.locator('.brain-scene img').scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page
          .locator('.brain-scene img')
          .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
      )
      .toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.locator('.cinematic-experience').scrollIntoViewIfNeeded();
    if (width > 600)
      await expect(page.locator('.cinematic-experience')).toHaveAttribute(
        'data-mode',
        'interactive',
        { timeout: 30000 },
      );
    if (await page.getByRole('button', { name: 'Pause motion', exact: true }).isVisible())
      await page.getByRole('button', { name: 'Pause motion', exact: true }).click();
    await page.screenshot({ path: `../docs/task-03-${width}.png`, fullPage: true });
    await page.locator('.hero').screenshot({ path: `../docs/task-03-hero-${width}.png` });
  }
});
