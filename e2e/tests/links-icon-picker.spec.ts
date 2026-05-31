import { test, expect, Page } from '@playwright/test';

const username = process.env['E2E_ADMIN_EMAIL'];
const password = process.env['E2E_ADMIN_PASSWORD'];

if (!username || !password) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username!);
  await page.fill('input[autocomplete="current-password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { timeout: 10000 });
}

async function openEditMode(page: Page): Promise<void> {
  await page.locator('button[aria-label="Passer en mode édition"]').click({ force: true });
}

test.describe('Sélecteur d\'icônes Material', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('sélectionner une icône lors de la création d\'une catégorie', async ({ page }) => {
    // Passer en mode édition
    await openEditMode(page);

    // Ouvrir le dialog d'ajout de catégorie
    await page.click('button[aria-label="Ajouter une catégorie"]');
    await expect(page.locator('h2:has-text("Ajouter une catégorie")')).toBeVisible();

    // Saisir un nom
    await page.fill('input[formcontrolname="name"]', 'Test Icône');

    // Ouvrir le sélecteur d'icônes
    await page.click('button:has-text("Choisir une icône")');
    await expect(page.locator('h2:has-text("Choisir une icône")')).toBeVisible();

    // Rechercher "home"
    await page.fill('input[placeholder*="home"]', 'home');
    await page.waitForTimeout(200); // debounce 150ms

    // Sélectionner l'icône "home"
    await page.click('button[aria-label="Maison"]');

    // Confirmer la sélection
    await page.click('mat-dialog-actions button:has-text("Choisir")');
    await expect(page.locator('h2:has-text("Choisir une icône")')).not.toBeVisible();

    // Vérifier l'aperçu dans le dialog catégorie
    await expect(page.locator('.icon-preview')).toContainText('home');

    // Valider la création
    await page.click('button:has-text("Ajouter")');

    // Vérifier que la card affiche bien l'icône
    await expect(page.locator('mat-icon:has-text("home")')).toBeVisible({ timeout: 5000 });
  });

  test('effacer une icône d\'une catégorie existante', async ({ page }) => {
    // Passer en mode édition
    await openEditMode(page);

    // Ouvrir le dialog de modification de la première catégorie
    await page.click('button[aria-label="Modifier la catégorie"]').first();
    await expect(page.locator('h2:has-text("Modifier la catégorie")')).toBeVisible();

    // Ouvrir le sélecteur
    await page.click('button:has-text("Changer"), button:has-text("Choisir une icône")');
    await expect(page.locator('h2:has-text("Choisir une icône")')).toBeVisible();

    // Effacer l'icône
    await page.click('button:has-text("Effacer")');

    // Vérifier l'état "Aucune icône" dans le dialog catégorie
    await expect(page.locator('.no-icon-label')).toBeVisible();

    // Sauvegarder
    await page.click('button:has-text("Modifier")');
    await expect(page.locator('h2:has-text("Modifier la catégorie")')).not.toBeVisible();

    // Vérifier fallback folder_open dans la card
    await expect(page.locator('mat-icon.category-icon:has-text("folder_open")')).toBeVisible();
  });

  test('filtrer les icônes dans le sélecteur', async ({ page }) => {
    await openEditMode(page);
    await page.click('button[aria-label="Ajouter une catégorie"]');
    await page.click('button:has-text("Choisir une icône")');
    await expect(page.locator('h2:has-text("Choisir une icône")')).toBeVisible();

    // Rechercher "calendar"
    await page.fill('input[placeholder*="home"]', 'calendar');
    await page.waitForTimeout(200);

    // Vérifier qu'au moins une icône contenant "calendar" s'affiche
    const btnCount = await page.locator('.icon-btn').count();
    expect(btnCount).toBeGreaterThan(0);

    // Fermer le dialog sans choisir
    await page.click('button:has-text("Annuler")');
  });

  test('annuler le sélecteur ne modifie pas l\'icône courante', async ({ page }) => {
    await openEditMode(page);
    await page.click('button[aria-label="Ajouter une catégorie"]');

    // Vérifier état initial "Aucune icône"
    await expect(page.locator('.no-icon-label')).toBeVisible();

    // Ouvrir sélecteur, choisir une icône, puis annuler
    await page.click('button:has-text("Choisir une icône")');
    await page.click('button[aria-label="Maison"]');
    await page.click('button:has-text("Annuler")');

    // L'état doit toujours être "Aucune icône"
    await expect(page.locator('.no-icon-label')).toBeVisible();

    // Fermer le dialog principal
    await page.click('button:has-text("Annuler")');
  });

  test('rechercher un terme inexistant affiche le message d\'erreur', async ({ page }) => {
    await openEditMode(page);
    await page.click('button[aria-label="Ajouter une catégorie"]');
    await page.click('button:has-text("Choisir une icône")');
    await expect(page.locator('h2:has-text("Choisir une icône")')).toBeVisible();

    // Rechercher terme inexistant
    await page.fill('input[placeholder*="home"]', 'xyznonexistent123');
    await page.waitForTimeout(200);

    // Vérifier le message "Aucune icône trouvée"
    await expect(page.locator('.no-result')).toBeVisible();

    await page.click('button:has-text("Annuler")');
  });
});
