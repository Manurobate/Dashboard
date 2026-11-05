# Story 5.1 : Entités Recipe, RecipeIngredient, RecipeStep + migrations

**Épic :** 5 — Module Recettes  
**Statut :** done  
**Créée le :** 2026-06-02

---

## User Story

En tant que système,  
Je veux les entités `Recipe`, `RecipeIngredient` et `RecipeStep` créées en base via une migration TypeORM,  
Afin que les recettes avec leurs ingrédients structurés et leurs étapes puissent être persistées par utilisateur.

---

## Critères d'acceptation

**AC1 — Tables créées avec le bon schéma**  
**Étant donné** que la migration est exécutée,  
**Quand** j'inspecte la base de données,  
**Alors** les tables existent avec les colonnes :  
- `Recipe` (id, title, category, servings, imageUrl, userId, createdAt, updatedAt)  
- `RecipeIngredient` (id, quantity, unit, name, position, recipeId)  
- `RecipeStep` (id, content, position, recipeId)

**AC2 — Isolation des données par userId**  
**Étant donné** qu'un `userId` est référencé dans `Recipe`,  
**Quand** je récupère des recettes via l'API (stories 5.2+),  
**Alors** le service filtre systématiquement par `userId` extrait du JWT — aucune recette d'un autre compte n'est accessible

**AC3 — Cascade delete**  
**Étant donné** qu'une `Recipe` est supprimée,  
**Quand** la suppression est effectuée,  
**Alors** tous ses `RecipeIngredient` et `RecipeStep` sont supprimés en cascade (FK `ON DELETE CASCADE` + `cascade: ['remove']` TypeORM)

---

## Tâches / Sous-tâches

### T0 — Pré-requis : Corrections E2E (SCP-2026-06-01) — AVANT TOUT LE RESTE

> ⚠️ Le CI est actuellement rouge. Ces 3 corrections DOIVENT être appliquées en premier. Lire `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01.md` pour les diffs exacts.

- [x] **C1 — `e2e/global-setup.ts` : seed idempotent** (AC: T0)
  - [x] Remplacer le check `cats.length < 2` par une suppression propre des catégories `E2E Category A` et `E2E Category B` puis recréation
  - [x] Vérifier que 2 runs consécutifs de `npx playwright test` donnent le même résultat
- [x] **C3 — `e2e/tests/links-icon-picker.spec.ts` : cleanup + sélecteur robuste** (AC: T0)
  - [x] Ajouter un `afterEach` qui supprime la catégorie `Test Icône` via API DELETE
  - [x] Remplacer `.first()` par `page.locator('app-link-category-card', { hasText: 'E2E Category A' }).locator('button[aria-label="Modifier la catégorie"]').click()`
- [x] **C4 — `e2e/tests/admin-responsive.spec.ts` : auth dans afterEach** (AC: T0)
  - [x] Ajouter `await request.post('/api/auth/login', { data: { username: adminEmail, password: adminPassword } })` au début du `afterEach` avant `request.get('/api/users')`
- [x] Valider : `npx playwright test` passe en vert localement

### T1 — Entités TypeORM (backend) (AC: AC1, AC2, AC3)

- [x] Créer `backend/src/recipes/recipe.entity.ts`
  - [x] `id` PrimaryGeneratedColumn, `title` varchar(255) required, `category` varchar(255) nullable, `servings` int default 4, `imageUrl` varchar(2083) nullable, `userId` int FK→User onDelete CASCADE
  - [x] `@CreateDateColumn()` / `@UpdateDateColumn()`
  - [x] `@OneToMany(() => RecipeIngredient, cascade: ['remove'])` + `@OneToMany(() => RecipeStep, cascade: ['remove'])`
- [x] Créer `backend/src/recipes/recipe-ingredient.entity.ts`
  - [x] `id`, `quantity` decimal(10,3) + transformer number↔string (voir Dev Notes), `unit` varchar(50) nullable, `name` varchar(255) required, `position` int default 0, `recipeId` FK→Recipe onDelete CASCADE
- [x] Créer `backend/src/recipes/recipe-step.entity.ts`
  - [x] `id`, `content` text required, `position` int default 0, `recipeId` FK→Recipe onDelete CASCADE

### T2 — Module NestJS RecipesModule (AC: AC1)

- [x] Créer `backend/src/recipes/recipes.module.ts` : `TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])` + `exports: [TypeOrmModule]`
- [x] Importer `RecipesModule` dans `backend/src/app.module.ts`

### T3 — Migration TypeORM (AC: AC1, AC3)

- [x] Générer la migration depuis `backend/` : `npm run migration:generate -- src/migrations/CreateRecipeRecipeIngredientRecipeStep`
- [x] Vérifier que le SQL généré contient les 3 `CREATE TABLE` dans `up()` et 3 `DROP TABLE` dans `down()` (ordre inverse pour les FK)
- [x] Vérifier la présence des FK `ON DELETE CASCADE` dans le SQL pour RecipeIngredient→Recipe et RecipeStep→Recipe
- [x] Vérifier que la migration ne contient pas d'ALTER TABLE non liés (si oui : voir Dev Notes T3)

### T4 — DTOs minimaux (pour cohérence avec stories 5.2–5.5)

- [x] Créer `backend/src/recipes/dto/create-recipe.dto.ts` : `title` (required, MaxLength 255), `category` (optional, MaxLength 255), `servings` (optional, IsInt, Min 1), `imageUrl` (optional, IsUrl, MaxLength 2083)
- [x] Créer `backend/src/recipes/dto/update-recipe.dto.ts` : `PartialType(CreateRecipeDto)`
- [x] Créer `backend/src/recipes/dto/create-recipe-ingredient.dto.ts` : `quantity` (required, IsNumber, Min 0.001), `unit` (optional, MaxLength 50), `name` (required, MaxLength 255), `position` (optional, IsInt)
- [x] Créer `backend/src/recipes/dto/create-recipe-step.dto.ts` : `content` (required, IsString), `position` (optional, IsInt)

> Décorateurs `@ApiProperty()` à ajouter sur chaque champ pour Swagger (voir pattern dans `create-link.dto.ts`).

### Review Findings

- [x] [Review][Patch] `position` accepte les entiers négatifs — ajouter `@Min(0)` sur les deux DTOs [backend/src/recipes/dto/create-recipe-ingredient.dto.ts, backend/src/recipes/dto/create-recipe-step.dto.ts]
- [x] [Review][Patch] `quantity` sans borne supérieure — DB lance un 500 pour valeur ≥ 10 000 000 — ajouter `@Max(9999999.999)` [backend/src/recipes/dto/create-recipe-ingredient.dto.ts]
- [x] [Review][Patch] `quantity` accepte >3 décimales — DB tronque silencieusement sans erreur — ajouter `@IsNumber({}, { maxDecimalPlaces: 3 })` [backend/src/recipes/dto/create-recipe-ingredient.dto.ts]
- [x] [Review][Defer] Chaîne vide `""` acceptée pour `unit` et `category` — `@IsOptional()` ne bloque pas `""` ; pattern `@Transform` trim de `create-link.dto.ts` non appliqué ici — deferred, hors spec story 5.1
- [x] [Review][Defer] `content` de CreateRecipeStepDto sans `@MaxLength` — colonne TEXT (65 535 octets) sans limite DTO — deferred, hors spec story 5.1
- [x] [Review][Defer] `servings` sans borne supérieure — `@Max()` absent, INT max (2 147 483 647) passe sans erreur — deferred, hors spec story 5.1

---

## Dev Notes

### T0 — Contexte E2E : pourquoi maintenant

Le `sprint-change-proposal-2026-06-01.md` (approuvé) documente 4 défauts structurels dans la suite E2E provoquant des échecs intermittents en CI. Les corrections C1, C3, C4 ont été validées par Manu. Le CI doit repasser au vert avant d'ajouter des tests E2E pour l'Épic 5 (stories 5.2+).

**C1 — Seed idempotent :**
```typescript
// e2e/global-setup.ts — pattern APRÈS
const catsRes = await page.request.get('/api/link-categories');
const cats = (await catsRes.json()) as { id: number; name: string }[];
const e2eCats = cats.filter(c => c.name === 'E2E Category A' || c.name === 'E2E Category B');
for (const cat of e2eCats) {
  await page.request.delete(`/api/link-categories/${cat.id}`);
}
// puis recréer les 2 catégories avec 2 liens chacune (comme avant)
```

**C3 — Sélecteur robuste dans links-icon-picker.spec.ts :**
```typescript
// afterEach cleanup :
test.afterEach(async ({ request }) => {
  // ré-authentifier (cookie expiré possible après le test)
  await request.post('/api/auth/login', { data: { username, password } });
  const cats = await (await request.get('/api/link-categories')).json() as { id: number; name: string }[];
  for (const cat of cats.filter((c: any) => c.name === 'Test Icône')) {
    await request.delete(`/api/link-categories/${cat.id}`);
  }
});

// Ciblage explicite APRÈS (remplacement du .first() fragile) :
const catACard = page.locator('app-link-category-card', { hasText: 'E2E Category A' });
await catACard.locator('button[aria-label="Modifier la catégorie"]').click();
```

**C4 — Auth dans afterEach admin-responsive.spec.ts :**
```typescript
test.afterEach(async ({ request }) => {
  if (!createdEmail) return;
  // ← AJOUTER cette ligne :
  await request.post('/api/auth/login', { data: { username: adminEmail, password: adminPassword } });
  const usersRes = await request.get('/api/users'); // maintenant 200 au lieu de 401
  // ... reste inchangé
  createdEmail = '';
});
```

---

### T1 — Code des entités

**`recipe.entity.ts` :**
```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  CreateDateColumn, UpdateDateColumn, JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';

@Entity()
export class Recipe {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  category!: string | null;

  @Column({ type: 'int', default: 4 })
  servings!: number;

  @Column({ type: 'varchar', length: 2083, nullable: true })
  imageUrl!: string | null;

  @Column()
  userId!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @OneToMany(() => RecipeIngredient, (ri) => ri.recipe, { cascade: ['remove'] })
  ingredients!: RecipeIngredient[];

  @OneToMany(() => RecipeStep, (rs) => rs.recipe, { cascade: ['remove'] })
  steps!: RecipeStep[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

**`recipe-ingredient.entity.ts` :**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Recipe } from './recipe.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string) => parseFloat(value),
};

@Entity()
export class RecipeIngredient {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, transformer: decimalTransformer })
  quantity!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  unit!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  recipeId!: number;

  @ManyToOne(() => Recipe, (r) => r.ingredients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;
}
```

**`recipe-step.entity.ts` :**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Recipe } from './recipe.entity';

@Entity()
export class RecipeStep {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  content!: string;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  recipeId!: number;

  @ManyToOne(() => Recipe, (r) => r.steps, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;
}
```

> **⚠️ `decimal` → `string` MySQL/MariaDB** : le driver `mysql2` retourne les colonnes `DECIMAL` en `string` par défaut. Sans le `transformer`, `quantity * (newServings / recipe.servings)` retourne `NaN`. Le transformer `parseFloat` est **obligatoire** pour FR27 (recalcul des quantités par convive).

> **`imageUrl` longueur 2083** : longueur standard pour les URLs (limite historique IE). Préférable à `text` car permet un index éventuel.

---

### T2 — RecipesModule

```typescript
// backend/src/recipes/recipes.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])],
  exports: [TypeOrmModule],
})
export class RecipesModule {}
```

Dans `backend/src/app.module.ts`, ajouter `RecipesModule` dans `imports[]` (voir `LinksModule` pour le pattern exact).

---

### T3 — Migration TypeORM

**Convention OBLIGATOIRE : jamais éditée manuellement.**

```bash
# Depuis backend/ :
npm run migration:generate -- src/migrations/CreateRecipeRecipeIngredientRecipeStep
```

**À vérifier dans le SQL `up()` généré :**
- 3 `CREATE TABLE` : `Recipe`, `RecipeIngredient`, `RecipeStep`
- FK `RecipeIngredient.recipeId → Recipe.id ON DELETE CASCADE`
- FK `RecipeStep.recipeId → Recipe.id ON DELETE CASCADE`
- FK `Recipe.userId → User.id ON DELETE CASCADE`

**`down()` doit supprimer dans l'ordre inverse** (RecipeStep, RecipeIngredient, Recipe) pour respecter les FK.

> **Attention aux migrations parasites** : si des modifications d'entités non migrées traînent (ex: ajout de colonne oublié dans une autre entité), TypeORM peut les inclure. Vérifier que la migration ne contient **que** les tables Recipe/RecipeIngredient/RecipeStep. Si c'est le cas, mettre de côté les ALTER parasites et les traiter séparément.

---

### Learnings des stories précédentes (Épic 4)

- **Pattern migration** : même workflow que `4-1`, `4-9` — generate → vérifier SQL → committer tel quel. Ne jamais éditer le fichier généré.
- **`cascade: ['remove']` + `onDelete: 'CASCADE'`** : utiliser les deux. `cascade: ['remove']` = suppression via `repository.remove()` ORM. `onDelete: 'CASCADE'` = suppression DB directe (DELETE SQL). Pattern validé sur `LinkCategory → Link`.
- **FK sans `userId` sur RecipeIngredient/RecipeStep** : l'isolation userId se fait au niveau `Recipe` uniquement — RecipeIngredient et RecipeStep sont accessibles uniquement via leur `recipeId`, et Recipe filtre par `userId`. Ne pas ajouter de `userId` sur les entités enfants.
- **Colonnes obligatoires** : pas besoin de `nullable: false` explicite — c'est le défaut TypeORM.
- **Pas de service/controller dans cette story** : la story 5.2 crée le service avec `GET /api/recipes`. Cette story pose uniquement le schéma DB.
- **Signals + OnPush + `vi.fn()`** : patterns établis — s'appliquent aux tests frontend des stories 5.2+, pas pertinents ici (story backend uniquement).

---

### Isolation userId — anti-pattern à éviter

```typescript
// ✅ Correct : filtrage au niveau Recipe
this.recipeRepository.find({ where: { userId } });

// ❌ Interdit : accès sans filtre userId
this.recipeRepository.find();

// ❌ Interdit : RecipeIngredient accessible sans passer par Recipe
this.ingredientRepository.find({ where: { recipeId } }); // manque la vérification que la Recipe appartient à l'utilisateur
// → En stories 5.2+, toujours vérifier que Recipe.userId === currentUser.id avant de retourner ses ingredients
```

---

## Project Structure Notes

**Fichiers à créer :**
```
backend/src/recipes/
├── recipes.module.ts                                    ← CRÉER
├── recipe.entity.ts                                     ← CRÉER
├── recipe-ingredient.entity.ts                          ← CRÉER
├── recipe-step.entity.ts                                ← CRÉER
└── dto/
    ├── create-recipe.dto.ts                             ← CRÉER
    ├── update-recipe.dto.ts                             ← CRÉER
    ├── create-recipe-ingredient.dto.ts                  ← CRÉER
    └── create-recipe-step.dto.ts                        ← CRÉER
backend/src/migrations/
└── XXXXXX-CreateRecipeRecipeIngredientRecipeStep.ts     ← GÉNÉRÉ (jamais édité)
```

**Fichiers à modifier :**
```
backend/src/app.module.ts                               ← Ajouter RecipesModule dans imports[]
e2e/global-setup.ts                                     ← C1 : seed idempotent
e2e/tests/links-icon-picker.spec.ts                     ← C3 : cleanup afterEach + sélecteur robuste
e2e/tests/admin-responsive.spec.ts                      ← C4 : auth dans afterEach
```

**Pas de fichier frontend dans cette story.** La route `/recipes`, le module Angular et les composants viennent en Stories 5.2–5.5.

### Références

- `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-01.md` — Diffs exacts des corrections E2E (C1, C3, C4)
- `backend/src/links/link-category.entity.ts` — Pattern entity avec OneToMany + cascade
- `backend/src/links/link.entity.ts` — Pattern entity avec ManyToOne userId FK
- `backend/src/links/links.module.ts` — Pattern TypeOrmModule.forFeature + exports
- `backend/src/app.module.ts` — Où importer RecipesModule
- `backend/src/links/dto/create-link.dto.ts` — Pattern DTO avec class-validator + @ApiProperty

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

_Aucun blocage rencontré._

### Completion Notes List

- T0 : Corrections E2E C1, C3, C4 déjà en place dans les fichiers (sprint-change-proposal-2026-06-01 marqué "Réalisé"). Cochées sans modification.
- T1 : Entités Recipe, RecipeIngredient, RecipeStep créées avec les types exacts du spec : `@Entity('Recipe')`, `@Entity('RecipeIngredient')`, `@Entity('RecipeStep')`. Le transformer `parseFloat` pour `decimal` est implémenté (obligatoire pour MariaDB/mysql2). Cascade double (`cascade: ['remove']` ORM + `onDelete: 'CASCADE'` DB) appliquée.
- T2 : RecipesModule créé avec `TypeOrmModule.forFeature` et `exports: [TypeOrmModule]`. Importé dans app.module.ts à côté de LinksModule.
- T3 : Migration `1780396072606-CreateRecipeRecipeIngredientRecipeStep.ts` générée. Vérifications : 3 CREATE TABLE, 3 FK ON DELETE CASCADE, 3 DROP FK + 3 DROP TABLE dans down(), aucun ALTER TABLE parasite.
- T4 : 4 DTOs créés avec class-validator + @ApiProperty. PartialType depuis @nestjs/swagger.
- Validation : 140/140 tests unitaires passent, lint sans erreur sur les nouveaux fichiers.

### File List

backend/src/recipes/recipe.entity.ts
backend/src/recipes/recipe-ingredient.entity.ts
backend/src/recipes/recipe-step.entity.ts
backend/src/recipes/recipes.module.ts
backend/src/recipes/dto/create-recipe.dto.ts
backend/src/recipes/dto/update-recipe.dto.ts
backend/src/recipes/dto/create-recipe-ingredient.dto.ts
backend/src/recipes/dto/create-recipe-step.dto.ts
backend/src/migrations/1780396072606-CreateRecipeRecipeIngredientRecipeStep.ts
backend/src/app.module.ts

### Change Log

- 2026-06-02 : Création des entités Recipe, RecipeIngredient, RecipeStep (T1) + RecipesModule (T2) + migration TypeORM (T3) + DTOs minimaux (T4). Corrections E2E C1/C3/C4 déjà présentes.

### Status

done
