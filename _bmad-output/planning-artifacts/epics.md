---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: complete
completedAt: '2026-04-22'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
  - '_bmad-output/planning-artifacts/ux-design-Dashboard.md'
---

# Dashboard - Epic Breakdown

## Overview

Ce document fournit la décomposition complète en épics et stories pour Dashboard, décomposant les exigences du PRD, de l'UX Design et de l'Architecture en stories implémentables.

## Requirements Inventory

### Functional Requirements

FR0: Au premier démarrage, si aucun compte admin n'existe en base, le système crée automatiquement un compte admin depuis les variables d'environnement ADMIN_EMAIL (adresse email valide utilisée comme identifiant de connexion) et ADMIN_INITIAL_PASSWORD, avec mustChangePassword = true
FR1: Un utilisateur non authentifié peut se connecter avec son adresse email et un mot de passe
FR2: Le système protège le formulaire de connexion contre les tentatives de brute-force par rate limiting
FR3: Un utilisateur authentifié reste connecté entre les sessions (token JWT persistant avec refresh silencieux)
FR4: Un utilisateur peut se déconnecter
FR5: Un utilisateur dont le mot de passe est temporaire est contraint de le changer avant d'accéder à toute fonctionnalité
FR6: Un utilisateur peut modifier son propre mot de passe
FR7: Les données de chaque utilisateur sont strictement isolées des autres comptes
FR8: L'administrateur peut créer un compte utilisateur (adresse email + nom d'affichage)
FR9: La création d'un compte génère automatiquement un mot de passe temporaire affiché une seule fois
FR10: L'administrateur peut réinitialiser le mot de passe d'un utilisateur (génère un nouveau mot de passe temporaire affiché une seule fois)
FR11: L'administrateur peut désactiver ou supprimer un compte utilisateur
FR12: L'administrateur peut consulter la liste des comptes de l'instance
FR13: Un utilisateur peut créer une catégorie de liens (nom, icône Material optionnelle)
FR14: Un utilisateur peut modifier et supprimer une catégorie de liens
FR15: Un utilisateur peut réorganiser ses catégories par drag & drop
FR16: Un utilisateur peut replier et déplier une catégorie
FR17: Un utilisateur peut créer une fiche de lien (URL, titre, description optionnelle)
FR18: Le système récupère automatiquement le favicon et les métadonnées OG d'une URL lors de la création d'un lien
FR19: Un utilisateur peut modifier et supprimer un lien
FR20: Un utilisateur peut réorganiser ses liens au sein d'une catégorie par drag & drop
FR20b: Un utilisateur peut déplacer un lien d'une catégorie vers une autre par drag & drop
FR21: Un utilisateur peut basculer entre un mode lecture (sans contrôles d'édition) et un mode édition sur la page Liens
FR22: La page d'accueil (`/dashboard`) est la vue affichée par défaut après connexion
FR23: Un utilisateur peut créer une recette (titre, ingrédients structurés, étapes avec mise en forme textuelle basique — gras, italique, souligné — catégorie)
FR24: Un utilisateur peut modifier et supprimer une recette
FR25: Un utilisateur peut organiser ses recettes par catégories
FR26: Un utilisateur peut rechercher ses recettes en temps réel
FR27: Un utilisateur peut ajuster le nombre de convives d'une recette et voir les quantités des ingrédients recalculées en conséquence
FR28: Un utilisateur peut réorganiser les ingrédients et les étapes d'une recette par drag & drop
FR29: Un utilisateur peut créer une note avec un contenu texte enrichi (WYSIWYG)
FR30: Un utilisateur peut modifier et supprimer une note
FR31: Un utilisateur peut organiser ses notes dans des dossiers et sous-dossiers
FR32: Un utilisateur peut créer, renommer et supprimer des dossiers de notes
FR33: Le contenu d'une note est sauvegardé automatiquement pendant la saisie
FR34: Un utilisateur peut naviguer entre ses notes et dossiers depuis un panneau latéral
FR35: Un utilisateur peut générer un lien public pour partager une recette ou une note
FR36: Un utilisateur peut choisir une durée d'expiration pour un lien partagé (24h, 7j, 30j, permanent)
FR37: Un utilisateur peut révoquer un lien partagé actif
FR38: Un visiteur non authentifié peut accéder au contenu d'un lien partagé valide en lecture seule
FR39: Un visiteur accédant à une recette partagée peut utiliser le stepper de convives
FR40: Un visiteur accédant à un lien expiré ou invalide voit une page d'erreur neutre sans information sur l'instance
FR41: Les vues publiques n'exposent aucune navigation vers le reste de l'application
FR42: Un utilisateur peut basculer entre un thème clair et un thème sombre
FR43: Le thème choisi est persisté entre les sessions
FR44: L'application affiche un état vide actionnable lorsqu'un module ne contient pas encore de contenu
FR45: L'application est déployable via un seul fichier `docker-compose.yml`
FR46: La base de données fait l'objet de dumps automatisés
FR47: L'application expose une PWA avec app shell mis en cache (affichage sans erreur en l'absence de réseau)
FR48: Les routes publiques (contenu partagé) sont configurées pour ne pas être indexées par les moteurs de recherche
FR50: Recherche / navigation rapide (command palette) : un utilisateur peut filtrer ses liens et recettes et naviguer entre modules depuis une barre unique. *Affordance désactivée en V1 (Epic 9, story 9.3) : champ visible, inactif, sans logique de recherche ni raccourci `⌘K` actif. Comportement livré plus tard, non planifié.*
FR51: Un utilisateur peut activer ou désactiver les animations de l'interface depuis la page Paramètres. Activées par défaut, sauf si le système demande de réduire les animations et que l'utilisateur n'a encore rien choisi. Le choix est persisté dans localStorage (par device, par navigateur).

### NonFunctional Requirements

NFR1: Les mots de passe sont hashés avec bcrypt (facteur de coût ≥ 12) — jamais stockés ou loggés en clair
NFR2: Les tokens JWT ont une durée de vie limitée et sont rafraîchis silencieusement côté client via httpOnly cookie (`SameSite=Strict`)
NFR3: Les jetons de partage public sont générés avec un CSPRNG (`crypto.randomBytes(32)` → 256 bits d'entropie, ≥ 128 bits requis)
NFR4: Toutes les communications transitent en HTTPS (TLS assuré par le reverse proxy — Traefik ou Nginx)
NFR5: Le formulaire de connexion est protégé par rate limiting via `@nestjs/throttler` (blocage temporaire après N tentatives échouées)
NFR6: L'accès aux données d'un utilisateur est systématiquement vérifié côté serveur par filtrage `userId` — aucune donnée cross-compte possible
NFR7: Les routes publiques sont strictement en lecture seule, enforced côté API — pas de reliance sur le comportement client
NFR8: Les interactions côté client (filtrage recettes, stepper convives, collapse catégories) doivent être imperceptibles (< 100 ms)
NFR9: La récupération de favicon/meta OG est effectuée avec un timeout court côté serveur — un échec ne bloque pas la sauvegarde du lien
NFR10: Les images de recettes sont chargées en lazy loading (`loading="lazy"`)
NFR11: Cible WCAG 2.1 niveau AA — ratios de contraste vérifiés sur les deux thèmes (clair et sombre)
NFR12: Tous les éléments interactifs sont accessibles au clavier (Tab, Shift+Tab, Entrée, Échap)
NFR13: Touch targets minimum 44×44 px sur mobile (boutons ConvivesSteppper : 48×48px)
NFR14: `aria-label` sur tous les boutons icônes, `aria-expanded` sur les éléments collapsibles, `aria-live="polite"` sur les zones mises à jour dynamiquement
NFR15: L'instance doit fonctionner sans intervention manuelle pendant au moins 4 semaines après déploiement initial
NFR16: Des dumps automatisés de la base de données sont configurés dans Docker Compose (script `scripts/backup.sh`)
NFR17: Déploiement via un seul `docker-compose.yml` sans dépendances externes supplémentaires (pas de Redis, pas d'Elasticsearch)
NFR18: Les conteneurs Docker intègrent des healthchecks pour la détection automatique d'un service défaillant
NFR19: Compatibilité navigateurs — Chrome et Firefox desktop (support complet), Chrome Android (responsive mobile), Safari iOS (vues publiques uniquement)

### Additional Requirements

- **Template de démarrage** : monorepo simple (deux sous-projets `frontend/` et `backend/` à la racine), sans outil de monorepo tiers — initialisé via `ng new frontend --standalone --routing --style=scss` et `nest new backend --strict`
- Angular 21 zoneless : `provideExperimentalZonelessChangeDetection()` dans `app.config.ts`, suppression de `zone.js` des polyfills, strict mode TypeScript, composants standalone uniquement, lazy loading par module métier
- NestJS 11 strict mode, TypeORM + driver `mysql2` (MariaDB), guards centralisés dans `src/common/guards/`, `ValidationPipe` global activé au démarrage
- Admin seed : variables d'environnement `ADMIN_EMAIL` (adresse email valide, identifiant de connexion) et `ADMIN_INITIAL_PASSWORD` requises au démarrage — `AdminSeedService` (`OnApplicationBootstrap`) crée le compte admin initial si aucun admin n'existe en base, avec `mustChangePassword = true` ; le nom d'affichage initial est la partie locale de l'email (modifiable dans le profil)
- Authentification via httpOnly cookie (`SameSite=Strict`) + header custom `X-Requested-With: XMLHttpRequest` (mitigation CSRF sans token dédié)
- Refresh token stocké en DB (`RefreshToken` entity), révocable — intercepteur Angular gère les 401 → refresh → retry
- Migrations TypeORM uniquement (`typeorm migration:generate/run`) — jamais `synchronize: true` en production
- GitFlow + GitHub Actions CI/CD : CI sur `feature/* → develop` (lint + tests + build), CD sur `develop → main` (build images Docker + déploiement SSH)
- Swagger (`@nestjs/swagger` + `swagger-ui-express`) pour la documentation API — utile pour les agents de dev
- Config via `.env` + `@nestjs/config` avec validation Joi au démarrage — plantage propre si variable manquante
- Nginx Alpine pour les statics frontend (proxy `/api` → backend), node:22-alpine pour le backend
- Conventions obligatoires : tables TypeORM `PascalCase`, colonnes `camelCase`, endpoints REST pluriels sous `/api/`, réponses JSON directes (pas d'enveloppe `{data: ...}`), `Logger` NestJS (jamais `console.log`), specs `.spec.ts` co-localisées
- Tests E2E : Playwright (`@playwright/test`) — dossier `e2e/` à la racine du monorepo. Chaque story (Epic 3 et suivantes) embarque une section `### Scénarios E2E` dans son fichier story ; l'agent dev implémente les tests Playwright correspondants dans le même ticket. Couverture minimale : les critères d'acceptation fonctionnels de la story.
- Anti-CSRF : header `X-Requested-With: XMLHttpRequest` vérifié côté API via `csrf.interceptor.ts` Angular
- State management Angular : Signals natifs + services (pas de NgRx en V1) — pattern immutable `signal.update(current => [...current, item])`

### UX Design Requirements

UX-DR1: Implémentation du système de design tokens CSS pour les couleurs (palette "Braise Profonde") dans `styles.scss` — tokens `--color-background`, `--color-surface`, `--color-primary`, `--color-primary-light`, `--color-on-primary`, `--color-text-primary`, `--color-text-secondary`, `--color-divider`, `--color-error` pour les thèmes clair et sombre, complétés par des overrides `--mat-sys-*` pour neutraliser les teintes roses générées par AM3
UX-DR2: Configuration du thème Angular Material avec `mat.$red-palette` (base commune aux deux thèmes), overrides `--mat-sys-primary` : `#B71C1C` thème clair / `#EF4444` thème sombre, toggle via classe `.dark-theme` sur `<body>`, persistance en `localStorage`
UX-DR3: Top bar responsive (`MatToolbar`) — thème clair fond `#FFFFFF` + `box-shadow: 0 2px 8px rgba(0,0,0,0.1)` + app name `#B71C1C` ; thème sombre fond `#141414` + app name `#EF4444` — avec onglets de navigation desktop (`MatTabNavBar`, labels : **Accueil**/Recettes/Notes, premier onglet pointe vers `/dashboard`) et menu utilisateur (`MatMenu`) — onglets et menu utilisateur visibles uniquement quand l'utilisateur est authentifié ; en état non-authentifié, seuls le titre et le toggle thème sont affichés
UX-DR4: Bottom navigation mobile — `MatBottomNav` avec 3 items (Liens, Recettes, Notes), icônes + labels courts, item actif en couleur primary, items inactifs en `color-text-secondary`
UX-DR5: Composant custom `LinkCategoryCard` — card collapsible (`MatExpansionPanel`) avec deux états (lecture/édition), header avec icône Material (`<mat-icon>`, fallback `folder_open` si non définie) + nom catégorie + badge compteur (`MatChip`), `aria-expanded`, keyboard collapse sur Entrée/Espace, `@Input() editMode`
UX-DR6: Composant custom `LinkItem` — item de lien individuel avec favicon 16×16 (fallback : lettre initiale du titre), titre cliquable `target="_blank"`, actions contextuelles (éditer + supprimer `MatIconButton`) visibles uniquement en mode édition
UX-DR7: Mode lecture/édition toggle sur le module Liens — bouton "Modifier" explicite (label + icône), transition animée 200ms d'apparition/disparition des contrôles d'édition, sans changement de route
UX-DR8: Composant custom `ConvivesSteppper` — contrôle bouton−/valeur/bouton+ avec `role="spinbutton"`, `aria-valuenow`, `aria-valuemin`, boutons 48×48px, `@Output() convivesChange` pour recalcul immédiat côté parent
UX-DR9: Composant custom `RecipeIngredientRow` — ligne d'ingrédient avec `FormArray` dynamique (champs quantité/unité/nom + bouton supprimer), drag & drop via Angular CDK DragDrop, validation (quantité obligatoire)
UX-DR10: Composant custom `MarkdownLightEditor` — `textarea` avec toolbar minimale (gras, italique, souligné) pour les étapes de recettes et le champ avant-propos — bouton code inline supprimé (non pertinent pour ce contexte) — TipTap non utilisé ici (texte court ne justifie pas la complexité)
UX-DR11: Composant custom `TipTapEditorComponent` — wrapper Angular `ControlValueAccessor` pour l'éditeur WYSIWYG ProseMirror (module Notes uniquement), toolbar persistante (gras/italique/souligné/barré/listes/tableaux/titres H1-H3/liens), `@Output() contentChange` avec debounce 1s pour sauvegarde auto
UX-DR12: Composant custom `NoteTreePanel` — panneau latéral avec arborescence récursive (dossier/sous-dossier/note), `role="tree"` / `role="treeitem"`, navigation clavier flèches directionnelles, 260px fixe desktop, `MatSidenav` mode `over` sur mobile (swipe ou bouton)
UX-DR13: Composant custom `ShareLinkDialog` — `MatDialog` avec radio group expiration (24h/7j/30j/permanent), génération de lien CSPRNG, copie auto presse-papier, bouton révoquer, états idle/generating/link-ready/revoked, badge "Partagé" + icône cadenas visible sur la recette/note concernée
UX-DR14: Skeleton screens pour les listes de liens et recettes pendant le chargement initial de chaque module (évite le flash de contenu vide)
UX-DR15: États vides actionnables par module — icône outline centrée + message explicite + bouton CTA : "Aucun lien pour l'instant → Ajouter une catégorie", "Aucune recette enregistrée → Ajouter une recette", "Aucune note pour l'instant → + Note", "Aucun résultat pour « [terme] »" (sans CTA)
UX-DR16: Confirmation dialog systématique (`MatDialog`) avant toute suppression ou révocation — titre ("Supprimer [nom] ?") + description courte + bouton annuler (secondaire) + bouton confirmer destructif (`mat-flat-button` couleur `warn`)
UX-DR17: Pattern de feedback — `MatSnackBar` 3s pour les succès ("Lien ajouté", "Recette sauvegardée", "Lien copié ✓"), `mat-error` inline pour les erreurs de formulaire (saisie conservée intégralement), indicateur textuel discret "Enregistré" (pas de snackbar) pour la sauvegarde auto des notes
UX-DR18: Recherche recettes en temps réel — `mat-form-field` avec icône search en prefix + bouton clear (×) en suffix, debounce 200ms, retour à la vue catégorisée si champ effacé, `aria-live="polite"` sur la zone de résultats
UX-DR19: Grid responsive CSS pur pour le module Liens — `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`, espacement 16px, 1 colonne sur mobile — pas de paramètre colonnes utilisateur en V1
UX-DR20: Split-pane Notes desktop — panneau `NoteTreePanel` 260px fixe + zone éditeur TipTap en flex-grow ; mobile — éditeur plein écran + panneau en `MatSidenav` mode `over`
UX-DR21: Hiérarchie de boutons — primaire `mat-flat-button` (1 max par vue), secondaire `mat-stroked-button`, texte `mat-button`, icône `mat-icon-button`, destructif `mat-flat-button` couleur `warn` (uniquement dans les dialogs de confirmation)
UX-DR22: Navigation top bar desktop — onglet actif `background: rgba(primary, 0.15)` + couleur primary + `font-weight: 700` ; liens externes avec `target="_blank" rel="noopener noreferrer"` + icône `open_in_new` (16px) au hover
UX-DR23: Formulaires inline pour le module Liens (champs dans la card sans changement de route) ; formulaires sur page dédiée pour les Recettes (`/recipes/new`, `/recipes/:id/edit`) avec `FormArray` pour les ingrédients et les étapes
UX-DR24: `MatProgressSpinner` centré pour les chargements de module ; `MatProgressSpinner` 16px inline pour les actions async courtes (fetch favicon, génération de lien de partage)
UX-DR25: Vue publique partagée — mini top bar identifiable ("Dashboard") sans navigation vers l'intérieur de l'application, thème clair par défaut, `noindex` sur les routes publiques
UX-DR30: design system Ember (tokens, overrides Material, Inter, Material Symbols, logo), remplace les valeurs visuelles de UX-DR1, UX-DR2 et UX-DR3.
UX-DR31: micro-interactions Ember (cascade, survol, drag & drop stylé).
UX-DR32: barre de recherche `⌘K` en affordance désactivée.
UX-DR33: adaptation mobile Ember (échelle typographique, barres collantes, navigation basse restylée).

### FR Coverage Map

| FR | Épic | Description courte |
|----|------|--------------------|
| FR0 | Épic 2 | Seed automatique du compte admin initial au démarrage |
| FR1 | Épic 2 | Connexion identifiant + mot de passe |
| FR2 | Épic 2 | Rate limiting anti-brute-force |
| FR3 | Épic 2 | JWT persistant avec refresh silencieux |
| FR4 | Épic 2 | Déconnexion |
| FR5 | Épic 2 | Changement de mot de passe temporaire forcé |
| FR6 | Épic 2 | Changement de mot de passe utilisateur |
| FR6b | Épic 3 | Modifier le nom d'affichage (page profil) |
| FR6c | Épic 3 | Accès au changement de mot de passe via /profile |
| FR7 | Épic 2 | Isolation stricte des données par compte |
| FR8 | Épic 3 | Création de compte utilisateur |
| FR9 | Épic 3 | Mot de passe temporaire généré affiché une fois |
| FR10 | Épic 3 | Réinitialisation de mot de passe par l'admin |
| FR11 | Épic 3 | Désactivation/suppression de compte |
| FR12 | Épic 3 | Liste des comptes de l'instance |
| FR13 | Épic 4 | Créer une catégorie de liens |
| FR14 | Épic 4 | Modifier/supprimer une catégorie |
| FR15 | Épic 4 | Réorganiser catégories par drag & drop |
| FR16 | Épic 4 | Replier/déplier une catégorie |
| FR17 | Épic 4 | Créer une fiche de lien |
| FR18 | Épic 4 | Favicon + métadonnées OG auto-récupérées |
| FR19 | Épic 4 | Modifier/supprimer un lien |
| FR20 | Épic 4 | Réorganiser liens par drag & drop (intra-catégorie) |
| FR20b | Épic 4 | Déplacer un lien vers une autre catégorie par D&D |
| FR21 | Épic 4 | Toggle mode lecture / mode édition |
| FR22 | Épic 4 | Page d'accueil `/dashboard` = vue par défaut après connexion |
| FR23 | Épic 5 | Créer une recette |
| FR24 | Épic 5 | Modifier/supprimer une recette |
| FR25 | Épic 5 | Organiser recettes par catégories |
| FR26 | Épic 5 | Recherche recettes en temps réel |
| FR27 | Épic 5 | Stepper convives + recalcul quantités |
| FR28 | Épic 5 | Drag & drop ingrédients et étapes |
| FR_S1 | Épic 7 | Page `/settings` accessible à tous les utilisateurs |
| FR_T1 | Épic 7 | URL instance Trilium dans `/settings` |
| FR_T2 | Épic 7 | Activer/désactiver Notes depuis `/settings` |
| FR_T4 | Épic 7 | Onglet Notes = iframe Trilium |
| FR_T5 | Épic 7 | Test de connectivité Trilium (HEAD, sans token) |
| FR_T6 | Épic 7 | État d'erreur si Trilium non configuré ou inaccessible |
| FR_N0 | Épic 8 | Sélecteur 3 états Notes dans `/settings` (Désactivé / Trilium / Notes intégrées) |
| FR29 | **Épic 8** | Créer une note WYSIWYG |
| FR30 | **Épic 8** | Modifier/supprimer une note |
| FR31 | **Épic 8** | Organiser notes en dossiers/sous-dossiers |
| FR32 | **Épic 8** | Créer/renommer/supprimer des dossiers |
| FR33 | **Épic 8** | Sauvegarde automatique (debounce 1s) |
| FR34 | **Épic 8** | Panneau latéral de navigation |
| FR35 | Épic 6 (recettes) + **Épic 8** (notes intégrées) | Générer un lien de partage public |
| FR36 | Épic 6 | Choisir une durée d'expiration |
| FR37 | Épic 6 | Révoquer un lien partagé |
| FR38 | Épic 6 (recette) + **Épic 8** (note intégrée) | Accès visiteur au contenu partagé (lecture seule) |
| FR39 | Épic 6 | Stepper convives sur recette partagée |
| FR40 | Épic 6 | Page d'erreur neutre (lien expiré/invalide) |
| FR41 | Épic 6 (recette) + **Épic 8** (note intégrée) | Aucune navigation vers l'app sur les vues publiques |
| FR42 | Épic 4 | Toggle thème clair/sombre |
| FR43 | Épic 4 | Persistance du thème (localStorage) |
| FR44 | Épic 4 | États vides actionnables par module |
| FR49 | Épic 4 | Paramétrage d'affichage des cards Liens (colonnes, largeur, espacement) |
| FR45 | Épic 1 | Déploiement via docker-compose.yml unique |
| FR46 | Épic 1 | Dumps automatisés de la base de données |
| FR47 | Épic 1 | PWA avec app shell mis en cache |
| FR48 | Épic 1 | noindex sur les routes publiques |
| FR50 | Épic 9 (affordance seule) | Recherche / navigation rapide, comportement non planifié |
| FR51 | Épic 9 (story 9.7) | Réglage des animations dans Paramètres |

## Epic List

### Epic 1 : Infrastructure, Déploiement & Design System
L'application est déployable via `docker-compose up` en une commande. Le monorepo est initialisé (Angular 21 + NestJS 11), le design system "Braise Profonde" est en place, la navigation responsive (top bar + bottom nav) est fonctionnelle, et le CI/CD tourne.
**FRs couverts :** FR45, FR46, FR47, FR48
**UX-DRs :** UX-DR1, UX-DR2, UX-DR3, UX-DR4

### Epic 2 : Authentification sécurisée
Les utilisateurs peuvent se connecter de manière sécurisée avec une session JWT persistante, une protection brute-force, un mécanisme de changement de mot de passe temporaire, et une isolation stricte des données entre comptes.
**FRs couverts :** FR0, FR1, FR2, FR3, FR4, FR5, FR6, FR7

### Epic 3 : Administration de l'instance
L'administrateur peut créer, gérer et réinitialiser les mots de passe des comptes utilisateurs via un panneau dédié, sans dépendance à un serveur mail. Les utilisateurs peuvent gérer leur propre profil (nom d'affichage) depuis une page dédiée.
**FRs couverts :** FR8, FR9, FR10, FR11, FR12, FR6b, FR6c

### Epic 4 : Module Liens
Manu peut accéder instantanément à ses liens organisés par catégories depuis sa page d'accueil, basculer en mode édition pour ajouter/réorganiser ses liens avec favicon auto-récupéré, et choisir son thème clair/sombre. C'est la vue par défaut après connexion.
**FRs couverts :** FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR20b, FR21, FR22, FR42, FR43, FR44, FR49
**UX-DRs :** UX-DR5, UX-DR6, UX-DR7, UX-DR14, UX-DR15, UX-DR16, UX-DR17, UX-DR19, UX-DR21, UX-DR22, UX-DR23, UX-DR24, UX-DR26, UX-DR27

### Epic 5 : Module Recettes
Manu peut créer, organiser et consulter ses recettes avec adaptation en temps réel du nombre de convives, recherche instantanée, et réorganisation par drag & drop des ingrédients et étapes. L'éditeur propose de l'autocomplétion sur la catégorie, les noms d'ingrédients et les unités à partir des données existantes.
**FRs couverts :** FR23, FR24, FR25, FR26, FR27, FR28
**UX-DRs :** UX-DR8, UX-DR9, UX-DR10, UX-DR18

### Epic 6 : Partage public (recettes)
Manu peut partager une **recette** via un lien public sécurisé (CSPRNG 256 bits) avec expiration configurable et révocation à la demande. Les visiteurs accèdent à la recette directement, sans compte, et peuvent utiliser le stepper convives. L'infrastructure de partage (entité PublicToken, API `/api/sharing`, `ShareLinkDialog`) est mise en place ici et réutilisée dans Épic 8 pour les notes.
**FRs couverts :** FR35 (partiel — recettes), FR36, FR37, FR38 (partiel — recettes), FR39, FR40, FR41 (partiel — recettes)
**UX-DRs :** UX-DR13, UX-DR24 (badge Partagé), UX-DR25

### Epic 7 : Module Notes — Intégration Trilium
Manu peut accéder à son instance Trilium Notes depuis l'onglet Notes du Dashboard via une iframe. Chaque utilisateur configure l'URL de sa propre instance Trilium et active/désactive l'onglet Notes depuis la page Paramètres. Une page `/settings` extensible est créée pour centraliser les préférences utilisateur.
**FRs couverts :** FR_S1, FR_T1, FR_T2, FR_T4, FR_T5, FR_T6

### Epic 8 : Module Notes intégré Dashboard
Manu peut rédiger et organiser ses notes directement dans Dashboard via un éditeur WYSIWYG riche (TipTap) avec une arborescence de dossiers/sous-dossiers, une sauvegarde automatique (debounce 1s) et un panneau latéral de navigation en split-pane. La page `/settings` évolue vers un sélecteur à trois états (Désactivé / Trilium / Notes intégrées Dashboard). Le partage par lien public est étendu aux notes dans cette épic (Story 8.7).
**FRs couverts :** FR_N0, FR29, FR30, FR31, FR32, FR33, FR34, FR35 (partiel — notes), FR38 (partiel — notes), FR41 (partiel — notes)
**UX-DRs :** UX-DR11, UX-DR12, UX-DR13 (notes), UX-DR20

### Epic 9 : Refonte visuelle Ember (desktop)
L'application adopte la direction visuelle Ember sur desktop, à fonctionnalités strictement identiques. La fin de cet epic amène la version 1.0.0.
**FRs couverts :** FR50 (affordance seule), FR51
**UX-DRs :** UX-DR30, UX-DR31, UX-DR32

### Epic 10 : Conversion mobile Ember
L'application offre une expérience mobile pensée pour le pouce, dans le style Ember. Backlog, après l'Epic 9.
**UX-DRs :** UX-DR33

---

## Epic 1 : Infrastructure, Déploiement & Design System

L'application est déployable via `docker-compose up` en une commande. Le monorepo est initialisé (Angular 21 + NestJS 11), le design system "Braise Profonde" est en place, la navigation responsive (top bar + bottom nav) est fonctionnelle, et le CI/CD tourne.

### Story 1.1 : Initialisation du monorepo et configuration du projet

En tant que développeur,
Je veux le monorepo initialisé avec Angular 21 (standalone, zoneless, SCSS) et NestJS 11 (strict) avec tous les packages requis installés,
Afin d'avoir une base de projet propre et correctement configurée pour démarrer l'implémentation.

**Critères d'acceptation :**

**Étant donné** que les commandes d'initialisation ont été exécutées,
**Quand** je lance `npm run build` dans `backend/`,
**Alors** le build NestJS réussit sans erreur avec les packages : TypeORM + mysql2, @nestjs/jwt, @nestjs/throttler, @nestjs/swagger, @nestjs/config, joi, bcrypt, class-validator, class-transformer, cookie-parser
**Et** le mode strict TypeScript est activé

**Étant donné** que le frontend est initialisé,
**Quand** je lance `ng build` dans `frontend/`,
**Alors** le build Angular réussit avec : zoneless (`provideExperimentalZonelessChangeDetection`), Angular Material installé, @angular/pwa installé, zone.js supprimé des polyfills

**Étant donné** que le backend démarre,
**Quand** `ValidationPipe` est configuré globalement dans `main.ts`,
**Alors** toute requête avec un DTO invalide retourne une erreur 400 sans configuration supplémentaire par route

**Étant donné** que Swagger est configuré,
**Quand** le backend tourne en mode dev,
**Alors** la documentation API est accessible à `/api/docs`

### Story 1.2 : Déploiement Docker Compose avec MariaDB

En tant qu'administrateur,
Je veux déployer l'application complète (backend + frontend + MariaDB) via une seule commande `docker-compose up`,
Afin que l'application soit accessible sur mon serveur auto-hébergé sans configuration supplémentaire.

**Critères d'acceptation :**

**Étant donné** que `docker-compose.yml` est configuré,
**Quand** je lance `docker-compose up`,
**Alors** les trois services démarrent : `backend` (node:22-alpine), `frontend` (nginx:alpine), `db` (mariadb:11-lts)
**Et** le frontend est accessible sur le port exposé et proxifie `/api/*` vers le backend

**Étant donné** que les variables d'environnement `DB_*` sont renseignées dans `.env`,
**Quand** le backend démarre,
**Alors** la connexion à MariaDB est établie et TypeORM est initialisé (migrations configurées, `synchronize: false`)

**Étant donné** qu'une variable d'env requise est manquante,
**Quand** le backend démarre,
**Alors** il échoue immédiatement avec un message d'erreur Joi explicite listant la variable manquante

**Étant donné** que les containers tournent,
**Quand** les Docker healthchecks s'exécutent,
**Alors** les trois services reportent l'état `healthy`

**Étant donné** que `docker-compose.override.yml` existe,
**Quand** je développe en local,
**Alors** les ports sont exposés et le hot-reload est disponible

### Story 1.3 : Pipeline CI/CD (GitFlow + GitHub Actions)

En tant que développeur,
Je veux des vérifications automatisées (lint + tests + build) sur chaque PR et un déploiement automatique sur merge dans `main`,
Afin que la qualité du code soit enforced et les déploiements automatisés.

**Critères d'acceptation :**

**Étant donné** qu'une PR est ouverte vers `develop` depuis une branche `feature/*`,
**Quand** GitHub Actions CI s'exécute,
**Alors** il lance en séquence : lint ESLint/Prettier (backend + frontend), tests Jest (backend), tests Karma (frontend), build Angular

**Étant donné** qu'un test ou le build échoue,
**Quand** le CI se termine,
**Alors** la PR est bloquée avec le statut d'échec et un message d'erreur descriptif

**Étant donné** qu'une PR est mergée dans `main`,
**Quand** le pipeline CD se déclenche (push sur main),
**Alors** :
- La version dans `package.json` (racine) est incrémentée via `npm version` selon les Conventional Commits depuis le dernier tag (`fix:` → patch, `feat:` → minor, `feat!:` → major ; défaut patch si aucun CC)
- Un commit `chore: release vX.Y.Z` est poussé sur `main` par `github-actions[bot]`
- Un tag git `vX.Y.Z` est créé et poussé
- Les images `dashboard-backend` et `dashboard-frontend` sont buildées et publiées sur GHCR avec les tags `:X.Y.Z` et `:latest`
- Une GitHub Release est créée avec changelog auto-généré
- **Aucun déploiement SSH** — l'installation manuelle se fait via `docker compose pull && docker compose up -d`

### Story 1.4 : Design System "Braise Profonde" et thème Angular Material

En tant qu'utilisateur,
Je veux une interface visuellement cohérente avec la palette "Braise Profonde" et un toggle thème clair/sombre persisté,
Afin que l'application ait une identité visuelle forte et que je puisse choisir mon mode d'affichage préféré.

**Critères d'acceptation :**

**Étant donné** que `styles.scss` est configuré,
**Quand** l'application charge,
**Alors** les tokens CSS (`--color-background`, `--color-surface`, `--color-primary`, `--color-primary-light`, `--color-on-primary`, `--color-text-primary`, `--color-text-secondary`, `--color-divider`, `--color-error`) sont définis pour les deux thèmes

**Étant donné** que le thème clair est actif,
**Quand** j'inspecte le DOM,
**Alors** la couleur primaire est `#B71C1C` (Red-900), le fond de page est `#F5F5F5`, la top bar a un fond `#FFFFFF` avec ombre légère, et les cards de catégories de liens ont un fond blanc (pas de teinte rose AM3)

**Étant donné** que la classe `.dark-theme` est appliquée sur `<body>`,
**Quand** le thème sombre est actif,
**Alors** la couleur primaire est `#EF4444` (rouge pur, sans composante rose) et le fond est `#0A0A0A`

**Étant donné** que toutes les paires texte/fond sont mesurées,
**Quand** je vérifie les ratios de contraste WCAG 2.1,
**Alors** toutes les paires critiques passent le niveau AA (≥ 4.5:1)

**Étant donné** que l'utilisateur a sélectionné le thème sombre,
**Quand** il ferme et rouvre le navigateur,
**Alors** le thème sombre est restauré avant le premier rendu (lecture localStorage au bootstrap)

### Story 1.5 : Navigation responsive (Top bar + Bottom nav)

En tant qu'utilisateur,
Je veux naviguer entre les modules via une top bar sur desktop et une bottom navigation sur mobile,
Afin de pouvoir changer de module en un clic quel que soit mon appareil.

**Critères d'acceptation :**

**Étant donné** que l'application tourne sur desktop (≥768px) et que l'utilisateur est authentifié,
**Quand** je regarde la top bar,
**Alors** je vois : logo "Dashboard", onglets de navigation (Accueil/Recettes/Notes) via `MatTabNavBar`, icône toggle thème, menu utilisateur (`MatMenu`) avec bouton déconnexion
**Et** le fond est `#FFFFFF` avec ombre légère en thème clair (app name en `#C62828`), et `#1F1F1F` en thème sombre (app name en `#EF5350`)

**Étant donné** que l'application tourne sur mobile (<768px),
**Quand** je regarde le bas de l'écran,
**Alors** je vois la bottom nav (`MatBottomNav`) avec 3 items (icône + label) : Accueil, Recettes, Notes
**Et** les onglets de la top bar ne sont pas visibles sur mobile

**Étant donné** que l'utilisateur n'est pas authentifié (page `/login` ou `/change-password`),
**Quand** je regarde la top bar,
**Alors** seuls le titre "Dashboard" (à gauche) et l'icône toggle thème sont visibles
**Et** les onglets de navigation (Accueil/Recettes/Notes) et le menu utilisateur sont masqués

**Étant donné** que je clique sur un onglet ou item de navigation,
**Quand** la route change,
**Alors** l'item actif est mis en évidence (couleur primaire + fond `rgba(primary, 0.15)`) et la route correspondante est activée

**Étant donné** que j'inspecte tous les `mat-icon-button` de la top bar,
**Quand** je vérifie les attributs ARIA,
**Alors** chaque bouton icône possède un `aria-label` descriptif

**Étant donné** que je navigue au clavier,
**Quand** j'utilise Tab et Entrée,
**Alors** tous les éléments de la top bar et de la bottom nav sont accessibles et activables

### Story 1.6 : PWA App Shell

En tant qu'utilisateur,
Je veux que l'application s'affiche correctement même sans connexion réseau,
Afin qu'ouvrir un nouvel onglet ne produise jamais d'écran d'erreur blanc.

**Critères d'acceptation :**

**Étant donné** que `@angular/pwa` est configuré et `ngsw-config.json` définit l'app shell,
**Quand** l'utilisateur charge l'application une première fois avec réseau,
**Alors** le service worker est enregistré et l'app shell est mis en cache

**Étant donné** que le service worker est actif,
**Quand** l'utilisateur ouvre l'application sans connexion réseau,
**Alors** l'app shell s'affiche sans erreur (les appels API échouent gracieusement — pas d'offline data en V1)

**Étant donné** que le `ShareModule` (routes `/share/*`) est configuré avec le service Angular Meta,
**Quand** une route publique est naviguée,
**Alors** le tag `<meta name="robots" content="noindex">` est présent dans le `<head>` du document

### Story 1.7 : Dumps automatisés de la base de données

En tant qu'administrateur,
Je veux que ma base MariaDB soit sauvegardée automatiquement à intervalles réguliers,
Afin de pouvoir restaurer l'application en cas de défaillance serveur sans perdre mes données.

**Critères d'acceptation :**

**Étant donné** que `scripts/backup.sh` existe et est exécutable,
**Quand** le script est lancé manuellement,
**Alors** il crée un dump SQL horodaté dans le répertoire `backups/`

**Étant donné** qu'un service ou cron est configuré dans `docker-compose.yml`,
**Quand** la planification se déclenche,
**Alors** un nouveau fichier de dump est créé automatiquement

**Étant donné** qu'un fichier de dump existe,
**Quand** il est restauré sur une instance MariaDB vierge,
**Alors** la base de données est dans l'état du moment de la sauvegarde

---

## Epic 2 : Authentification sécurisée

Les utilisateurs peuvent se connecter de manière sécurisée avec une session JWT persistante, une protection brute-force, un mécanisme de changement de mot de passe temporaire, et une isolation stricte des données entre comptes.

### Story 2.1 : Entités User & RefreshToken + migration initiale

En tant que système,
Je veux les entités `User` et `RefreshToken` créées en base de données via une migration TypeORM,
Afin que les données utilisateurs puissent être persistées de façon contrôlée et réversible.

**Critères d'acceptation :**

**Étant donné** que la migration initiale est générée et exécutée,
**Quand** j'inspecte la base de données,
**Alors** les tables `User` et `RefreshToken` existent avec les colonnes : `User` (id, username, passwordHash, role, mustChangePassword, isActive, createdAt, updatedAt) et `RefreshToken` (id, token, userId, expiresAt, createdAt)

**Étant donné** que `synchronize: false` est configuré dans TypeORM,
**Quand** le backend démarre,
**Alors** aucune modification de schéma n'est appliquée automatiquement — uniquement via `typeorm migration:run`

**Étant donné** qu'un `userId` est référencé dans `RefreshToken`,
**Quand** l'utilisateur correspondant est supprimé,
**Alors** ses refresh tokens sont supprimés en cascade

### Story 2.2 : Connexion sécurisée avec rate limiting

En tant qu'utilisateur non authentifié,
Je veux me connecter avec mon identifiant et mon mot de passe via un formulaire sécurisé,
Afin d'accéder à mon espace personnel Dashboard.

**Critères d'acceptation :**

**Étant donné** que `ADMIN_EMAIL` (adresse email valide) et `ADMIN_INITIAL_PASSWORD` sont renseignés dans `.env`,
**Quand** le backend démarre et qu'aucun utilisateur avec `role = 'admin'` n'existe en base,
**Alors** un compte admin est créé automatiquement avec `mustChangePassword = true` et le mot de passe hashé en bcrypt ≥ cost 12

**Étant donné** qu'un compte admin existe déjà en base,
**Quand** le backend redémarre,
**Alors** le seed est ignoré silencieusement — aucun doublon, aucune erreur

**Étant donné** que je saisis mon email et mot de passe valides,
**Quand** je soumets le formulaire de connexion,
**Alors** le backend valide le mot de passe (bcrypt ≥ cost 12), émet un JWT dans un httpOnly cookie (`SameSite=Strict`) et un refresh token en DB, puis redirige vers `/dashboard`

**Étant donné** que je saisis un email ou mot de passe invalide,
**Quand** je soumets le formulaire,
**Alors** un message d'erreur générique s'affiche sous le formulaire ("Email ou mot de passe incorrect" — sans révéler si c'est l'email ou le mot de passe qui est incorrect), les champs restent remplis

**Étant donné** que N tentatives consécutives échouent (rate limiting `@nestjs/throttler`),
**Quand** je tente une nouvelle connexion,
**Alors** le backend retourne 429 Too Many Requests et le formulaire affiche "Trop de tentatives, réessaie dans quelques instants"

**Étant donné** que l'application charge avec un JWT valide en cookie,
**Quand** le guard Angular `authGuard` vérifie l'authentification,
**Alors** l'utilisateur est redirigé directement vers `/links` sans afficher l'écran de login

### Story 2.3 : Session persistante avec refresh silencieux

En tant qu'utilisateur authentifié,
Je veux que ma session reste active entre les visites sans avoir à me reconnecter manuellement,
Afin que Dashboard s'ouvre immédiatement à chaque ouverture d'onglet.

**Critères d'acceptation :**

**Étant donné** que mon JWT a expiré mais que mon refresh token est valide,
**Quand** l'intercepteur Angular `auth-error.interceptor.ts` détecte une réponse 401,
**Alors** il appelle automatiquement `POST /api/auth/refresh`, reçoit un nouveau JWT en httpOnly cookie, et rejoue la requête originale — sans que l'utilisateur ne voie l'écran de login

**Étant donné** que mon refresh token est expiré ou révoqué,
**Quand** le refresh échoue (401 sur `/api/auth/refresh`),
**Alors** l'utilisateur est redirigé vers `/login`

**Étant donné** que le header `X-Requested-With: XMLHttpRequest` est configuré dans `csrf.interceptor.ts`,
**Quand** toute requête authentifiée est envoyée,
**Alors** le header est présent et le backend valide sa présence (mitigation CSRF)

### Story 2.4 : Déconnexion

En tant qu'utilisateur authentifié,
Je veux pouvoir me déconnecter,
Afin d'invalider ma session et protéger mon espace si je quitte un appareil partagé.

**Critères d'acceptation :**

**Étant donné** que je clique sur "Déconnexion" dans le menu utilisateur de la top bar,
**Quand** l'appel `POST /api/auth/logout` est effectué,
**Alors** le refresh token est supprimé de la base de données, le cookie JWT est effacé côté client, et je suis redirigé vers `/login`

**Étant donné** que je suis déconnecté,
**Quand** je tente d'accéder à `/dashboard` ou toute route protégée,
**Alors** le guard `authGuard` me redirige vers `/login`

### Story 2.5 : Changement de mot de passe temporaire forcé

En tant qu'utilisateur avec un mot de passe temporaire,
Je veux être forcé de choisir un nouveau mot de passe avant d'accéder à toute fonctionnalité,
Afin que mon compte soit sécurisé dès la première connexion.

**Critères d'acceptation :**

**Étant donné** que je me connecte avec un compte dont `mustChangePassword = true`,
**Quand** l'authentification réussit,
**Alors** je suis redirigé vers `/change-password` et le guard `mustChangePasswordGuard` bloque l'accès à toutes les autres routes

**Étant donné** que je suis sur la page `/change-password`,
**Quand** je saisis un nouveau mot de passe valide (confirmation identique, longueur ≥ 8 caractères),
**Alors** le backend met à jour le hash bcrypt et passe `mustChangePassword` à `false`, puis je suis redirigé vers `/dashboard`

**Étant donné** que les deux champs mot de passe ne correspondent pas,
**Quand** je soumets le formulaire,
**Alors** un message d'erreur inline s'affiche, le formulaire n'est pas soumis

### Story 2.6 : Changement de mot de passe par l'utilisateur

En tant qu'utilisateur authentifié,
Je veux pouvoir changer mon mot de passe depuis les paramètres de mon compte,
Afin de maintenir la sécurité de mon accès.

**Critères d'acceptation :**

**Étant donné** que j'accède au formulaire de changement de mot de passe (accessible depuis le menu utilisateur),
**Quand** je saisis mon mot de passe actuel (correct) et un nouveau mot de passe valide (confirmation identique, ≥ 8 caractères),
**Alors** le backend vérifie le mot de passe actuel, met à jour le hash bcrypt, et retourne 200 avec un snackbar "Mot de passe mis à jour"

**Étant donné** que je saisis un mot de passe actuel incorrect,
**Quand** je soumets le formulaire,
**Alors** le backend retourne 401 et un message d'erreur s'affiche inline sous le champ

---

## Epic 3 : Administration de l'instance

L'administrateur peut créer, gérer et réinitialiser les mots de passe des comptes utilisateurs via un panneau dédié, sans dépendance à un serveur mail.

### Story 3.0 : Setup Playwright E2E

En tant que développeur,
Je veux mettre en place Playwright dans le monorepo,
Afin que les tests E2E puissent être exécutés localement et en CI dès l'Epic 3.

**Critères d'acceptation :**

**Étant donné** que Playwright est installé (`@playwright/test`),
**Quand** je lance `npx playwright test` depuis `e2e/`,
**Alors** la commande s'exécute sans erreur sur un environnement `docker-compose up` local

**Étant donné** que Playwright est configuré,
**Quand** la CI s'exécute sur une PR `feature/* → develop`,
**Alors** l'étape `e2e` lance les tests Playwright en mode headless après le build Angular

**Étant donné** que le setup est en place,
**Quand** je lance les tests E2E,
**Alors** un test de smoke de connexion (identifiant + mot de passe → redirection `/links`) passe avec succès — premier test E2E de référence couvrant le flow le plus critique

### Story 3.1 : Panneau admin — liste des comptes utilisateurs

En tant qu'administrateur,
Je veux consulter la liste de tous les comptes de l'instance depuis un panneau dédié,
Afin d'avoir une vue d'ensemble des utilisateurs et de leur statut.

**Critères d'acceptation :**

**Étant donné** que je suis connecté en tant qu'admin,
**Quand** j'accède à `/admin`,
**Alors** le guard `adminGuard` autorise l'accès et le panneau affiche la liste de tous les comptes (identifiant, nom, rôle, statut actif/inactif)

**Étant donné** que je suis connecté en tant qu'utilisateur standard,
**Quand** je tente d'accéder à `/admin`,
**Alors** le guard `adminGuard` me redirige vers `/dashboard`

**Étant donné** que la liste des comptes est chargée,
**Quand** j'appelle `GET /api/users` avec le rôle admin,
**Alors** le backend retourne uniquement les champs non-sensibles (jamais `passwordHash`) et `RolesGuard` bloque tout accès sans rôle admin
**Et** la colonne "Email" affiche l'adresse email de chaque compte (champ `username`)

### Story 3.2 : Création d'un compte utilisateur avec mot de passe temporaire

En tant qu'administrateur,
Je veux créer un nouveau compte utilisateur en saisissant son identifiant et son nom,
Afin de lui fournir un accès à l'instance sans dépendance à un système d'email.

**Critères d'acceptation :**

**Étant donné** que je clique "Nouvel utilisateur" dans le panneau admin,
**Quand** je saisis une adresse email valide (champ `username`) et un nom d'affichage (champ `name`, obligatoire) et je valide,
**Alors** le backend valide le format email (`@IsEmail()`), génère un mot de passe temporaire aléatoire sécurisé, crée le compte avec `mustChangePassword = true` et `role = 'user'`, hache le mot de passe en bcrypt ≥ cost 12

**Étant donné** que le compte est créé,
**Quand** le formulaire se ferme,
**Alors** le mot de passe temporaire est affiché **une seule fois** à l'écran dans un encadré avec bouton "Copier" — il n'est jamais renvoyé par l'API ensuite

**Étant donné** que je tente de créer un compte avec une adresse email déjà existante,
**Quand** je soumets le formulaire,
**Alors** le backend retourne 409 Conflict et le message "Cette adresse email est déjà utilisée" s'affiche inline

**Étant donné** que je saisis une valeur qui n'est pas une adresse email valide dans le champ email,
**Quand** je soumets le formulaire,
**Alors** la validation côté client affiche "Format d'adresse e-mail invalide" — le formulaire n'est pas soumis

### Story 3.3 : Réinitialisation du mot de passe d'un utilisateur

En tant qu'administrateur,
Je veux réinitialiser le mot de passe d'un utilisateur qui a perdu l'accès à son compte,
Afin de lui fournir un nouveau mot de passe temporaire sans serveur mail.

**Critères d'acceptation :**

**Étant donné** que je clique "Réinitialiser le mot de passe" sur un compte dans la liste,
**Quand** je confirme l'action dans le dialog de confirmation (`MatDialog`),
**Alors** le backend génère un nouveau mot de passe temporaire, met à jour le hash bcrypt, passe `mustChangePassword = true`, et invalide tous les refresh tokens actifs de cet utilisateur

**Étant donné** que la réinitialisation est effectuée,
**Quand** le dialog se ferme,
**Alors** le nouveau mot de passe temporaire est affiché **une seule fois** à l'écran avec bouton "Copier"

### Story 3.4 : Désactivation et suppression d'un compte utilisateur

En tant qu'administrateur,
Je veux désactiver ou supprimer un compte utilisateur,
Afin de révoquer l'accès à l'instance sans nécessairement effacer toutes ses données.

**Critères d'acceptation :**

**Étant donné** que je clique "Désactiver" sur un compte actif,
**Quand** je confirme dans le dialog de confirmation,
**Alors** le backend passe `isActive = false` sur le compte et invalide tous ses refresh tokens — l'utilisateur est déconnecté immédiatement si sa session était active

**Étant donné** qu'un compte est désactivé,
**Quand** cet utilisateur tente de se connecter,
**Alors** le backend retourne 401 avec un message d'erreur générique (sans révéler la raison de désactivation)

**Étant donné** que je clique "Supprimer" sur un compte,
**Quand** je confirme dans le dialog de confirmation (`MatDialog`, bouton destructif),
**Alors** le backend supprime le compte (hard delete) ainsi que tous ses refresh tokens

**Étant donné** que je suis admin,
**Quand** j'essaie de désactiver ou supprimer mon propre compte admin,
**Alors** le backend retourne 403 et l'action est bloquée (protection contre le verrouillage de l'instance)

### Story 3.5 : Page profil utilisateur

En tant qu'utilisateur authentifié,
Je veux accéder à une page de profil depuis le menu utilisateur, pouvoir modifier mon nom d'affichage et accéder au changement de mot de passe depuis cette page,
Afin de gérer mes informations personnelles en un seul endroit.

**Critères d'acceptation :**

**Étant donné** que je clique "Mon profil" dans le menu utilisateur de la top bar,
**Quand** je navigue vers `/profile`,
**Alors** la page affiche : mon adresse email (lecture seule), mon nom d'affichage (champ éditable pré-rempli) et un bouton "Changer le mot de passe"

**Étant donné** que je modifie mon nom d'affichage et clique "Sauvegarder",
**Quand** `PATCH /api/users/me` est appelé avec le nouveau nom,
**Alors** le backend met à jour le champ `name`, retourne 200, et un snackbar "Profil mis à jour" s'affiche

**Étant donné** que je soumets le formulaire avec un nom vide,
**Quand** la validation s'exécute,
**Alors** une erreur inline "Le nom d'affichage est obligatoire" s'affiche — le formulaire n'est pas soumis

**Étant donné** que je clique "Changer le mot de passe",
**Quand** je navigue,
**Alors** je suis redirigé vers `/change-password` (route existante, Story 2.6)

**Étant donné** que je suis connecté en tant qu'utilisateur standard,
**Quand** j'accède à `/profile`,
**Alors** la page est accessible — pas de restriction de rôle

### Scénarios E2E
- Modifier le nom d'affichage → vérifier snackbar + persistance après rechargement
- Cliquer "Changer le mot de passe" → vérifier redirection vers `/change-password`
- Soumettre avec nom vide → vérifier erreur inline

### Story 3.6 : Responsive mobile du panneau admin

En tant qu'administrateur sur mobile,
Je veux que le panneau d'administration soit entièrement utilisable sur mon téléphone,
Afin de pouvoir gérer les comptes utilisateurs sans blocage sur petit écran.

> **Origine :** Sprint Change Proposal 2026-05-18 — trois défauts bloquants détectés post-implémentation : scroll horizontal page, menu top bar inaccessible, modals hors viewport.

**Critères d'acceptation :**

**Étant donné** que j'accède à `/admin` sur un viewport mobile (< 768px),
**Quand** la page charge,
**Alors** les utilisateurs s'affichent sous forme de cards (email, nom, badges, boutons d'action) — aucun scroll horizontal sur la page

**Étant donné** que je suis sur la page admin en mobile,
**Quand** je clique sur le menu utilisateur en haut à droite de la top bar,
**Alors** le menu s'ouvre correctement

**Étant donné** que je clique "Nouvel utilisateur" sur mobile,
**Quand** la modal s'ouvre,
**Alors** elle est entièrement visible dans le viewport (max 95vw)

**Étant donné** que je clique une action (réinitialiser, désactiver, supprimer) sur mobile,
**Quand** le dialog de confirmation s'ouvre,
**Alors** il est entièrement visible et les boutons sont accessibles

**Étant donné** que j'accède à `/admin` sur desktop (≥ 768px),
**Quand** la page charge,
**Alors** le tableau existant s'affiche sans régression

### Scénarios E2E
- Viewport mobile 390×844 : accéder à `/admin` → vérifier absence de scroll horizontal sur `body`
- Viewport mobile 390×844 : cliquer le menu utilisateur → vérifier que le menu s'ouvre
- Viewport mobile 390×844 : cliquer "Nouvel utilisateur" → vérifier que la modal est dans le viewport
- Viewport desktop 1280×800 : vérifier que `[data-testid="user-list"]` est visible

---

## Epic 4 : Module Liens

Manu peut accéder instantanément à ses liens organisés par catégories depuis sa page d'accueil, basculer en mode édition pour ajouter/réorganiser ses liens avec favicon auto-récupéré, et choisir son thème clair/sombre. C'est la vue par défaut après connexion.

### Story 4.1 : Entités Link, LinkCategory + migrations

En tant que système,
Je veux les entités `LinkCategory` et `Link` créées en base via une migration TypeORM,
Afin que les catégories et fiches de liens puissent être persistées par utilisateur.

**Critères d'acceptation :**

**Étant donné** que la migration est exécutée,
**Quand** j'inspecte la base de données,
**Alors** les tables `LinkCategory` (id, name, emoji, position, userId, createdAt, updatedAt) et `Link` (id, url, title, description, faviconUrl, position, categoryId, userId, createdAt, updatedAt) existent

**Étant donné** qu'un `userId` est référencé dans `LinkCategory` ou `Link`,
**Quand** je récupère des catégories ou liens via l'API,
**Alors** le service filtre systématiquement par `userId` extrait du JWT — aucune donnée d'un autre compte n'est accessible

**Étant donné** qu'une `LinkCategory` est supprimée,
**Quand** la suppression est effectuée,
**Alors** tous les `Link` associés sont supprimés en cascade

### Story 4.2 : CRUD des catégories de liens

En tant qu'utilisateur authentifié,
Je veux créer, modifier, supprimer et réorganiser mes catégories de liens,
Afin de structurer mes liens par thèmes.

**Critères d'acceptation :**

**Étant donné** que je suis en mode édition sur la page Liens,
**Quand** je clique "Ajouter une catégorie", saisis un nom (et optionnellement sélectionne une icône Material via le sélecteur intégré) et valide,
**Alors** `POST /api/link-categories` crée la catégorie, elle apparaît en bas de la liste avec un snackbar "Catégorie ajoutée"

**Étant donné** qu'une catégorie existe,
**Quand** je modifie son nom ou son icône Material et sauvegarde,
**Alors** `PATCH /api/link-categories/:id` met à jour la catégorie et la vue se rafraîchit

**Étant donné** qu'une catégorie existe,
**Quand** je clique "Supprimer" et confirme dans le `MatDialog`,
**Alors** `DELETE /api/link-categories/:id` supprime la catégorie et tous ses liens, avec snackbar de confirmation

**Étant donné** que je glisse-dépose une catégorie vers une nouvelle position,
**Quand** le drag & drop se termine (Angular CDK),
**Alors** `PATCH /api/link-categories/reorder` met à jour les positions de toutes les catégories affectées

### Story 4.3 : CRUD des liens avec favicon auto-récupéré

En tant qu'utilisateur authentifié,
Je veux créer, modifier et supprimer des fiches de liens avec favicon automatiquement récupéré depuis l'URL,
Afin de retrouver rapidement mes liens grâce à leur identité visuelle.

**Critères d'acceptation :**

**Étant donné** que je suis en mode édition et clique "Ajouter un lien" dans une catégorie,
**Quand** je saisis une URL et que le champ perd le focus,
**Alors** le backend appelle `OgFetchService` (requête server-side avec timeout court), le favicon et le titre OG sont pré-remplis dans le formulaire — un spinner inline 16px s'affiche pendant la récupération

**Étant donné** que la récupération du favicon échoue (timeout, URL inaccessible),
**Quand** l'erreur est reçue,
**Alors** la sauvegarde du lien reste possible (fallback : initiale du titre en lieu et place du favicon), aucun message d'erreur bloquant

**Étant donné** que je valide le formulaire de création de lien,
**Quand** `POST /api/links` est appelé,
**Alors** le lien est créé et apparaît immédiatement dans la catégorie avec snackbar "Lien ajouté"

**Étant donné** qu'un lien existe,
**Quand** je le modifie (titre, URL, description) et sauvegarde,
**Alors** `PATCH /api/links/:id` met à jour le lien

**Étant donné** qu'un lien existe,
**Quand** je clique "Supprimer" et confirme dans le `MatDialog`,
**Alors** `DELETE /api/links/:id` supprime le lien avec snackbar de confirmation

**Étant donné** que je glisse-dépose un lien vers une nouvelle position dans sa catégorie,
**Quand** le drag & drop se termine,
**Alors** `PATCH /api/links/reorder` met à jour les positions

### Story 4.4 : Toggle mode lecture / mode édition

En tant qu'utilisateur authentifié,
Je veux basculer entre un mode lecture (interface épurée) et un mode édition (contrôles visibles),
Afin que ma page d'accueil quotidienne soit sans bruit visuel sauf quand j'édite.

**Critères d'acceptation :**

**Étant donné** que la page d'accueil charge,
**Quand** j'arrive sur `/dashboard`,
**Alors** le mode lecture est actif par défaut : aucun bouton d'édition visible sur les catégories ou les liens

**Étant donné** que je suis en mode lecture,
**Quand** je clique le bouton "Modifier" (label + icône, `mat-icon-button`) dans la top bar ou en haut de page,
**Alors** une transition animée (200ms) fait apparaître les contrôles d'édition sur chaque `LinkCategoryCard` et `LinkItem`

**Étant donné** que je suis en mode édition,
**Quand** je clique "Terminer",
**Alors** les contrôles d'édition disparaissent (200ms) et le mode lecture est restauré

**Étant donné** que je change de module (Recettes ou Notes) alors que je suis en mode édition,
**Quand** je reviens sur Liens,
**Alors** le mode lecture est actif (pas de persistance du mode édition)

### Story 4.5 : Composants LinkCategoryCard et LinkItem

En tant qu'utilisateur,
Je veux voir mes catégories sous forme de cards collapsibles avec mes liens cliquables et leur favicon,
Afin d'accéder visuellement et rapidement à mes ressources organisées.

**Critères d'acceptation :**

**Étant donné** que la page Liens charge,
**Quand** les catégories sont affichées,
**Alors** chaque `LinkCategoryCard` affiche : icône Material (`<mat-icon>`, fallback `folder_open` si non définie) + nom de la catégorie + badge `MatChip` (nombre de liens) + chevron collapse
**Et** la card est élevée (box-shadow selon design direction 03)

**Étant donné** qu'une catégorie est dépliée,
**Quand** j'inspecte les liens,
**Alors** chaque `LinkItem` affiche : favicon 16×16 (fallback : lettre initiale si favicon absent) + titre cliquable (`target="_blank" rel="noopener noreferrer"`)

**Étant donné** que je clique sur le header d'une catégorie,
**Quand** la catégorie bascule,
**Alors** elle se replie/déplie avec `aria-expanded` mis à jour correctement

**Étant donné** que la page est sur mobile (<768px),
**Quand** j'affiche les catégories,
**Alors** les cards sont en 1 colonne full-width avec padding 12px

**Étant donné** que la page est sur desktop (≥768px),
**Quand** j'affiche les catégories,
**Alors** la grid est `repeat(auto-fill, minmax(280px, 1fr))` avec gap 16px et padding 16px

### Story 4.6 : Vue par défaut, état vide et thème clair/sombre

En tant qu'utilisateur authentifié,
Je veux que la page Liens soit ma vue par défaut après connexion, voir un état vide actionnable quand je n'ai pas encore de liens, et choisir mon thème clair ou sombre,
Afin que Dashboard soit immédiatement utile dès la première utilisation et personnalisé à mes préférences.

**Critères d'acceptation :**

**Étant donné** que je me connecte avec succès,
**Quand** l'authentification réussit,
**Alors** je suis redirigé vers `/dashboard` (vue par défaut)

**Étant donné** que l'utilisateur est connecté et accède à `/dashboard`,
**Quand** la page charge,
**Alors** le titre h1 de la page affiche "Dashboard de [nom d'affichage de l'utilisateur]"
(le nom d'affichage est lu depuis le service d'authentification — champ `name` déjà disponible)

**Étant donné** que mon espace Liens est vide (aucune catégorie),
**Quand** j'accède à `/dashboard`,
**Alors** un état vide s'affiche : icône outline centrée + message "Aucun lien pour l'instant" + bouton CTA "Ajouter une catégorie"

**Étant donné** que je clique l'icône toggle thème dans la top bar,
**Quand** le thème change,
**Alors** la classe `.dark-theme` est ajoutée/retirée de `<body>`, les tokens CSS et le thème Angular Material s'appliquent immédiatement

**Étant donné** que j'ai sélectionné le thème sombre,
**Quand** je ferme et rouvre le navigateur,
**Alors** le thème sombre est restauré depuis localStorage avant le premier rendu

**Étant donné** que le module charge pour la première fois,
**Quand** les données arrivent de l'API,
**Alors** les skeleton screens sont remplacés par les vraies cards sans flash de contenu vide

### Story 4.7 : Déplacement d'un lien entre catégories par drag & drop

En tant qu'utilisateur authentifié,
Je veux déplacer un lien d'une catégorie vers une autre par drag & drop,
Afin de réorganiser mes liens sans avoir à le supprimer et le recréer.

**Critères d'acceptation :**

**Étant donné** que je suis en mode édition et que je glisse un lien hors de sa catégorie,
**Quand** je le lâche sur une autre catégorie (dépliée ou repliée),
**Alors** le lien apparaît immédiatement dans la catégorie cible (optimistic update) et `PATCH /api/links/:id` est appelé avec le nouveau `categoryId`

**Étant donné** que je glisse un lien vers une catégorie cible,
**Quand** je survole la zone de drop,
**Alors** la zone est visuellement surlignée (classe `.cdk-drop-list-receiving`)

**Étant donné** que le `PATCH /api/links/:id` échoue,
**Quand** l'erreur réseau est reçue,
**Alors** le lien revient dans sa catégorie d'origine et une snackbar "Erreur lors du déplacement" s'affiche 3s

**Étant donné** que je suis en mode lecture,
**Quand** j'essaie de glisser un lien,
**Alors** le drag est désactivé (`[cdkDragDisabled]="!editMode"`)

---

### Story 4.8 : Paramétrage de l'affichage des cards en mode lecture

En tant qu'utilisateur sur un écran large,
Je veux configurer le nombre de colonnes, la largeur des cards et l'espacement depuis un widget discret,
Afin que l'espace disponible de mon écran soit pleinement utilisé.

**Critères d'acceptation :**

**Étant donné** que je suis en mode lecture sur un viewport ≥ 600 px,
**Quand** j'accède à la page Liens,
**Alors** une icône ⚙️ (`mat-icon-button`, `aria-label="Paramètres d'affichage"`) est visible à côté du bouton "Modifier" dans la barre d'action

**Étant donné** que je clique l'icône ⚙️,
**Quand** le popover s'ouvre (MatMenu),
**Alors** il affiche quatre contrôles :
- Nombre de colonnes : stepper, valeurs 1–6, défaut 3
- Largeur des cards : slider, valeurs 200–600 px (pas 10 px), défaut 280 px
- Espacement horizontal : slider, valeurs 8–48 px (pas 4 px), défaut 16 px
- Espacement vertical : slider, valeurs 8–48 px (pas 4 px), défaut 16 px

**Étant donné** que je modifie un paramètre,
**Quand** la valeur change,
**Alors** la grid se met à jour immédiatement via les CSS custom properties `--link-columns`, `--link-card-width`, `--link-gap-h`, `--link-gap-v`
(grid : `repeat(var(--link-columns), minmax(var(--link-card-width), 1fr))`)

**Étant donné** que je ferme et rouvre le navigateur sur le même device,
**Quand** la page Liens charge,
**Alors** mes paramètres sont restaurés depuis localStorage (clé `links-grid-settings : { columns, cardWidth, gapH, gapV }`) avant le premier rendu

**Étant donné** que le viewport passe sous 600 px (mobile),
**Quand** la page s'affiche,
**Alors** l'icône ⚙️ est masquée, la grid est forcée à 1 colonne (les CSS custom properties de paramétrage sont ignorées)

**Étant donné** que je suis en mode édition,
**Quand** j'inspecte la barre d'action,
**Alors** l'icône ⚙️ n'est pas visible

**Étant donné** qu'aucun paramètre n'est enregistré dans localStorage,
**Quand** je charge la page pour la première fois,
**Alors** les valeurs par défaut s'appliquent (3 colonnes, 280 px, 16 px H, 16 px V)

### Scénarios E2E
- Viewport 1920px : ouvrir le popover ⚙️ → passer à 5 colonnes → vérifier que la grid affiche 5 colonnes
- Recharger la page → vérifier que 5 colonnes est restauré depuis localStorage
- Passer en mode édition → vérifier que l'icône ⚙️ disparaît
- Viewport 390px : vérifier que l'icône ⚙️ est masquée et que la grid est en 1 colonne

---

### Story 4.9 : Sélecteur d'icônes Material pour les catégories

En tant qu'utilisateur authentifié,
Je veux choisir une icône Material depuis un sélecteur intégré lors de la création ou modification d'une catégorie,
Afin de trouver facilement une icône représentative sans quitter l'application.

> **Origine :** Sprint Change Proposal 2026-05-20 — remplacement du champ texte emoji (copier-coller depuis internet) par un moteur de recherche d'icônes Material intégré à l'application.

**Critères d'acceptation :**

**AC1 — Affichage du sélecteur**
**Étant donné** que j'ouvre le dialog de création ou modification d'une catégorie,
**Quand** le dialog s'affiche,
**Alors** le champ "emoji" est remplacé par un bouton "Choisir une icône" qui ouvre un sélecteur d'icônes Material (panneau ou dialog imbriqué)

**AC2 — Recherche d'icône**
**Étant donné** que le sélecteur est ouvert,
**Quand** je saisis un terme dans le champ de recherche (ex: "home", "link"),
**Alors** les icônes correspondantes s'affichent en grille en temps réel (filtrage côté client sur une liste statique d'icônes Material bundlée en assets)

**AC3 — Sélection d'une icône**
**Étant donné** que je clique sur une icône dans la grille,
**Quand** la sélection est confirmée,
**Alors** l'icône sélectionnée s'affiche en aperçu dans le dialog de catégorie et son nom technique (ex: "favorite_border") est stocké lors de la validation

**AC4 — Icône optionnelle / effacement**
**Étant donné** qu'une icône est sélectionnée,
**Quand** je clique "Effacer",
**Alors** le champ icône repasse à null et le dialog de catégorie affiche l'état "Aucune icône"

**AC5 — Affichage dans la card**
**Étant donné** qu'une catégorie possède une icône définie,
**Quand** la page Liens charge,
**Alors** le header de la `LinkCategoryCard` affiche `<mat-icon>` avec le nom technique stocké (ex: `<mat-icon>favorite_border</mat-icon>`)

**Étant donné** qu'aucune icône n'est définie pour une catégorie,
**Quand** la page Liens charge,
**Alors** l'icône de fallback `folder_open` s'affiche dans le header de la card

**AC6 — Migration base de données**
**Étant donné** que la colonne `emoji varchar(10)` ne peut pas contenir les noms d'icônes Material (jusqu'à ~40 chars),
**Quand** la migration TypeORM est exécutée,
**Alors** la colonne est renommée `icon` et étendue à `varchar(50)`
— Les données existantes sont préservées telles quelles (affichage dégradé acceptable — remplacées lors de la prochaine modification de catégorie)

### Scénarios E2E
- Ouvrir dialog création → rechercher "home" → sélectionner l'icône → valider → vérifier `<mat-icon>home</mat-icon>` dans la card
- Ouvrir dialog édition d'une catégorie existante → cliquer "Effacer" → valider → vérifier fallback `folder_open` dans la card
- Rechercher "calendar" dans le sélecteur → vérifier que les icônes filtrées s'affichent en grille

---

## Epic 5 : Module Recettes

Manu peut créer, organiser et consulter ses recettes avec adaptation en temps réel du nombre de convives, recherche instantanée, et réorganisation par drag & drop des ingrédients et étapes.

### Story 5.1 : Entités Recipe, RecipeIngredient, RecipeStep + migrations

En tant que système,
Je veux les entités `Recipe`, `RecipeIngredient` et `RecipeStep` créées en base via une migration TypeORM,
Afin que les recettes avec leurs ingrédients structurés et leurs étapes puissent être persistées par utilisateur.

**Critères d'acceptation :**

**Étant donné** que la migration est exécutée,
**Quand** j'inspecte la base de données,
**Alors** les tables existent avec les colonnes : `Recipe` (id, title, category, servings, imageUrl, userId, createdAt, updatedAt), `RecipeIngredient` (id, quantity, unit, name, position, recipeId), `RecipeStep` (id, content, position, recipeId)

**Étant donné** qu'un `userId` est référencé dans `Recipe`,
**Quand** je récupère des recettes via l'API,
**Alors** le service filtre systématiquement par `userId` extrait du JWT

**Étant donné** qu'une `Recipe` est supprimée,
**Quand** la suppression est effectuée,
**Alors** tous ses `RecipeIngredient` et `RecipeStep` sont supprimés en cascade

### Story 5.2 : Liste des recettes avec catégories et recherche en temps réel

En tant qu'utilisateur authentifié,
Je veux voir mes recettes organisées par catégories avec une barre de recherche en temps réel,
Afin de retrouver instantanément une recette que je cherche, notamment depuis mon téléphone en cuisine.

**Critères d'acceptation :**

**Étant donné** que j'accède à `/recipes`,
**Quand** les recettes sont chargées,
**Alors** elles s'affichent groupées par catégories (cards collapsibles `MatExpansionPanel`) avec le nom et un aperçu de chaque recette

**Étant donné** que mon espace Recettes est vide,
**Quand** j'accède à `/recipes`,
**Alors** un état vide s'affiche : icône + "Aucune recette enregistrée" + bouton "Ajouter une recette"

**Étant donné** que je saisis du texte dans la barre de recherche,
**Quand** au moins 1 caractère est saisi (debounce 200ms),
**Alors** la vue catégorisée est remplacée par une liste filtrée côté client correspondant au titre ou à la catégorie — `aria-live="polite"` annonce le nombre de résultats

**Étant donné** que la recherche retourne 0 résultats,
**Quand** le filtre est appliqué,
**Alors** le message "Aucun résultat pour « [terme] »" s'affiche sans bouton CTA

**Étant donné** que j'efface le champ de recherche (bouton clear ×),
**Quand** le champ est vide,
**Alors** la vue catégorisée complète est restaurée immédiatement

### Story 5.3 : Création et édition d'une recette

En tant qu'utilisateur authentifié,
Je veux créer et modifier une recette avec titre, catégorie, ingrédients structurés et étapes formatées,
Afin de sauvegarder mes recettes de façon organisée et réutilisable.

**Critères d'acceptation :**

**Étant donné** que je clique "Ajouter une recette",
**Quand** j'arrive sur `/recipes/new`,
**Alors** un formulaire s'affiche avec : champ titre (obligatoire), sélecteur catégorie, nombre de convives par défaut, section ingrédients dynamique (`FormArray` via `RecipeIngredientRow`), section étapes dynamique (`MarkdownLightEditor`)

**Étant donné** que je suis dans le formulaire,
**Quand** je clique "Ajouter un ingrédient",
**Alors** une nouvelle ligne `RecipeIngredientRow` apparaît (champs : quantité, unité, nom) avec bouton supprimer

**Étant donné** que je glisse-dépose un ingrédient ou une étape,
**Quand** le drag & drop Angular CDK se termine,
**Alors** l'ordre est mis à jour visuellement et reflété dans le `FormArray`

**Étant donné** que je soumets le formulaire avec tous les champs obligatoires valides,
**Quand** `POST /api/recipes` est appelé,
**Alors** la recette est créée avec ses ingrédients et étapes, je suis redirigé vers la page détail, snackbar "Recette créée"

**Étant donné** que j'accède à `/recipes/:id/edit`,
**Quand** le formulaire charge,
**Alors** tous les champs sont pré-remplis avec les données existantes de la recette

### Story 5.4 : Page détail recette avec stepper convives

En tant qu'utilisateur authentifié,
Je veux consulter une recette avec son stepper de convives pour recalculer les quantités en temps réel,
Afin de préparer la recette pour le bon nombre de personnes depuis mon téléphone en cuisine.

**Critères d'acceptation :**

**Étant donné** que je tape sur une recette dans la liste,
**Quand** j'arrive sur `/recipes/:id`,
**Alors** la page affiche : titre, image (le cas échéant), `ConvivesSteppper` avec la valeur par défaut, liste des ingrédients, liste des étapes

**Étant donné** que le stepper convives affiche N personnes,
**Quand** je clique le bouton "+" ou "−",
**Alors** les quantités de tous les ingrédients sont recalculées immédiatement (< 100ms, calcul côté client) et affichées avec la nouvelle valeur — le minimum est 1

**Étant donné** que la page est sur mobile (<768px),
**Quand** j'affiche la page détail,
**Alors** le stepper est en haut, puis les ingrédients, puis les étapes en colonne (layout empilé)

**Étant donné** que la page est sur desktop (≥768px),
**Quand** j'affiche la page détail,
**Alors** le stepper est en haut, puis ingrédients et étapes en 2 colonnes côte à côte

**Étant donné** que j'inspecte le `ConvivesSteppper`,
**Quand** je vérifie les attributs ARIA,
**Alors** `role="spinbutton"`, `aria-valuenow`, `aria-valuemin` sont présents et les boutons +/− ont une taille minimale de 48×48px

### Story 5.5 : Suppression d'une recette

En tant qu'utilisateur authentifié,
Je veux supprimer une recette dont je n'ai plus besoin,
Afin de garder mon espace propre.

**Critères d'acceptation :**

**Étant donné** que je suis sur la page détail d'une recette ou dans la liste,
**Quand** je clique "Supprimer" et confirme dans le `MatDialog` (bouton destructif `warn`),
**Alors** `DELETE /api/recipes/:id` supprime la recette avec tous ses ingrédients et étapes, je suis redirigé vers `/recipes`, snackbar "Recette supprimée"

**Étant donné** que je tente de supprimer une recette qui ne m'appartient pas,
**Quand** `DELETE /api/recipes/:id` est appelé,
**Alors** le backend retourne 403 Forbidden (isolation userId enforced)

### Story 5.6 : Référentiel de catégories et autocomplétion dans l'éditeur de recette

> **Origine :** Sprint Change Proposal 2026-06-03 — absence d'autocomplétion entraînant des doublons sémantiques (ex : "Dessert" / "Desserts").

En tant qu'utilisateur authentifié,
Je veux que le champ catégorie et les champs ingrédient/unité de l'éditeur de recette proposent de l'autocomplétion à partir de mes données existantes,
Afin d'éviter les doublons et d'accélérer la saisie.

**Critères d'acceptation :**

**Backend — Entité & migration**

**Étant donné** que la migration TypeORM est exécutée,
**Quand** j'inspecte la base de données,
**Alors** la table `RecipeCategory` existe (id, name VARCHAR(100), userId, createdAt, updatedAt)
**Et** la table `Recipe` possède une colonne `categoryId` INT nullable (FK vers `RecipeCategory`)
**Et** l'ancienne colonne `category VARCHAR` n'existe plus dans `Recipe`

**Étant donné** que je crée ou modifie une recette avec `categoryName: "Dessert"`,
**Quand** le service `RecipesService` traite la requête,
**Alors** il vérifie si une `RecipeCategory` avec `name = "Dessert"` et `userId` correspondant existe déjà :
- Si oui → réutilise l'id existant
- Si non → crée silencieusement la `RecipeCategory` et utilise son id
**Et** la `Recipe` est sauvegardée avec le `categoryId` résultant

**Étant donné** que le champ catégorie est laissé vide lors de la soumission,
**Quand** la recette est créée ou mise à jour,
**Alors** `categoryId` est null — la recette est sauvegardée sans catégorie

**Backend — Endpoints autocomplétion**

**Étant donné** que je suis authentifié,
**Quand** j'appelle `GET /api/recipe-categories`,
**Alors** le backend retourne la liste des `RecipeCategory` de l'utilisateur (id + name)

**Quand** j'appelle `GET /api/recipe-categories/ingredient-suggestions`,
**Alors** le backend retourne les noms d'ingrédients distincts de l'utilisateur
(`SELECT DISTINCT name FROM RecipeIngredient JOIN Recipe WHERE Recipe.userId = ?`, triés alphabétiquement)

**Quand** j'appelle `GET /api/recipe-categories/unit-suggestions`,
**Alors** le backend retourne les unités distinctes de l'utilisateur
(`SELECT DISTINCT unit FROM RecipeIngredient JOIN Recipe WHERE Recipe.userId = ? AND unit IS NOT NULL AND unit != ''`, triées alphabétiquement)

**Frontend — Champ catégorie (`recipe-editor.component`)**

**Étant donné** que j'ouvre le formulaire de création ou d'édition d'une recette,
**Quand** je clique sur le champ catégorie,
**Alors** un `MatAutocomplete` affiche la liste de mes catégories existantes

**Étant donné** que je commence à taper dans le champ catégorie,
**Quand** je saisis au moins 1 caractère,
**Alors** la liste est filtrée côté client (insensible à la casse) pour ne montrer que les catégories correspondantes

**Étant donné** que je saisis une catégorie qui n'existe pas encore (ex : "Plat"),
**Quand** je soumets le formulaire,
**Alors** le formulaire envoie `categoryName: "Plat"` au backend qui la crée silencieusement
**Et** la recette est sauvegardée normalement

**Frontend — Champs ingrédient (`recipe-ingredient-row.component`)**

**Étant donné** que je saisis dans le champ nom d'un ingrédient,
**Quand** je tape au moins 1 caractère,
**Alors** un `MatAutocomplete` filtre (insensible à la casse) les noms d'ingrédients existants de mes recettes
**Et** je peux sélectionner une suggestion ou saisir un nouveau nom librement

**Étant donné** que je saisis dans le champ unité d'un ingrédient,
**Quand** je tape au moins 1 caractère,
**Alors** un `MatAutocomplete` filtre (insensible à la casse) les unités existantes de mes recettes
**Et** je peux sélectionner une suggestion ou saisir une nouvelle unité librement

**Frontend — Adaptations affichage**

**Étant donné** que j'accède à `/recipes`,
**Quand** les recettes sont chargées,
**Alors** le groupement par catégorie utilise `recipe.category?.name` (au lieu de `recipe.category` string)
**Et** les recettes sans catégorie sont regroupées sous "Sans catégorie"

**Étant donné** que j'accède à la page détail d'une recette (`/recipes/:id`),
**Quand** la page charge,
**Alors** le nom de catégorie affiché est `recipe.category?.name`

### Scénarios E2E
- Créer une recette avec une nouvelle catégorie "Soupe" → vérifier qu'elle apparaît dans l'autocomplete à la création d'une 2e recette
- Taper "so" dans le champ catégorie → vérifier que "Soupe" apparaît dans les suggestions
- Sélectionner "Soupe" depuis l'autocomplete → vérifier que le nom est exactement "Soupe" en base
- Créer une recette avec l'ingrédient "poulet" → vérifier que "poulet" apparaît dans les suggestions ingrédient d'une 2e recette
- Soumettre sans catégorie → vérifier que la recette est créée avec categoryId null

---

## Epic 6 : Partage public (recettes)

Manu peut partager une **recette** via un lien public sécurisé (CSPRNG 256 bits) avec expiration configurable et révocation à la demande. Les visiteurs accèdent à la recette directement, sans compte, et peuvent utiliser le stepper convives. L'infrastructure de partage (entité `PublicToken`, API `/api/sharing`, composant `ShareLinkDialog`) est posée ici et réutilisée dans Épic 8 pour étendre le partage aux notes.

### Story 6.1 : Entité PublicToken + migration

En tant que système,
Je veux l'entité `PublicToken` créée en base via une migration TypeORM,
Afin que les jetons de partage public puissent être stockés, validés et révoqués.

**Critères d'acceptation :**

**Étant donné** que la migration est exécutée,
**Quand** j'inspecte la base de données,
**Alors** la table `PublicToken` existe avec les colonnes : id, token (varchar, unique, index), resourceType (enum : 'recipe' | 'note'), resourceId, userId, expiresAt (nullable), createdAt, revokedAt (nullable)
> Note : la valeur `'note'` sera activement utilisée à partir de l'Épic 8 (notes intégrées Dashboard).

**Étant donné** qu'un token est consulté par l'API publique,
**Quand** le service vérifie sa validité,
**Alors** il contrôle : token existant, `revokedAt IS NULL`, `expiresAt IS NULL OR expiresAt > NOW()`

**Étant donné** qu'un `userId` est référencé dans `PublicToken`,
**Quand** l'utilisateur est supprimé,
**Alors** tous ses tokens sont supprimés en cascade

### Story 6.2 : Génération et gestion d'un lien de partage (recettes)

En tant qu'utilisateur authentifié,
Je veux générer un lien public pour partager une **recette**, choisir sa durée d'expiration et le révoquer à tout moment,
Afin de partager mes recettes de façon sécurisée et contrôlée.

> **Note :** Cette story couvre le partage des **recettes uniquement**. Le partage des notes sera ajouté en Story 8.7 (Épic 8), une fois les entités `Note` disponibles. Le composant `ShareLinkDialog` et l'API `/api/sharing` sont conçus dès maintenant pour supporter `resourceType: 'recipe' | 'note'`, mais seul `'recipe'` est utilisé dans cette épic.

**Critères d'acceptation :**

**Étant donné** que je clique l'icône "Partager" sur une **recette**,
**Quand** le `ShareLinkDialog` (`MatDialog`) s'ouvre,
**Alors** il affiche un radio group avec 4 options d'expiration : 24h, 7j, 30j, Permanent

**Étant donné** que je clique "Générer le lien",
**Quand** `POST /api/sharing` est appelé avec `resourceType: 'recipe'`,
**Alors** le backend génère un token via `crypto.randomBytes(32)` (256 bits d'entropie, URL-safe base64), le stocke en DB avec l'expiration choisie, et retourne l'URL complète du lien partagé

**Étant donné** que le lien est généré,
**Quand** il s'affiche dans le dialog,
**Alors** il est automatiquement copié dans le presse-papier avec snackbar "Lien copié ✓", et un badge "Partagé" + icône cadenas apparaît sur la recette concernée

**Étant donné** qu'un lien est actif,
**Quand** je clique "Révoquer" dans le dialog et confirme,
**Alors** `PATCH /api/sharing/:id/revoke` marque `revokedAt = NOW()`, le badge "Partagé" disparaît, le dialog passe à l'état `revoked`

**Étant donné** qu'une recette a déjà un lien actif,
**Quand** j'ouvre le `ShareLinkDialog`,
**Alors** le lien existant est affiché avec son statut et son expiration — un second lien peut être généré si nécessaire

### Story 6.3 : Vue publique lecture seule (recette)

En tant que visiteur non authentifié,
Je veux accéder à une recette partagée via son lien public sans créer de compte,
Afin de consulter la recette et ajuster le nombre de convives librement.

**Critères d'acceptation :**

**Étant donné** que je clique un lien partagé valide vers une recette (`/share/:token`),
**Quand** la page charge,
**Alors** la recette complète s'affiche (titre, ingrédients, étapes) avec une mini top bar identifiant "Dashboard" — aucun lien de navigation vers l'intérieur de l'application n'est visible

**Étant donné** que je suis sur la vue publique d'une recette,
**Quand** j'utilise le `ConvivesSteppper`,
**Alors** les quantités des ingrédients sont recalculées immédiatement côté client — aucune authentification requise

**Étant donné** que je suis sur la vue publique,
**Quand** j'inspecte le `<head>` de la page,
**Alors** le tag `<meta name="robots" content="noindex">` est présent

> **Note (story 5.7)** : la vue publique doit afficher le champ `avantPropos` si présent, selon le même pattern conditionnel que la vue détail authentifiée — positionné entre l'image et le ConvivesSteppper.

**Étant donné** que la vue publique est en thème clair par défaut,
**Quand** un visiteur non authentifié accède au lien,
**Alors** le thème clair est appliqué indépendamment des préférences de l'auteur

**Étant donné** que le backend reçoit une requête `GET /api/sharing/:token`,
**Quand** le token est valide,
**Alors** le service retourne le contenu en lecture seule — `SharingController` n'a aucun `JwtAuthGuard` mais valide le token CSPRNG et son expiration côté API

### Story 6.4 : Page d'erreur neutre pour les liens expirés ou invalides

En tant que visiteur non authentifié,
Je veux voir une page d'erreur sobre quand je clique un lien expiré ou invalide,
Afin de comprendre que le lien n'est plus disponible sans que des informations sur l'instance ne soient révélées.

**Critères d'acceptation :**

**Étant donné** que je clique un lien dont le token est expiré (`expiresAt < NOW()`),
**Quand** la page charge,
**Alors** une page d'erreur neutre s'affiche avec le message "Ce lien a expiré" — aucune information sur l'instance ou son contenu n'est visible

**Étant donné** que je clique un lien dont le token est révoqué ou inexistant,
**Quand** la page charge,
**Alors** la même page d'erreur neutre s'affiche avec le message "Ce lien n'est plus disponible"

**Étant donné** que le backend reçoit une requête avec un token invalide/expiré/révoqué,
**Quand** `GET /api/sharing/:token` est appelé,
**Alors** il retourne 404 — sans révéler si le token a existé, s'il est expiré ou révoqué

---

## Epic 7 : Module Notes — Intégration Trilium

Manu peut accéder à son instance Trilium Notes depuis l'onglet Notes du Dashboard via une iframe. Chaque utilisateur configure l'URL de sa propre instance Trilium et active/désactive l'onglet Notes depuis la page Paramètres. Une page `/settings` extensible est créée pour centraliser les préférences utilisateur.

> **Origine :** Sprint Change Proposal 2026-06-18 — pivot stratégique avant démarrage de l'implémentation. Trilium Notes (auto-hébergé) couvre l'intégralité des besoins en gestion de notes. L'approche iframe délivre 100% des fonctionnalités Trilium sans réimplémenter l'éditeur. L'Epic 7 original est déplacé en Epic 8 pour les utilisateurs sans instance Trilium.

### Story 7.1 : Page Paramètres et configuration Notes

En tant qu'utilisateur authentifié,
Je veux accéder à une page Paramètres depuis le menu utilisateur et y configurer mon module Notes (URL Trilium + activation),
Afin de personnaliser mon Dashboard sans intervention de l'administrateur.

**Critères d'acceptation :**

**Étant donné** que je clique "Paramètres" dans le menu utilisateur de la top bar,
**Quand** je navigue vers `/settings`,
**Alors** la page affiche une section "Notes" avec : un toggle "Activer les Notes" (`mat-slide-toggle`) et un champ URL instance Trilium (visible uniquement si Notes activées)

**Étant donné** que j'active le toggle Notes,
**Quand** le champ URL s'affiche,
**Alors** je peux saisir l'URL de mon instance Trilium (ex : `https://trilium.monserveur.fr`) et sauvegarder via `PATCH /api/users/me/notes-settings`

**Étant donné** que je sauvegarde mes paramètres,
**Quand** `PATCH /api/users/me/notes-settings` réussit,
**Alors** un snackbar "Paramètres sauvegardés" s'affiche et les changements sont persistés en base

**Étant donné** que le backend reçoit `PATCH /api/users/me/notes-settings`,
**Quand** la requête est traitée,
**Alors** les champs `triliumUrl` et `notesEnabled` de l'entité `User` sont mis à jour (migration TypeORM : `triliumUrl VARCHAR(500) NULL`, `notesEnabled BOOLEAN DEFAULT FALSE`)

**Étant donné** que je désactive le toggle Notes,
**Quand** je sauvegarde,
**Alors** l'onglet Notes disparaît de la navigation (top bar desktop + bottom nav mobile) après rechargement

**Étant donné** que l'utilisateur n'est pas authentifié,
**Quand** il tente d'accéder à `/settings`,
**Alors** le guard `authGuard` le redirige vers `/login`

### Scénarios E2E
- Naviguer vers `/settings` → vérifier présence de la section Notes
- Activer Notes + saisir URL + sauvegarder → vérifier snackbar + rechargement → vérifier onglet Notes visible dans la navigation
- Désactiver Notes → sauvegarder → vérifier onglet Notes masqué dans la navigation

---

### Story 7.2 : Endpoint de vérification de connectivité Trilium

En tant qu'utilisateur authentifié,
Je veux pouvoir tester que l'URL de mon instance Trilium est accessible depuis le serveur Dashboard,
Afin de valider ma configuration avant d'utiliser le module Notes.

**Critères d'acceptation :**

**Étant donné** que j'ai saisi une URL dans `/settings` et que je clique "Tester la connexion",
**Quand** `GET /api/trilium/ping?url=<encodedUrl>` est appelé,
**Alors** le backend effectue une requête HEAD HTTP sur l'URL fournie avec un timeout de 5 secondes

**Étant donné** que l'instance Trilium répond (code HTTP quelconque reçu),
**Quand** le résultat revient,
**Alors** le frontend affiche une icône ✓ verte avec le message "Instance accessible"

**Étant donné** que l'URL ne répond pas (timeout, DNS invalide, connexion refusée),
**Quand** le résultat revient,
**Alors** le frontend affiche une icône ✗ rouge avec le message "Instance inaccessible — vérifiez l'URL"

**Étant donné** que l'URL fournie n'est pas une URL HTTP/HTTPS valide,
**Quand** le backend valide le paramètre,
**Alors** il retourne 400 Bad Request (validation anti-SSRF : schéma http/https obligatoire)

**Étant donné** que l'endpoint est appelé sans JWT valide,
**Quand** la requête arrive,
**Alors** le backend retourne 401 Unauthorized

---

### Story 7.3 : Onglet Notes avec iframe Trilium

En tant qu'utilisateur authentifié ayant configuré son instance Trilium,
Je veux accéder à Trilium directement depuis l'onglet Notes du Dashboard,
Afin de gérer mes notes sans quitter mon Dashboard.

**Critères d'acceptation :**

**Étant donné** que Notes est activé et qu'une URL valide est configurée,
**Quand** je clique sur l'onglet Notes,
**Alors** la page `/notes` affiche un `<iframe>` occupant tout l'espace disponible (hauteur = viewport - top bar) pointant vers `triliumUrl` de l'utilisateur

**Étant donné** que l'iframe charge,
**Quand** le chargement est en cours,
**Alors** un `MatProgressBar` est affiché en haut de page jusqu'à l'événement `load` de l'iframe

**Étant donné** que Notes est activé mais qu'aucune URL n'est configurée,
**Quand** j'accède à `/notes`,
**Alors** un état d'erreur s'affiche : icône + message "Aucune instance Trilium configurée" + bouton `mat-stroked-button` "Configurer dans Paramètres" (lien vers `/settings`)

**Étant donné** que Notes est désactivé (`notesEnabled = false`),
**Quand** j'inspecte la navigation,
**Alors** l'onglet "Notes" est absent de la top bar desktop et de la bottom nav mobile

**Étant donné** que l'utilisateur accède à `/notes` avec Notes désactivé (URL directe),
**Quand** le guard Angular s'exécute,
**Alors** il est redirigé vers `/dashboard`

**Étant donné** que la page est sur mobile (<768px),
**Quand** j'affiche l'onglet Notes,
**Alors** l'iframe est full-width full-height (aucune barre latérale)

> **Note déploiement :** Trilium doit être configuré pour autoriser l'embedding en ajoutant `Content-Security-Policy: frame-ancestors 'self' https://dashboard.monserveur.fr` dans sa configuration. Cette étape est documentée dans les notes de déploiement du projet.

### Scénarios E2E
- Notes activé + URL configurée → naviguer vers `/notes` → vérifier présence de l'iframe avec `src` correct
- Notes non configuré → naviguer vers `/notes` → vérifier état d'erreur + bouton "Configurer dans Paramètres"
- Notes désactivé → vérifier absence de l'onglet Notes dans la navigation
- Notes désactivé → accéder à `/notes` en URL directe → vérifier redirection vers `/dashboard`

---

## Epic 8 : Module Notes intégré Dashboard

Manu peut rédiger et organiser ses notes directement dans Dashboard via un éditeur WYSIWYG riche (TipTap) avec une arborescence de dossiers/sous-dossiers, une sauvegarde automatique (debounce 1s) et un panneau latéral de navigation en split-pane. La page `/settings` évolue vers un sélecteur à trois états (Désactivé / Trilium / Notes intégrées Dashboard). Le partage par lien public est étendu aux notes via Story 8.7, qui réutilise l'infrastructure posée en Épic 6.

> **Origine :** Sprint Change Proposal 2026-06-18 — contenu de l'Epic 7 original déplacé ici pour permettre aux utilisateurs sans instance Trilium d'avoir un système de notes intégré à Dashboard.

**Report (Sprint Change Proposal 2026-11-09) :** Epic reporté après la refonte Ember (Epic 9). Il sort après la 1.0.0, en version mineure.

### Story 8.0 : Migration du paramètre Notes — sélecteur 3 états

En tant qu'utilisateur authentifié,
Je veux pouvoir choisir entre trois modes pour mon module Notes (Désactivé, Trilium ou Notes intégrées Dashboard) depuis `/settings`,
Afin de disposer de l'expérience notes adaptée à ma situation (avec ou sans instance Trilium).

**Critères d'acceptation :**

**Étant donné** que j'accède à `/settings` après implémentation de l'Epic 8,
**Quand** j'inspecte la section Notes,
**Alors** le toggle binaire et le champ URL Trilium distincts (Epic 7) sont remplacés par un sélecteur à 3 états : `Désactivé` / `Trilium` / `Notes intégrées Dashboard`

**Étant donné** que je sélectionne `Trilium`,
**Quand** le sélecteur change,
**Alors** le champ URL de l'instance Trilium s'affiche (pré-rempli si déjà configuré en Epic 7)

**Étant donné** que je sélectionne `Notes intégrées Dashboard`,
**Quand** le sélecteur change,
**Alors** le champ URL Trilium disparaît et l'onglet Notes pointe vers le module natif Dashboard

**Étant donné** que je sélectionne `Désactivé`,
**Quand** je sauvegarde,
**Alors** l'onglet Notes disparaît de la navigation

**Étant donné** qu'un utilisateur avait configuré Trilium en Epic 7 (`notesEnabled = true` + `triliumUrl` renseigné),
**Quand** la migration Epic 8 s'exécute,
**Alors** son mode est automatiquement migré vers `Trilium` et son URL est préservée

### Story 8.1 : Entités Note et NoteFolder + migrations

*Contenu identique à l'ex-Story 7.1 — voir version antérieure de epics.md*

### Story 8.2 : Panneau latéral NoteTreePanel avec arborescence

*Contenu identique à l'ex-Story 7.2 — voir version antérieure de epics.md*

### Story 8.3 : Création et gestion des dossiers

*Contenu identique à l'ex-Story 7.3 — voir version antérieure de epics.md*

### Story 8.4 : Éditeur TipTap avec sauvegarde automatique

*Contenu identique à l'ex-Story 7.4 — voir version antérieure de epics.md*

### Story 8.5 : Création et suppression d'une note

*Contenu identique à l'ex-Story 7.5 — voir version antérieure de epics.md*

### Story 8.6 : Vue publique lecture seule (note)

*Contenu identique à l'ex-Story 7.6 — voir version antérieure de epics.md*

### Story 8.7 : Extension du partage aux notes — génération du lien de partage

*Contenu identique à l'ex-Story 7.7 — voir version antérieure de epics.md. Les références "Story 7.7 (Épic 7)" sont remplacées par "Story 8.7 (Épic 8)".*

---

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
