import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  IsUrl,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty()
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @ApiProperty({ required: false })
  category?: string | null;

  @IsInt()
  @IsOptional()
  @Min(1)
  @ApiProperty({ required: false })
  servings?: number;

  @IsUrl({}, { message: 'URL invalide' })
  @IsOptional()
  @MaxLength(2083)
  @ApiProperty({ required: false })
  imageUrl?: string | null;
}
