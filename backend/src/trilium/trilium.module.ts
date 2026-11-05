import { Module } from '@nestjs/common';
import { TriliumController } from './trilium.controller';
import { TriliumService } from './trilium.service';

@Module({
  controllers: [TriliumController],
  providers: [TriliumService],
})
export class TriliumModule {}
