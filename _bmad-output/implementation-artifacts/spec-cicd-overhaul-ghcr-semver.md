---
title: 'Refonte pipeline CD — GHCR + Semantic Versioning'
type: 'chore'
created: '2026-05-22'
status: 'done'
baseline_commit: 'cb1d7a7144233d72029f631a69b2c50a557ba42b'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le pipeline CD déploie via SSH (`git pull + docker-compose up --build` sur le serveur), ce qui rend la production dépendante du code source et des outils de build. La première mise en production (post-Épic 4) révèle que ce modèle est inadapté au besoin réel.

**Approach:** Remplacer le CD par un pipeline de release qui build des images Docker et les publie sur GHCR avec semantic versioning (Conventional Commits). Le déploiement devient `docker compose pull + up` sans code source sur le serveur. Optimiser le CI pour n'exécuter les E2E qu'au merge dans develop.

## Boundaries & Constraints

**Always:**
- Registre : GHCR (`ghcr.io/manurobate/dashboard-backend` et `ghcr.io/manurobate/dashboard-frontend`)
- Versioning : git tags semver (`vX.Y.Z`) + `package.json` racine comme fichier version carrier
- Bump via Conventional Commits : `fix:` → patch, `feat:` → minor, `feat!:` / `BREAKING CHANGE:` → major ; défaut patch si aucun CC trouvé
- CD déclenché par `push: branches: [main]` (= merge d'une PR dans main)
- `GITHUB_TOKEN` uniquement — zéro secret supplémentaire
- E2E Playwright : uniquement sur `push` dans develop (pas sur les PRs de feature)
- `docker-compose.yml` production : images GHCR (pas de `build:`)
- `docker-compose.override.yml` dev : garde les directives `build:` pour le dev local
- Mettre à jour les artefacts de planification (`architecture.md`, `epics.md`, story `1-3`, `deferred-work.md`)

**Ask First:**
- Si le tag `v0.0.0` n'existe pas sur `main` au moment de l'implémentation, demander à Manu de le créer avant le premier merge

**Never:**
- Secrets SSH (`SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `DEPLOY_PATH`) — à supprimer
- Déploiement automatique sur le serveur de production
- Push d'images sur Docker Hub
- Modifier la logique du CI (lint, tests, build) — seule la condition E2E change

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Release standard | Merge PR `develop→main` avec commit `feat: ajout recettes` | bump minor, images publiées `vX.Y+1.0` + `:latest` sur GHCR, GitHub Release créée | Workflow échoue visiblement si build Docker rate |
| Aucun CC trouvé | Commits depuis dernier tag : `wip: en cours`, `chore: cleanup` | bump patch par défaut → `vX.Y.Z+1` | Jamais de release ratée — fallback patch |
| Breaking change | Commit `feat!: refonte API` | bump major → `vX+1.0.0` | N/A |
| Pas de tag baseline | Premier run, aucun tag git | `git describe` échoue → fallback `v0.0.0` → release `v0.0.1` (patch) | Acceptable — Manu créera `v0.0.0` manuellement avant |
| PR feature → develop | Push sur branche feature ouverte en PR | Lint + tests + build uniquement, E2E skippé | N/A |
| Merge dans develop | Push post-merge sur `develop` | Lint + tests + build + E2E Playwright | N/A |

</frozen-after-approval>

## Code Map

- `.github/workflows/cd.yml` -- pipeline CD actuel (SSH deploy) → réécriture complète
- `.github/workflows/ci.yml` -- pipeline CI → ajout condition E2E `if: github.event_name == 'push'`
- `docker-compose.yml` -- VIDE → créer avec images GHCR (`${DASHBOARD_VERSION:-latest}`)
- `docker-compose.override.yml` -- VIDE → créer avec directives `build:` pour dev local
- `.env.example` (racine) -- ajouter `DASHBOARD_VERSION=latest`
- `package.json` (racine) -- ABSENT → créer (`version: 0.0.0`, `private: true`)
- `_bmad-output/planning-artifacts/architecture.md` -- section Infrastructure & Déploiement
- `_bmad-output/planning-artifacts/epics.md` -- Story 1.3 AC3
- `_bmad-output/implementation-artifacts/1-3-pipeline-ci-cd-gitflow-github-actions.md` -- AC3 + T2 + T3bis + T5 + dev notes CC
- `_bmad-output/implementation-artifacts/deferred-work.md` -- supprimer 2 items résolus (rollback CD + rebuild prod)

## Tasks & Acceptance

**Execution:**
- [x] `package.json` (racine) -- CRÉER avec `{"name":"dashboard","version":"0.0.0","private":true}` -- version carrier pour le pipeline CD
- [x] `.github/workflows/cd.yml` -- RÉÉCRIRE -- pipeline de release GHCR (voir Design Notes §1 pour le YAML complet)
- [x] `.github/workflows/ci.yml` -- MODIFIER -- ajouter `if: github.event_name == 'push'` sur le job `e2e` ; ET mettre à jour le step "Créer backend/.env pour CI" : changer `cat > backend/.env` en `cat > .env` (racine) pour correspondre au `env_file: .env` de `docker-compose.yml`
- [x] `docker-compose.yml` -- CRÉER -- services `db`, `backend`, `frontend` avec `image: ghcr.io/manurobate/dashboard-*:${DASHBOARD_VERSION:-latest}` (voir Design Notes §2)
- [x] `docker-compose.override.yml` -- CRÉER -- directives `build:` pour dev local (voir Design Notes §3)
- [x] `.env.example` (racine) -- MODIFIER -- ajouter ligne `DASHBOARD_VERSION=latest` avec commentaire explicatif
- [x] `architecture.md` -- MODIFIER -- remplacer la ligne `CI/CD` dans la table Infrastructure & Déploiement par les 9 lignes du Sprint Change Proposal §4.1
- [x] `epics.md` -- MODIFIER -- remplacer l'AC3 de Story 1.3 par le texte du Sprint Change Proposal §4.2
- [x] `1-3-pipeline-ci-cd-gitflow-github-actions.md` -- MODIFIER -- AC3, remplacer T2 par nouveau T2 GHCR, ajouter T3bis (ci.yml E2E condition), ajouter T5 (checklist première release), ajouter section Dev Notes Conventional Commits
- [x] `deferred-work.md` -- MODIFIER -- supprimer l'item "Pas de mécanisme de rollback dans le CD" (section 1-3) ET l'item "Rebuild des images sur le serveur prod" (section 4-2)

**Acceptance Criteria:**
- Given le fichier `cd.yml` est en place, when un commit est pushé sur `main`, then le workflow déclenche une release semver (bump + tag + images GHCR + GitHub Release)
- Given le `cd.yml`, when les commits depuis le dernier tag contiennent au moins un `feat:`, then le bump est `minor`
- Given le `cd.yml`, when aucun CC releasable n'est trouvé, then le bump est `patch` par défaut (jamais d'échec silencieux)
- Given la condition E2E dans `ci.yml`, when une PR de feature est ouverte/mise à jour, then le job `e2e` est skippé (`if: github.event_name == 'push'`)
- Given la condition E2E dans `ci.yml`, when un merge est effectué dans `develop`, then le job `e2e` s'exécute
- Given `docker-compose.yml`, when `docker compose pull && docker compose up -d` est lancé sans code source, then les 3 services démarrent avec les images GHCR
- Given `docker-compose.override.yml` présent en dev, when `docker compose up`, then le backend est buildé localement avec hot-reload
- Given `package.json` racine avec `version: 0.0.0`, when le CD bumpe en `v0.1.0`, then le fichier affiche `"version": "0.1.0"`

## Design Notes

### §1 — cd.yml complet

```yaml
name: Release

on:
  push:
    branches: [main]
    # Un merge de PR dans main déclenche l'événement "push" côté GitHub Actions.
    # La branch protection garantit que seuls les merges de PR depuis develop arrivent ici.

concurrency:
  group: release-main
  cancel-in-progress: false

permissions:
  contents: write
  packages: write

jobs:
  release:
    name: Bump · Build · Publish
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Calculer la version
        id: version
        run: |
          LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          CURRENT=$(echo "$LAST_TAG" | sed 's/^v//')
          COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%s")
          if echo "$COMMITS" | grep -qE "^feat!:|BREAKING CHANGE"; then
            BUMP="major"
          elif echo "$COMMITS" | grep -qE "^feat:"; then
            BUMP="minor"
          else
            BUMP="patch"
          fi
          NEW=$(npx --yes semver -i "$BUMP" "$CURRENT")
          echo "version=$NEW"  >> $GITHUB_OUTPUT
          echo "tag=v$NEW"     >> $GITHUB_OUTPUT
          echo "📦 $CURRENT → $NEW ($BUMP)"

      - name: Bumper package.json
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          npm version ${{ steps.version.outputs.version }} --no-git-tag-version
          git add package.json
          git commit -m "chore: release ${{ steps.version.outputs.tag }} [skip ci]"
          git push

      - name: Créer le tag
        run: |
          git tag ${{ steps.version.outputs.tag }} -m "Release ${{ steps.version.outputs.tag }}"
          git push origin ${{ steps.version.outputs.tag }}

      - name: Login GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/setup-buildx-action@v3

      - name: Build & Push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/dashboard-backend:${{ steps.version.outputs.version }}
            ghcr.io/${{ github.repository_owner }}/dashboard-backend:latest
          cache-from: type=gha
          cache-to:   type=gha,mode=max

      - name: Build & Push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/dashboard-frontend:${{ steps.version.outputs.version }}
            ghcr.io/${{ github.repository_owner }}/dashboard-frontend:latest
          cache-from: type=gha
          cache-to:   type=gha,mode=max

      - name: Créer la GitHub Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create ${{ steps.version.outputs.tag }} \
            --generate-notes \
            --title "Dashboard ${{ steps.version.outputs.tag }}" \
            --latest
```

### §2 — docker-compose.yml production (GHCR)

Basé sur le fichier existant (Story 1.2 T6 + Story 1.7 backup), `build:` remplacé par `image:` GHCR.
⚠️ Le service `backup:` existant (Story 1.7) est CONSERVÉ tel quel — il utilise déjà `image: mariadb:11-lts`, pas de `build:`.

```yaml
services:
  db:
    image: mariadb:11-lts
    environment:
      MARIADB_DATABASE: ${DB_NAME}
      MARIADB_USER: ${DB_USER}
      MARIADB_PASSWORD: ${DB_PASSWORD}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - dashboard_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
      start_period: 30s
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ghcr.io/manurobate/dashboard-backend:${DASHBOARD_VERSION:-latest}
    env_file: .env
    depends_on:
      db:
        condition: service_healthy
    networks:
      - dashboard_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3000/api/health || exit 1"]
      start_period: 30s
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    image: ghcr.io/manurobate/dashboard-frontend:${DASHBOARD_VERSION:-latest}
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "80:80"
    networks:
      - dashboard_net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost/ || exit 1"]
      start_period: 30s
      interval: 10s
      timeout: 5s
      retries: 3

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
      DB_USER: ${DB_USER:?DB_USER requis dans .env}
      DB_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD requis dans .env}
      DB_NAME: ${DB_NAME:?DB_NAME requis dans .env}
    volumes:
      - ./scripts/backup.sh:/scripts/backup.sh:ro
      - ./backups:/backups
    depends_on:
      db:
        condition: service_healthy
    networks:
      - dashboard_net
    restart: unless-stopped

networks:
  dashboard_net:

volumes:
  db_data:
```

### §3 — docker-compose.override.yml dev local

Basé sur Story 1.2 T7 :

```yaml
services:
  backend:
    build:
      context: ./backend
      target: builder
    image: ""
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run start:dev
    ports:
      - "3000:3000"

  frontend:
    build:
      context: ./frontend
    image: ""

  db:
    ports:
      - "3306:3306"
```

### §4 — Conventional Commits (convention obligatoire dès Épic 5)

```
fix:      → bump patch (1.0.x)
feat:     → bump minor (1.x.0)
feat!:    → bump major (x.0.0)
BREAKING CHANGE: (dans le corps) → major
chore:, docs:, refactor:, test: → patch par défaut
```

Les commits antérieurs à l'adoption (Épics 1–4) sont ignorés grâce au tag baseline `v0.0.0`.
Le commit du PR de ce CI/CD overhaul DOIT commencer par `feat:` pour que la première release soit `v0.1.0`.

## Verification

**Commands:**
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/cd.yml')); print('cd.yml OK')"` -- expected: `cd.yml OK`
- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('ci.yml OK')"` -- expected: `ci.yml OK`
- `python3 -c "import yaml; yaml.safe_load(open('docker-compose.yml')); print('docker-compose OK')"` -- expected: `docker-compose OK`
- `python3 -c "import yaml; yaml.safe_load(open('docker-compose.override.yml')); print('override OK')"` -- expected: `override OK`
- `node -p "require('./package.json').version"` -- expected: `0.0.0`
- `grep "DASHBOARD_VERSION" .env.example` -- expected: ligne trouvée

**Manual checks (if no CLI):**
- `cd.yml` : vérifier que `permissions.packages: write` est présent et que le step "Calculer la version" contient le fallback `|| echo "v0.0.0"`
- `ci.yml` : vérifier que `if: github.event_name == 'push'` est sur le job `e2e` uniquement
- `docker-compose.yml` : aucune directive `build:` — uniquement des `image:` GHCR
- `docker-compose.override.yml` : les deux services `backend` et `frontend` ont `build:` et `image: ""`

## Spec Change Log

### 2026-05-22 — loopback #1 (specLoopIteration 2) — bad_spec findings from review

**Triggering findings (review iteration 1):**
1. `chore: release` commit pushes to `main` sans `[skip ci]` → boucle infinie de releases
2. `env_file: .env` (racine) dans docker-compose.yml mais le step E2E CI crée `backend/.env` → backend sans credentials en CI
3. Template §2 basé sur Story 1.2 uniquement → service `backup:` (Story 1.7) supprimé silencieusement

**Amendements appliqués (sections hors `<frozen-after-approval>`):**
- §1 cd.yml : message de commit → `"chore: release ${{ steps.version.outputs.tag }} [skip ci]"`
- §2 docker-compose.yml : service `backup:` restauré ; `start_period: 30s` ajouté au frontend healthcheck
- Tasks ci.yml : ajout de la mise à jour du path env file (`backend/.env` → `.env`) dans le step E2E

**KEEP (éléments corrects à préserver lors de la re-dérivation) :**
- Toute la structure de cd.yml (version calc, tag, GHCR login, build-push x2, gh release)
- Condition `if: github.event_name == 'push'` dans ci.yml
- Images GHCR, `env_file: .env`, services db/backend/frontend dans docker-compose.yml
- Tout docker-compose.override.yml tel quel
- package.json et .env.example tels quels

**Known-bad state à éviter :** commit de release sans `[skip ci]` ; backup service absent de docker-compose.yml ; `.env` CI créé dans `backend/` au lieu de la racine.

## Suggested Review Order

**Pipeline CD — cœur de la refonte**

- Entry point : workflow complet, de la déclencher à la release finale
  [`cd.yml:1`](../../.github/workflows/cd.yml#L1)

- Calcul de version : fallback v0.0.0, grep CC, appel `npx semver`
  [`cd.yml:33`](../../.github/workflows/cd.yml#L33)

- Commit package.json : `[skip ci]` crucial pour éviter la boucle infinie
  [`cd.yml:57`](../../.github/workflows/cd.yml#L57)

- Création du tag git annoté + push
  [`cd.yml:67`](../../.github/workflows/cd.yml#L67)

- Build & Push backend vers GHCR avec GHA cache
  [`cd.yml:83`](../../.github/workflows/cd.yml#L83)

- Build & Push frontend + GitHub Release auto-générée
  [`cd.yml:95`](../../.github/workflows/cd.yml#L95)

**CI — optimisation E2E**

- Condition `if: push` : E2E skippé sur PRs, actif uniquement au merge
  [`ci.yml:85`](../../.github/workflows/ci.yml#L85)

- `.env` créé à la racine (non plus `backend/.env`) pour coller au `docker-compose.yml`
  [`ci.yml:102`](../../.github/workflows/ci.yml#L102)

**Docker Compose — production (images GHCR)**

- Backend : `build:` → `image:` GHCR, `env_file: .env` (racine)
  [`docker-compose.yml:22`](../../docker-compose.yml#L22)

- Frontend : idem, plus `start_period: 30s` restauré sur le healthcheck
  [`docker-compose.yml:38`](../../docker-compose.yml#L38)

- Service `backup:` de Story 1.7 conservé intact (déjà `image:`, pas de `build:`)
  [`docker-compose.yml:54`](../../docker-compose.yml#L54)

**Docker Compose — dev local (override)**

- Override complet : `build:` + `image: ""` pour les deux services applicatifs
  [`docker-compose.override.yml:1`](../../docker-compose.override.yml#L1)

**Périphériques**

- Version carrier racine : `0.0.0` sera le premier bump de la release pipeline
  [`package.json:1`](../../package.json#L1)

- `DASHBOARD_VERSION=latest` : variable de déploiement à fixer en production
  [`.env.example:21`](../../.env.example#L21)
