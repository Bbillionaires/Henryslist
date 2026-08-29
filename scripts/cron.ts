// Standalone entry point for traditional hosting (a VM, container, or PaaS
// without built-in scheduled functions): run this on a system crontab or
// process manager schedule, e.g. every hour:
//   0 * * * *  cd /app && npm run cron >> /var/log/henryslist-cron.log 2>&1
//
// On serverless platforms (Vercel, etc.) use the HTTP endpoint instead —
// GET/POST /api/cron/expire-listings with `Authorization: Bearer $CRON_SECRET`
// — wired up via Vercel Cron, GitHub Actions, or any external scheduler. Both
// paths call the exact same underlying functions, so behavior is identical.
import { runExpirationSweep } from "../src/lib/listings/expiration";
import { runSavedSearchSweep } from "../src/lib/saved-searches";
import { prisma } from "../src/lib/prisma";

async function main() {
  const startedAt = Date.now();
  const expiration = await runExpirationSweep();
  const savedSearches = await runSavedSearchSweep();
  const ms = Date.now() - startedAt;

  console.log(
    `[cron] done in ${ms}ms — expired ${expiration.expired}, reminders sent ${expiration.remindersSent}, ` +
      `favorite notifications ${expiration.favoriteNotifications}, saved searches checked ${savedSearches.checked}, ` +
      `saved search notifications ${savedSearches.notified}`,
  );
}

main()
  .catch((err) => {
    console.error("[cron] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
