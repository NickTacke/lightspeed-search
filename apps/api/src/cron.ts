import type { Container } from "./container.ts";

const TICK_INTERVAL_MS = 15 * 60 * 1000;

export function startSyncCron(container: Container, intervalMs = TICK_INTERVAL_MS) {
  const handle = setInterval(async () => {
    try {
      const result = await container.sync.triggerCron();
      if (result.skipped) {
        console.log("[cron] another instance holds the lock; skipped");
      } else {
        console.log(`[cron] tick complete; ran ${result.ran} shop sync(s)`);
      }
    } catch (err) {
      console.error("[cron] tick failed", err);
    }
  }, intervalMs);
  // Don't keep the process alive solely on the interval
  if (typeof handle.unref === "function") handle.unref();
  return handle;
}
