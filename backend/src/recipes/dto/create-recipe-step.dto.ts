import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecipeStepDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  content!: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @ApiProperty({ required: false })
  position?: number;
}
