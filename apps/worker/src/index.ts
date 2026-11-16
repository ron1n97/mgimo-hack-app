import cron from 'node-cron';
import { syncRuz } from './sync/sync-ruz';
import { ingestDigest } from './digest/ingest-digest';
import { syncTelegramDigestViaApi } from './digest/sync-telegram-via-api';
import { writeFile } from 'node:fs/promises';

const CRON = process.env.RUZ_SYNC_CRON ?? '0 */6 * * *';
const DIGEST_CRON = process.env.DIGEST_INGEST_CRON ?? '30 */6 * * *';
const DIGEST_TG_CRON = process.env.DIGEST_TG_SYNC_CRON ?? '15 */2 * * *';
const ONCE = process.argv.includes('--once');
const DIGEST_TG_ONLY = process.argv.includes('--digest-tg');
const DIGEST_ONCE =
  process.argv.includes('--digest-once') ||
  process.argv.includes('--digest') ||
  DIGEST_TG_ONLY;

async function runSync(label: string): Promise<void> {
  console.log(`[worker] sync start (${label}) at ${new Date().toISOString()}`);
  const result = await syncRuz();
  console.log(
    `[worker] sync done: groupsFound=${result.groupsFound} synced=${result.groupsSynced} skipped=${result.groupsSkipped} lessons=${result.lessonsUpserted} errors=${result.errors.length}`,
  );
  if (result.errors.length) {
    console.warn('[worker] errors sample:', result.errors.slice(0, 5));
  }
  if (result.dryRunPayload) {
    const path = `/tmp/ruz-sync-${Date.now()}.json`;
    await writeFile(path, JSON.stringify(result.dryRunPayload, null, 2), 'utf8');
    console.log(`[worker] dry-run payload written to ${path}`);
  }
}

async function runVkDigest(label: string): Promise<void> {
  console.log(
    `[worker] digest VK start (${label}) at ${new Date().toISOString()}`,
  );
  const result = await ingestDigest();
  console.log(
    `[worker] digest VK done: skipped=${result.skipped} vk=${result.vkSources} created=${result.created} tgSkipped=${result.telegramSkipped} errors=${result.errors.length}`,
  );
  if (result.skipReason) {
    console.log(`[worker] digest VK: ${result.skipReason}`);
  }
  if (result.errors.length) {
    console.warn('[worker] digest VK errors sample:', result.errors.slice(0, 5));
  }
}

async function runTgDigest(label: string): Promise<void> {
  console.log(
    `[worker] digest TG start (${label}) at ${new Date().toISOString()}`,
  );
  try {
    const result = await syncTelegramDigestViaApi();
    if (result.skipped) {
      console.warn(`[worker] digest TG skipped: ${result.reason}`);
      return;
    }
    console.log('[worker] digest TG done:', JSON.stringify(result.body));
  } catch (err) {
    console.error('[worker] digest TG failed', err);
  }
}

async function runDigest(label: string): Promise<void> {
  if (DIGEST_TG_ONLY) {
    await runTgDigest(label);
    return;
  }
  await runVkDigest(label);
  await runTgDigest(label);
}

async function main(): Promise<void> {
  if (DIGEST_TG_ONLY && !ONCE) {
    await runTgDigest('once');
    return;
  }

  if (DIGEST_ONCE && !ONCE) {
    await runDigest('once');
    return;
  }

  if (ONCE) {
    await runSync('once');
    if (DIGEST_ONCE) {
      await runDigest('once');
    }
    return;
  }

  console.log(`[worker] scheduling RUZ sync with cron "${CRON}"`);
  console.log(`[worker] scheduling VK digest with cron "${DIGEST_CRON}"`);
  console.log(`[worker] scheduling TG digest with cron "${DIGEST_TG_CRON}"`);
  await runSync('boot');
  await runDigest('boot');

  if (!cron.validate(CRON)) {
    console.error(`[worker] invalid RUZ_SYNC_CRON="${CRON}", falling back to every 6h`);
  }
  const expr = cron.validate(CRON) ? CRON : '0 */6 * * *';
  cron.schedule(expr, () => {
    void runSync('cron');
  });

  const digestExpr = cron.validate(DIGEST_CRON) ? DIGEST_CRON : '30 */6 * * *';
  cron.schedule(digestExpr, () => {
    void runVkDigest('cron');
  });

  const tgExpr = cron.validate(DIGEST_TG_CRON) ? DIGEST_TG_CRON : '15 */2 * * *';
  cron.schedule(tgExpr, () => {
    void runTgDigest('cron');
  });
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
