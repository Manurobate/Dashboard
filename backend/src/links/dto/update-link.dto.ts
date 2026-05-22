import { PartialType, OmitType, ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsOptional } from 'class-validator';
import { CreateLinkDto } from './create-link.dto';

export class UpdateLinkDto extends PartialType(OmitType(CreateLinkDto, ['categoryId'] as const)) {
  @IsInt()
  @Min(1)
  @IsOptional()
  @ApiProperty({ required: false })
  categoryId?: number;
}
