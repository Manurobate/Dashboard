import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { RecipeCategoryEntity } from './recipe-category.entity';

@Injectable()
export class RecipeCategoriesService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  findAll(userId: number): Promise<RecipeCategoryEntity[]> {
    return this.dataSource.getRepository(RecipeCategoryEntity).find({
      where: { userId },
      order: { name: 'ASC' },
      select: ['id', 'name'],
    });
  }

  async getIngredientSuggestions(userId: number): Promise<string[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('DISTINCT ri.name', 'name')
      .from('RecipeIngredient', 'ri')
      .innerJoin('Recipe', 'r', 'ri.recipeId = r.id')
      .where('r.userId = :userId', { userId })
      .orderBy('ri.name', 'ASC')
      .getRawMany<{ name: string }>();
    return rows.map((r) => r.name);
  }

  async getUnitSuggestions(userId: number): Promise<string[]> {
    const rows = await this.dataSource
      .createQueryBuilder()
      .select('DISTINCT ri.unit', 'unit')
      .from('RecipeIngredient', 'ri')
      .innerJoin('Recipe', 'r', 'ri.recipeId = r.id')
      .where('r.userId = :userId AND ri.unit IS NOT NULL AND ri.unit != :empty', {
        userId,
        empty: '',
      })
      .orderBy('ri.unit', 'ASC')
      .getRawMany<{ unit: string }>();
    return rows.map((r) => r.unit);
  }
}
