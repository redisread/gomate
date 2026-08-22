ALTER TABLE `accounts` ADD `issuer` text;--> statement-breakpoint
UPDATE `accounts`
SET `issuer` = CASE
	WHEN `provider_id` = 'credential' THEN 'local:credential'
	ELSE 'local:oauth:' || `provider_id`
END;--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`issuer` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`id_token` text,
	`password` text,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_accounts` (
	`id`, `user_id`, `issuer`, `account_id`, `provider_id`, `access_token`,
	`refresh_token`, `access_token_expires_at`, `refresh_token_expires_at`,
	`scope`, `id_token`, `password`, `expires_at`, `created_at`, `updated_at`
)
SELECT
	`id`, `user_id`, `issuer`, `account_id`, `provider_id`, `access_token`,
	`refresh_token`, `access_token_expires_at`, `refresh_token_expires_at`,
	`scope`, `id_token`, `password`, `expires_at`, `created_at`, `updated_at`
FROM `accounts`;--> statement-breakpoint
DROP TABLE `accounts`;--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_issuer_account_unique` ON `accounts` (`issuer`,`account_id`);--> statement-breakpoint
CREATE INDEX `accounts_user_idx` ON `accounts` (`user_id`);
