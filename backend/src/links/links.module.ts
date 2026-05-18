import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { LinkEntity } from './link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity])],
})
export class LinksModule {}
