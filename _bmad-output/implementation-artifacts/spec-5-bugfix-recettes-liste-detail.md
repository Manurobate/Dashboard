---
title: 'Bugfix & UX recettes — détail, liste, éditeur'
type: 'bugfix'
created: '2026-06-03'
status: 'done'
route: 'one-shot'
---

## Intent

**Problem:** Plusieurs bugs bloquants sur le module recettes (Epic 5) découverts en test : page détail vide même avec des données, boutons liste inopérants, formatage markdown non rendu, locale française absente, doubles astérisques dans les labels required, et manque de confort dans l'éditeur.

**Approach:** Corrections ciblées couche par couche : backend (TypeORM), frontend service/template, éditeur, config app.

---

## Décisions techniques — NE PAS RÉVERTIR

### 1. TypeORM — suppression de `order` sur les relations OneToMany

**Fichier :** `backend/src/recipes/recipes.service.ts` — méthodes `findOne`, `create`, `update`

**Avant :**
```typescript
const recipe = await this.repo.findOne({
  where: { id, userId },
  relations: ['ingredients', 'steps'],
  order: { ingredients: { position: 'ASC' }, steps: { position: 'ASC' } },
});
```

**Après :**
```typescript
const recipe = await this.repo.findOne({
  where: { id, userId },
  relations: ['ingredients', 'steps'],
});
recipe.ingredients = (recipe.ingredients ?? []).slice().sort((a, b) => a.position - b.position);
recipe.steps = (recipe.steps ?? []).slice().sort((a, b) => a.position - b.position);
```

**Pourquoi :** TypeORM 0.3.x avec `order` sur des relations OneToMany provoque un bug d'hydratation — les tableaux `ingredients` et `steps` reviennent `undefined` au lieu d'arrays vides/peuplés. Le tri est fait en JS avec `slice().sort()` (non-mutant, pour ne pas corrompre le cache d'identité TypeORM).

**Ne pas remettre** `order: { ingredients: ..., steps: ... }` dans les options `findOne()` pour les relations OneToMany.

---

### 2. Frontend — null safety dans `computedIngredients` et condition steps

**Fichier :** `frontend/src/app/recipes/recipe-detail/recipe-detail.component.ts`

```typescript
return (recipe.ingredients ?? []).map((ing) => ({ ... }));
```

**Fichier :** `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html`

```html
@if ((recipe()!.steps ?? []).length === 0) {
```

**Pourquoi :** Filet de sécurité défensif. Si `recipe.ingredients` ou `recipe.steps` revient `undefined` (bug TypeORM ci-dessus ou future régression), l'exception silencieuse dans le template Angular empêche le rendu de TOUTE la section — ni les items, ni le message vide. Le `?? []` garantit qu'au minimum le message "Aucun ingrédient renseigné." s'affiche.

---

### 3. Locale française — obligatoire pour le pipe `number`

**Fichier :** `frontend/src/app/app.config.ts`

```typescript
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr, 'fr');

// Dans providers :
{ provide: LOCALE_ID, useValue: 'fr' }
```

**Pourquoi :** Le template de détail utilise `{{ ing.quantity | number: '1.0-2' : 'fr' }}`. Sans `registerLocaleData`, Angular lève `"Missing locale data for the locale 'fr'"` — exception silencieuse en template qui empêche le rendu de chaque `<li>` ingrédient. La page paraît vide même avec des données. `LOCALE_ID = 'fr'` définit le français comme locale par défaut pour tous les pipes de l'app (dates, nombres, devises).

**Ne pas supprimer** `registerLocaleData` ni le provider `LOCALE_ID`.

---

### 4. Rendu markdown dans les étapes

**Fichier nouveau :** `frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts`

**Syntaxes supportées** (alignées avec les boutons du `MarkdownLightEditorComponent`) :
- `**texte**` → `<strong>texte</strong>`
- `*texte*` → `<em>texte</em>`
- `` `code` `` → `<code>code</code>`

**Sécurité :** les caractères `&`, `<`, `>` sont échappés avant application des regex. Angular sanitise l'output via `[innerHTML]` (pas de `bypassSecurityTrustHtml`).

**Fichier :** `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html`

```html
<!-- Avant -->
<pre class="step-content">{{ step.content }}</pre>

<!-- Après -->
<div class="step-content" [innerHTML]="step.content | markdownLight"></div>
```

Le CSS `.step-content` conserve `white-space: pre-wrap` — les retours à la ligne sont préservés sans avoir besoin de convertir `\n` en `<br>`.

---

### 5. `<a>` → `<div [routerLink]>` dans la liste des recettes

**Fichier :** `frontend/src/app/recipes/recipes.component.html`

**Pourquoi :** Les `<button>` imbriqués dans un `<a [routerLink]>` ont un comportement imprévisible — le routerLink du `<a>` gagne sur `stopPropagation()` des boutons enfants (les deux navigations se déclenchent, la dernière l'emporte). Un `<div [routerLink]>` utilise uniquement `@HostListener('click')` et respecte fiablement `stopPropagation()`.

`tabindex="0"` et `role="link"` restaurent l'accessibilité clavier. `(keydown.enter)="navigateToRecipe(id)"` active la navigation au clavier.

**Ne pas remettre** les boutons Modifier/Supprimer dans la liste — ils sont déplacés dans la page détail par choix UX.

---

### 6. Boutons Modifier/Supprimer — uniquement dans le détail

**Décision UX :** Les actions Modifier et Supprimer sont accessibles uniquement depuis `recipe-detail.component`. La liste est une vue de navigation pure.

`onDeleteRecipe`, `MatDialog`, `MatSnackBar`, `ConfirmDialogComponent` ont été retirés de `RecipesComponent`.

---

### 7. Recherche sur titre uniquement

**Fichier :** `frontend/src/app/recipes/recipes.component.ts`

```typescript
// Avant
r.title.toLowerCase().includes(term) || (r.category ?? '').toLowerCase().includes(term)

// Après
r.title.toLowerCase().includes(term)
```

**Décision produit :** La recherche filtre sur le titre uniquement. La catégorie est visible via les panneaux d'accordéon, pas dans le champ de recherche.

---

### 8. Éditeur — pré-remplissage à la création

**Fichier :** `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts`

À la création (mode non-édition), le formulaire démarre avec 3 lignes d'ingrédients et 1 étape vides. **Ne pas supprimer** — évite au user de cliquer sur "Ajouter un ingrédient" trois fois à chaque nouvelle recette.

---

### 9. Éditeur — labels required sans astérisque manuel

**Fichiers :** `recipe-editor.component.html`, `recipe-ingredient-row.component.html`

`<mat-label>Titre *</mat-label>` → `<mat-label>Titre</mat-label>` (idem pour "Ingrédient").

Angular Material ajoute automatiquement `*` sur les champs liés à un `Validators.required`. Le `*` manuel dans le label provoquait un doublon `**`.

---

### 10. Champ quantité — step et min

**Fichier :** `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html`

- `step="0.1"` → `step="1"` : incrément de 1 en 1 via les flèches du navigateur
- `min="0.001"` → `min="1"` : le champ vide + clic incrément part de 1 (pas du min 0.001). Le form a `novalidate` donc pas d'erreur HTML native. Le validator Angular `Validators.min(0.001)` reste actif pour la validation à la soumission. La saisie manuelle de décimales (0.5, 1.5…) reste possible.

---

## Fichiers modifiés

| Fichier | Nature |
|---------|--------|
| `backend/src/recipes/recipes.service.ts` | Bug TypeORM order + tri JS |
| `frontend/src/app/app.config.ts` | Locale française |
| `frontend/src/app/recipes/recipe-detail/recipe-detail.component.ts` | Null safety + import pipe |
| `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html` | Null safety + markdown |
| `frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts` | **Nouveau** — pipe markdown |
| `frontend/src/app/recipes/recipes.component.ts` | Simplification, suppression dialog/snack |
| `frontend/src/app/recipes/recipes.component.html` | div routerLink, bouton ajout, sans actions |
| `frontend/src/app/recipes/recipes.component.scss` | .page-actions |
| `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` | Pré-remplissage création |
| `frontend/src/app/recipes/recipe-editor/recipe-editor.component.html` | Label sans * |
| `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html` | Label sans *, step=1, min=1 |
