import type { Shop } from "@aidey/shops";
import { sql } from "drizzle-orm";
import type { FullSyncDeps } from "./full-sync.ts";
import { fullSync } from "./full-sync.ts";

const STALE_AFTER_MS = 30 * 60 * 1000; // re-sync if last successful is older than 30m

export interface TriggerCronDeps extends FullSyncDeps {
  /** Returns all shops the cron should consider syncing. */
  listConnectedShops: () => Promise<Shop[]>;
}

/**
 * Cron tick: acquire the global advisory lock so multi-instance deploys don't double-fire.
 * For each shop: if no recent successful sync, run fullSync. Errors are logged in sync_logs
 * (not thrown) so the tick continues for other shops.
 */
export async function triggerCron(
  deps: TriggerCronDeps,
): Promise<{ skipped: boolean; ran: number }> {
  const lockResult = await deps.db.execute<{ ok: boolean }>(
    sql`SELECT pg_try_advisory_lock(hashtext('aidey:sync-tick')) AS ok`,
  );
  const lockAcquired = Boolean((lockResult as unknown as Array<{ ok: boolean }>)[0]?.ok);
  if (!lockAcquired) return { skipped: true, ran: 0 };

  let ran = 0;
  try {
    const shops = await deps.listConnectedShops();
    for (const shop of shops) {
      const last = await deps.syncLogRepo.lastSuccessful(shop.id);
      const lastCompleted = last?.completedAt;
      const stale = !lastCompleted || Date.now() - lastCompleted.getTime() > STALE_AFTER_MS;
      if (!stale) continue;
      try {
        await fullSync(deps, shop, "cron");
        ran++;
      } catch {
        // fullSync already records the failure in sync_logs; swallow so the tick continues
      }
    }
    return { skipped: false, ran };
  } finally {
    await deps.db.execute(sql`SELECT pg_advisory_unlock(hashtext('aidey:sync-tick'))`);
  }
}
