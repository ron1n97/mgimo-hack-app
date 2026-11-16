import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ClubsService } from './clubs.service';

/**
 * Worker → API digest scrape without JWT.
 * Set DIGEST_INGEST_KEY in api + worker env; omit key → endpoint disabled (401).
 */
@Controller('internal/digest')
export class DigestInternalController {
  constructor(private readonly clubs: ClubsService) {}

  @Post('telegram')
  ingestTelegram(@Headers('x-digest-key') key?: string) {
    const expected = process.env.DIGEST_INGEST_KEY?.trim();
    if (!expected || !key || key !== expected) {
      throw new UnauthorizedException('Invalid digest ingest key');
    }
    return this.clubs.ingestTelegramDigest();
  }
}
