import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({ description: "Nom d'affichage de l'utilisateur" })
  @Transform(({ value }) => value?.trim())
  @IsString()
  @IsNotEmpty({ message: "Le nom d'affichage est obligatoire" })
  @MaxLength(255)
  name!: string;
}
