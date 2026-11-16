/**
 * Run public t.me/s ingest in-process via Prisma (no public HTTP ingest endpoint).
 * Keep logic aligned with apps/api/src/clubs/telegram-ingest.ts.
 */
import { getPrisma } from '../db';
import { syncTelegramDigest } from './telegram-ingest';

export type DigestSyncLocalResult = {
  skipped: boolean;
  reason?: string;
  body?: unknown;
};

export async function syncTelegramDigestLocal(): Promise<DigestSyncLocalResult> {
  if (!process.env.DATABASE_URL) {
    return { skipped: true, reason: 'DATABASE_URL missing' };
  }
  const prisma = getPrisma();
  const body = await syncTelegramDigest(prisma);
  return { skipped: false, body };
}
