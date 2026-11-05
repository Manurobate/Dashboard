---
title: "UX Briefing : Dashboard"
status: "complete"
created: "2026-04-21"
inputs: ["conversation UX avec Manu", "product-brief-Dashboard.md"]
---

# UX Briefing : Dashboard

Ce document capture l'intégralité des décisions UX/UI prises lors d'une session de travail avec Manu. Il sert de brief complet pour la production du document UX design formel.

---

## Contexte produit (résumé)

Dashboard est une application web personnelle auto-hébergée (NestJS + Angular + MariaDB + Docker Compose) qui centralise trois usages quotidiens : **Liens** (page d'accueil navigateur), **Recettes** (gestionnaire de recettes avec partage), **Notes** (carnet privé avec partage ponctuel).

Utilisateurs :
- **Manu** (admin, développeur expérimenté) — usage desktop comme page d'accueil, mobile pour recettes et notes
- **Famille / amis proches** (< 10 personnes, profils non techniques) — consommateurs de contenus partagés via lien public, sans compte

Stack front : **Angular** — tenir compte des patterns Angular Material pour les composants.

---

## 1. Style visuel

### Décision
Deux thèmes en V1 : **clair** et **sombre**. Switch utilisateur persistant.

### Emplacement du toggle
Icône soleil/lune dans la **top bar**, coin droit, visible en permanence.

### V2+
Thèmes supplémentaires pré-intégrés et/ou éditeur de thèmes custom. Hors scope V1.

---

## 2. Navigation

### Desktop — Top bar avec onglets

Navigation principale sous forme de **top bar horizontale** avec onglets correspondant aux trois modules : Liens / Recettes / Notes.

**Pourquoi top bar plutôt que sidebar :** choix de simplicité, adapté à 3 sections, pas de surface grignotée verticalement. Prévu pour évoluer : les modules V2 (liste de courses, todo, budget) pourront être regroupés dans un **sous-menu "Outils"** dans la top bar.

Contenu de la top bar (de gauche à droite) :
- Logo / nom de l'application (cliquable → module Liens)
- Onglets de navigation : Liens · Recettes · Notes
- Toggle thème (coin droit)
- Menu utilisateur / déconnexion (coin droit, après le toggle)

### Mobile — Bottom navigation bar

**Bottom nav bar** avec icônes + labels courts, pas de hamburger.

**Pourquoi bottom nav plutôt que hamburger :** avec seulement 3 sections, le hamburger est du sur-engineering. La bottom nav est thumb-friendly, standard pour les apps mobiles à navigation simple, et recommandée par Angular Material pour ce cas d'usage. Le hamburger a du sens à partir de 6-8 items.

La top bar sur mobile se réduit à : logo + toggle thème (pas les onglets, remplacés par la bottom nav).

---

## 3. Module Liens

### Layout

Cards par catégorie, disposées en **grid responsive automatique** (breakpoints CSS uniquement, pas de paramètre utilisateur pour le nombre de colonnes). Les colonnes s'adaptent à la largeur de l'écran.

Chaque **card de catégorie** est **collapsible / expandable** (ouverte par défaut). À l'intérieur : liste de liens avec **favicon + titre uniquement** (pas de description visible dans la liste).

**Pourquoi pas de paramètre utilisateur pour les colonnes :** le responsive CSS couvre tous les cas d'usage, ajouter un paramètre est du sur-engineering pour V1.

### Mode édition (inline, pas de page dédiée)

La page Liens a deux états :

**Mode lecture (défaut) :** page propre, zéro bouton d'édition visible. Expérience utilisateur quotidienne sans friction.

**Mode édition (activé par un bouton toggle) :** apparition des contrôles d'édition :
- Bouton "Ajouter une catégorie" (au niveau de la page)
- Dans chaque card : bouton "Ajouter un lien", boutons d'édition/suppression sur chaque lien existant, possibilité de réorganiser les catégories (drag & drop à envisager)

**Pourquoi inline plutôt qu'une page admin séparée :** les liens sont la page d'accueil quotidienne, l'édition doit être contextuelle et rapide, pas un détour vers une interface d'administration.

---

## 4. Module Recettes

### Liste des recettes

**Vue unique combinée** : barre de recherche full-text en haut de page + vue catégorisée en dessous (même pattern visuel que le module Liens — catégories collapsibles avec recettes à l'intérieur).

Comportement :
- Barre de recherche vide → vue catégorisée complète
- Texte saisi → vue catégorisée remplacée par liste de résultats filtrés en temps réel

Catégories configurables par l'utilisateur (exemples : Entrée, Plat, Dessert, Sauce, etc.).

**Pourquoi pas de sous-page par catégorie :** la vue unique avec recherche + catégories est plus rapide, cohérente avec le module Liens, et extensible (recherche par ingrédients en V2 = filtre supplémentaire sur la même page).

### Page de détail d'une recette

Format classique :
- En-tête : titre, catégorie, image optionnelle, temps de préparation/cuisson (si renseigné), difficulté (si renseignée)
- **Stepper +/- "pour X personnes"** : valeur par défaut = nombre de convives saisi à la création. Les quantités d'ingrédients se recalculent en temps réel.
- Corps (deux colonnes sur desktop, empilé sur mobile) : **ingrédients** | **étapes**

### Page de création / édition d'une recette

Page dédiée (pas inline). Accessible via bouton "Ajouter une recette" depuis la liste.

Formulaire **dynamique** (pas de nombre d'étapes ou d'ingrédients prédéfini) :
- Catégorie (select)
- Image (upload optionnel)
- Nombre de convives (valeur par défaut pour le stepper)
- Ingrédients : liste avec ajout/suppression à la volée (chaque ligne : quantité + unité + nom)
- Étapes : liste ordonnée avec ajout/suppression/réorganisation à la volée

Le formulaire doit être **stylé et dynamique** — l'ajout d'une étape ou d'un ingrédient est une interaction fluide, pas un rechargement de page.

### Éditeur d'étapes

**Markdown léger** : gras, italique, souligné, code inline. Pas de WYSIWYG complet — les étapes sont du texte court, le markdown léger est suffisant et plus léger à implémenter.

---

## 5. Module Notes

### Structure

Deux niveaux maximum (inspiré OneNote) :

```
Dossier
  └── Sous-dossier
        └── Note
  └── Note (directement dans le dossier)
Note (à la racine, sans dossier)
```

Dossiers et sous-dossiers configurables par l'utilisateur (création, renommage, suppression, réorganisation).

**Pourquoi 2 niveaux max :** couvre tous les cas d'usage décrits (projet / sous-projet / note, idées / note), simplifie l'implémentation et l'UI mobile.

### Interface (style OneNote)

- **Panneau latéral gauche** : arborescence des dossiers et notes, navigation et création à la volée (boutons + dans le panneau)
- **Zone principale droite** : éditeur de la note sélectionnée
- Sur mobile : panneau latéral accessible via swipe ou bouton, zone éditeur en plein écran

Comportement : ajout de dossier, sous-dossier ou note directement depuis le panneau latéral sans changer de page.

### Éditeur de notes

**WYSIWYG complet** via **TipTap** (bibliothèque open source, wrapper Angular disponible, basé sur ProseMirror).

Fonctionnalités V1 :
- Gras, italique, souligné, barré
- Surlignage (highlight)
- Listes à puces et numérotées
- Tableaux
- Titres (H1, H2, H3)
- Liens

**Pourquoi TipTap :** utilisé par Notion et des outils similaires, Angular-compatible, extensible pour V2, couvre exactement le périmètre OneNote décrit par Manu. Pas besoin de tomber sur du texte brut en V1.

---

## 6. Vues publiques (contenu partagé par lien)

Pour les recettes et les notes partagées via lien public (accessible sans compte).

### Principe général
- Contenu **unique** : la recette ou la note partagée uniquement, pas de navigation vers d'autres contenus
- **Lecture seule** : aucune possibilité de modifier
- Pas de navigation inter-modules
- Accessible sans compte utilisateur

### Structure de la page publique

**Mini top bar** :
- Logo / nom de l'application (non cliquable, ou lien vers la page de login)
- Toggle thème clair/sombre (coin droit)

**Pourquoi garder une mini top bar :** le visiteur sait qu'il est sur "Dashboard" (contexte), et le toggle thème doit être accessible sans polluer la vue avec de la navigation.

**Corps de page** : uniquement le contenu partagé (recette complète avec stepper fonctionnel, ou note en lecture).

**Pas de :** liens vers d'autres recettes/notes, barre de navigation, boutons de modification, accès au reste de l'application.

---

## 7. Points hors scope V1 (rappel)

- Éditeur de thèmes / thèmes supplémentaires
- Sous-menus dans la top bar (ex: menu "Outils" pour V2 modules)
- Recherche par ingrédients dans les recettes
- Dossiers imbriqués à plus de 2 niveaux
- Import de bookmarks navigateur / OneNote / etc.
- Modules V2 : liste de courses, todo, budget

---

## Instructions pour l'agent UX design

Ce document contient toutes les décisions UX validées avec Manu. Le travail de l'agent est de **formaliser** ces décisions en un document UX design structuré, pas de les remettre en question ou de reprendre la phase de découverte.

Le document UX à produire devra couvrir :
- Les wireframes ou descriptions de layout par écran
- Les flows utilisateur principaux (navigation, création de contenu, consultation d'un lien partagé)
- Les états des composants (ex: mode lecture vs mode édition pour les Liens)
- Les comportements responsive (desktop → mobile) pour chaque module
- Les composants Angular Material recommandés pour chaque pattern UI décrit

Référencer également : `_bmad-output/planning-artifacts/product-brief-Dashboard.md`
