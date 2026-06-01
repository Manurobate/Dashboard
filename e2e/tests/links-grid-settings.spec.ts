import { test, expect, type Page } from '@playwright/test';

const username = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username!);
  await page.fill('input[autocomplete="current-password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('links-grid-settings'));
});

test('widget ⚙️ visible en mode lecture sur grand écran', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);
  await expect(page.locator('button[aria-label="Paramètres d\'affichage"]')).toBeVisible();
});

test('widget ⚙️ masqué en mode édition', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);
  await page.locator('button[aria-label="Passer en mode édition"]').click({ force: true });
  await expect(page.locator('button[aria-label="Paramètres d\'affichage"]')).not.toBeVisible();
});

test('widget ⚙️ masqué sur mobile (< 600px)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await expect(page.locator('button[aria-label="Paramètres d\'affichage"]')).not.toBeVisible();
});

test('changement colonnes persisté dans localStorage et restauré au rechargement', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);

  await page.locator('button[aria-label="Paramètres d\'affichage"]').click({ force: true });

  await page.locator('button[aria-label="Plus de colonnes"]').click();
  // Attendre que le DOM reflète 4 colonnes (garantit que l'effet signal a tourné) avant le 2e clic
  await expect(page.locator('.setting-row').first()).toContainText('4');
  await page.locator('button[aria-label="Plus de colonnes"]').click();
  // Attendre que le DOM reflète 5 colonnes avant de lire localStorage
  await expect(page.locator('.setting-row').first()).toContainText('5');

  const stored = await page.evaluate(() => localStorage.getItem('links-grid-settings'));
  const parsed = JSON.parse(stored!);
  expect(parsed.columns).toBe(5);

  await page.reload();
  await page.waitForURL('/dashboard');
  await page.waitForSelector('button[aria-label="Paramètres d\'affichage"]');

  await page.locator('button[aria-label="Paramètres d\'affichage"]').click({ force: true });
  await expect(page.locator('.setting-row').first()).toContainText('5');
});
