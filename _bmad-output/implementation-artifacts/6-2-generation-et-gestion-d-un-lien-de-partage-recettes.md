---
baseline_commit: acd55f2c68f3cab99e0b8601677e9ff76b2fee68
---

# Story 6.2 : Génération et gestion d'un lien de partage (recettes)

**Épic :** 6 — Partage public (recettes)
**Statut :** done
**Créée le :** 2026-07-13

---

## User Story

En tant qu'utilisateur authentifié,
Je veux générer un lien public pour partager une **recette**, choisir sa durée d'expiration et le révoquer à tout moment,
Afin de partager mes recettes de façon sécurisée et contrôlée.

> **Périmètre :** cette story couvre le partage des **recettes uniquement**. Le partage des notes sera ajouté en Story 8.7, une fois les entités `Note` disponibles. L'API et les DTOs sont conçus pour supporter `resourceType: 'recipe' | 'note'` au niveau de l'entité `PublicToken` (déjà en place depuis la Story 6.1), mais **cette story n'implémente et ne valide que `'recipe'`** — ne pas construire de logique de validation pour `'note'` maintenant (le repository `Note` n'existe pas encore).

---

## Critères d'acceptation

**AC1 — Ouverture du dialog de partage**
**Étant donné** que je clique l'icône "Partager" sur une recette,
**Quand** le `ShareLinkDialog` (`MatDialog`) s'ouvre,
**Alors** il affiche un radio group avec 4 options d'expiration : 24h, 7j, 30j, Permanent

**AC2 — Génération du lien**
**Étant donné** que je clique "Générer le lien",
**Quand** `POST /api/sharing` est appelé avec `resourceType: 'recipe'`,
**Alors** le backend génère un token via `crypto.randomBytes(32)` (256 bits d'entropie, URL-safe base64), le stocke en DB avec l'expiration choisie, et retourne le token — l'URL complète est composée côté frontend (`${window.location.origin}/share/${token}`, cf. Dev Notes T7)

**AC3 — Affichage, copie et badge**
**Étant donné** que le lien est généré,
**Quand** il s'affiche dans le dialog,
**Alors** il est automatiquement copié dans le presse-papier avec snackbar "Lien copié ✓", et un badge "Partagé" + icône cadenas apparaît dans le header de la page détail de la recette

**AC4 — Révocation**
**Étant donné** qu'un lien est actif,
**Quand** je clique "Révoquer" dans le dialog et confirme,
**Alors** `PATCH /api/sharing/:id/revoke` marque `revokedAt = NOW()`, le badge "Partagé" disparaît, le dialog passe à l'état `revoked`

**AC5 — Lien déjà existant** _(révisé après review 2026-07-13 : un seul lien actif par recette)_
**Étant donné** qu'une recette a déjà un lien actif,
**Quand** j'ouvre le `ShareLinkDialog`,
**Alors** le lien existant est réaffiché avec son statut et son expiration (bouton copier disponible) — la création d'un second lien concurrent est refusée côté serveur (`409`) pour ne pas invalider un lien déjà partagé ; pour faire tourner l'URL, le bouton « Régénérer » révoque l'ancien lien puis en génère un nouveau

---

## Tâches / Sous-tâches

### T1 — DTO `CreateShareDto` (AC: AC2)

- [x] Créer `backend/src/sharing/dto/create-share.dto.ts`
  - [x] `resourceType: 'recipe'` — `@IsIn(['recipe'])` (pas `'note'`, cf. note de périmètre ci-dessus)
  - [x] `resourceId: number` — `@IsInt() @Min(1)`
  - [x] `expiresIn: '24h' | '7d' | '30d' | 'permanent'` — `@IsIn(['24h', '7d', '30d', 'permanent'])`

### T2 — `SharingService` (AC: AC2, AC4, AC5)

- [x] Modifier `backend/src/sharing/sharing.module.ts` : ajouter `Recipe` à `TypeOrmModule.forFeature([...])`, ajouter `SharingController` + `SharingService`
- [x] Créer `backend/src/sharing/sharing.service.ts`
  - [x] `create(userId, dto)` : vérifie que la recette `dto.resourceId` appartient à `userId` (sinon `NotFoundException`), génère `token = randomBytes(32).toString('base64url')`, calcule `expiresAt` selon `expiresIn`, sauvegarde
  - [x] `revoke(userId, id)` : charge le token par `id`, `NotFoundException` si absent, `ForbiddenException` si `token.userId !== userId`, sinon `revokedAt = new Date()` et sauvegarde
  - [x] `findActiveForResource(userId, resourceType, resourceId)` : retourne les tokens non révoqués et non expirés, triés `createdAt DESC`

### T3 — `SharingController` (AC: AC2, AC4, AC5)

- [x] Créer `backend/src/sharing/sharing.controller.ts`
  - [x] `@UseGuards(JwtAuthGuard) @SkipThrottle()` sur le contrôleur (pattern `RecipesController`)
  - [x] `POST /api/sharing` → `SharingService.create`
  - [x] `PATCH /api/sharing/:id/revoke` → `SharingService.revoke`
  - [x] `GET /api/sharing?resourceType=recipe&resourceId=X` → `SharingService.findActiveForResource` (query params simples, pas de DTO — pattern `LinksController.fetchOgPreview`)

### T4 — Nettoyage des tokens à la suppression d'une recette (AC: régression — cf. Dev Notes T4)

- [x] Modifier `backend/src/recipes/recipes.service.ts` : `remove()` passe en transaction, supprime les `PublicToken` orphelins avant de supprimer la recette

### T5 — Tests backend (AC: tous)

- [x] Créer `backend/src/sharing/sharing.service.spec.ts`
- [x] Créer `backend/src/sharing/sharing.controller.spec.ts`
- [x] Modifier `backend/src/recipes/recipes.service.spec.ts` : ajouter `describe('remove()')`

### T6 — `SharingService` frontend (AC: AC2, AC3, AC4, AC5)

- [x] Créer `frontend/src/app/shared/services/sharing.service.ts`

### T7 — `ShareLinkDialog` (AC: AC1, AC2, AC3, AC4, AC5)

- [x] Créer `frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.ts` (+ `.html`, `.scss`)
  - [x] États : `idle | generating | link-ready | revoked` (pattern `ResetPasswordDialogComponent`)
  - [x] À l'ouverture : appelle `findActiveForResource` — si un token actif existe, état initial `link-ready` ; sinon `idle`
  - [x] "Générer le lien" → état `generating` → `createShareLink` → construit l'URL (`buildShareUrl`), copie presse-papier, snackbar, état `link-ready`
  - [x] "Révoquer" → ouvre `ConfirmDialogComponent` → si confirmé, `revokeShareLink` → état `revoked`

### T8 — Intégration dans `RecipeDetailComponent` (AC: AC1, AC3, AC4)

- [x] Modifier `recipe-detail.component.ts` / `.html` / `.scss`
  - [x] Bouton icône "Partager" (`mat-icon-button`, icône `share`) dans `.detail-header`
  - [x] Badge "Partagé" + icône `lock` affiché conditionnellement à côté du titre
  - [x] `refreshShareStatus()` appelé dans `ngOnInit` et après fermeture du dialog (`afterClosed()`)

### T9 — Tests frontend (AC: tous)

- [x] Créer `frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.spec.ts`
- [x] Créer `frontend/src/app/shared/services/sharing.service.spec.ts`

### T10 — Test E2E (AC: AC1–AC5)

- [x] Créer `e2e/tests/recipes-share.spec.ts` (pattern `recipes-delete.spec.ts`)

---

## Dev Notes

### Contexte critique hérité de la Story 6.1

La Story 6.1 a livré l'entité `PublicToken` (`backend/src/sharing/public-token.entity.ts`) et un `SharingModule` squelette (entité + `TypeOrmModule.forFeature` uniquement, **pas de contrôleur ni service**). Sa review a explicitement **déféré à cette story** :

> "`resourceId` sans FK ni contrainte de référence — tokens orphelins si une recette est supprimée avant Story 6.2 — deferred, géré côté service en Story 6.2 per spec"

→ C'est la Tâche T4 ci-dessous. **Ne pas l'oublier** : sans elle, supprimer une recette partagée laisse un `PublicToken` orphelin en base, invisible mais toujours "actif" tant que son `expiresAt` n'est pas dépassé.

`resourceId` reste un lien polymorphique **sans FK typée** (peut pointer `Recipe` ou, plus tard, `Note`) — la cascade de suppression est gérée ici manuellement, pas via contrainte BDD.

### T1/T2 — DTO et logique CSPRNG

```typescript
// backend/src/sharing/dto/create-share.dto.ts
import { IsIn, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type ShareExpiresIn = '24h' | '7d' | '30d' | 'permanent';

export class CreateShareDto {
  @IsIn(['recipe'])
  @ApiProperty({ enum: ['recipe'] })
  resourceType!: 'recipe';

  @IsInt()
  @Min(1)
  @ApiProperty()
  resourceId!: number;

  @IsIn(['24h', '7d', '30d', 'permanent'])
  @ApiProperty({ enum: ['24h', '7d', '30d', 'permanent'] })
  expiresIn!: ShareExpiresIn;
}
```

```typescript
// backend/src/sharing/sharing.service.ts
import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PublicToken, ResourceType } from './public-token.entity';
import { Recipe } from '../recipes/recipe.entity';
import { CreateShareDto, ShareExpiresIn } from './dto/create-share.dto';

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(PublicToken) private readonly repo: Repository<PublicToken>,
    @InjectRepository(Recipe) private readonly recipeRepo: Repository<Recipe>,
  ) {}

  private computeExpiresAt(expiresIn: ShareExpiresIn): Date | null {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    switch (expiresIn) {
      case '24h': return new Date(now + DAY);
      case '7d': return new Date(now + 7 * DAY);
      case '30d': return new Date(now + 30 * DAY);
      case 'permanent': return null;
    }
  }

  async create(userId: number, dto: CreateShareDto): Promise<PublicToken> {
    const recipe = await this.recipeRepo.findOne({ where: { id: dto.resourceId, userId } });
    if (!recipe) throw new NotFoundException(`Recette ${dto.resourceId} introuvable`);

    const token = this.repo.create({
      token: randomBytes(32).toString('base64url'),
      resourceType: dto.resourceType,
      resourceId: dto.resourceId,
      userId,
      expiresAt: this.computeExpiresAt(dto.expiresIn),
    });
    return this.repo.save(token);
  }

  async revoke(userId: number, id: number): Promise<PublicToken> {
    const token = await this.repo.findOne({ where: { id } });
    if (!token) throw new NotFoundException(`Lien de partage ${id} introuvable`);
    if (token.userId !== userId) throw new ForbiddenException(`Lien de partage ${id} non autorisé`);
    token.revokedAt = new Date();
    return this.repo.save(token);
  }

  async findActiveForResource(
    userId: number,
    resourceType: ResourceType,
    resourceId: number,
  ): Promise<PublicToken[]> {
    const tokens = await this.repo.find({
      where: { userId, resourceType, resourceId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
    const now = new Date();
    return tokens.filter((t) => t.expiresAt === null || t.expiresAt > now);
  }
}
```

**Décision — `expiresAt IS NULL OR expiresAt > NOW()` filtré en JS, pas en SQL** : TypeORM ne compose pas facilement un `OR` dans un objet `where` simple. Le volume de tokens par utilisateur est trivial (pas de contrainte de perf, cf. PRD NFR Performance) — un filtre `.filter()` après un `find()` par `revokedAt IS NULL` est suffisant et lisible. Ne pas construire de `QueryBuilder` pour ça.

**Décision — pourquoi `SharingModule` importe l'entité `Recipe` directement** (`TypeOrmModule.forFeature([PublicToken, Recipe])`) plutôt que d'importer `RecipesModule` : la vérification de propriété (`POST /api/sharing` doit rejeter une tentative de partage d'une recette appartenant à un autre utilisateur — cf. PRD NFR Sécurité "aucune donnée d'un compte n'est accessible depuis un autre compte") nécessite une requête sur `Recipe`. Importer `RecipesModule` créerait une **dépendance circulaire** avec T4 (qui a besoin, en sens inverse, d'accéder à `PublicToken` depuis `RecipesService`). Importer directement la classe entité `Recipe` (sans importer `RecipesModule`) évite ce cycle : c'est le cas d'"relation explicite" qui justifie une exception au principe "pas d'import d'entité cross-module" de l'architecture — la relation entre un `PublicToken` et sa ressource cible est réelle, seulement non enforced par une FK BDD (polymorphisme).

### T3 — Contrôleur

```typescript
// backend/src/sharing/sharing.controller.ts
import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, HttpCode, HttpStatus, UseGuards, BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SharingService } from './sharing.service';
import { CreateShareDto } from './dto/create-share.dto';

@ApiTags('sharing')
@Controller('sharing')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les liens actifs pour une ressource' })
  findActiveForResource(
    @CurrentUser() user: { id: number },
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
  ) {
    if (resourceType !== 'recipe') throw new BadRequestException('resourceType invalide');
    const id = parseInt(resourceId, 10);
    if (isNaN(id)) throw new BadRequestException('resourceId invalide');
    return this.sharingService.findActiveForResource(user.id, 'recipe', id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Générer un lien de partage' })
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateShareDto) {
    return this.sharingService.create(user.id, dto);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Révoquer un lien de partage' })
  revoke(@CurrentUser() user: { id: number }, @Param('id', ParseIntPipe) id: number) {
    return this.sharingService.revoke(user.id, id);
  }
}
```

> **Note pour Story 6.3** : la route publique `GET /api/sharing/:token` (sans guard) sera ajoutée dans cette même controller par la Story 6.3. Elle ne rentre **pas en collision** avec `GET /api/sharing` ci-dessus (l'une n'a pas de segment de path, l'autre en a un) — aucun problème d'ordre de déclaration des routes à anticiper.

`sharing.module.ts` devient :

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicToken } from './public-token.entity';
import { Recipe } from '../recipes/recipe.entity';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublicToken, Recipe])],
  controllers: [SharingController],
  providers: [SharingService],
  exports: [TypeOrmModule],
})
export class SharingModule {}
```

`SharingModule` est déjà enregistré dans `app.module.ts` depuis la Story 6.1 — **aucune modification de `app.module.ts` nécessaire**.

### T4 — Nettoyage à la suppression (le point deferred de la 6.1)

**Fichier à MODIFIER : `backend/src/recipes/recipes.service.ts`**

```typescript
// Ajouter l'import en haut du fichier :
import { PublicToken } from '../sharing/public-token.entity';

// Remplacer remove() :
async remove(userId: number, id: number): Promise<void> {
  const recipe = await this.repo.findOne({ where: { id } });
  if (!recipe) throw new NotFoundException(`Recette ${id} introuvable`);
  if (recipe.userId !== userId) throw new ForbiddenException(`Recette ${id} non autorisée`);

  await this.dataSource.transaction(async (manager) => {
    await manager.delete(PublicToken, { resourceType: 'recipe', resourceId: id });
    const result = await manager.delete(Recipe, { id });
    if (result.affected === 0) {
      throw new InternalServerErrorException(`Suppression échouée pour la recette ${id}`);
    }
  });
  this.logger.log(`Recette ${id} supprimée pour userId=${userId}`);
}
```

**Point non-évident critique** : `manager.delete(PublicToken, {...})` fonctionne **sans avoir besoin d'ajouter `SharingModule` aux imports de `RecipesModule`**, et sans injecter `Repository<PublicToken>`. `PublicToken` est un simple import de classe (pas un import de module) ; le `DataSource` global (`backend/src/app.module.ts`) charge **toutes** les entités de l'app via le glob `entities: [__dirname + '/**/*.entity{.ts,.js}']`, indépendamment du module qui les déclare via `forFeature`. `EntityManager.delete()` a donc accès aux métadonnées de `PublicToken` dans n'importe quelle transaction. **Ne pas modifier `recipes.module.ts`** pour cette tâche — ce serait une dépendance inutile et créerait un cycle avec `SharingModule` (cf. décision T2 ci-dessus).

L'ordre des deux `delete` dans la transaction n'a pas d'importance (pas de contrainte FK entre les deux tables) — supprimer les tokens avant la recette est une convention, pas une nécessité technique.

### T5 — Tests backend

- `sharing.service.spec.ts` : mocker `Repository<PublicToken>` et `Repository<Recipe>` via `getRepositoryToken()` (pattern `recipes.service.spec.ts`). Couvrir : `create()` réussi, `create()` avec recette d'un autre user → `NotFoundException`, `revoke()` réussi, `revoke()` avec `userId` différent → `ForbiddenException`, `revoke()` token inexistant → `NotFoundException`, `findActiveForResource()` filtre bien les tokens révoqués/expirés.
- `sharing.controller.spec.ts` : mocker `SharingService` (pattern `recipes.controller.spec.ts`), vérifier que `findActiveForResource` rejette un `resourceType` ≠ `'recipe'` avec `BadRequestException`.
- `recipes.service.spec.ts` : ajouter `describe('remove()')` — réutiliser le helper `buildManager()` déjà présent dans le fichier (avec `delete: jest.fn().mockResolvedValue({ affected: 1 })`), vérifier que `dataSource.transaction` est appelé, que `manager.delete` est appelé pour `PublicToken` puis `Recipe`, et les cas `NotFoundException`/`ForbiddenException` (recette absente / autre utilisateur — **actuellement non testés du tout**, à ajouter).

### T6 — `SharingService` frontend

**Nouveau dossier** `frontend/src/app/shared/services/` (n'existe pas encore — seuls `components/` et `pipes/` existent sous `shared/`). Ce service est partagé entre modules métiers (recettes maintenant, notes en Épic 8), donc `shared/` est son emplacement naturel, pas `recipes/` ni `app/share/` (ce dernier dossier est réservé à la vue publique non-authentifiée, `ShareViewComponent`, déjà scaffoldée en stub — sans rapport avec cette story).

```typescript
// frontend/src/app/shared/services/sharing.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ShareResourceType = 'recipe';
export type ShareExpiresIn = '24h' | '7d' | '30d' | 'permanent';

export interface PublicShareToken {
  id: number;
  token: string;
  resourceType: ShareResourceType;
  resourceId: number;
  userId: number;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class SharingService {
  private readonly http = inject(HttpClient);

  findActiveForResource(
    resourceType: ShareResourceType,
    resourceId: number,
  ): Observable<PublicShareToken[]> {
    const params = new HttpParams()
      .set('resourceType', resourceType)
      .set('resourceId', resourceId);
    return this.http.get<PublicShareToken[]>('/api/sharing', { params });
  }

  createShareLink(
    resourceType: ShareResourceType,
    resourceId: number,
    expiresIn: ShareExpiresIn,
  ): Observable<PublicShareToken> {
    return this.http.post<PublicShareToken>('/api/sharing', { resourceType, resourceId, expiresIn });
  }

  revokeShareLink(id: number): Observable<PublicShareToken> {
    return this.http.patch<PublicShareToken>(`/api/sharing/${id}/revoke`, {});
  }

  buildShareUrl(token: string): string {
    return `${window.location.origin}/share/${token}`;
  }
}
```

**Décision — l'URL complète est composée côté frontend, pas retournée telle quelle par le backend** (nuance sur AC2) : le backend n'a pas de notion fiable de son origine publique (déployé derrière un reverse proxy, cf. architecture "CORS ... Prod = même origine via reverse proxy") et il n'existe aujourd'hui aucune variable d'env `APP_URL`/`PUBLIC_URL` dans `app.config.ts` — en ajouter une pour ce seul besoin serait une complexité évitable. Le frontend et l'API sont servis en same-origin en prod (nginx proxy `/api`), donc `window.location.origin` est toujours correct côté client. Le backend retourne uniquement le `token` (dans l'entité complète) ; `buildShareUrl()` compose l'URL affichée/copiée. Ne pas ajouter de config backend pour ça.

### T7 — `ShareLinkDialog`

**Nouveau dossier** `frontend/src/app/shared/components/share-link-dialog/` (à côté de `confirm-dialog/` et `material-icon-picker/`).

Pattern de référence direct pour la gestion d'états + presse-papier + snackbar : `frontend/src/app/admin/reset-password-dialog.component.ts` (dialog multi-état `confirm → password-reveal`, `navigator.clipboard.writeText(...).catch(...)`, `MatSnackBar`). Reprendre exactement ce pattern, adapté aux 4 états `idle | generating | link-ready | revoked` (cf. spec UX `ShareLinkDialog`).

```typescript
// frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.ts
import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SharingService, ShareResourceType, ShareExpiresIn, PublicShareToken } from '../../services/sharing.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';

export interface ShareLinkDialogData {
  resourceType: ShareResourceType;
  resourceId: number;
  resourceLabel: string;
}

type DialogState = 'idle' | 'generating' | 'link-ready' | 'revoked';

@Component({
  selector: 'app-share-link-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatRadioModule],
  templateUrl: './share-link-dialog.component.html',
  styleUrl: './share-link-dialog.component.scss',
})
export class ShareLinkDialogComponent implements OnInit {
  private readonly dialogRef = inject(MatDialogRef<ShareLinkDialogComponent>);
  private readonly dialog = inject(MatDialog);
  private readonly sharingService = inject(SharingService);
  private readonly snackBar = inject(MatSnackBar);
  readonly data = inject<ShareLinkDialogData>(MAT_DIALOG_DATA);

  readonly state = signal<DialogState>('idle');
  readonly selectedExpiresIn = signal<ShareExpiresIn>('7d');
  readonly currentToken = signal<PublicShareToken | null>(null);
  readonly shareUrl = computed(() => {
    const token = this.currentToken();
    return token ? this.sharingService.buildShareUrl(token.token) : '';
  });

  ngOnInit(): void {
    this.sharingService
      .findActiveForResource(this.data.resourceType, this.data.resourceId)
      .subscribe({
        next: (tokens) => {
          if (tokens.length > 0) {
            this.currentToken.set(tokens[0]);
            this.state.set('link-ready');
          }
        },
        error: () => {},
      });
  }

  generate(): void {
    this.state.set('generating');
    this.sharingService
      .createShareLink(this.data.resourceType, this.data.resourceId, this.selectedExpiresIn())
      .subscribe({
        next: (token) => {
          this.currentToken.set(token);
          this.state.set('link-ready');
          navigator.clipboard.writeText(this.sharingService.buildShareUrl(token.token)).catch(() => {});
          this.snackBar.open('Lien copié ✓', undefined, { duration: 3000 });
        },
        error: () => {
          this.state.set('idle');
          this.snackBar.open('Impossible de générer le lien', 'Fermer', { duration: 4000 });
        },
      });
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.shareUrl()).catch(() => {
      this.snackBar.open('Impossible de copier dans le presse-papier', 'Fermer', { duration: 3000 });
    });
  }

  revoke(): void {
    const token = this.currentToken();
    if (!token) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Révoquer le lien de partage ?',
        message: 'Ce lien ne sera plus accessible aux visiteurs.',
        confirmLabel: 'Révoquer',
      } satisfies ConfirmDialogData,
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.sharingService.revokeShareLink(token.id).subscribe({
        next: () => this.state.set('revoked'),
        error: () => this.snackBar.open('Impossible de révoquer le lien', 'Fermer', { duration: 4000 }),
      });
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}
```

Template (`share-link-dialog.component.html`) — à créer, structure attendue par états (cf. spec UX `ShareLinkDialog` — "Anatomy") :
- Titre : `Partager « {{ data.resourceLabel }} »`
- État `idle` : radio group (`mat-radio-group` lié à `selectedExpiresIn`) avec options `24h` / `7j` / `30j` / `Permanent`, bouton "Générer le lien"
- État `generating` : spinner ou bouton désactivé
- État `link-ready` : champ texte en lecture seule affichant `shareUrl()`, bouton copier (icône `content_copy`, `(click)="copyLink()"`), texte de statut ("Lien actif" + expiration formatée depuis `currentToken()!.expiresAt`), bouton "Révoquer"
- État `revoked` : message "Lien révoqué", bouton "Fermer"

### T8 — Intégration `RecipeDetailComponent`

**Modifier `recipe-detail.component.ts`** :
- Injecter `SharingService` (`../../shared/services/sharing.service`) et `ShareLinkDialogComponent`
- Ajouter `readonly hasActiveShare = signal(false)`
- Ajouter une méthode `refreshShareStatus()` appelant `sharingService.findActiveForResource('recipe', this.recipeId)` et faisant `this.hasActiveShare.set(tokens.length > 0)`
- L'appeler dans `ngOnInit()` (en plus du chargement de la recette existant, indépendamment — pas besoin de `forkJoin`, un appel HTTP de plus est négligeable ici)
- Ajouter `onShare()` :
  ```typescript
  onShare(): void {
    const recipe = this.recipe();
    if (!recipe) return;
    const ref = this.dialog.open(ShareLinkDialogComponent, {
      data: { resourceType: 'recipe', resourceId: recipe.id, resourceLabel: recipe.title } satisfies ShareLinkDialogData,
    });
    ref.afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.refreshShareStatus());
  }
  ```

**Modifier `recipe-detail.component.html`** — dans `.detail-header`, ajouter le bouton "Partager" (avant le bouton "edit", par exemple) :
```html
<button
  type="button"
  mat-icon-button
  (click)="onShare()"
  aria-label="Partager la recette"
>
  <mat-icon>share</mat-icon>
</button>
```
Et le badge, juste après `<h1 class="recipe-title">` :
```html
@if (hasActiveShare()) {
  <span class="share-badge" aria-label="Recette partagée">
    <mat-icon inline="true">lock</mat-icon>
    Partagé
  </span>
}
```

**Périmètre du badge** : affiché uniquement dans le header de la page détail (là où se déroule le parcours J4 de l'UX design). La vue liste (`recipes.component.html`) n'affiche pas de badge — les items y sont de simples lignes de texte sans zone d'icônes, et l'AC ne l'exige pas explicitement. Ne pas étendre ce badge à la liste dans cette story (hors périmètre).

### T9/T10 — Tests

Suivre les conventions déjà en place :
- `share-link-dialog.component.spec.ts` : mocker `SharingService`, tester les transitions d'état et l'appel `navigator.clipboard.writeText` (mocker `navigator.clipboard` comme dans un test existant si un pattern est déjà présent, sinon `Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn().mockResolvedValue(undefined) } })`).
- `e2e/tests/recipes-share.spec.ts` (pattern `recipes-delete.spec.ts` : helpers `loginAdmin`, `createTestRecipe`, `deleteTestRecipe`) :
  - Générer un lien depuis la page détail → vérifier snackbar "Lien copié ✓" et apparition du badge
  - Révoquer → vérifier disparition du badge
  - Ne **pas** tenter d'asserter le contenu réel du presse-papier via Playwright (aucune configuration de permissions clipboard n'existe dans `playwright.config.ts` actuellement) — se limiter aux effets visibles en UI (snackbar, badge, champ lien affiché).

---

## Project Structure Notes

**Fichiers backend à CRÉER :**
```
backend/src/sharing/dto/create-share.dto.ts
backend/src/sharing/sharing.service.ts
backend/src/sharing/sharing.controller.ts
backend/src/sharing/sharing.service.spec.ts
backend/src/sharing/sharing.controller.spec.ts
```

**Fichiers backend à MODIFIER :**
```
backend/src/sharing/sharing.module.ts        ← ajoute Recipe, SharingController, SharingService
backend/src/recipes/recipes.service.ts       ← remove() en transaction + cleanup PublicToken
backend/src/recipes/recipes.service.spec.ts  ← ajoute describe('remove()')
```
**`backend/src/app.module.ts` : PAS de modification** (SharingModule déjà enregistré depuis 6.1). **`backend/src/recipes/recipes.module.ts` : PAS de modification** (cf. décision T4 — pas d'import de module croisé nécessaire).

**Fichiers frontend à CRÉER :**
```
frontend/src/app/shared/services/sharing.service.ts
frontend/src/app/shared/services/sharing.service.spec.ts
frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.ts
frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.html
frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.scss
frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.spec.ts
e2e/tests/recipes-share.spec.ts
```

**Fichiers frontend à MODIFIER :**
```
frontend/src/app/recipes/recipe-detail/recipe-detail.component.ts
frontend/src/app/recipes/recipe-detail/recipe-detail.component.html
frontend/src/app/recipes/recipe-detail/recipe-detail.component.scss
```

**Hors périmètre de cette story (ne pas implémenter) :**
- `GET /api/sharing/:token` (route publique sans guard) → Story 6.3
- `/share/:token` en tant que vue fonctionnelle → Story 6.3 (le stub `ShareViewComponent` existe déjà, ne pas y toucher)
- Page d'erreur pour lien expiré/invalide → Story 6.4
- `resourceType: 'note'` → Story 8.7 (Note n'existe pas encore)
- Badge "Partagé" sur la vue liste des recettes → hors AC, non implémenté ici

---

## Contexte Epic 6 — Vue d'ensemble pour comprendre le "pourquoi"

| Story | Relation avec 6.2 |
|-------|-------------------|
| 6.1 (done) | A livré `PublicToken` + `SharingModule` squelette. A déféré ici le nettoyage des tokens orphelins (T4). |
| 6.2 (cette story) | Génère/révoque des liens de partage recettes, badge, `ShareLinkDialog`. |
| 6.3 (à venir) | Vue publique `/share/:token` — ajoutera `GET /api/sharing/:token` sans guard sur le même contrôleur. |
| 6.4 (à venir) | Page d'erreur neutre pour tokens invalides/expirés/révoqués. |
| 8.7 (à venir) | Réutilisera `PublicToken`, `SharingService`, `SharingController` et `ShareLinkDialog` en étendant `resourceType` à `'note'`. |

---

## Références

- `_bmad-output/planning-artifacts/epics.md` — Epic 6, Stories 6.1–6.4
- `_bmad-output/planning-artifacts/architecture.md` — Authentification & Sécurité (tokens partage), Frontières API/Données, structure `src/sharing/` et `app/share/`
- `_bmad-output/planning-artifacts/prd.md` — FR35–41, NFR Sécurité (isolation userId, entropie CSPRNG, lecture seule stricte)
- `_bmad-output/planning-artifacts/ux-design-Dashboard.md` — Parcours J4 (partage recette), spec composant `ShareLinkDialog`
- `_bmad-output/implementation-artifacts/6-1-entite-publictoken-migration.md` — Dev notes + Review Findings (point deferred T4)
- `backend/src/sharing/public-token.entity.ts`, `backend/src/sharing/sharing.module.ts` — état actuel (Story 6.1)
- `backend/src/recipes/recipes.controller.ts`, `recipes.service.ts` — pattern `JwtAuthGuard` + `@SkipThrottle()`, transactions `DataSource`, isolation `userId`
- `backend/src/links/links.controller.ts:40` — pattern `@Query()` simple sans DTO
- `frontend/src/app/admin/reset-password-dialog.component.ts` — pattern dialog multi-état + presse-papier + snackbar (référence directe pour `ShareLinkDialog`)
- `frontend/src/app/shared/components/confirm-dialog/confirm-dialog.component.ts` — dialog de confirmation réutilisé pour la révocation
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.ts` — page où s'intègre le bouton "Partager" et le badge
- `frontend/src/app/share/share.routes.ts`, `components/share-view/share-view.component.ts` — stub existant de la vue publique (Story 6.3, ne pas modifier ici)
- `e2e/tests/recipes-delete.spec.ts` — pattern de test E2E (login, création/suppression via API, assertions UI)

---

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (BMad Dev Story workflow)

### Debug Log References

- `sharing.service.spec.ts` : le mock `repo.save` retournant un nouvel objet (`{ id: 100, ...token }`), l'assertion `revoke()` a été ajustée pour vérifier `result.revokedAt instanceof Date` au lieu de `toBe(token)`.
- `share-link-dialog.component.spec.ts` : le composant importe `MatDialogModule`, dont le provider `MatDialog` masque tout override root `{ provide: MatDialog, useValue }`. Les tests de `revoke()` utilisent donc `vi.spyOn((component as any).dialog, 'open')` sur l'instance réellement injectée.

### Completion Notes List

- **Backend (T1–T5)** : `CreateShareDto`, `SharingService` (create/revoke/findActiveForResource), `SharingController` (POST/PATCH revoke/GET), câblage `SharingModule` (+`Recipe`), et nettoyage transactionnel des `PublicToken` orphelins dans `RecipesService.remove()` (point deferred de la 6.1, T4). `recipes.module.ts` et `app.module.ts` non modifiés (conformément aux décisions T2/T4 pour éviter la dépendance circulaire). Suite backend : **175 tests OK**, ESLint **0 erreur**, `tsc --noEmit` OK.
- **Frontend (T6–T9)** : `SharingService` (dans `shared/services/`), `ShareLinkDialogComponent` à 4 états (`idle | generating | link-ready | revoked`) avec copie presse-papier + snackbar + confirmation de révocation, intégration du bouton "Partager" + badge "Partagé" (icône `lock`) dans `RecipeDetailComponent`. URL publique composée côté client via `buildShareUrl()`. Suite frontend : **138 tests OK**, build prod (`ng build`) OK. Warnings de build préexistants (NG8107 sur `recipes.component.html:66`, budget de bundle) sans lien avec cette story.
- **E2E (T10)** : `recipes-share.spec.ts` créé (génération→snackbar+badge ; lien existant→révocation→disparition du badge), conforme au pattern `recipes-delete.spec.ts`. Compile et se liste via `playwright test --list` (2 tests). **Non exécuté dans cet environnement** : stack applicative non démarrée (localhost injoignable) et variables `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` absentes. À faire tourner dans un environnement E2E complet.

### File List

**Backend — créés :**
- `backend/src/sharing/dto/create-share.dto.ts`
- `backend/src/sharing/sharing.service.ts`
- `backend/src/sharing/sharing.controller.ts`
- `backend/src/sharing/sharing.service.spec.ts`
- `backend/src/sharing/sharing.controller.spec.ts`

**Backend — modifiés :**
- `backend/src/sharing/sharing.module.ts`
- `backend/src/recipes/recipes.service.ts`
- `backend/src/recipes/recipes.service.spec.ts`

**Frontend — créés :**
- `frontend/src/app/shared/services/sharing.service.ts`
- `frontend/src/app/shared/services/sharing.service.spec.ts`
- `frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.ts`
- `frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.html`
- `frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.scss`
- `frontend/src/app/shared/components/share-link-dialog/share-link-dialog.component.spec.ts`

**Frontend — modifiés :**
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.ts`
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.html`
- `frontend/src/app/recipes/recipe-detail/recipe-detail.component.scss`

**E2E — créé :**
- `e2e/tests/recipes-share.spec.ts`

### Change Log

- 2026-07-13 — Implémentation Story 6.2 : génération/gestion des liens de partage de recettes (API `sharing`, `ShareLinkDialog`, badge, nettoyage transactionnel des tokens orphelins à la suppression). Statut → review.

---

## Review Findings

_Code review adversariale (Blind Hunter + Edge Case Hunter + Acceptance Auditor), 2026-07-13._

### Decision resolved (2026-07-13, Manu)

- [x] [Review][Decision] Gestion des tokens actifs multiples — **Résolu : un seul lien actif par recette.** `create()` doit **rejeter (`409 Conflict`)** si un token actif existe déjà pour la recette (pour ne jamais invalider un lien déjà partagé à quelqu'un). Le ré-affichage du lien existant (AC5) est conservé. Un bouton **« Régénérer »** (révoque l'ancien + crée un nouveau) est ajouté pour le cas explicite de rotation d'URL. → converti en patchs ci-dessous. **Note :** l'AC5 (« un second lien peut être généré si nécessaire ») doit être reformulé pour refléter ce modèle. [`share-link-dialog.component.ts:74`, `sharing.service.ts:36`]

### Patch

- [x] [Review][Patch] Backend `create()` — rejeter avec `ConflictException` (409) si un token actif (non révoqué, non expiré) existe déjà pour la recette, au lieu d'en créer un second. [`sharing.service.ts:36`]
- [x] [Review][Patch] Frontend — ajouter un bouton « Régénérer » dans l'état `link-ready` (révoque le token courant puis en génère un nouveau) et gérer proprement le `409` renvoyé par `create()`. [`share-link-dialog.component.ts`, `share-link-dialog.component.html`]
- [x] [Review][Patch] Presse-papier : message de succès trompeur + throw synchrone en contexte non sécurisé — `generate()` affiche « Lien copié ✓ » inconditionnellement (même si `writeText` rejette) et `navigator.clipboard` est `undefined` en HTTP, provoquant une `TypeError` non rattrapée par le `.catch`. [`share-link-dialog.component.ts:94`, `share-link-dialog.component.ts:105`]
- [x] [Review][Patch] Erreurs API avalées silencieusement à l'ouverture — `ngOnInit` et `refreshShareStatus` ont `error: () => {}` : si `findActiveForResource` échoue, le dialog reste `idle` (génération d'un doublon) et le badge reste faux. [`share-link-dialog.component.ts:78`, `recipe-detail.component.ts:111`]
- [x] [Review][Patch] Validation `resourceId` incohérente sur `GET /api/sharing` vs `POST` — `parseInt('5abc')=5`, et `0`/négatif passent le seul garde `isNaN` alors que le DTO impose `@Min(1)`. [`sharing.controller.ts:38`]
- [x] [Review][Patch] `revoke()` non idempotent — écrase `revokedAt` d'origine si le token est déjà révoqué (double-clic / requête rejouée). [`sharing.service.ts:59`]
- [x] [Review][Patch] Reformatage Prettier hors périmètre — migrations déjà appliquées reformatées et `recipes.module.ts` modifié alors que la spec dit « PAS de modification » (intention respectée, mais bruit + fichiers immuables touchés). [`recipes.module.ts`, `1781894312446-CreatePublicToken.ts` et al.]

**Patchs appliqués le 2026-07-13** (tests : backend **178 OK**, frontend **141 OK**, ESLint **0**) :

- Backend : `create()` renvoie `409 ConflictException` si un lien actif existe déjà pour la recette ; `revoke()` rendu idempotent (ne réécrit pas `revokedAt`) ; `GET /api/sharing` valide `resourceId` strictement (`Number.isInteger` + `>= 1`).
- Frontend `ShareLinkDialog` : garde défensive `navigator.clipboard`, message honnête (« Lien copié ✓ » uniquement si la copie réussit, sinon « Lien généré — copiez-le manuellement »), gestion du `409` (réaffichage du lien existant sans doublon), bouton **« Régénérer »** (révoque + repasse en `idle`), erreurs de chargement du statut remontées via snackbar.
- Reformatage hors périmètre remis à HEAD (9 fichiers backend). **Caveat** : ces fichiers sont non-conformes Prettier à HEAD ; un `npm run lint`/`npm run format` local les reformatera à nouveau (migrations non ignorées par la config ESLint). Pour les figer, ajouter `src/migrations` à un `.prettierignore`.
- Volontairement non modifié : `recipe-detail.refreshShareStatus()` reste silencieux en cas d'échec (badge « Partagé » = indicateur non critique, un snackbar au chargement serait disproportionné) ; le reformatage incident dans `recipes.service.ts` (fichier en scope pour T4) est conservé.

### Deferred

- [x] [Review][Defer] Piège `resourceType: 'note'` — `create()` valide toujours via `recipeRepo` ; renverra un 404 erroné quand `'note'` sera autorisé [`sharing.service.ts:37`] — deferred, à traiter en Story 8.7.
- [x] [Review][Defer] Colonne `token` sans collation binaire (`varchar(255)` sans `COLLATE`) → lookup potentiellement insensible à la casse [migration 6.1] — deferred, à corriger avant le endpoint public de la Story 6.3.
- [x] [Review][Defer] Génération de tokens non rate-limitée (`@SkipThrottle`) et sans plafond par ressource [`sharing.controller.ts:25`] — deferred, conforme au pattern projet, durcissement ultérieur.
- [x] [Review][Defer] `remove()` renvoie 403 (révèle l'existence) au lieu de 404 [`recipes.service.ts`] — deferred, pré-existant, pattern cohérent avec le reste de l'app.
- [x] [Review][Defer] E2E fragile/non isolé (sélecteur `nth=-1`, catégories `E2E Test` jamais nettoyées) [`e2e/tests/recipes-share.spec.ts`] — deferred, robustesse des tests.

_Dismissed (bruit / conforme à la spec) : filtre d'expiration en JS (décision T2), absence d'index composite (volume trivial, NFR), icône `lock` (imposée T8), libellés radio « 24 heures » (amélioration lisibilité)._

