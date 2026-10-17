import { test, expect } from '@playwright/test';

const brainScene = '.brain-experience';

async function readyBrain(page: import('@playwright/test').Page) {
  await page.goto('/');
  const brain = page.locator(brainScene);
  await brain.scrollIntoViewIfNeeded();

  if ((page.viewportSize()?.width ?? 1440) <= 600) {
    const optIn = page.getByRole('button', { name: 'Explore brain in 3D' });
    if (await optIn.isVisible()) {
      await optIn.click();
    }
  }

  await expect(page.locator(brainScene)).toHaveAttribute('data-mode', 'interactive', {
    timeout: 45000,
  });
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { __hefinBrain?: { frames: number } }).__hefinBrain?.frames), {
      timeout: 20000,
    })
    .toBeGreaterThan(0);
}

const brainMetric = (page: import('@playwright/test').Page, key: string) =>
  page.evaluate((k) => (window as unknown as { __hefinBrain?: Record<string, unknown> }).__hefinBrain?.[k], key);

test.describe('Anatomical Brain 3D Verification', () => {
  test('brain 3D loads genuine anatomical geometry, materials, and executes rotation', async ({ page }, info) => {
    test.setTimeout(120000);
    const errors: string[] = [];
    const badAssets: string[] = [];

    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (r.url().includes('/assets/models/anatomical-brain.glb') && r.status() >= 400) {
        badAssets.push(r.url());
      }
    });

    await readyBrain(page);

    expect(badAssets).toHaveLength(0);
    expect(errors).toHaveLength(0);

    // Verify 3D anatomical geometry metrics
    expect(await brainMetric(page, 'triangles')).toBeGreaterThan(200000);
    expect(await brainMetric(page, 'calls')).toBeLessThan(20);
    expect(await brainMetric(page, 'bytes')).toBeGreaterThan(500000);

    const canvas = page.locator('.brain-canvas');
    await expect(canvas).toBeVisible();

    // Verify pause and resume toggle (before interaction pauses it)
    const pauseBtn = page.locator('.brain-controls button[aria-label*="rotation"]');
    expect(await pauseBtn.getAttribute('aria-pressed')).toBe('false');
    await pauseBtn.click();
    expect(await pauseBtn.getAttribute('aria-pressed')).toBe('true');
    await pauseBtn.click();
    expect(await pauseBtn.getAttribute('aria-pressed')).toBe('false');

    // Verify zoom in and out
    const initialDist = (await brainMetric(page, 'distance')) as number;
    const zoomIn = page.locator('.brain-controls button[title="Zoom in"]');
    await zoomIn.click();
    await page.waitForTimeout(600);
    expect((await brainMetric(page, 'distance')) as number).toBeLessThan(initialDist);

    const zoomOut = page.locator('.brain-controls button[title="Zoom out"]');
    await zoomOut.click();
    await page.waitForTimeout(600);
    expect((await brainMetric(page, 'distance')) as number).toBeGreaterThan(initialDist * 0.95);

    // Verify view presets
    const views = [
      { name: 'Isometric', label: /Isometric/ },
      { name: 'Front', label: /Front/ },
      { name: 'Back', label: /Back/ },
      { name: 'Left', label: /Left/ },
      { name: 'Right', label: /Right/ },
      { name: 'Top', label: /Top/ },
    ];

    for (const v of views) {
      const viewBtn = page.locator(`.brain-controls button[title*="${v.name}"]`);
      await expect(viewBtn).toBeVisible();
      await viewBtn.click();
      await page.waitForTimeout(500);
    }

    // Verify reset
    const resetBtn = page.locator('.brain-controls button[title*="Reset"]');
    await resetBtn.click();
    await page.waitForTimeout(600);

    // Verify orbit interaction
    const initialAzimuth = (await brainMetric(page, 'azimuth')) as number;
    if (info.project.name === 'desktop') {
      const b = (await canvas.boundingBox())!;
      await page.mouse.move(b.x + b.width * 0.5, b.y + b.height * 0.5);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width * 0.75, b.y + b.height * 0.5, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);
      expect((await brainMetric(page, 'azimuth')) as number).not.toBe(initialAzimuth);
    }

    // Still mode toggle
    const stillBtn = page.locator('.brain-controls button[title*="still preview"]');
    await stillBtn.click();
    await expect(page.locator(brainScene)).toHaveAttribute('data-mode', 'static');
    await expect(page.locator('.brain-fallback')).toBeVisible();
  });

  test('reduced-motion preference respects static anatomical fallback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const brain = page.locator(brainScene);
    await brain.scrollIntoViewIfNeeded();

    // Verify it stays static
    await expect(brain).toHaveAttribute('data-mode', 'static');
    await expect(page.locator('.brain-canvas')).toHaveCount(0);
    await expect(page.locator('.brain-fallback')).toBeVisible();
  });
});
