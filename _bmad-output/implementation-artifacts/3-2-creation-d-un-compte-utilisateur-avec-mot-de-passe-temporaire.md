# Story 3.2 : Création d'un compte utilisateur avec mot de passe temporaire

Status: done

## Story

En tant qu'administrateur,
Je veux créer un nouveau compte utilisateur en saisissant son identifiant et son nom,
Afin de lui fournir un accès à l'instance sans dépendance à un système d'email.

## Critères d'Acceptation

1. **Étant donné** que je clique "Nouvel utilisateur" dans le panneau admin,
   **Quand** je saisis l'identifiant et le nom et je valide,
   **Alors** le backend génère un mot de passe temporaire aléatoire sécurisé (`crypto.randomBytes(12).toString('base64url')` = 16 chars, 96 bits d'entropie), crée le compte avec `mustChangePassword = true` et `role = 'user'`, hache le mot de passe en bcrypt cost 12, `isActive = true`

2. **Étant donné** que le compte est créé avec succès,
   **Quand** la requête API retourne 201,
   **Alors** le mot de passe temporaire est affiché **une seule fois** dans un encadré visuel avec un bouton "Copier" (`navigator.clipboard.writeText`) — il n'est **jamais** renvoyé par l'API ensuite (ni stocké en clair en base)

3. **Étant donné** que je tente de créer un compte avec un identifiant déjà existant,
   **Quand** je soumets le formulaire,
   **Alors** le backend retourne 409 Conflict et un message d'erreur s'affiche inline dans le formulaire : "Cet identifiant est déjà utilisé"

## Dev Notes

### Stack et fichiers existants à connaître

**Backend — fichiers à modifier/créer :**

| Fichier | État | Rôle |
|---------|------|------|
| `backend/src/users/users.service.ts` | **MODIFIER** | Ajouter `createUserWithTempPassword()` + mettre à jour `createUser()` pour accepter `name` optionnel |
| `backend/src/users/users.controller.ts` | **MODIFIER** | Ajouter endpoint `POST /api/users` |
| `backend/src/users/dto/user-list-item.dto.ts` | Existant | DTO retourné par `GET /api/users` — utilisé aussi dans la réponse de création |
| `backend/src/users/dto/create-user.dto.ts` | **CRÉER** | DTO de création (username + name optionnel) |
| `backend/src/users/dto/create-user-response.dto.ts` | **CRÉER** | DTO réponse avec `user: UserListItemDto` + `temporaryPassword: string` |
| `backend/src/users/users.service.spec.ts` | **MODIFIER** | Ajouter tests pour `createUserWithTempPassword` |
| `backend/src/users/users.controller.spec.ts` | **MODIFIER** | Ajouter tests pour `POST /api/users` |

**Frontend — fichiers à modifier/créer :**

| Fichier | État | Rôle |
|---------|------|------|
| `frontend/src/app/admin/admin.service.ts` | **MODIFIER** | Ajouter `createUser()` + interface `CreateUserResponse` |
| `frontend/src/app/admin/admin-panel.component.ts` | **MODIFIER** | Ajouter bouton + injection `MatDialog`, ouvrir le dialog |
| `frontend/src/app/admin/admin-panel.component.html` | **MODIFIER** | Ajouter bouton "Nouvel utilisateur" |
| `frontend/src/app/admin/create-user-dialog.component.ts` | **CRÉER** | Dialog avec deux états (formulaire → affichage mdp) |
| `frontend/src/app/admin/create-user-dialog.component.html` | **CRÉER** | Template du dialog |
| `frontend/src/app/admin/create-user-dialog.component.scss` | **CRÉER** | Styles (encadré mdp temporaire) |
| `e2e/tests/admin.spec.ts` | **MODIFIER** | Activer le `test.fixme`, ajouter tests création |

### Implémentation Backend

#### `CreateUserDto` (`backend/src/users/dto/create-user.dto.ts`)

```typescript
import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: "Identifiant unique de l'utilisateur", minLength: 3, maxLength: 50 })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  username!: string;

  @ApiPropertyOptional({ description: "Nom d'affichage", maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;
}
```

#### `CreateUserResponseDto` (`backend/src/users/dto/create-user-response.dto.ts`)

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { UserListItemDto } from './user-list-item.dto';

export class CreateUserResponseDto {
  @ApiProperty({ description: 'Données du compte créé' })
  user!: UserListItemDto;

  @ApiProperty({ description: 'Mot de passe temporaire — affiché une seule fois, jamais renvoyé ensuite' })
  temporaryPassword!: string;
}
```

#### Mise à jour `UsersService` — nouvelles méthodes

```typescript
// Ajouter ces imports en haut du fichier :
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { ConflictException } from '@nestjs/common';

// Mettre à jour createUser pour accepter name :
async createUser(data: {
  username: string;
  name?: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword: boolean;
}): Promise<UserEntity> {
  const user = this.userRepository.create({ ...data, isActive: true });
  return this.userRepository.save(user);
}

// Nouvelle méthode :
async createUserWithTempPassword(
  username: string,
  name?: string,
): Promise<{ user: UserEntity; temporaryPassword: string }> {
  const existing = await this.findByUsername(username);
  if (existing) throw new ConflictException('Cet identifiant est déjà utilisé');

  const temporaryPassword = crypto.randomBytes(12).toString('base64url'); // 16 chars, 96 bits
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  const user = await this.createUser({
    username,
    name,
    passwordHash,
    role: 'user',
    mustChangePassword: true,
  });

  return { user, temporaryPassword };
}
```

**Note importante** : le `AdminSeedService` existant appelle `createUser()` sans `name` — l'ajout de `name` optionnel est non-breaking.

#### Mise à jour `UsersController` — endpoint `POST /api/users`

```typescript
// Ajouter ces imports :
import { Post, Body, HttpCode, HttpStatus, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserResponseDto } from './dto/create-user-response.dto';

// Ajouter cette méthode dans UsersController :
@Post()
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: "Créer un compte utilisateur avec mot de passe temporaire" })
@ApiResponse({ status: 201, description: 'Compte créé — mot de passe temporaire retourné une seule fois', type: CreateUserResponseDto })
@ApiResponse({ status: 409, description: 'Identifiant déjà utilisé' })
async create(@Body() dto: CreateUserDto): Promise<CreateUserResponseDto> {
  const { user, temporaryPassword } = await this.usersService.createUserWithTempPassword(
    dto.username,
    dto.name,
  );
  return {
    user: new UserListItemDto(user),
    temporaryPassword,
  };
}
```

**Garde déjà en place** : `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` sur le contrôleur — le `POST` hérite automatiquement de ces guards. `@SkipThrottle()` déjà présent sur le contrôleur.

### Implémentation Frontend

#### Interface `CreateUserResponse` dans `AdminService`

```typescript
// Ajouter au-dessus de @Injectable() :
export interface CreateUserResponse {
  user: UserListItem;
  temporaryPassword: string;
}

// Ajouter dans AdminService :
createUser(username: string, name: string): Observable<CreateUserResponse> {
  return this.http.post<CreateUserResponse>('/api/users', { username, name });
}
```

Après création, appeler `loadUsers()` pour rafraîchir la liste.

#### `CreateUserDialogComponent` — deux états

Le dialog a deux états via un signal :
- `'form'` : formulaire (username obligatoire, name optionnel)
- `'password-reveal'` : affichage du mot de passe temporaire

```typescript
// frontend/src/app/admin/create-user-dialog.component.ts
import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminService } from './admin.service';

type DialogState = 'form' | 'password-reveal';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, ReactiveFormsModule,
  ],
  templateUrl: './create-user-dialog.component.html',
  styleUrl: './create-user-dialog.component.scss',
})
export class CreateUserDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  private readonly adminService = inject(AdminService);
  private readonly fb = inject(FormBuilder);

  readonly state = signal<DialogState>('form');
  readonly isSubmitting = signal(false);
  readonly tempPassword = signal('');
  readonly conflictError = signal(false);

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
    name: ['', [Validators.maxLength(255)]],
  });

  submit(): void {
    if (this.form.invalid || this.isSubmitting()) return;
    this.conflictError.set(false);
    this.isSubmitting.set(true);

    const { username, name } = this.form.value;
    this.adminService.createUser(username!, name ?? '').subscribe({
      next: (response) => {
        this.tempPassword.set(response.temporaryPassword);
        this.state.set('password-reveal');
        this.isSubmitting.set(false);
        // Rafraîchir la liste immédiatement
        this.adminService.loadUsers().subscribe();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        if (err.status === 409) {
          this.conflictError.set(true);
        }
      },
    });
  }

  copyPassword(): void {
    navigator.clipboard.writeText(this.tempPassword());
  }

  close(): void {
    this.dialogRef.close();
  }
}
```

#### Template du dialog (`create-user-dialog.component.html`)

```html
<h2 mat-dialog-title>
  {{ state() === 'form' ? 'Nouvel utilisateur' : 'Compte créé' }}
</h2>

<mat-dialog-content>
  @if (state() === 'form') {
    <form [formGroup]="form" (ngSubmit)="submit()">
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Identifiant *</mat-label>
        <input matInput formControlName="username" autocomplete="off" />
        @if (form.controls.username.hasError('required') && form.controls.username.touched) {
          <mat-error>L'identifiant est obligatoire</mat-error>
        }
        @if (form.controls.username.hasError('minlength')) {
          <mat-error>Minimum 3 caractères</mat-error>
        }
        @if (conflictError()) {
          <mat-error>Cet identifiant est déjà utilisé</mat-error>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Nom d'affichage</mat-label>
        <input matInput formControlName="name" autocomplete="off" />
      </mat-form-field>
    </form>
  }

  @if (state() === 'password-reveal') {
    <p>Le compte a été créé. Transmettez ce mot de passe temporaire à l'utilisateur :</p>
    <div class="temp-password-box">
      <span class="temp-password-value">{{ tempPassword() }}</span>
      <button mat-icon-button aria-label="Copier le mot de passe" (click)="copyPassword()">
        <mat-icon>content_copy</mat-icon>
      </button>
    </div>
    <p class="temp-password-warning">
      Ce mot de passe ne sera plus affiché après fermeture de cette fenêtre.
      L'utilisateur devra le changer à sa première connexion.
    </p>
  }
</mat-dialog-content>

<mat-dialog-actions align="end">
  @if (state() === 'form') {
    <button mat-button (click)="close()" [disabled]="isSubmitting()">Annuler</button>
    <button mat-flat-button color="primary"
            (click)="submit()"
            [disabled]="form.invalid || isSubmitting()">
      @if (isSubmitting()) { Création... } @else { Créer }
    </button>
  }
  @if (state() === 'password-reveal') {
    <button mat-flat-button color="primary" (click)="close()">Fermer</button>
  }
</mat-dialog-actions>
```

#### Styles (`create-user-dialog.component.scss`)

```scss
.full-width {
  width: 100%;
  margin-bottom: 8px;
}

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
```

#### Mise à jour `AdminPanelComponent`

Ajouter dans les imports : `MatButtonModule`, `MatDialogModule`.

```typescript
// Ajouter dans les imports du composant :
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CreateUserDialogComponent } from './create-user-dialog.component';

// Ajouter dans la classe :
private readonly dialog = inject(MatDialog);

openCreateUserDialog(): void {
  this.dialog.open(CreateUserDialogComponent, { width: '400px', disableClose: false });
}
```

Dans le template HTML, ajouter avant la table :
```html
<div class="admin-actions">
  <button mat-flat-button color="primary" (click)="openCreateUserDialog()">
    <mat-icon>person_add</mat-icon>
    Nouvel utilisateur
  </button>
</div>
```

### Scénarios E2E

**Fichier à modifier** : `e2e/tests/admin.spec.ts`

**1. Activer le `test.fixme` (AC2 non-admin → /links)**

Ce test était en fixme en attendant la création d'utilisateurs. Il peut maintenant être activé car cette story fournit `POST /api/users`. Le test doit :
- Appeler `POST /api/users` via API directement (bypasse l'UI)
- Se connecter avec le nouveau compte
- Vérifier la redirection vers `/links` depuis `/admin`

```typescript
test('AC2 — Utilisateur standard redirigé vers /links depuis /admin', async ({ page, request }) => {
  // Créer un compte user via API (admin token requis — utiliser storage state ou loginAdmin)
  const loginRes = await request.post('/api/auth/login', {
    data: { username: adminUsername, password: adminPassword },
  });
  // Note: l'API retourne le cookie JWT automatiquement — le playwright `request` le stocke
  
  const createRes = await request.post('/api/users', {
    data: { username: 'e2e-standard-user', name: 'E2E User' },
  });
  expect(createRes.status()).toBe(201);
  const { temporaryPassword } = await createRes.json();

  // Connexion avec le nouveau compte
  await page.goto('/login');
  await page.fill('input[autocomplete="username"]', 'e2e-standard-user');
  await page.fill('input[autocomplete="current-password"]', temporaryPassword);
  await page.click('button[type="submit"]');
  // Le compte a mustChangePassword = true → redirigé vers /change-password
  await page.waitForURL(/\/(change-password)$/);
  // Changer le mot de passe pour accéder à /links
  await page.fill('input[name="newPassword"]', 'NewSecure@2026');
  await page.fill('input[name="confirmPassword"]', 'NewSecure@2026');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/links$/);

  // Tenter d'accéder à /admin
  await page.goto('/admin');
  await expect(page).toHaveURL('/links');
});
```

**2. Nouveaux tests pour la création d'utilisateur**

```typescript
test('AC1 — Admin peut créer un utilisateur et voir le mot de passe temporaire', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  // Ouvrir le dialog
  await page.click('button:has-text("Nouvel utilisateur")');
  await expect(page.locator('mat-dialog-container')).toBeVisible();

  // Remplir le formulaire
  await page.fill('input[formControlName="username"]', 'e2e-new-user');
  await page.fill('input[formControlName="name"]', 'Test User');
  await page.click('button:has-text("Créer")');

  // Vérifier l'affichage du mot de passe
  await expect(page.locator('.temp-password-value')).toBeVisible();
  await expect(page.locator('button[aria-label="Copier le mot de passe"]')).toBeVisible();

  // Fermer et vérifier que l'utilisateur est dans la liste
  await page.click('button:has-text("Fermer")');
  await expect(page.locator('[data-testid="user-list"]')).toContainText('e2e-new-user');
});

test('AC3 — Création avec identifiant existant affiche une erreur inline', async ({ page }) => {
  await loginAdmin(page);
  await page.goto('/admin');

  await page.click('button:has-text("Nouvel utilisateur")');
  await page.fill('input[formControlName="username"]', adminUsername!); // username existant
  await page.click('button:has-text("Créer")');

  await expect(page.locator('mat-error')).toContainText('déjà utilisé');
});
```

**Note** : Les tests E2E qui créent des utilisateurs doivent nettoyer après eux-mêmes (ou utiliser des usernames uniques avec timestamp pour éviter les conflits entre les runs).

### Patterns obligatoires à respecter

- ❌ **NE JAMAIS** retourner le mot de passe en clair autre que dans la réponse `POST /api/users` initiale
- ❌ **NE PAS** stocker le mot de passe en clair en base — uniquement le hash bcrypt
- ❌ **NE PAS** ajouter `isActive` ou `role` dans le `CreateUserDto` — ces valeurs sont fixées par le backend (`isActive: true`, `role: 'user'`)
- ❌ **NE PAS** utiliser `console.log` — utiliser `Logger` NestJS
- ✅ Le `POST /api/users` hérite des guards `JwtAuthGuard + RolesGuard + @Roles('admin')` du contrôleur — ne pas dupliquer
- ✅ Le `@SkipThrottle()` s'applique déjà au contrôleur entier — pas besoin de l'ajouter sur la méthode `create()`
- ✅ `ValidationPipe` global gère la validation du DTO automatiquement
- ✅ `ConflictException` de `@nestjs/common` retourne automatiquement 409

### Arborescence des fichiers

**Nouveaux fichiers :**
```
backend/src/users/dto/
├── create-user.dto.ts               ← NOUVEAU
└── create-user-response.dto.ts      ← NOUVEAU

frontend/src/app/admin/
├── create-user-dialog.component.ts  ← NOUVEAU
├── create-user-dialog.component.html← NOUVEAU
└── create-user-dialog.component.scss← NOUVEAU
```

**Fichiers modifiés :**
```
backend/src/users/users.service.ts           ← MODIFIÉ (createUserWithTempPassword + update createUser)
backend/src/users/users.service.spec.ts      ← MODIFIÉ (tests createUserWithTempPassword)
backend/src/users/users.controller.ts        ← MODIFIÉ (POST /api/users)
backend/src/users/users.controller.spec.ts   ← MODIFIÉ (tests POST /api/users)

frontend/src/app/admin/admin.service.ts       ← MODIFIÉ (createUser() + interface)
frontend/src/app/admin/admin-panel.component.ts   ← MODIFIÉ (bouton + dialog)
frontend/src/app/admin/admin-panel.component.html ← MODIFIÉ (bouton Nouvel utilisateur)

e2e/tests/admin.spec.ts                      ← MODIFIÉ (activer fixme + nouveaux tests)
```

### Project Structure Notes

- Le composant dialog `CreateUserDialogComponent` va dans `frontend/src/app/admin/` (pas besoin d'un sous-dossier `components/` pour un composant lié directement à ce module)
- Le DTO `create-user.dto.ts` suit la convention existante dans `backend/src/users/dto/`
- `AdminService` reste `providedIn: 'root'` — le signal `users` est réinitialisé par `loadUsers()` à chaque ouverture du panneau
- Aucune migration TypeORM requise pour cette story (pas de nouveau champ en base)

### Références

- Epics : `_bmad-output/planning-artifacts/epics.md` — Epic 3, Story 3.2
- Architecture : `_bmad-output/planning-artifacts/architecture.md` — Patterns NestJS, Guards, Réponses API
- Story 3.1 (faite) : `_bmad-output/implementation-artifacts/3-1-panneau-admin-liste-des-comptes-utilisateurs.md` — patterns guards, DTO, signal AdminService
- `UserEntity` : `backend/src/users/user.entity.ts`
- `UsersService` : `backend/src/users/users.service.ts` — méthodes existantes
- `UsersController` : `backend/src/users/users.controller.ts` — pattern guards déjà en place
- `AdminService` : `frontend/src/app/admin/admin.service.ts` — pattern signals
- `AdminPanelComponent` : `frontend/src/app/admin/admin-panel.component.ts`
- `AuthService` : `backend/src/auth/auth.service.ts` — pattern bcrypt et crypto (à reproduire dans UsersService)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-12) — create-story workflow

### Debug Log References

_Aucune anomalie rencontrée._

### Completion Notes List

- **AC1** : `createUserWithTempPassword()` ajouté dans `UsersService` — génère 96 bits d'entropie via `crypto.randomBytes(12).toString('base64url')`, hash bcrypt cost 12, `mustChangePassword: true`, `role: 'user'`, `isActive: true`.
- **AC1/AC2** : Endpoint `POST /api/users` ajouté dans `UsersController` — hérite des guards `JwtAuthGuard + RolesGuard + @Roles('admin')` du contrôleur. Retourne 201 avec `{ user: UserListItemDto, temporaryPassword }`. Le hash n'est jamais exposé.
- **AC2** : `CreateUserDialogComponent` créé avec deux états (`form` → `password-reveal`) via signal Angular. Affiche le mot de passe une seule fois avec bouton "Copier" (`navigator.clipboard.writeText`). Appelle `loadUsers()` après création pour rafraîchir la liste.
- **AC3** : `ConflictException` levée si l'identifiant existe déjà → 409 retourné par NestJS. Le composant détecte `err.status === 409` et affiche l'erreur inline `conflictError`.
- **Tests backend** : 25 nouveaux tests (11 UsersService + 4 UsersController) — tous verts. Suite complète : 67 tests, 0 régression.
- **Tests E2E** : `test.fixme` activé (AC2 utilisateur standard → /links) + 2 nouveaux tests (AC1 création UI, AC3 conflit identifiant). Usernames uniques avec timestamp pour éviter les conflits entre runs.
- **Build Angular** : Compilation propre, aucun diagnostic TypeScript.

### File List

**Nouveaux fichiers :**
- `backend/src/users/dto/create-user.dto.ts`
- `backend/src/users/dto/create-user-response.dto.ts`
- `frontend/src/app/admin/create-user-dialog.component.ts`
- `frontend/src/app/admin/create-user-dialog.component.html`
- `frontend/src/app/admin/create-user-dialog.component.scss`

**Fichiers modifiés :**
- `backend/src/users/users.service.ts`
- `backend/src/users/users.service.spec.ts`
- `backend/src/users/users.controller.ts`
- `backend/src/users/users.controller.spec.ts`
- `frontend/src/app/admin/admin.service.ts`
- `frontend/src/app/admin/admin-panel.component.ts`
- `frontend/src/app/admin/admin-panel.component.html`
- `frontend/src/app/admin/admin-panel.component.scss`
- `e2e/tests/admin.spec.ts`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Review Findings

- [x] [Review][Decision] `disableClose` pendant password-reveal — basculé à `true` avant `state.set('password-reveal')` ✓
- [x] [Review][Decision] Validation `username` — `@Matches(/^[a-zA-Z0-9_-]+$/)` ajouté dans le DTO et `Validators.pattern` dans le formulaire ✓
- [x] [Review][Patch] `name` envoyée comme `""` au lieu de `undefined` quand le champ est vide [`frontend/src/app/admin/create-user-dialog.component.ts`] ✓
- [x] [Review][Patch] `copyPassword()` — Promise `writeText` non gérée, échec silencieux sans feedback [`frontend/src/app/admin/create-user-dialog.component.ts`] ✓
- [x] [Review][Patch] `loadUsers()` sans handler `error` dans le callback `next` [`frontend/src/app/admin/create-user-dialog.component.ts`] ✓
- [x] [Review][Patch] TOCTOU — race condition entre `findByUsername` et `save` : `QueryFailedError` unique constraint non convertie en 409 [`backend/src/users/users.service.ts`] ✓
- [x] [Review][Patch] Erreurs HTTP non-409 silencieusement ignorées dans le dialog [`frontend/src/app/admin/create-user-dialog.component.ts`] ✓
- [x] [Review][Patch] Test e2e AC3 flaky — pas de `waitForResponse` après le clic "Créer" [`e2e/tests/admin.spec.ts`] ✓
- [x] [Review][Patch] Test e2e AC2 — contexte `request` Playwright confirmé correct (cookies maintenus dans le même contexte) — dismissed
- [x] [Review][Defer] Case sensitivity des usernames — doublon en casse différente possible [`backend/src/users/users.service.ts`] — deferred, pre-existing
- [x] [Review][Defer] Test e2e AC1 — vérification "une seule fois" du mdp non couverte par les tests E2E — deferred, comportement garanti par le state machine

## Change Log

| Date | Changement |
|------|-----------|
| 2026-05-12 | Implémentation complète de la Story 3.2 — création d'utilisateur avec mot de passe temporaire (backend + frontend + E2E) |
