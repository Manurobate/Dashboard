---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-04-22'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/ux-design-Dashboard.md'
  - '_bmad-output/planning-artifacts/ux-briefing-Dashboard.md'
  - '_bmad-output/planning-artifacts/product-brief-Dashboard.md'
workflowType: 'architecture'
project_name: 'Dashboard'
user_name: 'Manu'
date: '2026-04-21'
---

# Architecture Decision Document

_Ce document se construit de manière collaborative à travers des étapes de découverte successives. Les sections sont ajoutées au fur et à mesure de chaque décision architecturale._

## Analyse du Contexte Projet

### Aperçu des Exigences

**Exigences Fonctionnelles :**
48 FRs organisées en 8 domaines : authentification (FR1–7), administration (FR8–12), module Liens (FR13–22), module Recettes (FR23–28), module Notes (FR29–34), partage public (FR35–41), personnalisation (FR42–44), infrastructure (FR45–48). Livraison progressive en 3 phases : Liens → Recettes → Notes.

**Exigences Non-Fonctionnelles :**
- Sécurité : bcrypt ≥ cost 12, JWT durée limitée + refresh silencieux, CSPRNG ≥ 128 bits, rate limiting login, isolation userId enforced API, routes publiques read-only enforced API
- Performance : qualitative (pas de SLA) — interactions client < 100ms objectif
- Accessibilité : WCAG 2.1 AA — ratios de contraste vérifiés sur les deux thèmes, keyboard nav, ARIA complet
- Fiabilité : docker-compose single-file, healthchecks, dumps DB automatisés

**Échelle & Complexité :**
- Domaine primaire : application web full-stack (SPA Angular + API REST NestJS + MariaDB)
- Niveau de complexité : faible (greenfield, stack standard, < 10 utilisateurs)
- Composants architecturaux estimés : ~15–20 modules/services

### Contraintes Techniques & Dépendances

- Stack imposée : NestJS + Angular + MariaDB
- Contrainte d'infrastructure : zéro dépendance externe (pas de Redis, pas d'Elasticsearch)
- Déploiement : single `docker-compose.yml`
- TLS : délégué au reverse proxy existant (Traefik/Nginx)
- Pas de WebSocket V1 : temps réel = client-side uniquement (debounce, recalcul synchrone)
- Intégration TipTap (ProseMirror) : wrapper ControlValueAccessor Angular requis
- Proxy fetch OG/favicon : requête serveur-side avec timeout court (évite CORS + timeout client)

### Préoccupations Transversales Identifiées

- **Auth / Authorization** : JWT + rôles (admin/user) + flag `mustChangePassword` → garde sur toutes les routes protégées, middleware NestJS centralisé
- **Isolation des données par userId** : toutes les requêtes DB filtrées par userId côté API, aucune donnée d'un compte accessible depuis un autre
- **Tokens de partage public** : CSPRNG ≥ 128 bits, validation expiration + révocation côté API, routes publiques en lecture seule stricte indépendante du client
- **Responsive / theming** : deux breakpoints (< 768px / ≥ 768px), thème clair/sombre via classe CSS sur `<body>`, persisté en localStorage
- **PWA / Service Worker** : app shell mis en cache via @angular/pwa
- **Proxy fetch OG/favicon** : service NestJS dédié, timeout court, fallback gracieux

## Évaluation du Template de Démarrage

### Domaine Technique Primaire

Application web full-stack : SPA Angular (frontend) + API REST NestJS (backend) + MariaDB (base de données), orchestrés par Docker Compose.

La stack est définie dans le PRD — l'étape d'évaluation consiste à fixer les commandes d'initialisation et la structure de répertoires.

### Structure de Projet Retenue

Monorepo simple (deux sous-projets à la racine), sans outil de monorepo tiers :

```
dashboard/
├── frontend/          # Angular 21 SPA
├── backend/           # NestJS 11 API
├── docker-compose.yml
└── docker-compose.override.yml  # dev overrides
```

Rationale : simplicité maximale pour un projet solo. Pas de Turborepo/Nx — un seul `docker-compose.yml` orchestre les deux services.

### Initialisation Frontend — Angular 21 (Zoneless)

**Commandes :**
```bash
npm install -g @angular/cli@latest

ng new frontend \
  --standalone \
  --routing \
  --style=scss \
  --skip-tests=false

cd frontend
ng add @angular/material
ng add @angular/pwa
```

**Configuration zoneless (post-init dans `app.config.ts`) :**
```typescript
import { provideExperimentalZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideExperimentalZonelessChangeDetection(), // remplace provideZoneChangeDetection
    provideRouter(routes),
    // ...
  ]
};
```

Supprimer `zone.js` des polyfills dans `angular.json` :
```json
"polyfills": []
```

**Décisions architecturales :**

- **Change detection** : Zoneless — signals + `OnPush` par défaut sur tous les composants ; aucun `ChangeDetectorRef.markForCheck()` requis si les données passent par des signals
- **TypeScript** : strict mode activé
- **Composants** : standalone (pas de NgModule)
- **Routing** : lazy loading par module métier
- **Styles** : SCSS + Angular Material theming (design tokens CSS)
- **Build** : Vite + esbuild (Angular 21 default)
- **Tests unitaires** : Karma + Jasmine
- **Tests E2E** : Playwright (`@playwright/test`) — dossier `e2e/` à la racine
- **PWA** : `@angular/pwa` — app shell mis en cache (`ngsw-config.json`)

### Initialisation Backend — NestJS 11

**Commandes :**
```bash
npm install -g @nestjs/cli@latest

nest new backend --package-manager=npm --strict

cd backend
npm install @nestjs/typeorm typeorm mysql2
npm install @nestjs/jwt @nestjs/passport passport passport-local
npm install @nestjs/throttler
npm install bcrypt && npm install -D @types/bcrypt
npm install class-validator class-transformer
```

**Décisions architecturales :**

- **TypeScript** : strict mode
- **Structure** : modulaire NestJS (un module par domaine métier)
- **ORM** : TypeORM + driver `mysql2` (compatible MariaDB)
- **Auth** : `@nestjs/jwt` + guards centralisés
- **Rate limiting** : `@nestjs/throttler`
- **Validation** : `class-validator` + `class-transformer` (DTOs)
- **Tests** : Jest

**Note :** L'initialisation et la configuration Docker Compose constituent la première story d'implémentation.

## Décisions Architecturales Fondamentales

### Analyse des Priorités

**Décisions critiques (bloquent l'implémentation) :**
- Stratégie auth (httpOnly cookie + refresh token DB)
- Migrations TypeORM uniquement (pas de synchronize)
- Structure des modules Angular lazy-loaded
- GitFlow + GitHub Actions CI/CD

**Décisions importantes (structurent l'architecture) :**
- Signals natifs comme stratégie de state management
- DB externe configurable via env vars
- Nginx Alpine pour les statics

**Décisions différées (post-MVP) :**
- Versioning API (si clients externes en V2+)
- NgRx Signal Store (si complexité d'état augmente)

---

### Architecture des Données

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Migrations | Migrations uniquement (`typeorm migration:generate/run`), même en dev | Contrôle total du schéma, aucun risque de perte de données |
| Suppressions | Hard delete | Pas d'exigence d'audit, simplicité maximale |
| Nommage colonnes | camelCase (TypeORM par défaut) | Cohérence avec les entités TypeScript, pas de namingStrategy custom |
| Caching | Aucun (pas de Redis) | Contrainte PRD, volumétrie < 10 users ne le justifie pas |

---

### Authentification & Sécurité

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Stockage JWT | httpOnly cookie (`SameSite=Strict`) | Protège contre XSS — un script malveillant ne peut pas lire le token |
| Anti-CSRF | Header custom `X-Requested-With: XMLHttpRequest` vérifié côté API | Mitigation CSRF sans token dédié |
| Refresh token | Stocké en DB, révocable | L'admin peut forcer la déconnexion ; révocation immédiate possible |
| Tokens partage public | `crypto.randomBytes(32)` → base64url (256 bits d'entropie) | Natif Node, zéro dépendance, URL-safe, entropie > 128 bits requis |
| Admin seed | `AdminSeedService` (`OnApplicationBootstrap`) — crée le compte admin depuis `ADMIN_EMAIL` (adresse email valide, identifiant de connexion) + `ADMIN_INITIAL_PASSWORD` si aucun admin en base ; nom d'affichage initial = partie locale de l'email ; no-op silencieux sinon | Bootstrap déterministe, idempotent, sans endpoint dédié |

**Packages supplémentaires NestJS :**
```bash
npm install cookie-parser && npm install -D @types/cookie-parser
```

---

### API & Communication

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Préfixe API | `/api` (pas de versioning) | Usage interne uniquement, pas de clients externes |
| Format erreurs | `HttpException` NestJS par défaut | Suffisant, pas de sur-ingénierie |
| Documentation | `@nestjs/swagger` + `swagger-ui-express` | Quasi-gratuit avec NestJS, utile pour les agents de dev |
| CORS | Activé en dev uniquement via env var | Prod = même origine via reverse proxy |

**Packages supplémentaires NestJS :**
```bash
npm install @nestjs/swagger swagger-ui-express
```

---

### Architecture Frontend

| Décision | Choix | Rationale |
|----------|-------|-----------|
| State management | Signals Angular natifs + services | Idiomatic Angular 21 zoneless, léger, pas de dépendance externe |
| Intercepteurs HTTP | Auth (header anti-CSRF) + Error/refresh (401 → refresh silencieux → retry) | Couvre tous les cas du PRD sans over-engineering |
| Route guards | `authGuard` + `adminGuard` + `mustChangePasswordGuard` | Correspond exactement aux 3 niveaux d'accès du PRD |
| Structure des routes | Lazy loading par module métier | Chargement initial minimal |

**Structure des routes Angular :**
```
/login                  → AuthModule (eager)
/change-password        → AuthModule
/links                  → LinksModule (lazy)
/recipes                → RecipesModule (lazy)
/recipes/:id            → RecipesModule
/notes                  → NotesModule (lazy)
/admin                  → AdminModule (lazy, adminGuard)
/share/:token           → ShareModule (lazy, public)
```

---

### Infrastructure & Déploiement

| Décision | Choix | Rationale |
|----------|-------|-----------|
| Images Docker | `node:24-alpine` (backend + build) + `nginx:alpine` (frontend statics) | Légèreté maximale |
| Base de données | Configurable via env vars — MariaDB embarquée optionnelle | Supporte base externe ou embarquée selon l'utilisateur |
| Dumps | Script `scripts/backup.sh` si base embarquée ; base externe = infrastructure existante | Responsabilité claire, pas de magie cachée |
| Config | `.env` + `@nestjs/config` avec validation `Joi` au démarrage | Plantage propre si variable manquante |
| CI/CD | GitFlow + GitHub Actions | Qualité enforced automatiquement |
| Convention | Conventional Commits (`fix:`/`feat:`/`feat!:`) | Obligatoire dès Épic 5 — détermine le type de bump (patch/minor/major) |
| CI (develop) | Lint + tests + build + E2E | Sur chaque push/PR vers develop — E2E uniquement au merge (`push`), skippé sur les PRs |
| CD (main) | Bump `package.json` → commit → tag `vX.Y.Z` → build images → push GHCR → GitHub Release | Uniquement au merge dans main — déterminé par les Conventional Commits depuis le dernier tag |
| Versioning | Root `package.json` + git tags (semver) | `npm version` gère le bump ; git tags = source de vérité des releases |
| Post-release | Aucun rebase develop automatique | Tags git globaux — pas de -SNAPSHOT en JS (app Docker ≠ bibliothèque npm) |
| Registry | GHCR (`ghcr.io/manurobate/dashboard-*`) | `GITHUB_TOKEN` natif — zéro secret supplémentaire |
| Déploiement | `docker compose pull + up` (images GHCR) | Installable sans code source sur le serveur |
| Branch protection | `github-actions[bot]` autorisé à bypasser PR rule sur `main` | Config manuelle unique dans GitHub Settings → Branches → main |

**Configuration Docker Compose (base externe) :**
```yaml
services:
  backend:
    environment:
      DB_HOST: ${DB_HOST:-db}   # "db" = service interne par défaut
      DB_PORT: ${DB_PORT:-3306}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
      ADMIN_EMAIL: ${ADMIN_EMAIL}
      ADMIN_INITIAL_PASSWORD: ${ADMIN_INITIAL_PASSWORD}

  db:   # Supprimer ce bloc si base externe
    image: mariadb:11-lts
```

**Packages supplémentaires NestJS :**
```bash
npm install @nestjs/config joi
```

**GitFlow & GitHub Actions :**
```
feature/* → develop : CI (lint + tests unitaires + build + e2e)
develop   → main    : CD (build images Docker + déploiement SSH)
```

- **Branches** : `main` (prod), `develop` (intégration), `feature/*` (développement)
- **Merge dans develop** : lint + tests Jest (backend) + Karma (frontend) + build Angular + tests Playwright E2E (headless, post-build, contre stack docker-compose)
- **Merge dans main** : build images Docker + déploiement sur serveur auto-hébergé via SSH + `docker-compose up -d --build`

---

### Analyse des Impacts

**Séquence d'implémentation recommandée :**
1. Initialisation repo + GitFlow + GitHub Actions (CI squelette)
2. Docker Compose + variables d'env + validation config NestJS
3. Auth (httpOnly cookies, refresh token DB, guards Angular)
4. Module Liens (premier module métier)
5. Module Recettes + partage public
6. Module Notes + TipTap

**Dépendances croisées clés :**
- Le module Auth doit être complet avant tout autre module (guards + intercepteur refresh)
- Les migrations TypeORM doivent être en place avant la livraison de chaque module
- Le service `OgFetchService` (proxy favicon) est une dépendance du Module Liens uniquement

## Patterns d'Implémentation & Règles de Cohérence

### Points de Conflit Potentiels Identifiés

8 domaines où des agents IA pourraient faire des choix divergents sans règles explicites.

---

### Patterns de Nommage

**Nommage BDD (TypeORM) :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Tables | `PascalCase` (nom de la classe entité) | `Link`, `Recipe`, `RecipeStep`, `Note`, `User`, `PublicToken`, `RefreshToken` |
| Colonnes | `camelCase` (défaut TypeORM, pas de `namingStrategy`) | `userId`, `createdAt`, `mustChangePassword`, `isPublic` |
| Clés étrangères | `camelCase` + suffixe `Id` | `userId`, `recipeId` |
| Index | Nommage automatique TypeORM | Ne pas nommer manuellement sauf contrainte unique explicite |

> Règle : aucun `namingStrategy` custom — TypeORM mappe les propriétés camelCase vers des colonnes camelCase nativement.

**Nommage API REST :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Routes ressources | Pluriel, `kebab-case` | `/api/links`, `/api/recipes`, `/api/recipe-steps`, `/api/notes` |
| Paramètres de route | `:id` (NestJS par défaut) | `/api/links/:id` |
| Query parameters | `camelCase` | `?sortBy=createdAt&isPublic=true` |
| Headers custom | `X-` + `PascalCase` | `X-Requested-With` |

**Nommage du Code :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Fichiers NestJS | `kebab-case.type.ts` | `links.service.ts`, `links.controller.ts`, `create-link.dto.ts` |
| Fichiers Angular | `kebab-case.type.ts` | `link-card.component.ts`, `links.service.ts` |
| Classes | `PascalCase` | `LinksService`, `CreateLinkDto`, `LinkEntity` |
| Variables / fonctions | `camelCase` | `findAllByUser`, `publicToken`, `isExpired` |
| Constantes | `UPPER_SNAKE_CASE` | `JWT_EXPIRY`, `MAX_LOGIN_ATTEMPTS` |
| Sélecteurs Angular | `app-` + `kebab-case` | `app-link-card`, `app-recipe-detail` |

---

### Patterns de Structure

**Organisation des fichiers NestJS (par module métier) :**
```
backend/src/links/
├── links.module.ts
├── links.controller.ts
├── links.controller.spec.ts   # co-localisé
├── links.service.ts
├── links.service.spec.ts      # co-localisé
├── link.entity.ts
├── dto/
│   ├── create-link.dto.ts
│   └── update-link.dto.ts
```

**Organisation des fichiers Angular (par module métier) :**
```
frontend/src/app/links/
├── links.routes.ts
├── links.service.ts
├── links.service.spec.ts      # co-localisé
├── components/
│   ├── link-list/
│   │   ├── link-list.component.ts
│   │   ├── link-list.component.html
│   │   ├── link-list.component.scss
│   │   └── link-list.component.spec.ts
```

**Utilitaires & Partagés :**

- NestJS : `src/common/` — guards, interceptors, decorators, filters
- Angular : `src/app/shared/` — composants réutilisables, pipes, directives

---

### Patterns de Format

**Réponses API :**

| Cas | Format | Exemple |
|-----|--------|---------|
| Ressource unique | Objet direct | `{id: 1, title: "...", url: "..."}` |
| Liste de ressources | Tableau direct | `[{id: 1, ...}, {id: 2, ...}]` |
| Création | Ressource créée | `{id: 3, title: "...", createdAt: "..."}` |
| Suppression | 204 No Content | *(corps vide)* |
| Mise à jour | Ressource mise à jour | `{id: 1, title: "...", updatedAt: "..."}` |

**Format des erreurs (HttpException NestJS) :**
```json
{
  "statusCode": 404,
  "message": "Link not found",
  "error": "Not Found"
}
```

**Champs JSON :**

- Toujours `camelCase` dans les DTOs NestJS et les interfaces Angular
- Dates : chaînes ISO 8601 (`"2026-04-21T10:30:00.000Z"`)
- Booléens : `true`/`false` (jamais `0`/`1`)
- Valeurs absentes : `null` (jamais `undefined` dans les réponses JSON)

---

### Patterns de Communication

**State Management Angular (Signals) :**

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Signal de données | `camelCase`, nom de la ressource | `links = signal<Link[]>([])` |
| Signal de chargement | `is` + `PascalCase` + `Loading` | `isLinksLoading = signal(false)` |
| Signal d'erreur | `camelCase` + `Error` | `linksError = signal<string \| null>(null)` |
| Computed | `camelCase`, forme descriptive | `filteredLinks = computed(...)` |

**Pattern de mise à jour immutable (Signals) :**
```typescript
// ✅ Correct
this.links.update(current => [...current, newLink]);
// ❌ Interdit
this.links().push(newLink);
```

---

### Patterns de Processus

**Gestion des erreurs :**

- NestJS : `HttpException` standard pour toutes les erreurs HTTP ; exceptions custom étendant `HttpException` si besoin de codes métier
- Angular : intercepteur HTTP centralisé gère les 401 (refresh silencieux) et les autres erreurs (notification utilisateur)
- Logging NestJS : `Logger` natif NestJS avec contexte (`new Logger('LinksService')`) — pas de `console.log`

**États de chargement Angular :**

- Signal local par composant/service : `isXxxLoading = signal(false)`
- Pattern systématique : `true` avant l'appel HTTP, `false` dans `finalize()` RxJS ou `finally` async
- Pas d'état de chargement global partagé sauf pour les opérations d'auth

**Validation :**

- NestJS : `class-validator` sur tous les DTOs, `ValidationPipe` global activé au démarrage
- Angular : validation réactive (`Validators`) côté client pour le feedback immédiat — la validation API reste la source de vérité

---

### Directives Obligatoires pour Tous les Agents IA

**Tous les agents DOIVENT :**

- Nommer les tables TypeORM en `PascalCase` sans `namingStrategy` custom
- Utiliser des endpoints REST au pluriel sous `/api/`
- Retourner des réponses JSON directes (pas d'enveloppe `{data: ...}`)
- Écrire les specs `.spec.ts` co-localisées à côté du fichier source
- Utiliser `HttpException` NestJS pour toutes les erreurs HTTP
- Nommer les champs JSON en `camelCase` dans DTOs et interfaces
- Utiliser `Logger` NestJS (jamais `console.log`) avec contexte de classe
- Toujours activer `ValidationPipe` globalement, jamais par route

**Anti-patterns à éviter :**

- ❌ `namingStrategy: new SnakeCaseNamingStrategy()` dans TypeORM
- ❌ Endpoints singuliers (`/api/link`)
- ❌ Enveloppe de réponse `{data: [...], meta: {...}}`
- ❌ Tests unitaires dans un répertoire `__tests__/` séparé — specs `.spec.ts` co-localisées uniquement
- ✅ Exception : `e2e/` à la racine pour les tests Playwright (scope cross-couches)
- ❌ `console.log` dans le code NestJS
- ❌ `synchronize: true` en production TypeORM
- ❌ Mutation directe des signals Angular

## Structure du Projet & Frontières

### Arborescence Complète du Projet

```
dashboard/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # lint + tests + build + e2e (feature/* → develop)
│       └── cd.yml                    # build Docker + déploiement SSH (develop → main)
├── e2e/                              # Tests Playwright E2E (cross-couches)
│   ├── playwright.config.ts
│   └── tests/
│       └── auth.spec.ts              # Smoke test connexion (story 3-0)
├── scripts/
│   └── backup.sh                     # dump MariaDB si base embarquée
├── docker-compose.yml                # prod
├── docker-compose.override.yml       # dev overrides (ports exposés, hot-reload)
├── .env.example
├── .gitignore
│
├── backend/
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── .env.example
│   ├── Dockerfile
│   │
│   └── src/
│       ├── main.ts                   # bootstrap + ValidationPipe global + cookie-parser
│       ├── app.module.ts             # module racine
│       │
│       ├── config/
│       │   ├── app.config.ts         # @nestjs/config + validation Joi
│       │   └── typeorm.config.ts     # DataSource config (migrations uniquement)
│       │
│       ├── common/                   # cross-cutting concerns
│       │   ├── guards/
│       │   │   ├── jwt-auth.guard.ts
│       │   │   ├── roles.guard.ts
│       │   │   └── must-change-password.guard.ts
│       │   ├── decorators/
│       │   │   ├── current-user.decorator.ts
│       │   │   └── roles.decorator.ts
│       │   ├── filters/
│       │   │   └── http-exception.filter.ts
│       │   └── interceptors/
│       │       └── transform.interceptor.ts
│       │
│       ├── auth/                     # FR1–7
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.controller.spec.ts
│       │   ├── auth.service.ts
│       │   ├── auth.service.spec.ts
│       │   ├── strategies/
│       │   │   ├── jwt.strategy.ts
│       │   │   └── local.strategy.ts
│       │   ├── entities/
│       │   │   └── refresh-token.entity.ts
│       │   └── dto/
│       │       ├── login.dto.ts
│       │       └── change-password.dto.ts
│       │
│       ├── users/                    # FR8–12 (admin)
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.controller.spec.ts
│       │   ├── users.service.ts
│       │   ├── users.service.spec.ts
│       │   ├── user.entity.ts
│       │   └── dto/
│       │       ├── create-user.dto.ts
│       │       └── update-user.dto.ts
│       │
│       ├── links/                    # FR13–22
│       │   ├── links.module.ts
│       │   ├── links.controller.ts
│       │   ├── links.controller.spec.ts
│       │   ├── links.service.ts
│       │   ├── links.service.spec.ts
│       │   ├── link.entity.ts
│       │   └── dto/
│       │       ├── create-link.dto.ts
│       │       └── update-link.dto.ts
│       │
│       ├── recipes/                  # FR23–28
│       │   ├── recipes.module.ts
│       │   ├── recipes.controller.ts
│       │   ├── recipes.controller.spec.ts
│       │   ├── recipes.service.ts
│       │   ├── recipes.service.spec.ts
│       │   ├── recipe.entity.ts
│       │   ├── recipe-step.entity.ts
│       │   └── dto/
│       │       ├── create-recipe.dto.ts
│       │       └── update-recipe.dto.ts
│       │
│       ├── notes/                    # FR29–34
│       │   ├── notes.module.ts
│       │   ├── notes.controller.ts
│       │   ├── notes.controller.spec.ts
│       │   ├── notes.service.ts
│       │   ├── notes.service.spec.ts
│       │   ├── note.entity.ts
│       │   └── dto/
│       │       ├── create-note.dto.ts
│       │       └── update-note.dto.ts
│       │
│       ├── sharing/                  # FR35–41
│       │   ├── sharing.module.ts
│       │   ├── sharing.controller.ts
│       │   ├── sharing.controller.spec.ts
│       │   ├── sharing.service.ts
│       │   ├── sharing.service.spec.ts
│       │   ├── public-token.entity.ts
│       │   └── dto/
│       │       └── create-share.dto.ts
│       │
│       └── og-fetch/                 # proxy favicon/OG (dépendance de links)
│           ├── og-fetch.module.ts
│           ├── og-fetch.service.ts
│           └── og-fetch.service.spec.ts
│
│   └── migrations/                   # TypeORM migrations (générées, jamais manuelles)
│       └── YYYYMMDDHHMMSS-InitSchema.ts
│
└── frontend/
    ├── angular.json
    ├── package.json
    ├── tsconfig.json
    ├── tsconfig.app.json
    ├── tsconfig.spec.json
    ├── ngsw-config.json              # PWA app shell
    ├── Dockerfile
    ├── nginx.conf                    # serve SPA + proxy /api → backend
    │
    └── src/
        ├── index.html
        ├── main.ts                   # bootstrapApplication + appConfig
        ├── styles.scss               # variables SCSS globales, theming Material
        │
        ├── app/
        │   ├── app.config.ts         # provideExperimentalZonelessChangeDetection, provideRouter, provideHttpClient
        │   ├── app.routes.ts         # routes racine avec lazy loading
        │   │
        │   ├── core/                 # services singleton, guards, intercepteurs
        │   │   ├── guards/
        │   │   │   ├── auth.guard.ts
        │   │   │   ├── admin.guard.ts
        │   │   │   └── must-change-password.guard.ts
        │   │   ├── interceptors/
        │   │   │   ├── csrf.interceptor.ts
        │   │   │   └── auth-error.interceptor.ts
        │   │   └── services/
        │   │       └── auth.service.ts
        │   │
        │   ├── shared/               # composants/pipes/directives réutilisables
        │   │   ├── components/
        │   │   │   ├── confirm-dialog/
        │   │   │   └── loading-spinner/
        │   │   └── pipes/
        │   │       └── truncate.pipe.ts
        │   │
        │   ├── auth/                 # FR1–7 (eager)
        │   │   ├── auth.routes.ts
        │   │   ├── login/
        │   │   │   ├── login.component.ts
        │   │   │   ├── login.component.html
        │   │   │   ├── login.component.scss
        │   │   │   └── login.component.spec.ts
        │   │   └── change-password/
        │   │       ├── change-password.component.ts
        │   │       ├── change-password.component.html
        │   │       └── change-password.component.scss
        │   │
        │   ├── links/                # FR13–22 (lazy)
        │   │   ├── links.routes.ts
        │   │   ├── links.service.ts
        │   │   ├── links.service.spec.ts
        │   │   └── components/
        │   │       ├── link-list/
        │   │       └── link-form/
        │   │
        │   ├── recipes/              # FR23–28 (lazy)
        │   │   ├── recipes.routes.ts
        │   │   ├── recipes.service.ts
        │   │   ├── recipes.service.spec.ts
        │   │   └── components/
        │   │       ├── recipe-list/
        │   │       ├── recipe-detail/
        │   │       └── recipe-editor/
        │   │
        │   ├── notes/                # FR29–34 (lazy)
        │   │   ├── notes.routes.ts
        │   │   ├── notes.service.ts
        │   │   └── components/
        │   │       ├── note-list/
        │   │       └── note-editor/
        │   │
        │   ├── admin/                # FR8–12 (lazy, adminGuard)
        │   │   ├── admin.routes.ts
        │   │   ├── admin.service.ts
        │   │   └── components/
        │   │       └── user-management/
        │   │
        │   └── share/                # FR35–41 (lazy, public)
        │       ├── share.routes.ts
        │       └── components/
        │           └── share-view/
        │
        └── environments/
            ├── environment.ts
            └── environment.prod.ts
```

---

### Frontières Architecturales

**Frontières API (NestJS) :**

| Frontière | Description |
|-----------|-------------|
| Auth | Tous les modules sauf `sharing` (routes publiques) requièrent `JwtAuthGuard` |
| Isolation userId | Chaque service filtre systématiquement par `userId` extrait du JWT — jamais passé en body |
| Admin | `RolesGuard` + `@Roles('admin')` sur `UsersController` |
| Routes publiques | `SharingController` : pas de guard auth, accès read-only, validation token CSPRNG |
| Rate limiting | `@nestjs/throttler` global sur `AuthController` uniquement |

**Frontières Composants (Angular) :**

| Frontière | Description |
|-----------|-------------|
| Auth → App | `authGuard` bloque toutes les routes sauf `/login` ; `mustChangePasswordGuard` redirige si flag actif |
| Core → Features | Services `core/` injectables partout ; features ne communiquent pas directement entre elles |
| Shared | Composants `shared/` sans dépendance sur les services métier |
| TipTap wrapper | Composant standalone `ControlValueAccessor` dans `recipes/` et `notes/` |

**Frontières de Données :**

| Frontière | Description |
|-----------|-------------|
| Entités | Chaque module possède ses entités TypeORM — pas d'import d'entité cross-module sans relation explicite |
| Migrations | Générées uniquement via `typeorm migration:generate` — jamais éditées manuellement |
| Accès DB | Repositories TypeORM injectés dans les services uniquement — jamais dans les controllers |

---

### Cartographie FR → Structure

| Domaine | FRs | Backend | Frontend |
|---------|-----|---------|----------|
| Auth | FR1–7 | `src/auth/` + `src/common/guards/` | `app/auth/` + `app/core/` |
| Administration | FR8–12 | `src/users/` | `app/admin/` |
| Liens | FR13–22 | `src/links/` + `src/og-fetch/` | `app/links/` |
| Recettes | FR23–28 | `src/recipes/` | `app/recipes/` |
| Notes | FR29–34 | `src/notes/` | `app/notes/` |
| Partage public | FR35–41 | `src/sharing/` | `app/share/` |
| Personnalisation | FR42–44 | Persisté dans `User.preferences` (JSON) | `app/core/services/theme.service.ts` |
| Infrastructure | FR45–48 | `config/` + `migrations/` + Docker | `environments/` + `ngsw-config.json` |

---

### Points d'Intégration

**Communication interne :**

- Frontend → Backend : HTTP REST via `HttpClient` Angular + intercepteurs (CSRF + auth)
- Auth flow : httpOnly cookie géré automatiquement par le navigateur
- Refresh token : intercepteur `auth-error.interceptor.ts` intercepte les 401, appelle `/api/auth/refresh`, rejoue la requête

**Flux de données :**

```
Angular Component
  → Signal (lecture/écriture locale)
  → Feature Service (logique métier + appel HTTP)
  → HttpClient + Intercepteurs
  → NestJS Controller (validation DTO)
  → NestJS Service (logique + isolation userId)
  → TypeORM Repository
  → MariaDB
```

**Intégrations externes :**

- `OgFetchService` : requête HTTP server-side vers URLs tierces (timeout court, fallback `null`)
- `@angular/pwa` : service worker pour app shell (pas d'API calls cachés)
- Docker Compose : réseau interne `dashboard_net` — frontend Nginx proxy `/api` vers `backend:3000`

---

## Conventions Angular Material 3 — Pièges et Patterns

> Cette section documente les comportements contre-intuitifs découverts lors de l'implémentation (Épic 3). Elle est destinée aux agents dev pour éviter de répéter les mêmes erreurs dans les Épics 4-7.

### `mat-chip` standalone : pas de fond coloré possible

En AM3, `<mat-chip>` utilisé en dehors d'un `mat-chip-set` rend en mode **"assist chip" outlined** (fond transparent, bordure uniquement). Les propriétés suivantes sont **sans effet** :

```scss
/* ❌ Ne fonctionne pas */
.my-chip {
  background-color: red;
  --mdc-chip-elevated-container-color: red;
  --mdc-chip-label-text-color: white;
}
```

**✅ Solution : utiliser un `<span>` stylé pour tous les badges de statut non-interactifs.** Voir le pattern complet dans `ux-design-Dashboard.md` → section "Badges de statut — Pattern AM3".

Ne jamais importer `MatChipsModule` juste pour afficher une étiquette colorée.

### `color` sur `mat-icon` : ignoré en AM3

```html
<!-- ❌ color sur mat-icon est ignoré en AM3 -->
<mat-icon color="warn">delete</mat-icon>

<!-- ❌ color="warn" sur le bouton est instable en AM3 -->
<button mat-icon-button color="warn">...</button>
```

**✅ Solution : classe CSS sur le bouton, couleur sur l'icône via descendant selector :**

```html
<button mat-icon-button class="delete-button">
  <mat-icon>delete</mat-icon>
</button>
```

```scss
.delete-button .mat-icon { color: var(--mat-sys-error); }
```

### Tokens AM3 `--mat-sys-*` vs tokens custom `--color-*`

L'API `mat.theme()` génère automatiquement les tokens `--mat-sys-*` (ex: `--mat-sys-primary`, `--mat-sys-error`, `--mat-sys-on-primary`). Ces tokens s'adaptent aux deux thèmes automatiquement — **les utiliser en priorité** pour rester cohérent avec Material.

Les tokens `--color-*` custom (`--color-warning`, `--color-success`, etc.) sont définis manuellement dans `styles.scss` avec des valeurs pour chaque thème. Les utiliser pour les états sémantiques non couverts par Material (warning, success).

| Besoin | Token à utiliser |
|--------|-----------------|
| Couleur primaire (rouge Braise) | `--mat-sys-primary` / `--mat-sys-on-primary` |
| Erreur / destructif | `--mat-sys-error` / `--mat-sys-on-error` |
| Surface neutre | `--mat-sys-surface-variant` / `--mat-sys-on-surface-variant` |
| Warning (orange) | `--color-warning` / `--color-on-warning` |
| Success (vert) | `--color-success` / `--color-on-success` |
| Jamais de valeur hardcodée | — |

### Angular CDK — Drag & drop cross-liste (story 4.7)

Le drag & drop inter-catégories dans le module Liens utilise le pattern `cdkDropListGroup` :

```html
<!-- LinksComponent — conteneur des catégories -->
<div cdkDropListGroup>
  @for (cat of categories(); track cat.id) {
    <app-link-category-card cdkDrag ... />
  }
</div>
```

Chaque `cdkDropList` imbriqué dans `LinkCategoryCard` est automatiquement connecté aux autres via le groupe.

**Dans `LinkCategoryCard.dropLink()` :**
```typescript
dropLink(event: CdkDragDrop<Link[]>): void {
  if (event.previousContainer === event.container) {
    // Réorganisation intra-catégorie (existant)
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    this.reorderLinks.emit(...);
  } else {
    // Déplacement inter-catégories (story 4.7)
    transferArrayItem(event.previousContainer.data, event.container.data,
                      event.previousIndex, event.currentIndex);
    this.moveLink.emit({ link: event.item.data, targetCategoryId: this.category.id });
  }
}
```

**`@Output() moveLink`** ajouté sur `LinkCategoryCardComponent` : `LinksComponent` appelle `PATCH /api/links/:id` avec `{ categoryId }` puis met à jour le signal (optimistic update avec rollback sur erreur).

**`UpdateLinkDto` (backend)** : accepte `categoryId?: number` en champ optionnel. Vérification que la catégorie cible appartient à l'utilisateur courant (filtre `userId` existant).

**Contrainte :** les catégories repliées (`MatExpansionPanel` collapsed) doivent rester des cibles de drop valides — utiliser `cdkDropListSortingDisabled` si la liste cible est vide.

---

### Paramétrage de la grid Liens (story 4.8)

**State management :**
- Service `LinksGridSettingsService` (injectable root) — Signal `gridSettings` de type `{ columns: number; cardWidth: number; gapH: number; gapV: number; linkHeight: number }`
- Valeurs par défaut : `{ columns: 3, cardWidth: 280, gapH: 16, gapV: 16, linkHeight: 32 }`
- Rétrocompatibilité : un objet localStorage sans `linkHeight` (ou hors bornes 32–46) retombe sur le défaut, champ par champ (`clamp`)
- Persistance : lecture/écriture dans `localStorage` (clé `links-grid-settings`) au bootstrap du service et à chaque mutation du signal

**Binding CSS :**
- `LinksComponent` applique les CSS custom properties sur son host element via `HostBinding` ou `effect()` :
  `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`, `--link-row-height`
- Ligne de lien en mode lecture (`LinkItemComponent`) : hauteur pilotée par `--link-row-height` (repli 32px), padding vertical = `calc((var(--link-row-height, 32px) - 26px) / 2)`, tuile 26 px fixe. Le mode édition (44 px min) n'est pas concerné.
- Sous 600 px, `--link-row-height` n'est pas appliquée (lignes à 46 px, padding 10 px), comme les autres propriétés de paramétrage.
- Grid CSS :
  `grid-template-columns: repeat(var(--link-columns, 3), minmax(var(--link-card-width, 280px), 1fr));`
  `gap: var(--link-gap-v, 16px) var(--link-gap-h, 16px);`

**Breakpoint 600 px :**
- Breakpoint propre au module Liens (mode lecture uniquement) — n'affecte pas le breakpoint global 768 px utilisé dans les autres modules
- Implémenté via `BreakpointObserver` Angular CDK pour masquer l'icône ⚙️ et forcer 1 colonne sous 600 px

**UI — Popover paramétrage :**
- `MatMenu` attaché à l'icône ⚙️ (`mat-icon-button`)
- Contrôles : `MatSlider` (cardWidth, gapH, gapV, linkHeight) + stepper custom ou `MatInput` type number (columns)
- Visible uniquement en mode lecture et viewport ≥ 600 px

---

### Theming : `mat.theme()` vs ancienne API `mat.define-*-theme()`

Ce projet utilise la **nouvelle API AM3** (`mat.theme()` dans `html { }` et `.dark-theme { }`), pas l'ancienne API AM2 (`mat.define-dark-theme()` + `mat.all-component-themes()`). Les snippets de documentation ou Stack Overflow utilisant l'ancienne API sont **incompatibles**.

```scss
/* ✅ Nouvelle API — ce projet */
html { @include mat.theme((color: (primary: mat.$red-palette, theme-type: light), ...)); }
.dark-theme { @include mat.theme((color: (primary: mat.$red-palette, theme-type: dark))); }

/* ❌ Ancienne API AM2 — ne pas utiliser */
$theme: mat.define-light-theme(...);
@include mat.all-component-themes($theme);
```

---

## Validation de l'Architecture

### Cohérence ✅

| Vérification | Résultat |
|---|---|
| Angular 21 zoneless + Signals + OnPush | ✅ Cohérent — détection de changements via signals uniquement |
| NestJS 11 + TypeORM + mysql2 (MariaDB) | ✅ Compatible — mysql2 est le driver recommandé |
| httpOnly cookie + `SameSite=Strict` + `X-Requested-With` | ✅ Double protection XSS + CSRF sans token dédié |
| Migrations TypeORM uniquement + pas de `synchronize` | ✅ Contrôle total du schéma |
| Throttler uniquement sur AuthController | ✅ Proportionné (< 10 utilisateurs) |
| Docker Compose single-file + Nginx proxy `/api` | ✅ Zéro dépendance externe |
| PascalCase tables + camelCase colonnes TypeORM | ✅ Défaut TypeORM sans namingStrategy |
| camelCase JSON + interfaces Angular | ✅ Aucune transformation sérialisation nécessaire |

---

### Couverture des Exigences ✅

| Domaine | FRs | Couverture |
|---------|-----|-----------|
| Auth | FR1–7 | ✅ `auth/` + JWT httpOnly + refresh token DB + guards + rate limiting |
| Administration | FR8–12 | ✅ `users/` + `RolesGuard` + `@Roles('admin')` |
| Liens | FR13–22 | ✅ `links/` + `og-fetch/` proxy favicon/OG |
| Recettes | FR23–28 | ✅ `recipes/` + `recipe-step` entity + champ `avantPropos TEXT NULL` (migration story 5.7) |
| Notes (Epic 7 — Trilium) | FR_S1, FR_T1, FR_T2, FR_T4, FR_T5, FR_T6 | ✅ `settings/` + `trilium/` (ping) + champs `triliumUrl`/`notesEnabled` sur `User` |
| Notes (Epic 8 — intégré) | FR_N0, FR29–34 | ⏳ `notes/` + TipTap wrapper (Epic 8) |
| Partage public | FR35–41 | ✅ `sharing/` + CSPRNG tokens + routes read-only sans guard |
| Personnalisation | FR42–44 | ✅ `User.preferences` JSON + `theme.service.ts` + localStorage |
| Infrastructure | FR45–48 | ✅ Docker Compose + healthchecks + `backup.sh` + GitHub Actions |

| NFR | Couverture |
|-----|-----------|
| bcrypt ≥ cost 12 | ✅ `auth.service.ts` |
| JWT httpOnly + refresh silencieux | ✅ cookie-parser + intercepteur Angular |
| CSPRNG ≥ 128 bits | ✅ `crypto.randomBytes(32)` → 256 bits |
| Isolation userId | ✅ Filtre userId dans chaque service, jamais passé en body |
| Performance < 100ms | ✅ Zoneless + OnPush + Vite/esbuild |
| WCAG 2.1 AA | ✅ Angular Material + thème CSS sur `<body>` |
| Fiabilité docker-compose | ✅ Healthchecks documentés |
| Dumps DB | ✅ `scripts/backup.sh` |

---

### Checklist de Complétude

- [x] Exigences fonctionnelles analysées (48 FRs, 8 domaines)
- [x] Exigences non-fonctionnelles adressées
- [x] Contraintes techniques documentées
- [x] Stack complète avec versions et commandes d'installation
- [x] Stratégie auth (httpOnly + refresh token DB)
- [x] Stratégie données (migrations uniquement, hard delete)
- [x] Infrastructure et déploiement (Docker Compose + GitFlow + CI/CD)
- [x] Conventions de nommage (BDD, API, code)
- [x] Patterns de structure (modules, fichiers, tests co-localisés)
- [x] Patterns de format (réponses directes, JSON camelCase, erreurs HttpException)
- [x] Directives obligatoires et anti-patterns pour agents IA
- [x] Arborescence complète avec noms de fichiers réels
- [x] Frontières architecturales documentées
- [x] Cartographie FR → structure
- [x] Points d'intégration et flux de données

---

---

## Addendum — Intégration Trilium Notes (Epic 7)

> **Origine :** Sprint Change Proposal 2026-06-18

### Modèle de données — ajouts sur l'entité `User`

```typescript
// Ajouts à l'entité User existante (migration TypeORM)
@Column({ type: 'varchar', length: 500, nullable: true })
triliumUrl: string | null;

@Column({ type: 'boolean', default: false })
notesEnabled: boolean;
```

Migration : `AddTriliumSettingsToUser` — ajout des deux colonnes sur la table `User`.

### Nouveau module backend — `TriliumModule`

```
backend/src/
└── trilium/
    ├── trilium.module.ts
    ├── trilium.controller.ts       # GET /api/trilium/ping?url=
    ├── trilium.controller.spec.ts
    └── trilium.service.ts          # HEAD HTTP + validation anti-SSRF
```

**Endpoint :** `GET /api/trilium/ping?url=<encodedUrl>`
- Authentifié (JwtAuthGuard)
- Valide que l'URL est bien http/https (anti-SSRF basique)
- Effectue un `HEAD` HTTP avec timeout 5s via `HttpService` (NestJS `@nestjs/axios`)
- Retourne `{ reachable: true }` ou `{ reachable: false, reason: string }`

### Nouveau endpoint utilisateur

`GET /api/users/me/notes-settings` → retourne `{ triliumUrl, notesEnabled }`
`PATCH /api/users/me/notes-settings` → met à jour `triliumUrl` et/ou `notesEnabled`

Ces endpoints sont ajoutés dans le `UsersController` existant (pas de nouveau module).

### Nouveau module frontend — `SettingsModule`

```
frontend/src/app/
└── settings/
    ├── settings.routes.ts          # /settings
    ├── settings.component.ts
    └── notes-settings/
        ├── notes-settings.component.ts
        └── notes-settings.component.spec.ts
```

Route `/settings` : lazy-loaded, protégée par `authGuard`.

### Module frontend — `NotesModule` (Epic 7)

```
frontend/src/app/
└── notes/
    ├── notes.routes.ts             # /notes → guard notesEnabledGuard
    └── trilium-embed/
        ├── trilium-embed.component.ts   # <iframe> + loading bar + error state
        └── trilium-embed.component.spec.ts
```

Guard `notesEnabledGuard` : redirige vers `/dashboard` si `notesEnabled = false`.

### Note de déploiement — Configuration Trilium

Pour autoriser l'embedding de Trilium dans le Dashboard, l'utilisateur doit ajouter dans la configuration de son instance Trilium :

```
Content-Security-Policy: frame-ancestors 'self' https://dashboard.monserveur.fr
```

Cette configuration est propre à chaque installation — l'URL du Dashboard doit correspondre à l'origine réelle de l'application.

---

### Statut Final : PRÊT POUR L'IMPLÉMENTATION

**Niveau de confiance : Élevé** — architecture proportionnée aux contraintes réelles, zéro sur-ingénierie, patterns suffisamment précis pour des agents IA indépendants.

**Axes post-MVP :** Cache PWA runtime, NgRx Signal Store si complexité d'état augmente, versioning API si clients externes.
