# Story 3.1 : Panneau admin — liste des comptes utilisateurs

Status: done

## Story

En tant qu'administrateur,
Je veux consulter la liste de tous les comptes de l'instance depuis un panneau dédié,
Afin d'avoir une vue d'ensemble des utilisateurs et de leur statut.

## Critères d'Acceptation

1. **Étant donné** que je suis connecté en tant qu'admin,
   **Quand** j'accède à `/admin`,
   **Alors** le guard `adminGuard` autorise l'accès et le panneau affiche la liste de tous les comptes (identifiant, nom, rôle, statut actif/inactif)

2. **Étant donné** que je suis connecté en tant qu'utilisateur standard,
   **Quand** je tente d'accéder à `/admin`,
   **Alors** le guard `adminGuard` me redirige vers `/links`

3. **Étant donné** que la liste des comptes est chargée,
   **Quand** j'appelle `GET /api/users` avec le rôle admin,
   **Alors** le backend retourne uniquement les champs non-sensibles (jamais `passwordHash`) et `RolesGuard` bloque tout accès sans rôle admin avec un 403

## Contexte Architectural Obligatoire

### Stack imposée

- **Backend** : NestJS 11, TypeORM + mysql2, `@nestjs/swagger`, `class-validator`/`class-transformer`, guards centralisés dans `src/common/guards/`
- **Frontend** : Angular 21 zoneless, signals natifs, composants standalone, lazy loading, Angular Material
- **TypeORM** : migrations uniquement (`typeorm migration:generate/run`) — `synchronize: false` en production — jamais modifier le schéma manuellement
- **Logger** : `Logger` NestJS — jamais `console.log`
- **Réponses API** : objet/tableau direct, jamais d'enveloppe `{ data: ... }`
- **Throttler** : `@SkipThrottle()` sur les endpoints lecture seule
- **Swagger** : décorateurs `@ApiTags`, `@ApiOperation`, `@ApiResponse` sur le contrôleur

### Décision de conception — champ `name` sur `UserEntity`

**CRITIQUE** : L'entité `UserEntity` actuelle (`backend/src/users/user.entity.ts`) n'a pas de champ `name`.
Les critères d'acceptation demandent "identifiant, **nom**, rôle, statut". La Story 3.2 crée des utilisateurs avec "identifiant + nom".

**Décision** : Ajouter une colonne `name` nullable (`VARCHAR(255), nullable: true, default: ''`) dans cette story via une migration TypeORM. Elle sera nullable pour ne pas casser le compte admin existant (`mustChangePassword = true`).

### Fichiers existants à comprendre

| Fichier | Rôle |
|---------|------|
| `backend/src/users/user.entity.ts` | `UserEntity` — colonnes : id, username, passwordHash, role (`'admin'\|'user'`), mustChangePassword, isActive, createdAt, updatedAt — **ajouter `name`** |
| `backend/src/users/users.service.ts` | Service existant — méthodes : `findByUsername`, `findById`, `findAdminCount`, `updatePasswordHash`, `updatePasswordAndClearFlag`, `createUser` — **ajouter `findAll()`** |
| `backend/src/users/users.module.ts` | Module minimaliste — importe `TypeOrmModule.forFeature([UserEntity])` — **ajouter `UsersController`** |
| `backend/src/app.module.ts` | `ThrottlerGuard` global via `APP_GUARD`, `UsersModule` et `AuthModule` importés, middleware CSRF global |
| `backend/src/common/guards/jwt-auth.guard.ts` | `JwtAuthGuard extends AuthGuard('jwt')` — pattern à reproduire pour `RolesGuard` |
| `backend/src/common/decorators/current-user.decorator.ts` | `@CurrentUser()` — pattern à reproduire pour `@Roles()` |
| `frontend/src/app/app.routes.ts` | Routes existantes — **ajouter `/admin`** avec `[authGuard, adminGuard, mustChangePasswordGuard]` |
| `frontend/src/app/core/guards/auth.guard.ts` | Pattern guard `CanActivateFn` — reproduire pour `adminGuard` |
| `frontend/src/app/core/services/auth.service.ts` | Signal `currentUser` contient `role: 'admin' \| 'user'` — utiliser dans `adminGuard` |

### Patterns obligatoires Backend

**RolesGuard** (à créer dans `src/common/guards/roles.guard.ts`) :
```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest<{ user: { role: UserRole } }>();
    if (!requiredRoles.includes(user.role)) throw new ForbiddenException();
    return true;
  }
}
```

**@Roles() decorator** (à créer dans `src/common/decorators/roles.decorator.ts`) :
```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

**UsersController** pattern (`src/users/users.controller.ts`) :
```typescript
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@SkipThrottle()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister tous les comptes utilisateurs' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs sans passwordHash' })
  async findAll(): Promise<UserListItemDto[]> {
    const users = await this.usersService.findAll();
    return users.map(u => new UserListItemDto(u));
  }
}
```

**UserListItemDto** (`src/users/dto/user-list-item.dto.ts`) :
```typescript
export class UserListItemDto {
  id: number;
  username: string;
  name: string;
  role: string;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.username = user.username;
    this.name = user.name ?? '';
    this.role = user.role;
    this.mustChangePassword = user.mustChangePassword;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    // JAMAIS passwordHash ou refreshTokens
  }
}
```

**Attention** : Le `RolesGuard` doit être utilisé en combinaison avec `JwtAuthGuard` (qui peuple `req.user`). Appliquer les deux guards ensemble sur le contrôleur ou sur la méthode.

### Patterns obligatoires Frontend

**adminGuard** (`src/app/core/guards/admin.guard.ts`) :
```typescript
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();
  if (user?.role === 'admin') return true;
  return router.createUrlTree(['/links']);
};
```

**Important** : `adminGuard` est toujours appliqué APRÈS `authGuard` (qui peuple `currentUser`). Ne pas appeler `authService.me()` dans `adminGuard` — `authGuard` l'a déjà fait.

**Route `/admin`** dans `app.routes.ts` :
```typescript
{
  path: 'admin',
  canActivate: [authGuard, mustChangePasswordGuard, adminGuard],
  loadComponent: () => import('./admin/admin-panel.component')
    .then(m => m.AdminPanelComponent),
}
```

**AdminService** (`src/app/admin/admin.service.ts`) :
```typescript
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);

  readonly users = signal<User[]>([]);
  readonly isLoading = signal(false);

  loadUsers(): Observable<User[]> {
    this.isLoading.set(true);
    return this.http.get<User[]>('/api/users').pipe(
      tap(users => this.users.set(users)),
      finalize(() => this.isLoading.set(false)),
    );
  }
}
```

**AdminPanelComponent** :
- Composant standalone
- `changeDetection: ChangeDetectionStrategy.OnPush`
- Utiliser `MatTable` ou une liste Material pour l'affichage
- Colonnes : username, name, role, isActive (badge visuel), mustChangePassword (badge)
- Signal `isLoading` → `MatProgressSpinner` pendant le chargement
- `ngOnInit` → `adminService.loadUsers().subscribe()`
- Import Angular Material : `MatTableModule`, `MatChipsModule`, `MatProgressSpinnerModule`, `MatButtonModule`

### Migration TypeORM

La migration doit ajouter la colonne `name` à la table `User` :
```sql
ALTER TABLE `User` ADD COLUMN `name` varchar(255) NOT NULL DEFAULT '';
```

Commande de génération depuis `backend/` :
```bash
npx typeorm migration:generate src/migrations/AddNameToUser -d src/config/typeorm.config.ts
```

Le fichier de migration généré sera dans `backend/src/migrations/` (avec timestamp). Vérifier que la colonne est bien nullable ou avec une valeur par défaut pour ne pas casser l'admin existant.

### Liaison top bar admin

L'architecture prévoit que seul l'admin voit le lien `/admin`. Dans `top-bar.component.ts`, le signal `authService.currentUser()` contient `role`. Ajouter un lien conditionnel dans le menu utilisateur (`MatMenu`) :
```html
@if (authService.currentUser()?.role === 'admin') {
  <a mat-menu-item routerLink="/admin">Administration</a>
}
```

**Fichier concerné** : `frontend/src/app/core/components/top-bar/top-bar.component.ts` (et `.html`).

### Tests unitaires — patterns existants

- Backend : specs co-localisés (`.spec.ts` dans le même dossier)
- `UsersController` → `users.controller.spec.ts` : tester que `GET /api/users` appelle `usersService.findAll()` et retourne les DTOs sans `passwordHash`
- `RolesGuard` → test que `role = 'user'` lève `ForbiddenException`, `role = 'admin'` passe
- Frontend : specs co-localisés dans le dossier du composant/service

### Scénarios E2E

Fichier à créer : `e2e/tests/admin.spec.ts`

**Note importante** : Le test AC2 (utilisateur standard redirigé vers `/links`) requiert un compte non-admin. Ce compte n'existe pas encore (Story 3.2 l'implémente). Implémenter le test de redirection non-admin avec un `test.fixme` ou une note explicite — il sera activé en Story 3.2 quand la création d'utilisateurs sera disponible.

```typescript
import { test, expect } from '@playwright/test';

const adminUsername = process.env.E2E_ADMIN_USERNAME;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

if (!adminUsername || !adminPassword) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

// Helper : connecter l'admin (en gérant mustChangePassword)
async function loginAdmin(page) {
  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', adminUsername);
  await page.fill('input[autocomplete="current-password"]', adminPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(links|change-password)$/);
  // Si mustChangePassword est actif, ce test ne peut pas continuer
  const url = page.url();
  if (url.includes('change-password')) {
    throw new Error('Admin must have changed password before running admin tests');
  }
}

test('AC1 — Admin voit le panneau /admin avec la liste des comptes', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');
  await expect(page).toHaveURL('/admin');
  // La liste doit contenir au moins l'admin lui-même
  await expect(page.locator('table, [data-testid="user-list"]')).toBeVisible();
});

test('AC1 — La liste affiche au moins le compte admin', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');
  await expect(page.getByText(adminUsername)).toBeVisible();
});

test('AC2 — Utilisateur non authentifié redirigé vers /login', async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveURL('/login');
});

// AC2 (non-admin → /links) sera activé en Story 3.2 quand la création d'utilisateurs est en place
test.fixme('AC2 — Utilisateur standard redirigé vers /links (requiert Story 3.2)', async ({ page }) => {
  // Créer un utilisateur via POST /api/users (disponible en Story 3.2)
  // Se connecter avec cet utilisateur
  // Naviguer vers /admin
  // Vérifier redirection vers /links
});
```

## Tâches / Sous-tâches

### Backend

- [x] **T1 — Ajouter le champ `name` à `UserEntity`** (AC: #1, #3)
  - [x] Dans `backend/src/users/user.entity.ts` : ajouter `@Column({ nullable: true, default: '' }) name!: string;`
  - [x] Générer la migration : `npx typeorm migration:generate src/migrations/AddNameToUser -d src/config/typeorm.config.ts`
  - [x] Vérifier le fichier de migration généré dans `backend/src/migrations/`

- [x] **T2 — Ajouter `findAll()` dans `UsersService`** (AC: #3)
  - [x] Dans `backend/src/users/users.service.ts` : ajouter `async findAll(): Promise<UserEntity[]> { return this.userRepository.find(); }`
  - [x] Mettre à jour `users.service.spec.ts`

- [x] **T3 — Créer `UserListItemDto`** (AC: #3)
  - [x] Créer `backend/src/users/dto/user-list-item.dto.ts`
  - [x] Exposer : id, username, name, role, mustChangePassword, isActive, createdAt, updatedAt
  - [x] Ne jamais inclure `passwordHash` ni `refreshTokens`

- [x] **T4 — Créer `@Roles()` decorator** (AC: #3)
  - [x] Créer `backend/src/common/decorators/roles.decorator.ts`
  - [x] Exporter `ROLES_KEY` et `Roles`

- [x] **T5 — Créer `RolesGuard`** (AC: #3)
  - [x] Créer `backend/src/common/guards/roles.guard.ts`
  - [x] Injecter `Reflector`, lire les rôles requis, lever `ForbiddenException` si rôle insuffisant
  - [x] Créer `backend/src/common/guards/roles.guard.spec.ts`

- [x] **T6 — Créer `UsersController`** (AC: #3)
  - [x] Créer `backend/src/users/users.controller.ts`
  - [x] `GET /api/users` protégé par `JwtAuthGuard` + `RolesGuard` + `@Roles('admin')`
  - [x] `@SkipThrottle()` sur le contrôleur
  - [x] Décorateurs Swagger : `@ApiTags('users')`, `@ApiOperation`, `@ApiResponse`
  - [x] Créer `backend/src/users/users.controller.spec.ts`

- [x] **T7 — Mettre à jour `UsersModule`** (AC: #3)
  - [x] Ajouter `UsersController` dans `controllers: [UsersController]`
  - [x] Ajouter `RolesGuard` dans `providers` si besoin (ou l'injecter directement via le guard)

### Frontend

- [x] **T8 — Créer `adminGuard`** (AC: #2)
  - [x] Créer `frontend/src/app/core/guards/admin.guard.ts`
  - [x] Si `currentUser()?.role !== 'admin'` → rediriger vers `/links`
  - [x] Appliquer APRÈS `authGuard` (ne pas appeler `me()` ici)

- [x] **T9 — Ajouter la route `/admin`** (AC: #1, #2)
  - [x] Modifier `frontend/src/app/app.routes.ts`
  - [x] Guards : `[authGuard, mustChangePasswordGuard, adminGuard]` dans cet ordre
  - [x] Lazy load `AdminPanelComponent`

- [x] **T10 — Créer `AdminService`** (AC: #1)
  - [x] Créer `frontend/src/app/admin/admin.service.ts`
  - [x] Signal `users = signal<UserListItem[]>([])`
  - [x] Signal `isLoading = signal(false)`
  - [x] Méthode `loadUsers()` → `GET /api/users`

- [x] **T11 — Créer `AdminPanelComponent`** (AC: #1)
  - [x] Créer `frontend/src/app/admin/admin-panel.component.ts`
  - [x] Créer `frontend/src/app/admin/admin-panel.component.html`
  - [x] Créer `frontend/src/app/admin/admin-panel.component.scss`
  - [x] Standalone, `OnPush`, inject `AdminService`
  - [x] `ngOnInit` → `adminService.loadUsers().subscribe()`
  - [x] Afficher : username, name, role, badge isActive, badge mustChangePassword
  - [x] `MatProgressSpinner` pendant `isLoading()`
  - [x] `@if (adminService.users().length === 0 && !adminService.isLoading())` → message vide

- [x] **T12 — Lien admin dans la top bar** (AC: #1)
  - [x] Modifier `frontend/src/app/core/components/top-bar/top-bar.component.html`
  - [x] Ajouter `@if (authService.currentUser()?.role === 'admin')` → lien "Administration" dans le `MatMenu`

### E2E

- [x] **T13 — Créer `e2e/tests/admin.spec.ts`** (AC: #1, #2)
  - [x] Test : admin accède à `/admin`, liste visible
  - [x] Test : admin voit son propre username dans la liste
  - [x] Test : utilisateur non authentifié redirigé vers `/login`
  - [x] `test.fixme` pour le test non-admin → `/links` (activé en Story 3.2)

## Arborescence des Fichiers

**Nouveaux fichiers :**
```
backend/src/users/
├── users.controller.ts              ← NOUVEAU
├── users.controller.spec.ts         ← NOUVEAU
└── dto/
    └── user-list-item.dto.ts        ← NOUVEAU

backend/src/common/
├── guards/
│   └── roles.guard.ts               ← NOUVEAU
│   └── roles.guard.spec.ts          ← NOUVEAU
└── decorators/
    └── roles.decorator.ts           ← NOUVEAU

backend/src/migrations/
└── {timestamp}-AddNameToUser.ts     ← NOUVEAU (généré par typeorm)

frontend/src/app/admin/
├── admin-panel.component.ts         ← NOUVEAU
├── admin-panel.component.html       ← NOUVEAU
├── admin-panel.component.scss       ← NOUVEAU
└── admin.service.ts                 ← NOUVEAU

frontend/src/app/core/guards/
└── admin.guard.ts                   ← NOUVEAU

e2e/tests/
└── admin.spec.ts                    ← NOUVEAU
```

**Fichiers modifiés :**
```
backend/src/users/user.entity.ts     ← MODIFIÉ (ajout colonne name)
backend/src/users/users.service.ts   ← MODIFIÉ (ajout findAll())
backend/src/users/users.module.ts    ← MODIFIÉ (ajout UsersController)

frontend/src/app/app.routes.ts                                    ← MODIFIÉ (ajout route /admin)
frontend/src/app/core/components/top-bar/top-bar.component.html   ← MODIFIÉ (lien admin)
```

## Points d'Attention Critiques

### Anti-patterns à éviter

- ❌ NE JAMAIS exposer `passwordHash` ou `refreshTokens` dans les réponses API
- ❌ NE PAS utiliser `synchronize: true` — uniquement migrations TypeORM
- ❌ NE PAS utiliser `console.log` — utiliser `Logger` NestJS avec contexte
- ❌ NE PAS appeler `authService.me()` dans `adminGuard` — `authGuard` l'a déjà fait
- ❌ NE PAS créer un `AdminModule` séparé dans NestJS — le contrôleur va dans `UsersModule`
- ❌ NE PAS oublier `@SkipThrottle()` sur `UsersController` (endpoint lecture seule)
- ❌ NE PAS envelopper la réponse dans `{ data: [...] }` — tableau direct
- ❌ NE PAS rendre `adminGuard` seul — toujours après `authGuard` (sinon `currentUser()` est null)

### Ordre des guards Angular

L'ordre des guards dans `canActivate` est CRUCIAL :
```typescript
canActivate: [authGuard, mustChangePasswordGuard, adminGuard]
//             ↑ peuple currentUser  ↑ vérifie flag    ↑ vérifie rôle
```

### Migration — colonne `name` nullable

La colonne `name` doit avoir `DEFAULT ''` ou être nullable pour ne pas bloquer le démarrage avec l'admin existant (qui n'a pas de `name`). Si `NOT NULL` sans default, la migration échouera si des lignes existent déjà.

### `RolesGuard` nécessite `req.user`

`RolesGuard` lit `req.user.role`. Ce champ n'est disponible que si `JwtAuthGuard` a déjà été exécuté (il peuple `req.user` via la stratégie JWT). Appliquer TOUJOURS `JwtAuthGuard` avant `RolesGuard`.

### Test E2E — admin `mustChangePassword`

Si l'admin n'a pas encore changé son mot de passe (`mustChangePassword = true`), la connexion redirige vers `/change-password`, pas `/links`. Les tests E2E admin doivent s'assurer que l'admin a déjà changé son mot de passe (condition CI). Voir le pattern dans le smoke test `auth.spec.ts`.

### Lien "Administration" dans la top bar

L'architecture prévoit que la top bar sur desktop affiche les onglets de navigation (Liens/Recettes/Notes). Le lien admin peut être dans le `MatMenu` utilisateur (bouton en haut à droite) — discret, accessible uniquement aux admins, sans polluer la navigation principale.

## Références

- Architecture : `_bmad-output/planning-artifacts/architecture.md` — Route guards, Structure modules NestJS, Patterns API
- Epics : `_bmad-output/planning-artifacts/epics.md` — Epic 3, Stories 3.1–3.4
- Story 3.0 : `_bmad-output/implementation-artifacts/3-0-setup-tests-e2e-playwright.md` — Pattern E2E, smoke test, structure Playwright
- UserEntity : `backend/src/users/user.entity.ts`
- UsersService : `backend/src/users/users.service.ts`
- JwtAuthGuard : `backend/src/common/guards/jwt-auth.guard.ts` — pattern guard NestJS
- authGuard : `frontend/src/app/core/guards/auth.guard.ts` — pattern guard Angular
- AuthService : `frontend/src/app/core/services/auth.service.ts` — signal `currentUser`
- AuthController : `backend/src/auth/auth.controller.ts` — pattern controller NestJS

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-12) — create-story workflow

### Completion Notes List

- Story créée depuis l'analyse complète des artefacts (epics, architecture, codebase existant)
- Décision de conception documentée : ajout du champ `name` (nullable) sur UserEntity dans cette story
- Anti-pattern identifié : `adminGuard` doit s'exécuter APRÈS `authGuard` (dépendance sur `currentUser()`)
- Test E2E pour redirection non-admin marqué `fixme` car requiert Story 3.2
- **Implémentation (2026-05-12)** : Tous les fichiers créés/modifiés, migration appliquée, 56 tests backend passent (0 régression), build Angular production OK
- `authService` rendu `protected` dans `TopBarComponent` pour accès template (était `private`)
- Migration `1778579746059-AddNameToUser.ts` générée et appliquée en base

### File List

**Nouveaux fichiers :**
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.controller.spec.ts`
- `backend/src/users/dto/user-list-item.dto.ts`
- `backend/src/common/guards/roles.guard.ts`
- `backend/src/common/guards/roles.guard.spec.ts`
- `backend/src/common/decorators/roles.decorator.ts`
- `backend/src/migrations/1778579746059-AddNameToUser.ts`
- `frontend/src/app/admin/admin-panel.component.ts`
- `frontend/src/app/admin/admin-panel.component.html`
- `frontend/src/app/admin/admin-panel.component.scss`
- `frontend/src/app/admin/admin.service.ts`
- `frontend/src/app/core/guards/admin.guard.ts`
- `e2e/tests/admin.spec.ts`

**Fichiers modifiés :**
- `backend/src/users/user.entity.ts` (ajout colonne `name`)
- `backend/src/users/users.service.ts` (ajout `findAll()`)
- `backend/src/users/users.service.spec.ts` (ajout tests `findAll`, mock `find`)
- `backend/src/users/users.module.ts` (ajout `UsersController`)
- `frontend/src/app/app.routes.ts` (ajout route `/admin`)
- `frontend/src/app/core/components/top-bar/top-bar.component.ts` (`private` → `protected` authService)
- `frontend/src/app/core/components/top-bar/top-bar.component.html` (lien Administration conditionnel)

### Change Log

- 2026-05-12 : Implémentation Story 3.1 — panneau admin liste des comptes utilisateurs. Migration `name` ajoutée, `RolesGuard` + `@Roles()` créés, `UsersController GET /api/users` protégé admin, `AdminPanelComponent` avec `MatTable` + badges, `adminGuard` Angular, route `/admin` lazy-loaded, lien "Administration" conditionnel dans la top bar, tests E2E Playwright.

### Review Findings

- [x] [Review][Patch] Balise `</td>` manquante dans la colonne `role` [frontend/src/app/admin/admin-panel.component.html:30] — faux positif, balise présente
- [x] [Review][Patch] Erreurs HTTP silencieuses dans `loadUsers()` — aucun handler d'erreur dans `subscribe()` [frontend/src/app/admin/admin-panel.component.ts:24] — corrigé : signal `error` + `catchError` dans le service
- [x] [Review][Patch] `RolesGuard` crash `TypeError` si `req.user` est `undefined` [backend/src/common/guards/roles.guard.ts:17] — corrigé : guard null + test ajouté
- [x] [Review][Patch] Signal `AdminService.users` non réinitialisé avant un nouvel appel `loadUsers()` [frontend/src/app/admin/admin.service.ts:23] — corrigé : `users.set([])` en début de `loadUsers()`
- [x] [Review][Defer] `AdminService providedIn: 'root'` — liste stale entre sessions après déconnexion [frontend/src/app/admin/admin.service.ts:16] — deferred, nécessite coordination avec le flow de logout
- [x] [Review][Defer] `findAll()` sans pagination ni limite — requête non bornée [backend/src/users/users.service.ts:39] — deferred, pas de critère d'acceptation pour la pagination
- [x] [Review][Defer] `name!: string` type TypeScript incohérent avec colonne DB nullable [backend/src/users/user.entity.ts:21] — deferred, le DTO protège avec `?? ''`
- [x] [Review][Defer] Observable HTTP souscrit sans `takeUntilDestroyed` [frontend/src/app/admin/admin-panel.component.ts:24] — deferred, HTTP observable se complète automatiquement
- [x] [Review][Defer] `userRepository.find()` charge `passwordHash` en mémoire (filtré uniquement au niveau DTO) [backend/src/users/users.service.ts:39] — deferred, pas d'exposition, amélioration défensive
- [x] [Review][Defer] `adminGuard` redirige un utilisateur null vers `/links` — comportement pré-existant lié à `authGuard` [frontend/src/app/core/guards/admin.guard.ts:9] — deferred, pre-existing
- [x] [Review][Defer] E2E `loginAdmin` timeout cryptique si l'URL post-login est inattendue [e2e/tests/admin.spec.ts:14] — deferred, cas marginal hors scope