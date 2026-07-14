import { IsIn, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type ShareExpiresIn = '24h' | '7d' | '30d' | 'permanent';

export class CreateShareDto {
  @IsIn(['recipe'])
  @ApiProperty({ enum: ['recipe'] })
  resourceType!: 'recipe';

  @IsInt()
  @Min(1)
  @ApiProperty()
  resourceId!: number;

  @IsIn(['24h', '7d', '30d', 'permanent'])
  @ApiProperty({ enum: ['24h', '7d', '30d', 'permanent'] })
  expiresIn!: ShareExpiresIn;
}
