---
title: 'Username → adresse email obligatoire + name requis'
type: 'refactor'
created: '2026-05-12'
status: 'done'
baseline_commit: '351df36d9a1cb660a8e0813e7ca3cfb0e9a4c382'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le champ `username` accepte tout identifiant alphanumérique (`[a-zA-Z0-9_-]+`), ce qui bloque le futur reset par email et rend `name` redondant (les deux champs sont 99% du temps identiques). `name` est optionnel alors qu'il devrait fournir un nom d'affichage distinct.

**Approach:** Enforcer `@IsEmail()` sur `username` dans les DTOs backend et les validators frontend. Rendre `name` obligatoire (DTO, entity, service, seed). Générer une migration qui préserve les données existantes. Adapter tous les libellés UI ("Identifiant" → "Adresse e-mail").

## Boundaries & Constraints

**Always:**
- `@IsEmail()` sur `username` dans `create-user.dto.ts` ET `login.dto.ts`
- `name` NOT NULL dans l'entity et la migration — migration UPDATE préalable pour les lignes vides
- Seed admin : utiliser `username` comme valeur de `name` (aucune nouvelle variable d'env)
- Le champ DB `username` reste `VARCHAR(255) UNIQUE` — aucun changement de type
- `admin.service.ts` : `name: string` (requis) — annuler la modification non commitée

**Ask First:** aucune décision ouverte — toutes validées dans le sprint-change-proposal-2026-05-12.

**Never:**
- Modifier la logique de reset de mot de passe (post-MVP)
- Ajouter un nouveau champ d'affichage en lieu et place de `name`
- Utiliser `synchronize: true` TypeORM
- Toucher les stories ou epics.md/prd.md (déjà mis à jour par correct-course)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Création valide | `username: "manu@ex.com"`, `name: "Manu"` | 201, compte créé, tempPassword affiché | — |
| Username non-email | `username: "manu123"` | 400 Bad Request | Message inline "Format d'adresse e-mail invalide" |
| Name manquant | `username: "manu@ex.com"`, `name: ""` | 400 Bad Request | Message inline "Le nom est obligatoire" |
| Email dupliqué | `username` existant | 409 Conflict | Message inline "Cette adresse email est déjà utilisée" |
| Login email valide | `username: "manu@ex.com"` | Passe la validation DTO, auth normale | — |
| Login format invalide | `username: "manu123"` | 400 Bad Request (avant vérif mdp) | — |

</frozen-after-approval>

## Code Map

- `backend/src/users/dto/create-user.dto.ts` -- DTO création utilisateur, validators à remplacer
- `backend/src/auth/dto/login.dto.ts` -- DTO login, ajouter @IsEmail
- `backend/src/users/user.entity.ts` -- entity TypeORM, name nullable → NOT NULL
- `backend/src/migrations/` -- nouvelle migration MakeUserNameNotNull
- `backend/src/auth/admin-seed.service.ts` -- seed admin, fournir name: username
- `backend/src/users/users.service.ts` -- signatures name?: string → name: string, message 409
- `frontend/src/app/admin/create-user-dialog.component.ts` -- validators dialog
- `frontend/src/app/admin/create-user-dialog.component.html` -- labels, type=email, erreurs
- `frontend/src/app/admin/admin.service.ts` -- name: string (requis), diff non commitée à annuler
- `frontend/src/app/auth/login/login.component.ts` -- Validators.email, message erreur
- `frontend/src/app/auth/login/login.component.html` -- label, type=email, autocomplete
- `frontend/src/app/admin/admin-panel.component.html` -- colonne "Email"
- `e2e/` -- données de test avec emails valides

## Tasks & Acceptance

**Execution:**

- [x] `backend/src/users/dto/create-user.dto.ts` -- remplacer `@IsString @MinLength(3) @MaxLength(50) @Matches(...)` par `@IsEmail({}, { message: "Format d'adresse email invalide" })` sur `username` ; sur `name` : supprimer `@IsOptional`, ajouter `@IsNotEmpty({ message: 'Le nom est obligatoire' })`, garder `@MaxLength(255)` ; mettre à jour imports et `@ApiProperty` (name devient required) -- enforcer email + name obligatoire côté API
- [x] `backend/src/auth/dto/login.dto.ts` -- ajouter `@IsEmail()` sur `username`, changer `@MaxLength(100)` en `@MaxLength(254)` ; mettre à jour imports -- cohérence validation login
- [x] `backend/src/users/user.entity.ts` -- `@Column({ nullable: true, default: '' })` → `@Column({ nullable: false })` sur `name` -- aligner entity avec la contrainte DB
- [x] `backend/src/migrations/<timestamp>-MakeUserNameNotNull.ts` -- créer migration manuelle avec `Date.now()` comme timestamp ; `up()` : `UPDATE \`User\` SET name = username WHERE name IS NULL OR name = ''` puis `ALTER TABLE \`User\` MODIFY COLUMN \`name\` varchar(255) NOT NULL` ; `down()` : `ALTER TABLE \`User\` MODIFY COLUMN \`name\` varchar(255) NULL DEFAULT ''` -- rendre name NOT NULL en préservant les données
- [x] `backend/src/auth/admin-seed.service.ts` -- ajouter `name: username` dans l'appel à `usersService.createUser(...)` -- seed conforme à name NOT NULL
- [x] `backend/src/users/users.service.ts` -- `name?: string` → `name: string` dans `createUser` et `createUserWithTempPassword` ; message ConflictException : "Cette adresse email est déjà utilisée" -- signatures typées correctement
- [x] `frontend/src/app/admin/create-user-dialog.component.ts` -- username : `[Validators.required, Validators.email]` ; name : `[Validators.required, Validators.maxLength(255)]` -- validation frontend cohérente avec DTO
- [x] `frontend/src/app/admin/create-user-dialog.component.html` -- champ username : label "Adresse e-mail", `type="email"`, `autocomplete="email"` ; erreurs : required → "L'adresse e-mail est obligatoire", ajouter `email` → "Format d'adresse e-mail invalide", conflict → "Cette adresse e-mail est déjà utilisée" (supprimer `minlength` et `pattern`) ; champ name : ajouter erreur required → "Le nom est obligatoire" -- UX cohérente avec la nouvelle contrainte
- [x] `frontend/src/app/admin/admin.service.ts` -- `name: string | undefined` → `name: string` (annuler modification non commitée) ; dans `submit()` du dialog : `name || undefined` → `name!` -- signature conforme au DTO
- [x] `frontend/src/app/auth/login/login.component.ts` -- `username: ['', Validators.required]` → `['', [Validators.required, Validators.email]]` ; message d'erreur "Identifiant ou mot de passe incorrect" → "Email ou mot de passe incorrect" -- feedback utilisateur adapté
- [x] `frontend/src/app/auth/login/login.component.html` -- label "Identifiant" → "Adresse e-mail", ajouter `type="email"`, `autocomplete="username"` → `autocomplete="email"` -- formulaire adapté
- [x] `frontend/src/app/admin/admin-panel.component.html` -- en-tête colonne `Identifiant` → `Email` -- libellé cohérent avec le nouveau modèle
- [x] `e2e/` -- scanner les fichiers de test et remplacer tout username non-email par un email valide (ex. `admin@test.local`, `user@test.local`) -- tests E2E conformes à la validation

**Acceptance Criteria:**

- Given un admin tente de créer un compte avec `username: "manu"` (non-email), when le formulaire est soumis, then 400 côté API ET erreur inline "Format d'adresse e-mail invalide" côté frontend
- Given un admin crée un compte avec `username: "manu@ex.com"` et `name: "Manu"`, when le formulaire est validé, then le compte est créé et le mot de passe temporaire est affiché
- Given un utilisateur tente de se connecter avec `username: "manu123"` (non-email), when la requête POST /api/auth/login est envoyée, then le backend retourne 400
- Given le backend démarre à froid sans admin en base, when le seed s'exécute, then un compte admin est créé avec `name = ADMIN_USERNAME` (colonne NOT NULL respectée)
- Given la migration `up()` est exécutée, when on inspecte la table `User`, then la colonne `name` est NOT NULL et aucune ligne n'a de valeur nulle

## Spec Change Log

## Design Notes

**Ordre d'exécution critique :** la migration doit être exécutée AVANT le déploiement du nouveau code (sinon `users.service.ts` avec `name: string` obligatoire crasherait sur INSERT si la colonne est encore nullable avec des lignes à `''`). En pratique dans ce projet : `docker-compose up --build` relance les migrations puis le backend — l'ordre est garanti.

**Timestamp migration :** utiliser `Date.now()` au moment de l'écriture du fichier pour garantir l'ordre de tri correct dans TypeORM.

## Verification

**Commands:**
- `cd backend && npm run build` -- expected: compilation TypeScript sans erreur
- `cd frontend && ng build --configuration=production` -- expected: build Angular sans erreur
- `cd backend && npm run lint` -- expected: aucune erreur ESLint

## Suggested Review Order

**Contrat API — validation email**

- Ancre du changement : `@IsEmail` remplace les validators alphanumériques, `@MaxLength(254)` RFC 5321
  [`create-user.dto.ts:9`](../../backend/src/users/dto/create-user.dto.ts#L9)

- Login DTO aligné : même contrainte email + MaxLength 100 → 254
  [`login.dto.ts:12`](../../backend/src/auth/dto/login.dto.ts#L12)

**Schéma DB — `name` NOT NULL**

- Entity alignée : `nullable: true, default: ''` → `nullable: false`
  [`user.entity.ts:21`](../../backend/src/users/user.entity.ts#L21)

- Migration en deux temps : UPDATE de backfill, puis ALTER COLUMN
  [`MakeUserNameNotNull.ts:6`](../../backend/src/migrations/1778591981018-MakeUserNameNotNull.ts#L6)

**Service — normalisation et signatures**

- `findByUsername` et `createUser` normalisent en minuscules avant stockage/lookup
  [`users.service.ts:20`](../../backend/src/users/users.service.ts#L20)

- `createUserWithTempPassword` : `name` maintenant requis, message conflict mis à jour
  [`users.service.ts:69`](../../backend/src/users/users.service.ts#L69)

- Seed admin : `name: username` fourni pour respecter la contrainte NOT NULL
  [`admin-seed.service.ts:31`](../../backend/src/auth/admin-seed.service.ts#L31)

**Frontend — formulaire création**

- Validators `email` + `required` sur les deux champs du dialog
  [`create-user-dialog.component.ts:35`](../../frontend/src/app/admin/create-user-dialog.component.ts#L35)

- Labels, `type="email"`, `autocomplete="email"`, messages d'erreur inline
  [`create-user-dialog.component.html:9`](../../frontend/src/app/admin/create-user-dialog.component.html#L9)

**Frontend — formulaire login**

- `Validators.email` ajouté, message d'erreur mis à jour
  [`login.component.ts:32`](../../frontend/src/app/auth/login/login.component.ts#L32)

- Input `type="email"`, label "Adresse e-mail", `autocomplete="email"`
  [`login.component.html:9`](../../frontend/src/app/auth/login/login.component.html#L9)

**UI — libellé colonne admin**

- En-tête "Identifiant" → "Email"
  [`admin-panel.component.html:28`](../../frontend/src/app/admin/admin-panel.component.html#L28)

**Tests**

- ConflictException message et fixtures email mis à jour
  [`users.service.spec.ts:247`](../../backend/src/users/users.service.spec.ts#L247)
