---
title: 'Story 9.5 : Recettes (liste, détail, éditeur, états vide et sans résultat)'
type: 'feature'
created: '2026-11-11'
status: 'done'
route: 'dispatch'
baseline_commit: 'bb478b270053a3e7b1e083cade7d328f027fcd79'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le module Recettes garde le style Material d'origine (accordéon gris, champs à label flottant, boutons `color="warn"`, pastille d'étape bleue `#1976d2`, couleurs `rgba(0,0,0,…)` codées en dur), alors que Liens et la coque sont passés en Ember.

**Approach:** Restyler liste, recherche sans résultat, état vide, détail (stepper inclus) et éditeur aux maquettes `05`, `06`, `17`, `26`, `27`, avec les tokens Ember et les classes partagées de 9.4 (`.ember-field`, `.field-label`), sans changer données, services, validations, autocomplétions ni drag & drop.

## Boundaries & Constraints

**Always:** Liste (`05`) : recherche pleine hauteur 50px fond `--color-surface`, bordure `--color-divider`, rayon 12px, icône `search` à gauche, `close` à droite si saisie, focus bord `--color-primary` + anneau `--color-primary-soft` (`27`) ; « Nouvelle recette » plein pilule. Groupe = carte `--color-surface`, bordure, rayon 16px ; en-tête : nom 17px/600, chevron `expand_less`/`expand_more` à droite ; `mat-accordion`/`mat-expansion-panel` conservés (sélecteur E2E `mat-panel-title`), restylés. Lignes de recette en grille `repeat(auto-fit, minmax(340px, 1fr))` (1 → pleine largeur, 2 → moitiés, 3 → tiers, au-delà retour à la ligne) : tuile 46px rayon 10px, titre 16px/500, « N pers. » à droite en secondaire ; survol fond `--color-surface-2`. Recherche avec résultats (sans maquette) : même ligne, dans une seule carte, pastille de catégorie conservée. Vide (`26`) : icône `menu_book` 64px secondaire, texte 17px secondaire, « Ajouter une recette » plein pilule. Sans résultat (`27`) : texte centré secondaire, guillemets français. Squelettes (A14) : structure inchangée, dégradé en `--color-surface`/`--color-surface-2`, rayon 16px.
Détail (`06`) : lien retour « ← Toutes les recettes » (texte secondaire, `routerLink="/recipes"`) ; titre 40px/700 ; « Partager » bordé pilule avec icône `share` (`aria-label="Partager la recette"` conservé) ; rangée de pastilles : catégorie en `--color-on-primary-soft` sur `--color-primary-soft` ; « Partagé » (cadenas) en pastille bordée de la même rangée, classe `.share-badge` conservée. Image (si présente) rayon 16px. Avant-propos en carte (fond `--color-surface`, texte secondaire 16px, gras en `--color-text-primary`), titre visuel retiré, `aria-label` gardé. Carte convives : « Pour **N** personnes » (N en `--color-primary`) à gauche, stepper à droite. Stepper (`06`) : boîte bordée rayon 12px, `−`/`+` 40px, « N » 20px/700 + « pers. » secondaire ; `role="spinbutton"`, `aria-*`, `aria-label` des boutons, borne min inchangés ; s'applique aussi à la vue publique (composant partagé). Deux cartes : Ingrédients (≈ 1/3) et Préparation (≈ 2/3), titres 13px/600 majuscules espacés secondaires ; ingrédient : quantité + unité 18px/600 en `--color-primary` dans une colonne fixe, nom 18px, séparateurs `--color-divider` (`.ingredient-item .quantity` conservé) ; étape : pastille 32px rayon 8px (`--color-on-primary-soft` sur `--color-primary-soft`), texte 17px. Sous 768px : une colonne.
Éditeur (`17`) : bouton retour carré bordé 46px rayon 10px + titre 28px/700. Tous les champs en `.ember-field` + `.field-label` (astérisque `--color-primary` sur Titre, Catégorie, Convives ; Qté et Ingrédient) ; « Image URL » avec aide sous le champ. Catégorie : autocomplétion et création libre inchangées, apparence de liste déroulante (icône `expand_more` en suffixe, A11). Lignes d'ingrédient : labels 12px au-dessus de chaque champ, poignée `drag_indicator` secondaire, corbeille 36px secondaire (plus de `color="warn"`). Étapes : pastille ronde 32px pleine `--color-primary-fill` texte `--color-on-primary`, éditeur à droite, corbeille puis poignée empilées en colonne. Éditeur markdown : carte fond `--color-surface-2`, bordure `--color-divider`, rayon 12px, barre B/I/U séparée par un filet, focus comme `.ember-field`. « Ajouter un ingrédient / une étape » : bordé pilule, texte et icône `--color-on-primary-soft`. Actions : « Annuler » texte `--color-primary`, enregistrement plein pilule. Drag & drop : placeholder pointillé `--color-primary` sur `--color-primary-soft` rayon 10px, fantôme ombre `--drag-shadow` (9.4). Les deux thèmes.

**Décisions de Manu (2026-11-11) :** (Q1) détail : « Partager » bordé pilule avec texte, puis Modifier (`edit`) et Supprimer (`delete`) en boutons d'icône carrés bordés 40px rayon 10px, comme le bouton thème de la top bar ; Supprimer en `--color-error` ; `aria-label` inchangés (à revoir après test si besoin). (Q2) « Nouvelle recette » sur la même ligne que la recherche dans tous les états (liste, vide, sans résultat), comme `05`. (Q3) tuile d'icône générique `restaurant` (tuile 34px `--color-primary-soft` / icône `--color-on-primary-soft` pour l'en-tête de catégorie, tuile 46px bordée `--color-surface-2` / icône `--color-primary` pour les recettes) ; personnalisation des icônes de catégorie reportée. (Q5) dans la liste, la tuile d'une recette qui a une `imageUrl` affiche une miniature de la photo (`<img>` `object-fit: cover`, même taille et rayon que la tuile, `alt=""` car le titre suit, `loading="lazy"`, `referrerpolicy="no-referrer"`) ; si l'image ne charge pas (`error`), la tuile repasse sur l'icône `restaurant`. Seule exception fonctionnelle de la story, demandée par Manu ; aucune modification backend (`imageUrl` déjà renvoyé par `GET /api/recipes`). (Q4) compteur gardé en pastille bordée rayon 999px, `--font-mono` 13px secondaire, accordé : « 1 recette », « N recettes ».

**Never:** Pas de champs Prépa / Cuisson / Difficulté (absents du modèle : seules la catégorie et « Partagé » forment la rangée de pastilles). Pas de changement de services, validations, longueurs max, ordre et textes des snackbars, logique de recalcul (`number: '1.0-2' : 'fr'`), routes, backend. Pas de restyle mobile (Epic 10) ni de la vue publique hors stepper (9.6). Pas d'ajout de glyphe à la police. Sélecteurs E2E conservés : `mat-panel-title`, `.recipe-title`, `.share-badge`, `.ingredient-item .quantity`, `input[formcontrolname=…]`, `section.section-steps textarea.mle-textarea`, `app-recipe-ingredient-row`, `button[aria-label="Supprimer la recette"]`, `button[aria-label="Partager la recette"]`, boutons du stepper. Pas de commit sans accord de Manu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Chargement liste | `isLoading` | 3 squelettes Ember, `aria-busy` | N/A |
| Aucune recette | liste vide, pas de recherche | État vide `26` | N/A |
| Recherche sans résultat | « auj » | « Aucun résultat pour « auj » », bouton `close` visible | N/A |
| Recette avec photo | `imageUrl` valide | Miniature dans la tuile de la liste | N/A |
| Photo cassée | `imageUrl` en 404 | Tuile avec l'icône `restaurant` | `(error)` → repli |
| Recette sans catégorie | `category: null` | Groupe « Sans catégorie », pas de pastille catégorie sur le détail | N/A |
| Stepper au minimum | 1 convive | `−` désactivé, recalcul inchangé | N/A |
| Recette partagée | lien actif | Pastille « Partagé » visible (`.share-badge`) | N/A |
| Champ requis vide | Titre vidé puis blur | `mat-error` actuel, bord `--color-error` | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/app/recipes/recipes.component.{html,scss}` -- liste, recherche (remplacer `mat-form-field` par un champ maison ou `.ember-field` adapté à 50px ; garder `aria-label`, `(input)`, `clearSearch`), accordéon (overrides `--mat-expansion-*` locaux + `hideToggle` et chevron propre si nécessaire), lignes, vide, sans résultat, squelettes. Remplacer toutes les variables `--mat-sys-*`. Budget composant 4 kB : déplacer le partagé dans `styles.scss` si dépassement.
- `frontend/src/app/recipes/recipes.component.ts` -- aucun changement de logique ; ajouter un helper de pluriel « 1 recette / N recettes » (Q4) et un `signal<Set<number>>` des ids dont la miniature a échoué (Q5).
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.{html,scss}` -- nouvelle mise en page (`06`), ordre : retour, titre + actions, pastilles, image, avant-propos, carte convives, deux cartes. `onShare`, `onDelete`, `hasActiveShare`, `computedIngredients`, `currentServings` inchangés. Supprimer `rgba(var(--color-primary-rgb…))`.
- `frontend/src/app/recipes/recipe-detail/convives-steppper.component.{html,scss}` -- boîte Ember ; l'entrée `compact` reste acceptée (utilisée par `share/components/share-view/share-view.component.html:49`) mais le rendu Ember est le même ; ne pas toucher au `.ts`.
- `frontend/src/app/recipes/recipe-editor/recipe-editor.component.{html,scss}` -- labels externes, `.ember-field`, `subscriptSizing="dynamic"`, suffixe `expand_more` sur Catégorie, pastilles d'étapes, boutons. Ne pas toucher au `.ts` (FormArray, drop, autocomplétion).
- `frontend/src/app/recipes/recipe-editor/recipe-ingredient-row.component.{html,scss}` -- labels 12px, `.ember-field`, corbeille sans `color="warn"`, placeholder Ember. Garder `cdkDrag`, `*cdkDragPlaceholder`, `*ngIf` des erreurs.
- `frontend/src/app/recipes/recipe-editor/markdown-light-editor.component.scss` -- carte Ember, focus ; HTML inchangé (`.mle-textarea`).
- `frontend/src/styles.scss` -- réutiliser `.field-label`, `.ember-field`, `--drag-shadow`, `.mat-mdc-dialog-container` ; ajouter si besoin une pastille partagée (`.ember-chip`) réutilisable en 9.6 (vue publique).
- Specs à créer (aucune n'existe pour ces composants) : `recipes.component.spec.ts`, `recipe-detail.component.spec.ts`, `convives-steppper.component.spec.ts`, `recipe-editor.component.spec.ts` (courts : états, libellés, `aria`, labels `for`, absence de `color="warn"`).

## Tasks & Acceptance

**Execution:**
- [x] `recipes.component.{html,scss,ts}` -- recherche, bouton, groupes, lignes, vide, sans résultat, squelettes -- `05`, `26`, `27`, A14
- [x] `convives-steppper.component.{html,scss}` -- boîte Ember -- `06`
- [x] `recipe-detail.component.{html,scss}` -- retour, en-tête, pastilles, avant-propos, carte convives, cartes ingrédients et préparation -- `06`
- [x] `markdown-light-editor.component.scss` -- carte Ember -- `17`
- [x] `recipe-ingredient-row.component.{html,scss}` -- labels, champs, corbeille, placeholder -- `17`
- [x] `recipe-editor.component.{html,scss}` -- en-tête, champs, catégorie, étapes, boutons, actions -- `17`, A11
- [x] `styles.scss` -- styles partagés si budget dépassé
- [x] Specs -- états de liste (squelette, vide, sans résultat, groupes), stepper (min, aria), détail (pastilles, actions, Partagé), éditeur (labels reliés, astérisques, suffixe catégorie) -- non-régression

**Acceptance Criteria:**
- Given la liste, la recherche sans résultat ou l'état vide, when l'écran s'affiche, then il correspond à `05`, `27`, `26` dans les deux thèmes
- Given le détail, when je change les convives, then les quantités se recalculent comme avant et le rendu correspond à `06`
- Given l'éditeur, when je tape dans Catégorie, then l'autocomplétion propose les catégories existantes et accepte une nouvelle, avec l'apparence `17`
- Given l'éditeur, when je glisse un ingrédient ou une étape, then l'ordre change comme avant et le placeholder est Ember
- Given les E2E `recipes-*`, when ils tournent, then leurs sélecteurs trouvent toujours leurs éléments

## Implementation Notes

- Implémenté directement dans la session (pas de sous-agent), comme les 9.3 et 9.4. Fichiers : `recipes.component.{html,scss,ts}`, `convives-steppper.component.{html,scss}`, `recipe-detail.component.{html,scss}`, `recipe-editor.component.{html,scss,ts}`, `recipe-ingredient-row.component.{html,scss,ts}`, `markdown-light-editor.component.scss`, `styles.scss` ; 4 specs créées (`recipes`, `convives-steppper`, `recipe-detail`, `recipe-editor`).
- Cotes relevées sur les maquettes (PNG en 2x) quand elles s'écartent des valeurs écrites dans la spec : tuile de recette 40px (et non 46px), tuile de catégorie 30px (et non 34px), titre du détail 30px (et non 40px), pastille d'étape 28px. La maquette fait foi (règle de l'Epic 9).
- Liste : recherche en champ natif (même construction que la barre ⌘K des Liens), `type="text"` pour éviter la croix native de Chrome en doublon du bouton « Effacer ». Accordéon conservé (`displayMode="flat"`, `hideToggle`, chevron `expand_less`/`expand_more` lu sur `panel.expanded`). Grille `repeat(auto-fit, minmax(min(100%, 280px), 1fr))` : 280px (et non 340px) donne au plus 3 colonnes dans les 920px utiles, comme `05`.
- Miniatures (Q5) : `brokenImages` (signal de `Set<number>`) alimenté par `(error)`, repli sur `restaurant`. `GET /api/recipes` renvoie déjà `imageUrl` (`find` sans `select`).
- Détail : la colonne « Étapes » est titrée « Préparation » comme `06` (`aria-label="Étapes"` conservé) ; « Pour N personne(s) » accordé ; espace entre quantité et unité porté par une marge (le template sans espace donnait « 300g »). L'avant-propos n'a plus de titre visible. Le gras de l'avant-propos (`innerHTML`, hors encapsulation) est stylé dans `styles.scss`.
- Stepper : `compact` toujours accepté mais sans effet ; le nouveau rendu s'applique aussi à la vue publique (`share-view`), comme prévu.
- Styles partagés dans `styles.scss` (budget de 4 kB par composant) : carte de groupe et overrides `--mat-expansion-*`, tuiles, compteur, grille, ligne de recette, `.ember-chip` (réutilisable en 9.6). `.ember-field` (9.4) : aide en `--color-text-secondary` et aide/erreur alignées sous le label (padding 16px retiré) ; touche aussi les erreurs des dialogs Liens, désormais alignées sur leur label.
- Éditeur : `MatDividerModule` retiré (filet en `<hr>`). Ids de champs uniques par ligne d'ingrédient (`ingredient-N-qty|unit|name`). Fantôme et placeholder du drag stylés sur `.ingredient-row` / `.step-row`, qui portent `cdkDrag`.
- Vérifications : 278 tests verts (27 nouveaux), `ng build` OK (seul l'avertissement préexistant du bundle initial, 572,7 kB), Prettier OK, E2E Recettes compilés (`--list` : 11 tests, sélecteurs inchangés). Captures Chromium avec API simulée, sombre et clair : liste, squelettes, vide, sans résultat, résultats, détail (avec et sans partage, stepper +1), éditeur (erreur, autocomplétion ouverte, drag d'ingrédient). Conformes à `05`, `06`, `17`, `26`, `27`. À 390px rien n'est cassé, mais la recherche est étroite à côté du bouton : à reprendre dans l'Epic 10.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Preuve |
|---|---|---|---|
| Ligne d'ingrédient en débordement horizontal sur téléphone (ECH) | medium | patch | Mesuré à 390px : `scrollWidth` 476. Sous 600px, champs Qté et Unité à 64px et `min-width: 0` sur Ingrédient : `scrollWidth` 390. |
| Section `aria-label="Étapes"` alors que le titre visible est « Préparation » (BH, ECH) | low | patch | Réel. `aria-label="Préparation"` sur le détail. |
| Saisie et effacement de la recherche non testés de bout en bout (VG) | medium | patch | Test ajouté : `input` + debounce 200ms (faux minuteurs), puis clic sur « Effacer » qui ramène les groupes et vide le champ. |
| Chevron maison (`hideToggle`) jamais exercé (VG, BH) | medium | patch | Test ajouté (clic sur l'en-tête, `aria-expanded`, `expand_more` puis `expand_less`). Contrôle par mutation : la ternaire inversée fait échouer le test. |
| Le test label/champ ne vérifie pas que le label nomme l'input (VG) | low | patch | Assertion renforcée : `HTMLInputElement` et `input.labels` contient le label. |
| Aucun retour au survol des en-têtes de groupe (BH) | low | patch | Réel. Survol en `--color-surface-2`. |
| Colonne `.amount` fixe à 72px, une unité longue déborde (ECH) | low | patch | Réel pour un mot plus large que 72px. `min-width: 72px; max-width: 40%; overflow-wrap: anywhere`. |
| Nom de catégorie long qui repousse le compteur (ECH) | low | patch | Réel. Ellipse sur `.category-name`, `flex-shrink: 0` sur le compteur. |
| Stepper `compact` sans effet dans la vue publique (BH, ECH, VG) | low | rejeté | Voulu : le bloc figé dit que le stepper s'applique aussi à la vue publique (composant partagé). La vue publique sera reprise en 9.6. |
| Affirmation « vue publique hors périmètre » contredite par le stepper (ECH) | false | rejeté | Le bloc figé prévoit explicitement l'effet sur la vue publique. |
| Classes globales génériques, `.avant-propos-content strong` touche la vue publique (BH, VG) | low | rejeté | Aucune collision trouvée dans `frontend/src/app`. Le gras visible dans la vue publique est souhaitable (même contenu markdown). |
| Image du détail sans repli ni `referrerpolicy` (BH) | low | rejeté | Comportement inchangé par cette story ; Q5 ne vise que les miniatures de la liste. |
| Changement de recherche non annoncé aux lecteurs d'écran (BH) | false | rejeté | `.search-results` porte `aria-live="polite"` et `aria-atomic="true"` (inchangé). |
| Labels répétés sur chaque ligne d'ingrédient (BH) | false | rejeté | La maquette `17` répète « Qté / Unité / Ingrédient » sur chaque ligne. |
| Décalages `margin-top` codés en dur dans la ligne d'ingrédient (BH) | low | rejeté | Labels courts et sans retour à la ligne ; alignement vérifié sur les captures. |
| Corbeilles de l'éditeur grises, celle du détail rouge (BH) | low | rejeté | Les deux suivent leur maquette et le bloc figé (Q1 et « corbeille secondaire »). |
| Points de suspension « ... » dans le placeholder (BH) | low | rejeté | Texte préexistant, inchangé. |
| Tests fragiles (`toHaveLength(13)`, texte `add`, `color` absent) (BH) | low | rejeté | Assertions volontaires sur l'état par défaut ; fragilité sans défaut associé. |
| `onShare`/`onDelete` non couverts par le spec du détail (BH) | low | rejeté | Logique inchangée, couverte par les E2E `recipes-share` et `recipes-delete`. |
| `brokenImages` jamais vidé (ECH) | false | rejeté | Le composant liste est recréé à chaque navigation (route), donc après une modification de l'URL dans l'éditeur. |
| Ids dupliqués pendant le drag (clone du CDK) (ECH) | low | rejeté | Transitoire et propre au CDK ; aucun effet utilisateur. |
| En-tête du détail serré sur téléphone (ECH) | low | rejeté | Capture à 390px : le titre passe à la ligne sans débordement ; le restyle mobile relève de l'Epic 10. |
| Spec non suivie dans le diff (BH) | false | rejeté | La spec est exclue du diff de revue par construction ; elle sera incluse au commit. |
| Lignes de recette en `div role="link"` (BH) | low | defer | Préexistant (5.2), hors refonte visuelle. |
| Retour et Annuler de l'éditeur vont à `/recipes` en modification (BH) | low | defer | Préexistant (5.3), comportement inchangé par Ember. |

## Verification

**Commands:**
- `cd frontend && npx ng build` -- expected: succès (avertissement de budget initial préexistant)
- `cd frontend && npx ng test --no-watch` -- expected: tests verts
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK
- `cd e2e && npx playwright test recipes --list` -- expected: compilation OK

**Manual checks (if no CLI):**
- Captures Chromium avec API simulée, sombre et clair : liste, squelettes, vide, sans résultat, résultats de recherche, détail (avec et sans image, partagé), éditeur (vide, erreurs, drag) ; comparer à `05`, `06`, `17`, `26`, `27`.
