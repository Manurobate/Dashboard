import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateLinkDto } from './create-link.dto';

// categoryId exclu : pas de déplacement de lien entre catégories dans cette story
export class UpdateLinkDto extends PartialType(OmitType(CreateLinkDto, ['categoryId'] as const)) {}
