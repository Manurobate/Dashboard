import { test, expect } from '@playwright/test';

const username = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}

async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username!);
  await page.fill('input[autocomplete="current-password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await page.waitForLoadState('networkidle');
}

test('drag-drop inter-catégories : le lien apparaît dans la catégorie cible', async ({ page }) => {
  await login(page);

  await page.click('button:has-text("Modifier")');

  const cards = page.locator('app-link-category-card');
  const sourceCard = cards.nth(0);
  const targetCard = cards.nth(1);

  const linkItem = sourceCard.locator('app-link-item').first();
  const linkTitle = (await linkItem.locator('.link-title').textContent()) ?? '';
  expect(linkTitle).not.toBe('');

  const targetDropZone = targetCard.locator('.link-list');
  await linkItem.dragTo(targetDropZone);

  await expect(targetCard.locator(`app-link-item:has-text("${linkTitle}")`)).toBeVisible();
  await expect(sourceCard.locator(`app-link-item:has-text("${linkTitle}")`)).not.toBeVisible();
});

test('drag désactivé en mode lecture', async ({ page }) => {
  await login(page);

  const linkItem = page.locator('app-link-item').first();
  await expect(linkItem).toHaveAttribute('class', /cdk-drag-disabled/);
});
