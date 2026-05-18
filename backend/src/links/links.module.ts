import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { LinkEntity } from './link.entity';
import { LinkCategoriesController } from './link-categories.controller';
import { LinkCategoriesService } from './link-categories.service';

@Module({
  imports: [TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity])],
  controllers: [LinkCategoriesController],
  providers: [LinkCategoriesService],
  exports: [LinkCategoriesService],
})
export class LinksModule {}
