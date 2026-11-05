---
baseline_commit: 77b29bbe30ddad324c80bb3117af3f24acb63770
---

# Story 7.3 : Onglet Notes avec iframe Trilium

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

En tant qu'**utilisateur authentifié ayant configuré son instance Trilium**,
Je veux **accéder à Trilium directement depuis l'onglet Notes du Dashboard**,
Afin de **gérer mes notes sans quitter mon Dashboard**.

> **Contexte Épic 7 (pivot 2026-06-18) :** dernière story de l'Épic 7. La **7.1 (done)** a posé les colonnes `triliumUrl`/`notesEnabled` sur `User`, les endpoints `GET/PATCH /api/users/me/notes-settings`, la page `/settings` et la **navigation conditionnelle** (onglet Notes masqué si `notesEnabled = false`). La **7.2 (done)** a ajouté `GET /api/trilium/ping` + le bouton « Tester la connexion ». **Cette story 7.3** remplace le placeholder `/notes` (« Module Notes — À venir ») par une **iframe Trilium pleine hauteur**, ajoute l'**état « non configuré »** et un **guard `notesEnabledGuard`** sur la route. Story **100 % frontend** (+ E2E) : **aucune modification backend**.

## Acceptance Criteria

**AC1 — Iframe pleine hauteur pointant vers `triliumUrl`**
**Étant donné** que Notes est activé et qu'une URL valide est configurée,
**Quand** je clique sur l'onglet Notes,
**Alors** la page `/notes` affiche un `<iframe>` occupant tout l'espace disponible (hauteur = viewport − top bar) pointant vers `triliumUrl` de l'utilisateur.

**AC2 — Barre de chargement**
**Étant donné** que l'iframe charge,
**Quand** le chargement est en cours,
**Alors** un `MatProgressBar` (indéterminé) est affiché en haut de page jusqu'à l'événement `load` de l'iframe.

**AC3 — État « non configuré »**
**Étant donné** que Notes est activé mais qu'aucune URL n'est configurée,
**Quand** j'accède à `/notes`,
**Alors** un état d'erreur s'affiche : icône + message « Aucune instance Trilium configurée » + bouton `mat-stroked-button` « Configurer dans Paramètres » (lien vers `/settings`).

**AC4 — Onglet absent si Notes désactivé** _(déjà livré en 7.1 — à vérifier, pas à réimplémenter)_
**Étant donné** que Notes est désactivé (`notesEnabled = false`),
**Quand** j'inspecte la navigation,
**Alors** l'onglet « Notes » est absent de la top bar desktop et de la bottom nav mobile.

**AC5 — Guard de route**
**Étant donné** que l'utilisateur accède à `/notes` avec Notes désactivé (URL directe),
**Quand** le guard Angular s'exécute,
**Alors** il est redirigé vers `/dashboard`.

**AC6 — Mobile**
**Étant donné** que la page est sur mobile (<768px),
**Quand** j'affiche l'onglet Notes,
**Alors** l'iframe est full-width full-height (aucune barre latérale).

> **Note déploiement :** Trilium doit être configuré pour autoriser l'embedding en ajoutant `Content-Security-Policy: frame-ancestors 'self' https://dashboard.monserveur.fr` dans sa configuration. Cette étape est documentée dans les notes de déploiement du projet (Task 6).

### Scénarios E2E (à ajouter dans `e2e/tests/notes.spec.ts` — nouveau fichier)
- Notes activé + URL configurée → naviguer vers `/notes` → vérifier présence de l'iframe avec `src` correct.
- Notes non configuré → naviguer vers `/notes` → vérifier état d'erreur + bouton « Configurer dans Paramètres ».
- Notes désactivé → vérifier absence de l'onglet Notes dans la navigation.
- Notes désactivé → accéder à `/notes` en URL directe → vérifier redirection vers `/dashboard`.

---

## Tasks / Subtasks

- [x] **Task 1 — Guard `notesEnabledGuard`** (AC: #5)
  - [x] Créer `frontend/src/app/core/guards/notes-enabled.guard.ts` (à côté des 3 guards existants), `CanActivateFn` **async** :
    - `let user = authService.currentUser();` ; si `null` → `user = await authService.me()` dans un `try/catch` (même pattern que `mustChangePasswordGuard`) — **obligatoire**, voir Dev Notes « ordre des guards ».
    - `if (user?.notesEnabled) return true;` sinon `return router.createUrlTree(['/dashboard'])`.
    - En cas d'erreur de `me()` → `createUrlTree(['/login'])` (cohérent avec les autres guards).
  - [x] Créer `frontend/src/app/core/guards/notes-enabled.guard.spec.ts` : cas `notesEnabled=true` → `true` ; `false` → UrlTree `/dashboard` ; signal vide + `me()` résout un user activé → `true` ; `me()` rejette → UrlTree `/login`. Utiliser `TestBed.runInInjectionContext(() => notesEnabledGuard(route, state))` avec un `AuthService` mocké (`currentUser: signal(...)`, `me: vi.fn()`).
- [x] **Task 2 — Routes du module Notes** (AC: #1, #5)
  - [x] Créer `frontend/src/app/notes/notes.routes.ts` : `export const notesRoutes: Routes = [{ path: '', loadComponent: () => import('./trilium-embed/trilium-embed.component').then((m) => m.TriliumEmbedComponent) }];` (pattern `settings.routes.ts`).
  - [x] Dans `frontend/src/app/app.routes.ts`, remplacer la route `notes` existante par :
    `{ path: 'notes', canActivate: [authGuard, mustChangePasswordGuard, notesEnabledGuard], loadChildren: () => import('./notes/notes.routes').then((r) => r.notesRoutes) }` — **garder l'ordre** des guards (auth en premier).
  - [x] **Supprimer** `frontend/src/app/notes/notes.component.ts` (placeholder « À venir ») — seule référence : `app.routes.ts` (vérifié). L'Épic 8 recréera son propre composant.
- [x] **Task 3 — `TriliumEmbedComponent`** (AC: #1, #2, #3, #6)
  - [x] Créer `frontend/src/app/notes/trilium-embed/trilium-embed.component.ts` (+ `.html`, `.scss`) : standalone, `ChangeDetectionStrategy.OnPush`, imports `MatProgressBarModule` (**nouvel import — non utilisé ailleurs dans le projet**), `MatIconModule`, `MatButtonModule`, `RouterLink`.
  - [x] Injecter `AuthService` et `DomSanitizer`. Dériver l'URL via `computed()` depuis `authService.currentUser()` :
    - `raw = user?.triliumUrl?.trim()` ; si vide → `null`.
    - Valider avec `new URL(raw)` dans un `try/catch` **et** `protocol === 'http:' || 'https:'` ; sinon → `null` (**sécurité** : voir Dev Notes — jamais de `bypassSecurityTrustResourceUrl` sur une valeur non validée).
    - `safeUrl = computed(() => url ? sanitizer.bypassSecurityTrustResourceUrl(url) : null)`.
  - [x] Signal `isLoading = signal(true)` ; handler `onLoad()` → `isLoading.set(false)`.
  - [x] Template :
    ```html
    @if (safeUrl(); as src) {
      <div class="notes-frame">
        @if (isLoading()) {
          <mat-progress-bar mode="indeterminate" class="frame-progress" aria-label="Chargement de Trilium" />
        }
        <iframe [src]="src" title="Trilium Notes" (load)="onLoad()"></iframe>
      </div>
    } @else {
      <div class="empty-state" role="status">
        <mat-icon class="empty-icon" aria-hidden="true">note_alt</mat-icon>
        <p class="empty-message">Aucune instance Trilium configurée</p>
        <p class="empty-hint">Renseignez l'URL de votre instance dans vos paramètres.</p>
        <a mat-stroked-button routerLink="/settings">Configurer dans Paramètres</a>
      </div>
    }
    ```
    (Une URL syntaxiquement invalide/non-http(s) tombe aussi dans l'état « non configuré » — acceptable et plus sûr.)
  - [x] SCSS (voir Dev Notes « calcul de hauteur ») :
    - `:host { display: block; }`
    - `.notes-frame { position: relative; height: calc(100dvh - var(--mat-toolbar-standard-height, 64px)); }` ; `@media (max-width: 599px)` → `--mat-toolbar-mobile-height, 56px` ; `@media (max-width: 767px)` → soustraire **aussi** `var(--bottom-nav-height)` (la bottom nav est `position: fixed` et `.app-content` a déjà un `padding-bottom`).
    - `iframe { display: block; width: 100%; height: 100%; border: none; }`
    - `.frame-progress { position: absolute; top: 0; left: 0; right: 0; z-index: 1; }` (superposé, ne décale pas l'iframe).
    - `.empty-state` : reprendre **exactement** le style de `links.component.scss` (`.empty-state`/`.empty-icon`/`.empty-message`) avec icône 64px et `color: var(--color-text-secondary)` (UX-DR29).
  - [x] Réinitialiser `isLoading` à `true` si l'URL change pendant la vie du composant (ex. `effect` sur `safeUrl` ou recalcul) — cas rare mais évite une barre absente après changement d'URL via un autre onglet + refresh signal. Optionnel si trivial ; ne pas sur-ingénierer.
- [x] **Task 4 — Aide « embedding bloqué »** (UX-DR29, note déploiement — léger)
  - [x] Sous l'iframe **n'ajouter aucun bandeau permanent**. À la place : si l'événement `load` n'est pas reçu au bout de **15 s** (`setTimeout` nettoyé par `DestroyRef.onDestroy` / à `onLoad`), passer `isLoading` à `false` et afficher un petit message superposé en haut (role="status") : « Si votre instance Trilium est accessible mais ne s'affiche pas, vérifiez que l'embedding est autorisé dans sa configuration (`frame-ancestors`). » + lien `target="_blank" rel="noopener"` « Ouvrir Trilium dans un nouvel onglet ».
  - [x] ⚠️ Un iframe bloqué par `frame-ancestors`/`X-Frame-Options` **déclenche quand même `load`** dans Chromium : ce message ne couvre donc que le cas « instance ne répond pas ». C'est une limite navigateur connue — **ne pas** tenter de lire `iframe.contentWindow.document` (SecurityError cross-origin). Ne pas appeler `/api/trilium/ping` au chargement de la page (latence inutile, hors AC).
- [x] **Task 5 — Tests unitaires frontend** (AC: #1, #2, #3)
  - [x] Créer `frontend/src/app/notes/trilium-embed/trilium-embed.component.spec.ts` (pattern `bottom-nav.component.spec.ts` : `AuthService` mocké avec `currentUser: signal<AuthUser | null>(...)`, `provideRouter([])`) :
    - URL `https://trilium.example.com` → `iframe` présent, `src` === URL, `title` présent.
    - `mat-progress-bar` présent avant `load` ; après `iframe.dispatchEvent(new Event('load'))` + `fixture.detectChanges()`/`whenStable()` → absent.
    - `triliumUrl: null` / `''` / `'   '` → `.empty-state` avec le texte « Aucune instance Trilium configurée » et un lien `href` contenant `/settings` ; **aucun** `iframe`.
    - `triliumUrl: 'javascript:alert(1)'` et `'ftp://x'` → état « non configuré », **aucun** `iframe` (test de sécurité).
    - (Task 4) fake timers `vi.useFakeTimers()` : après 15 s sans `load` → message d'aide visible ; restaurer `vi.useRealTimers()`.
  - [x] Vérifier que `bottom-nav.component.spec.ts` / `top-bar.component.spec.ts` (qui importent `routes` de `app.routes.ts`) restent verts après le changement de route.
- [x] **Task 6 — Documentation déploiement** (note déploiement)
  - [x] Ajouter dans `README.md` (section déploiement/configuration — il n'existe **pas** de doc dédiée dans `docs/`) un court paragraphe « Intégration Trilium » : header `Content-Security-Policy: frame-ancestors 'self' https://<origine-dashboard>` côté Trilium (ou son reverse proxy) + retirer/ajuster `X-Frame-Options` si présent + avertissement **mixed content** (Dashboard en HTTPS ⇒ Trilium doit être en HTTPS). Rester concis (5–10 lignes).
- [x] **Task 7 — E2E** (AC: #1, #3, #4, #5)
  - [x] Créer `e2e/tests/notes.spec.ts` en réutilisant **à l'identique** les helpers de `e2e/tests/settings.spec.ts` (`loginAdminApi`, `createAndLoginUser`, nettoyage `afterAll` des users créés). Les copier dans le fichier (pas de module de helpers partagé aujourd'hui — ne pas refactorer `settings.spec.ts`).
  - [x] Configurer l'état via l'API, **pas** via l'UI : après login UI, `page.request.patch('/api/users/me/notes-settings', { data: {...} })` (le contexte `page.request` partage les cookies de session du navigateur ; vérifier aussi le header CSRF/`X-Requested-With` déjà injecté par `extraHTTPHeaders`), puis `page.goto(...)`.
  - [x] Scénario 1 (AC1/AC2) : `page.route('https://trilium.e2e.test/**', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Trilium stub</body></html>' }))` **avant** navigation ; `notesEnabled:true, triliumUrl:'https://trilium.e2e.test'` → `goto('/notes')` → `expect(page.locator('iframe[title="Trilium Notes"]')).toHaveAttribute('src', 'https://trilium.e2e.test')` (attention : `URL` normalise avec `/` final — comparer à la valeur **effectivement** posée par le composant, cf. Dev Notes) ; `expect(page.locator('mat-progress-bar')).toBeHidden()`.
  - [x] Scénario 2 (AC3) : `notesEnabled:true, triliumUrl:null` → `goto('/notes')` → texte « Aucune instance Trilium configurée » visible ; clic « Configurer dans Paramètres » → URL `/settings`.
  - [x] Scénario 3 (AC4/AC5) : `notesEnabled:false` → reload → `a[mat-tab-link]` « Notes » non visible ; `goto('/notes')` → `toHaveURL('/dashboard')`.
  - [x] Regrouper au besoin en 1–2 `test(...)` pour limiter les logins (rate-limiter, cf. Debug Log 7.1) ; chaque `test` doit avoir son propre setup (leçon 7.2 : ne pas imbriquer des scénarios indépendants).
- [x] **Task 8 — Vérification finale**
  - [x] Frontend : `cd frontend && npx ng test --no-watch` — verts (175 existants + nouveaux).
  - [x] Frontend : `npx ng build` — OK (warnings pré-existants `recipe-detail`/`recipes`/budget acceptés).
  - [x] Frontend : `npm run lint` (script absent du projet) + Prettier sur les fichiers touchés (leçon 7.2 : formater **seulement** les fichiers de la story).
  - [x] Backend : `cd backend && npm run test` — doit rester **205/205** (aucun changement attendu).
  - [x] E2E : `npx playwright test --list` au minimum ; exécution complète si la stack est disponible (sinon le signaler explicitement, ne **pas** cocher — leçon 7.2).
  - [x] Vérification manuelle avec une vraie instance Trilium (Manu) : affichage iframe, barre de chargement, état non configuré, redirection guard, rendu mobile.

### Review Findings

- [x] [Review][Decision] `allowedHosts: ["dev.robate.fr"]` dans `frontend/angular.json` — Réglage de dev local hors périmètre (« Frontend uniquement + README + E2E »), non stagé, expose un hostname personnel dans la config partagée. → Résolu : retiré du changeset (`git restore`) ; à remettre en local hors commit si besoin.
- [x] [Review][Decision] E2E (Task 7) écrits mais jamais exécutés alors que la story est en `review` — AC4 (onglet masqué) n'est couvert que par l'E2E, et la vérification manuelle ne le cite pas. → Résolu : E2E exécutés par Manu (OK), Task 7 cochée.
- [x] [Review][Patch] `notes.spec.ts` non formaté au style projet (guillemets doubles, largeur 80 vs `singleQuote: true, printWidth: 100`) — helpers non copiés « à l'identique » de `settings.spec.ts` [e2e/tests/notes.spec.ts:1]
- [x] [Review][Patch] Assertion E2E AC4 trop faible : `not.toBeVisible()` passe si la nav n'est pas encore rendue — ajouter une assertion positive préalable (onglet « Dashboard » visible) [e2e/tests/notes.spec.ts:147]
- [x] [Review][Patch] Spec du guard incomplète : manquent `me()` → `notesEnabled: false` (→ `/dashboard`) et `me()` → `null` (→ `/login`) [frontend/src/app/core/guards/notes-enabled.guard.spec.ts:252]
- [x] [Review][Patch] Spec composant : pas de test du reset de l'état de chargement quand `triliumUrl` change (raison d'être de l'`effect`) [frontend/src/app/notes/trilium-embed/trilium-embed.component.spec.ts:531]
- [x] [Review][Defer] Guards parallèles → jusqu'à 3 `GET /api/auth/me` concurrents sur rechargement direct de `/notes` (`me()` ne mutualise pas la requête en vol) [frontend/src/app/core/guards/notes-enabled.guard.ts:281] — deferred, pre-existing
- [x] [Review][Defer] Erreur non-401 de `me()` (5xx, réseau) → redirection `/login` [frontend/src/app/core/guards/notes-enabled.guard.ts:283] — deferred, pre-existing
- [x] [Review][Defer] `currentUser` périmé entre onglets/appareils (`notesEnabled`/`triliumUrl` modifiés ailleurs) [frontend/src/app/core/guards/notes-enabled.guard.ts:278] — deferred, pre-existing

---

## Dev Notes

### Contexte & périmètre
- **Frontend uniquement** (+ README + E2E). Aucun endpoint, entité ou migration. `triliumUrl`/`notesEnabled` remontent déjà dans `AuthUser` via `/api/auth/me|login|refresh` (7.1). [Source: frontend/src/app/core/services/auth.service.ts#L5-L14]
- **AC4 est déjà implémenté** (7.1) : `top-bar.component.html` et `bottom-nav.component.html` enveloppent l'onglet Notes dans `@if (authService.currentUser()?.notesEnabled)`. **Ne rien changer** à la navigation ; seulement le couvrir en E2E. [Source: frontend/src/app/core/components/top-bar/top-bar.component.html#L30-L39 ; bottom-nav.component.html#L10-L15]
- **Hors périmètre** : sélecteur 3 états, notes intégrées (Épic 8) ; ping auto au chargement ; toute modification backend ; durcissement SSRF (déféré 7.2).

### 🚨 Sécurité — `bypassSecurityTrustResourceUrl` uniquement après validation
- Angular **refuse** un binding `[src]` d'iframe avec une `string` (erreur `NG0904 unsafe value used in a resource URL context`) → il faut `DomSanitizer.bypassSecurityTrustResourceUrl()`. Aucune utilisation existante dans le projet : c'est la première.
- **Le backend ne valide pas le schéma de `triliumUrl`** (décision 7.1 : `@IsString() @MaxLength(500)` seulement). Un utilisateur peut donc stocker `javascript:…` via un appel API direct. Un iframe `src="javascript:…"` exécute le script **dans l'origine du Dashboard** ⇒ XSS (self-XSS mais réel). **Valider `new URL(raw).protocol ∈ {http:, https:}` avant tout bypass** — même garde que `LinksController.fetchOgPreview` côté backend. [Source: backend/src/users/dto/update-notes-settings.dto.ts ; backend/src/links/links.controller.ts#L40-L54]
- Trimmer l'URL : `onSubmit` de `NotesSettingsComponent` n'applique pas `trim()` (dette déférée 7.2) → une URL avec espaces peut être en base. [Source: _bmad-output/implementation-artifacts/deferred-work.md#L7]
- **Valeur de `src` posée** : utiliser la chaîne trimée **telle quelle** (pas `new URL(raw).href`, qui ajoute un `/` final) pour que l'iframe pointe exactement sur ce que l'utilisateur a saisi et que l'assertion E2E `toHaveAttribute('src', …)` soit prévisible.
- **Ne pas** ajouter d'attribut `sandbox` : Trilium a besoin de scripts, same-origin (cookies de session Trilium), formulaires, popups, téléchargements — un `sandbox` restrictif casserait l'app. Optionnel : `allow="clipboard-read; clipboard-write; fullscreen"` pour le copier-coller dans Trilium.

### Ordre des guards (piège)
- Angular exécute les `canActivate` d'une route **en parallèle** et n'applique que l'ordre de priorité des résultats. `authGuard` est async (`await me()`) : au moment où `notesEnabledGuard` s'exécute sur un **chargement direct de `/notes`** (reload / URL tapée), `currentUser()` peut encore être `null`. Si le guard lit simplement le signal, il redirigerait à tort vers `/dashboard`. ⇒ le guard **doit** appeler `me()` lui-même quand le signal est vide, exactement comme `mustChangePasswordGuard`. [Source: frontend/src/app/core/guards/must-change-password.guard.ts]
- Placer le guard dans `core/guards/` (convention réelle : `auth.guard.ts`, `admin.guard.ts`, `must-change-password.guard.ts`). L'architecture le cite « dans `notes.routes.ts` » au sens où il protège cette route — l'emplacement du fichier suit la convention du code. [Source: _bmad-output/planning-artifacts/architecture.md#Module frontend — NotesModule (Epic 7) L1040-L1050]
- Appliquer le guard sur la route **parente** dans `app.routes.ts` (avec `loadChildren`) : le chunk lazy n'est pas téléchargé si l'accès est refusé.

### Calcul de hauteur (AC1, AC6)
- Layout réel : `app.html` = `<app-top-bar />` (sticky, `mat-toolbar` **64px**, **56px sous 600px** via `--mat-toolbar-standard-height` / `--mat-toolbar-mobile-height`) + `<main class="app-content">` + `<app-footer />` (desktop seulement) + `<app-bottom-nav />` (fixe, **56px**, visible <768px). `<mat-tab-nav-panel>` après la toolbar est vide (hauteur 0). [Source: frontend/src/app/app.html ; app.scss ; top-bar.component.scss ; bottom-nav.component.scss ; footer.component.scss ; node_modules/@angular/material toolbar]
- Hauteurs cibles du conteneur iframe :
  - ≥768px : `100dvh − 64px` (AC1 littéral). Le footer (~40px) passe sous la ligne de flottaison — **comportement accepté** (l'AC fixe « viewport − top bar »). Ne pas modifier `app.html` / le footer.
  - 600–767px : `100dvh − 64px − var(--bottom-nav-height)`.
  - <600px : `100dvh − 56px − var(--bottom-nav-height)`.
- `.app-content` a déjà `padding-bottom: var(--bottom-nav-height)` sur mobile : ne pas l'ajouter une 2e fois dans le composant. Utiliser `dvh` (déjà utilisé dans `app.scss`) plutôt que `vh` pour la barre d'adresse mobile.
- Aucune marge/padding autour de l'iframe (« uniquement l'iframe », UX-DR29). Pas de `max-width` de page.

### Limites navigateur à connaître
- **Mixed content** : si le Dashboard est servi en HTTPS et Trilium en `http://192.168.x.x`, le navigateur bloque l'iframe (cadre vide). À documenter (Task 6), pas à contourner.
- **`frame-ancestors` / `X-Frame-Options`** côté Trilium : iframe vide/erreur affichée par le navigateur, et `load` se déclenche quand même → impossible à détecter proprement en JS cross-origin. D'où l'aide textuelle (Task 4) + la doc.
- **Cookies tiers** : la session Trilium dans l'iframe est un contexte tiers si les domaines diffèrent (ex. `dashboard.x.fr` vs `trilium.x.fr` = même site → OK ; domaines différents → Safari/Chrome peuvent bloquer les cookies, Trilium redemandera le login). Mentionner dans la doc, ne rien coder.
- Le Dashboard **n'envoie aucun header CSP** (nginx.conf minimal, pas de `helmet` côté backend) → rien à modifier côté Dashboard pour autoriser l'iframe sortante (`frame-src`). [Source: frontend/nginx.conf ; backend/src/main.ts]
- Service worker (`ngsw-config.json`) : ne cache que les assets du Dashboard ; les requêtes de l'iframe cross-origin ne sont pas interceptées. Rien à faire.

### Frontend — patterns à réutiliser (ne pas réinventer)
- Lazy routes : `settings.routes.ts` / `recipes.routes.ts` (`loadChildren` + `loadComponent` par défaut). [Source: frontend/src/app/settings/settings.routes.ts]
- État vide : `.empty-state` de `links.component.html/.scss` (icône + message + `mat-stroked-button`). [Source: frontend/src/app/links/links.component.html#L26-L32 ; links.component.scss#L24-L45]
- Composant : standalone + `OnPush` + signals (`computed`, `signal`), zoneless Angular 21. Pas de `NgModule`. Pas de `standalone: true` explicite requis (défaut Angular 21 ; l'ancien placeholder l'avait, les composants récents non).
- Tests : `ng test --no-watch` (Vitest via builder Angular — ne pas lancer vitest directement). Mock `AuthService` avec un vrai `signal()` (pattern `bottom-nav.component.spec.ts`). Le type `AuthUser` complet exige `triliumUrl` + `notesEnabled`. [Source: frontend/src/app/core/components/bottom-nav/bottom-nav.component.spec.ts#L8-L21]

### Arborescence cible
```
frontend/src/app/
├── app.routes.ts                                   # UPDATE : route notes → loadChildren + notesEnabledGuard
├── core/guards/
│   ├── notes-enabled.guard.ts                      # NEW
│   └── notes-enabled.guard.spec.ts                 # NEW
└── notes/
    ├── notes.component.ts                          # DELETE (placeholder « À venir »)
    ├── notes.routes.ts                             # NEW
    └── trilium-embed/
        ├── trilium-embed.component.ts              # NEW
        ├── trilium-embed.component.html            # NEW
        ├── trilium-embed.component.scss            # NEW
        └── trilium-embed.component.spec.ts         # NEW
e2e/tests/notes.spec.ts                             # NEW
README.md                                           # UPDATE : section intégration Trilium (CSP frame-ancestors, mixed content)
```
[Source: _bmad-output/planning-artifacts/architecture.md#Addendum — Intégration Trilium Notes (Epic 7) L1040-L1060]

### Anti-régressions (ne pas casser)
- Ne pas toucher `top-bar` / `bottom-nav` (nav conditionnelle 7.1) ni `NotesSettingsComponent` (7.1/7.2).
- `bottom-nav.component.spec.ts` / `top-bar.component.spec.ts` importent `routes` depuis `app.routes.ts` : la nouvelle route `loadChildren` + guard doit compiler dans ces specs (le guard injecte `AuthService`, déjà mocké dans ces specs).
- La route wildcard `**` → `/dashboard` reste en dernier.
- E2E existants : `settings.spec.ts` active/désactive Notes sur des users dédiés — aucun impact. Les nouveaux tests doivent aussi utiliser **des users dédiés** (jamais l'admin E2E partagé) et nettoyer.
- Rate-limiter E2E : en local, `THROTTLER_LIMIT=5`/60s bloque les reload (chaque reload → `GET /api/auth/me`). La CI utilise `THROTTLER_LIMIT=100`. Ajuster temporairement le `.env` racine en local si besoin, puis revertir. [Source: 7-1 Debug Log ; .github/workflows/ci.yml#L117]

### Previous Story Intelligence (7.1 / 7.2)
- Sélecteurs Material dans les tests : un `button[type="button"]` peut matcher le bouton interne d'un `mat-slide-toggle` → cibler précisément (`a[mat-stroked-button]`, `iframe[title=…]`). [Source: 7-2 Debug Log]
- Review 7.2 : ne pas cocher une Task E2E/vérif manuelle non exécutée ; scénarios E2E indépendants = `test(...)` séparés avec leur propre setup/cleanup ; ajouter `role="status"` / `aria-label` / `aria-hidden` sur les icônes (a11y relevée en review).
- Review 7.2 : formater avec Prettier **uniquement** les fichiers de la story (un reformatage hors périmètre a dû être isolé dans `ee491fd`).
- Commits récents : `feat: … (story 7.x)` en français, un commit par story.

### Project Structure Notes
- Monorepo `backend/` (NestJS 11) + `frontend/` (Angular 21.2, Material 21.2, zoneless) + `e2e/` (Playwright). Alignement complet avec l'Addendum architecture Épic 7.
- Variance assumée : guard dans `core/guards/` (convention code) plutôt qu'à côté de `notes.routes.ts`. **✅ Validé par Manu (2026-11-05).**
- Suppression du placeholder `notes/notes.component.ts`. **✅ Validé par Manu (2026-11-05).**
- Variance assumée : l'Épic dit « hauteur = viewport − top bar » ; sur mobile la bottom nav fixe est aussi soustraite (sinon le bas de Trilium serait masqué) — conforme à l'intention AC6 « full-height ».

### References
- [Source: _bmad-output/planning-artifacts/epics.md#Story 7.3 : Onglet Notes avec iframe Trilium L1434-L1474]
- [Source: _bmad-output/planning-artifacts/ux-design-Dashboard.md#UX-DR29 — Onglet Notes avec iframe Trilium L1137-L1158]
- [Source: _bmad-output/planning-artifacts/architecture.md#Addendum — Intégration Trilium Notes (Epic 7) L984-L1060]
- [Source: _bmad-output/planning-artifacts/prd.md#FR_T4, FR_T6 L320-L327]
- [Source: _bmad-output/implementation-artifacts/7-1-page-parametres-et-configuration-notes.md]
- [Source: _bmad-output/implementation-artifacts/7-2-endpoint-verification-connectivite-trilium.md]
- [Source: _bmad-output/implementation-artifacts/deferred-work.md]
- [Source: frontend/src/app/app.routes.ts ; app.html ; app.scss ; styles.scss#L18]
- [Source: frontend/src/app/core/guards/*.guard.ts]
- [Source: frontend/src/app/core/services/auth.service.ts]
- [Source: frontend/src/app/core/components/top-bar/* ; bottom-nav/* ; footer/*]
- [Source: frontend/src/app/notes/notes.component.ts]
- [Source: frontend/src/app/links/links.component.html/.scss (empty-state)]
- [Source: e2e/tests/settings.spec.ts ; e2e/playwright.config.ts]
- [Source: frontend/nginx.conf ; frontend/ngsw-config.json]

## Dev Agent Record

### Agent Model Used

### Debug Log References

- Aucun script `lint` dans `frontend/package.json` ; Prettier appliqué aux seuls fichiers de la story.
- `npx playwright test --list` OK (3 scénarios `notes.spec.ts`) ; exécution non faite : aucune stack Docker en cours.

### Completion Notes List

- Ultimate context engine analysis completed - comprehensive developer guide created.
- Guard `notesEnabledGuard` (async, appelle `me()` si signal vide), routes lazy `notes.routes.ts`, placeholder `notes.component.ts` supprimé.
- `TriliumEmbedComponent` : URL trimée et validée http/https avant `bypassSecurityTrustResourceUrl`, barre de chargement, état « non configuré », aide après 15 s sans `load`, hauteur calculée desktop/mobile.
- Tests : frontend 189/189 (175 + 14 nouveaux), backend 205/205, `ng build` OK.
- Vérification manuelle OK (Manu) avec une vraie instance Trilium via `dev.robate.fr:4200` (CSP `frame-ancestors` réglé dans NPM ; login Trilium OK une fois Dashboard/Trilium sous le même site).
- E2E `notes.spec.ts` (3 scénarios) exécutés par Manu avec la stack — OK (confirmé en code review 2026-11-05).

### File List

- frontend/src/app/core/guards/notes-enabled.guard.ts (new)
- frontend/src/app/core/guards/notes-enabled.guard.spec.ts (new)
- frontend/src/app/notes/notes.routes.ts (new)
- frontend/src/app/notes/trilium-embed/trilium-embed.component.ts (new)
- frontend/src/app/notes/trilium-embed/trilium-embed.component.html (new)
- frontend/src/app/notes/trilium-embed/trilium-embed.component.scss (new)
- frontend/src/app/notes/trilium-embed/trilium-embed.component.spec.ts (new)
- frontend/src/app/notes/notes.component.ts (deleted)
- frontend/src/app/app.routes.ts (modified)
- e2e/tests/notes.spec.ts (new)
- README.md (modified)
- ~~frontend/angular.json~~ (retiré du changeset en code review : réglage de dev local)

## Change Log

| Date | Changement |
| --- | --- |
| 2026-11-05 | Création de la story 7.3 (iframe Trilium, guard `notesEnabledGuard`, état non configuré, validation http/https avant bypass sanitizer, doc déploiement, E2E). Statut → ready-for-dev. |
| 2026-11-05 | Implémentation 7.3 : guard, routes, TriliumEmbedComponent, tests unitaires, doc README, E2E écrits (non exécutés). |
| 2026-11-05 | Code review 7.3 : 4 patches appliqués (Prettier E2E, assertion AC4 renforcée, 2 tests guard, test reset URL composant), `allowedHosts` retiré, 3 points reportés (`deferred-work.md`). Statut → done. |
