# Dashboard

Dashboard personnel auto-hébergé — Angular 21 + NestJS 11.

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
