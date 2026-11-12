---
title: "Passation — Refonte visuelle Dashboard (Direction A « Ember »)"
type: "design-handoff"
status: "ready"
date: "2026-11-06"
author: "Manu"
scope: "Refonte visuelle uniquement — aucun changement de périmètre fonctionnel"
source: "Canvas Design « Refonte Dashboard » (13 artboards, clair + sombre)"
consumers: ["agent-architecte (mise à jour specs)", "agent-dev (implémentation)"]
---

# Passation — Refonte visuelle Dashboard

## 0. Résumé & intention

Le design actuel (skills Claude par défaut, Angular Material brut) est jugé trop générique. On adopte une **direction visuelle « Ember »** : esthétique outil de dev moderne (inspiration Linear / Raycast), sobre, nette, avec la **braise rouge** conservée comme accent unique. Grosses cartes avec relief au survol, apparition en cascade, micro-interactions soignées.

**Important :** c'est une refonte **purement visuelle + micro-interactions**. Les exigences fonctionnelles (FR1–FR49) du PRD **ne changent pas**. On garde Angular Material comme socle, les deux thèmes clair/sombre, les deux breakpoints.

**Thèmes :** clair **et** sombre maintenus, togglables, persistés. Le thème clair a été retravaillé en **neutre froid** (fond blanc cassé `#F2F1EF`, cartes blanches) — on abandonne les surfaces rosées générées par Angular Material 3.

**Référence visuelle :** canvas Design « Refonte Dashboard ». Les artboards sont nommés ci-dessous (ex. `Main` = Liens sombre, `ALight` = Liens clair, etc.). Le canvas est la source de vérité visuelle ; ce document en extrait les valeurs.

---

## 1. Partie AGENT ARCHITECTE — sections de specs à mettre à jour

Documents concernés : `ux-design-Dashboard.md` (surtout) et, à la marge, `prd.md`.

### 1.1 Système de couleurs — à REMPLACER

La section « Visual Design Foundation › Color System » (palette « Braise Profonde » + overrides AM3) est remplacée par la palette **Ember** ci-dessous (§2.1). Points clés du changement :

- **Accent** : `#F0433A` (sombre) / `#D6342A` (clair) — rouge pur, plus vif et légèrement plus orangé que l'ancien `#EF4444` / `#B71C1C`.
- **Fond clair neutre** : `#F2F1EF` (blanc cassé froid) au lieu des surfaces teintées. Les overrides `--mat-sys-surface-container-*` doivent pointer sur des **neutres purs** (voir §2.1), ce qui règle définitivement le problème des « fonds rosés ».
- **Fond sombre** : `#09090B` (quasi-noir) / surfaces `#141417` / `#1B1B1F`.
- Les tokens `--color-warning` / `--color-success` restent valables ; on ajoute `--color-success` = `#15803D` (clair) / `#4ADE80` (sombre), utilisé pour les retours positifs (test de connexion, lien actif).

### 1.2 Typographie — à METTRE À JOUR

La section « Typography System » passe de « police système » à **Inter** (titres + corps) avec fallback système.

- **DÉCIDÉ (Manu) :** on part sur **Inter**, **self-hébergée** en `woff2` (pas de `<link>` Google Fonts en prod) pour rester cohérent avec le principe « aucune dépendance externe ». Prévoir les poids 400/500/600/700, `font-display: swap`, et un fallback système de métriques proches. Les maquettes chargent Inter depuis Google Fonts uniquement pour la démo.
- Garder l'échelle typographique Material.

### 1.3 Navigation / recherche — DÉCIDÉ : barre conservée en V1 (affordance seule)

Les maquettes introduisent une **barre de recherche type command-palette** (champ + raccourci `⌘K`) en haut de la page Liens.

➡️ **Décision (Manu) :** on **garde la barre dès la V1**, même si la recherche n'est **pas fonctionnelle immédiatement**. Elle est présente comme affordance visuelle (placeholder « Rechercher un lien, une recette… » + badge `⌘K`), **champ inactif/désactivé** dans un premier temps, le comportement réel (filtrage inter-modules, palette de navigation) arrivant en V1.x.
- **Architecte :** créer une FR dédiée « Recherche / navigation rapide (command palette) », marquée *affordance en V1, comportement en V1.x*, pour tracer le besoin sans bloquer la livraison.
- **Dev :** intégrer le champ dans la top-zone de Liens, visuellement complet mais **sans logique de recherche** (input `disabled` ou lecture seule), **sans raccourci `⌘K` actif** pour l'instant. Ne pas laisser de handler mort ni de faux résultats.

### 1.4 Module Notes — CONFORME (rien à changer sur le fond)

Les maquettes `Settings` + `Notes` respectent l'Epic 7 (intégration Trilium via iframe, page `/settings` avec toggle + URL + test de connexion). Le split-pane OneNote / TipTap (Epic 8) reste **hors de cette passation**. Juste mettre à jour les captures/descriptions visuelles (UX-DR28, UX-DR29) pour refléter le style Ember.

### 1.5 Interactions / motion — À AJOUTER à la spec UX

Formaliser les micro-interactions suivantes (détail technique en §3) : apparition en cascade des cartes, relief au survol, surlignage du lien survolé, et le **drag & drop stylé** (fantôme incliné, zone de drop illuminée) — cohérent avec UX-DR26 déjà présent.

### 1.6 Ce qui NE change PAS

- Toutes les exigences fonctionnelles FR1–FR49.
- Angular Material comme design system.
- Deux breakpoints (`<768px` / `≥768px`) + la règle grille Liens 1 colonne forcée sous 600px.
- Le widget ⚙️ de réglage de la grille (FR49 / UX-DR27) — déjà spécifié, les maquettes le confirment à l'identique.
- Stratégie responsive hybride par module (Liens desktop-first, Recettes/Notes/public mobile-first).
- WCAG 2.1 AA (contrastes vérifiés sur la nouvelle palette, voir §2.4).

---

## 2. DESIGN TOKENS (source de vérité pour le dev)

### 2.1 Palette — CSS custom properties

```scss
/* ---- THÈME CLAIR (défaut) ---- */
:root {
  --color-background:        #F2F1EF;  /* fond app */
  --color-surface:           #FFFFFF;  /* cartes */
  --color-surface-2:         #F6F5F3;  /* surfaces internes (tiles, hover, inputs) */
  --color-border:            rgba(22, 22, 26, .10);
  --color-border-strong:     rgba(22, 22, 26, .18);  /* bordure au survol / focus */
  --color-text:              #1A1A1D;
  --color-text-muted:        #64646C;
  --color-primary:           #D6342A;  /* braise */
  --color-primary-soft:      rgba(214, 52, 42, .10); /* fonds d'accent, badges, états actifs */
  --color-success:           #15803D;
  --card-shadow:             0 20px 44px -24px rgba(18, 18, 24, .24);
}

/* ---- THÈME SOMBRE ---- */
.dark-theme {
  --color-background:        #09090B;
  --color-surface:           #141417;
  --color-surface-2:         #1B1B1F;
  --color-border:            rgba(255, 255, 255, .08);
  --color-border-strong:     rgba(255, 255, 255, .16);
  --color-text:              #EDEDEF;
  --color-text-muted:        #9A9AA2;
  --color-primary:           #F0433A;
  --color-primary-soft:      rgba(240, 67, 58, .14);
  --color-success:           #4ADE80;
  --card-shadow:             0 18px 40px -22px rgba(0, 0, 0, .7);
}
```

### 2.2 Mapping Angular Material 3 (overrides `--mat-sys-*`)

Conserver `mat.$red-palette` dans `mat.theme()`, puis forcer les surfaces en **neutres** (c'est ce qui enlève la teinte rosée) :

```scss
:root {
  --mat-sys-primary:                    #D6342A;
  --mat-sys-surface-container:          #FFFFFF; /* cards blanches */
  --mat-sys-surface-container-low:      #FAFAFA;
  --mat-sys-surface-container-high:     #F0F0F0;
  --mat-sys-surface-container-highest:  #E8E8E8;
}
.dark-theme {
  --mat-sys-primary:                    #F0433A;
  --mat-sys-surface-container:          #141417;
  --mat-sys-surface-container-low:      #1B1B1F;
  --mat-sys-surface-container-high:     #222222;
  --mat-sys-surface-container-highest:  #2A2A2A;
}
```
Persistance thème : `localStorage['theme'] = 'dark' | 'light'`, classe `.dark-theme` sur `<body>`, appliquée au bootstrap avant rendu.

### 2.3 Rayons, espacements, typo

| Token | Valeur |
|-------|--------|
| Unité de base | `8px` |
| Rayon carte catégorie | `16px` |
| Rayon éléments internes (lien, input, bouton) | `10–13px` |
| Rayon tile favicon | `7px` (26×26px) |
| Hauteur top bar | `60px` (mini top bar publique : `56px`) |
| Gap inter-cartes (défaut) | `20px` (widget grille : 8–48px) |
| Police | Inter (400/500/600/700) + fallback système |
| Titre app (top bar) | 16px / 700 |
| Titre catégorie | 15px / 600 |
| Lien / item | 14px / 400 |
| Label secondaire | 11–13px, `--color-text-muted` |
| Compteurs / meta mono | `ui-monospace` 11px |
| Touch target mini (mobile) | `44×44px` |

### 2.4 Contrastes WCAG AA (vérifiés)

- `#F0433A` sur `#09090B` ≈ 5.3:1 ✓ ; `#D6342A` sur `#FFFFFF` ≈ 4.7:1 ✓
- `#9A9AA2` sur `#09090B` et `#64646C` sur `#F2F1EF` ≥ 4.5:1 ✓
- Accent réservé aux grands éléments / états ; éviter le texte accent < 14px sur fond clair.

---

## 3. MICRO-INTERACTIONS & MOTION (spec d'implémentation)

| Interaction | Spec |
|-------------|------|
| **Apparition des cartes** | fade + `translateY(10px)` → 0, en cascade (`animation-delay` ~60ms par carte), courbe `cubic-bezier(.2,.7,.2,1)`, ~500ms |
| **Survol carte** | `translateY(-3px)` + `--card-shadow` + anneau `0 0 0 1px var(--color-primary-soft)`, transition 200ms |
| **Survol lien** | fond `--color-surface-2` + tick d'accent à gauche (`scaleY(0)`→`1`, 180ms) |
| **Drag & drop (CDK)** | fantôme : `rotate(-3deg) scale(1.03)` + ombre portée forte, léger flottement ; zone de drop cible : bordure + `box-shadow: 0 0 0 1px primary, 0 0 0 7px primary-soft` ; placeholder dans la source : ligne pointillée accent ; après drop : snackbar « Lien déplacé » 3s ; erreur réseau → retour à la source + snackbar d'erreur |
| **Recherche recettes** | debounce 200ms, filtrage client, remplacement de la vue catégorisée par les résultats |
| **Stepper convives** | recalcul synchrone < 100ms ; `qty_affichée = qty_base × (convives / convives_base)` ; arrondi 2 décimales, virgule décimale FR |
| **Widget grille** | CSS custom props en direct (voir §4), aucune latence |
| **Chargement iframe Trilium** | `mat-progress-bar` indéterminée jusqu'à l'event `load` de l'iframe |
| **Transitions génériques** | 140–200ms, jamais > 250ms |

---

## 4. Widget de réglage de la grille (UX-DR27) — détail technique

Menu (`mat-menu` ou panneau custom) ouvert par l'icône ⚙️, **mode lecture uniquement, viewport ≥ 600px**.

```scss
.links-grid {
  display: grid;
  grid-template-columns: repeat(var(--link-columns, 3), minmax(var(--link-card-width, 280px), 1fr));
  gap: var(--link-gap-v, 16px) var(--link-gap-h, 16px);
}
@media (max-width: 599px) { .links-grid { grid-template-columns: 1fr; } }
```

| Contrôle | Composant | Plage | Pas | Défaut | Variable |
|----------|-----------|-------|-----|--------|----------|
| Nombre de colonnes | stepper −/+ | 1–6 | 1 | 3 | `--link-columns` |
| Largeur des cards | `mat-slider` | 200–600px | 10 | 280px | `--link-card-width` |
| Espacement horizontal | `mat-slider` | 8–48px | 4 | 16px | `--link-gap-h` |
| Espacement vertical | `mat-slider` | 8–48px | 4 | 16px | `--link-gap-v` |

Persistance : `localStorage['links-grid-settings']` (JSON), **par device, jamais synchronisé**. Appliquer les variables sur le conteneur `.links-grid` au chargement.

---

## 5. Correspondance maquette → composant Angular Material

| Élément | Composant | Note |
|---------|-----------|------|
| Top bar | `mat-toolbar` | hauteur 60px, bordure basse hairline, backdrop-blur léger |
| Onglets desktop | `mat-tab-nav-bar` | onglet actif = fond `primary-soft` + texte `--color-text` |
| Nav mobile | bottom nav (Material) | 3 items, icônes + labels |
| Menu utilisateur / ⚙️ grille | `mat-menu` | user menu : Mon profil / Paramètres / Déconnexion |
| Carte catégorie | `mat-card` custom | rayon 16px, ombre survol via `--card-shadow` |
| Compteur de liens | `<span>` stylé (PAS `mat-chip`) | AM3 : mat-chip standalone ne colore pas le fond |
| Stepper convives | **composant custom** | ⚠️ PAS `mat-stepper` (qui est un workflow multi-étapes) ; `role="spinbutton"` |
| Ligne ingrédient (form) | `FormArray` + `cdkDrag` | drag réordonnement |
| Drag & drop liens/catégories | `cdkDropList` / `cdkDrag` | inter-liste pour déplacement entre catégories |
| Dialog de partage | `mat-dialog` | voir artboard `Share` |
| Expiration du partage | `mat-radio-group` | 24h / 7j / 30j / Permanent |
| Toggle Activer les Notes | `mat-slide-toggle` | artboard `Settings` |
| Champ URL Trilium + inputs | `mat-form-field` + `matInput` | |
| Barre de chargement iframe | `mat-progress-bar` | mode `indeterminate` |
| Sliders widget grille | `mat-slider` | |
| Feedbacks | `mat-snack-bar` | 3s, bas de page |
| Confirmations suppression | `mat-dialog` | |
| Boutons icône colorés / delete | classe CSS sur le `<button>` | ⚠️ AM3 : `color="warn"` instable → colorer l'icône via CSS |

---

## 6. Écrans de référence (artboards du canvas)

| Artboard | Écran | Interactif | Points clés |
|----------|-------|-----------|-------------|
| `Main` | Liens — lecture (sombre) | — | grid cartes, cascade, survol, tiles favicon monogramme |
| `ALight` | Liens — lecture (clair) | — | palette neutre froide validée |
| `Edit` | Liens — mode édition | — | poignées drag, boutons modifier/supprimer, « + Ajouter un lien », **drag inter-catégories illustré** (fantôme + zone de drop + placeholder + snackbar) |
| `GridSettings` | Liens + widget ⚙️ | ✓ | réglage grille live (cf. §4) |
| `Recipes` | Recettes — liste | ✓ | recherche temps réel, catégories collapsibles, « X pers. » |
| `RecipeDetail` | Recette — détail | ✓ | stepper convives fonctionnel, 2 colonnes ingrédients/étapes, chips méta, bouton Partager |
| `Settings` | Paramètres `/settings` | ✓ | section Notes : toggle + URL + test connexion + sauvegarde |
| `Notes` | Onglet Notes (Trilium) | — | états configuré (iframe + progress) / vide (CTA Paramètres), bascule via Tweaks |
| `Admin` | Administration des comptes | — | tableau des comptes (email, nom, rôle, statut, mdp temp.) + « Nouvel utilisateur », actions reset mdp / désactiver-activer / supprimer, badges de statut |
| `Share` | Dialog de partage | ✓ | expiration, générer, copier, statut actif, révoquer |
| `PublicRecipe` | Vue publique recette | ✓ | mini top bar, lecture seule, stepper OK, zéro nav interne |
| `Expired` | Lien expiré | — | page neutre, aucune info sur l'instance |
| `DirB` / `DirC` | Directions écartées | — | archive (Atelier / Signal) — ne pas implémenter |

---

## 7. Partie AGENT DEV — checklist d'implémentation

1. **Thème** : poser les tokens §2.1 dans `styles.scss`, brancher `mat.theme()` + overrides §2.2, service de thème (`localStorage`, classe `.dark-theme` au bootstrap). Intégrer Inter (self-hébergé).
2. **Composants transverses** : top bar, nav (tabs desktop / bottom nav mobile), menu utilisateur, snackbar, dialog de confirmation — au nouveau style.
3. **Module Liens** : `LinkCategoryCard` + `LinkItem` (lecture/édition via `@Input() editMode`), cascade d'apparition, survol, `cdkDropList`/`cdkDrag` intra + inter-catégories (§3), widget grille (§4).
4. **Module Recettes** : liste + recherche (debounce 200ms), détail + stepper custom, formulaire `FormArray` + drag.
5. **Partage** : `ShareLinkDialog` (`mat-dialog` + `mat-radio-group`), vues publiques (`PublicRecipe` / `Expired`) en lecture seule, mini top bar.
6. **Notes** : page `/settings` (`mat-slide-toggle` + `mat-form-field` + test connexion), onglet Notes avec iframe Trilium + `mat-progress-bar` + état vide.
6b. **Administration** : écran des comptes (accès via le menu utilisateur), `<table>` responsive (overflow-x sur mobile), badges de statut en `<span>` stylé, dialog de confirmation sur désactivation/suppression, génération de mot de passe temporaire affiché une seule fois (FR8–FR12).
7. **A11y** : `aria-label` sur boutons icône, `aria-expanded` sur collapsibles, focus visible conservé, contrastes §2.4, touch targets 44px.
8. **Vérifs** : parité Chrome/Firefox, test sur mobile réel, Axe DevTools zéro violation critique.

**Garde-fous AM3 (déjà rencontrés sur le projet) :** badges colorés en `<span>` stylé (pas `mat-chip`) ; boutons/icônes destructifs colorés par CSS (pas `color="warn"`) ; stepper convives = composant custom (pas `mat-stepper`).

---

## 8. Décisions prises & points restants

**Décidé (Manu) :**
1. **Barre de recherche `⌘K` sur Liens** : conservée dès la V1 en **affordance seule** (non fonctionnelle au départ, comportement en V1.x). Voir §1.3.
2. **Police** : **Inter, self-hébergée** (woff2, poids 400/500/600/700). Voir §1.2.

**Restant (optionnel) :**
3. **Accent exact** : `#D6342A` (clair) / `#F0433A` (sombre) retenus ; ajustables si besoin de matcher une identité précise.

---

## 9. Logo & icônes

### 9.1 Le logo

Symbole **« Constellation »** : un **moyeu central dominant** d'où partent **5 ramifications asymétriques** (longueurs et tailles de nœuds volontairement inégales), en blanc sur une tuile au dégradé braise. Concept = le Dashboard comme hub qui relie les outils. Le rouge du logo est calé sur l'accent de l'UI.

**Couleurs du logo (fixes dans le fichier, indépendantes du thème) :**
- Tuile : dégradé linéaire `#CE342B` → `#7E1A15` (haut-gauche → bas-droite)
- Traits et nœuds : `#FFFFFF`
- Cœur du nœud central : `#8E1B16`

### 9.2 Usage dans l'UI

- **Un seul logo pour les deux thèmes.** La tuile rouge est autonome : elle ressort aussi bien sur le fond sombre `#09090B` que sur le fond clair `#F2F1EF`. Pas de variante par thème.
- **Top bar** : afficher `icon-app.svg` à ~28–30px, à gauche, suivi du mot « Dashboard » (`--color-text`, 700). Le SVG porte ses propres coins arrondis — pas besoin de `border-radius`.
- Ce logo **remplace le placeholder « éclair »** utilisé dans les maquettes du canvas.
- L'ancien `icon-light.svg` n'est **plus utilisé** (inutile : la tuile rouge couvre les deux thèmes) ; l'ancien `icon-app.svg` est **remplacé** par le nouveau.

### 9.3 Fichiers livrés (à placer dans le repo)

| Fichier | Rôle | Source |
|---------|------|--------|
| `icon-app.svg` | Logo principal UI (top bar, etc.), tuile arrondie | source vectorielle |
| `icon-maskable.svg` | Icône PWA *maskable* — plein cadre, symbole dans la zone de sécurité (scale 0.78) | source vectorielle |
| `favicon.svg` | Favicon — géométrie légèrement renforcée (traits/nœuds plus épais) pour rester net à 16px | source vectorielle |
| `favicon-16.png` / `favicon-32.png` | Favicons PNG de secours | rendus depuis `favicon.svg` |
| `apple-touch-icon.png` (180×180) | Icône iOS « ajouter à l'écran d'accueil » | rendu depuis `icon-app.svg` |
| `icon-192.png` / `icon-512.png` | Icônes PWA (manifest), plein cadre maskable | rendus depuis `icon-maskable.svg` |

### 9.4 Déclarations HTML / manifest

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```
```json
// manifest.webmanifest
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable" }
]
```
- `theme-color` du manifest/PWA : au choix selon le thème par défaut — p. ex. `#F2F1EF` (clair) ou `#09090B` (sombre).
- Les PNG sont fournis prêts à l'emploi ; ils peuvent aussi être régénérés depuis les SVG via n'importe quel outil (ex. `cairosvg`, `rsvg-convert`) si tu changes le logo.
