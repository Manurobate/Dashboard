import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LinksService } from './links.service';
import { OgFetchService } from '../og-fetch/og-fetch.service';
import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { ReorderLinksDto } from './dto/reorder-links.dto';

@ApiTags('links')
@Controller('links')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class LinksController {
  constructor(
    private readonly linksService: LinksService,
    private readonly ogFetchService: OgFetchService,
  ) {}

  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get('og-preview') // PREMIER — avant :id
  @ApiOperation({ summary: "Récupérer les données OG d'une URL" })
  fetchOgPreview(@Query('url') url: string) {
    if (!url) throw new BadRequestException('URL requise');
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new BadRequestException('URL invalide');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException(
        'Seuls les protocoles http et https sont autorisés',
      );
    }
    return this.ogFetchService.fetchOgData(url);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les liens' })
  findAll(@CurrentUser() user: { id: number }) {
    return this.linksService.findAll(user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Créer un lien' })
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateLinkDto) {
    return this.linksService.create(user.id, dto);
  }

  @Patch('reorder') // AVANT @Patch(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Réordonner les liens' })
  async reorder(
    @CurrentUser() user: { id: number },
    @Body() dto: ReorderLinksDto,
  ): Promise<void> {
    await this.linksService.reorder(user.id, dto.items);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un lien' })
  update(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLinkDto,
  ) {
    return this.linksService.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer un lien' })
  async remove(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.linksService.remove(user.id, id);
  }
}
