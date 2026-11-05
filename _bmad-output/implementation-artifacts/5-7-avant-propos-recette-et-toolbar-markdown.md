---
baseline_commit: b6e2f364cc7345c1d95739f64754e339db386257
---

# Story 5.7 : Avant-propos de recette et toolbar MarkdownLightEditor

**Épic :** 5 — Module Recettes  
**Statut :** done  
**Créée le :** 2026-06-11  

---

## User Story

En tant qu'utilisateur authentifié,  
Je veux pouvoir renseigner un avant-propos optionnel sur une recette avec mise en forme (gras / italique / souligné) et bénéficier d'une toolbar MarkdownLightEditor améliorée,  
Afin d'enrichir certaines recettes d'informations contextuelles (conseils, astuces, conditions de réussite) affichées en introduction.

---

## Critères d'acceptation

**AC1 — Champ avant-propos dans le formulaire**  
**Étant donné** que je suis sur `/recipes/new` ou `/recipes/:id/edit`,  
**Quand** le formulaire s'affiche,  
**Alors** une section "Avant-propos (optionnel)" est présente entre les champs Image URL et la section Ingrédients, contenant un `MarkdownLightEditor`

**AC2 — Champ non obligatoire**  
**Étant donné** que je laisse le champ avant-propos vide,  
**Quand** je soumets le formulaire (valide par ailleurs),  
**Alors** la recette est sauvegardée sans erreur — `avantPropos` est `null` en base

**AC3 — Toolbar 3 boutons**  
**Étant donné** que j'inspecte la toolbar d'un `MarkdownLightEditor`,  
**Quand** je la regarde,  
**Alors** elle affiche exactement 3 boutons : Gras (`**`), Italique (`*`), Souligné (`__`) — le bouton Code est absent

**AC4 — Syntaxe souligné**  
**Étant donné** que je sélectionne du texte dans un `MarkdownLightEditor` et clique Souligné,  
**Quand** j'inspecte la valeur,  
**Alors** le texte est entouré de `__` (ex. : `__texte sélectionné__`) — si aucune sélection, le curseur est positionné entre les deux `__`

**AC5 — Affichage conditionnel dans la vue détail**  
**Étant donné** qu'une recette a un avant-propos renseigné,  
**Quand** j'ouvre `/recipes/:id`,  
**Alors** la section avant-propos s'affiche entre l'image (le cas échéant) et le ConvivesSteppper, avec le contenu rendu en HTML (gras / italique / souligné)

**AC6 — Absence de section si champ vide**  
**Étant donné** qu'une recette n'a pas d'avant-propos (null ou chaîne vide),  
**Quand** j'ouvre `/recipes/:id`,  
**Alors** aucune section avant-propos n'est affichée — la page est identique à l'état actuel

**AC7 — Pré-remplissage en édition**  
**Étant donné** qu'une recette existante a un avant-propos,  
**Quand** j'ouvre `/recipes/:id/edit`,  
**Alors** le champ avant-propos est pré-rempli avec la valeur existante

**AC8 — Rendu souligné dans la vue détail**  
**Étant donné** qu'un avant-propos ou une étape contient `__texte__`,  
**Quand** la vue détail affiche ce contenu,  
**Alors** le texte est rendu en `<u>texte</u>` (souligné)

---

## Tâches / Sous-tâches

### T1 — Backend : entité + migration + DTO + service (AC: AC1, AC2, AC5, AC7)

- [x] Modifier `backend/src/recipes/recipe.entity.ts` :
  - [x] Ajouter `@Column({ type: 'text', nullable: true }) avantPropos!: string | null;` après le champ `title`
- [x] Générer la migration TypeORM (voir Dev Notes T1)
- [x] Modifier `backend/src/recipes/dto/create-recipe.dto.ts` :
  - [x] Ajouter `@IsOptional() @IsString() @ApiProperty({ required: false }) avantPropos?: string | null`
- [x] Modifier `backend/src/recipes/recipes.service.ts` :
  - [x] Dans `create()` : ajouter `avantPropos: dto.avantPropos ?? null` à la création de l'entité Recipe
  - [x] Dans `update()` : ajouter `...(dto.avantPropos !== undefined && { avantPropos: dto.avantPropos })` à l'objet `updateFields`

### T2 — Frontend : interfaces RecipesService (AC: AC1, AC5, AC7)

- [x] Modifier `frontend/src/app/recipes/recipes.service.ts` :
  - [x] Ajouter `avantPropos: string | null;` à l'interface `Recipe` (champ de base)
  - [x] Ajouter `avantPropos?: string | null;` à `CreateRecipePayload`
  - [x] Ajouter `avantPropos?: string | null;` à `UpdateRecipePayload`

### T3 — Frontend : toolbar MarkdownLightEditor (AC: AC3, AC4)

- [x] Modifier `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.html` :
  - [x] Supprimer le bouton Code (`` ` ``)
  - [x] Ajouter le bouton Souligné : `(click)="insertMarkdown('__')"`, icône `format_underlined`, tooltip `"Souligné (__)"` (voir Dev Notes T3)

### T4 — Frontend : pipe MarkdownLightPipe (AC: AC8)

- [x] Modifier `frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts` :
  - [x] Ajouter après la règle italic : `.replace(/__(.+?)__/g, '<u>$1</u>')` (voir Dev Notes T4)

### T5 — Frontend : RecipeEditorComponent (AC: AC1, AC2, AC7)

- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` :
  - [x] Ajouter `avantPropos: ['']` au FormGroup (sans validateur — champ optionnel)
  - [x] Dans `ngOnInit` patch : ajouter `avantPropos: recipe.avantPropos ?? ''`
  - [x] Dans `submit()` payload : ajouter `avantPropos: raw.avantPropos || null`
- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-editor.component.html` :
  - [x] Ajouter la section avant-propos entre le champ `imageUrl` et `<section class="section-ingredients">` (voir Dev Notes T5)

### T6 — Frontend : RecipeDetailComponent (AC: AC5, AC6, AC8)

- [x] Modifier `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html` :
  - [x] Ajouter le bloc conditionnel avant-propos entre `@if (recipe()!.imageUrl)` et `<section class="servings-section">` (voir Dev Notes T6)

### Review Findings

- [x] [Review][Patch] Nettoyer la migration — retirer les opérations DROP/CREATE INDEX sur `RecipeCategory` et ne garder que l'`ALTER TABLE Recipe ADD avantPropos text NULL` [backend/src/migrations/1781183421289-AddAvantProposToRecipe.ts]
- [x] [Review][Patch] Pas de `@MaxLength` sur `avantPropos` dans le DTO — champ texte sans borne supérieure [backend/src/recipes/dto/create-recipe.dto.ts]
- [x] [Review][Patch] `height: 28px` fixe sur `.ingredients-header` / `.steps-header` — fragile au zoom / font-size ; utiliser `min-height` [frontend/src/app/recipes/recipe-detail/recipe-detail.component.scss]
- [x] [Review][Patch] `avantPropos!` assertion non-nulle sur colonne `nullable: true` [backend/src/recipes/recipe.entity.ts]
- [x] [Review][Patch] Chaîne vide non normalisée en `null` côté backend — `create` utilise `?? null` (ne convertit pas `""`), `update` propage la valeur brute [backend/src/recipes/recipes.service.ts]
- [x] [Review][Patch] Classe CSS `.optional-hint` absente du SCSS de l'éditeur [frontend/src/app/recipes/recipe-editor/recipe-editor.component.scss]
- [x] [Review][Defer] XSS / `[innerHTML]` sans politique sanitizer explicite — pattern pré-existant pour les étapes ; Angular DomSanitizer mitigue [frontend/src/app/recipes/recipe-detail/recipe-detail.component.html] — deferred, pre-existing
- [x] [Review][Defer] Typo `convives-steppper` (double p) entérinée — pré-existant dans tous les fichiers concernés — deferred, pre-existing
- [x] [Review][Defer] `UpdateRecipePayload` déclarée deux fois dans `recipes.service.ts` — pré-existant [frontend/src/app/recipes/recipes.service.ts] — deferred, pre-existing
- [x] [Review][Defer] Aucune couverture de test backend pour `avantPropos` (create / update / null-clearing) — hors scope story — deferred, pre-existing
- [x] [Review][Defer] `.avant-propos-section` sans traitement typographique ni visuel — raffinement UX [frontend/src/app/recipes/recipe-detail/recipe-detail.component.scss] — deferred, pre-existing
- [x] [Review][Defer] Regex `/__(.+?)__/g` ne bloque pas `_____` (5 underscores) — cas limite mineur ; spec `____` (4) est respectée [frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts] — deferred, pre-existing

---

## Dev Notes

### T1 — Entité Recipe

**Ajout de la colonne dans `recipe.entity.ts` :**

```typescript
@Column({ type: 'varchar', length: 255 })
title!: string;

@Column({ type: 'text', nullable: true })   // ← NOUVEAU
avantPropos!: string | null;               // ← NOUVEAU

@Column({ type: 'int' })
categoryId!: number;
```

> **`type: 'text'`** — pas de `length` sur un TEXT en MySQL/MariaDB. Le champ est nullable car optionnel.

**Génération de la migration :**

```bash
cd backend
npx typeorm-ts-node-commonjs migration:generate src/migrations/AddAvantProposToRecipe -d src/data-source.ts
```

Vérifier que la migration générée contient :
```sql
ALTER TABLE `Recipe` ADD `avantPropos` text NULL;
```

Exécuter la migration :
```bash
npx typeorm-ts-node-commonjs migration:run -d src/data-source.ts
```

> **Pattern** : identique aux migrations de story 5.1. Le fichier `data-source.ts` est déjà configuré dans le projet.

**Ajout dans `create-recipe.dto.ts` :**

```typescript
@IsOptional()
@IsString()
@ApiProperty({ required: false, description: 'Avant-propos optionnel de la recette' })
avantPropos?: string | null;
```

> Placer après le champ `title`. `@IsOptional()` + absence de `@IsNotEmpty()` permet à la valeur d'être `undefined`, `null`, ou `''`.

**Mise à jour de `recipes.service.ts` :**

Dans `create()` — objet de création Recipe :
```typescript
const recipe = manager.create(Recipe, {
  title: dto.title,
  avantPropos: dto.avantPropos ?? null,   // ← NOUVEAU
  categoryId,
  servings: dto.servings ?? 4,
  imageUrl: dto.imageUrl ?? null,
  userId,
});
```

Dans `update()` — objet `updateFields` :
```typescript
const updateFields: Partial<Recipe> = {
  ...(dto.title !== undefined && { title: dto.title }),
  ...(dto.avantPropos !== undefined && { avantPropos: dto.avantPropos }),  // ← NOUVEAU
  ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
};
```

---

### T2 — Interfaces frontend

**`recipes.service.ts` — interface `Recipe` (base) :**

```typescript
export interface Recipe {
  id: number;
  title: string;
  avantPropos: string | null;   // ← NOUVEAU
  category: RecipeCategory | null;
  servings: number;
  imageUrl: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}
```

> `RecipeDetail extends Recipe` hérite automatiquement du champ — pas de modification sur `RecipeDetail`.

**`CreateRecipePayload` :**

```typescript
export interface CreateRecipePayload {
  title: string;
  avantPropos?: string | null;   // ← NOUVEAU
  categoryName?: string | null;
  servings?: number;
  imageUrl?: string | null;
  ingredients: IngredientPayload[];
  steps: StepPayload[];
}
```

**`UpdateRecipePayload` :**

```typescript
export interface UpdateRecipePayload {
  title?: string;
  avantPropos?: string | null;   // ← NOUVEAU
  categoryName?: string | null;
  servings?: number;
  imageUrl?: string | null;
  ingredients?: IngredientPayload[];
  steps?: StepPayload[];
}
```

---

### T3 — Toolbar MarkdownLightEditor

**Template HTML — remplacement :**

```html
<!-- SUPPRIMER ce bouton : -->
<button
  type="button"
  mat-icon-button
  matTooltip="Code (`)"
  (click)="insertMarkdown('`')"
  [disabled]="isDisabled()"
>
  <mat-icon>code</mat-icon>
</button>

<!-- AJOUTER à la place (après le bouton Italique) : -->
<button
  type="button"
  mat-icon-button
  matTooltip="Souligné (__)"
  (click)="insertMarkdown('__')"
  [disabled]="isDisabled()"
>
  <mat-icon>format_underlined</mat-icon>
</button>
```

> **`format_underlined`** est un icône Material Icons standard — pas d'import supplémentaire.

> **`insertMarkdown('__')`** : avec une sélection → `__texte sélectionné__` ; sans sélection → `____` avec curseur positionné entre les deux `__`. Le comportement est identique à Gras/Italique — aucune modification de `insertMarkdown` nécessaire.

---

### T4 — MarkdownLightPipe

**Ajout de la règle souligné :**

```typescript
transform(value: string | null | undefined): string {
  if (!value) return '';
  return (
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/__(.+?)__/g, '<u>$1</u>')     // ← NOUVEAU — après italic
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
  );
}
```

> **Ordre des règles** : bold → italic → underline → code. L'underline (`__`) ne crée pas de collision avec bold (`**`) ni italic (`*`). La règle `code` est maintenue pour la rétrocompatibilité avec les données existantes même si le bouton est supprimé.

> **Regex `/__(.+?)__/g`** : non-greedy, matche `__texte__` ; le `.+?` permet les espaces et caractères accentués. Ne matche pas `____` (deux underscores accolés sans contenu).

---

### T5 — RecipeEditorComponent

**TypeScript — FormGroup :**

```typescript
readonly form = this.fb.nonNullable.group({
  title: ['', [Validators.required, Validators.maxLength(255)]],
  category: ['', [Validators.required, Validators.maxLength(100)]],
  servings: [4, [Validators.required, Validators.min(1)]],
  imageUrl: [''],
  avantPropos: [''],   // ← NOUVEAU — pas de validateur (optionnel)
  ingredients: this.fb.array<FormGroup>([]),
  steps: this.fb.array<FormGroup>([]),
});
```

**TypeScript — `ngOnInit` patch (mode édition) :**

```typescript
this.form.patchValue({
  title: recipe.title,
  category: recipe.category?.name ?? '',
  servings: recipe.servings,
  imageUrl: recipe.imageUrl ?? '',
  avantPropos: recipe.avantPropos ?? '',   // ← NOUVEAU
});
```

**TypeScript — `submit()` payload :**

```typescript
const payload: CreateRecipePayload = {
  title: raw.title,
  avantPropos: raw.avantPropos || null,   // ← NOUVEAU — '' → null
  categoryName: raw.category || null,
  servings: raw.servings,
  imageUrl: raw.imageUrl || null,
  ingredients: raw.ingredients.map((ing: any, i: number) => ({
    quantity: Number(ing.quantity),
    unit: ing.unit || null,
    name: ing.name,
    position: i,
  })),
  steps: raw.steps.map((s: any, i: number) => ({ content: s.content, position: i })),
};
```

> **`raw.avantPropos || null`** : convertit la chaîne vide `''` en `null` — cohérent avec `imageUrl`. Ne pas envoyer `''` en base pour un champ qui doit être null si absent.

**HTML — section avant-propos (à insérer entre `</mat-form-field>` imageUrl et `<section class="section-ingredients">`) :**

```html
<section class="section-avant-propos" aria-label="Avant-propos">
  <h2 class="section-title">
    Avant-propos
    <span class="optional-hint">(optionnel)</span>
  </h2>
  <app-markdown-light-editor
    formControlName="avantPropos"
    placeholder="Conseils, astuces, informations générales sur cette recette…">
  </app-markdown-light-editor>
</section>
```

> **`formControlName="avantPropos"`** : contrôle direct sur le FormGroup parent — pas de `[formControl]` nécessaire ici (pas un FormArray item).

> **`placeholder`** : l'`@Input() placeholder` du composant accepte une valeur string directe sans binding.

---

### T6 — RecipeDetailComponent

**HTML — bloc conditionnel (à insérer entre `@if (recipe()!.imageUrl)` et `<section class="servings-section">`) :**

```html
@if (recipe()!.avantPropos) {
  <section class="avant-propos-section" aria-label="Avant-propos">
    <div
      class="avant-propos-content"
      [innerHTML]="recipe()!.avantPropos | markdownLight"
    ></div>
  </section>
}
```

> **`@if (recipe()!.avantPropos)`** : falsy check — couvre à la fois `null` et `''`. Pas de section affichée si le champ est absent ou vide.

> **`MarkdownLightPipe`** : déjà importé dans `RecipeDetailComponent` (utilisé pour les étapes) — pas d'import supplémentaire nécessaire.

> **Positionnement** : entre l'image et le ConvivesSteppper. L'avant-propos est lu avant de commencer à cuisiner, il précède donc les informations quantitatives (convives).

---

## Project Structure Notes

**Fichiers à MODIFIER :**

```
backend/src/recipes/
├── recipe.entity.ts                          ← Ajouter avantPropos (T1)
├── dto/
│   └── create-recipe.dto.ts                  ← Ajouter avantPropos optionnel (T1)
└── recipes.service.ts                        ← create() + update() (T1)

backend/src/migrations/
└── YYYYMMDDHHMMSS-AddAvantProposToRecipe.ts  ← GÉNÉRER (T1)

frontend/src/app/recipes/
├── recipes.service.ts                        ← Interfaces (T2)
├── recipe-detail/
│   ├── markdown-light.pipe.ts                ← Règle souligné (T4)
│   └── recipe-detail.component.html          ← Bloc conditionnel (T6)
└── recipe-editor/
    ├── markdown-light-editor.component.html  ← Toolbar (T3)
    ├── recipe-editor.component.ts            ← FormGroup + submit (T5)
    └── recipe-editor.component.html          ← Section avant-propos (T5)
```

**Aucun nouveau fichier à créer** (hors migration générée automatiquement).

---

## Références

- `backend/src/recipes/recipe.entity.ts` — Structure actuelle de l'entité Recipe
- `backend/src/recipes/dto/create-recipe.dto.ts` — Pattern @IsOptional + @IsString existant
- `backend/src/recipes/recipes.service.ts` — Pattern `create()` et `update()` avec `updateFields`
- `frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts` — Pipe existant à étendre
- `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.html` — Toolbar actuelle
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` — FormGroup actuel
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.html` — Template actuel
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html` — Template actuel
- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-11.md` — Proposal associé

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- T1 : Entité Recipe enrichie du champ `avantPropos TEXT NULL`. Migration TypeORM générée (`1781183421289-AddAvantProposToRecipe`) et exécutée avec succès. DTO `CreateRecipeDto` et service `RecipesService` (`create()` + `update()`) mis à jour. 159 tests backend passent.
- T2 : Interfaces frontend `Recipe`, `CreateRecipePayload`, `UpdateRecipePayload` enrichies de `avantPropos`. Mock de test `recipes.service.spec.ts` mis à jour pour inclure le nouveau champ.
- T3 : Bouton Code supprimé de la toolbar `MarkdownLightEditor`. Bouton Souligné (`__`, icône `format_underlined`) ajouté à la place.
- T4 : Règle `/__(.+?)__/g → <u>$1</u>` ajoutée dans `MarkdownLightPipe` après la règle italic.
- T5 : `RecipeEditorComponent` — champ `avantPropos: ['']` ajouté au FormGroup, pré-remplissage en édition, payload `avantPropos: raw.avantPropos || null`. Section HTML insérée entre imageUrl et section-ingredients.
- T6 : Bloc `@if (recipe()!.avantPropos)` ajouté dans `recipe-detail.component.html` entre l'image et le ConvivesSteppper. 127 tests frontend passent.

### File List

- backend/src/recipes/recipe.entity.ts
- backend/src/recipes/dto/create-recipe.dto.ts
- backend/src/recipes/recipes.service.ts
- backend/src/migrations/1781183421289-AddAvantProposToRecipe.ts
- frontend/src/app/recipes/recipes.service.ts
- frontend/src/app/recipes/recipes.service.spec.ts
- frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.html
- frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts
- frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts
- frontend/src/app/recipes/recipe-editor/recipe-editor.component.html
- frontend/src/app/recipes/recipe-detail/recipe-detail.component.html

### Change Log

- 2026-06-11 : Création de la story suite au sprint-change-proposal-2026-06-11
- 2026-06-11 : Implémentation complète — avant-propos recette (champ BDD, API, formulaire, vue détail) + toolbar MarkdownLightEditor (bouton Souligné remplace Code) + pipe souligné
