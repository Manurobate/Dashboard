import { test, expect } from '@playwright/test';

const username = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set');
}

async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username!);
  await page.fill('input[autocomplete="current-password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard');
  await page.waitForLoadState('networkidle');
}

test('drag-drop inter-catégories : le lien apparaît dans la catégorie cible', async ({ page }) => {
  await login(page);

  await page.locator('button[aria-label="Passer en mode édition"]').click({ force: true });

  const cards = page.locator('app-link-category-card');
  const sourceCard = cards.nth(0);
  const targetCard = cards.nth(1);

  const linkItem = sourceCard.locator('app-link-item').first();
  const linkTitle = (await linkItem.locator('.link-title').textContent()) ?? '';
  expect(linkTitle).not.toBe('');

  const targetDropZone = targetCard.locator('.link-list');

  // CDK n'initie le drag QUE depuis l'élément cdkDragHandle (mat-icon.drag-handle)
  // Cliquer au centre du lien (title, favicon…) ne déclenche pas le drag
  const dragHandle = linkItem.locator('mat-icon.drag-handle');
  const srcBB = await dragHandle.boundingBox();
  const tgtBB = await targetDropZone.boundingBox();
  const srcX = srcBB!.x + srcBB!.width / 2;
  const srcY = srcBB!.y + srcBB!.height / 2;
  const tgtX = tgtBB!.x + tgtBB!.width / 2;
  const tgtY = tgtBB!.y + tgtBB!.height / 2;

  await page.mouse.move(srcX, srcY);
  await page.mouse.down();
  // Déplacement initial > 5 px pour dépasser le seuil CDK (dragStartThreshold)
  await page.mouse.move(srcX + 8, srcY, { steps: 3 });
  // Déplacement vers la cible ; steps permet à CDK de détecter l'entrée dans le drop-container
  await page.mouse.move(tgtX, tgtY, { steps: 20 });
  // Attente : CDK utilise des rAF internes pour mettre à jour le container actif
  await page.waitForTimeout(100);
  await page.mouse.up();

  await expect(targetCard.locator(`app-link-item:has-text("${linkTitle}")`)).toBeVisible({ timeout: 10000 });
  await expect(sourceCard.locator(`app-link-item:has-text("${linkTitle}")`)).not.toBeVisible();
});

test('drag désactivé en mode lecture', async ({ page }) => {
  await login(page);

  const linkItem = page.locator('app-link-item').first();
  await expect(linkItem).toHaveAttribute('class', /cdk-drag-disabled/);
});
