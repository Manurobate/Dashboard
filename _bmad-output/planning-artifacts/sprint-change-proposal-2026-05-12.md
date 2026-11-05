# Sprint Change Proposal — Username → Adresse Email obligatoire

**Date :** 2026-05-12
**Auteur :** Manu
**Statut :** Approuvé

---

## Section 1 — Résumé du problème

**Déclencheur :** Pendant l'implémentation de l'Epic 3 (Stories 3.1 et 3.2), Manu a identifié que le champ `username` devrait obligatoirement être une adresse email plutôt qu'un identifiant alphanumérique libre.

**Contexte :** Le champ `username` est actuellement validé par un pattern `[a-zA-Z0-9_-]+` (3–50 caractères). Le champ `name` (nom d'affichage) est optionnel et est 99% du temps identique au `username`, ce qui le rend redondant.

**Problèmes identifiés :**
1. L'unicité des identifiants est mieux garantie avec des emails (espace de noms plus large, pas d'ambiguïté)
2. Préparer l'infrastructure pour un futur mécanisme de réinitialisation de mot de passe par email (V2+) — le backend aura déjà l'information nécessaire
3. Le champ `name` devient réellement utile comme nom d'affichage distinct (ex. username = `manu@exemple.com`, name = `Manu`) uniquement si le username est un email — sinon les deux champs sont identiques

---

## Section 2 — Analyse d'impact

### Epic Impact

| Épic | Impact |
|------|--------|
| Epic 2 — Authentification (terminée) | Cosmétique : labels "Identifiant" → "Email" sur formulaire login |
| **Epic 3 — Administration (en cours)** | **Cœur du changement** — validators, formulaires, liste comptes |
| Epics 4–7 (backlog) | Aucun impact |

### Story Impact

- **Story 2.2** : Mise à jour cosmétique des labels et messages d'erreur sur le formulaire de connexion
- **Story 3.1** : En-tête de colonne "Identifiant" → "Email" dans le tableau des comptes
- **Story 3.2** : Changement de validation (`@IsEmail()` au lieu du pattern alphanumérique) + `name` devient obligatoire

### Artifact Conflicts

**Backend (6 points) :**
- `create-user.dto.ts` : remplacer validators username + rendre name obligatoire
- `login.dto.ts` : ajouter `@IsEmail()` sur username
- `user.entity.ts` : `name` passe de `nullable: true` à `nullable: false`
- Migration DB : UPDATE valeurs vides + ALTER COLUMN NOT NULL
- `admin-seed.service.ts` : fournir `name: username` lors du seed
- `users.service.ts` : `name?: string` → `name: string` dans les signatures

**Frontend (4 points) :**
- `create-user-dialog.component.ts` : validators email + name required
- `create-user-dialog.component.html` : labels, type="email", messages d'erreur
- `login.component.ts/.html` : Validators.email, labels, autocomplete="email", message d'erreur
- `admin-panel.component.html` : colonne "Email"
- `admin.service.ts` : annuler le changement `name: string | undefined` → `name: string`

**Pas de migration de schéma complexe** — `username` reste `VARCHAR(255)` UNIQUE, aucun changement de type. Seule `name` passe NOT NULL.

### Technical Impact

- **Prérequis déploiement** : `ADMIN_USERNAME` dans `.env` doit être mis à jour en adresse email avant le prochain déploiement (sinon login bloqué par validation `@IsEmail()` sur `login.dto.ts`)
- **Données existantes** : la migration UPDATE préserve les comptes existants (name = username pour les comptes sans nom d'affichage)

---

## Section 3 — Approche retenue : Direct Adjustment

**Option choisie :** Ajustement direct dans les stories en cours (Epic 3), sans rollback ni révision du MVP.

| Critère | Valeur |
|---------|--------|
| Effort | Faible — 6 fichiers backend + 4 fichiers frontend + wording docs |
| Risque | Faible — validation applicative uniquement, aucun changement d'architecture |
| Impact timeline | Minimal — dans le cadre de l'Epic 3 en cours |
| Impact MVP | Aucun — renforce la sécurité et la clarté du modèle |

---

## Section 4 — Propositions de changement détaillées

### 4.1 — Backend : `backend/src/users/dto/create-user.dto.ts`

**Avant :**
```typescript
@IsString()
@MinLength(3)
@MaxLength(50)
@Matches(/^[a-zA-Z0-9_-]+$/, { message: "..." })
username!: string;

@IsOptional()
@IsString()
@MaxLength(255)
name?: string;
```

**Après :**
```typescript
@IsEmail({}, { message: "Format d'adresse email invalide" })
username!: string;

@IsString()
@IsNotEmpty({ message: 'Le nom est obligatoire' })
@MaxLength(255)
name!: string;
```

*Rationale : email comme identifiant unique + nom d'affichage obligatoire pour distinguer des emails.*

---

### 4.2 — Backend : `backend/src/auth/dto/login.dto.ts`

**Avant :**
```typescript
@IsString()
@IsNotEmpty()
@MaxLength(100)
username!: string;
```

**Après :**
```typescript
@IsEmail()
@IsNotEmpty()
@MaxLength(254)
username!: string;
```

*Rationale : cohérence de validation + 254 chars = RFC 5321 max email length.*

---

### 4.3 — Backend : `backend/src/users/user.entity.ts`

**Avant :**
```typescript
@Column({ nullable: true, default: '' })
name!: string;
```

**Après :**
```typescript
@Column({ nullable: false })
name!: string;
```

---

### 4.4 — Backend : Migration DB

Nouvelle migration TypeORM (à générer avec `typeorm migration:generate`) :

```sql
-- up
UPDATE `User` SET name = username WHERE name IS NULL OR name = '';
ALTER TABLE `User` MODIFY COLUMN `name` varchar(255) NOT NULL;

-- down
ALTER TABLE `User` MODIFY COLUMN `name` varchar(255) NULL DEFAULT '';
```

---

### 4.5 — Backend : `backend/src/auth/admin-seed.service.ts`

**Avant :**
```typescript
await this.usersService.createUser({
  username,
  passwordHash,
  role: 'admin',
  mustChangePassword: true,
});
```

**Après :**
```typescript
await this.usersService.createUser({
  username,
  name: username,  // email as default display name until admin updates it
  passwordHash,
  role: 'admin',
  mustChangePassword: true,
});
```

---

### 4.6 — Backend : `backend/src/users/users.service.ts`

Mettre à jour les signatures pour rendre `name` obligatoire :

```typescript
// createUser
async createUser(data: {
  username: string;
  name: string;  // plus optionnel
  passwordHash: string;
  role: UserRole;
  mustChangePassword: boolean;
}): Promise<UserEntity>

// createUserWithTempPassword
async createUserWithTempPassword(
  username: string,
  name: string,  // plus optionnel
): Promise<{ user: UserEntity; temporaryPassword: string }>
```

---

### 4.7 — Frontend : `frontend/src/app/admin/create-user-dialog.component.ts`

**Avant :**
```typescript
username: ['', [
  Validators.required,
  Validators.minLength(3),
  Validators.maxLength(50),
  Validators.pattern(/^[a-zA-Z0-9_-]+$/),
]],
name: ['', [Validators.maxLength(255)]],
```

**Après :**
```typescript
username: ['', [Validators.required, Validators.email]],
name: ['', [Validators.required, Validators.maxLength(255)]],
```

---

### 4.8 — Frontend : `frontend/src/app/admin/create-user-dialog.component.html`

**Champ username — avant :**
```html
<mat-label>Identifiant</mat-label>
<input matInput formControlName="username" autocomplete="off" />
<!-- erreurs: required | minlength | pattern | conflict -->
```

**Champ username — après :**
```html
<mat-label>Adresse e-mail</mat-label>
<input matInput type="email" formControlName="username" autocomplete="email" />
<!-- erreurs: required ("L'adresse e-mail est obligatoire") -->
<!--         | email ("Format d'adresse e-mail invalide") -->
<!--         | conflict ("Cette adresse e-mail est déjà utilisée") -->
```

**Champ name — ajouter l'erreur required :**
```html
@if (form.controls.name.hasError('required') && form.controls.name.touched) {
  <mat-error>Le nom est obligatoire</mat-error>
}
```

---

### 4.9 — Frontend : `frontend/src/app/admin/admin.service.ts`

**Annuler la modification non commitée :**

```typescript
// AVANT (diff actuelle — à annuler)
createUser(username: string, name: string | undefined): Observable<CreateUserResponse>

// APRÈS (revenir à required)
createUser(username: string, name: string): Observable<CreateUserResponse>
```

Et dans `submit()` du dialog :
```typescript
// AVANT
this.adminService.createUser(username!, name || undefined)

// APRÈS
this.adminService.createUser(username!, name!)
```

---

### 4.10 — Frontend : `frontend/src/app/auth/login/login.component.ts`

**Avant :**
```typescript
username: ['', Validators.required],
```
```typescript
this.errorMessage.set('Identifiant ou mot de passe incorrect');
```

**Après :**
```typescript
username: ['', [Validators.required, Validators.email]],
```
```typescript
this.errorMessage.set('Email ou mot de passe incorrect');
```

---

### 4.11 — Frontend : `frontend/src/app/auth/login/login.component.html`

**Avant :**
```html
<mat-label>Identifiant</mat-label>
<input matInput formControlName="username" autocomplete="username" />
```

**Après :**
```html
<mat-label>Adresse e-mail</mat-label>
<input matInput type="email" formControlName="username" autocomplete="email" />
```

---

### 4.12 — Frontend : `frontend/src/app/admin/admin-panel.component.html`

**Avant :**
```html
<th mat-header-cell *matHeaderCellDef>Identifiant</th>
```

**Après :**
```html
<th mat-header-cell *matHeaderCellDef>Email</th>
```

---

### 4.13 — `epics.md` : mises à jour wording

**FR1 :**
```
AVANT : "Un utilisateur non authentifié peut se connecter avec un identifiant et un mot de passe"
APRÈS : "Un utilisateur non authentifié peut se connecter avec son adresse email et un mot de passe"
```

**FR8 :**
```
AVANT : "L'administrateur peut créer un compte utilisateur (identifiant + nom)"
APRÈS : "L'administrateur peut créer un compte utilisateur (adresse email + nom d'affichage)"
```

**Story 2.2 AC** — remplacer "identifiant" par "email" dans les critères de connexion et message d'erreur.

**Story 3.1 AC** — colonne "identifiant" → "email".

**Story 3.2 AC** — "identifiant" → "adresse email", mettre à jour les validators décrits, 409 "Cette adresse email est déjà utilisée".

---

### 4.14 — `prd.md` : mises à jour wording

Mêmes corrections sur FR1 et FR8 dans la section Exigences Fonctionnelles.

---

## Section 5 — Classification et handoff

**Scope : Minor** — implémentation directe par l'agent dev.

### Responsabilités

| Rôle | Action |
|------|--------|
| **Agent dev** | Implémenter les 14 changements ci-dessus dans l'ordre : backend en premier (migration incluse), puis frontend, puis docs |
| **Manu** | Mettre à jour `ADMIN_USERNAME` en adresse email dans `.env` avant le prochain déploiement |

### Critères de succès

- [ ] `create-user.dto.ts` : `@IsEmail()` sur username, `@IsNotEmpty()` sur name
- [ ] `login.dto.ts` : `@IsEmail()` sur username
- [ ] Migration générée et appliquée : name NOT NULL
- [ ] Seed admin : `name: username` fourni
- [ ] Dialog création : labels email, validators email + name required, messages d'erreur corrects
- [ ] Login form : label "Adresse e-mail", type="email", Validators.email
- [ ] Panel admin : colonne "Email"
- [ ] `admin.service.ts` : diff non commitée annulée, name: string (required)
- [ ] Tests E2E : données de test mises à jour avec des emails valides
- [ ] `epics.md` et `prd.md` : wording FR1, FR8, Stories 2.2, 3.1, 3.2 mis à jour

### Note déploiement (important)

> **Avant de déployer :** mettre à jour `ADMIN_USERNAME` en adresse email dans `.env` (ex. `admin@mondomaine.local`). Sans cette mise à jour, le login sera bloqué par la validation `@IsEmail()` sur `login.dto.ts`.
