import cron from 'node-cron';
import { syncRuz } from './sync/sync-ruz';
import { writeFile } from 'node:fs/promises';

const CRON = process.env.RUZ_SYNC_CRON ?? '0 */6 * * *';
const ONCE = process.argv.includes('--once');

async function runSync(label: string): Promise<void> {
  console.log(`[worker] sync start (${label}) at ${new Date().toISOString()}`);
  const result = await syncRuz();
  console.log(
    `[worker] sync done: groupsFound=${result.groupsFound} synced=${result.groupsSynced} lessons=${result.lessonsUpserted} errors=${result.errors.length}`,
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

async function main(): Promise<void> {
  if (ONCE) {
    await runSync('once');
    return;
  }

  console.log(`[worker] scheduling RUZ sync with cron "${CRON}"`);
  // run once on boot, then on schedule
  await runSync('boot');

  if (!cron.validate(CRON)) {
    console.error(`[worker] invalid RUZ_SYNC_CRON="${CRON}", falling back to every 6h`);
  }
  const expr = cron.validate(CRON) ? CRON : '0 */6 * * *';
  cron.schedule(expr, () => {
    void runSync('cron');
  });
}

main().catch((err) => {
  console.error('[worker] fatal', err);
  process.exit(1);
});
