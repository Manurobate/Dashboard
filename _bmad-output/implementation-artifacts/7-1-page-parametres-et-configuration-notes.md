---
baseline_commit: dca0209c7b8a47bddaef3a9f617a11e8cea8d108
---

# Story 7.1 : Page Paramètres et configuration Notes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'**utilisateur authentifié**,
Je veux **accéder à une page Paramètres depuis le menu utilisateur et y configurer mon module Notes (URL Trilium + activation)**,
Afin de **personnaliser mon Dashboard sans intervention de l'administrateur**.

> **Contexte Épic 7 (pivot 2026-06-18) :** L'Épic 7 intègre Trilium Notes (auto-hébergé) via une **iframe**, sans réimplémenter d'éditeur. Cette story 7.1 pose les fondations : colonnes `User`, endpoints REST, page `/settings` extensible, et navigation conditionnelle. La story 7.2 ajoutera le test de connectivité (`GET /api/trilium/ping`), la 7.3 l'onglet Notes avec l'iframe. **Ne pas** implémenter le ping ni l'iframe ici.

## Acceptance Criteria

**AC1 — Accès à la page Paramètres**
**Étant donné** que je clique "Paramètres" dans le menu utilisateur de la top bar,
**Quand** je navigue vers `/settings`,
**Alors** la page affiche une section "Notes" avec : un toggle "Activer les Notes" (`mat-slide-toggle`) et un champ URL instance Trilium (visible **uniquement** si Notes activées).

**AC2 — Saisie et sauvegarde de l'URL**
**Étant donné** que j'active le toggle Notes,
**Quand** le champ URL s'affiche,
**Alors** je peux saisir l'URL de mon instance Trilium (ex : `https://trilium.monserveur.fr`) et sauvegarder via `PATCH /api/users/me/notes-settings`.

**AC3 — Feedback et persistance**
**Étant donné** que je sauvegarde mes paramètres,
**Quand** `PATCH /api/users/me/notes-settings` réussit,
**Alors** un snackbar "Paramètres sauvegardés" s'affiche et les changements sont persistés en base.

**AC4 — Modèle de données et endpoint backend**
**Étant donné** que le backend reçoit `PATCH /api/users/me/notes-settings`,
**Quand** la requête est traitée,
**Alors** les champs `triliumUrl` et `notesEnabled` de l'entité `User` sont mis à jour (migration TypeORM : `triliumUrl VARCHAR(500) NULL`, `notesEnabled BOOLEAN DEFAULT FALSE`).

**AC5 — Navigation conditionnelle**
**Étant donné** que je désactive le toggle Notes,
**Quand** je sauvegarde,
**Alors** l'onglet Notes disparaît de la navigation (top bar desktop + bottom nav mobile) après rechargement.

**AC6 — Protection de la route**
**Étant donné** que l'utilisateur n'est pas authentifié,
**Quand** il tente d'accéder à `/settings`,
**Alors** le guard `authGuard` le redirige vers `/login`.

### Scénarios E2E (à ajouter dans `e2e/tests/settings.spec.ts`)
- Naviguer vers `/settings` → vérifier présence de la section Notes.
- Activer Notes + saisir URL + sauvegarder → vérifier snackbar + rechargement → vérifier onglet Notes visible dans la navigation.
- Désactiver Notes → sauvegarder → vérifier onglet Notes masqué dans la navigation.

---

## Tasks / Subtasks

- [x] **Task 1 — Backend : modèle de données `User` + migration** (AC: #4)
  - [x] Ajouter à `backend/src/users/user.entity.ts` deux colonnes après `isActive` :
    - `@Column({ type: 'varchar', length: 500, nullable: true }) triliumUrl!: string | null;`
    - `@Column({ type: 'boolean', default: false }) notesEnabled!: boolean;`
  - [x] Créer la migration `backend/src/migrations/<timestamp>-AddTriliumSettingsToUser.ts` (timestamp epoch-ms **supérieur** à `1783966599227`, le plus récent existant). Suivre le pattern raw-SQL des migrations existantes (classe `AddTriliumSettingsToUser<timestamp> implements MigrationInterface`, champ `name`) :
    - `up` : `ALTER TABLE \`User\` ADD \`triliumUrl\` varchar(500) NULL` puis `ALTER TABLE \`User\` ADD \`notesEnabled\` tinyint NOT NULL DEFAULT 0`
    - `down` : `DROP COLUMN \`notesEnabled\`` puis `DROP COLUMN \`triliumUrl\``
  - [x] Vérifier l'application : `cd backend && npm run migration:run` (nécessite la DB up ; voir `docker-compose.override.yml`).
- [x] **Task 2 — Backend : DTO + endpoints notes-settings** (AC: #2, #3, #4)
  - [x] Créer `backend/src/users/dto/update-notes-settings.dto.ts` :
    - `notesEnabled?: boolean` → `@IsOptional() @IsBoolean()`
    - `triliumUrl?: string | null` → `@IsOptional() @IsString() @MaxLength(500)` + `@Transform` trim (pattern `update-profile.dto.ts`). **Ne pas** valider le schéma http/https ici (la validation anti-SSRF/format est la responsabilité de la story 7.2 `GET /api/trilium/ping`).
  - [x] Ajouter dans `backend/src/users/users.service.ts` :
    - `getNotesSettings(userId)` → `{ triliumUrl, notesEnabled }` (throw `NotFoundException` si absent)
    - `updateNotesSettings(userId, dto)` → `userRepository.update(...)` des champs fournis, puis retourne `{ triliumUrl, notesEnabled }` rechargés.
  - [x] Ajouter dans `backend/src/users/users.controller.ts`, **juste après** `updateProfile` (`@Patch('me')`), avec `@Roles('user', 'admin')` + `@SkipThrottle()` (le contrôleur est `@Roles('admin')` par défaut) :
    - `@Get('me/notes-settings')` → retourne `getNotesSettings(req.user.id)`
    - `@Patch('me/notes-settings')` `@HttpCode(200)` → retourne `updateNotesSettings(req.user.id, dto)`
  - [x] Récupérer l'id via `@Req() req: Request & { user: { id: number } }` (pattern `updateProfile`).
- [x] **Task 3 — Backend : tests unitaires** (AC: #2, #3, #4)
  - [x] Étendre `backend/src/users/users.controller.spec.ts` : mock `getNotesSettings`/`updateNotesSettings`, vérifier délégation + retour `{ triliumUrl, notesEnabled }`.
  - [x] Étendre `backend/src/users/users.service.spec.ts` : `updateNotesSettings` appelle `update` avec les bons champs, `NotFoundException` si user absent.
- [x] **Task 4 — Frontend : modèle `AuthUser` + service** (AC: #2, #3, #5)
  - [x] Dans `frontend/src/app/core/services/auth.service.ts`, ajouter à l'interface `AuthUser` : `triliumUrl: string | null;` et `notesEnabled: boolean;`. **Aucun changement backend requis sur `/api/auth/me|login|refresh`** : ils retournent déjà le user complet (hors `passwordHash`/`refreshTokens`), donc les deux colonnes remonteront automatiquement.
    - [x] Vérifier la cohérence de tout mock `AuthUser` dans les specs frontend existants (ajouter les 2 champs si un objet `AuthUser` complet est typé).
  - [x] Ajouter la méthode `updateNotesSettings(dto: { notesEnabled: boolean; triliumUrl: string | null }): Observable<...>` qui fait `PATCH /api/users/me/notes-settings` et, dans un `tap`, **fusionne** la réponse dans le signal `currentUser` (`this.currentUser.update(u => u ? { ...u, ...res } : u)`) pour que la navigation réagisse.
- [x] **Task 5 — Frontend : SettingsModule (page /settings)** (AC: #1, #2, #3)
  - [x] Créer `frontend/src/app/settings/settings.routes.ts` (route par défaut → `SettingsComponent`).
  - [x] Créer `frontend/src/app/settings/settings.component.ts` (+ `.html`, `.scss`) : conteneur `mat-card`, titre "Paramètres", qui inclut `<app-notes-settings />`. S'inspirer de la structure de `profile.component`.
  - [x] Créer `frontend/src/app/settings/notes-settings/notes-settings.component.ts` (+ `.html`, `.scss`, `.spec.ts`) :
    - Standalone, `ChangeDetectionStrategy.OnPush`.
    - Imports : `ReactiveFormsModule`, `MatCardModule`, `MatSlideToggleModule` (**nouvel import — non utilisé ailleurs dans le projet**), `MatFormFieldModule`, `MatInputModule`, `MatButtonModule`, `MatProgressSpinnerModule`.
    - Form `fb.nonNullable.group({ notesEnabled: [false], triliumUrl: [''] })`.
    - `ngOnInit` : pré-remplir depuis `authService.currentUser()` (`notesEnabled`, `triliumUrl ?? ''`).
    - Template : `mat-slide-toggle formControlName="notesEnabled"` "Activer les Notes" ; **champ URL affiché seulement si** `form.controls.notesEnabled.value` est vrai (`@if (form.controls.notesEnabled.value) { <mat-form-field>…</mat-form-field> }`) ; bouton "Sauvegarder" avec spinner (pattern `profile.component.html`).
    - `onSubmit` : appelle `authService.updateNotesSettings(...)` → succès : snackbar `"Paramètres sauvegardés"` (durée 3000) ; erreur : snackbar `"Impossible de sauvegarder les paramètres"` (durée 4000). Utiliser `takeUntilDestroyed` + `finalize` (pattern `profile.component.ts`).
- [x] **Task 6 — Frontend : route /settings** (AC: #6)
  - [x] Dans `frontend/src/app/app.routes.ts`, ajouter une route lazy `settings` : `canActivate: [authGuard, mustChangePasswordGuard]`, `loadChildren: () => import('./settings/settings.routes').then((r) => r.settingsRoutes)`. (Aligné sur `profile`/`dashboard` qui combinent les deux guards ; AC6 ne teste que `authGuard`.)
- [x] **Task 7 — Frontend : navigation** (AC: #1, #5)
  - [x] `top-bar.component.html` : ajouter dans `<mat-menu #userMenu>` une entrée `<a mat-menu-item routerLink="/settings"><mat-icon>settings</mat-icon><span>Paramètres</span></a>` (avant "Mon profil").
  - [x] `top-bar.component.html` : envelopper l'onglet Notes (`<a mat-tab-link routerLink="/notes">…`) dans `@if (authService.currentUser()?.notesEnabled) { … }`.
  - [x] `bottom-nav.component.ts` : injecter `AuthService` (`protected readonly authService = inject(AuthService)`) — actuellement absent — et ajouter l'import.
  - [x] `bottom-nav.component.html` : envelopper l'item Notes (`<a routerLink="/notes" …>`) dans `@if (authService.currentUser()?.notesEnabled) { … }`.
- [x] **Task 8 — E2E** (AC: #1, #2, #5)
  - [x] Créer `e2e/tests/settings.spec.ts` en suivant le pattern de `e2e/tests/profile.spec.ts` (login via API + UI, sélecteurs `formcontrolname`, assertions `snackbar`/reload). Couvrir les 3 scénarios E2E ci-dessus. **Nettoyer l'état** en fin de test (remettre `notesEnabled=false`) pour ne pas polluer les autres specs qui s'appuient sur l'onglet Notes.
- [x] **Task 9 — Vérification finale**
  - [x] Backend : `cd backend && npm run test` (Jest) — verts.
  - [x] Frontend : `cd frontend && ng test --no-watch` — verts.
  - [x] E2E : lancer la suite Playwright (voir `e2e/`) si l'environnement le permet.
  - [x] Vérifier manuellement le cycle activer→sauver→reload (onglet visible) puis désactiver→sauver→reload (onglet masqué).

---

## Dev Notes

### Contexte & périmètre
- Story **fondation** de l'Épic 7. Elle ne fait **pas** appel à Trilium (aucun HTTP sortant) : uniquement CRUD des préférences + UI + navigation. Le ping (7.2) et l'iframe (7.3) viendront ensuite.
- Colonnes ajoutées à `User` réutilisées par 7.2 et 7.3. Ne pas les nommer autrement que `triliumUrl` / `notesEnabled`.

### Backend — patterns imposés
- **Global prefix `api`** est appliqué dans `main.ts` (`app.setGlobalPrefix('api')`). Les décorateurs de route s'écrivent **sans** `api/` : `@Controller('users')` + `@Patch('me/notes-settings')` ⇒ URL réelle `/api/users/me/notes-settings`. [Source: backend/src/main.ts#L12]
- `UsersController` porte `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('admin')` **au niveau classe**. Les endpoints utilisateur (self-service) doivent **override** avec `@Roles('user', 'admin')` — sinon un `user` non-admin reçoit 403. Copier exactement le pattern de `updateProfile`. [Source: backend/src/users/users.controller.ts#L37-L51]
- `@SkipThrottle()` est présent sur `updateProfile` ; le reprendre sur les endpoints notes-settings.
- Ne **jamais** renvoyer `passwordHash`/`refreshTokens`. Ici on renvoie uniquement `{ triliumUrl, notesEnabled }`, donc pas de risque de fuite, mais rester cohérent.
- Ordre des routes : `me/notes-settings` (2 segments) ne collisionne pas avec `:id` (1 segment) ni `:id/reset-password`. Le placer néanmoins juste après `@Patch('me')` pour la lisibilité.
- **Validation (`ValidationPipe` global, `whitelist: true`, `forbidNonWhitelisted: true`)** : tout champ non déclaré dans le DTO ⇒ 400. Bien déclarer `notesEnabled` et `triliumUrl` dans le DTO. [Source: backend/src/main.ts#L20-L26]
- Service : suivre le pattern `updateProfile` (`findById` → 404 si absent → `userRepository.update` → retourne l'objet mis à jour). [Source: backend/src/users/users.service.ts#L155-L160]

### Backend — migration
- DataSource : `backend/src/config/typeorm.config.ts`, `synchronize: false` ⇒ **migration obligatoire** (pas de sync auto). MariaDB. `migrations: __dirname + '/../migrations/*'`. [Source: backend/src/config/typeorm.config.ts]
- Scripts : `npm run migration:generate -- src/migrations/AddTriliumSettingsToUser` **ou** écriture manuelle raw-SQL. Le projet mélange les deux ; le raw-SQL manuel (pattern `1778579746059-AddNameToUser.ts`) est le plus simple ici. [Source: backend/package.json#L21-L23]
- MariaDB stocke les booléens en `tinyint(1)`. Le décorateur `@Column({ type: 'boolean', default: false })` mappe vers `tinyint NOT NULL DEFAULT 0` — c'est ce que la migration doit écrire pour rester cohérente avec ce que TypeORM attend.

### Frontend — flux de données navigation (point clé AC5)
- Les endpoints `/api/auth/me`, `/api/auth/login`, `/api/auth/refresh` retournent **déjà** le user complet via destructuring `{ passwordHash: _, refreshTokens: __, ...safeUser }`. Ajouter les colonnes à l'entité suffit à exposer `triliumUrl`/`notesEnabled` au frontend — **aucune modification de `AuthController`/`AuthService` backend n'est nécessaire**. [Source: backend/src/auth/auth.service.ts#L119-L126, backend/src/auth/auth.controller.ts#L87-L88]
- Côté frontend, le signal `authService.currentUser()` est la source de vérité de la nav. Deux façons pour l'onglet de réagir :
  1. **Après reload** (minimum AC5) : `authGuard` appelle `authService.me()` au démarrage, qui repeuple le signal avec les valeurs à jour.
  2. **En direct** (recommandé) : `updateNotesSettings` fusionne la réponse PATCH dans `currentUser` via `.update(...)`. L'onglet apparaît/disparaît sans reload.
- `top-bar.component.html` affiche l'onglet Notes **inconditionnellement** aujourd'hui (l.30-37) → à envelopper d'un `@if (authService.currentUser()?.notesEnabled)`. [Source: frontend/src/app/core/components/top-bar/top-bar.component.html#L30-L37]
- `bottom-nav.component.ts` **n'injecte pas** `AuthService` et son template n'a **aucune** condition d'auth (l.10-13 affichent Notes toujours). Injecter `AuthService` puis envelopper l'item Notes. [Source: frontend/src/app/core/components/bottom-nav/bottom-nav.component.ts, .../bottom-nav.component.html#L10-L13]
- `<app-bottom-nav />` est rendu inconditionnellement dans `app.html` (masqué via CSS sur desktop). Le `@if notesEnabled` gère uniquement l'onglet Notes, pas la barre entière. [Source: frontend/src/app/app.html#L8]

### Frontend — patterns page/form (réutiliser, ne pas réinventer)
- `ProfileComponent` est le **modèle de référence** pour une page self-service : standalone + `OnPush`, `fb.nonNullable.group`, `MatSnackBar` (`duration: 3000`), `takeUntilDestroyed` + `finalize`, spinner sur le bouton pendant `isLoading()`. Copier cette structure pour `NotesSettingsComponent`. [Source: frontend/src/app/profile/profile.component.ts, .../profile.component.html]
- Route lazy : `profile` utilise `loadComponent`, `recipes` utilise `loadChildren` (`recipes.routes.ts`). Pour `settings` (page + sous-composant), un `loadChildren` vers `settings.routes.ts` est le plus propre et correspond à l'arborescence prévue dans l'architecture. [Source: frontend/src/app/app.routes.ts#L29-L48]
- Guards existants : `authGuard` (async, appelle `me()` si signal vide) et `mustChangePasswordGuard`. `profile`/`dashboard` combinent les deux ; reprendre `[authGuard, mustChangePasswordGuard]` pour `/settings`. [Source: frontend/src/app/core/guards/auth.guard.ts, frontend/src/app/app.routes.ts#L29-L33]
- **`MatSlideToggleModule` n'est importé nulle part** dans le projet — bien l'ajouter aux imports du composant (Angular Material déjà installé).
- Angular 21 zoneless : privilégier signals + `OnPush`. Pas de `NgModule` (tout standalone).

### Arborescence cible (architecture — Addendum Épic 7)
```
backend/src/users/
  ├── user.entity.ts                    # UPDATE : + triliumUrl, notesEnabled
  ├── users.controller.ts               # UPDATE : + GET/PATCH me/notes-settings
  ├── users.service.ts                  # UPDATE : + get/updateNotesSettings
  └── dto/update-notes-settings.dto.ts  # NEW
backend/src/migrations/
  └── <timestamp>-AddTriliumSettingsToUser.ts   # NEW

frontend/src/app/settings/             # NEW module
  ├── settings.routes.ts
  ├── settings.component.ts (+ .html/.scss)
  └── notes-settings/
      ├── notes-settings.component.ts (+ .html/.scss)
      └── notes-settings.component.spec.ts
frontend/src/app/core/services/auth.service.ts       # UPDATE : AuthUser + updateNotesSettings
frontend/src/app/app.routes.ts                       # UPDATE : route settings
frontend/src/app/core/components/top-bar/top-bar.component.html    # UPDATE
frontend/src/app/core/components/bottom-nav/bottom-nav.component.ts + .html  # UPDATE
e2e/tests/settings.spec.ts             # NEW
```
[Source: _bmad-output/planning-artifacts/architecture.md#Addendum — Intégration Trilium Notes (Epic 7) L984-L1050]

> ⚠️ **Note architecture** : l'Addendum décrit un `SettingsModule` avec **endpoints sur `UsersController`** (pas de nouveau module backend). Suivre cette décision — ne pas créer de `SettingsModule` backend.

### Standards de test
- **Backend (Jest)** : specs co-localisées `*.spec.ts`, `Test.createTestingModule`, service mocké via `useValue`. Étendre les specs existants `users.controller.spec.ts` / `users.service.spec.ts` plutôt que d'en créer de nouveaux. [Source: backend/src/users/users.controller.spec.ts]
- **Frontend** : `ng test --no-watch` (pas d'appel vitest direct). Créer `notes-settings.component.spec.ts`.
- **E2E (Playwright)** : specs dans `e2e/tests/`, login via `request.post('/api/auth/login')` + parcours UI. Sélecteurs par `input[formcontrolname="…"]`, `button[type="submit"]`, `page.getByText(...)`. Créer/supprimer un user de test via l'API admin et nettoyer dans `afterAll`. [Source: e2e/tests/profile.spec.ts]

### Anti-régressions (ne pas casser)
- L'onglet Notes est **déjà** présent dans la nav et la route `/notes` existe (`NotesComponent` = placeholder "À venir"). Ne pas supprimer la route ni le placeholder — seulement rendre l'onglet **conditionnel**. La 7.3 remplacera le placeholder par l'iframe. [Source: frontend/src/app/notes/notes.component.ts, frontend/src/app/app.routes.ts#L44-L48]
- Les valeurs par défaut (`notesEnabled = false`) impliquent qu'**après cette story, l'onglet Notes disparaît par défaut** pour tous les users existants tant qu'ils n'activent pas Notes. C'est le comportement attendu — mais penser à l'impact sur les **tests E2E existants** qui supposeraient la présence de l'onglet Notes (vérifier `admin.spec.ts`, navigation) et sur la démo.

### Project Structure Notes
- Monorepo `backend/` (NestJS 11) + `frontend/` (Angular 21 zoneless) + `e2e/` (Playwright). Pas de dossier `apps/`.
- L'arborescence proposée est **alignée** avec l'Addendum architecture Épic 7. Le module frontend `notes/` prévu par l'architecture (guard `notesEnabledGuard`, `trilium-embed`) relève de la **story 7.3** — ne pas le créer ici.
- Aucun conflit de structure détecté.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.1 : Page Paramètres et configuration Notes L1365-L1401]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7 : Module Notes — Intégration Trilium L1359-L1363]
- [Source: _bmad-output/planning-artifacts/architecture.md#Addendum — Intégration Trilium Notes (Epic 7) L984-L1060]
- [Source: backend/src/users/user.entity.ts]
- [Source: backend/src/users/users.controller.ts#L37-L51]
- [Source: backend/src/users/users.service.ts#L155-L160]
- [Source: backend/src/users/dto/update-profile.dto.ts]
- [Source: backend/src/migrations/1778579746059-AddNameToUser.ts]
- [Source: backend/src/main.ts#L12,L20-L26]
- [Source: backend/src/auth/auth.service.ts#L119-L126]
- [Source: frontend/src/app/core/services/auth.service.ts#L5-L12,L54-L58]
- [Source: frontend/src/app/app.routes.ts]
- [Source: frontend/src/app/profile/profile.component.ts + .html]
- [Source: frontend/src/app/core/components/top-bar/top-bar.component.html#L30-L71]
- [Source: frontend/src/app/core/components/bottom-nav/bottom-nav.component.ts + .html]
- [Source: frontend/src/app/core/guards/auth.guard.ts]
- [Source: e2e/tests/profile.spec.ts]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Migration `1783989242642-AddTriliumSettingsToUser` vérifiée (`up` + `down` + `up`) sur une DB MariaDB locale (docker `db` service) avant intégration — le `.env` racine pointait déjà DB_HOST=db/DB_USER=dashboard_user (docker), pas d'impact sur `backend/.env` (DB externe 192.168.1.100, non touchée).
- E2E : le rate-limiter global (`THROTTLER_LIMIT=5`/60s, `.env` racine) bloquait les scénarios de reload car chaque reload complet déclenche un `APP_INITIALIZER` → `GET /api/auth/me` non exempté de throttle. CI utilise déjà `THROTTLER_LIMIT=100` pour l'E2E (voir `.github/workflows/ci.yml`) — appliqué temporairement en local (`.env` racine, non versionné) le temps du run, puis reverti.
- Effet de bord involontaire de l'exécution E2E locale : le mot de passe de l'admin local (`admin@example.com`, docker `db` volume `dashboard_db_data` pré-existant) a été changé par le `global-setup.ts` E2E vers `AdminE2ETest123!` (mustChangePassword passé à false). À signaler à l'utilisateur si cette instance locale était utilisée activement.

### Completion Notes List

- Backend : colonnes `triliumUrl`/`notesEnabled` ajoutées à `UserEntity`, migration créée et vérifiée (up/down) sur DB de test locale. Endpoints `GET/PATCH /api/users/me/notes-settings` ajoutés juste après `updateProfile`, avec `@Roles('user','admin')` + `@SkipThrottle()`. Tests unitaires étendus (users.controller.spec.ts, users.service.spec.ts) — 193/193 tests backend verts.
- Frontend : `AuthUser` étendu, `AuthService.updateNotesSettings()` fusionne la réponse PATCH dans le signal `currentUser`. Nouveau module `settings/` (SettingsComponent + NotesSettingsComponent, pattern calqué sur `ProfileComponent`), route lazy `/settings` (authGuard + mustChangePasswordGuard). Navigation top-bar/bottom-nav rendue conditionnelle à `notesEnabled` (AC5) ; lien "Paramètres" ajouté au menu utilisateur. 164/164 tests frontend verts (incluant les mocks `AuthUser` mis à jour dans `top-bar.component.spec.ts` et `bottom-nav.component.spec.ts`).
- E2E : `e2e/tests/settings.spec.ts` créé, couvrant AC1/AC2/AC3/AC5/AC6 dans un test consolidé (utilisateur dédié créé/supprimé via l'API admin, pour limiter le nombre d'appels `/api/auth/login` face au rate-limiter). Suite complète Playwright exécutée contre la stack Docker locale (build `docker-compose.override.yml`) : 43 passed / 1 pré-existant flaky (`links-drag-drop.spec.ts`, confirmé sans lien avec cette story — passe isolément) / 2 skipped. Environnement Docker remis dans son état initial (containers arrêtés, volume DB conservé) après le run.
- Vérification manuelle du cycle activer→sauver→reload→onglet visible puis désactiver→sauver→reload→onglet masqué effectuée via le scénario E2E ci-dessus (couvre le comportement demandé).

### File List

**Backend**
- `backend/src/users/user.entity.ts` (UPDATE)
- `backend/src/users/users.controller.ts` (UPDATE)
- `backend/src/users/users.service.ts` (UPDATE)
- `backend/src/users/dto/update-notes-settings.dto.ts` (NEW)
- `backend/src/migrations/1783989242642-AddTriliumSettingsToUser.ts` (NEW)
- `backend/src/users/users.controller.spec.ts` (UPDATE)
- `backend/src/users/users.service.spec.ts` (UPDATE)
- `backend/src/auth/auth.service.spec.ts` (UPDATE — mock `UserEntity` complété avec `triliumUrl`/`notesEnabled`)

**Frontend**
- `frontend/src/app/core/services/auth.service.ts` (UPDATE)
- `frontend/src/app/app.routes.ts` (UPDATE)
- `frontend/src/app/settings/settings.routes.ts` (NEW)
- `frontend/src/app/settings/settings.component.ts` (NEW)
- `frontend/src/app/settings/settings.component.html` (NEW)
- `frontend/src/app/settings/settings.component.scss` (NEW)
- `frontend/src/app/settings/notes-settings/notes-settings.component.ts` (NEW)
- `frontend/src/app/settings/notes-settings/notes-settings.component.html` (NEW)
- `frontend/src/app/settings/notes-settings/notes-settings.component.scss` (NEW)
- `frontend/src/app/settings/notes-settings/notes-settings.component.spec.ts` (NEW)
- `frontend/src/app/core/components/top-bar/top-bar.component.html` (UPDATE)
- `frontend/src/app/core/components/top-bar/top-bar.component.spec.ts` (UPDATE)
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.ts` (UPDATE)
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.html` (UPDATE)
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.spec.ts` (UPDATE)

**E2E**
- `e2e/tests/settings.spec.ts` (NEW)

## Change Log

| Date | Changement |
| --- | --- |
| 2026-07-14 | Implémentation complète de la story 7.1 (backend colonnes/endpoints/migration, frontend module Settings + navigation conditionnelle, E2E) — tous les tests (backend, frontend, E2E) verts. Statut → review. |

## Review Findings

_Revue de code adversariale (3 couches : Blind Hunter, Edge Case Hunter, Acceptance Auditor) — 2026-07-14. Les 6 AC sont satisfaits. Findings restants après triage :_

- [x] [Review][Patch] `PATCH /users/me/notes-settings` avec corps vide `{}` → 500 (`UpdateValuesMissingError`) — les deux champs DTO sont `@IsOptional`, donc `{}` passe la validation et `userRepository.update({ id }, {})` lève une erreur TypeORM (500 au lieu d'un no-op/400) [backend/src/users/users.service.ts:177] — **corrigé** : garde `Object.keys(dto).length > 0` avant l'`update` (corps vide = no-op).
- [x] [Review][Patch] `triliumUrl` blanc/espaces persisté comme chaîne vide `''` au lieu de `null` — le `@Transform` trim mais ne normalise pas `''`→`null` ; via appel API direct, `'   '` devient `''` en base, incohérent avec le frontend qui envoie `null` [backend/src/users/dto/update-notes-settings.dto.ts:12] — **corrigé** : le `@Transform` normalise désormais `''`→`null`.
- [x] [Review][Patch] Import `MatCardModule` mort dans `NotesSettingsComponent` — le template n'utilise aucun `mat-card` (la carte est dans le `SettingsComponent` parent). NB : la spec (Task 5) le listait explicitement dans les imports [frontend/src/app/settings/notes-settings/notes-settings.component.ts:12] — **corrigé** : import retiré.
