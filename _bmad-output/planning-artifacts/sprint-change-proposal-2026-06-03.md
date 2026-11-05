# Sprint Change Proposal — Autocomplétion dans l'éditeur de recette
**Date :** 2026-06-03
**Projet :** Dashboard
**Scope :** Minor — implémentation directe par l'agent Développeur
**Statut :** Approuvé

---

## Section 1 — Résumé du problème

L'éditeur de recette (Story 5.3) ne propose aucune aide à la saisie pour les champs catégorie, nom d'ingrédient et unité. L'utilisateur saisit ces valeurs en texte libre à chaque recette, ce qui crée inévitablement des doublons sémantiques (ex : "Dessert" et "Desserts", "poulet" et "Poulet") qui fragmentent le groupement par catégorie dans la liste des recettes.

**Découverte :** Identifié lors de l'utilisation post-implémentation de l'Epic 5.

---

## Section 2 — Analyse d'impact

### Impact Épics
- **Epic 5 (Module Recettes)** : `in-progress` — ajout d'une Story 5.6. Le schéma de la table `Recipe` change (remplacement de `category varchar` par `categoryId int FK`). Toutes les stories 5.1–5.5 restent `done`, pas de régression.
- **Epic 6 (Partage public — recettes)** : à anticiper. L'endpoint `GET /api/sharing/:token` doit retourner `category.name` via jointure. À traiter lors de l'implémentation de l'Epic 6.
- **Épics 1–4, 7** : non affectés.

### Impact Stories
- **Story 5.3** : complétée par Story 5.6 (l'AC existante reste valide, la Story 5.6 enrichit l'éditeur)
- **Story 5.6** : nouvelle story créée (voir Section 4)

### Impact Artefacts
- `epics.md` : ajout de la Story 5.6 dans l'Epic 5
- `sprint-status.yaml` : ajout de l'entrée `5-6-referentiel-categories-et-autocompletion`
- Architecture : nouvel entity `RecipeCategory`, modification de `Recipe` entity

### Impact Technique

| Zone | Nature du changement |
|------|---------------------|
| DB Schema | Nouvelle table `RecipeCategory`, suppression colonne `category` de `Recipe`, ajout `categoryId` FK nullable |
| Migration | Structure uniquement — pas de migration de données (tables purgées) |
| Backend | Nouveau entity, nouveau service partiel, 3 nouveaux endpoints GET, DTOs mis à jour |
| Frontend | `MatAutocomplete` sur 3 champs de l'éditeur, adaptations affichage liste + détail |
| Tests E2E | Scénarios à ajouter dans Story 5.6 |

---

## Section 3 — Approche recommandée

**Option retenue : Ajustement direct (Option 1)**

- Effort : Moyen
- Risque : Faible (pas de migration de données, tables purgées)
- Impact timeline : Ajoute une story à l'Epic 5

**Décisions validées par Manu :**
- Catégories → table référentielle `RecipeCategory` avec FK (Option B)
- Ingrédients → string + autocomplete `DISTINCT` (Option A) — normalisation inutile pour un usage perso
- Unités → string + autocomplete `DISTINCT` (Option A) — idem
- Casse → recherche insensible à la casse côté autocomplete, sauvegarde telle quelle
- Données existantes → pas de migration de données, tables purgées avant déploiement

**Impact MVP :** Aucun. Les requirements fonctionnels sont enrichis, pas réduits.

---

## Section 4 — Propositions de changements détaillées

### Story 5.6 : Référentiel de catégories et autocomplétion dans l'éditeur de recette

**Ajout dans l'épic 5 de `epics.md` :**

```
### Story 5.6 : Référentiel de catégories et autocomplétion dans l'éditeur de recette

En tant qu'utilisateur authentifié,
Je veux que le champ catégorie et les champs ingrédient/unité de l'éditeur de recette
proposent de l'autocomplétion à partir de mes données existantes,
Afin d'éviter les doublons et d'accélérer la saisie.

**Critères d'acceptation :**

**Backend — Entité & migration**

**Étant donné** que la migration TypeORM est exécutée,
**Quand** j'inspecte la base de données,
**Alors** la table `RecipeCategory` existe (id, name VARCHAR(100), userId, createdAt, updatedAt)
**Et** la table `Recipe` possède une colonne `categoryId` INT nullable (FK vers `RecipeCategory`)
**Et** l'ancienne colonne `category VARCHAR` n'existe plus dans `Recipe`

**Étant donné** que je crée ou modifie une recette avec `categoryName: "Dessert"`,
**Quand** le service `RecipesService` traite la requête,
**Alors** il vérifie si une `RecipeCategory` avec `name = "Dessert"` et `userId` correspondant existe déjà :
- Si oui → réutilise l'id existant
- Si non → crée silencieusement la `RecipeCategory` et utilise son id
**Et** la `Recipe` est sauvegardée avec le `categoryId` résultant

**Backend — Endpoints autocomplétion**

**Étant donné** que je suis authentifié,
**Quand** j'appelle `GET /api/recipe-categories`,
**Alors** le backend retourne la liste des `RecipeCategory` de l'utilisateur (id + name)

**Quand** j'appelle `GET /api/recipe-categories/ingredient-suggestions`,
**Alors** le backend retourne les noms d'ingrédients distincts de l'utilisateur
(`SELECT DISTINCT name FROM RecipeIngredient JOIN Recipe WHERE Recipe.userId = ?`, triés alphabétiquement)

**Quand** j'appelle `GET /api/recipe-categories/unit-suggestions`,
**Alors** le backend retourne les unités distinctes de l'utilisateur
(`SELECT DISTINCT unit FROM RecipeIngredient JOIN Recipe WHERE Recipe.userId = ? AND unit IS NOT NULL AND unit != ''`, triées alphabétiquement)

**Frontend — Champ catégorie (`recipe-editor.component`)**

**Étant donné** que j'ouvre le formulaire de création ou d'édition d'une recette,
**Quand** je clique sur le champ catégorie,
**Alors** un `MatAutocomplete` affiche la liste de mes catégories existantes

**Étant donné** que je commence à taper dans le champ catégorie,
**Quand** je saisis au moins 1 caractère,
**Alors** la liste est filtrée côté client (insensible à la casse) pour ne montrer que les catégories correspondantes

**Étant donné** que je saisie une catégorie qui n'existe pas encore (ex : "Plat"),
**Quand** je soumets le formulaire,
**Alors** le formulaire envoie `categoryName: "Plat"` au backend qui la crée silencieusement
**Et** la recette est sauvegardée normalement

**Étant donné** que le champ catégorie est laissé vide,
**Quand** je soumets le formulaire,
**Alors** `categoryId` est null — la recette est sauvegardée sans catégorie

**Frontend — Champs ingrédient (`recipe-ingredient-row.component`)**

**Étant donné** que je saisie dans le champ nom d'un ingrédient,
**Quand** je tape au moins 1 caractère,
**Alors** un `MatAutocomplete` filtre (insensible à la casse) les noms d'ingrédients existants de mes recettes
**Et** je peux sélectionner une suggestion ou saisir un nouveau nom librement

**Étant donné** que je saisie dans le champ unité d'un ingrédient,
**Quand** je tape au moins 1 caractère,
**Alors** un `MatAutocomplete` filtre (insensible à la casse) les unités existantes de mes recettes
**Et** je peux sélectionner une suggestion ou saisir une nouvelle unité librement

**Frontend — Adaptations affichage**

**Étant donné** que j'accède à `/recipes`,
**Quand** les recettes sont chargées,
**Alors** le groupement par catégorie utilise `recipe.category?.name` (au lieu de `recipe.category` string)
**Et** les recettes sans catégorie sont regroupées sous "Sans catégorie"

**Étant donné** que j'accède à la page détail d'une recette (`/recipes/:id`),
**Quand** la page charge,
**Alors** le nom de catégorie affiché est `recipe.category?.name`

### Scénarios E2E
- Créer une recette avec une nouvelle catégorie "Soupe" → vérifier qu'elle apparaît dans l'autocomplete à la création d'une 2e recette
- Taper "so" dans le champ catégorie → vérifier que "Soupe" apparaît dans les suggestions
- Sélectionner "Soupe" depuis l'autocomplete → vérifier que le nom est exactement "Soupe" en base
- Créer une recette avec l'ingrédient "poulet" → vérifier que "poulet" apparaît dans les suggestions ingrédient d'une 2e recette
- Soumettre sans catégorie → vérifier que la recette est créée avec categoryId null
```

---

## Section 5 — Plan de handoff

**Scope : Minor** → implémentation directe par l'agent Développeur.

**Responsabilités :**
- **Agent Développeur** : implémenter Story 5.6 dans son intégralité
- **Manu** : tester les scénarios E2E post-implémentation

**Mises à jour immédiates à appliquer (avant de confier à l'agent dev) :**
1. Ajouter Story 5.6 dans `epics.md`
2. Ajouter `5-6-referentiel-categories-et-autocompletion: backlog` dans `sprint-status.yaml`

**Critères de succès :**
- L'autocomplétion catégorie fonctionne sur `/recipes/new` et `/recipes/:id/edit`
- L'autocomplétion nom d'ingrédient et unité fonctionne dans `RecipeIngredientRow`
- La liste des recettes groupe toujours correctement par `category.name`
- La page détail affiche correctement `category.name`
- Les scénarios E2E passent en vert
- Aucune régression sur les stories 5.1–5.5
