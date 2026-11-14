import type { WorkerEnv } from "./env";
import { logger } from "./lib/logger";
import { recoverMediaObjects } from "./lib/media-recovery";

export async function scheduled(
  controller: ScheduledController,
  env: WorkerEnv,
) {
  // Cron runs outside the HTTP middleware and must enforce write protection too.
  if (env.WRITE_MODE !== "open") {
    logger.info("team_auto_close_skipped");
    return;
  }

  const now = controller.scheduledTime;
  let failed = false;
  try {
    // A formed team is already completed after end_at. Recheck eligibility in
    // the write itself so concurrent formation, closure or date edits win safely.
    const result = await env.DB.prepare(
      `
      UPDATE teams
      SET recruitment_status = 'closed', updated_at = ?, version = version + 1
      WHERE recruitment_status = 'open'
        AND cancelled_at IS NULL
        AND formed_at IS NULL
        AND end_at <= ?
    `,
    )
      .bind(now, now - 24 * 60 * 60 * 1000)
      .run();
    logger.info("team_auto_close_completed", { count: result.meta.changes });
  } catch (error) {
    logger.error("team_auto_close_failed", error);
    failed = true;
  }
  try {
    await recoverMediaObjects(env, now);
  } catch (error) {
    logger.error("media_recovery_batch_failed", error);
    failed = true;
  }
  if (failed) throw new Error("Scheduled maintenance failed");
}
