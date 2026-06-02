import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe } from './recipe.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)
    private readonly repo: Repository<Recipe>,
  ) {}

  findAll(userId: number): Promise<Recipe[]> {
    return this.repo.find({
      where: { userId },
      order: { category: 'ASC', title: 'ASC' },
    });
  }
}
