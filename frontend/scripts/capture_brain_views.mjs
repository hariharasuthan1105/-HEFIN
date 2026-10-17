import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const root = fileURLToPath(new URL('../dist/frontend/browser/', import.meta.url));
const artDir = 'C:\\Users\\hariharasuthan\\.gemini\\antigravity-ide\\brain\\829d0b00-3bb9-484d-ac2f-f78c82066043';

const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      if (path.extname(pathname)) {
        res.writeHead(404).end();
        return;
      }
      file = path.join(root, 'index.html');
    }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    res.writeHead(400).end();
  }
});

await new Promise(r => server.listen(4205, '127.0.0.1', r));
console.log('Preview server running on http://127.0.0.1:4205');

try {
  const browser = await chromium.launch({ channel: 'msedge' });

  // 1. Desktop Test & View Captures
  console.log('Capturing Desktop Views...');
  const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('http://127.0.0.1:4205/');

  const brainScene = desktopPage.locator('.brain-experience');
  await brainScene.scrollIntoViewIfNeeded();

  console.log('Waiting for interactive 3D brain mode...');
  await desktopPage.locator('.brain-experience[data-mode="interactive"]').waitFor({ timeout: 45000 });
  await desktopPage.waitForTimeout(2000);

  // Capture metrics
  const metrics = await desktopPage.evaluate(() => window.__hefinBrain);
  console.log('Brain 3D Metrics:', JSON.stringify(metrics, null, 2));

  // Pause rotation for steady viewpoint captures
  const pauseBtn = brainScene.getByTitle(/Pause rotation|Resume rotation/);
  await pauseBtn.click();
  await desktopPage.waitForTimeout(500);

  // Capture Section Context on desktop
  const intelligenceSection = desktopPage.locator('.intelligence-section');
  await intelligenceSection.screenshot({ path: path.join(artDir, 'brain-section-desktop.png') });
  console.log('Saved brain-section-desktop.png');

  // Reset to Isometric view
  const resetBtn = brainScene.getByTitle(/Reset to anatomical view/);
  await resetBtn.click();
  await desktopPage.waitForTimeout(1200);
  await desktopPage.locator('.brain-canvas').screenshot({ path: path.join(artDir, 'brain-isometric.png') });
  console.log('Saved brain-isometric.png');

  // Capture Each View Preset
  const views = [
    { name: 'front', selector: /Front/ },
    { name: 'back', selector: /Back/ },
    { name: 'left', selector: /Left/ },
    { name: 'right', selector: /Right/ },
    { name: 'top', selector: /Top/ },
  ];
  for (const v of views) {
    console.log(`Switching to ${v.name} view...`);
    const btn = brainScene.getByTitle(v.selector);
    await btn.click();
    await desktopPage.waitForTimeout(1200);
    const fileName = `brain-${v.name}.png`;
    await desktopPage.locator('.brain-canvas').screenshot({ path: path.join(artDir, fileName) });
    console.log(`Saved ${fileName}`);
  }

  // Test zoom buttons
  console.log('Testing Zoom in / out...');
  await brainScene.getByTitle('Zoom in').click();
  await desktopPage.waitForTimeout(600);
  await brainScene.getByTitle('Zoom out').click();
  await desktopPage.waitForTimeout(600);

  await desktopContext.close();

  // 2. Mobile Capture
  console.log('Capturing Mobile Views...');
  const mobileContext = await browser.newContext({
    ...devices['iPhone 13'],
    channel: 'msedge',
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://127.0.0.1:4205/');

  const mobileBrain = mobilePage.locator('.brain-experience');
  await mobileBrain.scrollIntoViewIfNeeded();
  await mobilePage.waitForTimeout(1000);

  // Capture initial still mode on mobile
  await mobilePage.locator('.intelligence-section').screenshot({ path: path.join(artDir, 'brain-mobile-static.png') });
  console.log('Saved brain-mobile-static.png');

  // Click 'Explore brain in 3D'
  console.log('Activating 3D on mobile...');
  await mobilePage.getByRole('button', { name: 'Explore brain in 3D' }).click();
  await mobilePage.locator('.brain-experience[data-mode="interactive"]').waitFor({ timeout: 45000 });
  await mobilePage.waitForTimeout(2000);

  await mobilePage.locator('.intelligence-section').screenshot({ path: path.join(artDir, 'brain-section-mobile.png') });
  console.log('Saved brain-section-mobile.png');

  await mobileContext.close();
  await browser.close();
} finally {
  server.close();
}
console.log('All brain captures completed successfully.');
