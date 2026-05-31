import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinkCategoryEntity } from './link-category.entity';
import { LinkEntity } from './link.entity';
import { LinkCategoriesController } from './link-categories.controller';
import { LinkCategoriesService } from './link-categories.service';
import { LinksController } from './links.controller';
import { LinksService } from './links.service';
import { OgFetchModule } from '../og-fetch/og-fetch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LinkCategoryEntity, LinkEntity]),
    OgFetchModule,
  ],
  controllers: [LinkCategoriesController, LinksController],
  providers: [LinkCategoriesService, LinksService],
  exports: [LinkCategoriesService, LinksService],
})
export class LinksModule {}
