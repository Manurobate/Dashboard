import {
  IsArray,
  ValidateNested,
  IsInt,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderItem {
  @IsInt()
  id!: number;

  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderLinkCategoriesDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  @ApiProperty({ type: [ReorderItem] })
  items!: ReorderItem[];
}
