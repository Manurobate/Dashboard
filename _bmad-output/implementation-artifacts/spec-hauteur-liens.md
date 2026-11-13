---
title: 'Hauteur des liens paramétrable dans les cards (mode lecture)'
type: 'feature'
created: '2026-11-13'
status: 'done'
route: 'oneshot'
context:
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-13.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En mode lecture, chaque ligne de lien mesure 46 px (padding vertical 10 px + tuile 26 px). Dès qu'une catégorie dépasse 4 ou 5 liens, les cards s'allongent et la grille Liens montre moins de catégories sans défilement. Aucun réglage de densité n'existe dans le widget ⚙️.

**Approach:** Ajouter un 5ᵉ réglage « Hauteur des liens » au widget ⚙️ : `MatSlider` 32–46 px, pas de 2 px, défaut 32 px (décision de Manu du 2026-11-13, après validation : le SCP prévoyait 46 px, soit le rendu d'avant), placé en dernier avec exactement le style des sliders d'espacement. Le réglage est persisté dans `links-grid-settings` (champ `linkHeight`, `clamp` 32–46 champ par champ, donc un objet ancien sans le champ retombe sur 32). Il est exposé par la variable CSS `--link-row-height`, posée sur l'hôte de `LinksComponent` dans l'`effect()` existant. Seule la marge verticale de la ligne varie : padding vertical = `calc((var(--link-row-height, 32px) - 26px) / 2)`, tuile 26 px et texte inchangés. Le réglage s'applique au mode lecture uniquement : les lignes du mode édition gardent leurs 44 px min. Il est ignoré sous 600 px (repli 46 px), comme les autres réglages de grille. Hors epic : pas d'entrée dans `sprint-status.yaml`. Tests unitaires du service (défaut, valeur restaurée, objet ancien sans le champ, hors bornes) et scénario E2E (32 px par défaut, réglage à 46 px, rechargement, valeur restaurée).

</frozen-after-approval>

## Implementation Notes

Fichiers visés :
- `frontend/src/app/links/links-grid-settings.service.ts` (+ `.spec.ts`) : `linkHeight` dans `GridSettings`/`DEFAULTS`, `clamp(parsed.linkHeight, 32, 46, 46)`. Mettre à jour les `toEqual` existants.
- `frontend/src/app/links/links.component.ts` : `updateLinkHeight()`, `setProperty('--link-row-height', …px)` dans l'`effect()`.
- `frontend/src/app/links/links.component.html` : 5ᵉ `setting-row` après « Espacement vertical », `aria-label="Hauteur des liens"`.
- `frontend/src/app/links/components/link-item/link-item.component.scss` : dans `.link-item-wrapper:not(.edit-mode)`, padding vertical calculé sous `@media (min-width: 600px)`. En dessous, les 10 px actuels sont conservés.
- `e2e/tests/links-grid-settings.spec.ts` : réglage à 32 px via le clavier (focus sur le thumb puis `Home`), hauteur de `.link-item-wrapper` = 32, rechargement, valeur restaurée.

Réalisé :
- Service : `linkHeight` ajouté à `GridSettings`/`DEFAULTS` et au `clamp`. Tests : défaut, restauration (34 px), objet ancien sans le champ → 46, bornes (10 → 32, 80 → 46, `'40'` → 46).
- `LinksComponent` : `updateLinkHeight()`, `--link-row-height` dans l'`effect()`. Tests composant : appel à `updateSettings` et variable posée sur l'hôte. Mocks `GridSettings` complétés avec `linkHeight`.
- Template : 5ᵉ `setting-row`, copie conforme des sliders d'espacement.
- SCSS : `padding-block: calc((var(--link-row-height, 46px) - 26px) / 2)` sous `@media (min-width: 600px)`, dans `.link-item-wrapper:not(.edit-mode)`.
- E2E : scénario 46 → 32 px (touche `Home` sur le thumb), contrôle du localStorage, hauteur mesurée, rechargement. Il s'appuie sur des liens existants, comme `links-drag-drop.spec.ts`.
- `ng test` : 365/365. `prettier:check` et `ng build` OK. L'avertissement de budget du bundle initial est antérieur à ce changement. E2E compilé (`--list`), non exécuté localement (pas de Docker sur la machine).

Écart documentaire relevé : l'architecture et l'epic disent « hors bornes → défaut », alors que le `clamp` existant (que l'Intent demande de réutiliser) ramène à la borne la plus proche. J'ai gardé le comportement du `clamp`, cohérent avec les autres champs. Seules les valeurs absentes ou non numériques donnent le défaut.

Décision : sous 600 px, la variable est toujours posée (comme `--link-columns` et les autres), mais elle n'est consommée que dans la media query `min-width: 600px`. Cela reproduit le mécanisme existant de la grille et évite de lier l'`effect()` à `isSmallScreen`.

Correctifs issus de la revue :
- `.grid-settings-panel` : `stopPropagation` sur `keydown` Home/End/↑/↓. Le gestionnaire clavier du `mat-menu` (`FocusKeyManager.withHomeAndEnd()`) appelait `preventDefault` sur ces touches, ce qui bloquait les 5 sliders au clavier.
- E2E : ligne du panneau ciblée par son libellé, `expect.poll` sur la hauteur initiale, panneau rouvert après le rechargement pour vérifier « 32 px », et nouveau scénario « sans effet en mode édition et sous 600 px ».

Ajout demandé par Manu après validation : le vide sous le dernier lien des cards venait de `.link-list { min-height: 80px }` (`link-category-card.component.scss`), appliqué aussi en mode lecture. Ce minimum date de la première version des cards et ne figure dans aucune spec : en lecture, la carte épouse désormais ses liens, et le mode édition garde ses 104 px de zone de dépôt. Une catégorie vide n'affiche plus que son en-tête en lecture.

Défaut porté de 46 à 32 px à la demande de Manu (2026-11-13), répercuté dans `DEFAULTS`, dans le repli du `calc` SCSS, dans les tests (défaut, objet ancien, valeur non numérique → 32) et dans l'E2E (32 par défaut, `End` → 46, rechargement). Les documents de planification ont suivi : `epics.md` (story 4.8), `architecture.md` et `ux-design-Dashboard.md` (UX-DR27). Conséquence : les utilisateurs existants passent eux aussi à 32 px, puisque leur localStorage n'a pas de `linkHeight`. Sous 600 px, rien ne change (46 px).

## Review Triage Log

- Touche Home annulée par le mat-menu : **medium**, confirmé dans `menu.mjs` (`_handleKeydown` → `manager.onKeydown`) et `_list-key-manager-chunk.mjs` (cas `HOME`/`END`, puis `preventDefault`). Corrigé (patch).
- Contradiction entre le SCP (« non posée sous 600 px ») et la spec : **low**, rejeté. L'architecture (« n'est pas appliquée, repli 46px ») correspond à l'implémentation, et le SCP est un document historique.
- Mode édition et < 600 px non testés : **medium**. Corrigé par un nouveau scénario E2E.
- `clamp` sans arrondi au pas : **low**, rejeté. Le comportement est antérieur et commun à tous les champs, et il n'apparaît qu'après une édition manuelle du localStorage.
- Constantes 26/46 dupliquées : **low**, rejeté. La formule est documentée dans l'architecture, et le risque n'existe que si la tuile change.
- Titre plus haut que 26 px (police minimale imposée) : **low**, rejeté. Le cas est rare, et un zoom met tout à l'échelle de façon homogène.
- Focus et survol serrés à 32 px : **false**. Les 3 px de marge résultent d'une décision explicite du SCP.
- E2E : `.last()` fragile, assertion initiale sans poll, valeur non revérifiée après rechargement : **low**. Corrigé (simple). La dépendance à des liens existants est rejetée : même précédent que `links-drag-drop.spec.ts`.
- Pas de test de template du slider : **low**, rejeté. L'E2E le couvre, et un test dans l'overlay du menu coûterait cher.
- Statut de spec resté `in-progress` : **false**, il est passé à `done` lors de la finalisation.
