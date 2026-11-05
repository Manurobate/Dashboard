# Sprint Change Proposal — 2026-05-20

**Projet :** Dashboard
**Date :** 2026-05-20
**Scope :** Mineur → Implémentation directe par l'agent Développeur

---

## Section 1 — Résumé du changement

### Problème identifié

Lors de la review de la story 4.5 (composants `LinkCategoryCard` et `LinkItem`), il est apparu que le drag & drop des liens ne permet pas de changer de catégorie. Un lien peut être réorganisé *au sein de* sa catégorie (FR20), mais pas *déplacé vers* une autre catégorie.

### Contexte de découverte

Le FR20 original spécifiait explicitement `"au sein d'une catégorie"`. Ce périmètre était intentionnel au moment de la rédaction, mais l'usage réel révèle que l'absence de cross-catégorie crée une friction : pour déplacer un lien de "Multimédia" vers "Dev", l'utilisateur doit supprimer puis recréer le lien.

### Evidence

- FR20 actuel : `"Un utilisateur peut réorganiser ses liens au sein d'une catégorie par drag & drop"`
- L'implémentation story 4.5 utilise des `cdkDropList` isolés par card — aucune connexion inter-listes
- Le `dropLink()` actuel n'utilise que `moveItemInArray` (intra-liste uniquement)

---

## Section 2 — Analyse d'impact

### Impact Epic

| Epic | Impact |
|------|--------|
| Epic 4 — Module Liens | Ajout d'une story 4.7 en fin d'épic |
| Epics 5, 6, 7 | Aucun impact |

### Impact Stories

| Story | Impact |
|-------|--------|
| 4.5 — LinkCategoryCard + LinkItem | Story existante non modifiée — la story 4.7 s'appuie dessus |
| 4.6 — Vue par défaut + thème | Non impactée, peut avancer en parallèle |
| **4.7 — NEW** | Nouvelle story : déplacement inter-catégories par D&D |

### Conflits d'artefacts

| Artefact | Type | Changement |
|----------|------|------------|
| PRD | Ajout | FR20b — nouveau functional requirement |
| Epics | Ajout | Story 4.7 + mise à jour FR Coverage Map + Epic 4 FRs |
| Architecture | Modification | Pattern CDK cross-list + PATCH /api/links/:id étendu |
| UX Design | Ajout | UX-DR26 — feedback visuel drop inter-catégories |
| sprint-status.yaml | Ajout | Entrée `4-7-deplacement-inter-categories-drag-drop` |

### Impact technique

- **Frontend** : `cdkDropListGroup` sur `LinksComponent` + `transferArrayItem` dans `LinkCategoryCard.dropLink()` + nouveau `@Output() moveLink`
- **Backend** : `UpdateLinkDto` accepte `categoryId?: number` + vérification appartenance utilisateur (guard existant suffisant)
- **Pas de nouvelle migration** : `categoryId` est déjà une FK sur l'entité `Link`

---

## Section 3 — Approche recommandée

**Option retenue : Direct Adjustment (Option 1)**

Ajout d'une story 4.7 dans l'Epic 4 existante, sans rollback ni révision du MVP.

**Justification :**
- Effort faible côté backend (un champ optionnel dans un DTO existant)
- Effort moyen côté frontend (CDK cross-list bien documenté, mais nécessite attention sur `MatExpansionPanel` + panels repliés)
- Aucune régression sur les stories existantes
- La story 4.7 peut être créée immédiatement après que 4.5 passe en `done` et 4.6 est terminée

**Estimation effort :** Moyen  
**Risque :** Moyen (interaction CDK nested + `MatExpansionPanel` à tester)  
**Impact calendrier :** 1 story supplémentaire en fin d'Epic 4

---

## Section 4 — Propositions de changement détaillées

### 4.1 — PRD : Ajout FR20b

**Fichier :** `_bmad-output/planning-artifacts/prd.md`

```
AJOUT après FR20 :

FR20b : Un utilisateur peut déplacer un lien d'une catégorie vers une autre 
        par drag & drop
```

### 4.2 — Epics : FR Coverage Map + Story 4.7 + Epic 4 FRs

**Fichier :** `_bmad-output/planning-artifacts/epics.md`

```
AJOUT dans FR Coverage Map (après ligne FR20) :
| FR20b | Épic 4 | Déplacer un lien vers une autre catégorie par D&D |

MODIFICATION Epic 4 FRs couverts :
Ajouter FR20b à la liste

AJOUT Story 4.7 après Story 4.6 :
--- voir texte complet ci-dessous ---
```

**Texte Story 4.7 :**

```markdown
### Story 4.7 : Déplacement d'un lien entre catégories par drag & drop

En tant qu'utilisateur authentifié,
Je veux déplacer un lien d'une catégorie vers une autre par drag & drop,
Afin de réorganiser mes liens sans avoir à le supprimer et le recréer.

**Critères d'acceptation :**

**Étant donné** que je suis en mode édition et que je glisse un lien 
hors de sa catégorie,
**Quand** je le lâche sur une autre catégorie (dépliée ou repliée),
**Alors** le lien apparaît immédiatement dans la catégorie cible (optimistic 
update) et `PATCH /api/links/:id` est appelé avec le nouveau `categoryId`

**Étant donné** que je glisse un lien vers une catégorie cible,
**Quand** je survole la zone de drop,
**Alors** la zone est visuellement surlignée (classe `.cdk-drop-list-receiving`)

**Étant donné** que le `PATCH /api/links/:id` échoue,
**Quand** l'erreur réseau est reçue,
**Alors** le lien revient dans sa catégorie d'origine et une snackbar 
"Erreur lors du déplacement" s'affiche 3s

**Étant donné** que je suis en mode lecture,
**Quand** j'essaie de glisser un lien,
**Alors** le drag est désactivé (`[cdkDragDisabled]="!editMode"`)
```

### 4.3 — Architecture : CDK cross-list + PATCH étendu

**Fichier :** `_bmad-output/planning-artifacts/architecture.md`

```
AJOUT dans section API Links :
  PATCH /api/links/:id accepte désormais { categoryId?: number } 
  dans UpdateLinkDto (champ optionnel — compatibilité ascendante)
  Contrainte : vérification que la catégorie cible appartient à l'utilisateur 
  courant (guard userId existant)

AJOUT dans section Drag & Drop / Module Liens :
  Pattern cross-catégorie (story 4.7) :
  - cdkDropListGroup sur le conteneur parent LinksComponent
  - Les cdkDropList de chaque LinkCategoryCard sont connectés automatiquement
  - dropLink() : si event.previousContainer !== event.container, 
    utiliser transferArrayItem et émettre @Output() moveLink
  - LinksComponent appelle linksService.updateLink(id, { categoryId }) 
    puis met à jour le signal (optimistic update)
  - Contrainte : catégories repliées doivent rester cibles valides 
    (cdkDropListSortingDisabled sur listes vides si besoin)
```

### 4.4 — UX Design : UX-DR26

**Fichier :** `_bmad-output/planning-artifacts/ux-design-Dashboard.md`

```
AJOUT UX-DR26 :
"Drag & drop inter-catégories sur le module Liens — lorsqu'un lien est 
glissé depuis une catégorie vers une autre, un indicateur visuel 
(zone de drop surlignée via .cdk-drop-list-receiving) signale les 
catégories cibles éligibles. Le lien apparaît immédiatement dans sa 
nouvelle catégorie (optimistic update) avec snackbar 'Lien déplacé'."
```

---

## Section 5 — Plan de handoff

**Scope : Mineur** → Implémentation directe par l'agent Développeur

| Rôle | Responsabilité |
|------|---------------|
| **Agent Développeur** | Créer la story 4.7, implémenter frontend + backend |
| **Manu (review)** | Valider le comportement visuel du drop inter-catégories |

**Critères de succès :**
- Un lien peut être glissé d'une catégorie vers une autre en mode édition
- L'optimistic update est immédiat, le rollback fonctionne en cas d'erreur réseau
- Les catégories repliées acceptent le drop
- Le mode lecture désactive le drag (comportement identique à l'existant)
- Tests unitaires mis à jour (`LinkCategoryCard`) + scénario E2E Playwright ajouté

**Prochaines étapes :**
1. Appliquer les modifications aux artefacts (PRD, Epics, Architecture, UX, sprint-status.yaml)
2. Terminer story 4.5 (passer en `done`)
3. Implémenter story 4.6 (thème + état vide)
4. Créer et implémenter story 4.7 via `/bmad-dev-story`

---

*Généré par Correct Course — 2026-05-20*
