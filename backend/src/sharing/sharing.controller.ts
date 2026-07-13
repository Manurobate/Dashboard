import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SharingService } from './sharing.service';
import { CreateShareDto } from './dto/create-share.dto';

@ApiTags('sharing')
@Controller('sharing')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les liens actifs pour une ressource' })
  findActiveForResource(
    @CurrentUser() user: { id: number },
    @Query('resourceType') resourceType: string,
    @Query('resourceId') resourceId: string,
  ) {
    if (resourceType !== 'recipe')
      throw new BadRequestException('resourceType invalide');
    const id = Number(resourceId);
    if (!Number.isInteger(id) || id < 1)
      throw new BadRequestException('resourceId invalide');
    return this.sharingService.findActiveForResource(user.id, 'recipe', id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Générer un lien de partage' })
  create(@CurrentUser() user: { id: number }, @Body() dto: CreateShareDto) {
    return this.sharingService.create(user.id, dto);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Révoquer un lien de partage' })
  revoke(
    @CurrentUser() user: { id: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.sharingService.revoke(user.id, id);
  }
}
