import { Controller, Get, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RecipesService } from './recipes.service';

@ApiTags('recipes')
@Controller('recipes')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les recettes' })
  findAll(@CurrentUser() user: { id: number }) {
    return this.recipesService.findAll(user.id);
  }
}
