import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicToken } from './public-token.entity';
import { Recipe } from '../recipes/recipe.entity';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

@Module({
  imports: [TypeOrmModule.forFeature([PublicToken, Recipe])],
  controllers: [SharingController],
  providers: [SharingService],
  exports: [TypeOrmModule],
})
export class SharingModule {}
