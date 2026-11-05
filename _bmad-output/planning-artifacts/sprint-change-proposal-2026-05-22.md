# Sprint Change Proposal — 2026-05-22

**Projet :** Dashboard  
**Date :** 2026-05-22  
**Auteur :** Manu (via Correct Course workflow)  
**Statut :** Approuvé  
**Scope :** Modéré — re-implémentation du pipeline CD + ajustements CI

---

## Section 1 — Résumé du problème

### Problème identifié

Le pipeline CD actuel (`.github/workflows/cd.yml`) déploie l'application sur le serveur de production via SSH en exécutant `git pull + docker-compose up -d --build` directement sur la machine cible. Ce comportement ne correspond pas au besoin réel.

### Contexte de découverte

Constaté à la fin de l'Épic 4 (module Liens entièrement terminé), au moment de préparer la première mise en production. Le déploiement SSH était noté comme fragile dans `deferred-work.md` depuis la story 4.2 : *"Rebuild des images sur le serveur prod — fragile (outils de build sur prod, build échoué = downtime). À revoir si le projet évolue vers une registry."*

### Problèmes concrets avec l'approche SSH

1. **Outils de build sur le serveur de production** — Node, npm, angular-cli doivent être installés sur la prod
2. **Build échoué = downtime** — si la compilation échoue à mi-chemin, le serveur est dans un état partiel
3. **Non portable** — impossible d'installer depuis une autre machine sans cloner le repo
4. **Pas de versioning** — aucun historique des images déployées, pas de rollback possible
5. **4 secrets GitHub à maintenir** — SSH_HOST, SSH_USERNAME, SSH_PRIVATE_KEY, DEPLOY_PATH

### Décisions prises lors de cette session

| Décision | Choix retenu | Alternatif écarté |
|---|---|---|
| Registre Docker | **GHCR** (GitHub Container Registry) | Docker Hub |
| Déclencheur CD | **Push dans main** (automatique au merge) | workflow_dispatch manuel |
| Type de bump | **Conventional Commits** (fix:/feat:/feat!:) | Labels PR / toujours patch |
| Qualité code CI | **ESLint + Jest coverage** (existant) | SonarCloud |
| Fichier version | **Root package.json** (`"version"`) | Fichier VERSION plain text |
| SNAPSHOT équivalent | **Aucun** — tags git suffisent pour une app Docker | Suffix -dev sur develop |
| Sync develop post-release | **Aucun** — tags git sont globaux | Merge main → develop automatique |

---

## Section 2 — Analyse d'impact

### Impact sur les épics

| Épic | Statut | Impact |
|---|---|---|
| Épic 1 — Infrastructure & CI/CD | done | ⚠️ Story 1.3 nécessite une re-implémentation du CD. Story 1.2 : docker-compose.yml production mis à jour. |
| Épics 2–4 | done | ✅ Aucun impact |
| Épics 5–7 | backlog | ✅ Aucun impact — profiteront directement du nouveau CD. Nouvelle convention de commit obligatoire dès l'Épic 5. |

### Impact sur les artefacts

| Artefact | Type de changement |
|---|---|
| `.github/workflows/cd.yml` | 🔴 Réécriture complète |
| `.github/workflows/ci.yml` | 🟡 Ajout `if: github.event_name == 'push'` sur le job E2E |
| `docker-compose.yml` | 🟡 Directives `build:` → `image: ghcr.io/...` |
| `docker-compose.override.yml` | 🟡 Récupère les directives `build:` pour le dev local |
| `package.json` (racine) | 🟢 À créer — version carrier (`"version": "0.0.0"`, `"private": true`) |
| `.env.example` | 🟢 Ajouter `DASHBOARD_VERSION=latest` |
| `architecture.md` | 🟡 Section Infrastructure & Déploiement mise à jour |
| `epics.md` | 🟡 Story 1.3 AC3 mis à jour |
| `implementation-artifacts/1-3-*.md` | 🔴 AC + tâches + dev notes mis à jour |
| `deferred-work.md` | 🟢 2 items résolus supprimés |

### Impact technique

- **Suppression de 4 secrets GitHub** : SSH_HOST, SSH_USERNAME, SSH_PRIVATE_KEY, DEPLOY_PATH
- **Aucun nouveau secret** : le workflow utilise `GITHUB_TOKEN` (automatique)
- **Configuration branch protection** : autoriser `github-actions[bot]` à bypasser la PR rule sur main (une fois, dans GitHub Settings)
- **Convention Conventional Commits** : obligatoire dès l'Épic 5 pour tous les commits

---

## Section 3 — Approche recommandée

### Option retenue : Ajustement direct (Option 1)

**Rationale :**
- Pas de rollback de stories nécessaire — le CI existant reste en place, seul le CD change
- Effort de ré-implémentation estimé à **Medium** (re-écriture cd.yml + ajustements docker-compose + configuration repo)
- Risque **Low** — le nouveau workflow est plus robuste que l'ancien
- L'Epic 4 est terminée, le timing est idéal (avant la première mise en production)
- Le changement est déjà anticipé dans `deferred-work.md` depuis la story 4.2

**Timeline :** 1 sprint technique (≤ 1 story) avant l'Épic 5

---

## Section 4 — Propositions de changements détaillées

### 4.1 Architecture — Section Infrastructure & Déploiement

**Remplacement de la ligne CI/CD dans la table de décisions architecturales :**

```
| CI/CD          | GitFlow + GitHub Actions                              | Qualité enforced automatiquement                              |
| Convention     | Conventional Commits (fix:/feat:/feat!:)               | Obligatoire dès Épic 5 — détermine patch/minor/major          |
| CI (develop)   | Lint + tests + build + E2E                            | Sur chaque push/PR vers develop — E2E uniquement au merge     |
| CD (main)      | Bump package.json → commit → tag vX.Y.Z → build images → push GHCR → GitHub Release | Uniquement au merge dans main |
| Versioning     | Root package.json + git tags (semver)                 | npm version gère le bump ; git tags = source de vérité        |
| Post-release   | Aucun rebase develop automatique                      | Tags git globaux — pas de -SNAPSHOT en JS (app ≠ bibliothèque npm) |
| Registry       | GHCR (ghcr.io/manurobate/dashboard-*)                 | GITHUB_TOKEN natif — zéro secret supplémentaire               |
| Déploiement    | docker compose pull + up (images GHCR)                | Installable sans code source sur le serveur                   |
| Branch protection | github-actions[bot] autorisé à bypasser PR rule main | Config manuelle unique dans GitHub Settings                  |
```

---

### 4.2 epics.md — Story 1.3 AC3

**ANCIEN :**
> *Étant donné qu'une PR est mergée dans `main`, Quand le pipeline CD se déclenche, Alors les images Docker sont buildées et déployées sur le serveur via SSH avec `docker-compose up -d --build`*

**NOUVEAU :**
> *Étant donné qu'une PR est mergée dans `main`, Quand le pipeline CD se déclenche (push sur main), Alors :*
> - *La version dans `package.json` (racine) est incrémentée via `npm version` selon les Conventional Commits depuis le dernier tag (patch/minor/major — par défaut patch si aucun CC)*
> - *Un commit `chore: release vX.Y.Z` est poussé sur `main` par `github-actions[bot]`*
> - *Un tag git `vX.Y.Z` est créé et poussé*
> - *Les images `dashboard-backend` et `dashboard-frontend` sont buildées et publiées sur GHCR avec les tags `:X.Y.Z` et `:latest`*
> - *Une GitHub Release est créée avec changelog auto-généré*
> - *Aucun déploiement SSH — l'installation manuelle se fait via `docker compose pull && docker compose up -d`*

---

### 4.3 Nouveau `.github/workflows/cd.yml`

```yaml
name: Release

on:
  push:
    branches: [main]
    # Un merge de PR dans main déclenche l'événement "push" côté GitHub Actions.
    # La branch protection garantit que seuls les merges de PR depuis develop arrivent ici.

concurrency:
  group: release-main
  cancel-in-progress: false   # jamais annuler une release en cours

permissions:
  contents: write   # push commit + tag + GitHub Release
  packages: write   # push images sur GHCR

jobs:
  release:
    name: Bump · Build · Publish
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0                        # historique complet pour l'analyse des commits
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      # ── 1. Calculer la nouvelle version ─────────────────────────────────────
      - name: Calculer la version
        id: version
        run: |
          LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
          CURRENT=$(echo "$LAST_TAG" | sed 's/^v//')

          # Analyser les commits depuis le dernier tag
          COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%s")

          if echo "$COMMITS" | grep -qE "^feat!:|BREAKING CHANGE"; then
            BUMP="major"
          elif echo "$COMMITS" | grep -qE "^feat:"; then
            BUMP="minor"
          else
            BUMP="patch"   # fix:, chore:, refactor:, docs: ou pas de CC → patch par défaut
          fi

          NEW=$(npx --yes semver -i "$BUMP" "$CURRENT")
          echo "version=$NEW"    >> $GITHUB_OUTPUT
          echo "tag=v$NEW"       >> $GITHUB_OUTPUT
          echo "bump=$BUMP"      >> $GITHUB_OUTPUT
          echo "📦 $CURRENT → $NEW ($BUMP)"

      # ── 2. Bumper package.json et committer sur main ─────────────────────────
      - name: Bumper package.json
        run: |
          git config user.name  "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          npm version ${{ steps.version.outputs.version }} --no-git-tag-version
          git add package.json
          git commit -m "chore: release ${{ steps.version.outputs.tag }}"
          git push

      # ── 3. Créer le tag git ──────────────────────────────────────────────────
      - name: Créer le tag
        run: |
          git tag ${{ steps.version.outputs.tag }} -m "Release ${{ steps.version.outputs.tag }}"
          git push origin ${{ steps.version.outputs.tag }}

      # ── 4. Login GHCR ────────────────────────────────────────────────────────
      - name: Login GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - uses: docker/setup-buildx-action@v3

      # ── 5. Build & Push backend ──────────────────────────────────────────────
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

      # ── 6. Build & Push frontend ─────────────────────────────────────────────
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

      # ── 7. GitHub Release ────────────────────────────────────────────────────
      - name: Créer la GitHub Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh release create ${{ steps.version.outputs.tag }} \
            --generate-notes \
            --title "Dashboard ${{ steps.version.outputs.tag }}" \
            --latest
```

---

### 4.4 Modification `.github/workflows/ci.yml`

**Seul changement — ajout d'une condition sur le job E2E :**

```yaml
# AVANT
e2e:
  name: E2E — Playwright (Chromium)
  runs-on: ubuntu-latest
  needs: [frontend, backend]

# APRÈS
e2e:
  name: E2E — Playwright (Chromium)
  runs-on: ubuntu-latest
  needs: [frontend, backend]
  # E2E uniquement au merge dans develop (push), pas sur les PRs de feature
  if: github.event_name == 'push'
```

**Comportement résultant :**

| Événement | Lint + tests | Build | E2E |
|---|---|---|---|
| PR `feature/*` → `develop` | ✅ | ✅ | ❌ skip |
| Merge (push) dans `develop` | ✅ | ✅ | ✅ |
| Merge (push) dans `main` | ❌ (ci.yml ne couvre pas main) | ❌ | ❌ |

---

### 4.5 Modifications `docker-compose.yml` (production)

**Pattern de changement — remplacer `build:` par `image:` GHCR :**

```yaml
# AVANT (exemple)
services:
  backend:
    build: ./backend
  frontend:
    build: ./frontend

# APRÈS
services:
  backend:
    image: ghcr.io/manurobate/dashboard-backend:${DASHBOARD_VERSION:-latest}
  frontend:
    image: ghcr.io/manurobate/dashboard-frontend:${DASHBOARD_VERSION:-latest}
```

**Ajout dans `.env.example` :**
```bash
DASHBOARD_VERSION=latest
```

**Workflow de mise à jour sur le serveur :**
```bash
docker compose pull          # récupère les nouvelles images
docker compose up -d         # redémarre avec les nouvelles images
```

---

### 4.6 Modifications `docker-compose.override.yml` (dev local)

**Récupère les directives `build:` pour le dev local :**

```yaml
services:
  backend:
    build: ./backend
    image: ""    # annule l'image GHCR en dev
  frontend:
    build: ./frontend
    image: ""
```

---

### 4.7 Création `package.json` (racine)

```json
{
  "name": "dashboard",
  "version": "0.0.0",
  "private": true,
  "description": "Dashboard personnel auto-hébergé — version carrier pour le pipeline CD"
}
```

*Note : `"version": "0.0.0"` sera remplacé par `"version": "0.1.0"` lors du premier merge dans main.*

---

### 4.8 Mise à jour `implementation-artifacts/1-3-*.md`

**Tâches à ajouter / remplacer :**

- **T2 remplacé** : Réécriture complète de `.github/workflows/cd.yml` (voir 4.3)
- **T3bis ajouté** : Optimisation `ci.yml` — `if: github.event_name == 'push'` sur le job E2E
- **T5 ajouté** : Checklist de préparation au premier déploiement :
  - [ ] Créer `package.json` à la racine (`"version": "0.0.0"`, `"private": true`)
  - [ ] Modifier `docker-compose.yml` — remplacer `build:` par `image: ghcr.io/...`
  - [ ] Modifier `docker-compose.override.yml` — récupérer les directives `build:` pour le dev local
  - [ ] Ajouter `DASHBOARD_VERSION=latest` dans `.env.example`
  - [ ] Configurer branch protection `main` : autoriser `github-actions[bot]` à bypasser PR rule (GitHub Settings → Branches → main → Allow specified actors to bypass…)
  - [ ] Supprimer les secrets GitHub obsolètes : `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY`, `DEPLOY_PATH`
  - [ ] Créer le tag de baseline : `git checkout main && git tag v0.0.0 && git push origin v0.0.0`
  - [ ] Nommer le commit du PR avec `feat:` pour que la première release soit `v0.1.0`
  - [ ] Vérifier que le premier merge déclenche bien la création de `v0.1.0` sur GHCR

**Dev notes à ajouter :**

```
### Convention Conventional Commits — obligatoire dès l'Épic 5

Type de commit → type de bump :
  fix:      → patch (1.0.x)
  feat:     → minor (1.x.0)
  feat!:    → major (x.0.0)
  BREAKING CHANGE: (dans le corps) → major
  chore:, docs:, refactor:, test:  → patch par défaut (aucun CC releasable)

Les commits des Épics 1–4 (format "feat Liens :", "corr :") sont ignorés
dans le calcul du bump — le tag v0.0.0 sert de baseline.

Premier déploiement : tag v0.0.0 créé manuellement sur main + commit "feat:" dans
le PR → première release automatique v0.1.0.
```

---

### 4.9 Nettoyage `deferred-work.md`

**Supprimer les 2 items suivants (résolus par ce Correct Course) :**

1. Section "Deferred from: code review de 1-3" : item *"Pas de mécanisme de rollback dans le CD"*
2. Section "Deferred from: story 4-2" : item *"Rebuild des images sur le serveur prod"*

---

## Section 5 — Plan de handoff

### Classification du scope

**Scope : Modéré** — re-implémentation d'un pipeline existant + ajustements docker-compose + convention de commit.

### Handoff : Agent Developer

Ce changement est directement implémentable par l'agent Developer.

**Ordre d'implémentation recommandé :**

1. Créer `package.json` racine
2. Mettre à jour `docker-compose.yml` et `docker-compose.override.yml`
3. Réécrire `cd.yml`
4. Modifier `ci.yml` (ajout condition E2E)
5. Mettre à jour `.env.example`
6. Mettre à jour les artefacts de planification (`architecture.md`, `epics.md`, `1-3-*.md`, `deferred-work.md`)
7. Créer le tag `v0.0.0` sur main
8. Supprimer les secrets GitHub obsolètes (action manuelle)
9. Configurer branch protection pour `github-actions[bot]` (action manuelle)

**Actions manuelles requises (hors code) :**

| Action | Où | Quand |
|---|---|---|
| Créer tag `v0.0.0` sur main | Terminal / GitHub UI | Avant le premier merge |
| Autoriser `github-actions[bot]` sur branch protection main | GitHub Settings → Branches | Avant le premier merge |
| Supprimer secrets SSH obsolètes | GitHub Settings → Secrets | Après validation du nouveau CD |

### Critères de succès

- [ ] Le merge d'une PR develop → main crée la GitHub Release `v0.1.0`
- [ ] Les images `ghcr.io/manurobate/dashboard-backend:0.1.0` et `ghcr.io/manurobate/dashboard-frontend:0.1.0` sont visibles dans l'onglet Packages du repo GitHub
- [ ] `docker compose pull && docker compose up -d` fonctionne sur le serveur de production sans nécessiter le code source
- [ ] Les E2E ne tournent plus sur les PRs de feature (uniquement au merge dans develop)
- [ ] Aucun des 4 secrets SSH n'est utilisé dans les workflows

---

## Résumé exécutif

| | |
|---|---|
| **Problème adressé** | Pipeline CD SSH fragile remplacé par un modèle GHCR + semantic versioning |
| **Scope** | Modéré |
| **Artefacts modifiés** | cd.yml, ci.yml, docker-compose.yml, docker-compose.override.yml, package.json (racine), .env.example, architecture.md, epics.md, 1-3-*.md, deferred-work.md |
| **Actions manuelles** | Tag v0.0.0, branch protection github-actions[bot], suppression secrets SSH |
| **Handoff** | Developer agent |
| **Première release attendue** | v0.1.0 |
| **Convention adoptée** | Conventional Commits (fix:/feat:/feat!:) obligatoire dès l'Épic 5 |
