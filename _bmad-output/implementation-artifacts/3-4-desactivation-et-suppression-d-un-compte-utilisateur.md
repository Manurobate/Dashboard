# Story 3.4 : Désactivation et suppression d'un compte utilisateur

Status: done

## Story

En tant qu'administrateur,
Je veux désactiver ou supprimer un compte utilisateur,
Afin de révoquer l'accès à l'instance sans nécessairement effacer toutes ses données.

## Critères d'Acceptation

1. **Étant donné** que je clique "Désactiver" sur un compte actif,
   **Quand** je confirme dans le dialog de confirmation,
   **Alors** le backend passe `isActive = false` sur le compte et invalide tous ses refresh tokens — l'utilisateur est déconnecté immédiatement si sa session était active

2. **Étant donné** qu'un compte est désactivé,
   **Quand** cet utilisateur tente de se connecter,
   **Alors** le backend retourne 401 avec un message d'erreur générique (sans révéler la raison de désactivation)

3. **Étant donné** que je clique "Supprimer" sur un compte,
   **Quand** je confirme dans le dialog de confirmation (`MatDialog`, bouton destructif),
   **Alors** le backend supprime le compte (hard delete) ainsi que tous ses refresh tokens

4. **Étant donné** que je suis admin,
   **Quand** j'essaie de désactiver ou supprimer mon propre compte admin,
   **Alors** le backend retourne 403 et l'action est bloquée (protection contre le verrouillage de l'instance)

## Tâches

- [x] Backend : Ajouter `disableUser(targetId, requestingId)` dans `UsersService` (AC : 1, 4)
  - [x] 403 si `targetId === requestingId`
  - [x] 404 si user introuvable
  - [x] `userRepository.update({ id: targetId }, { isActive: false })`
  - [x] `refreshTokenRepository.delete({ userId: targetId })`
- [x] Backend : Ajouter `deleteUser(targetId, requestingId)` dans `UsersService` (AC : 3, 4)
  - [x] 403 si `targetId === requestingId`
  - [x] 404 si user introuvable
  - [x] `refreshTokenRepository.delete({ userId: targetId })`
  - [x] `userRepository.delete({ id: targetId })`
- [x] Backend : `PATCH /api/users/:id/disable` dans `UsersController`, 204 (AC : 1)
- [x] Backend : `DELETE /api/users/:id` dans `UsersController`, 204 (AC : 3)
- [x] Backend : Tests unitaires `UsersService` (4 cas disable + 4 cas delete) (AC : 1, 3, 4)
- [x] Backend : Tests contrôleur (204 disable + 204 delete + 403 self + 404) (AC : 1, 3, 4)
- [x] Frontend : Ajouter `disableUser(userId)` et `deleteUser(userId)` dans `AdminService` (AC : 1, 3)
- [x] Frontend : Créer `ConfirmDestructiveDialogComponent` (dialog confirmation générique, paramétrique) (AC : 1, 3)
- [x] Frontend : Ajouter boutons Désactiver/Supprimer dans `AdminPanelComponent` + masquer pour soi-même (AC : 1, 3)
- [x] E2E : 4 scénarios dans `admin.spec.ts` (disable, re-login bloqué, delete, auto-protection)

## Dev Notes

### Contexte — intelligence des stories précédentes

La story 3.3 a établi les patterns suivants, **à reproduire exactement** :
- Invalidation des refresh tokens : `refreshTokenRepository.delete({ userId })` — même approche pour disable
- Vérification rôle admin sur la cible : `ForbiddenException` si `user.role === 'admin'` dans `resetPasswordByAdmin`
- **DIFFÉRENCE story 3.4** : la protection est sur l'auto-référence (`targetId === requestingId`), pas sur le rôle. Un admin peut désactiver/supprimer un autre admin (pas prévu dans les AC, donc ne pas l'empêcher).
- `loadUsers().subscribe({ error: () => {} })` pour rafraîchir la liste après action
- `finalize(() => this.isSubmitting.set(false))` pour éviter les états bloqués
- Guards au niveau contrôleur (`@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin')`, `@SkipThrottle()`) — les nouveaux endpoints les héritent automatiquement, ne pas les dupliquer

**AC2 déjà implémenté** : `AuthService` vérifie `user.isActive` aux lignes 35 et 153 de `backend/src/auth/auth.service.ts`. Désactiver (`isActive = false`) bloque automatiquement la connexion et le refresh — aucun code supplémentaire requis.

### Stack et fichiers — vue complète

**Backend — fichiers à modifier :**

| Fichier | État | Rôle |
|---------|------|------|
| `backend/src/users/users.service.ts` | **MODIFIER** | Ajouter `disableUser()` + `deleteUser()` |
| `backend/src/users/users.controller.ts` | **MODIFIER** | `PATCH :id/disable` + `DELETE :id` |
| `backend/src/users/users.service.spec.ts` | **MODIFIER** | Tests disable + delete |
| `backend/src/users/users.controller.spec.ts` | **MODIFIER** | Tests endpoints disable + delete |

**Frontend — fichiers à modifier/créer :**

| Fichier | État | Rôle |
|---------|------|------|
| `frontend/src/app/admin/admin.service.ts` | **MODIFIER** | `disableUser()` + `deleteUser()` |
| `frontend/src/app/admin/admin-panel.component.ts` | **MODIFIER** | Injecter `AuthService` + handlers dialogs |
| `frontend/src/app/admin/admin-panel.component.html` | **MODIFIER** | Boutons Désactiver + Supprimer |
| `frontend/src/app/admin/confirm-destructive-dialog.component.ts` | **CRÉER** | Dialog confirmation générique |
| `frontend/src/app/admin/confirm-destructive-dialog.component.html` | **CRÉER** | Template du dialog |
| `frontend/src/app/admin/confirm-destructive-dialog.component.scss` | **CRÉER** | Styles |
| `e2e/tests/admin.spec.ts` | **MODIFIER** | Scénarios disable + delete |

---

### Implémentation Backend

#### `UsersService` — nouvelles méthodes

```typescript
async disableUser(targetId: number, requestingId: number): Promise<void> {
  if (targetId === requestingId) {
    throw new ForbiddenException('Impossible de désactiver son propre compte');
  }
  const user = await this.findById(targetId);
  if (!user) throw new NotFoundException(`Utilisateur ${targetId} introuvable`);

  await this.userRepository.update({ id: targetId }, { isActive: false });
  await this.refreshTokenRepository.delete({ userId: targetId });
}

async deleteUser(targetId: number, requestingId: number): Promise<void> {
  if (targetId === requestingId) {
    throw new ForbiddenException('Impossible de supprimer son propre compte');
  }
  const user = await this.findById(targetId);
  if (!user) throw new NotFoundException(`Utilisateur ${targetId} introuvable`);

  await this.refreshTokenRepository.delete({ userId: targetId });
  await this.userRepository.delete({ id: targetId });
}
```

> **Cascade DB** : `RefreshTokenEntity` a `onDelete: 'CASCADE'` sur la FK vers `User`. La suppression explicite des tokens avant `userRepository.delete()` est intentionnelle (cohérence avec le pattern `resetPasswordByAdmin`, pas de reliance sur le comportement DB implicite).

#### `UsersController` — nouveaux endpoints

Extraire l'ID du user connecté via `@Req()` (pattern existant dans `AuthController`) :

```typescript
import { Req, Delete, HttpStatus, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

// Ajouter dans UsersController :

@Patch(':id/disable')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Désactiver un compte utilisateur' })
@ApiResponse({ status: 204, description: 'Compte désactivé' })
@ApiResponse({ status: 403, description: 'Impossible de désactiver son propre compte' })
@ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
async disableUser(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: Request & { user: { id: number } },
): Promise<void> {
  await this.usersService.disableUser(id, req.user.id);
}

@Delete(':id')
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: 'Supprimer un compte utilisateur (hard delete)' })
@ApiResponse({ status: 204, description: 'Compte supprimé' })
@ApiResponse({ status: 403, description: 'Impossible de supprimer son propre compte' })
@ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
async deleteUser(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: Request & { user: { id: number } },
): Promise<void> {
  await this.usersService.deleteUser(id, req.user.id);
}
```

> **`req.user`** : le `JwtStrategy.validate()` retourne `{ id: payload.sub, username: payload.username, role: payload.role }`. `req.user.id` est l'ID numérique de l'admin connecté.

#### Tests Backend

**`users.service.spec.ts`** — tests `disableUser` :
```typescript
describe('disableUser', () => {
  it('désactive le compte et invalide les tokens', async () => { ... });
  it('passe isActive à false', async () => { ... });
  it('lance ForbiddenException si targetId === requestingId', async () => { ... });
  it('lance NotFoundException si utilisateur introuvable', async () => { ... });
});

describe('deleteUser', () => {
  it('supprime les refresh tokens puis le compte', async () => { ... });
  it('appelle userRepository.delete avec le bon id', async () => { ... });
  it('lance ForbiddenException si targetId === requestingId', async () => { ... });
  it('lance NotFoundException si utilisateur introuvable', async () => { ... });
});
```

---

### Implémentation Frontend

#### `AdminService` — ajout des méthodes

```typescript
disableUser(userId: number): Observable<void> {
  return this.http.patch<void>(`/api/users/${userId}/disable`, {});
}

deleteUser(userId: number): Observable<void> {
  return this.http.delete<void>(`/api/users/${userId}`);
}
```

#### `ConfirmDestructiveDialogComponent` (NOUVEAU)

Dialog de confirmation générique, utilisé pour disable ET delete. Pattern plus simple que `ResetPasswordDialogComponent` — **un seul état** (pas de "password-reveal").

```typescript
// frontend/src/app/admin/confirm-destructive-dialog.component.ts
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDestructiveDialogData {
  title: string;
  message: string;
  confirmLabel: string;
}

@Component({
  selector: 'app-confirm-destructive-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirm-destructive-dialog.component.html',
  styleUrl: './confirm-destructive-dialog.component.scss',
})
export class ConfirmDestructiveDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDestructiveDialogComponent>);
  readonly data = inject<ConfirmDestructiveDialogData>(MAT_DIALOG_DATA);

  confirm(): void {
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
```

Le dialog retourne `true` si confirmé, `false`/`undefined` si annulé. L'action (appel API) est dans le composant parent (`AdminPanelComponent`), pas dans le dialog.

#### Template `confirm-destructive-dialog.component.html`

```html
<h2 mat-dialog-title>{{ data.title }}</h2>
<mat-dialog-content>
  <p>{{ data.message }}</p>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button (click)="cancel()">Annuler</button>
  <button mat-flat-button color="warn" (click)="confirm()">
    {{ data.confirmLabel }}
  </button>
</mat-dialog-actions>
```

#### `AdminPanelComponent` — modifications

**Dans `admin-panel.component.ts`** :
```typescript
import { inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../core/services/auth.service';
import { ConfirmDestructiveDialogComponent, ConfirmDestructiveDialogData } from './confirm-destructive-dialog.component';
import { finalize } from 'rxjs/operators';

// Ajouter dans les imports du composant :
// MatSnackBarModule (ou utiliser via inject)

// Ajouter dans la classe :
private readonly authService = inject(AuthService);
private readonly snackBar = inject(MatSnackBar);
readonly isActioning = signal(false);

openDisableDialog(user: UserListItem): void {
  const ref = this.dialog.open<ConfirmDestructiveDialogComponent, ConfirmDestructiveDialogData, boolean>(
    ConfirmDestructiveDialogComponent,
    {
      width: '400px',
      data: {
        title: `Désactiver ${user.username} ?`,
        message: 'Le compte sera désactivé. L\'utilisateur sera immédiatement déconnecté si sa session était active.',
        confirmLabel: 'Désactiver',
      } satisfies ConfirmDestructiveDialogData,
    },
  );
  ref.afterClosed().subscribe(confirmed => {
    if (!confirmed) return;
    this.isActioning.set(true);
    this.adminService.disableUser(user.id).pipe(
      finalize(() => this.isActioning.set(false)),
    ).subscribe({
      next: () => {
        this.snackBar.open('Compte désactivé', 'Fermer', { duration: 3000 });
        this.adminService.loadUsers().subscribe({ error: () => {} });
      },
      error: () => {
        this.snackBar.open('Impossible de désactiver le compte', 'Fermer', { duration: 4000 });
      },
    });
  });
}

openDeleteDialog(user: UserListItem): void {
  const ref = this.dialog.open<ConfirmDestructiveDialogComponent, ConfirmDestructiveDialogData, boolean>(
    ConfirmDestructiveDialogComponent,
    {
      width: '400px',
      data: {
        title: `Supprimer ${user.username} ?`,
        message: 'Cette action est irréversible. Le compte sera définitivement supprimé.',
        confirmLabel: 'Supprimer',
      } satisfies ConfirmDestructiveDialogData,
    },
  );
  ref.afterClosed().subscribe(confirmed => {
    if (!confirmed) return;
    this.isActioning.set(true);
    this.adminService.deleteUser(user.id).pipe(
      finalize(() => this.isActioning.set(false)),
    ).subscribe({
      next: () => {
        this.snackBar.open('Compte supprimé', 'Fermer', { duration: 3000 });
        this.adminService.loadUsers().subscribe({ error: () => {} });
      },
      error: () => {
        this.snackBar.open('Impossible de supprimer le compte', 'Fermer', { duration: 4000 });
      },
    });
  });
}
```

> Ajouter `MatSnackBarModule` aux `imports` du composant si pas déjà présent (ou utiliser `inject(MatSnackBar)` directement — `MatSnackBar` est `providedIn: 'root'`).

**Dans `admin-panel.component.html`** — modifier la colonne `actions` existante :

```html
<ng-container matColumnDef="actions">
  <th mat-header-cell *matHeaderCellDef>Actions</th>
  <td mat-cell *matCellDef="let user">
    @if (user.id !== authService.currentUser()?.id) {
      @if (user.role !== 'admin') {
        <button mat-icon-button
                aria-label="Réinitialiser le mot de passe"
                matTooltip="Réinitialiser le mot de passe"
                (click)="openResetPasswordDialog(user)">
          <mat-icon>lock_reset</mat-icon>
        </button>
      }
      @if (user.isActive) {
        <button mat-icon-button
                aria-label="Désactiver le compte"
                matTooltip="Désactiver"
                (click)="openDisableDialog(user)"
                [disabled]="isActioning()">
          <mat-icon>block</mat-icon>
        </button>
      }
      <button mat-icon-button
              aria-label="Supprimer le compte"
              matTooltip="Supprimer"
              (click)="openDeleteDialog(user)"
              [disabled]="isActioning()">
        <mat-icon color="warn">delete</mat-icon>
      </button>
    }
  </td>
</ng-container>
```

> **Exposition de `authService` dans le template** : le composant expose déjà `adminService` avec `protected`. Faire de même pour `authService` : `protected readonly authService = inject(AuthService);`

---

### Scénarios E2E

**Fichier à modifier** : `e2e/tests/admin.spec.ts`

```typescript
test('Disable — Admin désactive un compte et le badge passe à Inactif', async ({ page, request }) => {
  // Créer un utilisateur cible via API
  await loginAdminApi(request);
  const uniqueEmail = `e2e-disable-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Disable User' },
  });
  expect(createRes.status()).toBe(201);

  await loginAdmin(page);
  await page.goto('/admin');

  const row = page.locator('tr', { hasText: uniqueEmail });
  await row.locator('button[aria-label="Désactiver le compte"]').click();

  // Confirmer
  await expect(page.locator('mat-dialog-container')).toBeVisible();
  await page.click('button:has-text("Désactiver")');
  await page.waitForResponse(resp => resp.url().includes(`/disable`) && resp.status() === 204);

  // Vérifier le badge Inactif dans la liste
  await expect(row.locator('.badge-inactive')).toBeVisible();
});

test('Disable — Le compte désactivé ne peut plus se connecter', async ({ page, request }) => {
  await loginAdminApi(request);
  const uniqueEmail = `e2e-disable-login-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Disable Login' },
  });
  const { temporaryPassword } = await createRes.json();

  // Récupérer l'ID via la liste
  const usersRes = await request.get('/api/users');
  const users = await usersRes.json();
  const targetUser = users.find((u: { username: string }) => u.username === uniqueEmail);

  // Désactiver via API
  const disableRes = await request.patch(`/api/users/${targetUser.id}/disable`);
  expect(disableRes.status()).toBe(204);

  // Tenter de se connecter
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');

  // Vérifier le message d'erreur générique
  await expect(page.locator('mat-error, .error-message')).toBeVisible();
  await expect(page).toHaveURL('/login');
});

test('Delete — Admin supprime un compte et il disparaît de la liste', async ({ page, request }) => {
  await loginAdminApi(request);
  const uniqueEmail = `e2e-delete-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Delete User' },
  });
  expect(createRes.status()).toBe(201);

  await loginAdmin(page);
  await page.goto('/admin');

  const row = page.locator('tr', { hasText: uniqueEmail });
  await row.locator('button[aria-label="Supprimer le compte"]').click();

  await expect(page.locator('mat-dialog-container')).toBeVisible();
  await page.click('button:has-text("Supprimer")');
  await page.waitForResponse(resp => resp.url().match(/\/users\/\d+$/) !== null && resp.status() === 204);

  // L'utilisateur ne doit plus apparaître dans la liste
  await expect(page.locator('[data-testid="user-list"]')).not.toContainText(uniqueEmail);
});

test('Auto-protection — Admin ne voit pas les boutons disable/delete sur son propre compte', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  // L'admin row (identifié par adminUsername) ne doit pas avoir les boutons d'action
  const adminRow = page.locator('tr', { hasText: adminUsername! });
  await expect(adminRow.locator('button[aria-label="Désactiver le compte"]')).not.toBeVisible();
  await expect(adminRow.locator('button[aria-label="Supprimer le compte"]')).not.toBeVisible();
});
```

> **Helper `loginAdminApi`** : si cette fonction n'existe pas encore dans le fichier, créer un helper qui appelle `request.post('/api/auth/login', ...)` — voir le pattern du test "Reset password" existant pour la syntaxe.

---

### Patterns obligatoires

- ❌ **NE PAS** ajouter `@UseGuards` sur les nouvelles méthodes du contrôleur — ils sont hérités au niveau classe
- ❌ **NE PAS** utiliser `userRepository.remove(user)` — utiliser `delete({ id })` après suppression explicite des tokens (cohérence avec les patterns existants)
- ❌ **NE PAS** utiliser `console.log` — utiliser `Logger` NestJS si besoin
- ❌ **NE PAS** retourner le user en réponse — les deux opérations retournent 204 No Content
- ✅ Boutons "Désactiver" et "Supprimer" avec `color="warn"` — pattern UX-DR21
- ✅ `ParseIntPipe` sur `@Param('id')` — conversion automatique string → number avec validation
- ✅ Masquer les boutons côté client via `user.id !== authService.currentUser()?.id` — la protection 403 côté serveur est autoritaire, c'est UX seulement
- ✅ `MatSnackBar` 3s pour les succès (UX-DR17)
- ✅ Le bouton "Désactiver" n'apparaît que si `user.isActive === true`

### Arborescence des fichiers

**Nouveaux fichiers :**
```
frontend/src/app/admin/
├── confirm-destructive-dialog.component.ts   ← NOUVEAU
├── confirm-destructive-dialog.component.html ← NOUVEAU
└── confirm-destructive-dialog.component.scss ← NOUVEAU
```

**Fichiers modifiés :**
```
backend/src/users/users.service.ts            ← MODIFIÉ (disableUser + deleteUser)
backend/src/users/users.controller.ts         ← MODIFIÉ (PATCH :id/disable + DELETE :id)
backend/src/users/users.service.spec.ts       ← MODIFIÉ (tests disable + delete)
backend/src/users/users.controller.spec.ts    ← MODIFIÉ (tests nouveaux endpoints)

frontend/src/app/admin/admin.service.ts              ← MODIFIÉ (disableUser + deleteUser)
frontend/src/app/admin/admin-panel.component.ts      ← MODIFIÉ (authService + handlers)
frontend/src/app/admin/admin-panel.component.html    ← MODIFIÉ (boutons disable + delete)

e2e/tests/admin.spec.ts                              ← MODIFIÉ (4 scénarios)
```

### Références

- Story 3.3 (done) : `_bmad-output/implementation-artifacts/3-3-reinitialisation-du-mot-de-passe-d-un-utilisateur.md` — pattern dialog + ForbiddenException admin
- `AuthService.validateUser()` : `backend/src/auth/auth.service.ts` ligne 35 — `isActive` déjà vérifié, AC2 implémenté implicitement
- `JwtStrategy.validate()` : `backend/src/auth/strategies/jwt.strategy.ts` — `req.user.id` = `payload.sub`
- `UserEntity` : `backend/src/users/user.entity.ts` — champ `isActive`, `@OneToMany cascade: ['remove']`
- `RefreshTokenEntity` : `backend/src/auth/entities/refresh-token.entity.ts` — `onDelete: 'CASCADE'` présent
- `UsersService.resetPasswordByAdmin()` : pattern `refreshTokenRepository.delete({ userId })` à reproduire
- `AdminPanelComponent` : `frontend/src/app/admin/admin-panel.component.ts` — pattern dialog.open, displayedColumns
- `AuthService` : `frontend/src/app/core/services/auth.service.ts` — `currentUser()` signal
- Epics : `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.4

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Correction de 4 tests `resetPasswordByAdmin` pré-existants cassés depuis story 3.3 : les tests happy-path utilisaient `mockUser` (role: 'admin'), ce qui déclenchait la `ForbiddenException`. Remplacé par `mockRegularUser` (role: 'user').

### Completion Notes List

Implémentation complète de la désactivation et suppression des comptes utilisateurs :
- **Backend** : `disableUser()` et `deleteUser()` dans `UsersService` avec protection auto-référence (403) et vérification existence (404). Endpoints `PATCH :id/disable` et `DELETE :id` dans `UsersController` (204 No Content). AC2 déjà implémenté via `AuthService.validateUser()`.
- **Tests backend** : 8 nouveaux tests unitaires (4 disable + 4 delete) + 6 tests contrôleur. Correction de 4 tests pré-existants cassés. Total : 89/89 tests verts.
- **Frontend** : `disableUser()` et `deleteUser()` dans `AdminService`. `ConfirmDestructiveDialogComponent` générique créé. Boutons Désactiver/Supprimer dans `AdminPanelComponent` avec masquage côté client via `authService.currentUser()?.id`. `isActioning` signal pour désactivation pendant l'opération.
- **E2E** : 4 scénarios Playwright (disable UI, re-login bloqué, delete UI, auto-protection).

### File List

backend/src/users/users.service.ts
backend/src/users/users.controller.ts
backend/src/users/users.service.spec.ts
backend/src/users/users.controller.spec.ts
frontend/src/app/admin/admin.service.ts
frontend/src/app/admin/admin-panel.component.ts
frontend/src/app/admin/admin-panel.component.html
frontend/src/app/admin/confirm-destructive-dialog.component.ts
frontend/src/app/admin/confirm-destructive-dialog.component.html
frontend/src/app/admin/confirm-destructive-dialog.component.scss
e2e/tests/admin.spec.ts

## Change Log

- 2026-05-13 : Implémentation story 3.4 — désactivation/suppression compte utilisateur (endpoints PATCH :id/disable + DELETE :id, dialog de confirmation, 89 tests verts, 4 scénarios E2E)
- 2026-05-13 : Revue de code — 3 patches appliqués, 8 findings différés

### Review Findings

- [x] [Review][Patch] Protection dernier admin actif sur disableUser + deleteUser [backend/src/users/users.service.ts:99-126] — ForbiddenException si activeAdminCount <= 1 ; 2 tests ajoutés ; 53/53 verts
- [x] [Review][Patch] Bouton "Désactiver" sans color="warn" [frontend/src/app/admin/admin-panel.component.html:77]
- [x] [Review][Patch] targetUser peut être undefined en E2E [e2e/tests/admin.spec.ts:198] — assertion expect(targetUser).toBeDefined() ajoutée

- [x] [Review][Defer] Transactions manquantes disableUser + deleteUser [backend/src/users/users.service.ts] — deferred, pre-existing pattern (identique à resetPasswordByAdmin, fix nécessite DataSource injection cross-story)
- [x] [Review][Defer] isActioning signal global pour toute la table [frontend/src/app/admin/admin-panel.component.ts:59] — deferred, pre-existing UX pattern des stories précédentes
- [x] [Review][Defer] loadUsers() erreur silencieuse après action [frontend/src/app/admin/admin-panel.component.ts] — deferred, pre-existing pattern stories 3.1/3.2/3.3
- [x] [Review][Defer] authService.currentUser() peut être null — affichage boutons [frontend/src/app/admin/admin-panel.component.html:67] — deferred, cosmétique (auth guard empêche /admin sans session valide)
- [x] [Review][Defer] Idempotence disable/enable (compte déjà dans l'état cible) [backend/src/users/users.service.ts] — deferred, comportement acceptable
- [x] [Review][Defer] E2E ne teste pas la déconnexion immédiate d'une session active [e2e/tests/admin.spec.ts] — deferred, complexe (2 contextes browser), couvert par unit tests
- [x] [Review][Defer] Cas "compte déjà inactif" non testé en unit [backend/src/users/users.service.spec.ts] — deferred, gap de couverture mineur
- [x] [Review][Defer] Race condition TOCTOU findById → update [backend/src/users/users.service.ts] — deferred, pre-existing pattern dans toute la codebase
