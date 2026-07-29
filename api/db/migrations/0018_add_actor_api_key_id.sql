-- #217 P2-1: Add actor_api_key_id nullable column to 4 tables
-- Idempotency: Relies on wrangler d1_migrations ledger to skip replay.
--   If 0018 is already in the ledger (from a prior apply), wrangler will not re-execute.
--   The D1 migrations journal (applied in order via wrangler d1 migrations apply) guarantees
--   that each migration runs exactly once per environment.
--> statement-breakpoint
ALTER TABLE `teams` ADD COLUMN `actor_api_key_id` text;
--> statement-breakpoint
ALTER TABLE `team_members` ADD COLUMN `actor_api_key_id` text;
--> statement-breakpoint
ALTER TABLE `locations` ADD COLUMN `actor_api_key_id` text;
--> statement-breakpoint
ALTER TABLE `stories` ADD COLUMN `actor_api_key_id` text;
