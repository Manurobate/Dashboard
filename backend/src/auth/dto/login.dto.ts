import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  password!: string;
}
