# Sprint Change Proposal — Tests E2E Playwright

**Date :** 2026-05-03
**Auteur :** Manu
**Statut :** Approuvé

---

## Section 1 — Résumé du problème

**Déclencheur :** À la rétrospective des Epics 1 & 2, Manu a identifié que plusieurs bugs simples (visuels, d'intégration frontend↔backend, et fonctionnels) avaient été détectés manuellement au lieu d'être capturés automatiquement.

**Contexte :** Les artefacts actuels ne prévoient que des tests unitaires (Jest backend, Karma/Jasmine frontend) dans le CI. Aucune stratégie E2E n'a été définie — c'est un gap dans les exigences originales.

**Problème :** Sans tests E2E, l'agent dev ne peut pas détecter les régressions d'intégration, les comportements UI inattendus, ni les bugs fonctionnels de bout-en-bout. Manu est le seul filet de sécurité — coûteux et peu fiable.

---

## Section 2 — Analyse d'impact

- **Epic 2 (done) :** Pas de rétro-application — rollback injustifié
- **Epic 3 (backlog) :** Story `3-0` ajoutée (setup Playwright) — première story à implémenter
- **Epics 4–7 (backlog) :** Chaque story devra embarquer ses scénarios E2E dans le template
- **PRD :** Aucune modification (niveau trop haut)
- **`architecture.md` :** 4 zones mises à jour (stack de test, CI/CD, structure répertoires, anti-patterns)
- **`epics.md` :** Story `3-0` ajoutée + exigence transversale E2E dans Additional Requirements
- **`sprint-status.yaml` :** Entrée `3-0` ajoutée

---

## Section 3 — Approche retenue : Direct Adjustment

**Outil : Playwright** (`@playwright/test`)
- Support natif Angular 21 zoneless
- Tests UI + API request dans le même test
- Headless, rapide, CI-friendly (Docker-compatible)
- Cypress écarté : plus lourd, moins adapté au setup Docker/self-hosted

**Quand écrire les tests :** pendant le dev de la story. Le template de story définit les *scénarios* à couvrir — l'agent dev les implémente en Playwright.

| Critère | Valeur |
|---------|--------|
| Effort | Faible |
| Risque | Faible |
| Impact timeline | Minimal (+1 story de setup avant Epic 3) |
| Impact MVP | Aucun |

---

## Section 4 — Propositions de changement détaillées

### 4.1 — `epics.md`

**Additional Requirements — ligne ajoutée après `Conventions obligatoires` :**

```
- Tests E2E : Playwright (`@playwright/test`) — dossier `e2e/` à la racine du monorepo.
  Chaque story (Epic 3 et suivantes) embarque une section `### Scénarios E2E` dans son
  fichier story ; l'agent dev implémente les tests Playwright correspondants dans le même
  ticket. Couverture minimale : les critères d'acceptation fonctionnels de la story.
```

**Epic 3 — story `3-0` insérée avant `3-1`** (voir contenu complet dans `epics.md`)

---

### 4.2 — `architecture.md`

- Stack de test frontend : `Karma + Jasmine` → `Tests unitaires : Karma + Jasmine` + `Tests E2E : Playwright`
- CI/CD : ajout de l'étape `e2e` (headless, post-build) dans la séquence `feature/* → develop`
- Anti-patterns : précision sur la portée de la règle de co-localisation + exception `e2e/`
- Structure répertoires : ajout du bloc `e2e/` à la racine

---

### 4.3 — `sprint-status.yaml`

Entrée `3-0-setup-tests-e2e-playwright: backlog` ajoutée avant `3-1`.

---

## Section 5 — Classification et handoff

**Scope : Minor** — implémentation directe par l'agent dev.

**Responsabilités :**
- Agent dev : story `3-0` (install Playwright, `playwright.config.ts`, smoke test connexion, intégration CI), puis section `Scénarios E2E` dans chaque story suivante

**Critère de succès :** `npx playwright test` passe en headless sur `docker-compose up` local et en CI, avec le smoke test de connexion comme test de référence.
