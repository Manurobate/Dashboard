# Story 4.2 : CRUD des catégories de liens

**Épic :** 4 — Module Liens
**Statut :** done
**Créée le :** 2026-05-18

---

## User Story

En tant qu'utilisateur authentifié,
Je veux créer, modifier, supprimer et réorganiser mes catégories de liens,
Afin de structurer mes liens par thèmes.

---

## Critères d'acceptation

**AC1 — Création**
**Étant donné** que je suis sur la page Liens,
**Quand** je clique "Ajouter une catégorie", saisis un nom (et optionnellement un emoji) et valide,
**Alors** `POST /api/link-categories` crée la catégorie, elle apparaît en bas de la liste avec un snackbar "Catégorie ajoutée"

**AC2 — Modification**
**Étant donné** qu'une catégorie existe,
**Quand** je modifie son nom ou emoji et sauvegarde,
**Alors** `PATCH /api/link-categories/:id` met à jour la catégorie et la vue se rafraîchit

**AC3 — Suppression**
**Étant donné** qu'une catégorie existe,
**Quand** je clique "Supprimer" et confirme dans le `MatDialog`,
**Alors** `DELETE /api/link-categories/:id` supprime la catégorie et tous ses liens, avec snackbar de confirmation

**AC4 — Réorganisation**
**Étant donné** que je glisse-dépose une catégorie vers une nouvelle position,
**Quand** le drag & drop se termine (Angular CDK),
**Alors** `PATCH /api/link-categories/reorder` met à jour les positions de toutes les catégories affectées

---

## Tasks / Subtasks

### Backend

- [x] T1 — Créer les DTOs (AC: #1, #2, #4)
  - [x] `backend/src/links/dto/create-link-category.dto.ts` : `name` (string, obligatoire, MaxLength 255) + `emoji` (string, optionnel, MaxLength 10)
  - [x] `backend/src/links/dto/update-link-category.dto.ts` : PartialType de CreateLinkCategoryDto
  - [x] `backend/src/links/dto/reorder-link-categories.dto.ts` : tableau d'objets `{ id: number, position: number }`

- [x] T2 — Créer `LinkCategoriesService` (AC: #1, #2, #3, #4)
  - [x] `backend/src/links/link-categories.service.ts`
  - [x] `findAll(userId)` : retourne toutes les catégories de l'utilisateur triées par `position` ASC
  - [x] `create(userId, dto)` : crée avec `position = max(position) + 1` pour l'utilisateur
  - [x] `update(userId, id, dto)` : vérifie l'ownership (`findOne({ id, userId })`), met à jour, retourne la catégorie
  - [x] `remove(userId, id)` : vérifie l'ownership, supprime (cascade DB supprime les liens)
  - [x] `reorder(userId, items)` : pour chaque item vérifie ownership puis met à jour `position`

- [x] T3 — Créer `LinkCategoriesController` (AC: #1, #2, #3, #4)
  - [x] `backend/src/links/link-categories.controller.ts`
  - [x] `GET /api/link-categories` → `findAll` (200, tableau)
  - [x] `POST /api/link-categories` → `create` (201, catégorie créée)
  - [x] `PATCH /api/link-categories/reorder` → `reorder` (204) — **MUST be declared BEFORE `/:id`**
  - [x] `PATCH /api/link-categories/:id` → `update` (200, catégorie mise à jour)
  - [x] `DELETE /api/link-categories/:id` → `remove` (204)
  - [x] Guards : `@UseGuards(JwtAuthGuard)` + `@SkipThrottle()` sur le controller
  - [x] `@CurrentUser()` pour extraire `userId` du JWT

- [x] T4 — Mettre à jour `LinksModule` (AC: tous)
  - [x] Ajouter `LinkCategoriesController` et `LinkCategoriesService` dans `links.module.ts`

- [x] T5 — Tests unitaires backend (AC: tous)
  - [x] `link-categories.service.spec.ts` : couvrir findAll, create, update (ownership OK + 404), remove (ownership + 404), reorder
  - [x] `link-categories.controller.spec.ts` : couvrir les routes GET, POST, PATCH reorder, PATCH :id, DELETE

### Frontend

- [x] T6 — Créer le composant partagé `ConfirmDialog` dans `shared/` (AC: #3)
  - [x] `frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts`
  - [x] Réutiliser le pattern de `admin/confirm-destructive-dialog.component.ts` (injection `MAT_DIALOG_DATA` + `MatDialogRef`)
  - [x] Interface `ConfirmDialogData { title: string; message: string; confirmLabel: string; }`
  - [x] Standalone + OnPush + MatDialogModule + MatButtonModule

- [x] T7 — Créer `LinkCategoriesService` Angular (AC: #1, #2, #3, #4)
  - [x] `frontend/src/app/links/link-categories.service.ts`
  - [x] Interface `LinkCategory { id: number; name: string; emoji: string | null; position: number; userId: number; createdAt: string; updatedAt: string; }`
  - [x] Signals : `categories = signal<LinkCategory[]>([])`, `isLoading = signal(false)`, `error = signal<string | null>(null)`
  - [x] `loadCategories()` : GET + tap signal update + catchError + finalize
  - [x] `createCategory(name, emoji?)` : POST (retourne Observable)
  - [x] `updateCategory(id, name?, emoji?)` : PATCH (retourne Observable)
  - [x] `deleteCategory(id)` : DELETE (retourne Observable)
  - [x] `reorderCategories(items)` : PATCH /reorder (retourne Observable)

- [x] T8 — Créer le formulaire de catégorie (dialog) (AC: #1, #2)
  - [x] `frontend/src/app/links/components/category-dialog/category-dialog.component.ts`
  - [x] Standalone + OnPush + ReactiveFormsModule + MatFormFieldModule + MatInputModule + MatButtonModule + MatDialogModule
  - [x] Formulaire : champ `name` (required, maxlength 255) + champ `emoji` (optionnel, maxlength 10, placeholder "ex: 📌")
  - [x] Données d'entrée via `MAT_DIALOG_DATA` : `{ category?: LinkCategory }` (null = création, objet = édition)
  - [x] Retourne `{ name, emoji }` au close si confirmé

- [x] T9 — Mettre à jour `LinksComponent` (page `/links`) (AC: #1, #2, #3, #4)
  - [x] `frontend/src/app/links/links.component.ts` — remplacer le placeholder
  - [x] Standalone + OnPush + ChangeDetectionStrategy.OnPush
  - [x] Inject `LinkCategoriesService`, `MatDialog`, `MatSnackBar`
  - [x] `ngOnInit` : appeler `linkCategoriesService.loadCategories().subscribe()`
  - [x] Afficher la liste des catégories avec CDK drag & drop (`CdkDropList` + `CdkDrag`)
  - [x] Bouton "Ajouter une catégorie" → ouvre `CategoryDialogComponent` puis appelle `createCategory()`
  - [x] Bouton édition par catégorie → ouvre `CategoryDialogComponent` pré-rempli puis appelle `updateCategory()`
  - [x] Bouton suppression par catégorie → ouvre `ConfirmDialogComponent` puis appelle `deleteCategory()`
  - [x] Event `cdkDropListDropped` → `moveItemInArray()` + `reorderCategories()`
  - [x] Snackbar après chaque opération CRUD réussie

- [x] T10 — Tests unitaires frontend (AC: tous)
  - [x] `link-categories.service.spec.ts` : couvrir les méthodes HTTP et les mises à jour de signals
  - [x] `links.component.spec.ts` : couvrir l'init, l'ouverture des dialogs, les actions CRUD

---

## Dev Notes

### Périmètre de cette story

Cette story est **backend + frontend**. Elle implémente le CRUD complet des catégories de liens.

**Ce que cette story ne fait PAS :**
- Pas de `LinkCategoryCard` collapsible (story 4.5)
- Pas de mode lecture/édition toggle (story 4.4) — la page est en mode édition permanent pour cette story
- Pas de CRUD sur les liens individuels (story 4.3)
- Pas de favicon auto-récupéré (story 4.3)
- Pas de thème clair/sombre ni état vide (story 4.6)

### Architecture backend — règles impératives

#### Endpoint `reorder` AVANT `/:id` dans le controller

En NestJS, les routes sont matchées dans l'ordre de déclaration. `PATCH reorder` doit être déclaré **avant** `PATCH :id`, sinon NestJS interprète `"reorder"` comme un paramètre `:id`.

```typescript
// ✅ Ordre correct dans link-categories.controller.ts
@Patch('reorder')   // ← PREMIER
async reorder(...) {}

@Patch(':id')       // ← APRÈS
async update(...) {}
```

#### Ownership — filtre impératif par userId

**Ne jamais chercher une catégorie par `id` seul.** Toujours :

```typescript
// ✅ Correct — impossible d'accéder aux catégories d'un autre utilisateur
const cat = await this.repo.findOne({ where: { id, userId } });
if (!cat) throw new NotFoundException(`Catégorie ${id} introuvable`);

// ❌ Interdit
const cat = await this.repo.findOne({ where: { id } }); // fuite cross-user
```

Cette règle vient du defer 4.1 : "Link.userId peut diverger du userId de la catégorie parente — enforcement service-level, hors scope 4.1, traiter en 4.2."

#### Stratégie de position

- À la création : `position = (max position existante pour l'utilisateur) + 1`. Si aucune catégorie : `position = 0`.
- Le `reorder` reçoit un tableau `[{ id, position }]` et met à jour toutes les positions en une boucle.
- Pas de contrainte `UNIQUE` sur `position` — les doublons sont acceptés (le tri est `position ASC`).

#### Validation emoji

Suite au defer 4.1 : "`emoji varchar(10)` peut tronquer les séquences emoji multi-codepoints". Ajouter dans le DTO :

```typescript
@IsString()
@IsOptional()
@MaxLength(10, { message: "L'emoji ne peut pas dépasser 10 caractères" })
emoji?: string;
```

#### Pattern DTO `PartialType`

```typescript
// update-link-category.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateLinkCategoryDto } from './create-link-category.dto';

export class UpdateLinkCategoryDto extends PartialType(CreateLinkCategoryDto) {}
```

#### Pattern controller complet

```typescript
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, HttpCode, HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LinkCategoriesService } from './link-categories.service';
import { CreateLinkCategoryDto } from './dto/create-link-category.dto';
import { UpdateLinkCategoryDto } from './dto/update-link-category.dto';
import { ReorderLinkCategoriesDto } from './dto/reorder-link-categories.dto';

@ApiTags('link-categories')
@Controller('link-categories')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class LinkCategoriesController {
  constructor(private readonly service: LinkCategoriesService) {}

  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.service.findAll(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateLinkCategoryDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch('reorder')           // ← AVANT @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorder(
    @CurrentUser() user: { id: number },
    @Body() dto: ReorderLinkCategoriesDto,
  ): Promise<void> {
    await this.service.reorder(user.id, dto.items);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLinkCategoryDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.remove(user.id, id);
  }
}
```

#### Pattern service complet

```typescript
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { CreateLinkCategoryDto } from './dto/create-link-category.dto';
import { UpdateLinkCategoryDto } from './dto/update-link-category.dto';

@Injectable()
export class LinkCategoriesService {
  private readonly logger = new Logger(LinkCategoriesService.name);

  constructor(
    @InjectRepository(LinkCategoryEntity)
    private readonly repo: Repository<LinkCategoryEntity>,
  ) {}

  findAll(userId: number): Promise<LinkCategoryEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { position: 'ASC' },
    });
  }

  async create(userId: number, dto: CreateLinkCategoryDto): Promise<LinkCategoryEntity> {
    const maxResult = await this.repo
      .createQueryBuilder('cat')
      .select('MAX(cat.position)', 'max')
      .where('cat.userId = :userId', { userId })
      .getRawOne<{ max: number | null }>();

    const position = (maxResult?.max ?? -1) + 1;
    const cat = this.repo.create({ ...dto, userId, position });
    return this.repo.save(cat);
  }

  async update(userId: number, id: number, dto: UpdateLinkCategoryDto): Promise<LinkCategoryEntity> {
    const cat = await this.repo.findOne({ where: { id, userId } });
    if (!cat) throw new NotFoundException(`Catégorie ${id} introuvable`);
    Object.assign(cat, dto);
    return this.repo.save(cat);
  }

  async remove(userId: number, id: number): Promise<void> {
    const cat = await this.repo.findOne({ where: { id, userId } });
    if (!cat) throw new NotFoundException(`Catégorie ${id} introuvable`);
    await this.repo.remove(cat);
  }

  async reorder(userId: number, items: { id: number; position: number }[]): Promise<void> {
    for (const item of items) {
      await this.repo.update({ id: item.id, userId }, { position: item.position });
    }
  }
}
```

#### Pattern ReorderLinkCategoriesDto

```typescript
import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class ReorderItem {
  @IsInt()
  id!: number;

  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderLinkCategoriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  @ApiProperty({ type: [ReorderItem] })
  items!: ReorderItem[];
}
```

#### Mise à jour LinksModule

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { LinkEntity } from './link.entity';
import { LinkCategoriesController } from './link-categories.controller';
import { LinkCategoriesService } from './link-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity])],
  controllers: [LinkCategoriesController],
  providers: [LinkCategoriesService],
  exports: [LinkCategoriesService],
})
export class LinksModule {}
```

### Architecture frontend — règles impératives

#### Angular CDK Drag & Drop — première utilisation dans le projet

C'est la **première utilisation** de `@angular/cdk/drag-drop` dans le projet (CDK 21 déjà installé, aucun usage existant).

```typescript
// Import dans le composant standalone
import { DragDropModule, CdkDropList, CdkDrag, moveItemInArray, CdkDragDrop } from '@angular/cdk/drag-drop';
```

**Pattern CDK drag-drop avec signals :**

```typescript
// Dans le composant
drop(event: CdkDragDrop<LinkCategory[]>): void {
  const cats = [...this.linkCategoriesService.categories()]; // copie immuable
  moveItemInArray(cats, event.previousIndex, event.currentIndex);
  this.linkCategoriesService.categories.set(cats); // optimistic update

  const items = cats.map((c, i) => ({ id: c.id, position: i }));
  this.linkCategoriesService.reorderCategories(items).subscribe({
    error: () => {
      // rollback sur erreur
      this.linkCategoriesService.loadCategories().subscribe();
      this.snackBar.open('Erreur lors de la réorganisation', 'Fermer', { duration: 3000 });
    },
  });
}
```

**Template CDK :**

```html
<div cdkDropList (cdkDropListDropped)="drop($event)" class="category-list">
  @for (cat of linkCategoriesService.categories(); track cat.id) {
    <div cdkDrag class="category-item">
      <mat-icon cdkDragHandle class="drag-handle">drag_handle</mat-icon>
      <!-- contenu de la catégorie -->
    </div>
  }
</div>
```

**Règle Angular Material AM3 :** Ne pas utiliser `mat-chip` standalone pour les badges. Utiliser `<span>` stylé (pattern établi en story 3.6).

#### Composant ConfirmDialog partagé

Créer `frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts` en s'inspirant du pattern de `admin/confirm-destructive-dialog.component.ts` :

```typescript
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel: string;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="cancel()">Annuler</button>
      <button mat-button color="warn" (click)="confirm()">{{ data.confirmLabel }}</button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
  confirm(): void { this.dialogRef.close(true); }
  cancel(): void { this.dialogRef.close(false); }
}
```

**Note :** `admin/confirm-destructive-dialog.component.ts` reste en place (ne pas le supprimer — le refactoring est hors scope).

#### Pattern LinksComponent (page principale)

```typescript
@Component({
  selector: 'app-links',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DragDropModule, // ou CdkDropList, CdkDrag si imports granulaires
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule, // via inject MatSnackBar
    // ... autres
  ],
  templateUrl: './links.component.html',
  styleUrl: './links.component.scss',
})
export class LinksComponent implements OnInit {
  protected readonly linkCategoriesService = inject(LinkCategoriesService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.linkCategoriesService.loadCategories().subscribe();
  }

  openAddCategoryDialog(): void {
    const ref = this.dialog.open(CategoryDialogComponent, { width: '400px', maxWidth: '95vw' });
    ref.afterClosed().subscribe((result?: { name: string; emoji?: string }) => {
      if (!result) return;
      this.linkCategoriesService.createCategory(result.name, result.emoji).subscribe({
        next: () => {
          this.linkCategoriesService.loadCategories().subscribe();
          this.snackBar.open('Catégorie ajoutée', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open("Erreur lors de la création", 'Fermer', { duration: 4000 }),
      });
    });
  }

  openEditCategoryDialog(cat: LinkCategory): void { /* idem */ }

  openDeleteDialog(cat: LinkCategory): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        width: '400px',
        maxWidth: '95vw',
        data: {
          title: `Supprimer "${cat.name}" ?`,
          message: 'Cette action est irréversible. Tous les liens de cette catégorie seront supprimés.',
          confirmLabel: 'Supprimer',
        },
      }
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.linkCategoriesService.deleteCategory(cat.id).subscribe({
        next: () => {
          this.linkCategoriesService.categories.update(cats => cats.filter(c => c.id !== cat.id));
          this.snackBar.open('Catégorie supprimée', 'Fermer', { duration: 3000 });
        },
        error: () => this.snackBar.open("Erreur lors de la suppression", 'Fermer', { duration: 4000 }),
      });
    });
  }
}
```

#### Pattern immutable des signals

```typescript
// ✅ Correct
this.categories.update(cats => [...cats, newCat]);
this.categories.update(cats => cats.filter(c => c.id !== id));

// ❌ Interdit
this.categories().push(newCat);
```

#### Routing — pas de changement

La route `/links` est déjà définie dans `app.routes.ts` avec les bons guards (`authGuard`, `mustChangePasswordGuard`). **Ne pas modifier `app.routes.ts`**.

### Arborescence des fichiers à créer/modifier

```
backend/src/links/
├── link-category.entity.ts         ← existant (ne pas modifier)
├── link.entity.ts                  ← existant (ne pas modifier)
├── links.module.ts                 ← modifier (ajouter controller + service)
├── link-categories.controller.ts   ← créer
├── link-categories.controller.spec.ts ← créer
├── link-categories.service.ts      ← créer
├── link-categories.service.spec.ts ← créer
└── dto/
    ├── create-link-category.dto.ts    ← créer
    ├── update-link-category.dto.ts    ← créer
    └── reorder-link-categories.dto.ts ← créer

frontend/src/app/
├── shared/
│   └── components/
│       └── confirm-dialog/
│           └── confirm-dialog.component.ts  ← créer
└── links/
    ├── links.component.ts           ← modifier (remplacer placeholder)
    ├── links.component.html         ← créer
    ├── links.component.scss         ← créer
    ├── links.component.spec.ts      ← créer
    ├── link-categories.service.ts   ← créer
    ├── link-categories.service.spec.ts ← créer
    └── components/
        └── category-dialog/
            ├── category-dialog.component.ts   ← créer
            ├── category-dialog.component.html ← créer
            └── category-dialog.component.scss ← créer
```

### Points d'attention issus des stories précédentes

1. **`maxWidth: '95vw'` sur tous les `dialog.open()`** — Appris en story 3.6 : les dialogs sans maxWidth cassent sur mobile. Toujours ajouter `maxWidth: '95vw'`.

2. **`@SkipThrottle()` au niveau du controller** — Même pattern que `UsersController`. Le throttler global est activé sur `AuthController` uniquement, mais ajouter `@SkipThrottle()` est une bonne pratique défensive.

3. **`@CurrentUser()` decorator** — Disponible dans `backend/src/common/decorators/current-user.decorator.ts`. Retourne l'objet `{ id, username, role }` de la JWT strategy (NB : typé `UserEntity` dans la stratégie mais réellement `{ id, username, role }` — utiliser `{ id: number }` dans les controllers pour éviter la confusion).

4. **`ChangeDetectionStrategy.OnPush` obligatoire** — Tous les composants Angular du projet utilisent OnPush. Zoneless + signals = OnPush par défaut.

5. **Pas de `takeUntilDestroyed` sur les HTTP observables** — Les HTTP observables Angular se complètent automatiquement. Le pattern `subscribe()` sans cleanup est accepté (noté comme amélioration dans le defer 3.1 mais non bloquant).

6. **Logger NestJS obligatoire** — `private readonly logger = new Logger(LinkCategoriesService.name)` — jamais `console.log`.

7. **Test co-localisés** — Les `.spec.ts` doivent être dans le même répertoire que le fichier source. Jamais dans un dossier `__tests__/`.

### Notes sur le mode édition

La story 4.2 assume que la page est **toujours en mode édition** (les boutons de CRUD sont toujours visibles). Le toggle lecture/édition sera ajouté en **story 4.4** et modifiera ce comportement. Le composant doit être conçu pour faciliter l'ajout d'un signal `editMode` en story 4.4 (par exemple `readonly editMode = signal(true)` dans LinksComponent, qui sera remplacé par un vrai toggle en 4.4).

---

## Project Structure Notes

- **Entité** : `link-category.entity.ts` dans `backend/src/links/` (sans sous-dossier `entities/`)
- **DTOs** : `backend/src/links/dto/` — créer le dossier (inexistant après story 4.1)
- **Repository** : injecté via `@InjectRepository(LinkCategoryEntity)` — `LinksModule` importe déjà `TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity])`
- **Frontend links** : `frontend/src/app/links/` — dossier existant avec seulement le placeholder `links.component.ts`
- **Shared components** : `frontend/src/app/shared/` — dossier à créer pour la première fois dans ce projet
- **CDK drag-drop** : `@angular/cdk` v21 déjà installé, aucun usage actuel dans le projet — première implémentation

---

## References

- [Source: epics.md#Story 4.2 — critères d'acceptation CRUD catégories]
- [Source: architecture.md#Patterns de Nommage — routes REST pluriel kebab-case, fichiers kebab-case.type.ts]
- [Source: architecture.md#Patterns de Structure — organisation backend/src/links/ et frontend/src/app/links/]
- [Source: architecture.md#Frontières API — JwtAuthGuard sur tous les modules sauf sharing]
- [Source: architecture.md#Patterns de Communication — Signals Angular (naming + immutabilité)]
- [Source: architecture.md#Conventions Angular Material 3 — mat-chip standalone, tokens --mat-sys-*]
- [Source: backend/src/common/decorators/current-user.decorator.ts — pattern @CurrentUser()]
- [Source: backend/src/users/users.controller.ts — pattern controller NestJS (guards, SkipThrottle, ParseIntPipe)]
- [Source: backend/src/users/users.service.ts — pattern service NestJS (NotFoundException, Logger)]
- [Source: backend/src/users/dto/create-user.dto.ts — pattern DTO avec class-validator + @ApiProperty]
- [Source: frontend/src/app/admin/admin.service.ts — pattern service Angular (signals, loadXxx, catchError)]
- [Source: frontend/src/app/admin/admin-panel.component.ts — pattern composant (MatDialog, MatSnackBar, signals)]
- [Source: frontend/src/app/admin/confirm-destructive-dialog.component.ts — pattern dialog confirmation]
- [Source: 4-1-entites-link-linkcategory-migrations.md#Dev Notes — entités LinkCategoryEntity, conventions TypeORM, defer items]
- [Source: implementation-artifacts/deferred-work.md#4-1 — ownership userId, validation emoji, position ordering]

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Suppression de `MatDialogModule` et `MatSnackBarModule` des imports de `LinksComponent` : ces services sont `providedIn: 'root'` dans Angular Material 21 ; leur présence dans les imports du composant créait un conflit avec les mocks dans les tests Vitest.
- `fakeAsync` non disponible dans ce projet zoneless : les tests du composant ont été réécrits en utilisant des `Subject` synchrones sans `fakeAsync/tick`.

### Completion Notes List

- **Backend** : DTOs (create, update, reorder), `LinkCategoriesService` et `LinkCategoriesController` créés conformément aux patterns de la story. Endpoint `/reorder` déclaré avant `/:id` comme requis par NestJS. Ownership enforced par `findOne({ id, userId })`. Position calculée via `MAX(position) + 1`. 15 tests backend passent (114 au total sans régression).
- **Frontend** : `ConfirmDialogComponent` partagé dans `shared/`, `LinkCategoriesService` avec signals, `CategoryDialogComponent` avec formulaire réactif, `LinksComponent` avec CDK drag-drop et optimistic update. 33 tests frontend passent (1 échec préexistant non lié à cette story).

### File List

backend/src/links/dto/create-link-category.dto.ts
backend/src/links/dto/update-link-category.dto.ts
backend/src/links/dto/reorder-link-categories.dto.ts
backend/src/links/link-categories.service.ts
backend/src/links/link-categories.service.spec.ts
backend/src/links/link-categories.controller.ts
backend/src/links/link-categories.controller.spec.ts
backend/src/links/links.module.ts
frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts
frontend/src/app/links/link-categories.service.ts
frontend/src/app/links/link-categories.service.spec.ts
frontend/src/app/links/components/category-dialog/category-dialog.component.ts
frontend/src/app/links/components/category-dialog/category-dialog.component.html
frontend/src/app/links/components/category-dialog/category-dialog.component.scss
frontend/src/app/links/links.component.ts
frontend/src/app/links/links.component.html
frontend/src/app/links/links.component.scss
frontend/src/app/links/links.component.spec.ts

### Review Findings

- [x] [Review][Patch] Ajouter `@ArrayMaxSize(200)` sur `ReorderLinkCategoriesDto.items` — sans limite, N requêtes séquentielles non bornées [backend/src/links/dto/reorder-link-categories.dto.ts:16]
- [x] [Review][Patch] Effacement d'emoji impossible — accepter `emoji: null` côté backend (DTO + service) et envoyer `null` depuis le frontend quand le champ est vidé [backend/src/links/dto/create-link-category.dto.ts, frontend/src/app/links/components/category-dialog/category-dialog.component.ts]
- [x] [Review][Patch] Balise fermante — false positive (code correct), dismissed
- [x] [Review][Patch] `reorder` — NotFoundException si `affected=0` (ownership silencieux corrigé) [backend/src/links/link-categories.service.ts:53]
- [x] [Review][Patch] `@IsNotEmpty` — ajout `@Transform` trim sur le champ `name` pour rejeter les noms vides/espaces [backend/src/links/dto/create-link-category.dto.ts:9]
- [x] [Review][Patch] `drop()` — guard early return si `previousIndex === currentIndex` [frontend/src/app/links/links.component.ts:112]
- [x] [Review][Patch] `cdkDrag` — ajout `[cdkDragDisabled]="!editMode()"` [frontend/src/app/links/links.component.html:35]
- [x] [Review][Patch] `ReorderItem` — exporté [backend/src/links/dto/reorder-link-categories.dto.ts:5]
- [x] [Review][Defer] Race condition `create` : deux appels simultanés lisent le même MAX(position) et insèrent deux catégories à la même position [backend/src/links/link-categories.service.ts:24] — deferred, architectural
- [x] [Review][Defer] Drop concurrents peuvent interférer (deux reorder en vol simultané) [frontend/src/app/links/links.component.ts:116] — deferred, UX edge case
- [x] [Review][Defer] Rollback de drop vide les catégories si le rechargement échoue (`catchError` → `of([])`) [frontend/src/app/links/link-categories.service.ts:28] — deferred, pre-existing pattern

---

## Change Log

- 2026-05-19 : Implémentation complète de la story 4.2 — CRUD des catégories de liens (backend + frontend). 18 fichiers créés/modifiés. 15 tests backend + 18 tests frontend ajoutés.
- 2026-05-19 : Code review — 2 decision-needed, 6 patch, 3 deferred, 8 dismissed.
