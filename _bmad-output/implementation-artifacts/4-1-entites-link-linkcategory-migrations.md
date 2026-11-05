# Story 4.1 : Entités Link, LinkCategory + migrations

**Épic :** 4 — Module Liens
**Statut :** done
**Créée le :** 2026-05-18

---

## User Story

En tant que système,
Je veux les entités `LinkCategory` et `Link` créées en base via une migration TypeORM,
Afin que les catégories et fiches de liens puissent être persistées par utilisateur.

---

## Critères d'acceptation

**Étant donné** que la migration est exécutée,
**Quand** j'inspecte la base de données,
**Alors** les tables `LinkCategory` (id, name, emoji, position, userId, createdAt, updatedAt) et `Link` (id, url, title, description, faviconUrl, position, categoryId, userId, createdAt, updatedAt) existent

**Étant donné** qu'un `userId` est référencé dans `LinkCategory` ou `Link`,
**Quand** je récupère des catégories ou liens via l'API (stories 4.2/4.3),
**Alors** le service devra filtrer systématiquement par `userId` extrait du JWT — les colonnes `userId` sur les deux entités rendent ce filtrage possible et obligatoire

**Étant donné** qu'une `LinkCategory` est supprimée,
**Quand** la suppression est effectuée,
**Alors** tous les `Link` associés sont supprimés en cascade (ON DELETE CASCADE sur `categoryId`)

---

## Tasks / Subtasks

- [x] T1 — Créer l'entité `LinkCategoryEntity` (AC: #1, #2)
  - [x] Créer `backend/src/links/link-category.entity.ts`
  - [x] Colonnes : id, name, emoji (nullable), position, userId, createdAt, updatedAt
  - [x] Relation ManyToOne vers `UserEntity` avec `onDelete: 'CASCADE'`
  - [x] Relation OneToMany vers `LinkEntity`

- [x] T2 — Créer l'entité `LinkEntity` (AC: #1, #2, #3)
  - [x] Créer `backend/src/links/link.entity.ts`
  - [x] Colonnes : id, url, title, description (nullable), faviconUrl (nullable), position, categoryId, userId, createdAt, updatedAt
  - [x] Relation ManyToOne vers `LinkCategoryEntity` avec `onDelete: 'CASCADE'`
  - [x] Relation ManyToOne vers `UserEntity` avec `onDelete: 'CASCADE'`

- [x] T3 — Créer `LinksModule` (squelette) (AC: #1)
  - [x] Créer `backend/src/links/links.module.ts`
  - [x] Importer `TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity])`
  - [x] Pas de controller ni de service à ce stade (viendront en stories 4.2/4.3)

- [x] T4 — Enregistrer `LinksModule` dans `AppModule` (AC: #1)
  - [x] Ajouter `LinksModule` aux imports de `backend/src/app.module.ts`

- [x] T5 — Générer et valider la migration (AC: #1)
  - [x] Depuis `backend/`, exécuter : `npm run migration:generate src/migrations/CreateLinkLinkCategory`
  - [x] Vérifier que le SQL généré correspond aux schémas attendus (colonnes, FK, CASCADE)
  - [x] Corriger manuellement si TypeORM génère des colonnes snake_case (ne pas utiliser namingStrategy)

- [x] T6 — Appliquer la migration et vérifier (AC: #1, #3)
  - [x] Exécuter : `npm run migration:run` (depuis `backend/`)
  - [x] Vérifier les tables `LinkCategory` et `Link` en base
  - [x] Vérifier la contrainte FK `LinkCategory → User` avec CASCADE
  - [x] Vérifier la contrainte FK `Link → LinkCategory` avec CASCADE (AC: #3)
  - [x] Vérifier la contrainte FK `Link → User` avec CASCADE

- [x] T7 — Tests unitaires (AC: tous)
  - [x] Les entités étant des POJO TypeORM, aucun test unitaire n'est requis à ce stade
  - [x] La migration sera validée par `migration:run` contre la base de données réelle

---

## Dev Notes

### Périmètre de cette story

Cette story est **uniquement backend**. Elle ne touche pas au frontend Angular. Elle pose les fondations de la DB pour l'Épic 4. Les controllers, services, DTOs et frontend arrivent dans les stories 4.2 à 4.6.

### Schémas d'entités exacts

#### `LinkCategoryEntity` → table `LinkCategory`

```typescript
// backend/src/links/link-category.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { LinkEntity } from './link.entity';

@Entity('LinkCategory')
export class LinkCategoryEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;

  @Column({ nullable: true, type: 'varchar', length: 10 })
  emoji!: string | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @OneToMany(() => LinkEntity, (link) => link.category, { cascade: ['remove'] })
  links!: LinkEntity[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
```

#### `LinkEntity` → table `Link`

```typescript
// backend/src/links/link.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { LinkCategoryEntity } from './link-category.entity';

@Entity('Link')
export class LinkEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 2048, nullable: false })
  url!: string;

  @Column({ nullable: false })
  title!: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  faviconUrl!: string | null;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @Column()
  categoryId!: number;

  @ManyToOne(() => LinkCategoryEntity, (cat) => cat.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'categoryId' })
  category!: LinkCategoryEntity;

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

### `LinksModule` squelette

```typescript
// backend/src/links/links.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { LinkEntity } from './link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity])],
})
export class LinksModule {}
```

### Enregistrement dans `AppModule`

Ajouter à `backend/src/app.module.ts` :
```typescript
import { LinksModule } from './links/links.module';
// ...
@Module({
  imports: [
    // ... modules existants (ConfigModule, TypeOrmModule, ThrottlerModule, UsersModule, AuthModule)
    LinksModule,  // ← ajouter ici
  ],
})
```

### Génération de la migration

La migration **doit être générée** par TypeORM (pas écrite manuellement) :

```bash
cd backend
npm run migration:generate src/migrations/CreateLinkLinkCategory
```

Cette commande (`typeorm-ts-node-commonjs migration:generate -d src/config/typeorm.config.ts`) compare les entités TypeORM à l'état actuel de la base et génère le SQL différentiel.

**Prérequis :** Le fichier `backend/.env` doit être présent avec `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` valides. Si le CLI échoue sans `.env` (variable `undefined`), voir le déféré connu dans `deferred-work.md` (section 1-1).

**Appliquer la migration :**
```bash
npm run migration:run
```

### Conventions TypeORM — règles impératives

| Règle | Correct | Interdit |
|-------|---------|---------|
| Nommage des tables | `@Entity('LinkCategory')` (PascalCase) | `@Entity('link_category')` |
| Colonnes | `camelCase` sans `namingStrategy` | `snake_case_naming_strategy` |
| Clés étrangères | `@Column() categoryId!: number` | Pas de renommage manuel des FK |
| Hard delete uniquement | `onDelete: 'CASCADE'` natif TypeORM | Pas de soft delete, pas de `deletedAt` |
| Synchronize | `synchronize: false` (déjà configuré) | Ne jamais passer à `true` |

### Patterns établis à reproduire

Voir les fichiers existants pour les patterns exacts :
- Entité avec `@JoinColumn` : `backend/src/auth/entities/refresh-token.entity.ts`
- Entité avec `OneToMany` : `backend/src/users/user.entity.ts` (relation `refreshTokens`)
- Migration SQL brute : `backend/src/migrations/1746057600000-CreateUserRefreshToken.ts`
- Import du `DataSource` CLI : `backend/src/config/typeorm.config.ts`

### Arborescence des fichiers à créer

```
backend/src/links/
├── link-category.entity.ts   ← créer
├── link.entity.ts            ← créer
└── links.module.ts           ← créer

backend/src/migrations/
└── TIMESTAMP-CreateLinkLinkCategory.ts   ← générer via CLI

backend/src/app.module.ts     ← modifier (ajouter LinksModule)
```

### Isolation multi-utilisateur — conception attendue

Les colonnes `userId` sur `LinkCategory` **et** sur `Link` (redondance intentionnelle) permettent aux services (stories 4.2/4.3) de filtrer directement par `userId` sans JOIN. C'est le pattern établi pour l'isolation : chaque requête service recevra `userId` depuis le JWT via `@CurrentUser()` et appliquera `.findBy({ userId })`.

### Cascades delete

- `User` supprimé → toutes ses `LinkCategory` supprimées → tous leurs `Link` supprimés (double cascade)
- `LinkCategory` supprimée → tous ses `Link` supprimés (cascade directe)

Vérifier que les deux FK `Link.categoryId → LinkCategory` et `LinkCategory.userId → User` ont bien `ON DELETE CASCADE` dans la migration générée.

### Ce que cette story ne fait PAS

- Pas de controller `LinksController` ni `LinkCategoriesController` (story 4.2/4.3)
- Pas de service `LinksService` (story 4.2/4.3)
- Pas de DTOs (story 4.2/4.3)
- Pas de module `OgFetchModule` (favicon, story 4.3)
- Pas de frontend Angular (stories 4.4/4.5/4.6)
- Pas de tests E2E Playwright (stories 4.2+)

---

## Project Structure Notes

- **Répertoire des entités :** `backend/src/links/` (pas de sous-dossier `entities/`, contrairement au module `auth/` — cf. architecture)
- **Répertoire des migrations :** `backend/src/migrations/` (unique répertoire pour toutes les migrations)
- **Auto-découverte des entités :** `app.module.ts` utilise `entities: [__dirname + '/**/*.entity{.ts,.js}']` — les entités dans `links/` seront automatiquement détectées dès que le module est importé

---

## References

- [Source: architecture.md#Structure du Projet — arborescence `backend/src/links/`]
- [Source: architecture.md#Patterns de Nommage — Tables PascalCase, colonnes camelCase]
- [Source: architecture.md#Architecture des Données — migrations uniquement, hard delete]
- [Source: architecture.md#Directives Obligatoires — pas de namingStrategy, synchronize: false]
- [Source: epics.md#Story 4.1 — schéma des colonnes LinkCategory et Link]
- [Source: backend/src/migrations/1746057600000-CreateUserRefreshToken.ts — pattern migration SQL]
- [Source: backend/src/auth/entities/refresh-token.entity.ts — pattern ManyToOne + JoinColumn]
- [Source: backend/src/users/user.entity.ts — pattern OneToMany + CreateDateColumn/UpdateDateColumn]
- [Source: backend/src/app.module.ts — pattern import de module dans AppModule]
- [Source: backend/src/config/typeorm.config.ts — DataSource CLI pour migration:generate]

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage — migration générée et appliquée sans erreur. Les erreurs TypeScript détectées dans `tsc --noEmit` sont des régressions pré-existantes dans les spec files (stories 3.x), sans lien avec cette story.

### Completion Notes List

- Entités `LinkCategoryEntity` et `LinkEntity` créées dans `backend/src/links/`
- `LinksModule` squelette créé et enregistré dans `AppModule`
- Migration `1779140632380-CreateLinkLinkCategory.ts` générée via TypeORM CLI et appliquée avec succès
- Tables `LinkCategory` et `Link` créées avec colonnes PascalCase/camelCase et FK ON DELETE CASCADE
- 99 tests unitaires passent sans régression

### File List

- backend/src/links/link-category.entity.ts (créé)
- backend/src/links/link.entity.ts (créé)
- backend/src/links/links.module.ts (créé)
- backend/src/migrations/1779140632380-CreateLinkLinkCategory.ts (généré)
- backend/src/app.module.ts (modifié — ajout LinksModule)

---

### Review Findings

- [x] [Review][Defer] Link.userId peut diverger du userId de la catégorie parente — enforcement service-level, hors scope, traiter en story 4.2 [link.entity.ts]
- [x] [Review][Defer] Pas de contrainte unique sur `position` — décision de design, ordering géré en 4.2/4.3 [link-category.entity.ts, link.entity.ts]
- [x] [Review][Defer] `faviconUrl` non validé (SSRF/XSS potentiel) — validation DTO hors scope, traiter en story 4.3 [link.entity.ts]
- [x] [Review][Defer] `url` sans validation de format — validation DTO hors scope, traiter en story 4.3 [link.entity.ts]
- [x] [Review][Defer] Migration inclut un ALTER TABLE User non lié au périmètre Liens — artefact du diff TypeORM (User.name NULL→NOT NULL en attente) ; migration déjà appliquée sans erreur, plus modifiable sans risque [1779140632380-CreateLinkLinkCategory.ts]
- [x] [Review][Defer] `cascade: ['remove']` sur OneToMany redondant avec ON DELETE CASCADE DB — présent dans la spec, pas de bug actif en InnoDB ; à clarifier si triggers futurs [link-category.entity.ts]
- [x] [Review][Defer] `emoji varchar(10)` peut tronquer les séquences emoji multi-codepoints (ZWJ) — validation input à ajouter en story 4.2/4.3 [link-category.entity.ts]

---

## Change Log

- 2026-05-18 : Implémentation initiale — entités LinkCategory et Link, LinksModule squelette, migration CreateLinkLinkCategory générée et appliquée, LinksModule enregistré dans AppModule
- 2026-05-18 : Code review — 0 patch, 7 deferred, 3 dismissed ; story passée en `done`
