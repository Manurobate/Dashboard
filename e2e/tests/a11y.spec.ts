import AxeBuilder from '@axe-core/playwright';
import { test, expect, Locator, Page } from '@playwright/test';

/**
 * Story 9.8 : audit d'accessibilité Axe de la refonte Ember, dans les deux thèmes.
 * Échec sur toute violation d'impact « critical » ou de règle « color-contrast »
 * (axe classe le contraste en « serious », d'où la règle nommée explicitement).
 */

const adminEmail = process.env['E2E_ADMIN_EMAIL'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

if (!adminEmail || !adminPassword) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}

// Titre unique : un reste d'exécution interrompue ne casse pas le `getByText` strict.
const RECIPE_TITLE = `Recette E2E Accessibilité ${Date.now()}`;

async function loginAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', adminEmail!);
  await page.fill('input[autocomplete="current-password"]', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard$/);
  await page.waitForLoadState('networkidle');
}

/** Fixe le thème et coupe les animations avant le chargement de l'application : une carte
 * à mi-fondu serait mesurée avec un contraste partiel (faux positif). */
async function prepare(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t) => {
    localStorage.setItem('theme', t);
    localStorage.setItem('animations', 'off');
  }, theme);
}

/** Vérifie que l'écran est bien rendu dans le thème audité. */
async function expectTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  const body = page.locator('body');
  await (theme === 'dark'
    ? expect(body).toHaveClass(/dark-theme/)
    : expect(body).not.toHaveClass(/dark-theme/));
}

/** Les vues publiques forcent le thème clair (6.x) : le sombre s'obtient par le bouton de la top bar. */
async function switchPublicViewTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  if (theme === 'dark') await page.getByRole('button', { name: 'Activer le thème sombre' }).click();
  await expectTheme(page, theme);
}

/** Tabule jusqu'à `target` (au plus 60 arrêts) puis vérifie l'anneau de focus commun. */
async function expectFocusRing(page: Page, target: Locator, offsetSign: 1 | -1 = 1): Promise<void> {
  for (let i = 0; i < 60; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
  const style = await target.evaluate((el) => {
    const cs = getComputedStyle(el);
    return {
      style: cs.outlineStyle,
      width: parseFloat(cs.outlineWidth),
      offset: parseFloat(cs.outlineOffset),
    };
  });
  expect(style.style, `${target}`).toBe('solid');
  expect(style.width).toBeGreaterThanOrEqual(2);
  expect(Math.sign(style.offset)).toBe(offsetSign);
}

async function expectNoViolations(page: Page, screen: string): Promise<void> {
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.id === 'color-contrast',
  );
  const report = blocking.map(
    (v) =>
      `${screen} — ${v.id} (${v.impact}) : ${v.help}\n` +
      v.nodes.map((n) => `    ${n.target.join(' ')} : ${n.failureSummary ?? ''}`).join('\n'),
  );
  // Soft : un seul passage liste les violations de tous les écrans.
  expect.soft(report, report.join('\n')).toEqual([]);
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`Axe — thème ${theme === 'light' ? 'clair' : 'sombre'}`, () => {
    test('connexion', async ({ page }) => {
      await prepare(page, theme);
      await page.goto('/login');
      await expect(page.locator('input[autocomplete="email"]')).toBeVisible();
      await expectTheme(page, theme);
      await expectNoViolations(page, 'login');
    });

    test('lien expiré', async ({ page }) => {
      await prepare(page, theme);
      await page.goto('/share/xxxx');
      await expect(page.locator('.error-state')).toBeVisible();
      await switchPublicViewTheme(page, theme);
      await expectNoViolations(page, 'lien expiré');
    });

    test('écrans authentifiés', async ({ page, browser }) => {
      test.setTimeout(90_000);
      await prepare(page, theme);
      await loginAdmin(page);
      await expect(page.locator('body')).toHaveClass(/no-motion/);
      await expectTheme(page, theme);

      // Réglages Notes d'origine, restaurés en fin de test.
      const me = (await (await page.request.get('/api/auth/me')).json()) as {
        notesEnabled: boolean;
        triliumUrl: string | null;
      };

      const recipeRes = await page.request.post('/api/recipes', {
        data: {
          title: RECIPE_TITLE,
          categoryName: 'E2E Test',
          servings: 2,
          ingredients: [{ quantity: 100, unit: 'g', name: 'Sucre', position: 0 }],
          steps: [{ content: 'Mélanger', position: 0 }],
        },
      });
      expect(recipeRes.status()).toBe(201);
      const { id: recipeId } = (await recipeRes.json()) as { id: number };

      try {
        await expectNoViolations(page, 'liens (lecture)');

        await page.locator('button[aria-label="Passer en mode édition"]').click();
        await expect(page.locator('button[aria-label="Terminer les modifications"]')).toBeVisible();
        await expectNoViolations(page, 'liens (édition)');

        await page.goto('/recipes');
        await expect(page.getByText(RECIPE_TITLE)).toBeVisible();
        await expectNoViolations(page, 'recettes (liste)');

        await page.goto(`/recipes/${recipeId}`);
        await expect(page.locator('.recipe-title')).toContainText(RECIPE_TITLE);
        await expectNoViolations(page, 'recette (détail)');

        await page.click('button[aria-label="Partager la recette"]');
        await expect(page.getByRole('dialog')).toBeVisible();
        await expectNoViolations(page, 'dialog de partage');
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);

        await page.goto(`/recipes/${recipeId}/edit`);
        await expect(page.locator('input[formcontrolname="title"]')).toBeVisible();
        await expectNoViolations(page, 'recette (éditeur)');

        for (const [path, screen] of [
          ['/settings', 'paramètres'],
          ['/admin', 'administration'],
          ['/profile', 'profil'],
          ['/account/change-password', 'changer le mot de passe'],
        ]) {
          await page.goto(path);
          // Une redirection (guard, session perdue) ferait auditer un autre écran.
          await expect(page).toHaveURL(new RegExp(`${path}$`));
          await expectNoViolations(page, screen);
        }

        // Notes activé sans URL : état vide (aucune iframe externe à auditer).
        const notesRes = await page.request.patch('/api/users/me/notes-settings', {
          data: { notesEnabled: true, triliumUrl: null },
        });
        expect(notesRes.ok()).toBe(true);
        await page.goto('/notes');
        await expect(page.getByText('Aucune instance Trilium configurée')).toBeVisible();
        await expectNoViolations(page, 'notes (vide)');

        // Vue publique, depuis un contexte sans session.
        const shareRes = await page.request.post('/api/sharing', {
          data: { resourceType: 'recipe', resourceId: recipeId, expiresIn: '7d' },
        });
        expect(shareRes.status()).toBe(201);
        const { token } = (await shareRes.json()) as { token: string };
        const publicContext = await browser.newContext();
        try {
          const publicPage = await publicContext.newPage();
          await prepare(publicPage, theme);
          await publicPage.goto(`/share/${token}`);
          await expect(publicPage.locator('.recipe-title')).toContainText(RECIPE_TITLE);
          await switchPublicViewTheme(publicPage, theme);
          await expectNoViolations(publicPage, 'vue publique');
        } finally {
          await publicContext.close();
        }
      } finally {
        await page.request.patch('/api/users/me/notes-settings', {
          data: { notesEnabled: me.notesEnabled, triliumUrl: me.triliumUrl },
        });
        await page.request.delete(`/api/recipes/${recipeId}`);
      }
    });
  });
}

test.describe('Réglage « Animations »', () => {
  test.use({ reducedMotion: 'reduce' });

  test('système réduit, sans choix : animations neutralisées', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body.no-motion')).toHaveCount(1);
  });

  test('choix « on » : prime sur le système', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('animations', 'on'));
    await page.goto('/login');
    // Attendre le rendu : avant le démarrage d'Angular, la classe est absente de toute façon.
    await expect(page.locator('input[autocomplete="email"]')).toBeVisible();
    await expect(page.locator('body')).not.toHaveClass(/no-motion/);
  });

  test('choix « off » : animations neutralisées', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'no-preference' });
    try {
      const page = await context.newPage();
      await page.addInitScript(() => localStorage.setItem('animations', 'off'));
      await page.goto('/login');
      await expect(page.locator('body.no-motion')).toHaveCount(1);
    } finally {
      await context.close();
    }
  });
});

test('focus clavier : anneau commun visible', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/settings');
  await expect(page.getByRole('switch', { name: 'Activer les Notes' })).toBeVisible();
  await page.mouse.click(1, 1);
  // Élément natif (onglet de la top bar), bouton-icône Material, interrupteur Material.
  await expectFocusRing(page, page.locator('a.mat-mdc-tab-link', { hasText: 'Accueil' }), -1);
  await expectFocusRing(page, page.locator('button[aria-label^="Activer le thème"]'));
  await expectFocusRing(page, page.getByRole('switch', { name: 'Activer les Notes' }));
  // Entrée de menu : ouverture au clavier, la première entrée reçoit le focus.
  await page.locator('button[aria-label="Menu utilisateur"]').focus();
  await page.keyboard.press('Enter');
  const firstItem = page.getByRole('menuitem').first();
  await expect(firstItem).toBeFocused();
  await expectFocusRing(page, firstItem, -1);
  await page.keyboard.press('Escape');

  // En-tête de groupe de la liste des recettes (expansion panel).
  const res = await page.request.post('/api/recipes', {
    data: {
      title: RECIPE_TITLE,
      categoryName: 'E2E Test',
      servings: 2,
      ingredients: [],
      steps: [],
    },
  });
  const { id } = (await res.json()) as { id: number };
  try {
    await page.goto('/recipes');
    await expect(page.getByText(RECIPE_TITLE)).toBeVisible();
    await page.mouse.click(1, 1);
    await expectFocusRing(page, page.locator('mat-expansion-panel-header').first(), -1);
  } finally {
    await page.request.delete(`/api/recipes/${id}`);
  }
});
