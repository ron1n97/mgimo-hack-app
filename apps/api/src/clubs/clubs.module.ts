import { Module } from '@nestjs/common';
import { ClubsController } from './clubs.controller';
import { ClubsService } from './clubs.service';
import { DigestInternalController } from './digest-internal.controller';

@Module({
  controllers: [ClubsController, DigestInternalController],
  providers: [ClubsService],
  exports: [ClubsService],
})
export class ClubsModule {}
