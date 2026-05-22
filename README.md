# Dashboard

> Application web personnelle auto-hébergée qui remplace l'onglet par défaut du navigateur.

Dashboard centralise trois usages quotidiens — **liens favoris**, **recettes de cuisine** et **notes personnelles** — sous une interface unique et cohérente, déployable en une commande. Toutes les données restent sur votre serveur : pas d'abonnement, pas de cloud tiers, pas de dépendance externe.

## L'application

### Ce que c'est

La vie numérique personnelle est souvent fragmentée entre des outils mono-fonction (Dashy pour les liens, Mealie pour les recettes, Joplin pour les notes) ou des services cloud dont on ne maîtrise ni les données ni la pérennité. Dashboard réunit ces trois usages dans une seule URL, avec un design cohérent et une complexité opérationnelle minimale.

### Trois modules, un seul outil

**📎 Module Liens** — Page d'accueil par défaut après connexion. Les liens sont organisés en catégories configurables (nom, icône Material), réorganisables par drag & drop. L'ajout d'un lien récupère automatiquement le titre et le favicon depuis l'URL. Un mode édition/lecture bascule les contrôles sans changer de page.

**🍽️ Module Recettes** — CRUD complet avec ingrédients structurés. Un stepper recalcule les quantités en temps réel selon le nombre de convives. Les recettes sont filtrables par recherche en temps réel. Partage par lien public avec durée d'expiration configurable (24h, 7j, 30j, permanent) et révocation à tout moment.

**📝 Module Notes** — Éditeur WYSIWYG (TipTap), organisation en dossiers et sous-dossiers, sauvegarde automatique pendant la saisie. Partage public avec expiration, comme les recettes.

### Gestion des utilisateurs

L'instance supporte plusieurs comptes (< 10) — famille, amis proches. Chaque utilisateur a un espace strictement isolé. L'admin crée les comptes, génère des mots de passe temporaires (affichés une seule fois, transmis hors-bande), et peut réinitialiser ou désactiver un compte. Aucun serveur mail requis.

Les visiteurs non connectés peuvent accéder aux contenus partagés (recettes, notes) en lecture seule, sans compte et sans voir le reste de l'application.

### Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Angular 21 · Material · PWA (app shell) |
| Backend | NestJS 11 · TypeORM |
| Base de données | MariaDB 11 LTS |
| Auth | JWT (access + refresh) · bcrypt |
| Infrastructure | Docker Compose · GHCR · GitHub Actions CI/CD |

## Fonctionnalités à venir

Les idées ci-dessous constituent une liste non exhaustive des évolutions envisagées. Elles ne sont ni planifiées ni priorisées — certaines verront le jour, d'autres non.

### Nouveaux modules

| Module | Description |
|--------|-------------|
| ✅ **Liste de courses** | Liste collaborative à cocher depuis le téléphone pendant les courses |
| 📋 **Todo list** | Gestion de tâches personnelles |
| 💶 **Suivi de budget** | Partage et équilibrage de dépenses entre utilisateurs de l'instance, style Tricount |
| 📬 **Courrier (IMAP)** | Accès à plusieurs boîtes mail depuis un seul endroit via IMAP |

### Page d'accueil configurable

La page Liens évoluerait vers une page d'accueil modulaire avec des **widgets configurables** :

- 🌤️ **Météo** — conditions actuelles et prévisions pour un lieu paramétrable
- 📈 **Cours de bourse** — suivi de valeurs personnalisées (actions, ETF, crypto)
- 📰 **Flux d'actualité** — titres depuis des sources RSS configurables
- 🖥️ **Statut de serveurs** — monitoring visuel de services personnels (URLs pingées)
- 🔍 **Barre de recherche** — lancer une recherche sur le moteur de son choix directement depuis la page d'accueil

### Collaboration et temps réel

- **Notes collaboratives** — édition simultanée d'une note entre plusieurs utilisateurs de l'instance
- **Whiteboard** — espace de dessin et d'écriture libre collaboratif en temps réel

### Import et interopérabilité

- Import de favoris depuis un navigateur (Chrome, Firefox)
- Import depuis des outils existants (Joplin, OneNote)

### PWA et offline

- Synchronisation et accès aux données en mode hors-ligne (les trois modules)

---

## Déploiement

### Prérequis

- Docker + Docker Compose v2 (`docker compose` sans tiret)
- Accès à GHCR (images publiques — aucune authentification requise)

### Scénario 1 — Stack complète (MariaDB incluse)

Utilise `docker-compose.yml` : backend, frontend, MariaDB et backup automatique quotidien.

**Fichiers à créer sur le serveur :**

```
~/dashboard/
  docker-compose.yml        ← copié depuis le repo
  scripts/backup.sh         ← copié depuis le repo
  .env                      ← créé à partir de .env.example
```

**Configuration `.env` :**

```bash
cp .env.example .env
# Éditer .env : changer les mots de passe, JWT_SECRET, etc.
```

**Démarrage :**

```bash
docker compose pull
docker compose up -d
```

**Mise à jour vers une nouvelle version :**

```bash
docker compose pull
docker compose up -d --remove-orphans
```

---

### Scénario 2 — MariaDB externe (container déjà existant sur le serveur)

Utilise `docker-compose.external-db.yml` : backend et frontend uniquement.
Le backup n'est pas inclus — votre instance MariaDB gère sa propre sauvegarde.

**Fichiers à créer sur le serveur :**

```
~/dashboard/
  docker-compose.external-db.yml   ← copié depuis le repo
  .env                             ← créé à partir de .env.example
```

**Étapes (à faire une seule fois) :**

```bash
# 1. Créer le réseau Docker partagé
docker network create dashboard_net

# 2. Rattacher votre container MariaDB à ce réseau
docker network connect dashboard_net <nom-de-votre-container-mariadb>
```

**Configuration `.env` :**

```bash
# DB_HOST = nom de votre container MariaDB (pas une IP — le nom est stable)
DB_HOST=<nom-de-votre-container-mariadb>
DB_PORT=3306
DB_USER=dashboard_user
DB_PASSWORD=votre_mot_de_passe
DB_NAME=dashboard_db
# DB_ROOT_PASSWORD non utilisé dans ce scénario
```

**Créer la base de données sur votre instance MariaDB :**

```sql
CREATE DATABASE dashboard_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'dashboard_user'@'%' IDENTIFIED BY 'votre_mot_de_passe';
GRANT ALL PRIVILEGES ON dashboard_db.* TO 'dashboard_user'@'%';
FLUSH PRIVILEGES;
```

**Démarrage :**

```bash
docker compose -f docker-compose.external-db.yml pull
docker compose -f docker-compose.external-db.yml up -d
```

**Mise à jour vers une nouvelle version :**

```bash
docker compose -f docker-compose.external-db.yml pull
docker compose -f docker-compose.external-db.yml up -d
```

---

### Fixer une version spécifique

Par défaut, `DASHBOARD_VERSION=latest` tire toujours la dernière release.
Pour épingler une version précise, modifier `.env` :

```bash
DASHBOARD_VERSION=1.2.0
```

---

## Développement

```bash
# Prérequis : Node 22, Docker

# Backend
cd backend && npm install && npm run start:dev

# Frontend
cd frontend && npm install && npm start

# Stack locale complète via Docker
docker compose up -d   # utilise docker-compose.override.yml automatiquement
```

## Tests

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npx ng test --watch=false

# E2E (nécessite la stack Docker démarrée)
cd e2e && npx playwright test
```
