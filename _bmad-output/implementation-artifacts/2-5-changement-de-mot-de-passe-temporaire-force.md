# Story 2.5 : Changement de mot de passe temporaire forcé

Status: done

## Story

En tant qu'utilisateur avec un mot de passe temporaire,
Je veux être forcé de choisir un nouveau mot de passe avant d'accéder à toute fonctionnalité,
Afin que mon compte soit sécurisé dès la première connexion.

## Critères d'Acceptation

1. **Étant donné** que je me connecte avec un compte dont `mustChangePassword = true`,
   **Quand** l'authentification réussit,
   **Alors** je suis redirigé vers `/change-password` et le guard `mustChangePasswordGuard` bloque l'accès à toutes les autres routes

2. **Étant donné** que je suis sur la page `/change-password`,
   **Quand** je saisis un nouveau mot de passe valide (confirmation identique, longueur ≥ 8 caractères),
   **Alors** le backend met à jour le hash bcrypt et passe `mustChangePassword` à `false`, puis je suis redirigé vers `/links`

3. **Étant donné** que les deux champs mot de passe ne correspondent pas,
   **Quand** je soumets le formulaire,
   **Alors** un message d'erreur inline s'affiche, le formulaire n'est pas soumis

## Tâches / Sous-tâches

### Backend

- [x] **T1 — Ajouter `updatePasswordAndClearFlag()` dans `UsersService`** (AC: #2)
  - [x] Ajouter `async updatePasswordAndClearFlag(userId: number, passwordHash: string): Promise<UserEntity>` dans `backend/src/users/users.service.ts`
  - [x] Utiliser `this.userRepository.update({ id: userId }, { passwordHash, mustChangePassword: false })` + `findById` (approche plus sûre que save partiel)
  - [x] Retourner l'entité mise à jour (sans champs sensibles — épuration faite dans `AuthService`)

- [x] **T2 — Créer `ChangePasswordDto`** (AC: #2, #3)
  - [x] Créer `backend/src/auth/dto/change-password.dto.ts`
  - [x] Deux champs : `newPassword: string` (`@IsString()`, `@MinLength(8)`) et `confirmPassword: string` (`@IsString()`, `@MinLength(8)`)
  - [x] NE PAS ajouter de validation de correspondance dans le DTO — la validation se fait dans `AuthService`
  - [x] Ajouter `@ApiProperty()` sur les deux champs pour Swagger

- [x] **T3 — Ajouter `changePassword()` dans `AuthService` backend** (AC: #2, #3)
  - [x] Ajouter `async changePassword(userId: number, newPassword: string, confirmPassword: string): Promise<Omit<UserEntity, 'passwordHash' | 'refreshTokens'>>` dans `backend/src/auth/auth.service.ts`
  - [x] Vérifier correspondance : si `newPassword !== confirmPassword` → `throw new BadRequestException('Les mots de passe ne correspondent pas')`
  - [x] Hasher avec `await bcrypt.hash(newPassword, 12)` (cost 12 imposé — jamais variable)
  - [x] Appeler `this.usersService.updatePasswordAndClearFlag(userId, hash)` — injecter `UsersService` (déjà présent)
  - [x] Épurer la réponse : `const { passwordHash: _, refreshTokens: __, ...safeUser } = updatedUser` et retourner `safeUser`

- [x] **T4 — Ajouter endpoint `PATCH /api/auth/change-password`** dans `AuthController` (AC: #2)
  - [x] Ajouter dans `backend/src/auth/auth.controller.ts` : endpoint `@Patch('change-password')` avec `@UseGuards(JwtAuthGuard)`, `@SkipThrottle()`, `@HttpCode(HttpStatus.OK)`
  - [x] Ajouter `Patch`, `Body` dans les imports `@nestjs/common`
  - [x] Importer `ChangePasswordDto`

- [x] **T5 — Tests unitaires backend** (AC: #2, #3)
  - [x] `auth.service.spec.ts` — 3 cas pour `changePassword()` :
    - passwords match → hash bcrypt ≥ cost 12, `mustChangePassword = false`, retourne `safeUser`
    - passwords don't match → lève `BadRequestException` avec le message attendu
    - `updatePasswordAndClearFlag` retourne l'entité mise à jour correctement épurée
  - [x] `auth.controller.spec.ts` — 2 cas pour `PATCH /auth/change-password` :
    - succès → 200 avec `safeUser` (mustChangePassword = false)
    - mismatch → 400 Bad Request (délégué au service, testé via spy)

- [x] **T6 — Validation backend**
  - [x] `npm run build` → 0 erreur TypeScript
  - [x] `npm test` → 35/35 tests verts, aucune régression

### Frontend

- [x] **T7 — Créer `mustChangePasswordGuard`** (AC: #1)
  - [x] Créer `frontend/src/app/core/guards/must-change-password.guard.ts`
  - [x] Pattern `CanActivateFn` cohérent avec `auth.guard.ts` — charge `me()` si signal null, redirige vers `/change-password` si `mustChangePassword = true`
  - [x] NE PAS rediriger vers `/login` si `mustChangePassword = true` — uniquement vers `/change-password`

- [x] **T8 — Ajouter `changePassword()` dans `AuthService` Angular** (AC: #2)
  - [x] Ajouter dans `frontend/src/app/core/services/auth.service.ts` : `changePassword()` retourne `Observable<AuthUser>` via `http.patch` + `tap(user => currentUser.set(user))`
  - [x] La mise à jour du signal via `tap` garantit que `currentUser().mustChangePassword` est `false` après succès
  - [x] NE PAS ajouter `catchError` ici — les erreurs (400, 401) remontent au composant

- [x] **T9 — Créer `ChangePasswordComponent`** (AC: #2, #3)
  - [x] Créer les fichiers : `frontend/src/app/auth/change-password/change-password.component.ts`, `.html`, `.scss`
  - [x] Composant standalone (pas de NgModule), `ChangeDetectionStrategy.OnPush`
  - [x] Formulaire réactif avec `FormGroup`, validateur cross-champ `passwordMatchValidator`, `Validators.minLength(8)`
  - [x] Signals `isLoading` et `serverError`
  - [x] Handler `onSubmit()` avec gestion erreur 400/401, redirection `/links` en succès

- [x] **T10 — Mettre à jour `app.routes.ts`** (AC: #1)
  - [x] Route `/change-password` avec `canActivate: [authGuard]` uniquement
  - [x] `mustChangePasswordGuard` ajouté après `authGuard` sur `/links`, `/recipes`, `/notes`
  - [x] La route `/login` reste sans guards

- [x] **T11 — Validation frontend**
  - [x] `ng build` → 0 erreur TypeScript
  - [x] Tests existants inchangés (0 régression — les échecs Vitest préexistaient, liés à une config globals manquante)

## Dev Notes

### Flux de données complet

```
1. Login avec mustChangePassword = true
   → authGuard (me() → currentUser.set({..., mustChangePassword: true}))
   → mustChangePasswordGuard (currentUser().mustChangePassword === true)
   → createUrlTree(['/change-password'])

2. Sur /change-password, soumission du formulaire
   → authService.changePassword(newPwd, confirmPwd)
   → PATCH /api/auth/change-password [JwtAuthGuard]
   → AuthService.changePassword(userId, newPwd, confirmPwd)
   → bcrypt.hash(newPwd, 12)
   → usersService.updatePasswordAndClearFlag(userId, hash)
   → retourne safeUser (mustChangePassword: false)
   → tap: currentUser.set({..., mustChangePassword: false})
   → router.navigate(['/links'])
   → mustChangePasswordGuard sur /links → currentUser().mustChangePassword === false → true ✅
```

### Point critique : `mustChangePassword` absent du JWT

Le payload JWT (`JwtPayload`) ne contient que `sub`, `username`, `role` — **PAS** `mustChangePassword`. Le `mustChangePasswordGuard` Angular **doit** donc s'appuyer sur `authService.currentUser()` (peuplé par `login()` ou `me()`). Si le signal est null au chargement de la page (deep link), appeler `authService.me()` pour recharger l'état. Ce comportement est déjà le pattern de `authGuard`.

Aucun guard backend `MustChangePasswordGuard` n'est requis dans cette story (hors scope V1 — ajouterait une query DB sur chaque requête sans bénéfice direct pour l'utilisateur final).

### DTO et validation — Choix architectural

La validation de correspondance des mots de passe est faite dans `AuthService.changePassword()` (service layer), **pas** dans le DTO. Raison : class-validator n'a pas de `@IsEqualTo()` natif, un decorator custom irait dans `src/common/decorators/` et alourdit le scope. La validation service est aussi complète et retourne un `BadRequestException` propre.

### `updatePasswordAndClearFlag` dans `UsersService`

TypeORM `save()` avec un objet partiel `{ id, passwordHash, mustChangePassword }` fait un UPDATE sur les colonnes fournies uniquement — pas de SELECT préalable requis si on a déjà l'id. Cependant, `save()` peut faire un SELECT + UPDATE si l'entité n'est pas "managed". Alternative plus sûre : utiliser `this.userRepository.update({ id: userId }, { passwordHash, mustChangePassword: false })` puis `findById(userId)` si l'entité mise à jour est nécessaire.

Recommandation : utiliser `update()` + `findById()` pour garantir l'entité retournée est à jour :
```typescript
await this.userRepository.update({ id: userId }, { passwordHash, mustChangePassword: false });
const user = await this.findById(userId);
if (!user) throw new NotFoundException();
return user;
```

### Arborescence des Fichiers

**Nouveaux fichiers :**
```
backend/src/auth/dto/
└── change-password.dto.ts          ← NOUVEAU

backend/src/users/
└── users.service.ts                ← MODIFIÉ (ajout updatePasswordAndClearFlag)
└── users.service.spec.ts           ← MODIFIÉ si des tests existent

backend/src/auth/
├── auth.service.ts                 ← MODIFIÉ (ajout changePassword, BadRequestException)
├── auth.service.spec.ts            ← MODIFIÉ (3 nouveaux cas)
├── auth.controller.ts              ← MODIFIÉ (Patch endpoint, import ChangePasswordDto)
└── auth.controller.spec.ts         ← MODIFIÉ (2 nouveaux cas)

frontend/src/app/core/guards/
└── must-change-password.guard.ts   ← NOUVEAU

frontend/src/app/core/services/
└── auth.service.ts                 ← MODIFIÉ (ajout changePassword())

frontend/src/app/auth/change-password/
├── change-password.component.ts    ← NOUVEAU
├── change-password.component.html  ← NOUVEAU
└── change-password.component.scss  ← NOUVEAU

frontend/src/app/
└── app.routes.ts                   ← MODIFIÉ (nouvelle route + guards)
```

**Patterns existants à réutiliser :**

| Élément | Fichier source | Usage dans cette story |
|---------|---------------|------------------------|
| `bcrypt.hash(pwd, 12)` | `auth.service.ts` (login/validateUser) | `changePassword()` — cost 12 imposé |
| `@SkipThrottle()` | `auth.controller.ts` (`refresh`) | Endpoint `change-password` |
| `@CurrentUser()` | `auth.controller.ts` (`me`) | Récupérer `userId` dans le controller |
| `@UseGuards(JwtAuthGuard)` | `auth.controller.ts` (`me`) | Protéger le endpoint |
| `{ passwordHash: _, refreshTokens: __, ...safeUser }` | `auth.service.ts` (`me`, `refresh`) | Épurer la réponse |
| `CanActivateFn` + `authService.me()` | `core/guards/auth.guard.ts` | Pattern pour `mustChangePasswordGuard` |
| `currentUser.set(user)` via `tap` | `auth.service.ts` (`refreshToken`) | Mettre à jour le signal Angular |
| `signal<boolean>(false)` pour `isLoading` | pattern Angular projet | État de chargement dans `ChangePasswordComponent` |
| Imports Material : `MatFormField`, `MatInput`, `MatButton`, `MatError` | `login.component.ts` | Vérifier les imports du composant login et réutiliser |

### Anti-patterns à Éviter

- ❌ NE PAS mettre `mustChangePassword` dans le payload JWT sans décision explicite de story — change le contrat JWT et impacte les stories 2.4/2.3
- ❌ NE PAS implémenter un guard backend `MustChangePasswordGuard` dans cette story (hors scope)
- ❌ NE PAS ajouter `mustChangePasswordGuard` sur la route `/change-password` — provoque une boucle infinie de redirections
- ❌ NE PAS ajouter `mustChangePasswordGuard` sur `/login` — l'utilisateur non authentifié doit pouvoir accéder au login
- ❌ NE PAS hardcoder bcrypt cost < 12 — le cost 12 est une exigence NFR1
- ❌ NE PAS utiliser `synchronize: true` TypeORM — aucune modification de schéma ici, `mustChangePassword` existe déjà dans `UserEntity`
- ❌ NE PAS naviguer depuis `AuthService` Angular — la navigation est toujours dans le composant appelant
- ❌ NE PAS créer de NgModule — composant standalone uniquement (convention du projet)

### Contraintes de sécurité importantes

- `mustChangePassword` est déjà `true` par défaut dans `UserEntity` (colonne `default: true`) — les nouveaux comptes sont forcément en mode "changement requis"
- Le compte admin initial (`AdminSeedService`) est créé avec `mustChangePassword = true` — cette story débloque donc le premier accès admin
- Après un changement de mot de passe réussi, `mustChangePassword = false` est persisté en DB — un refresh du token retourne toujours les données fraîches depuis `me()` (endpoint déjà en place)

### Références

- Architecture : `_bmad-output/planning-artifacts/architecture.md` — sections "Architecture Frontend" (guards), "Authentification & Sécurité" (bcrypt cost 12), "Patterns de Structure"
- Épics : `_bmad-output/planning-artifacts/epics.md` — Épic 2, Story 2.5
- Story précédente (2.4) : `_bmad-output/implementation-artifacts/2-4-deconnexion.md` — patterns `AuthService`, `COOKIE_OPTIONS`, `@CurrentUser()`
- `UserEntity` : `backend/src/users/user.entity.ts` — `mustChangePassword` déjà en place (default: true)
- `AuthUser` interface Angular : `frontend/src/app/core/services/auth.service.ts` — `mustChangePassword: boolean` déjà défini
- `authGuard` : `frontend/src/app/core/guards/auth.guard.ts` — pattern à reproduire pour `mustChangePasswordGuard`
- Routes actuelles : `frontend/src/app/app.routes.ts` — pas de route `/change-password`, pas de `mustChangePasswordGuard`

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

Aucun blocage rencontré.

### Completion Notes List

- T1 : `updatePasswordAndClearFlag` utilise `repository.update()` + `findById()` (plus sûr que `save()` partiel) — NotFoundException si userId invalide
- T3 : Validation de correspondance dans le service (layer) pour éviter un décorateur custom class-validator hors scope
- T5 : 27 tests auth (service + controller) → tous verts ; 35 tests total backend sans régression
- T11 : Build Angular OK (0 erreur TS) ; les 4 échecs Vitest existants sont préexistants (globals non configurés), non causés par cette story
- Flux complet validé : login mustChangePassword=true → guard → /change-password → soumission → PATCH → signal mis à jour → /links

### File List

- `backend/src/auth/dto/change-password.dto.ts` (nouveau)
- `backend/src/users/users.service.ts` (modifié — ajout `updatePasswordAndClearFlag`)
- `backend/src/auth/auth.service.ts` (modifié — ajout `changePassword`, import `BadRequestException`)
- `backend/src/auth/auth.controller.ts` (modifié — endpoint PATCH, import `Patch`/`Body`/`ChangePasswordDto`)
- `backend/src/auth/auth.service.spec.ts` (modifié — 3 nouveaux cas `changePassword`)
- `backend/src/auth/auth.controller.spec.ts` (modifié — 2 nouveaux cas `changePassword`)
- `frontend/src/app/core/guards/must-change-password.guard.ts` (nouveau)
- `frontend/src/app/core/services/auth.service.ts` (modifié — ajout `changePassword()`)
- `frontend/src/app/auth/change-password/change-password.component.ts` (nouveau)
- `frontend/src/app/auth/change-password/change-password.component.html` (nouveau)
- `frontend/src/app/auth/change-password/change-password.component.scss` (nouveau)
- `frontend/src/app/app.routes.ts` (modifié — nouvelle route `/change-password`, `mustChangePasswordGuard` sur routes protégées)

## Review Findings

- [x] [Review][Patch] Aucun `@IsNotEmpty()` dans `ChangePasswordDto` — un mot de passe composé d'espaces (≥ 8) passe la validation et est hashé [backend/src/auth/dto/change-password.dto.ts]
- [x] [Review][Patch] Pas de `@MaxLength()` dans `ChangePasswordDto` — une chaîne très longue est désérialisée en mémoire avant d'être tronquée par bcrypt à 72 octets (vecteur DoS) [backend/src/auth/dto/change-password.dto.ts]
- [x] [Review][Patch] `isLoading.set(false)` absent du callback `next` — si la navigation échoue ou est annulée, le bouton reste désactivé définitivement [frontend/src/app/auth/change-password/change-password.component.ts]
- [x] [Review][Patch] Propriété CSS `color` dupliquée dans `.form-error` — faux positif, fichier correct (42 lignes, une seule propriété `color`) [frontend/src/app/auth/change-password/change-password.component.scss]
- [x] [Review][Patch] `mustChangePasswordGuard` n'a pas de try/catch autour de `await authService.me()` — une erreur réseau/500 rejette la Promise sans fallback (contrairement à `authGuard`) [frontend/src/app/core/guards/must-change-password.guard.ts]
- [x] [Review][Defer] `/change-password` accessible aux utilisateurs avec `mustChangePassword=false` — comportement V1 explicitement voulu par T10 (`canActivate: [authGuard]` uniquement) ; à reconsidérer si un guard inverse est souhaité — deferred, pré-existant par spec
- [x] [Review][Defer] Double appel `me()` si `authGuard` et `mustChangePasswordGuard` voient `currentUser() === null` simultanément — pattern pré-existant dans `authGuard` [frontend/src/app/core/guards/] — deferred, pre-existing
- [x] [Review][Defer] `updatePasswordAndClearFlag` non-atomique (UPDATE + findById en deux requêtes sans transaction) — concerne l'architecture TypeORM globale du projet [backend/src/users/users.service.ts] — deferred, pre-existing
- [x] [Review][Defer] Fuite potentielle de futurs champs sensibles si `UserEntity` évolue — destructuring manuel ne couvre pas les colonnes à venir [backend/src/auth/auth.service.ts] — deferred, spéculatif
- [x] [Review][Defer] Pas de test pour la double soumission pendant `isLoading = true` — couverture de test non critique [frontend/src/app/auth/change-password/] — deferred, non-bloquant
- [x] [Review][Defer] `mustChangePasswordGuard` absent des routes wildcard/futures — AC1 couvert pour les routes actuelles, à maintenir au fur et à mesure — deferred, maintenance future

## Change Log

- 2026-05-03 : Implémentation complète Story 2.5 — endpoint PATCH `/api/auth/change-password`, guard Angular `mustChangePasswordGuard`, composant `ChangePasswordComponent`, mise à jour routes. 35 tests backend verts, build Angular OK.
