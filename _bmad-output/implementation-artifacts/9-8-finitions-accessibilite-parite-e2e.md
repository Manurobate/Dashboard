---
title: 'Story 9.8 : Finitions, accessibilité, parité et non-régression'
type: 'feature'
created: '2026-11-12'
status: 'done'
baseline_commit: 'b74e0599b3df2a629a96038bdd7fc7fd7c352d4b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La refonte Ember (9.1 à 9.7) passe les E2E Chromium en CI (run vert sur `b74e059`), mais rien ne contrôle l'accessibilité (contraste des nouvelles couleurs, noms des boutons-icônes, focus visible) ni Firefox, le navigateur de Manu. La 1.0.0 doit partir d'une base vérifiée, et protégée pour les Epics 8 et 10.

**Approach:** Ajouter à la CI un audit Axe automatisé des écrans dans les deux thèmes et faire tourner toute la suite E2E aussi sous Firefox. Corriger ce que l'audit et un parcours clavier révèlent, sans changer le rendu validé. Le dernier commit porte `feat!:` pour déclencher la 1.0.0.

**Décisions de Manu (2026-11-12) :** (D1) Axe automatisé : nouveau spec E2E exécuté en CI à chaque merge dans `develop`, comme les autres. (D2) Firefox ajouté en permanence à la CI : toute la suite tourne sous Chromium et Firefox. (D3) Les E2E Chromium sont déjà verts en CI : pas de campagne locale dédiée.

## Boundaries & Constraints

**Always:** Écrans audités par Axe : Liens (lecture, édition), Recettes (liste, détail, éditeur), dialog de partage, vue publique et lien expiré, Notes (vide), Paramètres, Admin, Login, Profil, changer le mot de passe ; chacun en clair et en sombre. Échec sur toute violation d'impact `critical` ou de règle `color-contrast`. Clavier : focus visible partout (contraste ≥ 3:1), `aria-label` sur chaque bouton-icône, `aria-expanded` sur les déclencheurs de menu ou de panneau. Correctifs au plus près (attribut ARIA, `:focus-visible`, token existant). Animations : deux cas E2E vérifient `body.no-motion` (système réduit sans choix ; choix « off »), logique de 9.7.

**Never:** Pas de changement de backend, d'API, de route, de validation, de texte ni de mise en page. Toute correction qui modifierait visiblement une maquette validée (couleur, taille, espacement, hors contour de focus) est d'abord soumise à Manu. Pas de restyle mobile (Epic 10). Pas de sélecteur E2E existant cassé. Pas de commit ni de PR sans accord ; fusion sans squash pour préserver `feat!:`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Suite sous Firefox | projet `firefox` | specs vertes comme sous Chromium | test non portable (presse-papier…) → adapté, jamais désactivé sans accord |
| Données partagées | suite jouée deux fois sur le même backend | aucun conflit (noms uniques, nettoyage) | N/A |
| Axe, thème sombre | `body.dark-theme` | zéro violation critique ou de contraste | faux positif : exclusion ciblée et commentée |
| Système réduit, sans choix | `reducedMotion: 'reduce'` | `body.no-motion` | N/A |

</frozen-after-approval>

## Code Map

- `e2e/playwright.config.ts` -- ajouter le projet `firefox` (`devices['Desktop Firefox']`) ; `permissions: ['clipboard-read','clipboard-write']` n'existe pas sous Firefox : la déplacer dans le projet `chromium`. `workers: 1` conservé.
- `e2e/global-setup.ts` -- lance `chromium` pour le premier login : inchangé (une seule fois pour les deux projets).
- `e2e/tests/*.spec.ts` (13) -- vérifier l'exécution sous Firefox ; ceux qui créent des données avec un nom fixe (`recipes-share`, `admin`, catégorie `E2E Test`…) doivent tolérer un second passage.
- `e2e/tests/a11y.spec.ts` (nouveau) + `@axe-core/playwright` en devDependency de `e2e/package.json` -- `AxeBuilder` par écran, bascule de thème par le bouton de la top bar, filtre `impact === 'critical' || id === 'color-contrast'` ; cas `reducedMotion` via `test.use` / `browser.newContext`.
- `.github/workflows/ci.yml:165-167` -- `npx playwright install --with-deps chromium firefox` ; renommer le job « E2E — Playwright (Chromium, Firefox) ».
- `frontend/src/styles.scss` -- `:focus-visible` existant l. 604-610 ; contour commun à ajouter si `.ember-btn`, `.dialog-cancel`, `.dialog-confirm`, `.ember-chip` n'en ont pas.
- Boutons-icônes à vérifier (attributs multi-lignes) : `top-bar.component.html:49,59`, `links.component.html:61,93,104`, `link-category-card.component.html:14,21`, `recipe-detail.component.html:26,35`, `convives-steppper.component.html:12,25`, `markdown-light-editor.component.html:5,14,23`, `recipe-editor.component.html:132`, `recipe-ingredient-row.component.html:65`, `recipes.component.html:16`, `share-link-dialog.component.html:10`, `material-icon-picker.component.html:31`, `admin-panel.component.html:83-193`. `matMenuTriggerFor` pose `aria-expanded` lui-même.
- Exécution locale (pas de Docker sur la machine, `podman` disponible) : MariaDB `podman run`, backend `npm run start` avec les variables du `.env` CI (`ci.yml:122-140`, `DB_HOST=localhost`), `npx ng serve` (proxy `/api`), `BASE_URL=http://localhost:4200`. Rien de versionné.

## Tasks & Acceptance

**Execution:**
- [x] `e2e/playwright.config.ts`, `.github/workflows/ci.yml` -- projet Firefox, installation du navigateur -- D2
- [x] `e2e/tests/*.spec.ts` -- rendre la suite verte sous Firefox et rejouable -- D2
- [x] `e2e/package.json`, `e2e/tests/a11y.spec.ts` -- audit Axe deux thèmes + cas `reducedMotion` -- D1
- [x] Composants et `styles.scss` (+ specs unitaires des `aria-label` ajoutés) -- corriger violations Axe, focus et ARIA
- [x] Captures Chromium / Firefox, clair et sombre, de chaque écran -- écarts de rendu corrigés
- [x] Vérifications et `sprint-status.yaml`

**Acceptance Criteria:**
- Given la stack locale, when `npx playwright test` tourne, then toutes les specs (dont `a11y`) sont vertes sous Chromium et Firefox
- Given la PR avec le label `run-e2e`, when la CI tourne, then le job E2E est vert sur les deux navigateurs
- Given un parcours clavier de chaque écran, when le focus se déplace, then il reste visible et les boutons-icônes et déclencheurs portent `aria-label` / `aria-expanded`
- Given les captures Chromium et Firefox, when on les compare, then polices, icônes, couleurs et alignements sont équivalents
- Given la PR prête, when le dernier commit est proposé, then son sujet commence par `feat!:`

## Implementation Notes

- Implémenté directement dans la session, comme 9.3 à 9.7. Stack locale : MariaDB 11.4 en conteneur podman (port 3307), backend `node dist/main` avec les variables du `.env` CI, `ng serve`. `global-setup.ts` exige une base vierge (mot de passe initial) : la base est recréée avant chaque lancement, comme en CI.
- État de départ : suite Chromium verte en local (48 passés, 2 ignorés préexistants), comme en CI sur `b74e059`.
- Firefox (D2) : la suite passe telle quelle et se rejoue sur le même backend sans conflit (le second projet réutilise les données du premier). Seule adaptation : `permissions` presse-papier déplacées dans le projet `chromium`. CI : job renommé, `playwright install --with-deps chromium firefox` (aussi dans le script `install-browsers`).
- Axe (D1) : `a11y.spec.ts`, 9 tests par navigateur. Thème et `animations=off` fixés par `localStorage` avant chargement (plus fiable que le clic sur le bouton, et évite de mesurer une carte à mi-fondu). Assertions `expect.soft` pour lister tous les écrans en un passage. Écrans : login, lien expiré, liens lecture et édition, recettes liste, détail, éditeur, dialog de partage, paramètres, admin, profil, changer le mot de passe, notes (vide), vue publique. Plus 3 cas `Animations` (système réduit sans choix, choix « on » malgré le système, choix « off »).
- Violations trouvées et corrigées : (1) `color-contrast` du pied de page sur tous les écrans, 2,4:1 en clair et 3,2:1 en sombre, causé par `opacity: 0.6` : opacité retirée (accord de Manu le 2026-11-12), texte en `--color-text-secondary`. (2) `button-name` (critique) sur Gras, Italique et Souligné de la barre markdown, qui n'avaient qu'une infobulle : `aria-label` ajoutés, spec unitaire créée.
- Clavier : audit par script temporaire (non versionné), qui compare l'image de chaque arrêt de tabulation avec et sans focus. Le focus était partout visible, mais seulement par les halos de Material (≈ 1,2:1). Ajout dans `styles.scss` d'un anneau `:focus-visible` 2px `--color-primary` : `:where(...)` pour les éléments natifs (spécificité nulle, les règles de composant priment), règle de classe pour `.mat-mdc-button-base` et `.mdc-switch` (leur `outline: none` bat `:where`), anneau intérieur pour menus, onglets de la top bar et en-têtes de groupe de recettes, anneau sur le cercle des boutons radio. Les champs gardent leur bordure `--color-primary` + halo de maquette. `aria-expanded` présent sur tous les déclencheurs (menus Material, autocomplétions).
- Parité : 16 écrans × 2 thèmes capturés en 1440×900 sous Chromium et Firefox. Écart de pixels < 1 % partout (lissage des polices). Écart corrigé : flèches natives permanentes des champs numériques sous Firefox (`-moz-appearance: textfield`, Chromium ne les montre qu'au survol). Écart accepté : glyphe ⌘ du badge de recherche, absent du sous-ensemble Inter, rendu par une police de repli légèrement plus petite sous Firefox.
- Après revue : sélecteurs Material de l'anneau préfixés par `body` (Material déclare `:focus { outline: 0 }` sur menus et en-têtes de groupe, chargé après `styles.scss`) ; test E2E de l'anneau ajouté ; passe sombre des vues publiques par le bouton de thème. Spec Axe : 10 tests par navigateur.
- Vérifications : 361 tests unitaires verts, `ng build` OK (avertissement de budget initial préexistant, 585,8 kB), Prettier OK, suite E2E complète 116 passés et 4 ignorés (préexistants) sur Chromium et Firefox.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Preuve |
|---|---|---|---|
| Passe sombre de la vue publique et du lien expiré auditée en clair (ECH) | medium | patch | Réel : `ShareViewComponent` appelle `themeService.forceLight()`. La passe sombre bascule maintenant par le bouton « Activer le thème sombre » de la top bar et vérifie `dark-theme` avant Axe. |
| Aucun test de l'anneau de focus (VG, BH) | medium | patch | Réel : Axe ne mesure pas le focus. Test `focus clavier : anneau commun visible` (onglet, bouton-icône, interrupteur, entrée de menu, en-tête de groupe) : il a aussitôt révélé que l'anneau ne s'appliquait pas aux entrées de menu ni aux en-têtes de groupe (`.mat-mdc-menu-item:focus { outline: 0 }` et `.mat-expansion-panel-header:focus { outline: none }` de Material, chargés après `styles.scss`). Sélecteurs Material préfixés par `body`. |
| Titre de recette fixe : un reste d'exécution interrompue casse le `getByText` strict (BH, ECH) | low | patch | Réel, correction directe : titre suffixé par `Date.now()`. |
| Réglages Notes forcés à « désactivé, sans URL » au lieu d'être restaurés (BH, ECH) | low | patch | Réel sur une stack locale configurée. Valeurs lues par `GET /api/auth/me` et restaurées dans le `finally`. |
| Thème jamais vérifié en clair ni sur les écrans non authentifiés (BH) | low | patch | Réel. `expectTheme` après chaque chargement. |
| Boucle paramètres/admin/profil/mdp sans vérification de l'écran rendu (VG) | low | patch | Réel : une redirection aurait audité un autre écran. `toHaveURL` ajouté. |
| Cas « choix on » vérifié avant le démarrage d'Angular (VG) | low | patch | Réel : la classe est absente avant le bootstrap. Attente du formulaire de login. |
| Curseurs et boutons +/− du panneau « Paramètres d'affichage » inatteignables au clavier (ECH, via le focus du curseur) | medium | defer | Vérifié par sonde : le panneau est un `mat-menu`, que Material ferme sur Tab. Préexistant (4.8), hors refonte ; corriger change le comportement du panneau. |
| Options d'autocomplétion (`aria-activedescendant`) sans anneau (BH) | low | rejeté | Réel, mais le surlignage de l'option active reste visible, et l'anneau demanderait de cibler `mat-option.mat-mdc-option-active`, hors `:focus-visible`. |
| `input`, `select`, `textarea` natifs absents de `:where` (ECH) | false | rejeté | L'audit clavier montre un focus visible sur tous les champs (bordure `--color-primary` + halo des champs, ou `:focus-within` des barres de recherche). |
| Presse-papier absent sous Firefox, test de partage en échec (ECH) | false | rejeté | `recipes-share.spec.ts` passe sous Firefox (suite complète verte). |
| `-moz-appearance` seul, sans `appearance` standard (BH) | false | rejeté | Voulu : `appearance: textfield` toucherait aussi Chromium, dont le rendu au repos est la référence. Firefox gère toujours la forme préfixée. |
| Filtre Axe limité à `critical` et `color-contrast` (BH) | false | rejeté | C'est le critère de l'intention (« aucune violation critique ni de contraste »). |
| Test « lien expiré » sur un jeton invalide (BH) | false | rejeté | Depuis 6.4, expiré, révoqué et inexistant affichent le même écran (Décision A). |
| Lockfile absent du diff relu (BH) | false | rejeté | `e2e/package-lock.json` est modifié et sera commité ; il était seulement exclu du diff de revue. |
| Thème fixé par `localStorage` et non par le bouton (BH) | low | rejeté | Écart consigné dans les Implementation Notes ; le bouton est désormais exercé sur les vues publiques. |
| Nettoyage en `finally` non garanti sur dépassement de délai (ECH) | low | rejeté | La CI part d'une base vierge, et le titre unique évite tout blocage en local. |
| Déclarations d'anneau répétées quatre fois (BH) | low | rejeté | Pas de divergence constatée ; un mixin n'apporte rien pour quatre règles voisines et commentées. |
| Durée CI doublée, pas de cache ni de `timeout-minutes` (BH) | low | rejeté | Coût accepté par Manu (D2) ; suite complète ≈ 3 min en local. |

## Verification

**Commands:**
- `cd frontend && npx ng build && npx ng test --no-watch` -- expected: succès
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK
- `cd e2e && npx playwright test` (stack locale) -- expected: tout vert sur les deux projets

**Manual checks (if no CLI):**
- Parcours clavier (Tab, Maj+Tab, Entrée, Échap) ; captures Chromium/Firefox comparées.
