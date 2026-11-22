/**
 * Run public t.me/s ingest in-process via Prisma (no public HTTP ingest endpoint).
 * Keep logic aligned with apps/api/src/clubs/telegram-ingest.ts.
 */
import { disconnectPrisma, getPrisma } from '../db';
import {
  syncTelegramDigest,
  type TelegramIngestMode,
} from './telegram-ingest';

export type DigestSyncLocalResult = {
  skipped: boolean;
  reason?: string;
  body?: unknown;
};

export async function syncTelegramDigestLocal(
  opts: { disconnect?: boolean; mode?: TelegramIngestMode } = {},
): Promise<DigestSyncLocalResult> {
  if (!process.env.DATABASE_URL) {
    return { skipped: true, reason: 'DATABASE_URL missing' };
  }
  const prisma = getPrisma();
  try {
    const body = await syncTelegramDigest(prisma, {
      mode: opts.mode ?? 'default',
    });
    return { skipped: false, body };
  } finally {
    if (opts.disconnect) {
      await disconnectPrisma();
    }
  }
}
