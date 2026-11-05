# Story 3.5 : Page profil utilisateur

Status: done

## Story

En tant qu'utilisateur authentifié,
Je veux accéder à une page de profil depuis le menu utilisateur, pouvoir modifier mon nom d'affichage et accéder au changement de mot de passe depuis cette page,
Afin de gérer mes informations personnelles en un seul endroit.

## Critères d'Acceptation

1. **Étant donné** que je clique "Mon profil" dans le menu utilisateur de la top bar,
   **Quand** je navigue vers `/profile`,
   **Alors** la page affiche : mon adresse email (lecture seule), mon nom d'affichage (champ éditable pré-rempli) et un bouton "Changer le mot de passe"

2. **Étant donné** que je modifie mon nom d'affichage et clique "Sauvegarder",
   **Quand** `PATCH /api/users/me` est appelé avec le nouveau nom,
   **Alors** le backend met à jour le champ `name`, retourne 200, et un snackbar "Profil mis à jour" s'affiche

3. **Étant donné** que je soumets le formulaire avec un nom vide,
   **Quand** la validation s'exécute,
   **Alors** une erreur inline "Le nom d'affichage est obligatoire" s'affiche — le formulaire n'est pas soumis

4. **Étant donné** que je clique "Changer le mot de passe",
   **Quand** je navigue,
   **Alors** je suis redirigé vers `/account/change-password` (route existante, Story 2.6)

5. **Étant donné** que je suis connecté en tant qu'utilisateur standard,
   **Quand** j'accède à `/profile`,
   **Alors** la page est accessible — pas de restriction de rôle

### Scénarios E2E

- Modifier le nom d'affichage → vérifier snackbar + persistance après rechargement (currentUser signal mis à jour)
- Cliquer "Changer le mot de passe" → vérifier redirection vers `/account/change-password`
- Soumettre avec nom vide → vérifier erreur inline

---

## Dev Notes

### Clarification AC4 — Route `/change-password`

> ⚠️ L'epics.md mentionne `/change-password` pour l'AC4 mais précise "(Story 2.6)". Story 2.6 (changement volontaire de mot de passe) est à la route `/account/change-password`. La route `/change-password` est réservée au changement **forcé** (Story 2.5, `mustChangePassword=true`). Utiliser `/account/change-password` pour le bouton "Changer le mot de passe" de la page profil.

---

### Intelligence des stories précédentes

**Patterns à reproduire exactement depuis les stories 3.x :**

- **Signals Angular** : `readonly isLoading = signal(false)`, `readonly generalError = signal<string | null>(null)` — pattern identique à `account/change-password/change-password.component.ts`
- **ChangeDetectionStrategy.OnPush** sur tous les composants — obligatoire (zoneless)
- **inject()** au lieu de constructor injection dans les composants Angular — pattern établi depuis story 3.1
- **finalize(() => this.isLoading.set(false))** pour éviter les états bloqués
- **MatSnackBar 3s** pour les succès : `snackBar.open('Profil mis à jour', undefined, { duration: 3000 })` (UX-DR17)
- **takeUntilDestroyed(this.destroyRef)** pour les subscriptions dans les constructeurs
- **`@Roles('user', 'admin')`** au niveau méthode pour overrider le `@Roles('admin')` du contrôleur — la `RolesGuard` utilise `getAllAndOverride` qui priorise le handler sur la classe
- **`@SkipThrottle()`** sur les nouveaux endpoints de `UsersController` — pattern de la classe
- **Validation DTO** : `@IsString()` + `@IsNotEmpty()` + `@MinLength(1)` depuis `class-validator`
- **`ParseIntPipe` pas utilisé** pour `/me` — pas de param `:id`

**Patterns NE PAS reproduire :**
- ❌ `PasswordMismatchStateMatcher` — pas de double champ mot de passe ici
- ❌ `zone.js` / `ChangeDetectorRef.markForCheck()` — Angular zoneless
- ❌ `console.log` — utiliser `Logger` NestJS si besoin de logs

---

### Stack et arborescence des fichiers

**Backend — fichiers à modifier/créer :**

| Fichier | État | Rôle |
|---------|------|------|
| `backend/src/users/dto/update-profile.dto.ts` | **CRÉER** | DTO `{ name: string }` validé |
| `backend/src/users/users.service.ts` | **MODIFIER** | Ajouter `updateProfile(userId, name)` |
| `backend/src/users/users.controller.ts` | **MODIFIER** | Ajouter `PATCH /users/me` |
| `backend/src/users/users.service.spec.ts` | **MODIFIER** | Tests `updateProfile` |
| `backend/src/users/users.controller.spec.ts` | **MODIFIER** | Tests endpoint `PATCH /users/me` |

**Frontend — fichiers à modifier/créer :**

| Fichier | État | Rôle |
|---------|------|------|
| `frontend/src/app/core/services/auth.service.ts` | **MODIFIER** | Ajouter `name` à `AuthUser` + méthode `updateProfile(name)` |
| `frontend/src/app/profile/profile.component.ts` | **CRÉER** | Page profil standalone |
| `frontend/src/app/profile/profile.component.html` | **CRÉER** | Template formulaire profil |
| `frontend/src/app/profile/profile.component.scss` | **CRÉER** | Styles page profil |
| `frontend/src/app/app.routes.ts` | **MODIFIER** | Ajouter route `/profile` |
| `frontend/src/app/core/components/top-bar/top-bar.component.html` | **MODIFIER** | "Mon profil" au lieu de "Changer le mot de passe" |
| `e2e/tests/profile.spec.ts` | **CRÉER** | 3 scénarios E2E |

---

### Implémentation Backend

#### `UpdateProfileDto` — NOUVEAU

```typescript
// backend/src/users/dto/update-profile.dto.ts
import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: "Nom d'affichage de l'utilisateur" })
  @IsString()
  @IsNotEmpty({ message: "Le nom d'affichage est obligatoire" })
  @MinLength(1)
  name!: string;
}
```

#### `UsersService.updateProfile()` — NOUVEAU

```typescript
async updateProfile(userId: number, name: string): Promise<UserEntity> {
  await this.userRepository.update({ id: userId }, { name });
  const user = await this.findById(userId);
  if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);
  return user;
}
```

#### `UsersController` — NOUVEAU endpoint

Ajouter **avant** les méthodes `:id` (pour éviter toute confusion de route, bien que `ParseIntPipe` protège déjà) :

```typescript
import { UpdateProfileDto } from './dto/update-profile.dto';

// Ajouter dans UsersController :

@Patch('me')
@HttpCode(HttpStatus.OK)
@Roles('user', 'admin')  // ← Override du @Roles('admin') classe-niveau
@SkipThrottle()
@ApiOperation({ summary: "Mettre à jour le profil de l'utilisateur courant" })
@ApiResponse({ status: 200, description: 'Profil mis à jour' })
@ApiResponse({ status: 401, description: 'Non authentifié' })
async updateProfile(
  @Req() req: Request & { user: { id: number } },
  @Body() dto: UpdateProfileDto,
): Promise<Omit<UserEntity, 'passwordHash' | 'refreshTokens'>> {
  const user = await this.usersService.updateProfile(req.user.id, dto.name);
  const { passwordHash: _, refreshTokens: __, ...safeUser } = user;
  return safeUser;
}
```

> **Import `UserEntity`** : déjà importé dans le fichier. Ajouter `UpdateProfileDto` aux imports.
> **`req.user.id`** : pattern identique à `disableUser` et `deleteUser` — `req.user` est typé via `JwtStrategy.validate()`.
> **Import manquant** : ajouter `UpdateProfileDto` aux imports du contrôleur.

#### Tests Backend

**`users.service.spec.ts`** — tests `updateProfile` :
```typescript
describe('updateProfile', () => {
  it('met à jour le name et retourne le user mis à jour', async () => {
    // mock userRepository.update + findById
    // vérifier update({ id: userId }, { name: 'Nouveau Nom' })
  });
  it('lance NotFoundException si utilisateur introuvable après update', async () => {
    // findById retourne null → NotFoundException
  });
});
```

**`users.controller.spec.ts`** — tests `PATCH /users/me` :
```typescript
describe('PATCH /users/me', () => {
  it('200 — met à jour le profil et retourne le user sans passwordHash', async () => { ... });
  it('400 — name vide → BadRequest depuis ValidationPipe', async () => { ... });
});
```

---

### Implémentation Frontend

#### `AuthService` — modifications

**Ajouter `name` à `AuthUser`** :
```typescript
export interface AuthUser {
  id: number;
  username: string;
  name: string;          // ← AJOUTER (déjà renvoyé par le backend, juste pas typé)
  role: 'admin' | 'user';
  mustChangePassword: boolean;
  isActive: boolean;
}
```

**Ajouter méthode `updateProfile()`** :
```typescript
updateProfile(name: string): Observable<AuthUser> {
  return this.http.patch<AuthUser>('/api/users/me', { name }).pipe(
    tap(user => this.currentUser.set(user)),
  );
}
```

> Pattern identique à `updatePassword()` existant : appel API + `tap` pour mettre à jour le signal `currentUser`.

#### `ProfileComponent` — NOUVEAU

```typescript
// frontend/src/app/profile/profile.component.ts
import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  readonly isLoading = signal(false);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.form.patchValue({ name: user.name });
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.isLoading()) return;
    this.isLoading.set(true);
    this.authService.updateProfile(this.form.getRawValue().name).pipe(
      finalize(() => this.isLoading.set(false)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.snackBar.open('Profil mis à jour', undefined, { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Impossible de mettre à jour le profil', undefined, { duration: 4000 });
      },
    });
  }

  navigateToChangePassword(): void {
    void this.router.navigate(['/account/change-password']);
  }
}
```

#### Template `profile.component.html`

```html
<div class="profile-container">
  <mat-card>
    <mat-card-header>
      <mat-card-title>Mon profil</mat-card-title>
    </mat-card-header>

    <mat-card-content>
      <!-- Email lecture seule -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Adresse email</mat-label>
        <input matInput [value]="authService.currentUser()?.username ?? ''" readonly />
      </mat-form-field>

      <!-- Formulaire nom d'affichage -->
      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Nom d'affichage</mat-label>
          <input matInput formControlName="name" autocomplete="name" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Le nom d'affichage est obligatoire</mat-error>
          }
        </mat-form-field>

        <div class="actions">
          <button mat-flat-button color="primary" type="submit"
                  [disabled]="form.invalid || isLoading()">
            @if (isLoading()) {
              <mat-progress-spinner diameter="20" mode="indeterminate" />
            } @else {
              Sauvegarder
            }
          </button>
        </div>
      </form>
    </mat-card-content>

    <mat-card-actions>
      <button mat-stroked-button (click)="navigateToChangePassword()">
        Changer le mot de passe
      </button>
    </mat-card-actions>
  </mat-card>
</div>
```

#### `profile.component.scss`

```scss
.profile-container {
  max-width: 480px;
  margin: 2rem auto;
  padding: 0 1rem;
}

.full-width {
  width: 100%;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
```

#### `app.routes.ts` — modification

Ajouter la route `/profile` **après** `/account/change-password` :

```typescript
{
  path: 'profile',
  canActivate: [authGuard, mustChangePasswordGuard],
  loadComponent: () => import('./profile/profile.component')
    .then(m => m.ProfileComponent),
},
```

#### `top-bar.component.html` — modification

Remplacer le lien "Changer le mot de passe" par "Mon profil" :

```html
<!-- AVANT -->
<a mat-menu-item routerLink="/account/change-password">
  <mat-icon>lock</mat-icon>
  <span>Changer le mot de passe</span>
</a>

<!-- APRÈS -->
<a mat-menu-item routerLink="/profile">
  <mat-icon>person</mat-icon>
  <span>Mon profil</span>
</a>
```

> Le lien "Changer le mot de passe" disparaît du menu top-bar — il est désormais accessible depuis la page profil uniquement.

---

### Scénarios E2E

**Fichier à créer** : `e2e/tests/profile.spec.ts`

```typescript
import { test, expect, APIRequestContext } from '@playwright/test';

const adminUsername = process.env['E2E_ADMIN_USERNAME'];
const adminPassword = process.env['E2E_ADMIN_PASSWORD'];

if (!adminUsername || !adminPassword) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

async function loginAdminApi(request: APIRequestContext): Promise<void> {
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(loginRes.ok()).toBeTruthy();
}

test('AC1/2 — Modification du nom d\'affichage persiste', async ({ page, request }) => {
  await loginAdminApi(request);

  // Créer un utilisateur de test
  const uniqueEmail = `e2e-profile-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'Initial Name' },
  });
  expect(createRes.status()).toBe(201);
  const { temporaryPassword } = await createRes.json();

  // Connexion + changement mot de passe forcé
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/change-password$/);
  await page.fill('input[name="newPassword"], input[autocomplete="new-password"]', 'NewPassword123!');
  await page.fill('input[name="confirmPassword"], input[autocomplete="new-password"]', 'NewPassword123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/links$/);

  // Naviguer vers /profile via le menu
  await page.click('button[aria-label="Menu utilisateur"]');
  await page.click('text=Mon profil');
  await expect(page).toHaveURL('/profile');

  // Modifier le nom d'affichage
  await page.fill('input[formcontrolname="name"]', 'Nouveau Nom E2E');
  await page.click('button[type="submit"]');

  // Vérifier snackbar
  await expect(page.getByText('Profil mis à jour')).toBeVisible();

  // Recharger et vérifier la persistance
  await page.reload();
  await page.waitForURL('/profile');
  await expect(page.locator('input[formcontrolname="name"]')).toHaveValue('Nouveau Nom E2E');
});

test('AC4 — Bouton "Changer le mot de passe" redirige vers /account/change-password', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', adminUsername!);
  await page.fill('input[autocomplete="current-password"]', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/links$/);

  await page.goto('/profile');
  await page.click('button:has-text("Changer le mot de passe")');
  await expect(page).toHaveURL('/account/change-password');
});

test('AC3 — Erreur inline si nom vide', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', adminUsername!);
  await page.fill('input[autocomplete="current-password"]', adminPassword!);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/links$/);

  await page.goto('/profile');

  // Effacer le nom et soumettre
  await page.fill('input[formcontrolname="name"]', '');
  await page.click('input[formcontrolname="name"]');  // Touch le champ
  await page.keyboard.press('Tab');

  await expect(page.locator('mat-error')).toContainText("Le nom d'affichage est obligatoire");
  // Le formulaire ne doit pas être soumis
  await expect(page.getByText('Profil mis à jour')).not.toBeVisible();
});
```

---

### Patterns obligatoires

- ✅ `ChangeDetectionStrategy.OnPush` + signals — obligatoire pour composant zoneless
- ✅ `standalone: true` — aucun NgModule
- ✅ `mat-flat-button` pour action principale "Sauvegarder" (UX-DR21 — 1 bouton primaire max)
- ✅ `mat-stroked-button` pour action secondaire "Changer le mot de passe" (UX-DR21)
- ✅ `MatSnackBar` 3s pour les succès (UX-DR17)
- ✅ Erreur inline `mat-error` pour validation (UX-DR17)
- ✅ `aria-label="Menu utilisateur"` déjà présent sur le bouton top-bar
- ✅ Email en lecture seule via `readonly` (pas via `disabled` — accessible WCAG)
- ❌ Ne pas ajouter `@Roles('admin')` sur `PATCH /users/me` — override via `@Roles('user', 'admin')`
- ❌ Ne pas créer un `UsersService` Angular séparé — utiliser `AuthService.updateProfile()`
- ❌ Ne pas créer de migration TypeORM — `name` existe déjà sur `UserEntity` (livré en Story 3.2)
- ❌ Ne pas modifier la route `/change-password` (Story 2.5) — pointer vers `/account/change-password` (Story 2.6)

### Référence des fichiers existants

- `AuthUser` interface : `frontend/src/app/core/services/auth.service.ts` ligne 5 — ajouter `name: string`
- `AuthService.updatePassword()` : lignes 53-57 — pattern pour `updateProfile()`
- `account/change-password` component : `frontend/src/app/account/change-password/change-password.component.ts` — pattern signals + finalize + takeUntilDestroyed
- `top-bar.component.html` : `frontend/src/app/core/components/top-bar/top-bar.component.html` ligne 31 — item à remplacer
- `app.routes.ts` : `frontend/src/app/app.routes.ts` — ajouter route `/profile` après `/account/change-password`
- `UsersController` : `backend/src/users/users.controller.ts` — ajouter `PATCH me` avec `@Roles('user', 'admin')`
- `RolesGuard.getAllAndOverride` : `backend/src/common/guards/roles.guard.ts` ligne 15 — confirme que handler override class
- `UserEntity.name` : `backend/src/users/user.entity.ts` ligne 22 — champ déjà présent, pas de migration
- E2E patterns admin : `e2e/tests/admin.spec.ts` — `loginAdminApi`, `loginAdmin` helpers à reproduire dans `profile.spec.ts`
- Epics : `_bmad-output/planning-artifacts/epics.md` Epic 3, Story 3.5
- Sprint change proposal : `_bmad-output/planning-artifacts/sprint-change-proposal-2026-05-12-page-profil.md`

---

## Tâches

- [x] Backend : Créer `UpdateProfileDto` dans `backend/src/users/dto/update-profile.dto.ts`
- [x] Backend : Ajouter `updateProfile(userId, name)` dans `UsersService`
- [x] Backend : Ajouter `PATCH /users/me` dans `UsersController` avec `@Roles('user', 'admin')`
- [x] Backend : Tests unitaires `UsersService.updateProfile` (2 cas : succès + NotFoundException)
- [x] Backend : Tests contrôleur `PATCH /users/me` (200 succès + 400 name vide)
- [x] Frontend : Ajouter `name` à interface `AuthUser` + méthode `updateProfile()` dans `AuthService`
- [x] Frontend : Créer `ProfileComponent` (ts + html + scss) dans `frontend/src/app/profile/`
- [x] Frontend : Ajouter route `/profile` dans `app.routes.ts`
- [x] Frontend : Modifier `top-bar.component.html` — "Mon profil" au lieu de "Changer le mot de passe"
- [x] E2E : Créer `e2e/tests/profile.spec.ts` avec 3 scénarios

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

Story 3.5 créée — page profil utilisateur. Contexte complet analysé depuis stories précédentes (3.1 à 3.4), patterns auth.service + change-password reproduits. Clarification AC4 : route correcte est `/account/change-password` et non `/change-password`.

**Implémentation (2026-05-18) :**
- Backend : `UpdateProfileDto` créé avec validation `@IsNotEmpty` + `@MinLength(1)`.
- Backend : `UsersService.updateProfile(userId, name)` — pattern identique à `updatePasswordHash`.
- Backend : `PATCH /users/me` dans `UsersController` avec `@Roles('user', 'admin')` pour override du `@Roles('admin')` classe-niveau. `UserEntity` importé dans le contrôleur.
- Backend : 2 tests service (`updateProfile`) + 2 tests contrôleur ajoutés — 99 tests passent en tout.
- Frontend : `name: string` ajouté à `AuthUser` + méthode `updateProfile()` dans `AuthService` (pattern `tap → currentUser.set`).
- Frontend : `ProfileComponent` (standalone, `OnPush`, signals, `finalize`, `takeUntilDestroyed`) créé avec formulaire réactif.
- Frontend : Route `/profile` ajoutée dans `app.routes.ts` avec `authGuard` + `mustChangePasswordGuard`.
- Frontend : Menu top-bar — "Changer le mot de passe" remplacé par "Mon profil" → `/profile`.
- E2E : 3 scénarios Playwright créés (AC1/2, AC3, AC4).

## File List

- `backend/src/users/dto/update-profile.dto.ts` (créé)
- `backend/src/users/users.service.ts` (modifié — `updateProfile`)
- `backend/src/users/users.controller.ts` (modifié — `PATCH /users/me`, import `UserEntity` + `UpdateProfileDto`)
- `backend/src/users/users.service.spec.ts` (modifié — tests `updateProfile`)
- `backend/src/users/users.controller.spec.ts` (modifié — tests `PATCH /users/me`)
- `frontend/src/app/core/services/auth.service.ts` (modifié — `name` dans `AuthUser`, `updateProfile()`)
- `frontend/src/app/profile/profile.component.ts` (créé)
- `frontend/src/app/profile/profile.component.html` (créé)
- `frontend/src/app/profile/profile.component.scss` (créé)
- `frontend/src/app/app.routes.ts` (modifié — route `/profile`)
- `frontend/src/app/core/components/top-bar/top-bar.component.html` (modifié — "Mon profil")
- `e2e/tests/profile.spec.ts` (créé)

## Change Log

- 2026-05-17 : Création story 3.5 — page profil utilisateur (create-story workflow)
- 2026-05-18 : Implémentation complète — backend endpoint PATCH /users/me, ProfileComponent Angular, route /profile, top-bar mis à jour, 3 scénarios E2E
- 2026-05-18 : Code review — 6 patches, 5 différés, 9 dismissals

### Review Findings

- [x] [Review][Patch] Trim + interdire espaces seuls dans `name` — `@Transform` + `@MaxLength(255)` + `@MinLength(1)` retiré [`backend/src/users/dto/update-profile.dto.ts`]
- [x] [Review][Patch] Ajouter `@MaxLength(255)` manquant dans `UpdateProfileDto` (cohérence avec `CreateUserDto`) [`backend/src/users/dto/update-profile.dto.ts`]
- [x] [Review][Patch] Vérifier existence utilisateur AVANT `update()` dans `updateProfile` — évite un write inutile sur userId fantôme [`backend/src/users/users.service.ts:155`]
- [x] [Review][Patch] E2E AC1/2 — `afterAll` ajouté pour supprimer l'utilisateur de test [`e2e/tests/profile.spec.ts`]
- [x] [Review][Patch] Inverser l'ordre `takeUntilDestroyed` / `finalize` dans `onSubmit()` [`frontend/src/app/profile/profile.component.ts:61`]
- [x] [Review][Patch] Supprimer `@MinLength(1)` redondant avec `@IsNotEmpty` dans `UpdateProfileDto` [`backend/src/users/dto/update-profile.dto.ts:8`]
- [x] [Review][Defer] Race condition `update()`/`findById()` sans transaction dans `updateProfile` [`backend/src/users/users.service.ts`] — deferred, pre-existing (identique à pattern dans toute la codebase, déjà tracé)
- [x] [Review][Defer] Réponse backend: spread blocklist (`passwordHash`, `refreshTokens`) plutôt que whitelist [`backend/src/users/users.controller.ts:47`] — deferred, pre-existing
- [x] [Review][Defer] Test contrôleur `400` ne teste pas la `ValidationPipe` réelle [`backend/src/users/users.controller.spec.ts`] — deferred, pre-existing testing architecture
- [x] [Review][Defer] `PATCH /users/me` ne revalide pas `isActive` — JWT stateless ne re-vérifie pas en base [`backend/src/users/users.controller.ts`] — deferred, pre-existing architectural decision
- [x] [Review][Defer] Route `/profile` contournable via API si `mustChangePassword=true` — guard côté frontend seulement [`frontend/src/app/app.routes.ts`] — deferred, pre-existing pattern hors scope
