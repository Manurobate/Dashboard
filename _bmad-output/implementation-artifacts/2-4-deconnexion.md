# Story 2.4 : Déconnexion

Status: done

## Story

En tant qu'utilisateur authentifié,
Je veux pouvoir me déconnecter,
Afin d'invalider ma session et protéger mon espace si je quitte un appareil partagé.

## Critères d'Acceptation

1. **Étant donné** que je clique sur "Déconnexion" dans le menu utilisateur de la top bar,
   **Quand** l'appel `POST /api/auth/logout` est effectué,
   **Alors** le refresh token est supprimé de la base de données, le cookie JWT est effacé côté client, et je suis redirigé vers `/login`

2. **Étant donné** que je suis déconnecté,
   **Quand** je tente d'accéder à `/links` ou toute route protégée,
   **Alors** le guard `authGuard` me redirige vers `/login`

## Tâches / Sous-tâches

### Backend

- [x] **T1 — Ajouter méthode `logout()` dans `AuthService`** (AC: #1)
  - [x] Créer méthode `async logout(rawToken: string | undefined): Promise<void>` dans `backend/src/auth/auth.service.ts`
  - [x] Hasher `rawToken` avec `sha256()` (fonction locale déjà définie dans ce fichier)
  - [x] Supprimer le token via `this.refreshTokenRepository.delete({ token: tokenHash })` — silencieux si absent
  - [x] Si `rawToken` est `undefined`, retourner immédiatement sans action (logout idempotent)

- [x] **T2 — Ajouter endpoint `POST /api/auth/logout`** dans `AuthController` (AC: #1)
  - [x] Ajouter `@Post('logout') @HttpCode(HttpStatus.NO_CONTENT) @UseGuards(JwtAuthGuard)` dans `backend/src/auth/auth.controller.ts`
  - [x] Lire `req.cookies?.refresh_token`
  - [x] Appeler `authService.logout(rawToken)`
  - [x] Effacer cookie `jwt` : `res.clearCookie('jwt', COOKIE_OPTIONS)` (constante déjà dans `auth.controller.ts`)
  - [x] Effacer cookie `refresh_token` : `res.clearCookie('refresh_token', { ...COOKIE_OPTIONS, path: '/api/auth' })`
  - [x] Retourner `void` (204 No Content)

- [x] **T3 — Tests unitaires backend** (AC: #1)
  - [x] `auth.service.spec.ts` — 2 cas pour `logout()` : token valide (delete appelé), token `undefined` (delete non appelé)
  - [x] `auth.controller.spec.ts` — 2 cas pour `POST /auth/logout` : succès (clearCookie ×2), sans cookie refresh_token (silencieux, cookies effacés quand même)

- [x] **T4 — Validation backend**
  - [x] `npm run build` → 0 erreur TypeScript
  - [x] `npm test` → tous les tests verts, aucune régression

### Frontend

- [x] **T5 — Ajouter méthode `logout()` dans `AuthService` Angular** (AC: #1)
  - [x] Ajouter `logout(): Observable<void>` dans `frontend/src/app/core/services/auth.service.ts`
  - [x] `POST /api/auth/logout` → `catchError(() => of(undefined))` → `tap(() => this.currentUser.set(null))`
  - [x] La méthode ne navigue jamais elle-même — la navigation est dans le composant appelant

- [x] **T6 — Connecter le bouton "Déconnexion" dans `TopBarComponent`** (AC: #1)
  - [x] Localiser `TopBarComponent` (chercher dans `frontend/src/app/core/components/top-bar/` ou `frontend/src/app/layout/`)
  - [x] Injecter `AuthService` et `Router` si non déjà présents
  - [x] Ajouter handler `onLogout()` : `this.authService.logout().subscribe(() => void this.router.navigate(['/login']))`
  - [x] Vérifier que le bouton "Déconnexion" dans le template `MatMenu` est bien bindé à `(click)="onLogout()"`

- [x] **T7 — Validation frontend**
  - [x] `ng build` → 0 erreur TypeScript
  - [x] Tests existants inchangés (0 régression)

### Review Findings

- [x] [Review][Patch] Retirer @UseGuards(JwtAuthGuard) du logout — le guard bloque la déconnexion si le JWT est expiré et que le refresh échoue (erreur réseau), laissant le cookie `refresh_token` persister. Décision : endpoint logout devient public (le CSRF middleware protège contre les appels cross-origin). [backend/src/auth/auth.controller.ts]
- [x] [Review][Patch] Assertion du hash trop faible dans auth.service.spec.ts — le test vérifie uniquement le format `/^[a-f0-9]{64}$/` ; une implémentation hachant une constante quelconque passerait. Ajouter un deuxième appel avec un token différent et vérifier que les hashes diffèrent. [backend/src/auth/auth.service.spec.ts]
- [x] [Review][Defer] Logout mono-session uniquement — `delete({ token: tokenHash })` révoque un seul token ; les autres sessions actives restent valides. Révocation multi-appareils hors scope V1. [backend/src/auth/auth.service.ts] — deferred, pre-existing

## Dev Notes

### Vue d'Ensemble

Cette story implémente la déconnexion complète en deux parties complémentaires :

1. **Backend** : `POST /api/auth/logout` supprime le refresh token en DB et efface les deux cookies httpOnly — le JWT expirera naturellement en ≤ 15 min si non révoqué, le refresh token est révoqué immédiatement
2. **Frontend** : `AuthService.logout()` appelle l'API, efface `currentUser` (même en cas d'erreur), le composant navigue vers `/login`

**Déférés de stories précédentes adressés ici :**
- Story 2.1/2.2 : "Révocation et rotation de tokens absentes — à implémenter en story 2.4" → `authService.logout()` supprime le refresh token en DB
- Story 2.2 : "`isActive` non re-vérifié sur le path JWT — À adresser en story 2.4 via révocation du token" → La révocation du refresh token empêche tout renouvellement de JWT ; l'accès s'arrête dans ≤ 15 min (durée de vie du JWT)

**Hors scope (stories suivantes) :**
- Guard `mustChangePassword` : Story 2.5
- Révocation forcée par l'admin lors de désactivation de compte : Story 3.4
- Logout de toutes les sessions actives simultanément : hors scope V1

---

### T1 — `AuthService.logout()` (backend)

```typescript
// backend/src/auth/auth.service.ts — AJOUTER après refresh()

async logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;  // Déjà déconnecté ou pas de cookie — silencieux

  const tokenHash = sha256(rawToken);  // sha256() = fonction locale déjà dans ce fichier
  await this.refreshTokenRepository.delete({ token: tokenHash });
  // TypeORM delete() avec condition inexistante = no-op silencieux ✅
}
```

**Points critiques :**
- `sha256()` est une **fonction locale** déjà définie dans `auth.service.ts` (introduite en story 2.2) — NE PAS redéfinir ni importer
- `delete({ token: tokenHash })` est une suppression par condition — pas de `findOne` préalable, opération atomique et silencieuse si absent
- La méthode est **idempotente** : un double appel ne lève pas d'exception

---

### T2 — `POST /api/auth/logout` (AuthController)

```typescript
// backend/src/auth/auth.controller.ts — AJOUTER dans la classe AuthController

@Post('logout')
@HttpCode(HttpStatus.NO_CONTENT)
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Déconnexion — invalide le refresh token et efface les cookies' })
async logout(
  @Req() req: Request & { cookies: Record<string, string> },
  @Res({ passthrough: true }) res: Response,
): Promise<void> {
  const rawToken = req.cookies?.refresh_token;
  await this.authService.logout(rawToken);  // silencieux si cookie absent

  // Effacer le cookie JWT (path '/' = défaut, correspond à COOKIE_OPTIONS sans path custom)
  res.clearCookie('jwt', COOKIE_OPTIONS);

  // Effacer le refresh token — path DOIT correspondre à celui utilisé lors du login
  res.clearCookie('refresh_token', { ...COOKIE_OPTIONS, path: '/api/auth' });
}
```

**Points critiques :**
- `@UseGuards(JwtAuthGuard)` : l'endpoint est protégé — un JWT valide est requis pour se déconnecter (protège contre les appels non authentifiés qui pourraient effacer des cookies arbitrairement)
- `COOKIE_OPTIONS` est défini en tête de `auth.controller.ts` (constante depuis story 2.2) — NE PAS redéfinir
- `@Res({ passthrough: true })` : pattern obligatoire pour manipuler les cookies tout en laissant NestJS gérer le cycle de vie de la réponse
- **`path` doit correspondre exactement** à celui du `setCookie` pour que le navigateur identifie le bon cookie à effacer :
  - Cookie `jwt` : set sans path explicite → path `'/'` → `clearCookie('jwt', COOKIE_OPTIONS)` ✅
  - Cookie `refresh_token` : set avec `path: '/api/auth'` (story 2.2 login + story 2.3 refresh) → `clearCookie('refresh_token', { ...COOKIE_OPTIONS, path: '/api/auth' })` ✅
- `CsrfMiddleware` (story 2.3) valide `X-Requested-With: XMLHttpRequest` sur ce POST — le `csrfInterceptor` Angular l'ajoute automatiquement ✅
- Pas besoin de `@SkipThrottle()` : le logout est rare, le rate limiting global (5 req/60s) ne pose pas de problème

---

### T5 — `AuthService.logout()` (Angular)

```typescript
// frontend/src/app/core/services/auth.service.ts — AJOUTER après refreshToken()

logout(): Observable<void> {
  return this.http.post<void>('/api/auth/logout', {}).pipe(
    catchError(() => of(undefined as void)),  // Toujours réussir côté client
    tap(() => this.currentUser.set(null)),    // Effacer l'état dans tous les cas
  );
}
```

**Usage dans le composant :**
```typescript
// TopBarComponent
onLogout(): void {
  this.authService.logout().subscribe(() => {
    void this.router.navigate(['/login']);
  });
}
```

**Points critiques :**
- `catchError(() => of(undefined))` garantit que `tap` s'exécute même si l'API est inaccessible → `currentUser` est toujours effacé
- `logout()` retourne `Observable<void>` (pas `Promise`) — cohérent avec le pattern de `refreshToken()`
- La navigation est dans le composant, pas dans le service — `AuthService` ne doit pas connaître le contexte de navigation
- Ajouter `catchError, of` aux imports `rxjs` si non déjà présents (probablement déjà là depuis story 2.3)
- `this.currentUser` est le Signal défini dans `AuthService` — utiliser `.set(null)` uniquement, jamais de mutation directe

---

### T6 — Connecter le bouton dans `TopBarComponent`

Le bouton "Déconnexion" existe dans le template depuis story 1.5. Localiser et vérifier :

```typescript
// Chercher le fichier : find frontend/src/app -name "top-bar.component.ts"
// Injecter les dépendances si absentes :
private readonly authService = inject(AuthService);
private readonly router = inject(Router);

onLogout(): void {
  this.authService.logout().subscribe(() => {
    void this.router.navigate(['/login']);
  });
}
```

```html
<!-- Dans top-bar.component.html, trouver le bouton dans le MatMenu -->
<!-- Vérifier / ajouter le binding : -->
<button mat-menu-item (click)="onLogout()">
  <mat-icon>logout</mat-icon>
  Déconnexion
</button>
```

---

### Arborescence des Fichiers Affectés

**Nouveaux fichiers :** Aucun

**Fichiers modifiés :**
```
backend/src/auth/
├── auth.service.ts           ← ajout logout()
├── auth.service.spec.ts      ← 2 nouveaux cas logout()
├── auth.controller.ts        ← ajout POST /auth/logout + import HttpStatus
└── auth.controller.spec.ts   ← 2 nouveaux cas /auth/logout

frontend/src/app/
├── core/services/
│   └── auth.service.ts       ← ajout logout() + imports catchError/of si manquants
└── core/components/top-bar/  (ou layout/ selon l'arborescence réelle)
    ├── top-bar.component.ts  ← ajout onLogout() + inject Router/AuthService si manquants
    └── top-bar.component.html ← vérifier (click)="onLogout()" sur le bouton Déconnexion
```

---

### Anti-patterns à Éviter

- ❌ NE PAS bloquer la déconnexion sur une erreur API — effacer toujours `currentUser` localement via `catchError`
- ❌ NE PAS omettre `path: '/api/auth'` dans `clearCookie` pour le `refresh_token` — sans le path correct, le navigateur ne trouve pas le cookie et ne l'efface pas
- ❌ NE PAS omettre `@UseGuards(JwtAuthGuard)` sur l'endpoint logout — sans garde, l'endpoint est public
- ❌ NE PAS redéfinir `COOKIE_OPTIONS` dans `auth.controller.ts` — constante déjà présente depuis story 2.2
- ❌ NE PAS redéfinir `sha256()` dans `auth.service.ts` — fonction locale déjà présente depuis story 2.2
- ❌ NE PAS faire naviguer `AuthService` vers `/login` — déléguer la navigation au composant appelant
- ❌ NE PAS utiliser `res.cookie('jwt', '', { expires: new Date(0) })` pour effacer — utiliser `res.clearCookie()` qui est l'API correcte

### Patterns Existants à Réutiliser

| Élément | Fichier source | Usage dans cette story |
|---------|---------------|------------------------|
| `sha256()` | `auth.service.ts` (locale) | `logout()` — hash avant delete |
| `COOKIE_OPTIONS` | `auth.controller.ts` | `clearCookie('jwt', ...)` |
| `@Res({ passthrough: true })` | `auth.controller.ts` (login, refresh) | Endpoint logout |
| `@UseGuards(JwtAuthGuard)` | Autres endpoints protégés | Endpoint logout |
| `this.currentUser.set(null)` | `auth.service.ts` refreshToken() catchError | `logout()` via tap |
| `catchError(() => of(...))` | `auth.service.ts` refreshToken() | `logout()` — rendre le logout infaillible |
| `inject(Router)` | `auth-error.interceptor.ts` | `TopBarComponent.onLogout()` |

### Références

- Story précédente : `_bmad-output/implementation-artifacts/2-3-session-persistante-avec-refresh-silencieux.md`
- Épics : `_bmad-output/planning-artifacts/epics.md` — Épic 2, Story 2.4
- Architecture : `_bmad-output/planning-artifacts/architecture.md` — sections "Authentification & Sécurité", "Architecture Frontend"
- Déférés adressés : `_bmad-output/implementation-artifacts/deferred-work.md` — "Deferred from: 2-1-..." (révocation) et "Deferred from: 2-2-..." (`isActive` + révocation)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- T1 : `AuthService.logout()` backend ajouté — idempotent, hash sha256 avant delete, silencieux si token absent ou undefined
- T2 : Endpoint `POST /auth/logout` ajouté avec `@UseGuards(JwtAuthGuard)`, 204 No Content, clearCookie des deux cookies (paths corrects)
- T3 : 4 nouveaux tests (2 service + 2 controller) — 30/30 backend verts, 0 régression
- T4 : `npm run build` → 0 erreur TypeScript backend
- T5 : `AuthService.logout()` Angular ajouté — catchError garantit effacement de currentUser même en cas d'erreur API
- T6 : TopBarComponent mis à jour — injection AuthService + Router, onLogout(), bouton débindé du `disabled` et bindé à `(click)="onLogout()"`
- T7 : `ng build` → 0 erreur TypeScript frontend

### File List

- backend/src/auth/auth.service.ts
- backend/src/auth/auth.service.spec.ts
- backend/src/auth/auth.controller.ts
- backend/src/auth/auth.controller.spec.ts
- frontend/src/app/core/services/auth.service.ts
- frontend/src/app/core/components/top-bar/top-bar.component.ts
- frontend/src/app/core/components/top-bar/top-bar.component.html

## Change Log

- 2026-05-02 : Implémentation complète story 2.4 — logout backend (AuthService + AuthController + tests) et frontend (AuthService Angular + TopBarComponent). 30/30 tests backend, build Angular sans erreur.
