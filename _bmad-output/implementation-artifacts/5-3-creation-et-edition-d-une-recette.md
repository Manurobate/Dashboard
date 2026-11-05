---
baseline_commit: cc7459868e6a6a377cc64a486f2c267ba91326b8
---

# Story 5.3 : Création et édition d'une recette

**Épic :** 5 — Module Recettes  
**Statut :** ready-for-dev  
**Créée le :** 2026-06-02

---

## User Story

En tant qu'utilisateur authentifié,  
Je veux créer et modifier une recette avec titre, catégorie, ingrédients structurés et étapes formatées,  
Afin de sauvegarder mes recettes de façon organisée et réutilisable.

---

## Critères d'acceptation

**AC1 — Formulaire création**  
**Étant donné** que je clique "Ajouter une recette" (liste ou état vide),  
**Quand** j'arrive sur `/recipes/new`,  
**Alors** un formulaire s'affiche avec : champ titre (obligatoire), sélecteur catégorie (optionnel), nombre de convives (défaut 4), section ingrédients dynamique (`FormArray` de `RecipeIngredientRow`), section étapes dynamique (`MarkdownLightEditor`)

**AC2 — Ajout d'ingrédient**  
**Étant donné** que je suis dans le formulaire,  
**Quand** je clique "Ajouter un ingrédient",  
**Alors** une nouvelle ligne `RecipeIngredientRow` apparaît (champs : quantité, unité, nom) avec bouton supprimer

**AC3 — Drag & drop**  
**Étant donné** que je glisse-dépose un ingrédient ou une étape,  
**Quand** le drag & drop Angular CDK se termine,  
**Alors** l'ordre est mis à jour visuellement et reflété dans le `FormArray`

**AC4 — Soumission création**  
**Étant donné** que je soumets le formulaire valide,  
**Quand** `POST /api/recipes` est appelé avec ingrédients et étapes,  
**Alors** la recette est créée avec ses ingrédients et étapes, je suis redirigé vers `/recipes/:id`, snackbar "Recette créée"

**AC5 — Formulaire édition**  
**Étant donné** que j'accède à `/recipes/:id/edit`,  
**Quand** le formulaire charge,  
**Alors** tous les champs sont pré-remplis avec les données existantes (titre, catégorie, convives, ingrédients, étapes)

**AC6 — Soumission édition**  
**Étant donné** que je modifie une recette existante et soumets le formulaire,  
**Quand** `PATCH /api/recipes/:id` est appelé,  
**Alors** la recette est mise à jour (ingrédients et étapes remplacés intégralement), je suis redirigé vers `/recipes/:id`, snackbar "Recette modifiée"

---

## Tâches / Sous-tâches

### T1 — Backend : Mise à jour create-recipe.dto.ts (AC: AC4)

- [x] Modifier `backend/src/recipes/dto/create-recipe.dto.ts` :
  - [x] Ajouter import `IsArray, ValidateNested` (class-validator) + `Type` (class-transformer)
  - [x] Ajouter import `CreateRecipeIngredientDto` et `CreateRecipeStepDto`
  - [x] Ajouter champ `@IsArray() @IsOptional() @ValidateNested({each: true}) @Type(() => CreateRecipeIngredientDto) ingredients?: CreateRecipeIngredientDto[]`
  - [x] Ajouter champ `@IsArray() @IsOptional() @ValidateNested({each: true}) @Type(() => CreateRecipeStepDto) steps?: CreateRecipeStepDto[]`
- [x] Vérifier que `UpdateRecipeDto` (qui étend `PartialType(CreateRecipeDto)`) hérite automatiquement des nouveaux champs — **pas de modification nécessaire**

### T2 — Backend : RecipesService — findOne, create, update (AC: AC4, AC5, AC6)

- [x] Modifier `backend/src/recipes/recipes.service.ts` :
  - [x] Injecter `@InjectDataSource() private readonly dataSource: DataSource` (pattern `LinksService`)
  - [x] Ajouter `readonly logger = new Logger(RecipesService.name)`
  - [x] Ajouter `findOne(userId: number, id: number): Promise<Recipe>` (voir Dev Notes T2)
  - [x] Ajouter `create(userId: number, dto: CreateRecipeDto): Promise<Recipe>` — transaction (voir Dev Notes T2)
  - [x] Ajouter `update(userId: number, id: number, dto: UpdateRecipeDto): Promise<Recipe>` — transaction replace-all (voir Dev Notes T2)
- [x] Modifier `backend/src/recipes/recipes.service.spec.ts` : ajouter tests pour `findOne`, `create`, `update` (voir Dev Notes T2)

### T3 — Backend : RecipesController — GET /:id, POST, PATCH /:id (AC: AC4, AC5, AC6)

- [x] Modifier `backend/src/recipes/recipes.controller.ts` :
  - [x] Ajouter imports : `Post, Patch, Body, Param, ParseIntPipe, HttpCode, HttpStatus, NotFoundException`
  - [x] Ajouter `UpdateRecipeDto`, `CreateRecipeDto` en imports
  - [x] Ajouter `@Get(':id')` → `findOne(@CurrentUser() user, @Param('id', ParseIntPipe) id)` → `this.recipesService.findOne(user.id, id)`
  - [x] Ajouter `@Post()` `@HttpCode(HttpStatus.CREATED)` → `create(@CurrentUser() user, @Body() dto: CreateRecipeDto)` → `this.recipesService.create(user.id, dto)`
  - [x] Ajouter `@Patch(':id')` → `update(@CurrentUser() user, @Param('id', ParseIntPipe) id, @Body() dto: UpdateRecipeDto)` → `this.recipesService.update(user.id, id, dto)`
- [x] Modifier `backend/src/recipes/recipes.controller.spec.ts` : ajouter tests pour les 3 nouveaux endpoints (voir Dev Notes T3)

### T4 — Backend : RecipesModule — enregistrer RecipeIngredient et RecipeStep repos (AC: AC4)

- [x] Vérifier que `backend/src/recipes/recipes.module.ts` a bien `TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])` — **déjà fait en story 5.1, pas de modification si c'est le cas**

### T5 — Frontend : Mise à jour RecipesService — interfaces + méthodes CRUD (AC: AC4, AC5, AC6)

- [x] Modifier `frontend/src/app/recipes/recipes.service.ts` :
  - [x] Ajouter interfaces `RecipeIngredientItem`, `RecipeStepItem`, `RecipeDetail extends Recipe` (voir Dev Notes T5)
  - [x] Ajouter interfaces `CreateRecipePayload`, `UpdateRecipePayload` (voir Dev Notes T5)
  - [x] Ajouter `getRecipe(id: number): Observable<RecipeDetail>` : `GET /api/recipes/:id`
  - [x] Ajouter `createRecipe(dto: CreateRecipePayload): Observable<RecipeDetail>` : `POST /api/recipes`
  - [x] Ajouter `updateRecipe(id: number, dto: UpdateRecipePayload): Observable<RecipeDetail>` : `PATCH /api/recipes/:id`
  - [x] Mettre à jour signal `recipes` après create (`this.recipes.update(r => [...r, created])`) et update (`this.recipes.update(r => r.map(x => x.id === id ? {...x, ...updated} : x))`)
- [x] Modifier `frontend/src/app/recipes/recipes.service.spec.ts` : ajouter tests pour `getRecipe`, `createRecipe`, `updateRecipe`

### T6 — Frontend : MarkdownLightEditorComponent (AC: AC1, AC2, AC5)

- [x] Créer `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.ts` :
  - [x] Standalone, `ChangeDetectionStrategy.OnPush`
  - [x] Implémente `ControlValueAccessor` (forwardRef NG_VALUE_ACCESSOR)
  - [x] Entrée : `@Input() placeholder = 'Décrivez cette étape...'`
  - [x] Interne : signal `value = signal('')`, méthodes `onChange/onTouched` standard
  - [x] Toolbar minimale : boutons Gras, Italique, Code (insèrent syntaxe markdown au curseur via `insertText` — voir Dev Notes T6)
  - [x] `writeValue`, `registerOnChange`, `registerOnTouched`, `setDisabledState` standard
- [x] Créer `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.html` (voir Dev Notes T6)
- [x] Créer `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.scss`

### T7 — Frontend : RecipeIngredientRowComponent (AC: AC2, AC3)

- [x] Créer `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.ts` :
  - [x] Standalone, `ChangeDetectionStrategy.OnPush`
  - [x] `@Input({ required: true }) formGroup!: FormGroup`
  - [x] `@Output() deleteRow = new EventEmitter<void>()`
  - [x] Importer `DragDropModule`, `MatFormFieldModule`, `MatInputModule`, `MatIconModule`, `MatButtonModule`, `ReactiveFormsModule`
- [x] Créer `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html` (voir Dev Notes T7)
- [x] Créer `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.scss`

### T8 — Frontend : RecipeEditorComponent — formulaire complet (AC: AC1–AC6)

- [x] Créer `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` :
  - [x] Standalone, `ChangeDetectionStrategy.OnPush`, inject `FormBuilder`, `Router`, `ActivatedRoute`, `RecipesService`, `MatSnackBar`
  - [x] Mode detect : `recipeId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null` — null = création
  - [x] `isEditMode = signal(this.recipeId !== null)`, `isSubmitting = signal(false)`
  - [x] FormGroup avec FormArray ingrédients et étapes (voir Dev Notes T8)
  - [x] `ngOnInit` : si edit mode → `loadRecipeForEdit()` → patch form
  - [x] Méthodes helper : `addIngredient()`, `removeIngredient(i)`, `addStep()`, `removeStep(i)`
  - [x] Drag & drop : `dropIngredient(event: CdkDragDrop<AbstractControl[]>)` et `dropStep(...)` avec `moveItemInArray`
  - [x] `submit()` : construit payload, appelle create ou update, navigue vers `/recipes/:id`, snackbar
  - [x] Imports Material + CDK : `DragDropModule`, `MatFormFieldModule`, `MatInputModule`, `MatSelectModule`, `MatButtonModule`, `MatIconModule`, `MatSnackBarModule`, `ReactiveFormsModule`
- [x] Créer `frontend/src/app/recipes/recipe-editor/recipe-editor.component.html` (voir Dev Notes T8)
- [x] Créer `frontend/src/app/recipes/recipe-editor/recipe-editor.component.scss`

### T9 — Frontend : Routes (AC: AC1, AC5)

- [x] Modifier `frontend/src/app/recipes/recipes.routes.ts` :
  - [x] Ajouter `{ path: 'new', loadComponent: () => import('./recipe-editor/recipe-editor.component').then(m => m.RecipeEditorComponent) }`
  - [x] Ajouter `{ path: ':id/edit', loadComponent: () => import('./recipe-editor/recipe-editor.component').then(m => m.RecipeEditorComponent) }`

### T10 — Frontend : Bouton Éditer depuis la liste (AC: AC5)

- [x] Modifier `frontend/src/app/recipes/recipes.component.html` :
  - [x] Sur chaque `recipe-item`, ajouter un bouton icône `edit` (visible en mode édition ou au hover) avec `[routerLink]="['/recipes', recipe.id, 'edit']"`

---

## Dev Notes

### T1 — Mise à jour create-recipe.dto.ts

**Ajout des champs imbriqués avec validation de type :**

```typescript
import {
  IsString, IsNotEmpty, MaxLength, IsOptional, IsInt, IsUrl, Min,
  IsArray, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateRecipeIngredientDto } from './create-recipe-ingredient.dto';
import { CreateRecipeStepDto } from './create-recipe-step.dto';

export class CreateRecipeDto {
  // ... champs existants inchangés ...

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  @ApiProperty({ type: [CreateRecipeIngredientDto], required: false })
  ingredients?: CreateRecipeIngredientDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  @ApiProperty({ type: [CreateRecipeStepDto], required: false })
  steps?: CreateRecipeStepDto[];
}
```

> **`UpdateRecipeDto` (PartialType)** : hérite automatiquement des nouveaux champs — pas de modification. Tous les champs deviennent optionnels automatiquement.

> **`class-transformer` est déjà installé** dans le projet (utilisé dans `create-link.dto.ts` avec `@Transform`). La `ValidationPipe` globale utilise `transform: true` — les types imbriqués sont traités automatiquement.

---

### T2 — RecipesService backend

**Injection complète (DataSource + 3 repos) :**

```typescript
import {
  Injectable, NotFoundException, Logger,
} from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Recipe } from './recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  readonly logger = new Logger(RecipesService.name);

  constructor(
    @InjectRepository(Recipe) private readonly repo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient) private readonly ingredientRepo: Repository<RecipeIngredient>,
    @InjectRepository(RecipeStep) private readonly stepRepo: Repository<RecipeStep>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  findAll(userId: number): Promise<Recipe[]> { /* ... inchangé ... */ }

  async findOne(userId: number, id: number): Promise<Recipe> {
    const recipe = await this.repo.findOne({
      where: { id, userId },
      relations: ['ingredients', 'steps'],
      order: { ingredients: { position: 'ASC' }, steps: { position: 'ASC' } },
    });
    if (!recipe) throw new NotFoundException(`Recette ${id} introuvable`);
    return recipe;
  }

  async create(userId: number, dto: CreateRecipeDto): Promise<Recipe> {
    return this.dataSource.transaction(async (manager) => {
      const recipe = manager.create(Recipe, {
        title: dto.title,
        category: dto.category ?? null,
        servings: dto.servings ?? 4,
        imageUrl: dto.imageUrl ?? null,
        userId,
      });
      const saved = await manager.save(recipe);

      if (dto.ingredients?.length) {
        const ings = dto.ingredients.map((ing, i) =>
          manager.create(RecipeIngredient, { ...ing, position: ing.position ?? i, recipeId: saved.id }),
        );
        await manager.save(RecipeIngredient, ings);
      }

      if (dto.steps?.length) {
        const steps = dto.steps.map((s, i) =>
          manager.create(RecipeStep, { ...s, position: s.position ?? i, recipeId: saved.id }),
        );
        await manager.save(RecipeStep, steps);
      }

      this.logger.log(`Recette ${saved.id} créée pour userId=${userId}`);
      return manager.findOne(Recipe, {
        where: { id: saved.id },
        relations: ['ingredients', 'steps'],
        order: { ingredients: { position: 'ASC' }, steps: { position: 'ASC' } },
      }) as Promise<Recipe>;
    });
  }

  async update(userId: number, id: number, dto: UpdateRecipeDto): Promise<Recipe> {
    return this.dataSource.transaction(async (manager) => {
      const recipe = await manager.findOne(Recipe, { where: { id, userId } });
      if (!recipe) throw new NotFoundException(`Recette ${id} introuvable`);

      Object.assign(recipe, {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.servings !== undefined && { servings: dto.servings }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      });
      await manager.save(recipe);

      // Remplacement intégral ingrédients
      if (dto.ingredients !== undefined) {
        await manager.delete(RecipeIngredient, { recipeId: id });
        if (dto.ingredients.length) {
          const ings = dto.ingredients.map((ing, i) =>
            manager.create(RecipeIngredient, { ...ing, position: ing.position ?? i, recipeId: id }),
          );
          await manager.save(RecipeIngredient, ings);
        }
      }

      // Remplacement intégral étapes
      if (dto.steps !== undefined) {
        await manager.delete(RecipeStep, { recipeId: id });
        if (dto.steps.length) {
          const steps = dto.steps.map((s, i) =>
            manager.create(RecipeStep, { ...s, position: s.position ?? i, recipeId: id }),
          );
          await manager.save(RecipeStep, steps);
        }
      }

      this.logger.log(`Recette ${id} mise à jour pour userId=${userId}`);
      return manager.findOne(Recipe, {
        where: { id },
        relations: ['ingredients', 'steps'],
        order: { ingredients: { position: 'ASC' }, steps: { position: 'ASC' } },
      }) as Promise<Recipe>;
    });
  }
}
```

> **Isolation userId sur `findOne` et `update`** : toujours `where: { id, userId }` — violation 403 si la recette appartient à un autre utilisateur.

> **Pas de cascade insert** : `Recipe.ingredients` a `cascade: ['remove']` seulement. L'insertion des relations se fait manuellement en transaction via `manager.save(RecipeIngredient, [...])`.

> **`manager.delete(RecipeIngredient, { recipeId: id })`** : supprime toutes les lignes par FK — ne déclenche pas les cascade listeners TypeORM. C'est intentionnel et plus efficace que `remove`.

> **`order` dans `findOne`** : TypeORM 0.3+ accepte `order: { ingredients: { position: 'ASC' } }` — **PAS** de syntaxe `'ingredients.position': 'ASC'` (cassé sur les relations).

**Spec — nouveaux cas à couvrir :**
```
findOne : retourne la recette avec relations | lance NotFoundException si introuvable | NotFoundException si userId différent
create  : sauvegarde recette + ingrédients + étapes via transaction | retourne la recette avec relations
update  : met à jour les champs recette | remplace les ingrédients si fournis | remplace les étapes si fournis | NotFoundException si introuvable
```

---

### T3 — RecipesController backend

```typescript
@Get(':id')
@ApiOperation({ summary: 'Récupérer une recette' })
findOne(
  @CurrentUser() user: { id: number },
  @Param('id', ParseIntPipe) id: number,
) {
  return this.recipesService.findOne(user.id, id);
}

@Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Créer une recette' })
create(
  @CurrentUser() user: { id: number },
  @Body() dto: CreateRecipeDto,
) {
  return this.recipesService.create(user.id, dto);
}

@Patch(':id')
@ApiOperation({ summary: 'Modifier une recette' })
update(
  @CurrentUser() user: { id: number },
  @Param('id', ParseIntPipe) id: number,
  @Body() dto: UpdateRecipeDto,
) {
  return this.recipesService.update(user.id, id, dto);
}
```

> **Ordre des routes** : `@Get(':id')` après `@Get()`. NestJS résout de façon déterministe mais il faut mettre les routes statiques avant les routes paramétrées — dans ce module, seul `@Get()` existe donc pas de conflit.

---

### T4 — RecipesModule

```typescript
// Vérifier que le module contient déjà :
TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])
// Si oui : pas de modification nécessaire.
// Si non (improbable) : ajouter RecipeIngredient et RecipeStep.
```

---

### T5 — RecipesService frontend

**Nouvelles interfaces à ajouter dans `recipes.service.ts` :**

```typescript
export interface RecipeIngredientItem {
  id: number;
  quantity: number;   // number, pas string — le transformer TypeORM sur DECIMAL gère la conversion
  unit: string | null;
  name: string;
  position: number;
  recipeId: number;
}

export interface RecipeStepItem {
  id: number;
  content: string;
  position: number;
  recipeId: number;
}

export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredientItem[];
  steps: RecipeStepItem[];
}

export interface IngredientPayload {
  quantity: number;
  unit: string | null;
  name: string;
  position: number;
}

export interface StepPayload {
  content: string;
  position: number;
}

export interface CreateRecipePayload {
  title: string;
  category?: string | null;
  servings?: number;
  imageUrl?: string | null;
  ingredients: IngredientPayload[];
  steps: StepPayload[];
}

export type UpdateRecipePayload = CreateRecipePayload;
```

**Nouvelles méthodes à ajouter au service :**

```typescript
getRecipe(id: number): Observable<RecipeDetail> {
  return this.http.get<RecipeDetail>(`/api/recipes/${id}`);
}

createRecipe(dto: CreateRecipePayload): Observable<RecipeDetail> {
  return this.http.post<RecipeDetail>('/api/recipes', dto).pipe(
    tap((created) => this.recipes.update((r) => [...r, created])),
  );
}

updateRecipe(id: number, dto: UpdateRecipePayload): Observable<RecipeDetail> {
  return this.http.patch<RecipeDetail>(`/api/recipes/${id}`, dto).pipe(
    tap((updated) => {
      this.recipes.update((r) => r.map((x) => (x.id === id ? { ...x, ...updated } : x)));
    }),
  );
}
```

> **Mise à jour du signal `recipes` après create/update** : la liste reste cohérente sans recharger depuis le serveur. `RecipeDetail extends Recipe` — compatible avec le signal `Recipe[]`.

> **Pas de `isLoading` sur create/update** : le composant gère son propre signal `isSubmitting` pour désactiver le bouton submit.

---

### T6 — MarkdownLightEditorComponent

**ControlValueAccessor minimal :**

```typescript
import {
  Component, ChangeDetectionStrategy, forwardRef, signal, inject,
  ViewChild, ElementRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-markdown-light-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MarkdownLightEditorComponent),
    multi: true,
  }],
  templateUrl: './markdown-light-editor.component.html',
  styleUrls: ['./markdown-light-editor.component.scss'],
})
export class MarkdownLightEditorComponent implements ControlValueAccessor {
  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;
  readonly value = signal('');
  isDisabled = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(v: string): void { this.value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.isDisabled.set(disabled); }

  onInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.value.set(val);
    this.onChange(val);
    this.onTouched();
  }

  insertMarkdown(syntax: string): void {
    const el = this.textareaRef.nativeElement;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.slice(start, end);
    const replacement = selected ? `${syntax}${selected}${syntax}` : `${syntax}${syntax}`;
    const newVal = el.value.slice(0, start) + replacement + el.value.slice(end);
    el.value = newVal;
    el.setSelectionRange(start + syntax.length, start + syntax.length + selected.length);
    this.value.set(newVal);
    this.onChange(newVal);
    el.focus();
  }
}
```

**Template HTML :**

```html
<div class="mle-wrapper">
  <div class="mle-toolbar" role="toolbar" aria-label="Barre d'outils markdown">
    <button type="button" mat-icon-button matTooltip="Gras (**)" (click)="insertMarkdown('**')" [disabled]="isDisabled()">
      <mat-icon>format_bold</mat-icon>
    </button>
    <button type="button" mat-icon-button matTooltip="Italique (*)" (click)="insertMarkdown('*')" [disabled]="isDisabled()">
      <mat-icon>format_italic</mat-icon>
    </button>
    <button type="button" mat-icon-button matTooltip="Code (`)" (click)="insertMarkdown('`')" [disabled]="isDisabled()">
      <mat-icon>code</mat-icon>
    </button>
  </div>
  <textarea
    #textarea
    class="mle-textarea"
    [value]="value()"
    [disabled]="isDisabled()"
    [placeholder]="placeholder"
    (input)="onInput($event)"
    rows="3"
    aria-multiline="true"></textarea>
</div>
```

> **`type="button"` sur les toolbar buttons** : OBLIGATOIRE — sans ce type, les boutons dans un `<form>` déclenchent la soumission du formulaire. C'est un anti-pattern classique.

> **`insertMarkdown` utilise `el.selectionStart/End`** : pas de `document.execCommand` (déprécié). Approche moderne via manipulation de string.

---

### T7 — RecipeIngredientRowComponent

**Composant qui reçoit un FormGroup et émet un événement de suppression :**

```typescript
@Component({
  selector: 'app-recipe-ingredient-row',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule,
    MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './recipe-ingredient-row.component.html',
  styleUrls: ['./recipe-ingredient-row.component.scss'],
})
export class RecipeIngredientRowComponent {
  @Input({ required: true }) formGroup!: FormGroup;
  @Output() deleteRow = new EventEmitter<void>();
}
```

**Template HTML :**

```html
<div class="ingredient-row" [formGroup]="formGroup" cdkDrag>
  <mat-icon cdkDragHandle class="drag-handle" aria-hidden="true">drag_indicator</mat-icon>

  <mat-form-field appearance="outline" class="field-quantity">
    <mat-label>Qté</mat-label>
    <input matInput type="number" formControlName="quantity" min="0.001" step="0.1" />
    <mat-error *ngIf="formGroup.get('quantity')?.hasError('required')">Requis</mat-error>
  </mat-form-field>

  <mat-form-field appearance="outline" class="field-unit">
    <mat-label>Unité</mat-label>
    <input matInput formControlName="unit" placeholder="g, ml, …" maxlength="50" />
  </mat-form-field>

  <mat-form-field appearance="outline" class="field-name">
    <mat-label>Ingrédient *</mat-label>
    <input matInput formControlName="name" maxlength="255" />
    <mat-error *ngIf="formGroup.get('name')?.hasError('required')">Requis</mat-error>
  </mat-form-field>

  <button type="button" mat-icon-button color="warn" matTooltip="Supprimer" (click)="deleteRow.emit()" aria-label="Supprimer cet ingrédient">
    <mat-icon>delete</mat-icon>
  </button>

  <div *cdkDragPlaceholder class="drag-placeholder"></div>
</div>
```

> **`[formGroup]="formGroup"` sur le host** : le composant ne crée pas son propre FormGroup — il reçoit le contrôle du parent. Ceci est le pattern standard pour les lignes dynamiques d'un FormArray.

> **`cdkDragHandle`** : l'icône `drag_indicator` est la poignée de drag — le drag ne s'active QUE sur cette poignée, pas sur les inputs.

---

### T8 — RecipeEditorComponent

**Structure du composant :**

```typescript
@Component({
  selector: 'app-recipe-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule, DragDropModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule,
    MatIconModule, MatCardModule, MatDividerModule,
    RecipeIngredientRowComponent, MarkdownLightEditorComponent,
    RouterModule,
  ],
  templateUrl: './recipe-editor.component.html',
  styleUrls: ['./recipe-editor.component.scss'],
})
export class RecipeEditorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly recipesService = inject(RecipesService);
  private readonly snackBar = inject(MatSnackBar);

  readonly recipeId: number | null = (() => {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? Number(id) : null;
  })();
  readonly isEditMode = signal(this.recipeId !== null);
  readonly isSubmitting = signal(false);
  readonly isLoading = signal(false);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(255)]],
    category: [''],
    servings: [4, [Validators.required, Validators.min(1)]],
    imageUrl: [''],
    ingredients: this.fb.array<FormGroup>([]),
    steps: this.fb.array<FormGroup>([]),
  });

  get ingredients(): FormArray { return this.form.get('ingredients') as FormArray; }
  get steps(): FormArray { return this.form.get('steps') as FormArray; }

  private createIngredientGroup(data?: Partial<RecipeIngredientItem>): FormGroup {
    return this.fb.nonNullable.group({
      quantity: [data?.quantity ?? null, [Validators.required, Validators.min(0.001)]],
      unit: [data?.unit ?? ''],
      name: [data?.name ?? '', [Validators.required, Validators.maxLength(255)]],
    });
  }

  private createStepGroup(data?: Partial<RecipeStepItem>): FormGroup {
    return this.fb.nonNullable.group({
      content: [data?.content ?? '', Validators.required],
    });
  }

  ngOnInit(): void {
    if (this.isEditMode() && this.recipeId) {
      this.isLoading.set(true);
      this.recipesService.getRecipe(this.recipeId).subscribe({
        next: (recipe) => {
          this.form.patchValue({
            title: recipe.title,
            category: recipe.category ?? '',
            servings: recipe.servings,
            imageUrl: recipe.imageUrl ?? '',
          });
          recipe.ingredients.forEach((ing) => this.ingredients.push(this.createIngredientGroup(ing)));
          recipe.steps.forEach((step) => this.steps.push(this.createStepGroup(step)));
          this.isLoading.set(false);
        },
        error: () => {
          this.snackBar.open('Erreur lors du chargement de la recette', 'Fermer', { duration: 3000 });
          this.isLoading.set(false);
          this.router.navigate(['/recipes']);
        },
      });
    }
  }

  addIngredient(): void { this.ingredients.push(this.createIngredientGroup()); }
  removeIngredient(i: number): void { this.ingredients.removeAt(i); }
  addStep(): void { this.steps.push(this.createStepGroup()); }
  removeStep(i: number): void { this.steps.removeAt(i); }

  dropIngredient(event: CdkDragDrop<AbstractControl[]>): void {
    moveItemInArray(this.ingredients.controls, event.previousIndex, event.currentIndex);
    this.ingredients.updateValueAndValidity();
  }

  dropStep(event: CdkDragDrop<AbstractControl[]>): void {
    moveItemInArray(this.steps.controls, event.previousIndex, event.currentIndex);
    this.steps.updateValueAndValidity();
  }

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.isSubmitting.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      title: raw.title,
      category: raw.category || null,
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

    const request$ = this.isEditMode() && this.recipeId
      ? this.recipesService.updateRecipe(this.recipeId, payload)
      : this.recipesService.createRecipe(payload);

    request$.subscribe({
      next: (recipe) => {
        const msg = this.isEditMode() ? 'Recette modifiée' : 'Recette créée';
        this.snackBar.open(msg, 'Fermer', { duration: 3000 });
        this.router.navigate(['/recipes', recipe.id]);
        this.isSubmitting.set(false);
      },
      error: () => {
        this.snackBar.open('Erreur lors de l\'enregistrement', 'Fermer', { duration: 3000 });
        this.isSubmitting.set(false);
      },
    });
  }
}
```

**Template HTML (structure) :**

```html
<div class="recipe-editor">
  <div class="editor-header">
    <button mat-icon-button routerLink="/recipes" aria-label="Retour à la liste">
      <mat-icon>arrow_back</mat-icon>
    </button>
    <h1 class="editor-title">{{ isEditMode() ? 'Modifier la recette' : 'Nouvelle recette' }}</h1>
  </div>

  @if (isLoading()) {
    <div class="loading-state" role="status" aria-label="Chargement..." aria-busy="true">
      <mat-spinner diameter="40"></mat-spinner>
    </div>
  } @else {
    <form [formGroup]="form" (ngSubmit)="submit()" class="editor-form" novalidate>

      <!-- Titre -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Titre *</mat-label>
        <input matInput formControlName="title" maxlength="255" />
        <mat-error *ngIf="form.get('title')?.hasError('required')">Le titre est obligatoire</mat-error>
      </mat-form-field>

      <!-- Catégorie + Convives -->
      <div class="row-two-cols">
        <mat-form-field appearance="outline">
          <mat-label>Catégorie</mat-label>
          <input matInput formControlName="category" placeholder="Ex : Desserts, Plats…" maxlength="255" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Convives</mat-label>
          <input matInput type="number" formControlName="servings" min="1" />
        </mat-form-field>
      </div>

      <!-- Ingrédients -->
      <section class="section-ingredients" aria-label="Ingrédients">
        <h2 class="section-title">Ingrédients</h2>
        <div
          cdkDropList
          [cdkDropListData]="ingredients.controls"
          (cdkDropListDropped)="dropIngredient($event)"
          class="drag-list">
          @for (ctrl of ingredients.controls; track ctrl; let i = $index) {
            <app-recipe-ingredient-row
              [formGroup]="ctrl"
              (deleteRow)="removeIngredient(i)">
            </app-recipe-ingredient-row>
          }
        </div>
        <button type="button" mat-stroked-button (click)="addIngredient()" class="btn-add">
          <mat-icon>add</mat-icon> Ajouter un ingrédient
        </button>
      </section>

      <!-- Étapes -->
      <section class="section-steps" aria-label="Étapes">
        <h2 class="section-title">Étapes</h2>
        <div
          cdkDropList
          [cdkDropListData]="steps.controls"
          (cdkDropListDropped)="dropStep($event)"
          class="drag-list">
          @for (ctrl of steps.controls; track ctrl; let i = $index) {
            <div class="step-row" cdkDrag>
              <div class="step-number">{{ i + 1 }}</div>
              <app-markdown-light-editor
                [formControl]="ctrl.get('content')"
                class="step-editor">
              </app-markdown-light-editor>
              <button type="button" mat-icon-button color="warn" (click)="removeStep(i)" aria-label="Supprimer cette étape">
                <mat-icon>delete</mat-icon>
              </button>
              <mat-icon cdkDragHandle class="drag-handle" aria-hidden="true">drag_indicator</mat-icon>
            </div>
          }
        </div>
        <button type="button" mat-stroked-button (click)="addStep()" class="btn-add">
          <mat-icon>add</mat-icon> Ajouter une étape
        </button>
      </section>

      <!-- Submit -->
      <div class="form-actions">
        <button mat-button type="button" routerLink="/recipes">Annuler</button>
        <button
          mat-flat-button color="primary" type="submit"
          [disabled]="form.invalid || isSubmitting()">
          @if (isSubmitting()) { <mat-spinner diameter="20"></mat-spinner> }
          @else { {{ isEditMode() ? 'Enregistrer les modifications' : 'Créer la recette' }} }
        </button>
      </div>
    </form>
  }
</div>
```

> **Redirection vers `/recipes/:id`** : la route detail n'existe pas encore (créée en story 5.4). La navigation redirigera vers la wildcard jusqu'à la story 5.4. C'est intentionnel — ne pas changer en `/recipes`.

> **`[formControl]="ctrl.get('content')`** dans `app-markdown-light-editor` : `FormControl` obtenu via `FormGroup.get('content')` — compatible avec le `ControlValueAccessor`.

> **`moveItemInArray` de `@angular/cdk/drag-drop`** : importer exactement comme dans `links.component.ts`. Cette fonction réorganise le tableau en place (mutation directe) — `updateValueAndValidity()` force Angular à détecter le changement.

> **`track ctrl`** dans `@for` (Angular 17+) : utilise la référence objet comme clé de tracking — les rows ne sont pas recréées lors d'un drag.

---

### T9 — Routes

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
    path: ':id/edit',
    loadComponent: () =>
      import('./recipe-editor/recipe-editor.component').then((m) => m.RecipeEditorComponent),
  },
  // Story 5.4 ajoutera : { path: ':id', loadComponent: ... RecipeDetailComponent }
];
```

> **L'ordre compte** : `new` AVANT `:id/edit` AVANT `:id` (story 5.4) — NestJS routeur lit dans l'ordre, `new` doit être avant `:id` pour ne pas être capturé comme un paramètre.

---

### T10 — Bouton accès édition depuis la liste

Ajouter dans `recipes.component.html` sur chaque `recipe-item` :
```html
<a class="recipe-item" [routerLink]="['/recipes', recipe.id]">
  <span class="recipe-title">{{ recipe.title }}</span>
  <span class="recipe-servings">{{ recipe.servings }} pers.</span>
  <button type="button" mat-icon-button class="edit-btn"
          [routerLink]="['/recipes', recipe.id, 'edit']"
          (click)="$event.stopPropagation()"
          aria-label="Modifier {{ recipe.title }}">
    <mat-icon>edit</mat-icon>
  </button>
</a>
```
> **`$event.stopPropagation()`** : empêche le click du bouton édition de naviguer aussi vers le detail (lien parent).

---

### Learnings de story 5.2 applicables ici

- **Logger NestJS** : `new Logger(RecipesService.name)` — obligatoire maintenant que le service a des mutations (create, update)
- **Pattern DataSource.transaction** : identique à `LinksService.reorder` — inject `@InjectDataSource()`, utiliser `manager.create / manager.save / manager.delete` dans le callback
- **ChangeDetectionStrategy.OnPush** : obligatoire sur tous les nouveaux composants (RecipeEditorComponent, RecipeIngredientRowComponent, MarkdownLightEditorComponent)
- **Standalone components** : tous `standalone: true`, pas de NgModule séparé
- **Signal writeable** : `signal<T>()` non-readonly pour `.set()` et `.update()`
- **`@Entity('Recipe')`** : nom PascalCase explicite sur les entités

---

### Anti-patterns à éviter

```typescript
// ❌ Ne pas faire : cascade insert via entité (cascade: ['remove'] seulement)
const recipe = this.repo.create({ ..., ingredients: [...] }); // NE SAUVEGARDE PAS les relations

// ✅ Faire : transaction manuelle
this.dataSource.transaction(async (manager) => {
  const saved = await manager.save(Recipe, recipeData);
  await manager.save(RecipeIngredient, ingredients.map(i => ({ ...i, recipeId: saved.id })));
});

// ❌ Ne pas faire : findAll avec relations (N+1 inutile)
this.repo.find({ where: { userId }, relations: ['ingredients', 'steps'] });

// ✅ Faire : findAll sans relations (déjà en place), findOne avec relations (story 5.3)

// ❌ Ne pas faire : bouton submit dans toolbar MarkdownLightEditor sans type="button"
<button (click)="insertMarkdown('**')">B</button>  // déclenche le submit du formulaire parent !

// ✅ Faire :
<button type="button" (click)="insertMarkdown('**')">B</button>
```

---

## Project Structure Notes

**Fichiers à MODIFIER :**
```
backend/src/recipes/
├── dto/
│   └── create-recipe.dto.ts          ← Ajouter ingredients + steps arrays (T1)
├── recipes.service.ts                ← Ajouter findOne, create, update (T2)
├── recipes.service.spec.ts           ← Ajouter tests nouveaux cas (T2)
├── recipes.controller.ts             ← Ajouter GET :id, POST, PATCH :id (T3)
└── recipes.controller.spec.ts        ← Ajouter tests nouveaux endpoints (T3)

frontend/src/app/recipes/
├── recipes.service.ts                ← Ajouter interfaces + méthodes CRUD (T5)
├── recipes.service.spec.ts           ← Ajouter tests (T5)
├── recipes.routes.ts                 ← Ajouter routes new + :id/edit (T9)
└── recipes.component.html            ← Ajouter bouton edit sur recipe-item (T10)
```

**Fichiers à CRÉER :**
```
frontend/src/app/recipes/recipe-editor/
├── recipe-editor.component.ts        ← CRÉER (T8)
├── recipe-editor.component.html      ← CRÉER (T8)
├── recipe-editor.component.scss      ← CRÉER (T8)
├── recipe-ingredient-row.component.ts    ← CRÉER (T7)
├── recipe-ingredient-row.component.html  ← CRÉER (T7)
├── recipe-ingredient-row.component.scss  ← CRÉER (T7)
├── markdown-light-editor.component.ts    ← CRÉER (T6)
├── markdown-light-editor.component.html  ← CRÉER (T6)
└── markdown-light-editor.component.scss  ← CRÉER (T6)
```

**Aucune migration TypeORM** dans cette story (les entités `Recipe`, `RecipeIngredient`, `RecipeStep` existent depuis story 5.1).

---

## Références

- `backend/src/recipes/recipe.entity.ts` — Champs Recipe, relations OneToMany, cascade: ['remove']
- `backend/src/recipes/recipe-ingredient.entity.ts` — Champs RecipeIngredient, `decimalTransformer` sur `quantity`
- `backend/src/recipes/recipe-step.entity.ts` — Champs RecipeStep
- `backend/src/recipes/dto/create-recipe-ingredient.dto.ts` — Validateurs quantity/unit/name/position
- `backend/src/recipes/dto/create-recipe-step.dto.ts` — Validateurs content/position
- `backend/src/links/links.service.ts` — Pattern `DataSource.transaction`, `manager.create/save/delete`, Logger
- `backend/src/links/links.controller.ts` — Pattern `@Post @HttpCode(CREATED)`, `@Patch(':id')`, `ParseIntPipe`
- `backend/src/links/links.service.spec.ts` — Pattern spec avec mock repository + DataSource
- `frontend/src/app/links/links.component.ts` — Pattern CDK `DragDropModule`, `moveItemInArray`, `CdkDragDrop`
- `frontend/src/app/recipes/recipes.service.ts` — Service existant à étendre (signal, loadRecipes, EMPTY guard)
- `_bmad-output/planning-artifacts/architecture.md` — Structure backend/frontend recipes (l.573–678), CDK drag-drop (l.838–893), API patterns (l.398–413)
- `_bmad-output/planning-artifacts/ux-design-Dashboard.md` — RecipeIngredientRow (l.764–768), MarkdownLightEditor (l.792–796), Form patterns (l.880–894)

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage — implémentation conforme aux Dev Notes de bout en bout.

Note technique : `ingredientRepo` et `stepRepo` non injectés dans `RecipesService` (ils ne sont pas directement utilisés — le `manager` de la transaction DataSource accède aux entités via les métadonnées TypeORM enregistrées dans `RecipesModule`).

### Completion Notes List

- T1 : `create-recipe.dto.ts` enrichi avec `ingredients[]` et `steps[]` validés via `ValidateNested + @Type`
- T2 : `RecipesService` — ajout `findOne`, `create`, `update` via `DataSource.transaction` + `Logger` ; 10 tests unitaires ajoutés
- T3 : `RecipesController` — ajout `GET :id`, `POST`, `PATCH :id` ; 5 tests unitaires ajoutés
- T4 : `RecipesModule` confirmé — `TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])` déjà présent
- T5 : `RecipesService` frontend étendu avec interfaces `RecipeDetail`, `IngredientPayload`, `StepPayload`, `CreateRecipePayload/UpdateRecipePayload` + méthodes `getRecipe`, `createRecipe`, `updateRecipe` + mise à jour signal ; 3 tests ajoutés
- T6 : `MarkdownLightEditorComponent` créé — CVA, toolbar markdown (gras/italique/code), `insertMarkdown` via `selectionStart/End`
- T7 : `RecipeIngredientRowComponent` créé — reçoit `FormGroup`, émet `deleteRow`, drag via `cdkDragHandle`
- T8 : `RecipeEditorComponent` créé — formulaire complet avec `FormArray` ingrédients + étapes, drag & drop CDK, `ngOnInit` patch pour edition, `submit()` create/update avec snackbar et navigation
- T9 : routes `new` et `:id/edit` ajoutées dans `recipes.routes.ts`
- T10 : bouton edit ajouté sur chaque `recipe-item` dans l'accordéon (avec `$event.stopPropagation()`)
- Tous tests : 157 backend + 127 frontend — 0 régression, 0 erreur TS nouvelle

### File List

**Modifiés :**
- `backend/src/recipes/dto/create-recipe.dto.ts`
- `backend/src/recipes/recipes.service.ts`
- `backend/src/recipes/recipes.service.spec.ts`
- `backend/src/recipes/recipes.controller.ts`
- `backend/src/recipes/recipes.controller.spec.ts`
- `frontend/src/app/recipes/recipes.service.ts`
- `frontend/src/app/recipes/recipes.service.spec.ts`
- `frontend/src/app/recipes/recipes.routes.ts`
- `frontend/src/app/recipes/recipes.component.html`

**Créés :**
- `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.ts`
- `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.html`
- `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.scss`
- `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.ts`
- `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html`
- `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.scss`
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts`
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.html`
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.scss`

### Change Log

- 2026-06-02 : Implémentation complète story 5.3 — backend (DTO, service, controller) + frontend (service, 3 composants, routes, bouton edit)

### Review Findings

#### Patches

- [x] [Review][Patch] `create()` / `update()` — `findOne` final peut retourner `null`, cast silencieux `as Promise<Recipe>` [backend/src/recipes/recipes.service.ts]
- [x] [Review][Patch] `logger` non `private` — implémentation exposée sur l'API publique du service [backend/src/recipes/recipes.service.ts:12]
- [x] [Review][Patch] `UpdateRecipePayload` alias de `CreateRecipePayload` — `ingredients`/`steps` requis au lieu d'optionnels [frontend/src/app/recipes/recipes.service.ts]
- [x] [Review][Patch] `insertMarkdown` n'appelle pas `onTouched()` — validation non déclenchée après insertion toolbar [frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.ts]
- [x] [Review][Patch] `@IsUrl` rejette `null` pour `imageUrl` — le frontend envoie `null` mais le DTO attend `undefined` pour skip la validation [backend/src/recipes/dto/create-recipe.dto.ts]
- [x] [Review][Patch] `isSubmitting` reste `true` si l'observable est annulé (timeout réseau) — manque `finalize` [frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts]
- [x] [Review][Patch] Subscription `ngOnInit` non nettoyée à la destruction — manque `takeUntilDestroyed` [frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts]
- [x] [Review][Patch] `Number(id)` retourne `NaN` sur URL non-numérique — manque garde `isNaN` [frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts:65]
- [x] [Review][Patch] Champ `imageUrl` absent du template HTML — l'utilisateur ne peut pas saisir/modifier l'URL d'image [frontend/src/app/recipes/recipe-editor/recipe-editor.component.html]

#### Deferred

- [x] [Review][Defer] `NgIf` (`*ngIf`) au lieu de `@if` dans `RecipeIngredientRowComponent` [frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html] — deferred, incohérence stylistique, pré-existante dans le projet
- [x] [Review][Defer] Bouton `<button>` imbriqué dans `<a>` — HTML invalide selon la spec, concern accessibilité [frontend/src/app/recipes/recipes.component.html] — deferred, pattern explicitement prescrit par les Dev Notes de la story
- [x] [Review][Defer] `content` des étapes sans `@MaxLength` — aucune borne sur la taille du contenu stocké [backend/src/recipes/dto/create-recipe-step.dto.ts] — deferred, limitation DTO pré-existante hors scope story 5.3

### Status

done
