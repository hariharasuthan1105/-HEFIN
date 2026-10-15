import { test, expect } from '@playwright/test';

test.describe('Patient Portal — Task 04', () => {
  test('renders patient dashboard with greeting, simulated ID, and INR currency metrics', async ({
    page,
  }) => {
    await page.goto('/patient/dashboard');

    // Heading and greeting
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Welcome,');

    // Simulated patient identifier and demo badges
    await expect(page.locator('.system-demo-banner')).toContainText(
      'DEMO ENVIRONMENT — SIMULATED HEALTHCARE AND FINANCIAL DATA',
    );
    await expect(page.locator('.patient-meta')).toContainText('HEF-PAT-');

    // Metric cards displaying simulated INR figures
    const metrics = page.locator('.portal-metric');
    await expect(metrics).toHaveCount(3);
    await expect(metrics.nth(0)).toContainText('Outstanding Bills');
    await expect(metrics.nth(0)).toContainText('₹');
    await expect(metrics.nth(1)).toContainText('Remaining');
    await expect(metrics.nth(1)).toContainText('₹');

    // Verify recent care activity table
    await expect(page.locator('table')).toBeVisible();
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
  });

  test('navigates seamlessly across all 7 workspace tabs', async ({ page }) => {
    await page.goto('/patient/dashboard');
    const nav = page.locator('.sidebar-nav');

    // 1. Health Records Tab
    await nav.getByRole('button', { name: 'Health Records' }).click();
    await expect(page.locator('.portal-table-wrap')).toBeVisible();
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // 2. Medical Bills Tab
    await nav.getByRole('button', { name: 'Medical Bills' }).click();
    await expect(page.locator('table')).toContainText('Invoice #');
    await expect(page.locator('table')).toContainText('Patient Responsibility');
    await expect(page.locator('table')).toContainText('₹');

    // 3. Insurance Coverage Tab
    await nav.getByRole('button', { name: 'Insurance' }).click();
    await expect(page.locator('.coverage-progress-track')).toBeVisible();
    await expect(page.locator('body')).toContainText('Policy Limitations & Exclusions');

    // 4. Care Timeline Tab
    await nav.getByRole('button', { name: 'Care Timeline' }).click();
    await expect(page.locator('.care-timeline-feed')).toBeVisible();
    const events = page.locator('.timeline-event-item');
    expect(await events.count()).toBeGreaterThanOrEqual(2);

    // 5. Preferences Tab
    await nav.getByRole('button', { name: 'Preferences' }).click();
    await expect(page.locator('body')).toContainText('Accessibility & Display Preferences');
    await expect(page.locator('input[type="checkbox"]').first()).toBeVisible();

    // 6. AI Assistant Placeholder Tab (honest interface, no fake LLM generation)
    await nav.getByRole('button', { name: 'AI Assistant' }).click();
    await expect(page.locator('.ai-assistant-placeholder')).toBeVisible();
    await expect(page.locator('.ai-assistant-placeholder')).toContainText('Planned for Future Tasks');
    await expect(page.locator('.ai-assistant-placeholder')).toContainText('AI assistance is not connected yet');

    // 7. Return to Overview Tab
    await nav.getByRole('button', { name: 'Overview' }).click();
    await expect(page.locator('.dashboard-grid-two-col')).toBeVisible();
  });

  test('filters and searches health records and opens record detail drawer', async ({ page }) => {
    await page.goto('/patient/dashboard');
    await page.locator('.sidebar-nav').getByRole('button', { name: 'Health Records' }).click();

    // Search filter
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('cardiology');
    await page.waitForTimeout(300);

    // Record detail drawer
    const viewButton = page.locator('table tbody tr button').first();
    await viewButton.click();

    const drawer = page.locator('.drawer-panel');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Healthcare Facility');
    await expect(drawer).toContainText('Attending:');
    await expect(drawer).toContainText('Clinical Summary');

    // Close drawer
    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.drawer-panel')).toHaveCount(0);
  });

  test('inspects medical bill line items with INR currency formatting', async ({ page }) => {
    await page.goto('/patient/dashboard');
    await page.locator('.sidebar-nav').getByRole('button', { name: 'Medical Bills' }).click();

    // Open first bill line items drawer
    const viewBillBtn = page.locator('table tbody tr button').first();
    await viewBillBtn.click();

    const drawer = page.locator('.drawer-panel');
    await expect(drawer).toBeVisible();
    await expect(drawer).toContainText('Itemized Hospital Services');
    await expect(drawer).toContainText('₹');
    await expect(drawer).toContainText('Simulated financial figures');

    await drawer.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('.drawer-panel')).toHaveCount(0);
  });

  test('toggles accessibility preference and displays confirmation', async ({ page }) => {
    await page.goto('/patient/dashboard');
    await page.locator('.sidebar-nav').getByRole('button', { name: 'Preferences' }).click();

    const motionCheckbox = page.locator('input[type="checkbox"]').first();
    await motionCheckbox.click();
    await expect(page.locator('body')).toContainText('Preference saved');
  });

  test('displays honest backend unavailable state when live mode cannot reach API', async ({
    page,
  }) => {
    await page.goto('/patient/dashboard');

    // Initially in simulated mode
    await expect(page.locator('.api-connectivity-badge')).toContainText('SIMULATED DEMO');

    // Click "Connect Live API" (attempts live connection to 127.0.0.1:8000)
    await page.getByRole('button', { name: 'Connect Live API' }).click();

    // When backend is not running, shows honest unavailable alert banner
    await expect(page.locator('.backend-error-banner')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.backend-error-banner')).toContainText('Backend Unavailable');

    // Switch back to simulated demo
    await page.locator('.backend-error-banner').getByRole('button', { name: 'Switch to Simulated Demo' }).click();
    await expect(page.locator('.api-connectivity-badge')).toContainText('SIMULATED DEMO');
    await expect(page.locator('.backend-error-banner')).toHaveCount(0);
  });

  test('switches demo patient identity cleanly', async ({ page }) => {
    await page.goto('/patient/dashboard');

    const select = page.locator('select');
    await expect(select).toBeVisible();

    // Switch to Priya Patel
    await select.selectOption('priya.patel');
    await expect(page.locator('.patient-meta')).toContainText('Priya Patel');

    // Switch to Rohan Verma
    await select.selectOption('rohan.verma');
    await expect(page.locator('.patient-meta')).toContainText('Rohan Verma');
  });
});
