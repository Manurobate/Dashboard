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
  // Clic sans `force` (actionnabilité vérifiée) puis attente du mode édition effectif :
  // sous Firefox en CI, un clic forcé arrivait avant que la page ne soit prête (story 9.8).
  await page.locator('button[aria-label="Passer en mode édition"]').click();
  await expect(page.locator('button[aria-label="Terminer les modifications"]')).toBeVisible();
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

  // Clic sans `force` puis attente du panneau ouvert (clic forcé trop tôt sous Firefox en CI, story 9.8).
  await page.locator('button[aria-label="Paramètres d\'affichage"]').click();
  await expect(page.locator('button[aria-label="Plus de colonnes"]')).toBeVisible();

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

  // Clic sans `force` puis attente du panneau ouvert (clic forcé trop tôt sous Firefox en CI, story 9.8).
  await page.locator('button[aria-label="Paramètres d\'affichage"]').click();
  await expect(page.locator('button[aria-label="Plus de colonnes"]')).toBeVisible();
  await expect(page.locator('.setting-row').first()).toContainText('5');
});

test('hauteur des liens : 32 px par défaut, réglée à 46 px, persistée et restaurée', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);

  const rowHeight = async () =>
    Math.round((await page.locator('app-link-item .link-item-wrapper').first().boundingBox())!.height);
  const openPanel = async () => {
    await page.locator('button[aria-label="Paramètres d\'affichage"]').click();
    await expect(page.locator('input[aria-label="Hauteur des liens"]')).toBeVisible();
  };
  const heightRow = page.locator('.setting-row', { hasText: 'Hauteur des liens' });

  await expect.poll(rowHeight).toBe(32);

  await openPanel();
  await expect(heightRow).toContainText('32 px');
  // End → valeur maximale du slider (46 px)
  await page.locator('input[aria-label="Hauteur des liens"]').focus();
  await page.keyboard.press('End');
  await expect(heightRow).toContainText('46 px');

  const stored = await page.evaluate(() => localStorage.getItem('links-grid-settings'));
  expect(JSON.parse(stored!).linkHeight).toBe(46);

  await page.keyboard.press('Escape');
  await expect.poll(rowHeight).toBe(46);

  await page.reload();
  await page.waitForURL('/dashboard');
  await expect.poll(rowHeight).toBe(46);
  await openPanel();
  await expect(heightRow).toContainText('46 px');
});

test('hauteur des liens sans effet en mode édition et sous 600 px', async ({ page }) => {
  await page.evaluate(() =>
    localStorage.setItem('links-grid-settings', JSON.stringify({ linkHeight: 32 })),
  );
  const rowHeight = async () =>
    Math.round((await page.locator('app-link-item .link-item-wrapper').first().boundingBox())!.height);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await login(page);
  await expect.poll(rowHeight).toBe(32);

  await page.locator('button[aria-label="Passer en mode édition"]').click();
  await expect(page.locator('button[aria-label="Terminer les modifications"]')).toBeVisible();
  await expect.poll(rowHeight).toBeGreaterThanOrEqual(44);
  await page.locator('button[aria-label="Terminer les modifications"]').click();
  await expect(page.locator('button[aria-label="Passer en mode édition"]')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(rowHeight).toBe(46);
});
