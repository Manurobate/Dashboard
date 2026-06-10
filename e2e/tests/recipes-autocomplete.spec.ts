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
    throw new Error('Admin must have changed password before running autocomplete tests');
  }
  await page.waitForLoadState('networkidle');
}

async function createTestRecipeViaApi(
  page: Page,
  title: string,
  categoryName: string,
  ingredients?: Array<{ quantity: number; unit: string | null; name: string; position: number }>,
): Promise<number> {
  const res = await page.request.post('/api/recipes', {
    data: {
      title,
      categoryName,
      servings: 2,
      ingredients: ingredients ?? [],
      steps: [],
    },
  });
  expect(res.status()).toBe(201);
  const recipe = await res.json() as { id: number };
  return recipe.id;
}

async function deleteTestRecipe(page: Page, id: number): Promise<void> {
  const res = await page.request.delete(`/api/recipes/${id}`, { timeout: 5000 });
  expect(res.ok()).toBeTruthy();
}

test('AC6 — Autocomplétion catégorie : une catégorie existante apparaît dans les suggestions', async ({ page }) => {
  await loginAdmin(page);

  const id1 = await createTestRecipeViaApi(page, 'Recette E2E Soupe A', 'SoupeE2E');
  const id2 = await createTestRecipeViaApi(page, 'Recette E2E Soupe B', 'SoupeE2E');

  try {
    await page.goto('/recipes/new');
    await page.waitForLoadState('networkidle');

    const categoryInput = page.locator('input[formcontrolname="category"]');
    await categoryInput.click();
    await categoryInput.fill('Soupe');

    const panel = page.locator('mat-option');
    await expect(panel.filter({ hasText: 'SoupeE2E' })).toBeVisible({ timeout: 3000 });
  } finally {
    await deleteTestRecipe(page, id1);
    await deleteTestRecipe(page, id2);
  }
});

test('AC6 — Filtrage insensible à la casse dans l\'autocomplete catégorie', async ({ page }) => {
  await loginAdmin(page);

  const id1 = await createTestRecipeViaApi(page, 'Recette E2E CaseSoupe', 'SoupeE2E');

  try {
    await page.goto('/recipes/new');
    await page.waitForLoadState('networkidle');

    const categoryInput = page.locator('input[formcontrolname="category"]');
    await categoryInput.click();
    await categoryInput.fill('soupe');

    const panel = page.locator('mat-option');
    await expect(panel.filter({ hasText: 'SoupeE2E' })).toBeVisible({ timeout: 3000 });
  } finally {
    await deleteTestRecipe(page, id1);
  }
});

test('AC7 — Sélection depuis autocomplete → recette groupée sous la catégorie', async ({ page }) => {
  test.setTimeout(60_000);
  await loginAdmin(page);

  const id1 = await createTestRecipeViaApi(page, 'Recette E2E Groupe', 'GroupeE2E');

  try {
    await page.goto('/recipes/new');
    await expect(page.locator('input[formcontrolname="title"]')).toBeVisible();

    await page.fill('input[formcontrolname="title"]', 'Recette E2E GroupeB');

    const categoryInput = page.locator('input[formcontrolname="category"]');
    await categoryInput.click();
    await categoryInput.fill('Groupe');

    const option = page.locator('mat-option').filter({ hasText: 'GroupeE2E' });
    await expect(option).toBeVisible({ timeout: 5000 });
    await option.click();

    await page.fill('input[formcontrolname="servings"]', '2');

    // Remplir les champs requis des lignes d'ingrédients et de l'étape par défaut
    const ingredientCount = await page.locator('input[formcontrolname="quantity"]').count();
    for (let i = 0; i < ingredientCount; i++) {
      await page.locator('input[formcontrolname="quantity"]').nth(i).fill('1');
      await page.locator('input[formcontrolname="name"]').nth(i).fill('Test');
    }
    await page.locator('textarea.mle-textarea').fill('Étape test');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/recipes\/\d+/);

    await page.goto('/recipes');
    await expect(page.locator('mat-panel-title', { hasText: 'GroupeE2E' })).toBeVisible({ timeout: 10000 });
  } finally {
    try { await deleteTestRecipe(page, id1); } catch { /* cleanup */ }
    try {
      const recipes = await page.request.get('/api/recipes', { timeout: 5000 });
      const list = await recipes.json() as Array<{ id: number; title: string }>;
      const toDelete = list.find((r) => r.title === 'Recette E2E GroupeB');
      if (toDelete) await deleteTestRecipe(page, toDelete.id);
    } catch { /* cleanup */ }
  }
});

test('AC9 — Autocomplétion ingrédient : suggestion depuis une recette existante', async ({ page }) => {
  await loginAdmin(page);

  const id1 = await createTestRecipeViaApi(page, 'Recette E2E PouletA', 'PouletE2E', [
    { quantity: 200, unit: 'g', name: 'pouletE2E', position: 0 },
  ]);

  try {
    await page.goto('/recipes/new');
    await page.waitForLoadState('networkidle');

    const nameInput = page.locator('app-recipe-ingredient-row').first().locator('input[formcontrolname="name"]');
    await nameInput.click();
    await nameInput.fill('poul');

    const panel = page.locator('mat-option');
    await expect(panel.filter({ hasText: 'pouletE2E' })).toBeVisible({ timeout: 3000 });
  } finally {
    await deleteTestRecipe(page, id1);
  }
});
