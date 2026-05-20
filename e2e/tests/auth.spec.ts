import { test, expect } from '@playwright/test';

const username = process.env.E2E_ADMIN_USERNAME;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

test('smoke — connexion admin redirige vers /dashboard ou /change-password', async ({ page }) => {

  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username);
  await page.fill('input[autocomplete="current-password"]', password);
  await page.click('button[type="submit"]');

  // L'admin peut être redirigé vers /change-password si mustChangePassword = true
  await page.waitForURL(/\/(dashboard|change-password)$/);
  expect(page.url()).toMatch(/\/(dashboard|change-password)$/);
});
