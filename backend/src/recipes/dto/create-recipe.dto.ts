import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  IsUrl,
  Min,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { CreateRecipeIngredientDto } from './create-recipe-ingredient.dto';
import { CreateRecipeStepDto } from './create-recipe-step.dto';

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

  @ValidateIf((o: CreateRecipeDto) => o.imageUrl !== null && o.imageUrl !== undefined)
  @IsUrl({}, { message: 'URL invalide' })
  @IsOptional()
  @MaxLength(2083)
  @ApiProperty({ required: false })
  imageUrl?: string | null;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeIngredientDto)
  @ApiProperty({ type: [CreateRecipeIngredientDto], required: false })
  ingredients?: CreateRecipeIngredientDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRecipeStepDto)
  @ApiProperty({ type: [CreateRecipeStepDto], required: false })
  steps?: CreateRecipeStepDto[];
}
