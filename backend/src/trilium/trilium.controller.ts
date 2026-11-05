import {
  Controller,
  Get,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TriliumService } from './trilium.service';

const MAX_URL_LENGTH = 2083;

@ApiTags('trilium')
@Controller('trilium')
@UseGuards(JwtAuthGuard)
@SkipThrottle()
export class TriliumController {
  constructor(private readonly triliumService: TriliumService) {}

  @SkipThrottle({ default: false })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @Get('ping')
  @ApiOperation({ summary: "Tester la connectivité d'une instance Trilium" })
  ping(@Query('url') url: unknown) {
    // `?url=a&url=b` donne un string[] : on le rejette au lieu de le laisser coercer en "a,b"
    if (typeof url !== 'string' || !url)
      throw new BadRequestException('URL requise');
    if (url.length > MAX_URL_LENGTH)
      throw new BadRequestException('URL trop longue');
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
    return this.triliumService.ping(url);
  }
}
