# Story 2.3 : Session persistante avec refresh silencieux

Status: done

## Story

En tant qu'utilisateur authentifié,
Je veux que ma session reste active entre les visites sans avoir à me reconnecter manuellement,
Afin que Dashboard s'ouvre immédiatement à chaque ouverture d'onglet.

## Critères d'Acceptation

1. **Étant donné** que mon JWT a expiré mais que mon refresh token est valide,
   **Quand** l'intercepteur Angular `auth-error.interceptor.ts` détecte une réponse 401,
   **Alors** il appelle automatiquement `POST /api/auth/refresh`, reçoit un nouveau JWT en httpOnly cookie, et rejoue la requête originale — sans que l'utilisateur ne voie l'écran de login

2. **Étant donné** que mon refresh token est expiré ou supprimé en DB,
   **Quand** le refresh échoue (401 sur `POST /api/auth/refresh`),
   **Alors** `currentUser` est mis à null et l'utilisateur est redirigé vers `/login`

3. **Étant donné** que le header `X-Requested-With: XMLHttpRequest` est configuré dans `csrf.interceptor.ts`,
   **Quand** toute requête est envoyée vers `/api/`,
   **Alors** le header est présent et le backend valide sa présence via `CsrfMiddleware` pour toutes les méthodes mutantes (mitigation CSRF)

## Tasks / Subtasks

### Backend

- [x] **T1 — Ajouter méthode `refresh()` dans `AuthService`** (AC: #1, #2)
  - [x] Créer méthode `async refresh(rawToken: string)` dans `backend/src/auth/auth.service.ts`
  - [x] Hasher `rawToken` avec `sha256()` (fonction locale déjà présente dans le fichier)
  - [x] Chercher dans `refreshTokenRepository.findOne({ where: { token: hash } })`
  - [x] Lever `UnauthorizedException` si non trouvé
  - [x] Vérifier `tokenRecord.expiresAt > new Date()` — lever `UnauthorizedException` + nettoyer si expiré (adresse déféré story 2.1)
  - [x] Charger l'user via `usersService.findById(tokenRecord.userId)` — vérifier `user.isActive`
  - [x] **Supprimer** l'ancien token : `refreshTokenRepository.delete(tokenRecord.id)` — rotation (adresse déféré story 2.2)
  - [x] Appeler `this.login(user)` → retourne `{ accessToken, refreshToken }`
  - [x] Retourner `{ accessToken, refreshToken, user: await this.me(user.id) }`

- [x] **T2 — Ajouter endpoint `POST /api/auth/refresh`** dans `AuthController` (AC: #1, #2)
  - [x] Ajouter `@Post('refresh') @HttpCode(200) @SkipThrottle()` dans `backend/src/auth/auth.controller.ts`
  - [x] Ajouter `SkipThrottle` aux imports depuis `@nestjs/throttler` (compléter l'import existant)
  - [x] Lire `req.cookies?.refresh_token` — lever `UnauthorizedException` si absent
  - [x] Appeler `authService.refresh(rawToken)` — laisser l'exception remonter si 401
  - [x] Émettre `jwt` cookie avec `COOKIE_OPTIONS` + `parseJwtExpiry()` (constante + fonction déjà dans le fichier)
  - [x] Émettre `refresh_token` cookie avec `path: '/api/auth'` (cohérent avec le login)
  - [x] Retourner l'objet `user` (déjà sans passwordHash via `authService.me()`)

- [x] **T3 — Créer `CsrfMiddleware`** (AC: #3)
  - [x] Créer `backend/src/common/middleware/csrf.middleware.ts`
  - [x] Implémenter `NestMiddleware` — vérifier `X-Requested-With: XMLHttpRequest` pour POST/PUT/PATCH/DELETE
  - [x] Lever `ForbiddenException('En-tête CSRF manquant')` si absent
  - [x] Dans `AppModule` : ajouter `implements NestModule` + méthode `configure(consumer: MiddlewareConsumer)`
  - [x] Appliquer le middleware sur toutes les routes (le middleware filtre lui-même les GET/HEAD/OPTIONS)

- [x] **T4 — Tests unitaires backend** (AC: tous)
  - [x] `auth.service.spec.ts` — ajouter 4 cas pour `refresh()` : token valide + rotation, token expiré, token inexistant, user inactif
  - [x] `auth.controller.spec.ts` — ajouter 3 cas pour `POST /auth/refresh` : succès + nouveaux cookies, sans cookie (401), service lève 401

- [x] **T5 — Validation backend**
  - [x] `npm run build` → 0 erreur TypeScript
  - [x] `npm test` → tous les tests verts, aucune régression

### Frontend

- [x] **T6 — Créer `csrf.interceptor.ts`** (AC: #3)
  - [x] Créer `frontend/src/app/core/interceptors/csrf.interceptor.ts`
  - [x] Même structure que `credentials.interceptor.ts` — ajouter `X-Requested-With: XMLHttpRequest` sur toutes les requêtes `/api/`

- [x] **T7 — Créer `auth-error.interceptor.ts`** (AC: #1, #2)
  - [x] Créer `frontend/src/app/core/interceptors/auth-error.interceptor.ts`
  - [x] Intercepter les erreurs 401 — exclure `req.url.includes('/api/auth/')` pour éviter la boucle infinie
  - [x] Pattern déduplication : variables module-level `isRefreshing` + `BehaviorSubject<boolean | null>`
  - [x] Si refresh en cours : attendre via `filter(v => v !== null).pipe(take(1))`
  - [x] Succès refresh → `next(req)` (rejoue la requête originale)
  - [x] Échec refresh → `currentUser.set(null)` implicite (fait par `refreshToken()`) + `router.navigate(['/login'])`

- [x] **T8 — Mettre à jour `AuthService` Angular** (AC: #1, #2)
  - [x] Ajouter `refreshToken(): Observable<boolean>` dans `frontend/src/app/core/services/auth.service.ts`
  - [x] `POST /api/auth/refresh` → `tap(user => currentUser.set(user))` → `map(() => true)`
  - [x] `catchError(() => { currentUser.set(null); return of(false); })` — ne rejette jamais
  - [x] Compléter les imports rxjs existants : ajouter `Observable, map, tap, catchError, of`

- [x] **T9 — Mettre à jour `app.config.ts` Angular** (AC: tous)
  - [x] Modifier `frontend/src/app/app.config.ts`
  - [x] `withInterceptors([credentialsInterceptor, csrfInterceptor, authErrorInterceptor])`
  - [x] Ajouter les deux nouveaux imports

- [x] **T10 — Validation frontend**
  - [x] `ng build` → 0 erreur TypeScript
  - [x] Tests existants inchangés (0 régression)

## Dev Notes

### Vue d'Ensemble

Cette story implémente deux mécanismes complémentaires :
1. **Refresh silencieux** : quand le JWT expire, `auth-error.interceptor.ts` intercepte le 401, rafraîchit via `POST /api/auth/refresh` (avec rotation du token), et rejoue la requête — l'utilisateur ne voit jamais `/login`
2. **Protection CSRF** : `csrf.interceptor.ts` ajoute `X-Requested-With: XMLHttpRequest` côté Angular ; `CsrfMiddleware` valide ce header côté NestJS pour toutes les méthodes mutantes

**Déférés adressés obligatoirement dans cette story :**
- `expiresAt > now()` absent lors de la validation du refresh token → `AuthService.refresh()` (T1)
- Rotation des refresh tokens absente (chaque login créait un nouveau token sans supprimer les anciens) → `DELETE` avant création dans `AuthService.refresh()` (T1)
- Cookie `refresh_token path: '/api/auth'` documenté → l'endpoint `/api/auth/refresh` est bien dans ce chemin ✅

**Hors scope (stories suivantes) :**
- `POST /api/auth/logout` : Story 2.4
- Guard `mustChangePassword` : Story 2.5
- Re-vérification de `isActive` sur chaque requête JWT : Story 2.4 (via révocation explicite du token)

---

### T1 — `AuthService.refresh()` (backend)

```typescript
// backend/src/auth/auth.service.ts — AJOUTER cette méthode après login()

async refresh(rawToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: Omit<UserEntity, 'passwordHash' | 'refreshTokens'> | null;
}> {
  const tokenHash = sha256(rawToken);  // sha256() est la fonction locale déjà définie dans ce fichier

  const tokenRecord = await this.refreshTokenRepository.findOne({
    where: { token: tokenHash },
  });

  if (!tokenRecord) {
    throw new UnauthorizedException();
  }

  // Vérification expiration — adresse le déféré de story 2.1
  if (tokenRecord.expiresAt < new Date()) {
    await this.refreshTokenRepository.delete(tokenRecord.id);  // nettoyage
    throw new UnauthorizedException();
  }

  const user = await this.usersService.findById(tokenRecord.userId);
  if (!user || !user.isActive) {
    throw new UnauthorizedException();
  }

  // Rotation — adresse le déféré de story 2.2
  // Supprimer l'ancien token AVANT d'en créer un nouveau
  await this.refreshTokenRepository.delete(tokenRecord.id);
  const { accessToken, refreshToken } = await this.login(user);

  return { accessToken, refreshToken, user: await this.me(user.id) };
}
```

**Points critiques :**
- `sha256()` est une **function locale** déjà définie dans `auth.service.ts` (story 2.2) — NE PAS la réimporter ou redéfinir
- `this.login(user)` est la méthode existante — génère JWT + insère nouveau refresh token en DB → réutilisation propre, pas de duplication
- `this.me(user.id)` est la méthode existante — retourne user sans `passwordHash` ni `refreshTokens`
- La rotation est atomique dans les limites de V1 (mono-instance) : si le serveur crashe entre le DELETE et le INSERT, l'utilisateur devra se reconnecter

---

### T2 — `POST /api/auth/refresh` (AuthController)

```typescript
// backend/src/auth/auth.controller.ts — MODIFICATIONS

// Modifier l'import existant @nestjs/throttler :
import { Throttle, SkipThrottle } from '@nestjs/throttler';

// AJOUTER cet endpoint dans la classe AuthController :

@Post('refresh')
@HttpCode(200)
@SkipThrottle()  // Le refresh est appelé fréquemment en usage normal — pas de rate limiting
@ApiOperation({ summary: 'Rafraîchissement silencieux du JWT via cookie refresh_token' })
async refresh(
  @Req() req: Request & { cookies: Record<string, string> },
  @Res({ passthrough: true }) res: Response,
) {
  const rawToken = req.cookies?.refresh_token;
  if (!rawToken) {
    throw new UnauthorizedException();
  }

  const { accessToken, refreshToken, user } = await this.authService.refresh(rawToken);

  const jwtExpiry = this.configService.get<string>('JWT_EXPIRY', '15m');
  const refreshDays = this.configService.get<number>('REFRESH_TOKEN_EXPIRY_DAYS', 30);

  res.cookie('jwt', accessToken, {
    ...COOKIE_OPTIONS,                   // constante existante dans ce fichier
    maxAge: parseJwtExpiry(jwtExpiry),   // fonction existante dans ce fichier
  });
  res.cookie('refresh_token', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: refreshDays * 24 * 60 * 60 * 1000,
    path: '/api/auth',  // identique au cookie émis dans login() — le navigateur l'envoie automatiquement sur /api/auth/*
  });

  return user;
}
```

**Points critiques :**
- `COOKIE_OPTIONS` et `parseJwtExpiry()` sont définis en tête de `auth.controller.ts` (story 2.2) — NE PAS redéfinir
- `@SkipThrottle()` est essentiel : sans lui, le `ThrottlerGuard` global (configuré dans AppModule) bloquerait les refreshs fréquents
- `@Res({ passthrough: true })` : pattern obligatoire pour que NestJS gère le cycle de vie de la réponse tout en permettant `return user`
- Le cookie `refresh_token` avec `path: '/api/auth'` est envoyé automatiquement par le navigateur sur `/api/auth/refresh` ✅

---

### T3 — `CsrfMiddleware` (backend)

```typescript
// backend/src/common/middleware/csrf.middleware.ts — NOUVEAU FICHIER

import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (!SAFE_METHODS.has(req.method)) {
      if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
        throw new ForbiddenException('En-tête CSRF manquant');
      }
    }
    next();
  }
}
```

**Application dans `AppModule` :**

```typescript
// backend/src/app.module.ts — MODIFICATIONS

import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';  // Ajouter NestModule, MiddlewareConsumer
import { CsrfMiddleware } from './common/middleware/csrf.middleware';

// Modifier la déclaration de classe :
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(CsrfMiddleware)
      .forRoutes('*');  // Appliqué à toutes les routes ; le middleware filtre GET/HEAD/OPTIONS en interne
  }
}
```

**Points critiques :**
- `AppModule` doit maintenant `implements NestModule` — adapter la déclaration de classe
- Le check `SAFE_METHODS` évite l'erreur sur `GET /api/auth/me`, `GET /api/sharing/:token`, etc.
- **Swagger UI en dev** : Swagger ne joint pas le header automatiquement. Pour tester les endpoints mutants via Swagger, ajouter `X-Requested-With: XMLHttpRequest` dans "Request Headers". Ce n'est pas bloquant — Swagger est réservé aux agents de dev.
- Les routes publiques `GET /api/sharing/:token` ne sont pas affectées (méthode GET → filtrée) ✅

---

### T6 — `csrf.interceptor.ts` (Angular)

```typescript
// frontend/src/app/core/interceptors/csrf.interceptor.ts — NOUVEAU FICHIER

import { HttpInterceptorFn } from '@angular/common/http';

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/')) {
    return next(req.clone({
      setHeaders: { 'X-Requested-With': 'XMLHttpRequest' },
    }));
  }
  return next(req);
};
```

Structure identique à `credentials.interceptor.ts` — même condition `/api/`, même pattern `req.clone`. ✅

---

### T7 — `auth-error.interceptor.ts` (Angular)

```typescript
// frontend/src/app/core/interceptors/auth-error.interceptor.ts — NOUVEAU FICHIER

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  EMPTY,
  catchError,
  filter,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import { AuthService } from '../services/auth.service';

// Variables module-level — partagées entre tous les appels de l'intercepteur (comportement singleton)
// Se réinitialisent au rechargement de la page (contexte JS du tab)
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<boolean | null>(null);

export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Exclure les routes auth pour éviter la boucle infinie
      // (si POST /api/auth/refresh retourne 401, on ne retente pas)
      if (error.status !== 401 || req.url.includes('/api/auth/')) {
        return throwError(() => error);
      }

      if (isRefreshing) {
        // Un refresh est déjà en cours — attendre son résultat pour rejouer la requête
        return refreshSubject.pipe(
          filter((v): v is boolean => v !== null),
          take(1),
          switchMap(success => success ? next(req) : EMPTY),
        );
      }

      isRefreshing = true;
      refreshSubject.next(null);  // Signal "refresh en cours"

      return authService.refreshToken().pipe(
        switchMap(success => {
          isRefreshing = false;
          refreshSubject.next(success);
          if (!success) {
            void router.navigate(['/login']);
            return EMPTY;
          }
          return next(req);  // Rejouer la requête originale avec les nouveaux cookies
        }),
        catchError(err => {
          isRefreshing = false;
          refreshSubject.next(false);
          void router.navigate(['/login']);
          return throwError(() => err);
        }),
      );
    }),
  );
};
```

**Points critiques :**
- **`req.url.includes('/api/auth/')`** : exclut `/api/auth/login` et `/api/auth/refresh` — protection contre la boucle infinie
- **Déduplication** : si plusieurs requêtes simultanées reçoivent un 401, une seule demande de refresh est lancée ; les autres attendent via `BehaviorSubject`
- **`EMPTY`** sur échec : l'Observable se complète sans valeur — la requête originale est abandonnée proprement, l'utilisateur est redirigé vers `/login`
- **Rejouer `next(req)`** : la requête retraverse toute la chaîne (`credentialsInterceptor` → `csrfInterceptor` → `authErrorInterceptor`), ce qui re-applique `withCredentials` et le header CSRF ✅
- Les imports (`BehaviorSubject`, `EMPTY`, opérateurs) proviennent tous de `rxjs` (v7+ re-exporte tout depuis le package racine)

---

### T8 — Mise à jour `AuthService` Angular

```typescript
// frontend/src/app/core/services/auth.service.ts — MODIFICATIONS

// Compléter les imports rxjs en tête du fichier (ne pas dupliquer firstValueFrom déjà présent) :
import { firstValueFrom, Observable, map, tap, catchError, of } from 'rxjs';

// AJOUTER après la méthode me() :

refreshToken(): Observable<boolean> {
  return this.http.post<AuthUser>('/api/auth/refresh', {}).pipe(
    tap(user => this.currentUser.set(user)),
    map(() => true),
    catchError(() => {
      this.currentUser.set(null);
      return of(false);
    }),
  );
}
```

**Points critiques :**
- `refreshToken()` retourne `Observable<boolean>` — **jamais** `Promise`, nécessaire pour `switchMap` dans l'intercepteur
- Ne rejette jamais (toutes les erreurs sont converties en `of(false)`) — l'intercepteur n'a pas besoin de `catchError` supplémentaire
- `currentUser.set(null)` sur erreur : nettoie l'état avant que l'intercepteur navigue vers `/login`
- `tap(user => currentUser.set(user))` : met à jour le signal signal côté composants → pas besoin d'appel `me()` supplémentaire

---

### T9 — Mise à jour `app.config.ts` Angular

```typescript
// frontend/src/app/app.config.ts — MODIFICATION de la ligne withInterceptors

// Ajouter les imports :
import { csrfInterceptor } from './core/interceptors/csrf.interceptor';
import { authErrorInterceptor } from './core/interceptors/auth-error.interceptor';

// Modifier provideHttpClient :
provideHttpClient(
  withInterceptors([
    credentialsInterceptor,   // 1. Ajoute withCredentials: true sur /api/
    csrfInterceptor,          // 2. Ajoute X-Requested-With sur /api/
    authErrorInterceptor,     // 3. Gère les 401 (dernier = innermost = traite la réponse en premier)
  ]),
),
```

**Ordre des intercepteurs :**
- Requête sortante : `credentialsInterceptor` → `csrfInterceptor` → `authErrorInterceptor` → backend
- Réponse erreur 401 : `authErrorInterceptor` intercepte en premier → appelle refresh → rejoue `next(req)` qui repasse par toute la chaîne ✅

---

### Arborescence des Fichiers Après Story 2.3

**Nouveaux fichiers :**
```
backend/src/common/middleware/
└── csrf.middleware.ts                        ← nouveau

frontend/src/app/core/interceptors/
├── credentials.interceptor.ts                (existant — story 2.2)
├── csrf.interceptor.ts                       ← nouveau
└── auth-error.interceptor.ts                 ← nouveau
```

**Fichiers modifiés :**
```
backend/src/
├── app.module.ts                             ← implements NestModule + configure(CsrfMiddleware)
└── auth/
    ├── auth.service.ts                       ← ajout refresh()
    ├── auth.service.spec.ts                  ← nouveaux cas de test
    ├── auth.controller.ts                    ← ajout POST /auth/refresh + SkipThrottle import
    └── auth.controller.spec.ts               ← nouveaux cas de test

frontend/src/app/
├── app.config.ts                             ← ajout 2 intercepteurs
└── core/services/auth.service.ts             ← ajout refreshToken()
```

---

### Anti-patterns à Éviter

- ❌ NE PAS appeler `authService.me()` dans le refresh flow — crée une requête HTTP supplémentaire et risque de boucle ; utiliser le `user` retourné par `authService.refresh()`
- ❌ NE PAS oublier `@SkipThrottle()` sur `POST /auth/refresh` — sans lui, le `ThrottlerGuard` global (5 requêtes / 60s) bloquerait les refreshs normaux
- ❌ NE PAS omettre `isRefreshing = false` dans le bloc `catchError` — bloquerait définitivement tous les futurs refreshs
- ❌ NE PAS tenter de refresh si `req.url.includes('/api/auth/')` — boucle infinie garantie
- ❌ NE PAS stocker le raw refresh token ni son hash dans les logs ou réponses API
- ❌ NE PAS redéfinir `COOKIE_OPTIONS` ou `parseJwtExpiry` dans l'endpoint refresh — ce sont des constantes/fonctions déjà dans `auth.controller.ts`
- ❌ NE PAS muter les signals Angular : `this.currentUser.set(...)` uniquement — jamais `this.currentUser().field = x`

### Notes sur les Patterns Existants à Réutiliser

| Élément | Fichier source | Usage dans cette story |
|---------|---------------|------------------------|
| `sha256()` | `auth.service.ts` (fonction locale) | `AuthService.refresh()` — hash du raw token |
| `this.login(user)` | `auth.service.ts` | `AuthService.refresh()` — génère JWT + nouveau refresh token |
| `this.me(userId)` | `auth.service.ts` | `AuthService.refresh()` — user sans passwordHash |
| `COOKIE_OPTIONS` | `auth.controller.ts` | Endpoint `POST /auth/refresh` |
| `parseJwtExpiry()` | `auth.controller.ts` | Endpoint `POST /auth/refresh` |
| `@Res({ passthrough: true })` | `auth.controller.ts` (login) | Endpoint `POST /auth/refresh` |

### Références

- Story précédente : `_bmad-output/implementation-artifacts/2-2-connexion-securisee-avec-rate-limiting.md`
- Épics : `_bmad-output/planning-artifacts/epics.md` — Épic 2, Story 2.3
- Architecture : `_bmad-output/planning-artifacts/architecture.md` — sections "Authentification & Sécurité", "Architecture Frontend", "Points d'Intégration"
- Déférés adressés : `_bmad-output/implementation-artifacts/deferred-work.md` — sections "Deferred from: 2-1-..." (expiresAt) et "Deferred from: 2-2-..." (rotation, path cookie)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucune déviation — implémentation directe selon les specs de la story.

### Completion Notes List

- **T1** : `AuthService.refresh()` ajouté dans `auth.service.ts` — réutilise `sha256()`, `this.login()`, `this.me()` existants. Rotation et vérification `expiresAt` implémentées (déférés 2.1 et 2.2 adressés).
- **T2** : Endpoint `POST /auth/refresh` ajouté dans `auth.controller.ts` — `@SkipThrottle()` sur le refresh, cookies émis avec les constantes/fonctions existantes.
- **T3** : `CsrfMiddleware` créé dans `backend/src/common/middleware/csrf.middleware.ts`. `AppModule` modifié pour `implements NestModule`.
- **T4** : 4 cas `refresh()` dans `auth.service.spec.ts`, 3 cas `POST /auth/refresh` dans `auth.controller.spec.ts`.
- **T5** : Build NestJS → 0 erreur. `npm test` → 26 tests verts (4 suites).
- **T6** : `csrf.interceptor.ts` créé — ajoute `X-Requested-With: XMLHttpRequest` sur `/api/`.
- **T7** : `auth-error.interceptor.ts` créé — déduplication via `isRefreshing` + `BehaviorSubject`, exclusion `/api/auth/` pour éviter boucle infinie.
- **T8** : `refreshToken(): Observable<boolean>` ajouté dans `auth.service.ts` Angular — imports rxjs complétés.
- **T9** : `app.config.ts` mis à jour avec les 3 intercepteurs dans l'ordre correct.
- **T10** : `ng build` → 0 erreur. `ng test` → 17 tests verts (4 suites), 0 régression.

### File List

- `backend/src/auth/auth.service.ts` — modifié (import `UnauthorizedException`, méthode `refresh()`)
- `backend/src/auth/auth.controller.ts` — modifié (import `SkipThrottle` + `UnauthorizedException`, endpoint `POST /auth/refresh`)
- `backend/src/auth/auth.service.spec.ts` — modifié (4 nouveaux cas `refresh()`, mock `findOne`/`delete`)
- `backend/src/auth/auth.controller.spec.ts` — modifié (3 nouveaux cas `POST /auth/refresh`, mock `refresh`)
- `backend/src/common/middleware/csrf.middleware.ts` — nouveau fichier
- `backend/src/app.module.ts` — modifié (import `NestModule`/`MiddlewareConsumer`/`CsrfMiddleware`, `configure()`)
- `frontend/src/app/core/interceptors/csrf.interceptor.ts` — nouveau fichier
- `frontend/src/app/core/interceptors/auth-error.interceptor.ts` — nouveau fichier
- `frontend/src/app/core/services/auth.service.ts` — modifié (imports rxjs, méthode `refreshToken()`)
- `frontend/src/app/app.config.ts` — modifié (imports + 2 intercepteurs ajoutés)

### Review Findings

- [x] [Review][Decision] Requêtes concurrentes silencieusement abandonnées (EMPTY) en cas d'échec du refresh — Décision : EMPTY accepté. La navigation vers `/login` détruit l'arbre de composants Angular (AsyncPipe/takeUntilDestroyed désabonnent automatiquement), scénario rarissime en mono-utilisateur. [frontend/src/app/core/interceptors/auth-error.interceptor.ts:29]

- [x] [Review][Patch] URL absolue contourne le CSRF interceptor [frontend/src/app/core/interceptors/csrf.interceptor.ts:4]
- [x] [Review][Patch] Type de retour `user: ... \| null` jamais null — inline stripping remplace `me()` [backend/src/auth/auth.service.ts:59]
- [x] [Review][Patch] Erreur DB lors du `delete` token expiré propage une 500 au lieu de 401 [backend/src/auth/auth.service.ts:76]
- [x] [Review][Patch] Assertions de test trop permissives (`objectContaining`) pour les attributs de sécurité des cookies [backend/src/auth/auth.controller.spec.ts:93]

- [x] [Review][Defer] Variables module-level `isRefreshing`/`refreshSubject` — pattern spec-requis, single-thread JS [frontend/src/app/core/interceptors/auth-error.interceptor.ts:15] — deferred, pre-existing
- [x] [Review][Defer] `@SkipThrottle()` sur `/refresh` — décision spec consciente (refreshes fréquents) [backend/src/auth/auth.controller.ts:73] — deferred, pre-existing
- [x] [Review][Defer] `parseJwtExpiry` avec valeur env numérique pure — problème pré-existant non introduit par cette story [backend/src/auth/auth.controller.ts:20] — deferred, pre-existing
- [x] [Review][Defer] CSRF via `X-Requested-With` faible protection — approche V1 intentionnelle [backend/src/common/middleware/csrf.middleware.ts] — deferred, pre-existing
- [x] [Review][Defer] `CsrfMiddleware` bloque Swagger `POST` en dev — spec-intentionnel, noté dans les Dev Notes [backend/src/app.module.ts:56] — deferred, pre-existing
- [x] [Review][Defer] `refreshToken()` avale toutes les erreurs réseau — comportement V1 spec-intentionnel [frontend/src/app/core/services/auth.service.ts:46] — deferred, pre-existing
- [x] [Review][Defer] Boucle infinie possible sur 401 de permission (non-token) — théorique si 401/403 correctement distincts [frontend/src/app/core/interceptors/auth-error.interceptor.ts:45] — deferred, pre-existing

## Change Log

| Date | Description |
|------|-------------|
| 2026-05-02 | Création du fichier story — contexte complet généré par create-story |
| 2026-05-02 | Implémentation complète par claude-sonnet-4-6 — refresh silencieux + CSRF |
