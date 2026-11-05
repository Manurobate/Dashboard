---
baseline_commit: 1f22319
---

# Story 6.4 : Page d'erreur neutre pour les liens expirés ou invalides

**Épic :** 6 — Partage public (recettes)
**Statut :** done
**Créée le :** 2026-07-13

---

## User Story

En tant que visiteur non authentifié,
Je veux voir une page d'erreur sobre quand je clique un lien expiré ou invalide,
Afin de comprendre que le lien n'est plus disponible sans que des informations sur l'instance ne soient révélées.

> **Périmètre :** cette story **raffine l'état d'erreur minimal** livré en 6.3 dans `ShareViewComponent` (route `/share/:token`). Elle ne crée **ni nouveau composant ni nouvelle route** : l'erreur remonte déjà sur `/share/:token`. Le cœur du travail est **frontend** : différencier un **lien mort (404)** d'une **erreur transitoire (5xx / 429 / réseau)** — ce dernier ne doit PAS faire croire au propriétaire que son lien est révoqué — et soigner la présentation neutre. **Le backend n'est pas modifié** (le `404` neutre est déjà livré et testé en 6.3 — voir la Décision A ci-dessous). Le partage des **notes** (`resourceType: 'note'`) arrive en Épic 8 — ne rien construire pour `'note'`.

---

## Critères d'acceptation

**AC1 — Lien expiré → page d'erreur neutre**
**Étant donné** que je clique un lien dont le token est expiré (`expiresAt < NOW()`),
**Quand** la page charge,
**Alors** une page d'erreur neutre s'affiche indiquant que le lien **n'est plus valide** — **aucune information sur l'instance, son propriétaire ou son contenu n'est visible** (pas de titre de recette, pas d'identifiant, pas de cause technique détaillée).

**AC2 — Lien révoqué ou inexistant → même page neutre**
**Étant donné** que je clique un lien dont le token est révoqué ou inexistant,
**Quand** la page charge,
**Alors** la **même** page d'erreur neutre s'affiche — indistinguable du cas « expiré » côté visiteur (cf. Décision A : non-révélation).

**AC3 — Backend : 404 neutre non révélateur (déjà livré en 6.3, à préserver)**
**Étant donné** que le backend reçoit une requête avec un token invalide / expiré / révoqué / inexistant,
**Quand** `GET /api/sharing/:token` est appelé,
**Alors** il retourne **`404 Not Found`** sans révéler si le token a existé, s'il est expiré ou révoqué (`NotFoundException` nue, sans message spécifique).
**Et** ce comportement est **déjà implémenté et testé** par la Story 6.3 (`SharingService.findPublicRecipe`) — cette story **ne le modifie pas**, elle le **vérifie** (aucune régression).

**AC4 — Différenciation lien mort vs erreur transitoire (raffinement du point déféré 6.3)**
**Étant donné** qu'un lien **valide** subit une erreur **transitoire** (backend `5xx`, throttling `429`, ou coupure réseau `status 0`),
**Quand** la page charge,
**Alors** le visiteur voit un message **distinct** signalant une **erreur temporaire** (ex. « Une erreur est survenue. Réessayez dans quelques instants. ») avec une action **« Réessayer »** — et **surtout PAS** le message « lien plus disponible » (qui pousserait le propriétaire à régénérer inutilement un lien pourtant valide).
> Corrige le finding déféré 6.3 : `deferred-work.md:321` — le callback `error` de 6.3 ignore `status` et affiche « Ce lien n'est plus disponible » pour tout échec.

**AC5 — Présentation neutre et sobre (raffinement visuel)**
**Étant donné** que je suis sur la page d'erreur (mort ou transitoire),
**Quand** elle s'affiche,
**Alors** elle est **sobre et centrée** (icône neutre + message + éventuelle action), cohérente avec le design system (tokens `--mat-sys-*` / `--color-*`, thème clair), lisible **mobile-first**, et **conserve** le `<meta name="robots" content="noindex">` déjà posé.

---

## Décisions de conception (à respecter — ne pas ré-arbitrer)

### Décision A — Message unique pour tous les cas « lien mort » (404), sans révélation

**Contexte du conflit dans l'épic :** l'épic (lignes 1345–1355) suggère deux textes distincts — « Ce lien a expiré » (AC1, expiré) vs « Ce lien n'est plus disponible » (AC2, révoqué/inexistant) — **mais** AC3 (et le NFR Sécurité PRD + l'implémentation 6.3) imposent un **`404` nu qui ne révèle PAS** si le token a existé, est expiré ou révoqué. **Ces deux exigences sont contradictoires** : distinguer « expiré » de « inexistant » côté visiteur exigerait que le backend signale la cause → ce qui **révèle l'existence d'un token** (précisément ce qu'AC3 interdit).

**Décision retenue (sécurité d'abord, zéro changement backend) :** on **honore AC3** et on affiche **un seul message neutre couvrant les deux cas sans les distinguer**, p. ex. :

> **« Ce lien a expiré ou n'est plus disponible. »**

Ce libellé unique couvre sémantiquement AC1 **et** AC2 (le visiteur comprend que le lien est mort) tout en respectant la non-révélation (l'attaquant énumérant des tokens voit toujours le même message — aucune fuite d'existence). **Le backend reste le `404` nu de 6.3 — aucune modification backend, aucune migration.**

> ⚠️ **Alternative écartée (Option 2) :** faire distinguer au backend « expiré » (ex. `410 Gone` ou body `{reason:'expired'}`) de « invalide » (`404`) pour honorer les deux textes littéralement. **Rejetée** car elle **révèle qu'un token a existé et a expiré** → viole AC3 + NFR non-révélation, et casserait le contrat `404` neutre validé en revue 6.3. **Ne PAS l'implémenter sans validation explicite de Manu** (question ouverte en fin de story).

### Décision B — Raffiner dans `ShareViewComponent`, pas de nouveau composant/route

L'erreur remonte déjà sur `/share/:token` (l'appel `getPublicRecipe(token)` échoue → callback `error`). On **enrichit l'état d'erreur existant** du composant (bloc `@else if (hasError())`), on **ne crée pas** de route `/error` ni de composant dédié. Cohérent avec 6.3 (état d'erreur intégré) et avec l'architecture (`/share/:token → ShareModule (lazy, public)`, une seule vue).

### Décision C — Différenciation par `HttpErrorResponse.status` côté client

- `status === 404` → **lien mort** (message neutre unique, Décision A).
- `status === 0` (réseau/CORS/offline) **OU** `status >= 500` (backend) **OU** `status === 429` (throttler `ThrottlerGuard` global, cf. 6.3) → **erreur transitoire** (message distinct + « Réessayer »).
- Tout autre `status` inattendu (ex. 4xx non prévu) → traiter comme **transitoire** par défaut (fail-safe : ne jamais afficher « lien mort » sur un doute — n'incite pas à régénérer).

---

## Tâches / Sous-tâches

### T1 — Modéliser les deux natures d'erreur dans `ShareViewComponent` (AC: AC1, AC2, AC4)

- [x] Modifier `frontend/src/app/share/components/share-view/share-view.component.ts` :
  - [x] Remplacer le signal booléen `hasError` par un signal typé décrivant la **nature** de l'erreur, p. ex. :
    ```typescript
    type ShareError = 'gone' | 'transient';
    readonly error = signal<ShareError | null>(null);
    ```
    > Conserver un accès simple dans le template (`error()` non nul = état d'erreur). Si tu préfères garder `hasError` pour minimiser la diff, ajoute **en plus** un `errorKind: signal<'gone' | 'transient' | null>` — mais un seul signal typé est plus clair. **Adapter les specs existants** qui référencent `hasError()` (cf. T4).
  - [x] Importer `HttpErrorResponse` (`@angular/common/http`) et typer le callback `error`.
  - [x] Callback `error` : classer via `status` (Décision C) —
    ```typescript
    error: (err: HttpErrorResponse) => {
      this.isLoading.set(false);
      this.error.set(err.status === 404 ? 'gone' : 'transient');
    },
    ```
  - [x] Cas `token` absent dans l'URL (`!token`, garde déjà présent) → traiter comme **`'gone'`** (lien structurellement invalide, pas transitoire).
  - [x] **Action « Réessayer » (AC4)** : extraire le chargement dans une méthode `load()` (appelée par `ngOnInit` **et** par le bouton retry) qui remet `isLoading=true`, `error=null`, puis relance `getPublicRecipe(token)`. Le token est lu une fois (le stocker en champ privé `private token: string | null`).
    > Le `takeUntilDestroyed(this.destroyRef)` doit rester dans le pipe. Un nouvel abonnement à chaque retry est acceptable (`HttpClient` GET se complète seul).

### T2 — Template : messages différenciés + action retry (AC: AC1, AC2, AC4, AC5)

- [x] Modifier `frontend/src/app/share/components/share-view/share-view.component.html`, bloc erreur :
  - [x] Remplacer `@else if (hasError())` par `@else if (error())` avec **deux sous-cas** :
    - `@if (error() === 'gone')` → bloc neutre « lien mort » :
      - Icône neutre (ex. `link_off` ou `error_outline` via `mat-icon`).
      - Message **unique** (Décision A) : **« Ce lien a expiré ou n'est plus disponible. »**
      - Aucune info instance, aucun bouton d'action nécessaire (le visiteur ne peut rien faire).
    - `@else` (transient) → bloc « erreur temporaire » :
      - Icône neutre (ex. `cloud_off` / `error_outline`).
      - Message : **« Une erreur est survenue. Réessayez dans quelques instants. »**
      - Bouton **« Réessayer »** (`mat-button` / `mat-stroked-button`) → `(click)="load()"`.
  - [x] Conserver les `class="error-state"` (utilisée par le sélecteur E2E) sur le conteneur commun ; distinguer éventuellement par une classe modificatrice (`error-state--gone` / `error-state--transient`) pour le style, sans changer la classe racine.
  - [x] **Ne PAS** rendre de titre de recette, d'ID, de status HTTP brut, ni de trace technique (AC1/AC5 : neutralité).

### T3 — Styles : page d'erreur sobre et centrée (AC: AC5)

- [x] Modifier `frontend/src/app/share/components/share-view/share-view.component.scss` (`.error-state`) :
  - [x] Centrage vertical/horizontal léger, padding généreux (déjà `48px 16px`), icône de taille modérée (ex. 48px) en couleur secondaire (`--color-text-secondary` / token neutre), message en dessous, bouton retry espacé.
  - [x] Thème clair, tokens `--mat-sys-*` / `--color-*` — **pas** de couleurs en dur. Mobile-first (les liens sont ouverts sur mobile, cf. UX « Vues publiques : Mobile-first »).
  - [x] Rester cohérent visuellement avec le reste de `share-view` (mêmes marges/typographie sobres).

### T4 — Tests frontend (AC: AC1, AC2, AC4, AC5)

- [x] Modifier `frontend/src/app/share/components/share-view/share-view.component.spec.ts` (**runner = Vitest via `ng test --no-watch`** — le fichier utilise `vi.fn()`, PAS `jasmine`/`jest` ; suivre ce pattern existant) :
  - [x] **Adapter** le test « état erreur neutre (404) » existant : mock `throwError(() => ({ status: 404 }))` → assert `error() === 'gone'` (ou `hasError()` selon ton modèle), `isLoading()===false`, et le texte affiché = **« Ce lien a expiré ou n'est plus disponible. »** (mettre à jour l'assertion `toContain(...)`).
  - [x] **Nouveau** — erreur transitoire : mock `throwError(() => ({ status: 500 }))` → assert `error() === 'transient'`, message temporaire affiché, bouton « Réessayer » présent dans le DOM. Idem pour `{ status: 429 }` et `{ status: 0 }` (au moins un cas non-404 supplémentaire, idéalement les trois).
  - [x] **Nouveau** — retry (AC4) : première réponse `throwError(status:500)` → état transient ; puis reconfigurer le mock `getPublicRecipe` pour renvoyer `of(mockRecipe)` et appeler `component.load()` → assert que la recette s'affiche et `error()===null`.
  - [x] Conserver verts les tests existants (chargement recette, AC2 convives, AC4 avant-propos, AC5 thème, AC3 meta noindex).
- [x] `frontend/src/app/shared/services/sharing.service.spec.ts` : **pas de changement** (aucune modif service).

### T5 — Test E2E (AC: AC1/AC2 via 404, AC5)

- [x] Modifier `e2e/tests/recipes-public-share.spec.ts` :
  - [x] **Mettre à jour** l'assertion du token bidon (ligne ~82) : `.error-state` doit désormais contenir **« Ce lien a expiré ou n'est plus disponible. »** (nouveau libellé Décision A) au lieu de « Ce lien n'est plus disponible ». Conserver `expect(invalidRes.status()).toBe(404)` et `.recipe-title` count 0.
  - [x] Optionnel (si praticable sans stack instable) : ajouter une assertion que **le contenu de la recette n'est pas leaké** sur la page d'erreur (aucun `.recipe-title`, aucune info instance) — largement déjà couvert par le count 0 existant.
  - [x] **Ne pas** tenter de simuler un 5xx/429 en E2E (nécessiterait une interception réseau / un throttle réel — hors périmètre fiable ; couvert par les tests unitaires T4). Documenter ce choix en commentaire.
  > Les tests E2E ne tournent pas dans cet environnement (stack non démarrée, `E2E_ADMIN_*` absents) — écrire conforme au pattern et valider via `npx playwright test recipes-public-share --list`.

### T6 — Vérification backend : aucune régression du 404 neutre (AC: AC3)

- [x] **Ne rien modifier** dans `backend/src/sharing/` (Décision A). Simplement **confirmer** :
  - `SharingService.findPublicRecipe` lève bien `NotFoundException()` **nue** (sans message) pour token inexistant/révoqué/expiré/`note`/recette orpheline — déjà couvert par `sharing.service.spec.ts` (7 cas, story 6.3).
  - `PublicSharingController` renvoie 404 + en-têtes `X-Robots-Tag: noindex` / `Cache-Control: private, no-store` — déjà en place.
- [x] Lancer la suite backend pour prouver la non-régression : `cd backend && npx jest` (attendu : vert, inchangé vs 6.3).

---

## Dev Notes

### État hérité de 6.3 (base de cette story)

| Élément | Fichier | Ce que 6.4 en fait |
|--------|---------|--------------------|
| `ShareViewComponent` (états `isLoading` / `recipe` / `hasError` / stepper / thème clair / noindex) | `frontend/.../share-view/share-view.component.ts` | **Modifié** : `hasError` → nature d'erreur typée + retry |
| Template : bloc `@else if (hasError())` avec `<h1>Ce lien n'est plus disponible</h1>` | `share-view.component.html` | **Modifié** : deux sous-états (gone / transient) + action retry |
| Styles `.error-state` (basique) | `share-view.component.scss` | **Modifié** : présentation sobre centrée |
| `getPublicRecipe(token)` → `GET /api/sharing/:token` | `frontend/.../shared/services/sharing.service.ts` | **Inchangé** |
| Endpoint public `404` neutre + tests | `backend/src/sharing/*` | **Inchangé — vérifié seulement** |
| Intercepteur `auth-error` pass-through sur `/share` (401 bootstrap `me()`) | `frontend/.../interceptors/auth-error.interceptor.ts` | **Inchangé** — déjà correct (le 401 de bootstrap ne pollue pas ; les 404/5xx de `getPublicRecipe` ne sont pas des 401 donc traversent l'intercepteur sans effet). Aucun changement requis. |

> **Callback erreur actuel (6.3) à remplacer** (`share-view.component.ts:73`) :
> ```typescript
> error: () => { this.isLoading.set(false); this.hasError.set(true); }
> ```
> → discrimine désormais par `err.status` (Décision C).

### Sécurité — invariants à préserver (PRD NFR Sécurité, AC3)

- **Non-révélation** : la page d'erreur ne doit **jamais** indiquer si le token a existé, ni sa cause exacte (expiré vs révoqué vs jamais créé) — d'où le **message unique** (Décision A). Aucun `status` HTTP brut, aucun ID, aucun nom de recette/propriétaire affiché.
- **404 neutre backend intact** : ne pas introduire de code/route/`reason` distinguant les causes côté API (Option 2 rejetée).
- **noindex conservé** : `<meta robots noindex>` (déjà posé) reste ; l'en-tête API `X-Robots-Tag` reste (6.3).
- **Isolation** : la vue d'erreur ne charge aucune donnée (elle n'est atteinte que sur échec de `getPublicRecipe`) — rien à sanitiser.

### Distinguer transitoire vs mort — pourquoi c'est le cœur de 6.4

Le finding déféré 6.3 (`deferred-work.md:321`) : un lien **valide** frappé par un `429` (throttler global, actif sur l'endpoint public par 6.3), un `5xx` transitoire ou une coupure réseau affichait « Ce lien n'est plus disponible » → le propriétaire croit son lien révoqué et le régénère inutilement. La différenciation par `status` (Décision C) corrige ça : seul un **`404`** signifie « lien mort » ; tout le reste = « erreur temporaire, réessayez ». Le bouton **Réessayer** permet une récupération immédiate après un throttle/hiccup sans recharger toute la page.

### Ce qu'il ne faut PAS faire (hors périmètre)

- ❌ Modifier le backend (`SharingService`, `PublicSharingController`, migrations) — Décision A : `404` neutre intact.
- ❌ Implémenter l'Option 2 (distinction backend expiré/révoqué, `410 Gone`, `reason`) sans validation explicite de Manu.
- ❌ Créer une route `/error` ou un composant d'erreur dédié — raffiner l'état existant de `ShareViewComponent` (Décision B).
- ❌ Afficher un `status` HTTP, un message technique, un ID ou toute info instance sur la page (non-révélation).
- ❌ Toucher `auth-error.interceptor.ts` (déjà correct pour `/share`) ni `ShareLinkDialog` / génération de lien (6.2).
- ❌ Traiter `resourceType: 'note'` (Épic 8).
- ❌ S'occuper des defers `robots` dupliqué / `removeTag` global (`deferred-work.md:50-51`) ou `servings===0` (`:323`) — non liés à la page d'erreur, laissés tracés.

---

## Project Structure Notes

**Frontend — à MODIFIER (aucun fichier à créer) :**
```
frontend/src/app/share/components/share-view/share-view.component.ts    ← nature d'erreur typée + retry + HttpErrorResponse
frontend/src/app/share/components/share-view/share-view.component.html  ← 2 sous-états (gone/transient) + bouton Réessayer
frontend/src/app/share/components/share-view/share-view.component.scss  ← présentation sobre centrée
frontend/src/app/share/components/share-view/share-view.component.spec.ts ← tests 404 (adapté) + 5xx/429/0 + retry
e2e/tests/recipes-public-share.spec.ts                                  ← libellé d'erreur mis à jour
```
**Backend : AUCUNE modification** (Décision A ; T6 = vérification seule).
**`share.routes.ts`, `sharing.service.ts` (front), `auth-error.interceptor.ts` : PAS de modification.**

Si tu ajoutes `mat-icon` / `mat-button` au template d'erreur : importer `MatIconModule` / `MatButtonModule` dans le `imports` du composant standalone (actuellement absents — seuls `DecimalPipe`, `MatProgressSpinnerModule`, `ConvivesSteppperComponent`, `MarkdownLightPipe` sont importés).

---

## Contexte Epic 6 — vue d'ensemble

| Story | Relation avec 6.4 |
|-------|-------------------|
| 6.1 (done) | Entité `PublicToken` + migration (+ collation binaire corrigée en 6.3). |
| 6.2 (done) | Génération/révocation, `ShareLinkDialog`, badge. |
| 6.3 (done) | Endpoint public `404` neutre + vue `/share/:token` lecture seule + **état d'erreur minimal** (à raffiner ici). A déféré la différenciation 404/transitoire (`deferred-work.md:321`). |
| **6.4 (cette story)** | Page d'erreur neutre **polie** + différenciation lien mort (404) vs erreur transitoire (5xx/429/réseau) + retry. Clôt l'Épic 6. |
| 8.6 / 8.7 (à venir) | Étendront la vue publique + l'endpoint à `resourceType: 'note'` (réutiliseront cet état d'erreur). |

> **Après 6.4, l'Épic 6 est fonctionnellement complet** (rétrospective `epic-6-retrospective: optional`).

---

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 6, **Story 6.4** (lignes 1337–1355) ; AC de validation token (Story 6.1, lignes 1269–1271)
- `_bmad-output/planning-artifacts/prd.md` — FR40 (« page d'erreur neutre sans information sur l'instance »), NFR Sécurité (non-révélation, isolation)
- `_bmad-output/planning-artifacts/architecture.md:53` — « Tokens partage public : validation expiration + révocation côté API, routes publiques en lecture seule stricte » ; `:238` (`/share/:token → ShareModule (lazy, public)`)
- `_bmad-output/planning-artifacts/ux-design-Dashboard.md:666` — flux J4 : « Non / Expiré → Page 404 / Lien expiré, message explicite » (une seule vue d'erreur) ; « Vues publiques : Mobile-first » (l. 954) ; palette neutre (l. 419, 833)
- `_bmad-output/implementation-artifacts/6-3-vue-publique-lecture-seule-recette.md` — état d'erreur minimal (T8, périmètre 6.3), décisions endpoint public / 404 neutre / noindex, review findings
- `_bmad-output/implementation-artifacts/deferred-work.md:321` — **finding déféré traité par cette story** (état d'erreur non différencié 5xx/429/réseau) ; `:50-51` (`robots`/`removeTag`, hors scope) ; `:323` (`servings===0`, hors scope)
- `frontend/src/app/share/components/share-view/share-view.component.{ts,html,scss,spec.ts}` — **cibles de modification** ; callback `error` actuel à `:73`
- `frontend/src/app/shared/services/sharing.service.ts:72` — `getPublicRecipe(token)` (inchangé, source du flux d'erreur `HttpErrorResponse`)
- `frontend/src/app/core/interceptors/auth-error.interceptor.ts` — pass-through `/share` (n'agit que sur 401 ; 404/5xx de `getPublicRecipe` le traversent sans effet) — inchangé
- `backend/src/sharing/sharing.service.ts:93` (`findPublicRecipe`, `404` neutre) et `public-sharing.controller.ts` (en-têtes noindex/no-store) — **à préserver, non modifiés**
- `backend/src/sharing/sharing.service.spec.ts` — 7 cas de `findPublicRecipe` (non-régression T6)
- `e2e/tests/recipes-public-share.spec.ts:82` — assertion libellé d'erreur (à mettre à jour)
- Convention tests frontend : **Vitest via `ng test --no-watch`** (globals `vi.*` — cf. spec existant, PAS jasmine/jest direct) ; backend **Jest** ; E2E **Playwright**

---

## Dev Agent Record

### Agent Model Used

Claude Sonnet 5 (claude-sonnet-5)

### Debug Log References

Aucun blocage. Suite complète backend (`npx jest`, 187 tests) et frontend (`ng test --no-watch`, 155 tests) vertes sans régression. `npx playwright test recipes-public-share --list` confirme la syntaxe E2E.

### Completion Notes List

- `hasError` (booléen) remplacé par `error: signal<'gone' | 'transient' | null>` dans `ShareViewComponent`, classification par `HttpErrorResponse.status` (Décision C) : `404` → `'gone'`, tout le reste (`0`, `429`, `5xx`, inattendu) → `'transient'` (fail-safe).
- Chargement extrait en méthode publique `load()` (appelée par `ngOnInit` et par le bouton « Réessayer »), token stocké en champ privé.
- Template : deux sous-états distincts sous `@else if (error())` — message neutre unique (Décision A : « Ce lien a expiré ou n'est plus disponible. ») pour `'gone'`, message + bouton retry pour `'transient'`. Classe racine `.error-state` conservée (sélecteur E2E), modificateurs `--gone`/`--transient` ajoutés.
- `MatIconModule` / `MatButtonModule` importés dans le composant standalone (absents jusqu'ici) pour l'icône et le bouton retry.
- Styles `.error-state` : centrage flex, icône neutre, tokens design system existants (pas de couleurs en dur).
- Tests unitaires : test 404 adapté au nouveau libellé, 3 nouveaux cas transitoires (500/429/0) via `it.each`, 1 nouveau test de retry (`component.load()` après échec transitoire).
- Test E2E : assertion du token bidon mise à jour avec le nouveau libellé ; commentaire ajouté expliquant pourquoi la différenciation transitoire n'est pas testée en E2E (T5).
- Backend : aucune modification (Décision A) ; T6 vérifié — `SharingService.findPublicRecipe` lève toujours `NotFoundException` nue, suite `sharing.*.spec.ts` inchangée et verte (25 tests).
- Point d'attention : `e2e/` n'a pas de config `.prettierrc` propre — un `prettier --write` lancé depuis la racine reformate ce fichier avec les guillemets doubles par défaut au lieu du style single-quote du reste du repo ; le fichier a été restauré manuellement au style d'origine après coup.

### File List

- `frontend/src/app/share/components/share-view/share-view.component.ts`
- `frontend/src/app/share/components/share-view/share-view.component.html`
- `frontend/src/app/share/components/share-view/share-view.component.scss`
- `frontend/src/app/share/components/share-view/share-view.component.spec.ts`
- `e2e/tests/recipes-public-share.spec.ts`

### Change Log

- 2026-07-13 : Implémentation story 6.4 — différenciation lien mort (404) vs erreur transitoire (5xx/429/réseau) dans `ShareViewComponent`, message neutre unique (Décision A), action « Réessayer » (AC4), présentation sobre centrée (AC5). Aucune modification backend. Tests frontend (11 nouveaux/adaptés) et E2E mis à jour ; suite complète backend/frontend vérifiée sans régression.

---

### Review Findings

_Revue de code adversariale (Blind Hunter + Edge Case Hunter + Acceptance Auditor) — 2026-07-14. Diff `1f22319`..working tree. Conformité AC1–AC5 et Décisions A/B/C : validée (aucune violation bloquante)._

- [x] [Review][Patch] Icône Material chargée depuis un CDN externe — échoue dans le cas offline (`status 0 → 'transient'`), affichant le texte littéral `cloud_off` ; **résolution (choix Manu) : remplacer les `<mat-icon>` par des SVG inline autonomes** [frontend/src/app/share/components/share-view/share-view.component.html:9,14 + frontend/src/index.html:18]
- [x] [Review][Patch] Retry sans garde de ré-entrance : double-clic « Réessayer » lance des GET concurrents non annulés, la dernière réponse arrivée écrase l'état (désactiver le bouton pendant le chargement et/ou garde `if (isLoading()) return;`) [frontend/src/app/share/components/share-view/share-view.component.ts:76]
- [x] [Review][Patch] Callback erreur : `err.status` sans garde optionnelle — accès `.status` sur `err` null/non-HTTP lèverait une TypeError non capturée (`err?.status === 404`) [frontend/src/app/share/components/share-view/share-view.component.ts:95]
- [x] [Review][Patch] État d'erreur non annoncé aux lecteurs d'écran : le conteneur `.error-state` n'a ni `role="alert"` ni `aria-live` (le `loading-state` a `role="status"`) [frontend/src/app/share/components/share-view/share-view.component.html:8]
- [x] [Review][Patch] Test retry (AC4) n'exerce pas le template : `component.load()` appelé directement, sans `fixture.detectChanges()` ni assertion DOM (`.recipe-title` présent / `.error-state` absent) [frontend/src/app/share/components/share-view/share-view.component.spec.ts:112]
- [x] [Review][Patch] Aucun test unitaire ne couvre le chemin « token absent → 'gone' » (branche `!this.token`) [frontend/src/app/share/components/share-view/share-view.component.spec.ts]
- [x] [Review][Defer] Pas d'`@else` final si `next` émet une recette null (200 sans corps) → page blanche ; structure de template préexistante, le contrat 404 backend l'empêche aujourd'hui [frontend/src/app/share/components/share-view/share-view.component.html:19] — deferred, pre-existing
