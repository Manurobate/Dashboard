# Story 4.5 : Composants LinkCategoryCard et LinkItem

**Épic :** 4 — Module Liens
**Statut :** done
**Créée le :** 2026-05-19

---

## User Story

En tant qu'utilisateur,
Je veux voir mes catégories sous forme de cards collapsibles avec mes liens cliquables et leur favicon,
Afin d'accéder visuellement et rapidement à mes ressources organisées.

---

## Critères d'acceptation

**AC1 — Affichage LinkCategoryCard**
**Étant donné** que la page Liens charge,
**Quand** les catégories sont affichées,
**Alors** chaque `LinkCategoryCard` affiche : emoji + nom de la catégorie + badge (nombre de liens) + chevron collapse
**Et** la card est élevée (box-shadow selon design direction 03)

**AC2 — Affichage LinkItem**
**Étant donné** qu'une catégorie est dépliée,
**Quand** j'inspecte les liens,
**Alors** chaque `LinkItem` affiche : favicon 16×16 (fallback : lettre initiale si favicon absent) + titre cliquable (`target="_blank" rel="noopener noreferrer"`)

**AC3 — Collapse/expand catégorie**
**Étant donné** que je clique sur le header d'une catégorie,
**Quand** la catégorie bascule,
**Alors** elle se replie/déplie avec `aria-expanded` mis à jour correctement
**Et** le raccourci clavier Entrée/Espace sur le header déclenche aussi le toggle

**AC4 — Responsive mobile**
**Étant donné** que la page est sur mobile (<768px),
**Quand** j'affiche les catégories,
**Alors** les cards sont en 1 colonne full-width avec padding 12px

**AC5 — Responsive desktop**
**Étant donné** que la page est sur desktop (≥768px),
**Quand** j'affiche les catégories,
**Alors** la liste adopte un layout adapté (cards full-width avec gap 8px) et les drag & drop restent fonctionnels

---

## Tasks / Subtasks

- [x] T1 — Créer `LinkCategoryCardComponent` (AC: #1, #3, #4, #5)
  - [x] Créer `frontend/src/app/links/components/link-category-card/link-category-card.component.ts` — standalone OnPush, `@Input()` category/links/editMode, `@Output()` events
  - [x] Créer `frontend/src/app/links/components/link-category-card/link-category-card.component.html` — `MatExpansionPanel` + header (drag handle, emoji, nom, badge-span) + liste liens (nested cdkDropList + app-link-item)
  - [x] Créer `frontend/src/app/links/components/link-category-card/link-category-card.component.scss` — box-shadow card, badge styling

- [x] T2 — Créer `LinkItemComponent` (AC: #2)
  - [x] Créer `frontend/src/app/links/components/link-item/link-item.component.ts` — standalone OnPush, `@Input()` link/editMode, signal local `hasFaviconError`, `@Output()` editLink/deleteLink
  - [x] Créer `frontend/src/app/links/components/link-item/link-item.component.html` — favicon/initiale + titre + `.edit-controls` actions
  - [x] Créer `frontend/src/app/links/components/link-item/link-item.component.scss` — styles item

- [x] T3 — Mettre à jour `LinksComponent` (AC: tous)
  - [x] `links.component.ts` : ajouter `LinkCategoryCardComponent` et `LinkItemComponent` aux imports ; retirer `failedFavicons` signal et `onFaviconError()` (déplacés dans `LinkItem`) ; connecter les `@Output()` des cards aux handlers existants
  - [x] `links.component.html` : remplacer `div.category-item` par `<app-link-category-card>` avec binding des inputs/outputs ; retirer les styles inline des items
  - [x] `links.component.scss` : adapter `.category-list` layout si besoin ; retirer les styles `.category-item`, `.link-item` etc. devenus inutiles (déplacés dans les composants)

- [x] T4 — Tests (AC: #1, #2, #3)
  - [x] `link-category-card.component.spec.ts` — test rendu avec inputs mock, badge count, `editMode` propagation
  - [x] `link-item.component.spec.ts` — test favicon affiché vs lettre initiale, titre cliquable, actions cachées en mode lecture

### Review Findings

- [x] [Review][Dismiss] Badge `link-count-badge` — suppression intentionnelle, cards sans compteur par choix (review 2026-05-20)
- [x] [Review][Patch] `hasFaviconError` signal non réinitialisé lors du changement d'input `link` — Ajout de `ngOnChanges` dans `LinkItemComponent` [link-item.component.ts] ✅ fixé
- [x] [Review][Patch] Opérateur `!` sur `find()` dans `handleReorderLinks` → TypeError potentiel — Guard null ajouté + filter type-safe [links.component.ts:68] ✅ fixé
- [x] [Review][Patch] `dropLink()` non testé dans `LinkCategoryCardComponent` + test "previousIndex === currentIndex" supprimé — Tests ajoutés [link-category-card.component.spec.ts] ✅ fixé
- [x] [Review][Patch] `link.title.charAt(0)` retourne `""` si titre vide — Fallback `'?'` ajouté [link-item.component.html:8] ✅ fixé
- [x] [Review][Patch] `category.emoji` nullable → interpolation peut afficher `"null"` — `?? ''` ajouté [link-category-card.component.html:12] ✅ fixé

- [x] [Review][Defer] Suppression catégorie ne purge pas les liens orphelins dans `linksService.links` [links.component.ts:openDeleteDialog] — deferred, pre-existing
- [x] [Review][Defer] Concurrence de drops HTTP simultanés sans verrou [links.component.ts:handleReorderLinks] — deferred, pre-existing (déjà noté story 4.2)
- [x] [Review][Defer] Dialog ouverture multiple si double-clic rapide [link-category-card.component.html] — deferred, pre-existing
- [x] [Review][Defer] `@Input`/`@Output` classiques vs signal inputs — tech debt Angular 17+ [link-category-card.component.ts, link-item.component.ts] — deferred, intentional style choice
- [x] [Review][Defer] `linksForCategory()` non mémoïsée, appelée à chaque cycle de détection [links.component.html] — deferred, pre-existing
- [x] [Review][Defer] Incohérence `drag-handle` : `visibility:hidden` dans `LinkItem` vs `@if` dans `LinkCategoryCard` [link-item.component.html] — deferred, design choice
- [x] [Review][Defer] `cdkDropList` sans `id` dans `LinkCategoryCardComponent` — connexion inter-catégories future impossible [link-category-card.component.html] — deferred, out of scope
- [x] [Review][Defer] `loadLinks()` rollback sans notification secondaire si le rechargement échoue aussi [links.component.ts:handleReorderLinks] — deferred, pre-existing
- [x] [Review][Defer] URL `[href]` non validée explicitement (scheme `javascript:`) — Angular sanitize mitigue le risque, backend à renforcer [link-item.component.html:11] — deferred, pre-existing + backend concern

---

## Dev Notes

### Périmètre de cette story

**Frontend uniquement — aucun changement backend, aucun changement de service.**

Ce que cette story fait :
- Extrait le rendu des catégories dans `LinkCategoryCardComponent` (avec `MatExpansionPanel` pour le collapse)
- Extrait le rendu des liens dans `LinkItemComponent`
- Met à jour `LinksComponent` pour utiliser ces nouveaux composants
- Déplace la gestion locale `failedFavicons` dans `LinkItemComponent`

Ce que cette story ne fait PAS :
- Pas de changement des services (`LinkCategoriesService`, `LinksService`)
- Pas de changement des dialogs existants (category-dialog, link-dialog)
- Pas de toggle thème clair/sombre (story 4.6)
- Pas d'état vide ni redirection sur `/links` (story 4.6)
- La logique des handlers (CRUD, snackbar) reste dans `LinksComponent`

### Nouveau : `LinkCategoryCardComponent`

**Localisation :** `frontend/src/app/links/components/link-category-card/`

**API composant :**
```typescript
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter } from '@angular/core';
import { LinkCategory } from '../../link-categories.service';
import { Link } from '../../links.service';

@Component({
  selector: 'app-link-category-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatExpansionModule,
    DragDropModule,
    MatButtonModule,
    MatIconModule,
    LinkItemComponent,
  ],
  templateUrl: './link-category-card.component.html',
  styleUrl: './link-category-card.component.scss',
})
export class LinkCategoryCardComponent {
  @Input({ required: true }) category!: LinkCategory;
  @Input({ required: true }) links!: Link[];
  @Input() editMode = false;

  @Output() editCategory = new EventEmitter<LinkCategory>();
  @Output() deleteCategory = new EventEmitter<LinkCategory>();
  @Output() addLink = new EventEmitter<number>();            // émet categoryId
  @Output() editLink = new EventEmitter<Link>();
  @Output() deleteLink = new EventEmitter<Link>();
  @Output() reorderLinks = new EventEmitter<{ id: number; position: number }[]>();

  dropLink(event: CdkDragDrop<Link[]>): void {
    if (event.previousIndex === event.currentIndex) return;
    const reordered = [...this.links];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    this.reorderLinks.emit(reordered.map((l, i) => ({ id: l.id, position: i })));
  }
}
```

**Template structure (`link-category-card.component.html`) :**
```html
<mat-expansion-panel class="category-card">
  <mat-expansion-panel-header>
    <mat-panel-title class="category-header-content">
      <mat-icon cdkDragHandle class="drag-handle edit-controls"
                [class.edit-visible]="editMode"
                [attr.inert]="editMode ? null : ''">drag_handle</mat-icon>
      <span class="category-emoji">{{ category.emoji }}</span>
      <span class="category-name">{{ category.name }}</span>
      <span class="link-count-badge">{{ links.length }}</span>
    </mat-panel-title>
    <mat-panel-description>
      <div class="category-actions edit-controls"
           [class.edit-visible]="editMode"
           [attr.inert]="editMode ? null : ''">
        <button mat-icon-button (click)="$event.stopPropagation(); editCategory.emit(category)" aria-label="Modifier la catégorie">
          <mat-icon>edit</mat-icon>
        </button>
        <button mat-icon-button (click)="$event.stopPropagation(); deleteCategory.emit(category)" aria-label="Supprimer la catégorie">
          <mat-icon>delete</mat-icon>
        </button>
      </div>
    </mat-panel-description>
  </mat-expansion-panel-header>

  <!-- Contenu panel : liste des liens -->
  <div cdkDropList
       [cdkDropListData]="links"
       (cdkDropListDropped)="dropLink($event)"
       class="link-list">
    @for (link of links; track link.id) {
      <app-link-item
        cdkDrag
        [cdkDragDisabled]="!editMode"
        [link]="link"
        [editMode]="editMode"
        (editLink)="editLink.emit($event)"
        (deleteLink)="deleteLink.emit($event)" />
    }
    <button mat-button class="add-link-button edit-controls"
            [class.edit-visible]="editMode"
            [attr.inert]="editMode ? null : ''"
            (click)="addLink.emit(category.id)">
      <mat-icon>add</mat-icon>
      Ajouter un lien
    </button>
  </div>
</mat-expansion-panel>
```

**⚠️ Point critique — boutons dans `mat-expansion-panel-header` :**
Les boutons edit/delete dans `<mat-panel-description>` déclenchent aussi le toggle du panel. Il faut **impérativement** `$event.stopPropagation()` sur chaque bouton pour éviter que cliquer "Modifier" collapse la card. Voir template ci-dessus.

**⚠️ `cdkDragHandle` dans `mat-expansion-panel-header` :**
Le `cdkDrag` est posé sur `<app-link-category-card>` dans le template parent (`LinksComponent`). Le `cdkDragHandle` à l'intérieur fonctionne car CDK cherche `cdkDragHandle` dans les descendants du `cdkDrag`. Pas de problème de cross-component.

**SCSS `link-category-card.component.scss` :**
```scss
// Card élevée — Design Direction 03
.category-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  margin-bottom: 0;  // gap géré par le parent
}

.category-header-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.category-emoji {
  font-size: 20px;
  flex-shrink: 0;
}

.category-name {
  font-size: 16px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.link-count-badge {
  font-size: 12px;
  font-weight: 600;
  background: var(--mat-sys-primary-container);
  color: var(--mat-sys-on-primary-container);
  border-radius: 10px;
  padding: 2px 8px;
  flex-shrink: 0;
}

.category-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 4px;
}

.add-link-button {
  align-self: flex-start;
  color: var(--mat-sys-on-surface-variant);
  font-size: 13px;
}

// Pattern .edit-controls hérité de links.component.scss — NE PAS dupliquer
// Utiliser les classes parent ou définir ici si SCSS isolé
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

### Nouveau : `LinkItemComponent`

**Localisation :** `frontend/src/app/links/components/link-item/`

**API composant :**
```typescript
import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal } from '@angular/core';
import { Link } from '../../links.service';

@Component({
  selector: 'app-link-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, DragDropModule],
  templateUrl: './link-item.component.html',
  styleUrl: './link-item.component.scss',
})
export class LinkItemComponent {
  @Input({ required: true }) link!: Link;
  @Input() editMode = false;

  @Output() editLink = new EventEmitter<Link>();
  @Output() deleteLink = new EventEmitter<Link>();

  // Signal local — gère l'erreur favicon sans remontée au parent
  readonly hasFaviconError = signal(false);

  onFaviconError(): void {
    this.hasFaviconError.set(true);
  }
}
```

**Template `link-item.component.html` :**
```html
<div class="link-item-wrapper">
  <mat-icon cdkDragHandle class="drag-handle edit-controls"
            [class.edit-visible]="editMode"
            [attr.inert]="editMode ? null : ''">drag_handle</mat-icon>

  @if (link.faviconUrl && !hasFaviconError()) {
    <img [src]="link.faviconUrl" width="16" height="16" alt="" class="link-favicon"
         (error)="onFaviconError()" />
  } @else {
    <span class="link-initial" aria-hidden="true">{{ link.title.charAt(0).toUpperCase() }}</span>
  }

  <a [href]="link.url"
     target="_blank"
     rel="noopener noreferrer"
     class="link-title"
     [attr.aria-label]="'Ouvrir ' + link.title + ' dans un nouvel onglet'">
    {{ link.title }}
  </a>

  <div class="link-actions edit-controls"
       [class.edit-visible]="editMode"
       [attr.inert]="editMode ? null : ''">
    <button mat-icon-button (click)="editLink.emit(link)" aria-label="Modifier le lien">
      <mat-icon>edit</mat-icon>
    </button>
    <button mat-icon-button (click)="deleteLink.emit(link)" aria-label="Supprimer le lien">
      <mat-icon>delete</mat-icon>
    </button>
  </div>
</div>
```

**Note `role` :** `role="listitem"` est géré par le contexte HTML — le `cdkDropList` parent rend une liste. Ne pas ajouter de `role` redondant sur le host `<app-link-item>`.

### Mise à jour `LinksComponent`

**`links.component.ts` — changements :**
1. Ajouter aux imports : `LinkCategoryCardComponent`, `LinkItemComponent` (pas directement — `LinkItem` est importé par `LinkCategoryCard`)
2. Retirer : signal `failedFavicons`, méthode `onFaviconError()` (déplacés dans `LinkItemComponent`)
3. Ajouter méthode pour gérer `reorderLinks` depuis les cards :

```typescript
handleReorderLinks(categoryId: number, items: { id: number; position: number }[]): void {
  this.linksService.links.update((all) => {
    const othersLinks = all.filter((l) => l.categoryId !== categoryId);
    const categoryLinks = items.map((item) => {
      const link = all.find((l) => l.id === item.id)!;
      return { ...link, position: item.position };
    });
    return [...othersLinks, ...categoryLinks];
  });
  this.linksService.reorderLinks(items).subscribe({
    error: () => {
      this.linksService.loadLinks().subscribe();
      this.snackBar.open('Erreur lors de la réorganisation', 'Fermer', { duration: 3000 });
    },
  });
}
```

4. Retirer `linksForCategory()` du composant parent si déplacé → **ATTENTION** : `linksForCategory()` peut rester dans `LinksComponent` pour passer les liens en `@Input()` à chaque card, ou être déplacé. Garder dans `LinksComponent` et passer via `[links]="linksForCategory(cat.id)"`.

**`links.component.html` — changements :**
Remplacer le bloc `@for (cat of ...) { <div cdkDrag ...> }` par :
```html
@for (cat of linkCategoriesService.categories(); track cat.id) {
  <app-link-category-card
    cdkDrag
    [cdkDragDisabled]="!editMode()"
    [category]="cat"
    [links]="linksForCategory(cat.id)"
    [editMode]="editMode()"
    (editCategory)="openEditCategoryDialog($event)"
    (deleteCategory)="openDeleteDialog($event)"
    (addLink)="openAddLinkDialog($event)"
    (editLink)="openEditLinkDialog($event)"
    (deleteLink)="openDeleteLinkDialog($event)"
    (reorderLinks)="handleReorderLinks(cat.id, $event)">
    <mat-icon *cdkDragPlaceholder>drag_handle</mat-icon>
  </app-link-category-card>
}
```

**`links.component.scss` — changements :**
- `.category-list` passe de `flex-direction: column` à `flex-direction: column; gap: 12px;` (les cards gèrent leur propre shadow)
- Retirer les styles `.category-item`, `.category-item-header`, `.category-item-content`, `.link-list`, `.link-item`, `.link-favicon`, `.link-initial`, `.link-title`, `.link-actions`, `.add-link-button` (tous déplacés dans les sub-composants)
- Le `.edit-controls` peut rester dans `links.component.scss` pour le header, OU être dupliqué dans chaque sous-composant (recommandé pour l'isolation)

### Contrainte architecturale critique — badge compteur

**NE PAS utiliser `<mat-chip>` pour le badge de compteur de liens.**

En Angular Material 3, `<mat-chip>` standalone rend en mode "assist chip" outlined (fond transparent). Le style ne peut pas être surchargé via CSS.

✅ Utiliser un `<span class="link-count-badge">` avec styles SCSS custom (voir ci-dessus).

Source : `architecture.md` → "Conventions Angular Material 3 — Pièges et Patterns" → "`mat-chip` standalone : pas de fond coloré possible"

Les epics mentionnent `MatChip` pour ce badge — **ignorer** : l'architecture prend le dessus.

### Pattern `.edit-controls` (hérité de story 4.4)

Le pattern CSS animation 200ms est établi dans `links.component.scss` :
```scss
.edit-controls { opacity: 0; visibility: hidden; pointer-events: none; transition: opacity 200ms ease, visibility 200ms ease; }
.edit-controls.edit-visible { opacity: 1; visibility: visible; pointer-events: auto; }
```

Dans les composants enfants (SCSS isolé), ce pattern doit être **redéfini** dans chaque fichier `.scss` dédié, car les styles Angular sont encapsulés (Emulated ViewEncapsulation par défaut). **Ne pas s'attendre** à hériter de `.edit-controls` depuis `links.component.scss`.

Le `[attr.inert]="editMode ? null : ''"` doit être conservé sur tous les wrappers `.edit-controls` (patch accessibilité clavier validé en story 4.4).

### Drag & drop — `cdkDragHandle` dans `MatExpansionPanel`

Le `cdkDrag` est appliqué sur `<app-link-category-card>` dans `LinksComponent`. Le `cdkDragHandle` est à l'intérieur du composant (dans `mat-expansion-panel-header`). Cela fonctionne car CDK cherche `cdkDragHandle` dans l'arbre DOM des descendants du `cdkDrag` — pas de restriction au composant Angular.

**Drag désactivé :** `[cdkDragDisabled]="!editMode()"` reste sur le `<app-link-category-card>` dans le template parent (identique à avant). Pas de changement à `LinksComponent.drop()`.

### Responsive — layout catégories

Les AC demandent un layout grid. Cependant, `cdkDropList` pour le drag & drop de catégories fonctionne mieux avec un layout `flex-direction: column`. Sur desktop aussi, garder la liste en colonne (`flex-direction: column; gap: 12px`) est compatible avec le drag & drop et correspond à l'implémentation actuelle. Une véritable CSS grid (`display: grid; repeat(auto-fill, minmax(280px, 1fr))`) peut créer des anomalies visuelles lors du drag CDK sur plusieurs colonnes.

**Décision recommandée :** conserver `flex-direction: column` avec cards full-width pour garantir la fiabilité du drag & drop, et ajuster les paddings/gap entre mobile et desktop via media query. Si le PO/Manu souhaitait un layout multi-colonnes, il faudrait désactiver le drag & drop de catégories en mode lecture (ce qui n'est déjà pas possible — drag uniquement en mode édition).

### Tests — pattern Vitest

Les tests utilisent **Vitest** (`vi.fn()`) et non Jasmine/Karma, malgré ce qu'indique `architecture.md`. Suivre le pattern de `links.component.spec.ts` existant.

Pour `LinkCategoryCardComponent`, créer des mocks simples des services avec `vi.fn()` et `signal()` :

```typescript
// link-category-card.component.spec.ts
describe('LinkCategoryCardComponent', () => {
  it('affiche le nom de la catégorie', () => { ... });
  it('affiche le bon nombre de liens dans le badge', () => { ... });
  it('émet editCategory quand bouton modifier cliqué', () => { ... });
  it('émet deleteCategory quand bouton supprimer cliqué', () => { ... });
  it('émet addLink quand bouton ajouter un lien cliqué', () => { ... });
  it('les contrôles d\'édition sont cachés en mode lecture', () => { ... });
  it('les contrôles d\'édition sont visibles en mode édition', () => { ... });
});
```

Pour `LinkItemComponent` :
```typescript
describe('LinkItemComponent', () => {
  it('affiche le favicon quand faviconUrl est défini', () => { ... });
  it('affiche la lettre initiale si favicon absent', () => { ... });
  it('affiche la lettre initiale si favicon en erreur', () => { ... });
  it('le titre est un lien target="_blank" rel="noopener noreferrer"', () => { ... });
  it('émet editLink quand bouton modifier cliqué', () => { ... });
  it('émet deleteLink quand bouton supprimer cliqué', () => { ... });
});
```

### Arborescence des fichiers

```
frontend/src/app/links/
├── components/
│   ├── category-dialog/          ← inchangé
│   ├── link-dialog/              ← inchangé
│   ├── link-category-card/       ← NOUVEAU
│   │   ├── link-category-card.component.ts
│   │   ├── link-category-card.component.html
│   │   ├── link-category-card.component.scss
│   │   └── link-category-card.component.spec.ts
│   └── link-item/                ← NOUVEAU
│       ├── link-item.component.ts
│       ├── link-item.component.html
│       ├── link-item.component.scss
│       └── link-item.component.spec.ts
├── links.component.ts            ← modifier : imports, handlers
├── links.component.html          ← modifier : utiliser <app-link-category-card>
├── links.component.scss          ← modifier : nettoyer styles déplacés
├── links.component.spec.ts       ← adapter : mock services + retirer failedFavicons
├── link-categories.service.ts    ← inchangé
└── links.service.ts              ← inchangé
```

---

## Project Structure Notes

- Composants standalone (pas de NgModule) — conforme architecture
- `OnPush` sur tous les composants — conforme architecture zoneless
- Fichiers nommés en `kebab-case` — conforme conventions architecture
- `MatExpansionModule` importé directement dans `LinkCategoryCardComponent` (pas dans `LinksComponent`)
- `DragDropModule` importé dans les deux : `LinkCategoryCardComponent` (pour le nested cdkDropList des liens) et `LinksComponent` (pour le cdkDropList des catégories)
- `MatDialogModule` / `MatSnackBarModule` restent dans `LinksComponent` uniquement (dialogs/snackbars ouverts par le parent)

---

## References

- [Source: epics.md#Story 4.5 — critères d'acceptation LinkCategoryCard et LinkItem]
- [Source: ux-design-Dashboard.md#LinkCategoryCard — anatomy, states, interactions]
- [Source: ux-design-Dashboard.md#LinkItem — anatomy, states, accessibility]
- [Source: ux-design-Dashboard.md#Badges de statut — Pattern AM3 — utiliser span pas mat-chip]
- [Source: architecture.md#Conventions Angular Material 3 — mat-chip standalone pas de fond coloré]
- [Source: architecture.md#Change detection — Zoneless + signals + OnPush]
- [Source: architecture.md#Composants : standalone (pas de NgModule)]
- [Source: epics.md#UX-DR5 — LinkCategoryCard collapsible, @Input() editMode]
- [Source: epics.md#UX-DR6 — LinkItem favicon 16×16, fallback lettre initiale]
- [Source: 4-4-toggle-mode-lecture-mode-edition.md#Dev Notes — pattern .edit-controls + [attr.inert] patch accessibilité]
- [Source: 4-4-toggle-mode-lecture-mode-edition.md#Dev Notes — Tests Vitest vi.fn(), pas Jasmine]
- [Source: 4-4-toggle-mode-lecture-mode-edition.md#Dev Notes — Pas de composants LinkCategoryCard/LinkItem dans scope 4.4]
- [Source: frontend/src/app/links/links.component.ts — état actuel à refactorer]
- [Source: frontend/src/app/links/links.component.html — template actuel à décomposer]
- [Source: frontend/src/app/links/links.component.scss — .edit-controls pattern à dupliquer dans sous-composants]

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-19)

### Completion Notes List

- Créé `LinkCategoryCardComponent` (standalone, OnPush) avec `MatExpansionPanel`, `cdkDropList` imbriqué pour liens, `dropLink()` local, et émission `reorderLinks` vers le parent.
- Créé `LinkItemComponent` (standalone, OnPush) avec signal local `hasFaviconError`, favicon/initiale, lien `target="_blank" rel="noopener noreferrer"`, et contrôles édition via `.edit-controls`.
- Mis à jour `LinksComponent` : suppression de `failedFavicons` + `onFaviconError()` + `dropLink()`, ajout de `handleReorderLinks()`, template refactoré avec `<app-link-category-card>`.
- SCSS nettoyé dans `links.component.scss` (styles déplacés dans sous-composants) ; pattern `.edit-controls` redéfini dans chaque composant (isolation ViewEncapsulation).
- `links.component.spec.ts` adapté : remplacement des tests `dropLink()` par `handleReorderLinks()`, retrait de `failedFavicons`.
- 54 tests passent (5 fichiers : links, link-category-card, link-item, link-categories.service, links.service).

### File List

- `frontend/src/app/links/components/link-category-card/link-category-card.component.ts` (créé)
- `frontend/src/app/links/components/link-category-card/link-category-card.component.html` (créé)
- `frontend/src/app/links/components/link-category-card/link-category-card.component.scss` (créé)
- `frontend/src/app/links/components/link-category-card/link-category-card.component.spec.ts` (créé)
- `frontend/src/app/links/components/link-item/link-item.component.ts` (créé)
- `frontend/src/app/links/components/link-item/link-item.component.html` (créé)
- `frontend/src/app/links/components/link-item/link-item.component.scss` (créé)
- `frontend/src/app/links/components/link-item/link-item.component.spec.ts` (créé)
- `frontend/src/app/links/links.component.ts` (modifié)
- `frontend/src/app/links/links.component.html` (modifié)
- `frontend/src/app/links/links.component.scss` (modifié)
- `frontend/src/app/links/links.component.spec.ts` (modifié)

### Change Log

- 2026-05-19 : Implémentation complète — création de `LinkCategoryCardComponent` et `LinkItemComponent`, refactoring de `LinksComponent` (template + TS + SCSS), 54 tests passent.
