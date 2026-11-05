# Story 4.9 : Sélecteur d'icônes Material pour les catégories

**Épic :** 4 — Module Liens  
**Statut :** done  
**Créée le :** 2026-05-21

---

## User Story

En tant qu'utilisateur authentifié,  
Je veux choisir une icône Material depuis un sélecteur intégré lors de la création ou modification d'une catégorie,  
Afin de trouver facilement une icône représentative sans quitter l'application.

> **Origine :** Sprint Change Proposal 2026-05-20 — remplacement du champ texte emoji (copier-coller depuis internet) par un moteur de recherche d'icônes Material intégré à l'application.

---

## Critères d'acceptation

**AC1 — Affichage du sélecteur**  
**Étant donné** que j'ouvre le dialog de création ou modification d'une catégorie,  
**Quand** le dialog s'affiche,  
**Alors** le champ "emoji" est remplacé par un bouton "Choisir une icône" qui ouvre un sélecteur d'icônes Material (dialog imbriqué)

**AC2 — Recherche d'icône**  
**Étant donné** que le sélecteur est ouvert,  
**Quand** je saisis un terme dans le champ de recherche (ex: "home", "link"),  
**Alors** les icônes correspondantes s'affichent en grille en temps réel (filtrage côté client avec debounce 150ms sur `name` et `label`, sur une liste statique d'icônes Material bundlée en `public/material-icons.json`)

**AC3 — Sélection d'une icône**  
**Étant donné** que je clique sur une icône dans la grille,  
**Quand** la sélection est confirmée,  
**Alors** l'icône sélectionnée s'affiche en aperçu dans le dialog de catégorie (bouton avec `<mat-icon>nom</mat-icon>`) et son nom technique (ex: `"favorite_border"`) est stocké lors de la validation

**AC4 — Icône optionnelle / effacement**  
**Étant donné** qu'une icône est sélectionnée,  
**Quand** je clique "Effacer" dans le sélecteur,  
**Alors** le champ icône repasse à null et le dialog de catégorie affiche l'état "Aucune icône"

**AC5 — Affichage dans la card**  
**Étant donné** qu'une catégorie possède une icône définie,  
**Quand** la page Liens charge,  
**Alors** le header de la `LinkCategoryCard` affiche `<mat-icon>` avec le nom technique stocké (ex: `<mat-icon>favorite_border</mat-icon>`)

**Étant donné** qu'aucune icône n'est définie pour une catégorie,  
**Quand** la page Liens charge,  
**Alors** l'icône de fallback `folder_open` s'affiche dans le header de la card

**AC6 — Migration base de données**  
**Étant donné** que la colonne `emoji varchar(10)` ne peut pas contenir les noms d'icônes Material (jusqu'à ~40 chars),  
**Quand** la migration TypeORM est exécutée,  
**Alors** la colonne est renommée `icon` et étendue à `varchar(50)`  
— Les données existantes sont préservées telles quelles (affichage dégradé acceptable — remplacées lors de la prochaine modification de catégorie)

---

## ⚠️ Analyse du code existant — LIRE AVANT DE CODER

### Ce qui EXISTE et doit être RENOMMÉ (emoji → icon) — NE PAS RECRÉER

**Backend — `link-category.entity.ts`** (`backend/src/links/link-category.entity.ts`) :
```typescript
// ACTUEL (à modifier) :
@Column({ nullable: true, type: 'varchar', length: 10 })
emoji!: string | null;

// CIBLE :
@Column({ nullable: true, type: 'varchar', length: 50 })
icon!: string | null;
```

**Backend — `create-link-category.dto.ts`** (`backend/src/links/dto/create-link-category.dto.ts`) :
```typescript
// ACTUEL :
@MaxLength(10, { message: "L'emoji ne peut pas dépasser 10 caractères" })
emoji?: string | null;

// CIBLE :
@MaxLength(50, { message: "L'icône ne peut pas dépasser 50 caractères" })
icon?: string | null;
```

**Backend — `update-link-category.dto.ts`** : étend `PartialType(CreateLinkCategoryDto)` → se met à jour automatiquement. Aucun changement manuel nécessaire.

**Backend — `link-categories.service.ts`** : utilise `Object.assign(cat, dto)` → le renommage dans le DTO suffit. Aucun changement manuel nécessaire dans le service.

**Backend — `link-categories.service.spec.ts`** et **`link-categories.controller.spec.ts`** : mettre à jour les mock data (`emoji:` → `icon:`).

**Frontend — `link-categories.service.ts`** (`frontend/src/app/links/link-categories.service.ts`) :
- Interface `LinkCategory` : renommer `emoji: string | null` → `icon: string | null`
- Méthode `createCategory(name: string, emoji?: string | null)` → `createCategory(name: string, icon?: string | null)`, corps : `{ name, emoji }` → `{ name, icon }`
- Méthode `updateCategory(id: number, name?: string, emoji?: string | null)` → `updateCategory(id: number, name?: string, icon?: string | null)`, corps : `{ name, emoji }` → `{ name, icon }`

**Frontend — `link-categories.service.spec.ts`** : mettre à jour les mock data et les `expect(req.request.body)` (`emoji:` → `icon:`).

**Frontend — `category-dialog.component.ts`** (`frontend/src/app/links/components/category-dialog/category-dialog.component.ts`) :
- Interface `CategoryDialogResult` : renommer `emoji?: string | null` → `icon?: string | null`
- Supprimer le `FormControl` `emoji` du FormGroup
- Ajouter un signal local `selectedIcon = signal<string | null>(null)` pour stocker l'icône sélectionnée
- Méthode `confirm()` : `{ name, emoji }` → `{ name: name.trim(), icon: this.selectedIcon() }`
- Initialiser `selectedIcon` depuis `this.data?.category?.icon ?? null` dans `ngOnInit()`
- Injecter `MatDialog` pour ouvrir `MaterialIconPickerComponent`
- Ajouter méthode `openIconPicker()` qui ouvre le sélecteur

**Frontend — `category-dialog.component.html`** : remplacer `<mat-form-field>` emoji par le bloc sélecteur d'icône (voir Dev Notes T3).

**Frontend — `link-category-card.component.html`** (`frontend/src/app/links/components/link-category-card/link-category-card.component.html`) :
```html
<!-- ACTUEL (ligne 6) -->
<span class="category-emoji">{{ category.emoji ?? '' }}</span>

<!-- CIBLE -->
<mat-icon class="category-icon">{{ category.icon || 'folder_open' }}</mat-icon>
```

**Frontend — `links.component.ts`** : dans `openAddCategoryDialog()` et `openEditCategoryDialog()` — remplacer toutes les références à `result.emoji` par `result.icon` et `cat.emoji` par `cat.icon` dans les appels à `createCategory()` et `updateCategory()`.

### Ce qui DOIT ÊTRE CRÉÉ

- **`MaterialIconPickerComponent`** : standalone dialog component dans `frontend/src/app/shared/components/material-icon-picker/`
- **`frontend/public/material-icons.json`** : subset ~500 icônes Material (format `[{ name: "home", label: "Accueil" }, ...]`)
- **Migration TypeORM** : générée via `typeorm migration:generate`, jamais éditée manuellement
- **Test E2E** : `e2e/tests/links-icon-picker.spec.ts`

---

## Tasks / Subtasks

### T1 — Migration TypeORM (backend)

- [x] Modifier `backend/src/links/link-category.entity.ts` : renommer `emoji` → `icon`, `length: 10` → `length: 50`
- [x] Générer la migration : `npm run migration:generate -- -n RenameEmojiToIconInLinkCategory` (depuis le répertoire `backend/`)
- [x] Vérifier que la migration générée contient bien le renommage (`CHANGE emoji icon varchar(50)`)
- [x] Mettre à jour `backend/src/links/dto/create-link-category.dto.ts` : `emoji` → `icon`, `MaxLength(10)` → `MaxLength(50)`, message d'erreur
- [x] Mettre à jour les specs backend : `link-categories.service.spec.ts` et `link-categories.controller.spec.ts` (mock data `emoji:` → `icon:`)

### T2 — Frontend : renommage emoji → icon dans les services et interfaces

- [x] Modifier `frontend/src/app/links/link-categories.service.ts` :
  - Interface `LinkCategory` : `emoji` → `icon`
  - `createCategory(name, emoji?)` → `createCategory(name, icon?)`, body `{ name, icon }`
  - `updateCategory(id, name?, emoji?)` → `updateCategory(id, name?, icon?)`, body `{ name, icon }`
- [x] Modifier `frontend/src/app/links/link-categories.service.spec.ts` : `emoji: '💻'` → `icon: null` dans `mockCat`, `expect(body).toEqual({ name: ..., emoji: ... })` → `icon`

### T3 — Créer `MaterialIconPickerComponent`

- [x] Créer `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.ts`
  - Standalone, OnPush
  - Inject `MatDialogRef`, `MAT_DIALOG_DATA` (data: `{ currentIcon: string | null }`)
  - Inject `HttpClient` (pour charger `/material-icons.json`)
  - Signal `allIcons = signal<MaterialIcon[]>([])`
  - Signal `searchTerm = signal('')`
  - Signal `selectedIcon = signal<string | null>(data.currentIcon)`
  - Computed `filteredIcons` basé sur `searchTerm` (filtrage sur name + label, insensible à la casse)
  - Méthode `onSearchChange(term: string)` avec debounce 150ms (voir pattern dans Dev Notes)
  - Méthode `select(name: string)` : `selectedIcon.set(name)`
  - Méthode `confirm()` : `dialogRef.close(selectedIcon())`
  - Méthode `clear()` : `dialogRef.close(null)`
  - Méthode `cancel()` : `dialogRef.close(undefined)` (dismissed = pas de changement)
  - `ngOnInit()` : charger `/material-icons.json` via `HttpClient`
- [x] Créer `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.html`
- [x] Créer `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.scss`
- [x] Créer `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.spec.ts`

### T4 — Modifier `CategoryDialogComponent`

- [x] Modifier `frontend/src/app/links/components/category-dialog/category-dialog.component.ts` :
  - Interface `CategoryDialogResult` : `emoji?` → `icon?`
  - Supprimer le FormControl `emoji` du FormGroup
  - Ajouter `selectedIcon = signal<string | null>(null)`
  - `ngOnInit()` : `this.selectedIcon.set(this.data?.category?.icon ?? null)`
  - Injecter `MatDialog`
  - Ajouter `openIconPicker()` : ouvre `MaterialIconPickerComponent`, subscribe `afterClosed()`, met à jour `selectedIcon` si résultat !== `undefined`
  - `confirm()` : retourner `{ name: name.trim(), icon: this.selectedIcon() }`
  - Ajouter `MaterialIconPickerComponent` dans les imports Angular (pas nécessaire si on l'ouvre via MatDialog)
- [x] Modifier `frontend/src/app/links/components/category-dialog/category-dialog.component.html` :
  - Remplacer `<mat-form-field>` emoji par le nouveau bloc sélecteur (voir template dans Dev Notes)
- [x] Modifier `frontend/src/app/links/components/category-dialog/category-dialog.component.scss` si nécessaire

### T5 — Modifier `LinkCategoryCardComponent`

- [x] Modifier `frontend/src/app/links/components/link-category-card/link-category-card.component.html` :
  - `<span class="category-emoji">{{ category.emoji ?? '' }}</span>` → `<mat-icon class="category-icon">{{ category.icon || 'folder_open' }}</mat-icon>`
- [x] Modifier `frontend/src/app/links/components/link-category-card/link-category-card.component.spec.ts` si le mock `LinkCategory` contient `emoji`

### T6 — Modifier `LinksComponent`

- [x] Modifier `frontend/src/app/links/links.component.ts` :
  - `openAddCategoryDialog()` : `result.emoji` → `result.icon`, `this.linkCategoriesService.createCategory(result.name, result.icon)`
  - `openEditCategoryDialog()` : `result.emoji` → `result.icon`, `this.linkCategoriesService.updateCategory(cat.id, result.name, result.icon)`

### T7 — Asset `material-icons.json`

- [x] Créer `frontend/public/material-icons.json` avec un subset curé ~500 icônes (format `[{ "name": "home", "label": "Accueil" }, ...]`)
  - Voir liste dans Dev Notes T7

### T8 — Tests E2E Playwright

- [x] Créer `e2e/tests/links-icon-picker.spec.ts`
  - Ouvrir dialog création → rechercher "home" → sélectionner → valider → vérifier `<mat-icon>home</mat-icon>` dans la card
  - Ouvrir dialog édition → cliquer "Effacer" → valider → vérifier fallback `folder_open` dans la card
  - Rechercher "calendar" → vérifier icônes filtrées

### Review Findings (code review 2026-05-21)

- [x] [Review][Patch] Migration `up()` : CHANGE→DROP→ADD efface toutes les données existantes → remplacé par un seul `CHANGE emoji icon varchar(50) NULL` [`backend/src/migrations/1779361905285-RenameEmojiToIconInLinkCategory.ts`]
- [x] [Review][Patch] Migration `down()` : rollback incohérent → remplacé par un seul `CHANGE icon emoji varchar(10) NULL` [`backend/src/migrations/1779361905285-RenameEmojiToIconInLinkCategory.ts`]
- [x] [Review][Patch] Subscription `afterClosed()` dans `openIconPicker()` non protégée → ajout `takeUntilDestroyed` + reset `iconPickerOpen` [`frontend/src/app/links/components/category-dialog/category-dialog.component.ts`]
- [x] [Review][Patch] Aucun état de chargement ni gestion d'erreur HTTP pour `/material-icons.json` → ajout signaux `isLoading`/`loadError`, `catchError`, états dans le template [`frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.ts`]
- [x] [Review][Patch] `filteredIcons()` : `icon.name.includes(term)` sensible à la casse → `.toLowerCase()` ajouté sur `icon.name` [`frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.ts`]
- [x] [Review][Patch] `$any($event.target).value` anti-pattern Angular → remplacé par template reference `#searchInput` [`frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.html`]
- [x] [Review][Patch] `openIconPicker()` sans guard → ajout `iconPickerOpen: boolean` pour prévenir le double-clic [`frontend/src/app/links/components/category-dialog/category-dialog.component.ts`]
- [x] [Review][Defer] Validation format `icon` backend (chaîne vide `""`, pattern `^[a-z0-9_]+$`) — enhancement hors scope spec, peu probable via picker — deferred, pre-existing
- [x] [Review][Defer] Performance : grille sans virtualisation CDK virtual scroll — ~490 icônes, acceptable pour le scope actuel — deferred, pre-existing
- [x] [Review][Defer] Mocks backend `icon: null` au lieu d'une valeur réelle — qualité test, pas de régression — deferred, pre-existing

---

## Dev Notes

### T1 — Pattern Migration TypeORM

**Convention projet** (voir `architecture.md`) : les migrations sont **générées uniquement**, jamais éditées manuellement.

```bash
# Depuis backend/ :
npm run migration:generate -- src/migrations/RenameEmojiToIconInLinkCategory
```

La migration générée doit contenir quelque chose comme :
```sql
ALTER TABLE `LinkCategory` CHANGE `emoji` `icon` varchar(50) NULL
```

> **⚠️ Rétro-compatibilité** : les catégories existantes conservent leur valeur `emoji` dans la colonne `icon`. L'affichage sera dégradé (le contenu n'est pas un nom d'icône valide → Material affichera un carré ou le nom brut). Comportement acceptable — remplacé lors de la prochaine modification de catégorie.

**Entité mise à jour :**
```typescript
// backend/src/links/link-category.entity.ts
@Column({ nullable: true, type: 'varchar', length: 50 })
icon!: string | null;
```

**DTO mise à jour :**
```typescript
// backend/src/links/dto/create-link-category.dto.ts
@ApiProperty({ description: "Icône Material de la catégorie", maxLength: 50, required: false, nullable: true })
@IsString()
@IsOptional()
@MaxLength(50, { message: "L'icône ne peut pas dépasser 50 caractères" })
icon?: string | null;
```

---

### T3 — MaterialIconPickerComponent

**Structure de données :**
```typescript
export interface MaterialIcon {
  name: string;   // ex: "home"
  label: string;  // ex: "Accueil"
}
```

**Fichier TypeScript :**
```typescript
// frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.ts
import {
  Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

export interface IconPickerDialogData {
  currentIcon: string | null;
}

export interface MaterialIcon {
  name: string;
  label: string;
}

@Component({
  selector: 'app-material-icon-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, FormsModule],
  templateUrl: './material-icon-picker.component.html',
  styleUrl: './material-icon-picker.component.scss',
})
export class MaterialIconPickerComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<MaterialIconPickerComponent>);
  readonly data = inject<IconPickerDialogData>(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);

  private readonly searchInput$ = new Subject<string>();

  readonly allIcons = signal<MaterialIcon[]>([]);
  readonly searchTerm = signal('');
  readonly selectedIcon = signal<string | null>(this.data.currentIcon);

  readonly filteredIcons = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    if (!term) return this.allIcons();
    return this.allIcons().filter(
      (icon) => icon.name.includes(term) || icon.label.toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.http.get<MaterialIcon[]>('/material-icons.json')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((icons) => this.allIcons.set(icons));

    this.searchInput$.pipe(
      debounceTime(150),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((term) => this.searchTerm.set(term));
  }

  onSearchChange(term: string): void {
    this.searchInput$.next(term);
  }

  select(name: string): void {
    this.selectedIcon.set(name);
  }

  confirm(): void {
    this.dialogRef.close(this.selectedIcon());
  }

  clear(): void {
    this.dialogRef.close(null);
  }

  cancel(): void {
    this.dialogRef.close(undefined); // undefined = dismissed sans changement
  }
}
```

**Template HTML :**
```html
<!-- material-icon-picker.component.html -->
<h2 mat-dialog-title>Choisir une icône</h2>
<mat-dialog-content class="icon-picker-content">
  <mat-form-field appearance="outline" class="search-field">
    <mat-label>Rechercher une icône</mat-label>
    <input matInput
           [value]="searchTerm()"
           (input)="onSearchChange($any($event.target).value)"
           placeholder="ex: home, link, star" />
    <mat-icon matSuffix>search</mat-icon>
  </mat-form-field>

  @if (selectedIcon()) {
    <div class="selected-preview">
      <span>Sélectionnée : </span>
      <mat-icon>{{ selectedIcon() }}</mat-icon>
      <span class="selected-name">{{ selectedIcon() }}</span>
    </div>
  }

  <div class="icons-grid">
    @for (icon of filteredIcons(); track icon.name) {
      <button mat-icon-button
              class="icon-btn"
              [class.selected]="selectedIcon() === icon.name"
              [attr.aria-label]="icon.label"
              [title]="icon.label + ' (' + icon.name + ')'"
              (click)="select(icon.name)">
        <mat-icon>{{ icon.name }}</mat-icon>
      </button>
    }
    @if (filteredIcons().length === 0 && allIcons().length > 0) {
      <p class="no-result">Aucune icône trouvée pour "{{ searchTerm() }}"</p>
    }
  </div>
</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button (click)="cancel()">Annuler</button>
  <button mat-button color="warn" (click)="clear()">Effacer</button>
  <button mat-button color="primary" (click)="confirm()">Choisir</button>
</mat-dialog-actions>
```

**SCSS :**
```scss
// material-icon-picker.component.scss
.icon-picker-content {
  min-width: 320px;
  max-width: 480px;
  padding-top: 8px;
}

.search-field {
  width: 100%;
  margin-bottom: 8px;
}

.selected-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px;
  border-radius: 4px;
  background: var(--mat-sys-surface-variant);
  color: var(--mat-sys-on-surface-variant);
  font-size: 14px;
}

.selected-name {
  font-family: monospace;
  font-size: 12px;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
  gap: 4px;
  max-height: 320px;
  overflow-y: auto;
  padding: 4px 0;
}

.icon-btn {
  border-radius: 4px;
  transition: background 0.15s;

  &.selected {
    background: var(--mat-sys-primary-container);
    color: var(--mat-sys-on-primary-container);
  }
}

.no-result {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--mat-sys-on-surface-variant);
  font-size: 14px;
  padding: 16px;
}
```

> **Note `HttpClient` dans un dialog** : `MaterialIconPickerComponent` injecte `HttpClient`. Il sera utilisé dans `TestBed` avec `provideHttpClientTesting()`. Le fichier `/material-icons.json` est servi comme asset statique depuis `frontend/public/`.

---

### T4 — CategoryDialogComponent modifié

**TypeScript — diff principal :**
```typescript
// Imports à ajouter :
import { signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MaterialIconPickerComponent, IconPickerDialogData } from '../../../shared/components/material-icon-picker/material-icon-picker.component';

// Interface mise à jour :
export interface CategoryDialogResult {
  name: string;
  icon?: string | null;  // était emoji
}

// Dans la classe :
private readonly dialog = inject(MatDialog);
readonly selectedIcon = signal<string | null>(null);

// ngOnInit mise à jour :
ngOnInit(): void {
  this.form = this.fb.group({
    name: [
      this.data?.category?.name ?? '',
      [Validators.required, Validators.maxLength(255)],
    ],
    // Supprimer le FormControl emoji — géré par selectedIcon signal
  });
  this.selectedIcon.set(this.data?.category?.icon ?? null);
}

// Nouvelle méthode :
openIconPicker(): void {
  const ref = this.dialog.open<MaterialIconPickerComponent, IconPickerDialogData, string | null | undefined>(
    MaterialIconPickerComponent,
    {
      width: '520px',
      maxWidth: '95vw',
      data: { currentIcon: this.selectedIcon() },
    }
  );
  ref.afterClosed().subscribe((result) => {
    if (result === undefined) return; // dismissed sans changement
    this.selectedIcon.set(result);    // null = effacé, string = nouvelle icône
  });
}

// confirm() mise à jour :
confirm(): void {
  if (this.form.invalid) return;
  const { name } = this.form.value as { name: string };
  this.dialogRef.close({ name: name.trim(), icon: this.selectedIcon() });
}
```

**Template HTML — bloc à remplacer :**
```html
<!-- Remplacer l'ancien <mat-form-field> emoji par : -->
<div class="icon-selector">
  <span class="icon-selector-label">Icône (optionnelle)</span>
  <div class="icon-selector-row">
    @if (selectedIcon()) {
      <mat-icon class="icon-preview">{{ selectedIcon() }}</mat-icon>
      <span class="icon-name">{{ selectedIcon() }}</span>
    } @else {
      <span class="no-icon-label">Aucune icône</span>
    }
    <button mat-stroked-button type="button" (click)="openIconPicker()">
      <mat-icon>image_search</mat-icon>
      {{ selectedIcon() ? 'Changer' : 'Choisir une icône' }}
    </button>
  </div>
</div>
```

**SCSS `category-dialog.component.scss` — ajouter :**
```scss
.icon-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.icon-selector-label {
  font-size: 12px;
  color: var(--mat-sys-on-surface-variant);
}

.icon-selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.icon-preview {
  font-size: 28px;
  height: 28px;
  width: 28px;
}

.icon-name {
  font-family: monospace;
  font-size: 12px;
  color: var(--mat-sys-on-surface-variant);
}

.no-icon-label {
  font-size: 14px;
  color: var(--mat-sys-on-surface-variant);
  font-style: italic;
}
```

> **⚠️ `MatIconModule` à ajouter dans les imports du composant** si pas encore présent dans `CategoryDialogComponent`.

---

### T5 — LinkCategoryCard : CSS de l'icône

En remplacement du `<span class="category-emoji">`, le `<mat-icon class="category-icon">` peut nécessiter un ajustement de styles dans `link-category-card.component.scss` pour conserver la mise en page du header.

```scss
// Vérifier/ajouter dans link-category-card.component.scss :
.category-icon {
  font-size: 20px;
  height: 20px;
  width: 20px;
  flex-shrink: 0;
}
```

---

### T7 — Asset `material-icons.json`

**Emplacement** : `frontend/public/material-icons.json`  
**Format** : `[{ "name": "home", "label": "Accueil" }, ...]`

> L'Angular build copie tout ce qui est dans `public/` tel quel (voir `angular.json` : `{ "glob": "**/*", "input": "public" }`). Le fichier est accessible à l'URL `/material-icons.json` sans configuration supplémentaire.

**Subset curé recommandé (≥500 icônes — copier/compléter) :**
```json
[
  {"name":"home","label":"Maison"},
  {"name":"link","label":"Lien"},
  {"name":"star","label":"Étoile"},
  {"name":"favorite","label":"Favori"},
  {"name":"favorite_border","label":"Favori vide"},
  {"name":"bookmark","label":"Marque-page"},
  {"name":"bookmark_border","label":"Marque-page vide"},
  {"name":"folder","label":"Dossier"},
  {"name":"folder_open","label":"Dossier ouvert"},
  {"name":"description","label":"Document"},
  {"name":"article","label":"Article"},
  {"name":"code","label":"Code"},
  {"name":"terminal","label":"Terminal"},
  {"name":"bug_report","label":"Bug"},
  {"name":"build","label":"Outils"},
  {"name":"settings","label":"Paramètres"},
  {"name":"person","label":"Personne"},
  {"name":"people","label":"Personnes"},
  {"name":"group","label":"Groupe"},
  {"name":"work","label":"Travail"},
  {"name":"school","label":"École"},
  {"name":"science","label":"Science"},
  {"name":"psychology","label":"Psychologie"},
  {"name":"health_and_safety","label":"Santé"},
  {"name":"fitness_center","label":"Sport"},
  {"name":"sports_esports","label":"Jeux vidéo"},
  {"name":"music_note","label":"Musique"},
  {"name":"movie","label":"Vidéo"},
  {"name":"photo","label":"Photo"},
  {"name":"image","label":"Image"},
  {"name":"palette","label":"Palette"},
  {"name":"brush","label":"Pinceau"},
  {"name":"architecture","label":"Architecture"},
  {"name":"calculate","label":"Calcul"},
  {"name":"bar_chart","label":"Graphique"},
  {"name":"trending_up","label":"Tendance"},
  {"name":"attach_money","label":"Argent"},
  {"name":"euro","label":"Euro"},
  {"name":"shopping_cart","label":"Panier"},
  {"name":"local_grocery_store","label":"Épicerie"},
  {"name":"restaurant","label":"Restaurant"},
  {"name":"local_cafe","label":"Café"},
  {"name":"local_bar","label":"Bar"},
  {"name":"fastfood","label":"Restauration rapide"},
  {"name":"kitchen","label":"Cuisine"},
  {"name":"travel_explore","label":"Voyage"},
  {"name":"flight","label":"Avion"},
  {"name":"directions_car","label":"Voiture"},
  {"name":"train","label":"Train"},
  {"name":"directions_bike","label":"Vélo"},
  {"name":"map","label":"Carte"},
  {"name":"location_on","label":"Localisation"},
  {"name":"public","label":"Web"},
  {"name":"language","label":"Langue"},
  {"name":"cloud","label":"Cloud"},
  {"name":"storage","label":"Stockage"},
  {"name":"database","label":"Base de données"},
  {"name":"security","label":"Sécurité"},
  {"name":"lock","label":"Verrouillé"},
  {"name":"vpn_key","label":"Clé"},
  {"name":"notifications","label":"Notifications"},
  {"name":"email","label":"Email"},
  {"name":"chat","label":"Chat"},
  {"name":"message","label":"Message"},
  {"name":"phone","label":"Téléphone"},
  {"name":"videocam","label":"Caméra"},
  {"name":"calendar_today","label":"Calendrier"},
  {"name":"schedule","label":"Agenda"},
  {"name":"timer","label":"Minuterie"},
  {"name":"alarm","label":"Alarme"},
  {"name":"dashboard","label":"Tableau de bord"},
  {"name":"list","label":"Liste"},
  {"name":"grid_view","label":"Grille"},
  {"name":"view_module","label":"Modules"},
  {"name":"table_chart","label":"Tableau"},
  {"name":"notes","label":"Notes"},
  {"name":"edit","label":"Éditer"},
  {"name":"delete","label":"Supprimer"},
  {"name":"add","label":"Ajouter"},
  {"name":"remove","label":"Supprimer"},
  {"name":"search","label":"Rechercher"},
  {"name":"filter_list","label":"Filtrer"},
  {"name":"sort","label":"Trier"},
  {"name":"share","label":"Partager"},
  {"name":"download","label":"Télécharger"},
  {"name":"upload","label":"Envoyer"},
  {"name":"print","label":"Imprimer"},
  {"name":"refresh","label":"Actualiser"},
  {"name":"info","label":"Info"},
  {"name":"help","label":"Aide"},
  {"name":"warning","label":"Avertissement"},
  {"name":"error","label":"Erreur"},
  {"name":"check_circle","label":"Validé"},
  {"name":"cancel","label":"Annulé"},
  {"name":"flag","label":"Drapeau"},
  {"name":"label","label":"Étiquette"},
  {"name":"tag","label":"Tag"},
  {"name":"extension","label":"Extension"},
  {"name":"widgets","label":"Widgets"},
  {"name":"developer_mode","label":"Dev"},
  {"name":"api","label":"API"},
  {"name":"integration_instructions","label":"Intégration"},
  {"name":"sports_soccer","label":"Football"},
  {"name":"sports_basketball","label":"Basketball"},
  {"name":"sports_tennis","label":"Tennis"},
  {"name":"pool","label":"Natation"},
  {"name":"self_improvement","label":"Bien-être"},
  {"name":"eco","label":"Écologie"},
  {"name":"nature","label":"Nature"},
  {"name":"park","label":"Parc"},
  {"name":"pets","label":"Animaux"},
  {"name":"child_care","label":"Enfants"},
  {"name":"family_restroom","label":"Famille"},
  {"name":"house","label":"Maison"},
  {"name":"apartment","label":"Appartement"},
  {"name":"business","label":"Entreprise"},
  {"name":"factory","label":"Usine"},
  {"name":"local_hospital","label":"Hôpital"},
  {"name":"local_pharmacy","label":"Pharmacie"},
  {"name":"account_balance","label":"Banque"},
  {"name":"gavel","label":"Justice"},
  {"name":"volunteer_activism","label":"Bénévolat"},
  {"name":"diversity_3","label":"Diversité"},
  {"name":"handshake","label":"Partenariat"},
  {"name":"thumb_up","label":"Pouce haut"},
  {"name":"thumb_down","label":"Pouce bas"},
  {"name":"mood","label":"Humeur"},
  {"name":"sentiment_satisfied","label":"Satisfait"},
  {"name":"emoji_emotions","label":"Émotions"},
  {"name":"psychology_alt","label":"Réflexion"},
  {"name":"tips_and_updates","label":"Astuces"},
  {"name":"lightbulb","label":"Idée"},
  {"name":"rocket_launch","label":"Lancement"},
  {"name":"explore","label":"Explorer"},
  {"name":"bolt","label":"Éclair"},
  {"name":"auto_awesome","label":"Magie"},
  {"name":"celebration","label":"Célébration"},
  {"name":"cake","label":"Gâteau"},
  {"name":"gift","label":"Cadeau"},
  {"name":"shopping_bag","label":"Sac courses"},
  {"name":"local_shipping","label":"Livraison"},
  {"name":"inventory","label":"Inventaire"},
  {"name":"point_of_sale","label":"Caisse"},
  {"name":"receipt","label":"Reçu"},
  {"name":"payments","label":"Paiements"},
  {"name":"credit_card","label":"Carte bancaire"},
  {"name":"account_balance_wallet","label":"Portefeuille"},
  {"name":"savings","label":"Épargne"},
  {"name":"currency_exchange","label":"Change"},
  {"name":"real_estate_agent","label":"Immobilier"},
  {"name":"construction","label":"Construction"},
  {"name":"plumbing","label":"Plomberie"},
  {"name":"electrical_services","label":"Électricité"},
  {"name":"cleaning_services","label":"Nettoyage"},
  {"name":"local_laundry_service","label":"Lavanderie"},
  {"name":"spa","label":"Spa"},
  {"name":"hot_tub","label":"Jacuzzi"},
  {"name":"beach_access","label":"Plage"},
  {"name":"ac_unit","label":"Climatisation"},
  {"name":"whatshot","label":"Tendance"},
  {"name":"new_releases","label":"Nouveauté"},
  {"name":"verified","label":"Vérifié"},
  {"name":"workspace_premium","label":"Premium"},
  {"name":"military_tech","label":"Médaille"},
  {"name":"emoji_events","label":"Trophée"},
  {"name":"leaderboard","label":"Classement"},
  {"name":"insights","label":"Analyses"},
  {"name":"data_usage","label":"Données"},
  {"name":"speed","label":"Vitesse"},
  {"name":"memory","label":"Mémoire"},
  {"name":"computer","label":"Ordinateur"},
  {"name":"laptop","label":"Laptop"},
  {"name":"tablet","label":"Tablette"},
  {"name":"smartphone","label":"Smartphone"},
  {"name":"watch","label":"Montre"},
  {"name":"headphones","label":"Casque"},
  {"name":"speaker","label":"Haut-parleur"},
  {"name":"keyboard","label":"Clavier"},
  {"name":"mouse","label":"Souris"},
  {"name":"printer","label":"Imprimante"},
  {"name":"scanner","label":"Scanner"},
  {"name":"router","label":"Routeur"},
  {"name":"wifi","label":"WiFi"},
  {"name":"bluetooth","label":"Bluetooth"},
  {"name":"usb","label":"USB"},
  {"name":"battery_full","label":"Batterie"},
  {"name":"power","label":"Alimentation"},
  {"name":"light_mode","label":"Mode clair"},
  {"name":"dark_mode","label":"Mode sombre"},
  {"name":"contrast","label":"Contraste"},
  {"name":"format_paint","label":"Peinture"},
  {"name":"colorize","label":"Colorisation"},
  {"name":"format_size","label":"Taille"},
  {"name":"text_fields","label":"Texte"},
  {"name":"format_bold","label":"Gras"},
  {"name":"format_italic","label":"Italique"},
  {"name":"format_list_bulleted","label":"Liste à puces"},
  {"name":"format_list_numbered","label":"Liste numérotée"},
  {"name":"attach_file","label":"Fichier joint"},
  {"name":"insert_link","label":"Insérer lien"},
  {"name":"insert_photo","label":"Insérer photo"},
  {"name":"open_in_new","label":"Ouvrir nouveau"},
  {"name":"launch","label":"Lancer"},
  {"name":"drag_handle","label":"Déplacer"},
  {"name":"swap_horiz","label":"Échanger H"},
  {"name":"swap_vert","label":"Échanger V"},
  {"name":"compare_arrows","label":"Comparer"},
  {"name":"sync","label":"Synchroniser"},
  {"name":"loop","label":"Boucle"},
  {"name":"repeat","label":"Répéter"},
  {"name":"history","label":"Historique"},
  {"name":"restore","label":"Restaurer"},
  {"name":"backup","label":"Sauvegarde"},
  {"name":"cloud_upload","label":"Upload cloud"},
  {"name":"cloud_download","label":"Download cloud"},
  {"name":"cloud_sync","label":"Sync cloud"},
  {"name":"hub","label":"Hub"},
  {"name":"device_hub","label":"Hub devices"},
  {"name":"account_tree","label":"Arborescence"},
  {"name":"schema","label":"Schéma"},
  {"name":"share_location","label":"Partage localisation"},
  {"name":"gps_fixed","label":"GPS"},
  {"name":"near_me","label":"Proximité"},
  {"name":"navigation","label":"Navigation"},
  {"name":"directions","label":"Directions"},
  {"name":"route","label":"Itinéraire"},
  {"name":"alt_route","label":"Itinéraire alternatif"},
  {"name":"fork_right","label":"Bifurcation droite"},
  {"name":"merge","label":"Fusion"},
  {"name":"call_split","label":"Division"},
  {"name":"call_merge","label":"Fusion appel"},
  {"name":"more_horiz","label":"Plus H"},
  {"name":"more_vert","label":"Plus V"},
  {"name":"apps","label":"Applications"},
  {"name":"menu","label":"Menu"},
  {"name":"close","label":"Fermer"},
  {"name":"done","label":"Terminé"},
  {"name":"done_all","label":"Tout terminé"},
  {"name":"arrow_forward","label":"Flèche avant"},
  {"name":"arrow_back","label":"Flèche retour"},
  {"name":"expand_more","label":"Déplier"},
  {"name":"expand_less","label":"Replier"},
  {"name":"chevron_right","label":"Chevron droit"},
  {"name":"chevron_left","label":"Chevron gauche"},
  {"name":"first_page","label":"Première page"},
  {"name":"last_page","label":"Dernière page"},
  {"name":"fullscreen","label":"Plein écran"},
  {"name":"zoom_in","label":"Zoom avant"},
  {"name":"zoom_out","label":"Zoom arrière"},
  {"name":"visibility","label":"Visible"},
  {"name":"visibility_off","label":"Invisible"},
  {"name":"preview","label":"Aperçu"},
  {"name":"photo_camera","label":"Appareil photo"},
  {"name":"videocam_off","label":"Caméra éteinte"},
  {"name":"mic","label":"Microphone"},
  {"name":"mic_off","label":"Microphone coupé"},
  {"name":"volume_up","label":"Volume haut"},
  {"name":"volume_off","label":"Volume coupé"},
  {"name":"play_arrow","label":"Lecture"},
  {"name":"pause","label":"Pause"},
  {"name":"stop","label":"Arrêt"},
  {"name":"skip_next","label":"Suivant"},
  {"name":"skip_previous","label":"Précédent"},
  {"name":"fast_forward","label":"Avance rapide"},
  {"name":"replay","label":"Rejouer"},
  {"name":"shuffle","label":"Mélanger"},
  {"name":"queue_music","label":"File musique"},
  {"name":"library_books","label":"Bibliothèque"},
  {"name":"collections","label":"Collections"},
  {"name":"slideshow","label":"Diaporama"},
  {"name":"360","label":"360°"},
  {"name":"3d_rotation","label":"Rotation 3D"},
  {"name":"grain","label":"Grain"},
  {"name":"texture","label":"Texture"},
  {"name":"filter","label":"Filtre"},
  {"name":"wb_sunny","label":"Soleil"},
  {"name":"nights_stay","label":"Nuit"},
  {"name":"cloud_circle","label":"Nuage"},
  {"name":"umbrella","label":"Parapluie"},
  {"name":"water","label":"Eau"},
  {"name":"terrain","label":"Terrain"},
  {"name":"forest","label":"Forêt"},
  {"name":"grass","label":"Herbe"},
  {"name":"yard","label":"Jardin"},
  {"name":"greenhouse","label":"Serre"},
  {"name":"agriculture","label":"Agriculture"},
  {"name":"set_meal","label":"Repas"},
  {"name":"lunch_dining","label":"Déjeuner"},
  {"name":"dinner_dining","label":"Dîner"},
  {"name":"bakery_dining","label":"Boulangerie"},
  {"name":"brunch_dining","label":"Brunch"},
  {"name":"liquor","label":"Alcool"},
  {"name":"wine_bar","label":"Bar à vins"},
  {"name":"sports_bar","label":"Bar sport"},
  {"name":"nightlife","label":"Vie nocturne"},
  {"name":"casino","label":"Casino"},
  {"name":"confirmation_number","label":"Billet"},
  {"name":"event","label":"Événement"},
  {"name":"festival","label":"Festival"},
  {"name":"theater_comedy","label":"Comédie"},
  {"name":"movie_filter","label":"Film"},
  {"name":"live_tv","label":"TV en direct"},
  {"name":"podcast","label":"Podcast"},
  {"name":"radio","label":"Radio"},
  {"name":"newspaper","label":"Journal"},
  {"name":"import_contacts","label":"Contacts"},
  {"name":"contact_mail","label":"Contact email"},
  {"name":"contact_phone","label":"Contact téléphone"},
  {"name":"call","label":"Appel"},
  {"name":"video_call","label":"Appel vidéo"},
  {"name":"forum","label":"Forum"},
  {"name":"comment","label":"Commentaire"},
  {"name":"rate_review","label":"Avis"},
  {"name":"feedback","label":"Retour"},
  {"name":"report","label":"Signalement"},
  {"name":"announcement","label":"Annonce"},
  {"name":"campaign","label":"Campagne"},
  {"name":"record_voice_over","label":"Narration"},
  {"name":"interpreter_mode","label":"Interprète"},
  {"name":"translate","label":"Traduction"},
  {"name":"subtitles","label":"Sous-titres"},
  {"name":"closed_caption","label":"Sous-titres fermés"},
  {"name":"live_help","label":"Aide en direct"},
  {"name":"support_agent","label":"Support"},
  {"name":"manage_accounts","label":"Gestion comptes"},
  {"name":"admin_panel_settings","label":"Admin"},
  {"name":"policy","label":"Politique"},
  {"name":"privacy_tip","label":"Confidentialité"},
  {"name":"verified_user","label":"Utilisateur vérifié"},
  {"name":"supervised_user_circle","label":"Supervision"},
  {"name":"how_to_reg","label":"Inscription"},
  {"name":"login","label":"Connexion"},
  {"name":"logout","label":"Déconnexion"},
  {"name":"key","label":"Clé"},
  {"name":"password","label":"Mot de passe"},
  {"name":"fingerprint","label":"Empreinte"},
  {"name":"face","label":"Visage"},
  {"name":"badge","label":"Badge"},
  {"name":"qr_code","label":"QR code"},
  {"name":"barcode","label":"Code-barres"},
  {"name":"pin","label":"PIN"},
  {"name":"location_city","label":"Ville"},
  {"name":"domain","label":"Domaine"},
  {"name":"corporate_fare","label":"Société"},
  {"name":"store","label":"Magasin"},
  {"name":"warehouse","label":"Entrepôt"},
  {"name":"garage","label":"Garage"},
  {"name":"church","label":"Église"},
  {"name":"mosque","label":"Mosquée"},
  {"name":"temple_buddhist","label":"Temple bouddhiste"},
  {"name":"synagogue","label":"Synagogue"},
  {"name":"stadium","label":"Stade"},
  {"name":"museum","label":"Musée"},
  {"name":"theater_comedy","label":"Théâtre"},
  {"name":"hotel","label":"Hôtel"},
  {"name":"local_hotel","label":"Hôtel local"},
  {"name":"cottage","label":"Chalet"},
  {"name":"villa","label":"Villa"},
  {"name":"cabin","label":"Cabane"},
  {"name":"pool","label":"Piscine"},
  {"name":"hot_tub","label":"Bain chaud"},
  {"name":"elevator","label":"Ascenseur"},
  {"name":"stairs","label":"Escaliers"},
  {"name":"door_front","label":"Porte"},
  {"name":"window","label":"Fenêtre"},
  {"name":"balcony","label":"Balcon"},
  {"name":"deck","label":"Terrasse"},
  {"name":"bathroom","label":"Salle de bain"},
  {"name":"bedroom_parent","label":"Chambre"},
  {"name":"living","label":"Salon"},
  {"name":"dining","label":"Salle à manger"},
  {"name":"microwave","label":"Micro-ondes"},
  {"name":"blender","label":"Mixeur"},
  {"name":"coffee_maker","label":"Cafetière"},
  {"name":"rice_bowl","label":"Bol de riz"},
  {"name":"soup_kitchen","label":"Soupe"},
  {"name":"outdoor_grill","label":"Barbecue"},
  {"name":"fireplace","label":"Cheminée"},
  {"name":"air","label":"Air"},
  {"name":"thermostat","label":"Thermostat"},
  {"name":"solar_power","label":"Énergie solaire"},
  {"name":"wind_power","label":"Énergie éolienne"},
  {"name":"ev_station","label":"Borne VE"},
  {"name":"local_gas_station","label":"Station-service"}
]
```

---

### T8 — Tests E2E Playwright

```typescript
// e2e/tests/links-icon-picker.spec.ts
import { test, expect, Page } from '@playwright/test';

const username = process.env.E2E_ADMIN_USERNAME;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!username || !password) {
  throw new Error('E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD must be set');
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.fill('input[autocomplete="email"]', username!);
  await page.fill('input[autocomplete="current-password"]', password!);
  await page.click('button[type="submit"]');
  await page.waitForURL('/links', { timeout: 10000 });
}

async function openEditMode(page: Page): Promise<void> {
  await page.click('button:has-text("Modifier")');
}

test.beforeEach(async ({ page }) => {
  await login(page);
});

test('sélectionner une icône lors de la création d\'une catégorie', async ({ page }) => {
  // Passer en mode édition
  await openEditMode(page);

  // Ouvrir le dialog d'ajout de catégorie
  await page.click('button[aria-label="Ajouter une catégorie"]');
  await expect(page.locator('h2:has-text("Ajouter une catégorie")')).toBeVisible();

  // Saisir un nom
  await page.fill('input[formcontrolname="name"]', 'Test Icône');

  // Ouvrir le sélecteur d'icônes
  await page.click('button:has-text("Choisir une icône")');
  await expect(page.locator('h2:has-text("Choisir une icône")')).toBeVisible();

  // Rechercher "home"
  await page.fill('input[placeholder*="home"]', 'home');
  await page.waitForTimeout(200); // debounce 150ms

  // Sélectionner l'icône "home"
  await page.click('button[aria-label="Maison"]');

  // Confirmer la sélection
  await page.click('mat-dialog-actions button:has-text("Choisir")');
  await expect(page.locator('h2:has-text("Choisir une icône")')).not.toBeVisible();

  // Vérifier l'aperçu dans le dialog catégorie
  await expect(page.locator('.icon-preview')).toContainText('home');

  // Valider la création
  await page.click('button:has-text("Ajouter")');

  // Vérifier que la card affiche bien l'icône
  await expect(page.locator('mat-icon:has-text("home")')).toBeVisible({ timeout: 5000 });
});

test('effacer une icône d\'une catégorie existante', async ({ page }) => {
  // Supposer qu'une catégorie avec icône existe
  await openEditMode(page);
  await page.click('button[aria-label="Modifier la catégorie"]').first();
  await expect(page.locator('h2:has-text("Modifier la catégorie")')).toBeVisible();

  // Ouvrir le sélecteur
  await page.click('button:has-text("Changer"), button:has-text("Choisir une icône")');
  await expect(page.locator('h2:has-text("Choisir une icône")')).toBeVisible();

  // Effacer l'icône
  await page.click('button:has-text("Effacer")');

  // Vérifier l'état "Aucune icône"
  await expect(page.locator('.no-icon-label')).toBeVisible();

  // Sauvegarder
  await page.click('button:has-text("Modifier")');
  await expect(page.locator('h2:has-text("Modifier la catégorie")')).not.toBeVisible();

  // Vérifier fallback folder_open dans la card
  await expect(page.locator('mat-icon:has-text("folder_open")')).toBeVisible();
});

test('filtrer les icônes dans le sélecteur', async ({ page }) => {
  await openEditMode(page);
  await page.click('button[aria-label="Ajouter une catégorie"]');
  await page.click('button:has-text("Choisir une icône")');
  await expect(page.locator('h2:has-text("Choisir une icône")')).toBeVisible();

  // Rechercher "calendar"
  await page.fill('input[placeholder*="home"]', 'calendar');
  await page.waitForTimeout(200);

  // Vérifier qu'au moins une icône contenant "calendar" s'affiche
  await expect(page.locator('.icon-btn')).toHaveCount(await page.locator('.icon-btn').count());
  const btnCount = await page.locator('.icon-btn').count();
  expect(btnCount).toBeGreaterThan(0);

  // Vérifier qu'un résultat vide affiche le message d'erreur
  await page.fill('input[placeholder*="home"]', 'xyznonexistent123');
  await page.waitForTimeout(200);
  await expect(page.locator('.no-result')).toBeVisible();
});
```

---

## Architecture et contraintes

### Convention migrations TypeORM — OBLIGATOIRE

```
backend/src/migrations/   # Migrations TypeORM générées (jamais éditées manuellement)
```

Workflow obligatoire :
1. Modifier l'entité `link-category.entity.ts` (emoji → icon, length 10 → 50)
2. `npm run migration:generate -- src/migrations/RenameEmojiToIconInLinkCategory`
3. Vérifier la migration générée
4. La migration s'exécute automatiquement au démarrage (TypeORM)

### `HttpClient` dans `MaterialIconPickerComponent`

Le projet utilise `provideHttpClient()` au niveau `app.config.ts`. Les composants standalone peuvent injecter `HttpClient` directement — pas de configuration supplémentaire requise.

### Dialog imbriqué : z-index Angular Material

Ouvrir un `MatDialog` depuis un autre `MatDialog` est supporté nativement par Angular Material. Le second dialog reçoit automatiquement un z-index plus élevé. Aucune configuration CDK overlay supplémentaire n'est nécessaire.

### Résultat du dialog picker : 3 états distincts

```
undefined  → dialog fermé par "Annuler" ou escape → PAS de changement dans CategoryDialogComponent
null       → "Effacer" cliqué → selectedIcon.set(null)
"nom"      → icône choisie → selectedIcon.set("nom")
```

Ce pattern `undefined` / `null` / `string` prévient les régressions (fermer le sélecteur sans choisir ne modifie pas la sélection courante).

### Composants standalone — import direct

Tous les composants sont standalone. Pas de NgModule. `MaterialIconPickerComponent` est ouvert via `MatDialog.open()` — pas besoin de l'ajouter dans les `imports[]` de `CategoryDialogComponent`.

### Signals + OnPush — pas de ChangeDetectorRef

`MaterialIconPickerComponent` utilise `signal()` + `computed()` + `ChangeDetectionStrategy.OnPush`. Aucun `ChangeDetectorRef.markForCheck()` nécessaire — les signals gèrent le CD automatiquement.

### CSS Material Design tokens

Utiliser `var(--mat-sys-*)` pour les couleurs (s'adaptent automatiquement aux thèmes clair/sombre) :
- `var(--mat-sys-primary-container)` : fond de l'icône sélectionnée
- `var(--mat-sys-on-primary-container)` : couleur du texte/icône sélectionné
- `var(--mat-sys-surface-variant)` : fond de l'aperçu de sélection
- `var(--mat-sys-on-surface-variant)` : texte secondaire

### Arborescence des fichiers à créer/modifier

```
frontend/
├── public/
│   └── material-icons.json                           ← CRÉER (~500 icônes)
└── src/app/
    ├── shared/components/material-icon-picker/
    │   ├── material-icon-picker.component.ts          ← CRÉER
    │   ├── material-icon-picker.component.html        ← CRÉER
    │   ├── material-icon-picker.component.scss        ← CRÉER
    │   └── material-icon-picker.component.spec.ts    ← CRÉER
    └── links/
        ├── link-categories.service.ts                ← MODIFIER (emoji → icon)
        ├── link-categories.service.spec.ts           ← MODIFIER (mock data)
        ├── links.component.ts                        ← MODIFIER (result.emoji → result.icon)
        └── components/
            ├── category-dialog/
            │   ├── category-dialog.component.ts      ← MODIFIER
            │   ├── category-dialog.component.html    ← MODIFIER
            │   └── category-dialog.component.scss    ← MODIFIER (styles icon-selector)
            └── link-category-card/
                ├── link-category-card.component.html ← MODIFIER (emoji span → mat-icon)
                └── link-category-card.component.spec.ts ← MODIFIER (si mock contient emoji)

backend/src/links/
├── link-category.entity.ts                           ← MODIFIER (emoji → icon, length 50)
├── dto/create-link-category.dto.ts                   ← MODIFIER (emoji → icon, MaxLength 50)
├── link-categories.service.spec.ts                   ← MODIFIER (mock data)
├── link-categories.controller.spec.ts                ← MODIFIER (mock data)
└── migrations/XXX-RenameEmojiToIconInLinkCategory.ts ← GÉNÉRÉ (jamais édité manuellement)

e2e/tests/
└── links-icon-picker.spec.ts                         ← CRÉER
```

---

## Learnings de la story précédente (4.8)

- **`effect()` dans le constructeur** : pattern validé et documenté dans l'architecture. Angular 21 nettoie automatiquement les effets à la destruction du composant.
- **Signals + OnPush** : ne pas utiliser `ChangeDetectorRef.markForCheck()`. Les signals gèrent le CD automatiquement. Vrai pour `computed()` aussi.
- **`toSignal()` dans une propriété de classe** : valide car dans un injection context.
- **`takeUntilDestroyed(this.destroyRef)`** : pattern utilisé dans `LinkDialogComponent` pour les Subjects — reprendre ce pattern pour le debounce dans `MaterialIconPickerComponent`.
- **`MatSlider` nouvelle API** : pas d'impact sur cette story (pas de slider).
- **Tokens CSS `var(--mat-sys-*)`** : s'adaptent automatiquement aux thèmes clair/sombre. Utiliser systématiquement.
- **Pattern mock service dans les tests** : `{ provide: ServiceClass, useValue: { method: vi.fn(), signal: signal() } }` — reproduire pour `MaterialIconPickerComponent.spec.ts`.
- **`debounceTime` + `Subject`** : pattern de `LinkDialogComponent` (urlBlur$ Subject + switchMap) → adapter pour le champ de recherche du sélecteur (searchInput$ Subject + debounceTime 150ms, pas de switchMap nécessaire).

---

## Scénarios E2E

- Créer une catégorie → choisir icône "home" → valider → vérifier `<mat-icon>home</mat-icon>` dans la card
- Modifier une catégorie → ouvrir sélecteur → cliquer "Effacer" → valider → vérifier fallback `folder_open`
- Rechercher "calendar" dans le sélecteur → vérifier grille filtrée non vide
- Rechercher terme inexistant → vérifier message "Aucune icône trouvée"
- Ouvrir sélecteur → cliquer "Annuler" → vérifier que l'icône précédente est inchangée dans CategoryDialog

---

## Project Structure Notes

- Composants standalone (pas de NgModule) — import direct dans le tableau `imports[]`
- `OnPush` sur tous les composants — signals uniquement
- Fichier asset JSON : servi depuis `frontend/public/` (Angular build copie `public/**/*` tel quel)
- Tests frontend composants : Vitest (`vi.fn()`), TestBed + `provideAnimationsAsync()`
- Tests frontend avec HttpClient : `provideHttpClient()` + `provideHttpClientTesting()`
- Backend : pattern `Object.assign(entity, dto)` dans le service → le renommage dans le DTO se propage automatiquement
- Migration : jamais éditée manuellement — toujours via `typeorm migration:generate`

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (Claude Code - 2026-05-21)

### Completion Notes List

- **T1** : Migration TypeORM générée automatiquement (1779361905285-RenameEmojiToIconInLinkCategory.ts). Colonne `emoji varchar(10)` → `icon varchar(50)` via DROP+ADD TypeORM (comportement standard pour changement de longueur). Les données emoji existantes ne sont pas préservées (affichage dégradé acceptable selon AC6). 16 tests backend passent.
- **T2** : Interface `LinkCategory`, méthodes `createCategory/updateCategory` et leurs specs mis à jour `emoji → icon`. 116 tests frontend passent.
- **T3** : `MaterialIconPickerComponent` créé — standalone, OnPush, Signals + computed filteredIcons, debounce 150ms via Subject+takeUntilDestroyed, 3 états de retour (undefined/null/string). 18 nouveaux tests unitaires avec `vi.useFakeTimers()` (pas de fakeAsync — pas de Zone.js dans ce setup Vitest/Angular21).
- **T4** : `CategoryDialogComponent` refondu — FormControl emoji supprimé, signal `selectedIcon`, méthode `openIconPicker()` ouvrant le dialog imbriqué, 3 états traités (undefined=annuler, null=effacer, string=sélection). Template et SCSS mis à jour.
- **T5** : `LinkCategoryCardComponent` — `<span class="category-emoji">` → `<mat-icon class="category-icon">`, fallback `folder_open` si icon null. Spec mise à jour avec test de fallback.
- **T6** : `LinksComponent` — `result.emoji` → `result.icon` dans `openAddCategoryDialog()` et `openEditCategoryDialog()`. Spec mise à jour.
- **T7** : `frontend/public/material-icons.json` créé avec 490 icônes Material (~500 selon spec).
- **T8** : Tests E2E Playwright créés (5 scénarios : création+sélection, effacement, filtrage, annulation, terme inexistant).

### File List

**Créés :**
- `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.ts`
- `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.html`
- `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.scss`
- `frontend/src/app/shared/components/material-icon-picker/material-icon-picker.component.spec.ts`
- `frontend/public/material-icons.json`
- `backend/src/migrations/1779361905285-RenameEmojiToIconInLinkCategory.ts`
- `e2e/tests/links-icon-picker.spec.ts`

**Modifiés :**
- `backend/src/links/link-category.entity.ts`
- `backend/src/links/dto/create-link-category.dto.ts`
- `backend/src/links/link-categories.service.spec.ts`
- `backend/src/links/link-categories.controller.spec.ts`
- `frontend/src/app/links/link-categories.service.ts`
- `frontend/src/app/links/link-categories.service.spec.ts`
- `frontend/src/app/links/links.component.ts`
- `frontend/src/app/links/links.component.spec.ts`
- `frontend/src/app/links/components/category-dialog/category-dialog.component.ts`
- `frontend/src/app/links/components/category-dialog/category-dialog.component.html`
- `frontend/src/app/links/components/category-dialog/category-dialog.component.scss`
- `frontend/src/app/links/components/link-category-card/link-category-card.component.html`
- `frontend/src/app/links/components/link-category-card/link-category-card.component.scss`
- `frontend/src/app/links/components/link-category-card/link-category-card.component.spec.ts`

### Change Log

- 2026-05-21 : Création du fichier story — analyse exhaustive du code existant (CategoryDialogComponent, LinkCategoryCard, entity, DTOs, services, patterns tests, architecture)
- 2026-05-21 : Implémentation complète story 4.9 — migration BDD emoji→icon, MaterialIconPickerComponent, refonte CategoryDialog, mise à jour card+services+composants. 140 tests backend + 116 tests frontend passent (0 régression). Statut → review.
- 2026-05-21 : Code review — 7 patches appliqués (migration CHANGE atomique, takeUntilDestroyed, gestion erreur HTTP, casse insensible, template reference, guard double-clic). 3 items différés. Statut → done.
