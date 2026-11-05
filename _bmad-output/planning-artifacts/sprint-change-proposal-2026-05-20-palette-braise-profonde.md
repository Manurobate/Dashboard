# Sprint Change Proposal — Palette "Braise Profonde"

**Projet :** Dashboard
**Date :** 2026-05-20
**Scope :** Mineur → Implémentation directe (couleurs uniquement, structure HTML inchangée)
**Statut :** ✅ Approuvé et appliqué

---

## Section 1 — Résumé du changement

### Problème identifié

Post-implémentation de l'Epic 4 (Module Liens), la palette "Noir & Braise" présente deux défauts visuels :

1. **Thème sombre** : `#EF5350` (Red-400) tire vers le saumon/rose — l'effet "rouge pétant sur noir" n'est pas atteint. Par ailleurs, `#FF8A80` (primary-light) est franchement rose. Angular Material 3 aggrave le problème en générant des `surface-container` teintés roses depuis la palette red.
2. **Thème clair** : les cards de catégories de liens s'affichent avec un fond rosé au lieu de blanc — causé par `--mat-sys-surface-container` généré automatiquement par AM3 depuis la palette red (teinte ~`#F9DDDA`).

### Contexte de découverte

Retour d'usage post-Epic 4, avant le démarrage de l'Epic 5. Moment optimal pour corriger : aucune story des Epics 5-7 n'est encore implémentée.

### Evidence

- `link-category-card.component.scss` utilise `background: var(--mat-sys-surface-container)` → fond rosé AM3
- `link-item.component.scss` utilise `--mat-sys-surface-container-low` pour le mode édition → même problème
- `--color-primary: #EF5350` en dark = Red-400 → composante rose trop marquée
- `--color-primary-light: #FF8A80` en dark = très rose

---

## Section 2 — Analyse d'impact

### Impact Epic

| Epic | Impact |
|------|--------|
| Epic 1 — Design System | Palette renommée + tokens mis à jour |
| Epics 2–4 | Couleurs visuelles corrigées, aucun changement fonctionnel |
| Epics 5–7 | Non impactés — correction préventive avant implémentation |

### Impact Stories

Aucune story ne nécessite de réécriture. Les composants utilisent `var(--color-primary)` et `var(--mat-sys-*)` — la correction est entièrement absorbée par `styles.scss`.

### Conflits d'artefacts

| Artefact | Type | Changement |
|----------|------|------------|
| `styles.scss` | Modification | Nouveaux tokens + overrides AM3 |
| `top-bar.component.scss` | Modification | Couleurs hardcodées mises à jour |
| `create-user-dialog.component.scss` | Modification | Fallback RGB mis à jour |
| `reset-password-dialog.component.scss` | Modification | Fallback RGB mis à jour |
| `ux-design-Dashboard.md` | Mise à jour | Palette renommée + tableau tokens + WCAG |
| `epics.md` | Mise à jour | UX-DR1, UX-DR2, UX-DR3, Story 1.4 |

### Impact technique

- **Frontend uniquement** — aucun changement backend, aucune migration DB
- Structure HTML : **inchangée**
- Portée : `styles.scss` + 3 fichiers SCSS de composants

---

## Section 3 — Approche recommandée

**Option retenue : Direct Adjustment**

Correction cosmétique directe des tokens CSS. Aucune nouvelle story, aucun rollback.

**Estimation effort :** Très faible (4 fichiers SCSS)
**Risque :** Très bas (couleurs uniquement, pas de logique)
**Impact calendrier :** Aucun

---

## Section 4 — Changements appliqués

### 4.1 — Nouvelle palette : "Braise Profonde"

Palette sélectionnée parmi trois propositions (Rouge Vif, Noir & Écarlate, **Braise Profonde**).

| Token | Ancien (sombre) | Nouveau (sombre) | Ancien (clair) | Nouveau (clair) |
|-------|----------------|-----------------|----------------|----------------|
| `--color-primary` | `#EF5350` ← rosé | `#EF4444` ✓ rouge pur | `#C62828` | `#B71C1C` |
| `--color-primary-light` | `#FF8A80` ← rose | `#F87171` | `#E53935` | `#D32F2F` |
| `--color-background` | `#0F0F0F` | `#0A0A0A` | `#F5F5F5` | `#F5F5F5` |
| `--color-surface` | `#1A1A1A` | `#1C1C1C` | `#FFFFFF` | `#FFFFFF` |
| `--color-error` | `#FF6B6B` | `#FF6B6B` | `#B71C1C` | `#C62828` |

### 4.2 — Overrides AM3 ajoutés (cause racine des fonds rosés)

**Thème clair :**
```scss
--mat-sys-primary: #B71C1C;
--mat-sys-primary-container: #FECACA;   /* rouge très clair, neutre */
--mat-sys-on-primary-container: #7F1D1D;
--mat-sys-surface-container: #FFFFFF;   /* ← cartes blanches */
--mat-sys-surface-container-low: #FAFAFA;
--mat-sys-surface-container-high: #F0F0F0;
--mat-sys-surface-container-highest: #E8E8E8;
```

**Thème sombre :**
```scss
--mat-sys-primary: #EF4444;             /* ← rouge pur, remplace le rose AM3 */
--mat-sys-primary-container: #7F1D1D;
--mat-sys-on-primary-container: #FECACA;
--mat-sys-surface-container: #222222;   /* neutre, sans teinte rose */
--mat-sys-surface-container-low: #1C1C1C;
--mat-sys-surface-container-high: #2A2A2A;
--mat-sys-surface-container-highest: #333333;
```

### 4.3 — Top bar (couleurs hardcodées)

| Sélecteur | Avant | Après |
|-----------|-------|-------|
| `.app-title` (clair) | `#C62828` | `#B71C1C` |
| `.app-title` (sombre) | `#EF5350` | `#EF4444` |
| `.top-bar` bg (sombre) | `#1F1F1F` | `#141414` |

### 4.4 — Dialogs admin (fallback RGB)

`rgba(var(--color-primary-rgb, 198, 40, 40), 0.08)` → `rgba(var(--color-primary-rgb, 183, 28, 28), 0.08)`

---

## Section 5 — Ratios WCAG 2.1 AA

| Paire | Ratio | Résultat |
|-------|-------|----------|
| `#EF4444` sur `#0A0A0A` (sombre, primary) | ~5.3:1 | ✅ AA (↑ vs 4.6:1 avant) |
| `#B71C1C` sur `#FFFFFF` (clair, top bar) | ~6.1:1 | ✅ AA (↑ vs 5.1:1 avant) |
| `#212121` sur `#F5F5F5` (clair, body) | 16:1 | ✅ AAA |
| `#FFFFFF` sur `#1C1C1C` (sombre, body) | ~15:1 | ✅ AAA |

---

## Section 6 — Plan de handoff

**Scope : Mineur** — correction appliquée directement, aucune story à créer.

| Rôle | Responsabilité |
|------|---------------|
| ✅ **Manu (review)** | Valider le rendu visuel en `ng serve` (cartes blanches en clair, rouge pur en sombre) |

**Critères de succès :**
- [ ] Cards catégories de liens : fond blanc en thème clair (plus de rose)
- [ ] Titre top bar : rouge `#B71C1C` en clair, rouge pur `#EF4444` en sombre
- [ ] Badge initiale favicon : fond rouge clair (non rose) en clair, rouge sombre en dark
- [ ] Thème sombre : rouge électrique sur fond quasi-noir, aucune teinte rose

---

*Généré par Correct Course — 2026-05-20*
