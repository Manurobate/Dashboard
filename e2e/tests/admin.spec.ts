import { test, expect, Page } from '@playwright/test';

const adminUsername = process.env['E2E_ADMIN_USERNAME'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

if (!adminUsername || !adminPassword) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', adminUsername!);
  await page.fill('input[autocomplete="current-password"]', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(links|change-password)$/);
  const url = page.url();
  if (url.includes('change-password')) {
    throw new Error('Admin must have changed password before running admin tests');
  }
}

test('AC1 — Admin voit le panneau /admin avec la liste des comptes', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin');
  await expect(page.locator('table, [data-testid="user-list"]')).toBeVisible();
});

test('AC1 — La liste affiche au moins le compte admin', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');
  await expect(page.getByText(adminUsername!)).toBeVisible();
});

test('AC2 — Utilisateur non authentifié redirigé vers /login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/login');
});

// AC2 (non-admin → /links) sera activé en Story 3.2 quand la création d'utilisateurs est en place
test.fixme('AC2 — Utilisateur standard redirigé vers /links (requiert Story 3.2)', async ({ page }) => {
  void page;
  // Créer un utilisateur via POST /api/users (disponible en Story 3.2)
  // Se connecter avec cet utilisateur
  // Naviguer vers /admin
  // Vérifier redirection vers /links
});
