import { Controller, Get, Header, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SharingService } from './sharing.service';

@ApiTags('sharing')
@Controller('sharing')
export class PublicSharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get(':token')
  // Défense en profondeur : empêcher l'indexation/mise en cache de la réponse
  // API elle-même (la balise <meta robots> côté SPA ne couvre pas les crawlers
  // sans JS ni les hits directs sur l'endpoint). Cf. AC3 + review 6.3.
  @Header('X-Robots-Tag', 'noindex')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({
    summary:
      'Consulter une ressource partagée publiquement (lecture seule, sans auth)',
  })
  getPublicResource(@Param('token') token: string) {
    return this.sharingService.findPublicRecipe(token);
  }
}
