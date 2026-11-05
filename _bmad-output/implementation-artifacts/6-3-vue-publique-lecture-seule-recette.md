---
baseline_commit: f1a479c
---

# Story 6.3 : Vue publique lecture seule (recette)

**Épic :** 6 — Partage public (recettes)
**Statut :** done
**Créée le :** 2026-07-13

---

## User Story

En tant que visiteur non authentifié,
Je veux accéder à une recette partagée via son lien public sans créer de compte,
Afin de consulter la recette et ajuster le nombre de convives librement.

> **Périmètre :** cette story livre **l'endpoint public backend** (`GET /api/sharing/:token`, sans guard) et **la vue publique frontend** (`/share/:token`) pour les **recettes uniquement**. La **page d'erreur neutre polie** (lien expiré/révoqué/invalide) est la Story 6.4 — ici on se contente d'un état d'erreur **minimal fonctionnel** qui ne plante pas et ne révèle rien, à raffiner en 6.4. Le partage des **notes** (`resourceType: 'note'`) arrive en Story 8.6/8.7 — **ne rien construire pour `'note'` maintenant** (l'entité `Note` n'existe pas).

---

## Critères d'acceptation

**AC1 — Affichage de la recette partagée avec mini top bar**
**Étant donné** que je clique un lien partagé valide vers une recette (`/share/:token`),
**Quand** la page charge,
**Alors** la recette complète s'affiche (titre, avant-propos si présent, image si présente, ingrédients, étapes) avec une **mini top bar** identifiant « Dashboard » — **aucun lien de navigation** vers l'intérieur de l'application n'est visible (pas de bottom nav, pas de bouton retour, pas de menu).

**AC2 — Stepper convives fonctionnel côté client**
**Étant donné** que je suis sur la vue publique d'une recette,
**Quand** j'utilise le `ConvivesSteppperComponent`,
**Alors** les quantités des ingrédients sont recalculées **immédiatement côté client** (même logique `quantity * servings / recipe.servings` que la vue détail authentifiée) — aucune authentification ni appel réseau requis.

**AC3 — Meta robots noindex**
**Étant donné** que je suis sur la vue publique,
**Quand** j'inspecte le `<head>` de la page,
**Alors** le tag `<meta name="robots" content="noindex">` est présent (déjà posé par le stub `ShareViewComponent`, à conserver).

**AC4 — Avant-propos (cf. note story 5.7)**
**Étant donné** qu'une recette partagée possède un champ `avantPropos` non vide,
**Quand** la vue publique s'affiche,
**Alors** l'avant-propos est rendu (via `MarkdownLightPipe`) selon le **même pattern conditionnel** que la vue détail authentifiée — positionné **entre l'image et le `ConvivesSteppperComponent`** (section « Avant-propos »).

**AC5 — Thème clair forcé**
**Étant donné** que la vue publique est en thème clair par défaut,
**Quand** un visiteur non authentifié (dont le navigateur pourrait avoir `theme=dark` en `localStorage`) accède au lien,
**Alors** le **thème clair est appliqué** pendant toute la durée d'affichage de la vue publique, indépendamment des préférences stockées — et l'état de thème antérieur est restauré à la sortie de la vue.

**AC6 — Endpoint public read-only sans guard, validation token côté API**
**Étant donné** que le backend reçoit une requête `GET /api/sharing/:token`,
**Quand** le token est valide (existant, `revokedAt IS NULL`, `expiresAt IS NULL OR expiresAt > NOW()`),
**Alors** le service retourne le contenu de la recette **en lecture seule et sanitisé** (aucune fuite de `userId`, `categoryId`, relation `user`, ni données d'un autre compte) — le contrôleur public **n'a aucun `JwtAuthGuard`** mais valide le token CSPRNG et son expiration côté API.
**Et** quand le token est invalide / expiré / révoqué / inexistant, l'endpoint retourne **`404 Not Found`** sans révéler la cause (comportement neutre — la **page** d'erreur polie est la Story 6.4).

---

## Point déféré 6.2 à traiter OBLIGATOIREMENT dans cette story

> [Review 6.2][Defer] « Colonne `token` sans collation binaire (`varchar(255)` sans `COLLATE`) → lookup potentiellement insensible à la casse [migration 6.1] — **deferred, à corriger avant le endpoint public de la Story 6.3.** »

**Pourquoi c'est bloquant ici (T1) :** les tokens sont générés en `base64url` (`A–Z a–z 0–9 - _`), donc **sensibles à la casse**. Sur MariaDB, la collation par défaut d'une colonne `varchar` est `*_general_ci` / `*_unicode_ci` (**insensible à la casse**). Conséquences si on ouvre l'endpoint public tel quel :
- Un `WHERE token = :x` matcherait un token à la casse près → un visiteur avec un token de mauvaise casse pourrait accéder au contenu (fuite d'autorisation).
- L'`UNIQUE INDEX` sur `token` refuserait deux tokens ne différant que par la casse → échec rare mais réel de génération.

→ **T1 corrige la collation en binaire avant d'exposer le lookup public.**

---

## Tâches / Sous-tâches

### T1 — Migration : collation binaire de `PublicToken.token` (AC: AC6 ; point déféré 6.2)

- [x] Créer une nouvelle migration TypeORM `backend/src/migrations/<timestamp>-PublicTokenTokenBinaryCollation.ts`
  - [x] `up()` : `ALTER TABLE \`PublicToken\` MODIFY \`token\` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;`
  - [x] `down()` : rétablir la collation par défaut de la table (`... COLLATE utf8mb4_general_ci NOT NULL;`)
  - [x] L'`UNIQUE INDEX IDX_e16268952e955fdb005640949e` sur `token` existe déjà (migration 6.1) — un `MODIFY` de colonne le préserve, **ne pas le dropper/recréer**.
- [x] Modifier `backend/src/sharing/public-token.entity.ts` : ajouter `collation: 'utf8mb4_bin'` sur le `@Column` de `token` pour que le schéma reste cohérent et qu'un futur `migration:generate` ne re-détecte pas de drift.
  ```typescript
  @Column({ type: 'varchar', length: 255, unique: true, collation: 'utf8mb4_bin' })
  token!: string;
  ```
- [x] Suivre le pattern des migrations existantes (classe `implements MigrationInterface`, `name = '...<timestamp>'`, `queryRunner.query(...)`). Le timestamp doit être **postérieur** à `1781894312446` (migration 6.1).

> ⚠️ **Ne pas modifier la migration 6.1** (`1781894312446-CreatePublicToken.ts`) — les migrations appliquées sont immuables. La correction passe par une **nouvelle** migration.

### T2 — Projection publique sanitisée (AC: AC6)

- [x] Créer `backend/src/sharing/dto/public-recipe.view.ts` — interface décrivant **exactement** ce qui est exposé publiquement (rien de plus) :
  ```typescript
  export interface PublicRecipeIngredientView {
    quantity: number;
    unit: string | null;
    name: string;
    position: number;
  }

  export interface PublicRecipeStepView {
    content: string;
    position: number;
  }

  export interface PublicRecipeView {
    title: string;
    avantPropos: string | null;
    imageUrl: string | null;
    servings: number;
    ingredients: PublicRecipeIngredientView[];
    steps: PublicRecipeStepView[];
  }
  ```
- [x] **Interdits d'exposition** (fuite d'isolation — PRD NFR Sécurité) : `id`, `userId`, `categoryId`, `category`, `user`, `createdAt`, `updatedAt`, `recipeId` des sous-entités. La projection est construite **explicitement champ par champ** — ne PAS renvoyer l'entité `Recipe` brute.

### T3 — `SharingService.findPublicRecipe(token)` (AC: AC6)

- [x] Modifier `backend/src/sharing/sharing.service.ts` — ajouter une méthode publique de résolution de token :
  - [x] Charger le token par correspondance exacte : `this.repo.findOne({ where: { token } })`
  - [x] Valider : token existant **ET** `revokedAt === null` **ET** (`expiresAt === null` **OU** `expiresAt > now`). Sinon → `throw new NotFoundException()` (message générique, non révélateur).
  - [x] Si `resourceType !== 'recipe'` → `throw new NotFoundException()` (défensif : aucun token `'note'` ne peut exister aujourd'hui, mais ne pas tenter de résoudre autre chose qu'une recette).
  - [x] Charger la recette : `this.recipeRepo.findOne({ where: { id: token.resourceId }, relations: ['ingredients', 'steps'] })`. Si absente → `throw new NotFoundException()` (défensif ; en pratique la 6.2 T4 nettoie les tokens orphelins à la suppression d'une recette, donc ce cas ne devrait pas survenir).
  - [x] Trier `ingredients` et `steps` par `position` (même tri que `RecipesService.findOne`).
  - [x] Retourner la **projection `PublicRecipeView`** construite explicitement (cf. T2) — **jamais** l'entité brute.
  - [x] **Ne PAS charger la relation `category` ni `user`** (inutile et évite toute fuite).

  ```typescript
  // Ajout dans sharing.service.ts
  async findPublicRecipe(token: string): Promise<PublicRecipeView> {
    const record = await this.repo.findOne({ where: { token } });
    const now = new Date();
    const isValid =
      record !== null &&
      record.revokedAt === null &&
      (record.expiresAt === null || record.expiresAt > now);
    if (!record || !isValid || record.resourceType !== 'recipe') {
      throw new NotFoundException();
    }

    const recipe = await this.recipeRepo.findOne({
      where: { id: record.resourceId },
      relations: ['ingredients', 'steps'],
    });
    if (!recipe) throw new NotFoundException();

    return {
      title: recipe.title,
      avantPropos: recipe.avantPropos,
      imageUrl: recipe.imageUrl,
      servings: recipe.servings,
      ingredients: (recipe.ingredients ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name, position: i.position })),
      steps: (recipe.steps ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ content: s.content, position: s.position })),
    };
  }
  ```
  > **Décision — `NotFoundException` sans message spécifique pour tous les cas d'échec** : ne pas distinguer « expiré » vs « révoqué » vs « inexistant » côté API (exigence de non-révélation, AC6 + Story 6.4). Le **statut 404 nu** suffit ; le texte affiché au visiteur est géré côté front (minimal ici, poli en 6.4).

### T4 — `PublicSharingController` — nouveau contrôleur **sans guard** (AC: AC6)

- [x] Créer `backend/src/sharing/public-sharing.controller.ts` :
  ```typescript
  import { Controller, Get, Param } from '@nestjs/common';
  import { ApiTags, ApiOperation } from '@nestjs/swagger';
  import { SharingService } from './sharing.service';

  @ApiTags('sharing')
  @Controller('sharing')
  export class PublicSharingController {
    constructor(private readonly sharingService: SharingService) {}

    @Get(':token')
    @ApiOperation({ summary: 'Consulter une ressource partagée publiquement (lecture seule, sans auth)' })
    getPublicResource(@Param('token') token: string) {
      return this.sharingService.findPublicRecipe(token);
    }
  }
  ```
  > **Décision critique — contrôleur SÉPARÉ, pas d'ajout à `SharingController`** : `SharingController` porte `@UseGuards(JwtAuthGuard)` **au niveau de la classe** (s'applique à toutes ses routes). `JwtAuthGuard` est un simple `AuthGuard('jwt')` de `@nestjs/passport` — **il n'implémente aucun bypass `@Public()`**. Il est donc impossible d'exposer une route non authentifiée sur cette classe sans casser le guard des autres. → La route publique vit dans un **contrôleur dédié sans `@UseGuards`**. (Le Dev Note de la 6.2 anticipait « même contrôleur » — cette contrainte du guard de classe l'invalide ; on documente ici la raison.)
  > **Décision — NE PAS mettre `@SkipThrottle()`** : contrairement à `SharingController` (routes authentifiées, `@SkipThrottle()`), l'endpoint public **doit rester rate-limité** par le `ThrottlerGuard` global (`APP_GUARD` dans `app.module.ts`). C'est une défense en profondeur contre l'énumération de tokens (durcissement noté en defer 6.2). Ne rien ajouter : l'absence de `@SkipThrottle` = throttling actif par défaut.
  > **Pas de collision de route** : `GET /api/sharing/:token` (public) vs `GET /api/sharing` (guardé, sans segment) vs `PATCH /api/sharing/:id/revoke` (guardé) — chemins distincts, aucun ordre de déclaration à anticiper même sur deux contrôleurs partageant le préfixe `sharing`.

### T5 — Câblage `SharingModule` (AC: AC6)

- [x] Modifier `backend/src/sharing/sharing.module.ts` : ajouter `PublicSharingController` au tableau `controllers` (à côté de `SharingController`). Aucun autre changement (`Recipe` et `PublicToken` déjà dans `forFeature`, `SharingService` déjà provider).
  ```typescript
  controllers: [SharingController, PublicSharingController],
  ```
- [x] `app.module.ts` : **PAS de modification** (`SharingModule` déjà enregistré depuis la 6.1).

### T6 — Tests backend (AC: AC6)

- [x] Modifier `backend/src/sharing/sharing.service.spec.ts` : ajouter `describe('findPublicRecipe()')` (mocks `Repository<PublicToken>` + `Repository<Recipe>` déjà en place via `getRepositoryToken`) couvrant :
  - token valide `'recipe'` → retourne la projection **sans** `userId`/`categoryId`/`id` (asserter que les clés interdites sont absentes), ingrédients/étapes triés par `position`.
  - token inexistant → `NotFoundException`.
  - token révoqué (`revokedAt` non nul) → `NotFoundException`.
  - token expiré (`expiresAt < now`) → `NotFoundException`.
  - token `permanent` (`expiresAt === null`) valide → OK.
  - token `resourceType: 'note'` → `NotFoundException` (sans appeler `recipeRepo`).
  - token valide mais recette absente (orphelin) → `NotFoundException`.
- [x] Créer `backend/src/sharing/public-sharing.controller.spec.ts` (pattern `sharing.controller.spec.ts`, mock `SharingService`) : vérifie que `getPublicResource(token)` délègue à `sharingService.findPublicRecipe(token)`.

### T7 — Frontend : `SharingService.getPublicRecipe(token)` (AC: AC1, AC2)

- [x] Modifier `frontend/src/app/shared/services/sharing.service.ts` :
  - [x] Ajouter les interfaces publiques (miroir de T2) :
    ```typescript
    export interface PublicRecipeIngredient {
      quantity: number;
      unit: string | null;
      name: string;
      position: number;
    }
    export interface PublicRecipeStep {
      content: string;
      position: number;
    }
    export interface PublicRecipeView {
      title: string;
      avantPropos: string | null;
      imageUrl: string | null;
      servings: number;
      ingredients: PublicRecipeIngredient[];
      steps: PublicRecipeStep[];
    }
    ```
  - [x] Ajouter la méthode :
    ```typescript
    getPublicRecipe(token: string): Observable<PublicRecipeView> {
      return this.http.get<PublicRecipeView>(`/api/sharing/${encodeURIComponent(token)}`);
    }
    ```
  > **Note interceptors** : les 3 interceptors (`credentials`, `csrf`, `auth-error`) s'appliquent aussi à cet appel — c'est **sans effet néfaste** : `auth-error.interceptor` n'agit que sur les **401** (pas les 404), donc un token invalide (→ 404) ne déclenche **pas** de tentative de refresh ni de redirection vers `/login`. `credentials`/`csrf` ajoutent `withCredentials` + `X-Requested-With`, inoffensifs sur un GET public.
  >
  > ⚠️ **CORRECTION post-review (2026-07-13)** — cette note était **incomplète** : elle ne raisonnait que sur l'appel `GET /api/sharing/:token` (404). Mais au **bootstrap de l'app**, l'`APP_INITIALIZER` (`initializeAuth`) appelle `authService.me()` (`GET /api/auth/me`) sur *toute* page, y compris `/share/:token`. Pour un visiteur non authentifié, ce `me()` renvoie **401** → `auth-error.interceptor` tente un refresh (échec) → **`router.navigate(['/login'])`**. Résultat : tout lien public redirigeait vers `/login`, cassant la fonctionnalité. **Correctif** : `auth-error.interceptor.ts` passe désormais en *pass-through* (401 propagé, ni refresh ni redirection) sur les routes publiques (`PUBLIC_ROUTE_PREFIXES = ['/share']`, testé via `document.location.pathname` — fiable au bootstrap contrairement à `router.url`). Extensible au partage de notes (8.6).

### T8 — `ShareViewComponent` : vue publique fonctionnelle (AC: AC1–AC5)

- [x] Réécrire `frontend/src/app/share/components/share-view/share-view.component.ts` (remplacer le stub) — composant standalone `OnPush`, template inline **ou** fichiers séparés `.html`/`.scss` (préférer fichiers séparés vu la taille) :
  - [x] Lire le token depuis la route : `inject(ActivatedRoute).snapshot.paramMap.get('token')`.
  - [x] États via signals : `isLoading` / `recipe: signal<PublicRecipeView | null>` / `hasError: signal<boolean>` / `currentServings`.
  - [x] `ngOnInit` : appeler `sharingService.getPublicRecipe(token)` ; `next` → set recipe + `currentServings.set(recipe.servings)` ; `error` → `hasError.set(true)` (état d'erreur **minimal**, cf. périmètre — raffiné en 6.4).
  - [x] `computedIngredients` : **même computed** que `RecipeDetailComponent` (`quantity * servings / recipe.servings`).
  - [x] `onServingsChange(v)` → `currentServings.set(v)`.
  - [x] **Conserver** l'ajout du meta `robots=noindex` (constructeur) + son retrait dans `ngOnDestroy` — déjà présent dans le stub.
  - [x] **Thème clair forcé (AC5)** : injecter `DOCUMENT` et `ThemeService`.
    - `ngOnInit`/constructeur : `this.doc.body.classList.remove('dark-theme')`.
    - `ngOnDestroy` : restaurer l'état stocké → `this.doc.body.classList.toggle('dark-theme', this.themeService.isDark())`.
    > **Pourquoi** : le thème est piloté par la classe `dark-theme` sur `<body>` (cf. `ThemeService.applyTheme`). `ThemeService` (root, instancié au bootstrap) applique `dark-theme` si `localStorage.theme === 'dark'` — ce qui arriverait si le visiteur est aussi l'auteur sur le même navigateur. On force donc le retrait pour la durée de la vue, puis on restaure via `themeService.isDark()` (source de vérité de la préférence). Ne PAS toucher à `ThemeService`.
  - [x] Réutiliser directement (imports standalone) :
    - `ConvivesSteppperComponent` depuis `../../../recipes/recipe-detail/convives-steppper.component`
    - `MarkdownLightPipe` depuis `../../../recipes/recipe-detail/markdown-light.pipe`
    - `DecimalPipe` (`@angular/common`) pour le format `'1.0-2':'fr'` des quantités.
    > **Décision — import direct depuis `recipes/recipe-detail/`** (plutôt que déplacer `ConvivesSteppperComponent`/`MarkdownLightPipe` vers `shared/`) : ce sont des **standalone** autonomes (le stepper n'importe que `MatButton`/`MatIcon` ; le pipe est pur, zéro dépendance) — les importer ne tire **pas** `RecipeDetailComponent` ni le `RecipesModule` dans le chunk lazy `share`. Un déplacement vers `shared/` serait un refactor hors périmètre touchant `recipe-detail.component.ts`. Rester sur l'import direct.
- [x] Créer `frontend/src/app/share/components/share-view/share-view.component.html` :
  - **Mini top bar** (AC1) : `<header>` fixe/simple contenant uniquement le nom « Dashboard » (texte + éventuellement l'icône app), **sans** `routerLink`, **sans** bouton retour, **sans** bottom nav.
  - État `isLoading()` : `mat-spinner` (pattern `recipe-detail.component.html`).
  - État `hasError()` : bloc neutre minimal — titre sobre « Ce lien n'est plus disponible » (aucune info sur l'instance). *(Périmètre 6.3 minimal ; la page 6.4 remplacera/enrichira ce bloc.)*
  - État `recipe()` : structure **miroir read-only** de `recipe-detail.component.html`, **sans** les boutons d'action (share/edit/delete/back) :
    1. `<h1>` titre.
    2. Image conditionnelle (`@if (recipe()!.imageUrl)`).
    3. Section « Avant-propos » conditionnelle (`@if (recipe()!.avantPropos)`, `[innerHTML]="recipe()!.avantPropos | markdownLight"`) — **entre l'image et le stepper** (AC4).
    4. Section Ingrédients : header avec `<app-convives-steppper [value]="currentServings()" [min]="1" [compact]="true" (valueChange)="onServingsChange($event)">`, liste `computedIngredients()` (quantité `| number:'1.0-2':'fr'`, unit, name). `track $index` (la projection publique n'expose pas d'`id`).
    5. Section Étapes : `<ol>` sur `recipe()!.steps`, `[innerHTML]="step.content | markdownLight"`. `track $index`.
- [x] Créer `frontend/src/app/share/components/share-view/share-view.component.scss` (T9).
- [x] `share.routes.ts` : **inchangé** — `{ path: ':token', component: ShareViewComponent }` existe déjà et pointe la bonne classe.

### T9 — Styles vue publique (AC: AC1)

- [x] `share-view.component.scss` : styliser la mini top bar (hauteur ~`56px`, cohérente avec les tokens `--mat-sys-*` / `--color-*`, cf. architecture §Tokens), la mise en page lecture (mobile-first — les visiteurs reçoivent le lien sur mobile, cf. UX « Vues publiques : Mobile-first »). Réutiliser au maximum les patterns visuels de `recipe-detail.component.scss` (sections, listes ingrédients/étapes) pour la cohérence, sans dupliquer inutilement. Respecter le thème clair (ne pas coder de couleurs en dur qui casseraient les tokens Material).

### T10 — Tests frontend (AC: AC1–AC5)

- [x] Modifier `frontend/src/app/shared/services/sharing.service.spec.ts` : ajouter un test `getPublicRecipe` (via `HttpTestingController` — pattern existant du fichier) vérifiant l'appel `GET /api/sharing/<token>` et le mapping de la réponse.
- [x] Créer `frontend/src/app/share/components/share-view/share-view.component.spec.ts` (framework de test frontend du projet = **Jest via `ng test --no-watch`**, cf. conventions projet ; suivre le pattern d'un `*.component.spec.ts` existant du repo) :
  - mock `SharingService.getPublicRecipe` → recette → assert affichage titre + rendu ingrédients ; `computedIngredients` recalcule bien quand `currentServings` change (AC2).
  - avant-propos présent → section rendue ; absent → non rendue (AC4).
  - erreur (`getPublicRecipe` throw 404) → `hasError()` vrai, message neutre affiché.
  - AC5 : `document.body` n'a **pas** la classe `dark-theme` après init même si `ThemeService.isDark()` est `true` au départ (mock ThemeService) ; restauration à `ngOnDestroy`.
  - AC3 : meta `robots=noindex` ajouté (mock/spy `Meta`).

### T11 — Test E2E (AC: AC1, AC2, AC6)

- [x] Créer `e2e/tests/recipes-public-share.spec.ts` (pattern `recipes-share.spec.ts` : `loginAdmin`, `createTestRecipe` via `page.request.post('/api/recipes', ...)`, `deleteTestRecipe`) :
  - Créer une recette (avec ≥1 ingrédient et `servings` connu), générer un token via `POST /api/sharing` (`page.request.post`), récupérer le token.
  - Ouvrir `/share/<token>` **dans un contexte non authentifié** (nouveau `browser.newContext()` sans cookies, ou `page.context().clearCookies()` avant `goto`) — vérifier que le titre de la recette s'affiche **et** qu'aucun élément de navigation privée (bottom nav / top bar app) n'est présent (AC1).
  - Actionner le stepper convives → vérifier qu'une quantité d'ingrédient change (AC2).
  - Vérifier qu'un token bidon (`/share/xxxx`) affiche l'état neutre et **pas** la recette, et que `GET /api/sharing/xxxx` répond **404** (`page.request.get`, AC6).
  - Nettoyer la recette en fin de test.
  > Ne pas asserter le presse-papier (pas de permissions clipboard configurées, cf. 6.2 T10). Les tests E2E ne tournent pas dans cet environnement (stack non démarrée, `E2E_ADMIN_*` absents) — écrire le test conforme au pattern et le valider via `playwright test --list`.

---

## Dev Notes

### Contexte hérité — état de l'infra de partage après 6.1 et 6.2

| Livré | Où |
|-------|-----|
| Entité `PublicToken` (token, resourceType, resourceId, userId, expiresAt, createdAt, revokedAt) + FK `userId` CASCADE | `backend/src/sharing/public-token.entity.ts`, migration `1781894312446` |
| `SharingService` : `create` / `revoke` / `findActiveForResource` | `backend/src/sharing/sharing.service.ts` |
| `SharingController` **guardé** (`@UseGuards(JwtAuthGuard) @SkipThrottle()`) : `POST` / `PATCH :id/revoke` / `GET` | `backend/src/sharing/sharing.controller.ts` |
| Nettoyage transactionnel des tokens orphelins à la suppression d'une recette | `RecipesService.remove()` |
| Frontend `SharingService` + `ShareLinkDialog` + badge « Partagé » | `frontend/src/app/shared/...`, `recipe-detail.component.*` |
| Stub `ShareViewComponent` (`noindex` déjà posé) + route `/share/:token` | `frontend/src/app/share/...` |

**Cette story consomme l'entité `PublicToken` en lecture publique** — elle n'ajoute ni ne modifie la logique de génération/révocation (6.2).

### Sécurité — invariants à respecter (PRD NFR Sécurité, architecture §Auth)

- **Aucun `JwtAuthGuard`** sur le contrôleur public (AC6) — mais **throttling conservé** (ThrottlerGuard global).
- **Zéro fuite d'isolation** : la projection `PublicRecipeView` (T2) est le **seul** contrat exposé ; ne jamais renvoyer l'entité `Recipe` brute (elle porte `userId`, `categoryId`, relations `user`). Un visiteur ne doit rien apprendre sur le compte propriétaire ni sur les autres recettes.
- **404 neutre** pour tout token invalide/expiré/révoqué (pas de distinction de cause côté API) — cohérent avec l'exigence de non-révélation de la Story 6.4.
- **Token sensible à la casse** : garanti par la collation binaire (T1). Sans T1, l'endpoint public est une faille — T1 est un **prérequis dur** de T3/T4.

### Rappel vue détail authentifiée (source du miroir)

`recipe-detail.component.html` (déjà lu) : ordre header → image → section avant-propos (`markdownLight`) → body (ingrédients avec `convives-steppper` + `computedIngredients`, étapes `markdownLight`). La vue publique reprend **le corps** (image → avant-propos → ingrédients → étapes) en **retirant tout le header d'actions** et en ajoutant la **mini top bar**. Le `computed` de mise à l'échelle est identique :
```typescript
readonly computedIngredients = computed(() => {
  const recipe = this.recipe();
  const servings = this.currentServings();
  if (!recipe || !servings || !recipe.servings) return [];
  return recipe.ingredients.map((ing) => ({
    ...ing,
    quantity: (ing.quantity * servings) / recipe.servings,
  }));
});
```

### Ce qu'il ne faut PAS faire (hors périmètre)

- ❌ Page d'erreur neutre **polie** (titres « Ce lien a expiré » / « Ce lien n'est plus disponible » finalisés) → **Story 6.4**. Ici : bloc d'erreur **minimal** suffisant.
- ❌ Support `resourceType: 'note'` / résolution de notes → **Story 8.6/8.7** (l'entité `Note` n'existe pas).
- ❌ Modifier `SharingController`, `SharingService.create/revoke/findActiveForResource`, `ShareLinkDialog`, le badge, `recipe-detail.component.*` → intouchés par cette story.
- ❌ Ajouter `@SkipThrottle()` sur le contrôleur public → laisser le throttling actif.
- ❌ Modifier la migration 6.1 ou `app.module.ts`.
- ❌ Déplacer `ConvivesSteppperComponent` / `MarkdownLightPipe` vers `shared/` → import direct suffisant.
- ❌ Exposer `id`/`userId`/`categoryId`/relations dans la projection publique.

---

## Project Structure Notes

**Backend — à CRÉER :**
```
backend/src/migrations/<timestamp>-PublicTokenTokenBinaryCollation.ts
backend/src/sharing/dto/public-recipe.view.ts
backend/src/sharing/public-sharing.controller.ts
backend/src/sharing/public-sharing.controller.spec.ts
```
**Backend — à MODIFIER :**
```
backend/src/sharing/public-token.entity.ts   ← collation: 'utf8mb4_bin' sur token
backend/src/sharing/sharing.service.ts        ← + findPublicRecipe()
backend/src/sharing/sharing.service.spec.ts   ← + describe('findPublicRecipe()')
backend/src/sharing/sharing.module.ts         ← + PublicSharingController dans controllers
```
**`backend/src/app.module.ts` : PAS de modification.**

**Frontend — à CRÉER :**
```
frontend/src/app/share/components/share-view/share-view.component.html
frontend/src/app/share/components/share-view/share-view.component.scss
frontend/src/app/share/components/share-view/share-view.component.spec.ts
e2e/tests/recipes-public-share.spec.ts
```
**Frontend — à MODIFIER :**
```
frontend/src/app/share/components/share-view/share-view.component.ts  ← remplace le stub
frontend/src/app/shared/services/sharing.service.ts                   ← + getPublicRecipe() + interfaces
frontend/src/app/shared/services/sharing.service.spec.ts              ← + test getPublicRecipe
```
**`frontend/src/app/share/share.routes.ts` : PAS de modification** (route `:token` déjà correcte).

---

## Contexte Epic 6 — vue d'ensemble

| Story | Relation avec 6.3 |
|-------|-------------------|
| 6.1 (done) | Entité `PublicToken` + migration. A déféré ici la **collation binaire** du token (T1). |
| 6.2 (done) | Génération/révocation des liens, `ShareLinkDialog`, badge. A anticipé la route publique (à corriger : contrôleur séparé, cf. T4). |
| **6.3 (cette story)** | Endpoint public `GET /api/sharing/:token` (sans guard, throttlé) + vue `/share/:token` lecture seule recette. |
| 6.4 (à venir) | Page d'erreur neutre polie pour tokens invalides/expirés/révoqués (raffine l'état d'erreur minimal de 6.3). |
| 8.6 / 8.7 (à venir) | Réutilisent l'endpoint public et la vue en étendant `resourceType` à `'note'`. |

---

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 6, Story 6.3 (lignes 1307–1336) ; Story 6.4 (frontière) ; Story 6.1 (AC de validation du token)
- `_bmad-output/planning-artifacts/architecture.md#Authentification-Sécurité` — « Tokens partage public : CSPRNG ≥ 128 bits, validation expiration + révocation côté API, routes publiques en lecture seule stricte » ; §Frontières (`/share/:token → ShareModule (lazy, public)`, « `SharingController` : pas de guard auth, accès read-only »)
- `_bmad-output/planning-artifacts/prd.md` — FR35–41, NFR Sécurité (isolation `userId`, lecture seule stricte, non-révélation)
- `_bmad-output/planning-artifacts/ux-design-Dashboard.md` — Parcours J4 (« Vue publique recette, mini top bar uniquement »), « Thème clair = défaut au chargement » (ligne 468), « Isolation des vues publiques » (ligne 36), « Vues publiques : Mobile-first » (ligne 954)
- `_bmad-output/implementation-artifacts/6-2-generation-et-gestion-d-un-lien-de-partage-recettes.md` — Dev Notes (contrôleur, décisions module) + **Review Findings → Deferred** (collation binaire à traiter ici, ligne 717 ; note « route publique dans même contrôleur » à corriger)
- `_bmad-output/implementation-artifacts/6-1-entite-publictoken-migration.md` — entité `PublicToken`, migration initiale
- `backend/src/sharing/sharing.service.ts`, `sharing.controller.ts`, `sharing.module.ts`, `public-token.entity.ts` — état actuel à étendre
- `backend/src/common/guards/jwt-auth.guard.ts` — `AuthGuard('jwt')` simple, **sans bypass public** (justifie le contrôleur séparé T4)
- `backend/src/app.module.ts:57` — `ThrottlerGuard` global (`APP_GUARD`) → throttling par défaut sur l'endpoint public
- `backend/src/recipes/recipes.service.ts:35` (`findOne`, tri par `position`) et `recipes.controller.ts` — pattern de chargement recette (relations, tri)
- `backend/src/migrations/1781894312446-CreatePublicToken.ts` — colonne `token varchar(255)` sans `COLLATE` (à corriger, T1)
- `frontend/src/app/share/components/share-view/share-view.component.ts` — stub à remplacer (garder `noindex`)
- `frontend/src/app/share/share.routes.ts` — route `:token` (inchangée)
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.{ts,html}` — **source du miroir read-only** (structure, `computedIngredients`, sections)
- `frontend/src/app/recipes/recipe-detail/convives-steppper.component.ts` — `@Input value/min/max/compact`, `@Output valueChange` (réutilisé)
- `frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts` — pipe pur, échappe `<>&` puis markdown léger (réutilisé, sûr)
- `frontend/src/app/core/services/theme.service.ts` — `dark-theme` sur `<body>`, `isDark()` (source de vérité pour restaurer AC5)
- `frontend/src/app/core/interceptors/auth-error.interceptor.ts` — n'agit que sur 401 (le 404 public ne déclenche pas de refresh)
- `frontend/src/app/shared/services/sharing.service.ts` — service à étendre (`getPublicRecipe`)
- `e2e/tests/recipes-share.spec.ts` — pattern E2E (login admin, création recette via API, assertions UI)

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Backend : `npx jest` (16 suites, 186 tests) et `npx tsc --noEmit -p tsconfig.build.json` — verts.
- Frontend : `npx ng test --no-watch` (15 fichiers, 149 tests) et `npx ng build` — verts (warnings NG8102/NG8107 et budget bundle pré-existants, non liés à cette story, vérifié par `git stash`).
- E2E : `npx playwright test recipes-public-share --list` — compilation validée (stack non démarrée dans cet environnement, cf. note T11).

### Completion Notes List

- T1 : nouvelle migration `1783966599227-PublicTokenTokenBinaryCollation` (collation binaire `utf8mb4_bin` sur `PublicToken.token`), migration 6.1 non modifiée. Entity mise à jour en cohérence.
- T2–T5 : projection publique `PublicRecipeView` (aucune fuite `id`/`userId`/`categoryId`/relations), `SharingService.findPublicRecipe()` (404 neutre uniforme pour tout cas d'échec), `PublicSharingController` séparé sans guard ni `@SkipThrottle()`, câblé dans `SharingModule`.
- T6 : tests unitaires `findPublicRecipe()` (token valide/inexistant/révoqué/expiré/permanent/`resourceType='note'`/recette orpheline) + assertion explicite d'absence des clés interdites ; test du nouveau contrôleur (délégation).
- T7 : `SharingService.getPublicRecipe()` frontend + interfaces miroir.
- T8–T9 : `ShareViewComponent` réécrit (mini top bar, états loading/error/recipe, thème clair forcé avec restauration à `ngOnDestroy`, réutilisation directe de `ConvivesSteppperComponent`/`MarkdownLightPipe`, meta `noindex` conservé), styles mobile-first alignés sur `recipe-detail.component.scss`.
- T10 : tests service (`getPublicRecipe`) et composant (chargement, recalcul convives AC2, avant-propos conditionnel AC4, état d'erreur, thème forcé/restauré AC5, meta noindex AC3) — 149/149 tests frontend verts.
- T11 : test E2E `recipes-public-share.spec.ts` (contexte non authentifié, affichage sans navigation privée, stepper convives, token invalide → état neutre + 404 API), validé par `playwright test --list` (pas d'exécution réelle, stack non démarrée).
- Nettoyage : `npm run lint` (backend) a reformaté via prettier des fichiers hors périmètre de la story (migrations et module recipes préexistants) ; ces changements de formatage non liés ont été annulés (`git checkout --`) pour garder un diff scopé à la story.

### File List

**Backend — créés :**
- `backend/src/migrations/1783966599227-PublicTokenTokenBinaryCollation.ts`
- `backend/src/sharing/dto/public-recipe.view.ts`
- `backend/src/sharing/public-sharing.controller.ts`
- `backend/src/sharing/public-sharing.controller.spec.ts`

**Backend — modifiés :**
- `backend/src/sharing/public-token.entity.ts`
- `backend/src/sharing/sharing.service.ts`
- `backend/src/sharing/sharing.service.spec.ts`
- `backend/src/sharing/sharing.module.ts`

**Frontend — créés :**
- `frontend/src/app/share/components/share-view/share-view.component.html`
- `frontend/src/app/share/components/share-view/share-view.component.scss`
- `frontend/src/app/share/components/share-view/share-view.component.spec.ts`
- `frontend/src/app/core/interceptors/auth-error.interceptor.spec.ts` _(post-review — correctif redirection lien public)_
- `e2e/tests/recipes-public-share.spec.ts`

**Frontend — modifiés :**
- `frontend/src/app/share/components/share-view/share-view.component.ts`
- `frontend/src/app/shared/services/sharing.service.ts`
- `frontend/src/app/shared/services/sharing.service.spec.ts`
- `frontend/src/app/core/interceptors/auth-error.interceptor.ts` _(post-review — pass-through sur routes publiques `/share`)_

### Change Log

- 2026-07-13 : Implémentation complète de la story 6.3 — endpoint public `GET /api/sharing/:token` (sans guard, throttlé, 404 neutre) + vue publique `/share/:token` lecture seule pour les recettes (mini top bar, stepper convives, avant-propos, thème clair forcé, noindex). Correction du point déféré 6.2 (collation binaire du token). Tests backend (186/186), frontend (149/149) et E2E (compilation validée) verts.
- 2026-07-13 (revue de code) : 2 patches appliqués — en-têtes `X-Robots-Tag: noindex` + `Cache-Control: private, no-store` sur `PublicSharingController` (+ test) ; assertion E2E AC1 renforcée (`app-top-bar` + href réels au lieu de `a[routerLink]`). 3 findings différés (→ `deferred-work.md`), 12 écartés.
- 2026-07-13 (post-review, bug signalé en test manuel) : **correction redirection `/login` sur les liens publics**. L'appel `me()` de bootstrap (401 pour un visiteur) faisait rediriger `auth-error.interceptor` vers `/login` sur toute page, `/share/:token` inclus. Correctif : pass-through de l'intercepteur sur les routes publiques (`/share`), lu via `document.location.pathname`. Nouveau spec `auth-error.interceptor.spec.ts` (2 tests). Suite frontend : 151/151 verte.
- 2026-07-13 (post-review, retour visuel) : **suppression de la mini top bar propre à la vue publique** (`.share-top-bar`). Le shell applicatif (`app.html`) monte déjà `<app-top-bar>` sur toute route, y compris `/share` : pour un visiteur elle affiche l'identité « Dashboard » + le switch de thème, **sans** navigation privée (nav et menu utilisateur gated par `currentUser()`). Avoir en plus la mini top bar de `ShareViewComponent` faisait doublon → on garde la top bar applicative (qui satisfait l'identité AC1 et permet le switch de thème) et on retire le `<header class="share-top-bar">` + ses styles. **Révision AC1** : « mini top bar » ⇒ **top bar applicative** (mêmes garanties : identité visible, aucune nav interne exposée au visiteur). Assertions E2E AC1 corrigées en conséquence (`app-top-bar` visible mais `.desktop-nav`/menu utilisateur absents, `app-bottom-nav` masquée sur desktop) — les précédentes `toHaveCount(0)` sur `app-top-bar`/`app-bottom-nav` étaient factuellement fausses (éléments toujours dans le DOM). Suite frontend : 151/151 verte.
  - **Décision produit (validée Manu) — assouplissement AC5** : la top bar applicative expose le switch de thème sur les pages publiques ; le visiteur PEUT donc basculer en sombre. Comportement **voulu et non gênant**. AC5 est conservé au sens « **thème clair par défaut au chargement** » (le composant retire `dark-theme` à l'init et restaure la préférence à la destruction), mais le « forçage » n'est plus permanent pendant la consultation. Ne PAS re-signaler comme violation d'AC5.

---

## Review Findings

_Revue de code adversariale (Blind Hunter + Edge Case Hunter + Acceptance Auditor, Opus 4.8) — 2026-07-13. Audit d'acceptation : aucune violation matérielle des AC1–AC6 ni des contraintes dures (pas de guard, pas de `@SkipThrottle`, zéro fuite d'isolation, 404 neutre, collation binaire, thème clair forcé, noindex). 12 findings écartés (faux positifs / non atteignables / hors périmètre spec)._

- [x] [Review][Decision→Patch] Anti-indexation seulement côté client — l'endpoint API `GET /api/sharing/:token` renvoyait le JSON de la recette sans en-tête `X-Robots-Tag: noindex` ni `Cache-Control: private, no-store`. **Corrigé** : ajout des décorateurs `@Header('X-Robots-Tag', 'noindex')` et `@Header('Cache-Control', 'private, no-store')` sur `PublicSharingController.getPublicResource` + test unitaire d'assertion des métadonnées [backend/src/sharing/public-sharing.controller.ts]

- [x] [Review][Patch] Assertion E2E AC1 `locator('a[routerLink]').toHaveCount(0)` inefficace (Angular ne rend pas d'attribut `routerlink` au runtime). **Corrigé** : remplacée par `app-top-bar` count 0 + `.share-view a[href^="/"]` count 0 (href réels), en plus du check `app-bottom-nav` [e2e/tests/recipes-public-share.spec.ts:63]

- [x] [Review][Bug] **Lien public redirigé vers `/login`** (signalé en test manuel, hors diff initial) — l'appel `me()` de bootstrap (`APP_INITIALIZER`) renvoie 401 pour un visiteur ; `auth-error.interceptor` déclenchait alors refresh + `navigate(['/login'])` sur toute page, y compris `/share/:token`. **Corrigé** : pass-through de l'intercepteur sur les routes publiques (`/share`) + spec dédié `auth-error.interceptor.spec.ts` (2 tests). Cf. correction de la note interceptors en T7 [frontend/src/app/core/interceptors/auth-error.interceptor.ts]

- [x] [Review][Defer] État d'erreur non différencié : tout échec (5xx/429/réseau) affiche « Ce lien n'est plus disponible » comme un lien révoqué/expiré [frontend/src/app/share/components/share-view/share-view.component.ts:78] — deferred, page d'erreur polie et différenciée = **Story 6.4** (périmètre explicite : état minimal en 6.3)

- [x] [Review][Defer] `GET /api/sharing/:token` (public) est un catch-all mono-segment sous `/sharing` — une future route GET authentifiée mono-segment (`/sharing/stats`, `/sharing/export`) serait capturée par le contrôleur public [backend/src/sharing/public-sharing.controller.ts:112] — deferred, aucune collision actuelle (documenté T4) ; piège de maintenabilité à surveiller

- [x] [Review][Defer] `servings === 0` (colonne `int` non-nullable, défaut 4) rend une liste d'ingrédients vide et non récupérable (le garde `!recipe.servings` reste faux) [frontend/src/app/share/components/share-view/share-view.component.ts:50] — deferred, reproduit à l'identique le garde pré-existant de la vue détail authentifiée (`recipe-detail.component.ts`)
