import { randomBytes } from 'node:crypto';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PublicToken, ResourceType } from './public-token.entity';
import { Recipe } from '../recipes/recipe.entity';
import { CreateShareDto, ShareExpiresIn } from './dto/create-share.dto';
import { PublicRecipeView } from './dto/public-recipe.view';

@Injectable()
export class SharingService {
  constructor(
    @InjectRepository(PublicToken)
    private readonly repo: Repository<PublicToken>,
    @InjectRepository(Recipe) private readonly recipeRepo: Repository<Recipe>,
  ) {}

  private computeExpiresAt(expiresIn: ShareExpiresIn): Date | null {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    switch (expiresIn) {
      case '24h':
        return new Date(now + DAY);
      case '7d':
        return new Date(now + 7 * DAY);
      case '30d':
        return new Date(now + 30 * DAY);
      case 'permanent':
        return null;
    }
  }

  async create(userId: number, dto: CreateShareDto): Promise<PublicToken> {
    const recipe = await this.recipeRepo.findOne({
      where: { id: dto.resourceId, userId },
    });
    if (!recipe)
      throw new NotFoundException(`Recette ${dto.resourceId} introuvable`);

    // Un seul lien actif par ressource : refuser la création d'un doublon
    // pour ne jamais invalider un lien déjà partagé (la rotation d'URL passe
    // par une révocation explicite côté client — bouton « Régénérer »).
    const active = await this.findActiveForResource(
      userId,
      dto.resourceType,
      dto.resourceId,
    );
    if (active.length > 0)
      throw new ConflictException(
        `Un lien de partage actif existe déjà pour la recette ${dto.resourceId}`,
      );

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
    if (!token)
      throw new NotFoundException(`Lien de partage ${id} introuvable`);
    if (token.userId !== userId)
      throw new ForbiddenException(`Lien de partage ${id} non autorisé`);
    // Idempotent : ne pas écraser l'horodatage de révocation d'origine
    if (token.revokedAt) return token;
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

  async findPublicRecipe(token: string): Promise<PublicRecipeView> {
    const record = await this.repo.findOne({ where: { token } });
    const now = new Date();
    const isValid =
      record !== null &&
      record.revokedAt === null &&
      (record.expiresAt === null || record.expiresAt > now);
    if (!record || !isValid || record.resourceType !== 'recipe') {
      throw new NotFoundException();
    }

    const recipe = await this.recipeRepo.findOne({
      where: { id: record.resourceId },
      relations: ['ingredients', 'steps'],
    });
    if (!recipe) throw new NotFoundException();

    return {
      title: recipe.title,
      avantPropos: recipe.avantPropos,
      imageUrl: recipe.imageUrl,
      servings: recipe.servings,
      ingredients: (recipe.ingredients ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((i) => ({
          quantity: i.quantity,
          unit: i.unit,
          name: i.name,
          position: i.position,
        })),
      steps: (recipe.steps ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((s) => ({ content: s.content, position: s.position })),
    };
  }
}
