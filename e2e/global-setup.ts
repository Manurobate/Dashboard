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
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders: { 'X-Requested-With': 'XMLHttpRequest' },
  });
  const page = await context.newPage();

  try {
    // 1. Login (handles mustChangePassword on first run)
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

    await page.waitForLoadState('networkidle');

    // 2. Seed test data for links-* tests (idempotent: delete existing E2E categories then recreate)
    const catsRes = await page.request.get('/api/link-categories');
    const cats = (await catsRes.json()) as { id: number; name: string }[];

    const e2eCats = cats.filter(
      (c) => c.name === 'E2E Category A' || c.name === 'E2E Category B',
    );
    for (const cat of e2eCats) {
      await page.request.delete(`/api/link-categories/${cat.id}`);
    }

    const catARes = await page.request.post('/api/link-categories', {
      data: { name: 'E2E Category A', icon: 'link' },
    });
    const catBRes = await page.request.post('/api/link-categories', {
      data: { name: 'E2E Category B', icon: 'bookmark' },
    });
    const catA = (await catARes.json()) as { id: number };
    const catB = (await catBRes.json()) as { id: number };

    await page.request.post('/api/links', {
      data: { url: 'https://example.com', title: 'Example', categoryId: catA.id },
    });
    await page.request.post('/api/links', {
      data: { url: 'https://github.com', title: 'GitHub', categoryId: catA.id },
    });
    await page.request.post('/api/links', {
      data: { url: 'https://google.com', title: 'Google', categoryId: catB.id },
    });
    await page.request.post('/api/links', {
      data: { url: 'https://mozilla.org', title: 'Mozilla', categoryId: catB.id },
    });
  } finally {
    await browser.close();
  }
}

export default globalSetup;
