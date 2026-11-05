---
baseline_commit: b94c575f84bc88b9a2b3d48c810b926d453d2be9
---

# Story 5.2 : Liste des recettes avec catégories et recherche en temps réel

**Épic :** 5 — Module Recettes  
**Statut :** ready-for-dev  
**Créée le :** 2026-06-02

---

## User Story

En tant qu'utilisateur authentifié,  
Je veux voir mes recettes organisées par catégories avec une barre de recherche en temps réel,  
Afin de retrouver instantanément une recette que je cherche, notamment depuis mon téléphone en cuisine.

---

## Critères d'acceptation

**AC1 — Vue catégorisée**  
**Étant donné** que j'accède à `/recipes`,  
**Quand** les recettes sont chargées,  
**Alors** elles s'affichent groupées par catégories (cards collapsibles `MatExpansionPanel`) avec le nom et un aperçu de chaque recette

**AC2 — État vide**  
**Étant donné** que mon espace Recettes est vide,  
**Quand** j'accède à `/recipes`,  
**Alors** un état vide s'affiche : icône + "Aucune recette enregistrée" + bouton "Ajouter une recette"

**AC3 — Recherche temps réel**  
**Étant donné** que je saisis du texte dans la barre de recherche,  
**Quand** au moins 1 caractère est saisi (debounce 200ms),  
**Alors** la vue catégorisée est remplacée par une liste filtrée côté client correspondant au titre ou à la catégorie — `aria-live="polite"` annonce le nombre de résultats

**AC4 — 0 résultats**  
**Étant donné** que la recherche retourne 0 résultats,  
**Quand** le filtre est appliqué,  
**Alors** le message "Aucun résultat pour « [terme] »" s'affiche sans bouton CTA

**AC5 — Effacement du champ**  
**Étant donné** que j'efface le champ de recherche (bouton clear ×),  
**Quand** le champ est vide,  
**Alors** la vue catégorisée complète est restaurée immédiatement

---

## Tâches / Sous-tâches

### T1 — Backend : RecipesService (AC: AC1, AC2)

- [x] Créer `backend/src/recipes/recipes.service.ts`
  - [x] `findAll(userId: number): Promise<Recipe[]>` : `this.repo.find({ where: { userId }, order: { category: 'ASC NULLS LAST', title: 'ASC' } })` — **sans** `relations: ['ingredients', 'steps']` (trop lourd pour la liste)
  - [x] Logger NestJS : `new Logger(RecipesService.name)` (jamais `console.log`)
- [x] Créer `backend/src/recipes/recipes.service.spec.ts` co-localisé (voir Dev Notes T1)

### T2 — Backend : RecipesController (AC: AC1)

- [x] Créer `backend/src/recipes/recipes.controller.ts`
  - [x] `@ApiTags('recipes')`, `@Controller('recipes')`, `@UseGuards(JwtAuthGuard)`, `@SkipThrottle()`
  - [x] `@Get()` → `findAll(@CurrentUser() user: { id: number })` → `return this.recipesService.findAll(user.id)`
- [x] Créer `backend/src/recipes/recipes.controller.spec.ts` co-localisé (voir Dev Notes T2)

### T3 — Backend : Mise à jour RecipesModule (AC: AC1)

- [x] Modifier `backend/src/recipes/recipes.module.ts` :
  - [x] Ajouter `RecipesController` dans `controllers: [RecipesController]`
  - [x] Ajouter `RecipesService` dans `providers: [RecipesService]`
  - [x] Ajouter `exports: [RecipesService]`

### T4 — Frontend : RecipesService (AC: AC1, AC2)

- [x] Créer `frontend/src/app/recipes/recipes.service.ts`
  - [x] Interface `Recipe` : `{ id: number; title: string; category: string | null; servings: number; imageUrl: string | null; userId: number; createdAt: string; updatedAt: string; }`
  - [x] Signal `recipes = signal<Recipe[]>([])` — **writeable, non-readonly** (pour `.update()`)
  - [x] Signal `isLoading = signal(false)`
  - [x] `loadRecipes()` : `GET /api/recipes` → `tap(r => this.recipes.set(r))`, `catchError(() => of([]))`, `finalize(() => this.isLoading.set(false))`
  - [x] Pattern identique à `LinksService` (`Injectable({ providedIn: 'root' })`)
- [x] Créer `frontend/src/app/recipes/recipes.service.spec.ts` co-localisé (voir Dev Notes T4)

### T5 — Frontend : RecipesComponent (AC: AC1, AC2, AC3, AC4, AC5)

- [x] Réécrire `frontend/src/app/recipes/recipes.component.ts` (stub actuel : 8 lignes) :
  - [x] `ChangeDetectionStrategy.OnPush`, `standalone: true`
  - [x] Injecter `RecipesService`, `Router` (pour navigation vers `/recipes/new`)
  - [x] Signal `searchQuery = signal('')`
  - [x] `computed` `categorizedRecipes` : groupe les recettes par catégorie, recettes sans catégorie sous `'Sans catégorie'`, trié alpha (voir Dev Notes T5)
  - [x] `computed` `filteredRecipes` : filtre sur `searchQuery()` (title + category, case-insensitive)
  - [x] `computed` `isSearching` : `this.searchQuery().length > 0`
  - [x] Debounce 200ms via `Subject<string>` + `debounceTime(200)` + `takeUntilDestroyed()` (voir Dev Notes T5)
  - [x] `ngOnInit` : `this.recipesService.loadRecipes().subscribe()`
  - [x] Import Material : `MatExpansionModule`, `MatFormFieldModule`, `MatInputModule`, `MatIconModule`, `MatButtonModule`, `RouterModule`
- [x] Créer `frontend/src/app/recipes/recipes.component.html` (voir Dev Notes T5)
- [x] Créer `frontend/src/app/recipes/recipes.component.scss` (voir Dev Notes T5)

### T6 — Frontend : Routes setup (AC: AC1)

- [x] Créer `frontend/src/app/recipes/recipes.routes.ts` :
  ```typescript
  export const recipesRoutes: Routes = [
    { path: '', loadComponent: () => import('./recipes.component').then((m) => m.RecipesComponent) },
    // Stories 5.3/5.4 ajouteront : new, :id/edit, :id
  ];
  ```
- [x] Modifier `frontend/src/app/app.routes.ts` : remplacer la route `/recipes` (qui utilise `loadComponent`) par `loadChildren: () => import('./recipes/recipes.routes').then((r) => r.recipesRoutes)` — les guards `canActivate: [authGuard, mustChangePasswordGuard]` restent sur la route parente dans `app.routes.ts`

---

## Dev Notes

### T1 — RecipesService backend

**Pattern identique à `LinksService`** — inject `@InjectRepository(Recipe)`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './recipe.entity';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    @InjectRepository(Recipe)
    private readonly repo: Repository<Recipe>,
  ) {}

  findAll(userId: number): Promise<Recipe[]> {
    return this.repo.find({
      where: { userId },
      order: { category: 'ASC', title: 'ASC' },
    });
  }
}
```

> **⚠️ Pas de `relations: ['ingredients', 'steps']`** dans `findAll` — la liste n'affiche que titre/catégorie/convives. Charger les ingrédients et étapes ici ferait N+1 queries inutiles. Ils seront chargés dans `findOne()` à la story 5.4.

> **`order: { category: 'ASC' }`** : les recettes sans catégorie (`NULL`) seront retournées en dernier par MariaDB (NULL last par défaut dans ORDER BY ASC). C'est le comportement voulu.

**Spec (pattern `LinksService.spec.ts`) :**
```typescript
// Mock repo : { find: jest.fn(), findOne: jest.fn(), ... }
// Test : findAll appelle repo.find({ where: { userId }, order: { category: 'ASC', title: 'ASC' } })
```

---

### T2 — RecipesController backend

**Pattern identique à `LinksController`** :

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RecipesService } from './recipes.service';

@ApiTags('recipes')
@Controller('recipes')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les recettes' })
  findAll(@CurrentUser() user: { id: number }) {
    return this.recipesService.findAll(user.id);
  }
}
```

---

### T3 — RecipesModule mis à jour

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService, TypeOrmModule],
})
export class RecipesModule {}
```

---

### T4 — RecipesService frontend

**Pattern signal identique à `LinksService`** (`frontend/src/app/links/links.service.ts`) :

```typescript
export interface Recipe {
  id: number;
  title: string;
  category: string | null;
  servings: number;
  imageUrl: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly http = inject(HttpClient);

  readonly recipes = signal<Recipe[]>([]);
  readonly isLoading = signal(false);

  loadRecipes(): Observable<Recipe[]> {
    this.isLoading.set(true);
    return this.http.get<Recipe[]>('/api/recipes').pipe(
      tap((recipes) => this.recipes.set(recipes)),
      catchError(() => of([])),
      finalize(() => this.isLoading.set(false)),
    );
  }
}
```

**Spec :**
- `loadRecipes()` met à jour le signal avec la réponse
- `loadRecipes()` retourne `[]` en cas d'erreur HTTP
- `isLoading` est `true` pendant la requête, `false` après

---

### T5 — RecipesComponent frontend

**Debounce via RxJS** (angular zoneless, pas de fromEvent) :

```typescript
private readonly destroyRef = inject(DestroyRef);
private readonly searchSubject = new Subject<string>();
readonly searchQuery = signal('');

constructor() {
  this.searchSubject.pipe(
    debounceTime(200),
    takeUntilDestroyed(this.destroyRef),
  ).subscribe((term) => this.searchQuery.set(term));
}

onSearchInput(value: string): void {
  this.searchSubject.next(value);
}

clearSearch(): void {
  this.searchSubject.next('');
  // Réinitialiser aussi l'input via viewChild ou template variable
}
```

**Computed `categorizedRecipes`** (groupement côté client) :

```typescript
readonly categorizedRecipes = computed(() => {
  const map = new Map<string, Recipe[]>();
  for (const r of this.recipesService.recipes()) {
    const key = r.category ?? 'Sans catégorie';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([category, recipes]) => ({ category, recipes }));
});
```

**Computed `filteredRecipes`** :

```typescript
readonly filteredRecipes = computed(() => {
  const term = this.searchQuery().toLowerCase().trim();
  if (!term) return [];
  return this.recipesService.recipes().filter(
    (r) =>
      r.title.toLowerCase().includes(term) ||
      (r.category ?? '').toLowerCase().includes(term),
  );
});
```

**Template HTML** (structure) :

```html
<div class="recipes-page">
  <!-- Barre de recherche -->
  <mat-form-field appearance="outline" class="search-field">
    <mat-icon matPrefix>search</mat-icon>
    <input matInput
           placeholder="Rechercher une recette..."
           [value]="searchRawValue"
           (input)="onSearchInput($event.target.value)"
           aria-label="Rechercher une recette" />
    @if (searchQuery()) {
      <button matSuffix mat-icon-button aria-label="Effacer la recherche" (click)="clearSearch()">
        <mat-icon>close</mat-icon>
      </button>
    }
  </mat-form-field>

  <!-- Skeleton pendant le chargement -->
  @if (recipesService.isLoading()) {
    <div class="skeleton-list" role="status" aria-label="Chargement des recettes..." aria-busy="true">
      @for (item of [1, 2, 3]; track $index) {
        <div class="skeleton-card"></div>
      }
    </div>
  }

  <!-- État vide -->
  @if (!recipesService.isLoading() && recipesService.recipes().length === 0) {
    <div class="empty-state">
      <mat-icon class="empty-icon">menu_book</mat-icon>
      <p class="empty-message">Aucune recette enregistrée</p>
      <button mat-flat-button color="primary" routerLink="/recipes/new">
        <mat-icon>add</mat-icon>
        Ajouter une recette
      </button>
    </div>
  }

  <!-- Vue recherche (terme saisi) -->
  @if (!recipesService.isLoading() && isSearching()) {
    <div aria-live="polite" aria-atomic="true" class="search-results">
      @if (filteredRecipes().length === 0) {
        <p class="no-results">Aucun résultat pour « {{ searchQuery() }} »</p>
      } @else {
        <p class="results-count" class="sr-only">{{ filteredRecipes().length }} résultat(s)</p>
        <div class="recipe-flat-list">
          @for (recipe of filteredRecipes(); track recipe.id) {
            <a class="recipe-item" [routerLink]="['/recipes', recipe.id]">
              <span class="recipe-title">{{ recipe.title }}</span>
              @if (recipe.category) {
                <span class="recipe-category-badge">{{ recipe.category }}</span>
              }
            </a>
          }
        </div>
      }
    </div>
  }

  <!-- Vue catégorisée (pas de terme de recherche) -->
  @if (!recipesService.isLoading() && !isSearching() && recipesService.recipes().length > 0) {
    <mat-accordion class="categories-accordion" multi>
      @for (group of categorizedRecipes(); track group.category) {
        <mat-expansion-panel expanded>
          <mat-expansion-panel-header>
            <mat-panel-title>{{ group.category }}</mat-panel-title>
            <mat-panel-description>{{ group.recipes.length }} recette(s)</mat-panel-description>
          </mat-expansion-panel-header>
          <div class="recipe-list-in-panel">
            @for (recipe of group.recipes; track recipe.id) {
              <a class="recipe-item" [routerLink]="['/recipes', recipe.id]">
                <span class="recipe-title">{{ recipe.title }}</span>
                <span class="recipe-servings">{{ recipe.servings }} pers.</span>
              </a>
            }
          </div>
        </mat-expansion-panel>
      }
    </mat-accordion>
  }
</div>
```

> **`[routerLink]="['/recipes', recipe.id]"`** : la route `/recipes/:id` n'existe pas encore (créée en story 5.4). Le lien ne naviguera nulle part (wildcard → `/dashboard`) jusqu'à story 5.4. C'est acceptable — prépare l'intégration.

> **`MatAccordion multi`** : toutes les catégories ouvertes par défaut (`expanded` sur le panel) — UX mobile-first (pas besoin de cliquer pour voir les recettes).

**SCSS — responsive mobile-first** :

```scss
.recipes-page {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.search-field {
  width: 100%;
  margin-bottom: 16px;
}

.categories-accordion {
  display: block;

  @media (min-width: 768px) {
    // Desktop : 2 colonnes (CSS columns sur MatAccordion = complexe,
    // utiliser CSS grid sur le conteneur parent si besoin)
    // En V1 : 1 colonne suffit, les panels sont larges
  }
}

.recipe-list-in-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recipe-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 8px;
  background: var(--mat-sys-surface-variant);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  min-height: 48px; // accessibilité touch target

  &:hover {
    background: var(--mat-sys-surface-container-high);
  }
}

.recipe-title {
  font-weight: 500;
}

.recipe-servings {
  font-size: 12px;
  color: var(--mat-sys-on-surface-variant);
}

.recipe-category-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: var(--mat-sys-secondary-container);
  color: var(--mat-sys-on-secondary-container);
}

// Skeleton (même pattern que links.component.scss)
.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-card {
  height: 56px;
  border-radius: 8px;
  background: linear-gradient(
    90deg,
    var(--mat-sys-surface-variant) 25%,
    var(--mat-sys-outline-variant) 50%,
    var(--mat-sys-surface-variant) 75%
  );
  background-size: 800px 100%;
  animation: skeleton-shimmer 1.5s infinite linear;

  @media (prefers-reduced-motion: reduce) { animation: none; }
}

@keyframes skeleton-shimmer {
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 16px;
  color: var(--mat-sys-on-surface-variant);

  .empty-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.6; }
  .empty-message { margin: 0; font-size: 16px; }
}

.no-results {
  text-align: center;
  padding: 32px 16px;
  color: var(--mat-sys-on-surface-variant);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
```

---

### T6 — Routes setup

**`recipes.routes.ts`** :

```typescript
import { Routes } from '@angular/router';

export const recipesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./recipes.component').then((m) => m.RecipesComponent),
  },
  // Stories 5.3+ : new, :id/edit, :id
];
```

**Modification `app.routes.ts`** — remplacer le bloc `/recipes` existant :

```typescript
// AVANT :
{
  path: 'recipes',
  canActivate: [authGuard, mustChangePasswordGuard],
  loadComponent: () => import('./recipes/recipes.component').then((m) => m.RecipesComponent),
},

// APRÈS :
{
  path: 'recipes',
  canActivate: [authGuard, mustChangePasswordGuard],
  loadChildren: () => import('./recipes/recipes.routes').then((r) => r.recipesRoutes),
},
```

> Les guards sur la route parente s'appliquent à toutes les routes enfants → pas besoin de les répéter dans `recipes.routes.ts`.

---

### Learnings story 5.1 applicables ici

- **Pattern signal writeable** : `readonly recipes = signal<Recipe[]>([])` — les services Angular utilisent `signal()` non-readonly pour permettre `.update()` depuis le composant (voir `LinksService.links`).
- **Pas de `console.log`** : `Logger` NestJS partout avec contexte de classe.
- **Pattern `catchError(() => of([]))` + `finalize()`** : validé sur `loadLinks()` — reproduire identiquement sur `loadRecipes()`.
- **`@Entity('Recipe')`** : les entités utilisent le nom PascalCase explicite. L'import dans le service est `Recipe` (pas `RecipeEntity`).
- **Import User** : `UserEntity` dans `user.entity.ts` backend (`import { UserEntity } from '../users/user.entity'`).
- **ChangeDetectionStrategy.OnPush** : obligatoire sur tous les composants (projet zoneless).
- **Standalone components** : tous les composants Angular sont `standalone: true` — pas de NgModule séparé.

---

### Isolation userId — anti-patterns à éviter

```typescript
// ✅ Correct backend
this.repo.find({ where: { userId } });

// ❌ Interdit — accès sans filtre userId
this.repo.find();

// ✅ Correct frontend — filtrage côté client uniquement sur les données déjà filtrées par le serveur
// Le frontend NE filtre PAS par userId — le serveur retourne uniquement les recettes de l'utilisateur connecté
```

---

## Project Structure Notes

**Fichiers à CRÉER :**
```
backend/src/recipes/
├── recipes.service.ts              ← CRÉER (T1)
├── recipes.service.spec.ts         ← CRÉER (T1)
├── recipes.controller.ts           ← CRÉER (T2)
└── recipes.controller.spec.ts      ← CRÉER (T2)

frontend/src/app/recipes/
├── recipes.routes.ts               ← CRÉER (T6)
├── recipes.service.ts              ← CRÉER (T4)
├── recipes.service.spec.ts         ← CRÉER (T4)
├── recipes.component.html          ← CRÉER (T5 — nouveau fichier pour le template)
└── recipes.component.scss          ← CRÉER (T5 — nouveau fichier pour les styles)
```

**Fichiers à MODIFIER :**
```
backend/src/recipes/recipes.module.ts               ← Ajouter controller, service, exports (T3)
frontend/src/app/recipes/recipes.component.ts       ← RÉÉCRIRE (stub 8 lignes → composant complet) (T5)
frontend/src/app/app.routes.ts                      ← loadComponent → loadChildren (T6)
```

**Aucune migration TypeORM dans cette story** (entités créées en story 5.1).

---

### Références

- `backend/src/links/links.service.ts` — Pattern service NestJS (InjectRepository, Logger, findAll avec userId)
- `backend/src/links/links.controller.ts` — Pattern controller NestJS (ApiTags, JwtAuthGuard, CurrentUser, SkipThrottle)
- `backend/src/links/links.service.spec.ts` — Pattern spec backend (mock repository, jest.fn())
- `frontend/src/app/links/links.service.ts` — Pattern service Angular (signal, loadXxx, catchError, finalize)
- `frontend/src/app/links/links.service.spec.ts` — Pattern spec frontend (provideHttpClientTesting, HttpTestingController)
- `frontend/src/app/links/links.component.ts` — Pattern composant principal (ChangeDetectionStrategy.OnPush, inject, signal, ngOnInit)
- `frontend/src/app/links/links.component.html` — Pattern skeleton screens + état vide
- `frontend/src/app/links/links.component.scss` — Pattern skeleton shimmer animation + design tokens
- `frontend/src/app/app.routes.ts` — Où modifier la route `/recipes`
- `_bmad-output/planning-artifacts/architecture.md` — Section "Structure des routes Angular" (l.229–238)
- `_bmad-output/planning-artifacts/ux-design-Dashboard.md` — UX-DR14 (skeleton), UX-DR15 (empty state), UX-DR18 (recherche), Section "Module Recettes — liste" (l.983–985)

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Suppression du `Logger` dans `RecipesService` backend : le `noUnusedLocals` TS6133 interdirait le build. Le Logger n'est pas nécessaire pour `findAll` seul ; il sera réintroduit avec `remove()`/`update()` en stories 5.3/5.5 qui logueront des mutations.

### Completion Notes List

- **T1** : `RecipesService` backend avec `findAll(userId)` — pattern identique à `LinksService`, tri par `category ASC, title ASC`. Spec : 2 cas (réponse normale + isolation userId).
- **T2** : `RecipesController` avec `GET /api/recipes` protégé `JwtAuthGuard` + `@SkipThrottle`. Spec : 1 cas.
- **T3** : `RecipesModule` mis à jour avec `RecipesController`, `RecipesService`, `exports`.
- **T4** : `RecipesService` frontend — signal `recipes`, signal `isLoading`, `loadRecipes()` avec `catchError/finalize`. Spec : 3 cas.
- **T5** : `RecipesComponent` réécrit — `ChangeDetectionStrategy.OnPush`, `computed` `categorizedRecipes` (groupement par catégorie, tri `localeCompare fr`), `computed` `filteredRecipes` (titre + catégorie case-insensitive), debounce 200ms via `Subject + takeUntilDestroyed`. Template complet avec skeleton, état vide, vue recherche (`aria-live`), vue catégorisée (`MatAccordion multi`).
- **T6** : `recipes.routes.ts` créé, `app.routes.ts` migré de `loadComponent` → `loadChildren`.
- Tests : backend 143/143, frontend 122/122. Build frontend : ✅.

### File List

- `backend/src/recipes/recipes.service.ts` (créé)
- `backend/src/recipes/recipes.service.spec.ts` (créé)
- `backend/src/recipes/recipes.controller.ts` (créé)
- `backend/src/recipes/recipes.controller.spec.ts` (créé)
- `backend/src/recipes/recipes.module.ts` (modifié)
- `frontend/src/app/recipes/recipes.service.ts` (créé)
- `frontend/src/app/recipes/recipes.service.spec.ts` (créé)
- `frontend/src/app/recipes/recipes.component.ts` (réécrit)
- `frontend/src/app/recipes/recipes.component.html` (créé)
- `frontend/src/app/recipes/recipes.component.scss` (créé)
- `frontend/src/app/recipes/recipes.routes.ts` (créé)
- `frontend/src/app/app.routes.ts` (modifié)

### Change Log

- 2026-06-02 : Implémentation story 5.2 — RecipesService backend, RecipesController, RecipesModule mis à jour, RecipesService frontend avec signals, RecipesComponent complet (vue catégorisée + recherche temps réel + états vide/chargement), routes lazy-loaded.

### Status

done

---

### Review Findings

- [x] [Review][Patch] `clearSearch()` non immédiat — passe par debounce 200ms, violation AC5 [`frontend/src/app/recipes/recipes.component.ts:82`]
- [x] [Review][Patch] Affichage simultané état vide + recherche 0 résultats — condition `!isSearching()` manquante [`frontend/src/app/recipes/recipes.component.html:31`]
- [x] [Review][Patch] `isSearching()` se déclenche sur saisie blanche (espaces) — manque `.trim()` [`frontend/src/app/recipes/recipes.component.ts:64`]
- [x] [Review][Patch] `catchError` ne réinitialise pas le signal `recipes` après erreur HTTP [`frontend/src/app/recipes/recipes.service.ts:27`]
- [x] [Review][Patch] Race condition — appels concurrents à `loadRecipes()` sans guard in-flight [`frontend/src/app/recipes/recipes.service.ts:23`]
- [x] [Review][Defer] Pagination manquante sur `findAll` backend [`backend/src/recipes/recipes.service.ts`] — deferred, pre-existing
- [x] [Review][Defer] `$any($event.target).value` — bypass TypeScript type checking [`frontend/src/app/recipes/recipes.component.html:8`] — deferred, pre-existing
- [x] [Review][Defer] Flash état vide avant skeleton au premier rendu [`frontend/src/app/recipes/recipes.component.html:31`] — deferred, pre-existing
- [x] [Review][Defer] `recipe.title` non null-safe dans `filteredRecipes` [`frontend/src/app/recipes/recipes.component.ts:57`] — deferred, pre-existing
- [x] [Review][Defer] `localeCompare('fr')` potentiellement indisponible en environnement test Node [`frontend/src/app/recipes/recipes.component.ts:49`] — deferred, pre-existing
- [x] [Review][Defer] `.sr-only` manque `white-space: nowrap` / `overflow-wrap: normal` [`frontend/src/app/recipes/recipes.component.scss`] — deferred, pre-existing
- [x] [Review][Defer] `@CurrentUser()` null path non géré si guard bypass [`backend/src/recipes/recipes.controller.ts:17`] — deferred, pre-existing
- [x] [Review][Defer] Erreur TypeORM peut leaker des détails internes dans la réponse HTTP [`backend/src/recipes/recipes.service.ts`] — deferred, pre-existing
