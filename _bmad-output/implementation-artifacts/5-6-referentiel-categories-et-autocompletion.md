---
baseline_commit: 47ae3ea
---

# Story 5.6 : Référentiel de catégories et autocomplétion dans l'éditeur de recette

**Épic :** 5 — Module Recettes  
**Statut :** done  
**Créée le :** 2026-06-03

---

## User Story

En tant qu'utilisateur authentifié,  
Je veux que le champ catégorie et les champs ingrédient/unité de l'éditeur de recette proposent de l'autocomplétion à partir de mes données existantes,  
Afin d'éviter les doublons et d'accélérer la saisie.

---

## Critères d'acceptation

**AC1 — Migration : table RecipeCategory + FK sur Recipe**  
**Étant donné** que la migration TypeORM est exécutée,  
**Quand** j'inspecte la base de données,  
**Alors** la table `RecipeCategory` existe (id, name VARCHAR(100), userId, createdAt, updatedAt)  
**Et** la table `Recipe` possède une colonne `categoryId` INT nullable (FK vers `RecipeCategory`)  
**Et** l'ancienne colonne `category VARCHAR` n'existe plus dans `Recipe`

**AC2 — findOrCreate côté backend lors du save**  
**Étant donné** que je crée ou modifie une recette avec `categoryName: "Dessert"`,  
**Quand** le service traite la requête,  
**Alors** il cherche une `RecipeCategory` avec `name = "Dessert"` et le `userId` de l'utilisateur connecté :  
- Si elle existe → réutilise l'id existant  
- Si elle n'existe pas → crée silencieusement la `RecipeCategory` et utilise son id  
**Et** la `Recipe` est sauvegardée avec le `categoryId` résultant

**AC3 — GET /api/recipe-categories**  
**Étant donné** que je suis authentifié,  
**Quand** j'appelle `GET /api/recipe-categories`,  
**Alors** le backend retourne la liste des `RecipeCategory` de l'utilisateur (id + name), triée alphabétiquement

**AC4 — GET /api/recipe-categories/ingredient-suggestions**  
**Quand** j'appelle `GET /api/recipe-categories/ingredient-suggestions`,  
**Alors** le backend retourne les noms d'ingrédients distincts de l'utilisateur  
(`SELECT DISTINCT name FROM RecipeIngredient JOIN Recipe WHERE Recipe.userId = ?`, triés alphabétiquement)

**AC5 — GET /api/recipe-categories/unit-suggestions**  
**Quand** j'appelle `GET /api/recipe-categories/unit-suggestions`,  
**Alors** le backend retourne les unités distinctes de l'utilisateur  
(`SELECT DISTINCT unit FROM RecipeIngredient JOIN Recipe WHERE Recipe.userId = ? AND unit IS NOT NULL AND unit != ''`, triées alphabétiquement)

**AC6 — Autocomplétion catégorie dans l'éditeur**  
**Étant donné** que j'ouvre le formulaire de création ou d'édition d'une recette,  
**Quand** je clique sur le champ catégorie,  
**Alors** un `MatAutocomplete` affiche la liste de mes catégories existantes  
**Et** la liste se filtre côté client (insensible à la casse) dès que je tape

**AC7 — Catégorie libre (création implicite)**  
**Étant donné** que je saisis une catégorie qui n'existe pas encore (ex : "Plat"),  
**Quand** je soumets le formulaire,  
**Alors** le formulaire envoie `categoryName: "Plat"` et le backend la crée silencieusement

**AC8 — Catégorie vide**  
**Étant donné** que le champ catégorie est laissé vide,  
**Quand** je soumets,  
**Alors** `categoryId` est null — la recette est sauvegardée sans catégorie

**AC9 — Autocomplétion ingrédient**  
**Étant donné** que je saisis dans le champ nom d'un ingrédient,  
**Quand** je tape au moins 1 caractère,  
**Alors** un `MatAutocomplete` filtre (insensible à la casse) les noms d'ingrédients existants  
**Et** je peux sélectionner une suggestion ou saisir un nouveau nom librement

**AC10 — Autocomplétion unité**  
**Étant donné** que je saisis dans le champ unité d'un ingrédient,  
**Quand** je tape au moins 1 caractère,  
**Alors** un `MatAutocomplete` filtre (insensible à la casse) les unités existantes  
**Et** je peux sélectionner une suggestion ou saisir une nouvelle unité librement

**AC11 — Groupement par catégorie dans la liste**  
**Étant donné** que j'accède à `/recipes`,  
**Quand** les recettes sont chargées,  
**Alors** le groupement par catégorie utilise `recipe.category?.name` (au lieu de l'ancien champ string)  
**Et** les recettes sans catégorie sont regroupées sous "Sans catégorie"

**AC12 — Affichage catégorie dans la liste de recherche**  
**Étant donné** que je suis en mode recherche,  
**Quand** une recette a une catégorie,  
**Alors** le badge catégorie affiche `recipe.category?.name`

---

## Tâches / Sous-tâches

### T1 — Backend : entité `RecipeCategoryEntity` (AC: AC1, AC2, AC3)

- [x] Créer `backend/src/recipes/recipe-category.entity.ts` (voir Dev Notes T1)

### T2 — Backend : migration TypeORM (AC: AC1)

- [x] Générer la migration via `cd backend && npm run migration:generate -- src/migrations/AddRecipeCategory` **après** avoir mis à jour les entités Recipe et RecipeCategory
- [x] Vérifier que la migration générée contient (voir Dev Notes T2) :
  - [x] CREATE TABLE `RecipeCategory`
  - [x] ALTER TABLE `Recipe` ADD COLUMN `categoryId` INT NULL
  - [x] ALTER TABLE `Recipe` DROP COLUMN `category`
  - [x] ADD FOREIGN KEY `categoryId` → `RecipeCategory.id` ON DELETE SET NULL
- [x] Si la migration auto-générée est incomplète, la compléter manuellement (voir Dev Notes T2)

### T3 — Backend : mettre à jour `Recipe` entity (AC: AC1, AC2)

- [x] Modifier `backend/src/recipes/recipe.entity.ts` :
  - [x] Supprimer `@Column() category!: string | null`
  - [x] Ajouter `@Column({ nullable: true }) categoryId!: number | null`
  - [x] Ajouter `@ManyToOne(() => RecipeCategoryEntity, { nullable: true, onDelete: 'SET NULL', eager: false })` + `@JoinColumn({ name: 'categoryId' })` + `category!: RecipeCategoryEntity | null`
  - [x] Importer `RecipeCategoryEntity`

### T4 — Backend : DTO (AC: AC2, AC7, AC8)

- [x] Modifier `backend/src/recipes/dto/create-recipe.dto.ts` :
  - [x] Remplacer le champ `category?: string | null` par `categoryName?: string | null`
  - [x] Conserver `@IsString()`, `@IsOptional()`, `@MaxLength(100)` (réduire à 100)
- [x] `update-recipe.dto.ts` étend `PartialType(CreateRecipeDto)` → aucun changement requis

### T5 — Backend : `RecipesService` — mise à jour create/update/findAll/findOne (AC: AC2, AC11)

- [x] Modifier `backend/src/recipes/recipes.service.ts` :
  - [x] Ajouter `@InjectRepository(RecipeCategoryEntity)` + importer l'entité
  - [x] Ajouter méthode privée `findOrCreateCategory()` (voir Dev Notes T5)
  - [x] Mettre à jour `create()` : utiliser `findOrCreateCategory()` pour résoudre `categoryId`
  - [x] Mettre à jour `update()` : idem, uniquement si `dto.categoryName !== undefined`
  - [x] Mettre à jour `findAll()` : ajouter `relations: ['category']`, order sur `category.name` (voir Dev Notes T5)
  - [x] Mettre à jour `findOne()` : ajouter `relations: ['ingredients', 'steps', 'category']`

### T6 — Backend : `RecipeCategoriesService` + `RecipeCategoriesController` (AC: AC3, AC4, AC5)

- [x] Créer `backend/src/recipes/recipe-categories.service.ts` (voir Dev Notes T6)
- [x] Créer `backend/src/recipes/recipe-categories.controller.ts` (voir Dev Notes T6)

### T7 — Backend : mettre à jour `RecipesModule` (AC: AC1, AC6)

- [x] Modifier `backend/src/recipes/recipes.module.ts` :
  - [x] Ajouter `RecipeCategoryEntity` dans `TypeOrmModule.forFeature([...])`
  - [x] Ajouter `RecipeCategoriesController` dans `controllers: [...]`
  - [x] Ajouter `RecipeCategoriesService` dans `providers: [...]`

### T8 — Frontend : mettre à jour les interfaces et `RecipesService` (AC: AC11, AC12)

- [x] Modifier `frontend/src/app/recipes/recipes.service.ts` :
  - [x] Mettre à jour l'interface `Recipe` : `category: string | null` → `category: { id: number; name: string } | null`
  - [x] Mettre à jour `CreateRecipePayload` : `category?: string | null` → `categoryName?: string | null`
  - [x] Mettre à jour `UpdateRecipePayload` : idem
  - [x] Ajouter interface `RecipeCategory { id: number; name: string }`
  - [x] Ajouter méthode `getCategories(): Observable<RecipeCategory[]>` → `GET /api/recipe-categories`
  - [x] Ajouter méthode `getIngredientSuggestions(): Observable<string[]>` → `GET /api/recipe-categories/ingredient-suggestions`
  - [x] Ajouter méthode `getUnitSuggestions(): Observable<string[]>` → `GET /api/recipe-categories/unit-suggestions`

### T9 — Frontend : `RecipesComponent` — mise à jour du computed (AC: AC11, AC12)

- [x] Modifier `frontend/src/app/recipes/recipes.component.ts` :
  - [x] `categorizedRecipes` : changer la clé de groupement de `r.category ?? 'Sans catégorie'` → `r.category?.name ?? 'Sans catégorie'`
  - [x] `filteredRecipes` : ajouter le filtre sur le nom de catégorie (voir Dev Notes T9)
- [x] Modifier `frontend/src/app/recipes/recipes.component.html` :
  - [x] Badge dans la flat list : `{{ recipe.category }}` → `{{ recipe.category?.name }}`

### T10 — Frontend : `RecipeEditorComponent` — autocomplétion catégorie (AC: AC6, AC7, AC8)

- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` :
  - [x] Importer `MatAutocompleteModule` + ajouter aux `imports[]`
  - [x] Ajouter `ReactiveFormsModule` (déjà présent), `AsyncPipe` si nécessaire
  - [x] Ajouter signal `readonly categories = signal<RecipeCategory[]>([])`
  - [x] Ajouter signal `readonly categoryQuery = signal('')`
  - [x] Ajouter computed `readonly filteredCategories = computed(...)` (voir Dev Notes T10)
  - [x] Charger les catégories dans `ngOnInit()` via `recipesService.getCategories()`
  - [x] Importer `RecipeCategory` depuis `recipes.service.ts`
  - [x] Dans `ngOnInit()` en mode édition : patcher `category` avec `recipe.category?.name ?? ''`
  - [x] Dans `submit()` : changer `category: raw.category || null` → `categoryName: raw.category || null`
- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-editor.component.html` :
  - [x] Remplacer le `<input matInput formControlName="category">` par un champ avec `MatAutocomplete` (voir Dev Notes T10)

### T11 — Frontend : `RecipeIngredientRowComponent` — autocomplétion nom/unité (AC: AC9, AC10)

- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.ts` :
  - [x] Ajouter `@Input() ingredientSuggestions: string[] = []`
  - [x] Ajouter `@Input() unitSuggestions: string[] = []`
  - [x] Ajouter `nameQuery = signal('')` et `unitQuery = signal('')`
  - [x] Ajouter `filteredIngredients = computed(...)` et `filteredUnits = computed(...)` (voir Dev Notes T11)
  - [x] Importer `MatAutocompleteModule`, `signal`, `computed` depuis les packages appropriés
- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html` :
  - [x] Ajouter `MatAutocomplete` sur le champ `name` (voir Dev Notes T11)
  - [x] Ajouter `MatAutocomplete` sur le champ `unit` (voir Dev Notes T11)

### T12 — Frontend : `RecipeEditorComponent` — passer suggestions aux rows (AC: AC9, AC10)

- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` :
  - [x] Ajouter signal `readonly ingredientSuggestions = signal<string[]>([])`
  - [x] Ajouter signal `readonly unitSuggestions = signal<string[]>([])`
  - [x] Charger suggestions dans `ngOnInit()` en parallèle avec `forkJoin()` (voir Dev Notes T12)
- [x] Modifier `frontend/src/app/recipes/recipe-editor/recipe-editor.component.html` :
  - [x] Passer `[ingredientSuggestions]="ingredientSuggestions()"` et `[unitSuggestions]="unitSuggestions()"` à chaque `<app-recipe-ingredient-row>`

### T13 — Tests E2E Playwright (AC: AC6, AC7, AC9)

- [x] Créer `e2e/tests/recipes-autocomplete.spec.ts` (voir Scénarios E2E)

### T14 — Mise à jour tests backend (AC: AC2, AC3, AC4, AC5)

- [x] Mettre à jour `backend/src/recipes/recipes.service.spec.ts` et `recipes.controller.spec.ts` pour refléter le renommage `category` → `categoryName`

### Review Findings

**Decision-needed**

- [x] [Review][Decision] AC6/AC9/AC10 — Afficher toutes les suggestions quand le champ est vide — décidé : **garder la liste complète au clic** (UX plus confortable)
- [x] [Review][Decision] findOrCreateCategory applique un `.trim()` — décidé : **garder le trim()** (normalisation silencieuse souhaitée)
- [x] [Review][Decision] "Sans catégorie" non trié en dernier — décidé : **catégorie obligatoire** (voir Patch P8 ci-dessous)

**Patch**

- [x] [Review][Patch] Migration `CHANGE \`category\`` échoue sur une base sans cette colonne — corrigé : réécriture en `DROP COLUMN category` + `ADD categoryId INT NOT NULL` [`backend/src/migrations/1780499129185-AddRecipeCategory.ts`]
- [x] [Review][Patch] Race condition : absence de contrainte UNIQUE `(name, userId)` sur RecipeCategory — corrigé : `UNIQUE KEY` dans la migration + `@Unique` sur l'entité [`backend/src/recipes/recipe-category.entity.ts`]
- [x] [Review][Patch] `filteredIngredients`/`filteredUnits` ne réagissent pas aux mises à jour des `@Input()` — corrigé : conversion en `input()` signal-based API [`frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.ts`]
- [x] [Review][Patch] `forkJoin` sans `catchError` — corrigé : `catchError(() => of([]))` sur chaque inner observable [`frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts`]
- [x] [Review][Patch] AC12 : `recipe.category.name` non null-safe — corrigé : `recipe.category?.name` [`frontend/src/app/recipes/recipes.component.html`]
- [x] [Review][Patch] `categoryQuery` non réinitialisé après sélection — corrigé : `(optionSelected)="categoryQuery.set('')"` [`frontend/src/app/recipes/recipe-editor/recipe-editor.component.html`]
- [x] [Review][Patch] `deleteTestRecipe` n'inspecte pas le statut HTTP — corrigé : `expect(res.ok()).toBeTruthy()` [`e2e/tests/recipes-autocomplete.spec.ts`]
- [x] [Review][Patch] P8 — Catégorie obligatoire (décision D2) — corrigé : `categoryId INT NOT NULL` + `ON DELETE RESTRICT` en DB, `@IsNotEmpty()` dans le DTO, `Validators.required` dans le formulaire Angular, E2E mis à jour

**Defer**

- [x] [Review][Defer] `update()` rechargement final sans scope `userId` [`backend/src/recipes/recipes.service.ts:154`] — deferred, pre-existing
- [x] [Review][Defer] `getIngredientSuggestions` pourrait retourner des entrées `null` si `ri.name` est null en DB [`backend/src/recipes/recipe-categories.service.ts:21-27`] — deferred, schéma garantit NOT NULL
- [x] [Review][Defer] Test "réutilise la catégorie existante" n'assert pas que `manager.create` n'a pas été appelé pour `RecipeCategoryEntity` [`backend/src/recipes/recipes.service.spec.ts:165`] — deferred, amélioration de test non bloquante
- [x] [Review][Defer] E2E : `RecipeCategory` orphelines (SoupeE2E, GroupeE2E, etc.) non supprimées après les tests — pas d'endpoint DELETE /api/recipe-categories par design, noms suffisamment distincts pour ne pas polluer l'UX [`e2e/tests/recipes-autocomplete.spec.ts`] — deferred, contrainte de design

---

## Scénarios E2E

- Créer une recette avec la catégorie "Soupe" → créer une 2e recette → vérifier que "Soupe" apparaît dans l'autocomplete catégorie
- Taper "so" dans le champ catégorie → vérifier que "Soupe" apparaît dans les suggestions (filtrage case-insensitive)
- Sélectionner "Soupe" depuis l'autocomplete → soumettre → vérifier que la recette est groupée sous "Soupe" dans la liste
- Créer une recette avec l'ingrédient "poulet" → créer une 2e recette → vérifier que "poulet" apparaît dans les suggestions ingrédient du champ nom
- Soumettre une recette sans catégorie → vérifier qu'elle apparaît sous "Sans catégorie" dans la liste
- Créer une recette avec une nouvelle catégorie saisie librement (pas dans l'autocomplete) → vérifier qu'elle est créée et visible

---

## Dev Notes

### T1 — Entité `RecipeCategoryEntity`

Pattern identique à `LinkCategoryEntity` (`backend/src/links/link-category.entity.ts`), sans `position` ni `icon` ni `links` (pas de relation inverse nécessaire pour cette story) :

```typescript
// backend/src/recipes/recipe-category.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

@Entity('RecipeCategory')
export class RecipeCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column()
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

---

### T2 — Migration : stratégie et contenu attendu

**Ordre impératif :** mettre à jour les entités (T1 + T3) AVANT de générer la migration.

**Commande de génération :**
```bash
cd backend
npx typeorm migration:generate src/migrations/AddRecipeCategory -d src/typeorm.config.ts
```

La migration générée doit contenir (dans cet ordre dans `up()`) :
1. `CREATE TABLE \`RecipeCategory\`` — même pattern que `LinkCategory`
2. `ALTER TABLE \`Recipe\` ADD \`categoryId\` int NULL` — nullable, pas de default
3. `ALTER TABLE \`Recipe\` DROP COLUMN \`category\`` — supprime l'ancienne colonne string
4. `ALTER TABLE \`Recipe\` ADD CONSTRAINT ... FOREIGN KEY (\`categoryId\`) REFERENCES \`RecipeCategory\`(\`id\`) ON DELETE SET NULL ON UPDATE NO ACTION`
5. `ALTER TABLE \`RecipeCategory\` ADD CONSTRAINT ... FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`

**ATTENTION** : Si TypeORM génère `ON DELETE CASCADE` au lieu de `ON DELETE SET NULL` pour la FK `categoryId`, corriger manuellement — la suppression d'une RecipeCategory ne doit PAS supprimer les recettes associées.

Le `down()` inverse les opérations : DROP FOREIGN KEY, ADD COLUMN `category` varchar(255) NULL, DROP COLUMN `categoryId`, DROP TABLE `RecipeCategory`.

**Pas de migration de données** : tables vides en dev (Manu a confirmé).

---

### T3 — `Recipe` entity mise à jour

```typescript
// Remplacer le champ category par :
@Column({ type: 'int', nullable: true })
categoryId!: number | null;

@ManyToOne(() => RecipeCategoryEntity, { nullable: true, onDelete: 'SET NULL', eager: false })
@JoinColumn({ name: 'categoryId' })
category!: RecipeCategoryEntity | null;
```

Importer `RecipeCategoryEntity` depuis `./recipe-category.entity`.

---

### T4 — DTO renommage `category` → `categoryName`

```typescript
// Dans CreateRecipeDto, remplacer :
@IsString()
@IsOptional()
@MaxLength(100)   // réduit de 255 à 100 (cohérent avec la colonne)
@ApiProperty({ required: false })
categoryName?: string | null;
```

`UpdateRecipeDto extends PartialType(CreateRecipeDto)` → aucun changement requis, il hérite automatiquement.

---

### T5 — `RecipesService` : findOrCreate + findAll avec join

**Méthode privée `findOrCreateCategory()` (dans la transaction) :**

```typescript
private async findOrCreateCategory(
  manager: EntityManager,
  userId: number,
  categoryName: string | null | undefined,
): Promise<number | null> {
  if (!categoryName?.trim()) return null;
  const name = categoryName.trim();
  let cat = await manager.findOne(RecipeCategoryEntity, { where: { name, userId } });
  if (!cat) {
    cat = manager.create(RecipeCategoryEntity, { name, userId });
    cat = await manager.save(cat);
  }
  return cat.id;
}
```

**Dans `create()` (dans la transaction, avant `manager.save(recipe)`) :**

```typescript
const categoryId = await this.findOrCreateCategory(manager, userId, dto.categoryName);
const recipe = manager.create(Recipe, {
  title: dto.title,
  categoryId,   // ← remplace category: dto.category
  servings: dto.servings ?? 4,
  imageUrl: dto.imageUrl ?? null,
  userId,
});
```

**Dans `update()` (dans la transaction, avant `Object.assign`) :**

```typescript
const updateFields: Partial<Recipe> = {
  ...(dto.title !== undefined && { title: dto.title }),
  ...(dto.servings !== undefined && { servings: dto.servings }),
  ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
};
if (dto.categoryName !== undefined) {
  updateFields.categoryId = await this.findOrCreateCategory(manager, userId, dto.categoryName);
}
Object.assign(recipe, updateFields);
```

**Dans `findAll()` — join + tri alphabétique par catégorie name :**

```typescript
findAll(userId: number): Promise<Recipe[]> {
  return this.repo.find({
    where: { userId },
    relations: ['category'],
    order: { category: { name: 'ASC' }, title: 'ASC' },
  });
}
```

**Dans `findOne()` :**

```typescript
relations: ['ingredients', 'steps', 'category'],
```

**Dans le constructeur de `RecipesService` :**

```typescript
@InjectRepository(RecipeCategoryEntity)
private readonly categoryRepo: Repository<RecipeCategoryEntity>,
```

(non utilisé directement mais nécessaire si on l'injecte ; sinon utiliser `manager.findOne` dans la transaction comme montré ci-dessus — pas besoin de repo séparé dans ce cas)

**Import TypeORM :** ajouter `EntityManager` dans l'import typeorm (en plus des existants).

---

### T6 — `RecipeCategoriesService` et `RecipeCategoriesController`

**`recipe-categories.service.ts` :**

```typescript
@Injectable()
export class RecipeCategoriesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  findAll(userId: number): Promise<RecipeCategoryEntity[]> {
    return this.dataSource.getRepository(RecipeCategoryEntity).find({
      where: { userId },
      order: { name: 'ASC' },
      select: ['id', 'name'],
    });
  }

  async getIngredientSuggestions(userId: number): Promise<string[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('DISTINCT ri.name', 'name')
      .from('RecipeIngredient', 'ri')
      .innerJoin('Recipe', 'r', 'ri.recipeId = r.id')
      .where('r.userId = :userId', { userId })
      .orderBy('ri.name', 'ASC')
      .getRawMany<{ name: string }>();
    return rows.map((r) => r.name);
  }

  async getUnitSuggestions(userId: number): Promise<string[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('DISTINCT ri.unit', 'unit')
      .from('RecipeIngredient', 'ri')
      .innerJoin('Recipe', 'r', 'ri.recipeId = r.id')
      .where('r.userId = :userId AND ri.unit IS NOT NULL AND ri.unit != :empty', {
        userId,
        empty: '',
      })
      .orderBy('ri.unit', 'ASC')
      .getRawMany<{ unit: string }>();
    return rows.map((r) => r.unit);
  }
}
```

**`recipe-categories.controller.ts` :**

```typescript
@ApiTags('recipe-categories')
@Controller('recipe-categories')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class RecipeCategoriesController {
  constructor(private readonly svc: RecipeCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les catégories de recettes' })
  findAll(@CurrentUser() user: { id: number }) {
    return this.svc.findAll(user.id);
  }

  @Get('ingredient-suggestions')
  @ApiOperation({ summary: 'Suggestions de noms d\'ingrédients distincts' })
  getIngredientSuggestions(@CurrentUser() user: { id: number }) {
    return this.svc.getIngredientSuggestions(user.id);
  }

  @Get('unit-suggestions')
  @ApiOperation({ summary: 'Suggestions d\'unités distinctes' })
  getUnitSuggestions(@CurrentUser() user: { id: number }) {
    return this.svc.getUnitSuggestions(user.id);
  }
}
```

**Imports à ajouter dans le controller :** `Get`, `Controller`, `UseGuards`, `SkipThrottle`, `ApiTags`, `ApiOperation`, `JwtAuthGuard`, `CurrentUser`, `RecipeCategoriesService`.

---

### T7 — `RecipesModule` mise à jour

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep, RecipeCategoryEntity])],
  controllers: [RecipesController, RecipeCategoriesController],
  providers: [RecipesService, RecipeCategoriesService],
  exports: [RecipesService, TypeOrmModule],
})
```

---

### T8 — Frontend : interfaces mises à jour

**`recipes.service.ts` — interface `Recipe` :**

```typescript
export interface RecipeCategory {
  id: number;
  name: string;
}

export interface Recipe {
  id: number;
  title: string;
  category: RecipeCategory | null;   // ← était string | null
  servings: number;
  imageUrl: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
}
```

**Payloads (category → categoryName) :**

```typescript
export interface CreateRecipePayload {
  title: string;
  categoryName?: string | null;   // ← renommé
  servings?: number;
  imageUrl?: string | null;
  ingredients: IngredientPayload[];
  steps: StepPayload[];
}

export interface UpdateRecipePayload {
  title?: string;
  categoryName?: string | null;   // ← renommé
  servings?: number;
  imageUrl?: string | null;
  ingredients?: IngredientPayload[];
  steps?: StepPayload[];
}
```

**Nouvelles méthodes dans `RecipesService` :**

```typescript
getCategories(): Observable<RecipeCategory[]> {
  return this.http.get<RecipeCategory[]>('/api/recipe-categories');
}

getIngredientSuggestions(): Observable<string[]> {
  return this.http.get<string[]>('/api/recipe-categories/ingredient-suggestions');
}

getUnitSuggestions(): Observable<string[]> {
  return this.http.get<string[]>('/api/recipe-categories/unit-suggestions');
}
```

---

### T9 — `RecipesComponent` : computed mis à jour

```typescript
// Dans categorizedRecipes computed :
const key = r.category?.name ?? 'Sans catégorie';  // ← était r.category ?? 'Sans catégorie'

// Dans filteredRecipes : étendre le filtre au nom de catégorie
return this.recipesService.recipes().filter((r) =>
  r.title.toLowerCase().includes(term) ||
  (r.category?.name ?? '').toLowerCase().includes(term),
);
```

**Dans `recipes.component.html`, flat list :**

```html
@if (recipe.category) {
  <span class="recipe-category-badge">{{ recipe.category.name }}</span>  <!-- ← était {{ recipe.category }} -->
}
```

---

### T10 — `RecipeEditorComponent` : autocomplétion catégorie

**Imports à ajouter dans `recipe-editor.component.ts` :**

```typescript
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { forkJoin } from 'rxjs';
import { RecipeCategory } from '../recipes.service';
```

**Ajouter `MatAutocompleteModule` dans `imports[]` du composant.**

**Nouveaux signaux :**

```typescript
readonly categories = signal<RecipeCategory[]>([]);
readonly categoryQuery = signal('');
readonly filteredCategories = computed(() => {
  const q = this.categoryQuery().toLowerCase();
  if (!q) return this.categories();
  return this.categories().filter((c) => c.name.toLowerCase().includes(q));
});
```

**Dans `ngOnInit()` (dans la section commune avant le if isEditMode) :**

```typescript
this.recipesService
  .getCategories()
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe((cats) => this.categories.set(cats));
```

**En mode édition, patcher la catégorie correctement :**

```typescript
this.form.patchValue({
  title: recipe.title,
  category: recipe.category?.name ?? '',   // ← était recipe.category ?? ''
  servings: recipe.servings,
  imageUrl: recipe.imageUrl ?? '',
});
```

**Dans `submit()` :**

```typescript
const payload = {
  title: raw.title,
  categoryName: raw.category || null,   // ← était category: raw.category || null
  servings: raw.servings,
  imageUrl: raw.imageUrl || null,
  ingredients: ...,
  steps: ...,
};
```

**Template `recipe-editor.component.html` — champ catégorie :**

```html
<mat-form-field appearance="outline">
  <mat-label>Catégorie</mat-label>
  <input
    matInput
    formControlName="category"
    placeholder="Ex : Desserts, Plats…"
    maxlength="100"
    [matAutocomplete]="categoryAuto"
    (input)="categoryQuery.set($any($event.target).value)"
  />
  <mat-autocomplete #categoryAuto autoActiveFirstOption>
    @for (cat of filteredCategories(); track cat.id) {
      <mat-option [value]="cat.name">{{ cat.name }}</mat-option>
    }
  </mat-autocomplete>
</mat-form-field>
```

Note : `[value]="cat.name"` — le formulaire stocke toujours le **nom** (string), pas l'objet. Cela permet la saisie libre.

---

### T11 — `RecipeIngredientRowComponent` : autocomplétion nom/unité

**Nouveaux `@Input()` et signaux dans `recipe-ingredient-row.component.ts` :**

```typescript
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@Input() ingredientSuggestions: string[] = [];
@Input() unitSuggestions: string[] = [];

readonly nameQuery = signal('');
readonly unitQuery = signal('');

readonly filteredIngredients = computed(() => {
  const q = this.nameQuery().toLowerCase();
  if (!q) return this.ingredientSuggestions;
  return this.ingredientSuggestions.filter((s) => s.toLowerCase().includes(q));
});

readonly filteredUnits = computed(() => {
  const q = this.unitQuery().toLowerCase();
  if (!q) return this.unitSuggestions;
  return this.unitSuggestions.filter((s) => s.toLowerCase().includes(q));
});
```

Ajouter `MatAutocompleteModule` dans `imports[]`.

**Template `recipe-ingredient-row.component.html` — champ `name` :**

```html
<mat-form-field appearance="outline" class="field-name">
  <mat-label>Ingrédient</mat-label>
  <input
    matInput
    formControlName="name"
    maxlength="255"
    [matAutocomplete]="nameAuto"
    (input)="nameQuery.set($any($event.target).value)"
  />
  <mat-autocomplete #nameAuto>
    @for (s of filteredIngredients(); track s) {
      <mat-option [value]="s">{{ s }}</mat-option>
    }
  </mat-autocomplete>
  <mat-error *ngIf="formGroup.get('name')?.hasError('required')">Requis</mat-error>
</mat-form-field>
```

**Template — champ `unit` :**

```html
<mat-form-field appearance="outline" class="field-unit">
  <mat-label>Unité</mat-label>
  <input
    matInput
    formControlName="unit"
    placeholder="g, ml, …"
    maxlength="50"
    [matAutocomplete]="unitAuto"
    (input)="unitQuery.set($any($event.target).value)"
  />
  <mat-autocomplete #unitAuto>
    @for (s of filteredUnits(); track s) {
      <mat-option [value]="s">{{ s }}</mat-option>
    }
  </mat-autocomplete>
</mat-form-field>
```

---

### T12 — Charger les suggestions dans `RecipeEditorComponent` et les passer aux rows

**Chargement dans `ngOnInit()` — en parallèle avec `forkJoin()` :**

```typescript
forkJoin({
  cats: this.recipesService.getCategories(),
  ings: this.recipesService.getIngredientSuggestions(),
  units: this.recipesService.getUnitSuggestions(),
})
  .pipe(takeUntilDestroyed(this.destroyRef))
  .subscribe(({ cats, ings, units }) => {
    this.categories.set(cats);
    this.ingredientSuggestions.set(ings);
    this.unitSuggestions.set(units);
  });
```

(Remplace l'appel séparé `getCategories()` de T10 — consolider en un seul `forkJoin`.)

**Dans le template, pour chaque `<app-recipe-ingredient-row>` :**

```html
<app-recipe-ingredient-row
  [formGroup]="$any(ctrl)"
  [ingredientSuggestions]="ingredientSuggestions()"
  [unitSuggestions]="unitSuggestions()"
  (deleteRow)="removeIngredient(i)"
>
</app-recipe-ingredient-row>
```

---

### Ce que cette story NE doit PAS faire

- **Pas de normalisation des noms d'ingrédients** — ils restent en string libre dans `RecipeIngredient.name`
- **Pas de migration de données existantes** — tables purgées avant déploiement (confirmé par Manu)
- **Pas d'endpoint PUT/POST/DELETE sur /api/recipe-categories** — gestion implicite via le save d'une recette
- **Pas de dédoublonnage case-insensitive côté backend lors du findOrCreate** — la comparaison est exacte (casse respectée) ; le filtre côté client est case-insensitive mais la sauvegarde est telle que saisie
- **Pas de rechargement de la liste des recettes** après create/update — les signaux existants gèrent ça
- **Pas de `MatSelect`** pour la catégorie — c'est un champ texte libre avec autocomplete (l'utilisateur peut créer de nouvelles catégories)
- **Pas de relation inverse `@OneToMany` de `RecipeCategory` vers `Recipe`** — non nécessaire pour cette story

---

### Learnings de story 5.5 applicables ici

- **`takeUntilDestroyed(this.destroyRef)`** : utiliser dans toutes les subscriptions
- **`ChangeDetectionStrategy.OnPush`** : déjà en place, ne pas toucher
- **Standalone components** : tous `standalone: true`, pas de NgModule
- **Signal pattern** : utiliser `signal()` + `computed()` pour la réactivité locale, éviter les observables dans les templates
- **`@for` syntax** : utiliser la nouvelle syntaxe Angular 17+ `@for` dans les templates (cohérent avec le code existant dans `recipe-editor.component.html`)
- **`$any()` dans les templates** pour les FormGroup typés

---

## Project Structure Notes

**Fichiers à CRÉER :**

```
backend/src/recipes/
├── recipe-category.entity.ts         (T1)
├── recipe-categories.service.ts      (T6)
└── recipe-categories.controller.ts   (T6)

backend/src/migrations/
└── TIMESTAMP-AddRecipeCategory.ts    (T2 — généré via CLI)

e2e/tests/
└── recipes-autocomplete.spec.ts      (T13)
```

**Fichiers à MODIFIER :**

```
backend/src/recipes/
├── recipe.entity.ts                   (T3)
├── recipes.service.ts                 (T5)
├── recipes.module.ts                  (T7)
├── recipes.service.spec.ts            (T14)
├── recipes.controller.spec.ts         (T14)
└── dto/
    └── create-recipe.dto.ts           (T4)

frontend/src/app/recipes/
├── recipes.service.ts                 (T8)
├── recipes.component.ts               (T9)
├── recipes.component.html             (T9)
└── recipe-editor/
    ├── recipe-editor.component.ts     (T10, T12)
    ├── recipe-editor.component.html   (T10, T12)
    ├── recipe-ingredient-row.component.ts   (T11)
    └── recipe-ingredient-row.component.html (T11)
```

---

## Références

- `backend/src/links/link-category.entity.ts` — pattern d'entité catégorie (userId, name, ManyToOne User)
- `backend/src/recipes/recipe.entity.ts` — état actuel (category string → à remplacer par FK)
- `backend/src/recipes/recipes.service.ts` — pattern transaction `dataSource.transaction()` pour create/update
- `backend/src/migrations/1780396072606-CreateRecipeRecipeIngredientRecipeStep.ts` — pattern migration TypeORM MariaDB
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts` — formulaire existant (category contrôle à ligne 77)
- `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.ts` — composant existant (à enrichir avec @Input suggestions)
- `frontend/src/app/recipes/recipes.component.ts:43-53` — `categorizedRecipes` computed à mettre à jour (clé = `r.category ?? 'Sans catégorie'`)
- Sprint Change Proposal : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-03.md`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Migration générée avec `npm run migration:generate` (pas `npx typeorm` directement — utiliser le script npm pour éviter l'erreur `__dirname is not defined in ES module scope`).
- `findOrCreateCategory` utilise `manager.findOne` dans la transaction (pas de `@InjectRepository` séparé nécessaire).
- `forkJoin` consolidé en un seul appel pour categories + ingredient-suggestions + unit-suggestions (remplace l'appel séparé de T10).

### Completion Notes List

- T1 : `RecipeCategoryEntity` créée — pattern identique à `LinkCategoryEntity`, sans `position`/`icon`/`links`.
- T2 : Migration `1780499129185-AddRecipeCategory.ts` générée — FK `categoryId` ON DELETE SET NULL ✓, FK `userId` ON DELETE CASCADE ✓.
- T3 : `Recipe.entity.ts` — `category string` remplacé par `categoryId: number | null` + relation `@ManyToOne RecipeCategoryEntity`.
- T4 : `CreateRecipeDto.categoryName` remplace `category` (MaxLength 100).
- T5 : `RecipesService` — méthode privée `findOrCreateCategory()`, `findAll` avec `relations: ['category']` et order sur `category.name`, `findOne` avec `relations: ['ingredients', 'steps', 'category']`, `create`/`update` utilisent `findOrCreateCategory`.
- T6 : `RecipeCategoriesService` + `RecipeCategoriesController` créés — 3 endpoints GET (liste, ingredient-suggestions, unit-suggestions).
- T7 : `RecipesModule` mis à jour avec `RecipeCategoryEntity`, `RecipeCategoriesController`, `RecipeCategoriesService`.
- T8 : Frontend `RecipesService` — interface `Recipe.category` → `RecipeCategory | null`, payloads `categoryName`, 3 nouvelles méthodes HTTP.
- T9 : `RecipesComponent` — `categorizedRecipes` et `filteredRecipes` utilisent `r.category?.name`, badge HTML mis à jour.
- T10 : `RecipeEditorComponent` — `MatAutocompleteModule`, signaux `categories`/`categoryQuery`/`filteredCategories`, `forkJoin` pour charger données, patch `recipe.category?.name ?? ''`, payload `categoryName`.
- T11 : `RecipeIngredientRowComponent` — `@Input` suggestions, signaux `nameQuery`/`unitQuery`, computed `filteredIngredients`/`filteredUnits`, `MatAutocomplete` dans le template.
- T12 : Signaux `ingredientSuggestions`/`unitSuggestions` dans `RecipeEditorComponent`, passés aux rows.
- T13 : 5 tests E2E Playwright couvrant AC6 (autocomplete catégorie + filtrage case-insensitive), AC7 (sélection → groupement), AC9 (autocomplete ingrédient), AC8 (sans catégorie).
- T14 : `recipes.service.spec.ts` et `recipes.controller.spec.ts` mis à jour — `category: 'Desserts'` → objet `RecipeCategory`, nouveaux tests `findOrCreateCategory`, `findAll` avec relations. Frontend `recipes.service.spec.ts` également corrigé.
- **Résultat tests** : 20 tests backend recipes + 127 tests frontend — tous verts. Build TypeScript sans erreur.

### File List

backend/src/recipes/recipe-category.entity.ts
backend/src/migrations/1780499129185-AddRecipeCategory.ts
backend/src/recipes/recipe.entity.ts
backend/src/recipes/dto/create-recipe.dto.ts
backend/src/recipes/recipes.service.ts
backend/src/recipes/recipe-categories.service.ts
backend/src/recipes/recipe-categories.controller.ts
backend/src/recipes/recipes.module.ts
backend/src/recipes/recipes.service.spec.ts
backend/src/recipes/recipes.controller.spec.ts
frontend/src/app/recipes/recipes.service.ts
frontend/src/app/recipes/recipes.service.spec.ts
frontend/src/app/recipes/recipes.component.ts
frontend/src/app/recipes/recipes.component.html
frontend/src/app/recipes/recipe-editor/recipe-editor.component.ts
frontend/src/app/recipes/recipe-editor/recipe-editor.component.html
frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.ts
frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html
e2e/tests/recipes-autocomplete.spec.ts

### Change Log

- 2026-06-03 : Story créée — analyse exhaustive : état actuel du code (recipe.entity category string, recipes.service.ts findAll sans join, RecipeIngredientRow sans autocomplete), pattern findOrCreate dans transaction, MatAutocomplete avec signal filteredCategories/filteredIngredients/filteredUnits, stratégie forkJoin pour charger les suggestions en parallèle, ON DELETE SET NULL critique pour la FK categoryId
- 2026-06-03 : Implémentation complète — T1 à T14 réalisés, 20 tests backend + 127 tests frontend verts, build TypeScript sans erreur
