import {
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderLinkItem {
  @IsInt() @Min(1) id!: number;
  @IsInt() @Min(0) position!: number;
}

export class ReorderLinksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderLinkItem)
  @ArrayMaxSize(200)
  @ApiProperty({ type: [ReorderLinkItem] })
  items!: ReorderLinkItem[];
}
