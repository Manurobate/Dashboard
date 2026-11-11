---
title: 'Story 9.6 : Partage et vues publiques (dialog de partage, vue publique, lien expiré, erreur)'
type: 'feature'
created: '2026-11-11'
status: 'done'
route: 'dispatch'
baseline_commit: '1cc6e5382e02a0df23d91a218f42c3dca56ee5c9'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le dialog de partage (radios Material, encadré `rgba(--color-primary-rgb)`, police Courier, boutons `color="warn"`) et la vue publique `/share/:token` (titre 1.4rem, titres de section rouges, liste numérotée, pas de cartes) gardent le style d'origine, alors que le détail de recette est passé en Ember (9.5).

**Approach:** Restyler le dialog aux maquettes `10-share`, la vue publique à `11-public-recipe` (mêmes cartes que le détail 9.5, mini top bar 56px), la page de lien invalide à `12-expired` et l'erreur transitoire avec les tokens Ember (A14), sans changer services, appels API, états du dialog ni textes des snackbars.

## Boundaries & Constraints

**Always:** Dialog (`10`) : en-tête = tuile 40px rayon 10px `--color-primary-soft` avec icône `share` `--color-on-primary-soft`, titre « Partager la recette » 20px/700 (`mat-dialog-title`, nom accessible commençant par « Partager »), sous-titre = nom de la recette en secondaire, bouton `close` (`aria-label="Fermer"`) en haut à droite. État lien prêt : label secondaire au-dessus, champ en lecture seule `.share-link-value` (`--font-mono`, fond `--color-background`, bordure `--color-divider`, rayon 12px, 48px) + « Copier » plein pilule avec `content_copy` (`aria-label="Copier le lien"` conservé) ; filet `--color-divider` ; pied : « Lien actif » `check_circle` en `--color-success` à gauche, « Révoquer » bordé pilule `delete` en `--color-error` à droite. État initial (sans maquette, A14) : même en-tête, label « Durée de validité », radios conservées en `--color-primary`, « Générer le lien » plein pilule. Génération et révoqué : même en-tête, contenu actuel en secondaire.
Vue publique (`11`) : top bar du shell à 56px sur `/share/*` (logo + « Dashboard » + bouton thème, rien d'autre pour un visiteur) ; contenu centré même largeur que le détail ; titre 30px/700 `.recipe-title` ; image rayon 16px ; avant-propos en carte (texte secondaire 16px, gras en primaire) ; carte convives « Pour **N** personne(s) » + stepper (rendu 9.5) ; cartes Ingrédients (≈ 1/3) et Préparation (≈ 2/3) identiques à `06` (titres 13px/600 majuscules secondaires, quantité `--color-primary` 18px/600, pastilles d'étape 28px `--color-primary-soft`) ; une colonne sous 768px ; pied « Partagé via Dashboard » avec le logo 18px, centré, secondaire ; le footer de version du shell masqué sur `/share/*`. Chargement : spinner remplacé par les squelettes Ember (A14).
Lien invalide (`12`) : centré verticalement, tuile 76px rayon 20px fond `--color-surface` bordure `--color-divider` avec icône horloge barrée (SVG inline, la police n'a pas de glyphe adapté), titre 26px/700 primaire, paragraphe 17px secondaire max 520px. Erreur transitoire (A14) : même gabarit, icône nuage barré (SVG actuel), « Réessayer » bordé pilule. Les deux thèmes.

**Décisions de Manu (2026-11-11) :** (Q1) label du lien prêt en durée restante, calculée depuis `expiresAt` : « Lien public (expire dans N jours) », « (expire dans N heures) » sous 24 h, « (expire dans moins d'une heure) », « Lien public (permanent) » si `expiresAt` est nul ; accordé (« 1 jour », « 1 heure »). Remplace « Lien actif — Expire le … ». (Q2) pied : « Lien actif » à gauche, à droite « Régénérer » bordé pilule (`refresh`, texte secondaire) puis « Révoquer » bordé pilule (`--color-error`) ; plus de rangée d'actions ni de bouton « Fermer » dans l'état lien prêt (la croix ferme) ; fonctionnement de Régénérer et Révoquer inchangé (confirmations, retour à l'état initial, état révoqué). État révoqué : « Fermer » plein pilule conservé. (Q3) page lien invalide : titre « Ce lien a expiré ou n'est plus disponible. » (texte actuel, point compris : l'E2E le vérifie) + paragraphe « Le lien de partage que vous avez suivi n'est plus valide. Demandez à la personne qui vous l'a envoyé de vous en partager un nouveau. ». (Q4) vue publique toujours ouverte en clair, bouton thème cohérent : `ThemeService` expose un forçage non persisté (appliqué par la vue publique, levé à sa destruction en réappliquant la préférence) ; pendant le forçage, `isDark()` reflète le thème affiché et un clic bascule et mémorise comme ailleurs.

**Never:** Pas de pastilles catégorie / Prépa / Cuisson sur la vue publique (`PublicRecipeView` n'expose pas la catégorie, backend intouchable). Pas de changement de `SharingService`, `ShareViewComponent.load()` (garde de ré-entrance, 404 → `gone`), `copyToClipboard`, confirmations, snackbars, `noindex`. Pas de navigation interne ni de lien `a[href^="/"]` dans `.share-view`. Pas d'ajout de glyphe à la police. Pas de restyle mobile (10.9). Sélecteurs E2E conservés : `mat-dialog-container`, bouton « Générer le lien », `.share-link-value`, dialog nommé `/^Partager/`, bouton « Révoquer », texte « Lien révoqué », `.recipe-title`, `.ingredient-item .quantity`, `.error-state`, `app-top-bar`, `app-bottom-nav`. Pas de commit sans accord de Manu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dialog sans lien | aucun token actif | En-tête Ember, radios, « Générer le lien » | 409 → recharge (inchangé) |
| Dialog lien actif | token 7 jours | `10` : champ, Copier, Lien actif, Révoquer | N/A |
| Lien permanent | `expiresAt: null` | Label sans date d'expiration | N/A |
| Vue publique | token valide | `11`, quantités recalculées au stepper | N/A |
| Recette sans avant-propos / image / étapes | champs vides | Carte absente ; « Aucune étape renseignée. » dans la carte | N/A |
| Token invalide | 404 | `12` | N/A |
| Erreur serveur | 500 | Gabarit `12` + Réessayer | `load()` inchangé |
| Visiteur connecté | propriétaire ouvre `/share/x` | Top bar 56px (nav de l'utilisateur conservée, inchangé) | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.{html,scss}` -- tout le rendu ; `.ts` : seulement l'import `MatIconModule` déjà là, helper de libellé d'expiration (Q1), `formatExpiration` remplacé. États `idle|generating|link-ready|revoked` inchangés. Ouvert par `recipes/recipe-detail/recipe-detail.component.ts:118` : ajouter `panelClass: 'ember-share-dialog'` et largeur 460px (relevée sur `10`, PNG en 2x), `maxWidth: '92vw'`.
- `frontend/src/app/share/components/share-view/share-view.component.{html,scss}` -- mise en page `11`/`12`. Reprendre la structure et les classes du détail 9.5 (`recipe-detail.component.html`) : carte convives, `.ingredient-item .quantity` + `.unit` (marge), pastilles d'étape. Les styles du détail sont dans son composant : déplacer le commun dans `styles.scss` (budget 4 kB) plutôt que dupliquer. `.avant-propos-content strong` est déjà global.
- `frontend/src/app/share/components/share-view/share-view.component.ts` -- logique inchangée (thème selon Q4).
- `frontend/src/app/core/components/top-bar/top-bar.component.{ts,scss}` et `core/components/footer/` -- hauteur 56px et footer masqué quand l'URL commence par `/share/` (signal dérivé de `Router.events`).
- `frontend/src/app/core/services/theme.service.ts` -- forçage non persisté (Q4) ; `share-view.component.ts` l'appelle à la place de `classList.remove`/`toggle`.
- `frontend/src/styles.scss` -- `--color-success` (clair `#15803d`, sombre `#4ade80`), `.ember-chip`, `.mat-mdc-dialog-container`, `.ember-form-dialog` (modèle pour les overrides du dialog).
- Specs existantes à adapter : `share-link-dialog.component.spec.ts`, `share-view.component.spec.ts`, `top-bar.component.spec.ts`.
- E2E : `e2e/tests/recipes-share.spec.ts`, `e2e/tests/recipes-public-share.spec.ts` (sélecteurs listés en Never).

## Tasks & Acceptance

**Execution:**
- [x] `share-link-dialog.component.{html,scss,ts}` + `recipe-detail.component.ts` (panelClass) -- en-tête, états, champ, Copier, pied -- `10`
- [x] `styles.scss` -- styles communs détail / vue publique, dialog de partage
- [x] `share-view.component.{html,scss}` -- vue publique, squelettes, lien invalide, erreur -- `11`, `12`, A14
- [x] `top-bar` + `footer` -- 56px et footer masqué sur `/share/*`
- [x] Specs -- en-tête et états du dialog, libellé d'expiration, vue publique (cartes, pied, pas de lien interne), `12`, erreur + Réessayer, top bar 56px -- non-régression

**Acceptance Criteria:**
- Given le détail d'une recette, when j'ouvre « Partager » avec un lien actif, then le dialog correspond à `10` et Copier / Régénérer / Révoquer fonctionnent comme avant
- Given un visiteur sur un lien valide, when la page s'affiche, then elle correspond à `11` (top bar 56px, aucune navigation interne) et le stepper recalcule les quantités
- Given un lien invalide ou une erreur serveur, when la page s'affiche, then elle suit `12` ou le gabarit Ember avec Réessayer
- Given les E2E `recipes-share` et `recipes-public-share`, when ils tournent, then leurs sélecteurs trouvent toujours leurs éléments

## Implementation Notes

- Implémenté directement dans la session (pas de sous-agent), comme 9.3 à 9.5.
- Fiche recette commune : styles du détail (image, cartes, convives, ingrédients, étapes) déplacés dans `styles.scss` sous `.recipe-sheet`, appliquée au détail et à la vue publique (budget 4 kB par composant). Le bundle initial passe de 572,7 à 576,9 kB (avertissement préexistant).
- Cotes relevées sur `10` (PNG en 2x) : dialog 460px, tuile 38px, champ 46px rayon 10px, boutons « Copier », « Régénérer » et « Révoquer » en rectangles arrondis (rayon 10px) et non en pilules comme écrit dans la spec : la maquette fait foi. Seuls les boutons sans maquette (« Générer le lien », « Fermer » révoqué) sont en pilule.
- Dialog : `autoFocus: 'dialog'` à l'ouverture (`recipe-detail.component.ts`), sinon la croix prend le focus et affiche un halo absent de la maquette. Pas de `panelClass` : les styles tiennent dans le composant. Titre `mat-dialog-title` seul (« Partager la recette »), la tuile et le sous-titre sont hors du nom accessible. `formatExpiration` remplacé par `describeExpiry` (exporté, testé), arrondi à l'heure et au jour le plus proche.
- E2E `recipes-share.spec.ts` : la fermeture après génération clique la croix (`button[aria-label="Fermer"]`), le bouton textuel « Fermer » n'existant plus en état lien prêt (Q2). Le second test garde « Fermer » textuel (état révoqué).
- Coque : `core/utils/public-share-route.ts` (`injectIsPublicShareRoute`, signal dérivé de `NavigationEnd`) ; top bar `:host(.public-view)` à 56px, logo 22px, nom en secondaire (maquette 11) ; footer de version masqué. La navigation d'un propriétaire connecté reste affichée (inchangé).
- Thème (Q4) : `ThemeService.forceLight()` / `restorePreference()` ; `toggle()` met à jour la préférence mémorisée, donc un clic pendant le forçage bascule et persiste. Vérifié en capture : préférence sombre, vue publique claire, un clic passe en sombre.
- Vue publique : pas de pastilles (catégorie absente de `PublicRecipeView`), squelettes à la place du spinner, icône horloge barrée en SVG inline (aucun glyphe adapté dans la police sous-ensemblée, vérifié sur ses ligatures).
- Demande de Manu après revue (2026-11-11) : pied « Partagé par {nom} via Dashboard ». Seule entorse au « backend intouchable » de la story, décidée par Manu : `PublicRecipeView` gagne `sharedBy` (nom d'affichage du propriétaire, `user.name` rogné, jamais le `username`, qui est l'email), `findPublicRecipe` charge la relation `user`. Repli « Partagé via Dashboard » si le nom est vide. Tests : backend (projection, absence de l'email, nom vide → `null`), frontend (deux libellés). 211 tests backend et 315 frontend verts.
- Demande de Manu (2026-11-11) : « Dashboard » du pied est un lien externe vers `https://github.com/Manurobate/Dashboard` (`target="_blank"`, `rel="noopener noreferrer"`, souligné discret). L'E2E « aucun lien interne » (`a[href^="/"]`) reste vrai. 316 tests frontend verts.
- Revue : 6 correctifs (voir le tri) ; 314 tests verts.
- Vérifications avant revue : 312 tests verts (34 nouveaux, dont `footer.component.spec.ts` et `public-share-route.spec.ts` créés), `ng build` OK, Prettier OK, E2E Recettes compilés (`--list` : 11 tests). Captures Chromium avec API simulée, sombre et clair : dialog (initial, lien prêt), vue publique (et bascule de thème), lien invalide, erreur, chargement ; conformes à `10`, `11`, `12`.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Preuve |
|---|---|---|---|
| Commentaire SCSS vers une classe `ember-share-dialog` inexistante, pas de `panelClass` (BH, ECH, VG) | low | patch | Commentaire périmé, corrigé. Le style du conteneur (rayon 16px, surface, bordure) vient déjà de `.mat-mdc-dialog-container` global, vérifié en capture : pas de défaut visuel. |
| Nom accessible du dialog sans le nom de la recette (BH) | low | patch | Réel (avant : `Partager « … »`). Nom ajouté dans le titre en `.visually-hidden` ; le nom reste « Partager la recette « … » » (E2E `/^Partager/` vert). |
| `aria-label` du champ qui masque son `<label for>` visible (BH) | low | patch | Réel. `aria-label` retiré ; le champ est nommé par « Lien public (expire dans …) » (test sur `input.labels`). |
| `describeExpiry` : 30 à 59 min affichent « 1 heure », contraire à la doc (VG, BH) | low | patch | Réel. Test `remaining < HOUR_MS` avant l'arrondi ; cas 45 min ajouté. |
| Croix active pendant la génération : fermeture avant la réponse (ECH) | low | patch | Réel, la croix est nouvelle. Désactivée en état `generating` (test ajouté). Échap et le fond fermaient déjà avant (inchangé). |
| Retour de la top bar hors `/share/*` non testé (BH) | low | patch | Test : navigation vers `/share/abc123` puis `/login`, la classe `public-view` tombe. |
| Arrondi qui surestime (36 h → 2 jours, 6,6 j → 7 jours), date exacte perdue (BH) | low | rejeté | Arrondi au plus proche voulu : un lien de 7 jours créé à l'instant doit afficher « 7 jours » (Q1, date exacte remplacée par décision de Manu). |
| Jeton expiré affiché « moins d'une heure » (BH) | low | rejeté | `GET /api/sharing` ne renvoie que les liens actifs ; cas atteignable seulement si le dialog reste ouvert au moment de l'expiration. |
| Libellé figé pendant que le dialog reste ouvert (BH, ECH) | low | rejeté | Dialog de courte durée ; un minuteur ajouterait de la complexité pour un cas rare. |
| `expiresAt` non parsable → « NaN jours » (ECH) | low | rejeté | Le backend renvoie une date ISO ou `null` (`PublicShareToken`). |
| État `link-ready` avec jeton nul (ECH) | false | rejeté | `link-ready` n'est posé qu'après `currentToken.set(token)` (`createLink`, `loadActiveLink`). |
| `isPublicShareUrl` et query string / fragment (BH) | false | rejeté | `/share/abc?x=1` et `/share/abc#t` commencent par `/share/` ; `/share` seul est redirigé vers `/`. |
| Deux « Fermer » dans l'état révoqué (BH) | low | rejeté | Décision Q2 : « Fermer » plein conservé dans l'état révoqué ; E2E vert (`has-text`). |
| Test « aucun lien interne » faible, pas d'E2E du rendu visiteur (BH) | low | rejeté | Test préexistant conservé ; l'E2E `recipes-public-share` vérifie déjà top bar sans nav ni menu. |
| `100vh` et 56px codés en dur dans l'état d'erreur (BH) | low | rejeté | Cosmétique ; mobile relevant de l'Epic 10 (10.9). |
| Styles `.recipe-sheet` globaux : collisions, spécificité du détail (BH) | false | rejeté | Aucune règle restante du composant détail ne cible les classes déplacées ; capture du détail identique à 9.5. |
| Bascule de thème mémorisée pour un visiteur (BH) | false | rejeté | Voulu, décision Q4 (« un clic bascule et mémorise »). |

## Verification

**Commands:**
- `cd frontend && npx ng build` -- expected: succès (avertissement de budget initial préexistant)
- `cd frontend && npx ng test --no-watch` -- expected: tests verts
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK
- `cd e2e && npx playwright test recipes --list` -- expected: compilation OK

**Manual checks (if no CLI):**
- Captures Chromium avec API simulée, clair et sombre : dialog (initial, lien actif, révoqué), vue publique (avec et sans image / avant-propos), lien invalide, erreur ; comparer à `10`, `11`, `12`.
