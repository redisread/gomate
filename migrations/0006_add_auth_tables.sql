-- 创建 Better Auth 所需的 sessions 表
CREATE TABLE IF NOT EXISTS `sessions` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `user_id` TEXT NOT NULL,
    `token` TEXT NOT NULL,
    `expires_at` INTEGER NOT NULL,
    `ip_address` TEXT,
    `user_agent` TEXT,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `sessions_user_idx` ON `sessions` (`user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `sessions_token_idx` ON `sessions` (`token`);

-- 创建 Better Auth 所需的 accounts 表
CREATE TABLE IF NOT EXISTS `accounts` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `user_id` TEXT NOT NULL,
    `account_id` TEXT NOT NULL,
    `provider_id` TEXT NOT NULL,
    `access_token` TEXT,
    `refresh_token` TEXT,
    `access_token_expires_at` INTEGER,
    `refresh_token_expires_at` INTEGER,
    `scope` TEXT,
    `id_token` TEXT,
    `password` TEXT,
    `expires_at` INTEGER,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS `accounts_user_idx` ON `accounts` (`user_id`);
CREATE UNIQUE INDEX IF NOT EXISTS `accounts_provider_idx` ON `accounts` (`provider_id`, `account_id`);

-- 创建 Better Auth 所需的 verifications 表
CREATE TABLE IF NOT EXISTS `verifications` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `identifier` TEXT NOT NULL,
    `value` TEXT NOT NULL,
    `expires_at` INTEGER NOT NULL,
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `verifications_identifier_idx` ON `verifications` (`identifier`);

-- 创建密码重置表
CREATE TABLE IF NOT EXISTS `password_resets` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `user_id` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `token` TEXT NOT NULL,
    `expires_at` INTEGER NOT NULL,
    `used_at` INTEGER,
    `created_at` INTEGER NOT NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE UNIQUE INDEX IF NOT EXISTS `password_resets_token_idx` ON `password_resets` (`token`);
CREATE INDEX IF NOT EXISTS `password_resets_user_idx` ON `password_resets` (`user_id`);
