import {
  IsNumber,
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeIngredientDto {
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(9999999.999)
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
  @Min(0)
  @ApiProperty({ required: false })
  position?: number;
}
