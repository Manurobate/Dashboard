---
title: "Product Brief: Dashboard"
status: "complete"
created: "2026-04-20"
updated: "2026-04-21"
inputs: ["conversation avec Manu", "recherche web sur les outils self-hosted (Dashy, Homepage, Mealie, Joplin, Nextcloud, Raindrop)"]
---

# Product Brief : Dashboard

## Résumé exécutif

La vie numérique quotidienne est dispersée : les favoris s'entassent dans le navigateur sans organisation, les recettes sont éparpillées entre sites web et applications cloud, et les notes personnelles finissent dans OneNote ou d'autres outils tiers dont on ne maîtrise ni les données ni la pérennité. Dashboard est une application web personnelle auto-hébergée qui centralise tout cela en un seul endroit — accessible depuis n'importe quel appareil, **vos données ne quittent jamais votre serveur**.

L'idée est simple : une page d'accueil unique et configurable qui remplace l'onglet par défaut du navigateur. Dashboard réunit les liens favoris organisés par catégories, un gestionnaire de recettes de cuisine avec adaptation automatique des quantités, et un carnet de notes privé ou partageable. Pas d'abonnement, pas de cloud tiers, pas de friction inutile — un seul `docker-compose up` suffit à tout lancer.

Le contexte est favorable : la fatigue des outils SaaS fragmentés pousse de nombreux utilisateurs vers des solutions auto-hébergées, Docker a démocratisé ce type de déploiement, et aucun outil open source n'offre aujourd'hui cette combinaison de fonctionnalités dans une interface cohérente.

## Le problème

Au quotidien, retrouver les bonnes ressources prend du temps et de l'énergie mentale. Les favoris du navigateur s'accumulent en tas ingérables. Les recettes préférées sont dispersées entre sites, bookmarks et photos prises à la va-vite. Les idées et notes personnelles atterrissent dans des outils cloud dont on dépend sans les maîtriser.

Les solutions existantes sont toutes mono-fonction : **Dashy** et **Homepage** pour les liens, **Mealie** pour les recettes, **Joplin** pour les notes. Les utiliser ensemble implique de gérer plusieurs outils, plusieurs interfaces, plusieurs contextes mentaux — une charge inutile pour des usages personnels simples. **Nextcloud** propose un tout-en-un mais reste une infrastructure lourde, complexe à maintenir, surdimensionnée pour un usage familial.

Le coût du statu quo : du temps perdu à chercher, des ressources oubliées, une dépendance à des services que l'on ne contrôle pas.

## La solution

Dashboard est une application web déployable via un seul `docker-compose up`, conçue pour servir de page d'accueil personnalisable et d'outil de gestion du quotidien numérique.

**V1 — Trois modules fondamentaux :**

- **Liens** *(page d'accueil par défaut)* : Tableau de bord principal avec des catégories configurables (jeux vidéo, outils, cuisine, dev…) et des fiches de liens (URL, titre, description optionnelle, favicon auto-récupéré). Interface d'administration pour créer, modifier, réorganiser. C'est la vue affichée en ouvrant un nouvel onglet.
- **Recettes** : Gestionnaire complet — rédaction, liste d'ingrédients structurée, adaptation automatique des quantités selon le nombre de convives, partage par lien public en lecture seule (jeton CSPRNG, révocable manuellement, expiration optionnelle : 24h / 7 jours / 30 jours / permanent).
- **Notes** : Carnet de notes personnel — création, édition, organisation. Chaque note est privée par défaut, partageable via lien public temporaire sans obligation de compte pour le destinataire.

**Modèle multi-comptes :** Deux rôles distincts :
- *Admin instance* : crée et gère les comptes, configure l'instance globale
- *Utilisateur* : gère son propre espace de liens, recettes et notes, indépendant des autres comptes

Le partage de contenu se fait par lien public — le destinataire n'a pas besoin d'un compte.

**Déploiement :** Stack NestJS (API) + Angular (front) + MariaDB (base de données), orchestrée via Docker Compose. TLS assuré par le reverse proxy existant de l'hébergeur (Traefik / Nginx). Dumps de base de données automatisés inclus en V1.

## Ce qui la différencie

Aucun outil auto-hébergé existant ne combine ces trois modules sous une interface cohérente. La différenciation de Dashboard repose sur trois axes :

1. **Convergence** : Là où les concurrents choisissent un seul domaine, Dashboard les réunit sous une URL unique, utilisable comme page d'accueil quotidienne du navigateur.
2. **Souveraineté des données** : Chaque donnée reste sur le serveur de l'utilisateur. Aucun tracking, aucun abonnement, aucune dépendance à une infrastructure tierce.
3. **Minimalisme opérationnel** : Un seul fichier `docker-compose.yml`, sans Redis, Elasticsearch ni services additionnels. Le footprint est intentionnellement minimal et maintenable par une seule personne.

## À qui ça s'adresse

**Utilisateur principal — Manu**
Développeur, auto-hébergeur expérimenté (serveur personnel, Docker, reverse proxy déjà en place). Cherche à centraliser sa vie numérique et à progresser concrètement sur NestJS et Angular via un projet utile au quotidien. Il utilise Dashboard sur desktop comme page d'accueil et sur mobile pour consulter ses recettes en cuisine ou partager rapidement un contenu.

**Utilisateurs secondaires — famille et amis proches**
Petit cercle fermé (< 10 personnes), profils non techniques. Exemples de cas d'usage :
- *Conjoint/e* : consulte les recettes depuis le téléphone pendant la préparation du repas
- *Ami proche* : reçoit un lien vers une recette partagée, l'ouvre sans créer de compte
- *Membre de la famille* : utilise son propre espace de liens comme page d'accueil sur son navigateur

## Critères de succès

- **Adoption quotidienne** : Dashboard est défini comme page d'accueil du navigateur et consulté chaque jour pendant 4 semaines consécutives après le lancement
- **Modules actifs** : Au moins deux modules V1 utilisés activement chaque semaine (nouveau lien ajouté, recette consultée ou créée, note rédigée)
- **Partage effectif** : Au moins un lien public partagé avec un membre de la famille ou un ami dans le mois suivant le lancement
- **Stabilité** : L'instance tourne sans intervention pendant 4 semaines après déploiement initial
- **Apprentissage** : Au moins un intercepteur NestJS et un resolver/guard Angular implémentés depuis zéro, sans copier-coller de boilerplate

## Périmètre

**V1 — Dans le scope (déploiement progressif : Liens → Recettes → Notes) :**
- Authentification multi-comptes (JWT + bcrypt, protection brute-force)
- Rôles : admin instance / utilisateur
- Module Liens : catégories, fiches de liens (URL + titre + favicon), interface admin *(livré en premier)*
- Module Recettes : CRUD, ingrédients structurés, adaptation indicative des quantités par nombre de convives, partage par lien public avec expiration *(livré en second)*
- Module Notes : CRUD, privé par défaut, partage par lien public avec expiration *(livré en troisième)*
- Design responsive (mobile-first pour Recettes et Notes, desktop-first pour Liens)
- PWA basique — app shell mis en cache via `ng add @angular/pwa` (si configuration native suffisante ; sinon reporté en V2)
- Déploiement Docker Compose avec dumps automatisés de la base
- TLS via reverse proxy existant (Traefik / Nginx)

**Hors scope V1 :**
- Import depuis d'autres outils (bookmarks navigateur, Joplin, OneNote) — re-saisie manuelle intentionnelle
- Module Liste de courses (V2)
- Module Todo list (V2)
- Module Suivi de budget (V2)
- Application mobile native
- Notifications push
- PWA offline data / synchronisation complète (V2 si PWA basique intégrée en V1)
- Monitoring et alerting

## Vision

Si Dashboard s'impose comme un outil quotidien fiable, la V2 introduit les modules additionnels : liste de courses collaborative avec cases à cocher depuis le téléphone, todo list, suivi de budget partagé entre plusieurs personnes (style Tricount).

À plus long terme, Dashboard peut évoluer en un hub personnel léger — une alternative minimaliste et auto-hébergée à Notion ou Nextcloud, orientée simplicité d'usage plutôt que richesse fonctionnelle. L'architecture modulaire de la V1 est conçue pour accueillir ces extensions sans refonte majeure.
