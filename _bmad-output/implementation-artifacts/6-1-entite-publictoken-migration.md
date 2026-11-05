---
baseline_commit: 2ea0f5c6af8e9b8ea521f55cc89d55aaf3d6d7ec
---

# Story 6.1 : Entité PublicToken + migration

**Épic :** 6 — Partage public (recettes)  
**Statut :** done  
**Créée le :** 2026-06-19  

---

## User Story

En tant que système,  
Je veux l'entité `PublicToken` créée en base via une migration TypeORM,  
Afin que les jetons de partage public puissent être stockés, validés et révoqués.

---

## Critères d'acceptation

**AC1 — Table PublicToken créée**  
**Étant donné** que la migration est exécutée,  
**Quand** j'inspecte la base de données,  
**Alors** la table `PublicToken` existe avec les colonnes : id, token (varchar 255, unique + index), resourceType (varchar 20), resourceId (int), userId (int, FK → User ON DELETE CASCADE), expiresAt (datetime nullable), createdAt (datetime auto), revokedAt (datetime nullable)  
> Note : la valeur `'note'` de `resourceType` sera utilisée activement à partir de l'Épic 8.

**AC2 — Logique de validation du token**  
**Étant donné** qu'un token est consulté par l'API publique,  
**Quand** le service vérifie sa validité,  
**Alors** il contrôle : token existant **ET** `revokedAt IS NULL` **ET** (`expiresAt IS NULL` **OU** `expiresAt > NOW()`)

**AC3 — Cascade delete sur suppression utilisateur**  
**Étant donné** qu'un `userId` est référencé dans `PublicToken`,  
**Quand** l'utilisateur est supprimé,  
**Alors** tous ses tokens sont supprimés en cascade (enforced par la contrainte FK BDD)

---

## Tâches / Sous-tâches

### T1 — Créer l'entité PublicToken (AC: AC1, AC2, AC3)

- [x] Créer `backend/src/sharing/public-token.entity.ts`
  - [x] Colonnes : id, token (unique), resourceType, resourceId, userId, expiresAt (nullable), createdAt, revokedAt (nullable)
  - [x] Relation `@ManyToOne(() => UserEntity)` avec `onDelete: 'CASCADE'`

### T2 — Créer le module SharingModule (AC: AC1)

- [x] Créer `backend/src/sharing/sharing.module.ts`
  - [x] Import `TypeOrmModule.forFeature([PublicToken])`
  - [x] Export `TypeOrmModule` (pour Story 6.2)

### T3 — Enregistrer SharingModule dans AppModule (AC: AC1)

- [x] Modifier `backend/src/app.module.ts`
  - [x] Importer et ajouter `SharingModule` dans le tableau `imports` (après `RecipesModule`)

### T4 — Générer et exécuter la migration TypeORM (AC: AC1, AC3)

- [x] Depuis `backend/` : `npm run migration:generate -- src/migrations/CreatePublicToken`
- [x] Inspecter la migration générée — supprimer toute opération parasite sur des tables existantes (pattern connu, voir Dev Notes T4)
- [x] Exécuter : `npm run migration:run`
- [x] Vérifier que les tests backend passent toujours : `npm test`

---

## Dev Notes

### T1 — Entité PublicToken

**Fichier à CRÉER : `backend/src/sharing/public-token.entity.ts`**

```typescript
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';

export type ResourceType = 'recipe' | 'note';

@Entity('PublicToken')
export class PublicToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  token!: string;

  @Column({ type: 'varchar', length: 20 })
  resourceType!: ResourceType;

  @Column({ type: 'int' })
  resourceId!: number;

  @Column()
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'datetime', nullable: true })
  expiresAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  revokedAt!: Date | null;
}
```

**Décisions critiques :**

- `resourceType` → `varchar(20)`, **pas** un type ENUM MariaDB. Cohérent avec le pattern `UserRole` dans `user.entity.ts` (varchar + union TypeScript). Plus souple pour ajouter `'note'` sans ALTER TABLE coûteux.
- `resourceId` → int simple, **sans FK typée**. C'est un lien polymorphique (peut pointer Recipe ou Note selon `resourceType`). La suppression cascade de la ressource (ex : Recipe supprimée → ses tokens orphelins) sera gérée côté service en Story 6.2 — **pas via contrainte BDD**.
- `token` → `unique: true` génère automatiquement un index unique TypeORM. Suffisant pour les lookups `WHERE token = ?` de l'API publique.
- `expiresAt` et `revokedAt` → `nullable: true` + type union `Date | null`. Pas de valeur par défaut — null = permanent / non révoqué.
- **Pas de `@UpdateDateColumn()`** — un token ne se met jamais à jour, il est révoqué via `revokedAt`.
- **Ne pas modifier `UserEntity`** — la cascade est enforced par la contrainte FK BDD (`onDelete: 'CASCADE'`), pas par une relation `@OneToMany` dans UserEntity. Pattern identique à `LinkCategoryEntity` et `link.entity.ts`.

**Logique de validation (AC2) — pour référence Story 6.2 :**
```typescript
const isValid = token !== null
  && token.revokedAt === null
  && (token.expiresAt === null || token.expiresAt > new Date());
```

---

### T2 — SharingModule

**Fichier à CRÉER : `backend/src/sharing/sharing.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicToken } from './public-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublicToken])],
  exports: [TypeOrmModule],
})
export class SharingModule {}
```

> **Pas de contrôleur ni service dans cette story** — uniquement l'entité + module de base. Le contrôleur (`SharingController`) et le service (`SharingService`) arrivent en Story 6.2.
>
> **`exports: [TypeOrmModule]`** — même pattern que `RecipesModule`. Permet aux modules futurs d'injecter `Repository<PublicToken>` sans redéclarer l'entité.

---

### T3 — Enregistrement dans AppModule

**Fichier à MODIFIER : `backend/src/app.module.ts`**

```typescript
import { SharingModule } from './sharing/sharing.module'; // ← AJOUTER

@Module({
  imports: [
    // ... imports existants (ConfigModule, TypeOrmModule, ThrottlerModule, UsersModule, AuthModule, LinksModule, RecipesModule)
    SharingModule, // ← AJOUTER après RecipesModule
  ],
  // ...
})
export class AppModule implements NestModule { /* ... */ }
```

---

### T4 — Migration TypeORM

**Contexte :**
- Le script `migration:generate` est dans `package.json` : `typeorm-ts-node-commonjs migration:generate -d src/config/typeorm.config.ts`
- Le DataSource (`src/config/typeorm.config.ts`) charge automatiquement toute entité via le glob `src/../**/*.entity{.ts,.js}` — `public-token.entity.ts` dans `src/sharing/` sera détecté.

**Commande de génération (depuis `backend/`) :**
```bash
npm run migration:generate -- src/migrations/CreatePublicToken
```

**Inspection obligatoire avant exécution :**

TypeORM peut générer des opérations parasites sur des tables existantes (DROP/CREATE index, etc.) — pattern observé en Story 5.7 sur la migration `AddAvantProposToRecipe` (opérations parasites sur `RecipeCategory`). **Ouvrir le fichier généré et vérifier qu'il ne contient que les opérations relatives à `PublicToken`.**

La migration correcte doit ressembler à :
```typescript
public async up(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`
    CREATE TABLE \`PublicToken\` (
      \`id\` int NOT NULL AUTO_INCREMENT,
      \`token\` varchar(255) NOT NULL,
      \`resourceType\` varchar(20) NOT NULL,
      \`resourceId\` int NOT NULL,
      \`userId\` int NOT NULL,
      \`expiresAt\` datetime NULL,
      \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      \`revokedAt\` datetime NULL,
      UNIQUE INDEX \`IDX_PublicToken_token\` (\`token\`),
      PRIMARY KEY (\`id\`),
      CONSTRAINT \`FK_PublicToken_userId\` FOREIGN KEY (\`userId\`)
        REFERENCES \`User\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);
}

public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(`DROP TABLE IF EXISTS \`PublicToken\``);
}
```

> Si TypeORM génère la migration en plusieurs instructions séparées plutôt qu'en un seul `CREATE TABLE` → c'est acceptable, ne pas reécrire manuellement.

**Commande d'exécution :**
```bash
npm run migration:run
```

**Vérification post-migration :**
```bash
npm test  # 159+ tests doivent passer
```

---

## Project Structure Notes

**Dossier entier à CRÉER :**
```
backend/src/sharing/
├── sharing.module.ts          ← T2 (NOUVEAU)
└── public-token.entity.ts    ← T1 (NOUVEAU)
```

**Fichiers à MODIFIER :**
```
backend/src/app.module.ts                            ← T3 (ajouter SharingModule)
backend/src/migrations/XXXXXXXXX-CreatePublicToken.ts  ← T4 (GÉNÉRER)
```

**Aucun fichier frontend** — story 100% backend.  
**Aucune modification de `UserEntity`** — la cascade FK est suffisante, pas de `@OneToMany` à ajouter.

---

## Contexte Epic 6 — Vue d'ensemble pour comprendre le "pourquoi"

Cette story crée uniquement l'infrastructure BDD. Les stories suivantes de l'Epic 6 s'appuient dessus :

| Story | Dépendance sur 6.1 |
|-------|-------------------|
| 6.2 | Service + API `/api/sharing` → génération/révocation de tokens. Utilise `Repository<PublicToken>`. |
| 6.3 | Vue publique `/share/:token` → lecture seule via `GET /api/sharing/:token` (pas de JwtAuthGuard). |
| 6.4 | Gestion des tokens invalides/expirés → retourne 404 sans révéler le motif. |
| 8.7 | Extension du partage aux notes — réutilise `PublicToken` avec `resourceType = 'note'`. |

**Token CSPRNG (génération en Story 6.2) :** `crypto.randomBytes(32).toString('base64url')` → 43 caractères URL-safe → `varchar(255)` largement suffisant.

---

## Références

- `backend/src/auth/entities/refresh-token.entity.ts` — Pattern `ManyToOne + JoinColumn + onDelete: 'CASCADE'`
- `backend/src/links/link-category.entity.ts` — Pattern userId + FK User CASCADE sans `@OneToMany` dans UserEntity
- `backend/src/users/user.entity.ts` — Pattern `UserRole` = varchar + union TypeScript (appliqué à `ResourceType`)
- `backend/src/config/typeorm.config.ts` — DataSource utilisé pour `migration:generate` et `migration:run`
- `backend/src/app.module.ts` — Pattern d'enregistrement des modules
- `backend/src/recipes/recipes.module.ts` — Pattern `TypeOrmModule.forFeature + exports: [TypeOrmModule]`
- `backend/src/migrations/1746057600000-CreateUserRefreshToken.ts` — Exemple de migration CREATE TABLE avec FK
- `backend/src/migrations/1781183421289-AddAvantProposToRecipe.ts` — Exemple de migration simple (référence pour vérification des opérations parasites)
- `_bmad-output/planning-artifacts/epics.md` — Section Epic 6, Stories 6.1 à 6.4
- `_bmad-output/planning-artifacts/architecture.md` — Conventions nommage BDD + sécurité tokens partage

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage rencontré. Migration générée proprement par TypeORM, sans opérations parasites sur les tables existantes (pattern connu de Story 5.7 non reproduit ici).

### Completion Notes List

- T1 : Entité `PublicToken` créée dans `backend/src/sharing/public-token.entity.ts`. ResourceType en `varchar(20)` (union TypeScript), pas d'ENUM MariaDB. FK `userId → User.id ON DELETE CASCADE` via `@ManyToOne` + `@JoinColumn`. Pas de `@UpdateDateColumn` (token immuable, révocation via `revokedAt`).
- T2 : `SharingModule` créé avec `TypeOrmModule.forFeature([PublicToken])` et `exports: [TypeOrmModule]` — même pattern que `RecipesModule`.
- T3 : `SharingModule` importé dans `AppModule` après `RecipesModule`.
- T4 : Migration `1781894312446-CreatePublicToken.ts` générée et exécutée avec succès. Table `PublicToken` créée en base avec index unique sur `token` et FK CASCADE sur `userId`. 159 tests passent sans régression.

### File List

- `backend/src/sharing/public-token.entity.ts` (nouveau)
- `backend/src/sharing/sharing.module.ts` (nouveau)
- `backend/src/app.module.ts` (modifié — ajout import SharingModule)
- `backend/src/migrations/1781894312446-CreatePublicToken.ts` (généré)

### Change Log

- 2026-06-19 : Implémentation story 6.1 — création entité PublicToken, SharingModule, migration BDD (table PublicToken avec FK CASCADE sur User).

---

### Review Findings

- [x] [Review][Patch] `userId` manque l'annotation explicite `type: 'int'` — incohérent avec `resourceId` qui a `@Column({ type: 'int' })` [`backend/src/sharing/public-token.entity.ts:28`]
- [x] [Review][Defer] `resourceId` sans FK ni contrainte de référence — tokens orphelins si une recette est supprimée avant Story 6.2 [`backend/src/sharing/public-token.entity.ts:25`, `backend/src/migrations/1781894312446-CreatePublicToken.ts:7`] — deferred, géré côté service en Story 6.2 per spec
- [x] [Review][Defer] Pas d'index composite sur `(resourceType, resourceId)` — full-scan sur "lister les tokens d'une ressource" [`backend/src/migrations/1781894312446-CreatePublicToken.ts:7`] — deferred, optimisation future
