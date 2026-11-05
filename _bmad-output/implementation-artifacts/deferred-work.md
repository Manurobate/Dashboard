# Deferred Work

## Deferred from: code review (2e passe) de 7-2-endpoint-verification-connectivite-trilium (2026-11-05)

- **Message d'erreur unique pour toutes les erreurs HTTP du ping** — `frontend/src/app/settings/notes-settings/notes-settings.component.ts` — 400 (URL/protocole invalide), 401, 429 (throttle 15/min) et 500 affichent tous « Instance inaccessible — vérifiez l'URL ». Conforme à AC3 ; distinguer au moins 429 (« trop de tentatives ») et 400 serait une amélioration UX.
- **Mock `globalThis.fetch` jamais restauré dans les specs Jest** — `backend/src/trilium/trilium.service.spec.ts`, `backend/src/og-fetch/og-fetch.service.spec.ts` — Le mock fuit vers les autres fichiers du même worker. Corriger globalement via `jest.spyOn(globalThis, 'fetch')` + `mockRestore()` en `afterEach`.
- **`triliumUrl` sauvegardée sans `trim()`** — `frontend/src/app/settings/notes-settings/notes-settings.component.ts` (`onSubmit`, story 7.1) — Le test de connexion trime l'URL mais la sauvegarde envoie la valeur brute ; une URL avec espaces passe le test puis est stockée telle quelle.
- **AC5 (401 sans JWT) non couvert automatiquement** — `backend/src/trilium/trilium.controller.spec.ts` — Le module de test est monté sans guard ; pas de test supertest/e2e backend des guards dans le projet. Vérifié manuellement via curl.

## Deferred from: code review de 7-2-endpoint-verification-connectivite-trilium (2026-07-14)

- **SSRF « basique » (schéma http/https seulement) + `redirect: 'follow'`** — `backend/src/trilium/trilium.service.ts` + `trilium.controller.ts` — Aucun blocage des IP privées/loopback/link-local ; un utilisateur authentifié peut sonder le réseau interne (ex. `http://169.254.169.254/`, `http://127.0.0.1:6379/`), et un redirect vers une cible interne contourne même la validation d'origine. **Volontairement accepté** : reproduit à l'identique l'endpoint existant `og-preview`, et les Dev Notes excluent explicitement le blocage LAN car Trilium est auto-hébergé sur le réseau local. Risque faible sur un dashboard perso mono-utilisateur. À revisiter si multi-utilisateurs / exposition publique.
- **Fuite `reason`/URL complète (client + logs)** — `backend/src/trilium/trilium.service.ts` — `reason: String(err)` renvoie les détails d'erreur réseau (ECONNREFUSED/ENOTFOUND/host/port) au client, et `logger.warn` logge l'URL complète (userinfo/mot de passe possible). `reason` est imposé par AC3 et le log copie le pattern `OgFetchService`. Éventuellement : logger `parsed.origin` et retirer/collapser `reason` si jamais l'app est durcie.

## Deferred from: code review de 6-1-entite-publictoken-migration (2026-06-19)

- **`resourceId` sans FK ni référence** — `backend/src/sharing/public-token.entity.ts` — Lien polymorphique intentionnel (peut pointer Recipe ou Note). La cascade sur suppression de ressource sera gérée côté service en Story 6.2. Tokens orphelins possibles entre 6.1 et 6.2.
- **Pas d'index composite `(resourceType, resourceId)`** — `backend/src/migrations/1781894312446-CreatePublicToken.ts` — Lookup "tous les tokens d'une recette" sera un full-scan sans cet index. À ajouter si les volumes le justifient, ou en Story 6.2 si le pattern de requête est confirmé.

## Deferred from: code review de 5-5-suppression-d-une-recette (2026-06-02)

- **TOCTOU** — `remove()` : `findOne` + `delete` non atomiques; une suppression concurrente entre les deux appels passerait silencieusement. Pattern accepté pour un dashboard mono-utilisateur. [`backend/src/recipes/recipes.service.ts`]
- **Absence de transaction autour de `remove()`** — Contrairement à `update()` qui utilise `dataSource.transaction`, `remove()` effectue le delete hors transaction. Acceptable car la cascade DB gère les enfants en une seule opération. [`backend/src/recipes/recipes.service.ts`]
- **`@UseGuards` non visible sur `DELETE :id`** — Le diff n'expose pas le décorateur de guard (probablement au niveau classe). À vérifier manuellement que le guard JWT est bien hérité. [`backend/src/recipes/recipes.controller.ts`]
- **Pas de rollback optimiste dans `deleteRecipe()`** — Si l'HTTP call échoue après que le `tap()` ait mis à jour le signal, la liste est désynchronisée jusqu'au prochain rechargement. Pattern intentionnel cohérent avec `updateRecipe()`. [`frontend/src/app/recipes/recipes.service.ts`]
- **Subscriptions imbriquées dans `afterClosed`** — Le pattern `subscribe` dans un `subscribe` est anti-idiomatique RxJS (préférer `switchMap`). Fonctionnel grâce à `DestroyRef` explicite mais non idiomatique. [`recipe-detail.component.ts`, `recipes.component.ts`]
- **`waitForLoadState('networkidle')` en E2E** — Synchronisation fragile pouvant provoquer des timeouts flaky sur Angular avec signals. Pattern pré-existant dans tout le suite E2E. [`e2e/tests/`]
- **Vérification `userId == null` absente dans `remove()`** — Si une recette avait un `userId` null en base (violation de contrainte depuis story 5.1), la comparaison stricte `!==` retournerait 403 à tort. [`backend/src/recipes/recipes.service.ts:80`]
- **Info-leak 403 vs 404** — Le 403 révèle l'existence d'une recette appartenant à un autre user (enumeration possible). Comportement explicitement requis par AC2; trade-off volontaire accepté. [`backend/src/recipes/recipes.service.ts`]

## Deferred from: code review de 1-1-initialisation-du-monorepo-et-configuration-du-projet (2026-04-22)

- **`cookieParser` sans secret de signature** — `backend/src/main.ts` — À configurer avec les cookies JWT signés, Story 2.x.
- **Stratégie d'enregistrement Service Worker trop agressive (30s stable)** — `frontend/src/app/app.config.ts` — À affiner dans Story 1.6 (PWA app shell) selon le comportement réel de l'app.
- **`sourceMap: true` dans tsconfig backend sans override production** — `backend/tsconfig.json` — Choix acceptable pour ce projet; à décider si les source maps doivent être absents du bundle prod.
- **Pas de middleware `helmet`** — `backend/src/main.ts` — Headers de sécurité standards (CSP, HSTS, X-Frame-Options) absents; à ajouter avant la mise en production.
- **`typeorm.config.ts` CLI bypasse la validation Joi** — `backend/src/config/typeorm.config.ts` — Si le CLI est lancé sans `.env` correctement chargé, les variables DB sont `undefined` avec erreur MySQL cryptique. À documenter dans le README ou sécuriser dans la story de migration (Story 2.1).
- **Valeur exemple `JWT_SECRET` valide la contrainte Joi (risque prod si copiée)** — `.env.example`, `backend/.env.example` — La valeur `minimum_32_characters_secret_change_me_in_production` passe `min(32)`. À surveiller lors du déploiement initial.

## Deferred from: code review de 1-2-deploiement-docker-compose-avec-mariadb (2026-04-22)

- **Pas de `proxy_read_timeout`/`proxy_connect_timeout` dans nginx.conf** — `frontend/nginx.conf` (location `/api`) — Timeout par défaut nginx à 60 s; si le backend répond lentement ou est bloqué, les workers nginx sont retenus. À configurer lors d'un passage sur l'infrastructure (potentiellement Story 1.7 ou une story NFR dédiée).

## Deferred from: code review de 1-4-design-system-noir-braise-et-theme-angular-material (2026-04-23)

- **TestBed ne réinitialise pas le singleton entre les tests** — `frontend/src/app/core/services/theme.service.spec.ts` — `TestBed.resetTestingModule()` absent de `afterEach` ; risque de fuite d'état entre tests selon la configuration Vitest.
- **Test manquant : `defaultView === null`** — `frontend/src/app/core/services/theme.service.spec.ts` — Le cas SSR/Node (document sans `defaultView`) n'est pas couvert par les tests unitaires.
- **Absence de `prefers-color-scheme` comme fallback système** — `frontend/src/app/core/services/theme.service.ts` — Pour un premier visiteur, le thème est toujours clair quel que soit le réglage OS. À envisager dans une future itération UX.
- **FOUT résiduel si le script est différé** — `frontend/src/main.ts` — Si le bundler charge le script en mode `defer`, le correctif anti-FOUC dans `main.ts` s'exécute après le premier paint. Mitigation via un `<script>` inline dans `index.html` si le FOUT devient visible en production.
- **`localStorage.setItem` non protégé contre `QuotaExceededError`** — `frontend/src/app/core/services/theme.service.ts:22` — Échec silencieux si le stockage est saturé ; la préférence thème n'est pas persistée. Acceptable pour stocker une seule chaîne.

## Deferred from: code review de 1-5-navigation-responsive-top-bar-bottom-nav (2026-04-23)

- **Pas de route wildcard `**`** — `frontend/src/app/app.routes.ts` — Toute URL inconnue affiche un `<router-outlet>` vide sans feedback. À ajouter dans une story dédiée (404 page ou redirect).
- **`routerLinkActive` sans `{exact: true}`** — `bottom-nav.component.html`, `top-bar.component.html` — Sur de futures routes enfants `/links/…`, l'item "Liens" resterait actif en permanence. Sans impact aujourd'hui (pas de routes enfants en scope).
- **Pas d'error boundary sur les chunks lazy-loaded** — `frontend/src/app/app.routes.ts` — Si le réseau coupe, la route ne charge pas et l'utilisateur voit une page blanche sans message. À traiter avec `withNavigationErrorHandler()` lors d'une story NFR ou UX dédiée.
- **Flash du thème clair au premier chargement** — `frontend/src/main.ts` — ThemeService s'initialise après Angular boot ; un script inline dans `index.html` pourrait pré-appliquer la classe dark avant le premier paint. Déjà noté comme FOUT dans la story 1.4.
- **Overflow possible sur la toolbar en viewport 768–769px** — `top-bar.component.scss` — Sur tablette borderline, les 3 onglets + titre + 2 boutons peuvent déborder. Hors scope du breakpoint mobile/desktop basique.

## Deferred from: code review de 1-6-pwa-app-shell (2026-05-01)

- **Risque de tag `robots` dupliqué** — `frontend/src/app/share/components/share-view/share-view.component.ts` — `Meta.addTag` ne vérifie pas l'existence d'un tag existant ; si le composant est réinstancié sans destroy préalable, deux tags `noindex` coexistent dans le DOM. Utiliser `updateTag` à la place lors de l'implémentation réelle (Epic 6).
- **`meta.removeTag` supprime tous les tags `name='robots'`** — `frontend/src/app/share/components/share-view/share-view.component.ts` — Le sélecteur `"name='robots'"` est global ; si `index.html` ou un autre composant ajoute un tag `robots`, il sera supprimé à la destruction de `ShareViewComponent`. À revoir lors de l'implémentation Epic 6/7.
- **Texte placeholder en dur visible en production** — `frontend/src/app/share/components/share-view/share-view.component.ts` — `"Contenu partagé — disponible à partir de l'Épic 6"` s'affiche pour tout `/share/:token`. Intentionnel pour V1 — remplacer par la vue réelle en Epic 6.
- **`title` manquant sur la route `/share`** — `frontend/src/app/app.routes.ts` — L'entrée de l'historique navigateur et les lecteurs d'écran n'ont pas de titre. À ajouter avec `TitleStrategy` lors de l'implémentation Epic 6.
- **Pas de `ChangeDetectionStrategy.OnPush` sur `ShareViewComponent`** — `frontend/src/app/share/components/share-view/share-view.component.ts` — Composant standalone sans inputs ni observables, candidat naturel pour OnPush. À appliquer lors de l'implémentation réelle Epic 6.
- **`registerImmediately` — conflit d'activation SW multi-onglets** — `frontend/src/app/app.config.ts` — Si un nouveau SW est déployé pendant qu'un onglet est ouvert, `registerImmediately` active le nouveau SW sans fenêtre de stabilisation. Requêtes XHR en vol peuvent changer de version. À surveiller si `skipWaiting`/`clients.claim` est activé dans `ngsw-worker`.

## Deferred from: code review de 1-7-dumps-automatises-de-la-base-de-donnees (2026-05-01)

- **Comportement au redémarrage** — `docker-compose.yml` — `restart: unless-stopped` + boucle `sleep 86400` peut déclencher un dump supplémentaire en cas de restart du container. Design intentionnel (NFR17 interdit cron externe) ; à évaluer si la fréquence de restart devient problématique.
- **Vérification d'intégrité des dumps absente** — `scripts/backup.sh` — La taille seule (via `du`) ne valide pas la cohérence du dump SQL. Envisager `mariadb-check` ou un checksum lors d'une story NFR dédiée.
- **Absence de limites de ressources sur le container backup** — `docker-compose.yml` — Pas de `mem_limit`/`cpus` ; un dump sur une grosse base peut concurrencer le container `db`. À configurer lors d'un passage sur l'infrastructure.
- **`find -delete` peut échouer silencieusement** — `scripts/backup.sh:20` — Erreur de permissions sur de vieux dumps non détectée ; cas théorique dans ce contexte mais à noter pour les déploiements avec stockage NFS.
- **Documentation des variables requises** — `DB_USER`, `DB_PASSWORD`, `DB_NAME` sont obligatoires et sans valeur par défaut ; à documenter explicitement dans le README et `.env.example` avant la mise en production.

## Deferred from: code review de 2-1-entites-user-refreshtoken-migration-initiale (2026-05-02)

- **Contrainte longueur `username` manquante dans l'entité** — `backend/src/users/user.entity.ts` — `@Column({ unique: true })` sans `length`; à ajouter dans le DTO de validation de story 2.2.
- **Couverture de tests manquante pour les chemins d'erreur de `findByUsername`** — `backend/src/users/users.service.spec.ts` — Aucun test de rejet de la promesse (exception DB) ; à compléter dans une story future.
- **`isActive` non filtré dans `findByUsername`** — `backend/src/users/users.service.ts` — Un utilisateur désactivé est retourné sans filtrage (la vérification est dans `validateUser`, pas dans la requête). Le guard `isActive` est prévu en story 2.2.
- **Risque de troncature `varchar(500)` pour tokens JWT longs** — `backend/src/auth/entities/refresh-token.entity.ts` — À valider selon le format de token retenu en story 2.2 ; ajuster la longueur si nécessaire.

## Deferred from: code review de 2-2-connexion-securisee-avec-rate-limiting (2026-05-02)

- **Race TOCTOU du seed admin** — `backend/src/auth/admin-seed.service.ts` — Check-then-act non atomique ; deux instances simultanées peuvent créer deux admins ou crasher sur contrainte unique. App mono-instance, à adresser si scale-out.
- **Appels `me()` parallèles sans déduplication dans `authGuard`** — `frontend/src/app/core/guards/auth.guard.ts` — Navigation concurrente peut déclencher plusieurs requêtes `/api/auth/me`. Improbable en mono-utilisateur.
- **`req.user` typé `UserEntity` sous `JwtAuthGuard`** — `backend/src/auth/strategies/jwt.strategy.ts` — La JWT strategy retourne `{ id, username, role }` mais le type déclaré est `UserEntity`. Pas de bug actuel, risque de confusion pour futur code.
- **Cohérence `env_file` du service `db` dans docker-compose** — `docker-compose.yml` — Le service `backend` passe à `backend/.env` mais le service `db` n'est pas dans le diff. À vérifier que `DB_ROOT_PASSWORD` est lu depuis le bon fichier.
- **Cookie `refresh_token` `path: '/api/auth'` fragile si endpoint refresh déplacé** — `backend/src/auth/auth.controller.ts` — Correct pour l'architecture actuelle ; à documenter en story 2.3.
- **`isActive` non re-vérifié sur le path JWT** — `backend/src/auth/auth.service.ts` — Un user désactivé garde un accès valide jusqu'à l'expiration du JWT (15 min). La révocation du token de story 2.4 ne couvre pas ce path.
- **Cast `any` sur `useFactory` de `JwtModule`** — `backend/src/auth/auth.module.ts` — Workaround documenté pour incompatibilité de type `StringValue` de `@types/jsonwebtoken`. À nettoyer si la dépendance est mise à jour.

## Deferred from: code review de 2-3-session-persistante-avec-refresh-silencieux (2026-05-02)

- **Variables module-level `isRefreshing`/`refreshSubject`** — `frontend/src/app/core/interceptors/auth-error.interceptor.ts:15` — Pattern spec-requis pour la déduplication des refreshs concurrents. Acceptable en SPA single-thread; à encapsuler dans un service injectable si SSR ou tests d'isolation sont requis.
- **`@SkipThrottle()` sur `POST /auth/refresh`** — `backend/src/auth/auth.controller.ts:73` — Décision spec consciente : les refreshs silencieux sont fréquents et ne doivent pas être bloqués. À revisiter si un endpoint de refresh dédié avec throttle personnalisé est voulu.
- **`parseJwtExpiry` avec valeur env numérique pure** — `backend/src/auth/auth.controller.ts:20` — Si `JWT_EXPIRY=900` (sans suffixe), la valeur est interprétée en millisecondes (900ms) au lieu de secondes. Problème pré-existant dans `auth.controller.ts`; à documenter et corriger dans une story NFR.
- **CSRF via `X-Requested-With` — protection limitée** — `backend/src/common/middleware/csrf.middleware.ts` — `X-Requested-With: XMLHttpRequest` est une heuristique pré-CORS, contournable par tout client non-navigateur. Mitigation V1 intentionnelle; à remplacer par un vrai token CSRF (double-submit ou SameSite=Strict) dans une story sécurité dédiée.
- **`CsrfMiddleware` bloque les `POST` Swagger en dev** — `backend/src/app.module.ts:56` — `forRoutes('*')` applique le middleware à l'UI Swagger; les appels "Try it out" renvoient 403 sans le header. Noté dans les Dev Notes; acceptable en dev (Swagger est réservé aux agents dev).
- **`refreshToken()` Angular avale toutes les erreurs réseau** — `frontend/src/app/core/services/auth.service.ts:46` — Toute erreur (5xx, timeout, DNS) est convertie en `of(false)` et redirige vers `/login`. Comportement V1 intentionnel; à différencier erreur réseau/token invalide dans une story UX future.
- **Boucle infinie théorique sur 401 de permission** — `frontend/src/app/core/interceptors/auth-error.interceptor.ts:45` — Si un endpoint retourne 401 pour des raisons de permissions (au lieu de 403), l'intercepteur refresh/retry boucle. Sans impact si le backend respecte la convention 401=non-authentifié / 403=non-autorisé.

## Deferred from: code review de 2-4-deconnexion (2026-05-03)

- **Logout mono-session uniquement** — `backend/src/auth/auth.service.ts` — `delete({ token: tokenHash })` révoque un seul token ; les autres sessions actives restent valides. Révocation multi-appareils hors scope V1 explicitement.

## Deferred from: code review de 2-5-changement-de-mot-de-passe-temporaire-force (2026-05-03)

- **`/change-password` accessible aux utilisateurs sans `mustChangePassword=true`** — comportement V1 intentionnel par spec T10 ; à reconsidérer si un guard inverse est souhaité dans une future story.
- **Double appel `me()` entre `authGuard` et `mustChangePasswordGuard`** — `frontend/src/app/core/guards/` — pattern pré-existant dans `authGuard` ; improbable en mono-utilisateur.
- **`updatePasswordAndClearFlag` non-atomique** — `backend/src/users/users.service.ts` — UPDATE + findById en deux requêtes sans transaction TypeORM ; concerne l'architecture globale.
- **Fuite potentielle de champs sensibles futurs via destructuring manuel** — `backend/src/auth/auth.service.ts` — si `UserEntity` gagne de nouvelles colonnes sensibles, elles ne seront pas automatiquement exclues de la réponse.
- **Pas de test pour la double soumission (`isLoading = true`)** — `frontend/src/app/auth/change-password/` — couverture non critique, à ajouter lors d'un passage sur les tests frontend.
- **`mustChangePasswordGuard` absent des routes wildcard/futures** — `frontend/src/app/app.routes.ts` — AC1 couvert pour les routes actuelles ; à maintenir à chaque ajout de route protégée.

## Deferred from: code review de 2-6-changement-de-mot-de-passe-par-l-utilisateur (2026-05-03)

- **TOCTOU race condition dans `updatePasswordHash`** — `backend/src/users/users.service.ts` — UPDATE + findById en deux requêtes sans transaction ; même pattern que `updatePasswordAndClearFlag` (déjà différé story 2.5). À adresser globalement.
- **`authErrorInterceptor` correspondance de sous-chaîne fragile** — `frontend/src/app/core/interceptors/auth-error.interceptor.ts` — `req.url.includes(...)` est un pattern existant ; à remplacer par une correspondance exacte ou un Set de chemins exclus.
- **Troncature bcrypt à 72 octets pour mots de passe Unicode** — `backend/src/auth/` — `MaxLength(128)` en caractères ≠ octets ; deux mots de passe distincts peuvent produire le même hash si >72 octets. Problème système entier.
- **`@SkipThrottle()` sur endpoints sensibles de changement de mot de passe** — `backend/src/auth/auth.controller.ts` — Décision délibérée per spec. À revisiter dans une story NFR sécurité dédiée.
- **`isActive` non re-vérifié dans `findById` avant modification du mot de passe** — `backend/src/users/users.service.ts` — Un compte désactivé peut encore changer son mot de passe via l'endpoint. Pattern pré-existant dans tous les flows auth.
- **JWT cookie non rafraîchi après changement de mot de passe** — `frontend/src/app/core/services/auth.service.ts` — Pas d'impact actuel (claims JWT inchangés). À revoir si un claim `passwordVersion` est introduit.
- **Test `updatePasswordHash` mocke `affected` sans que l'implémentation le lise** — `backend/src/users/users.service.spec.ts` — Le test est correct dans ses assertions finales mais ne teste pas le chemin qu'il croit tester. Amélioration qualité test.
- **Message 401 distingue "user inexistant" de "mauvais mot de passe"** — `backend/src/auth/auth.service.ts` — Fuite théorique : `UnauthorizedException()` sans message vs `UnauthorizedException('Mot de passe actuel incorrect')`. Quasi-inexploitable sous JWT guard valide.

## Deferred from: code review de 3-0-setup-tests-e2e-playwright (2026-05-11)

- **Stale DB sur runners self-hosted** — `.github/workflows/ci.yml` — `docker compose down` sans `--volumes` laisse le volume `db_data` intact ; le seed admin est skippé au redémarrage si l'admin existe déjà, exposant un mauvais mot de passe en CI. N'impacte que les self-hosted runners.
- **Smoke test sans assertion explicite en cas d'échec login** — `e2e/tests/auth.spec.ts` — Un 429 rate-limit ou une erreur réseau provoque un timeout de `waitForURL` sans message utile. Améliorer avec les prochaines stories E2E.
- **Pas de `retries` dans la config Playwright** — `e2e/playwright.config.ts` — Choix de conception : les flaky tests doivent être corrigés à la source plutôt que masqués par des retries.
- **Credentials CI statiques visibles dans le workflow** — `.github/workflows/ci.yml` — `ci_user`/`ci_password`/`jwt_secret` en clair dans le YAML. Risque acceptable pour des conteneurs CI éphémères (MVP) ; à migrer vers des secrets GitHub si le repo devient public.

## Deferred from: code review de 3-1-panneau-admin-liste-des-comptes-utilisateurs (2026-05-12)

- **`AdminService providedIn: 'root'` — liste stale entre sessions** — `frontend/src/app/admin/admin.service.ts:16` — Le signal `users` n'est jamais vidé lors du logout ; un autre utilisateur connecté dans la même session verra brièvement la liste de l'admin précédent. À adresser avec un reset dans le flow de déconnexion.
- **`findAll()` sans pagination ni limite** — `backend/src/users/users.service.ts:39` — `this.userRepository.find()` sans options retourne l'intégralité de la table `User`. À paginer quand le nombre d'utilisateurs devient significatif.
- **`name!: string` type TypeScript incohérent avec colonne DB nullable** — `backend/src/users/user.entity.ts:21` — L'assertion `!` prétend que `name` ne peut pas être `null`, mais la DB l'accepte. Le DTO protège avec `?? ''`, mais le type entity est techniquement inexact.
- **Observable HTTP souscrit sans `takeUntilDestroyed`** — `frontend/src/app/admin/admin-panel.component.ts:24` — `loadUsers().subscribe()` sans cleanup ; les HTTP observables se complètent automatiquement, mais l'absence de `takeUntilDestroyed` est un anti-pattern pour les futures évolutions du composant.
- **`userRepository.find()` charge `passwordHash` en mémoire** — `backend/src/users/users.service.ts:39` — Les champs sensibles sont filtrés au niveau du DTO, mais chargés en mémoire. Ajouter `{ select: ['id', 'username', 'name', 'role', 'mustChangePassword', 'isActive', 'createdAt', 'updatedAt'] }` pour ne jamais charger `passwordHash` ni `refreshTokens`.
- **`adminGuard` redirige un utilisateur null vers `/links`** — `frontend/src/app/core/guards/admin.guard.ts:9` — Si `currentUser()` est `null` quand `adminGuard` s'exécute (race condition ou erreur `authGuard`), la redirection va vers `/links` plutôt que `/login`. Pré-existant dans l'architecture des guards.
- **E2E `loginAdmin` timeout cryptique si URL post-login inattendue** — `e2e/tests/admin.spec.ts:14` — `waitForURL(/\/(links|change-password)$/)` échoue avec un timeout opaque si l'admin est redirigé vers une URL non listée. À rendre explicite si de nouvelles redirections post-login sont ajoutées.

## Deferred from: code review de 3-2-creation-d-un-compte-utilisateur-avec-mot-de-passe-temporaire (2026-05-12)

- **Case sensitivity des usernames** — `backend/src/users/users.service.ts` — `findByUsername` effectue une recherche exacte ; un admin peut créer `"Alice"` et `"alice"` comme deux comptes distincts si la collation DB est case-sensitive. Adressé partiellement par le sprint-change 2026-05-12 (normalisation `.toLowerCase()` au niveau applicatif) — la contrainte DB reste dépendante de la collation MariaDB (`utf8mb4_general_ci` est case-insensitive par défaut mais varie selon la configuration).
- **Test e2e AC1 — vérification "une seule fois" du mdp** — `e2e/tests/admin.spec.ts` — Le caractère "une seule fois" de l'affichage du mdp temporaire n'est pas couvert par les tests E2E (seule la visibilité initiale est vérifiée). Comportement garanti par le state machine Angular.

## Deferred from: sprint-change email-username-required (2026-05-12)

- **Normalisation email au niveau DB** — `backend/src/users/user.entity.ts` — La normalisation `.toLowerCase()` est appliquée au niveau applicatif dans `UsersService` ; en cas de migration de données directe (import SQL) sans passer par le service, des doublons case-insensitifs restent possibles. À compléter avec une contrainte collation explicite ou un trigger si l'import direct de données est envisagé.
- **Message d'erreur email : "email" vs "e-mail"** — `backend/src/users/dto/create-user.dto.ts` vs `frontend/src/app/admin/create-user-dialog.component.html` — Le DTO retourne `"Format d'adresse email invalide"` (sans tiret), le frontend affiche `"Format d'adresse e-mail invalide"` (avec tiret). Incohérence mineure acceptable en V1 (les deux messages sont en français correct).
- **`Validators.email` Angular valide moins strictement que `@IsEmail()` class-validator** — `frontend/src/app/admin/create-user-dialog.component.ts`, `frontend/src/app/auth/login/login.component.ts` — Angular considère `a@b` valide ; class-validator rejette les domaines sans point. La validation backend est la référence. À documenter si des UX de feedback prématuré sont observées.

## Deferred from: code review de 3-4-desactivation-et-suppression-d-un-compte-utilisateur (2026-05-13)

- **Transactions manquantes disableUser + deleteUser** — `backend/src/users/users.service.ts` — Pattern pré-existant identique à `resetPasswordByAdmin` ; fix nécessite injection `DataSource` cross-story. Impact sécurité limité : `isActive=false` bloque le refresh même si la suppression des tokens échoue.
- **`isActioning` signal global bloque toute la table** — `frontend/src/app/admin/admin-panel.component.ts:59` — Pattern pré-existant des stories précédentes. Amélioration UX : un signal par ligne.
- **`loadUsers()` erreur silencieuse après action** — `frontend/src/app/admin/admin-panel.component.ts` — Si le rechargement échoue, la table reste dans un état périmé sans feedback. Pattern identique aux stories 3.1/3.2/3.3.
- **`authService.currentUser()` peut être null — affichage des boutons** — `frontend/src/app/admin/admin-panel.component.html:67` — Si `currentUser()` est `null`, les boutons d'action seraient visibles sur son propre compte. Cosmétique : auth guard empêche `/admin` sans session valide.
- **Idempotence disable/enable (compte déjà dans l'état cible)** — `backend/src/users/users.service.ts` — L'appel sur un compte déjà désactivé/actif réexécute les opérations DB inutilement. Comportement idempotent acceptable.
- **E2E ne teste pas la déconnexion immédiate d'une session active** — `e2e/tests/admin.spec.ts` — AC1 stipule que l'utilisateur est déconnecté immédiatement ; le test vérifie uniquement que le login est bloqué après désactivation, pas qu'une session active est coupée. Test complexe (2 contextes browser).
- **Race condition TOCTOU findById → update** — `backend/src/users/users.service.ts` — Pattern pré-existant dans toute la codebase. Deux requêtes simultanées peuvent passer le check `findById` avant que la première ait écrit.

## Deferred from: code review de 3-5-page-profil-utilisateur (2026-05-18)

- **Race condition `update()`/`findById()` sans transaction dans `updateProfile`** — `backend/src/users/users.service.ts:155` — Pattern identique à `updatePasswordAndClearFlag` et `disableUser`, déjà tracé story 2.5/3.4. Fix global nécessite injection `DataSource`.
- **Réponse backend: spread blocklist (`passwordHash`, `refreshTokens`) plutôt que whitelist** — `backend/src/users/users.controller.ts` — Un nouveau champ sensible ajouté à `UserEntity` serait automatiquement exposé. Pattern pré-existant dans tous les endpoints. À adresser via DTO de réponse dédié si `UserEntity` gagne de nouvelles colonnes sensibles.
- **Test contrôleur `400` ne teste pas la `ValidationPipe` réelle** — `backend/src/users/users.controller.spec.ts` — Le mock simule un rejet service plutôt que le comportement du `ValidationPipe` NestJS. Architecture de test unitaire intentionnelle (ValidationPipe est une préoccupation d'intégration).
- **`PATCH /users/me` ne revalide pas `isActive` en base** — `backend/src/users/users.controller.ts` — JWT stateless : un compte désactivé conserve un accès valide jusqu'à expiration du token (~15 min). Déjà noté pour les endpoints auth (story 2.2). À adresser globalement via middleware ou guard avec lookup DB.
- **Route `/profile` contournable via API si `mustChangePassword=true`** — `frontend/src/app/app.routes.ts` — Le guard `mustChangePasswordGuard` est frontend-only ; appel API direct avec JWT valide permet de modifier le `name` sans avoir changé le mot de passe. Pattern pré-existant pour tous les endpoints non-auth.

## Deferred from: code review of 3-6-responsive-mobile-du-panneau-admin (2026-05-18)

- **UI-DUPLICATION** — Logique boutons d'action (réinitialiser/désactiver/réactiver/supprimer) dupliquée entre le tableau desktop et les cards mobile dans `admin-panel.component.html`. Refactoring via `ng-template` partagé ou `UserActionsComponent` serait plus maintenable mais hors scope story.
- **CLASS-BINDING pré-existant** — `<span class="status-badge" [class]="'status-badge role-' + user.role">` : le binding `[class]` écrase les classes statiques en Angular. Pré-existant dans la table desktop, propagé dans les cards mobile. À corriger avec `[ngClass]` ou `[class.role-X]` lors d'un refactoring futur.
- **TEST-TOBEVISIBLE** — Dans les tests E2E desktop, `toBeVisible()` ne garantit pas que l'élément est réellement dans le viewport (un parent `overflow:hidden` pourrait fausser le résultat). `toBeInViewport()` serait plus précis. Même pattern que `admin.spec.ts`.
- **LOGIN-REPETITION** — `loginAdmin(page)` appelé en tête de chaque test au lieu d'un `test.beforeEach`. Performance et maintenabilité, non bloquant. Même pattern pré-existant dans `admin.spec.ts`.

## Deferred from: code review de 4-1-entites-link-linkcategory-migrations (2026-05-18)

- **Link.userId peut diverger du userId de la catégorie parente** — Aucune contrainte DB ni logique ORM n'empêche de créer un `Link` avec `userId=A` mais `categoryId` appartenant à user B ; le filtrage par `userId` doit être enforced au niveau service. À traiter en story 4.2.
- **Pas de contrainte unique sur `position`** — Les colonnes `position` sur `LinkCategory` et `Link` (défaut 0) acceptent des doublons sans index unique scoped à `(userId, position)` / `(categoryId, position)`. Gestion de l'ordonnancement à définir en story 4.2/4.3.
- **`faviconUrl` et `url` non validés** — Colonnes varchar sans contrainte format : un `javascript:` ou une adresse réseau interne est stockable. Validation `@IsUrl()` à ajouter dans les DTOs de story 4.3.
- **Migration inclut un ALTER TABLE User non lié au périmètre Liens** — `1779140632380-CreateLinkLinkCategory.ts` — TypeORM a détecté et inclus le changement `User.name NULL→NOT NULL` dans la migration Links. Migration déjà appliquée sans erreur ; non modifiable sans risque de désynchro. À éviter dans les migrations futures : vérifier le diff avant de committer.
- **`cascade: ['remove']` sur OneToMany redondant avec ON DELETE CASCADE DB** — `link-category.entity.ts` — La cascade applicative TypeORM (ORM-level) coexiste avec la FK DB `ON DELETE CASCADE`. Pas de bug actif sur InnoDB mais peut entraîner des suppressions ORM individuelles en N+1 si la catégorie est supprimée via `repository.remove()`. À clarifier si des hooks `BeforeRemove` sont ajoutés.
- **`emoji varchar(10)` peut tronquer les séquences emoji multi-codepoints** — `link-category.entity.ts` — Les emoji ZWJ (ex. 👨‍👩‍👧‍👦) peuvent dépasser 10 caractères Unicode. Ajouter une validation `MaxLength` côté DTO en story 4.2/4.3.

## Deferred from: code review de 1-3-pipeline-ci-cd-gitflow-github-actions (2026-04-23)

- **`--forceExit` masque des tests bloqués** — `.github/workflows/ci.yml` — Comportement intentionnel documenté (NestJS + TypeORM ouvre des connexions async) ; les handles ouverts devraient idéalement être fermés dans les afterAll des tests.
- **Gestion erreur bootstrap insuffisante en production** — `frontend/src/main.ts` — `console.error` seul est invisible aux outils de monitoring ; pattern pré-existant depuis Story 1.1.
- **Swagger conditionné à `process.env.NODE_ENV` en contournant ConfigService** — `backend/src/main.ts` — Si la variable est absente ou mal orthographiée, la doc Swagger est silencieusement désactivée sans erreur de validation Joi.

## Deferred from: code review de 4-2-crud-des-categories-de-liens (2026-05-19)

- **Race condition sur `create` (positions dupliquées)** — `backend/src/links/link-categories.service.ts` — Deux appels simultanés lisent le même `MAX(position)` et insèrent deux catégories avec la même position. Résolution : transaction + verrou pessimiste, ou contrainte `UNIQUE(userId, position)` avec retry.
- **Drop concurrents peuvent interférer** — `frontend/src/app/links/links.component.ts` — Deux drags rapides produisent deux requêtes PATCH en vol ; le résultat dépend de l'ordre d'arrivée des réponses. Solution : debounce ou mutex côté frontend.
- **Rollback de drop vide les catégories si le rechargement échoue** — `frontend/src/app/links/link-categories.service.ts` — Le `catchError` retourne `of([])` et vide `categories`. Solution : conserver l'état pré-drag et le restaurer directement sans HTTP.

## Deferred from: code review de 4-3-crud-des-liens-avec-favicon-auto-recupere (2026-05-19)

- **Race condition `create()` simultanées — positions dupliquées** — `backend/src/links/links.service.ts` — Deux appels `POST /api/links` concurrents pour la même catégorie lisent le même `MAX(position)` et insèrent deux liens avec la même position. Pattern identique à `link-categories.service.ts` (déjà différé story 4.2). App mono-utilisateur, impact très faible.
- **Fuite d'information dans les messages d'erreur** — `backend/src/links/links.service.ts` — `ForbiddenException("Catégorie 99 introuvable")` et `NotFoundException("Lien 42 introuvable")` exposent des IDs internes. Pattern établi dans toute la codebase. Low priority pour app auto-hébergée.
- **Entités HTML non décodées dans `og:title` / `<title>`** — `backend/src/og-fetch/og-fetch.service.ts` — Les titres contenant `&amp;`, `&#8211;` etc. sont stockés et affichés encodés. Amélioration qualité, non bloquant.
- **`faviconUrl` relative avec `../` non normalisée** — `backend/src/og-fetch/og-fetch.service.ts:extractFaviconUrl` — Chemins comme `../static/favicon.ico` produisent `https://example.com/../static/favicon.ico`. Cas extrêmement rare en pratique ; le fallback `onFaviconError` couvre le cas.
- **`loadLinks()` concurrent sans annulation** — `frontend/src/app/links/links.service.ts:loadLinks` — Appels parallèles (ngOnInit + rollback reorder) peuvent écraser le signal avec une réponse plus ancienne. Pattern identique à `link-categories.service.ts`. App mono-utilisateur, impact très faible.

## Deferred from: code review de 4-4-toggle-mode-lecture-mode-edition (2026-05-19)

- **`cdkDragHandle` toujours dans le DOM en mode lecture** — `frontend/src/app/links/links.component.html` — `cdkDragHandle` est maintenant toujours présent dans le DOM (pattern `.edit-controls`). `cdkDragDisabled` empêche le drag réel, mais la directive intercepte potentiellement des événements touch. Résolu si le fix `inert` (patch #1 de la review) est appliqué.
- **Absence de tests DOM pour l'accessibilité clavier des contrôles cachés** — `frontend/src/app/links/links.component.spec.ts` — Les 3 tests Vitest ajoutés vérifient l'état du signal, pas le comportement clavier des éléments cachés. Test complémentaire envisageable dans une story de qualité future.
- **Layout `flex-wrap` sans contrainte de largeur sur viewports très étroits** — `frontend/src/app/links/links.component.scss` — `.header-actions { flex-wrap: wrap }` sans `min-width` peut causer des débordements sous ~200px. Cosmétique, hors scope.

## Deferred from: code review de 4-5-composants-linkcategorycard-et-linkitem (2026-05-20)

- **Suppression catégorie ne purge pas les liens orphelins dans `linksService.links`** — `links.component.ts:openDeleteDialog` — `openDeleteDialog` met à jour `linkCategoriesService.categories` mais pas `linksService.links` ; les liens de la catégorie supprimée persistent en mémoire. Pré-existant.
- **Concurrence de drops HTTP simultanés sans verrou** — `links.component.ts:handleReorderLinks` — Deux drags rapides produisent deux requêtes PATCH en vol ; signal optimiste écrasé. Pattern déjà noté en story 4.2.
- **Dialog ouverture multiple si double-clic rapide sur "Ajouter un lien"** — `link-category-card.component.html` — Pas de guard contre l'empilement de dialogs. Pré-existant dans l'architecture dialogs.
- **`@Input`/`@Output` classiques vs signal inputs Angular 17+** — `link-category-card.component.ts`, `link-item.component.ts` — Tech debt : les nouveaux composants utilisent `@Input()` au lieu de `input()` signal-based. Choix de style intentionnel.
- **`linksForCategory()` non mémoïsée, appelée à chaque cycle de détection** — `links.component.html` — Filtre ré-exécuté à chaque CD du parent. Pré-existant, impact faible avec les listes actuelles.
- **Incohérence `drag-handle` : `visibility:hidden` dans `LinkItem` vs `@if` dans `LinkCategoryCard`** — `link-item.component.html` — Choix de design intentionnel (maintenir l'indentation en mode lecture). Cosmétique.
- **`cdkDropList` sans `id` dans `LinkCategoryCardComponent`** — `link-category-card.component.html` — L'ancien `[id]="'link-list-' + cat.id"` a été retiré ; connexion inter-catégories future impossible sans modifier l'API du composant. Hors scope story 4.5.
- **`loadLinks()` rollback sans notification secondaire si le rechargement échoue aussi** — `links.component.ts:handleReorderLinks` — Signal reste dans état optimiste corrompu sans message UX. Pré-existant.
- **URL `[href]` non validée explicitement (scheme `javascript:`)** — `link-item.component.html:11` — Angular sanitize mitigue le risque ; validation `@IsUrl()` à renforcer côté backend (déjà noté story 4.1).

## Deferred from: code review de 4-6-vue-par-defaut-etat-vide-et-theme-clair-sombre (2026-05-20)

- **`isLoading()` et `error()` simultanément vrais** — `links.component.html` — Dans `LinkCategoriesService`, `catchError` positionne `error()` avant que `finalize` remette `isLoading=false`; pendant un cycle de détection de changements, skeleton ET message d'erreur peuvent être rendus simultanément. Comportement pré-existant du service, hors scope cette story.
- **Pas de test pour l'état double isLoading+error simultané** — `links.component.spec.ts` — Suit le defer ci-dessus ; un test couvrant `isLoading=true` + `error!=null` en même temps n'est pas justifié tant que le comportement service n'est pas corrigé.

## Deferred from: code review de 4-7-deplacement-inter-categories-drag-drop (2026-05-20)

- **Backend ne recalcule pas `position` lors d'un changement de `categoryId`** — `backend/src/links/links.service.ts` — `Object.assign(link, dto)` conserve la position d'origine du lien dans la catégorie source ; des doublons de position dans la catégorie cible sont possibles. Recalcul à effectuer dans une story future ou lors d'un refactoring du système de positions.
- **Test E2E suppose l'existence d'au moins 2 catégories avec un lien** — `e2e/tests/links-drag-drop.spec.ts` — `cards.nth(0)` et `cards.nth(1)` échouent sans message clair si la base de test est vide. À adresser via fixtures Playwright dans une future story E2E.
- **`waitForURL('/links')` sans timeout explicite dans le helper E2E `login`** — `e2e/tests/links-drag-drop.spec.ts` — Timeout Playwright par défaut (30 s) ; le diagnostic est lent si la redirection post-login aboutit à une URL inattendue. Pattern acceptable pour les stories actuelles.
- **Scénario E2E rollback sur erreur réseau absent** — `e2e/tests/links-drag-drop.spec.ts` — AC3 (rollback + snackbar) est couvert par les tests unitaires Vitest (`links.component.spec.ts`) mais pas par un test E2E Playwright (nécessiterait interception réseau). Acceptable pour le scope T5.

## Deferred from: code review de 4-8-parametrage-affichage-cards-mode-lecture (2026-05-20)

- **Header actions toujours rendu pendant le skeleton** — `frontend/src/app/links/links.component.html` — Le bouton "Modifier" et ⚙️ sont opérables pendant le chargement des catégories. Comportement pré-existant (`.links-header` était aussi toujours visible).
- **Pas de reset des paramètres de grid depuis mobile** — Comportement délibéré par design (widget caché < 600 px) : les paramètres persistent et s'appliquent automatiquement quand le viewport repasse ≥ 600 px. Aucun parcours pour réinitialiser depuis mobile.

## Deferred from: code review de 4-9-selecteur-icones-material-categories (2026-05-21)

- **Validation format `icon` backend (chaîne vide + pattern)** — `backend/src/links/dto/create-link-category.dto.ts` — Ajouter `@Matches(/^[a-z0-9_]+$/)` et `@IsNotEmpty()` pour rejeter les chaînes vides et les noms d'icônes invalides. Enhancement hors scope spec, peu probable via le picker UI.
- **Performance : grille sans virtualisation CDK** — `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.html` — ~490 icônes rendues sans CDK virtual scroll. Acceptable pour le scope actuel ; à considérer si la liste croît significativement (> 1000 icônes).
- **Mocks backend `icon: null`** — `backend/src/links/link-categories.service.spec.ts`, `link-categories.controller.spec.ts` — Les mocks utilisent `icon: null` au lieu d'une valeur réelle (ex: `icon: 'home'`) ; le chemin "création avec icône renseignée" n'est pas couvert côté backend.

## Deferred from: sprint-change page-accueil-dashboard (2026-05-20)

- **`LinksComponent` toujours nommé "links"** — `frontend/src/app/links/` — La route est `/dashboard` mais les fichiers/classe restent `LinksComponent`. Contrainte délibérée (spec) pour éviter un rename massif entre Epics 4 et 5. À renommer en `HomeComponent` lors d'un refactoring futur.
- **`void` vs `await router.navigate` dans `LoginComponent`** — `frontend/src/app/auth/login/login.component.ts:40,53` — Incohérence pré-existante : le constructeur utilise `void` (fire-and-forget) et `onSubmit` utilise `await`. La navigation échouée est silencieuse dans le constructeur. À corriger dans une story de qualité future.
- **Bottom nav visible pour les utilisateurs non authentifiés** — `frontend/src/app/core/components/bottom-nav/bottom-nav.component.html` — La top bar masque la nav quand `currentUser()` est null, mais la bottom nav ne fait pas la même chose. L'impact est limité (la bottom nav pointe vers `/dashboard` qui est protégé par guard) mais l'affichage est incohérent sur `/login`. À aligner dans une story UX future si le comportement devient visible.

## Deferred from: story 4-2-crud-des-categories-de-liens (2026-05-19)

- **Layout grid multi-colonnes desktop non appliqué** — `frontend/src/app/links/links.component.scss` — UX-DR19 spécifie `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))` pour afficher plusieurs catégories sur la même ligne en desktop. Intentionnellement reporté à la **story 4.5** (`LinkCategoryCard` collapsible) : le layout grid n'a de sens qu'une fois les cards complètes avec leur contenu réel, et le drag-drop CDK multi-colonnes est plus complexe à gérer.

## Deferred from: code review de spec-cicd-overhaul-ghcr-semver (2026-05-22)

- **Push GHCR non-atomique entre backend et frontend** — `.github/workflows/cd.yml` — Si le build backend réussit mais le frontend échoue, le tag `latest` sur GHCR est incohérent (backend à la nouvelle version, frontend à l'ancienne). Pas de mécanisme de rollback ou de push atomique entre les deux images. À documenter dans le runbook de release.
- **`git tag` et `gh release create` non-idempotents sur re-run** — `.github/workflows/cd.yml` — En cas de re-run du job après un échec partiel (commit package.json pushé mais build Docker raté), `git tag` échoue avec "tag already exists" et `gh release create` échoue si la release existe. À mitiger avec `|| true` conditionnel ou vérification d'existence préalable si les re-runs deviennent fréquents.
- **`npx --yes semver` sans version figée** — `.github/workflows/cd.yml` — La version du package `semver` est résolue à l'exécution. Un breaking change ou une compromission de ce package affecterait le calcul de version. À épingler via `npx semver@7 ...` ou en déclarant `semver` en devDependency de racine avec `npm ci` au préalable.
- **`feat(scope)!:` (breaking change scopé) non reconnu** — `.github/workflows/cd.yml:42` — La regex `^feat!:` ne matche pas `feat(auth)!:` ou `feat(api)!:`. Ces commits seraient classifiés `minor` au lieu de `major`. Impact limité (la convention standard préfère `feat!:` sans scope pour les breaking changes).
- **`BREAKING CHANGE` dans le corps/footer non capturé** — `.github/workflows/cd.yml:40` — `git log --pretty=format:"%s"` ne capture que le sujet ; `BREAKING CHANGE:` dans le corps ou le footer (placement canonique selon la spec CC) est ignoré. Seul `BREAKING CHANGE` dans le sujet est détecté. À corriger avec `--format=%B` si l'équipe utilise des breaking changes dans le footer.
- **`image: ""` dans `docker-compose.override.yml` — comportement version-dépendant** — `docker-compose.override.yml` — L'utilisation de `image: ""` pour supprimer l'image GHCR héritée n'est pas documentée officiellement dans Docker Compose v2. Le comportement peut varier entre versions mineures. Alternative : vérifier avec `docker compose config` que la clé `image` est bien supprimée après merge.

## Deferred from: code review de 5-1-entites-recipe-recipeingredient-recipestep-migrations (2026-06-02)

- **Chaîne vide `""` acceptée pour `unit` et `category`** — `backend/src/recipes/dto/create-recipe-ingredient.dto.ts`, `create-recipe.dto.ts` — `@IsOptional()` ne bloque pas `""` ; pattern `@Transform` trim de `create-link.dto.ts` non appliqué ici. À standardiser sur l'ensemble des DTOs optionnels en future story.
- **`content` de CreateRecipeStepDto sans `@MaxLength`** — `backend/src/recipes/dto/create-recipe-step.dto.ts` — Colonne TEXT (65 535 octets) sans limite côté DTO ; un contenu massif passe sans 400. À plafonner à une valeur raisonnable (ex. 10 000 chars) lors de l'implémentation du service en story 5.2+.
- **`servings` sans borne supérieure** — `backend/src/recipes/dto/create-recipe.dto.ts` — `@Max()` absent ; INT max (2 147 483 647) passe sans erreur. Risque cosmétique faible ; à ajouter lors du refactor DTO si nécessaire.

## Deferred from: code review de 5-2-liste-des-recettes-avec-categories-et-recherche-en-temps-reel (2026-06-02)

- **Pagination manquante sur `findAll` backend** — `backend/src/recipes/recipes.service.ts` — `repo.find({ where: { userId } })` sans `take`/`skip` ; risque scalabilité si l'utilisateur accumule des centaines de recettes. À adresser dans une story NFR ou lors de l'ajout du service de liste paginé.
- **`$any($event.target).value` — bypass TypeScript** — `frontend/src/app/recipes/recipes.component.html:8` — Pattern courant pour les événements DOM natifs dans Angular, mais fragile. Remplacer par un `FormControl` ReactiveForms ou une référence `#inputRef` typée si refactoring du template.
- **Flash état vide avant skeleton au premier rendu** — `frontend/src/app/recipes/recipes.component.html:31` — `isLoading` initialisé à `false` ; entre la création du composant et `ngOnInit`, la condition état vide est vrai brièvement. Corriger avec un flag `hasLoaded` ou en initialisant `isLoading` à `true` dans le service.
- **`recipe.title` non null-safe dans `filteredRecipes`** — `frontend/src/app/recipes/recipes.component.ts:57` — `r.title.toLowerCase()` lèverait un TypeError si `title` était null. `title: string` non-nullable dans l'interface et l'entité ; risque théorique seulement si données corrompues.
- **`localeCompare('fr')` potentiellement indisponible** — `frontend/src/app/recipes/recipes.component.ts:49` — La locale `fr` est disponible dans tous les navigateurs cibles mais peut échouer dans certains runners de test Node. À remplacer par `localeCompare(b, undefined, { sensitivity: 'base' })` ou ajouter un fallback.
- **`.sr-only` manque `white-space: nowrap`** — `frontend/src/app/recipes/recipes.component.scss` — Pattern `.sr-only` standard sans `white-space: nowrap` / `overflow-wrap: normal` ; un texte long pourrait sortir du clipping rect dans certains navigateurs. À aligner sur l'implémentation Bootstrap/Tailwind de référence.
- **`@CurrentUser()` null path si guard bypass** — `backend/src/recipes/recipes.controller.ts:17` — `user.id` lancerait un TypeError si le guard `JwtAuthGuard` laissait passer une requête non authentifiée. Ajouter une vérification défensive si la surface d'attaque s'élargit.
- **Erreur TypeORM peut leaker des détails internes** — `backend/src/recipes/recipes.service.ts` — Pas de `try/catch` ni transformation d'erreur dans `findAll` ; une erreur DB serait propagée par le filtre d'exception NestJS par défaut. Acceptable pour V1 ; à enrober dans une story NFR sécurité.

## Deferred from: code review de 5-3-creation-et-edition-d-une-recette (2026-06-02)

- **`NgIf` (`*ngIf`) au lieu de `@if` dans `RecipeIngredientRowComponent`** — `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.html` — Incohérence stylistique avec le reste du projet qui utilise la syntaxe `@if` Angular 17+. Pas de bug fonctionnel ; à migrer lors d'un refactoring futur.
- **Bouton `<button>` imbriqué dans `<a>` — HTML invalide** — `frontend/src/app/recipes/recipes.component.html` — Pattern explicitement prescrit par les Dev Notes de la story (T10). HTML invalide selon la spec mais supporté par les navigateurs ; concern d'accessibilité clavier/lecteur d'écran. À revoir dans une story UX/a11y dédiée.
- **`content` des étapes sans `@MaxLength`** — `backend/src/recipes/dto/create-recipe-step.dto.ts` — Déjà noté en story 5.1 (deferred-work ligne ~245). Colonne TEXT sans limite côté DTO ; un contenu massif passe sans 400. À plafonner à ~10 000 chars lors d'un refactor DTO.

## Deferred from: sprint-change admin-email (2026-05-22)

- **Rename colonne DB `username` → `email` dans la table `User`** — `backend/src/users/user.entity.ts` — La colonne `username` stocke des adresses email depuis le début du projet. Un renommage en `email` améliorerait la lisibilité du schéma et la cohérence avec le reste de la codebase (messages d'erreur, DTOs, commentaires). Nécessite une migration TypeORM (`ALTER TABLE User CHANGE username email`) et une mise à jour de tous les usages (`findByUsername`, `createUser`, `UserEntity`). Différé post-MVP pour éviter une migration destructive sur une instance déjà en production.

## Deferred from: code review de 5-4-page-detail-recette-avec-stepper-convives (2026-06-02)

- **Redirect silencieux sans feedback utilisateur sur erreur HTTP** — `recipe-detail.component.ts:73` — Toute erreur (401, 404, 500) redirige vers `/recipes` sans toast/snackbar. Comportement conforme à la spec ; amélioration UX future souhaitée.
- **Sentinel `-1` pour `recipeId` invalide** — `recipe-detail.component.ts:40-43` — Utilisation de `-1` comme valeur sentinelle au lieu d'un guard/resolver Angular. Fonctionne correctement ; refactoring de style.
- **Six appels `recipe()!` dans le template** — `recipe-detail.component.html` — `@let r = recipe()!` en début de bloc `@else if` réduirait les repetitions et les non-null assertions. Style / lisibilité.
- **`recipe.servings === 0` → liste vide affichée avec des ingrédients existants** — `recipe-detail.component.ts:44-48` — La garde `!recipe.servings` retourne `[]` si `servings=0`, affichant "Aucun ingrédient" alors que des ingrédients existent. Nécessite une donnée invalide côté backend.
- **Utilisation de `route.snapshot` au lieu de `paramMap` observable** — `recipe-detail.component.ts:40` — Robustesse réduite si la stratégie de réutilisation de route change. Comportement correct avec la stratégie par défaut.
- **`<pre>` sémantiquement redondant avec `white-space: pre-wrap` SCSS** — `recipe-detail.component.html:63` — `<p>` ou `<div>` avec la classe SCSS suffirait sémantiquement. Cosmétique.
- **`track ing.id` / `track step.id` sans fallback si id undefined** — `recipe-detail.component.html:54,65` — `track ing.id ?? $index` serait plus défensif. Nécessite une donnée invalide côté backend.
- **Paramètre route flottant (ex: "1.5") non intercepté par `isNaN`** — `recipe-detail.component.ts:40` — `Number("1.5")` n'est pas NaN ; le 404 API gère le cas. Comportement correct via chemin d'erreur.

## Deferred from: code review de 5-7-avant-propos-recette-et-toolbar-markdown (2026-06-11)

- **XSS / `[innerHTML]` sans politique sanitizer explicite** — Pattern pré-existant appliqué aux étapes de recette ; Angular DomSanitizer filtre les balises dangereuses par défaut. À rendre explicite via `SafeHtml` si la surface de sécurité grandit. [`frontend/src/app/recipes/recipe-detail/recipe-detail.component.html`]
- **Typo `convives-steppper` (double p) entérinée** — Pré-existant dans tous les fichiers (component, selector, SCSS, HTML). À corriger lors d'un refactoring dédié. [multiples fichiers]
- **`UpdateRecipePayload` déclarée deux fois** — Pré-existant : TypeScript merge silencieusement les deux déclarations. À consolider lors d'un refactoring du service frontend. [`frontend/src/app/recipes/recipes.service.ts`]
- **Aucune couverture de test backend pour `avantPropos`** — Chemins non couverts : `create` persiste le champ, `update` efface en null, DTO rejette les valeurs hors longueur. À adresser dans une story de qualité dédiée.
- **`.avant-propos-section` sans traitement typographique ni visuel** — Aucun background, border, line-height ou font-size distincts. Rendu en corps de texte par défaut. Raffinement UX à planifier. [`frontend/src/app/recipes/recipe-detail/recipe-detail.component.scss`]
- **Regex `/__(.+?)__/g` ne bloque pas `_____` (5 underscores)** — `_____` est parsé comme `__` + `_` + `__` → `<u>_</u>`. Cas limite improbable ; spec `____` (4) est correctement respectée. [`frontend/src/app/recipes/recipe-detail/markdown-light.pipe.ts`]

## Deferred from: code review de 5-6-referentiel-categories-et-autocompletion (2026-06-03)

- **`update()` rechargement final sans scope `userId`** — `backend/src/recipes/recipes.service.ts:154` — Le `findOne` post-save utilise `where: { id }` sans `userId`. Comportement pré-existant ; impact théorique limité (app mono-utilisateur). À corriger lors d'un refactoring global du service.
- **`getIngredientSuggestions` potentiellement null si `ri.name` null en DB** — `backend/src/recipes/recipe-categories.service.ts:21-27` — Le schéma garantit `NOT NULL` sur `RecipeIngredient.name` ; le cas est impossible via l'API. À adresser uniquement si une migration de données directe est effectuée.
- **Test "réutilise la catégorie existante" n'assert pas l'absence de `manager.create` pour `RecipeCategoryEntity`** — `backend/src/recipes/recipes.service.spec.ts:165` — Assertion incomplète mais non bloquante. À renforcer lors d'un passage dédié sur la couverture de tests.

## Deferred from: code review de 6-2-generation-et-gestion-d-un-lien-de-partage-recettes (2026-07-13)

- **Piège `resourceType: 'note'`** — `backend/src/sharing/sharing.service.ts:37` — `create()` valide toujours l'ownership via `recipeRepo` ; le jour où le DTO autorisera `'note'`, un `resourceId` de note renverra un 404 erroné (ou matcherait une recette homonyme). À brancher la vérification sur `resourceType` en Story 8.7.
- **Colonne `token` sans collation binaire** — `backend/src/migrations/1781894312446-CreatePublicToken.ts` — `token varchar(255)` sans `COLLATE` hérite de la collation par défaut MySQL (probablement insensible à la casse), alors que le base64url est sensible à la casse. Lookup potentiellement insensible à la casse → entropie effective réduite. À corriger (`ascii_bin` / `utf8mb4_bin`) via une nouvelle migration avant le endpoint public `GET /api/sharing/:token` de la Story 6.3.
- **Génération de tokens non rate-limitée + pas de plafond** — `backend/src/sharing/sharing.controller.ts:25` — `@SkipThrottle()` sur tout le contrôleur (conforme au pattern projet) : le `POST` de génération de secrets n'est pas throttlé et aucun plafond de tokens actifs par ressource n'existe → croissance DB non bornée. Durcissement à envisager en story NFR sécurité.
- **`remove()` renvoie 403 au lieu de 404** — `backend/src/recipes/recipes.service.ts` — Le 403 sur une recette d'un autre utilisateur révèle son existence (énumération). Pattern pré-existant cohérent avec le reste de l'app (déjà tracé stories 3.x/5.x). Trade-off volontaire.
- **E2E fragile / non isolé** — `e2e/tests/recipes-share.spec.ts` — Sélecteur `button:has-text("Révoquer") >> nth=-1` fragile, catégorie `E2E Test` jamais nettoyée (accumulation), dépendance au compte admin partagé. Robustesse des tests à améliorer.

## Deferred from: code review de 6-3-vue-publique-lecture-seule-recette (2026-07-13)

- **État d'erreur non différencié (5xx/429 = « lien plus disponible »)** — `frontend/src/app/share/components/share-view/share-view.component.ts:78` — Le callback `error` ignore le `status` : un 500, un 429 (throttler) ou une coupure réseau sur un lien **valide** affiche « Ce lien n'est plus disponible » comme s'il était révoqué/expiré, poussant le propriétaire à régénérer inutilement. Différenciation 404 vs erreur transitoire = **Story 6.4** (périmètre 6.3 : état d'erreur minimal explicite).
- **`GET /api/sharing/:token` public = catch-all mono-segment** — `backend/src/sharing/public-sharing.controller.ts:112` — La route publique non guardée capture toute future route GET authentifiée mono-segment sous `/sharing` (`/sharing/stats`, `/sharing/export`…), la traitant comme un lookup de token (404). Aucune collision actuelle (documenté T4) ; piège de maintenabilité — envisager un sous-chemin dédié (`/sharing/public/:token`) ou une contrainte de format de token si de telles routes apparaissent.
- **`servings === 0` rend une liste d'ingrédients vide non récupérable** — `frontend/src/app/share/components/share-view/share-view.component.ts:50` — Le garde `!recipe.servings` (colonne `int` non-nullable, défaut 4) renvoie `[]` si `servings=0` et bumper le stepper ne récupère rien. Reproduit à l'identique le garde pré-existant de la vue détail authentifiée (déjà tracé story 5.4) ; nécessite une donnée invalide côté backend. À traiter globalement (état explicite « impossible à recalculer »).

## Deferred from: code review de 6-4-page-d-erreur-neutre-pour-les-liens-expires-ou-invalides (2026-07-14)

- **Pas d'`@else` final sur les états du template → page blanche si `next` émet une recette null** — `frontend/src/app/share/components/share-view/share-view.component.html:19` — Le pipe `@if (isLoading())` / `@else if (error())` / `@else if (recipe())` n'a pas de branche par défaut : si `getPublicRecipe` émet un `200` avec un corps `null`/vide (hors contrat actuel — le backend renvoie `404` ou la recette), les trois branches sont fausses et `<div class="share-view">` reste vide, sans erreur ni contenu. Structure préexistante (identique à 6.3, `hasError`/`recipe`) ; non introduit par 6.4 et non atteignable via le contrat backend actuel. À durcir globalement (ajouter un `@else` de repli vers l'état « gone » ou valider `recipe` non-null dans `next`).

## Deferred from: code review de 7-3-onglet-notes-avec-iframe-trilium (2026-11-05)

- **Requêtes `me()` concurrentes depuis les guards** — `frontend/src/app/core/guards/notes-enabled.guard.ts:281` — Angular exécute les `canActivate` en parallèle : sur un rechargement direct de `/notes`, `authGuard`, `mustChangePasswordGuard` et `notesEnabledGuard` voient `currentUser() === null` et appellent chacun `me()` (3 `GET /api/auth/me`, voire 3 refresh concurrents si le token vient d'expirer). Pattern pré-existant imposé par la spec ; à traiter globalement en mutualisant la promesse en vol dans `AuthService.me()`.
- **Erreur non-401 de `me()` traitée comme « non authentifié »** — `frontend/src/app/core/guards/notes-enabled.guard.ts:283` — Un 5xx/erreur réseau renvoie vers `/login` sans conserver l'URL cible. Même comportement que `authGuard` ; à revoir globalement (écran « service indisponible »).
- **`currentUser` périmé entre onglets/appareils** — `frontend/src/app/core/guards/notes-enabled.guard.ts:278` — Si `notesEnabled`/`triliumUrl` change dans un autre onglet, le guard et l'iframe utilisent la valeur en cache jusqu'au rechargement (dans le même onglet, `updateNotesSettings` met bien à jour le signal). Comportement partagé avec la nav conditionnelle (7.1).
