import { chromium } from '@playwright/test';

const baseURL = process.env['BASE_URL'] || 'http://localhost';
const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminInitialPassword = process.env['E2E_ADMIN_INITIAL_PASSWORD'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

async function globalSetup() {
  if (!adminEmail || !adminInitialPassword || !adminPassword) {
    throw new Error(
      'E2E_ADMIN_EMAIL, E2E_ADMIN_INITIAL_PASSWORD and E2E_ADMIN_PASSWORD must be set',
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });

  try {
    await page.goto('/login');
    await page.fill('input[autocomplete="email"]', adminEmail);
    await page.fill('input[autocomplete="current-password"]', adminInitialPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|change-password)$/, { timeout: 30000 });

    if (page.url().includes('change-password')) {
      const inputs = page.locator('input[autocomplete="new-password"]');
      await inputs.nth(0).fill(adminPassword);
      await inputs.nth(1).fill(adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL('/dashboard', { timeout: 15000 });
    }
  } finally {
    await browser.close();
  }
}

export default globalSetup;
