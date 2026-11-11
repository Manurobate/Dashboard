---
title: 'Story 9.7 : Notes, Paramètres, Admin, Login, mots de passe et Profil au style Ember'
type: 'feature'
created: '2026-11-11'
status: 'done'
baseline_commit: 'ba9d8dc7d23a3f65e1792a869d8c20c2b57d1dc7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Paramètres, Notes (Trilium), Administration et ses dialogs, Login, les deux écrans de mot de passe et le Profil gardent le style Material d'origine (`mat-card`, labels flottants, `color="warn"`, badges gris), alors que le reste de l'application est en Ember (9.1 à 9.6). L'interrupteur « Animations » (A16, FR51) n'existe pas encore.

**Approach:** Restyler chaque écran à sa maquette (`07`, `08-notes-configure`, `08-notes-vide`, `09`, `13` à `16`, `21a/b`, `22a/b`) avec les classes globales Ember existantes (`.ember-field`, `.field-label`, `.dialog-cancel`, tokens), sans changer services, appels API, validations, routes ni backend. Ajouter la carte « Affichage » avec l'interrupteur « Animations », qui pilote la neutralisation de toutes les animations Ember.

## Boundaries & Constraints

**Always:** Cotes relevées sur les PNG (en 2x d'un viewport de 1440px : px CSS = px PNG / 2). Champs en `.ember-field` + `.field-label` au-dessus (`for`/`id`, astérisque `--color-primary` sur les requis des dialogs), `mat-error` inchangés. Boutons pleins en `--color-primary-fill`, pilule dans les dialogs (`21`, `22`), rectangles arrondis sur les pages, comme sur les maquettes. Les deux thèmes.
Paramètres (`07`) : titre de page 30px/700 + sous-titre secondaire (Q1) ; carte (`--color-surface`, bordure `--color-divider`, rayon 16px, largeur ≈ 720px) : en-tête tuile 34px `--color-primary-soft` + icône `description` en `--color-on-primary-soft`, titre « Notes » en heading (E2E), description secondaire, filet ; rangée « Activer les Notes » + description secondaire, `mat-slide-toggle` restylé (piste `--color-primary-fill`, poignée blanche, sans icône) ; URL et « Tester la connexion » (bordé, icône `sync`) visibles seulement si activé (inchangé) ; résultat du test inchangé ; « Sauvegarder » plein avec icône `save`, aligné à droite.
Carte « Affichage » (A16, sans maquette) sous la carte Notes, même gabarit : tuile icône `animation`, rangée « Animations » + description, interrupteur. `MotionService` (root, signal) : `localStorage` clé `animations` (`on`/`off`), sinon `!matchMedia('(prefers-reduced-motion: reduce)')` ; il pose `body.no-motion` quand désactivé ; un choix explicite prime sur le système. Une règle globale sous `body.no-motion` neutralise animations et transitions (état final affiché) ; les 12 blocs `@media (prefers-reduced-motion: reduce)` des composants sont supprimés au profit de cette classe. `try/catch` autour de `localStorage` (modèle `ThemeService`).
Notes (`08`) : cadre de l'iframe en carte (rayon 16px, bordure, fond `--color-surface`, marge ≈ 24px autour, pleine hauteur restante), barre de progression `--color-primary` en haut ; état délai dépassé (A14) : même texte et lien, tokens Ember. Vide (`08-notes-vide`) : centré, tuile 72px rayon 20px fond `--color-surface` bordure, icône page vide (SVG inline), titre 20px/600, texte secondaire, CTA bordé avec icône `settings` (`routerLink="/settings"`, nom « Configurer dans Paramètres » conservé).
Admin (`09`) : titre 28px/700 et « Nouvel utilisateur » plein (icône `person_add`) sur la même ligne ; tableau en carte rayon 16px, en-têtes 13px/600 majuscules secondaires, lignes séparées par `--color-divider` ; Rôle en pastille (admin : `--color-on-primary-soft` sur `--color-primary-soft` ; user : bordée secondaire) ; Statut = point + texte (Actif : point `--color-success`, Inactif : point et texte secondaires, classe `.badge-inactive` conservée) ; Mdp temp. : « Non » secondaire, « Oui » pastille `--color-warning` avec icône `lock` ; actions en icônes 18px secondaires `key`, `block`, `check`, `delete` (aria-label et logique d'affichage inchangés). Pas de badge « Administration » près de l'avatar. Libellé du rôle inchangé (Q1).
Dialogs (`21a/b`, `22a/b`) : titre 20px/700, « Annuler » en `.dialog-cancel` (pilule `--color-primary-soft`), confirmation plein pilule ; boîte du mot de passe temporaire : fond `--color-primary-soft`, bordure `--color-primary`, rayon 12px, valeur `--font-mono` 18px/700 `--color-primary`, bouton copier à droite ; avertissement en italique secondaire. Largeurs ≈ 440px (formulaire) et 460px (révélation, réinitialisation).
Login (`13`) : top bar sans nav ni avatar (inchangé) ; carte centrée ≈ 420px, rayon 16px : logo 52px, « Dashboard » 22px/700, sous-titre (Q1) ; bouton « Connexion » plein pleine largeur ; erreur sous le champ mot de passe avec icône `error` en `--color-error`, bordure du champ mot de passe en erreur tant que le message est affiché. Mot de passe imposé (`14`) : carte ≈ 460px, titre 22px/700, sous-titre « Première connexion — définissez votre mot de passe personnel pour continuer. » (Q1), erreur serveur en bandeau (icône `error`, fond `--color-primary-soft`, texte `--color-on-primary-soft`, rayon 12px) au-dessus des champs, aide « 8 caractères minimum. » sous le nouveau mot de passe (`mat-hint`, remplacée par `mat-error`). Changer le mot de passe (`15`) et Profil (`16`) : carte ≈ 480px en haut de page, titre 22px/700 ; profil : e-mail en lecture seule, texte secondaire, pastille « lecture seule » à côté du label, « Changer le mot de passe » bordé à texte `--color-primary`, « Sauvegarder » plein.

**Décisions de Manu (2026-11-11) :** (Q1) textes : vouvoiement partout ; tout texte existant est conservé tel quel (labels, messages d'erreur, état vide Notes, libellé brut du rôle `admin`/`user`, « Adresse email » du profil, « URL instance Trilium ») ; seuls les textes absents aujourd'hui sont ajoutés, au vouvoiement : sous-titre de page « Gérez la configuration de votre espace Dashboard. », description de carte « Intégrez votre instance Trilium Notes dans Dashboard. », description du toggle « Affiche l'onglet Notes dans la navigation. », sous-titre login « Connexion à votre espace », sous-titre `14`, aide « 8 caractères minimum. », pastille « lecture seule ». Carte Affichage : « Affichage » / « Personnalisez l'affichage de Dashboard sur cet appareil. » / « Animations » / « Transitions et effets d'apparition. ». (Q2) pas de pastille d'hôte sur l'iframe Notes. (Q3) onglets de la top bar masqués quand `currentUser().mustChangePassword` (thème et menu utilisateur conservés). Spec gardée complète malgré sa taille (≈ 4 000 tokens) : implémentation écran par écran.

**Never:** Pas de changement de services, appels HTTP, validations, longueurs, guards, routes, textes des snackbars, backend. Pas de restyle mobile (Epic 10) : cartes `.user-cards` d'admin intouchées hors tokens. Pas d'ajout de glyphe à la police (SVG inline si besoin). Pas d'actions sur la ligne de l'utilisateur courant ni de réinitialisation pour un admin (logique actuelle conservée malgré `09`). Sélecteurs E2E conservés : `getByRole('switch', { name: 'Activer les Notes' })`, heading « Notes », `input[formcontrolname=…]`, `input[autocomplete=…]`, `[data-testid="user-list"]`, `table`, `tr`, `.table-wrapper`, `.user-cards`, `.user-card`, `.badge-inactive`, `.temp-password-value`, `p.conflict-error`, `mat-error, .form-error`, aria-label des actions et de « Copier le mot de passe », `iframe[title="Trilium Notes"]`, `mat-progress-bar`, textes « Aucune instance Trilium configurée », « Instance inaccessible », « Tester la connexion », « Nouvel utilisateur », « Créer ». Pas de commit sans accord de Manu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Premier lancement | aucune clé `animations`, système sans préférence | Animations actives, interrupteur activé | N/A |
| Système réduit, pas de choix | `prefers-reduced-motion: reduce` | `body.no-motion`, interrupteur désactivé | N/A |
| Choix explicite | clic sur l'interrupteur, rechargement | Choix conservé, prime sur le système | `localStorage` inaccessible → choix gardé pour la session |
| Login refusé | 401 | Message sous le champ mot de passe, bordure rouge | 429 → message actuel, même rendu |
| Mot de passe imposé, erreur serveur | 500 | Bandeau d'erreur au-dessus des champs | N/A |
| Trilium lent | délai dépassé | Aide + lien, tokens Ember | N/A |
| Admin courant | sa propre ligne | Aucune action (inchangé) | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/app/settings/settings.component.{html,scss}` -- remplacer `mat-card` par en-tête de page + conteneur ≈ 720px ; héberge `app-notes-settings` puis la nouvelle carte Affichage (`app-display-settings`, nouveau composant dans `settings/display-settings/`).
- `frontend/src/app/settings/notes-settings/notes-settings.component.{html,scss}` -- carte `07` ; logique `.ts` inchangée (`canTest`, `isTesting`, `testResult`, `onSubmit`). Spec existante à adapter.
- `frontend/src/app/core/services/motion.service.ts` (nouveau) -- modèle `ThemeService` (`theme.service.ts`) : `DOCUMENT`, signal `enabled`, `setEnabled(v)`, clé `animations`, `matchMedia` via `defaultView`. Instancié au démarrage : l'injecter dans `app.ts` (comme ThemeService l'est par la top bar) pour poser la classe avant le premier rendu.
- 12 blocs `@media (prefers-reduced-motion: reduce)` à supprimer : `recipes/recipe-editor/recipe-editor.component.scss:163`, `links/links.component.scss:99`, `recipes/recipes.component.scss:168`, `shared/components/material-icon-picker/material-icon-picker.component.scss:67`, `recipes/recipe-editor/recipe-ingredient-row.component.scss:100`, `links/components/link-item/link-item.component.scss:63,170`, `links/components/link-category-card/link-category-card.component.scss:45,89,100`, `recipes/recipe-editor/markdown-light-editor.component.scss:24`, `share/components/share-view/share-view.component.scss:129`. Vérifier qu'aucun ne fait autre chose que neutraliser une animation ; sinon le convertir en `:host-context(body.no-motion)`.
- `frontend/src/styles.scss` -- règle `body.no-motion` (`animation` et `transition` à 0, `!important`, y compris `::before/::after`) ; styles globaux réutilisables : carte de réglage (`07`), boîte de mot de passe temporaire (partagée par deux dialogs), carte de formulaire centrée (login, mdp, profil) — hors composants pour le budget de 4 kB. Réutiliser `.ember-field`, `.field-label` (`.field-required`, `.field-hint`), `.dialog-cancel`, `.ember-chip`, `.visually-hidden`.
- `frontend/src/app/notes/trilium-embed/trilium-embed.component.{html,scss}` -- `.notes-frame`, `.frame-help`, `.empty-state` ; `.ts` inchangé (`validUrl`, `isLoading`, `loadTimedOut`).
- `frontend/src/app/admin/admin-panel.component.{html,scss,ts}` -- tableau `mat-table` (colonnes `displayedColumns` inchangées) ; icônes `lock_reset`→`key`, `check_circle`→`check`. Dialogs ouverts l. 58, 66, 94, 130 : largeurs selon maquettes. `confirm-destructive-dialog` déjà Ember (9.2), ne pas toucher.
- `frontend/src/app/admin/create-user-dialog.component.{html,scss}`, `reset-password-dialog.component.{html,scss}` -- états `form|password-reveal` / `confirm|password-reveal` inchangés ; « Annuler » `mat-button` → `mat-flat-button.dialog-cancel` ; `color="warn"` retiré.
- `frontend/src/app/auth/login/login.component.{html,scss}`, `auth/change-password/…`, `account/change-password/…`, `profile/profile.component.{html,scss}` -- `mat-card` remplacé par la carte de formulaire ; `.form-error` conservé (E2E) mais déplacé et stylé ; `ErrorStateMatcher` existant du compte (`passwordMismatchMatcher`) inchangé.
- `frontend/src/app/core/components/top-bar/top-bar.component.html` -- condition `@if` de la `nav` : `currentUser() && !currentUser()!.mustChangePassword` (Q3).
- Specs à créer (courtes : rendu, libellés, `for`/`id`, absence de `color="warn"`) : `motion.service.spec.ts`, `display-settings.component.spec.ts`, `login.component.spec.ts`, `profile.component.spec.ts`, `admin-panel.component.spec.ts` (pastilles, `.badge-inactive`, icônes). À adapter : `notes-settings.component.spec.ts`, `trilium-embed.component.spec.ts`, `top-bar.component.spec.ts` (Q3).
- E2E concernés : `e2e/tests/{auth,admin,admin-responsive,settings,notes,profile}.spec.ts` (sélecteurs en Never).

## Tasks & Acceptance

**Execution:**
- [x] `core/services/motion.service.ts` + spec, `app.ts`, `styles.scss` (règle `no-motion`), suppression des 12 blocs `@media` -- interrupteur effectif partout -- A16
- [x] `settings/` (page, notes-settings, nouveau display-settings) + specs -- `07` + carte Affichage
- [x] `notes/trilium-embed/` + spec -- `08`, `08-notes-vide`, A14
- [x] `admin/admin-panel.*` + dialogs `create-user`, `reset-password` + spec -- `09`, `21a/b`, `22a/b`
- [x] `auth/login`, `auth/change-password`, `account/change-password`, `profile` + specs -- `13` à `16`
- [x] `top-bar` + spec -- onglets masqués si mot de passe à changer -- `14`, Q3
- [x] Vérifications : build, tests, Prettier, E2E `--list`, captures Chromium clair/sombre de chaque écran

**Acceptance Criteria:**
- Given chacun des 12 écrans ou dialogs, when il s'affiche dans l'un ou l'autre thème, then il correspond à sa maquette, avec les champs, validations et comportements actuels
- Given `/admin`, when la top bar s'affiche, then aucun badge « Administration » ne figure près de l'avatar
- Given `/settings`, when la page s'affiche, then la carte « Affichage » suit la carte Notes au même style et son interrupteur neutralise immédiatement les animations des stories 9.3 à 9.6
- Given les E2E des écrans touchés, when ils tournent (`--list` en local), then leurs sélecteurs trouvent toujours leurs éléments

## Implementation Notes

- Implémenté directement dans la session (pas de sous-agent), comme 9.3 à 9.6.
- Animations (A16) : `MotionService` instancié dans `app.ts`. Règle globale `body.no-motion` en durées de 0,01 ms (et non `animation: none`) : les fins d'animation et de transition attendues par Material et le CDK (dialogs, drag & drop) se déclenchent toujours. 13 blocs `prefers-reduced-motion` supprimés (12 en composants, plus celui de `.ember-field` dans `styles.scss`, absent de l'inventaire). Celui de `link-category-card` annulait aussi le soulèvement au survol : remplacé par `:host-context(body.no-motion)`. Vérifié dans Chromium sur 4 cas (défaut, système réduit, système réduit + choix « on », choix « off ») : la cascade des cartes Liens passe de 0,5 s à 0,01 ms et l'interrupteur reflète l'état.
- Styles globaux (`styles.scss`, budget de 4 kB par composant) : `.ember-btn` (rectangle arrondi 10px, 46px, variantes `-accent` et `-block`, `.btn-content` pour icône + texte sous `@if`), `.ember-page-header`, `.settings-card*`, `.settings-row*`, `.ember-toggle` (piste 48×28, poignée blanche, `hideIcon`), `.form-page`, `.form-card*`, `.form-error` (+ `-banner`), `.field-error-state`, `.temp-password-*` (dédoublonnés des deux dialogs), pastilles du tableau d'admin sous `.user-table`. Le bundle initial passe de 576,9 à 585,1 kB (avertissement préexistant).
- Interrupteurs : nom accessible via `aria-labelledby` vers un `<label for="{id}-button">` visible (cliquable), description via `aria-describedby`. L'E2E `getByRole('switch', { name: 'Activer les Notes' })` reste valide.
- Notes : barre de progression au-dessus de la carte, en pleine largeur (comme `08`). En Chromium, l'événement `load` de l'iframe arrive très tôt, si bien que la barre est à peine visible ; la logique de `TriliumEmbedComponent` n'a pas changé dans cette story. États forcés via `ng.getComponent` pour les captures (barre et délai dépassé).
- Admin : colonnes alignées à gauche (maquette), `.text-center` retiré du tableau. Icônes `key` et `check` aussi sur les cartes mobiles (même action), dont le style d'origine est conservé et isolé sous `.user-card`. Suppression en gris, rouge au survol.
- Dialogs admin : `panelClass: 'ember-form-dialog'`, « Annuler » en `mat-flat-button.dialog-cancel`, confirmations en `.dialog-confirm`. Interlettrage de M3 neutralisé sur les textes (`letter-spacing: normal`).
- Login : `p.form-error` placé sous le mot de passe, `role="alert"`, champ marqué `.field-error-state` + `aria-invalid` / `aria-describedby`. Mot de passe imposé : bandeau d'erreur au-dessus du formulaire, `mat-hint` « 8 caractères minimum. ». `MatCardModule` remplacé par `MatIconModule` dans les 4 composants de formulaire.
- Revue : 9 correctifs (voir le tri), 1 report. 360 tests verts après correctifs.
- Tests avant revue : 354 verts (26 nouveaux ; specs créées pour `motion.service`, `display-settings`, `login`, `change-password` imposé, `profile`, `admin-panel`, `reset-password-dialog`). `ng build` OK, Prettier OK, E2E compilés (32 tests sur auth, admin, settings, notes, profile ; `--list` exige `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`, même factices).
- Captures Chromium (API simulée), clair et sombre : 07 + Affichage, 08 configuré / vide / délai dépassé, 09, 13 (erreur), 14 (erreur serveur), 15, 16, 21a/b, 22a/b ; conformes aux maquettes.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Preuve |
|---|---|---|---|
| `body.no-motion` fige barre et spinners de chargement (ECH, BH) | medium | patch | Réel : une itération de 0,01 ms laisse l'indicateur sur sa dernière image (barre Trilium hors cadre, arc immobile). Barre et spinner Material exclus de la règle par `:not(…)`, vérifié dans le CSS compilé. Les squelettes, décoratifs, restent neutralisés. |
| Contraste de la pastille « Oui » non vérifié (BH) | medium | patch | Réel : 3,8:1 en clair (warning à 72 %), sous le seuil AA de 4,5:1. Passé à 55 % : ≈ 5,3:1 en clair, > 8:1 en sombre. |
| Aucun test ne vérifie l'application du réglage au démarrage par `App` (VG) | low | patch | Réel : supprimer `inject(MotionService)` ne cassait aucun test. Deux cas ajoutés dans `app.spec.ts` (« off » mémorisé → `no-motion` ; défaut → aucune classe). |
| Règles mortes `.settings-card + .settings-card` et `.form-card .ember-field + .field-label`, écrasées ou jamais appliquées (BH, ECH) | low | patch | Réel : les cartes sont dans des hôtes distincts (l'espacement vient du `gap`), et la règle de label perd face aux règles de composant. Les deux sont supprimées. |
| Styles d'aide et d'erreur de champ copiés dans trois composants (BH) | low | patch | Réel : risque de divergence. Regroupés sous `.form-card` dans `styles.scss`. |
| Suppression en rouge au survol seulement, pas au focus clavier (BH) | low | patch | Réel. `:is(:hover, :focus-visible)`. |
| Label `for="…-button"` dépendant d'une convention interne de Material (BH) | low | patch | Réel : vérifié dans `slide-toggle.mjs` (`buttonId`). Commentaire ajouté, le test du `htmlFor` détecte une rupture. |
| `authService.currentUser()?.notesEnabled` alors que `user` est disponible (BH) | low | patch | Redondance réelle, corrigée. |
| Pas de spec pour `account/change-password` ni pour `create-user-dialog` (BH) | low | patch | Réel. Specs ajoutées (labels, astérisques, `aria-required`, `.dialog-cancel`, absence de `color`). 360 tests verts. |
| Barre de navigation mobile encore affichée sur l'écran de mot de passe imposé (VG, ECH, BH) | low | defer | Préexistant : `bottom-nav` ne teste aucun utilisateur ; Q3 ne vise que la top bar, et le mobile relève de l'Epic 10. Le guard bloque déjà la navigation. |
| Préférence système lue seulement au démarrage, sans écoute de `change` (ECH, BH, VG) | low | rejeté | Réel, mais changer le réglage du système en pleine session est rare, et le corriger ajoute un écouteur conditionnel. Un rechargement applique le nouveau réglage. |
| Choix « on » sans effet sur les animations propres à Material quand le système les réduit (BH) | low | rejeté | Réel (`_animation-chunk.mjs` lit `prefers-reduced-motion`) : seuls les effets internes de Material restent réduits, toutes les animations Ember jouent. Corriger demande un fournisseur dynamique de `MATERIAL_ANIMATIONS`. |
| Pas de retour à « suivre le système » ni de synchronisation entre onglets (BH) | false | rejeté | Hors intention : A16 veut qu'un choix explicite prime sur le système, sans rien prévoir d'autre. |
| Bordure rouge et `aria-invalid` gardés pendant la saisie après une erreur de login (ECH) | low | rejeté | Le message persistait déjà avant, jusqu'à la soumission suivante. La bordure suit le message ; changer cela ajoute un abonnement. |
| `aria-invalid` sur le mot de passe pour un 429 (BH) | low | rejeté | La matrice impose « même rendu » pour 429 ; le message lu (« Trop de tentatives… ») lève l'ambiguïté. |
| 60px codés en dur (Notes, état vide) au lieu d'un token (ECH, BH) | low | rejeté | La top bar fait 60px (`top-bar.component.scss:12`), aucun défaut aujourd'hui ; les règles mobiles sont celles d'origine (Epic 10). |
| Pastille « lecture seule » incluse dans le nom accessible du champ e-mail (ECH) | false | rejeté | « Adresse email lecture seule » est une information juste et utile, pas un défaut. |
| Carte de `14` à 430px au lieu de « ≈ 460px » (BH) | false | rejeté | La règle « cotes relevées sur les PNG » prime : 596 px PNG à l'écran ≈ 430px CSS ; capture conforme à la maquette. |
| « 12 blocs » annoncés, 13 supprimés (ECH) | false | rejeté | Écart déjà noté dans les Implementation Notes (bloc de `.ember-field` dans `styles.scss`) ; corriger reviendrait à modifier la spec. |
| Statuts : spec `in-review`, sprint `in-progress` ; 9-6 passée à `done` dans le même diff (BH) | false | rejeté | Le sprint est synchronisé à la présentation (étape 5). Le passage de 9-6 à `done` a été demandé par Manu. |
| Aucun E2E pour l'interrupteur et les onglets masqués (BH) | low | rejeté | Couverts par les tests unitaires et la vérification Chromium ; la parité E2E relève de la story 9.8. |

## Verification

**Commands:**
- `cd frontend && npx ng build` -- expected: succès (avertissement de budget initial préexistant toléré, aucun budget de composant dépassé)
- `cd frontend && npx ng test --no-watch` -- expected: tests verts
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK
- `cd e2e && npx playwright test auth admin settings notes profile --list` -- expected: compilation OK

**Manual checks (if no CLI):**
- Captures Chromium avec API simulée, clair et sombre : `07` (+ carte Affichage), `08` configuré/vide/délai dépassé, `09`, `13` (erreur), `14` (erreur serveur), `15`, `16`, `21a/b`, `22a/b` ; comparer aux PNG. Interrupteur Animations : off → cascade des cartes Liens absente ; rechargement → choix conservé.
