import { IsEmail, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: "Adresse email de l'utilisateur (identifiant unique)",
    maxLength: 254,
  })
  @IsEmail({}, { message: "Format d'adresse email invalide" })
  @MaxLength(254)
  username!: string;

  @ApiProperty({ description: "Nom d'affichage", maxLength: 255 })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  @MaxLength(255)
  name!: string;
}
