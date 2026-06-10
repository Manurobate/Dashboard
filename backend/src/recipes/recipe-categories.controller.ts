import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RecipeCategoriesService } from './recipe-categories.service';

@ApiTags('recipe-categories')
@Controller('recipe-categories')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class RecipeCategoriesController {
  constructor(private readonly svc: RecipeCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les catégories de recettes' })
  findAll(@CurrentUser() user: { id: number }) {
    return this.svc.findAll(user.id);
  }

  @Get('ingredient-suggestions')
  @ApiOperation({ summary: "Suggestions de noms d'ingrédients distincts" })
  getIngredientSuggestions(@CurrentUser() user: { id: number }) {
    return this.svc.getIngredientSuggestions(user.id);
  }

  @Get('unit-suggestions')
  @ApiOperation({ summary: "Suggestions d'unités distinctes" })
  getUnitSuggestions(@CurrentUser() user: { id: number }) {
    return this.svc.getUnitSuggestions(user.id);
  }
}
