/**
 * Standalone RUZ fetch → /tmp JSON (no Prisma required).
 *
 * Usage (from apps/worker):
 *   pnpm fetch:json
 *   pnpm fetch:json -- --max-groups 5
 */
import { writeFile } from 'node:fs/promises';
import { syncRuz } from '../src/sync/sync-ruz';

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main(): Promise<void> {
  const maxGroupsRaw = argValue('--max-groups');
  const maxGroups = maxGroupsRaw ? Number(maxGroupsRaw) : undefined;
  const out =
    argValue('--out') ?? `/tmp/ruz-fetch-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  console.log('[fetch-to-json] starting dry-run sync…');
  const result = await syncRuz({
    dryRun: true,
    maxGroups: Number.isFinite(maxGroups) ? maxGroups : 20,
    requestDelayMs: 200,
  });

  const payload = {
    fetchedAt: new Date().toISOString(),
    groupsFound: result.groupsFound,
    groupsSynced: result.groupsSynced,
    errors: result.errors,
    ...result.dryRunPayload,
  };

  await writeFile(out, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`[fetch-to-json] wrote ${out}`);
  console.log(
    `[fetch-to-json] groups=${result.groupsFound} with schedules=${result.groupsSynced} errors=${result.errors.length}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
