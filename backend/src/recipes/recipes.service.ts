import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Recipe } from './recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  private readonly logger = new Logger(RecipesService.name);

  constructor(
    @InjectRepository(Recipe) private readonly repo: Repository<Recipe>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  findAll(userId: number): Promise<Recipe[]> {
    return this.repo.find({
      where: { userId },
      order: { category: 'ASC', title: 'ASC' },
    });
  }

  async findOne(userId: number, id: number): Promise<Recipe> {
    const recipe = await this.repo.findOne({
      where: { id, userId },
      relations: ['ingredients', 'steps'],
      order: { ingredients: { position: 'ASC' }, steps: { position: 'ASC' } },
    });
    if (!recipe) throw new NotFoundException(`Recette ${id} introuvable`);
    return recipe;
  }

  async create(userId: number, dto: CreateRecipeDto): Promise<Recipe> {
    return this.dataSource.transaction(async (manager) => {
      const recipe = manager.create(Recipe, {
        title: dto.title,
        category: dto.category ?? null,
        servings: dto.servings ?? 4,
        imageUrl: dto.imageUrl ?? null,
        userId,
      });
      const saved = await manager.save(recipe);

      if (dto.ingredients?.length) {
        const ings = dto.ingredients.map((ing, i) =>
          manager.create(RecipeIngredient, {
            ...ing,
            position: ing.position ?? i,
            recipeId: saved.id,
          }),
        );
        await manager.save(RecipeIngredient, ings);
      }

      if (dto.steps?.length) {
        const steps = dto.steps.map((s, i) =>
          manager.create(RecipeStep, {
            ...s,
            position: s.position ?? i,
            recipeId: saved.id,
          }),
        );
        await manager.save(RecipeStep, steps);
      }

      this.logger.log(`Recette ${saved.id} créée pour userId=${userId}`);
      const created = await manager.findOne(Recipe, {
        where: { id: saved.id },
        relations: ['ingredients', 'steps'],
        order: { ingredients: { position: 'ASC' }, steps: { position: 'ASC' } },
      });
      if (!created) throw new InternalServerErrorException(`Recette ${saved.id} introuvable après création`);
      return created;
    });
  }

  async remove(userId: number, id: number): Promise<void> {
    const recipe = await this.repo.findOne({ where: { id } });
    if (!recipe) throw new NotFoundException(`Recette ${id} introuvable`);
    if (recipe.userId !== userId) throw new ForbiddenException(`Recette ${id} non autorisée`);
    const result = await this.repo.delete({ id });
    if (result.affected === 0) throw new InternalServerErrorException(`Suppression échouée pour la recette ${id}`);
    this.logger.log(`Recette ${id} supprimée pour userId=${userId}`);
  }

  async update(userId: number, id: number, dto: UpdateRecipeDto): Promise<Recipe> {
    return this.dataSource.transaction(async (manager) => {
      const recipe = await manager.findOne(Recipe, { where: { id, userId } });
      if (!recipe) throw new NotFoundException(`Recette ${id} introuvable`);

      Object.assign(recipe, {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.servings !== undefined && { servings: dto.servings }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      });
      await manager.save(recipe);

      if (dto.ingredients !== undefined) {
        await manager.delete(RecipeIngredient, { recipeId: id });
        if (dto.ingredients.length) {
          const ings = dto.ingredients.map((ing, i) =>
            manager.create(RecipeIngredient, {
              ...ing,
              position: ing.position ?? i,
              recipeId: id,
            }),
          );
          await manager.save(RecipeIngredient, ings);
        }
      }

      if (dto.steps !== undefined) {
        await manager.delete(RecipeStep, { recipeId: id });
        if (dto.steps.length) {
          const steps = dto.steps.map((s, i) =>
            manager.create(RecipeStep, {
              ...s,
              position: s.position ?? i,
              recipeId: id,
            }),
          );
          await manager.save(RecipeStep, steps);
        }
      }

      this.logger.log(`Recette ${id} mise à jour pour userId=${userId}`);
      const updated = await manager.findOne(Recipe, {
        where: { id },
        relations: ['ingredients', 'steps'],
        order: { ingredients: { position: 'ASC' }, steps: { position: 'ASC' } },
      });
      if (!updated) throw new InternalServerErrorException(`Recette ${id} introuvable après mise à jour`);
      return updated;
    });
  }
}
