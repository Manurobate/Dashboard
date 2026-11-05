# Story 2.6 : Changement de mot de passe par l'utilisateur

Status: done

## Story

En tant qu'utilisateur authentifié,
Je veux pouvoir changer mon mot de passe depuis le menu utilisateur,
Afin de maintenir la sécurité de mon accès.

## Critères d'Acceptation

1. **Étant donné** que j'accède au formulaire de changement de mot de passe (lien "Changer le mot de passe" dans le menu utilisateur de la top bar),
   **Quand** je saisis mon mot de passe actuel (correct) et un nouveau mot de passe valide (confirmation identique, ≥ 8 caractères),
   **Alors** le backend vérifie le mot de passe actuel, met à jour le hash bcrypt, et retourne 200 — un snackbar "Mot de passe mis à jour" s'affiche

2. **Étant donné** que je saisis un mot de passe actuel incorrect,
   **Quand** je soumets le formulaire,
   **Alors** le backend retourne 401 et un message d'erreur s'affiche **inline sous le champ `currentPassword`** (pas une erreur globale de formulaire)

3. **Étant donné** que les champs nouveau mot de passe et confirmation ne correspondent pas,
   **Quand** je soumets le formulaire,
   **Alors** l'erreur est détectée **côté client** par le validateur cross-champ `passwordMatchValidator` — le formulaire n'est pas soumis

## Tâches / Sous-tâches

### Backend

- [x] **T1 — Ajouter `updatePasswordHash()` dans `UsersService`**
  - [x] Ajouter `async updatePasswordHash(userId: number, passwordHash: string): Promise<UserEntity>` dans `backend/src/users/users.service.ts`
  - [x] Utiliser `this.userRepository.update({ id: userId }, { passwordHash })` — **NE PAS toucher `mustChangePassword`** (contrairement à `updatePasswordAndClearFlag`)
  - [x] Puis `findById(userId)` avec `NotFoundException` si introuvable
  - [x] Retourner l'entité complète (l'épuration `passwordHash`/`refreshTokens` se fait dans `AuthService`)

- [x] **T2 — Créer `UpdatePasswordDto`**
  - [x] Créer `backend/src/auth/dto/update-password.dto.ts`
  - [x] Trois champs : `currentPassword: string` (`@IsString()`, `@IsNotEmpty()`, `@MaxLength(128)`), `newPassword: string` (`@IsString()`, `@IsNotEmpty()`, `@MinLength(8)`, `@MaxLength(128)`), `confirmPassword: string` (identique à `newPassword`)
  - [x] **Ne pas ajouter `@MinLength(8)` sur `currentPassword`** — il s'agit de vérifier le mot de passe existant, une longueur minimale invaliderait des anciens mots de passe légitimes
  - [x] Ajouter `@ApiProperty()` sur les trois champs

- [x] **T3 — Ajouter `updatePassword()` dans `AuthService` backend**
  - [x] Ajouter `async updatePassword(userId: number, currentPassword: string, newPassword: string, confirmPassword: string): Promise<Omit<UserEntity, 'passwordHash' | 'refreshTokens'>>` dans `backend/src/auth/auth.service.ts`
  - [x] Récupérer l'utilisateur via `this.usersService.findById(userId)` — si null : `throw new UnauthorizedException()`
  - [x] Vérifier le mot de passe actuel : `const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)` — si false : `throw new UnauthorizedException('Mot de passe actuel incorrect')`
  - [x] Vérifier la correspondance : si `newPassword !== confirmPassword` → `throw new BadRequestException('Les mots de passe ne correspondent pas')`
  - [x] Hasher : `const passwordHash = await bcrypt.hash(newPassword, 12)` (cost 12 imposé, NFR1)
  - [x] Appeler `this.usersService.updatePasswordHash(userId, passwordHash)` (pas `updatePasswordAndClearFlag`)
  - [x] Épurer et retourner : `const { passwordHash: _, refreshTokens: __, ...safeUser } = updatedUser`
  - [x] Importer `UnauthorizedException` depuis `@nestjs/common` (déjà présent dans le fichier — vérifier l'import existant)

- [x] **T4 — Ajouter endpoint `PATCH /api/auth/update-password`** dans `AuthController`
  - [x] Ajouter dans `backend/src/auth/auth.controller.ts` : endpoint `@Patch('update-password')` avec `@UseGuards(JwtAuthGuard)`, `@SkipThrottle()`, `@HttpCode(HttpStatus.OK)`
  - [x] Importer `UpdatePasswordDto`
  - [x] **NE PAS réutiliser l'endpoint `change-password` existant** — il a une sémantique différente (pas de vérification du mot de passe actuel) et est utilisé par le flux forcé de story 2.5
  - [x] `@ApiOperation({ summary: 'Changement volontaire de mot de passe' })`

- [x] **T5 — Tests unitaires backend**
  - [x] `users.service.spec.ts` — 2 cas pour `updatePasswordHash()` :
    - succès : UPDATE en DB, retourne l'entité à jour
    - userId introuvable → lève `NotFoundException`
  - [x] `auth.service.spec.ts` — 4 cas pour `updatePassword()` :
    - mot de passe actuel correct + passwords match → hash bcrypt cost 12, `mustChangePassword` inchangé, retourne `safeUser`
    - mot de passe actuel incorrect → lève `UnauthorizedException`
    - passwords ne correspondent pas → lève `BadRequestException` avec message attendu
    - userId introuvable (findById null) → lève `UnauthorizedException`
  - [x] `auth.controller.spec.ts` — 3 cas pour `PATCH /auth/update-password` :
    - succès → 200 avec safeUser
    - mot de passe actuel incorrect → 401 (délégué au service, testé via spy)
    - passwords mismatch → 400 (délégué au service, testé via spy)

- [x] **T6 — Validation backend**
  - [x] `npm run build` → 0 erreur TypeScript
  - [x] `npm test` → tous les tests verts, aucune régression

### Frontend

- [x] **T7 — Ajouter `updatePassword()` dans `AuthService` Angular**
  - [x] Ajouter dans `frontend/src/app/core/services/auth.service.ts` :
    ```typescript
    updatePassword(currentPassword: string, newPassword: string, confirmPassword: string): Observable<AuthUser> {
      return this.http.patch<AuthUser>('/api/auth/update-password', { currentPassword, newPassword, confirmPassword }).pipe(
        tap(user => this.currentUser.set(user)),
      );
    }
    ```
  - [x] **NE PAS modifier `changePassword()`** — cette méthode existante est utilisée par `ChangePasswordComponent` (story 2.5, flux forcé)
  - [x] **NE PAS ajouter `catchError`** — les erreurs remontent au composant

- [x] **T8 — Créer `UserChangePasswordComponent`**
  - [x] Créer les fichiers : `frontend/src/app/account/change-password/change-password.component.ts`, `.html`, `.scss`
  - [x] Composant standalone, `ChangeDetectionStrategy.OnPush`
  - [x] Formulaire réactif avec `FormGroup` à 3 champs : `currentPassword`, `newPassword`, `confirmPassword`
  - [x] Validateurs : `currentPassword` → `Validators.required` uniquement (pas de minLength); `newPassword` → `Validators.required, Validators.minLength(8)`; `confirmPassword` → `Validators.required, Validators.minLength(8)` + validateur cross-champ `passwordMatchValidator` sur le groupe
  - [x] Réutiliser le `passwordMatchValidator` de `change-password.component.ts` (story 2.5) — le copier, pas importer depuis ce fichier
  - [x] Signals : `isLoading = signal(false)`, `currentPasswordError = signal<string | null>(null)`
  - [x] Handler `onSubmit()` implémenté selon spec (next: snackbar + reset, error 401: erreur inline, autre: erreur générique)
  - [x] Injecter `MatSnackBar` et l'utiliser pour le feedback succès
  - [x] Imports Material : `MatCardModule`, `MatFormFieldModule`, `MatInputModule`, `MatButtonModule`, `MatProgressSpinnerModule`, `MatSnackBarModule`
  - [x] Le composant se trouve dans `app/account/` (nouveau dossier)

- [x] **T9 — Mettre à jour `app.routes.ts`**
  - [x] Ajouter la route `/account/change-password` avec `canActivate: [authGuard, mustChangePasswordGuard]`
  - [x] Lazy loading : `loadComponent: () => import('./account/change-password/change-password.component').then(m => m.ChangePasswordComponent)`
  - [x] **NE PAS dupliquer le guard** — réutiliser les guards existants `authGuard` et `mustChangePasswordGuard`

- [x] **T10 — Mettre à jour `top-bar.component.html`**
  - [x] Ajouter un item de menu avant "Déconnexion" dans `<mat-menu #userMenu>` :
    ```html
    <a mat-menu-item routerLink="/account/change-password">
      <mat-icon>lock</mat-icon>
      <span>Changer le mot de passe</span>
    </a>
    ```
  - [x] `RouterLink` est déjà importé dans `TopBarComponent` — pas de modification TS nécessaire

- [x] **T11 — Validation frontend**
  - [x] `ng build` → 0 erreur TypeScript
  - [x] Tests existants inchangés (0 régression)

## Dev Notes

### Flux de données complet

```
1. Utilisateur clique "Changer le mot de passe" dans le menu utilisateur top-bar
   → Navigation vers /account/change-password
   → authGuard + mustChangePasswordGuard (passes car l'utilisateur est authentifié et mustChangePassword = false)

2. Sur /account/change-password, soumission du formulaire
   → authService.updatePassword(currentPwd, newPwd, confirmPwd)
   → PATCH /api/auth/update-password [JwtAuthGuard]
   → AuthService.updatePassword(userId, currentPwd, newPwd, confirmPwd)
     → usersService.findById(userId) → UserEntity
     → bcrypt.compare(currentPwd, user.passwordHash) → vrai/faux
       → Si faux : throw UnauthorizedException
     → newPwd !== confirmPwd → throw BadRequestException
     → bcrypt.hash(newPwd, 12) → hash
     → usersService.updatePasswordHash(userId, hash) [NE PAS clearFlag]
     → retourne safeUser (mustChangePassword inchangé)
   → tap: currentUser.set(safeUser)
   → next: isLoading.set(false), form.reset(), snackBar.open('Mot de passe mis à jour', ...)
```

### Distinction critique entre story 2.5 et story 2.6

| Aspect | Story 2.5 (`change-password`) | Story 2.6 (`update-password`) |
|--------|-------------------------------|-------------------------------|
| Endpoint | `PATCH /api/auth/change-password` | `PATCH /api/auth/update-password` |
| DTO | `ChangePasswordDto` (2 champs) | `UpdatePasswordDto` (3 champs) |
| Vérifie mot de passe actuel | ❌ Non | ✅ Oui (`bcrypt.compare`) |
| Service backend | `AuthService.changePassword()` | `AuthService.updatePassword()` |
| UsersService method | `updatePasswordAndClearFlag()` → flag `mustChangePassword = false` | `updatePasswordHash()` → flag inchangé |
| Erreur mot de passe actuel | N/A | 401 `UnauthorizedException` |
| Angular service method | `authService.changePassword()` | `authService.updatePassword()` |
| Route frontend | `/change-password` | `/account/change-password` |
| Composant | `app/auth/change-password/` | `app/account/change-password/` |
| Post-succès | Redirige vers `/links` | Reste sur la page, snackbar + reset formulaire |
| Sur 401 | Redirige vers `/login` | Affiche erreur inline sous `currentPassword` |

### Gestion du 401 dans le composant

**Story 2.5** naviguait vers `/login` sur 401 — logique, car un 401 sur le flux forcé signifie que la session a expiré.

**Story 2.6** NE doit PAS naviguer vers `/login` sur 401 — un 401 ici signifie "mot de passe actuel incorrect" (l'utilisateur est bien authentifié, le JWT est valide). L'intercepteur `auth-error.interceptor.ts` gèrera les vraies expirations de session de manière transparente avant que la 401 n'atteigne le composant.

### `UsersService.updatePasswordHash` vs `updatePasswordAndClearFlag`

Créer `updatePasswordHash` séparément est **obligatoire** pour la correctness sémantique :
- `updatePasswordAndClearFlag` : `{ passwordHash, mustChangePassword: false }` — convient uniquement au flux forcé story 2.5
- `updatePasswordHash` : `{ passwordHash }` uniquement — ne touche pas `mustChangePassword`

En pratique, pour un utilisateur standard (mustChangePassword déjà false), les deux donneraient le même résultat. Mais le jour où un admin réinitialise le mot de passe d'un utilisateur (`mustChangePassword = true`) et que l'utilisateur change immédiatement son mot de passe via le menu (scénario théorique), `updatePasswordAndClearFlag` fonctionnerait correctement... mais la sémantique serait incorrecte car ce n'est pas le flux 2.5. Garder les deux méthodes distinctes évite tout couplage accidentel.

### Arborescence des Fichiers

**Nouveaux fichiers :**
```
backend/src/auth/dto/
└── update-password.dto.ts                                ← NOUVEAU

frontend/src/app/account/change-password/
├── change-password.component.ts                          ← NOUVEAU
├── change-password.component.html                        ← NOUVEAU
└── change-password.component.scss                        ← NOUVEAU
```

**Fichiers modifiés :**
```
backend/src/users/
└── users.service.ts                                      ← MODIFIÉ (ajout updatePasswordHash)
└── users.service.spec.ts                                 ← MODIFIÉ (2 nouveaux cas)

backend/src/auth/
├── auth.service.ts                                       ← MODIFIÉ (ajout updatePassword)
├── auth.service.spec.ts                                  ← MODIFIÉ (4 nouveaux cas)
├── auth.controller.ts                                    ← MODIFIÉ (endpoint PATCH update-password)
└── auth.controller.spec.ts                               ← MODIFIÉ (3 nouveaux cas)

frontend/src/app/core/services/
└── auth.service.ts                                       ← MODIFIÉ (ajout updatePassword())

frontend/src/app/core/components/top-bar/
└── top-bar.component.html                                ← MODIFIÉ (ajout item menu)

frontend/src/app/
└── app.routes.ts                                         ← MODIFIÉ (nouvelle route /account/change-password)
```

### Patterns existants à réutiliser

| Élément | Fichier source | Usage dans cette story |
|---------|---------------|------------------------|
| `bcrypt.compare()` | `auth.service.ts` (`validateUser`) | Vérification du mot de passe actuel dans `updatePassword()` |
| `bcrypt.hash(pwd, 12)` | `auth.service.ts` (`changePassword`) | Hachage du nouveau mot de passe — cost 12 imposé (NFR1) |
| `@SkipThrottle()` | `auth.controller.ts` (`change-password`) | Endpoint `update-password` |
| `@CurrentUser()` | `auth.controller.ts` | Récupérer `userId` dans le controller |
| `@UseGuards(JwtAuthGuard)` | `auth.controller.ts` | Protéger le nouveau endpoint |
| `{ passwordHash: _, refreshTokens: __, ...safeUser }` | `auth.service.ts` | Épurer la réponse |
| `passwordMatchValidator` | `auth/change-password/change-password.component.ts` (story 2.5) | Copié dans le nouveau composant |
| `ChangeDetectionStrategy.OnPush` + `signal<boolean>(false)` | Tous les composants du projet | Pattern standard |
| `MatSnackBar.open(..., undefined, { duration: 3000 })` | Pattern UX-DR17 | Feedback succès |
| `canActivate: [authGuard, mustChangePasswordGuard]` | `app.routes.ts` | Guards sur la nouvelle route |

### Anti-patterns à Éviter

- ❌ NE PAS réutiliser l'endpoint `PATCH /api/auth/change-password` — il a une sémantique différente (pas de vérification du mot de passe actuel)
- ❌ NE PAS utiliser `updatePasswordAndClearFlag` dans ce flux — utiliser `updatePasswordHash`
- ❌ NE PAS naviguer vers `/login` sur 401 dans le composant — afficher l'erreur inline
- ❌ NE PAS mettre `@MinLength(8)` sur `currentPassword` dans `UpdatePasswordDto` — invaliderait des mots de passe courts déjà existants
- ❌ NE PAS modifier `AuthService.changePassword()` Angular — utilisé par `ChangePasswordComponent` (story 2.5)
- ❌ NE PAS ajouter `mustChangePasswordGuard` sur `/account/change-password` sans l'avoir vu dans `app.routes.ts` — il FAUT l'ajouter pour bloquer les utilisateurs avec `mustChangePassword = true` (ils ont leur propre flow en `/change-password`)
- ❌ NE PAS hardcoder bcrypt cost < 12 — exigence NFR1
- ❌ NE PAS créer de NgModule — composants standalone uniquement
- ❌ NE PAS naviguer depuis `AuthService` Angular — la navigation est dans le composant

### Contraintes de sécurité

- `bcrypt.compare()` est résistant aux timing attacks — ne pas utiliser `===` pour comparer les mots de passe
- La réponse 401 pour mot de passe actuel incorrect ne doit pas révéler si le compte est désactivé ou si l'userId est invalide (message générique "Mot de passe actuel incorrect")
- `@MaxLength(128)` sur `currentPassword` est crucial même sans `@MinLength` — prévient le vecteur DoS via bcrypt (truncation à 72 octets mais désérialisation mémoire préalable)
- cost 12 imposé (NFR1) — jamais variable, jamais inférieur

### Références

- Épics : `_bmad-output/planning-artifacts/epics.md` — Épic 2, Story 2.6
- Story précédente (2.5) : `_bmad-output/implementation-artifacts/2-5-changement-de-mot-de-passe-temporaire-force.md` — patterns `AuthService`, guards, composant
- Architecture : `_bmad-output/planning-artifacts/architecture.md` — "Authentification & Sécurité" (bcrypt cost 12, httpOnly cookie)
- `auth.service.ts` backend : `backend/src/auth/auth.service.ts` — méthodes `changePassword`, `validateUser`, épuration `safeUser`
- `users.service.ts` : `backend/src/users/users.service.ts` — méthodes `updatePasswordAndClearFlag`, `findById`
- `auth.controller.ts` : `backend/src/auth/auth.controller.ts` — pattern `@Patch`, `@CurrentUser()`, `@SkipThrottle()`
- `change-password.dto.ts` : `backend/src/auth/dto/change-password.dto.ts` — modèle pour `UpdatePasswordDto`
- `auth.service.ts` Angular : `frontend/src/app/core/services/auth.service.ts` — méthode `changePassword()` à reproduire
- `top-bar.component.html` : `frontend/src/app/core/components/top-bar/top-bar.component.html` — structure `MatMenu` existante
- `app.routes.ts` : `frontend/src/app/app.routes.ts` — pattern routes protégées existant

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Ajout de `MatCardModule` manquant dans les imports du composant (build erreur NG8001 sur `mat-card-content`)
- Fix `auth-error.interceptor.ts` : le 401 de `/api/auth/update-password` était intercepté, déclenchait un refresh + retry, puis `router.navigate(['/login'])` + `LoginComponent` redirige vers `/links` si déjà authentifié. Correction : exclure `/api/auth/update-password` de la logique de retry, identique à `/api/auth/login`.

### Completion Notes List

- T1 : `UsersService.updatePasswordHash()` ajouté — update uniquement `passwordHash`, ne touche pas `mustChangePassword`
- T2 : `UpdatePasswordDto` créé avec 3 champs — `currentPassword` sans `@MinLength`, `newPassword`/`confirmPassword` avec `@MinLength(8)` et `@MaxLength(128)`
- T3 : `AuthService.updatePassword()` ajouté — vérifie mot de passe actuel via `bcrypt.compare`, hash cost 12, appelle `updatePasswordHash`
- T4 : Endpoint `PATCH /auth/update-password` ajouté — `@UseGuards(JwtAuthGuard)`, `@SkipThrottle()`, `@HttpCode(200)`
- T5 : 9 nouveaux tests (2 UsersService + 4 AuthService + 3 AuthController) — 44/44 tests verts
- T6 : Build backend 0 erreur, tous les tests verts
- T7 : `AuthService.updatePassword()` Angular ajouté — `PATCH /api/auth/update-password`, tap signal, pas de catchError
- T8 : `ChangePasswordComponent` créé dans `app/account/` — 3 champs, `passwordMatchValidator` copié, erreur inline 401
- T9 : Route `/account/change-password` ajoutée avec `[authGuard, mustChangePasswordGuard]`
- T10 : Item "Changer le mot de passe" ajouté avant "Déconnexion" dans top-bar menu
- T11 : Build frontend 0 erreur TypeScript

### File List

**Nouveaux fichiers :**
- `backend/src/auth/dto/update-password.dto.ts`
- `frontend/src/app/account/change-password/change-password.component.ts`
- `frontend/src/app/account/change-password/change-password.component.html`
- `frontend/src/app/account/change-password/change-password.component.scss`

**Fichiers modifiés :**
- `frontend/src/app/core/interceptors/auth-error.interceptor.ts`
- `backend/src/users/users.service.ts`
- `backend/src/users/users.service.spec.ts`
- `backend/src/auth/auth.service.ts`
- `backend/src/auth/auth.service.spec.ts`
- `backend/src/auth/auth.controller.ts`
- `backend/src/auth/auth.controller.spec.ts`
- `frontend/src/app/core/services/auth.service.ts`
- `frontend/src/app/core/components/top-bar/top-bar.component.html`
- `frontend/src/app/app.routes.ts`

### Change Log

- 2026-05-03 : Implémentation complète story 2.6 — endpoint `PATCH /api/auth/update-password`, `UpdatePasswordDto`, `UsersService.updatePasswordHash()`, `AuthService.updatePassword()` backend, composant `account/change-password` Angular, route protégée, item menu top-bar

### Review Findings

- [x] [Review][Decision] Invalidation des refresh tokens après changement de mot de passe — Après un changement de mot de passe réussi, les refresh tokens existants ne sont pas révoqués. Un attaquant ayant obtenu un refresh token conserve l'accès même après rotation du mot de passe. Décider : (a) invalider tous les refresh tokens de l'utilisateur dans `AuthService.updatePassword()`, ou (b) différer à une story sécurité dédiée.
- [x] [Review][Decision] Nouveau mot de passe identique à l'actuel accepté silencieusement — `updatePassword` n'empêche pas `newPassword === currentPassword`. Un `200 OK` est retourné avec snackbar "Mot de passe mis à jour" alors que rien n'a changé. Décider : (a) ajouter la vérification côté service, ou (b) différer.
- [x] [Review][Patch] Post-succès : navigation vers `/links` au lieu de rester sur la page — viole AC1/T8 [frontend/src/app/account/change-password/change-password.component.ts:92]
- [x] [Review][Patch] Post-succès : formulaire non réinitialisé après changement — viole AC1/T8 [frontend/src/app/account/change-password/change-password.component.ts:88-93]
- [x] [Review][Patch] Ordre de validation dans `updatePassword` : le check `newPassword !== confirmPassword` devrait précéder `bcrypt.compare` pour éviter la fuite d'information par timing [backend/src/auth/auth.service.ts:updatePassword()]
- [x] [Review][Defer] TOCTOU race condition dans `updatePasswordHash` (update + findById sans transaction) [backend/src/users/users.service.ts] — deferred, pre-existing (même pattern dans `updatePasswordAndClearFlag`)
- [x] [Review][Defer] `authErrorInterceptor` utilise une correspondance de sous-chaîne fragile (`includes`) [frontend/src/app/core/interceptors/auth-error.interceptor.ts] — deferred, pre-existing pattern
- [x] [Review][Defer] Troncature bcrypt à 72 octets pour mots de passe Unicode (`MaxLength(128)` en caractères ≠ octets) [backend/src/auth/dto/update-password.dto.ts] — deferred, pre-existing (système entier)
- [x] [Review][Defer] `@SkipThrottle()` sur endpoint sensible — choix délibéré per spec (cohérent avec `change-password`), à revoir dans une story sécurité dédiée [backend/src/auth/auth.controller.ts]
- [x] [Review][Defer] `isActive` non re-vérifié dans `findById` avant changement de mot de passe [backend/src/users/users.service.ts] — deferred, pre-existing across all auth methods
- [x] [Review][Defer] JWT cookie non rafraîchi après changement de mot de passe (claims inchangés, pas d'impact actuel) [frontend/src/app/core/services/auth.service.ts] — deferred, aucun impact actuel
- [x] [Review][Defer] Test `updatePasswordHash` mocke `affected` mais l'implémentation l'ignore complètement [backend/src/users/users.service.spec.ts] — deferred, qualité test
- [x] [Review][Defer] Message 401 distingue "user inexistant" de "mauvais mot de passe" (fuite théorique sous JWT guard) [backend/src/auth/auth.service.ts] — deferred, théorique
