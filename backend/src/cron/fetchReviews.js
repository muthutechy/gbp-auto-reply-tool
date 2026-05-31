require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

const cron = require("node-cron");
const reviewSyncService = require("../services/reviewSync.service");

const CRON_SCHEDULE = process.env.REVIEW_CRON_SCHEDULE || "*/5 * * * *";

let running = false;

async function runJob() {
  if (running) {
    console.log("[cron] Previous run still in progress, skipping");
    return;
  }

  running = true;
  const started = Date.now();

  try {
    console.log("[cron] Fetching reviews and enqueueing jobs...");
    const result = await reviewSyncService.runFetchAndQueueAll();
    console.log(
      `[cron] Done in ${Date.now() - started}ms — tenants: ${result.tenantsProcessed}`,
      JSON.stringify(result.results)
    );
  } catch (err) {
    console.error("[cron] Fatal error:", err);
  } finally {
    running = false;
  }
}

if (require.main === module) {
  console.log(`[cron] Scheduled: ${CRON_SCHEDULE}`);
  cron.schedule(CRON_SCHEDULE, runJob);
  runJob();
}

module.exports = { runJob, CRON_SCHEDULE };
