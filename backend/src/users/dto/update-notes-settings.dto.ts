import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotesSettingsDto {
  @ApiPropertyOptional({ description: 'Activer/désactiver le module Notes' })
  @IsOptional()
  @IsBoolean()
  notesEnabled?: boolean;

  @ApiPropertyOptional({ description: "URL de l'instance Trilium" })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  triliumUrl?: string | null;
}
