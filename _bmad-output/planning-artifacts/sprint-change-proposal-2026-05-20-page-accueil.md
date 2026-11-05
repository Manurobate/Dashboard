# Sprint Change Proposal — Page d'accueil Dashboard

**Date :** 2026-05-20
**Auteur :** Manu
**Statut :** Approuvé

---

## Section 1 — Résumé de l'issue

### Problème

À l'issue de l'Epic 4 (Module Liens), la "page Liens" est en réalité destinée à devenir la **page d'accueil complète du Dashboard**. L'utilisateur souhaite y intégrer à terme des widgets supplémentaires (météo, cours de bourse, barre de recherche Google, etc.). Les labels, le titre de la page et la route doivent refléter cette vocation dès maintenant, avant que les Epics 5-7 n'accumulent davantage de références à corriger.

Trois problèmes complémentaires ont également été identifiés :
1. Le label "Liens" dans le menu de navigation ne reflète pas la nature de la page
2. Le `h1` de la page n'est pas personnalisé
3. La top bar affiche les onglets de navigation et le menu utilisateur même quand l'utilisateur n'est pas authentifié

### Contexte de découverte

Détecté post-implémentation de l'Epic 4, avant le démarrage de l'Epic 5. Moment idéal pour corriger : le coût est minimal maintenant (6 stories + 2 artefacts) vs. plus tard (toutes les stories des Epics 5-7 auraient hérité des mauvais labels/routes).

### Evidence

- Epic 4 livré et fonctionnel
- Vision long terme documentée dans le PRD V2+ : "Widgets page d'accueil : blocs configurables sur la page Liens — météo, cours de bourse, statut de serveurs personnels"
- Route `/links` référencée dans 6 stories (2.2, 2.4, 2.5, 3.1, 4.4, 4.6)

---

## Section 2 — Analyse d'impact

### Impact Epic

| Epic | Impact |
|------|--------|
| Epic 1 | Story 1.5 — top bar : 2 critères à modifier/ajouter |
| Epic 2 | Stories 2.2, 2.4, 2.5 — remplacement `/links` → `/dashboard` |
| Epic 3 | Story 3.1 — remplacement `/links` → `/dashboard` |
| Epic 4 | Stories 4.4, 4.6 — remplacement `/links` → `/dashboard` + ajout critère h1 |
| Epics 5-7 | Aucun impact — ne référencent pas `/links` dans leur contenu métier |

### Impact artefacts

| Artefact | Impact |
|----------|--------|
| `prd.md` | FR22 — libellé à mettre à jour ; UX-DR3 — préciser "Accueil" comme label du 1er onglet |
| `epics.md` | 6 stories à corriger (labels + routes) |
| Code Angular (dev agent) | Route definition, guards, redirects auth, bottom nav mobile |
| Tests E2E | Remplacer `/links` → `/dashboard` dans les specs Playwright |

### Impact technique (code — à implémenter)

- **Routing Angular** : renommer la route `links` → `dashboard`, mettre à jour les redirects par défaut
- **Guards** : `authGuard`, `mustChangePasswordGuard`, `adminGuard` — toutes les redirections post-auth
- **Top bar** : injection `AuthService`, `Signal isAuthenticated`, masquage conditionnel nav + menu utilisateur
- **`LinksComponent`** : injection `AuthService`, affichage `"Dashboard de [name]"` dans le `h1`
- **Bottom nav mobile** : label "Accueil" au lieu de "Liens"
- **E2E** : tous les `page.goto('/links')` → `page.goto('/dashboard')`

### Impact MVP

Aucun. Le périmètre fonctionnel V1 est inchangé — il s'agit uniquement d'une mise à jour de labels, de la route et du comportement de la top bar.

---

## Section 3 — Approche recommandée

**Option retenue : Direct Adjustment**

Modification directe des artefacts de planning et implémentation par le Developer agent dans la foulée du changement.

**Justification :**
- Effort faible (find & replace + modifications ciblées)
- Risque technique bas (pas de changement de logique métier)
- Timing optimal (fin Epic 4, avant Epic 5)
- Bénéfice immédiat : cohérence sémantique pour toute la suite du projet

**Effort estimé :** Faible
**Risque :** Faible
**Impact sur le planning :** Aucun — peut être traité comme une micro-story de transition entre Epic 4 et Epic 5

---

## Section 4 — Propositions de changements détaillées

### 4.1 — PRD (`prd.md`)

**FR22 :**

```
AVANT :
"Le module Liens est la vue affichée par défaut après connexion"

APRÈS :
"La page d'accueil (/dashboard) est la vue affichée par défaut après connexion"
```

**UX-DR3 :**

```
AJOUT de précision :
Le premier onglet de navigation de la MatTabNavBar s'intitule "Accueil" et pointe vers /dashboard
```

---

### 4.2 — Story 1.5 — Navigation responsive (Top bar + Bottom nav)

**Modification du critère desktop existant :**

```
AVANT :
"Étant donné que l'application tourne sur desktop (≥768px),
Quand je regarde la top bar,
Alors je vois : logo "Dashboard", onglets de navigation (Liens/Recettes/Notes) via MatTabNavBar,
icône toggle thème, menu utilisateur (MatMenu) avec bouton déconnexion"

APRÈS :
"Étant donné que l'application tourne sur desktop (≥768px) et que l'utilisateur est authentifié,
Quand je regarde la top bar,
Alors je vois : logo "Dashboard", onglets de navigation (Accueil/Recettes/Notes) via MatTabNavBar,
icône toggle thème, menu utilisateur (MatMenu) avec bouton déconnexion"
```

**Modification du critère bottom nav :**

```
AVANT :
"je vois la bottom nav (MatBottomNav) avec 3 items (icône + label) : Liens, Recettes, Notes"

APRÈS :
"je vois la bottom nav (MatBottomNav) avec 3 items (icône + label) : Accueil, Recettes, Notes"
```

**Nouveau critère — top bar non-authentifiée :**

```
AJOUT :
Étant donné que l'utilisateur n'est pas authentifié (page /login ou /change-password),
Quand je regarde la top bar,
Alors seuls le titre "Dashboard" (à gauche) et l'icône toggle thème sont visibles
Et les onglets de navigation (Accueil/Recettes/Notes) et le menu utilisateur sont masqués
```

---

### 4.3 — Story 4.6 — Vue par défaut, état vide et thème

**Modification du critère de redirection :**

```
AVANT :
"Alors je suis redirigé vers /links (vue par défaut)"

APRÈS :
"Alors je suis redirigé vers /dashboard (vue par défaut)"
```

**Nouveau critère — titre de la page :**

```
AJOUT :
Étant donné que l'utilisateur est connecté et accède à /dashboard,
Quand la page charge,
Alors le titre h1 de la page affiche "Dashboard de [nom d'affichage de l'utilisateur]"
(le nom d'affichage est lu depuis le service d'authentification — champ `name` déjà disponible)
```

---

### 4.4 — Stories 2.2, 2.4, 2.5, 3.1, 4.4 — Remplacement de route

Remplacement systématique dans les critères d'acceptation de chaque story :

| Story | Occurrence | Remplacement |
|-------|-----------|-------------|
| 2.2 | `"redirige vers /links"` | `"redirige vers /dashboard"` |
| 2.4 | `"accéder à /links ou toute route protégée"` | `"accéder à /dashboard ou toute route protégée"` |
| 2.5 | `"je suis redirigé vers /links"` | `"je suis redirigé vers /dashboard"` |
| 3.1 | `"le guard adminGuard me redirige vers /links"` | `"le guard adminGuard me redirige vers /dashboard"` |
| 4.4 | `"Quand j'arrive sur /links"` | `"Quand j'arrive sur /dashboard"` |

---

## Section 5 — Handoff et implémentation

### Classification du changement : **Mineur**

Implémentation directe par le Developer agent.

### Périmètre d'implémentation

Le Developer agent devra :

1. **Mettre à jour les artefacts de planning** (ci-dessus — peut être fait par le dev agent ou immédiatement)
2. **Angular routing** — renommer la route `links` → `dashboard`, mettre à jour les redirects
3. **Guards** — toutes les redirections post-auth pointent vers `/dashboard`
4. **`LinksComponent`** — renommer en `HomeComponent` ou conserver le nom (à décider) + afficher `"Dashboard de [name]"` dans le h1
5. **Top bar** — injection `AuthService`, masquage conditionnel nav + menu utilisateur quand `!isAuthenticated()`
6. **Bottom nav** — label "Accueil" au lieu de "Liens"
7. **E2E** — remplacer toutes les occurrences de `/links` par `/dashboard` dans `e2e/tests/`

### Critères de succès

- [ ] La route `/links` redirige vers `/dashboard` (ou n'existe plus)
- [ ] Le label "Accueil" apparaît dans la top bar et la bottom nav
- [ ] Le h1 affiche "Dashboard de Manu" pour l'utilisateur "Manu"
- [ ] Sur la page `/login`, la top bar n'affiche que le titre + toggle thème
- [ ] Tous les tests E2E passent avec la nouvelle route
- [ ] Aucune régression sur le comportement des guards d'auth
