---
title: 'Story 9.2 : Coque de l''application (top bar, navigation, menu utilisateur, snackbars, confirmations)'
type: 'feature'
created: '2026-11-10'
status: 'done'
route: 'dispatch'
baseline_commit: 'f2e3afeac290d8cbacb568319125b659a97aea8b'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-09.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La top bar, les onglets, le menu utilisateur, les snackbars et les dialogs de confirmation gardent l'ancien style (couleurs codées en dur, ombre, icône `account_circle`, boutons texte) alors que les fondations Ember (9.1) sont posées.

**Approach:** Restyler ces éléments transverses aux maquettes `02-alight`, `03-edit`, `23-confirm`, `24-user-menu` avec les tokens Ember, sans changer ni textes, ni durées, ni routes, ni comportements.

## Boundaries & Constraints

**Always:** Top bar 60px, fond `--color-background`, bordure basse hairline `--color-divider`, logo `icon-app.svg` (~30px) + « Dashboard » 16px/700 `--color-text-primary`. Onglet actif : fond `--color-primary-soft`, texte `--color-text-primary`, rayon arrondi ; inactifs `--color-text-secondary` ; pas de barre d'encre Material. Bouton clair/sombre : carré arrondi bordé ; bouton menu : cercle avec l'initiale du nom (repli : initiale du `username`). Menu : 4 entrées inchangées (Administration pour les admins seulement), séparateur avant Déconnexion, Déconnexion en `--color-primary`. Snackbars : pastille centrée en bas, surface + bordure, icône à gauche ; **succès = coche `check` en `--color-primary`, erreur = croix `close` en `--color-error`** (décision de Manu, 2026-11-10). Dialogs de confirmation (`ConfirmDialogComponent`, `ConfirmDestructiveDialogComponent`) : rayon 16px, « Annuler » tonal (fond `--color-primary-soft`, texte `--color-on-primary-soft`) et action en `mat-flat-button` pilule. Les deux thèmes.

**Never:** Pas de changement de texte, de durée, de route, de logique, ni du backend. Pas de restyle de la bottom nav ni de l'affichage mobile (Epic 10) : la nav desktop reste masquée sous 768px. Pas de badge « Administration » près de l'avatar. Pas d'animation soumise au réglage « Animations » (9.7). Pas de commit sans accord de Manu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Succès | `snackBar.open('Lien ajouté', …)` sans `panelClass` | Pastille avec coche | N/A |
| Erreur | appel dans un callback `error` ou message d'échec | Pastille avec croix rouge | N/A |
| Copie ratée | share-link / reset-password, `copied === false` | Croix | N/A |
| Nom vide | `name` vide ou absent | Initiale du `username`, en majuscule | Repli `?` si les deux sont vides |
| Non connecté | `/login`, vue publique | Ni onglets ni avatar, bouton thème présent | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/app/core/components/top-bar/top-bar.component.{html,scss,ts}` -- `mat-toolbar` + `mat-tab-nav-bar` + `mat-menu`. Couleurs codées en dur (`#b71c1c`, `#141414`) et ombre à supprimer. `img src="favicon.svg"` à remplacer par `icon-app.svg`. Ajouter un `computed` pour l'initiale.
- `frontend/src/app/core/components/top-bar/top-bar.component.spec.ts` -- sélectionne `button[mat-icon-button][0]` pour le bouton thème. Ajouter des tests pour l'initiale et l'entrée Administration.
- `brand/icon-app.svg` -- à copier dans `frontend/public/icon-app.svg` ; l'ajouter au groupe prefetch de `frontend/ngsw-config.json` (app shell hors ligne).
- `frontend/src/styles.scss` -- tokens Ember déjà posés (9.1). Ajouter les styles globaux des overlays : panneau `mat-menu`, `mat-snack-bar-container` (+ `.snackbar-error`), conteneur de dialog, backdrop.
- `frontend/src/app/app.config.ts` -- fournir `MAT_SNACK_BAR_DEFAULT_OPTIONS` avec `panelClass: 'snackbar-success'`. La configuration par appel est fusionnée par-dessus, et un `panelClass` explicite remplace la valeur par défaut.
- Appels d'erreur auxquels ajouter `panelClass: 'snackbar-error'` : `admin/admin-panel.component.ts` (85, 117, 149), `admin/reset-password-dialog.component.ts` (51, 58), `settings/notes-settings/notes-settings.component.ts` (113), `profile/profile.component.ts` (70), `recipes/recipe-detail/recipe-detail.component.ts` (156), `recipes/recipe-editor/recipe-editor.component.ts` (165, 237), `links/links.component.ts` (132, 149, 170, 196, 213, 233, 262, 289, 305), `shared/components/share-link-dialog/share-link-dialog.component.ts` (103 et 152 si `!copied`, 115, 121, 143, 195, 217). `account/change-password` n'a qu'un appel de succès.
- `frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts` -- `mat-button color="warn"` → bouton « Annuler » tonal et `mat-flat-button` pilule pour l'action.
- `frontend/src/app/admin/confirm-destructive-dialog.component.{html,scss}` -- même traitement.
- Ne pas toucher : `bottom-nav/*`, `footer/*` (déjà sur les tokens), `theme.service.ts`.

## Tasks & Acceptance

**Execution:**
- [ ] `frontend/public/icon-app.svg` + `frontend/ngsw-config.json` -- copier le logo depuis `brand/` et le précharger -- logo de la top bar
- [ ] `top-bar.component.{ts,html,scss}` -- structure Ember (logo, onglets en pilule, bouton thème bordé, avatar-initiale), hauteur 60px, hairline, tokens uniquement -- AC top bar et menu
- [ ] `frontend/src/styles.scss` -- styles globaux du menu (rayon, surface, bordure, séparateur, Déconnexion en `--color-primary`, icônes `--color-text-secondary`), des snackbars (pastille + icône `::before` en ligature Material Symbols) et des dialogs (rayon 16px, actions) -- les overlays sortent du composant
- [ ] `frontend/src/app/app.config.ts` -- `MAT_SNACK_BAR_DEFAULT_OPTIONS` → `snackbar-success` -- coche par défaut
- [ ] Fichiers d'appels d'erreur listés ci-dessus -- ajouter `panelClass: 'snackbar-error'` (ternaires : classe conditionnelle) -- croix sur les erreurs
- [ ] `confirm-dialog.component.ts`, `confirm-destructive-dialog.component.{html,scss}` -- boutons Annuler tonal + action pleine pilule -- maquette `23-confirm`
- [ ] `top-bar.component.spec.ts` + specs touchées -- tests de l'initiale (nom, repli `username`), de l'entrée Administration (admin et non-admin) et de la présence de `snackbar-error` sur un appel d'erreur représentatif -- non-régression

**Acceptance Criteria:**
- Given un utilisateur authentifié sur desktop, when il regarde la top bar, then elle mesure 60px avec une bordure basse hairline, affiche `icon-app.svg` et « Dashboard », et l'onglet actif a le fond `--color-primary-soft`
- Given n'importe quelle page dotée d'une top bar (y compris `/login`), when on la regarde, then le bouton clair/sombre est présent
- Given le menu utilisateur ouvert, when il s'affiche, then il contient Administration (admins seulement), Paramètres, Mon profil, puis un séparateur et Déconnexion en rouge, conformément à `24-user-menu`
- Given une action réussie ou en échec, when le snackbar apparaît, then c'est une pastille Ember avec une coche (succès) ou une croix (erreur), avec le même texte et la même durée qu'avant
- Given une confirmation destructive, when elle apparaît, then son style correspond à `23-confirm` dans les deux thèmes

## Implementation Notes

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Preuve |
|---|---|---|---|
| `charAt(0)` coupe un emoji (initiale) | low | patch | Réel : paire de substitution tronquée. Corrigé avec `Array.from(source)[0]`. |
| Assertion Administration redondante (`\|\|`) et menu vide non détecté | low | patch | Réel. Assertion simplifiée, `items.length > 0` ajouté ; 196/196 verts. |
| `.mdc-tab--active` pourrait ne pas être posée sur `a[mat-tab-link]` | false | rejeté | `tabs.mjs:2289` : `'[class.mdc-tab--active]': 'active'` sur le lien. |
| Variables `--mat-tab-*` posées sur `:host` n'atteignent pas les liens | false | rejeté | Les propriétés CSS personnalisées sont héritées par les descendants. |
| « Copie ratée » : croix sur « Lien généré — copiez-le manuellement » | false | rejeté | Imposé par la matrice de la spec (`copied === false` → croix). |
| Bouton de confirmation destructive sans rouge dédié | false | rejeté | La spec impose `mat-flat-button` pilule ; le primaire Ember est déjà rouge. |
| Appels d'erreur non convertis donnant une coche | false | rejeté | grep de tous les `snackBar.open` : tous les messages d'échec portent `snackbar-error`. |
| Pas de test de `panelClass` pour admin, profil, recettes | low | rejeté | Cosmétique ; schéma déjà testé (liens, notes, partage) et la matrice est couverte. |
| Défaut `snackbar-success` non testé / sans règle propre | low | rejeté | Redondant avec la règle de base ; aucune régression visible possible. |
| Chaîne `'snackbar-error'` répétée, helper suggéré | low | rejeté | Refacto hors périmètre (la spec interdit de changer les appels). |
| Croix de l'erreur ressemble à un bouton de fermeture | false | rejeté | Décision de Manu (2026-11-10), inscrite dans la spec. |
| Repli de police absent pour les icônes de snackbar | low | rejeté | Police auto-hébergée (9.1), coût de la garde supérieur au risque. |
| Cibles tactiles 36px, responsive, PWA/favicon, bottom nav | false | rejeté | Hors périmètre : Epic 10 et « Never » de la spec. |
| `div` séparateur au lieu de `mat-divider`, pilule sur messages longs, mode sombre non testé | low | rejeté | Pas de dommage nommé ; vérification visuelle prévue dans la spec. |

## Design Notes

Icône des snackbars en pur CSS, sans changer les appels :

```scss
.mat-mdc-snack-bar-container .mat-mdc-snackbar-surface::before {
  font-family: 'Material Symbols Outlined';
  font-feature-settings: 'liga';
  content: 'check'; // .snackbar-error → 'close' + color: var(--color-error)
}
```

`check` et `close` sont déjà dans la police réduite (9.1).

## Verification

**Commands:**
- `cd frontend && npx ng build` -- expected: succès
- `cd frontend && npx ng test --no-watch` -- expected: tests verts
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK

**Manual checks (if no CLI):**
- Comparer la top bar à `02-alight` (clair) et `03-edit` (sombre), le menu à `24-user-menu`, la confirmation à `23-confirm`, un snackbar de succès et un d'erreur. Le tout dans les deux thèmes, avec un compte admin et un compte utilisateur.
