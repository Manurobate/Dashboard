# Sprint Change Proposal — Sélecteur d'icônes Material pour les catégories

**Date :** 2026-05-20
**Projet :** Dashboard
**Auteur :** Correct Course workflow (bmad)
**Scope :** Mineur — implémentation directe par l'agent Dev
**Epic concernée :** Epic 4 — Module Liens

---

## Section 1 : Résumé du problème

### Problème

Lors de la création ou modification d'une catégorie de liens, le champ "emoji" est un simple champ texte libre (MaxLength 10, placeholder "ex: 📌"). Pour associer une icône à une catégorie, l'utilisateur doit :
1. Quitter l'application
2. Trouver un emoji ou une icône sur un site externe (emojipedia, etc.)
3. Copier-coller le caractère dans le formulaire

Cette friction est incompatible avec l'objectif de minimalisme d'usage du Dashboard.

### Solution souhaitée

Remplacer le champ texte emoji par un **moteur de recherche d'icônes Material intégré** : un sélecteur dans lequel l'utilisateur peut taper un terme (ex: "home", "link", "calendar") et sélectionner une icône directement dans l'application.

### Contexte de découverte

Retour d'usage post-implémentation de l'Epic 4 (toutes les stories 4.1 → 4.8 complétées). Changement de finition identifié avant le passage à l'Epic 5 (Module Recettes).

---

## Section 2 : Analyse d'impact

### Impact Epic

| Epic | Impact |
|------|--------|
| Epic 4 — Module Liens | Ajout d'une Story 4.9. Epic repasse `in-progress`. |
| Epic 5, 6, 7 | Aucun impact |

### Impact Stories existantes

| Story | Impact |
|-------|--------|
| 4.2 — CRUD catégories | AC1/AC2 mis à jour : "emoji" → "icône Material via sélecteur" |
| 4.5 — LinkCategoryCard | AC mis à jour : affichage emoji → `<mat-icon>` avec fallback `folder_open` |
| 4.1 — Entités + migrations | Impact indirect : migration supplémentaire nécessaire (`emoji varchar(10)` → `icon varchar(50)`) |

### Impact artefacts

| Artefact | Section | Changement |
|----------|---------|------------|
| PRD | FR13 | "emoji optionnel" → "icône Material optionnelle" |
| Epics | FR13, UX-DR5, Story 4.2 AC1/AC2, Story 4.5 AC | Mises à jour textuelles + ajout Story 4.9 |
| sprint-status.yaml | Epic 4 | `done` → `in-progress` + entrée `4-9` ajoutée |
| Architecture | Aucune | Le renommage de colonne est une migration standard, pas d'impact architectural |
| UX Design | Aucune | Les spécifications UX sont capturées dans UX-DR5 (déjà mis à jour dans epics.md) |

### Impact technique

| Composant | Nature | Effort |
|-----------|--------|--------|
| Migration TypeORM | Renommer `emoji varchar(10)` → `icon varchar(50)` | Faible |
| Backend DTO/Entity | Renommer champ `emoji` → `icon`, ajuster MaxLength | Faible |
| Frontend CategoryDialogComponent | Remplacer champ texte par bouton + sélecteur | Moyen |
| Frontend MaterialIconPickerComponent | Nouveau composant standalone avec recherche | Moyen |
| Frontend LinkCategoryCard | Remplacer affichage emoji par `<mat-icon>` + fallback | Faible |
| Assets | Ajouter `material-icons.json` (subset ~500 icônes) | Faible |

---

## Section 3 : Approche recommandée

**Option retenue : Ajustement direct (Option 1)**

Ajout d'une Story 4.9 dans l'Epic 4 sans rollback ni révision de scope MVP. Rationale :

- ✅ Les stories 4.1–4.8 restent intactes et en `done`
- ✅ Pas de régression fonctionnelle sur les stories existantes
- ✅ L'impact est bien délimité (un seul composant dialog + affichage card)
- ✅ La migration est simple (rename + resize colonne)
- ✅ Pas d'impact sur les Épics 5, 6, 7

**Effort estimé :** Moyen (1 session de dev)
**Risque :** Faible
**Impact timeline :** Léger décalage du démarrage d'Epic 5 (une story supplémentaire)

---

## Section 4 : Propositions de changements détaillées

### 4.1 — PRD

**Fichier :** `_bmad-output/planning-artifacts/prd.md`

```
FR13 ANCIEN : Un utilisateur peut créer une catégorie de liens (nom, emoji optionnel)
FR13 NOUVEAU : Un utilisateur peut créer une catégorie de liens (nom, icône Material optionnelle)
```
✅ Appliqué

---

### 4.2 — Epics (FR13 + UX-DR5)

**Fichier :** `_bmad-output/planning-artifacts/epics.md`

```
UX-DR5 ANCIEN : header avec emoji + nom catégorie + badge compteur
UX-DR5 NOUVEAU : header avec icône Material (<mat-icon>, fallback folder_open si non définie)
               + nom catégorie + badge compteur
```
✅ Appliqué

---

### 4.3 — Story 4.2 (critères d'acceptation)

```
AC1 ANCIEN : saisis un nom (et optionnellement un emoji)
AC1 NOUVEAU : saisis un nom (et optionnellement sélectionne une icône Material
              via le sélecteur intégré)

AC2 ANCIEN : modifie son nom ou emoji
AC2 NOUVEAU : modifie son nom ou son icône Material
```
✅ Appliqué

---

### 4.4 — Story 4.5 (critères d'acceptation)

```
AC ANCIEN : chaque LinkCategoryCard affiche : emoji + nom de la catégorie + badge
AC NOUVEAU : chaque LinkCategoryCard affiche : icône Material (<mat-icon>,
             fallback folder_open si non définie) + nom de la catégorie + badge
```
✅ Appliqué

---

### 4.5 — Nouvelle Story 4.9

**Ajoutée dans epics.md après Story 4.8, avant Epic 5.**

Contenu complet : voir `epics.md#Story 4.9 — Sélecteur d'icônes Material pour les catégories`

Points techniques clés pour l'agent Dev :
- **Liste d'icônes** : fichier JSON statique bundlé en assets (`src/assets/material-icons.json`) — subset curé ~500 icônes Material les plus utiles, structure `[{ name: "home", label: "Accueil" }, ...]`
- **Nouveau composant** : `MaterialIconPickerComponent` standalone, réutilisable, dans `frontend/src/app/shared/components/material-icon-picker/`
- **Renommage** : champ `emoji` → `icon` dans l'entité TypeORM, DTOs backend, service Angular, interface TypeScript
- **Migration** : `ALTER TABLE link_category CHANGE emoji icon varchar(50) NULL` (ou équivalent TypeORM)
- **Rétro-compatibilité** : les catégories avec anciens emojis conservent leur valeur — affichage en `<mat-icon>` dégradé acceptable (la valeur ne sera pas un nom d'icône valide → Material affichera le nom brut ou rien)
- **Backend** : accepte `icon: null` pour effacement (pattern déjà validé en review 4.2)
- **Filtrage** : debounce 150ms sur le champ de recherche, filtrage côté client sur `name` et `label`

✅ Ajoutée

---

### 4.6 — sprint-status.yaml

```yaml
ANCIEN : epic-4: done
          (pas d'entrée 4-9)

NOUVEAU : epic-4: in-progress
          4-9-selecteur-icones-material-categories: backlog
```
✅ Appliqué

---

## Section 5 : Handoff d'implémentation

### Scope : **Mineur** → Agent Dev

**Handoff :** Agent Dev (`bmad-dev-story`)

**Prochaine étape :** Créer le fichier story 4.9 via `/bmad-create-story` puis l'implémenter via `/bmad-dev-story`.

**Critères de succès :**
1. Migration exécutée sans erreur — colonne `icon varchar(50)` en base
2. `CategoryDialogComponent` : sélecteur d'icônes ouvert au clic, recherche fonctionnelle, sélection stockée
3. `LinkCategoryCard` : affichage `<mat-icon>` avec fallback `folder_open`
4. Tests backend et frontend passent
5. Scénarios E2E (3) passent

---

## Statut du workflow

- [x] Section 1 — Trigger et contexte
- [x] Section 2 — Impact Epics
- [x] Section 3 — Impact artefacts
- [x] Section 4 — Chemin recommandé
- [x] Section 5 — Propositions de changements
- [x] Section 6 — Revue et handoff
- [x] Toutes les propositions approuvées par Manu (mode incrémental)
- [x] Artefacts mis à jour
- [x] sprint-status.yaml mis à jour
