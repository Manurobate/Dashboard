import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recipe } from './recipe.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { RecipeStep } from './recipe-step.entity';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Recipe, RecipeIngredient, RecipeStep])],
  controllers: [RecipesController],
  providers: [RecipesService],
  exports: [RecipesService, TypeOrmModule],
})
export class RecipesModule {}
