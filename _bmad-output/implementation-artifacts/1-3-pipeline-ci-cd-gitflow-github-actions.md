# Story 1.3 : Pipeline CI/CD (GitFlow + GitHub Actions)

Status: done

## Story

En tant que développeur,
Je veux des vérifications automatisées (lint + tests + build) sur chaque PR et un déploiement automatique sur merge dans `main`,
Afin que la qualité du code soit enforced et les déploiements automatisés.

## Acceptance Criteria

1. **Étant donné** qu'une PR est ouverte vers `develop` depuis une branche `feature/*`, **quand** GitHub Actions CI s'exécute, **alors** il lance en séquence : lint ESLint/Prettier (backend), vérification Prettier (frontend), tests Vitest (frontend via `ng test`), tests Jest (backend), build Angular

2. **Étant donné** qu'un test ou le build échoue, **quand** le CI se termine, **alors** la PR est bloquée avec le statut d'échec et un message d'erreur descriptif

3. **Étant donné** qu'une PR est mergée dans `main`, **quand** le pipeline CD se déclenche (push sur main), **alors** :
   - La version dans `package.json` (racine) est incrémentée via `npm version` selon les Conventional Commits depuis le dernier tag (`fix:` → patch, `feat:` → minor, `feat!:` → major ; défaut patch si aucun CC)
   - Un commit `chore: release vX.Y.Z` est poussé sur `main` par `github-actions[bot]`
   - Un tag git `vX.Y.Z` est créé et poussé
   - Les images `dashboard-backend` et `dashboard-frontend` sont buildées et publiées sur GHCR avec les tags `:X.Y.Z` et `:latest`
   - Une GitHub Release est créée avec changelog auto-généré
   - **Aucun déploiement SSH** — l'installation manuelle se fait via `docker compose pull && docker compose up -d`

## Tasks / Subtasks

- [x] **T1 — Créer `.github/workflows/ci.yml`** (AC: #1, #2)
  - [x] Trigger : `pull_request` vers `develop` (branches `feature/*`)
  - [x] Job `lint-and-test-backend` : `npm ci`, `npm run lint`, `npm test -- --forceExit`
  - [x] Job `check-and-test-frontend` : `npm ci`, `npx prettier --check "src/**/*.{ts,html,scss}"`, `ng test --watch=false`, `npm run build`
  - [x] Cache `node_modules` backend et frontend via `actions/cache` ou `setup-node` avec `cache: 'npm'`
  - [x] Utiliser `node-version: '22'` (cohérent avec `node:22-alpine` des Dockerfiles)

- [x] **T2 — Réécrire `.github/workflows/cd.yml`** (AC: #3) *(Sprint Change Proposal 2026-05-22)*
  - [x] Trigger : `push: branches: [main]` avec commentaire explicatif (merge PR = push)
  - [x] Permissions : `contents: write` + `packages: write`
  - [x] Step "Calculer la version" : `git describe` → analyse CC → `npx semver` → fallback patch
  - [x] Step "Bumper package.json" : `npm version --no-git-tag-version` + `git commit` + `git push`
  - [x] Step "Créer le tag git" : `git tag vX.Y.Z` + `git push --tags`
  - [x] Step "Login GHCR" : `docker/login-action@v3` avec `GITHUB_TOKEN`
  - [x] Step "Build & Push backend" : `docker/build-push-action@v5`, tags `:X.Y.Z` + `:latest`, cache GHA
  - [x] Step "Build & Push frontend" : `docker/build-push-action@v5`, tags `:X.Y.Z` + `:latest`, cache GHA
  - [x] Step "GitHub Release" : `gh release create --generate-notes --latest`
  - [x] Secrets SSH obsolètes retirés : `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `DEPLOY_PATH`

- [x] **T3bis — Optimiser `.github/workflows/ci.yml`** *(Sprint Change Proposal 2026-05-22)*
  - [x] Ajouter `if: github.event_name == 'push'` sur le job `e2e`
  - [x] Comportement : E2E skippé sur PR de feature, lancé uniquement au merge dans develop

- [x] **T3 — Créer `.github/` et structure répertoires**
  - [x] Créer `.github/workflows/` (répertoire inexistant — aucun workflow GitHub Actions en place)

- [x] **T4 — Validation**
  - [x] Valider les deux YAML avec `python3 -c "import yaml; yaml.safe_load(open('ci.yml'))"` ou équivalent
  - [x] Vérifier que `npm run lint` passe sans erreur en local (backend)
  - [x] Vérifier que `npm test -- --forceExit` passe en local (backend)
  - [x] Vérifier que `ng test --watch=false` se termine sans bloquer (frontend — Vitest mode CI)

## Dev Notes

### CRITIQUE : Frontend utilise Vitest, pas Karma

**Les épics mentionnent "tests Karma (frontend)" — c'est INCORRECT pour ce projet.**

Angular 21 avec `@angular/build:unit-test` utilise **Vitest** comme runner de tests (pas Karma/Jasmine). Vérifiable dans `frontend/angular.json` :
```json
"test": {
  "builder": "@angular/build:unit-test"
}
```

En CI, la commande correcte est :
```bash
ng test --watch=false
```
Ou équivalent `npm test -- --watch=false` si le script `ng test` est dans `package.json`.

Ne pas chercher de configuration Karma (`karma.conf.js`) — elle n'existe pas. Les fichiers de spec sont dans `src/` avec extension `.spec.ts` (co-localisés).

---

### CRITIQUE : Frontend n'a pas ESLint — uniquement Prettier

Le frontend n'a **pas** `@angular-eslint/schematics` installé. Il n'y a pas de `ng lint` fonctionnel.

**DevDependencies frontend (liste complète) :**
```
@angular/build, @angular/cli, @angular/compiler-cli, jsdom, prettier, typescript, vitest
```

Pour le CI, utiliser uniquement la vérification Prettier :
```bash
npx prettier --check "src/**/*.{ts,html,scss}"
```

**Anti-pattern :** Ne pas tenter `ng lint` ou `npm run lint` dans le frontend — la commande n'existe pas dans `package.json`.

---

### T1 — `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [develop]

jobs:
  backend:
    name: Backend — Lint + Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json

      - name: Installer les dépendances
        run: npm ci

      - name: Lint ESLint + Prettier
        run: npm run lint

      - name: Tests Jest
        run: npm test -- --forceExit

  frontend:
    name: Frontend — Prettier + Tests + Build
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Installer les dépendances
        run: npm ci

      - name: Vérification Prettier
        run: npx prettier --check "src/**/*.{ts,html,scss}"

      - name: Tests Vitest
        run: npx ng test --watch=false

      - name: Build Angular
        run: npm run build
```

**Points critiques :**
- `--forceExit` sur Jest backend : évite que le process reste bloqué si un test ne nettoie pas ses ressources async (NestJS avec des connexions TypeORM peut bloquer)
- Jobs `backend` et `frontend` en parallèle (pas de dépendance entre eux) → CI plus rapide
- `cache-dependency-path` séparé par job — chaque job cache son propre `node_modules`
- `working-directory` dans `defaults.run` évite de répéter `working-directory:` sur chaque step
- Node 22 = cohérent avec `node:22-alpine` dans les Dockerfiles

---

### T2 — `.github/workflows/cd.yml`

```yaml
name: CD

on:
  push:
    branches: [main]

# Secrets requis dans les paramètres du dépôt GitHub :
# SSH_HOST        : adresse IP ou hostname du serveur
# SSH_USERNAME    : utilisateur SSH (ex: deploy, ubuntu, manu)
# SSH_PRIVATE_KEY : clé privée RSA/Ed25519 (contenu complet du fichier id_rsa ou id_ed25519)
# DEPLOY_PATH     : chemin absolu du répertoire du projet sur le serveur (ex: /home/manu/dashboard)

jobs:
  deploy:
    name: Déploiement SSH
    runs-on: ubuntu-latest

    steps:
      - name: Configurer la clé SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_deploy
          chmod 600 ~/.ssh/id_deploy
          ssh-keyscan -H ${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts

      - name: Déployer sur le serveur
        run: |
          ssh -i ~/.ssh/id_deploy ${{ secrets.SSH_USERNAME }}@${{ secrets.SSH_HOST }} \
            "cd ${{ secrets.DEPLOY_PATH }} && git pull origin main && docker-compose up -d --build"
```

**Points critiques :**
- `git pull origin main` sur le serveur récupère le dernier code avant le rebuild
- `docker-compose up -d --build` : `--build` force le rebuild des images, `-d` en detached mode
- La clé SSH doit être configurée avec `chmod 600` avant usage — sinon OpenSSH refuse de l'utiliser
- `ssh-keyscan` pré-peuple `known_hosts` pour éviter le prompt interactif "fingerprint inconnu"
- **Pas d'`actions/checkout@v4`** dans le CD — le checkout se fait directement sur le serveur via `git pull`

**Secrets à configurer dans GitHub → Settings → Secrets → Actions :**

| Secret | Exemple de valeur | Usage |
|--------|------------------|-------|
| `SSH_HOST` | `192.168.1.100` ou `mon-serveur.example.com` | Adresse du serveur cible |
| `SSH_USERNAME` | `manu` ou `ubuntu` | Utilisateur SSH |
| `SSH_PRIVATE_KEY` | Contenu de `~/.ssh/id_ed25519` (clé privée) | Authentification SSH |
| `DEPLOY_PATH` | `/home/manu/dashboard` | Répertoire du projet sur le serveur |

**Pré-requis sur le serveur :** la clé publique correspondante doit être dans `~/.ssh/authorized_keys` de l'utilisateur SSH.

---

### T3 — Structure des répertoires

Le répertoire `.github/` n'existe pas encore dans le projet. L'arborescence attendue après cette story :

```
dashboard/
├── .github/
│   └── workflows/
│       ├── ci.yml     # lint + tests + build (PR vers develop)
│       └── cd.yml     # déploiement SSH (merge dans main)
```

**Référence architecture.md :**
```
dashboard/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
```

---

### T4 — Validation locale

Avant de pousser, valider les YAML localement :
```bash
# Valider ci.yml
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml')); print('ci.yml OK')"

# Valider cd.yml
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/cd.yml')); print('cd.yml OK')"

# Vérifier lint backend
cd backend && npm run lint

# Vérifier tests backend (doit se terminer proprement)
cd backend && npm test -- --forceExit

# Vérifier prettier frontend
cd frontend && npx prettier --check "src/**/*.{ts,html,scss}"

# Vérifier build Angular
cd frontend && npm run build
```

---

### Learnings des stories précédentes

**De Story 1.1 :**
- `provideZonelessChangeDetection()` (sans `Experimental`) est l'API stabilisée en Angular 21
- `Logger` NestJS obligatoire — jamais `console.log`
- `bootstrap().catch(err => { logger.error(err); process.exit(1); })` — le crash silencieux sans `.catch()` est un blocker

**De Story 1.2 :**
- `synchronize: false` TypeORM est absolu — ne jamais changer même en dev
- Les `.dockerignore` existent pour backend et frontend — les rebuilds CI ne doivent pas inclure les `node_modules` locaux ou `.env`
- Healthchecks : `start_period: 30s` nécessaire pour MariaDB (initialisation lente au premier démarrage)
- `DB_ROOT_PASSWORD` est exposé dans l'environnement du backend via `env_file: .env` — décision différée (D1) non résolue

---

### Fichiers existants — ne pas modifier

- `backend/eslint.config.mjs` — config ESLint flat format (NestJS 11 default) — ne pas convertir en `.eslintrc.js`
- `backend/package.json` — script `lint` existant : `eslint "{src,apps,libs,test}/**/*.ts" --fix` — utiliser tel quel
- `frontend/package.json` — script `test` existant : `ng test` — utiliser tel quel
- `docker-compose.yml` — production (Story 1.2) — ne pas modifier
- `docker-compose.override.yml` — dev overrides (Story 1.2) — ne pas modifier

---

### Scope de cette story

**In scope :**
- `.github/workflows/ci.yml` (créer)
- `.github/workflows/cd.yml` (créer)
- `.github/` répertoire (créer)

**Hors scope (stories suivantes) :**
- Design system Angular Material → Story 1.4
- Navigation responsive → Story 1.5
- PWA `ngsw-config.json` → Story 1.6
- Script `scripts/backup.sh` → Story 1.7
- Entités TypeORM et migrations → Story 2.1

---

### Références

- [Source: architecture.md#Infrastructure & Déploiement] — GitFlow + GitHub Actions, CI/CD patterns
- [Source: architecture.md#Arborescence Complète du Projet] — `.github/workflows/ci.yml` et `cd.yml`
- [Source: epics.md#Story 1.3] — acceptance criteria complets
- [Source: story 1-2] — patterns d'implémentation établis, learnings Docker

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Prettier check frontend échoué en T4 : 3 fichiers source (`app.html`, `app.ts`, `main.ts`) avaient un formatage non conforme. Corrigé avec `npx prettier --write` avant que le CI ne soit poussé (évite un CI cassé dès le premier déploiement).

### Completion Notes List

- T3 : Répertoire `.github/workflows/` créé (inexistant auparavant).
- T1 : `ci.yml` créé — jobs `backend` et `frontend` en parallèle, Node 22, cache npm par job, `--forceExit` sur Jest, Vitest via `npx ng test --watch=false`.
- T2 : `cd.yml` créé — déploiement SSH avec clé privée, `ssh-keyscan`, `git pull + docker-compose up -d --build`. Secrets requis documentés en commentaires YAML.
- T4 : Tous les checks locaux passent : YAML valides (python3 yaml), lint backend ✅, tests backend 2/2 ✅, Prettier frontend ✅ (après correction formatage 3 fichiers), Vitest frontend 2/2 ✅, build Angular ✅.
- Correction bonus : formatage Prettier des 3 fichiers frontend existants (`app.html`, `app.ts`, `main.ts`) pour éviter un CI immédiatement cassé.

### File List

- `.github/workflows/ci.yml` (créé)
- `.github/workflows/cd.yml` (créé)
- `frontend/src/app/app.html` (formatage Prettier corrigé)
- `frontend/src/app/app.ts` (formatage Prettier corrigé)
- `frontend/src/main.ts` (formatage Prettier corrigé)

### Review Findings

**Revue du 2026-04-23 — 3 couches (Blind Hunter · Edge Case Hunter · Acceptance Auditor)**
Résumé : 4 décisions requises · 8 patches · 6 différés · 6 rejetés

#### Décisions requises

- [x] [Review][Decision] AC1 — Jobs CI parallèles vs spec "en séquence" — **Résolu : parallèle conservé** (déviation assumée, Dev Notes justifient le choix, pas de dépendance fonctionnelle entre backend et frontend)
- [x] [Review][Decision] Pas de gate CI pour push direct sur `main` — **Résolu : branch protection GitHub à activer** (Settings → Branches → main → Require status checks to pass) — action manuelle hors code
- [x] [Review][Decision] `ssh-keyscan` sans vérification d'empreinte (TOFU + DNS) — **Résolu : conservé tel quel** (projet personnel, risque accepté)
- [x] [Review][Decision] `docker-compose` vs `docker compose` V2 — **Résolu : `docker-compose` conservé** (V1 installé sur le serveur cible)

#### Patches

- [x] [Review][Patch] Trigger CI ajouté pour push direct sur `develop` — `push: branches: [develop]` ajouté [.github/workflows/ci.yml:7] — **appliqué**
- [x] [Review][Patch] Clé SSH : `echo` remplacé par `printf '%s'` — supprime le trailing newline [.github/workflows/cd.yml:39] — **appliqué**
- [x] [Review][Patch] Groupe `concurrency:` ajouté sur CI (`cancel-in-progress: true`) et CD (`cancel-in-progress: false`) [.github/workflows/ci.yml:9-11 + cd.yml:12-14] — **appliqué**
- [x] [Review][Patch] Validation des secrets CD ajoutée — step `Valider les secrets requis` avec `::error::` descriptif [.github/workflows/cd.yml:23-37] — **appliqué**
- [x] [Review][Patch] `git pull --ff-only` — échoue proprement si merge requis [.github/workflows/cd.yml:54] — **appliqué**
- [x] [Review][Patch] Secrets CD passés via `env:` — `$DEPLOY_PATH` protégé par quotes simples dans la commande distante [.github/workflows/cd.yml:48-55] — **appliqué**
- [x] [Review][Patch] Variables d'environnement de test ajoutées au job backend CI — toutes les vars Joi requises présentes (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET) [.github/workflows/ci.yml:20-28] — **appliqué**
- [x] [Review][Patch] Bloc `permissions: contents: read` ajouté aux deux workflows [.github/workflows/ci.yml:14 + cd.yml:16] — **appliqué**

#### Différés

- [x] [Review][Defer] Pas de mécanisme de rollback dans le CD [.github/workflows/cd.yml] — deferred, pre-existing
- [x] [Review][Defer] `--forceExit` masque des tests qui restent bloqués — comportement intentionnel documenté dans les Dev Notes (NestJS + TypeORM)
- [x] [Review][Defer] Liens externes sans `rel="noreferrer"` dans `app.html` — deferred, pre-existing, hors scope
- [x] [Review][Defer] Gestion erreur bootstrap (`console.error`) insuffisante en production [frontend/src/main.ts] — deferred, pre-existing
- [x] [Review][Defer] Swagger conditionné à `process.env.NODE_ENV` en contournant le ConfigService [backend/src/main.ts] — deferred, pre-existing
- [x] [Review][Defer] Rebuild des images sur le serveur prod au lieu d'un pull depuis un registry — **RÉSOLU par Sprint Change Proposal 2026-05-22** (passage à GHCR)

---

### T5 — Checklist première release (actions manuelles requises)

> *Ajouté par Sprint Change Proposal 2026-05-22*

- [ ] Créer `package.json` à la racine (`"version": "0.0.0"`, `"private": true`) — version carrier pour le CD
- [ ] Modifier `docker-compose.yml` : services `backend` et `frontend` utilisent `image: ghcr.io/manurobate/dashboard-*:${DASHBOARD_VERSION:-latest}` (plus de `build:`)
- [ ] Modifier `docker-compose.override.yml` : récupérer les directives `build:` pour le dev local + `image: ""`
- [ ] Ajouter `DASHBOARD_VERSION=latest` dans `.env.example`
- [ ] **Action manuelle GitHub** — Configurer branch protection `main` : autoriser `github-actions[bot]` à bypasser la PR rule → GitHub Settings → Branches → main → *Allow specified actors to bypass required pull requests* → ajouter `github-actions[bot]`
- [ ] **Action manuelle GitHub** — Supprimer les secrets GitHub obsolètes : `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `DEPLOY_PATH`
- [ ] **Action manuelle git** — Créer le tag de baseline : `git checkout main && git tag v0.0.0 && git push origin v0.0.0`
- [ ] Nommer le commit du PR de ce CI/CD overhaul avec `feat:` pour que la première release soit `v0.1.0`
- [ ] Vérifier que le premier merge develop→main déclenche la release `v0.1.0` et publie les images sur GHCR

---

### Dev Notes — Convention Conventional Commits

> *Obligatoire dès l'Épic 5*

```
fix:      → bump patch (1.0.x)
feat:     → bump minor (1.x.0)
feat!:    → bump major (x.0.0)
BREAKING CHANGE: (dans le corps du commit) → major
chore:, docs:, refactor:, test:, style:    → patch par défaut (aucun CC releasable)
```

**Analyse :** le CD analyse `git log "${LAST_TAG}..HEAD"` — TOUS les commits depuis le dernier tag, pas seulement le message de la PR merge. Un seul `feat:` dans l'historique suffit pour un bump minor.

**Commits antérieurs à l'adoption (Épics 1–4) :** ignorés grâce au tag baseline `v0.0.0`. Le calcul commence à partir de ce tag.

**Première release :** tag `v0.0.0` créé manuellement sur `main` + au moins un commit `feat:` dans le PR → release automatique `v0.1.0`.

**Merge strategy :** avec "Merge commit" (standard GitFlow), tous les commits de la branche feature sont préservés sur main. Avec "Squash and merge", seul le message du squash est analysé (= titre de la PR).

## Change Log

- 2026-04-22 : Story 1.3 créée — pipeline CI/CD GitFlow + GitHub Actions prête pour implémentation.
- 2026-04-22 : Story 1.3 implémentée — création de `.github/workflows/ci.yml` (lint+tests+build sur PR→develop) et `cd.yml` (déploiement SSH sur push→main). Correction Prettier sur 3 fichiers frontend. Tous les checks locaux passent. Statut : review.
- 2026-04-23 : Code review 3 couches (Blind Hunter · Edge Case Hunter · Acceptance Auditor) — 4 décisions résolues, 8 patches appliqués, 6 différés. Principaux correctifs : trigger push→develop ajouté, printf '%s' pour clé SSH, concurrency groups, validation secrets, git pull --ff-only, env vars test backend, permissions: read. Statut : done.
- 2026-05-22 : Sprint Change Proposal — remplacement CD SSH par pipeline GHCR + semantic versioning. T2 réécrit (release workflow), T3bis ajouté (E2E condition push), T5 ajouté (checklist première release), Dev Notes CC ajoutées. `docker-compose.yml` et `docker-compose.override.yml` créés (étaient vides). `package.json` racine créé. `architecture.md` et `epics.md` mis à jour.
