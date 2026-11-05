# Sprint Change Proposal — 2026-05-14

## Section 1 : Résumé du problème

**Déclencheur :** Lors de la revue visuelle du panneau d'administration (Épic 3, stories 3.1–3.4 marquées `done`), trois problèmes d'affichage ont été identifiés dans les deux thèmes (clair/sombre) :

1. Les badges de statut (`Actif`, `Inactif`, `Mdp temp.`) n'affichent pas les couleurs attendues.
2. Le bouton "Supprimer" n'est pas coloré en rouge warn.
3. Les chips de rôle (`admin`/`user`) sont visuellement identiques.

**Contexte de découverte :** Revue post-implémentation des stories 3.1 (liste des comptes) et 3.4 (désactivation/suppression), déjà marquées `done`.

**Évidences :**
- `.badge-inactive` et `.badge-warning` : `background-color` ignoré par l'encapsulation MDC des chips AM3
- `--mat-sys-tertiary` : variable CSS non définie dans le thème → valeur `initial` sur badge-warning
- `color="warn"` sur `<mat-icon>` : ignoré en Angular Material 3 (doit être sur l'élément hôte)
- `.role-admin` / `.role-user` : classes absentes du SCSS → chips de rôle visuellement identiques

## Section 2 : Analyse d'impact

### Impact Épics
- **Épic 3** : Stories 3.1–3.4 fonctionnellement correctes, rendu visuel incorrect. Story 3.5 (backlog) non impactée.
- **Épics 4-7** : Risque de répétition du problème si le design system n'est pas complété avant l'implémentation des prochains modules.

### Impact Artefacts
| Artefact | Impact |
|---|---|
| `admin-panel.component.html` | Fix `color="warn"` |
| `admin-panel.component.scss` | Fix chips MDC + ajout classes rôle |
| `styles.scss` | Ajout tokens `--color-warning` / `--color-success` |
| PRD | Aucun |
| Architecture | Aucun |
| Backend | Aucun |
| Tests Playwright | À vérifier (assertions visuelles éventuelles) |

### Impact Technique
Correction purement frontend/CSS. Aucune migration DB, aucun changement d'API.

## Section 3 : Approche retenue

**Option 1 — Ajustement direct**

Les problèmes sont corrigibles sans rollback ni revue de scope MVP. La correction systémique de `styles.scss` est réalisée dans le même ticket pour prévenir la répétition sur les Épics 4-7.

- Effort : **Faible**
- Risque : **Faible**
- Impact timeline : **Aucun**

## Section 4 : Changements appliqués

### `frontend/src/app/admin/admin-panel.component.html`

**Bouton supprimer :**

OLD:
```html
<button mat-icon-button ...>
  <mat-icon color="warn">delete</mat-icon>
</button>
```

NEW:
```html
<button mat-icon-button color="warn" ...>
  <mat-icon>delete</mat-icon>
</button>
```

Rationale : En AM3, `color` doit être sur l'élément hôte du composant, pas sur l'icône enfant.

---

### `frontend/src/app/admin/admin-panel.component.scss`

**Badges de statut — fix propriété MDC :**

OLD:
```scss
.badge-active {
  --mdc-chip-label-text-color: var(--mat-sys-on-primary);
  background-color: var(--mat-sys-primary);
}
.badge-inactive {
  --mdc-chip-label-text-color: var(--mat-sys-on-error);
  background-color: var(--mat-sys-error);
}
.badge-warning {
  --mdc-chip-label-text-color: var(--mat-sys-on-tertiary);
  background-color: var(--mat-sys-tertiary);
}
```

NEW:
```scss
.badge-active {
  --mdc-chip-elevated-container-color: var(--mat-sys-primary);
  --mdc-chip-label-text-color: var(--mat-sys-on-primary);
}
.badge-inactive {
  --mdc-chip-elevated-container-color: var(--mat-sys-error);
  --mdc-chip-label-text-color: var(--mat-sys-on-error);
}
.badge-warning {
  --mdc-chip-elevated-container-color: var(--color-warning);
  --mdc-chip-label-text-color: var(--color-on-warning);
}
```

**Chips de rôle — ajout classes manquantes :**

NEW:
```scss
.role-admin {
  --mdc-chip-elevated-container-color: var(--mat-sys-primary);
  --mdc-chip-label-text-color: var(--mat-sys-on-primary);
  font-weight: 600;
}
.role-user {
  --mdc-chip-elevated-container-color: var(--mat-sys-surface-variant);
  --mdc-chip-label-text-color: var(--mat-sys-on-surface-variant);
}
```

---

### `frontend/src/styles.scss`

**Tokens de statut ajoutés (prévention Épics 4-7) :**

```scss
html {
  --color-warning: #F57C00;     // Orange 700 — WCAG AA sur fond clair
  --color-on-warning: #FFFFFF;
  --color-success: #2E7D32;     // Green 800 — WCAG AA sur fond clair
  --color-on-success: #FFFFFF;
}

.dark-theme {
  --color-warning: #FFB74D;     // Orange 300 — WCAG AA sur fond sombre
  --color-on-warning: #1A1A1A;
  --color-success: #66BB6A;     // Green 400 — WCAG AA sur fond sombre
  --color-on-success: #1A1A1A;
}
```

**Pattern AM3 documenté :** utiliser `--mdc-chip-elevated-container-color` (pas `background-color`) pour colorer les `mat-chip`.

## Section 4b : Ajustements finaux (validés par Manu)

Suite aux tests visuels en conditions réelles, la logique de couleur des badges a été affinée :

| Élément | Couleur finale | Rationale |
|---------|---------------|-----------|
| Badge "Actif" | `surface-variant` (neutre) | Un statut normal ne doit pas attirer l'œil |
| Badge "Inactif" | `primary` (rouge) | L'anomalie doit sauter aux yeux |
| Badge "Mdp temp." | `warning` (orange) | État transitoire, non bloquant |
| Chip rôle "admin" | `success` (vert) | Différenciation positive du rôle privilégié |
| Chip rôle "user" | `surface-variant` (neutre) | Rôle standard |
| Icône "Supprimer" | `error` (rouge) via `.delete-button .mat-icon` | Action destructive |
| Icônes "Désactiver" / "Réactiver" | Standard (non colorées) | Pas de surcharge visuelle |

**Découverte technique documentée :** `mat-chip` standalone en AM3 rend en mode outlined — impossible à colorer via CSS custom properties MDC. Remplacé par `<span class="status-badge">`. Pattern et pièges AM3 consignés dans `architecture.md` et `ux-design-Dashboard.md`.

## Section 5 : Handoff et critères de succès

**Scope : Mineur** — implémentation directe terminée et validée visuellement.

**Critères de succès :**
- [x] Badge "Actif" s'affiche en gris neutre (surface-variant) dans les deux thèmes
- [x] Badge "Inactif" s'affiche en rouge primary dans les deux thèmes
- [x] Badge "Mdp temp." s'affiche en orange warning dans les deux thèmes
- [x] Chip "admin" s'affiche en vert success avec font-weight 600
- [x] Chip "user" s'affiche en gris neutre (surface-variant)
- [x] Icône "Supprimer" s'affiche en rouge error dans les deux thèmes
- [x] Aucune régression sur les autres éléments du panneau admin
- [x] Patterns AM3 documentés dans architecture.md et ux-design-Dashboard.md
