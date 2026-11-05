---
title: 'Page d''accueil Dashboard — renommage route links → dashboard'
type: 'refactor'
created: '2026-05-20'
status: 'done'
baseline_commit: 'fec428a87cc14074f1cd5fd8a96e6fd810a3a485'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La page "Liens" est destinée à devenir la page d'accueil complète du Dashboard, mais la route `/links`, les labels "Liens", et le comportement de la top bar ne reflètent pas cette vocation. Corriger maintenant coûte peu ; attendre que les Epics 5-7 accumulent des références à `/links` coûtera beaucoup plus.

**Approach:** Renommer la route `links` → `dashboard`, mettre à jour tous les labels/redirections/guards concernés, afficher "Dashboard de [name]" dans le h1, masquer nav et menu utilisateur de la top bar quand l'utilisateur n'est pas authentifié, et mettre à jour les tests E2E et les artefacts de planning.

## Boundaries & Constraints

**Always:**
- Garder `AuthService` déjà injecté dans `TopBarComponent` — ne pas re-injecter
- Le `name` de l'utilisateur vient de `authService.currentUser()?.name` (champ `AuthUser.name`)
- Ajouter un redirect `/links` → `/dashboard` dans le router pour ne pas casser les anciens bookmarks
- Ne pas renommer le dossier `frontend/src/app/links/` ni la classe `LinksComponent` — changement sémantique, pas de refactor de nommage de fichiers

**Ask First:**
- Si un autre composant ou service non listé ici référence `/links` en dur

**Never:**
- Modifier la logique métier du module Liens
- Changer la structure des guards (ajouter/supprimer des canActivate)
- Renommer les fichiers/dossiers du module links

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Utilisateur authentifié navigue vers `/` | `currentUser()` non null | Redirigé vers `/dashboard` | N/A |
| Utilisateur authentifié navigue vers `/links` | route `/links` | Redirigé vers `/dashboard` | N/A |
| Utilisateur non-admin tente `/admin` | guard adminGuard | Redirigé vers `/dashboard` | N/A |
| Login réussi | `authService.login()` résout | Navigate vers `/dashboard` | N/A |
| Changement mdp temporaire réussi | `change-password` submit ok | Navigate vers `/dashboard` | N/A |
| Top bar sur `/login` | `currentUser()` null | Nav tabs et menu utilisateur masqués | N/A |
| Top bar sur `/dashboard` authentifié | `currentUser()` non null | Nav tabs (Accueil/Recettes/Notes) et menu utilisateur visibles | N/A |
| h1 sur `/dashboard` | `currentUser().name === 'Manu'` | Affiche "Dashboard de Manu" | N/A |

</frozen-after-approval>

## Code Map

- `frontend/src/app/app.routes.ts` -- définition des routes ; redirect `''` et path `links` à renommer
- `frontend/src/app/core/guards/admin.guard.ts` -- redirect `/links` → `/dashboard`
- `frontend/src/app/auth/login/login.component.ts` -- navigate `/links` → `/dashboard` (lignes 40, 53)
- `frontend/src/app/auth/change-password/change-password.component.ts` -- navigate `/links` → `/dashboard` (ligne 61)
- `frontend/src/app/core/components/top-bar/top-bar.component.html` -- routerLink + label + wrap nav dans @if
- `frontend/src/app/core/components/top-bar/top-bar.component.ts` -- `authService` déjà injecté, aucun changement .ts requis
- `frontend/src/app/core/components/bottom-nav/bottom-nav.component.html` -- routerLink + label + aria-label
- `frontend/src/app/links/links.component.html` -- h1 statique → interpolation dynamique
- `frontend/src/app/links/links.component.ts` -- injecter `AuthService`
- `e2e/tests/auth.spec.ts` -- `/links` → `/dashboard` dans descriptions et assertions
- `e2e/tests/admin.spec.ts` -- `waitForURL` et `toHaveURL` pour `/links` → `/dashboard`
- `e2e/tests/links-drag-drop.spec.ts` -- `waitForURL('/links')` → `/dashboard`
- `e2e/tests/links-grid-settings.spec.ts` -- `waitForURL('/links')` × 2 → `/dashboard`
- `e2e/tests/profile.spec.ts` -- `waitForURL(/\/links$/)` × 3 → `/dashboard`

## Tasks & Acceptance

**Execution:**
- [x] `frontend/src/app/app.routes.ts` -- Changer `redirectTo: 'links'` → `'dashboard'`, renommer `path: 'links'` → `'dashboard'`, ajouter `{ path: 'links', redirectTo: 'dashboard', pathMatch: 'full' }` pour compat ascendante
- [x] `frontend/src/app/core/guards/admin.guard.ts` -- `createUrlTree(['/links'])` → `['/dashboard']`
- [x] `frontend/src/app/auth/login/login.component.ts` -- `navigate(['/links'])` → `['/dashboard']` (2 occurrences)
- [x] `frontend/src/app/auth/change-password/change-password.component.ts` -- `navigate(['/links'])` → `['/dashboard']`
- [x] `frontend/src/app/core/components/top-bar/top-bar.component.html` -- `routerLink="/links"` → `/dashboard`, label `Liens` → `Accueil`, wraper `<nav>` dans `@if (authService.currentUser())`
- [x] `frontend/src/app/core/components/bottom-nav/bottom-nav.component.html` -- `routerLink="/links"` → `/dashboard`, label `Liens` → `Accueil`, `aria-label="Liens"` → `"Accueil"`
- [x] `frontend/src/app/links/links.component.ts` -- injecter `AuthService` (import + `inject(AuthService)`)
- [x] `frontend/src/app/links/links.component.html` -- `<h1 class="page-title">Liens</h1>` → `<h1 class="page-title">Dashboard de {{ authService.currentUser()?.name }}</h1>`
- [x] `e2e/tests/auth.spec.ts` -- remplacer `/links` → `/dashboard` (descriptions + assertions)
- [x] `e2e/tests/admin.spec.ts` -- remplacer `/links` → `/dashboard` (waitForURL + toHaveURL)
- [x] `e2e/tests/links-drag-drop.spec.ts` -- remplacer `/links` → `/dashboard`
- [x] `e2e/tests/links-grid-settings.spec.ts` -- remplacer `/links` → `/dashboard`
- [x] `e2e/tests/profile.spec.ts` -- remplacer `/links` → `/dashboard`

**Acceptance Criteria:**
- Given l'utilisateur navigue vers `/`, then il est redirigé vers `/dashboard`
- Given l'utilisateur navigue vers `/links`, then il est redirigé vers `/dashboard`
- Given un non-admin est authentifié et tente `/admin`, when le guard s'exécute, then il est redirigé vers `/dashboard`
- Given l'utilisateur se connecte avec succès, when `login()` résout, then il est navigué vers `/dashboard`
- Given l'utilisateur non authentifié est sur `/login`, when il regarde la top bar, then la `<nav>` et le menu utilisateur ne sont pas visibles
- Given l'utilisateur authentifié est sur `/dashboard`, when il regarde la top bar, then le premier onglet s'intitule "Accueil" et pointe vers `/dashboard`
- Given l'utilisateur authentifié est sur `/dashboard`, when la page charge, then le h1 affiche "Dashboard de [name]"
- Given l'utilisateur est sur mobile et connecté, when il regarde la bottom nav, then le premier item s'intitule "Accueil"

## Spec Change Log

## Verification

**Commands:**
- `cd frontend && npx tsc --noEmit` -- expected: aucune erreur TypeScript
- `cd frontend && npx ng build --configuration=production 2>&1 | tail -5` -- expected: build réussi sans erreur

## Suggested Review Order

**Routing — point d'entrée**

- Redirect `''`→`dashboard`, compat `/links`→`dashboard`, et route protégée renommée
  [`app.routes.ts:7`](../../frontend/src/app/app.routes.ts#L7)

**Post-auth navigation — redirections après authentification**

- Seule guard renvoyant vers `/links` ; redirige maintenant les non-admins vers `/dashboard`
  [`admin.guard.ts:10`](../../frontend/src/app/core/guards/admin.guard.ts#L10)

- Navigation post-login (utilisateur déjà connecté au chargement + submit réussi)
  [`login.component.ts:40`](../../frontend/src/app/auth/login/login.component.ts#L40)

- Navigation post-changement de mot de passe temporaire
  [`change-password.component.ts:61`](../../frontend/src/app/auth/change-password/change-password.component.ts#L61)

**Top bar — masquage conditionnel de la navigation**

- `<nav>` wrappé dans `@if (authService.currentUser())` ; label "Accueil" et route `/dashboard`
  [`top-bar.component.html:4`](../../frontend/src/app/core/components/top-bar/top-bar.component.html#L4)

**Page d'accueil — h1 dynamique**

- Injection `AuthService` pour exposer `currentUser()` dans le template
  [`links.component.ts:51`](../../frontend/src/app/links/links.component.ts#L51)

- H1 "Dashboard de [name]" avec fallback sur `username` si `name` vide
  [`links.component.html:1`](../../frontend/src/app/links/links.component.html#L1)

**Navigation mobile**

- Label "Accueil", icône `home`, route `/dashboard`
  [`bottom-nav.component.html:2`](../../frontend/src/app/core/components/bottom-nav/bottom-nav.component.html#L2)

**Tests**

- Test unitaire bottom-nav mis à jour (`/dashboard`)
  [`bottom-nav.component.spec.ts:37`](../../frontend/src/app/core/components/bottom-nav/bottom-nav.component.spec.ts#L37)

- E2E smoke login (`/dashboard|change-password`)
  [`auth.spec.ts:10`](../../e2e/tests/auth.spec.ts#L10)

- E2E admin guard redirige vers `/dashboard`
  [`admin.spec.ts:47`](../../e2e/tests/admin.spec.ts#L47)

- E2E helpers login des tests liens + profil
  [`links-drag-drop.spec.ts:15`](../../e2e/tests/links-drag-drop.spec.ts#L15)
