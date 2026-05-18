import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { LinkCategoriesService } from './link-categories.service';
import { CreateLinkCategoryDto } from './dto/create-link-category.dto';
import { UpdateLinkCategoryDto } from './dto/update-link-category.dto';
import { ReorderLinkCategoriesDto } from './dto/reorder-link-categories.dto';

@ApiTags('link-categories')
@Controller('link-categories')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class LinkCategoriesController {
  constructor(private readonly service: LinkCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les catégories de liens' })
  findAll(@CurrentUser() user: { id: number }) {
    return this.service.findAll(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer une catégorie de liens' })
  create(
    @CurrentUser() user: { id: number },
    @Body() dto: CreateLinkCategoryDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Patch('reorder')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Réordonner les catégories de liens' })
  async reorder(
    @CurrentUser() user: { id: number },
    @Body() dto: ReorderLinkCategoriesDto,
  ): Promise<void> {
    await this.service.reorder(user.id, dto.items);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une catégorie de liens' })
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLinkCategoryDto,
  ) {
    return this.service.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une catégorie de liens' })
  async remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.service.remove(user.id, id);
  }
}
