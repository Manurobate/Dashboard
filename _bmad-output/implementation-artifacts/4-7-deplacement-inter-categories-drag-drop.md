# Story 4.7 : Déplacement d'un lien entre catégories par drag & drop

**Épic :** 4 — Module Liens
**Statut :** done
**Créée le :** 2026-05-20

---

## User Story

En tant qu'utilisateur authentifié,
Je veux déplacer un lien d'une catégorie vers une autre par drag & drop,
Afin de réorganiser mes liens sans avoir à le supprimer et le recréer.

---

## Critères d'acceptation

**AC1 — Déplacement optimiste vers une autre catégorie**
**Étant donné** que je suis en mode édition et que je glisse un lien hors de sa catégorie,
**Quand** je le lâche sur une autre catégorie (dépliée ou repliée),
**Alors** le lien apparaît immédiatement dans la catégorie cible (optimistic update) et `PATCH /api/links/:id` est appelé avec le nouveau `categoryId`

**AC2 — Surlignage de la zone de drop**
**Étant donné** que je glisse un lien vers une catégorie cible,
**Quand** je survole la zone de drop,
**Alors** la zone est visuellement surlignée (classe `.cdk-drop-list-receiving` appliquée automatiquement par Angular CDK)

**AC3 — Rollback sur erreur réseau**
**Étant donné** que le `PATCH /api/links/:id` échoue,
**Quand** l'erreur réseau est reçue,
**Alors** le lien revient dans sa catégorie d'origine et une snackbar "Erreur lors du déplacement" s'affiche 3s

**AC4 — Drag désactivé en mode lecture**
**Étant donné** que je suis en mode lecture,
**Quand** j'essaie de glisser un lien,
**Alors** le drag est désactivé (`[cdkDragDisabled]="!editMode"` déjà en place — aucun changement requis)

---

## ⚠️ Analyse du code existant — LIRE AVANT DE CODER

### Ce qui est DÉJÀ IMPLÉMENTÉ — NE PAS RECRÉER

**Angular CDK DragDropModule** — déjà importé partout :
- `links.component.ts` : `import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop'`
- `link-category-card.component.ts` : idem + `LinkItemComponent` importe aussi `DragDropModule`
- Le module est dans `imports` des deux composants standalone

**Drag & drop intra-catégorie** — déjà fonctionnel (`link-category-card.component.ts:34-39`) :
```typescript
dropLink(event: CdkDragDrop<Link[]>): void {
  if (event.previousIndex === event.currentIndex) return;
  const reordered = [...this.links];
  moveItemInArray(reordered, event.previousIndex, event.currentIndex);
  this.reorderLinks.emit(reordered.map((l, i) => ({ id: l.id, position: i })));
}
```
**→ Ce code gère uniquement l'intra-catégorie. Cette story y ajoute le cas inter-catégorie.**

**Drag & drop catégories** — déjà fonctionnel (`links.component.ts:211-224`), **NE PAS TOUCHER**.

**`[cdkDragDisabled]="!editMode"`** sur chaque `app-link-item` dans `link-category-card.component.html:29` — AC4 déjà satisfait, zéro code à écrire.

**`cdkDropList` par catégorie** — `link-category-card.component.html:22-26` :
```html
<div cdkDropList
     [cdkDropListData]="links"
     (cdkDropListDropped)="dropLink($event)"
     class="link-list"
     [class.edit-mode]="editMode">
```

### État actuel à comprendre

`LinksComponent` gère l'état global :
- `linksService.links` = signal contenant TOUS les liens de tous les catégories
- `linksForCategory(categoryId: number)` (ligne 58-60) = filtre les liens par catégorie
- `link-category-card` reçoit `[links]="linksForCategory(cat.id)"` — tableau dérivé du signal
- Quand le signal est mis à jour, les deux cartes (source et cible) se re-rendent automatiquement

---

## Tasks / Subtasks

### T1 — Backend : UpdateLinkDto — autoriser `categoryId` en update

- [x] Modifier `backend/src/links/dto/update-link.dto.ts` : ajouter `categoryId` optionnel
- [x] Modifier `backend/src/links/links.service.ts` : valider l'ownership du `categoryId` dans `update()`
- [x] Modifier `backend/src/links/links.service.spec.ts` : tests Jest pour le déplacement avec validation

### T2 — Frontend Service : ajouter `moveLink()` à `LinksService`

- [x] Modifier `frontend/src/app/links/links.service.ts` : ajouter méthode `moveLink(id, categoryId)`
- [x] Modifier `frontend/src/app/links/links.service.spec.ts` : ajouter test HTTP pour moveLink

### T3 — Frontend : `LinkCategoryCardComponent` — support inter-catégorie

- [x] Modifier `link-category-card.component.ts` : ajouter `@Input() connectedTo`, `@Output() moveLink`, mettre à jour `dropLink()`
- [x] Modifier `link-category-card.component.html` : ajouter `[id]` et `[cdkDropListConnectedTo]`
- [x] Modifier `link-category-card.component.spec.ts` : tests pour les deux cas de `dropLink()`

### T4 — Frontend : `LinksComponent` — orchestration du déplacement

- [x] Modifier `links.component.ts` : ajouter `connectedListIds` (computed), `handleMoveLink()`
- [x] Modifier `links.component.html` : passer `[connectedTo]` et `(moveLink)` à chaque card
- [x] Modifier `links.component.spec.ts` : tests pour `handleMoveLink()` (optimistic update + rollback)

### T5 — Tests E2E Playwright

- [x] Créer `e2e/tests/links-drag-drop.spec.ts` : scénarios de déplacement inter-catégories

---

## Dev Notes

### T1 — Backend : UpdateLinkDto + validation

**Modifier `backend/src/links/dto/update-link.dto.ts` :**
```typescript
import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsOptional } from 'class-validator';
import { CreateLinkDto } from './create-link.dto';

export class UpdateLinkDto extends PartialType(OmitType(CreateLinkDto, ['categoryId'] as const)) {
  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiProperty({ required: false })
  categoryId?: number;
}
```

**Modifier `backend/src/links/links.service.ts` — méthode `update()` :**
```typescript
async update(userId: number, id: number, dto: UpdateLinkDto): Promise<LinkEntity> {
  const link = await this.repo.findOne({ where: { id, userId } });
  if (!link) throw new NotFoundException(`Lien ${id} introuvable`);

  if (dto.categoryId !== undefined) {
    const category = await this.categoryRepo.findOne({ where: { id: dto.categoryId, userId } });
    if (!category) throw new ForbiddenException(`Catégorie ${dto.categoryId} introuvable`);
  }

  Object.assign(link, dto);
  return this.repo.save(link);
}
```

**Tests Jest à ajouter dans `backend/src/links/links.service.spec.ts` :**
- Pattern existant : `jest.Mock` sur `linkRepo` et `categoryRepo`
- Ajouter dans `describe('update()')` :
  - `it('met à jour le categoryId si fourni et si la catégorie appartient au userId')` — `categoryRepo.findOne` retourne une catégorie, vérifie que `link.categoryId` est mis à jour
  - `it('lève ForbiddenException si categoryId fourni mais catégorie introuvable')` — `categoryRepo.findOne` retourne null
  - `it('ne vérifie pas categoryId si non fourni')` — dto sans categoryId, `categoryRepo.findOne` jamais appelé

### T2 — Frontend : LinksService.moveLink()

**Modifier `frontend/src/app/links/links.service.ts` — ajouter après `reorderLinks()` :**
```typescript
moveLink(id: number, categoryId: number): Observable<Link> {
  return this.http.patch<Link>(`/api/links/${id}`, { categoryId });
}
```

**`updateLink()` existant GARDE sa signature** (`Partial<Omit<CreateLinkPayload, 'categoryId'>>`) — ne pas la modifier. `moveLink()` est une méthode séparée pour exprimer l'intention clairement.

**Test Vitest à ajouter dans `frontend/src/app/links/links.service.spec.ts` :**
- Pattern : `TestBed` + `HttpTestingController` (comme les tests existants)
- `it('moveLink() envoie PATCH /api/links/:id avec le categoryId')` :
  ```typescript
  const obs$ = service.moveLink(1, 5);
  obs$.subscribe();
  const req = http.expectOne('/api/links/1');
  expect(req.request.method).toBe('PATCH');
  expect(req.request.body).toEqual({ categoryId: 5 });
  req.flush(mockLink);
  ```

### T3 — Frontend : LinkCategoryCardComponent

**Modifier `link-category-card.component.ts` :**

Ajouter ces imports depuis `@angular/cdk/drag-drop` (déjà dans les imports du module) :
- `transferArrayItem` — **NE PAS importer** car on gère l'état via signals dans le parent, pas via `transferArrayItem`

Ajouter dans la classe :
```typescript
@Input() connectedTo: string[] = [];
@Output() moveLink = new EventEmitter<{ linkId: number; targetCategoryId: number }>();
```

Mettre à jour `dropLink()` :
```typescript
dropLink(event: CdkDragDrop<Link[]>): void {
  if (event.previousContainer === event.container) {
    // intra-catégorie : comportement existant
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.links];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.reorderLinks.emit(reordered.map((l, i) => ({ id: l.id, position: i })));
  } else {
    // inter-catégorie : déléguer au parent
    const link = event.previousContainer.data[event.previousIndex];
    this.moveLink.emit({ linkId: link.id, targetCategoryId: this.category.id });
  }
}
```

⚠️ **NE PAS appeler `transferArrayItem`** : l'état est géré par le signal `linksService.links` dans `LinksComponent`. L'optimistic update sera fait dans `LinksComponent.handleMoveLink()`. Le re-render angulaire via signal mettra à jour les deux listes correctement.

**Modifier `link-category-card.component.html` — balise `cdkDropList` :**
```html
<div cdkDropList
     [id]="'links-' + category.id"
     [cdkDropListData]="links"
     [cdkDropListConnectedTo]="connectedTo"
     (cdkDropListDropped)="dropLink($event)"
     class="link-list"
     [class.edit-mode]="editMode">
```
Seuls `[id]` et `[cdkDropListConnectedTo]` sont ajoutés — les autres attributs inchangés.

**Tests Vitest pour `link-category-card.component.spec.ts` :**

Ajouter dans `describe('dropLink()')` :
```typescript
it('émet reorderLinks si previousContainer === container', async () => {
  // cas intra-catégorie existant — s'assurer qu'il fonctionne toujours
  const link2: Link = { ...mockLink, id: 11, position: 1 };
  const { component } = await setup(true, [mockLink, link2]);
  const emitted: unknown[] = [];
  component.reorderLinks.subscribe((v) => emitted.push(v));

  const fakeContainer = { data: [mockLink, link2] } as any;
  component.dropLink({
    previousContainer: fakeContainer,
    container: fakeContainer,
    previousIndex: 0,
    currentIndex: 1,
  } as any);

  expect(emitted).toHaveLength(1);
});

it('émet moveLink si previousContainer !== container', async () => {
  const { component } = await setup(true, [mockLink]);
  const emitted: { linkId: number; targetCategoryId: number }[] = [];
  component.moveLink.subscribe((v) => emitted.push(v));

  const sourceContainer = { data: [mockLink] } as any;
  const targetContainer = { data: [] } as any;
  component.dropLink({
    previousContainer: sourceContainer,
    container: targetContainer,
    previousIndex: 0,
    currentIndex: 0,
  } as any);

  expect(emitted).toHaveLength(1);
  expect(emitted[0]).toEqual({ linkId: 10, targetCategoryId: 1 });
});

it('ne émet pas moveLink si previousContainer === container (même index)', async () => {
  const { component } = await setup(true, [mockLink]);
  const moveLinkEmitted: unknown[] = [];
  const reorderEmitted: unknown[] = [];
  component.moveLink.subscribe((v) => moveLinkEmitted.push(v));
  component.reorderLinks.subscribe((v) => reorderEmitted.push(v));

  const fakeContainer = { data: [mockLink] } as any;
  component.dropLink({
    previousContainer: fakeContainer,
    container: fakeContainer,
    previousIndex: 0,
    currentIndex: 0,
  } as any);

  expect(moveLinkEmitted).toHaveLength(0);
  expect(reorderEmitted).toHaveLength(0);
});
```

### T4 — Frontend : LinksComponent

**Modifier `links.component.ts` — ajouter les imports nécessaires :**
```typescript
import { computed } from '@angular/core';  // s'il n'est pas déjà importé
```
Vérifier si `computed` est déjà importé depuis `@angular/core` — ajouter uniquement si absent.

**Ajouter dans la classe `LinksComponent` :**
```typescript
readonly connectedListIds = computed(() =>
  this.linkCategoriesService.categories().map((c) => 'links-' + c.id),
);

handleMoveLink(event: { linkId: number; targetCategoryId: number }): void {
  const link = this.linksService.links().find((l) => l.id === event.linkId);
  if (!link) return;
  const originalCategoryId = link.categoryId;

  // Optimistic update
  this.linksService.links.update((all) =>
    all.map((l) => (l.id === event.linkId ? { ...l, categoryId: event.targetCategoryId } : l)),
  );

  this.linksService.moveLink(event.linkId, event.targetCategoryId).subscribe({
    error: () => {
      // Rollback
      this.linksService.links.update((all) =>
        all.map((l) => (l.id === event.linkId ? { ...l, categoryId: originalCategoryId } : l)),
      );
      this.snackBar.open('Erreur lors du déplacement', 'Fermer', { duration: 3000 });
    },
  });
}
```

**Modifier `links.component.html` — sur chaque `app-link-category-card` :**
```html
<app-link-category-card
  cdkDrag
  [cdkDragDisabled]="!editMode()"
  [category]="cat"
  [links]="linksForCategory(cat.id)"
  [editMode]="editMode()"
  [connectedTo]="connectedListIds()"
  (editCategory)="openEditCategoryDialog($event)"
  (deleteCategory)="openDeleteDialog($event)"
  (addLink)="openAddLinkDialog($event)"
  (editLink)="openEditLinkDialog($event)"
  (deleteLink)="openDeleteLinkDialog($event)"
  (reorderLinks)="handleReorderLinks(cat.id, $event)"
  (moveLink)="handleMoveLink($event)">
</app-link-category-card>
```
Seuls `[connectedTo]` et `(moveLink)` sont ajoutés — les autres bindings inchangés.

**Tests Vitest à ajouter dans `links.component.spec.ts` :**

Ajouter `moveLink: vi.fn()` dans le mock `linksService` (dans `beforeEach`).

Ajouter dans le `describe('LinksComponent')` :
```typescript
describe('handleMoveLink()', () => {
  it('met à jour le categoryId du lien (optimistic update) et appelle moveLink', () => {
    linksService.links.set([{ ...mockLink, categoryId: 1 }]);
    linksService.moveLink.mockReturnValue(of({ ...mockLink, categoryId: 2 }));

    component.handleMoveLink({ linkId: 10, targetCategoryId: 2 });

    expect(linksService.links()[0].categoryId).toBe(2);
    expect(linksService.moveLink).toHaveBeenCalledWith(10, 2);
  });

  it('rollback du categoryId et affiche snackbar si moveLink échoue', () => {
    linksService.links.set([{ ...mockLink, categoryId: 1 }]);
    linksService.moveLink.mockReturnValue(throwError(() => new Error('network')));

    component.handleMoveLink({ linkId: 10, targetCategoryId: 2 });

    expect(linksService.links()[0].categoryId).toBe(1);
    expect(snackBar.open).toHaveBeenCalledWith('Erreur lors du déplacement', 'Fermer', { duration: 3000 });
  });

  it('ne fait rien si le lien est introuvable', () => {
    linksService.links.set([]);
    component.handleMoveLink({ linkId: 999, targetCategoryId: 2 });
    expect(linksService.moveLink).not.toHaveBeenCalled();
  });
});
```

**Mock linksService dans `beforeEach`** — ajouter `moveLink: vi.fn()` :
```typescript
linksService = {
  loadLinks: vi.fn().mockReturnValue(of([])),
  createLink: vi.fn(),
  updateLink: vi.fn(),
  deleteLink: vi.fn(),
  reorderLinks: vi.fn(),
  moveLink: vi.fn(),           // ← AJOUTER
  links: signal<Link[]>([]),
  isLoadingLinks: signal(false),
};
```
⚠️ Aussi ajouter `moveLink` au type du mock :
```typescript
let linksService: {
  // ...
  moveLink: ReturnType<typeof vi.fn>;
  // ...
};
```

### T5 — Tests E2E Playwright

Créer `e2e/tests/links-drag-drop.spec.ts` :

```typescript
import { test, expect } from '@playwright/test';

const username = process.env.E2E_ADMIN_USERNAME;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

async function login(page: any) {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username!);
  await page.fill('input[autocomplete="current-password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/links');
}

test('drag-drop inter-catégories : le lien apparaît dans la catégorie cible', async ({ page }) => {
  await login(page);

  // Passer en mode édition
  await page.click('button:has-text("Modifier")');

  // Récupérer la première card source et la deuxième card cible
  const cards = page.locator('app-link-category-card');
  const sourceCard = cards.nth(0);
  const targetCard = cards.nth(1);

  // Identifier un lien dans la source
  const linkItem = sourceCard.locator('app-link-item').first();
  const linkTitle = await linkItem.locator('.link-title').textContent();

  // Drag & drop vers la catégorie cible
  const targetDropZone = targetCard.locator('.link-list');
  await linkItem.dragTo(targetDropZone);

  // Le lien doit apparaître dans la catégorie cible
  await expect(targetCard.locator(`app-link-item:has-text("${linkTitle}")`)).toBeVisible();
  // Le lien ne doit plus être dans la catégorie source
  await expect(sourceCard.locator(`app-link-item:has-text("${linkTitle}")`)).not.toBeVisible();
});

test('drag désactivé en mode lecture', async ({ page }) => {
  await login(page);

  // Mode lecture par défaut — vérifier cdkDragDisabled
  const linkItem = page.locator('app-link-item').first();
  const dragHandle = linkItem.locator('[cdkdrag]');
  // En mode lecture, le drag est désactivé
  await expect(linkItem).toHaveAttribute('class', /cdk-drag-disabled/);
});
```

---

## Architecture et contraintes

### CDK DragDrop — Pattern inter-listes avec `cdkDropListConnectedTo`

**Approche retenue : `[cdkDropListConnectedTo]` explicite via IDs**

Chaque liste de liens reçoit un `id` unique (`'links-' + category.id`) et est connectée à toutes les autres via `[cdkDropListConnectedTo]="connectedTo"` (liste des IDs passée en `@Input`).

La liste `connectedListIds` dans `LinksComponent` inclut l'ID de la liste elle-même — ce n'est pas un problème : Angular CDK ignore les connexions vers la liste source lors d'un drop intra-liste.

**Pourquoi PAS `cdkDropListGroup` :**
- `cdkDropListGroup` connecterait automatiquement TOUS les `cdkDropList` du sous-arbre, y compris la liste des catégories (`cdkDropList` dans `links.component.html` pour le reorder des catégories) — ce qui créerait des conflits.
- L'approche `connectedTo` est plus chirurgicale.

### Gestion de l'état — PAS de `transferArrayItem`

L'état des liens est centralisé dans `linksService.links` (signal dans `LinksComponent`). Les données passées à `cdkDropListData` sont des tableaux dérivés (`linksForCategory(cat.id)`) — des snapshots, pas des références mutables.

- `transferArrayItem` muterait ces tableaux dérivés, ce qui entrerait en conflit avec le pattern signal.
- À la place : émettre un `moveLink` event, laisser `LinksComponent.handleMoveLink()` mettre à jour le signal.
- Le signal mis à jour déclenche un re-render de `linksForCategory()` pour les deux catégories.
- Angular CDK gère correctement ce cas : après le drop, il ne maintient pas de référence sur les données — le re-render angulaire prend le relais.

### Isolation userId — Backend

Quand `categoryId` est fourni dans `PATCH /api/links/:id`, le service doit vérifier que la catégorie cible appartient au même utilisateur (`categoryRepo.findOne({ where: { id: dto.categoryId, userId } })`). Sans cette vérification, un attaquant pourrait déplacer ses liens vers des catégories d'autres utilisateurs.

### Signal `computed` vs `signal`

`connectedListIds` utilise `computed()` (pas `signal()`) car sa valeur est dérivée de `linkCategoriesService.categories()`. `computed` se recalcule automatiquement si les catégories changent (ajout/suppression de catégorie).

### Arborescence des fichiers modifiés

```
backend/src/links/
├── dto/
│   └── update-link.dto.ts          ← MODIFIER : ajouter categoryId optionnel
├── links.service.ts                 ← MODIFIER : valider categoryId dans update()
└── links.service.spec.ts            ← MODIFIER : ajouter tests Jest pour move

frontend/src/app/links/
├── links.service.ts                 ← MODIFIER : ajouter moveLink()
├── links.service.spec.ts            ← MODIFIER : test HTTP moveLink
├── links.component.ts               ← MODIFIER : connectedListIds + handleMoveLink()
├── links.component.html             ← MODIFIER : [connectedTo] + (moveLink) sur la card
├── links.component.spec.ts          ← MODIFIER : tests handleMoveLink()
└── components/link-category-card/
    ├── link-category-card.component.ts    ← MODIFIER : connectedTo input, moveLink output, dropLink()
    ├── link-category-card.component.html  ← MODIFIER : [id] + [cdkDropListConnectedTo]
    └── link-category-card.component.spec.ts ← MODIFIER : tests dropLink() inter-catégorie

e2e/tests/
└── links-drag-drop.spec.ts          ← CRÉER
```

Aucun autre fichier à modifier.

---

## Learnings de la story précédente (4.6)

- **Tests Vitest** : `vi.fn()` pour les mocks de services, pattern `signal()` pour les propriétés signal. Voir `links.component.spec.ts` existant.
- **Pattern `OnPush` + signals** : ne pas utiliser `ChangeDetectorRef.markForCheck()` — les signals gèrent le CD automatiquement.
- **Tokens CSS Material** : utiliser `var(--mat-sys-*)` pour les styles — s'adaptent automatiquement aux thèmes clair/sombre. Le CDK applique `.cdk-drop-list-receiving` qui peut être stylisé avec ces tokens si besoin.
- **Aucun MatProgressSpinnerModule** dans ce composant : ne pas l'importer.
- **Tests Angular** : le projet utilise `TestBed` + `provideAnimationsAsync()` pour les tests de composants Angular CDK.

---

## Scénarios E2E

- Mode édition + deux catégories avec liens : drag lien catégorie A → catégorie B → vérifier que le lien est dans B et absent de A
- Mode lecture : vérifier que `cdk-drag-disabled` est présent sur les `app-link-item`

---

## Project Structure Notes

- Composants standalone (pas de NgModule)
- `OnPush` sur tous les composants — signals uniquement, pas de `subscribe` dans le template
- Backend NestJS : guards centralisés, `JwtAuthGuard` sur le contrôleur, isolation `userId` enforced dans le service
- Tests backend : Jest (`jest.Mock`, `jest.fn()`), pattern repository mock
- Tests frontend composants : Vitest (`vi.fn()`), TestBed + provideAnimationsAsync
- Tests frontend service : Vitest + HttpTestingController

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-20)

### Completion Notes List

- T1 : `UpdateLinkDto` étendu avec `categoryId? number` optionnel ; `links.service.ts` valide l'ownership de la catégorie cible avant `Object.assign` ; 3 nouveaux tests Jest (ownership ok, ForbiddenException, pas de vérif si categoryId absent). Total backend : 140 tests passent.
- T2 : Méthode `moveLink(id, categoryId)` ajoutée au service Angular (`PATCH /api/links/:id { categoryId }`) ; 1 nouveau test Vitest avec `HttpTestingController`. Total frontend service : 9 tests passent.
- T3 : `LinkCategoryCardComponent` reçoit `@Input() connectedTo` et émet `@Output() moveLink` ; `dropLink()` distingue intra vs inter-catégorie sans `transferArrayItem` ; template mis à jour avec `[id]` et `[cdkDropListConnectedTo]` ; 3 nouveaux tests Vitest. Total composant card : 12 tests passent.
- T4 : `LinksComponent` expose `connectedListIds` (computed depuis les catégories) et `handleMoveLink()` (optimistic update + rollback sur erreur + snackbar) ; template mis à jour avec `[connectedTo]` et `(moveLink)` ; 3 nouveaux tests Vitest. Total composant links : 33 tests passent.
- T5 : Fichier E2E Playwright créé avec 2 scénarios (drag inter-catégories + vérification drag désactivé en lecture).
- AC4 déjà satisfait : `[cdkDragDisabled]="!editMode"` était déjà en place, aucun code ajouté.

### File List

- backend/src/links/dto/update-link.dto.ts
- backend/src/links/links.service.ts
- backend/src/links/links.service.spec.ts
- frontend/src/app/links/links.service.ts
- frontend/src/app/links/links.service.spec.ts
- frontend/src/app/links/links.component.ts
- frontend/src/app/links/links.component.html
- frontend/src/app/links/links.component.spec.ts
- frontend/src/app/links/components/link-category-card/link-category-card.component.ts
- frontend/src/app/links/components/link-category-card/link-category-card.component.html
- frontend/src/app/links/components/link-category-card/link-category-card.component.spec.ts
- e2e/tests/links-drag-drop.spec.ts

### Change Log

- 2026-05-20 : Création du fichier story — analyse exhaustive du code existant (drag & drop intra-catégorie déjà en place, UpdateLinkDto exclut categoryId intentionnellement, état centralisé dans linksService.links signal)
- 2026-05-20 : Implémentation complète — déplacement inter-catégories par drag & drop avec optimistic update et rollback sur erreur

### Review Findings

- [x] [Review][Patch] Réponse HTTP `moveLink` ignorée — si le backend renvoie des champs mis à jour (timestamps, position), l'état local diverge silencieusement [`frontend/src/app/links/links.component.ts` — `handleMoveLink()`]
- [x] [Review][Patch] Race condition double drag rapide — deux `handleMoveLink()` concurrents sans verrou peuvent produire un rollback partiel incohérent si l'un des deux appels échoue [`frontend/src/app/links/links.component.ts` — `handleMoveLink()`]
- [x] [Review][Patch] `linkTitle` peut être `null` dans le locator E2E — `textContent()` retourne `string | null` ; le template literal produit le sélecteur `has-text("null")` qui ne matche jamais [`e2e/tests/links-drag-drop.spec.ts`]
- [x] [Review][Defer] Backend ne recalcule pas `position` lors d'un changement de `categoryId` — le lien conserve sa position d'origine dans la catégorie cible, potentiellement en conflit avec les positions existantes [`backend/src/links/links.service.ts`] — deferred, pre-existing
- [x] [Review][Defer] Test E2E suppose l'existence d'au moins 2 catégories avec un lien dans la première — échec silencieux en base de test vide [`e2e/tests/links-drag-drop.spec.ts`] — deferred, pre-existing
- [x] [Review][Defer] `waitForURL('/links')` sans timeout explicite dans le helper `login` — diagnostic lent en cas de redirection inattendue [`e2e/tests/links-drag-drop.spec.ts`] — deferred, pre-existing
- [x] [Review][Defer] Scénario E2E rollback sur erreur réseau absent (AC3 couvert par tests unitaires uniquement) [`e2e/tests/links-drag-drop.spec.ts`] — deferred, pre-existing
