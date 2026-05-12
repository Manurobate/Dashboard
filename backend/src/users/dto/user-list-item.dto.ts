import { ApiProperty } from '@nestjs/swagger';
import { UserEntity } from '../user.entity';

export class UserListItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty()
  mustChangePassword!: boolean;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  constructor(user: UserEntity) {
    this.id = user.id;
    this.username = user.username;
    this.name = user.name ?? '';
    this.role = user.role;
    this.mustChangePassword = user.mustChangePassword;
    this.isActive = user.isActive;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}
