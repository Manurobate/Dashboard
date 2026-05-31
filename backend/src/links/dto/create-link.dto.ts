import {
  IsString,
  IsUrl,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLinkDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({}, { message: 'URL invalide' })
  @MaxLength(2048)
  @Transform(({ value }) => (value as string)?.trim())
  @ApiProperty()
  url!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (value as string)?.trim())
  @ApiProperty()
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @ApiProperty({ required: false })
  description?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(2048)
  @ApiProperty({ required: false })
  faviconUrl?: string | null;

  @IsInt()
  @Min(1)
  @ApiProperty()
  categoryId!: number;
}
