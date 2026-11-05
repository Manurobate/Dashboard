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

const createdUserIds: number[] = [];

test.afterAll(async ({ request }) => {
  if (createdUserIds.length > 0) {
    await loginAdminApi(request);
    for (const id of createdUserIds.splice(0)) {
      await request.delete(`/api/users/${id}`);
    }
  }
});

/** Crée un utilisateur de test dédié et le connecte (page déjà sur /login). */
async function createAndLoginUser(
  page: Page,
  request: APIRequestContext,
  prefix: string,
): Promise<void> {
  await loginAdminApi(request);
  const uniqueEmail = `e2e-${prefix}-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Notes User' },
  });
  expect(createRes.status()).toBe(201);
  const { user, temporaryPassword } = await createRes.json();
  createdUserIds.push(user.id);

  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/change-password$/);
  await page.fill('input[formcontrolname="newPassword"]', 'NewPassword123!');
  await page.fill('input[formcontrolname="confirmPassword"]', 'NewPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard$/);
}

async function setNotesSettings(
  page: Page,
  data: { notesEnabled: boolean; triliumUrl: string | null },
): Promise<void> {
  const res = await page.request.patch('/api/users/me/notes-settings', {
    data,
  });
  expect(res.ok()).toBeTruthy();
}

test('AC1/AC2 — Notes activé + URL configurée : iframe pointant vers triliumUrl', async ({
  page,
  request,
}) => {
  await page.route('https://trilium.e2e.test/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<html><body>Trilium stub</body></html>',
    }),
  );

  await page.goto('/login');
  await createAndLoginUser(page, request, 'notes-iframe');
  await setNotesSettings(page, {
    notesEnabled: true,
    triliumUrl: 'https://trilium.e2e.test',
  });

  await page.goto('/notes');
  await expect(page.locator('iframe[title="Trilium Notes"]')).toHaveAttribute(
    'src',
    'https://trilium.e2e.test',
  );
  await expect(page.locator('mat-progress-bar')).toBeHidden();
});

test('AC3 — Notes activé sans URL : état « non configuré »', async ({ page, request }) => {
  await page.goto('/login');
  await createAndLoginUser(page, request, 'notes-empty');
  await setNotesSettings(page, { notesEnabled: true, triliumUrl: null });

  await page.goto('/notes');
  await expect(page.getByText('Aucune instance Trilium configurée')).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(0);

  await page.getByRole('link', { name: 'Configurer dans Paramètres' }).click();
  await expect(page).toHaveURL('/settings');
});

test('AC4/AC5 — Notes désactivé : onglet absent et redirection de /notes vers /dashboard', async ({
  page,
  request,
}) => {
  await page.goto('/login');
  await createAndLoginUser(page, request, 'notes-disabled');
  await setNotesSettings(page, { notesEnabled: false, triliumUrl: null });

  await page.reload();
  // Garantit que la nav est rendue avant d'affirmer l'absence de l'onglet Notes.
  await expect(page.locator('a[mat-tab-link]', { hasText: 'Accueil' })).toBeVisible();
  await expect(page.locator('a[mat-tab-link]', { hasText: 'Notes' })).not.toBeVisible();

  await page.goto('/notes');
  await expect(page).toHaveURL('/dashboard');
});
