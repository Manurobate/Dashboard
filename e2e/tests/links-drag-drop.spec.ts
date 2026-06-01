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

  // CDK drag-drop nécessite des PointerEvents natifs (page.mouse n'est pas suffisant)
  const srcBB = await linkItem.boundingBox();
  const tgtBB = await targetDropZone.boundingBox();
  const srcX = srcBB!.x + srcBB!.width / 2;
  const srcY = srcBB!.y + srcBB!.height / 2;
  const tgtX = tgtBB!.x + tgtBB!.width / 2;
  const tgtY = tgtBB!.y + tgtBB!.height / 2;
  await page.evaluate(({ sx, sy, tx, ty }) => {
    const src = document.elementFromPoint(sx, sy)!;
    src.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: sx, clientY: sy, pointerId: 1, isPrimary: true }));
    const steps = 30;
    for (let i = 1; i <= steps; i++) {
      const x = sx + (tx - sx) * i / steps;
      const y = sy + (ty - sy) * i / steps;
      document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true }));
    }
    // Dispatcher pointerup sur l'élément cible ET sur document pour que CDK reconnaisse le drop
    const tgt = document.elementFromPoint(tx, ty);
    if (tgt) {
      tgt.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: tx, clientY: ty, pointerId: 1, isPrimary: true }));
    }
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, clientX: tx, clientY: ty, pointerId: 1, isPrimary: true }));
  }, { sx: srcX, sy: srcY, tx: tgtX, ty: tgtY });

  await expect(targetCard.locator(`app-link-item:has-text("${linkTitle}")`)).toBeVisible({ timeout: 10000 });
  await expect(sourceCard.locator(`app-link-item:has-text("${linkTitle}")`)).not.toBeVisible();
});

test('drag désactivé en mode lecture', async ({ page }) => {
  await login(page);

  const linkItem = page.locator('app-link-item').first();
  await expect(linkItem).toHaveAttribute('class', /cdk-drag-disabled/);
});
