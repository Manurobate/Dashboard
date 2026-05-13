import { test, expect, Page, APIRequestContext } from '@playwright/test';

const adminUsername = process.env['E2E_ADMIN_USERNAME'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

if (!adminUsername || !adminPassword) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

async function loginAdminApi(request: APIRequestContext): Promise<void> {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(loginRes.ok()).toBeTruthy();
}

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', adminUsername!);
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

  const uniqueEmail = `e2e-standard-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Standard User' },
  });
  expect(createRes.status()).toBe(201);
  const { temporaryPassword } = await createRes.json();

  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', uniqueEmail);
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

  const uniqueEmail = `e2e-new-${Date.now()}@test.local`;
  await page.fill('input[formControlName="username"]', uniqueEmail);
  await page.fill('input[formControlName="name"]', 'Test User');
  await page.click('button:has-text("Créer")');

  await expect(page.locator('.temp-password-value')).toBeVisible();
  await expect(page.locator('button[aria-label="Copier le mot de passe"]')).toBeVisible();

  await page.click('button:has-text("Fermer")');
  await expect(page.locator('[data-testid="user-list"]')).toContainText(uniqueEmail);
});

test('AC3 — Création avec email existant affiche une erreur inline', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  await page.click('button:has-text("Nouvel utilisateur")');
  await page.fill('input[formControlName="username"]', adminUsername!);
  await page.fill('input[formControlName="name"]', 'Doublon');
  await page.click('button:has-text("Créer")');
  await page.waitForResponse(res => res.url().includes('/api/users') && res.status() === 409);

  await expect(page.locator('mat-error')).toContainText('déjà utilisée');
});

test('Reset password — Admin réinitialise le mot de passe et voit le nouveau mot de passe temporaire', async ({ page, request }) => {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(loginRes.ok()).toBeTruthy();

  const uniqueEmail = `e2e-reset-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Reset User' },
  });
  expect(createRes.status()).toBe(201);

  await loginAdmin(page);
  await page.goto('/admin');

  const row = page.locator('tr', { hasText: uniqueEmail });
  await row.locator('button[aria-label="Réinitialiser le mot de passe"]').click();

  await expect(page.locator('mat-dialog-container')).toBeVisible();
  await expect(page.locator('mat-dialog-container')).toContainText(uniqueEmail);

  await page.click('button:has-text("Réinitialiser")');
  await page.waitForResponse(resp => resp.url().includes('/reset-password') && resp.status() === 200);

  await expect(page.locator('.temp-password-value')).toBeVisible();
  await expect(page.locator('button[aria-label="Copier le mot de passe"]')).toBeVisible();

  await page.click('button:has-text("Fermer")');
  await expect(page.locator('mat-dialog-container')).not.toBeVisible();
});

test('Reset password — L\'utilisateur peut se connecter avec le nouveau mot de passe temporaire', async ({ page, request }) => {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(loginRes.ok()).toBeTruthy();

  const uniqueEmail = `e2e-reset-login-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Reset Login User' },
  });
  expect(createRes.status()).toBe(201);

  const usersRes = await request.get('/api/users');
  const users = await usersRes.json();
  const targetUser = users.find((u: { username: string }) => u.username === uniqueEmail);
  expect(targetUser).toBeDefined();

  const resetRes = await request.patch(`/api/users/${targetUser.id}/reset-password`);
  expect(resetRes.status()).toBe(200);
  const { temporaryPassword: newTempPwd } = await resetRes.json();

  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', newTempPwd);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/change-password$/);
  await expect(page).toHaveURL('/change-password');
});

test('Disable — Admin désactive un compte et le badge passe à Inactif', async ({ page, request }) => {
  await loginAdminApi(request);
  const uniqueEmail = `e2e-disable-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Disable User' },
  });
  expect(createRes.status()).toBe(201);

  await loginAdmin(page);
  await page.goto('/admin');

  const row = page.locator('tr', { hasText: uniqueEmail });
  await row.locator('button[aria-label="Désactiver le compte"]').click();

  await expect(page.locator('mat-dialog-container')).toBeVisible();
  await page.click('button:has-text("Désactiver")');
  await page.waitForResponse(resp => resp.url().includes('/disable') && resp.status() === 204);

  await expect(row.locator('.badge-inactive')).toBeVisible();
});

test('Disable — Le compte désactivé ne peut plus se connecter', async ({ page, request }) => {
  await loginAdminApi(request);
  const uniqueEmail = `e2e-disable-login-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Disable Login' },
  });
  const { temporaryPassword } = await createRes.json();

  const usersRes = await request.get('/api/users');
  const users = await usersRes.json();
  const targetUser = users.find((u: { username: string }) => u.username === uniqueEmail);
  expect(targetUser).toBeDefined();

  const disableRes = await request.patch(`/api/users/${targetUser.id}/disable`);
  expect(disableRes.status()).toBe(204);

  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');

  await expect(page.locator('mat-error, .error-message')).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('Delete — Admin supprime un compte et il disparaît de la liste', async ({ page, request }) => {
  await loginAdminApi(request);
  const uniqueEmail = `e2e-delete-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Delete User' },
  });
  expect(createRes.status()).toBe(201);

  await loginAdmin(page);
  await page.goto('/admin');

  const row = page.locator('tr', { hasText: uniqueEmail });
  await row.locator('button[aria-label="Supprimer le compte"]').click();

  await expect(page.locator('mat-dialog-container')).toBeVisible();
  await page.click('button:has-text("Supprimer")');
  await page.waitForResponse(resp => resp.url().match(/\/users\/\d+$/) !== null && resp.status() === 204);

  await expect(page.locator('[data-testid="user-list"]')).not.toContainText(uniqueEmail);
});

test('Auto-protection — Admin ne voit pas les boutons disable/delete sur son propre compte', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  const adminRow = page.locator('tr', { hasText: adminUsername! });
  await expect(adminRow.locator('button[aria-label="Désactiver le compte"]')).not.toBeVisible();
  await expect(adminRow.locator('button[aria-label="Supprimer le compte"]')).not.toBeVisible();
});
