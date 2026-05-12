import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
