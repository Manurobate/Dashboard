---
stepsCompleted:
  - step-01-document-discovery
  - step-02-prd-analysis
  - step-03-epic-coverage-validation
  - step-04-ux-alignment
  - step-05-epic-quality-review
  - step-06-final-assessment
status: complete
filesIncluded:
  prd: prd.md
  architecture: architecture.md
  epics: epics.md
  ux: ux-design-Dashboard.md
---

# Rapport d'Évaluation de la Readiness d'Implémentation

**Date:** 2026-04-22
**Projet:** Dashboard

---

## Inventaire des Documents (Étape 1 — Découverte)

| Type | Fichier | Taille | Dernière modification |
|------|---------|--------|-----------------------|
| PRD | `prd.md` | 26 440 oct. | 21 avril 17:27 |
| Architecture | `architecture.md` | 34 557 oct. | 22 avril 12:01 |
| Epics & Stories | `epics.md` | 68 053 oct. | 22 avril 12:50 |
| UX Design | `ux-design-Dashboard.md` | 45 172 oct. | 21 avril 16:07 |

**Doublons détectés :** Aucun
**Documents manquants :** Aucun

---

## Analyse PRD (Étape 2)

### Exigences Fonctionnelles extraites

#### Authentification & Comptes
- **FR1** : Un utilisateur non authentifié peut se connecter avec un identifiant et un mot de passe
- **FR2** : Le système protège le formulaire de connexion contre les tentatives de brute-force par rate limiting
- **FR3** : Un utilisateur authentifié reste connecté entre les sessions (token JWT persistant avec refresh silencieux)
- **FR4** : Un utilisateur peut se déconnecter
- **FR5** : Un utilisateur dont le mot de passe est temporaire est contraint de le changer avant d'accéder à toute fonctionnalité
- **FR6** : Un utilisateur peut modifier son propre mot de passe
- **FR7** : Les données de chaque utilisateur sont strictement isolées des autres comptes

#### Administration de l'instance
- **FR8** : L'administrateur peut créer un compte utilisateur (identifiant + nom)
- **FR9** : La création d'un compte génère automatiquement un mot de passe temporaire affiché une seule fois
- **FR10** : L'administrateur peut réinitialiser le mot de passe d'un utilisateur
- **FR11** : L'administrateur peut désactiver ou supprimer un compte utilisateur
- **FR12** : L'administrateur peut consulter la liste des comptes de l'instance

#### Module Liens
- **FR13** : Un utilisateur peut créer une catégorie de liens (nom, emoji optionnel)
- **FR14** : Un utilisateur peut modifier et supprimer une catégorie de liens
- **FR15** : Un utilisateur peut réorganiser ses catégories par drag & drop
- **FR16** : Un utilisateur peut replier et déplier une catégorie
- **FR17** : Un utilisateur peut créer une fiche de lien (URL, titre, description optionnelle)
- **FR18** : Le système récupère automatiquement le favicon et les métadonnées OG d'une URL lors de la création d'un lien
- **FR19** : Un utilisateur peut modifier et supprimer un lien
- **FR20** : Un utilisateur peut réorganiser ses liens au sein d'une catégorie par drag & drop
- **FR21** : Un utilisateur peut basculer entre un mode lecture et un mode édition sur la page Liens
- **FR22** : Le module Liens est la vue affichée par défaut après connexion

#### Module Recettes
- **FR23** : Un utilisateur peut créer une recette (titre, ingrédients structurés, étapes, catégorie)
- **FR24** : Un utilisateur peut modifier et supprimer une recette
- **FR25** : Un utilisateur peut organiser ses recettes par catégories
- **FR26** : Un utilisateur peut rechercher ses recettes en temps réel
- **FR27** : Un utilisateur peut ajuster le nombre de convives et voir les quantités recalculées
- **FR28** : Un utilisateur peut réorganiser les ingrédients et les étapes d'une recette par drag & drop

#### Module Notes
- **FR29** : Un utilisateur peut créer une note avec un contenu texte enrichi (WYSIWYG — TipTap)
- **FR30** : Un utilisateur peut modifier et supprimer une note
- **FR31** : Un utilisateur peut organiser ses notes dans des dossiers et sous-dossiers
- **FR32** : Un utilisateur peut créer, renommer et supprimer des dossiers de notes
- **FR33** : Le contenu d'une note est sauvegardé automatiquement pendant la saisie
- **FR34** : Un utilisateur peut naviguer entre ses notes et dossiers depuis un panneau latéral

#### Partage Public
- **FR35** : Un utilisateur peut générer un lien public pour partager une recette ou une note
- **FR36** : Un utilisateur peut choisir une durée d'expiration pour un lien partagé (24h, 7j, 30j, permanent)
- **FR37** : Un utilisateur peut révoquer un lien partagé actif
- **FR38** : Un visiteur non authentifié peut accéder au contenu d'un lien partagé valide en lecture seule
- **FR39** : Un visiteur accédant à une recette partagée peut utiliser le stepper de convives
- **FR40** : Un visiteur accédant à un lien expiré ou invalide voit une page d'erreur neutre sans information sur l'instance
- **FR41** : Les vues publiques n'exposent aucune navigation vers le reste de l'application

#### Personnalisation & Expérience
- **FR42** : Un utilisateur peut basculer entre un thème clair et un thème sombre
- **FR43** : Le thème choisi est persisté entre les sessions
- **FR44** : L'application affiche un état vide actionnable lorsqu'un module ne contient pas encore de contenu

#### Infrastructure & Déploiement
- **FR45** : L'application est déployable via un seul fichier `docker-compose.yml`
- **FR46** : La base de données fait l'objet de dumps automatisés
- **FR47** : L'application expose une PWA avec app shell mis en cache
- **FR48** : Les routes publiques sont configurées pour ne pas être indexées par les moteurs de recherche

**Total EF : 48**

---

### Exigences Non-Fonctionnelles extraites

#### Sécurité
- **NFR-SEC-1** : Mots de passe hashés avec bcrypt (facteur de coût ≥ 12)
- **NFR-SEC-2** : Tokens JWT à durée de vie limitée avec refresh silencieux côté client
- **NFR-SEC-3** : Jetons de partage public générés avec CSPRNG, entropie minimale 128 bits
- **NFR-SEC-4** : Toutes les communications en HTTPS (TLS assuré par reverse proxy)
- **NFR-SEC-5** : Rate limiting sur le formulaire de connexion (blocage temporaire après N tentatives)
- **NFR-SEC-6** : Accès lecture/écriture aux données vérifié systématiquement côté serveur (isolation totale entre comptes)
- **NFR-SEC-7** : Routes publiques strictement en lecture seule, enforced côté API

#### Performance
- **NFR-PERF-1** : Interactions côté client (filtrage, stepper, collapse) imperceptibles (< 100 ms)
- **NFR-PERF-2** : Requêtes API en lecture courantes sans latence visible dans les conditions normales
- **NFR-PERF-3** : Récupération favicon/meta OG avec timeout court — échec non bloquant pour la sauvegarde du lien
- **NFR-PERF-4** : Images de recettes chargées en lazy loading

#### Accessibilité
- **NFR-ACC-1** : Cible WCAG 2.1 niveau AA
- **NFR-ACC-2** : Ratios de contraste respectés sur les deux thèmes (clair et sombre)
- **NFR-ACC-3** : Tous les éléments interactifs accessibles au clavier (Tab, Shift+Tab, Entrée, Échap)
- **NFR-ACC-4** : Touch targets minimum 44×44 px sur mobile
- **NFR-ACC-5** : `aria-label` sur boutons icônes, `aria-expanded` sur éléments collapsibles, `aria-live` sur zones dynamiques

#### Fiabilité & Maintenabilité
- **NFR-REL-1** : Instance fonctionnelle sans intervention manuelle pendant 4 semaines minimum
- **NFR-REL-2** : Dumps automatisés de la base de données configurés dans Docker Compose
- **NFR-REL-3** : Déploiement via un seul `docker-compose.yml` sans dépendances externes (pas de Redis, pas d'Elasticsearch)
- **NFR-REL-4** : Conteneurs Docker avec healthchecks intégrés

**Total ENF : 19** (7 sécurité + 4 performance + 5 accessibilité + 4 fiabilité)

---

### Exigences Additionnelles (Contraintes & Hypothèses)

#### Compatibilité navigateurs
- Chrome Desktop (Linux/Windows/Mac) — support primaire
- Firefox Desktop — support primaire co-égal à Chrome
- Chrome Android — secondaire (responsive mobile, vues partagées)
- Safari iOS — vues publiques uniquement

#### Design Responsive
- Stratégie hybride : Desktop-first (Module Liens) / Mobile-first (Recettes, Notes, vues publiques)
- Deux breakpoints uniquement : `< 768px` (mobile) / `≥ 768px` (desktop)

#### Contraintes Techniques
- Pas de SSR/Angular Universal
- Pas de WebSocket en V1 (temps réel 100% client-side)
- Debounce 200 ms pour la recherche de recettes
- Debounce 1 s pour la sauvegarde automatique des notes
- Recalcul stepper convives : synchrone côté client
- TLS délégué au reverse proxy existant
- Pas de SMTP — gestion des mots de passe oubliés via admin uniquement

#### SEO
- Aucun référencement souhaité — application privée
- `noindex` obligatoire sur les routes publiques
- Pas de sitemap, pas de balises OG côté serveur

---

### Évaluation de la complétude du PRD

Le PRD est **complet et bien structuré**. Les 48 exigences fonctionnelles couvrent de façon exhaustive les 5 parcours utilisateurs définis (J1–J5). Les exigences non-fonctionnelles sont claires et spécifiques. Les contraintes techniques sont explicitement documentées, incluant les décisions d'architecture (pas de Redis, pas de SSR, pas de WebSocket V1). Le périmètre hors-scope est clairement délimité.

---

## Validation de la Couverture Epics (Étape 3)

### Matrice de Couverture

| N° EF | Exigence (résumé) | Épic | Story(s) | Statut |
|-------|-------------------|------|----------|--------|
| FR1 | Connexion identifiant + mot de passe | Épic 2 | 2.2 | ✅ Couvert |
| FR2 | Rate limiting anti-brute-force | Épic 2 | 2.2 | ✅ Couvert |
| FR3 | JWT persistant avec refresh silencieux | Épic 2 | 2.3 | ✅ Couvert |
| FR4 | Déconnexion | Épic 2 | 2.4 | ✅ Couvert |
| FR5 | Changement mot de passe temporaire forcé | Épic 2 | 2.5 | ✅ Couvert |
| FR6 | Changement de mot de passe utilisateur | Épic 2 | 2.6 | ✅ Couvert |
| FR7 | Isolation stricte des données par compte | Épic 2 | 2.1 | ✅ Couvert |
| FR8 | Création de compte utilisateur | Épic 3 | 3.2 | ✅ Couvert |
| FR9 | Mot de passe temporaire généré affiché une fois | Épic 3 | 3.2 | ✅ Couvert |
| FR10 | Réinitialisation de mot de passe par l'admin | Épic 3 | 3.3 | ✅ Couvert |
| FR11 | Désactivation/suppression de compte | Épic 3 | 3.4 | ✅ Couvert |
| FR12 | Liste des comptes de l'instance | Épic 3 | 3.1 | ✅ Couvert |
| FR13 | Créer une catégorie de liens | Épic 4 | 4.2 | ✅ Couvert |
| FR14 | Modifier/supprimer une catégorie | Épic 4 | 4.2 | ✅ Couvert |
| FR15 | Réorganiser catégories par drag & drop | Épic 4 | 4.2 | ✅ Couvert |
| FR16 | Replier/déplier une catégorie | Épic 4 | 4.5 | ✅ Couvert |
| FR17 | Créer une fiche de lien | Épic 4 | 4.3 | ✅ Couvert |
| FR18 | Favicon + métadonnées OG auto-récupérées | Épic 4 | 4.3 | ✅ Couvert |
| FR19 | Modifier/supprimer un lien | Épic 4 | 4.3 | ✅ Couvert |
| FR20 | Réorganiser liens par drag & drop | Épic 4 | 4.3 | ✅ Couvert |
| FR21 | Toggle mode lecture / mode édition | Épic 4 | 4.4 | ✅ Couvert |
| FR22 | Module Liens = vue par défaut après connexion | Épic 4 | 4.6 | ✅ Couvert |
| FR23 | Créer une recette | Épic 5 | 5.3 | ✅ Couvert |
| FR24 | Modifier/supprimer une recette | Épic 5 | 5.3, 5.5 | ✅ Couvert |
| FR25 | Organiser recettes par catégories | Épic 5 | 5.2 | ✅ Couvert |
| FR26 | Recherche recettes en temps réel | Épic 5 | 5.2 | ✅ Couvert |
| FR27 | Stepper convives + recalcul quantités | Épic 5 | 5.4 | ✅ Couvert |
| FR28 | Drag & drop ingrédients et étapes | Épic 5 | 5.3 | ✅ Couvert |
| FR29 | Créer une note WYSIWYG | Épic 7 | 7.4, 7.5 | ✅ Couvert |
| FR30 | Modifier/supprimer une note | Épic 7 | 7.4, 7.5 | ✅ Couvert |
| FR31 | Organiser notes en dossiers/sous-dossiers | Épic 7 | 7.2, 7.3 | ✅ Couvert |
| FR32 | Créer/renommer/supprimer des dossiers | Épic 7 | 7.3 | ✅ Couvert |
| FR33 | Sauvegarde automatique (debounce 1s) | Épic 7 | 7.4 | ✅ Couvert |
| FR34 | Panneau latéral de navigation | Épic 7 | 7.2 | ✅ Couvert |
| FR35 | Générer un lien de partage public | Épic 6 | 6.2 | ✅ Couvert |
| FR36 | Choisir une durée d'expiration | Épic 6 | 6.2 | ✅ Couvert |
| FR37 | Révoquer un lien partagé | Épic 6 | 6.2 | ✅ Couvert |
| FR38 | Accès visiteur lecture seule | Épic 6 | 6.3, 7.6 | ✅ Couvert |
| FR39 | Stepper convives sur recette partagée | Épic 6 | 6.3 | ✅ Couvert |
| FR40 | Page d'erreur neutre (lien expiré/invalide) | Épic 6 | 6.4 | ✅ Couvert |
| FR41 | Aucune navigation vers l'app sur vues publiques | Épic 6 | 6.3, 7.6 | ✅ Couvert |
| FR42 | Toggle thème clair/sombre | Épic 4 | 4.6 | ✅ Couvert |
| FR43 | Persistance du thème (localStorage) | Épic 4 | 4.6 | ✅ Couvert |
| FR44 | États vides actionnables par module | Épic 4 | 4.6 | ✅ Couvert |
| FR45 | Déploiement via docker-compose.yml unique | Épic 1 | 1.2 | ✅ Couvert |
| FR46 | Dumps automatisés de la base de données | Épic 1 | 1.7 | ✅ Couvert |
| FR47 | PWA avec app shell mis en cache | Épic 1 | 1.6 | ✅ Couvert |
| FR48 | noindex sur les routes publiques | Épic 1 | 1.6 | ✅ Couvert |

### Exigences Manquantes

**Aucune exigence fonctionnelle manquante détectée.**

### Statistiques de Couverture

- **Total EF PRD :** 48
- **EF couvertes dans les epics :** 48
- **Pourcentage de couverture :** **100%**
- **Épics définis :** 7 (Épic 1 à Épic 7)
- **Stories définies :** 26 (Stories 1.1–1.7, 2.1–2.6, 3.1–3.4, 4.1–4.6, 5.1–5.5, 6.1–6.4, 7.1–7.6)

---

## Évaluation de l'Alignement UX (Étape 4)

### Statut du Document UX

**Trouvé :** `ux-design-Dashboard.md` (45 172 oct., 21 avril 16:07) — statut `complete`

Le document UX couvre : résumé exécutif et vision, expérience utilisateur fondamentale, réponse émotionnelle visée, analyse des patterns UX, système de design (Angular Material), direction visuelle (Noir & Braise, Direction 03 Cards Élevées), fondations visuelles (couleurs, typographie, espacement), et 25 exigences UX Design (UX-DR1 à UX-DR25).

---

### Alignement UX ↔ PRD

| Aspect UX | Correspondance PRD | Statut |
|-----------|-------------------|--------|
| Stratégie desktop-first (Liens) / mobile-first (Recettes, Notes) | Périmètre MVP + Design responsive | ✅ Aligné |
| Deux breakpoints uniquement (< 768px / ≥ 768px) | Exigences spécifiques web app | ✅ Aligné |
| Mode lecture / mode édition toggle (Liens) | FR21 + Parcours J2 | ✅ Aligné |
| Recherche temps réel recettes (debounce 200ms) | FR26 + Exigences temps réel | ✅ Aligné |
| Stepper convives avec recalcul immédiat | FR27 + FR39 | ✅ Aligné |
| Vues publiques sans navigation interne | FR41 + Parcours J4 | ✅ Aligné |
| Toggle thème clair/sombre persisté (localStorage) | FR42 + FR43 | ✅ Aligné |
| États vides actionnables par module | FR44 + Parcours J5 | ✅ Aligné |
| TipTap uniquement pour les Notes (pas pour les étapes recettes) | FR23 (mise en forme basique) | ✅ Aligné — UX-DR10 clarifie que `MarkdownLightEditor` est utilisé pour les étapes recettes (pas TipTap) |
| Sauvegarde automatique notes (debounce 1s) | FR33 | ✅ Aligné |
| Panneau NoteTreePanel split-pane (260px fixe desktop) | FR34 | ✅ Aligné |
| Mini top bar sur vues publiques (contexte "Dashboard") | FR41 + Parcours J4 | ✅ Aligné |
| WCAG 2.1 AA — ratios de contraste vérifiés | NFR-ACC-1, NFR-ACC-2 | ✅ Aligné |
| Touch targets 44×44px minimum (boutons ConvivesSteppper : 48×48px) | NFR-ACC-4 | ✅ Aligné |
| `noindex` sur routes publiques | FR48 | ✅ Aligné |

**Aucun désalignement UX ↔ PRD détecté.**

---

### Alignement UX ↔ Architecture

| Décision UX | Support Architectural | Statut |
|-------------|----------------------|--------|
| Angular Material comme bibliothèque de composants | Angular 21 + `ng add @angular/material` — explicitement intégré | ✅ Supporté |
| Thème clair/sombre via classe `.dark-theme` sur `<body>`, persisté localStorage | Architecture : tokens CSS + `localStorage` au bootstrap Angular | ✅ Supporté |
| Angular CDK DragDrop pour drag & drop (catégories, liens, ingrédients, étapes) | Angular 21 — CDK disponible nativement | ✅ Supporté |
| TipTap (ProseMirror) — wrapper `ControlValueAccessor` Angular | Architecture : "Intégration TipTap : wrapper ControlValueAccessor Angular requis" — risque identifié et mitigé | ✅ Supporté |
| Signals Angular natifs pour le state management | Architecture : "Signals Angular natifs + services" — décision explicite | ✅ Supporté |
| Lazy loading des modules Angular | Architecture : structure des routes lazy-loaded par module métier | ✅ Supporté |
| Proxy fetch favicon/OG côté serveur (timeout court, fallback gracieux) | Architecture : `OgFetchService` NestJS dédié avec timeout | ✅ Supporté |
| `MatSidenav` mode `over` pour Notes sur mobile | Angular Material — composant `MatSidenav` disponible | ✅ Supporté |
| `ConvivesSteppper` : recalcul synchrone côté client | Architecture : "Pas de WebSocket V1 — temps réel client-side uniquement" | ✅ Supporté |
| `ShareLinkDialog` — génération CSPRNG `crypto.randomBytes(32)` | Architecture : décision sécurité explicite — 256 bits d'entropie | ✅ Supporté |
| Grid responsive CSS pur (module Liens) | Angular/SCSS — aucune dépendance externe requise | ✅ Supporté |
| PWA app shell (`@angular/pwa`) | Architecture : `ng add @angular/pwa` + `ngsw-config.json` | ✅ Supporté |

**Aucun désalignement UX ↔ Architecture détecté.**

---

### Points d'Attention (Non-bloquants)

1. **UX-DR10 (MarkdownLightEditor)** : le PRD mentionne "mise en forme textuelle basique (gras, italique, souligné)" pour les étapes de recettes sans préciser le mécanisme d'implémentation. L'UX design précise que TipTap n'est **pas** utilisé ici (texte court ne le justifie pas) et qu'un `textarea` avec toolbar minimale est suffisant. Cette décision est cohérente mais elle est documentée dans l'UX, pas dans le PRD — les agents de développement devront s'y référer.

2. **Chronologie des documents** : l'UX design (21 avril) → architecture (22 avril, a pris l'UX en input) → epics (22 avril, a pris les deux en input). La chaîne de dépendances documentaires est correcte et traceable.

---

### Résumé de l'Alignement UX

- **UX ↔ PRD :** Alignement complet. Les 25 UX-DRs sont tracés dans les epics. Aucune exigence UX contradictoire avec le PRD.
- **UX ↔ Architecture :** Alignement complet. Tous les composants UX clés (TipTap, Angular Material, CDK, Signals) sont explicitement adressés dans les décisions architecturales.
- **Statut global :** ✅ **Alignement UX validé**

---

## Revue de Qualité des Epics (Étape 5)

### Validation de la Structure des Epics

#### Valeur Utilisateur par Epic

| Epic | Titre | Valeur Utilisateur | Type |
|------|-------|-------------------|------|
| Épic 1 | Infrastructure, Déploiement & Design System | Partielle (Stories 1.4 + 1.5 + 1.6 orientées UX ; 1.1 + 1.2 + 1.3 + 1.7 = setup technique) | ⚠️ Mixte |
| Épic 2 | Authentification sécurisée | OUI — connexion, session, déconnexion, changement de mot de passe | ✅ |
| Épic 3 | Administration de l'instance | OUI — l'admin peut gérer les comptes sans SMTP | ✅ |
| Épic 4 | Module Liens | OUI — accès quotidien aux liens, page d'accueil | ✅ |
| Épic 5 | Module Recettes | OUI — création, consultation, stepper | ✅ |
| Épic 6 | Partage public | OUI — partage sécurisé, expiration, révocation | ✅ |
| Épic 7 | Module Notes | OUI — notes WYSIWYG, arborescence, sauvegarde auto | ✅ |

**Épic 1 (Infrastructure)** : Cas classique pour un projet greenfield. La guidance create-epics-and-stories autorise une épic d'infrastructure initiale en greenfield si elle est la première et contient le setup de projet, CI/CD et infrastructure nécessaires. C'est le cas ici. Les stories 1.4 (design system), 1.5 (navigation) et 1.6 (PWA) apportent une valeur utilisateur tangible. **Acceptable pour greenfield.**

---

#### Indépendance des Epics

| Epic | Dépendances acceptables | Résultat |
|------|------------------------|----------|
| Épic 1 | Aucune (première epic) | ✅ |
| Épic 2 | Épic 1 (monorepo, Docker) | ✅ |
| Épic 3 | Épic 2 (entité User, auth guards) | ✅ |
| Épic 4 | Épic 2 (auth guards, userId) | ✅ |
| Épic 5 | Épic 2 (auth guards, userId) | ✅ |
| Épic 6 | Épic 2 (auth), Épic 5 (recettes) | ⚠️ **Problème détecté** |
| Épic 7 | Épic 2 (auth), Épic 6 (infrastructure partage) | ✅ |

---

### 🔴 Violations Critiques

Aucune violation critique bloquante détectée.

---

### 🟠 Problèmes Majeurs

#### Problème M1 — Dépendance Forward : Story 6.2 sur Épic 7 (Notes)

**Location :** Story 6.2 — "Génération et gestion d'un lien de partage"

**Description :** Story 6.2 déclare "partager **une recette ou une note**" dans son titre et ses critères d'acceptation. Or, le **Module Notes (Épic 7) est livré APRÈS Épic 6** dans la séquence d'implémentation. Lorsque Épic 6 sera implémentée, les entités `Note` et `NoteFolder` n'existent pas encore.

**Impact :** L'agent de développement qui implémente Story 6.2 devra soit :
- Anticiper les entités Note (violation de l'indépendance épic),
- Implémenter seulement le partage recettes et ignorer le partage notes jusqu'à Épic 7,
- Ou attendre Épic 7 pour finaliser Story 6.2 (disruption de la livraison).

**Preuve :** La carte de couverture des FR attribue FR35–FR41 entièrement à Épic 6, mais Story 7.6 ("Vue publique lecture seule — note") couvre clairement FR38 (accès visiteur) et FR41 (pas de navigation) pour les notes. La couverture est donc répartie sur deux épics mais la carte de couverture ne le reflète pas.

**Recommandation :**
> Option A (préférée) : Restreindre Story 6.2 au partage de **recettes uniquement** lors de la livraison d'Épic 6. Ajouter une Story 6bis dans Épic 7 pour étendre le partage aux notes (génération du lien), Story 7.6 gérant déjà la vue publique.
>
> Option B : Déplacer Épic 6 après Épic 7 dans la séquence (Épic 1 → 2 → 3 → 4 → 5 → 7 → 6). Compatible avec le PRD (partage notes livré avec module Notes).

---

### 🟡 Préoccupations Mineures

#### Préoccupation m1 — Couplage mutuel Stories 4.4 ↔ 4.5

**Location :** Story 4.4 (Toggle mode lecture/édition) et Story 4.5 (Composants LinkCategoryCard et LinkItem)

**Description :** Story 4.4 décrit le comportement du toggle sur les composants `LinkCategoryCard` et `LinkItem` — qui sont définis dans Story 4.5 (placée après 4.4 dans la séquence). Pour implémenter 4.4, les composants de 4.5 doivent exister.

**Impact :** Faible — les agents de dev traitent typiquement les stories séquentiellement. En pratique, Stories 4.4 et 4.5 seront implémentées ensemble ou 4.5 avant 4.4.

**Recommandation :** Inverser l'ordre : Story 4.5 (composants) avant Story 4.4 (toggle mode qui les utilise). Ou fusionner en une seule story.

---

#### Préoccupation m2 — Couplage mutuel Stories 7.2 ↔ 7.4

**Location :** Story 7.2 (NoteTreePanel) et Story 7.4 (Éditeur TipTap)

**Description :** Story 7.2 inclut l'AC "je clique sur une note → son contenu charge dans l'éditeur TipTap", ce qui requiert l'éditeur de Story 7.4. Réciproquement, Story 7.4 référence "je sélectionne une note dans le panneau latéral", qui est Story 7.2.

**Impact :** Faible — couplage bien connu sur les architectures split-pane. Les deux stories doivent être implémentées en tandem lors d'un sprint.

**Recommandation :** Ajouter une note dans l'une ou l'autre story mentionnant explicitement la co-dépendance, pour que l'agent de dev les traite dans le même sprint.

---

#### Préoccupation m3 — Carte de couverture FR38/FR41 incomplète

**Location :** FR Coverage Map dans epics.md (lignes FR38, FR41)

**Description :** FR38 et FR41 sont attribués uniquement à Épic 6, mais Story 7.6 (dans Épic 7) couvre la vue publique des **notes**, qui relève de FR38 (accès visiteur read-only) et FR41 (pas de navigation). La couverture totale existe mais la carte est incomplète.

**Impact :** Très faible — les FR sont effectivement couverts, mais la carte peut induire en erreur un agent cherchant où implémenter la vue publique des notes.

**Recommandation :** Mettre à jour la FR Coverage Map pour indiquer : FR38 → Épic 6 (recettes) + Épic 7 (notes), FR41 → Épic 6 + Épic 7.

---

#### Préoccupation m4 — Stories "En tant que système" pour les migrations

**Location :** Stories 2.1, 4.1, 5.1, 6.1, 7.1

**Description :** Ces stories utilisent "En tant que système" plutôt que "En tant que développeur" pour les migrations de base de données. Ce n'est pas une erreur structurelle, mais ce format sort du template BDD standard.

**Impact :** Aucun impact fonctionnel. Cohérence documentaire uniquement.

**Recommandation :** Acceptable — ces stories définissent les contraintes de schéma que les agents de dev doivent respecter. Aucune action requise.

---

### Checklist de Conformité aux Bonnes Pratiques

| Critère | Résultat |
|---------|----------|
| Epics livrent de la valeur utilisateur | ✅ (Épic 1 mixte mais acceptable en greenfield) |
| Epics fonctionnent indépendamment | ⚠️ Story 6.2 dépend forward d'Épic 7 — **M1** |
| Stories correctement dimensionnées | ✅ |
| Pas de dépendances forward | ⚠️ 4.4↔4.5, 7.2↔7.4 mutuelles — **m1, m2** |
| Entités DB créées au bon moment | ✅ (chaque epic crée ses propres entités en Story X.1) |
| Critères d'acceptation clairs et testables | ✅ Format GWT (Given/When/Then) bien appliqué |
| Traçabilité PRD → Epics maintenue | ✅ (100% couverture) |
| Story 1.1 initialise le projet (greenfield) | ✅ |
| CI/CD configuré tôt | ✅ (Story 1.3) |

---

### Synthèse Revue Qualité Epics

- **Violations critiques :** 0
- **Problèmes majeurs :** 1 (M1 — forward dependency Story 6.2 sur Épic 7)
- **Préoccupations mineures :** 4 (m1–m4, toutes non-bloquantes)
- **Qualité globale des critères d'acceptation :** Bonne — format GWT systématique, cas d'erreur couverts, scénarios happy path et edge cases présents
- **Statut :** ⚠️ **Prêt à implémenter avec résolution requise de M1**

---

## Résumé et Recommandations — Évaluation Finale

### Statut Global de Readiness

> ## ✅ PRÊT POUR L'IMPLÉMENTATION

La planification du projet Dashboard est de **haute qualité** : PRD complet avec 48 EF tracées à 100%, architecture cohérente, alignement UX validé, critères d'acceptation bien structurés. **Un seul problème majeur** doit être résolu avant de lancer Épic 6.

---

### Problème Critique à Résoudre Avant Implémentation

#### M1 — Story 6.2 : Ambiguïté du périmètre "recette ou note" (Épic 6 avant Épic 7)

**Action requise avant de commencer Story 6.2 :**

Choisir l'une des deux options :

**Option A** *(recommandée — sans réorganisation)*
- Modifier Story 6.2 : restreindre la fonctionnalité de génération de lien aux **recettes uniquement** lors de la livraison d'Épic 6
- Ajouter une Story 7.7 dans Épic 7 : "Extension du partage aux notes — génération du lien de partage depuis le module Notes"
- Story 7.6 (vue publique note) reste inchangée dans Épic 7
- Impact : Story 6.2 mise à jour, Story 7.7 à créer → **2 modifications dans epics.md**

**Option B** *(si cohérence sémantique préférée)*
- Déplacer Épic 6 après Épic 7 dans la séquence : 1→2→3→4→5→7→6
- Compatible avec le PRD (le partage recettes + notes est une fonctionnalité cross-module)
- Impact : restructuration de la séquence de livraison → **1 modification dans epics.md**

---

### Recommandations Ordonnées

1. **Résoudre M1** (Story 6.2 — périmètre partage) : choisir Option A ou B et mettre à jour epics.md
2. **Corriger la carte FR38/FR41** (m3) : mettre à jour la FR Coverage Map pour attribuer FR38 et FR41 à Épic 6 + Épic 7
3. **Réordonner Stories 4.4↔4.5** (m1) : inverser pour que les composants (4.5) précèdent le toggle (4.4)
4. **Annoter Stories 7.2↔7.4** (m2) : ajouter une note de co-implémentation requise dans le même sprint

---

### Tableau de Bord de Readiness

| Dimension | Score | Notes |
|-----------|-------|-------|
| Complétude du PRD | 🟢 100% | 48 EF, 19 ENF, contraintes claires |
| Couverture Epics → PRD | 🟢 100% | 48/48 EF couvertes, 7 épics, 26 stories |
| Alignement UX ↔ PRD | 🟢 Complet | 25 UX-DRs tracés, aucun écart |
| Alignement UX ↔ Architecture | 🟢 Complet | Toutes les décisions techniques supportent l'UX |
| Qualité des critères d'acceptation | 🟢 Bonne | GWT systématique, error cases présents |
| Indépendance des epics | 🟡 1 problème | M1 — Story 6.2 forward dependency |
| Traçabilité | 🟡 Partielle | FR38/FR41 mal attribués dans la carte |
| Couplages entre stories | 🟡 Mineurs | 4.4↔4.5 et 7.2↔7.4 à annoter |

---

### Note Finale

Cette évaluation a identifié **5 problèmes** (1 majeur + 4 mineurs) sur 5 dimensions analysées (PRD, Epics/Stories, UX, Architecture, Qualité). Le projet Dashboard est **bien planifié pour un projet greenfield solo** : la traçabilité est exhaustive, les décisions techniques sont documentées et justifiées, et les critères d'acceptation sont suffisamment précis pour guider des agents de développement.

**Le problème M1 a été résolu (Option A) :**
- Story 6.2 restreinte au partage des **recettes uniquement**
- Story 7.7 créée dans Épic 7 pour étendre le partage aux **notes**
- FR Coverage Map mise à jour (FR35, FR38, FR41 → Épic 6 + Épic 7)
- Épic 6 renommée "Partage public (recettes)" pour lever l'ambiguïté
- **Stories totales : 27** (26 + Story 7.7)

Le projet est désormais **prêt pour l'implémentation**.

**Rapport généré le :** 2026-04-22
**Corrections appliquées le :** 2026-04-22
**Projet :** Dashboard
**Évalué par :** Agent de Readiness BMAD

---
