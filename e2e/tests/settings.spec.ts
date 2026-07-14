import { test, expect, APIRequestContext, Page } from '@playwright/test';

const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

if (!adminEmail || !adminPassword) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}

async function loginAdminApi(request: APIRequestContext): Promise<void> {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminEmail, password: adminPassword },
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

test('AC1/AC2/AC3/AC5/AC6 — page Paramètres, activation/désactivation Notes et navigation conditionnelle', async ({
  page,
  request,
}) => {
  // AC6 — accès non authentifié redirigé vers /login
  await page.goto('/settings');
  await expect(page).toHaveURL('/login');

  // Prépare un utilisateur de test dédié
  await loginAdminApi(request);
  const uniqueEmail = `e2e-settings-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Settings User' },
  });
  expect(createRes.status()).toBe(201);
  const { user, temporaryPassword } = await createRes.json();
  createdUserId = user.id;

  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/change-password$/);
  await page.fill('input[formcontrolname="newPassword"]', 'NewPassword123!');
  await page.fill('input[formcontrolname="confirmPassword"]', 'NewPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard$/);

  // AC1 — accès à la page Paramètres via le menu utilisateur
  await page.click('button[aria-label="Menu utilisateur"]');
  await page.click('text=Paramètres');
  await expect(page).toHaveURL('/settings');

  await expect(page.getByRole('heading', { name: 'Notes' })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Activer les Notes' })).toBeVisible();
  await expect(page.locator('input[formcontrolname="triliumUrl"]')).not.toBeVisible();

  // AC2/AC3 — activer Notes, saisir l'URL, sauvegarder
  await page.getByRole('switch', { name: 'Activer les Notes' }).click();
  await expect(page.locator('input[formcontrolname="triliumUrl"]')).toBeVisible();
  await page.fill('input[formcontrolname="triliumUrl"]', 'https://trilium.monserveur.fr');
  await page.click('button[type="submit"]');
  await expect(page.getByText('Paramètres sauvegardés')).toBeVisible();

  // AC5 — après rechargement, l'onglet Notes est visible
  await page.reload();
  await page.waitForURL('/settings');
  await expect(page.locator('a[mat-tab-link]', { hasText: 'Notes' })).toBeVisible();

  // AC5 — désactiver Notes, sauvegarder, l'onglet disparaît après rechargement
  await page.getByRole('switch', { name: 'Activer les Notes' }).click();
  await page.click('button[type="submit"]');
  await expect(page.getByText('Paramètres sauvegardés')).toBeVisible();

  await page.reload();
  await page.waitForURL('/settings');
  await expect(page.locator('a[mat-tab-link]', { hasText: 'Notes' })).not.toBeVisible();
});
