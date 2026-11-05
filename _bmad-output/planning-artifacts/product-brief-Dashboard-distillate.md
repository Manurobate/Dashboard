---
title: "Product Brief Distillate: Dashboard"
type: llm-distillate
source: "product-brief-Dashboard.md"
created: "2026-04-21"
purpose: "Token-efficient context for downstream PRD creation"
---

# Distillate — Dashboard

## Identité du projet

- Application web personnelle auto-hébergée, conçue pour un usage quotidien comme page d'accueil du navigateur
- Périmètre : usage personnel (Manu) + petit cercle famille/amis proches (< 10 personnes), jamais commercial
- Motivation double : outil utile au quotidien + apprentissage NestJS et Angular en conditions réelles
- Nom du projet : Dashboard

## Stack technique (décisions fermes, ne pas remettre en question)

- **Backend** : NestJS — choix délibéré pour montée en compétence, utilisé dans le contexte professionnel de Manu
- **Frontend** : Angular — même raison, ne pas proposer Vue ou React
- **Base de données** : MariaDB — choix intentionnel malgré la charge opérationnelle supplémentaire vs SQLite ; NestJS la gère parfaitement
- **Déploiement** : Docker Compose, un seul fichier `docker-compose.yml`
- **TLS** : géré par le reverse proxy existant de Manu (Traefik ou Nginx) — ne pas inclure dans l'app
- **Infra existante** : serveur personnel, nom de domaine, reverse proxy déjà opérationnels

## Décisions de périmètre V1 (fermes)

- **Dans scope V1** : Module Liens + Module Recettes + Module Notes + Auth multi-comptes + PWA basique
- **Ordre de livraison** : Liens en premier → Recettes → Notes (déploiement progressif, validation module par module)
- **PWA** : app shell uniquement via `ng add @angular/pwa` — si la configuration native Angular suffit, en V1 ; sinon reporté V2. Ne pas implémenter de logique de cache de données offline en V1.
- **Import de favoris** : explicitement hors scope et non souhaité. Raison : les favoris navigateur sont saturés de liens obsolètes ; Manu préfère re-saisir manuellement pour ne garder que les liens utiles. Ne pas re-proposer.
- **Modules V2** (ne pas inclure en V1) : Liste de courses, Todo list, Suivi de budget (style Tricount), notifications push, app mobile native, monitoring/alerting

## Modèle multi-comptes et rôles

- **Admin instance** : crée et gère les comptes utilisateurs, configure les paramètres globaux
- **Utilisateur** : gère son propre espace (liens, recettes, notes) — totalement indépendant des autres comptes
- Pas de partage de contenu entre comptes (chaque espace est isolé)
- Le partage se fait uniquement par lien public externe, sans créer de compte

## Module Liens — détails

- Structure d'une fiche lien : URL (obligatoire), titre (obligatoire), catégorie (obligatoire), description (optionnel), favicon auto-récupéré
- Les catégories sont librement créées par l'utilisateur (ex : "Jeux vidéo", "Outils", "Cuisine", "Dev")
- Interface d'administration pour créer / modifier / réorganiser catégories et liens
- C'est le module affiché par défaut à l'ouverture du dashboard (page d'accueil navigateur)
- Usage principalement desktop

## Module Recettes — détails

- Fonctionnalités : rédaction libre, liste d'ingrédients structurée, adaptation automatique des quantités selon nombre de convives
- Le scaling est **indicatif** (proportionnalité simple) — pas de logique intelligente pour la pâtisserie, les temps de cuisson, etc. L'utilisateur est averti implicitement que c'est un outil d'aide, pas une règle absolue. Ne pas ajouter de warnings complexes.
- Partage : lien public en lecture seule, jeton CSPRNG, options d'expiration : 24h / 7 jours / 30 jours / permanent, révocable manuellement
- Usage mixte desktop (saisie) et mobile (consultation en cuisine)
- Comparable à Marmiton pour l'expérience utilisateur de base

## Module Notes — détails

- Style OneNote / carnet de notes personnel
- Chaque note : privée par défaut
- Partage : lien public temporaire, même mécanique que les recettes (expiration optionnelle, révocable)
- Le destinataire d'un lien partagé n'a PAS besoin d'un compte
- Usage mixte desktop et mobile

## Partage par lien public — spécifications communes aux deux modules

- Jeton de partage : CSPRNG (entropie suffisante, ne pas utiliser d'ID séquentiel)
- Options d'expiration : 24h / 7 jours / 30 jours / permanent (au choix de l'utilisateur au moment du partage)
- Révocation manuelle possible à tout moment
- Accès en lecture seule uniquement
- Pas de tracking du nombre d'accès requis en V1 (open question : à décider lors du design)

## Sécurité — contraintes identifiées

- Auth : JWT + bcrypt, protection brute-force (lockout après N tentatives)
- Liens publics : tokens CSPRNG pour éviter l'énumération
- TLS : délégué au reverse proxy (ne pas gérer dans l'app)
- Backups : dumps automatisés de MariaDB inclus en V1 (cron Docker ou équivalent)
- L'instance est exposée sur internet (nom de domaine public) — surface d'attaque à considérer dans le design

## Scénarios utilisateurs détaillés

- **Manu, desktop** : Ouvre un nouvel onglet → voit son dashboard de liens organisés par catégories → clique directement sur un site
- **Manu, cuisine** : Ouvre le module Recettes sur téléphone → consulte une recette → ajuste les quantités pour 4 personnes
- **Manu, partage** : Crée une note ou une recette → génère un lien public → envoie à un ami par message sans que l'ami ait besoin d'un compte
- **Membre famille** : A son propre compte → voit ses propres liens (indépendants de ceux de Manu) → reçoit un lien partagé par Manu et l'ouvre sans login

## Idées rejetées (ne pas re-proposer)

| Idée | Raison du rejet |
|------|----------------|
| Import de favoris navigateur | Favoris existants jugés trop obsolètes ; re-saisie manuelle préférable pour garder uniquement les liens utiles |
| SQLite à la place de MariaDB | Manu a choisi MariaDB intentionnellement (pratique professionnelle, NestJS, familiarité) |
| Vue.js ou React | NestJS + Angular sont imposés pour l'apprentissage — ne pas remettre en question |
| Modules V2 en V1 | Liste de courses, todo, budget : pertinents mais hors focus V1 pour rester sur un périmètre réaliste |
| Monitoring/alerting V1 | Hors scope, usage personnel, tolérance aux pannes silencieuses acceptable |
| Partage inter-comptes | Les espaces utilisateurs sont volontairement isolés — le partage passe par lien public uniquement |

## Questions ouvertes (non résolues, à traiter en design/PRD)

- Faut-il afficher un compteur d'accès aux liens partagés (combien de fois ouvert) ?
- Durée d'expiration par défaut quand l'utilisateur ne choisit pas : 7 jours ou permanent ?
- Le favicon est-il récupéré automatiquement à la création du lien, ou manuellement uploadable ?
- Interface admin : intégrée dans l'app principale (route `/admin`) ou interface séparée ?
- Ordre d'affichage des catégories et liens : drag & drop, champ ordre manuel, ou alphabétique ?

## Paysage concurrentiel (synthèse)

- **Dashy / Homepage** : dashboards de liens uniquement, centrés services/monitoring, pas de recettes ni notes
- **Mealie / Tandoor** : gestionnaires de recettes dédiés, pas de dashboard ni notes
- **Joplin / Outline / AppFlowy** : notes uniquement, pas de dashboard ni recettes
- **Nextcloud** : tout-en-un mais lourd, complexe, overkill pour usage familial personnel
- **Raindrop.io** : bookmarks cloud, pas self-hosted, pas de recettes ni notes
- **Gap identifié** : aucun outil self-hosted ne combine ces trois modules dans une interface cohérente déployable en une commande

## Roadmap macro

| Version | Contenu |
|---------|---------|
| V1 phase 1 | Module Liens + Auth + Admin |
| V1 phase 2 | Module Recettes + Partage par lien |
| V1 phase 3 | Module Notes + Partage par lien + PWA basique (si natif Angular) |
| V2 | Liste de courses (responsive/mobile-first, cases à cocher), Todo list, PWA offline data |
| V3+ | Suivi de budget partagé (style Tricount), modules communautaires éventuels |
