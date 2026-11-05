# Sprint Change Proposal — Refonte de la suite de tests E2E
**Date :** 2026-06-01
**Projet :** Dashboard
**Scope :** Minor — implémentation directe par l'agent Développeur
**Statut :** Réalisé

---

## Section 1 — Résumé du problème

Les tests end-to-end Playwright sont dans un état d'instabilité chronique : certains tests passent mais d'autres échouent, et les corrections itératives appliquées en mai 2026 (4 commits `test: update e2e tests`) ont résolu des symptômes sans traiter les causes racines. Le CI/CD reste rouge sur la branche `develop`, ce qui génère un bruit de fond négatif avant d'aborder l'épic 5 (Module Recettes).

**Découverte :** Les problèmes ont été identifiés par analyse statique complète des 7 fichiers de tests et du `global-setup.ts`.

---

## Section 2 — Analyse d'impact

### Impact Épics
Aucun epic fonctionnel n'est affecté. Il s'agit exclusivement d'infrastructure de test.
- Épics 1–4 : `done` — pas de régression de couverture
- Epic 5 : en `backlog` — repart sur une base saine

### Impact Stories
Aucune story existante n'est modifiée. Aucune nouvelle story n'est nécessaire.

### Impact Artefacts
- `playwright.config.ts` : potentiellement mis à jour si un `global-teardown.ts` est ajouté (non retenu — voir Section 3)
- `global-setup.ts` : refonte du seed (changement 1)
- `e2e/tests/links-drag-drop.spec.ts` : aucun changement (couvert par changement 1)
- `e2e/tests/links-icon-picker.spec.ts` : ajout afterEach + fix sélecteur (changement 3)
- `e2e/tests/admin-responsive.spec.ts` : fix afterEach auth (changement 4)

### Impact Technique
4 défauts structurels identifiés :

| ID | Fichier | Défaut | Sévérité |
|----|---------|--------|----------|
| D1 | `global-setup.ts` | Seed vérifie uniquement `cats.length < 2`, pas le contenu des catégories | Critique |
| D2 | `links-drag-drop.spec.ts` | Déplacement de lien sans teardown → état corrompu sur runs multiples | Critique |
| D3 | `links-icon-picker.spec.ts` | Catégories créées sans cleanup + sélecteur `nth(0)` non déterministe | Modéré |
| D4 | `admin-responsive.spec.ts` | `afterEach` sans auth → cleanup toujours ignoré (401 silencieux) | Faible |

---

## Section 3 — Approche recommandée

**Option retenue : Ajustement direct (Option 1)**

- Effort : Faible–Moyen
- Risque : Faible
- Impact timeline : Nul (travail sur infrastructure de test, pas de code applicatif)

**Décisions validées par Manu (mode incrémental) :**
- Changement 1 approuvé : seed global-setup devient idempotent (supprime et recrée les données E2E)
- Changement 2a approuvé : pas de teardown dans drag-drop, on s'appuie sur le seed robuste
- Changement 3 approuvé : afterEach cleanup + ciblage explicite par nom dans icon-picker
- Changement 4 approuvé : fix auth dans afterEach de admin-responsive

**Impact MVP :** Aucun. Les requirements restent inchangés.

---

## Section 4 — Propositions de changements détaillées

### C1 — `e2e/global-setup.ts` : seed idempotent

```
AVANT:
const cats = (await catsRes.json()) as { id: number }[];
if (cats.length < 2) {
  // créer catégories + liens
}

APRÈS:
// Supprimer les catégories E2E existantes (avec leurs liens en cascade)
// puis recréer proprement — état parfaitement connu avant chaque run
const cats = (await catsRes.json()) as { id: number; name: string }[];
const e2eCats = cats.filter(c => c.name === 'E2E Category A' || c.name === 'E2E Category B');
for (const cat of e2eCats) {
  await page.request.delete(`/api/link-categories/${cat.id}`);
}
// Recréer les 2 catégories avec 2 liens chacune (comme avant)
```

**Justification :** Garantit un état de départ identique à chaque run CI et à chaque run local, peu importe ce que les tests précédents ont modifié.

---

### C3 — `e2e/tests/links-icon-picker.spec.ts` : cleanup + sélecteur robuste

```
AVANT (describe 'Sélecteur d'icônes Material'):
// Pas de cleanup

APRÈS:
test.afterEach(async ({ request }) => {
  if (... test créait une catégorie ...) {
    await request.post('/api/auth/login', { data: { username, password } });
    const cats = await (await request.get('/api/link-categories')).json();
    for (const cat of cats.filter(c => c.name === 'Test Icône')) {
      await request.delete(`/api/link-categories/${cat.id}`);
    }
  }
});

// "effacer une icône" : cibler E2E Category A explicitement
AVANT: await page.click('button[aria-label="Modifier la catégorie"]').first();
APRÈS: const catACard = page.locator('app-link-category-card', { hasText: 'E2E Category A' });
       await catACard.locator('button[aria-label="Modifier la catégorie"]').click();
```

---

### C4 — `e2e/tests/admin-responsive.spec.ts` : auth dans afterEach

```
AVANT:
test.afterEach(async ({ request }) => {
  if (!createdEmail) return;
  const usersRes = await request.get('/api/users'); // ← 401

APRÈS:
test.afterEach(async ({ request }) => {
  if (!createdEmail) return;
  await request.post('/api/auth/login', { data: { username: adminEmail, password: adminPassword } });
  const usersRes = await request.get('/api/users'); // ← 200
  ...
  createdEmail = '';
});
```

---

## Section 5 — Plan de handoff

**Scope : Minor** → implémentation directe par l'agent Développeur.

**Responsabilités :**
- Agent Développeur : implémenter C1, C3, C4 dans les fichiers ciblés
- Manu : valider que le CI repasse au vert après merge

**Critères de succès :**
- `npx playwright test` passe en vert sur run local (depuis une instance Docker fraîche)
- `npx playwright test` passe en vert sur run local consécutif (même instance Docker)
- CI/CD GitHub Actions repasse au vert sur la branche `develop`
- Aucun test existant n'est supprimé ni dégradé en couverture
