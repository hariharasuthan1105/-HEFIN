import { test, expect } from '@playwright/test';
const routes = [
  '/',
  '/about',
  '/solution',
  '/how-it-works',
  '/ai',
  '/roadmap',
  '/contact',
  '/login',
  '/patient/dashboard',
  '/hospital/dashboard',
  '/insurance/dashboard',
  '/government/dashboard',
  '/design-system',
];
test('all routes render without runtime errors or horizontal overflow', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).not.toBeEmpty();
    await expect(page).toHaveTitle('HEFIN | Intelligent Healthcare & Insurance');
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('branding assets and every configured font load locally', async ({ page }) => {
  await page.goto('/design-system');
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
    expect(
      await page.evaluate(async (f) => {
        await document.fonts.load(`16px "${f}"`);
        return document.fonts.check(`16px "${f}"`);
      }, font),
    ).toBe(true);
  }
  expect(
    await page
      .locator('h-logo img')
      .first()
      .evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth === 294),
  ).toBe(true);
  const favicon = await page.request.get('/favicon.ico');
  expect(favicon.ok()).toBe(true);
});
test('portal selection and return navigation work without implying authentication', async ({
  page,
}) => {
  for (const role of ['patient', 'hospital', 'insurance', 'government']) {
    await page.goto('/login');
    await page.locator(`.portal-card[data-role="${role}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
    await expect(page.getByText('SIMULATED WORKSPACE', { exact: true })).toBeVisible();
    await expect(
      page.getByText('These placeholders do not represent live activity.', { exact: false }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Switch preview' }).click();
    await expect(page).toHaveURL(/\/login$/);
  }
});
test('theme persists, process steps change and unknown routes recover', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to light theme' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.goto('/how-it-works');
  await page.getByRole('button', { name: '04 Insurer' }).click();
  await expect(page.locator('.process-detail')).toContainText('A human reviewer');
  await page.goto('/missing');
  await expect(page.locator('h1')).toContainText('back on track');
  await page.getByRole('link', { name: 'Back to home' }).click();
  await expect(page).toHaveURL('/');
});
test('keyboard skip link, mobile menu and focus-trapped dialog work', async ({
  page,
}, testInfo) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByRole('navigation')).toBeVisible();
    await page.getByRole('navigation').getByRole('link', { name: 'Who we are' }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole('button', { name: 'Open navigation' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  }
  await page.goto('/design-system');
  const opener = page.getByRole('button', { name: 'Open accessible dialog example' });
  await opener.click();
  const close = page.getByRole('button', { name: 'Close dialog' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(opener).toBeFocused();
});
test('reduced-motion disables animation and captures responsive landing', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const brain = page.locator('.brain-scene img');
  await brain.scrollIntoViewIfNeeded();
  await expect
    .poll(() => brain.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator('.page-enter')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('.text-mask>span').first()).toHaveCSS('animation-name', 'none');
  await page.screenshot({ path: `../docs/task-03-landing-${testInfo.project.name}.png`, fullPage: true });
});
