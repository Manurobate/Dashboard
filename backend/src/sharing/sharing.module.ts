import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicToken } from './public-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PublicToken])],
  exports: [TypeOrmModule],
})
export class SharingModule {}
