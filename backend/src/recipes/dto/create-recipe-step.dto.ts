import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeStepDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  content!: string;

  @IsInt()
  @IsOptional()
  @ApiProperty({ required: false })
  position?: number;
}
