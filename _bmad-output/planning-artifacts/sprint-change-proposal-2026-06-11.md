# Sprint Change Proposal — 2026-06-11

**Projet :** Dashboard  
**Date :** 2026-06-11  
**Scope :** Modéré  
**Statut :** Approuvé  

---

## Section 1 — Résumé du changement

### Problème identifié

Après complétion de l'Épic 5 (Module Recettes), un besoin fonctionnel complémentaire a été identifié : certaines recettes nécessitent un espace de texte libre introductif (ex. : "pour une mayonnaise, préférer des ingrédients à température ambiante") qui n'est pas une étape à part entière mais une information contextuelle générale.

Parallèlement, l'implémentation de la toolbar `MarkdownLightEditor` présente deux défauts par rapport au design prévu :
- Le bouton **Code** (`` ` ``) est présent mais jugé inutile pour les étapes de recettes
- Le bouton **Souligné** (`__`) est absent alors qu'il était prévu dans FR23 et UX-DR10

### Type de changement

Nouveau besoin fonctionnel identifié après complétion d'un épic — ajustement direct dans l'épic existant.

### Exemples concrets

- Recette Mayonnaise : "Tous les ingrédients doivent être à température ambiante pour éviter que la mayonnaise ne tourne."
- Recette Pain maison : "Cette recette demande de la patience — prévoir 3h en tout avec les temps de pousse."

---

## Section 2 — Analyse d'impact

### Impact épics

| Épic | Impact | Action |
|------|--------|--------|
| **Épic 5** (Module Recettes) — `in-progress` | Direct | Ajout story **5.7** — réouvre l'épic jusqu'à sa complétion |
| **Épic 6** (Partage public) — `backlog` | Indirect | Story 6.3 (vue publique recette) doit afficher `avantPropos` si présent — nota bene ajouté dans epics.md |
| Épic 7 et suivants | Aucun | — |

### Impact artefacts

| Artefact | Impact | Modification |
|----------|--------|-------------|
| `prd.md` | FR23 + UX-DR10 | Ajout `avantPropos` optionnel dans FR23 ; toolbar mise à jour dans UX-DR10 |
| `epics.md` | UX-DR10 + story 6.3 | Toolbar corrigée ; nota bene vue publique |
| `ux-design-Dashboard.md` | MarkdownLightEditor anatomy | Suppression `code inline`, ajout `souligné` |
| `architecture.md` | Couverture Recettes | Mention du champ `avantPropos` dans la couverture FR23-28 |
| `sprint-status.yaml` | Épic 5 | Story 5.7 ajoutée (`ready-for-dev`) |

### Impact technique

| Couche | Fichier(s) | Changement |
|--------|-----------|-----------|
| Backend entité | `recipe.entity.ts` | Nouveau champ `avantPropos TEXT NULL` |
| Backend migration | `migrations/` | Nouvelle migration TypeORM (alter table) |
| Backend DTO | `create-recipe.dto.ts` | Champ `avantPropos` optionnel |
| Backend service | `recipes.service.ts` | `create` + `update` : gestion du champ |
| Frontend service | `recipes.service.ts` | Interfaces `Recipe`, `CreateRecipePayload`, `UpdateRecipePayload` |
| Frontend composant | `markdown-light-editor.component.html` | Bouton code → bouton souligné |
| Frontend pipe | `markdown-light.pipe.ts` | Ajout règle `__text__` → `<u>text</u>` |
| Frontend formulaire | `recipe-editor.component.ts/.html` | FormControl `avantPropos` + section dans le template |
| Frontend détail | `recipe-detail.component.html` | Bloc conditionnel `@if (avantPropos)` |

---

## Section 3 — Approche recommandée

**Option retenue : Ajustement direct (Option 1)**

Ajout d'une story 5.7 dans l'Épic 5 existant. Tout le changement est contenu dans le module Recettes (backend + frontend). La migration TypeORM est un pattern maîtrisé dans le projet (story 5.1). Aucune autre couche architecturale n'est affectée.

- **Effort :** Faible (une story, ~1 journée de dev)
- **Risque :** Faible (pattern déjà maîtrisé, changement isolé)
- **Timeline :** Aucun impact sur les épics suivants (Épic 6 en backlog)

---

## Section 4 — Propositions de modification détaillées

### 4.1 — PRD (prd.md)

**FR23 :**
```
AVANT : Un utilisateur peut créer une recette (titre, ingrédients structurés, étapes avec
mise en forme textuelle basique — gras, italique, souligné — catégorie)

APRÈS : Un utilisateur peut créer une recette (titre, avant-propos optionnel avec mise en
forme basique, ingrédients structurés, étapes avec mise en forme textuelle basique —
gras, italique, souligné — catégorie)
```

**UX-DR10 :**
```
AVANT : Composant custom `MarkdownLightEditor` — `textarea` avec toolbar minimale
(gras, italique, souligné, code inline) pour les étapes de recettes

APRÈS : Composant custom `MarkdownLightEditor` — `textarea` avec toolbar minimale
(gras, italique, souligné) pour les étapes de recettes et le champ avant-propos —
le bouton code inline est supprimé (non pertinent pour ce contexte)
```

### 4.2 — Architecture (architecture.md)

Couverture FR23-28 :
```
AVANT : ✅ `recipes/` + `recipe-step` entity + TipTap wrapper
APRÈS : ✅ `recipes/` + `recipe-step` entity + champ `avantPropos TEXT NULL` (migration 5.7)
```

### 4.3 — Story 5.7 (nouveau fichier)

Voir `_bmad-output/implementation-artifacts/5-7-avant-propos-recette-et-toolbar-markdown.md`

### 4.4 — Sprint status

Ajout dans l'Épic 5 :
```yaml
5-7-avant-propos-recette-et-toolbar-markdown: ready-for-dev
```

### 4.5 — Epics.md — Story 6.3

Ajout nota bene dans la description de la story 6.3 :
```
Note : la vue publique doit afficher le champ `avantPropos` si présent, selon le même
pattern conditionnel que la vue détail authentifiée (story 5.7).
```

---

## Section 5 — Plan de handoff

**Classification :** Modéré

**Handoff :** Developer agent

**Livrables pour le dev agent :**
1. Fichier story 5.7 avec tâches détaillées et dev notes
2. Artefacts de planification mis à jour

**Critères de succès :**
- Migration TypeORM générée et exécutable sans erreur
- Champ `avantPropos` sauvegardé et récupéré correctement via l'API
- Toolbar affiche exactement 3 boutons : Gras / Italique / Souligné
- Syntaxe `__texte__` rendue en `<u>texte</u>` dans la vue détail
- Vue détail n'affiche pas la section avant-propos si le champ est null/vide
- En édition, un avant-propos existant est pré-rempli dans le formulaire
- Aucune régression sur les tests existants

---

*Approuvé par Manu — 2026-06-11*
