import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordResponseDto {
  @ApiProperty({
    description:
      'Nouveau mot de passe temporaire — affiché une seule fois, jamais renvoyé ensuite',
  })
  temporaryPassword!: string;
}
