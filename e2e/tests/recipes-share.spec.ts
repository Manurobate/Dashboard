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
    data: { title, categoryName: 'E2E Test', servings: 2, ingredients: [], steps: [] },
  });
  expect(res.status()).toBe(201);
  const recipe = (await res.json()) as { id: number };
  return recipe.id;
}

async function deleteTestRecipe(page: Page, id: number): Promise<void> {
  await page.request.delete(`/api/recipes/${id}`, { timeout: 5000 });
}

test('AC2/AC3 — Générer un lien affiche le snackbar de copie et le badge « Partagé »', async ({
  page,
}) => {
  await loginAdmin(page);
  const recipeId = await createTestRecipe(page, 'Recette E2E Partage');

  try {
    await page.goto(`/recipes/${recipeId}`);
    await page.waitForLoadState('networkidle');

    // Pas de badge tant qu'aucun lien n'est généré
    await expect(page.locator('.share-badge')).not.toBeVisible();

    await page.click('button[aria-label="Partager la recette"]');
    await expect(page.locator('mat-dialog-container')).toBeVisible();

    // Durée par défaut (7 jours) — générer directement le lien
    await page.click('mat-dialog-container button:has-text("Générer le lien")');

    // AC3 : snackbar de copie + lien affiché en lecture seule
    await expect(page.locator('mat-snack-bar-container')).toContainText('Lien copié');
    await expect(page.locator('.share-link-value')).toHaveValue(/\/share\//);

    // Fermer le dialog → le badge apparaît dans le header (refreshShareStatus)
    await page.click('mat-dialog-container button:has-text("Fermer")');
    await expect(page.locator('mat-dialog-container')).not.toBeVisible();
    await expect(page.locator('.share-badge')).toContainText('Partagé');
  } finally {
    await deleteTestRecipe(page, recipeId);
  }
});

test('AC4/AC5 — Un lien existant est réaffiché puis révoqué fait disparaître le badge', async ({
  page,
}) => {
  await loginAdmin(page);
  const recipeId = await createTestRecipe(page, 'Recette E2E Révocation');

  try {
    // Pré-créer un lien actif via l'API
    const res = await page.request.post('/api/sharing', {
      data: { resourceType: 'recipe', resourceId: recipeId, expiresIn: '7d' },
    });
    expect(res.status()).toBe(201);

    await page.goto(`/recipes/${recipeId}`);
    await page.waitForLoadState('networkidle');

    // AC3 : le badge est présent au chargement puisqu'un lien actif existe
    await expect(page.locator('.share-badge')).toContainText('Partagé');

    // AC5 : le dialog s'ouvre directement sur l'état link-ready
    await page.click('button[aria-label="Partager la recette"]');
    await expect(page.locator('mat-dialog-container')).toBeVisible();
    await expect(page.locator('.share-link-value')).toHaveValue(/\/share\//);

    // AC4 : révoquer + confirmer
    await page.click('mat-dialog-container button:has-text("Révoquer")');
    // Un second dialog de confirmation s'ouvre
    await page.click('button:has-text("Révoquer") >> nth=-1');
    await expect(page.locator('mat-dialog-container')).toContainText('Lien révoqué');

    // Fermer → le badge disparaît
    await page.click('mat-dialog-container button:has-text("Fermer")');
    await expect(page.locator('mat-dialog-container')).not.toBeVisible();
    await expect(page.locator('.share-badge')).not.toBeVisible();
  } finally {
    await deleteTestRecipe(page, recipeId);
  }
});
