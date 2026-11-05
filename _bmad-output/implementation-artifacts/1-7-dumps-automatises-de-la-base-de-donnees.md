# Story 1.7 : Dumps automatisés de la base de données

Status: done

## Story

En tant qu'administrateur,
Je veux que ma base MariaDB soit sauvegardée automatiquement à intervalles réguliers,
Afin de pouvoir restaurer l'application en cas de défaillance serveur sans perdre mes données.

## Acceptance Criteria

1. **Étant donné** que `scripts/backup.sh` existe et est exécutable,
   **Quand** le script est lancé manuellement,
   **Alors** il crée un dump SQL horodaté dans le répertoire `backups/`

2. **Étant donné** qu'un service `backup` est configuré dans `docker-compose.yml`,
   **Quand** la planification se déclenche (toutes les 24h),
   **Alors** un nouveau fichier de dump est créé automatiquement

3. **Étant donné** qu'un fichier de dump existe,
   **Quand** il est restauré sur une instance MariaDB vierge,
   **Alors** la base de données est dans l'état du moment de la sauvegarde

## Tasks / Subtasks

- [x] **T1 — Créer `scripts/backup.sh`** (AC: #1, #3)
  - [x] Script shell `/bin/sh` (pas bash — plus portable sur les images Alpine/Debian)
  - [x] Nommage horodaté : `dump_YYYYMMDD_HHMMSS.sql`
  - [x] `mkdir -p "${BACKUP_DIR}"` pour créer le répertoire si absent
  - [x] Option `--single-transaction` pour un dump cohérent InnoDB sans lock de table
  - [x] Supprimer les dumps de plus de 30 jours (rétention via `find ... -mtime +30 -delete`)
  - [x] Log horodaté de chaque dump créé via `echo "[$(date)] ..."` (stdout Docker)

- [x] **T2 — Créer `backups/.gitkeep` et mettre à jour `.gitignore`** (AC: #2)
  - [x] Créer `backups/.gitkeep` (fichier vide — le dossier doit être versionné, pas les dumps)
  - [x] Ajouter `backups/*.sql` dans `.gitignore` à la racine du projet

- [x] **T3 — Ajouter le service `backup` dans `docker-compose.yml`** (AC: #2)
  - [x] Image : `mariadb:11-lts` (déjà utilisée pour `db` — aucun `docker pull` supplémentaire)
  - [x] `entrypoint` : sleep 30s puis boucle infinie `while true; do sh /scripts/backup.sh; sleep 86400; done`
  - [x] `sleep 30` au démarrage : délai de sécurité post-healthcheck (MariaDB may need extra time)
  - [x] Variables d'env : `DB_HOST=db`, `DB_PORT=${DB_PORT:-3306}`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - [x] **Ne pas utiliser `env_file: .env`** — passer uniquement les variables DB nécessaires (le service backup n'a pas besoin de `JWT_SECRET` etc.)
  - [x] Mount `./scripts/backup.sh:/scripts/backup.sh:ro` (lecture seule)
  - [x] Mount `./backups:/backups` (bind mount — dumps accessibles depuis l'hôte)
  - [x] `depends_on: db: condition: service_healthy` — pattern déjà utilisé dans ce fichier
  - [x] `networks: - dashboard_net`, `restart: unless-stopped`

- [x] **T4 — Validation** (AC: #1, #2, #3)
  - [x] Syntaxe YAML docker-compose.yml validée (python3 yaml.safe_load — Docker non disponible en CI)
  - [x] Syntaxe shell backup.sh validée (`sh -n`)
  - [x] `git status` → aucun fichier `.sql` stagé (exclusion `.gitignore` OK)
  - [ ] Test runtime à exécuter par Manu : `docker compose up -d backup` puis `ls -lh backups/` après ~35s

## Dev Notes

### Contexte

Dernière story de l'Épic 1. **Aucun code NestJS ni Angular n'est modifié.** Infrastructure pure.

**FRs couverts :** FR46
**NFRs couverts :** NFR15 (4 semaines sans intervention manuelle), NFR16 (dumps automatisés dans Docker Compose)

---

### T1 — `scripts/backup.sh` (implémentation complète)

```sh
#!/bin/sh
BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/dump_${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

mariadb-dump \
  --host="${DB_HOST:-db}" \
  --port="${DB_PORT:-3306}" \
  --user="${DB_USER}" \
  --password="${DB_PASSWORD}" \
  --single-transaction \
  --routines \
  --triggers \
  "${DB_NAME}" > "${BACKUP_FILE}"

echo "[$(date)] Dump créé : ${BACKUP_FILE} ($(du -sh "${BACKUP_FILE}" | cut -f1))"

find "${BACKUP_DIR}" -name "dump_*.sql" -mtime +30 -delete
echo "[$(date)] Nettoyage : dumps de plus de 30 jours supprimés"
```

**Points critiques :**
- `mariadb-dump` est le nom natif sur MariaDB 11 (alias de `mysqldump` — les deux fonctionnent dans `mariadb:11-lts`)
- `--single-transaction` : dump cohérent sans lock de table (InnoDB) — **obligatoire** pour ne pas bloquer l'application
- `--routines --triggers` : inclut les routines et triggers si ajoutés ultérieurement
- Variables lues depuis l'environnement Docker — pas de valeurs en dur dans le script
- Rétention 30 jours : `find ... -mtime +30 -delete` — nettoie à chaque exécution

---

### T2 — `backups/` et `.gitignore`

**`backups/.gitkeep`** : fichier vide pour que git suive le répertoire.

**`.gitignore` à la racine** — ajouter ces lignes (le fichier existe déjà) :
```
# Database backups
backups/*.sql
```

---

### T3 — Service `backup` dans `docker-compose.yml`

Ajouter dans la section `services` (après `frontend`) :

```yaml
  backup:
    image: mariadb:11-lts
    entrypoint:
      - /bin/sh
      - -c
      - |
        echo "[$(date)] Service backup démarré — premier dump dans 30s, puis toutes les 24h"
        sleep 30
        while true; do
          sh /scripts/backup.sh
          sleep 86400
        done
    environment:
      DB_HOST: db
      DB_PORT: ${DB_PORT:-3306}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: ${DB_NAME}
    volumes:
      - ./scripts/backup.sh:/scripts/backup.sh:ro
      - ./backups:/backups
    depends_on:
      db:
        condition: service_healthy
    networks:
      - dashboard_net
    restart: unless-stopped
```

**Pourquoi `sleep 30` ?** Le healthcheck MariaDB peut passer `healthy` avant que le service accepte toutes les connexions. 30s évite un premier `mariadb-dump: Can't connect to server` sans bloquer le démarrage.

**Pourquoi pas `env_file: .env` ?** Le service backup n'a besoin que des variables DB. Passer `JWT_SECRET` et autres à un container backup serait une violation du principe du moindre privilège.

**Pourquoi pas de cron externe ?** NFR17 interdit les dépendances externes. La boucle `while true / sleep 86400` est la solution zéro-dépendance idiomatique pour Docker Compose.

---

### T1 — Rendu exécutable

Après création du fichier `scripts/backup.sh`, il faut le rendre exécutable dans le repo :

```bash
chmod +x scripts/backup.sh
git add scripts/backup.sh
```

Git préserve le bit exécutable — le container pourra donc exécuter directement `sh /scripts/backup.sh` (le `sh` explicite dans l'entrypoint rend le bit exécutable optionnel, mais la bonne pratique est de l'avoir quand même).

---

### Structure de fichiers créés/modifiés

```
dashboard/
├── scripts/
│   └── backup.sh          (CRÉER — chmod +x)
├── backups/
│   └── .gitkeep           (CRÉER — vide)
├── .gitignore              (MODIFIER — ajouter backups/*.sql)
└── docker-compose.yml     (MODIFIER — ajouter service backup)
```

**État existant :** `scripts/` existe déjà à la racine mais est vide. Ne pas le recréer.

---

### Restauration manuelle

**Depuis l'hôte (si MariaDB exposé) :**
```sh
mariadb -h 127.0.0.1 -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < backups/dump_YYYYMMDD_HHMMSS.sql
```

**Via un container temporaire (recommandé — MariaDB non exposé en production) :**
```sh
docker run --rm \
  --network dashboard_net \
  -v $(pwd)/backups:/backups \
  mariadb:11-lts \
  mariadb -h db -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < /backups/dump_YYYYMMDD_HHMMSS.sql
```

---

### Learnings des stories précédentes

**De Story 1.2 (Docker Compose) :**
- Pattern `depends_on: condition: service_healthy` déjà utilisé pour `backend` → `db` : copier ce pattern tel quel
- Réseau `dashboard_net` : tous les services l'utilisent — le service `backup` doit également s'y connecter pour atteindre `db` par son hostname
- Image `mariadb:11-lts` déjà pullée pour `db` — la réutiliser pour `backup` ne coûte rien
- Variables `DB_USER`, `DB_PASSWORD`, `DB_NAME` déjà définies dans `.env` — issues par `docker-compose.yml` sans modification

**De Story 1.1 :**
- `scripts/` existe à la racine depuis l'initialisation — ne pas recréer
- Convention : les fichiers shell à la racine de `scripts/` sont documentés dans le README

---

### Scope de cette story

**In scope :**
- `scripts/backup.sh` (créer)
- `backups/.gitkeep` (créer)
- `.gitignore` (modifier)
- `docker-compose.yml` (modifier — service `backup`)

**Hors scope :**
- Compression gzip des dumps → optimisation post-V1
- Chiffrement des backups → hors PRD
- Upload vers stockage distant (S3, SFTP, rsync) → hors PRD
- Interface de restauration → hors PRD
- Alerting sur échec du dump (`curl` webhook, etc.) → hors PRD
- `proxy_read_timeout`/`proxy_connect_timeout` nginx (deferred depuis 1-2) → reste deferred

---

### Références

- [Source: epics.md#Story 1.7] — acceptance criteria BDD
- [Source: architecture.md#Infrastructure & Déploiement] — `scripts/backup.sh`, dumps si base embarquée
- [Source: prd.md#NFR16] — dumps automatisés dans Docker Compose, script `scripts/backup.sh`
- [Source: prd.md#NFR17] — zéro dépendance externe — confirme boucle shell sans cron externe
- [Source: docker-compose.yml] — services existants, pattern `depends_on: service_healthy`, `dashboard_net`
- [Source: .env.example] — variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`

## Dev Agent Record

### Implementation Plan

Story purement infrastructurelle — aucun code NestJS/Angular modifié. 4 fichiers créés/modifiés :
1. `scripts/backup.sh` : script `/bin/sh` avec mariadb-dump, horodatage, rétention 30j
2. `backups/.gitkeep` : répertoire versionné, dumps exclus par .gitignore
3. `.gitignore` : ajout `backups/*.sql`
4. `docker-compose.yml` : service `backup` avec image `mariadb:11-lts`, boucle `while true/sleep 86400`, variables DB minimales (pas env_file)

### Completion Notes

- T1 ✅ : `scripts/backup.sh` créé, syntaxe shell OK (`sh -n`), chmod +x appliqué
- T2 ✅ : `backups/.gitkeep` créé, `backups/*.sql` ajouté dans `.gitignore`
- T3 ✅ : Service `backup` ajouté dans `docker-compose.yml`, syntaxe YAML validée (python3)
- T4 ✅ : Validation syntaxique complète. Test runtime (`docker compose up -d backup`) à effectuer par Manu (Docker non disponible en environnement d'exécution de l'agent)
- Aucune régression possible — story infrastructure pure, aucun fichier NestJS/Angular modifié
- `git status` confirme : aucun fichier `.sql` tracké

## File List

- `scripts/backup.sh` (créé)
- `backups/.gitkeep` (créé)
- `.gitignore` (modifié)
- `docker-compose.yml` (modifié)

## Review Findings

### Patches

- [x] [Review][Patch] Absence de gestion d'erreur après `mariadb-dump` — dump corrompu/vide conservé silencieusement si la commande échoue [scripts/backup.sh:8-18]
- [x] [Review][Patch] Mot de passe exposé en argument CLI via `--password=` — visible dans `ps aux` [scripts/backup.sh:12]
- [x] [Review][Patch] Absence de validation des variables d'env critiques — DB_USER, DB_PASSWORD, DB_NAME non vérifiées en début de script [scripts/backup.sh:1-5]
- [x] [Review][Patch] Log de nettoyage inconditionnel — `echo "Nettoyage..."` s'affiche même si aucun fichier n'a été supprimé [scripts/backup.sh:20-21]

### Deferred

- [x] [Review][Defer] Comportement au redémarrage — `restart: unless-stopped` + boucle `sleep 86400` peut déclencher un dump supplémentaire en cas de restart [docker-compose.yml] — deferred, design intentionnel (NFR17 interdit cron externe)
- [x] [Review][Defer] Vérification d'intégrité des dumps absente — taille seule ne valide pas la cohérence du fichier SQL [scripts/backup.sh] — deferred, hors scope story (listé dans "Hors scope")
- [x] [Review][Defer] Absence de limites de ressources sur le container backup — pas de `mem_limit`/`cpus` [docker-compose.yml] — deferred, opérationnel, hors scope story
- [x] [Review][Defer] `find -delete` peut échouer silencieusement sur erreur de permissions [scripts/backup.sh:20] — deferred, cas théorique (fichiers créés par le même processus)
- [x] [Review][Defer] Documentation des variables requises absente du README/.env.example — DB_USER, DB_PASSWORD, DB_NAME obligatoires sans valeur par défaut — deferred, hors scope code review

## Change Log

- 2026-05-01 : Création de la story — contexte exhaustif pour implémentation
- 2026-05-01 : Implémentation complète — T1/T2/T3/T4 validés, story → review
- 2026-05-01 : Code review — 4 patches identifiés, 5 items différés
