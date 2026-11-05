# Story 3.3 : Réinitialisation du mot de passe d'un utilisateur

Status: done

## Story

En tant qu'administrateur,
Je veux réinitialiser le mot de passe d'un utilisateur qui a perdu l'accès à son compte,
Afin de lui fournir un nouveau mot de passe temporaire sans serveur mail.

## Critères d'Acceptation

1. **Étant donné** que je clique "Réinitialiser le mot de passe" sur un compte dans la liste du panneau admin,
   **Quand** je confirme l'action dans le dialog de confirmation (`MatDialog`),
   **Alors** le backend génère un nouveau mot de passe temporaire (`crypto.randomBytes(12).toString('base64url')`, 96 bits), met à jour le hash bcrypt (cost 12), passe `mustChangePassword = true`, et invalide tous les refresh tokens actifs de cet utilisateur (`DELETE FROM RefreshToken WHERE userId = :id`)

2. **Étant donné** que la réinitialisation est effectuée avec succès,
   **Quand** le dialog passe à l'état `password-reveal`,
   **Alors** le nouveau mot de passe temporaire est affiché **une seule fois** à l'écran dans un encadré avec bouton "Copier" — il n'est jamais renvoyé par l'API ensuite

3. **Étant donné** que l'utilisateur cible n'existe pas (userId invalide),
   **Quand** `PATCH /api/users/:id/reset-password` est appelé,
   **Alors** le backend retourne 404 Not Found

4. **Étant donné** que la réinitialisation est effectuée,
   **Quand** l'utilisateur concerné tente d'utiliser son ancienne session (refresh token),
   **Alors** le refresh est rejeté (401) car tous ses tokens ont été invalidés — il doit se reconnecter

## Dev Notes

### Contexte et patterns de la story précédente (3.2)

La story 3.2 a établi les patterns suivants, **à reproduire exactement** :
- Génération de mot de passe temporaire : `crypto.randomBytes(12).toString('base64url')` → 16 chars, 96 bits
- Hash bcrypt : `bcrypt.hash(temporaryPassword, 12)`
- Dialog Angular à deux états via `signal<'confirm' | 'password-reveal'>('confirm')`
- `disableClose: false` au départ, puis `dialogRef.disableClose = true` avant `state.set('password-reveal')`
- Bouton "Copier" : `navigator.clipboard.writeText(this.tempPassword())` avec gestion de l'erreur (`catch` → snackbar d'erreur)
- `loadUsers().subscribe()` après l'action pour rafraîchir la liste
- Gestion de `finalize(() => this.isSubmitting.set(false))`
- Convention username = adresse email normalisée en lowercase

### Stack et fichiers — vue complète

**Backend — fichiers à modifier/créer :**

| Fichier | État | Rôle |
|---------|------|------|
| `backend/src/users/users.module.ts` | **MODIFIER** | Ajouter `RefreshTokenEntity` dans `TypeOrmModule.forFeature` |
| `backend/src/users/users.service.ts` | **MODIFIER** | Injecter `RefreshTokenRepository` + ajouter `resetPasswordByAdmin()` |
| `backend/src/users/users.controller.ts` | **MODIFIER** | Ajouter `PATCH /api/users/:id/reset-password` |
| `backend/src/users/dto/reset-password-response.dto.ts` | **CRÉER** | DTO réponse `{ temporaryPassword: string }` |
| `backend/src/users/users.service.spec.ts` | **MODIFIER** | Ajouter tests `resetPasswordByAdmin` |
| `backend/src/users/users.controller.spec.ts` | **MODIFIER** | Ajouter tests `PATCH /:id/reset-password` |

**Frontend — fichiers à modifier/créer :**

| Fichier | État | Rôle |
|---------|------|------|
| `frontend/src/app/admin/admin.service.ts` | **MODIFIER** | Ajouter `resetPassword(userId)` + interface `ResetPasswordResponse` |
| `frontend/src/app/admin/admin-panel.component.ts` | **MODIFIER** | Ajouter colonne `actions` + méthode `openResetPasswordDialog()` |
| `frontend/src/app/admin/admin-panel.component.html` | **MODIFIER** | Ajouter colonne actions avec bouton reset par ligne |
| `frontend/src/app/admin/reset-password-dialog.component.ts` | **CRÉER** | Dialog deux états : confirm → password-reveal |
| `frontend/src/app/admin/reset-password-dialog.component.html` | **CRÉER** | Template du dialog |
| `frontend/src/app/admin/reset-password-dialog.component.scss` | **CRÉER** | Styles (réutiliser pattern de create-user-dialog) |
| `e2e/tests/admin.spec.ts` | **MODIFIER** | Ajouter tests reset password |

---

### Implémentation Backend

#### Étape 1 — Mise à jour `users.module.ts`

```typescript
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

> **Pourquoi** : `RefreshTokenEntity` est dans `../auth/entities/` mais l'importer ici ne crée pas de dépendance circulaire entre modules — TypeORM gère les entités indépendamment des modules NestJS. `AuthModule` importe `UsersModule` (sens unique), pas l'inverse.

#### Étape 2 — Mise à jour `UsersService` (`backend/src/users/users.service.ts`)

Ajouter dans le constructeur :
```typescript
@InjectRepository(RefreshTokenEntity)
private readonly refreshTokenRepository: Repository<RefreshTokenEntity>,
```

Import à ajouter en haut du fichier :
```typescript
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { NotFoundException } from '@nestjs/common';
```

Nouvelle méthode à ajouter :
```typescript
async resetPasswordByAdmin(userId: number): Promise<string> {
  const user = await this.findById(userId);
  if (!user) throw new NotFoundException(`Utilisateur ${userId} introuvable`);

  const temporaryPassword = crypto.randomBytes(12).toString('base64url');
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await this.userRepository.update(
    { id: userId },
    { passwordHash, mustChangePassword: true },
  );
  await this.refreshTokenRepository.delete({ userId });

  return temporaryPassword;
}
```

> **Pattern de référence** : `AuthService.updatePassword()` (ligne `await this.refreshTokenRepository.delete({ userId })`) utilise exactement la même approche pour invalider les tokens. Reproduire ici, pas réinventer.

#### Étape 3 — DTO `reset-password-response.dto.ts`

```typescript
// backend/src/users/dto/reset-password-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  @ApiProperty({ description: 'Nouveau mot de passe temporaire — affiché une seule fois, jamais renvoyé ensuite' })
  temporaryPassword!: string;
}
```

#### Étape 4 — Mise à jour `UsersController`

Ajouter les imports :
```typescript
import { Param, ParseIntPipe, Patch, NotFoundException } from '@nestjs/common';
import { ResetPasswordResponseDto } from './dto/reset-password-response.dto';
```

Ajouter l'endpoint dans la classe `UsersController` :
```typescript
@Patch(':id/reset-password')
@HttpCode(HttpStatus.OK)
@ApiOperation({ summary: 'Réinitialiser le mot de passe d\'un utilisateur (génère un nouveau mot de passe temporaire)' })
@ApiResponse({ status: 200, description: 'Nouveau mot de passe temporaire — retourné une seule fois', type: ResetPasswordResponseDto })
@ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
async resetPassword(@Param('id', ParseIntPipe) id: number): Promise<ResetPasswordResponseDto> {
  const temporaryPassword = await this.usersService.resetPasswordByAdmin(id);
  return { temporaryPassword };
}
```

> **Guards déjà en place** : `@UseGuards(JwtAuthGuard, RolesGuard)`, `@Roles('admin')`, `@SkipThrottle()` sur le contrôleur — l'endpoint hérite automatiquement. Ne pas dupliquer.

#### Tests backend à ajouter

**`users.service.spec.ts`** — nouveaux tests pour `resetPasswordByAdmin` :
```typescript
describe('resetPasswordByAdmin', () => {
  it('génère un mot de passe temporaire et met à jour le hash', async () => { ... });
  it('passe mustChangePassword à true', async () => { ... });
  it('invalide tous les refresh tokens de l\'utilisateur', async () => { ... });
  it('lance NotFoundException si utilisateur introuvable', async () => { ... });
});
```

**`users.controller.spec.ts`** — nouveau test pour `PATCH /:id/reset-password` :
```typescript
it('retourne 200 avec temporaryPassword', async () => { ... });
it('retourne 404 si userId inconnu', async () => { ... });
```

---

### Implémentation Frontend

#### Étape 1 — `AdminService` (`frontend/src/app/admin/admin.service.ts`)

Ajouter l'interface et la méthode :
```typescript
export interface ResetPasswordResponse {
  temporaryPassword: string;
}

// Dans la classe AdminService :
resetPassword(userId: number): Observable<ResetPasswordResponse> {
  return this.http.patch<ResetPasswordResponse>(`/api/users/${userId}/reset-password`, {});
}
```

#### Étape 2 — `ResetPasswordDialogComponent`

Ce dialog est structurellement similaire à `CreateUserDialogComponent` (deux états, même pattern de signal), mais l'état 1 est une **confirmation** (pas un formulaire).

```typescript
// frontend/src/app/admin/reset-password-dialog.component.ts
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AdminService } from './admin.service';

type DialogState = 'confirm' | 'password-reveal';

export interface ResetPasswordDialogData {
  userId: number;
  username: string;
}

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './reset-password-dialog.component.html',
  styleUrl: './reset-password-dialog.component.scss',
})
export class ResetPasswordDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ResetPasswordDialogComponent>);
  readonly data = inject<ResetPasswordDialogData>(MAT_DIALOG_DATA);
  private readonly adminService = inject(AdminService);
  private readonly snackBar = inject(MatSnackBar);

  readonly state = signal<DialogState>('confirm');
  readonly isSubmitting = signal(false);
  readonly tempPassword = signal('');

  confirm(): void {
    if (this.isSubmitting()) return;
    this.isSubmitting.set(true);

    this.adminService.resetPassword(this.data.userId).pipe(
      finalize(() => this.isSubmitting.set(false)),
    ).subscribe({
      next: (response) => {
        this.tempPassword.set(response.temporaryPassword);
        this.dialogRef.disableClose = true;
        this.state.set('password-reveal');
        this.adminService.loadUsers().subscribe({ error: () => {} });
      },
      error: () => {
        this.snackBar.open('Impossible de réinitialiser le mot de passe', 'Fermer', { duration: 4000 });
      },
    });
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.tempPassword()).catch(() => {
      this.snackBar.open('Impossible de copier dans le presse-papier', 'Fermer', { duration: 3000 });
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
```

> **Import manquant** : ajouter `finalize` dans l'import rxjs : `import { finalize } from 'rxjs/operators';`

#### Template `reset-password-dialog.component.html`

```html
<h2 mat-dialog-title>
  {{ state() === 'confirm' ? 'Réinitialiser le mot de passe' : 'Mot de passe réinitialisé' }}
</h2>

<mat-dialog-content>
  @if (state() === 'confirm') {
    <p>
      Voulez-vous réinitialiser le mot de passe de
      <strong>{{ data.username }}</strong> ?
    </p>
    <p class="warning-text">
      Tous les tokens de session actifs de cet utilisateur seront invalidés.
      Un nouveau mot de passe temporaire sera généré et devra lui être transmis.
    </p>
  }

  @if (state() === 'password-reveal') {
    <p>Le mot de passe a été réinitialisé. Transmettez ce mot de passe temporaire à l'utilisateur :</p>
    <div class="temp-password-box">
      <span class="temp-password-value">{{ tempPassword() }}</span>
      <button mat-icon-button aria-label="Copier le mot de passe" (click)="copyPassword()">
        <mat-icon>content_copy</mat-icon>
      </button>
    </div>
    <p class="temp-password-warning">
      Ce mot de passe ne sera plus affiché après fermeture de cette fenêtre.
      L'utilisateur devra le changer à sa prochaine connexion.
    </p>
  }
</mat-dialog-content>

<mat-dialog-actions align="end">
  @if (state() === 'confirm') {
    <button mat-button (click)="close()" [disabled]="isSubmitting()">Annuler</button>
    <button mat-flat-button color="warn"
            (click)="confirm()"
            [disabled]="isSubmitting()">
      @if (isSubmitting()) { Réinitialisation... } @else { Réinitialiser }
    </button>
  }
  @if (state() === 'password-reveal') {
    <button mat-flat-button color="primary" (click)="close()">Fermer</button>
  }
</mat-dialog-actions>
```

#### Styles `reset-password-dialog.component.scss`

```scss
// Réutiliser exactement les mêmes classes que create-user-dialog.component.scss :
.temp-password-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 2px solid var(--color-primary);
  border-radius: 8px;
  background: rgba(var(--color-primary-rgb, 198, 40, 40), 0.08);
  margin: 12px 0;
}

.temp-password-value {
  font-family: 'Courier New', Courier, monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--color-primary);
  flex: 1;
}

.temp-password-warning {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

.warning-text {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
```

#### Étape 3 — Mise à jour `AdminPanelComponent`

**Dans `admin-panel.component.ts`** :
```typescript
// Ajouter dans les imports du composant :
import { MatTooltipModule } from '@angular/material/tooltip';
import { ResetPasswordDialogComponent, ResetPasswordDialogData } from './reset-password-dialog.component';

// Modifier displayedColumns :
readonly displayedColumns = ['username', 'name', 'role', 'isActive', 'mustChangePassword', 'actions'];

// Ajouter la méthode :
openResetPasswordDialog(user: UserListItem): void {
  this.dialog.open(ResetPasswordDialogComponent, {
    width: '420px',
    disableClose: false,
    data: { userId: user.id, username: user.username } satisfies ResetPasswordDialogData,
  });
}
```

Ajouter `MatTooltipModule` dans les `imports` du composant.

**Dans `admin-panel.component.html`** — ajouter la colonne `actions` dans la table (après `mustChangePassword`) :
```html
<ng-container matColumnDef="actions">
  <th mat-header-cell *matHeaderCellDef>Actions</th>
  <td mat-cell *matCellDef="let user">
    <button mat-icon-button
            aria-label="Réinitialiser le mot de passe"
            matTooltip="Réinitialiser le mot de passe"
            (click)="openResetPasswordDialog(user)">
      <mat-icon>lock_reset</mat-icon>
    </button>
  </td>
</ng-container>
```

---

### Scénarios E2E

**Fichier à modifier** : `e2e/tests/admin.spec.ts`

```typescript
test('Reset password — Admin réinitialise le mot de passe et voit le nouveau mot de passe temporaire', async ({ page, request }) => {
  // Créer un utilisateur cible via API
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(loginRes.ok()).toBeTruthy();

  const uniqueEmail = `e2e-reset-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Reset User' },
  });
  expect(createRes.status()).toBe(201);

  await loginAdmin(page);
  await page.goto('/admin');

  // Cliquer sur le bouton reset du nouvel utilisateur
  const row = page.locator('tr', { hasText: uniqueEmail });
  await row.locator('button[aria-label="Réinitialiser le mot de passe"]').click();

  // Vérifier le dialog de confirmation
  await expect(page.locator('mat-dialog-container')).toBeVisible();
  await expect(page.locator('mat-dialog-container')).toContainText(uniqueEmail);

  // Confirmer
  await page.click('button:has-text("Réinitialiser")');
  await page.waitForResponse(resp => resp.url().includes('/reset-password') && resp.status() === 200);

  // Vérifier l'affichage du mot de passe
  await expect(page.locator('.temp-password-value')).toBeVisible();
  await expect(page.locator('button[aria-label="Copier le mot de passe"]')).toBeVisible();

  // Fermer
  await page.click('button:has-text("Fermer")');
  await expect(page.locator('mat-dialog-container')).not.toBeVisible();
});

test('Reset password — L\'utilisateur peut se connecter avec le nouveau mot de passe temporaire', async ({ page, request }) => {
  // Créer un utilisateur, changer son mot de passe, puis reset via API
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  expect(loginRes.ok()).toBeTruthy();

  const uniqueEmail = `e2e-reset-login-${Date.now()}@test.local`;
  const createRes = await request.post('/api/users', {
    data: { username: uniqueEmail, name: 'E2E Reset Login User' },
  });
  const { temporaryPassword: initialTempPwd } = await createRes.json();

  // Reset via API
  const { id: userId } = (await createRes.json()).user;
  // Note : re-parser createRes si besoin :
  const { user } = await (await request.post('/api/users', { data: { username: uniqueEmail + 'x', name: 'tmp' } })).json();
  // Alternative plus simple : récupérer l'id depuis la liste
  const usersRes = await request.get('/api/users');
  const users = await usersRes.json();
  const targetUser = users.find((u: any) => u.username === uniqueEmail);

  const resetRes = await request.patch(`/api/users/${targetUser.id}/reset-password`);
  expect(resetRes.status()).toBe(200);
  const { temporaryPassword: newTempPwd } = await resetRes.json();

  // Se connecter avec le nouveau mot de passe
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', uniqueEmail);
  await page.fill('input[autocomplete="current-password"]', newTempPwd);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/change-password$/);
  await expect(page).toHaveURL('/change-password');
});
```

> **Note simplification E2E** : Le second test est complexe. Simplifier si possible en utilisant directement l'API pour créer + reset, puis vérifier uniquement la connexion. L'important est de couvrir le flow critique : nouveau mot de passe temporaire → connexion forcée → /change-password.

---

### Patterns obligatoires à respecter

- ❌ **NE JAMAIS** retourner le mot de passe en clair autre que dans la réponse `PATCH /api/users/:id/reset-password` initiale
- ❌ **NE PAS** stocker le mot de passe temporaire en clair en base — uniquement le hash bcrypt
- ❌ **NE PAS** oublier d'invalider les refresh tokens — c'est un critère d'acceptation explicite
- ❌ **NE PAS** dupliquer les guards sur la méthode — ils sont déjà sur le contrôleur
- ❌ **NE PAS** utiliser `console.log` — utiliser `Logger` NestJS si nécessaire
- ✅ Le bouton "Réinitialiser" dans le dialog doit être `color="warn"` (destructif) — pattern UX-DR21
- ✅ `disableClose = true` basculé AVANT `state.set('password-reveal')` — l'utilisateur ne peut pas fermer sans voir le mot de passe
- ✅ `finalize(() => this.isSubmitting.set(false))` sur l'observable — évite les états bloqués en cas d'erreur
- ✅ `loadUsers().subscribe({ error: () => {} })` après reset — rafraîchir la liste, ne pas remonter l'erreur dans ce callback
- ✅ `ParseIntPipe` obligatoire sur `@Param('id')` — conversion string → number avec validation automatique

### Arborescence des fichiers

**Nouveaux fichiers :**
```
backend/src/users/dto/
└── reset-password-response.dto.ts      ← NOUVEAU

frontend/src/app/admin/
├── reset-password-dialog.component.ts  ← NOUVEAU
├── reset-password-dialog.component.html← NOUVEAU
└── reset-password-dialog.component.scss← NOUVEAU
```

**Fichiers modifiés :**
```
backend/src/users/users.module.ts          ← MODIFIÉ (TypeOrmModule + RefreshTokenEntity)
backend/src/users/users.service.ts         ← MODIFIÉ (inject RefreshTokenRepo + resetPasswordByAdmin)
backend/src/users/users.service.spec.ts    ← MODIFIÉ (tests resetPasswordByAdmin)
backend/src/users/users.controller.ts      ← MODIFIÉ (PATCH /:id/reset-password)
backend/src/users/users.controller.spec.ts ← MODIFIÉ (tests PATCH /:id/reset-password)

frontend/src/app/admin/admin.service.ts              ← MODIFIÉ (resetPassword + ResetPasswordResponse)
frontend/src/app/admin/admin-panel.component.ts      ← MODIFIÉ (colonne actions + openResetPasswordDialog)
frontend/src/app/admin/admin-panel.component.html    ← MODIFIÉ (colonne actions + bouton lock_reset)

e2e/tests/admin.spec.ts                              ← MODIFIÉ (nouveaux tests reset password)
```

### Références

- Epics : `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.3
- Story 3.2 (done) : `_bmad-output/implementation-artifacts/3-2-creation-d-un-compte-utilisateur-avec-mot-de-passe-temporaire.md` — pattern dialog deux états, generation mot de passe temporaire, patterns guards
- `AuthService.updatePassword()` : `backend/src/auth/auth.service.ts` — pattern `refreshTokenRepository.delete({ userId })` à reproduire
- `UserEntity` : `backend/src/users/user.entity.ts`
- `UsersService` : `backend/src/users/users.service.ts` — méthodes existantes (`findById`, `updatePasswordAndClearFlag`)
- `UsersController` : `backend/src/users/users.controller.ts` — guards déjà en place, pattern `ParseIntPipe`
- `CreateUserDialogComponent` : `frontend/src/app/admin/create-user-dialog.component.ts` — pattern exact à reproduire pour le dialog
- `AdminService` : `frontend/src/app/admin/admin.service.ts` — pattern signals et loadUsers
- `AdminPanelComponent` : `frontend/src/app/admin/admin-panel.component.ts` — pattern dialog.open

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucune anomalie rencontrée. Les erreurs lint dans les spec files sont des patterns pre-existants (`(repo as any).xxx`) utilisés dans tout le projet.

### Completion Notes List

- **Backend** : `UsersModule` étendu avec `RefreshTokenEntity` dans `TypeOrmModule.forFeature`. `UsersService.resetPasswordByAdmin()` créée — génère mot de passe temporaire 96 bits (base64url 16 chars), hash bcrypt cost 12, met `mustChangePassword=true`, invalide tous les refresh tokens via `DELETE WHERE userId`. `UsersController` : endpoint `PATCH :id/reset-password` ajouté, hérite des guards admin existants.
- **Frontend** : `AdminService.resetPassword()` + interface `ResetPasswordResponse` ajoutés. `ResetPasswordDialogComponent` créé avec deux états `confirm → password-reveal`, `finalize` pour éviter états bloqués, bouton Copier avec gestion d'erreur snackbar. `AdminPanelComponent` étendu — colonne `actions` + `openResetPasswordDialog()`, `MatTooltipModule` importé.
- **Tests backend** : 5 tests unitaires `resetPasswordByAdmin` (génération mot de passe, mustChangePassword=true, invalidation tokens, format base64url, NotFoundException) + 2 tests contrôleur (200 + 404). Total : 74 tests passent.
- **Tests E2E** : 2 scénarios ajoutés — dialog reset + affichage mot de passe, connexion avec nouveau mot de passe temporaire.
- Tous les critères d'acceptation (AC1-AC4) sont satisfaits.

### File List

**Nouveaux fichiers :**
- `backend/src/users/dto/reset-password-response.dto.ts`
- `frontend/src/app/admin/reset-password-dialog.component.ts`
- `frontend/src/app/admin/reset-password-dialog.component.html`
- `frontend/src/app/admin/reset-password-dialog.component.scss`

**Fichiers modifiés :**
- `backend/src/users/users.module.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.service.spec.ts`
- `backend/src/users/users.controller.spec.ts`
- `frontend/src/app/admin/admin.service.ts`
- `frontend/src/app/admin/admin-panel.component.ts`
- `frontend/src/app/admin/admin-panel.component.html`
- `e2e/tests/admin.spec.ts`

## Review Findings

- [x] [Review][Decision] Admin peut réinitialiser le mot de passe d'un autre admin — Résolu : `ForbiddenException` ajoutée dans `resetPasswordByAdmin` si `user.role === 'admin'`. Test unitaire ajouté. Réponse 403 documentée dans Swagger.
- [x] [Review][Defer] Opérations non-atomiques dans `resetPasswordByAdmin` [backend/src/users/users.service.ts] — deferred, pre-existing — `userRepository.update()` + `refreshTokenRepository.delete()` sans transaction ; si le delete échoue, le mot de passe est changé mais les tokens restent actifs. Pattern identique à `updatePasswordAndClearFlag` et `updatePasswordHash`, déjà différé en story 2.5. À adresser globalement.

## Change Log

| Date | Changement |
|------|-----------|
| 2026-05-12 | Story créée — prête pour développement |
| 2026-05-12 | Implémentation complète — backend (endpoint PATCH, service, module, DTO, tests), frontend (dialog 2 états, AdminService, AdminPanel colonne actions), E2E (2 scénarios) |
| 2026-05-12 | Code review — 1 decision-needed, 1 defer (pré-existant), 12 dismissed |
