import { Module } from '@nestjs/common';
import { OgFetchService } from './og-fetch.service';

@Module({
  providers: [OgFetchService],
  exports: [OgFetchService],
})
export class OgFetchModule {}
