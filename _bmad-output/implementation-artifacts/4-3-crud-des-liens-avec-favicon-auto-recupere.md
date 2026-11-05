# Story 4.3 : CRUD des liens avec favicon auto-récupéré

**Épic :** 4 — Module Liens
**Statut :** done
**Créée le :** 2026-05-19

---

## User Story

En tant qu'utilisateur authentifié,
Je veux créer, modifier et supprimer des fiches de liens avec favicon automatiquement récupéré depuis l'URL,
Afin de retrouver rapidement mes liens grâce à leur identité visuelle.

---

## Critères d'acceptation

**AC1 — Récupération OG au blur**
**Étant donné** que je suis en mode édition et clique "Ajouter un lien" dans une catégorie,
**Quand** je saisis une URL et que le champ perd le focus,
**Alors** le backend appelle `OgFetchService` (requête server-side avec timeout 3s), le favicon et le titre OG sont pré-remplis dans le formulaire — un spinner inline 16px s'affiche pendant la récupération

**AC2 — Fallback favicon**
**Étant donné** que la récupération du favicon échoue (timeout, URL inaccessible),
**Quand** l'erreur est reçue,
**Alors** la sauvegarde du lien reste possible (fallback : initiale du titre en lieu et place du favicon), aucun message d'erreur bloquant

**AC3 — Création**
**Étant donné** que je valide le formulaire de création de lien,
**Quand** `POST /api/links` est appelé,
**Alors** le lien est créé et apparaît immédiatement dans la catégorie avec snackbar "Lien ajouté"

**AC4 — Modification**
**Étant donné** qu'un lien existe,
**Quand** je le modifie (titre, URL, description) et sauvegarde,
**Alors** `PATCH /api/links/:id` met à jour le lien

**AC5 — Suppression**
**Étant donné** qu'un lien existe,
**Quand** je clique "Supprimer" et confirme dans le `MatDialog`,
**Alors** `DELETE /api/links/:id` supprime le lien avec snackbar de confirmation

**AC6 — Réorganisation**
**Étant donné** que je glisse-dépose un lien vers une nouvelle position dans sa catégorie,
**Quand** le drag & drop se termine,
**Alors** `PATCH /api/links/reorder` met à jour les positions

---

## Tasks / Subtasks

### Backend

- [x] T1 — Créer `OgFetchModule` (AC: #1, #2)
  - [x] `backend/src/og-fetch/og-fetch.module.ts` : module NestJS qui exporte `OgFetchService`
  - [x] `backend/src/og-fetch/og-fetch.service.ts` : service avec méthode `fetchOgData(url)` — voir pattern complet en section Dev Notes
  - [x] `backend/src/og-fetch/og-fetch.service.spec.ts` : tests unitaires (mock `globalThis.fetch`)

- [x] T2 — Créer les DTOs liens (AC: #3, #4, #6)
  - [x] `backend/src/links/dto/create-link.dto.ts` : `url` (string, required, MaxLength 2048, IsUrl), `title` (string, required, MaxLength 255), `description` (string, optional, MaxLength 1000), `faviconUrl` (string, optional, MaxLength 2048), `categoryId` (number, required, IsInt, Min 1)
  - [x] `backend/src/links/dto/update-link.dto.ts` : `PartialType(CreateLinkDto)` — **ne pas inclure `categoryId`** (pas de déplacement entre catégories dans cette story)
  - [x] `backend/src/links/dto/reorder-links.dto.ts` : tableau `items: [{ id: number, position: number }]` + `@ArrayMaxSize(200)`

- [x] T3 — Créer `LinksService` (AC: #3, #4, #5, #6)
  - [x] `backend/src/links/links.service.ts` : CRUD complet avec ownership enforced — voir pattern complet en Dev Notes
  - [x] `findAll(userId)` : tous les liens triés `categoryId ASC, position ASC`
  - [x] `create(userId, dto)` : vérifie que `categoryId` appartient à `userId` (via `LinkCategoryEntity`), position = MAX(position pour la catégorie) + 1
  - [x] `update(userId, id, dto)` : `findOne({ id, userId })` → NotFoundException si absent
  - [x] `remove(userId, id)` : `findOne({ id, userId })` → NotFoundException si absent
  - [x] `reorder(userId, items)` : `update({ id, userId })` + `NotFoundException` si `affected === 0`

- [x] T4 — Créer `LinksController` (AC: #1, #2, #3, #4, #5, #6)
  - [x] `backend/src/links/links.controller.ts` : **ORDRE DES ROUTES CRITIQUE** — voir section Dev Notes
  - [x] `GET /api/links/og-preview?url=...` → `fetchOgPreview` — **PREMIER** (avant `/:id`)
  - [x] `GET /api/links` → `findAll`
  - [x] `POST /api/links` → `create` (201)
  - [x] `PATCH /api/links/reorder` → `reorder` (204) — **AVANT** `PATCH /:id`
  - [x] `PATCH /api/links/:id` → `update` (200)
  - [x] `DELETE /api/links/:id` → `remove` (204)
  - [x] Guards : `@UseGuards(JwtAuthGuard)` + `@SkipThrottle()` au niveau du controller
  - [x] `LinksController.spec.ts` : couvrir toutes les routes

- [x] T5 — Mettre à jour `LinksModule` (AC: tous)
  - [x] `backend/src/links/links.module.ts` : ajouter `OgFetchModule` dans imports, `LinksController` + `LinksService` dans controllers/providers

- [x] T6 — Tests backend (AC: tous)
  - [x] `links.service.spec.ts` : couvrir findAll, create (ownership catégorie), update (ownership + 404), remove (ownership + 404), reorder (NotFoundException si affected=0)
  - [x] `og-fetch.service.spec.ts` : couvrir fetchOgData (succès og:title, fallback title, fallback favicon.ico, timeout/erreur)

### Frontend

- [x] T7 — Créer `LinksService` Angular (AC: #1, #2, #3, #4, #5, #6)
  - [x] `frontend/src/app/links/links.service.ts` : voir interface `Link` et pattern complet en Dev Notes
  - [x] Signals : `links = signal<Link[]>([])`, `isLoadingLinks = signal(false)`
  - [x] `loadLinks()` : `GET /api/links`, met à jour le signal
  - [x] `createLink(dto)`, `updateLink(id, dto)`, `deleteLink(id)`, `reorderLinks(items)`, `fetchOgPreview(url)`

- [x] T8 — Créer `LinkDialogComponent` (AC: #1, #2, #3, #4)
  - [x] `frontend/src/app/links/components/link-dialog/link-dialog.component.ts` + `.html` + `.scss`
  - [x] Standalone + OnPush + ReactiveFormsModule + MatFormFieldModule + MatInputModule + MatButtonModule + MatDialogModule + MatProgressSpinnerModule
  - [x] `MAT_DIALOG_DATA` : `{ link?: Link; categoryId: number }` (null = création, objet = édition)
  - [x] Formulaire : `url` (required), `title` (required), `description` (optionnel)
  - [x] Sur blur du champ `url` : déclenche OG fetch via `LinksService.fetchOgPreview()` — spinner inline 16px sur le champ `title` pendant la fetch
  - [x] `isFetchingOg = signal(false)` local au composant pour le spinner
  - [x] Pré-rempli si édition ; retourne `{ url, title, description, faviconUrl, categoryId }` au close

- [x] T9 — Mettre à jour `LinksComponent` (AC: #1, #2, #3, #4, #5, #6)
  - [x] Inject `LinksService` (Angular) en plus de `LinkCategoriesService`
  - [x] `ngOnInit` : appeler aussi `this.linksService.loadLinks().subscribe()`
  - [x] Méthode `linksForCategory(categoryId: number)` : filtre `this.linksService.links()`
  - [x] `openAddLinkDialog(categoryId)`, `openEditLinkDialog(link)`, `openDeleteLinkDialog(link)` : voir patterns en Dev Notes
  - [x] `dropLink(event: CdkDragDrop<Link[]>, categoryId: number)` : optimistic update + reorder
  - [x] Template : liste de liens par catégorie, nested cdkDropList avec id unique `"link-list-{{cat.id}}"`, boutons CRUD (editMode), favicon ou initiale
  - [x] Favicon fallback : `@if (link.faviconUrl)` → `<img>` 16×16 ; sinon `<span>` initiale du titre (uppercase)

- [x] T10 — Tests frontend (AC: tous)
  - [x] `links.service.spec.ts` : couvrir loadLinks, createLink, updateLink, deleteLink, reorderLinks, fetchOgPreview (HTTP + signal updates)
  - [x] Mettre à jour `links.component.spec.ts` : ajouter mock `LinksService`, couvrir openAddLinkDialog, openEditLinkDialog, openDeleteLinkDialog, dropLink

---

## Dev Notes

### Périmètre de cette story

Cette story est **backend + frontend**. Elle ajoute le CRUD complet des liens individuels.

**Ce que cette story ne fait PAS :**
- Pas de `LinkCategoryCard` collapsible (story 4.5) — l'affichage reste une liste plate
- Pas de toggle mode lecture/édition (story 4.4) — editMode reste `signal(true)` permanent
- Pas de thème clair/sombre ni état vide amélioré (story 4.6)
- Pas de déplacement de liens entre catégories (drag-drop inter-catégorie)

### Backend — OgFetchService (nouveau module)

#### Implémentation avec fetch natif Node.js

**Pas de `@nestjs/axios` installé dans ce projet.** Utiliser `fetch` global natif de Node.js 18+ (Node 24 confirmé). Pattern avec `AbortController` pour timeout :

```typescript
// backend/src/og-fetch/og-fetch.service.ts
import { Injectable, Logger } from '@nestjs/common';

export interface OgData {
  title: string | null;
  faviconUrl: string | null;
}

@Injectable()
export class OgFetchService {
  private readonly logger = new Logger(OgFetchService.name);

  async fetchOgData(url: string): Promise<OgData> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Dashboard/1.0)' },
        redirect: 'follow',
      });
      if (!response.ok) return { title: null, faviconUrl: null };
      const html = await response.text();
      return {
        title: this.extractOgTitle(html) ?? this.extractHtmlTitle(html),
        faviconUrl: this.extractFaviconUrl(html, url),
      };
    } catch (err) {
      this.logger.warn(`OG fetch failed for ${url}: ${String(err)}`);
      return { title: null, faviconUrl: null };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private extractOgTitle(html: string): string | null {
    const m = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    return m?.[1]?.trim() ?? null;
  }

  private extractHtmlTitle(html: string): string | null {
    return html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? null;
  }

  private extractFaviconUrl(html: string, pageUrl: string): string | null {
    const origin = new URL(pageUrl).origin;
    const m = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
      ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["']/i);
    if (m?.[1]) {
      const href = m[1];
      if (href.startsWith('http')) return href;
      if (href.startsWith('//')) return `https:${href}`;
      return `${origin}${href.startsWith('/') ? '' : '/'}${href}`;
    }
    return `${origin}/favicon.ico`;
  }
}
```

```typescript
// backend/src/og-fetch/og-fetch.module.ts
import { Module } from '@nestjs/common';
import { OgFetchService } from './og-fetch.service';

@Module({
  providers: [OgFetchService],
  exports: [OgFetchService],
})
export class OgFetchModule {}
```

#### Test OgFetchService (mock globalThis.fetch)

```typescript
// backend/src/og-fetch/og-fetch.service.spec.ts
import { Test } from '@nestjs/testing';
import { OgFetchService } from './og-fetch.service';

describe('OgFetchService', () => {
  let service: OgFetchService;
  const mockFetch = jest.fn();

  beforeEach(async () => {
    globalThis.fetch = mockFetch;
    const module = await Test.createTestingModule({ providers: [OgFetchService] }).compile();
    service = module.get(OgFetchService);
  });

  it('should extract og:title and favicon from HTML', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(
        '<html><head><meta property="og:title" content="GitHub"/>' +
        '<link rel="icon" href="/favicon.ico"></head></html>'
      ),
    });
    const result = await service.fetchOgData('https://github.com');
    expect(result.title).toBe('GitHub');
    expect(result.faviconUrl).toBe('https://github.com/favicon.ico');
  });

  it('should fallback to <title> if no og:title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><head><title>My Page</title></head></html>'),
    });
    const result = await service.fetchOgData('https://example.com');
    expect(result.title).toBe('My Page');
    expect(result.faviconUrl).toBe('https://example.com/favicon.ico');
  });

  it('should return nulls on fetch error', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));
    const result = await service.fetchOgData('https://unreachable.example.com');
    expect(result).toEqual({ title: null, faviconUrl: null });
  });
});
```

### Backend — LinksService

#### Règle impérative : vérifier l'ownership de la catégorie à la création

À la création d'un lien, vérifier que `categoryId` appartient à `userId` pour éviter la création de liens dans des catégories d'un autre utilisateur :

```typescript
// backend/src/links/links.service.ts
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LinkEntity } from './link.entity';
import { LinkCategoryEntity } from './link-category.entity';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';

@Injectable()
export class LinksService {
  private readonly logger = new Logger(LinksService.name);

  constructor(
    @InjectRepository(LinkEntity)
    private readonly repo: Repository<LinkEntity>,
    @InjectRepository(LinkCategoryEntity)
    private readonly categoryRepo: Repository<LinkCategoryEntity>,
  ) {}

  findAll(userId: number): Promise<LinkEntity[]> {
    return this.repo.find({
      where: { userId },
      order: { categoryId: 'ASC', position: 'ASC' },
    });
  }

  async create(userId: number, dto: CreateLinkDto): Promise<LinkEntity> {
    // Vérifier que la catégorie appartient à cet utilisateur
    const category = await this.categoryRepo.findOne({
      where: { id: dto.categoryId, userId },
    });
    if (!category) throw new ForbiddenException(`Catégorie ${dto.categoryId} introuvable`);

    const maxResult = await this.repo
      .createQueryBuilder('link')
      .select('MAX(link.position)', 'max')
      .where('link.categoryId = :categoryId AND link.userId = :userId', {
        categoryId: dto.categoryId,
        userId,
      })
      .getRawOne<{ max: number | null }>();

    const position = (maxResult?.max ?? -1) + 1;
    const link = this.repo.create({ ...dto, userId, position });
    return this.repo.save(link);
  }

  async update(userId: number, id: number, dto: UpdateLinkDto): Promise<LinkEntity> {
    const link = await this.repo.findOne({ where: { id, userId } });
    if (!link) throw new NotFoundException(`Lien ${id} introuvable`);
    Object.assign(link, dto);
    return this.repo.save(link);
  }

  async remove(userId: number, id: number): Promise<void> {
    const link = await this.repo.findOne({ where: { id, userId } });
    if (!link) throw new NotFoundException(`Lien ${id} introuvable`);
    await this.repo.remove(link);
  }

  async reorder(userId: number, items: { id: number; position: number }[]): Promise<void> {
    for (const item of items) {
      const result = await this.repo.update({ id: item.id, userId }, { position: item.position });
      if (result.affected === 0) {
        throw new NotFoundException(`Lien ${item.id} introuvable`);
      }
    }
  }
}
```

### Backend — LinksController (ORDRE DES ROUTES CRITIQUE)

En NestJS, les routes sont matchées dans l'ordre de déclaration. `GET og-preview` et `PATCH reorder` **DOIVENT** être déclarés avant `GET/:id` et `PATCH/:id` — sinon NestJS interprète `"og-preview"` ou `"reorder"` comme paramètre `:id`.

```typescript
// backend/src/links/links.controller.ts
import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseIntPipe, Query,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LinksService } from './links.service';
import { OgFetchService } from '../og-fetch/og-fetch.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ReorderLinksDto } from './dto/reorder-links.dto';

@ApiTags('links')
@Controller('links')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly ogFetchService: OgFetchService,
  ) {}

  @Get('og-preview')       // ← PREMIER (avant :id)
  fetchOgPreview(@Query('url') url: string) {
    return this.ogFetchService.fetchOgData(url);
  }

  @Get()
  findAll(@CurrentUser() user: { id: number }) {
    return this.linksService.findAll(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateLinkDto) {
    return this.linksService.create(user.id, dto);
  }

  @Patch('reorder')        // ← AVANT @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reorder(
    @CurrentUser() user: { id: number },
    @Body() dto: ReorderLinksDto,
  ): Promise<void> {
    await this.linksService.reorder(user.id, dto.items);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.linksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.linksService.remove(user.id, id);
  }
}
```

### Backend — Mise à jour LinksModule

```typescript
// backend/src/links/links.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { LinkEntity } from './link.entity';
import { LinkCategoriesController } from './link-categories.controller';
import { LinkCategoriesService } from './link-categories.service';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { OgFetchModule } from '../og-fetch/og-fetch.module';

@Module({
  imports: [TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity]), OgFetchModule],
  controllers: [LinkCategoriesController, LinksController],
  providers: [LinkCategoriesService, LinksService],
  exports: [LinkCategoriesService, LinksService],
})
export class LinksModule {}
```

### Backend — DTOs

```typescript
// create-link.dto.ts
import { IsString, IsUrl, MaxLength, IsOptional, IsInt, Min, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLinkDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'URL invalide' })
  @MaxLength(2048)
  @Transform(({ value }) => (value as string)?.trim())
  @ApiProperty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (value as string)?.trim())
  @ApiProperty()
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @ApiProperty({ required: false })
  description?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  @ApiProperty({ required: false })
  faviconUrl?: string | null;

  @IsInt()
  @Min(1)
  @ApiProperty()
  categoryId!: number;
}
```

```typescript
// update-link.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLinkDto } from './create-link.dto';

// categoryId exclu : pas de déplacement de lien entre catégories dans cette story
export class UpdateLinkDto extends PartialType(OmitType(CreateLinkDto, ['categoryId'] as const)) {}
```

```typescript
// reorder-links.dto.ts
import { IsArray, ValidateNested, IsInt, Min, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderLinkItem {
  @IsInt() id!: number;
  @IsInt() @Min(0) position!: number;
}

export class ReorderLinksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderLinkItem)
  @ArrayMaxSize(200)
  @ApiProperty({ type: [ReorderLinkItem] })
  items!: ReorderLinkItem[];
}
```

### Frontend — Interface Link et LinksService

```typescript
// frontend/src/app/links/links.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, finalize, catchError, of } from 'rxjs';

export interface Link {
  id: number;
  url: string;
  title: string;
  description: string | null;
  faviconUrl: string | null;
  position: number;
  categoryId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface OgPreview {
  title: string | null;
  faviconUrl: string | null;
}

export interface CreateLinkPayload {
  url: string;
  title: string;
  description?: string | null;
  faviconUrl?: string | null;
  categoryId: number;
}

@Injectable({ providedIn: 'root' })
export class LinksService {
  private readonly http = inject(HttpClient);

  readonly links = signal<Link[]>([]);
  readonly isLoadingLinks = signal(false);

  loadLinks(): Observable<Link[]> {
    this.isLoadingLinks.set(true);
    return this.http.get<Link[]>('/api/links').pipe(
      tap((links) => this.links.set(links)),
      catchError(() => of([])),
      finalize(() => this.isLoadingLinks.set(false)),
    );
  }

  createLink(dto: CreateLinkPayload): Observable<Link> {
    return this.http.post<Link>('/api/links', dto);
  }

  updateLink(id: number, dto: Partial<Omit<CreateLinkPayload, 'categoryId'>>): Observable<Link> {
    return this.http.patch<Link>(`/api/links/${id}`, dto);
  }

  deleteLink(id: number): Observable<void> {
    return this.http.delete<void>(`/api/links/${id}`);
  }

  reorderLinks(items: { id: number; position: number }[]): Observable<void> {
    return this.http.patch<void>('/api/links/reorder', { items });
  }

  fetchOgPreview(url: string): Observable<OgPreview> {
    return this.http.get<OgPreview>('/api/links/og-preview', { params: { url } });
  }
}
```

### Frontend — LinkDialogComponent

```typescript
// frontend/src/app/links/components/link-dialog/link-dialog.component.ts
import { Component, ChangeDetectionStrategy, inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Link } from '../../links.service';
import { LinksService } from '../../links.service';

export interface LinkDialogData {
  link?: Link;
  categoryId: number;
}

export interface LinkDialogResult {
  url: string;
  title: string;
  description?: string | null;
  faviconUrl?: string | null;
  categoryId: number;
}

@Component({
  selector: 'app-link-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './link-dialog.component.html',
  styleUrl: './link-dialog.component.scss',
})
export class LinkDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<LinkDialogComponent>);
  readonly data = inject<LinkDialogData>(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);
  private readonly linksService = inject(LinksService);

  readonly isEdit = !!this.data?.link;
  readonly isFetchingOg = signal(false);

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      url: [this.data?.link?.url ?? '', [Validators.required, Validators.maxLength(2048)]],
      title: [this.data?.link?.title ?? '', [Validators.required, Validators.maxLength(255)]],
      description: [this.data?.link?.description ?? '', [Validators.maxLength(1000)]],
      faviconUrl: [this.data?.link?.faviconUrl ?? ''],
    });
  }

  onUrlBlur(): void {
    const url = this.form.get('url')?.value as string;
    if (!url || this.isEdit) return;  // pas de refetch en édition
    try { new URL(url); } catch { return; }  // URL invalide → skip

    this.isFetchingOg.set(true);
    this.linksService.fetchOgPreview(url).subscribe({
      next: (og) => {
        if (og.title && !this.form.get('title')?.dirty) {
          this.form.patchValue({ title: og.title, faviconUrl: og.faviconUrl ?? '' });
        }
        this.isFetchingOg.set(false);
      },
      error: () => this.isFetchingOg.set(false),
    });
  }

  confirm(): void {
    if (this.form.invalid) return;
    const { url, title, description, faviconUrl } = this.form.value as Record<string, string>;
    this.dialogRef.close({
      url: url.trim(),
      title: title.trim(),
      description: description?.trim() || null,
      faviconUrl: faviconUrl?.trim() || null,
      categoryId: this.data.categoryId,
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
```

### Frontend — Mise à jour LinksComponent

**Méthodes à ajouter** (ne pas casser l'existant) :

```typescript
// Injection supplémentaire (ajouter à l'existant)
protected readonly linksService = inject(LinksService);

// Dans ngOnInit (ajouter après loadCategories)
this.linksService.loadLinks().subscribe();

// Computed/méthode pour filtrer les liens par catégorie
linksForCategory(categoryId: number): Link[] {
  return this.linksService.links().filter((l) => l.categoryId === categoryId);
}

// CRUD liens
openAddLinkDialog(categoryId: number): void {
  const ref = this.dialog.open<LinkDialogComponent, LinkDialogData, LinkDialogResult>(
    LinkDialogComponent,
    { width: '480px', maxWidth: '95vw', data: { categoryId } },
  );
  ref.afterClosed().subscribe((result) => {
    if (!result) return;
    this.linksService.createLink(result).subscribe({
      next: (link) => {
        this.linksService.links.update((links) => [...links, link]);
        this.snackBar.open('Lien ajouté', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la création', 'Fermer', { duration: 4000 }),
    });
  });
}

openEditLinkDialog(link: Link): void {
  const ref = this.dialog.open<LinkDialogComponent, LinkDialogData, LinkDialogResult>(
    LinkDialogComponent,
    { width: '480px', maxWidth: '95vw', data: { link, categoryId: link.categoryId } },
  );
  ref.afterClosed().subscribe((result) => {
    if (!result) return;
    const { categoryId: _, ...dto } = result;
    this.linksService.updateLink(link.id, dto).subscribe({
      next: (updated) => {
        this.linksService.links.update((links) =>
          links.map((l) => (l.id === link.id ? updated : l)),
        );
        this.snackBar.open('Lien mis à jour', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la modification', 'Fermer', { duration: 4000 }),
    });
  });
}

openDeleteLinkDialog(link: Link): void {
  const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
    ConfirmDialogComponent,
    {
      width: '400px',
      maxWidth: '95vw',
      data: {
        title: `Supprimer "${link.title}" ?`,
        message: 'Cette action est irréversible.',
        confirmLabel: 'Supprimer',
      },
    },
  );
  ref.afterClosed().subscribe((confirmed) => {
    if (!confirmed) return;
    this.linksService.deleteLink(link.id).subscribe({
      next: () => {
        this.linksService.links.update((links) => links.filter((l) => l.id !== link.id));
        this.snackBar.open('Lien supprimé', 'Fermer', { duration: 3000 });
      },
      error: () => this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 4000 }),
    });
  });
}

dropLink(event: CdkDragDrop<Link[]>, categoryId: number): void {
  if (event.previousIndex === event.currentIndex) return;
  const categoryLinks = [...this.linksForCategory(categoryId)];
  moveItemInArray(categoryLinks, event.previousIndex, event.currentIndex);
  // Mise à jour optimiste du signal
  this.linksService.links.update((all) => [
    ...all.filter((l) => l.categoryId !== categoryId),
    ...categoryLinks,
  ]);
  const items = categoryLinks.map((l, i) => ({ id: l.id, position: i }));
  this.linksService.reorderLinks(items).subscribe({
    error: () => {
      this.linksService.loadLinks().subscribe();
      this.snackBar.open('Erreur lors de la réorganisation', 'Fermer', { duration: 3000 });
    },
  });
}
```

### Frontend — Template HTML (extrait à intégrer dans links.component.html)

Structure à ajouter **dans la boucle `@for (cat of ...)` existante**, après la section `category-item-content` :

```html
<!-- Liste des liens de la catégorie (nested cdkDropList) -->
<div
  [id]="'link-list-' + cat.id"
  cdkDropList
  [cdkDropListData]="linksForCategory(cat.id)"
  (cdkDropListDropped)="dropLink($event, cat.id)"
  class="link-list"
>
  @for (link of linksForCategory(cat.id); track link.id) {
    <div cdkDrag [cdkDragDisabled]="!editMode()" class="link-item">
      @if (editMode()) {
        <mat-icon cdkDragHandle class="drag-handle">drag_handle</mat-icon>
      }
      <!-- Favicon ou initiale -->
      @if (link.faviconUrl) {
        <img [src]="link.faviconUrl" width="16" height="16" alt="" class="link-favicon" />
      } @else {
        <span class="link-initial">{{ link.title.charAt(0).toUpperCase() }}</span>
      }
      <a [href]="link.url" target="_blank" rel="noopener noreferrer" class="link-title">
        {{ link.title }}
      </a>
      @if (editMode()) {
        <div class="link-actions">
          <button mat-icon-button (click)="openEditLinkDialog(link)" aria-label="Modifier le lien">
            <mat-icon>edit</mat-icon>
          </button>
          <button mat-icon-button (click)="openDeleteLinkDialog(link)" aria-label="Supprimer le lien">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
      }
    </div>
  }
  @if (editMode()) {
    <button mat-button class="add-link-button" (click)="openAddLinkDialog(cat.id)">
      <mat-icon>add</mat-icon>
      Ajouter un lien
    </button>
  }
</div>
```

**Imports à ajouter dans `LinksComponent`** : `LinksService`, `Link`, `LinkDialogComponent`, `LinkDialogData`, `LinkDialogResult`

### Points d'attention critiques

1. **OgFetchModule doit être importé dans LinksModule** — pas ajouté à `AppModule`. Il est une dépendance interne de `LinksModule`.

2. **`LinksService` (Angular) vs `link-categories.service.ts`** — deux services distincts. `LinksService` gère `Link[]`, `LinkCategoriesService` gère `LinkCategory[]`. Ne pas fusionner.

3. **`linksForCategory()` appelé depuis le template** — méthode pure filtrée depuis signal, pas de computed séparé nécessaire. Appelée plusieurs fois par rendu — acceptable car le signal change rarement.

4. **Nested CDK drag-drop** : le `cdkDropList` des catégories (existant) et les `cdkDropList` des liens (nouveaux) sont **indépendants**. Pas besoin de `cdkDropListGroup` pour ce scope (pas de drag inter-catégorie).

5. **`editMode = signal(true)` reste permanent** — Story 4.4 ajoutera le vrai toggle. Ne pas modifier ce comportement.

6. **`MatDialogModule`/`MatSnackBarModule` hors des imports du composant** — comme établi en story 4.2, ces modules sont `providedIn: 'root'` en AM21 ; les inclure dans `imports[]` casse les mocks Vitest. Pattern exact = ne **pas** les mettre dans les imports.

7. **Tests : Vitest (`vi.fn()`)** — pas Jasmine/Karma. Pas de `fakeAsync/tick` (zoneless). Utiliser `Subject` synchrones pour les observables dans les tests de composant.

8. **`@Transform` trim sur `url` et `title`** — appris de la review 4.2 : toujours trimmer les champs string.

9. **`ForbiddenException` vs `NotFoundException`** — à la création d'un lien, si `categoryId` n'appartient pas à l'utilisateur → `ForbiddenException` (ne pas révéler l'existence de la catégorie d'un autre utilisateur). En update/delete : `NotFoundException` si ownership échoue.

10. **Pas de `@IsUrl` sur `faviconUrl`** — la valeur est générée par le serveur, pas saisie par l'utilisateur. Juste `MaxLength(2048)`.

---

## Arborescence des fichiers à créer/modifier

```
backend/src/
├── og-fetch/                                ← NOUVEAU MODULE
│   ├── og-fetch.module.ts                   ← créer
│   ├── og-fetch.service.ts                  ← créer
│   └── og-fetch.service.spec.ts             ← créer
└── links/
    ├── links.module.ts                      ← modifier (OgFetchModule + LinksController + LinksService)
    ├── links.controller.ts                  ← créer
    ├── links.controller.spec.ts             ← créer
    ├── links.service.ts                     ← créer
    ├── links.service.spec.ts                ← créer
    └── dto/
        ├── create-link.dto.ts               ← créer
        ├── update-link.dto.ts               ← créer
        └── reorder-links.dto.ts             ← créer

frontend/src/app/links/
├── links.service.ts                         ← créer
├── links.service.spec.ts                    ← créer
├── links.component.ts                       ← modifier (inject LinksService, méthodes CRUD liens)
├── links.component.html                     ← modifier (liste liens par catégorie + nested drag-drop)
├── links.component.scss                     ← modifier (styles link-list, link-item, link-favicon, link-initial)
├── links.component.spec.ts                  ← modifier (ajouter tests liens)
└── components/
    └── link-dialog/
        ├── link-dialog.component.ts         ← créer
        ├── link-dialog.component.html       ← créer
        └── link-dialog.component.scss       ← créer
```

---

## Project Structure Notes

- **OgFetchModule** : `backend/src/og-fetch/` — module autonome sans dépendances TypeORM
- **LinksService** (backend) : injecte les deux repos `LinkEntity` **et** `LinkCategoryEntity` (pour vérifier l'ownership catégorie à la création)
- **LinksService** (Angular) : `frontend/src/app/links/links.service.ts` — distinct de `link-categories.service.ts`
- **LinkDialogComponent** : `frontend/src/app/links/components/link-dialog/` — même pattern que `category-dialog/`
- **Route `/api/links`** : contrôlée par `LinksController` — séparée de `/api/link-categories` (`LinkCategoriesController`)

---

## References

- [Source: epics.md#Story 4.3 — critères d'acceptation CRUD liens + favicon]
- [Source: architecture.md#Dépendances croisées — OgFetchService dépendance de LinksModule uniquement]
- [Source: architecture.md#Structure Backend — backend/src/og-fetch/ + backend/src/links/]
- [Source: architecture.md#Intégrations externes — OgFetchService: requête HTTP server-side, timeout court, fallback null]
- [Source: architecture.md#Patterns de Nommage — routes REST pluriel kebab-case]
- [Source: 4-2-crud-des-categories-de-liens.md#Dev Notes — PATCH reorder avant PATCH :id, ownership, patterns tests Vitest zoneless]
- [Source: 4-2-crud-des-categories-de-liens.md#Review Findings — @ArrayMaxSize, @Transform trim, NotFoundException sur reorder, [cdkDragDisabled], guard early return sur drop]
- [Source: backend/src/links/link.entity.ts — champs LinkEntity: url, title, description, faviconUrl, position, categoryId, userId]
- [Source: backend/src/links/link-categories.service.ts — pattern MAX(position) + 1]
- [Source: frontend/src/app/links/link-categories.service.ts — pattern signals + catchError + finalize]
- [Source: frontend/src/app/links/links.component.ts — editMode signal(true) existant, CDK drag-drop pattern]
- [Source: frontend/src/app/links/components/category-dialog/category-dialog.component.ts — pattern dialog MAT_DIALOG_DATA + FormBuilder]

---

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-05-19)

### Completion Notes List

- T1 : `OgFetchModule` créé avec `fetch` natif Node.js 18+ + `AbortController` (timeout 3s). Extraction og:title, title HTML, favicon — fallback `origin/favicon.ico`. 6 tests unitaires passent.
- T2 : Trois DTOs créés. `UpdateLinkDto` exclut `categoryId` via `OmitType`. `@Transform` trim sur `url` et `title` (conformément au retour de review 4.2).
- T3 : `LinksService` avec vérification ownership catégorie (`ForbiddenException`) à la création, `NotFoundException` pour update/remove/reorder. Pattern `MAX(position) + 1` identique à `LinkCategoriesService`. 10 tests passent.
- T4 : `LinksController` avec ordre critique des routes : `og-preview` AVANT `/:id`, `reorder` AVANT `/:id`. 6 tests passent.
- T5 : `LinksModule` mis à jour avec `OgFetchModule`, `LinksController`, `LinksService`.
- T6 : 137 tests backend passent, 0 régression.
- T7 : `LinksService` Angular avec signals (`links`, `isLoadingLinks`), `loadLinks`, `createLink`, `updateLink`, `deleteLink`, `reorderLinks`, `fetchOgPreview`. 8 tests passent.
- T8 : `LinkDialogComponent` standalone OnPush, OG fetch sur blur URL (skip si édition, skip si URL invalide), spinner `isFetchingOg` signal local, pré-remplissage en mode édition.
- T9 : `LinksComponent` mis à jour — injection `LinksService`, `linksForCategory()`, CRUD complet, `dropLink()` avec optimistic update. Template : nested `cdkDropList` par catégorie, favicon ou initiale. Layout catégorie passé en colonne avec header row pour header + link-list.
- T10 : 19 tests `LinksComponent` + 8 tests `LinksService` Angular passent. Seul test pré-existant `top-bar.component.spec.ts` est en échec (non lié à cette story).

### File List

**Backend — Nouveaux fichiers :**
- `backend/src/og-fetch/og-fetch.module.ts`
- `backend/src/og-fetch/og-fetch.service.ts`
- `backend/src/og-fetch/og-fetch.service.spec.ts`
- `backend/src/links/dto/create-link.dto.ts`
- `backend/src/links/dto/update-link.dto.ts`
- `backend/src/links/dto/reorder-links.dto.ts`
- `backend/src/links/links.service.ts`
- `backend/src/links/links.service.spec.ts`
- `backend/src/links/links.controller.ts`
- `backend/src/links/links.controller.spec.ts`

**Backend — Modifiés :**
- `backend/src/links/links.module.ts`

**Frontend — Nouveaux fichiers :**
- `frontend/src/app/links/links.service.ts`
- `frontend/src/app/links/links.service.spec.ts`
- `frontend/src/app/links/components/link-dialog/link-dialog.component.ts`
- `frontend/src/app/links/components/link-dialog/link-dialog.component.html`
- `frontend/src/app/links/components/link-dialog/link-dialog.component.scss`

**Frontend — Modifiés :**
- `frontend/src/app/links/links.component.ts`
- `frontend/src/app/links/links.component.html`
- `frontend/src/app/links/links.component.scss`
- `frontend/src/app/links/links.component.spec.ts`

### Review Findings

**Décisions requises :**
- [ ] [Review][Decision] `@SkipThrottle()` sur tout le contrôleur — og-preview sans rate limit — La spec exige `@SkipThrottle()` au niveau controller, mais l'endpoint `og-preview` effectue une requête HTTP externe à chaque appel ; sans throttling, un utilisateur authentifié peut l'utiliser pour scanner le réseau ou flooder des sites tiers. Options : (A) ajouter un rate limit spécifique sur og-preview uniquement, (B) conserver @SkipThrottle() et documenter le risque, (C) déplacer og-preview hors du controller Links avec throttling séparé.
- [ ] [Review][Decision] `faviconUrl` exposé en saisie libre dans le formulaire — La spec décrit `faviconUrl` comme une valeur générée côté serveur (pré-remplie par l'OG fetch), mais le formulaire expose un champ "URL du favicon (optionnel)" éditable par l'utilisateur. Options : (A) supprimer le champ (favicon strictement server-generated), (B) conserver le champ (UX bonus permettant à l'utilisateur de corriger le favicon).
- [ ] [Review][Decision] `MatDialogModule` dans `imports[]` de `LinkDialogComponent` — La contrainte AM21 établie en story 4.2 dit de ne pas inclure `MatDialogModule` dans les imports du composant standalone. Or le template utilise `mat-dialog-title/content/actions` qui nécessitent ces directives. Options : (A) remplacer `MatDialogModule` par les imports standalone individuels (`MatDialogTitle`, `MatDialogContent`, `MatDialogActions`), (B) vérifier que le pattern de `CategoryDialogComponent` est identique et aligner.

**Patches à appliquer :**
- [x] [Review][Patch] SSRF — og-preview accepte toute URL sans validation ni filtre de schéma [backend/src/links/links.controller.ts:fetchOgPreview]
- [x] [Review][Patch] `reorder()` non atomique — N updates séquentiels sans transaction, état partiel en cas d'échec [backend/src/links/links.service.ts:reorder]
- [x] [Review][Patch] Race condition OG fetch dans `onUrlBlur()` — deux blurs rapides → deux requêtes concurrentes → réponse obsolète peut écraser le formulaire [frontend/src/app/links/components/link-dialog/link-dialog.component.ts:onUrlBlur]
- [x] [Review][Patch] Observable non unsubscribed dans `onUrlBlur()` — memory leak si dialog fermé pendant le fetch en cours [frontend/src/app/links/components/link-dialog/link-dialog.component.ts:onUrlBlur]
- [x] [Review][Patch] `response.text()` sans limite de taille — une réponse volumineuse (fichier lourd) charge la totalité en mémoire [backend/src/og-fetch/og-fetch.service.ts:fetchOgData]
- [x] [Review][Patch] `MAX(position)` retourné en string par TypeORM (raw query) — `"2" + 1 = "21"` au lieu de `3` [backend/src/links/links.service.ts:create]
- [x] [Review][Patch] `failedFavicons` jamais purgé après `updateLink` — une favicon corrigée reste masquée jusqu'au rechargement [frontend/src/app/links/links.component.ts:openEditLinkDialog]
- [x] [Review][Patch] `@Min(1)` manquant sur `ReorderLinkItem.id` — id=0 ou négatif accepté par le DTO [backend/src/links/dto/reorder-links.dto.ts]

**Différés :**
- [x] [Review][Defer] Race condition `create()` simultanées — deux créations concurrentes → position dupliquée [backend/src/links/links.service.ts:create] — deferred, pre-existing (pattern identique à link-categories, app mono-utilisateur)
- [x] [Review][Defer] Fuite d'information dans les messages d'erreur — IDs exposés dans ForbiddenException/NotFoundException [backend/src/links/links.service.ts] — deferred, pre-existing (pattern établi dans toute la codebase, app auto-hébergée)
- [x] [Review][Defer] Entités HTML non décodées dans `og:title` / `<title>` — titres avec `&amp;` affichés bruts [backend/src/og-fetch/og-fetch.service.ts] — deferred, pre-existing (amélioration qualité, non bloquant)
- [x] [Review][Defer] `faviconUrl` relative avec `../` non normalisée — chemin résolu invalide [backend/src/og-fetch/og-fetch.service.ts:extractFaviconUrl] — deferred, pre-existing (cas extrêmement rare en pratique)
- [x] [Review][Defer] `loadLinks()` concurrent sans annulation — appels parallèles → signal peut être écrasé par une réponse plus ancienne [frontend/src/app/links/links.service.ts:loadLinks] — deferred, pre-existing (pattern identique à link-categories, app mono-utilisateur)

---

## Change Log

- 2026-05-19 : Story créée — contexte complet pour implémentation 4.3 CRUD des liens + OgFetchService
- 2026-05-19 : Implémentation complète — backend (OgFetchModule, DTOs, LinksService, LinksController, LinksModule) + frontend (LinksService Angular, LinkDialogComponent, LinksComponent mis à jour). 137 tests backend + 27 tests frontend passent.
