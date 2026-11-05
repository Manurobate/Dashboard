# Story 4.4 : Toggle mode lecture / mode édition

**Épic :** 4 — Module Liens
**Statut :** done
**Créée le :** 2026-05-19

---

## User Story

En tant qu'utilisateur authentifié,
Je veux basculer entre un mode lecture (interface épurée) et un mode édition (contrôles visibles),
Afin que ma page d'accueil quotidienne soit sans bruit visuel sauf quand j'édite.

---

## Critères d'acceptation

**AC1 — Mode lecture par défaut**
**Étant donné** que la page Liens charge,
**Quand** j'arrive sur `/links`,
**Alors** le mode lecture est actif par défaut : aucun bouton d'édition visible sur les catégories ou les liens

**AC2 — Passage en mode édition**
**Étant donné** que je suis en mode lecture,
**Quand** je clique le bouton "Modifier" (label + icône) dans l'en-tête de page,
**Alors** une transition animée (200ms) fait apparaître les contrôles d'édition sur chaque catégorie et lien

**AC3 — Retour en mode lecture**
**Étant donné** que je suis en mode édition,
**Quand** je clique "Terminer",
**Alors** les contrôles d'édition disparaissent (200ms) et le mode lecture est restauré

**AC4 — Pas de persistance du mode édition**
**Étant donné** que je change de module (Recettes ou Notes) alors que je suis en mode édition,
**Quand** je reviens sur Liens,
**Alors** le mode lecture est actif (comportement naturel : le composant est détruit et re-créé par le router)

---

## Tasks / Subtasks

- [x] T1 — Changer le signal `editMode` à `false` (AC: #1, #4)
  - [x] `frontend/src/app/links/links.component.ts` : `editMode = signal(false)` (était `signal(true)`)
  - [x] Ajouter méthode `toggleEditMode(): void { this.editMode.update((v) => !v); }`

- [x] T2 — Ajouter le bouton toggle dans le template (AC: #1, #2, #3)
  - [x] `frontend/src/app/links/links.component.html` : dans `.links-header`, ajouter bouton "Modifier"/"Terminer" avec `mat-stroked-button` + `<mat-icon>` + label conditionnel
  - [x] Bouton "Ajouter une catégorie" reste conditionnel à `editMode()` avec `@if`

- [x] T3 — Implémenter la transition CSS 200ms (AC: #2, #3)
  - [x] `frontend/src/app/links/links.component.html` : remplacer les `@if (editMode())` autour des contrôles d'édition inline (drag handles, boutons éditer/supprimer, bouton "Ajouter un lien") par des wrappers `[class.edit-visible]="editMode()"` — voir section Dev Notes pour le pattern exact
  - [x] `frontend/src/app/links/links.component.scss` : ajouter classe `.edit-controls` avec `opacity`/`visibility` + `transition: opacity 200ms ease, visibility 200ms ease`

- [x] T4 — Tests (AC: tous)
  - [x] `frontend/src/app/links/links.component.spec.ts` : vérifier `editMode()` vaut `false` par défaut, `toggleEditMode()` bascule à `true`, un second appel revient à `false`

### Review Findings

- [x] [Review][Patch] Contrôles d'édition accessibles au clavier pendant la transition CSS 200ms — pendant la sortie du mode édition, `visibility` reste à `visible` pendant les 200ms de transition (propriété discrète, snap en fin de transition) ; un utilisateur clavier peut Tab + Enter sur les boutons delete/edit/ajouter-lien pendant cette fenêtre malgré `pointer-events: none`. Fix : ajouter `[attr.inert]="editMode() ? null : ''"` sur chaque élément `.edit-controls` dans `links.component.html`. [frontend/src/app/links/links.component.html]
- [x] [Review][Defer] `cdkDragHandle` toujours enregistré dans le DOM en mode lecture [frontend/src/app/links/links.component.html] — deferred, résolu par le fix inert ci-dessus si appliqué
- [x] [Review][Defer] Absence de tests DOM pour l'accessibilité clavier des contrôles cachés [frontend/src/app/links/links.component.spec.ts] — deferred, au-delà du périmètre spec (3 tests signal requis sont présents)
- [x] [Review][Defer] Layout `flex-wrap` sans contrainte de largeur sur viewports très étroits [frontend/src/app/links/links.component.scss] — deferred, cosmétique/low priority

---

## Dev Notes

### Périmètre de cette story

**Frontend uniquement — aucun changement backend.**

Ce que cette story fait :
- Rend `editMode` `false` par défaut (mode lecture)
- Ajoute le bouton toggle "Modifier"/"Terminer" dans le header de la page
- Anime (200ms CSS) l'apparition/disparition des contrôles d'édition

Ce que cette story ne fait PAS :
- Pas de composants `LinkCategoryCard` / `LinkItem` séparés (story 4.5)
- Pas de toggle thème clair/sombre (story 4.6)
- Pas de placement dans la `top-bar` globale (trop couplant — "ou en haut de page" per spec)

### Fichier à modifier : `links.component.ts`

**Changement 1 — signal par défaut :**
```typescript
// Avant
readonly editMode = signal(true);

// Après
readonly editMode = signal(false);
```

**Changement 2 — méthode toggle (à ajouter après la déclaration du signal) :**
```typescript
toggleEditMode(): void {
  this.editMode.update((v) => !v);
}
```

**AC4 — pas de persistance** : garanti naturellement car `LinksComponent` est détruit et re-créé à chaque navigation (router standard Angular, pas de `RouteReuseStrategy` dans ce projet). Aucun `Router` event subscription nécessaire.

### Fichier à modifier : `links.component.html`

**Bouton toggle dans le header :**

Remplacer la div `.links-header` existante :
```html
<!-- AVANT -->
<div class="links-header">
  <h1>Liens</h1>
  @if (editMode()) {
    <button mat-raised-button color="primary" (click)="openAddCategoryDialog()">
      <mat-icon>add</mat-icon>
      Ajouter une catégorie
    </button>
  }
</div>
```

Par :
```html
<!-- APRÈS -->
<div class="links-header">
  <h1>Liens</h1>
  <div class="header-actions">
    @if (editMode()) {
      <button mat-button color="primary" (click)="openAddCategoryDialog()">
        <mat-icon>add</mat-icon>
        Ajouter une catégorie
      </button>
    }
    <button mat-stroked-button (click)="toggleEditMode()" class="toggle-edit-btn"
            [attr.aria-pressed]="editMode()"
            [attr.aria-label]="editMode() ? 'Terminer les modifications' : 'Passer en mode édition'">
      <mat-icon>{{ editMode() ? 'check' : 'edit' }}</mat-icon>
      {{ editMode() ? 'Terminer' : 'Modifier' }}
    </button>
  </div>
</div>
```

**Animation 200ms — pattern CSS class (`[class.edit-visible]`):**

Le `@if (editMode())` supprime les éléments du DOM immédiatement (pas d'animation de sortie). Pour obtenir la transition 200ms, remplacer les `@if` autour des contrôles d'édition inline par le pattern suivant :

```html
<!-- REMPLACER (sur les drag handles, boutons éditer/supprimer, "Ajouter un lien") -->
@if (editMode()) {
  <mat-icon cdkDragHandle class="drag-handle">drag_handle</mat-icon>
}

<!-- PAR -->
<mat-icon cdkDragHandle class="drag-handle edit-controls" [class.edit-visible]="editMode()">drag_handle</mat-icon>
```

```html
<!-- REMPLACER (boutons actions) -->
@if (editMode()) {
  <div class="category-actions">
    <button mat-icon-button ...>...</button>
    <button mat-icon-button ...>...</button>
  </div>
}

<!-- PAR -->
<div class="category-actions edit-controls" [class.edit-visible]="editMode()">
  <button mat-icon-button ...>...</button>
  <button mat-icon-button ...>...</button>
</div>
```

Appliquer ce pattern à **tous** les `@if (editMode())` qui wrappent des contrôles d'édition inline (drag handles, boutons edit/delete sur catégories et liens, bouton "Ajouter un lien" dans la liste). Le `@if (editMode())` sur le bouton "Ajouter une catégorie" dans le header peut rester un `@if` (il est dans `.header-actions` et n'a pas de transition critique).

### Fichier à modifier : `links.component.scss`

Ajouter la classe CSS de transition :
```scss
.edit-controls {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 200ms ease, visibility 200ms ease;

  &.edit-visible {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}
```

**Pourquoi `visibility` en plus de `opacity`** : `opacity: 0` seul laisse l'élément interactif (recevant les clics). `visibility: hidden` coupe l'interactivité tout en permettant une transition CSS (contrairement à `display: none` qui ne se transitione pas).

### Fichier à modifier : `links.component.spec.ts`

Tests à ajouter (pattern Vitest — `vi.fn()`, pas Jasmine) :

```typescript
describe('editMode toggle', () => {
  it('editMode est false par défaut (mode lecture)', () => {
    expect(component.editMode()).toBe(false);
  });

  it('toggleEditMode() passe en mode édition', () => {
    component.toggleEditMode();
    expect(component.editMode()).toBe(true);
  });

  it('toggleEditMode() deux fois revient en mode lecture', () => {
    component.toggleEditMode();
    component.toggleEditMode();
    expect(component.editMode()).toBe(false);
  });
});
```

### Points d'attention critiques

1. **`editMode = signal(false)` — ne pas oublier** : actuellement `signal(true)`, doit devenir `signal(false)`. Tous les `@if (editMode())` et `[cdkDragDisabled]="!editMode()"` dans le template existant sont déjà paramétrés correctement — seule la valeur initiale change.

2. **`[cdkDragDisabled]="!editMode()"` sur les items** : cette directive doit rester inchangée. En mode lecture (`editMode() === false`), le drag est désactivé.

3. **Bouton "Modifier" — label explicite requis** : UX-DR7 et la spec précisent "pas juste une icône — bouton 'Modifier' explicite (label + icône)". Utiliser `mat-stroked-button` (et non `mat-icon-button`).

4. **Tests Vitest** : `vi.fn()`, pas `jasmine.createSpy()`. Pas de `fakeAsync/tick` (app zoneless). Pattern existant en `links.component.spec.ts` à suivre.

5. **`@if` vs CSS class pour l'animation** : seuls les contrôles d'édition inline (dans la boucle `@for`) nécessitent la transition CSS. Le bouton "Ajouter une catégorie" dans le header peut rester un `@if` simple.

6. **Aucun import supplémentaire requis** : `signal` et `ChangeDetectionStrategy.OnPush` déjà importés. Pas de `@angular/animations` nécessaire (approche CSS pure).

---

## Arborescence des fichiers à modifier

```
frontend/src/app/links/
├── links.component.ts      ← modifier : signal(false) + toggleEditMode()
├── links.component.html    ← modifier : bouton toggle + CSS class pattern
├── links.component.scss    ← modifier : .edit-controls transition CSS
└── links.component.spec.ts ← modifier : 3 tests pour editMode toggle
```

---

## Project Structure Notes

- Composant `LinksComponent` à `frontend/src/app/links/links.component.ts`
- Composant standalone OnPush, zoneless — signals uniquement pour la réactivité
- Détruit et re-créé à chaque navigation (pas de `RouteReuseStrategy`) → AC4 garanti sans code additionnel

---

## References

- [Source: epics.md#Story 4.4 — critères d'acceptation toggle mode lecture/édition]
- [Source: ux-design-Dashboard.md#UX-DR7 — bouton Modifier explicite label+icône, transition 200ms]
- [Source: ux-design-Dashboard.md#Module Liens — Cycle lecture/édition — Initiation + Retour mode lecture]
- [Source: architecture.md#Change detection — Zoneless + signals + OnPush]
- [Source: architecture.md#Anti-patterns — Mutation directe des signals interdite]
- [Source: 4-3-crud-des-liens-avec-favicon-auto-recupere.md#Dev Notes — editMode = signal(true) permanent (à changer en false ici)]
- [Source: 4-3-crud-des-liens-avec-favicon-auto-recupere.md#Dev Notes — Tests : Vitest vi.fn(), pas Jasmine/Karma]
- [Source: 4-3-crud-des-liens-avec-favicon-auto-recupere.md#Dev Notes — MatDialogModule/MatSnackBarModule pattern hors imports]
- [Source: frontend/src/app/links/links.component.ts — état actuel : editMode = signal(true), méthodes existantes à ne pas casser]
- [Source: frontend/src/app/core/components/top-bar/top-bar.component.ts — top-bar global sans connaissance du module Liens]

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-19)

### Completion Notes List

- ✅ T1 : `editMode = signal(false)` + méthode `toggleEditMode()` ajoutée
- ✅ T2 : Bouton toggle "Modifier"/"Terminer" (`mat-stroked-button`) ajouté dans `.links-header > .header-actions` avec aria-label et aria-pressed
- ✅ T3 : `@if (editMode())` inline remplacés par pattern `.edit-controls` / `.edit-visible` avec transition CSS 200ms (`opacity` + `visibility`)
- ✅ T4 : 3 tests Vitest ajoutés — `editMode` false par défaut, toggle → true, double toggle → false
- ✅ Suite complète : 55 tests passent, aucune régression

### File List

- frontend/src/app/links/links.component.ts
- frontend/src/app/links/links.component.html
- frontend/src/app/links/links.component.scss
- frontend/src/app/links/links.component.spec.ts
