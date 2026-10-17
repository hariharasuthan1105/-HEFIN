import { chromium } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(__dirname, '../../docs');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge' });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
    Object.defineProperty(navigator, 'connection', { get: () => ({ saveData: false }) });
  });

  console.log('Navigating to http://127.0.0.1:4201/...');
  await page.goto('http://127.0.0.1:4201/');
  const scene = page.locator('.cinematic-experience');
  await scene.scrollIntoViewIfNeeded();
  await scene.waitFor({ state: 'visible' });
  await page.waitForSelector('canvas.cinematic-canvas', { timeout: 30000 });
  await page.waitForTimeout(1500); // Allow render to stabilize

  const canvas = page.locator('canvas.cinematic-canvas');
  const box = await canvas.boundingBox();

  // 1. Front Perspective (Default Center)
  console.log('Capturing front view...');
  await scene.getByRole('button', { name: 'Reset view' }).click();
  await page.waitForTimeout(500);
  await scene.screenshot({ path: path.join(docsDir, 'trust-network-front.png') });

  // 2. Isometric Perspective (Orbit Right 1 click)
  console.log('Capturing isometric view...');
  await scene.getByRole('button', { name: 'Orbit right' }).click();
  await page.waitForTimeout(500);
  await scene.screenshot({ path: path.join(docsDir, 'trust-network-isometric.png') });

  // 3. Side Perspective (Orbit Right 2 more clicks)
  console.log('Capturing side view...');
  await scene.getByRole('button', { name: 'Orbit right' }).click();
  await scene.getByRole('button', { name: 'Orbit right' }).click();
  await page.waitForTimeout(500);
  await scene.screenshot({ path: path.join(docsDir, 'trust-network-side.png') });

  // 4. Top / High-angle Perspective (Drag down on canvas)
  console.log('Capturing top perspective...');
  await scene.getByRole('button', { name: 'Reset view' }).click();
  await page.waitForTimeout(400);
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.35);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.75, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(600);
  }
  await scene.screenshot({ path: path.join(docsDir, 'trust-network-top.png') });

  // Reset view
  await scene.getByRole('button', { name: 'Reset view' }).click();
  await page.waitForTimeout(400);

  // 5. Mobile 390px Viewport
  console.log('Capturing mobile 390px view...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(800);
  const exploreBtn = scene.getByRole('button', { name: 'Explore in 3D' });
  if (await exploreBtn.isVisible()) {
    await exploreBtn.click();
    await page.waitForTimeout(1500);
  }
  await scene.screenshot({ path: path.join(docsDir, 'trust-network-mobile-390.png') });

  await browser.close();
  console.log('All 5 perspectives captured successfully into docs/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
