import cron from 'node-cron';
import { syncRuz } from './sync/sync-ruz';
import { ingestDigest } from './digest/ingest-digest';
import { writeFile } from 'node:fs/promises';

const CRON = process.env.RUZ_SYNC_CRON ?? '0 */6 * * *';
const DIGEST_CRON = process.env.DIGEST_INGEST_CRON ?? '30 */6 * * *';
const ONCE = process.argv.includes('--once');
const DIGEST_ONCE = process.argv.includes('--digest-once');

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

async function runDigest(label: string): Promise<void> {
  console.log(
    `[worker] digest ingest start (${label}) at ${new Date().toISOString()}`,
  );
  const result = await ingestDigest();
  console.log(
    `[worker] digest ingest done: skipped=${result.skipped} vk=${result.vkSources} created=${result.created} tgSkipped=${result.telegramSkipped} errors=${result.errors.length}`,
  );
  if (result.skipReason) {
    console.log(`[worker] digest: ${result.skipReason}`);
  }
  if (result.errors.length) {
    console.warn('[worker] digest errors sample:', result.errors.slice(0, 5));
  }
}

async function main(): Promise<void> {
  if (DIGEST_ONCE) {
    await runDigest('once');
    return;
  }

  if (ONCE) {
    await runSync('once');
    return;
  }

  console.log(`[worker] scheduling RUZ sync with cron "${CRON}"`);
  console.log(`[worker] scheduling digest ingest with cron "${DIGEST_CRON}"`);
  // run once on boot, then on schedule
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
    void runDigest('cron');
  });
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
