# Sprint Change Proposal — 2026-11-13 — Hauteur des liens paramétrable

**Auteur :** Manu (avec l'agent Développeur, workflow Correct Course)
**Mode :** incrémental — 4 propositions approuvées une à une
**Scope :** Mineur → implémentation directe par l'agent Développeur, hors epic
**Statut :** approuvé par Manu le 2026-11-13 ; modifications 4.1 à 4.4 appliquées aux artefacts

---

## Section 1 — Résumé du changement

### Problème identifié

En mode lecture, chaque ligne de lien d'une card mesure 46 px (padding vertical 10 px + tuile 26 px), soit un pas de 48 px avec l'écart de 2 px entre lignes. Dès qu'une catégorie contient plus de 4 ou 5 liens, les cards deviennent hautes et la grille s'étire verticalement : moins de catégories visibles sans défilement.

### Contexte de découverte

Retour d'usage après la sortie de la `v1.0.0` (fin de l'Epic 9, refonte Ember). Manu souhaite pouvoir compacter les cards en hauteur depuis le widget ⚙️ existant, à côté des réglages de colonnes, largeur et espacements.

### Evidence

- Capture d'écran de la page Liens (1226 px) : 8 catégories, cards de 3 à 7 liens ; la ligne des cards « Téléchargements / Admin » occupe à elle seule plus de 400 px.
- `link-item.component.scss` : `.link-item-wrapper:not(.edit-mode) { padding: 10px 8px; }`, tuile `.link-tile` 26 × 26 px, `.link-list { gap: 2px; }`.
- Aucun réglage de densité n'existe aujourd'hui dans `LinksGridSettingsService` (`{ columns, cardWidth, gapH, gapV }`).

---

## Section 2 — Analyse d'impact

### Impact Epic

| Epic | Impact |
|------|--------|
| Epic 4 — Module Liens | Story 4.8 amendée (5ᵉ contrôle), sans réouverture de l'epic |
| Epic 9 — Refonte Ember | Aucun (terminé, livré en `v1.0.0`) |
| Epic 8 — Notes natives | Aucun |
| Epic 10 — Mobile | Aucun : le réglage est ignoré sous 600 px |

### Impact Stories

| Story | Impact |
|-------|--------|
| 4.8 — Paramétrage de l'affichage des cards | Critères d'acceptation et scénarios E2E complétés (hauteur des liens) |
| Nouvelle story | Aucune : livraison par spec ponctuelle `spec-hauteur-liens.md` (précédent : `spec-admin-email.md`) |

### Conflits d'artefacts

| Artefact | Section | Mise à jour |
|----------|---------|-------------|
| `prd.md` | FR49 | Ajout de la hauteur des liens (et rattrapage de la largeur des cards, oubliée) |
| `epics.md` | FR Coverage Map, story 4.8 | Libellé FR49, 5ᵉ contrôle, variable CSS, clé localStorage, défauts, scénario E2E |
| `architecture.md` | Paramétrage de la grid Liens | Type du signal, défauts, rétrocompatibilité, `--link-row-height`, calcul du padding |
| `ux-design-Dashboard.md` | Grid Liens, UX-DR27 | 5ᵉ contrôle et variable CSS |

### Impact technique

- **Frontend uniquement** : `LinksGridSettingsService` (+ spec), `LinksComponent` (slider, méthode de mise à jour, `effect()` qui pose `--link-row-height`), `link-item.component.scss`, E2E grille.
- **Aucun backend, aucune migration** : le paramétrage reste en localStorage.
- **Rétrocompatibilité** : un objet `links-grid-settings` déjà enregistré sans `linkHeight` retombe sur 46 px grâce au `clamp` existant, champ par champ.
- **Rendu par défaut inchangé** (46 px) : aucune régression visuelle pour qui ne touche pas au réglage.

---

## Section 3 — Approche recommandée

**Ajustement direct**, hors epic, par une spec ponctuelle implémentée via `/bmad-build`.

- **Décisions arrêtées avec Manu :**
  - Contrôle : slider « Hauteur des liens », 32–46 px, pas de 2 px, défaut 46 px (rendu actuel).
  - Tuile fixe à 26 px, texte inchangé : seule la marge verticale varie. À 32 px, il reste 3 px de part et d'autre de la tuile.
  - Mode lecture uniquement : les lignes du mode édition gardent leurs 44 px (poignée de drag & drop, boutons).
  - Ignoré sous 600 px, comme les autres réglages de grille.
  - Livraison hors epic : l'Epic 9 est clos et livré en `v1.0.0`.
- **Effort :** environ 1 h, tests compris.
- **Risque :** faible (front seul, défaut identique à l'existant).
- **Impact planning :** aucun ; à traiter avant l'Epic 10.
- **Version :** commit `feat:` → `v1.1.0` au prochain merge sur `main`.

---

## Section 4 — Propositions de changement détaillées

### 4.1 — PRD : FR49

```
OLD:
- **FR49** : Un utilisateur peut configurer l'affichage du module Liens en mode lecture — nombre de colonnes (1–6) et espacement horizontal/vertical (8–48 px, pas de 4 px) — depuis un widget discret (icône ⚙️) visible uniquement sur viewport ≥ 600 px. Le paramétrage est persisté dans localStorage (par device, par navigateur).

NEW:
- **FR49** : Un utilisateur peut configurer l'affichage du module Liens en mode lecture — nombre de colonnes (1–6), largeur des cards (200–600 px), espacement horizontal/vertical (8–48 px, pas de 4 px) et hauteur des lignes de lien (32–46 px, pas de 2 px) — depuis un widget discret (icône ⚙️) visible uniquement sur viewport ≥ 600 px. Le paramétrage est persisté dans localStorage (par device, par navigateur).
```

Justification : nouveau paramètre ; la largeur des cards, existante depuis la story 4.8, manquait dans la FR.

### 4.2 — Epics : FR Coverage Map et story 4.8

FR Coverage Map :

```
OLD: | FR49 | Épic 4 | Paramétrage d'affichage des cards Liens (colonnes, largeur, espacement) |
NEW: | FR49 | Épic 4 | Paramétrage d'affichage des cards Liens (colonnes, largeur, espacement, hauteur des liens) |
```

Story 4.8, critères d'acceptation :

```
OLD:
**Alors** il affiche quatre contrôles :
- ...
- Espacement vertical : slider, valeurs 8–48 px (pas 4 px), défaut 16 px

NEW:
**Alors** il affiche cinq contrôles :
- ...
- Espacement vertical : slider, valeurs 8–48 px (pas 4 px), défaut 16 px
- Hauteur des liens : slider, valeurs 32–46 px (pas 2 px), défaut 46 px — ajouté le 2026-11-13 hors epic (`spec-hauteur-liens.md`, Sprint Change Proposal 2026-11-13)
```

```
OLD: CSS custom properties `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`
NEW: CSS custom properties `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`, `--link-row-height`
     (la hauteur ne s'applique qu'aux lignes en mode lecture ; la tuile reste à 26 px, seule la marge verticale varie)

OLD: clé `links-grid-settings : { columns, cardWidth, gapH, gapV }`
NEW: clé `links-grid-settings : { columns, cardWidth, gapH, gapV, linkHeight }` (valeur absente ou hors bornes → défaut)

OLD: les valeurs par défaut s'appliquent (3 colonnes, 280 px, 16 px H, 16 px V)
NEW: les valeurs par défaut s'appliquent (3 colonnes, 280 px, 16 px H, 16 px V, liens 46 px)
```

Scénarios E2E, ajout :

```
- Régler « Hauteur des liens » sur 32 px → vérifier que les lignes de lien mesurent 32 px, recharger → valeur restaurée
```

### 4.3 — Architecture : Paramétrage de la grid Liens

```
OLD:
- Service `LinksGridSettingsService` (injectable root) — Signal `gridSettings` de type `{ columns: number; cardWidth: number; gapH: number; gapV: number }`
- Valeurs par défaut : `{ columns: 3, cardWidth: 280, gapH: 16, gapV: 16 }`

NEW:
- Service `LinksGridSettingsService` (injectable root) — Signal `gridSettings` de type `{ columns: number; cardWidth: number; gapH: number; gapV: number; linkHeight: number }`
- Valeurs par défaut : `{ columns: 3, cardWidth: 280, gapH: 16, gapV: 16, linkHeight: 46 }`
- Rétrocompatibilité : un objet localStorage sans `linkHeight` (ou hors bornes 32–46) retombe sur le défaut, champ par champ (`clamp`)
```

```
OLD:
  `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`

NEW:
  `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`, `--link-row-height`
- Ligne de lien en mode lecture (`LinkItemComponent`) : hauteur pilotée par `--link-row-height` (repli 46px), padding vertical = `calc((var(--link-row-height, 46px) - 26px) / 2)`, tuile 26 px fixe. Le mode édition (44 px min) n'est pas concerné.
- Sous 600 px, `--link-row-height` n'est pas appliquée (repli 46px), comme les autres propriétés de paramétrage.
```

```
OLD: - Contrôles : `MatSlider` (cardWidth, gapH, gapV) + stepper custom ou `MatInput` type number (columns)
NEW: - Contrôles : `MatSlider` (cardWidth, gapH, gapV, linkHeight) + stepper custom ou `MatInput` type number (columns)
```

Justification : la variable CSS posée sur l'hôte de `LinksComponent` se propage aux `link-item` par héritage, sans nouvel input de composant ; le calcul du padding garde la tuile centrée.

### 4.4 — UX Design : Grid Liens et UX-DR27

```
OLD:
Au clic, un `MatMenu` s'ouvre avec quatre contrôles :
- ...
- **Espacement vertical** : `MatSlider`, 8–48 px (pas 4 px), défaut 16 px

NEW:
Au clic, un `MatMenu` s'ouvre avec cinq contrôles :
- ...
- **Espacement vertical** : `MatSlider`, 8–48 px (pas 4 px), défaut 16 px
- **Hauteur des liens** : `MatSlider`, 32–46 px (pas 2 px), défaut 46 px — compacte les lignes de lien des cards en mode lecture (seule la marge verticale varie, tuile 26 px et texte inchangés). Ajouté le 2026-11-13 (Sprint Change Proposal 2026-11-13).
```

```
OLD: ... (`--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`), 1 colonne forcée sous 600 px
NEW: ... (`--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`), hauteur des lignes de lien par `--link-row-height`, 1 colonne forcée sous 600 px
```

Note visuelle : la maquette `04-grid-settings` montre quatre réglages ; le cinquième se place en dernier, avec exactement le style des sliders d'espacement (libellé, valeur en px, slider). Aucun style inventé.

---

## Section 5 — Plan de handoff

**Classification :** Mineur → agent Développeur (Amelia), implémentation directe.

**Étapes :**

1. ~~Appliquer les modifications documentaires 4.1 à 4.4~~ — fait le 2026-11-13.
2. `/bmad-build` « spec hauteur des liens » depuis un contexte propre, sur la branche `feat/hauteur-liens` (déjà créée depuis `origin/develop`, porte aussi les modifications documentaires). Le skill génère `implementation-artifacts/spec-hauteur-liens.md`. Pas d'entrée dans `sprint-status.yaml` (changement hors epic).
3. Implémentation :
   - `links-grid-settings.service.ts` : champ `linkHeight` (défaut 46, `clamp` 32–46) + tests unitaires (défaut, valeur restaurée, objet ancien sans le champ, valeur hors bornes).
   - `links.component.ts` / `.html` : méthode `updateLinkHeight()`, 5ᵉ `setting-row` avec `mat-slider` 32–46 pas 2 (`aria-label="Hauteur des liens"`), `--link-row-height` posée dans l'`effect()` existant (non posée sous 600 px).
   - `link-item.component.scss` : padding vertical de la ligne en lecture calculé depuis `--link-row-height` ; mode édition inchangé.
   - E2E grille : scénario 32 px + rechargement.
4. Prettier frontend (`npm run prettier:write` puis `prettier:check`), `npx ng test --no-watch`, `npx ng build`.
5. PR vers `develop`, titre proposé : `feat: hauteur des liens paramétrable dans les cards`.

**Critères de succès :**

- Le panneau ⚙️ affiche un 5ᵉ slider « Hauteur des liens » (32–46 px, pas 2, valeur affichée en px), au style identique aux sliders d'espacement.
- À 32 px, chaque ligne de lien en mode lecture mesure 32 px, tuile 26 px centrée, tick d'accent et survol intacts.
- Le réglage est restauré après rechargement ; un localStorage antérieur sans `linkHeight` donne 46 px.
- Mode édition et viewport < 600 px : rendu inchangé.
- Tests unitaires, build, Prettier et E2E au vert ; audit Axe sans nouvelle violation.
