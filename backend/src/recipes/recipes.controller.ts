import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

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

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer une recette' })
  findOne(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.recipesService.findOne(user.id, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une recette' })
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateRecipeDto,
  ) {
    return this.recipesService.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une recette' })
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.recipesService.update(user.id, id, dto);
  }
}
