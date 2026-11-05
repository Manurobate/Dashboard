# Sprint Change Proposal — Top bar thème clair : Direction 03 pure

**Date :** 2026-05-01
**Auteur :** Manu
**Statut :** Approuvé

---

## Section 1 — Résumé du changement

**Déclencheur :** Révision d'un choix de design fait pendant la session UX (2026-04-21). La Direction 03 "Cards Élevées" avait été retenue avec un ajustement emprunté à Direction 04 : le fond de la top bar en thème clair avait été changé de `#FFFFFF` vers `#C62828` + texte blanc. L'utilisateur souhaite revenir à la Direction 03 telle que présentée dans les maquettes originales, sans cet ajustement.

**Changement précis :**

| | Avant | Après |
|--|--|--|
| Top bar — thème clair | fond `#C62828` + texte blanc | fond `#FFFFFF` + ombre `0 2px 8px rgba(0,0,0,0.1)` + app name `#C62828` |
| Top bar — thème sombre | fond `#1F1F1F` + app name `#EF5350` | inchangé |
| Cards, layout, badges | Direction 03 | inchangés |

---

## Section 2 — Analyse d'impact

- **Épics affectés :** Épic 1 uniquement (Stories 1.4 et 1.5)
- **Autres épics :** Aucun impact
- **Architecture :** Aucun impact
- **Flux UX :** Aucun impact — seule la valeur CSS du fond change

---

## Section 3 — Modifications appliquées

### `ux-design-Dashboard.md`
- [x] Section "Chosen Direction" — description top bar thème clair mise à jour
- [x] Section "Design Rationale" — rationale top bar rouge → blanc
- [x] Section "Implementation Approach" — snippet SCSS top bar mis à jour
- [x] Section "Navigation Patterns" — ajout des valeurs de fond par thème

### `epics.md`
- [x] UX-DR3 — définition mise à jour (fond `#FFFFFF` + ombre + app name `#C62828`)
- [x] Story 1.4 — critère d'acceptation thème clair mis à jour
- [x] Story 1.5 — critère d'acceptation top bar mis à jour

### Implémentation
- [x] `frontend/src/app/core/components/top-bar/top-bar.component.scss` — fond blanc + ombre thème clair, suppression des surcharges CSS blanches non nécessaires pour la top bar colorée

---

## Section 4 — Approche retenue

**Option 1 — Direct Adjustment**
- Effort : Faible
- Risque : Faible
- Impact timeline : Aucun

---

## Section 5 — Classification et handoff

**Scope : Minor** — implémenté directement.

**Critère de succès :** En thème clair, la top bar affiche un fond blanc (`#FFFFFF`) avec ombre légère et l'app name "Dashboard" en rouge `#C62828`. En thème sombre, aucun changement visible.
