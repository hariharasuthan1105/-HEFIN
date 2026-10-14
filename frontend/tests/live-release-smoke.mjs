import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const base = 'https://hariharasuthan1105.github.io/-HEFIN/';
const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });
const report = {
  base,
  verifiedAt: new Date().toISOString(),
  routes: [],
  viewports: [],
  assets: [],
  expectedDocument404s: [],
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
};
const modelHashes = new Map([
  ['anatomical-brain.glb', 'c18caf816c8f4185a0f75ad4d553157ffa1e10111077e4375fea2f44ceaa7f53'],
  ['smart-hospital.glb', 'f6c08dbab0646d60f442e843178d70359f75b3a262fd082de5a58b6ffd396696'],
]);
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(30000);
  page.setDefaultNavigationTimeout(60000);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });
    Object.defineProperty(navigator, 'connection', {
      get: () => ({ saveData: false }),
      configurable: true,
    });
  });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') report.consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    if (!request.failure()?.errorText.includes('ERR_ABORTED'))
      report.failedRequests.push({ url: request.url(), error: request.failure()?.errorText });
  });
  page.on('response', (response) => {
    if (response.request().resourceType() === 'document' && response.status() === 404)
      report.expectedDocument404s.push(response.url());
    else if (response.url().startsWith(base))
      report.assets.push({
        url: response.url(),
        status: response.status(),
        type: response.request().resourceType(),
      });
  });
  const initial = await page.goto(base);
  assert.equal(initial.status(), 200);
  await expect(page.locator('h1')).toContainText('Healthcare');
  await expect(page.locator('.site-header')).toBeVisible();
  const logo = page.getByRole('link', { name: 'HEFIN home', exact: true }).first().locator('img');
  await expect(logo).toBeVisible();
  assert(await logo.evaluate((img) => img.complete && img.naturalWidth > 0));
  const scene = page.locator('.cinematic-experience');
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-mode', 'interactive', { timeout: 30000 });
  await expect(page.locator('canvas.cinematic-canvas')).toHaveCount(1);
  const canvas = page.locator('canvas.cinematic-canvas');
  const movingBefore = await canvas.screenshot();
  await page.waitForTimeout(700);
  assert(!movingBefore.equals(await canvas.screenshot()));
  report.animation = 'canvas changes while running';
  for (const mode of ['Glass', 'Wireframe', 'Hybrid']) {
    const button = scene.getByRole('button', { name: mode, exact: true });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }
  await scene.getByRole('button', { name: 'Pause motion', exact: true }).click();
  await expect(scene.getByRole('button', { name: 'Resume motion', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const paused = await canvas.screenshot();
  await page.waitForTimeout(400);
  assert(paused.equals(await canvas.screenshot()));
  report.pause = 'canvas remains stable while paused';
  await scene.getByRole('button', { name: 'Orbit right' }).click();
  assert(!paused.equals(await canvas.screenshot()));
  await scene.getByRole('button', { name: 'Reset view' }).click();
  const reset = await canvas.screenshot();
  await scene.getByRole('button', { name: 'Orbit left' }).click();
  await scene.getByRole('button', { name: 'Reset view' }).click();
  assert(reset.equals(await canvas.screenshot()));
  report.camera = 'orbit changes canvas; reset reproducibly restores view';
  await scene.screenshot({ path: '../docs/task-03-live-desktop.png' });
  await scene.getByRole('button', { name: 'Resume motion', exact: true }).click();
  await expect(page.locator('.cinematic-viewport')).toHaveAttribute('data-rendering', 'running');
  await scene.getByRole('button', { name: 'Static view' }).click();
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(scene.locator('img')).toBeVisible();
  assert(await scene.locator('img').evaluate((img) => img.complete && img.naturalWidth > 0));
  await page.evaluate(() => document.fonts.ready);
  for (const font of [
    'Orbitron',
    'Audiowide',
    'Russo One',
    'Space Grotesk',
    'Plus Jakarta Sans',
    'JetBrains Mono',
    'Pixelify Sans',
  ]) {
    assert(
      await page.evaluate(async (font) => {
        await document.fonts.load(`16px "${font}"`);
        return document.fonts.check(`16px "${font}"`);
      }, font),
    );
  }
  report.fontsLoaded = await page.evaluate(() =>
    [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family),
  );
  for (const [name, expectedHash] of modelHashes) {
    const response = await page.request.get(base + 'assets/models/' + name);
    assert(response.ok());
    const bytes = await response.body();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256, expectedHash);
    (report.models ??= []).push({ name, bytes: bytes.length, sha256 });
  }
  for (const asset of [
    'assets/draco/draco_decoder.wasm',
    'assets/draco/draco_wasm_wrapper.js',
    'assets/images/cinematic-fallback.webp',
    'assets/models/ATTRIBUTION.txt',
  ]) {
    const response = await page.request.get(base + asset);
    assert(response.ok(), asset);
    report.assets.push({ url: base + asset, status: response.status(), type: 'explicit-check' });
  }
  for (const route of [
    'about',
    'ai',
    'login',
    'patient/dashboard',
    'hospital/dashboard',
    'insurance/dashboard',
    'government/dashboard',
  ]) {
    const response = await page.goto(base + route);
    assert([200, 404].includes(response.status()));
    await expect(page.locator('h1')).toBeVisible();
    if (route.endsWith('/dashboard')) {
      await expect(page.getByText('SIMULATED WORKSPACE')).toBeVisible();
      await expect(page.locator('tbody tr')).toHaveCount(3);
    }
    report.routes.push({
      route,
      directStatus: response.status(),
      heading: await page.locator('h1').innerText(),
    });
    await page.reload();
    await expect(page.locator('h1')).toBeVisible();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  for (const width of [375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(base);
    await expect(page.locator('h1')).toBeVisible();
    await scene.scrollIntoViewIfNeeded();
    if (width <= 600) {
      await expect(scene).toHaveAttribute('data-mode', 'static');
      await expect(scene.locator('img')).toBeVisible();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await page
        .getByRole('navigation', { name: 'Main navigation' })
        .getByRole('link', { name: 'Who we are', exact: true })
        .click();
      await expect(page).toHaveURL(base + 'about');
      report.mobileNavigation = 'passed';
      await page.goto(base);
      await scene.scrollIntoViewIfNeeded();
    } else {
      await expect(scene).toHaveAttribute('data-mode', 'interactive', { timeout: 30000 });
      await scene.getByRole('button', { name: 'Pause motion', exact: true }).click();
    }
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    report.viewports.push({ width, mode: await scene.getAttribute('data-mode'), overflow: false });
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(scene).toHaveAttribute('data-mode', 'static');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.cinematic-caption')).toContainText('Reduced motion');
  report.reducedMotion = 'passed';
  assert(!report.assets.some((asset) => asset.status >= 400));
  assert.equal(report.pageErrors.length, 0);
  assert.equal(report.failedRequests.length, 0);
  const unexpected = report.consoleErrors.filter((message) => !message.includes('404'));
  assert.deepEqual(unexpected, []);
  assert(report.assets.some((asset) => asset.url.endsWith('draco_decoder.wasm')));
  report.result = 'passed';
  console.log(
    'PASS: live Angular site, controls, model hashes, assets, seven direct routes/reloads, five widths and reduced motion.',
  );
} finally {
  await writeFile('../docs/task-03-live-verification.json', JSON.stringify(report, null, 2));
  await browser.close();
}
