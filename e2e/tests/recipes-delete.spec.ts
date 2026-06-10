import { test, expect, Page } from '@playwright/test';

const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];
const secondEmail = process.env['E2E_SECOND_EMAIL'];
const secondPassword = process.env['E2E_SECOND_PASSWORD'];

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
  const recipe = await res.json() as { id: number };
  return recipe.id;
}

async function deleteTestRecipe(page: Page, id: number): Promise<void> {
  await page.request.delete(`/api/recipes/${id}`);
}

test('AC1a — Depuis la page détail : Annuler laisse la recette intacte', async ({ page }) => {
  await loginAdmin(page);
  const recipeId = await createTestRecipe(page, 'Recette E2E Annuler');

  try {
    await page.goto(`/recipes/${recipeId}`);
    await page.waitForLoadState('networkidle');

    await page.click('button[aria-label="Supprimer la recette"]');
    await expect(page.locator('mat-dialog-container')).toBeVisible();

    await page.click('mat-dialog-container button:has-text("Annuler")');
    await expect(page.locator('mat-dialog-container')).not.toBeVisible();

    await expect(page).toHaveURL(`/recipes/${recipeId}`);
    await expect(page.locator('h1')).toContainText('Recette E2E Annuler');
  } finally {
    await deleteTestRecipe(page, recipeId);
  }
});

test('AC1b — Depuis la page détail : Confirmer supprime et redirige vers /recipes avec snackbar', async ({ page }) => {
  await loginAdmin(page);
  const recipeId = await createTestRecipe(page, 'Recette E2E Supprimer Détail');

  try {
    await page.goto(`/recipes/${recipeId}`);
    await page.waitForLoadState('networkidle');

    await page.click('button[aria-label="Supprimer la recette"]');
    await expect(page.locator('mat-dialog-container')).toBeVisible();

    await page.click('mat-dialog-container button:has-text("Supprimer")');

    await page.waitForURL('/recipes');
    await expect(page).toHaveURL('/recipes');

    await expect(page.locator('mat-snack-bar-container')).toContainText('Recette supprimée');

    await expect(page.locator('.recipe-title').filter({ hasText: 'Recette E2E Supprimer Détail' })).not.toBeVisible();
  } catch (e) {
    await deleteTestRecipe(page, recipeId);
    throw e;
  }
});

test('AC1c — Depuis la liste : Confirmer supprime la recette sans rechargement, snackbar visible', async ({ page }) => {
  await loginAdmin(page);
  const recipeId = await createTestRecipe(page, 'Recette E2E Supprimer Liste');

  try {
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    const recipeItem = page.locator('.recipe-item').filter({ hasText: 'Recette E2E Supprimer Liste' });
    await expect(recipeItem).toBeVisible();

    const deleteBtn = recipeItem.locator(`button[aria-label="Supprimer Recette E2E Supprimer Liste"]`);
    await deleteBtn.click();

    await expect(page.locator('mat-dialog-container')).toBeVisible();
    await page.click('mat-dialog-container button:has-text("Supprimer")');

    await expect(page.locator('mat-snack-bar-container')).toContainText('Recette supprimée');

    await expect(page).toHaveURL('/recipes');
    await expect(recipeItem).not.toBeVisible();
  } catch {
    await deleteTestRecipe(page, recipeId);
    throw new Error(`Test failed, cleaned up recipe ${recipeId}`);
  }
});

test('AC2 — Isolation userId : DELETE d\'une recette d\'un autre utilisateur retourne 403', async ({ browser }) => {
  test.skip(!secondEmail || !secondPassword, 'E2E_SECOND_EMAIL et E2E_SECOND_PASSWORD requis pour tester l\'isolation userId (AC2)');

  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  await loginAdmin(adminPage);
  const recipeId = await createTestRecipe(adminPage, 'Recette E2E AC2 Isolation');

  try {
    const secondContext = await browser.newContext();
    const secondPage = await secondContext.newPage();

    try {
      await secondPage.goto('/login');
      await secondPage.fill('input[autocomplete="email"]', secondEmail!);
      await secondPage.fill('input[autocomplete="current-password"]', secondPassword!);
      await secondPage.click('button[type="submit"]');
      await secondPage.waitForURL(/\/(dashboard|change-password)$/);

      const res = await secondPage.request.delete(`/api/recipes/${recipeId}`);
      expect(res.status()).toBe(403);
    } finally {
      await secondContext.close();
    }
  } finally {
    await deleteTestRecipe(adminPage, recipeId);
    await adminContext.close();
  }
});
