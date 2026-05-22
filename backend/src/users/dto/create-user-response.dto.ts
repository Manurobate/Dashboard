import { ApiProperty } from '@nestjs/swagger';
import { UserListItemDto } from './user-list-item.dto';

export class CreateUserResponseDto {
  @ApiProperty({ description: 'Données du compte créé' })
  user!: UserListItemDto;

  @ApiProperty({
    description:
      'Mot de passe temporaire — affiché une seule fois, jamais renvoyé ensuite',
  })
  temporaryPassword!: string;
}
