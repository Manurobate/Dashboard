import { test, expect, Page } from '@playwright/test';

const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

if (!adminEmail || !adminPassword) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', adminEmail!);
  await page.fill('input[autocomplete="current-password"]', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|change-password)$/);
  if (page.url().includes('change-password')) {
    throw new Error('Admin must have changed password before running recipe tests');
  }
  await page.waitForLoadState('networkidle');
}

async function createTestRecipe(page: Page, title: string): Promise<number> {
  const res = await page.request.post('/api/recipes', {
    data: {
      title,
      categoryName: 'E2E Test',
      servings: 2,
      ingredients: [{ quantity: 100, unit: 'g', name: 'Sucre', position: 0 }],
      steps: [{ content: 'Mélanger', position: 0 }],
    },
  });
  expect(res.status()).toBe(201);
  const recipe = (await res.json()) as { id: number };
  return recipe.id;
}

async function deleteTestRecipe(page: Page, id: number): Promise<void> {
  await page.request.delete(`/api/recipes/${id}`, { timeout: 5000 });
}

test('AC1/AC2/AC6 — Vue publique lecture seule accessible sans authentification', async ({
  page,
  browser,
}) => {
  await loginAdmin(page);
  const recipeId = await createTestRecipe(page, 'Recette E2E Vue Publique');

  try {
    const shareRes = await page.request.post('/api/sharing', {
      data: { resourceType: 'recipe', resourceId: recipeId, expiresIn: '7d' },
    });
    expect(shareRes.status()).toBe(201);
    const { token } = (await shareRes.json()) as { token: string };

    const publicContext = await browser.newContext();
    try {
      const publicPage = await publicContext.newPage();
      await publicPage.goto(`/share/${token}`);
      await publicPage.waitForLoadState('networkidle');

      // AC1 : la recette s'affiche. La top bar applicative est présente (identité
      // « Dashboard » + switch de thème) mais SANS navigation privée pour un visiteur ;
      // la bottom nav est masquée sur desktop ; la vue publique n'a pas de top bar propre.
      await expect(publicPage.locator('.recipe-title')).toContainText('Recette E2E Vue Publique');
      await expect(publicPage.locator('app-top-bar')).toBeVisible();
      await expect(publicPage.locator('app-top-bar .desktop-nav')).toHaveCount(0);
      await expect(publicPage.locator('app-top-bar button[aria-label="Menu utilisateur"]')).toHaveCount(0);
      await expect(publicPage.locator('app-bottom-nav')).toBeHidden();
      // Aucun lien de navigation interne rendu dans le contenu de la recette (les routerLink
      // deviennent des href au runtime, donc on assert sur les href réels).
      await expect(publicPage.locator('.share-view a[href^="/"]')).toHaveCount(0);

      // AC2 : le stepper convives recalcule la quantité côté client
      const quantityBefore = await publicPage.locator('.ingredient-item .quantity').first().innerText();
      await publicPage.click('app-convives-steppper button[aria-label="Augmenter le nombre de convives"]');
      const quantityAfter = await publicPage.locator('.ingredient-item .quantity').first().innerText();
      expect(quantityAfter).not.toBe(quantityBefore);

      // AC6 : un token bidon affiche l'état neutre et l'API répond 404
      await publicPage.goto('/share/xxxx');
      await publicPage.waitForLoadState('networkidle');
      await expect(publicPage.locator('.error-state')).toContainText("Ce lien n'est plus disponible");
      await expect(publicPage.locator('.recipe-title')).toHaveCount(0);

      const invalidRes = await publicPage.request.get('/api/sharing/xxxx');
      expect(invalidRes.status()).toBe(404);
    } finally {
      await publicContext.close();
    }
  } finally {
    await deleteTestRecipe(page, recipeId);
  }
});
