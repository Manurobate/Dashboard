import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLinkCategoryDto {
  @ApiProperty({ description: 'Nom de la catégorie', maxLength: 255 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Emoji de la catégorie', maxLength: 10, required: false, nullable: true })
  @IsString()
  @IsOptional()
  @MaxLength(10, { message: "L'emoji ne peut pas dépasser 10 caractères" })
  emoji?: string | null;
}
