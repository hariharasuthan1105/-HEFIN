import { test, expect } from '@playwright/test';

test.describe('HEFIN Care Assistant — Chatbot & Intent Routing (Task 04)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patient/dashboard');
    await expect(page.locator('h1')).toContainText('Welcome,');
  });

  test('1 & 2: floating launcher button opens and closes the floating chat panel', async ({ page }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await expect(launcher).toBeVisible();
    await expect(launcher).toContainText('Care Assistant');

    // Floating panel should initially not be visible
    const floatingPanel = page.locator('.assistant-panel.floating-mode');
    await expect(floatingPanel).toHaveCount(0);

    // Open chat
    await launcher.click();
    await expect(floatingPanel).toBeVisible();
    await expect(floatingPanel.locator('.assistant-title')).toContainText('HEFIN Care Assistant');
    await expect(floatingPanel.locator('.assistant-banner')).toContainText('SIMULATED HEALTHCARE & INSURANCE DATA');

    // Close via close button
    const closeBtn = floatingPanel.locator('#assistant-close-btn');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await expect(page.locator('.assistant-panel.floating-mode')).toHaveCount(0);
  });

  test('3: renders inline assistant in the Patient Portal AI Assistant section', async ({ page }) => {
    // Navigate to AI Assistant tab
    const aiTabBtn = page.locator('.sidebar-nav').getByRole('button', { name: 'AI Assistant' });
    await expect(aiTabBtn).toBeVisible();
    await aiTabBtn.click();

    // Verify inline assistant session container
    const inlineSection = page.locator('.interactive-assistant-section');
    await expect(inlineSection).toBeVisible();
    await expect(inlineSection).toContainText('Active Care Assistant Session');

    const inlinePanel = inlineSection.locator('.assistant-panel.inline-mode');
    await expect(inlinePanel).toBeVisible();
    await expect(inlinePanel.locator('.assistant-title')).toContainText('HEFIN Care Assistant');

    // Welcome message should be present
    const firstMsg = inlinePanel.locator('.chat-row.assistant').first();
    await expect(firstMsg).toContainText('I am the HEFIN Care Assistant');

    // Test sending message through inline assistant
    const input = inlinePanel.locator('#assistant-query-input');
    await input.fill('What is the status of my claim?');
    await inlinePanel.locator('#assistant-send-btn').click();

    const claimCard = inlinePanel.locator('.assistant-card.claim-card');
    await expect(claimCard).toBeVisible({ timeout: 5000 });
  });

  test('4 & 5: sends claim status question and displays grounded claim progress card with steps', async ({
    page,
  }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');
    await expect(panel).toBeVisible();

    const input = panel.locator('#assistant-query-input');
    const sendBtn = panel.locator('#assistant-send-btn');

    await input.fill('What is the status of my claim?');
    await sendBtn.click();

    // Verify claim response bubble and card
    const claimCard = panel.locator('.assistant-card.claim-card');
    await expect(claimCard).toBeVisible({ timeout: 5000 });
    await expect(claimCard).toContainText('Claim Progress');
    await expect(claimCard).toContainText('CLM-');
    await expect(claimCard).toContainText('CLAIMED');
    await expect(claimCard).toContainText('₹');
    await expect(claimCard).toContainText('Current Stage:');
    await expect(claimCard.locator('.step-trace-row').first()).toBeVisible();
  });

  test('6: asks for medical bill details and displays itemized hospital line items in INR', async ({
    page,
  }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');

    const input = panel.locator('#assistant-query-input');
    await input.fill('Show my unpaid bills');
    await panel.locator('#assistant-send-btn').click();

    const billCard = panel.locator('.assistant-card.bill-card');
    await expect(billCard).toBeVisible({ timeout: 5000 });
    await expect(billCard).toContainText('Medical Bill');
    await expect(billCard).toContainText('TOTAL BILLED');
    await expect(billCard).toContainText('PATIENT SHARE');
    await expect(billCard).toContainText('₹');
    await expect(billCard.locator('.line-item-row').first()).toBeVisible();
  });

  test('7: asks for insurance coverage and checks annual limit and policy exclusions', async ({
    page,
  }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');

    const input = panel.locator('#assistant-query-input');
    await input.fill('How much coverage is remaining?');
    await panel.locator('#assistant-send-btn').click();

    const insCard = panel.locator('.assistant-card.insurance-card');
    await expect(insCard).toBeVisible({ timeout: 5000 });
    await expect(insCard).toContainText('Insurance Coverage');
    await expect(insCard).toContainText('ANNUAL LIMIT');
    await expect(insCard).toContainText('REMAINING');
    await expect(insCard).toContainText('CO-PAY');
    await expect(insCard).toContainText('Policy Exclusions:');
  });

  test('8: views upcoming appointments and clinician consultation details', async ({ page }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');

    const input = panel.locator('#assistant-query-input');
    await input.fill('When is my next appointment?');
    await panel.locator('#assistant-send-btn').click();

    const aptCard = panel.locator('.assistant-card.appointment-card');
    await expect(aptCard).toBeVisible({ timeout: 5000 });
    await expect(aptCard).toContainText('Consultation');
    await expect(aptCard).toContainText('Instructions:');
  });

  test('9: clicking suggested question chip automatically dispatches inquiry', async ({ page }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');

    const chip = panel.locator('.quick-prompt-chip').filter({ hasText: 'Show my unpaid bills' }).first();
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(panel.locator('.assistant-card.bill-card')).toBeVisible({ timeout: 5000 });
  });

  test('10: navigation action on chatbot response card switches workspace tabs', async ({
    page,
  }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');

    const input = panel.locator('#assistant-query-input');
    await input.fill('What is the status of my claim?');
    await panel.locator('#assistant-send-btn').click();

    const claimCard = panel.locator('.assistant-card.claim-card');
    await expect(claimCard).toBeVisible({ timeout: 5000 });

    // Click "Open Claims in Workspace"
    const navBtn = claimCard.locator('.card-action-btn');
    await expect(navBtn).toBeVisible();
    await navBtn.click();

    // Verify active tab switched to Insurance
    const insuranceNavBtn = page.locator('.sidebar-nav').getByRole('button', { name: 'Insurance' });
    await expect(insuranceNavBtn).toHaveClass(/active/);
    await expect(page.locator('.coverage-progress-track')).toBeVisible();
  });

  test('11: clear chat button resets conversation to initial welcome state', async ({ page }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');

    const input = panel.locator('#assistant-query-input');
    await input.fill('When is my next appointment?');
    await panel.locator('#assistant-send-btn').click();
    await expect(panel.locator('.assistant-card.appointment-card')).toBeVisible({ timeout: 5000 });

    // Click clear chat
    const clearBtn = panel.locator('#assistant-clear-btn');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    // Verify reset to single welcome message
    await expect(panel.locator('.assistant-card.appointment-card')).toHaveCount(0);
    const messages = panel.locator('.chat-row');
    await expect(messages).toHaveCount(1);
    await expect(messages.first()).toContainText('I am the HEFIN Care Assistant');
  });

  test('12: empty queries are blocked and unsupported queries yield grounded guidance', async ({
    page,
  }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');

    const input = panel.locator('#assistant-query-input');
    const sendBtn = panel.locator('#assistant-send-btn');

    // Empty input: button must be disabled
    await input.fill('   ');
    await expect(sendBtn).toBeDisabled();

    // Unsupported query
    await input.fill('Can you order pizza for dinner tonight?');
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Should return honest disclaimer & instructions, not hallucinated text
    const lastMsg = panel.locator('.chat-row.assistant').last();
    await expect(lastMsg).toContainText('I could not match your inquiry to your recorded synthetic data');
    await expect(lastMsg).toContainText('suggested questions below');
  });

  test('13: handles API disconnect in live mode with honest unavailable warning and fallback', async ({
    page,
  }) => {
    // Switch to Live API mode (which attempts connection to 127.0.0.1:8000)
    await page.getByRole('button', { name: 'Connect Live API' }).click();

    // Open floating chat
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');
    await expect(panel).toBeVisible();

    const input = panel.locator('#assistant-query-input');
    await input.fill('What is my claim status?');
    await panel.locator('#assistant-send-btn').click();

    // When backend is not running on 8000, error message appears
    const errorBubble = panel.locator('.msg-bubble.has-error');
    await expect(errorBubble).toBeVisible({ timeout: 10000 });
    await expect(errorBubble).toContainText('Backend service is temporarily unreachable');

    // Clicking "Use Simulated Demo Mode" switches mode and delivers response
    const fallbackChip = panel.locator('.action-chip', { hasText: 'Use Simulated Demo Mode' });
    await expect(fallbackChip).toBeVisible();
    await fallbackChip.click();

    // Verify claim card appears from simulated data
    await expect(panel.locator('.assistant-card.claim-card')).toBeVisible({ timeout: 5000 });
  });

  test('14: mobile layout preserves floating launcher and responsive full-screen panel', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const launcher = page.locator('#assistant-launcher-btn');
    await expect(launcher).toBeVisible();

    // Open panel on mobile
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');
    await expect(panel).toBeVisible();

    await expect(panel.locator('#assistant-close-btn')).toBeVisible();
    await expect(panel.locator('#assistant-query-input')).toBeVisible();

    // Check no horizontal scrollbar on body
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);

    // Close
    await panel.locator('#assistant-close-btn').click();
    await expect(page.locator('.assistant-panel.floating-mode')).toHaveCount(0);
  });

  test('15: keyboard accessibility supports Escape key dismissal and proper ARIA roles', async ({
    page,
  }) => {
    const launcher = page.locator('#assistant-launcher-btn');
    await launcher.click();
    const panel = page.locator('.assistant-panel.floating-mode');
    await expect(panel).toBeVisible();

    // Verify ARIA role and attributes
    await expect(panel).toHaveAttribute('role', 'region');
    await expect(panel).toHaveAttribute('aria-label', /HEFIN Care Assistant/);

    // Hit Escape key
    await page.keyboard.press('Escape');
    await expect(page.locator('.assistant-panel.floating-mode')).toHaveCount(0);
  });
});
