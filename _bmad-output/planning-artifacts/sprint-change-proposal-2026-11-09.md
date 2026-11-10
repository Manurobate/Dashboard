# Sprint Change Proposal — Refonte visuelle Ember

**Date :** 2026-11-09
**Auteur :** Manu
**Statut :** Approuvé le 2026-11-10
**Scope :** Modéré — réorganisation du backlog et mise à jour des artefacts, aucun rollback de code
**Branche :** `docs/refonte-ember` (depuis `develop`)

---

## Section 1 — Résumé du déclencheur

### Problème identifié

Le design actuel (Angular Material brut, palette « Braise Profonde ») est jugé trop générique. Manu adopte la direction **« Ember »** : esthétique d'outil de développement moderne, sobre, avec la braise rouge comme accent unique, avant la sortie de la version 1.0.0.

**Catégorie :** nouvelle exigence du porteur de projet (refonte visuelle). Aucune story n'est en échec.

### Périmètre

Habillage de l'existant uniquement. Aucun changement fonctionnel, à l'exception du réglage des animations (A16), aucune refonte de la structure du code. Les maquettes sont la référence visuelle.

### Sources

| Source | Emplacement |
|---|---|
| Passation desktop | `_bmad-output/passation-refonte-visuelle-Dashboard.md` |
| Maquettes desktop (30 PNG) | `_bmad-output/planning-artifacts/refonte-ember/` |
| Passation mobile | `_bmad-output/planning-artifacts/refonte-ember/mobile/passation-mobile-Dashboard.md` |
| Maquettes mobiles (m1 à m8) | `_bmad-output/planning-artifacts/refonte-ember/mobile/` |
| Logo et icônes | `brand/` |

### Arbitrages de Manu (ils priment sur les passations)

| # | Sujet | Décision |
|---|---|---|
| A1 | Couleurs | Maquettes conservées, sauf les rouges qui passent sous le seuil AA (variante choisie par Manu après comparaison). Sombre : fond des boutons pleins `#D83C34`, texte sur fond rosé `#F1524A`, autres usages du rouge inchangés (`#F0433A`). Clair : rouge `#CD3228` à la place de `#D6342A`, texte sur fond rosé `#B82D24`. Ces écarts ne comptent pas comme des défauts à la vérification aux maquettes |
| A2 | Tokens | Noms libres si l'ensemble reste cohérent et conforme aux maquettes. `--color-error`, `--color-warning` et `--color-on-primary` sont conservés |
| A3 | Grille | Écart par défaut 16px, pas 20px. CSS actuel conservé : `minmax(0, largeur)` |
| A4 | Breakpoint mobile | 768px, pas 640px. Règle des 600px de la grille Liens conservée |
| A5 | Menu utilisateur | Inchangé : Administration (admins seulement), Paramètres, Mon profil, Déconnexion |
| A6 | Thème | Bouton clair/sombre dans toutes les top bars, même si des maquettes l'omettent |
| A7 | `09-admin` | Le badge « Administration » près de l'avatar est une erreur de maquette, à ne pas implémenter |
| A8 | Icônes | Material Symbols Outlined, graisse 300, FILL 0, police réduite au strict nécessaire. Mêmes noms, pas de reprise en base. `printer` devient `print` dans le sélecteur, avec vérification des catégories qui stockent cette valeur |
| A9 | Polices | Inter et icônes auto-hébergées, plus aucune dépendance à Google Fonts |
| A10 | Tuiles de liens | Favicons réels conservés, monogramme uniquement sans favicon |
| A11 | Catégorie de recette | Autocomplétion conservée, avec l'apparence de la maquette `17-recipe-editor`. La liste fermée de la maquette est écartée, avec ou sans entrée « Nouvelle catégorie… » : elle empêcherait de créer une catégorie, faute d'écran de gestion |
| A12 | Mobile existant | Navigation basse et cartes Admin existent déjà : il s'agit de restylage. La navigation basse reste visible sur Notes et Profil |
| A13 | Version | Fin de l'Epic 9 = 1.0.0. Dernier commit de la story 9-8 en `feat!:`, autres stories en `feat:`. Epics 8 et 10 ensuite en versions mineures |
| A14 | États sans maquette | Squelettes de chargement, délai dépassé Trilium, erreur générique de la vue publique : structure inchangée, tokens Ember appliqués, validation de Manu à la revue de la story |
| A15 | Thème clair | Seules `02-alight`, `11-public-recipe` et `12-expired` sont en clair. Les tokens clairs s'appliquent aux 27 autres écrans, et la vérification manuelle couvre les deux thèmes |
| A16 | Animations | Réglage ajouté à la demande de Manu, seule exception au périmètre « aucun changement fonctionnel ». Interrupteur « Animations » dans `/settings`, dans une carte « Affichage » placée sous la carte Notes, au style de `07-settings`. Activé par défaut. Il démarre désactivé seulement si le système demande de réduire les animations et que l'utilisateur n'a encore rien choisi. Une fois l'interrupteur actionné, ce choix prime. Mémorisé dans le navigateur (`localStorage`), comme le thème, sans backend. La carte n'a pas de maquette : validation de Manu à la revue de la story |

---

## Section 2 — Analyse d'impact

### 2.1 Checklist

| Item | Statut | Constat |
|---|---|---|
| 1.1 Déclencheur | [x] | Aucune story déclencheuse, décision de Manu avant la 1.0.0 |
| 1.2 Problème | [x] | Nouvelle exigence, visuelle uniquement |
| 1.3 Preuves | [x] | 2 passations, 38 maquettes, logo et icônes livrés |
| 2.1 Epic en cours | [x] | Epic 7 terminé, à clôturer. `epic-7: done` figure déjà dans le `sprint-status.yaml` local non commité |
| 2.2 Changements d'epic | [!] | Création des Epics 9 et 10 |
| 2.3 Epics futurs | [!] | Epic 8 reste en backlog, reporté après la refonte |
| 2.4 Epics rendus obsolètes | [N/A] | Aucun |
| 2.5 Ordre | [!] | Ordre d'exécution : Epic 9, puis Epics 8 et 10 |
| 3.1 PRD | [!] | Nouvelles FR50 et FR51. L'exigence de contraste AA reste inchangée (A1) |
| 3.2 Architecture | [N/A] | Aucun impact sur les composants, données ou API. Le thème reste `mat.theme()` et les overrides `--mat-sys-*` |
| 3.3 UX | [!] | Couleurs, typographie, motion, références aux maquettes |
| 3.4 Autres artefacts | [!] | `index.html`, `manifest.webmanifest`, `ngsw-config.json`, traités en story 9-1. CD inchangé |
| 4.1 Ajustement direct | Viable | Effort moyen, risque faible |
| 4.2 Rollback | Non viable | Rien à annuler |
| 4.3 Revue du MVP | Non viable | Le périmètre fonctionnel ne change pas |
| 4.4 Option retenue | [x] | Ajustement direct : ajout de deux epics |

### 2.2 Points relevés dans le code et les documents

1. **Contraste (NFR Accessibilité).** La passation (§2.4) annonce des contrastes AA vérifiés, mais six combinaisons des maquettes passent sous 4,5:1 : boutons pleins et texte sur fond rosé en sombre, texte rouge sur fond de page, sur surface interne et sur fond rosé (carte et page) en clair. La variante AA (A1) les corrige toutes, sans exception à tracer. Elle ajoute deux tokens, et `mat-flat-button` doit être branché sur `--color-primary-fill`, car `--mat-sys-primary` reste `#F0433A` en sombre.
2. **Police d'icônes réduite.** Le sélecteur propose **490 icônes** (`frontend/public/material-icons.json`), choisies librement par l'utilisateur. Le « strict nécessaire » comprend donc ces 490 noms et ceux de l'interface, sinon le sélecteur casse.
3. **Noms d'icônes.** `printer` n'est pas un nom Material valide. D'autres noms du fichier peuvent ne pas exister dans Material Symbols : la story 9-1 contrôle les 490 noms un par un.
4. **`mat-icon` et E2E.** Le texte de ligature reste identique et seule la classe de police par défaut change. Les sélecteurs E2E du type `mat-icon:has-text("home")` restent valides.
5. **Version (vérifié dans `.github/workflows/cd.yml`).** Le dernier tag est `v0.4.3`. Le CD applique `^feat!:|BREAKING CHANGE` aux sujets de commit, et `semver -i major` donne bien `1.0.0`. Deux conditions : fusion sans squash pour préserver le sujet `feat!:`, et aucun autre sujet de commit contenant « BREAKING CHANGE » avant la story 9-8.
6. **Versions intermédiaires.** Si `develop` est fusionné dans `main` pendant l'Epic 9, chaque release intermédiaire sera une mineure (0.5.0, 0.6.0…). La 1.0.0 arrive dans tous les cas avec la story 9-8.
7. **PWA.** `ngsw-config.json` met déjà en cache `woff2`. En revanche, `index.html` et `ngsw-config.json` référencent `favicon.ico`, absent du lot `brand/`, et le manifest déclare 8 tailles d'icônes contre 2 livrées.
8. **Documentation de la grille.** La spec UX décrit `minmax(largeur, 1fr)` alors que le code utilise `minmax(0, largeur)`. La spec est alignée sur le code (A3).
9. **`brand/icon-light.svg`.** Sa suppression est sans risque : aucune référence dans `frontend/`.
10. **Passation mobile.** Quatre points sont remplacés par les arbitrages : breakpoint 640px (A4), navigation basse présentée comme nouvelle (A12), icônes en SVG inline (A8), liste des écrans où la navigation reste visible (A12).
11. **`package-lock.json`.** Sa modification locale est sans rapport avec la refonte et reste hors du commit.
12. **Catégories de recettes orphelines.** Une catégorie n'est jamais supprimée, même quand plus aucune recette ne l'utilise : elle reste à vie dans les suggestions de l'éditeur, sans moyen de l'effacer. Manu retient une correction côté serveur, hors Epic 9 : suppression automatique de la catégorie quand sa dernière recette est supprimée ou change de catégorie, dans la même transaction. Petite PR `fix:` séparée, sur sa propre branche `fix/*`.

### 2.3 Couverture des maquettes desktop

| Story | Maquettes | Nb |
|---|---|---|
| 9-2 | `23-confirm`, `24-user-menu` | 2 |
| 9-3 | `01-main`, `02-alight`, `04-grid-settings`, `25-liens-vide` | 4 |
| 9-4 | `03-edit`, `18-link-dialog`, `19-category-dialog`, `20-icon-picker` | 4 |
| 9-5 | `05-recipes`, `06-recipe-detail`, `17-recipe-editor`, `26-recettes-vide`, `27-recettes-sans-resultat` | 5 |
| 9-6 | `10-share`, `11-public-recipe`, `12-expired` | 3 |
| 9-7 | `07-settings`, `08-notes-configure`, `08-notes-vide`, `09-admin`, `13-login`, `14-mdp-force`, `15-mdp-compte`, `16-profile`, `21a-user-form`, `21b-user-created`, `22a-reset-confirm`, `22b-reset-done` | 12 |
| **Total** | | **30** |

Les stories 9-1 et 9-8 n'ont pas de maquette propre.

---

## Section 3 — Approche recommandée

**Ajustement direct.** La refonte s'ajoute au plan sous forme de deux nouveaux epics, sans modifier les stories livrées.

- **Effort :** moyen (8 stories desktop, puis 11 stories mobiles dont une optionnelle).
- **Risque :** faible côté fonctionnel. Le risque principal est la régression visuelle, couverte par une vérification manuelle par story.
- **Impact sur le planning :** l'Epic 8 passe après l'Epic 9.
- **Stories existantes :** leurs critères d'acceptation restent une trace historique. Les valeurs visuelles qu'ils citent sont remplacées par l'Epic 9.

---

## Section 4 — Modifications détaillées

### 4.1 `prd.md`

**Section « Personnalisation et expérience », ajout après FR49 :**

> - **FR50** : Recherche / navigation rapide (command palette) : un utilisateur peut filtrer ses liens et recettes et naviguer entre modules depuis une barre unique. *Affordance désactivée en V1 (Epic 9, story 9.3) : champ visible, inactif, sans logique de recherche ni raccourci `⌘K` actif. Comportement livré plus tard, non planifié.*
> - **FR51** : Un utilisateur peut activer ou désactiver les animations de l'interface depuis la page Paramètres. Activées par défaut, sauf si le système demande de réduire les animations et que l'utilisateur n'a encore rien choisi. Le choix est persisté dans localStorage (par device, par navigateur).

**Section « Accessibilité » :** inchangée. La variante AA (A1) respecte l'exigence existante.

**Justification :** FR50 trace le besoin sans bloquer la livraison. FR51 trace le réglage demandé par Manu (A16). Le MVP n'est pas modifié.

### 4.2 `ux-design-Dashboard.md`

| Section | Modification |
|---|---|
| Customization Strategy, ligne Typography | `police système` devient `Inter auto-hébergée, voir Typography System` |
| Design Direction Decision | Ajout en tête : « Remplacée par la direction Ember (Sprint Change Proposal 2026-11-09). Le contenu ci-dessous reste à titre historique » |
| Color System | Remplacé par la palette Ember ci-dessous. L'ancienne palette sort du document |
| Typography System | Remplacé (voir ci-dessous) |
| Spacing & Layout | Top bar 60px (56px en vue publique), rayon de carte 16px, rayons internes 10 à 13px, tuile favicon 26×26px rayon 7px |
| Navigation Patterns, Top bar | Fond et hairline Ember, onglet actif `--color-primary-soft` + texte principal. Bouton clair/sombre dans toutes les top bars |
| Accessibility Strategy, contrastes | Tableau recalculé sur les valeurs Ember de la variante AA |
| Testing Strategy | « Axe : zéro violation critique et zéro violation de contraste » (axe classe le contraste en « serious », pas en « critical ») |
| Implementation Guidelines, grille | `repeat(var(--link-columns, 3), minmax(0, var(--link-card-width, 280px)))` |
| UX-DR28 | Menu utilisateur à 4 entrées, Administration réservée aux admins |
| UX-DR28 et UX-DR29 | Ajout des références aux maquettes `07`, `08-notes-configure`, `08-notes-vide` |
| Nouvelles sections | « Motion et micro-interactions » et « Références des maquettes Ember » |

**Palette Ember :**

| Token | Thème clair | Thème sombre |
|---|---|---|
| `--color-background` | `#F2F1EF` | `#09090B` |
| `--color-surface` | `#FFFFFF` | `#141417` |
| `--color-surface-2` | `#F6F5F3` | `#1B1B1F` |
| `--color-divider` | `rgba(22,22,26,.10)` | `rgba(255,255,255,.08)` |
| `--color-border-strong` | `rgba(22,22,26,.18)` | `rgba(255,255,255,.16)` |
| `--color-text-primary` | `#1A1A1D` | `#EDEDEF` |
| `--color-text-secondary` | `#64646C` | `#9A9AA2` |
| `--color-primary` | `#CD3228` | `#F0433A` |
| `--color-primary-fill` (fond des boutons pleins) | `#CD3228` | `#D83C34` |
| `--color-primary-soft` | `rgba(214,52,42,.10)` | `rgba(240,67,58,.14)` |
| `--color-on-primary-soft` (texte sur fond rosé) | `#B82D24` | `#F1524A` |
| `--color-success` | `#15803D` | `#4ADE80` |
| `--card-shadow` | `0 20px 44px -24px rgba(18,18,24,.24)` | `0 18px 40px -22px rgba(0,0,0,.7)` |
| `--color-error`, `--color-warning`, `--color-on-primary` | Valeurs actuelles conservées | Valeurs actuelles conservées |

Les noms existants (`--color-text-primary`, `--color-text-secondary`, `--color-divider`) sont gardés pour éviter de toucher aux composants qui les consomment.

**Overrides Material :**

| Token | Thème clair | Thème sombre |
|---|---|---|
| `--mat-sys-primary` | `#CD3228` | `#F0433A` |
| Fond de `mat-flat-button` | `var(--color-primary-fill)` | `var(--color-primary-fill)` |
| `--mat-sys-surface-container` | `#FFFFFF` | `#141417` |
| `--mat-sys-surface-container-low` | `#FAFAFA` | `#1B1B1F` |
| `--mat-sys-surface-container-high` | `#F0F0F0` | `#222222` |
| `--mat-sys-surface-container-highest` | `#E8E8E8` | `#2A2A2A` |

**Typographie :** Inter auto-hébergée en `woff2`, poids 400/500/600/700, `font-display: swap`, fallback système. Titre d'application 16px/700, titre de catégorie 15px/600, lien 14px/400, label secondaire 11 à 13px, compteurs en `ui-monospace` 11px.

**Icônes :** Material Symbols Outlined auto-hébergée, graisse 300, FILL 0.

**Motion :**

| Interaction | Spécification |
|---|---|
| Apparition des cartes | Fondu + `translateY(10px)` vers 0, cascade d'environ 60ms par carte, `cubic-bezier(.2,.7,.2,1)`, environ 500ms |
| Survol de carte | `translateY(-3px)` + `--card-shadow` + anneau `0 0 0 1px var(--color-primary-soft)`, 200ms |
| Survol de lien | Fond `--color-surface-2` + tick d'accent à gauche, `scaleY(0)` vers 1, 180ms |
| Drag & drop | Fantôme `rotate(-3deg) scale(1.03)` + ombre forte ; zone cible `0 0 0 1px primary, 0 0 0 7px primary-soft` ; placeholder en pointillé accent |
| Transitions génériques | 140 à 200ms, jamais plus de 250ms |
| Réglage « Animations » (FR51) | Désactivé, les animations et transitions ci-dessus sont neutralisées et l'état final s'affiche directement |

**Références des maquettes :** reprise du tableau de la section 2.3, complété par les maquettes mobiles rattachées à l'Epic 10 et par les états sans maquette (A14).

### 4.3 `epics.md`

**Requirements Inventory, ajouts :**

- `FR50` et `FR51` dans Functional Requirements (même texte que le PRD).
- `UX-DR30` : design system Ember (tokens, overrides Material, Inter, Material Symbols, logo), remplace les valeurs visuelles de UX-DR1, UX-DR2 et UX-DR3.
- `UX-DR31` : micro-interactions Ember (cascade, survol, drag & drop stylé).
- `UX-DR32` : barre de recherche `⌘K` en affordance désactivée.
- `UX-DR33` : adaptation mobile Ember (échelle typographique, barres collantes, navigation basse restylée).

**FR Coverage Map, ajout :**

| FR | Épic | Description courte |
|----|------|--------------------|
| FR50 | Épic 9 (affordance seule) | Recherche / navigation rapide, comportement non planifié |
| FR51 | Épic 9 (story 9.7) | Réglage des animations dans Paramètres |

**Epic List, ajouts à la suite de l'Epic 8 :**

> ### Epic 9 : Refonte visuelle Ember (desktop)
> L'application adopte la direction visuelle Ember sur desktop, à fonctionnalités strictement identiques. La fin de cet epic amène la version 1.0.0.
> **FRs couverts :** FR50 (affordance seule), FR51
> **UX-DRs :** UX-DR30, UX-DR31, UX-DR32
>
> ### Epic 10 : Conversion mobile Ember
> L'application offre une expérience mobile pensée pour le pouce, dans le style Ember. Backlog, après l'Epic 9.
> **UX-DRs :** UX-DR33

**Note ajoutée à l'Epic 8 :**

> **Report (Sprint Change Proposal 2026-11-09) :** Epic reporté après la refonte Ember (Epic 9). Il sort après la 1.0.0, en version mineure.

**Epics ajoutés en fin de document :**

## Epic 9 : Refonte visuelle Ember (desktop)

L'application adopte la direction visuelle Ember sur desktop : tokens, typographie, logo, micro-interactions et habillage de tous les écrans. Aucun changement fonctionnel, à l'exception du réglage des animations (FR51), aucune refonte de la structure du code.

> **Origine :** Sprint Change Proposal 2026-11-09.

**Règles communes à toutes les stories :**

- Les maquettes de `refonte-ember/` sont la référence visuelle, et les arbitrages de la proposition priment sur les passations.
- Aucune modification du backend, de l'API, des routes ou des règles métier.
- Sur un écran sans maquette, ne pas improviser : demander à Manu. Exception : les états listés dans A14 suivent la règle « structure inchangée, tokens Ember, validation à la revue ».
- Les E2E existants restent verts. Ils ne contrôlent pas le visuel : chaque story comporte une vérification manuelle aux maquettes, dans les deux thèmes.
- Sujet de commit en `feat:` sans scope, sauf le dernier commit de la story 9-8.

### Story 9.1 : Fondations Ember

En tant qu'utilisateur,
Je veux que l'application repose sur les tokens, polices, icônes et le logo Ember, sans dépendance externe,
Afin que tous les écrans partagent une même base visuelle.

**Critères d'acceptation :**

**Étant donné** que `styles.scss` est chargé,
**Quand** j'inspecte les deux thèmes,
**Alors** les tokens et overrides `--mat-sys-*` correspondent à la spec UX, `--color-error`, `--color-warning` et `--color-on-primary` restent définis, et les surfaces Material sont neutres

**Étant donné** que l'application charge,
**Quand** j'inspecte les requêtes réseau,
**Alors** aucune requête ne part vers `fonts.googleapis.com` ou `fonts.gstatic.com`, et les balises correspondantes ont disparu de `index.html`

**Étant donné** que le texte s'affiche,
**Quand** j'inspecte la police,
**Alors** Inter est servie depuis l'application (400/500/600/700, `woff2`, `font-display: swap`) et `mat.theme()` l'utilise

**Étant donné** qu'un `mat-icon` s'affiche,
**Quand** j'inspecte son rendu,
**Alors** il utilise Material Symbols Outlined auto-hébergée, graisse 300, FILL 0, sans changement des noms d'icônes dans les templates ni en base

**Étant donné** que la police d'icônes est réduite,
**Quand** je contrôle son contenu,
**Alors** elle contient les noms de `material-icons.json` et ceux utilisés par l'interface, et chaque nom absent de Material Symbols est signalé à Manu

**Étant donné** que `printer` n'est pas un nom valide,
**Quand** le sélecteur est mis à jour,
**Alors** il propose `print`, et la présence de la valeur `printer` dans les catégories existantes est vérifiée et remontée à Manu, sans reprise automatique en base

**Étant donné** que le logo Ember est livré dans `brand/`,
**Quand** j'inspecte `index.html`, le manifest et `ngsw-config.json`,
**Alors** favicons, `apple-touch-icon` et icônes PWA proviennent du nouveau lot, aucune référence à un fichier supprimé ne subsiste, et `theme-color` vaut `#F2F1EF`

**Étant donné** que l'application est installée en PWA,
**Quand** je l'ouvre sans réseau après une première visite,
**Alors** l'app shell s'affiche sans erreur

### Story 9.2 : Coque de l'application

En tant qu'utilisateur,
Je veux une top bar, une navigation, un menu utilisateur, des snackbars et des dialogs de confirmation au style Ember,
Afin de retrouver la même identité sur toutes les pages.

**Maquettes :** `23-confirm`, `24-user-menu` (top bar visible sur toutes les maquettes).

**Critères d'acceptation :**

**Étant donné** que je suis authentifié sur desktop,
**Quand** je regarde la top bar,
**Alors** elle mesure 60px avec bordure basse hairline, affiche le logo `icon-app.svg` et « Dashboard », et l'onglet actif a le fond `--color-primary-soft`

**Étant donné** que je suis sur n'importe quelle page dotée d'une top bar,
**Quand** je la regarde,
**Alors** le bouton clair/sombre est présent

**Étant donné** que j'ouvre le menu utilisateur,
**Quand** il s'affiche,
**Alors** il contient Administration (admins seulement), Paramètres, Mon profil et Déconnexion, conformément à `24-user-menu`

**Étant donné** qu'une action affiche un snackbar ou une confirmation destructive,
**Quand** il apparaît,
**Alors** son style correspond aux maquettes, sans changement de texte ni de durée

### Story 9.3 : Liens en lecture

En tant qu'utilisateur,
Je veux des cartes de liens au style Ember avec cascade et survol,
Afin que ma page d'accueil soit agréable à consulter au quotidien.

**Maquettes :** `01-main`, `02-alight`, `04-grid-settings`, `25-liens-vide`.

**Critères d'acceptation :**

**Étant donné** que la page Liens charge,
**Quand** les cartes apparaissent,
**Alors** elles arrivent en cascade et réagissent au survol selon la spec Motion

**Étant donné** qu'un lien possède un favicon,
**Quand** il s'affiche,
**Alors** le favicon réel figure dans la tuile, et le monogramme n'apparaît qu'en son absence

**Étant donné** que je regarde la barre de recherche `⌘K`,
**Quand** j'essaie de l'utiliser,
**Alors** le champ est désactivé, sans logique de recherche, sans raccourci clavier actif, sans handler ni faux résultat (FR50)

**Étant donné** que j'ouvre le widget de grille,
**Quand** je modifie un réglage,
**Alors** le comportement reste identique, avec écart par défaut de 16px, CSS `minmax(0, largeur)` et règle des 600px conservés

**Étant donné** que je n'ai aucun lien ou que les données chargent,
**Quand** la page s'affiche,
**Alors** l'état vide suit `25-liens-vide`, et les squelettes appliquent les tokens Ember (A14)

### Story 9.4 : Liens en édition

En tant qu'utilisateur,
Je veux un mode édition Ember avec un drag & drop stylé,
Afin d'organiser mes liens avec un retour visuel clair.

**Maquettes :** `03-edit`, `18-link-dialog`, `19-category-dialog`, `20-icon-picker`.

**Critères d'acceptation :**

**Étant donné** que je glisse un lien,
**Quand** il survole une catégorie,
**Alors** fantôme, zone de drop et placeholder suivent la spec Motion

**Étant donné** que le drop réussit ou échoue,
**Quand** le résultat arrive,
**Alors** le comportement reste identique (snackbar 3s, retour à la source en cas d'erreur)

**Étant donné** que j'ouvre les dialogs de lien, de catégorie ou le sélecteur d'icônes,
**Quand** ils s'affichent,
**Alors** leur style correspond aux maquettes, à champs et validations identiques

### Story 9.5 : Recettes

En tant qu'utilisateur,
Je veux les écrans Recettes au style Ember,
Afin de bénéficier de la même identité dans tout le module.

**Maquettes :** `05-recipes`, `06-recipe-detail`, `17-recipe-editor`, `26-recettes-vide`, `27-recettes-sans-resultat`.

**Critères d'acceptation :**

**Étant donné** que j'ouvre la liste, la recherche sans résultat ou l'état vide,
**Quand** l'écran s'affiche,
**Alors** il correspond à sa maquette, et les squelettes appliquent les tokens Ember (A14)

**Étant donné** que j'utilise le stepper convives sur le détail,
**Quand** je change la valeur,
**Alors** le recalcul reste identique et le rendu correspond à `06-recipe-detail`

**Étant donné** que je saisis une catégorie dans l'éditeur,
**Quand** je tape ou ouvre le champ,
**Alors** l'autocomplétion reste active, avec création libre d'une catégorie, et l'apparence suit `17-recipe-editor`

**Étant donné** que je réorganise ingrédients et étapes,
**Quand** je les déplace,
**Alors** le comportement reste identique

### Story 9.6 : Partage et vues publiques

En tant que visiteur ou propriétaire d'une recette,
Je veux des écrans de partage au style Ember,
Afin que l'expérience reste soignée et sans friction.

**Maquettes :** `10-share`, `11-public-recipe`, `12-expired`.

**Critères d'acceptation :**

**Étant donné** que j'ouvre le dialog de partage,
**Quand** il s'affiche,
**Alors** il correspond à `10-share`, à fonctionnement identique

**Étant donné** qu'un visiteur ouvre un lien valide,
**Quand** la page s'affiche,
**Alors** elle correspond à `11-public-recipe` avec mini top bar de 56px, sans aucune navigation interne

**Étant donné** qu'un lien est expiré ou qu'une erreur survient,
**Quand** la page s'affiche,
**Alors** le lien expiré suit `12-expired`, et l'erreur générique applique les tokens Ember (A14)

### Story 9.7 : Notes, Paramètres, Admin, Login, mots de passe et Profil

En tant qu'utilisateur,
Je veux tous les écrans restants au style Ember,
Afin que la refonte soit complète sur desktop.

**Maquettes :** `07-settings`, `08-notes-configure`, `08-notes-vide`, `09-admin`, `13-login`, `14-mdp-force`, `15-mdp-compte`, `16-profile`, `21a-user-form`, `21b-user-created`, `22a-reset-confirm`, `22b-reset-done`.

**Critères d'acceptation :**

**Étant donné** que j'ouvre l'un de ces écrans ou dialogs,
**Quand** il s'affiche,
**Alors** il correspond à sa maquette, à champs, messages et validations identiques

**Étant donné** que j'ouvre `/admin`,
**Quand** la top bar s'affiche,
**Alors** aucun badge « Administration » ne figure près de l'avatar

**Étant donné** que j'ouvre `/settings`,
**Quand** la page s'affiche,
**Alors** une carte « Affichage », sous la carte Notes et au même style, propose un interrupteur « Animations » (A16, validation de Manu à la revue)

**Étant donné** que je n'ai encore rien choisi,
**Quand** l'application démarre,
**Alors** les animations sont actives, sauf si le système demande de les réduire

**Étant donné** que je change l'interrupteur « Animations »,
**Quand** je recharge l'application dans le même navigateur,
**Alors** mon choix est conservé et prime sur le réglage du système (FR51)

**Étant donné** que l'iframe Trilium dépasse le délai de chargement,
**Quand** l'état s'affiche,
**Alors** il applique les tokens Ember (A14)

### Story 9.8 : Finitions, accessibilité, parité et non-régression

En tant que porteur du projet,
Je veux contrôler l'ensemble de la refonte avant la 1.0.0,
Afin de livrer une version stable et cohérente.

**Critères d'acceptation :**

**Étant donné** que toutes les stories 9.1 à 9.7 sont terminées,
**Quand** je lance la suite Playwright existante,
**Alors** tous les E2E sont verts

**Étant donné** que j'audite l'application avec Axe,
**Quand** je consulte le rapport,
**Alors** il n'y a aucune violation critique ni aucune violation de contraste

**Étant donné** que je navigue au clavier,
**Quand** je parcours les écrans,
**Alors** le focus reste visible et les `aria-label` et `aria-expanded` sont présents

**Étant donné** que je compare Chrome et Firefox desktop,
**Quand** je parcours les écrans dans les deux thèmes,
**Alors** le rendu est équivalent

**Étant donné** que le réglage « Animations » est désactivé, par choix ou parce que le système demande de les réduire sans choix de l'utilisateur,
**Quand** les animations Ember devraient jouer,
**Alors** elles sont neutralisées

**Étant donné** que la story est terminée,
**Quand** son dernier commit est créé,
**Alors** son sujet commence par `feat!:` et sa fusion préserve ce sujet, afin que le CD produise la version 1.0.0

---

## Epic 10 : Conversion mobile Ember

L'application offre une expérience mobile pensée pour le pouce, dans le style Ember : échelle typographique réduite, cibles tactiles d'au moins 44px, barres d'action collantes. Epic en backlog, à lancer après l'Epic 9. Il sort en version mineure (`feat:`).

> **Origine :** Sprint Change Proposal 2026-11-09, d'après `mobile/passation-mobile-Dashboard.md`.

**À trancher au lancement de l'epic :**

1. Titres de page réduits et titres de recette déplacés dans la top bar.
2. Barre de navigation basse persistante au lieu de scroller.
3. Tableau admin en cartes.
4. Barre `Enregistrer` / `Annuler` collante sur l'éditeur, navigation masquée pendant l'édition.
5. Actions de détail remontées dans la top bar.
6. Login et vue publique sans barre de navigation.
7. Boutons primaires pleine largeur sur les sous-pages.
8. Écrans mobiles sans maquette : Notes, Profil, dialogs.

**Corrections déjà actées par rapport à la passation mobile :** breakpoint 768px, règle des 600px de la grille Liens conservée, icônes en Material Symbols, navigation basse et cartes Admin déjà présentes, navigation basse visible sur Notes et Profil.

Les critères d'acceptation détaillés seront écrits au lancement de l'epic, une fois ces points tranchés.

### Story 10.0 : Breakpoint mobile et shell
Mise en place du shell mobile à 768px, `viewport-fit=cover` et safe areas. Socle de l'epic.

### Story 10.1 : Restylage de la navigation basse
Restylage du composant existant (hauteur, état actif, safe area). Dépend de 10.0.

### Story 10.2 : Liens mobile
Maquette `m1-accueil` : 1 colonne, cartes accordéon, titre réduit, bouton Modifier compact. Dépend de 10.0 et 10.1.

### Story 10.3 : Liste des recettes mobile
Maquette `m2-recettes` : recherche pleine largeur, groupes, lignes de recette. Dépend de 10.0 et 10.1.

### Story 10.4 : Détail de recette mobile
Maquette `m3-recipe-detail` : titre en top bar, actions-icônes, image 16:9, stepper. Dépend de 10.0 et 10.1.

### Story 10.5 : Éditeur de recette mobile
Maquette `m4-recipe-editor` : champs empilés, barre Enregistrer collante, navigation masquée. Dépend de 10.0.

### Story 10.6 : Restylage des cartes Admin mobiles
Maquette `m5-admin` : restylage des cartes existantes. Dépend de 10.0 et 10.1.

### Story 10.7 : Paramètres mobile
Maquette `m6-settings` : carte Notes/Trilium, toggle, Tester et Sauvegarder. Dépend de 10.0 et 10.1.

### Story 10.8 : Login mobile
Maquette `m7-login` : logo centré, champs de 50px, CTA pleine largeur, navigation masquée. Dépend de 10.0.

### Story 10.9 : Vue publique mobile
Maquette `m8-public-recipe` : lecture seule. Dépend de 10.0.

### Story 10.10 (optionnelle) : Dialogs en bottom sheets
Ajout de lien, partage et confirmations en bottom sheets. Dépend de 10.0.

### 4.4 `sprint-status.yaml`

Epic 7 : `epic-7: done`, déjà présent dans la copie locale. Mise à jour de `last_updated` et ajouts à la fin :

```yaml
  # ── Epic 8 : reporté après la refonte Ember (Sprint Change Proposal 2026-11-09)

  # ── Epic 9 : Refonte visuelle Ember (desktop) ─────────────────────────────
  epic-9: backlog
  9-1-fondations-tokens-polices-icones-pwa: backlog
  9-2-coque-navigation-menu-snackbars-confirmations: backlog
  9-3-liens-lecture: backlog
  9-4-liens-edition: backlog
  9-5-recettes: backlog
  9-6-partage-et-vues-publiques: backlog
  9-7-notes-parametres-admin-login-profil: backlog
  9-8-finitions-accessibilite-parite-e2e: backlog
  epic-9-retrospective: optional

  # ── Epic 10 : Conversion mobile Ember ─────────────────────────────────────
  epic-10: backlog
  10-0-breakpoint-mobile-et-shell: backlog
  10-1-restylage-navigation-basse: backlog
  10-2-liens-mobile: backlog
  10-3-liste-recettes-mobile: backlog
  10-4-detail-recette-mobile: backlog
  10-5-editeur-recette-mobile: backlog
  10-6-restylage-cartes-admin-mobile: backlog
  10-7-parametres-mobile: backlog
  10-8-login-mobile: backlog
  10-9-vue-publique-mobile: backlog
  10-10-dialogs-bottom-sheets-optionnel: backlog
  epic-10-retrospective: optional
```

Le commentaire de l'Epic 8 est placé sur son en-tête existant, sans modifier ses stories.

### 4.5 `architecture.md`

Aucune modification.

---

## Section 5 — Transmission pour l'implémentation

**Classification :** Modéré (réorganisation du backlog).

| Rôle | Responsabilité |
|---|---|
| Correct Course (cette session) | Appliquer les sections 4.1 à 4.4 après approbation, sur `docs/refonte-ember`, sans commit |
| Manu | Valider le contenu, autoriser le commit et la PR vers `develop` |
| `bmad-build` | Implémenter les stories 9-1 à 9-8 dans l'ordre, chacune sur sa branche `feat/*` |
| Manu | Vérification visuelle manuelle de chaque story aux maquettes, dans les deux thèmes |
| Hors Epic 9 | Correctif `fix:` des catégories de recettes orphelines (point 12 de la section 2.2), sur une branche `fix/*` séparée |

**Ordre :** 9-1 d'abord (bloquante), puis 9-2, 9-3 à 9-7 dans un ordre libre, 9-8 en dernier.

**Critères de succès :**

- Tous les écrans desktop correspondent à leur maquette, dans les deux thèmes.
- Aucune requête vers Google Fonts.
- E2E existants verts, FR1 à FR49 inchangées.
- Version 1.0.0 produite par le CD à la fin de l'Epic 9.
