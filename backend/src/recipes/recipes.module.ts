import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';
import { RecipeCategoryEntity } from './recipe-category.entity';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';
import { RecipeCategoriesController } from './recipe-categories.controller';
import { RecipeCategoriesService } from './recipe-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep, RecipeCategoryEntity])],
  controllers: [RecipesController, RecipeCategoriesController],
  providers: [RecipesService, RecipeCategoriesService],
  exports: [RecipesService, TypeOrmModule],
})
export class RecipesModule {}
