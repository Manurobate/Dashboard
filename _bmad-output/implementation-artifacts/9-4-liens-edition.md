---
title: 'Story 9.4 : Liens en édition (mode édition, drag & drop stylé, dialogs lien, catégorie et icônes)'
type: 'feature'
created: '2026-11-10'
status: 'done'
route: 'dispatch'
baseline_commit: 'b2c9e5c926b7f182f9d5ba507ba89e61086bf4a9'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le mode édition des Liens et ses dialogs (lien, catégorie, sélecteur d'icônes) gardent le style Material d'origine (poignées `drag_handle`, lignes grises, bouton texte « Ajouter un lien », champs à label flottant, aperçu de drag à ombre faible), alors que la lecture est passée en Ember (9.3).

**Approach:** Restyler le mode édition et les trois dialogs aux maquettes `03-edit`, `18-link-dialog`, `19-category-dialog`, `20-icon-picker` avec les tokens Ember et la spec Motion du drag & drop, sans changer champs, validations, services ni backend.

## Boundaries & Constraints

**Always:** Barre d'actions en édition : pastille « Mode édition » à gauche (point + texte `--color-on-primary-soft` sur `--color-primary-soft`, pilule, décorative avec `role="status"`), à droite « Ajouter une catégorie » en bouton bordé pilule (bord `--color-border-strong`, icône `add`) et « Terminer » plein pilule (déjà en place). Poignées `drag_indicator` (police déjà fournie) sur catégories et liens. Ligne de lien en édition : fond `--color-surface-2`, bordure `--color-divider`, rayon 10px, tuile 26px conservée, actions `edit`/`delete` 32px en `--color-text-secondary`. « Ajouter un lien » : bouton pleine largeur, bordure pointillée `--color-border-strong`, rayon 10px, texte centré `--color-text-secondary`. Drag & drop (spec Motion) : fantôme `.cdk-drag-preview` en `rotate(-3deg) scale(1.03)` + ombre forte ; carte cible (liste survolée, `.cdk-drop-list-dragging`) : bordure `--color-primary` + `box-shadow: 0 0 0 1px primary, 0 0 0 7px primary-soft` ; placeholder `.cdk-drag-placeholder` en pointillé `--color-primary` sur fond `--color-primary-soft`, contenu masqué ; `.cdk-drag-animating` 200ms `cubic-bezier(.2,.7,.2,1)` ; transitions neutralisées sous `prefers-reduced-motion: reduce`. Dialogs : titre 20px/700, label au-dessus du champ (13px/500, astérisque `--color-primary` pour les requis, `for`/`id` reliés, `aria-required`), champ fond `--color-surface-2`, bordure `--color-divider`, rayon 10px, focus bord `--color-primary` + anneau `--color-primary-soft`, `mat-error` inchangés. Libellés et placeholders des maquettes : lien « URL* » (`https://example.com`), « Titre* » (« Nom du lien »), « URL du favicon » (« Optionnel — récupéré automatiquement si vide »), « Description » (« Optionnel ») ; catégorie « Nom* », « Icône (optionnelle) » avec « (optionnelle) » en `--color-text-secondary`, bouton « Choisir une icône » bordé à texte `--color-primary` et icône `image`. Sélecteur : champ de recherche sans label flottant (placeholder « Rechercher une icône », icône `search` à droite), bandeau « Sélectionnée : » sur `--color-primary-soft` avec icône et nom en `--color-primary` gras, grille de tuiles rayon 10px (sélection : fond `--color-primary-soft`, bord et icône `--color-primary`), boutons « Annuler » et « Effacer » en texte secondaire, « Choisir » en `--color-primary`. Actions des dialogs : « Annuler » secondaire, confirmation `--color-primary` (grisée si invalide). Styles de champ réutilisables par 9.5 et 9.7 : classe globale (ex. `.ember-field`), pas de styles copiés par composant. Les deux thèmes.

**Décisions de Manu (2026-11-10) :** (Q1) la grille Liens reste en grille en mode édition, comme `03-edit` : la règle `.category-list.edit-mode { 1fr }` est retirée (≥600px) et la liste des catégories passe en `cdkDropListOrientation="mixed"` ; sous 600px, une colonne comme avant. (Q2) un déplacement de lien réussi affiche la snackbar « Lien déplacé vers {nom de la catégorie cible} » 3s (succès, sans `panelClass`), l'échec reste inchangé.

**Never:** Pas de changement des validations, longueurs max, champs, logique OG/favicon, ordre des actions, textes des snackbars existants (seul ajout : la snackbar de succès du déplacement), services, backend, routes. Pas de restyle mobile (Epic 10). Pas de modification du mode lecture (9.3) hors styles partagés. Pas d'ajout de glyphe à la police d'icônes. Classes testées conservées : `mat-icon.drag-handle`, `.link-list`, `.icon-preview` (contient le nom), `.no-icon-label`, `.icon-btn`, `.selected-preview`, `.category-icon`. Pas de commit sans accord de Manu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Drag d'un lien vers une autre catégorie | survol de la carte Admin | Fantôme incliné, carte Admin illuminée, placeholder pointillé | N/A |
| Drop réussi | API OK | Lien dans la cible + snackbar « Lien déplacé vers Admin » 3s | N/A |
| Drop en échec | API KO | Retour à la source + snackbar d'erreur 3s (inchangé) | `snackbar-error` |
| Champ requis vide | URL ou Titre vidé puis blur | `mat-error` actuel, bord en `--color-error` | N/A |
| Catégorie sans icône | `selectedIcon` null | « Aucune icône » italique + « Choisir une icône » | N/A |
| Catégorie avec icône | `home` | Aperçu `.icon-preview` + nom + bouton « Changer » | N/A |
| Animations réduites | `prefers-reduced-motion: reduce` | Pas de transition d'animation du drop | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/app/links/links.component.html` -- `.header-actions` en édition : ajouter la pastille « Mode édition » (gauche), passer « Ajouter une catégorie » de `mat-button color="primary"` à `mat-stroked-button` (classe dédiée). `.category-list` `cdkDropList` : ajouter `cdkDropListOrientation="mixed"` (Q1). Garder `toggle-edit-btn` et ses `aria-label`.
- `frontend/src/app/links/links.component.scss` -- déjà proche du budget 4 kB (4,7 kB, avertissement existant) : styles de la barre d'édition courts ; ce qui est partagé va dans `styles.scss`. Retirer la règle `.category-list.edit-mode` (≥600px) : la grille reste en édition (Q1).
- `frontend/src/app/links/links.component.ts:290` `handleMoveLink` -- dans `next`, `snackBar.open('Lien déplacé vers ' + nom, 'Fermer', { duration: 3000 })`, nom lu dans `linkCategoriesService.categories()` (Q2).
- `frontend/src/app/links/components/link-category-card/link-category-card.component.{html,scss}` -- poignée `drag_indicator` (garder `cdkDragHandle class="drag-handle"`), bouton « Ajouter un lien » pleine largeur pointillé, état cible via `.category-card:has(.link-list.cdk-drop-list-dragging)`, fantôme et placeholder de la carte elle-même (`:host(.cdk-drag-preview)`, `:host(.cdk-drag-placeholder)` ; la cascade y est déjà coupée).
- `frontend/src/app/links/components/link-item/link-item.component.{html,scss}` -- poignée `drag_indicator`, styles `.edit-mode` (remplacer `--mat-sys-surface-container-low` par les tokens), `.cdk-drag-preview`/`.cdk-drag-placeholder` sur l'hôte (le CDK pose les classes sur l'élément `cdkDrag`, donc `:host(...)`, pas sur `.link-item-wrapper` comme aujourd'hui, qui ne s'applique pas). Ne pas toucher au bloc lecture `:not(.edit-mode)`.
- `frontend/src/app/links/components/link-dialog/link-dialog.component.{html,scss}` -- labels externes + placeholders des maquettes, `mat-form-field` sans `mat-label`, classe `.ember-field`. Spinner OG `matSuffix` conservé.
- `frontend/src/app/links/components/category-dialog/category-dialog.component.{html,scss}` -- idem, icône `image` sur le bouton, « (optionnelle) » en secondaire.
- `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.{html,scss}` -- recherche sans `mat-label` (placeholder « Rechercher une icône »), bandeau, grille 8 colonnes à 480px, tuiles, `color="warn"` d'« Effacer » retiré.
- `frontend/src/styles.scss` -- `.mat-mdc-dialog-container` (9.2) : titre, actions ; nouvelle classe globale `.ember-field` + `.field-label` (champ Ember, réutilisable 9.5/9.7) ; tokens `--drag-shadow` clair/sombre si besoin.
- `frontend/src/app/links/links.component.ts:141-238` -- largeurs des dialogs (480/400px) : passer à 440px (lien, catégorie) pour coller aux maquettes ; aucune autre modification.
- Specs : `link-item`, `link-category-card`, `links`, `material-icon-picker` ; il n'existe pas de spec pour `link-dialog` ni `category-dialog` (en créer une courte : labels reliés, astérisques, placeholders, validations inchangées).

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/styles.scss` -- `.ember-field`/`.field-label`, titre et actions des dialogs -- socle réutilisable
- [x] `link-item.component.{html,scss}` -- poignée, ligne d'édition, fantôme et placeholder sur `:host` -- `03-edit`, Motion
- [x] `link-category-card.component.{html,scss}` -- poignée, « Ajouter un lien » pointillé, carte cible illuminée, fantôme/placeholder de carte -- `03-edit`, Motion
- [x] `links.component.{html,scss,ts}` -- pastille « Mode édition », bouton bordé, grille en édition (`mixed`), snackbar de succès du déplacement, largeurs de dialog -- `03-edit`
- [x] `link-dialog.component.{html,scss}` -- labels, placeholders, `.ember-field` -- `18-link-dialog`
- [x] `category-dialog.component.{html,scss}` -- idem, bouton d'icône -- `19-category-dialog`
- [x] `material-icon-picker.component.{html,scss}` -- recherche, bandeau, grille, boutons -- `20-icon-picker`
- [x] Specs -- pastille et bouton bordé, poignées `drag_indicator`, dialogs (labels `for`, astérisques, placeholders, validations), sélecteur (placeholder, sélection), snackbar de succès et absence de snackbar de succès en échec -- non-régression

**Acceptance Criteria:**
- Given le mode édition, when je le regarde, then il correspond à `03-edit` (pastille, boutons, poignées, lignes, « Ajouter un lien ») dans les deux thèmes
- Given que je glisse un lien ou une catégorie, when je survole une cible, then fantôme, zone de drop et placeholder suivent la spec Motion
- Given les dialogs lien, catégorie et sélecteur, when ils s'ouvrent, then leur style correspond aux maquettes, à champs et validations identiques
- Given la grille en mode édition (≥600px), when je glisse une catégorie, then elle se réordonne en 2D dans la grille et la position est persistée comme avant
- Given les E2E `links-drag-drop` et `links-icon-picker`, when ils tournent, then leurs sélecteurs trouvent toujours leurs éléments

## Implementation Notes

- Implémenté directement dans la session (pas de sous-agent), comme la 9.3. Fichiers : `styles.scss`, `links.component.{html,scss,ts,spec.ts}`, `link-category-card.component.{html,scss,spec.ts}`, `link-item.component.{html,scss,spec.ts}`, `link-dialog.component.{html,scss}` + spec créée, `category-dialog.component.{html,scss,ts}` + spec créée, `material-icon-picker.component.{html,scss,spec.ts}`.
- Styles des dialogs limités à une `panelClass` `ember-form-dialog` (lien, catégorie, sélecteur) pour ne pas toucher aux dialogs admin et partage (9.6, 9.7). Le pseudo-élément `::before` du titre Material est masqué (il ajoutait ~40px au-dessus du titre).
- Champ Ember global : `.field-label` (avec `.field-required`, `.field-hint`) + `mat-form-field.ember-field` (`appearance="outline"`, `subscriptSizing="dynamic"`, sans `mat-label`). `aria-required` n'est pas posé à la main : `matInput` le calcule depuis `Validators.required` (`true` sur URL, Titre, Nom ; `false` ailleurs).
- Fantôme et placeholder stylés sur `:host(.cdk-drag-preview|placeholder)` : l'ancienne règle `.link-item-wrapper.cdk-drag-preview` ne s'appliquait jamais (le CDK pose ses classes sur l'hôte `cdkDrag`). Placeholder : contenu masqué par `opacity: 0`, car la poignée du lien porte un `visibility` inline. Le fantôme d'un lien masque ses actions, comme la maquette. Carte cible : `.category-card.edit-mode:has(.link-list.cdk-drop-list-dragging)` (la carte source s'illumine aussi tant que le lien la survole, comportement du CDK).
- Grille en édition : règle `.category-list.edit-mode { 1fr }` retirée, `cdkDropListOrientation="mixed"`. Vérifié dans Chromium : Dev glissée en fin de grille → ordre `Admin, Multimédia, Dev`, `PATCH /api/link-categories/reorder` avec les positions 0..2.
- Snackbar de succès : « Lien déplacé vers {nom} » (repli « Lien déplacé » si la catégorie est introuvable), 3s, sans `panelClass` (icône `check` du style 9.2).
- Budget de style (4 kB) : `links.component.scss` le dépassait de 248 octets ; pastille « Mode édition » déplacée dans `styles.scss` (même solution que le widget grille en 9.3). Avertissement du bundle initial (≈ 569 kB) préexistant.
- Icônes utilisées (`drag_indicator`, `image`) déjà présentes dans la police réduite.
- Texte rouge posé sur fond `--color-primary-soft` (bandeau « Sélectionnée », pastille « Mode édition ») en `--color-on-primary-soft`, et non en `--color-primary` comme l'écrit la spec : c'est le token créé pour l'arbitrage AA de Manu (texte sur fond rosé). Les tuiles et bordures restent en `--color-primary`.
- E2E `links-icon-picker` : sélecteur du champ de recherche mis à jour (`input[placeholder="Rechercher une icône"]`), l'ancien visait le placeholder « ex: home… ». Pastille renommée `.links-edit-mode-badge` (classe globale).
- Vérifications : 251 tests verts (25 nouveaux), `ng build` OK, Prettier OK, E2E Liens compilés (`--list` : 11 tests). Captures Chromium avec API simulée, sombre et clair : mode édition, drag en cours (fantôme incliné, carte Admin illuminée, placeholder pointillé), après drop (snackbar), dialog lien (erreurs, focus), dialog catégorie (avec et sans icône), sélecteur avec sélection, drag de catégorie dans la grille. Conformes à `03-edit`, `18`, `19`, `20`.
- Retour de Manu après test : roue crantée ⚙️ (9.3) décalée dans son bouton. Même correctif que la top bar en 9.2 : `display: inline-flex` + centrage sur `.grid-settings-btn`, appliqué aussi aux tuiles `.icon-btn` du sélecteur (même construction : 46px, `padding: 0`, bordure). Écart mesuré : 0px.
- Décision de Manu (2026-11-10, après test) : compteur de liens retiré de l'en-tête des cartes, en lecture comme en édition, malgré les maquettes `01`/`03` (`.category-count` et son texte masqué supprimés, test inversé). Le squelette de chargement garde sa pastille `.skeleton-badge` (structure des squelettes inchangée, A14).
- Lignes de la matrice purement CSS (fantôme, zone cible, placeholder, bordure d'erreur, animations réduites) : non testables sous jsdom, vérifiées par captures.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Preuve |
|---|---|---|---|
| E2E `links-icon-picker` : `input[placeholder*="home"]` ne trouve plus le champ (VG, BH, ECH) | high | patch | Réel, lignes 57, 112, 153. Sélecteur passé à `input[placeholder="Rechercher une icône"]`. |
| Test « après blur » sans vrai blur, `onUrlBlur`/OG non testés (BH) | low | patch | Réel. Le test déclenche un `blur` ; nouveau test : normalisation `https://` + `fetchOgPreview` appelé. |
| Repli « Lien déplacé » non testé (BH) | low | patch | Réel. Test ajouté (catégorie cible absente). |
| `prefers-reduced-motion` écrit de deux façons dans `link-category-card.component.scss`, transition d'édition sans commentaire (BH) | low | patch | Réel mais cosmétique. Règle imbriquée comme dans `link-item`, commentaire ajouté. |
| `.edit-mode-badge` global sans préfixe (BH) | low | patch | Aucun conflit aujourd'hui, mais la classe est globale. Renommée `.links-edit-mode-badge`. |
| Bandeau du sélecteur en `--color-on-primary-soft` au lieu de `--color-primary` (BH) | low | rejeté | Écart voulu : `--color-on-primary-soft` est le token AA de Manu pour le texte sur fond rosé ; noté dans Implementation Notes. |
| `role="status"` inséré déjà rempli, annonce non garantie (BH, ECH) | low | rejeté | Réel, mais le bouton de bascule porte `aria-pressed` et un `aria-label` qui changent : l'état est déjà annoncé. Une région live permanente ajouterait du balisage pour un gain marginal. |
| Carte source illuminée pendant le drag (ECH) | low | rejeté | Réel : la carte survolée s'illumine, y compris la source tant que le lien y reste (capture : la source s'éteint dès que le lien en sort). Conforme à « liste survolée » ; un suivi `Entered/Exited` ajouterait de l'état. |
| `:host { display: block }` de `link-item` change le mode lecture (BH) | false | rejeté | Capture du mode lecture (survol, tick, espacements) identique à `01-main`. |
| Suivi (sprint-status, spec) absent du diff (BH) | false | rejeté | Hors diff de code par construction ; statut géré par le workflow, fichiers à inclure au commit. |
| Test de grille ne prouve pas la réorganisation 2D (BH) | low | rejeté | `drop()` est indexé et déjà testé ; la règle CSS n'est pas testable sous jsdom ; réorganisation 2D vérifiée dans Chromium (`PATCH reorder` positions 0..2). |

## Design Notes

Le CDK pose `.cdk-drag-preview` sur le clone de l'élément `cdkDrag` (l'hôte `app-link-item` / `app-link-category-card`, rendu dans `body`) : les styles du fantôme passent par `:host(.cdk-drag-preview)` dans le composant (encapsulation émulée : l'attribut d'hôte est cloné avec l'élément).

```scss
:host(.cdk-drag-preview) .link-item-wrapper {
  transform: rotate(-3deg) scale(1.03);
  box-shadow: var(--drag-shadow);
}
:host(.cdk-drag-placeholder) .link-item-wrapper {
  border: 1px dashed var(--color-primary);
  background: var(--color-primary-soft);
  > * { visibility: hidden; }
}
```

## Verification

**Commands:**
- `cd frontend && npx ng build` -- expected: succès (avertissement de budget initial préexistant)
- `cd frontend && npx ng test --no-watch` -- expected: tests verts
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK
- `cd e2e && npx playwright test links --list` -- expected: compilation OK

**Manual checks (if no CLI):**
- Captures Chromium avec API simulée : édition (sombre, clair), drag en cours (fantôme, cible, placeholder), dialogs lien (vide, erreur), catégorie (sans et avec icône), sélecteur avec sélection ; comparer à `03-edit`, `18`, `19`, `20`.
