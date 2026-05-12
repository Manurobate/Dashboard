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

test('AC2 — Utilisateur standard redirigé vers /links depuis /admin', async ({ page, request }) => {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(loginRes.ok()).toBeTruthy();

  const uniqueUsername = `e2e-standard-user-${Date.now()}`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueUsername, name: 'E2E Standard User' },
  });
  expect(createRes.status()).toBe(201);
  const { temporaryPassword } = await createRes.json();

  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', uniqueUsername);
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(change-password)$/);

  await page.fill('input[name="newPassword"]', 'NewSecure@2026');
  await page.fill('input[name="confirmPassword"]', 'NewSecure@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/links$/);

  await page.goto('/admin');
  await expect(page).toHaveURL('/links');
});

test('AC1 — Admin peut créer un utilisateur et voir le mot de passe temporaire', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  await page.click('button:has-text("Nouvel utilisateur")');
  await expect(page.locator('mat-dialog-container')).toBeVisible();

  const uniqueUsername = `e2e-new-user-${Date.now()}`;
  await page.fill('input[formControlName="username"]', uniqueUsername);
  await page.fill('input[formControlName="name"]', 'Test User');
  await page.click('button:has-text("Créer")');

  await expect(page.locator('.temp-password-value')).toBeVisible();
  await expect(page.locator('button[aria-label="Copier le mot de passe"]')).toBeVisible();

  await page.click('button:has-text("Fermer")');
  await expect(page.locator('[data-testid="user-list"]')).toContainText(uniqueUsername);
});

test('AC3 — Création avec identifiant existant affiche une erreur inline', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  await page.click('button:has-text("Nouvel utilisateur")');
  await page.fill('input[formControlName="username"]', adminUsername!);
  await page.click('button:has-text("Créer")');
  await page.waitForResponse(res => res.url().includes('/api/users') && res.status() === 409);

  await expect(page.locator('mat-error')).toContainText('déjà utilisé');
});
