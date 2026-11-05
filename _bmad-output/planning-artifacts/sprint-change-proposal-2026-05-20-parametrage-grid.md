# Sprint Change Proposal — 2026-05-20 — Paramétrage grid Liens

**Projet :** Dashboard
**Date :** 2026-05-20
**Scope :** Mineur → Implémentation directe par l'agent Développeur

---

## Section 1 — Résumé du changement

### Problème identifié

En mode lecture, le module Liens utilise un grid CSS auto-fill avec `minmax(280px, 1fr)` fixe. Sur les écrans larges (2560 px), l'espace disponible est sous-exploité : les cards gardent leur taille initiale avec de grandes zones vides sur les côtés. L'utilisateur souhaite pouvoir configurer lui-même le nombre de colonnes, la largeur des cards et les espacements pour adapter l'affichage à son écran.

### Contexte de découverte

Retour d'usage post-implémentation story 4.5 : le rendu est satisfaisant à 1280 px (3 cards bien proportionnées) mais inadapté à 2560 px. Une solution à colonnes fixes par breakpoint CSS a été envisagée puis écartée (trop rigide, beaucoup d'itérations nécessaires).

### Evidence

- Grid actuelle : `repeat(auto-fill, minmax(280px, 1fr))` — pas de contrôle utilisateur
- Rendu 2560 px : espace vide important à droite et à gauche, cards non optimisées
- UX-DR19 portait la mention explicite "pas de paramètre colonnes utilisateur en V1" — levée par ce changement

---

## Section 2 — Analyse d'impact

### Impact Epic

| Epic | Impact |
|------|--------|
| Epic 4 — Module Liens | Ajout story 4.8 en fin d'épic |
| Epics 5, 6, 7 | Aucun impact |

### Impact Stories

| Story | Impact |
|-------|--------|
| 4.5 — LinkCategoryCard + LinkItem | Non modifiée — la story 4.8 s'appuie dessus |
| 4.6 — Vue par défaut + thème | Non impactée, peut avancer en parallèle |
| 4.7 — D&D inter-catégories | Non impactée, peut avancer en parallèle |
| **4.8 — NEW** | Nouvelle story : widget ⚙️ de paramétrage de la grid en mode lecture |

### Conflits d'artefacts

| Artefact | Type | Changement |
|----------|------|------------|
| PRD | Ajout | FR49 — paramétrage affichage cards Liens |
| Epics | Ajout + Modification | Story 4.8 + FR Coverage Map + Epic 4 FRs + UX-DRs |
| Architecture | Ajout | Section `LinksGridSettingsService` + CSS custom properties + breakpoint 600 px |
| UX Design | Modification + Ajout | UX-DR19 mis à jour + UX-DR27 ajouté |
| sprint-status.yaml | Ajout | Entrée `4-8-parametrage-affichage-cards-mode-lecture` |

### Impact technique

- **Frontend uniquement** — aucun changement backend, aucune migration DB
- `LinksGridSettingsService` (injectable root) avec Signal + localStorage (clé `links-grid-settings`)
- CSS custom properties `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v` appliquées via `effect()` sur `LinksComponent`
- Breakpoint 600 px propre au module Liens — n'affecte pas le breakpoint global 768 px
- Widget `MatMenu` avec `MatSlider` et stepper, visible en mode lecture uniquement sur viewport ≥ 600 px

---

## Section 3 — Approche recommandée

**Option retenue : Direct Adjustment (Option 1)**

Ajout d'une story 4.8 en fin d'Epic 4, sans rollback ni révision du MVP.

**Justification :**
- Effort faible : frontend uniquement, pas de backend, pas de migration
- Risque bas : composant isolé (`LinksGridSettingsService`), aucune dépendance sur les autres stories
- Valeur utilisateur immédiate sur écrans larges
- La story 4.8 est indépendante de 4.6 et 4.7 — peut être implémentée dans n'importe quel ordre

**Estimation effort :** Faible  
**Risque :** Bas  
**Impact calendrier :** 1 story supplémentaire en fin d'Epic 4

---

## Section 4 — Propositions de changement détaillées

### 4.1 — PRD : Ajout FR49

**Fichier :** `_bmad-output/planning-artifacts/prd.md` ✅ Appliqué

```
AJOUT après FR44 (section Personnalisation) :

FR49 : Un utilisateur peut configurer l'affichage du module Liens en mode 
       lecture — nombre de colonnes (1–6) et espacement horizontal/vertical 
       (8–48 px, pas de 4 px) — depuis un widget discret (icône ⚙️) visible 
       uniquement sur viewport ≥ 600 px. Le paramétrage est persisté dans 
       localStorage (par device, par navigateur).
```

### 4.2 — Epics : FR Coverage Map + Story 4.8 + Epic 4 FRs

**Fichier :** `_bmad-output/planning-artifacts/epics.md` ✅ Appliqué

- FR49 ajouté dans la FR Coverage Map
- FR49 ajouté dans la liste Epic 4 FRs couverts
- UX-DR27 ajouté dans la liste Epic 4 UX-DRs
- Story 4.8 ajoutée après Story 4.7

### 4.3 — Architecture : LinksGridSettingsService + CSS custom properties

**Fichier :** `_bmad-output/planning-artifacts/architecture.md` ✅ Appliqué

Section ajoutée : `LinksGridSettingsService` (Signal + localStorage), binding CSS via `effect()`, breakpoint 600 px via `BreakpointObserver`, UI `MatMenu`.

### 4.4 — UX Design : mise à jour UX-DR19 + ajout UX-DR27

**Fichier :** `_bmad-output/planning-artifacts/ux-design-Dashboard.md` ✅ Appliqué

- UX-DR19 mis à jour : suppression de la contrainte "pas de paramètre en V1", nouveau comportement grid documenté
- Code CSS mis à jour : CSS custom properties + media query 600 px
- Layout par module mis à jour
- UX-DR27 ajouté : spec complète du widget ⚙️

### 4.5 — sprint-status.yaml

**Fichier :** `_bmad-output/implementation-artifacts/sprint-status.yaml` ✅ Appliqué

```yaml
4-8-parametrage-affichage-cards-mode-lecture: backlog
```

---

## Section 5 — Plan de handoff

**Scope : Mineur** → Implémentation directe par l'agent Développeur

| Rôle | Responsabilité |
|------|---------------|
| **Agent Développeur** | Créer la story 4.8 via `/bmad-create-story`, implémenter frontend |
| **Manu (review)** | Valider le widget ⚙️ sur écran large, vérifier persistance localStorage |

**Critères de succès :**
- Le widget ⚙️ est visible en mode lecture sur viewport ≥ 600 px uniquement
- Les 4 paramètres (colonnes, largeur, gapH, gapV) modifient la grid en temps réel
- Les paramètres sont persistés dans localStorage et restaurés au rechargement
- Sur mobile (< 600 px) : 1 colonne forcée, widget masqué
- En mode édition : widget invisible
- Tests E2E Playwright : 1920 px viewport, 5 colonnes → rechargement → restauration

**Prochaines étapes :**
1. Terminer story 4.5 si pas encore `done`
2. Implémenter stories 4.6, 4.7 (indépendantes de 4.8)
3. Créer story 4.8 via `/bmad-create-story`
4. Implémenter story 4.8 via `/bmad-dev-story`

---

*Généré par Correct Course — 2026-05-20*
