---
baseline_commit: abb77c66066bf29ab49cd16cb108b4323d8b910c
---

# Story 7.2 : Endpoint de vérification de connectivité Trilium

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'**utilisateur authentifié**,
Je veux **pouvoir tester que l'URL de mon instance Trilium est accessible depuis le serveur Dashboard**,
Afin de **valider ma configuration avant d'utiliser le module Notes**.

> **Contexte Épic 7 (pivot 2026-06-18) :** L'Épic 7 intègre Trilium Notes via une **iframe**. La story 7.1 (done) a posé les fondations : colonnes `triliumUrl`/`notesEnabled` sur `User`, endpoints `GET/PATCH /api/users/me/notes-settings`, page `/settings` avec `NotesSettingsComponent`, navigation conditionnelle. **Cette story 7.2** ajoute un **nouveau module backend `TriliumModule`** exposant `GET /api/trilium/ping` (test de connectivité côté serveur) et un **bouton « Tester la connexion »** dans `NotesSettingsComponent`. La story 7.3 (backlog) ajoutera l'onglet Notes avec l'iframe. **Ne pas** implémenter l'iframe ni de guard `/notes` ici.

## Acceptance Criteria

**AC1 — Requête HEAD côté serveur avec timeout 5s**
**Étant donné** que j'ai saisi une URL dans `/settings` et que je clique « Tester la connexion »,
**Quand** `GET /api/trilium/ping?url=<encodedUrl>` est appelé,
**Alors** le backend effectue une requête **HEAD** HTTP sur l'URL fournie avec un **timeout de 5 secondes**.

**AC2 — Instance accessible**
**Étant donné** que l'instance Trilium répond (**code HTTP quelconque** reçu — 2xx, 3xx, 4xx ou 5xx),
**Quand** le résultat revient,
**Alors** le backend retourne `{ reachable: true }` et le frontend affiche une **icône ✓ verte** avec le message « Instance accessible ».

**AC3 — Instance inaccessible**
**Étant donné** que l'URL ne répond pas (**timeout, DNS invalide, connexion refusée**),
**Quand** le résultat revient,
**Alors** le backend retourne `{ reachable: false, reason: <string> }` et le frontend affiche une **icône ✗ rouge** avec le message « Instance inaccessible — vérifiez l'URL ».

**AC4 — Validation anti-SSRF (schéma http/https obligatoire)**
**Étant donné** que l'URL fournie n'est pas une URL HTTP/HTTPS valide (URL malformée, `url` absent, ou schéma ≠ `http:`/`https:`),
**Quand** le backend valide le paramètre,
**Alors** il retourne **400 Bad Request** (aucune requête sortante n'est effectuée).

**AC5 — Authentification requise**
**Étant donné** que l'endpoint est appelé sans JWT valide,
**Quand** la requête arrive,
**Alors** le backend retourne **401 Unauthorized** (via `JwtAuthGuard`).

### Scénarios de test

- Backend (unit) : URL valide accessible → `{ reachable: true }` ; URL injoignable → `{ reachable: false, reason }` ; `ftp://...` / URL malformée / `url` manquant → 400 ; HEAD renvoyant 404/500 → `{ reachable: true }` (une réponse reçue = accessible).
- Frontend (unit) : clic « Tester » avec réponse `reachable:true` → état ✓ vert ; `reachable:false` (ou erreur HTTP) → état ✗ rouge ; bouton désactivé si URL vide.
- E2E (best-effort, optionnel) : dans `/settings`, saisir une URL bidon (`https://trilium.invalid.test`) → cliquer « Tester » → vérifier le message rouge « Instance inaccessible ».

---

## Tasks / Subtasks

- [x] **Task 1 — Backend : créer le `TriliumModule` (service + validation anti-SSRF + HEAD)** (AC: #1, #2, #3, #4)
  - [x] Créer le dossier `backend/src/trilium/` avec 4 fichiers (arborescence imposée par l'architecture, cf. Dev Notes) : `trilium.module.ts`, `trilium.controller.ts`, `trilium.service.ts`, `trilium.controller.spec.ts` (+ `trilium.service.spec.ts` recommandé).
  - [x] `trilium.service.ts` — méthode `async ping(url: string): Promise<{ reachable: boolean; reason?: string }>` :
    - Utiliser **`fetch` natif + `AbortController`** avec `setTimeout(() => controller.abort(), 5000)` dans un `try/finally` (`clearTimeout`). **⚠️ NE PAS** ajouter `@nestjs/axios` ni `axios` : le projet n'utilise PAS de client HTTP tiers. Copier **exactement** le pattern de `backend/src/og-fetch/og-fetch.service.ts` (AbortController, `redirect: 'follow'`, `Logger.warn` sur erreur).
    - Requête `fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' })`.
    - **Toute réponse HTTP reçue** (quel que soit le status, `response.ok` inclus ou non) ⇒ `{ reachable: true }`. Ne PAS filtrer sur `response.ok` (AC2 : « code HTTP quelconque »).
    - `catch` (timeout/DNS/refus) ⇒ `logger.warn(...)` + `{ reachable: false, reason: String(err) }` (ex. `'AbortError'`, `'fetch failed'`). Ne jamais propager l'exception.
  - [x] `trilium.controller.ts` — `@Controller('trilium')` + `@UseGuards(JwtAuthGuard)` + `@SkipThrottle()` au niveau classe (pattern `LinksController`), MAIS re-activer un throttle **anti-abus** sur le ping (requête sortante) : `@SkipThrottle({ default: false })` + `@Throttle({ default: { limit: 15, ttl: 60000 } })` — **copier exactement** le pattern de `fetchOgPreview` dans `links.controller.ts:36-54`.
    - `@Get('ping')` `ping(@Query('url') url: string)` : **valider AVANT tout appel réseau** (réutiliser la logique exacte de `fetchOgPreview`) :
      - `if (!url) throw new BadRequestException('URL requise');`
      - `try { parsed = new URL(url); } catch { throw new BadRequestException('URL invalide'); }`
      - `if (!['http:', 'https:'].includes(parsed.protocol)) throw new BadRequestException('Seuls les protocoles http et https sont autorisés');`
      - puis `return this.triliumService.ping(url);`
    - Ajouter `@ApiTags('trilium')` + `@ApiOperation({ summary: "Tester la connectivité d'une instance Trilium" })` (cohérence Swagger).
  - [x] `trilium.module.ts` — `@Module({ controllers: [TriliumController], providers: [TriliumService] })`.
  - [x] Enregistrer `TriliumModule` dans `backend/src/app.module.ts` (ajouter à la liste `imports`, après `SharingModule`).
- [x] **Task 2 — Backend : tests unitaires** (AC: #2, #3, #4)
  - [x] `trilium.service.spec.ts` : mock de `globalThis.fetch` (pattern **identique** à `og-fetch.service.spec.ts:5-14`). Cas : réponse résolue (n'importe quel status) → `{ reachable: true }` ; `mockRejectedValue(new Error('network error'))` → `{ reachable: false, reason: ... }`.
  - [x] `trilium.controller.spec.ts` : service mocké via `useValue`. Cas : URL http valide → délègue à `service.ping` ; `ftp://x` → `BadRequestException` ; `url` vide/absent → `BadRequestException` ; URL malformée (`'not a url'`) → `BadRequestException`. Vérifier que le service **n'est PAS appelé** quand la validation échoue.
- [x] **Task 3 — Frontend : service d'appel ping** (AC: #2, #3)
  - [x] Créer `frontend/src/app/settings/notes-settings/trilium.service.ts` : `@Injectable({ providedIn: 'root' })`, injecte `HttpClient`, méthode `ping(url: string): Observable<{ reachable: boolean; reason?: string }>` → `this.http.get<...>('/api/trilium/ping', { params: { url } })`. Pattern **identique** à `links.service.ts:68` (`this.http.get<OgPreview>('/api/links/og-preview', { params: { url } })`). URLs relatives `/api/...` (pas d'`environment.apiUrl` dans ce projet).
  - [x] Créer `frontend/src/app/settings/notes-settings/trilium.service.spec.ts` (pattern `links.service.spec.ts` : `HttpTestingController`, `expectOne`).
- [x] **Task 4 — Frontend : bouton « Tester la connexion » dans `NotesSettingsComponent`** (AC: #1, #2, #3)
  - [x] `notes-settings.component.ts` : injecter le nouveau `TriliumService`. Ajouter deux signals d'état : `readonly isTesting = signal(false)` et `readonly testResult = signal<'success' | 'error' | null>(null)`.
  - [x] Méthode `onTest(): void` : lire `form.controls.triliumUrl.value?.trim()` ; si vide → return (bouton déjà désactivé). Mettre `isTesting=true`, `testResult=null` ; appeler `triliumService.ping(url)` avec `takeUntilDestroyed(this.destroyRef)` + `finalize(() => isTesting.set(false))` ; `next: (res) => testResult.set(res.reachable ? 'success' : 'error')` ; `error: () => testResult.set('error')`.
  - [x] Réinitialiser `testResult` à `null` quand l'URL change (le résultat d'un ancien test ne doit pas rester affiché après édition). Ex. `valueChanges` sur `triliumUrl` (avec `takeUntilDestroyed`) → `testResult.set(null)`.
  - [x] `notes-settings.component.ts` : importer `MatIconModule` dans le tableau `imports` (l'icône ✓/✗ ; vérifier qu'il n'est pas déjà présent). `MatProgressSpinnerModule` déjà importé (réutiliser pour le spinner du bouton test).
  - [x] `notes-settings.component.html` : à l'intérieur du bloc `@if (form.controls.notesEnabled.value) { ... }` (après le `mat-form-field` URL), ajouter :
    - un `<button mat-stroked-button type="button" (click)="onTest()" [disabled]="!form.controls.triliumUrl.value || isTesting()">` avec spinner si `isTesting()` sinon libellé « Tester la connexion » ;
    - un rendu conditionnel du résultat : `@if (testResult() === 'success') { <mat-icon>check_circle</mat-icon> Instance accessible }` (vert) et `@if (testResult() === 'error') { <mat-icon>cancel</mat-icon> Instance inaccessible — vérifiez l'URL }` (rouge).
    - **`type="button"`** obligatoire pour ne PAS déclencher le `(ngSubmit)` du formulaire (sinon la sauvegarde part).
  - [x] `notes-settings.component.scss` : classes `.test-result.success` (couleur success/verte) et `.test-result.error` (couleur error/rouge), alignées sur le design system « Braise Profonde » (utiliser les tokens de thème Material existants, pas de couleurs en dur si possible).
- [x] **Task 5 — Frontend : tests unitaires** (AC: #2, #3)
  - [x] Étendre `notes-settings.component.spec.ts` : mock `TriliumService.ping` → vérifier `testResult() === 'success'` sur `{ reachable: true }`, `=== 'error'` sur `{ reachable: false }` et sur erreur HTTP ; vérifier bouton désactivé si URL vide.
- [x] **Task 6 — E2E (optionnel / best-effort)** (AC: #3)
  - [x] Étendre `e2e/tests/settings.spec.ts` : activer Notes, saisir `https://trilium.invalid.test`, cliquer « Tester la connexion », attendre puis vérifier le message « Instance inaccessible ». **Nettoyer l'état** (`notesEnabled=false`) en fin de test comme le fait déjà `settings.spec.ts`. Si l'environnement bloque le trafic sortant, marquer le test `skip` avec un commentaire plutôt que de le laisser rouge.
- [x] **Task 7 — Vérification finale**
  - [x] Backend : `cd backend && npm run test` (Jest) — verts.
  - [x] Frontend : `cd frontend && ng test --no-watch` — verts.
  - [x] E2E : `npx playwright test` exécuté par Manu le 2026-11-05 — verts.
  - [x] Vérification manuelle AC1–AC4 : effectuée par Manu le 2026-11-05 sur son instance Trilium — OK.

---

## Dev Notes

### Contexte & périmètre
- Story **backend + frontend léger**. Elle ajoute **un seul** appel HTTP sortant côté serveur (HEAD) et un feedback UI. Aucune migration, aucune modification d'entité, aucun changement de navigation.
- Elle s'appuie directement sur les colonnes `triliumUrl`/`notesEnabled` et le `NotesSettingsComponent` posés par la **story 7.1 (done)**. Ne pas re-créer ces éléments.
- **Ne PAS** implémenter l'iframe `/notes`, le guard `notesEnabledGuard`, ni le module frontend `notes/trilium-embed` : c'est la **story 7.3**.

### 🚨 Décision technique critique — client HTTP
- **NE PAS ajouter `@nestjs/axios` ni `axios`.** L'addendum architecture mentionne « `HttpService` (NestJS `@nestjs/axios`) » mais **ces paquets ne sont PAS installés** et le projet utilise **exclusivement `fetch` natif + `AbortController`** pour tout appel sortant. La convention réelle du code prime sur cette phrase de l'architecture. [Source: backend/src/og-fetch/og-fetch.service.ts:12-40 ; backend/package.json (aucune dépendance axios/got/undici)]
- **Réutiliser le pattern `OgFetchService`** : `AbortController` + `setTimeout(abort, 5000)` + `try/catch/finally clearTimeout` + `Logger.warn` sur échec. C'est le « wheel » à réutiliser — ne pas en réinventer un.

### 🚨 Décision technique critique — validation anti-SSRF (basique, volontairement)
- La validation se limite au **schéma http/https** (via `new URL()` + check `protocol`), **exactement** comme `LinksController.fetchOgPreview`. [Source: backend/src/links/links.controller.ts:40-54]
- **Ne PAS bloquer les IP privées / localhost / adresses LAN.** Trilium est **auto-hébergé**, souvent sur le réseau local de Manu (ex. `http://192.168.1.x:8080`, `http://trilium.local`). Un blocage SSRF « avancé » casserait le cas d'usage principal. La contrainte « anti-SSRF basique » de l'architecture = schéma http/https uniquement. [Source: _bmad-output/planning-artifacts/architecture.md#Addendum L1012-L1016]

### Backend — patterns imposés
- **Global prefix `api`** appliqué dans `main.ts` (`app.setGlobalPrefix('api')`). Les décorateurs s'écrivent **sans** `api/` : `@Controller('trilium')` + `@Get('ping')` ⇒ URL réelle `/api/trilium/ping`. [Source: backend/src/main.ts]
- **Guard** : `@UseGuards(JwtAuthGuard)` au niveau **classe** (comme `LinksController`, `RecipesController`). **Ne PAS** utiliser `RolesGuard`/`@Roles` : ce endpoint est accessible à tout utilisateur authentifié, pas seulement aux admins. Le 401 (AC5) est géré automatiquement par `JwtAuthGuard`. [Source: backend/src/links/links.controller.ts:28-29 ; backend/src/common/guards/jwt-auth.guard.ts]
- **Throttle anti-abus** : le contrôleur global porte `@SkipThrottle()` mais un endpoint qui déclenche une requête sortante doit rester limité. Copier `fetchOgPreview` : `@SkipThrottle({ default: false })` + `@Throttle({ default: { limit: 15, ttl: 60000 } })`. [Source: backend/src/links/links.controller.ts:36-37]
- **Validation en premier, avant tout `await fetch`** : réutiliser les 3 gardes de `fetchOgPreview` (url requise → 400, `new URL()` échoue → 400, protocole non http/https → 400). Aucune requête réseau si la validation échoue (AC4). [Source: backend/src/links/links.controller.ts:41-52]
- **Forme de retour** : `{ reachable: boolean; reason?: string }` (conforme architecture L1016). `reachable:true` pour toute réponse HTTP ; `reachable:false` + `reason` sur échec réseau. Ne pas throw depuis le service en cas d'injoignabilité (ce n'est pas une erreur applicative, c'est le résultat métier).
- **Query param** : `@Query('url') url: string` — pas de DTO nécessaire (un seul param string), aligné sur `fetchOgPreview`. [Source: backend/src/links/links.controller.ts:40]

### Backend — enregistrement du module
- `app.module.ts` liste les modules dans `imports` : `UsersModule, AuthModule, LinksModule, RecipesModule, SharingModule`. Ajouter `TriliumModule` à cette liste. [Source: backend/src/app.module.ts:9-54]
- `OgFetchModule` (`providers/exports: [OgFetchService]`) est un bon modèle de module minimal, mais **`TriliumModule` a un controller** → `@Module({ controllers: [TriliumController], providers: [TriliumService] })` (pas besoin d'exporter le service). [Source: backend/src/og-fetch/og-fetch.module.ts]

### Frontend — patterns page/form (réutiliser, ne pas réinventer)
- `NotesSettingsComponent` **existe déjà** (story 7.1) : standalone, `OnPush`, `fb.nonNullable.group({ notesEnabled, triliumUrl })`, `MatSnackBar`, `takeUntilDestroyed` + `finalize`, spinner sur bouton via `isLoading()`. **Étendre** ce composant, ne pas en créer un nouveau. [Source: frontend/src/app/settings/notes-settings/notes-settings.component.ts]
- Le bloc URL est déjà conditionné par `@if (form.controls.notesEnabled.value)` dans le template — placer le bouton test **à l'intérieur** de ce bloc. [Source: frontend/src/app/settings/notes-settings/notes-settings.component.html:6-16]
- **Service HTTP** : le projet fait des GET avec query params via `this.http.get<T>('/api/...', { params: { url } })` (URLs **relatives**, pas de base URL). Copier `LinksService.fetchOgPreview`. [Source: frontend/src/app/links/links.service.ts:68 ; frontend/src/app/core/services/auth.service.ts (tous les appels en `/api/...` relatifs)]
- **`MatIconModule`** : nécessaire pour `check_circle` / `cancel`. Vérifier s'il est déjà dans les imports du composant ; l'ajouter sinon. `MatProgressSpinnerModule` est déjà importé.
- Angular 21 zoneless : signals + `OnPush`, tout standalone, pas de `NgModule`.

### Anti-régressions (ne pas casser)
- Le bouton « Tester » doit être `type="button"` — sinon il déclenche le `(ngSubmit)` du `<form>` (=`onSubmit` → sauvegarde), régression silencieuse. [Source: frontend/src/app/settings/notes-settings/notes-settings.component.html:1,19]
- Ne pas modifier le comportement de sauvegarde existant (`onSubmit` / `updateNotesSettings`) ni la navigation conditionnelle (7.1). Le ping est **indépendant** de la sauvegarde : tester ne sauvegarde pas, sauvegarder ne teste pas.
- Ne pas retirer/renommer les colonnes `triliumUrl`/`notesEnabled` ni les endpoints `me/notes-settings`.
- Vérifier que l'ajout de `TriliumModule` ne casse aucun test existant (`app.module` se compile, 193 tests backend / 164 frontend de la 7.1 restent verts).

### Arborescence cible (architecture — Addendum Épic 7)
```
backend/src/
└── trilium/                              # NEW module
    ├── trilium.module.ts                 # NEW  @Module controllers+providers
    ├── trilium.controller.ts             # NEW  GET /api/trilium/ping?url= (JwtAuthGuard + Throttle + validation)
    ├── trilium.controller.spec.ts        # NEW
    ├── trilium.service.ts                # NEW  fetch HEAD + AbortController 5s
    └── trilium.service.spec.ts           # NEW  (recommandé)
backend/src/app.module.ts                 # UPDATE : + TriliumModule dans imports

frontend/src/app/settings/notes-settings/
    ├── trilium.service.ts                # NEW  ping(url) → GET /api/trilium/ping
    ├── trilium.service.spec.ts           # NEW
    ├── notes-settings.component.ts        # UPDATE : + TriliumService, isTesting/testResult, onTest()
    ├── notes-settings.component.html      # UPDATE : + bouton « Tester » + rendu ✓/✗
    ├── notes-settings.component.scss      # UPDATE : + styles .test-result success/error
    └── notes-settings.component.spec.ts   # UPDATE : + tests ping
e2e/tests/settings.spec.ts                # UPDATE (optionnel) : scénario URL inaccessible
```
[Source: _bmad-output/planning-artifacts/architecture.md#Addendum — Intégration Trilium Notes (Epic 7) L1001-L1016]

### Standards de test
- **Backend (Jest)** : specs co-localisées `*.spec.ts`. Mock `globalThis.fetch = jest.fn()` (pattern `og-fetch.service.spec.ts:5-14`). Controller : service mocké via `useValue`, `Test.createTestingModule`. [Source: backend/src/og-fetch/og-fetch.service.spec.ts ; backend/src/users/users.controller.spec.ts]
- **Frontend** : `ng test --no-watch` (pas d'appel vitest direct). `HttpTestingController` pour `trilium.service.spec.ts` (pattern `links.service.spec.ts:109-111`). Étendre `notes-settings.component.spec.ts` existant. [Source: frontend/src/app/links/links.service.spec.ts]
- **E2E (Playwright)** : specs dans `e2e/tests/`, login via API + parcours UI, sélecteurs `input[formcontrolname=...]` / `page.getByText(...)`, nettoyage en fin de test. `settings.spec.ts` existe déjà (7.1) — l'étendre. ⚠️ Le rate-limiter global peut bloquer les reload en E2E : la CI utilise `THROTTLER_LIMIT=100` (`.github/workflows/ci.yml`) ; en local, ajuster temporairement si besoin. [Source: e2e/tests/settings.spec.ts ; _bmad-output/implementation-artifacts/7-1-page-parametres-et-configuration-notes.md#Debug Log]

### Note de déploiement (rappel, hors périmètre 7.2)
- L'embedding iframe (7.3) nécessitera `Content-Security-Policy: frame-ancestors 'self' https://dashboard.monserveur.fr` côté Trilium. **Sans impact sur 7.2** (le HEAD serveur→Trilium n'est pas soumis à la CSP frame-ancestors). Noté pour continuité. [Source: _bmad-output/planning-artifacts/architecture.md#Addendum L1052-L1060]

### Project Structure Notes
- Monorepo `backend/` (NestJS 11) + `frontend/` (Angular 21 zoneless) + `e2e/` (Playwright). Pas de dossier `apps/`.
- L'arborescence `backend/src/trilium/` et le service frontend `settings/notes-settings/trilium.service.ts` sont **alignés** avec l'Addendum architecture Épic 7. Aucun conflit de structure détecté.

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.2 : Endpoint de vérification de connectivité Trilium L1404-L1432]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7 : Module Notes — Intégration Trilium L1359-L1363]
- [Source: _bmad-output/planning-artifacts/architecture.md#Addendum — Intégration Trilium Notes (Epic 7) L1001-L1016, L1052-L1060]
- [Source: _bmad-output/implementation-artifacts/7-1-page-parametres-et-configuration-notes.md (story fondation Épic 7 — done)]
- [Source: backend/src/og-fetch/og-fetch.service.ts:12-40 (pattern fetch HEAD + AbortController à réutiliser)]
- [Source: backend/src/og-fetch/og-fetch.service.spec.ts:5-14 (pattern mock fetch)]
- [Source: backend/src/og-fetch/og-fetch.module.ts (pattern module minimal)]
- [Source: backend/src/links/links.controller.ts:28-54 (JwtAuthGuard + Throttle + validation URL http/https — pattern de référence 7.2)]
- [Source: backend/src/app.module.ts:9-54 (enregistrement des modules)]
- [Source: backend/src/main.ts (global prefix `api`)]
- [Source: backend/src/common/guards/jwt-auth.guard.ts]
- [Source: frontend/src/app/settings/notes-settings/notes-settings.component.ts + .html + .scss (composant à étendre)]
- [Source: frontend/src/app/links/links.service.ts:68 + links.service.spec.ts:109-111 (GET + query param + test)]
- [Source: e2e/tests/settings.spec.ts (E2E à étendre)]

### Review Findings

_Code review du 2026-07-14 (diff non-commité vs `abb77c6`). 1 decision-needed, 2 patch, 2 defer, 7 dismissed._

- [x] [Review][Decision] ✅ Résolu 2026-11-05 : isolé dans le commit `ee491fd` (`style: prettier`). Fichiers hors périmètre 7-2 groupés dans le diff — le working tree contient du reformatage Prettier non lié à la story (`backend/src/migrations/*` ×4, `backend/src/recipes/*` ×6 dont un `dto as any`→`dto` dans `recipes.controller.spec.ts:262`, `backend/src/users/users.controller*.ts`). La story dit explicitement « aucune migration, aucune modif d'entité ». À décider : commit séparé ou exclusion.
- [x] [Review][Patch] Résultat de test périmé écrase l'état après édition d'URL / double-clic [frontend/src/app/settings/notes-settings/notes-settings.component.ts:68] — `onTest()` n'a que `takeUntilDestroyed` (pas d'annulation par requête). Séquence : clic Test pour URL-A → édition vers URL-B (le `valueChanges` remet `testResult` à `null`) → la réponse d'URL-A arrive et repositionne `testResult`, affichant un verdict vert « accessible » pour une URL qui n'est plus dans le champ. Idem double-clic (dernière réponse gagne). Correctif : capturer l'URL testée et ignorer la réponse si le champ a changé, ou passer par un `switchMap` sur un sujet déclencheur.
- [x] [Review][Patch] Bouton actif mais clic no-op sur URL composée d'espaces [frontend/src/app/settings/notes-settings/notes-settings.component.html:20] — le `[disabled]` teste `!form.controls.triliumUrl.value` (non trimmé) alors que `onTest()` garde sur `url.trim()`. Valeur `"   "` → bouton actif, clic → retour immédiat avant `isTesting`, aucun feedback. Correctif : trimmer dans l'expression `disabled` aussi, ou calculer un unique signal `canTest` partagé par le template et `onTest()`.
- [x] [Review][Defer] SSRF « basique » (schéma http/https seulement) + `redirect: 'follow'` [backend/src/trilium/trilium.service.ts:19 ; trilium.controller.ts:33] — deferred, pre-existing : reproduit à l'identique l'endpoint existant `LinksController.fetchOgPreview` + `OgFetchService`, et le blocage des IP privées/LAN est **volontairement exclu** dans les Dev Notes (Trilium auto-hébergé sur le LAN de Manu). Risque réel faible sur un dashboard perso mono-utilisateur. À revisiter si l'app devient multi-utilisateurs ou exposée.
- [x] [Review][Defer] `reason`/URL complète renvoyée et loggée (peut contenir userinfo) [backend/src/trilium/trilium.service.ts:21] — deferred, pre-existing : même pattern que `OgFetchService` (log de l'URL complète), et le champ `reason` est **imposé par AC3**. Faible impact contexte perso. Éventuellement logger `parsed.origin` plutôt que l'URL complète.

_Code review — 2e passe du 2026-11-05 (diff non-commité vs `abb77c6`). Les 3 items ouverts ci-dessus (1 decision, 2 patch) sont toujours non résolus et restent valables. Nouveaux items : 1 decision-needed, 4 patch, 4 defer, 11 dismissed._

- [x] [Review][Decision] ✅ Résolu 2026-11-05 : Task 7 décochée (E2E + vérif manuelle restent à faire). Task 7 cochée alors que l'E2E et la vérification manuelle AC1–AC4 n'ont pas été exécutées — les Completion Notes indiquent E2E « non exécuté » et vérification manuelle « déléguée à Manu », mais les cases sont `[x]` et le statut est `review`. Aucune preuve de bout en bout du HEAD sortant réel ni de l'affichage du message rouge. À décider : exécuter E2E + vérif manuelle avant `done`, ou décocher la Task 7.
- [x] [Review][Patch] `@Query('url')` peut recevoir un `string[]` (`?url=a&url=b`) et aucune longueur max n'est imposée [backend/src/trilium/trilium.controller.ts:24] — ajouter `typeof url !== 'string'` → 400 et une limite (ex. 2083, cohérent avec `create-recipe.dto.ts`).
- [x] [Review][Patch] Tests backend incomplets : timeout 5 s non testé, test « signal AbortController » ne vérifie pas `signal`, cas 500 absent des scénarios [backend/src/trilium/trilium.service.spec.ts:474] — ajouter `signal: expect.any(AbortSignal)`, un test fake timers (abort à 5000 ms → `reachable:false`) et un cas `status: 500`.
- [x] [Review][Patch] Accessibilité : spinner sans nom accessible, résultat non annoncé [frontend/src/app/settings/notes-settings/notes-settings.component.html:594] — `aria-label` sur le spinner/bouton pendant le test, `role="status"` (aria-live) sur le conteneur de résultat, `aria-hidden="true"` sur les `mat-icon`.
- [x] [Review][Patch] Scénario E2E 7.2 imbriqué dans le test 7.1 [e2e/tests/settings.spec.ts:75] — si l'étape 7.2 échoue, les vérifs AC5/AC6 de 7.1 et le cleanup sont sautés ; extraire dans un `test(...)` dédié avec son propre setup/cleanup (Task 6).
- [x] [Review][Defer] Toutes les erreurs HTTP (400/401/429/500) affichent « Instance inaccessible — vérifiez l'URL » [frontend/src/app/settings/notes-settings/notes-settings.component.ts:824] — deferred, pre-existing : conforme à AC3 tel qu'écrit ; distinguer 429/400 serait une évolution UX.
- [x] [Review][Defer] `globalThis.fetch` remplacé par un mock jamais restauré [backend/src/trilium/trilium.service.spec.ts:447] — deferred, pre-existing : pattern imposé par la story (copie de `og-fetch.service.spec.ts`), même fuite déjà présente là-bas ; à corriger globalement (`jest.spyOn` + `mockRestore`).
- [x] [Review][Defer] URL testée trimée mais URL sauvegardée non trimée [frontend/src/app/settings/notes-settings/notes-settings.component.ts:89] — deferred, pre-existing : `onSubmit()` vient de 7.1 (`triliumUrl || null` sans `trim()`).
- [x] [Review][Defer] AC5 (401 sans JWT) sans test automatisé [backend/src/trilium/trilium.controller.spec.ts] — deferred, pre-existing : le projet n'a pas de tests d'intégration supertest des guards ; vérifié manuellement via curl.

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

- Backend `npm run test` (Jest) : 18 suites / 201 tests verts (193 existants + 8 nouveaux `trilium.service.spec.ts` + `trilium.controller.spec.ts`).
- Backend `npx tsc --noEmit -p tsconfig.build.json` : aucune erreur.
- Backend `npm run lint` : 1 itération de correction (3 erreurs `@typescript-eslint/require-await` sur des `it(...)` marqués `async` sans `await` dans `trilium.controller.spec.ts` — corrigé en retirant `async`), puis 0 erreur.
- Frontend `npx ng test --no-watch` : 18 fichiers / 172 tests verts (164 existants + 8 nouveaux : `trilium.service.spec.ts` + extension `notes-settings.component.spec.ts`). Un test (`bouton désactivé si URL vide`) a d'abord échoué car le sélecteur `button[type="button"]` matchait aussi le bouton interne du `mat-slide-toggle` (premier élément du DOM) au lieu du bouton « Tester » ; corrigé en ciblant `button[mat-stroked-button]`.
- Frontend `npx ng build` : build de production OK ; seuls des warnings pré-existants sans lien avec cette story (NG8102/NG8107 sur `recipe-detail`/`recipes`, budget bundle).
- `npx playwright test --list` (e2e) : la spec étendue `settings.spec.ts` compile et est listée (46 tests / 12 fichiers) — confirme l'absence d'erreur de syntaxe/typage dans l'ajout E2E.
- Backend lancé localement (`npm run start:dev`) contre la base de dev réelle (`DB_HOST=192.168.1.100`, reachable) : démarrage OK, route `GET /api/trilium/ping` bien mappée. `curl` sans JWT → `401 Unauthorized` confirmé en conditions réelles (AC5). Processus arrêté en fin de vérification.
- Exécution complète de la suite E2E Playwright et clic manuel dans `/settings` (AC1-4) **non effectués par l'agent** : pas d'identifiants valides pour la base de dev réelle (le compte admin a été reseedé/son mot de passe changé par Manu). Question posée à l'utilisateur ; **Manu a choisi de faire cette vérification lui-même** plutôt que de partager des identifiants ou de bloquer la story.

### Completion Notes List

- Backend : nouveau module `TriliumModule` (`trilium.service.ts`, `trilium.controller.ts`, `trilium.module.ts`) exposant `GET /api/trilium/ping?url=` — HEAD via `fetch` natif + `AbortController` (timeout 5s), toute réponse HTTP ⇒ `{ reachable: true }`, échec réseau ⇒ `{ reachable: false, reason }`. Validation anti-SSRF basique (schéma http/https uniquement) + `JwtAuthGuard` + throttle anti-abus (15/min), en réutilisant exactement les patterns `OgFetchService`/`fetchOgPreview`. Module enregistré dans `app.module.ts`.
- Frontend : `TriliumService` (GET relatif `/api/trilium/ping`) + extension de `NotesSettingsComponent` avec bouton « Tester la connexion » (signals `isTesting`/`testResult`, réinitialisation du résultat quand l'URL change, icônes ✓/✗ Material sur tokens `--color-success`/`--color-error` du thème).
- E2E : scénario ajouté dans `settings.spec.ts` (URL `.invalid` → message rouge) — code complet et syntaxiquement validé (`playwright test --list`), mais **non exécuté** faute de stack de test dédiée disponible dans cette session (nécessite compte admin E2E + réseau de test) ; c'est cohérent avec le caractère « optionnel / best-effort » de la Task 6 dans la story.
- Vérification manuelle AC1-4 (test réel + URL bidon dans `/settings`) déléguée à Manu : voir Debug Log. Toutes les autres AC sont couvertes par les tests automatisés (8 tests backend + 8 tests frontend) et la vérification live du 401 (AC5).
- Aucune régression : 201/201 tests backend et 172/172 tests frontend verts après l'implémentation complète.

### File List

- `backend/src/trilium/trilium.module.ts` (nouveau)
- `backend/src/trilium/trilium.controller.ts` (nouveau)
- `backend/src/trilium/trilium.service.ts` (nouveau)
- `backend/src/trilium/trilium.controller.spec.ts` (nouveau)
- `backend/src/trilium/trilium.service.spec.ts` (nouveau)
- `backend/src/app.module.ts` (modifié — ajout `TriliumModule` aux imports)
- `frontend/src/app/settings/notes-settings/trilium.service.ts` (nouveau)
- `frontend/src/app/settings/notes-settings/trilium.service.spec.ts` (nouveau)
- `frontend/src/app/settings/notes-settings/notes-settings.component.ts` (modifié — `TriliumService`, `isTesting`/`testResult`, `onTest()`, réinitialisation sur `valueChanges`)
- `frontend/src/app/settings/notes-settings/notes-settings.component.html` (modifié — bouton « Tester la connexion » + rendu ✓/✗)
- `frontend/src/app/settings/notes-settings/notes-settings.component.scss` (modifié — styles `.test-connection`/`.test-result`)
- `frontend/src/app/settings/notes-settings/notes-settings.component.spec.ts` (modifié — tests `onTest()`)
- `e2e/tests/settings.spec.ts` (modifié — scénario URL inaccessible, best-effort)

## Change Log

| Date | Changement |
| --- | --- |
| 2026-07-14 | Création de la story 7.2 (contexte complet : TriliumModule backend fetch HEAD + validation anti-SSRF, bouton test frontend). Statut → ready-for-dev. |
| 2026-07-14 | Implémentation complète (Tasks 1-7) : `TriliumModule` backend + bouton « Tester la connexion » frontend + tests unitaires (8 backend, 8 frontend) + extension E2E best-effort. 201/201 tests backend, 172/172 tests frontend verts. Vérification manuelle AC1-4 déléguée à Manu (pas d'identifiants dev réels disponibles). Statut → review. |
| 2026-11-05 | Code review 2e passe : reformatage Prettier isolé (commit `ee491fd`), 6 patchs appliqués (annulation du ping en cours au changement d'URL, bouton désactivé si URL vide après trim, garde `string[]`/longueur max sur `url`, tests timeout/signal/500, a11y `role="status"`/`aria-label`, scénario E2E 7.2 isolé). Task 7 décochée : E2E + vérif manuelle AC1–AC4 à faire. 205/205 backend, 175/175 frontend verts. Statut → in-progress. |
| 2026-11-05 | E2E + vérification manuelle AC1–AC4 validés par Manu. Task 7 cochée. Statut → done. |
