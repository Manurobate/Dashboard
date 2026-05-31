import { test, expect, Page } from '@playwright/test';
import { randomUUID } from 'crypto';

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
  await page.waitForURL(/\/(dashboard|change-password|admin)$/);
  if (page.url().includes('change-password')) {
    throw new Error('Admin must have changed password before running admin tests');
  }
  await page.waitForLoadState('networkidle');
}

test.describe('Admin responsive mobile (390×844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('admin mobile — pas de scroll horizontal', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin');
    await expect(page.locator('.user-cards')).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test('admin mobile — menu utilisateur de la top bar accessible', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin');

    await page.locator('button[aria-label="Menu utilisateur"]').click();
    await expect(page.locator('[role="menu"]')).toBeVisible();
  });

  test('admin mobile — modal créer utilisateur dans le viewport', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin');

    await page.click('button:has-text("Nouvel utilisateur")');
    const dialog = page.locator('mat-dialog-container');
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
  });

  test.describe('dialogs avec utilisateur de test', () => {
    let createdEmail = '';

    test.afterEach(async ({ request }) => {
      if (!createdEmail) return;
      const usersRes = await request.get('/api/users');
      if (usersRes.ok()) {
        const users = await usersRes.json() as Array<{ username: string; id: number }>;
        const user = users.find(u => u.username === createdEmail);
        if (user) {
          await request.delete(`/api/users/${user.id}`);
        }
      }
      createdEmail = '';
    });

    test('admin mobile — dialog désactiver dans le viewport', async ({ page, request }) => {
      const loginRes = await request.post('/api/auth/login', {
        data: { username: adminEmail, password: adminPassword },
      });
      expect(loginRes.ok()).toBeTruthy();

      createdEmail = `e2e-mobile-disable-${randomUUID()}@test.local`;
      const createRes = await request.post('/api/users', {
        data: { username: createdEmail, name: 'E2E Mobile Disable' },
      });
      expect(createRes.status()).toBe(201);

      await loginAdmin(page);
      await page.goto('/admin');

      const card = page.locator('.user-card', { hasText: createdEmail });
      await card.locator('button[aria-label="Désactiver le compte"]').click();

      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();

      const dialogBox = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(dialogBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
    });

    test('admin mobile — dialog supprimer dans le viewport', async ({ page, request }) => {
      const loginRes = await request.post('/api/auth/login', {
        data: { username: adminEmail, password: adminPassword },
      });
      expect(loginRes.ok()).toBeTruthy();

      createdEmail = `e2e-mobile-delete-${randomUUID()}@test.local`;
      const createRes = await request.post('/api/users', {
        data: { username: createdEmail, name: 'E2E Mobile Delete' },
      });
      expect(createRes.status()).toBe(201);

      await loginAdmin(page);
      await page.goto('/admin');

      const card = page.locator('.user-card', { hasText: createdEmail });
      await card.locator('button[aria-label="Supprimer le compte"]').click();

      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();

      const dialogBox = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(dialogBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
    });

    test('admin mobile — dialog réinitialiser mot de passe dans le viewport', async ({ page, request }) => {
      const loginRes = await request.post('/api/auth/login', {
        data: { username: adminEmail, password: adminPassword },
      });
      expect(loginRes.ok()).toBeTruthy();

      createdEmail = `e2e-mobile-reset-${randomUUID()}@test.local`;
      const createRes = await request.post('/api/users', {
        data: { username: createdEmail, name: 'E2E Mobile Reset' },
      });
      expect(createRes.status()).toBe(201);

      await loginAdmin(page);
      await page.goto('/admin');

      const card = page.locator('.user-card', { hasText: createdEmail });
      await card.locator('button[aria-label="Réinitialiser le mot de passe"]').click();

      const dialog = page.locator('mat-dialog-container');
      await expect(dialog).toBeVisible();

      const dialogBox = await dialog.boundingBox();
      const viewport = page.viewportSize();
      expect(dialogBox).not.toBeNull();
      expect(viewport).not.toBeNull();
      expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
      expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width + 1);
    });
  });
});

test.describe('Admin responsive desktop (1280×800)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('admin desktop — tableau affiché sans régression', async ({ page }) => {
    await loginAdmin(page);
    await page.goto('/admin');

    await expect(page.locator('[data-testid="user-list"]')).toBeVisible();
    await expect(page.locator('.table-wrapper')).toBeVisible();
    await expect(page.locator('.user-cards')).not.toBeVisible();
  });
});
