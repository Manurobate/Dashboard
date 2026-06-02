import {
  IsNumber,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeIngredientDto {
  @IsNumber()
  @Min(0.001)
  @ApiProperty()
  quantity!: number;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @ApiProperty({ required: false })
  unit?: string | null;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty()
  name!: string;

  @IsInt()
  @IsOptional()
  @ApiProperty({ required: false })
  position?: number;
}
