---
title: 'Story 9.1 : Fondations Ember (tokens, polices, icônes, logo, PWA)'
type: 'feature'
created: '2026-11-10'
status: 'done'
route: 'dispatch'
baseline_commit: 'a9335ac31a574ad88036bcef37b9509e9e4e177a'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-9-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/sprint-change-proposal-2026-11-09.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L'application utilise une palette rouge Material, Roboto et Material Icons chargées depuis Google Fonts, et l'ancien logo ; aucun écran ne peut adopter Ember sans cette base.

**Approach:** Poser les tokens Ember (variante AA) et les overrides Material dans `styles.scss`, auto-héberger Inter et Material Symbols Outlined (réduite), brancher le nouveau lot de logos de `brand/` sur `index.html`, le manifest et le service worker. Aucun style de composant n'est retouché ici.

## Boundaries & Constraints

**Always:** Valeurs de tokens exactement celles de la proposition 2026-11-09 §4.2 (clair/sombre). Conserver les noms `--color-*` existants, `--color-error`, `--color-warning`, `--color-on-primary`. Mêmes noms d'icônes dans les templates et en base. Inter en 400/500/600/700, `woff2`, `font-display: swap`. `theme-color` = `#F2F1EF` (index.html, manifest ; `background_color` aligné). Ne rien reformater hors fichiers touchés.

**Never:** Pas de modification du backend, de la base ni des routes. Pas de restylage de composants (stories 9.2+). Pas de Roboto. Pas de reprise en base de `printer` : Manu ne l'a jamais utilisée, aucun contrôle ni correctif à prévoir. Pas de commit sans accord de Manu.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Icône valide | `<mat-icon>add</mat-icon>` | Rendu Material Symbols Outlined, graisse 300, FILL 0 | N/A |
| Nom absent de Material Symbols | Nom de `material-icons.json` ou de l'UI sans équivalent | Liste produite et signalée à Manu | Pas de remplacement silencieux |
| Hors ligne | Après une première visite | App shell affiché sans erreur | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/styles.scss` -- tokens clair/sombre, `mat.theme()` (typography: system-ui à remplacer par Inter), overrides `--mat-sys-*`, fond `mat-flat-button`
- `frontend/src/index.html` -- supprimer preconnect/liens Google Fonts, `theme-color`, liens favicons/apple-touch
- `frontend/public/manifest.webmanifest` -- icônes (aujourd'hui `icons/icon-72…512`), `theme_color`, `background_color`
- `frontend/public/{favicon.ico,favicon.svg,apple-touch-icon.png,icons/}` -- ancien lot, à remplacer par `brand/` (favicon.svg, favicon-16/32, apple-touch-icon, icon-192/512, icon-maskable.svg)
- `frontend/ngsw-config.json` -- liste `/favicon.ico` en dur ; ajouter les polices (`woff2` déjà couvert par le groupe lazy `assets`, vérifier le préchargement de l'app shell hors ligne)
- `frontend/angular.json` -- `assets`/`styles` si les polices sont servies depuis un dossier dédié
- `frontend/public/material-icons.json` -- 492 icônes du sélecteur ; `printer` (ligne 181) → `print`
- `frontend/src/app/shared/components/material-icon-picker/` -- sélecteur (charge `/material-icons.json`)
- Templates `<mat-icon>` (add, delete, edit, content_copy, settings, remove, lock_reset, lock, check_circle, block, arrow_back, light_mode, dark_mode, share, restaurant_menu, person, person_add, note, search, image_search, logout, link_off, format_*, check, close, menu_book, note_alt, drag_handle, drag_indicator, cancel, admin_panel_settings, account_circle, folder_open, home, star, code) + noms en TS (`icon: 'home'`…) -- à inclure dans la police
- `brand/` -- sources du logo Ember (ne pas modifier)

## Tasks & Acceptance

**Execution:**
- [x] `frontend/package.json` -- ajouter `@fontsource/inter` et `material-symbols` (ou fichiers `woff2` versionnés dans `frontend/public/fonts/`) -- sources auto-hébergées
- [x] `frontend/public/fonts/` -- Inter 400/500/600/700 `woff2` ; Material Symbols Outlined figée (wght 300, FILL 0) et réduite aux noms de `material-icons.json` + icônes de l'UI -- plus de requête externe
- [x] `frontend/src/styles.scss` -- `@font-face`, `mat.theme()` en Inter, tokens Ember, overrides Material, classe `.material-symbols-outlined`/défaut `mat-icon` (MatIconRegistry `setDefaultFontSetClass`), surfaces neutres
- [x] `frontend/src/app/app.config.ts` -- enregistrer la police d'icônes par défaut
- [x] `frontend/src/index.html` -- retirer Google Fonts, `theme-color #F2F1EF`, favicons du nouveau lot
- [x] `frontend/public/` + `manifest.webmanifest` + `ngsw-config.json` -- nouveau lot d'icônes, références à jour, aucune référence orpheline
- [x] `frontend/public/material-icons.json` -- `printer` → `print` ; script/commande de contrôle des noms absents de Material Symbols
- [x] `frontend/public/favicon.ico` -- généré à partir de `brand/favicon.svg` (ImageMagick, tailles 16/32/48), pas des PNG
- [x] Rapport à Manu : noms d'icônes absents de Material Symbols
- [x] Tests existants (`ng test`) -- adapter si le sélecteur d'icônes en dépend

**Acceptance Criteria:**
- Given `styles.scss` chargé, when j'inspecte les deux thèmes, then les tokens et `--mat-sys-*` valent ceux de la spec, `--color-error`/`--color-warning`/`--color-on-primary` restent définis et les surfaces sont neutres
- Given l'app chargée, when j'inspecte le réseau, then aucune requête vers `fonts.googleapis.com` ni `fonts.gstatic.com`, et `index.html` n'a plus ces balises
- Given du texte affiché, when j'inspecte la police, then Inter est servie localement et utilisée par `mat.theme()`
- Given un `mat-icon`, when j'inspecte son rendu, then Material Symbols Outlined auto-hébergée, graisse 300, FILL 0
- Given le sélecteur d'icônes, when je cherche « print », then `print` est proposé et `printer` a disparu
- Given `index.html`, manifest et `ngsw-config.json`, when je les inspecte, then favicons, `apple-touch-icon` et icônes PWA viennent de `brand/`, aucune référence à un fichier supprimé, `theme-color` = `#F2F1EF`
- Given une première visite puis hors ligne, when j'ouvre l'app, then l'app shell s'affiche sans erreur

## Implementation Notes

- Polices servies depuis `frontend/public/fonts/` (fichiers `woff2` versionnés, pas de dépendance npm) : Inter latin 400/500/600/700 (paquet `@fontsource/inter` 5.3.0) et Material Symbols Outlined (paquet `material-symbols` 0.48.3) figée à wght 300, FILL 0, GRAD 0, opsz 24, puis réduite à 546 icônes (45 Ko) via fonttools (script jetable, hors dépôt). Licences copiées à côté.
- Seul `printer` est absent de Material Symbols ; `print` existait déjà dans `material-icons.json`, l'entrée `printer` a donc été supprimée (pas de doublon).
- Icône par défaut des `mat-icon` : `MatIconRegistry.setDefaultFontSetClass('material-symbols-outlined')` dans `app.config.ts`.
- `favicon.ico` généré depuis `brand/favicon.svg` (ImageMagick, 16/32/48). Manifest : icônes 192/512 `any` + 192/512 `maskable` (PNG rastérisés depuis `icon-maskable.svg`) ; anciennes tailles 72 à 384 supprimées.
- `ngsw-config.json` : polices et `favicon.svg` ajoutés au groupe `app` (prefetch), vérifié dans `ngsw.json`.
- Tokens : `--color-primary-light` retiré (inutilisé) ; statuts clair/sombre alignés sur la palette Ember (`--color-success` `#15803D` / `#4ADE80`).
- Avertissement de budget `initial` (540 Ko → 544 Ko) déjà présent avant la story.

## Spec Change Log

## Review Triage Log

| Finding | Verdict | Route | Evidence |
|---|---|---|---|
| Inter émise entre guillemets (famille unique) | false | rejeté | CSS compilé : `Inter, system-ui, …` en liste de familles |
| Police d'icônes absente du préchargement offline | false | rejeté | `ngsw.json` : polices dans le groupe `app` (prefetch) |
| URLs `/fonts/…` absolues, cassent sous un sous-chemin | low | rejeté | App servie à la racine (Docker) ; le sélecteur charge déjà `/material-icons.json` en absolu |
| `theme-color` sombre manquant | low | rejeté | La spec impose `#F2F1EF` |
| Tokens non consommés, `--color-primary` = `--color-primary-fill` en clair | false | rejeté | Voulu par la spec (tokens posés pour les stories suivantes) |
| `--mat-sys-primary` / conteneurs primaires non alignés | low | rejeté | A1 limite l'ajustement aux boutons pleins ; contraste global revu en 9.8 |
| Incohérences de la spec (tâche package.json, budget, logs vides) | low | rejeté | Le correctif consiste à éditer la spec ; notes d'implémentation à jour |
| `apple-touch-icon`, icônes PNG, licences hors groupe prefetch | low | rejeté | Hors critère « app shell hors ligne », groupe lazy suffisant |
| Seul Inter 400 préchargé | low | rejeté | Gain marginal, `font-display: swap` |
| `APP_INITIALIZER` obsolète + import `inject` en double | low | patch | Remplacé par `provideAppInitializer`, imports fusionnés |
| Pas de préchargement de la police d'icônes (`font-display: block`) | medium | patch | Préchargement ajouté dans `index.html` |
| Favicon : l'`.ico` peut être préféré au SVG par Chrome | low | patch | `sizes="any"` sur le SVG, `sizes` retiré de l'`.ico` |
| Bloc de tokens de statut sombre dupliqué | low | patch | Doublon supprimé de `styles.scss` |
| Aucun contrôle automatisé de la police d'icônes ; script de génération hors dépôt | medium | defer | Reporté (voir `deferred-work.md`) |
| Pas de garde automatique « aucune référence orpheline » (manifest, preload, ngsw) | low | defer | Reporté |

## Design Notes

Réduction de la police d'icônes : instancier la police variable (`fonttools varLib.instancer` wght=300, FILL=0, autres axes figés), puis sous-ensemble par glyphes/ligatures (`pyftsubset --layout-features=liga`) sur la liste des noms. Si l'outillage est indisponible, repli : instance statique complète, signalée à Manu (taille).

## Verification

**Commands:**
- `cd frontend && npx ng build` -- expected: succès, aucun budget dépassé, aucune référence orpheline
- `cd frontend && npx ng test --no-watch` -- expected: tests verts
- `cd frontend && npm run prettier:write && npm run prettier:check` -- expected: OK
- `grep -rn "googleapis\|gstatic" frontend/src frontend/public` -- expected: aucun résultat

**Manual checks (if no CLI):**
- Comparer `01-main`, `02-alight`, `07-settings` aux maquettes dans les deux thèmes (couleurs, Inter, icônes fines) ; onglet Réseau sans domaine externe ; mode avion après première visite.
