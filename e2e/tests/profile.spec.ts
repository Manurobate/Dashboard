import { test, expect, APIRequestContext } from '@playwright/test';

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

let createdUserId: number | undefined;

test.afterAll(async ({ request }) => {
  if (createdUserId !== undefined) {
    await loginAdminApi(request);
    await request.delete(`/api/users/${createdUserId}`);
    createdUserId = undefined;
  }
});

test("AC1/2 — Modification du nom d'affichage persiste", async ({ page, request }) => {
  await loginAdminApi(request);

  const uniqueEmail = `e2e-profile-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'Initial Name' },
  });
  expect(createRes.status()).toBe(201);
  const { user, temporaryPassword } = await createRes.json();
  createdUserId = user.id;

  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/change-password$/);
  await page.fill('input[name="newPassword"], input[autocomplete="new-password"]', 'NewPassword123!');
  await page.fill('input[name="confirmPassword"], input[autocomplete="new-password"]', 'NewPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard$/);

  await page.click('button[aria-label="Menu utilisateur"]');
  await page.click('text=Mon profil');
  await expect(page).toHaveURL('/profile');

  await page.fill('input[formcontrolname="name"]', 'Nouveau Nom E2E');
  await page.click('button[type="submit"]');

  await expect(page.getByText('Profil mis à jour')).toBeVisible();

  await page.reload();
  await page.waitForURL('/profile');
  await expect(page.locator('input[formcontrolname="name"]')).toHaveValue('Nouveau Nom E2E');
});

test('AC4 — Bouton "Changer le mot de passe" redirige vers /account/change-password', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', adminUsername!);
  await page.fill('input[autocomplete="current-password"]', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard$/);

  await page.goto('/profile');
  await page.click('button:has-text("Changer le mot de passe")');
  await expect(page).toHaveURL('/account/change-password');
});

test('AC3 — Erreur inline si nom vide', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', adminUsername!);
  await page.fill('input[autocomplete="current-password"]', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard$/);

  await page.goto('/profile');

  await page.fill('input[formcontrolname="name"]', '');
  await page.click('input[formcontrolname="name"]');
  await page.keyboard.press('Tab');

  await expect(page.locator('mat-error')).toContainText("Le nom d'affichage est obligatoire");
  await expect(page.getByText('Profil mis à jour')).not.toBeVisible();
});
