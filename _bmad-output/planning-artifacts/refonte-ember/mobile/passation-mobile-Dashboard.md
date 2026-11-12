# Passation — Refonte visuelle mobile (Dashboard)

> Complément mobile au document de passation principal (`passation-refonte-visuelle-Dashboard.md`).
> Le design system **Ember**, les tokens de couleur, la police Inter et les pièges Angular Material 3 décrits dans le doc principal **restent valables** : ce document ne traite que ce qui est **spécifique au mobile**.
> Cible : viewport 360–430px (référence de maquette : **390 × 844**, type iPhone 14 / Pixel).

---

## 0. Contexte & objectif

L'existant mobile n'est pas une vraie adaptation : quelques breakpoints, titres desktop conservés (trop gros, qui passent sur 2–3 lignes), tableaux non repensés, barres d'action reléguées en bas de scroll. L'objectif de cet Epic est de livrer une **version mobile pensée pour le pouce** : type scale réduite, navigation basse persistante, cibles tactiles ≥ 44px, et transformation des patterns desktop (tableau, dialog) en patterns mobiles (cartes, barres collantes).

Les 8 maquettes de référence sont sur le canvas Design (**Lot 6 — Mobile**) et livrées en PNG 2× : `m1-accueil`, `m2-recettes`, `m3-recipe-detail`, `m4-recipe-editor`, `m5-admin`, `m6-settings`, `m7-login`, `m8-public-recipe`.

---

## 1. Breakpoints

Un seul breakpoint franc suffit pour cette app ; pas besoin de tablette dédiée (le layout desktop tient dès ~720px).

| Nom | Largeur | Comportement |
|-----|---------|--------------|
| `mobile` | `< 640px` | Layout mobile décrit ici : 1 colonne, nav basse, barres collantes |
| `desktop` | `≥ 640px` | Layout actuel (grille multi-colonnes, top bar complète) |

- Utiliser le `BreakpointObserver` du CDK (`Breakpoints.HandsetPortrait` / une media query custom `(max-width: 639.98px)`) plutôt que du CSS seul, car certains comportements changent de **structure** (tableau → cartes), pas juste de style.
- Grille des liens : `repeat(auto-fill, minmax(280px, 1fr))` en desktop → **1 colonne pleine largeur** en mobile (gouttière latérale 16px).

---

## 2. Échelle typographique mobile (le point le plus important)

Les titres desktop sont réutilisés tels quels aujourd'hui. À reprendre :

| Usage | Desktop | **Mobile** |
|-------|---------|-----------|
| Titre de page (`h1`) | 26px / 700 | **21px / 700**, `letter-spacing:-.02em` |
| Titre d'écran dans top bar (détail, éditeur, admin…) | — | **15–16px / 600**, tronqué `ellipsis` sur 1 ligne |
| Titre de recette (détail) | 26px+ | **repris dans la top bar** (ellipsis), plus de gros titre qui wrap sur 3 lignes |
| En-tête de section (Avant-propos, Ingrédients) | — | **13px / 600 / uppercase**, couleur accent |
| En-tête de catégorie (liens / recettes) | — | **14.5–15px / 600** |
| Corps | 14–15px | **14px**, `line-height:1.5–1.55` |
| Labels de champ | — | **12.5px / 500**, couleur `--mut` |

Règle : **aucun titre ne doit dépasser 1 ligne** sur l'accueil/les listes. Pour les titres longs variables (nom de recette), tronquer avec ellipsis et laisser le contexte (image, écran) porter l'info.

---

## 3. Navigation basse (bottom nav) — nouveau composant

Remplace le fait de scroller pour changer de section. 3 onglets : **Accueil / Recettes / Notes**.

```
hauteur : 62px (+ safe-area-inset-bottom)
fond : var(--surf) ; bordure haute : 1px var(--bd)
onglet : flex column, icône 19px + label 11px/500
onglet actif : couleur var(--acc) + pastille var(--accSoft) (rayon 13px) derrière l'icône
```

- Padding bas = `env(safe-area-inset-bottom)` pour les iPhone à encoche/barre gestuelle.
- Persistante sur **Accueil, Recettes, Détail recette, Admin, Paramètres**. **Masquée** sur : Login (déconnecté), Éditeur de recette (tâche focalisée, voir §4), Vue publique (standalone).
- Implémentation : composant unique `<app-bottom-nav>` piloté par la route active (`routerLinkActive`). Les icônes sont des SVG inline (pas `mat-icon` + font, pour garder le trait fin cohérent avec Ember).

---

## 4. Barres d'action collantes (sticky)

Plutôt que des boutons en fin de scroll (actuel), les actions principales restent visibles.

- **Éditeur de recette** (`m4`) : barre collante en **bas**, `Annuler` (texte, gauche) + `Enregistrer` (plein accent, prend le reste de la largeur, 48px de haut). **Pas de bottom nav** sur cet écran : c'est un flux focalisé, la barre d'action la remplace. Documenter ce choix auprès du PO.
- **Détail recette** (`m3`) : actions (partager / modifier / supprimer) **dans la top bar** à droite, en boutons-icônes 38px. Le bouton supprimer en accent. Flèche retour à gauche.
- **Admin / Paramètres** : bouton primaire pleine largeur en tête de contenu (`Nouvel utilisateur`, `Sauvegarder`).

`position: sticky; bottom: 0` + `background: var(--surf)` + bordure haute. Prévoir le `padding-bottom` safe-area là aussi.

---

## 5. Transformations de patterns desktop → mobile

| Desktop | Mobile | Écran |
|---------|--------|-------|
| **Tableau** admin (6 colonnes) | **Cartes** empilées : avatar + email + nom, puis rangée badges (rôle, statut, mdp temp.), actions en boutons-icônes | `m5-admin` |
| Grille de catégories 3–4 col. | **1 colonne**, cartes accordéon pleine largeur | `m1-accueil` |
| Liste recettes multi-colonnes | Groupes par catégorie, **lignes pleines largeur** (titre + convives à droite) | `m2-recettes` |
| Dialog modale centrée | En mobile, préférer une **bottom sheet** (modale ancrée en bas, pleine largeur, coins hauts arrondis) pour les dialogs (ajout lien, partage, confirmations). *À spécifier lot suivant si besoin.* |
| Gros titre de page | Titre **dans la top bar** avec flèche retour pour les sous-pages | `m3`, `m4`, `m5`, `m6` |

Le tableau → cartes est le changement structurel le plus fort : ne pas tenter de rendre le `<table>` responsive, basculer sur un rendu `*ngIf` piloté par le breakpoint.

---

## 6. Cibles tactiles & ergonomie

- Toute cible interactive ≥ **44 × 44px** (boutons-icônes top bar à 38px → zone de tap étendue via padding, ou passer à 40px).
- Champs de formulaire : hauteur **46–50px**, rayon 11–13px.
- Steppers (convives, quantités) : boutons 32–34px minimum, valeur centrale ≥ 46px de large pour la lisibilité.
- Espacement vertical entre cartes/sections : 10–16px.
- Gouttière latérale constante : **16px**.

---

## 7. Pièges Angular Material 3 (rappel + spécifique mobile)

En plus des pièges du doc principal (badges en `<span>`, stepper custom, couleurs destructives en CSS et non `color="warn"`) :

- **Bottom nav** : ne pas utiliser `mat-tab-nav-bar` (pensé pour le haut, animations/indicateur différents). Composant maison léger comme décrit §3.
- **Toggle** (Paramètres « Activer les Notes ») : `mat-slide-toggle` accepte le token accent, mais vérifier la piste (track) en thème clair ET sombre ; sinon réimplémenter en CSS (c'est ce que fait la maquette).
- **Barres collantes** : attention aux conteneurs `mat-dialog`/`cdk-virtual-scroll` qui cassent `position: sticky`. Mettre la barre **hors** de la zone scrollable, en frère direct.
- **Safe areas** : ajouter `viewport-fit=cover` dans la balise meta viewport, sinon `env(safe-area-inset-*)` renvoie 0.
- **RTE (éditeur)** : les toolbars B/I/U doivent rester tactiles (boutons ≥ 34px) ; ne pas empiler les contrôles de l'étape (drag + supprimer) de façon trop serrée.

---

## 8. Découpage proposé (Epic → stories)

**Epic : Conversion mobile du Dashboard (design Ember)**

| # | Story | Écran(s) | Dépendances |
|---|-------|----------|-------------|
| M-0 | Mettre en place le breakpoint `mobile` + le shell (`BreakpointObserver`, meta viewport `viewport-fit=cover`, safe-areas) | — | socle |
| M-1 | Composant **bottom nav** persistant (3 onglets, état actif, safe-area) | global | M-0 |
| M-2 | **Accueil / Liens** mobile : 1 colonne, cartes accordéon, titre réduit, bouton Modifier compact | `m1` | M-0, M-1 |
| M-3 | **Recettes (liste)** mobile : recherche pleine largeur, groupes, lignes recette | `m2` | M-0, M-1 |
| M-4 | **Détail recette** : titre en top bar, actions-icônes, hero 16:9, stepper convives | `m3` | M-0, M-1 |
| M-5 | **Éditeur de recette** : champs empilés, barre Enregistrer collante, nav masquée | `m4` | M-0 |
| M-6 | **Administration** : tableau → cartes utilisateur | `m5` | M-0, M-1 |
| M-7 | **Paramètres** : carte Notes/Trilium, toggle, Tester/Sauvegarder | `m6` | M-0, M-1 |
| M-8 | **Login** mobile : logo centré, champs 50px, CTA pleine largeur, nav masquée | `m7` | M-0 |
| M-9 | **Vue publique** (lecture seule) mobile | `m8` | M-0 |
| M-10 | *(optionnel)* Dialogs → **bottom sheets** (ajout lien, partage, confirmations) | — | M-0 |

M-0 et M-1 sont bloquantes pour la plupart des autres. M-5 / M-8 / M-9 sont indépendantes (nav masquée).

---

## 9. Récap des écarts volontaires vs l'existant

Points où la maquette **améliore** l'existant (à valider en revue) :

1. Titres de page nettement réduits ; titres de recette déplacés dans la top bar (fin du wrap sur 3 lignes).
2. Barre de navigation basse persistante au lieu de scroller.
3. Tableau admin transformé en cartes.
4. Barre `Enregistrer`/`Annuler` collante sur l'éditeur, nav masquée pendant l'édition.
5. Actions de détail (partager/modifier/supprimer) remontées dans la top bar.
6. Login et vue publique sans barre de navigation (cohérent avec l'état déconnecté / standalone).
7. Boutons primaires pleine largeur sur les sous-pages (Admin, Paramètres).

Si un de ces écarts ne convient pas (ex. garder la nav visible sur l'éditeur, ou conserver un gros titre sur le détail), c'est un simple ajustement — à trancher avant de lancer les stories.
