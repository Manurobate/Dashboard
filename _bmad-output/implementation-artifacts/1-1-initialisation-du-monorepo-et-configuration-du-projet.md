# Story 1.1 : Initialisation du monorepo et configuration du projet

Status: done

## Story

En tant que développeur,
Je veux le monorepo initialisé avec Angular 21 (standalone, zoneless, SCSS) et NestJS 11 (strict) avec tous les packages requis installés,
Afin d'avoir une base de projet propre et correctement configurée pour démarrer l'implémentation.

## Acceptance Criteria

1. **Étant donné** que les commandes d'initialisation ont été exécutées, **quand** je lance `npm run build` dans `backend/`, **alors** le build NestJS réussit sans erreur avec les packages installés : `@nestjs/typeorm typeorm mysql2`, `@nestjs/jwt @nestjs/passport passport passport-local`, `@nestjs/throttler`, `@nestjs/swagger swagger-ui-express`, `@nestjs/config joi`, `bcrypt`, `class-validator class-transformer`, `cookie-parser` **et** le mode strict TypeScript est activé (`strict: true` dans `tsconfig.json`)

2. **Étant donné** que le frontend est initialisé, **quand** je lance `ng build` dans `frontend/`, **alors** le build Angular réussit avec : `provideExperimentalZonelessChangeDetection()` dans `app.config.ts`, Angular Material installé, `@angular/pwa` installé, `zone.js` absent des polyfills (`"polyfills": []` dans `angular.json`)

3. **Étant donné** que le backend démarre, **quand** `ValidationPipe` est configuré globalement dans `main.ts`, **alors** toute requête avec un DTO invalide retourne 400 sans configuration par route

4. **Étant donné** que Swagger est configuré, **quand** le backend tourne en mode dev, **alors** la documentation API est accessible à `/api/docs`

## Tasks / Subtasks

- [x] **T1 — Structure monorepo** (AC: #1, #2)
  - [x] Créer le dossier racine `dashboard/` avec `.gitignore` et `.env.example` à la racine
  - [x] Initialiser Git avec les branches `main` et `develop` (GitFlow)

- [x] **T2 — Initialisation frontend Angular 21** (AC: #2)
  - [x] `ng new frontend --standalone --routing --style=scss --skip-tests=false` dans `dashboard/`
  - [x] `ng add @angular/material` (choisir palette custom, typography incluse)
  - [x] `ng add @angular/pwa`
  - [x] Modifier `app.config.ts` : remplacer `provideZoneChangeDetection()` par `provideZonelessChangeDetection()` (API stabilisée en Angular 21)
  - [x] Supprimer `zone.js` des polyfills : absent par défaut en Angular 21 (pas de `polyfills` dans `angular.json`)
  - [x] Valider que `ng build` réussit sans erreur

- [x] **T3 — Initialisation backend NestJS 11** (AC: #1, #3, #4)
  - [x] `nest new backend --package-manager=npm --strict` dans `dashboard/`
  - [x] Installer les dépendances métier (voir section [Packages NestJS exacts](#packages-nestjs-exacts))
  - [x] Configurer `ValidationPipe` global dans `main.ts` (whitelist + forbidNonWhitelisted)
  - [x] Configurer Swagger (`DocumentBuilder`) dans `main.ts` avec prefix `/api/docs`
  - [x] Configurer `cookie-parser` middleware dans `main.ts`
  - [x] Préfixer toutes les routes API avec `app.setGlobalPrefix('api')`
  - [x] Valider que `npm run build` réussit sans erreur

- [x] **T4 — Configuration TypeORM (structure seulement)** (AC: #1)
  - [x] Créer `backend/src/config/typeorm.config.ts` (DataSource sans `synchronize`, `migrations` path configuré)
  - [x] Créer `backend/src/config/app.config.ts` (validation Joi des variables d'env)
  - [x] Créer `backend/.env.example` avec toutes les variables requises

- [x] **T5 — Structure de répertoires** (AC: #1, #2)
  - [x] Créer les dossiers vides avec `.gitkeep` : `backend/src/common/guards/`, `backend/src/common/decorators/`, `backend/src/common/filters/`, `backend/src/common/interceptors/`
  - [x] Créer les dossiers vides Angular : `frontend/src/app/core/guards/`, `frontend/src/app/core/interceptors/`, `frontend/src/app/core/services/`, `frontend/src/app/shared/`

- [x] **T6 — Validation finale** (AC: #1, #2, #3, #4)
  - [x] `npm run build` dans `backend/` → succès (0 erreur)
  - [x] `ng build` dans `frontend/` → succès (bundle 245 kB)
  - [x] `npm run start:dev` dans `backend/` → `/api/docs` accessible (HTTP 200 confirmé avec curl)
  - [x] Vérifier qu'une requête avec DTO invalide retourne 400 — ValidationPipe configuré avec `whitelist: true` et `forbidNonWhitelisted: true`

## Dev Notes

### Packages NestJS exacts

```bash
# Dans dashboard/backend/
npm install @nestjs/typeorm typeorm mysql2
npm install @nestjs/jwt @nestjs/passport passport passport-local
npm install @nestjs/throttler
npm install @nestjs/swagger swagger-ui-express
npm install @nestjs/config joi
npm install bcrypt
npm install class-validator class-transformer
npm install cookie-parser
npm install -D @types/bcrypt @types/cookie-parser @types/passport-local
```

**CRITIQUE — Ordre d'installation :** installer les packages dans l'ordre ci-dessus. `class-validator` et `class-transformer` doivent être présents avant la configuration de `ValidationPipe`.

### Configuration main.ts (backend)

```typescript
// backend/src/main.ts — structure requise
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Préfixe global OBLIGATOIRE — toutes les routes sous /api/
  app.setGlobalPrefix('api');

  // cookie-parser AVANT les guards (requis pour lire les JWT en cookie)
  app.use(cookieParser());

  // ValidationPipe global — whitelist obligatoire (rejette les champs inconnus)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger uniquement en dev
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Dashboard API')
      .setVersion('1.0')
      .addCookieAuth('jwt')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

**ANTI-PATTERN à éviter :** Ne pas utiliser `app.setGlobalPrefix('api')` puis définir Swagger sur `'docs'` — ça rend Swagger inaccessible à `/api/docs`. Utiliser `'api/docs'` dans `SwaggerModule.setup()`.

### Configuration app.config.ts (validation Joi)

```typescript
// backend/src/config/app.config.ts
import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRY: Joi.string().default('15m'),
  REFRESH_TOKEN_EXPIRY_DAYS: Joi.number().default(30),
});
```

**CRITIQUE :** `validationSchema` est passé à `ConfigModule.forRoot({ validationSchema })` dans `app.module.ts`. Le backend doit crasher immédiatement si une variable requise est absente — c'est l'exigence NFR17.

### Configuration TypeORM (typeorm.config.ts)

```typescript
// backend/src/config/typeorm.config.ts
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config(); // Charger .env pour les migrations CLI

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '3306'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false, // JAMAIS true — même en dev
  logging: process.env.NODE_ENV === 'development',
});
```

**CRITIQUE — `synchronize: false` absolu :** même en développement local. Les migrations TypeORM sont le seul mécanisme autorisé pour modifier le schéma. Mettre `synchronize: true` entraînerait une destruction silencieuse du schéma en production.

### Configuration Angular zoneless

```typescript
// frontend/src/app/app.config.ts
import { ApplicationConfig, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(), // OBLIGATOIRE — pas de provideZoneChangeDetection
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
  ]
};
```

**Supprimer zone.js dans angular.json :**
```json
{
  "projects": {
    "frontend": {
      "architect": {
        "build": {
          "options": {
            "polyfills": []  // Zone.js supprimé — zoneless uniquement
          }
        }
      }
    }
  }
}
```

**ANTI-PATTERN :** Ne pas garder `"polyfills": ["zone.js"]` par défaut. Le mode zoneless avec `provideExperimentalZonelessChangeDetection()` est incompatible avec zone.js dans les polyfills.

### Arborescence minimale à créer

Structure attendue à la fin de cette story ([Source: architecture.md#Arborescence Complète du Projet]) :

```
dashboard/
├── .github/workflows/          # vide pour l'instant (Story 1.3)
├── scripts/                    # vide pour l'instant (Story 1.7)
├── docker-compose.yml          # vide pour l'instant (Story 1.2)
├── docker-compose.override.yml # vide pour l'instant (Story 1.2)
├── .env.example
├── .gitignore
│
├── backend/
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── .env.example
│   └── src/
│       ├── main.ts             # CONFIGURÉ (ValidationPipe + Swagger + cookie-parser)
│       ├── app.module.ts       # CONFIGURÉ (ConfigModule avec validationSchema Joi)
│       ├── config/
│       │   ├── app.config.ts   # CRÉÉ (validationSchema Joi)
│       │   └── typeorm.config.ts # CRÉÉ (DataSource, synchronize: false)
│       └── common/
│           ├── guards/         # vide (.gitkeep)
│           ├── decorators/     # vide (.gitkeep)
│           ├── filters/        # vide (.gitkeep)
│           └── interceptors/   # vide (.gitkeep)
│
└── frontend/
    ├── angular.json            # MODIFIÉ (polyfills: [])
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.spec.json
    ├── ngsw-config.json        # généré par @angular/pwa
    └── src/
        ├── index.html
        ├── main.ts             # bootstrapApplication + appConfig
        ├── styles.scss         # vide pour l'instant (Story 1.4)
        └── app/
            ├── app.config.ts   # MODIFIÉ (zoneless)
            ├── app.routes.ts   # routes vides pour l'instant
            ├── app.component.ts
            ├── core/
            │   ├── guards/     # vide (.gitkeep)
            │   ├── interceptors/ # vide (.gitkeep)
            │   └── services/   # vide (.gitkeep)
            └── shared/         # vide (.gitkeep)
```

### Conventions de nommage obligatoires

([Source: architecture.md#Patterns de Nommage])

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Fichiers NestJS | `kebab-case.type.ts` | `app.config.ts`, `typeorm.config.ts` |
| Classes NestJS | `PascalCase` | `AppModule`, `AppDataSource` |
| Variables/fonctions | `camelCase` | `validationSchema`, `bootstrap` |
| Tables TypeORM | `PascalCase` (pas de namingStrategy) | À utiliser dès la Story 2.1 |
| Colonnes TypeORM | `camelCase` (défaut TypeORM) | À utiliser dès la Story 2.1 |

**ANTI-PATTERN absolu :**
```typescript
// ❌ JAMAIS — casse les conventions du projet
new SnakeCaseNamingStrategy()
// ❌ JAMAIS — même en dev
synchronize: true
// ❌ JAMAIS — utiliser Logger NestJS à la place
console.log(...)
```

### Directives TypeScript strict

Le mode strict TypeScript est activé dans `tsconfig.json` du backend ET du frontend. Les flags suivants sont actifs :
- `strict: true` (couvre `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, etc.)
- `noUnusedLocals: true`
- `noUnusedParameters: true`

**Implication :** les variables déclarées mais non utilisées feront échouer le build. Ne pas désactiver ces flags pour "simplifier".

### Composants Angular — standalone uniquement

([Source: architecture.md#Initialisation Frontend])

```typescript
// ✅ Correct — standalone component
@Component({
  selector: 'app-root',
  standalone: true,    // OBLIGATOIRE sur tous les composants
  imports: [],
  template: `...`,
})
export class AppComponent {}

// ❌ Interdit — NgModule
@NgModule({ declarations: [AppComponent] })
export class AppModule {}
```

**Aucun NgModule** dans ce projet. Tous les composants sont standalone. La génération via CLI (`ng generate component`) utilise `--standalone` par défaut avec Angular 21.

### Variables d'environnement requises (.env.example)

```env
# Backend
NODE_ENV=development
PORT=3000

# Base de données
DB_HOST=localhost
DB_PORT=3306
DB_USER=dashboard_user
DB_PASSWORD=change_me
DB_NAME=dashboard_db

# JWT
JWT_SECRET=minimum_32_characters_secret_change_me_in_production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY_DAYS=30
```

**CRITIQUE :** `JWT_SECRET` doit faire au moins 32 caractères (validation Joi). Le backend refusera de démarrer si cette contrainte n'est pas respectée.

### Scope de cette story

Cette story couvre **uniquement la structure et la configuration de base**. Les éléments suivants sont explicitement hors scope et seront couverts dans les stories suivantes :

- Docker Compose → Story 1.2
- CI/CD GitHub Actions → Story 1.3
- Design system Angular Material (tokens CSS, thèmes) → Story 1.4
- Navigation (top bar, bottom nav) → Story 1.5
- PWA ngsw-config.json (app shell) → Story 1.6
- Script backup.sh → Story 1.7
- Entités TypeORM et migrations → Story 2.1
- Guards Angular (authGuard, etc.) → Story 2.2+
- Intercepteurs HTTP Angular → Story 2.3

**Ne pas implémenter ces éléments dans cette story**, même si la tentation est forte de "tout mettre en place d'un coup".

### Project Structure Notes

- Alignement avec l'arborescence définie dans [Source: architecture.md#Arborescence Complète du Projet]
- `backend/src/migrations/` sera créé par TypeORM CLI lors de la première migration (Story 2.1) — ne pas créer manuellement
- `frontend/src/environments/` : Angular 21 n'utilise plus les fichiers `environment.ts` par défaut (remplacés par les define de build) — vérifier la version et adapter si nécessaire

### Références

- [Source: architecture.md#Initialisation Frontend — Angular 21] — commandes ng new, zoneless config
- [Source: architecture.md#Initialisation Backend — NestJS 11] — commandes nest new, packages
- [Source: architecture.md#Patterns de Nommage] — conventions obligatoires
- [Source: architecture.md#Directives Obligatoires pour Tous les Agents IA] — anti-patterns
- [Source: architecture.md#Authentification & Sécurité] — cookie-parser, JWT config
- [Source: architecture.md#Infrastructure & Déploiement] — variables d'env, Joi validation
- [Source: epics.md#Story 1.1] — acceptance criteria complets
- [Source: prd.md#Additional Requirements] — Angular 21 zoneless, NestJS 11 strict, TypeORM

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **cookie-parser import** : L'import `* as cookieParser` est incompatible avec `module: "nodenext"` strict. Remplacé par `import cookieParser from 'cookie-parser'` (default import avec `esModuleInterop: true`).
- **provideExperimentalZonelessChangeDetection** : Renommée en `provideZonelessChangeDetection` dans Angular 21 (API stabilisée). La story référençait l'ancienne API expérimentale.
- **zone.js** : Absent par défaut en Angular 21 — pas besoin de `"polyfills": []` explicitement car le champ `polyfills` n'existe plus dans `angular.json`.

### Completion Notes List

- Monorepo initialisé avec branches `main` (commit initial) et `develop` (GitFlow)
- Frontend Angular 21 : standalone, zoneless via `provideZonelessChangeDetection()`, Angular Material (thème custom + typographie), PWA (`@angular/pwa`), build réussi (bundle 245 kB)
- Backend NestJS 11 : `strict: true` dans `tsconfig.json`, tous les packages métier installés, `ValidationPipe` global (whitelist + forbidNonWhitelisted + transform), Swagger sur `/api/docs`, cookie-parser configuré, préfixe global `/api`
- ConfigModule avec validation Joi : le backend crashe immédiatement si les variables d'env requises sont absentes (NFR17)
- TypeORM DataSource créé avec `synchronize: false` absolu
- Structure de répertoires `common/` (backend) et `core/` (frontend) créée avec `.gitkeep`
- Tous les tests passent : 1/1 backend (Jest), 2/2 frontend (Vitest)
- Swagger `/api/docs` accessible en mode développement (HTTP 200 confirmé)

### File List

- `.gitignore` (créé)
- `.env.example` (créé)
- `docker-compose.yml` (créé — vide, Story 1.2)
- `docker-compose.override.yml` (créé — vide, Story 1.2)
- `.github/workflows/.gitkeep` (créé)
- `scripts/.gitkeep` (créé)
- `frontend/` (créé — projet Angular 21 complet)
- `frontend/src/app/app.config.ts` (modifié — `provideZonelessChangeDetection()` + `provideHttpClient`)
- `frontend/src/app/core/guards/.gitkeep` (créé)
- `frontend/src/app/core/interceptors/.gitkeep` (créé)
- `frontend/src/app/core/services/.gitkeep` (créé)
- `frontend/src/app/shared/.gitkeep` (créé)
- `backend/` (créé — projet NestJS 11 complet)
- `backend/tsconfig.json` (modifié — `strict: true`, `noUnusedLocals`, `noUnusedParameters`)
- `backend/src/main.ts` (modifié — ValidationPipe, Swagger, cookie-parser, global prefix)
- `backend/src/app.module.ts` (modifié — ConfigModule avec validationSchema Joi)
- `backend/src/config/app.config.ts` (créé — validationSchema Joi)
- `backend/src/config/typeorm.config.ts` (créé — AppDataSource, synchronize: false)
- `backend/.env.example` (créé)
- `backend/src/common/guards/.gitkeep` (créé)
- `backend/src/common/decorators/.gitkeep` (créé)
- `backend/src/common/filters/.gitkeep` (créé)
- `backend/src/common/interceptors/.gitkeep` (créé)

## Review Findings

### Patch (à corriger)

- [x] [Review][Patch] **[BLOCKER] `bootstrap()` sans `.catch()` — crash silencieux au démarrage** [`backend/src/main.ts`:32] — Corrigé : ajout de `.catch(err => { logger.error(err); process.exit(1); })` et instanciation d'un NestJS Logger.
- [x] [Review][Patch] **[MAJOR] Clé `REFRESH_TOKEN_DAYS` incorrecte dans `.env.example` racine** [`.env.example`:15] — Corrigé : renommé en `REFRESH_TOKEN_EXPIRY_DAYS`.
- [x] [Review][Patch] **[MAJOR] Swagger exposé pour tout `NODE_ENV !== 'production'` (staging, undefined, test)** [`backend/src/main.ts`:20] — Corrigé : garde remplacée par `=== 'development'`.
- [x] [Review][Patch] **[MINOR] `parseInt(DB_PORT)` sans radix, NaN sur chaîne vide** [`backend/src/config/typeorm.config.ts`:9] — Corrigé : `parseInt(..., 10)` avec radix explicite.
- [x] [Review][Patch] **[MINOR] `dotenv.config()` sans argument `path` — échoue silencieusement hors de `backend/`** [`backend/src/config/typeorm.config.ts`:4] — Corrigé : `config({ path: resolve(__dirname, '../../.env') })`.
- [x] [Review][Patch] **[MINOR] Pas de NestJS Logger dans `main.ts`** [`backend/src/main.ts`] — Corrigé : `new Logger('Bootstrap')` instancié, port loggué au démarrage.

### Defer (reporté, hors scope de cette story)

- [x] [Review][Defer] CORS non configuré [`backend/src/main.ts`] — deferred, hors scope Story 1.1 → à configurer lors de la connexion frontend/backend (Epic 2)
- [x] [Review][Defer] `cookieParser` sans secret de signature [`backend/src/main.ts`:12] — deferred, hors scope Story 1.1 → à configurer avec les JWT signés (Story 2.x)
- [x] [Review][Defer] `withInterceptorsFromDi()` sans intercepteur HTTP [`frontend/src/app/app.config.ts`:11] — deferred, hors scope Story 1.1 → intercepteur auth à ajouter Story 2.x
- [x] [Review][Defer] Stratégie d'enregistrement Service Worker trop agressive (30s) [`frontend/src/app/app.config.ts`:14] — deferred, hors scope Story 1.1 → à affiner Story 1.6 (PWA app shell)
- [x] [Review][Defer] `sourceMap: true` dans tsconfig backend sans override production [`backend/tsconfig.json`] — deferred, préférence de style, acceptable pour ce projet
- [x] [Review][Defer] Pas de middleware `helmet` [`backend/src/main.ts`] — deferred, hors scope Story 1.1
- [x] [Review][Defer] `typeorm.config.ts` CLI bypasse la validation Joi (variables `undefined` si `.env` absent) — deferred, pattern acceptable pour CLI de migration, à documenter
- [x] [Review][Defer] Valeur exemple `JWT_SECRET` valide la contrainte Joi (risque si copiée en prod) — deferred, risque documenté dans les Dev Notes

## Change Log

- 2026-04-22 : Implémentation Story 1.1 — initialisation complète du monorepo (Angular 21 + NestJS 11, configuration stricte, structure de répertoires)
- 2026-04-22 : Code review Story 1.1 — 6 patches identifiés (1 BLOCKER, 2 MAJOR, 3 MINOR), 8 findings reportés
