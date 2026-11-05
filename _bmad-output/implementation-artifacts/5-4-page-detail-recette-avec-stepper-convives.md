---
baseline_commit: a95f223
---

# Story 5.4 : Page détail recette avec stepper convives

**Épic :** 5 — Module Recettes  
**Statut :** done  
**Créée le :** 2026-06-02

---

## User Story

En tant qu'utilisateur authentifié,  
Je veux consulter une recette avec son stepper de convives pour recalculer les quantités en temps réel,  
Afin de préparer la recette pour le bon nombre de personnes depuis mon téléphone en cuisine.

---

## Critères d'acceptation

**AC1 — Affichage page détail**  
**Étant donné** que je tape sur une recette dans la liste,  
**Quand** j'arrive sur `/recipes/:id`,  
**Alors** la page affiche : titre, image (le cas échéant), `ConvivesSteppper` initialisé à `recipe.servings`, liste des ingrédients, liste des étapes

**AC2 — Recalcul des quantités**  
**Étant donné** que le stepper convives affiche N personnes,  
**Quand** je clique le bouton "+" ou "−",  
**Alors** les quantités de tous les ingrédients sont recalculées immédiatement (< 100ms, calcul côté client) et affichées avec la nouvelle valeur — le minimum est 1

**AC3 — Layout mobile (<768px)**  
**Étant donné** que la page est sur mobile (<768px),  
**Quand** j'affiche la page détail,  
**Alors** le stepper est en haut, puis les ingrédients, puis les étapes en colonne (layout empilé)

**AC4 — Layout desktop (≥768px)**  
**Étant donné** que la page est sur desktop (≥768px),  
**Quand** j'affiche la page détail,  
**Alors** le stepper est en haut, puis ingrédients et étapes en 2 colonnes côte à côte

**AC5 — Accessibilité `ConvivesSteppper`**  
**Étant donné** que j'inspecte le `ConvivesSteppper`,  
**Quand** je vérifie les attributs ARIA,  
**Alors** `role="spinbutton"`, `aria-valuenow`, `aria-valuemin` sont présents et les boutons +/− ont une taille minimale de 48×48px

---

## Tâches / Sous-tâches

### T1 — Frontend : ConvivesSteppper composant autonome (AC: AC2, AC5)

- [x] Créer `frontend/src/app/recipes/recipe-detail/convives-steppper.component.ts` :
  - [x] Standalone, `ChangeDetectionStrategy.OnPush`
  - [x] `@Input({ required: true }) value!: number` — valeur courante
  - [x] `@Input() min = 1` — minimum (pas de max défini)
  - [x] `@Output() valueChange = new EventEmitter<number>()`
  - [x] Méthodes `increment()` et `decrement()` — `decrement` bloque à `min`
  - [x] Attributs ARIA : `role="spinbutton"`, `[attr.aria-valuenow]="value"`, `[attr.aria-valuemin]="min"`
  - [x] Boutons +/− `mat-icon-button` avec `min-width: 48px; min-height: 48px`
  - [x] Importer : `MatButtonModule`, `MatIconModule`
- [x] Créer `frontend/src/app/recipes/recipe-detail/convives-steppper.component.html`
- [x] Créer `frontend/src/app/recipes/recipe-detail/convives-steppper.component.scss`

### T2 — Frontend : RecipeDetailComponent (AC: AC1, AC2, AC3, AC4)

- [x] Créer `frontend/src/app/recipes/recipe-detail/recipe-detail.component.ts` :
  - [x] Standalone, `ChangeDetectionStrategy.OnPush`
  - [x] Inject : `ActivatedRoute`, `RecipesService`, `Router`
  - [x] `recipeId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'))` — avec garde `isNaN`
  - [x] `recipe = signal<RecipeDetail | null>(null)` (writeable signal)
  - [x] `isLoading = signal(true)`
  - [x] `currentServings = signal(0)` — initialisé après chargement avec `recipe.servings`
  - [x] `computedIngredients = computed(...)` — recalcule les quantités en temps réel (voir Dev Notes T2)
  - [x] `ngOnInit()` : appelle `recipesService.getRecipe(recipeId)` avec `takeUntilDestroyed`
  - [x] Si `recipeId` est `NaN` → `router.navigate(['/recipes'])`
  - [x] Gestion d'erreur 404/autre → `router.navigate(['/recipes'])`
  - [x] Imports : `RouterModule`, `ConvivesSteppperComponent`, `MatButtonModule`, `MatIconModule`, `DecimalPipe`, `NgIf` / `@if`
- [x] Créer `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html` (voir Dev Notes T2)
- [x] Créer `frontend/src/app/recipes/recipe-detail/recipe-detail.component.scss` (voir Dev Notes T2)

### T3 — Frontend : Mise à jour des routes (AC: AC1)

- [x] Modifier `frontend/src/app/recipes/recipes.routes.ts` :
  - [x] Ajouter route `':id'` → `RecipeDetailComponent` **entre** `'new'` et `':id/edit'`
  - [x] Ordre final : `''` → `'new'` → `':id'` → `':id/edit'`
  - [x] Supprimer le commentaire `// Story 5.4 ajoutera ...`

### Review Findings

- [x] [Review][Patch] `aria-valuemax` manquant sur le spinbutton — non-conformité ARIA [`convives-steppper.component.html:1-6`]
- [x] [Review][Patch] `isLoading` non réinitialisé avant navigation sur le chemin d'erreur [`recipe-detail.component.ts:73-75`]
- [x] [Review][Patch] `isLoading` non réinitialisé avant navigation sur le chemin NaN [`recipe-detail.component.ts:55-58`]
- [x] [Review][Defer] Redirect silencieux sans feedback utilisateur sur erreur HTTP [`recipe-detail.component.ts:73`] — deferred, comportement conforme à la spec
- [x] [Review][Defer] Sentinel `-1` pour recipeId invalide — style, fonctionne correctement [`recipe-detail.component.ts:40-43`] — deferred, amélioration de style
- [x] [Review][Defer] Six appels `recipe()!` dans le template — utiliser `@let r = recipe()!` [`recipe-detail.component.html`] — deferred, amélioration de lisibilité
- [x] [Review][Defer] `recipe.servings === 0` → liste vide affichée alors que les ingrédients existent [`recipe-detail.component.ts:44-48`] — deferred, nécessite une donnée invalide côté backend
- [x] [Review][Defer] Utilisation de `snapshot` pour le param de route — `paramMap` observable serait plus robuste [`recipe-detail.component.ts:40`] — deferred, comportement correct avec la stratégie par défaut
- [x] [Review][Defer] `<pre>` sémantiquement redondant avec `white-space: pre-wrap` SCSS [`recipe-detail.component.html:63`] — deferred, cosmétique
- [x] [Review][Defer] `track ing.id` / `track step.id` sans fallback si id undefined [`recipe-detail.component.html:54,65`] — deferred, nécessite une donnée invalide côté backend
- [x] [Review][Defer] Paramètre route flottant (ex: "1.5") non intercepté par `isNaN` [`recipe-detail.component.ts:40`] — deferred, géré par le 404 de l'API

---

## Dev Notes

### T1 — ConvivesSteppper

> **Nom exact :** `ConvivesSteppper` (3 'p') — nom prescrit par le UX doc (distinct du `MatStepper` Angular Material qui gère des workflows multi-étapes).

**Composant complet :**

```typescript
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-convives-steppper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './convives-steppper.component.html',
  styleUrls: ['./convives-steppper.component.scss'],
})
export class ConvivesSteppperComponent {
  @Input({ required: true }) value!: number;
  @Input() min = 1;
  @Output() valueChange = new EventEmitter<number>();

  increment(): void {
    this.valueChange.emit(this.value + 1);
  }

  decrement(): void {
    if (this.value > this.min) {
      this.valueChange.emit(this.value - 1);
    }
  }
}
```

**Template HTML :**

```html
<div
  class="convives-steppper"
  role="spinbutton"
  [attr.aria-valuenow]="value"
  [attr.aria-valuemin]="min"
  aria-label="Nombre de convives">
  <button
    type="button"
    mat-icon-button
    class="step-btn"
    [disabled]="value <= min"
    (click)="decrement()"
    aria-label="Réduire le nombre de convives">
    <mat-icon>remove</mat-icon>
  </button>
  <span class="value-display" aria-hidden="true">{{ value }} pers.</span>
  <button
    type="button"
    mat-icon-button
    class="step-btn"
    (click)="increment()"
    aria-label="Augmenter le nombre de convives">
    <mat-icon>add</mat-icon>
  </button>
</div>
```

**SCSS :**

```scss
.convives-steppper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-btn {
  min-width: 48px;
  min-height: 48px;
  width: 48px;
  height: 48px;
}

.value-display {
  font-size: 1.1rem;
  font-weight: 600;
  min-width: 80px;
  text-align: center;
}
```

---

### T2 — RecipeDetailComponent

**Recalcul des quantités — logique centrale :**

```typescript
readonly computedIngredients = computed(() => {
  const recipe = this.recipe();
  const servings = this.currentServings();
  if (!recipe || !servings || !recipe.servings) return [];
  return recipe.ingredients.map((ing) => ({
    ...ing,
    quantity: (ing.quantity * servings) / recipe.servings,
  }));
});
```

> **`quantity` est déjà un `number`** (le `decimalTransformer` de TypeORM sur la colonne DECIMAL gère la conversion string→float côté backend). L'interface `RecipeIngredientItem.quantity: number` dans `recipes.service.ts` est correcte.

> **Calcul côté client pur** — aucun appel réseau lors du changement de convives.

**Classe complète :**

```typescript
import {
  Component, ChangeDetectionStrategy, OnInit, inject, signal, computed,
} from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecipesService, RecipeDetail } from '../recipes.service';
import { ConvivesSteppperComponent } from './convives-steppper.component';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterModule,
    DecimalPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ConvivesSteppperComponent,
  ],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.scss'],
})
export class RecipeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recipesService = inject(RecipesService);

  readonly recipeId: number = (() => {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return isNaN(id) ? -1 : id;
  })();

  readonly recipe = signal<RecipeDetail | null>(null);
  readonly isLoading = signal(true);
  readonly currentServings = signal(1);

  readonly computedIngredients = computed(() => {
    const recipe = this.recipe();
    const servings = this.currentServings();
    if (!recipe || !servings || !recipe.servings) return [];
    return recipe.ingredients.map((ing) => ({
      ...ing,
      quantity: (ing.quantity * servings) / recipe.servings,
    }));
  });

  ngOnInit(): void {
    if (this.recipeId === -1) {
      this.router.navigate(['/recipes']);
      return;
    }
    this.recipesService
      .getRecipe(this.recipeId)
      .pipe(takeUntilDestroyed())
      .subscribe({
        next: (recipe) => {
          this.recipe.set(recipe);
          this.currentServings.set(recipe.servings);
          this.isLoading.set(false);
        },
        error: () => {
          this.router.navigate(['/recipes']);
        },
      });
  }

  onServingsChange(value: number): void {
    this.currentServings.set(value);
  }
}
```

> **`takeUntilDestroyed()` sans argument** : Angular 16+ accepte l'appel en dehors du constructeur si utilisé dans `ngOnInit` — **mais uniquement dans un contexte d'injection**. Si une erreur TypeScript apparaît, passer `inject(DestroyRef)` en argument : `takeUntilDestroyed(inject(DestroyRef))`.

**Template HTML :**

```html
<div class="recipe-detail">
  @if (isLoading()) {
    <div class="loading-state" role="status" aria-label="Chargement..." aria-busy="true">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  } @else if (recipe()) {
    <header class="detail-header">
      <button mat-icon-button routerLink="/recipes" aria-label="Retour à la liste">
        <mat-icon>arrow_back</mat-icon>
      </button>
      <h1 class="recipe-title">{{ recipe()!.title }}</h1>
      <button
        mat-icon-button
        [routerLink]="['/recipes', recipe()!.id, 'edit']"
        aria-label="Modifier la recette">
        <mat-icon>edit</mat-icon>
      </button>
    </header>

    @if (recipe()!.imageUrl) {
      <img
        class="recipe-image"
        [src]="recipe()!.imageUrl"
        [alt]="recipe()!.title"
        loading="lazy" />
    }

    <section class="servings-section" aria-label="Convives">
      <app-convives-steppper
        [value]="currentServings()"
        [min]="1"
        (valueChange)="onServingsChange($event)">
      </app-convives-steppper>
    </section>

    <div class="detail-body">
      <section class="ingredients-section" aria-label="Ingrédients">
        <h2 class="section-title">Ingrédients</h2>
        @if (computedIngredients().length === 0) {
          <p class="empty-section">Aucun ingrédient renseigné.</p>
        } @else {
          <ul class="ingredient-list">
            @for (ing of computedIngredients(); track ing.id) {
              <li class="ingredient-item">
                <span class="quantity">{{ ing.quantity | number:'1.0-2':'fr' }}</span>
                @if (ing.unit) {
                  <span class="unit">{{ ing.unit }}</span>
                }
                <span class="name">{{ ing.name }}</span>
              </li>
            }
          </ul>
        }
      </section>

      <section class="steps-section" aria-label="Étapes">
        <h2 class="section-title">Étapes</h2>
        @if (recipe()!.steps.length === 0) {
          <p class="empty-section">Aucune étape renseignée.</p>
        } @else {
          <ol class="step-list">
            @for (step of recipe()!.steps; track step.id) {
              <li class="step-item">
                <pre class="step-content">{{ step.content }}</pre>
              </li>
            }
          </ol>
        }
      </section>
    </div>
  }
</div>
```

> **Rendu des étapes avec `<pre>` + `white-space: pre-wrap`** : aucune librairie markdown (`marked`, `ngx-markdown`) n'est installée dans le projet. Le contenu des étapes est affiché en texte brut avec préservation des sauts de ligne. L'ajout d'un renderer markdown est déféré — hors scope story 5.4. **Ne pas introduire une nouvelle dépendance NPM pour cette story.**

> **`| number:'1.0-2':'fr'`** : arrondit à 2 décimales max, format français (virgule décimale). La quantité `0.333...` pour 2 personnes sur 6 s'affiche `0,33` — acceptable pour la cuisine.

**SCSS :**

```scss
.recipe-detail {
  max-width: 960px;
  margin: 0 auto;
  padding: 16px;
}

.loading-state {
  display: flex;
  justify-content: center;
  padding: 48px;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;

  .recipe-title {
    flex: 1;
    font-size: 1.4rem;
    font-weight: 700;
    margin: 0;
  }
}

.recipe-image {
  width: 100%;
  max-height: 300px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 16px;
}

.servings-section {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--mat-sys-surface-container);
  border-radius: 8px;
}

.detail-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 12px;
  color: var(--color-primary);
}

.ingredient-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.ingredient-item {
  display: flex;
  gap: 6px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-divider);

  &:last-child { border-bottom: none; }

  .quantity { font-weight: 600; min-width: 40px; }
  .unit { color: var(--color-text-secondary); }
}

.step-list {
  padding: 0 0 0 20px;
  margin: 0;
}

.step-item {
  margin-bottom: 12px;
}

.step-content {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 4px 0;
}

.empty-section {
  color: var(--color-text-secondary);
  font-style: italic;
}
```

---

### T3 — Routes

```typescript
import { Routes } from '@angular/router';

export const recipesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./recipes.component').then((m) => m.RecipesComponent),
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./recipe-editor/recipe-editor.component').then((m) => m.RecipeEditorComponent),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./recipe-detail/recipe-detail.component').then((m) => m.RecipeDetailComponent),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./recipe-editor/recipe-editor.component').then((m) => m.RecipeEditorComponent),
  },
];
```

> **Ordre critique** : `'new'` AVANT `':id'`. Angular matche `new` comme une chaîne statique (priorité sur les segments paramétrés). `':id/edit'` et `':id'` ne sont pas en conflit car l'un a 2 segments, l'autre 1.

> **Aucun backend à modifier** : `GET /api/recipes/:id` est déjà implémenté dans `RecipesController.findOne()` et retourne `Recipe` avec `relations: ['ingredients', 'steps']`. La méthode `recipesService.getRecipe(id)` est déjà dans `RecipesService` frontend.

---

### Learnings de story 5.3 applicables ici

- **`takeUntilDestroyed()`** : utiliser dans `ngOnInit` pour les subscriptions — pattern établi dans `RecipesComponent` (via `searchSubject`). Si erreur "injection context", passer `inject(DestroyRef)` en argument.
- **`ChangeDetectionStrategy.OnPush`** : obligatoire sur tous les nouveaux composants.
- **Standalone components** : tous `standalone: true`, pas de NgModule séparé.
- **Signal writeable** : `signal<T>()` non-readonly pour `.set()`.
- **`isNaN` guard sur les params numériques** : `Number(id)` retourne `NaN` sur URL non-numérique — toujours vérifier avec `isNaN` avant d'utiliser (patch appliqué en 5.3).
- **`type="button"` sur les boutons dans les templates** : toujours explicite pour éviter submit accidentel.

---

### Ce que cette story NE doit PAS faire

- **Pas d'appel backend au changement de convives** — recalcul 100% client.
- **Pas d'installation de librairie markdown** — affichage `<pre>` uniquement.
- **Pas de modification du backend** — `GET /api/recipes/:id` est complet.
- **Pas de bouton "Supprimer"** — c'est la story 5.5.
- **Pas de lien de partage public** — c'est l'épic 6.

---

## Project Structure Notes

**Fichiers à CRÉER :**
```
frontend/src/app/recipes/recipe-detail/
├── convives-steppper.component.ts       ← CRÉER (T1) — 3 'p' intentionnel
├── convives-steppper.component.html     ← CRÉER (T1)
├── convives-steppper.component.scss     ← CRÉER (T1)
├── recipe-detail.component.ts          ← CRÉER (T2)
├── recipe-detail.component.html        ← CRÉER (T2)
└── recipe-detail.component.scss        ← CRÉER (T2)
```

**Fichiers à MODIFIER :**
```
frontend/src/app/recipes/
└── recipes.routes.ts                   ← Ajouter route ':id' + supprimer commentaire (T3)
```

**Aucune migration TypeORM.** Aucun changement backend.

---

## Références

- `frontend/src/app/recipes/recipes.service.ts` — Interfaces `RecipeDetail`, `RecipeIngredientItem`, `RecipeStepItem` (déjà définies l.16–35) + méthode `getRecipe()` (l.87–89)
- `frontend/src/app/recipes/recipes.routes.ts` — Routes existantes à compléter
- `frontend/src/app/recipes/recipes.component.ts` — Pattern `ChangeDetectionStrategy.OnPush`, `signal`, `computed`, `takeUntilDestroyed`
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` — Pattern `inject(ActivatedRoute)`, `isNaN` guard, `takeUntilDestroyed`
- `backend/src/recipes/recipes.service.ts` — `findOne()` retourne `Recipe` avec `relations: ['ingredients', 'steps']` (déjà implémenté)
- `backend/src/recipes/recipe-ingredient.entity.ts` — `decimalTransformer` → `quantity` arrive en `number` côté frontend
- `_bmad-output/planning-artifacts/ux-design-Dashboard.md` — `ConvivesSteppper` (composant custom, distinct MatStepper), layout responsive détail recette, touch targets 48×48px

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage rencontré. `takeUntilDestroyed(this.destroyRef)` utilisé (inject DestroyRef) pour cohérence avec le pattern recipe-editor.component.ts.

### Completion Notes List

- T1 : `ConvivesSteppperComponent` (3 'p') créé standalone OnPush — attributs ARIA role/valuenow/valuemin, boutons 48×48px, EventEmitter valueChange
- T2 : `RecipeDetailComponent` créé standalone OnPush — signal/computed pour recalcul côté client, guard isNaN, redirect /recipes sur erreur 404, layout responsive grid (1 col mobile, 2 col ≥768px)
- T3 : Route `:id` insérée entre `new` et `:id/edit` dans recipes.routes.ts, commentaire supprimé
- Build Angular : succès (chunk recipe-detail-component visible)
- 127 tests unitaires passés, 0 régression

### File List

- `frontend/src/app/recipes/recipe-detail/convives-steppper.component.ts` (créé)
- `frontend/src/app/recipes/recipe-detail/convives-steppper.component.html` (créé)
- `frontend/src/app/recipes/recipe-detail/convives-steppper.component.scss` (créé)
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.ts` (créé)
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html` (créé)
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.scss` (créé)
- `frontend/src/app/recipes/recipes.routes.ts` (modifié)

### Change Log

- 2026-06-02 : Story créée — backend 100% réutilisé depuis 5.3, uniquement travail frontend (ConvivesSteppper + RecipeDetailComponent + route)
- 2026-06-02 : Implémentation complète — 7 fichiers frontend (6 créés, 1 modifié), 127 tests passés
