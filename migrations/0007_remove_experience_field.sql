-- 删除 users 表中的 experience 字段
-- 由于 SQLite 不直接支持删除列，我们采用重新创建表的方式

-- 启用 foreign_keys 支持
PRAGMA foreign_keys=off;

-- 创建新的临时用户表
CREATE TABLE `users_new` (
    `id` TEXT PRIMARY KEY NOT NULL,
    `name` TEXT NOT NULL,
    `email` TEXT NOT NULL,
    `email_verified` INTEGER DEFAULT 0 NOT NULL,
    `image` TEXT,
    `bio` TEXT,
    `level` TEXT DEFAULT 'beginner', -- 保留 level 字段
    `completed_hikes` INTEGER DEFAULT 0, -- 保留已完成徒步次数字段
    `created_at` INTEGER NOT NULL,
    `updated_at` INTEGER NOT NULL
);

-- 将数据从旧表迁移到新表，将 experience 字段的数据合并到 level 字段（优先使用 level，否则使用 experience）
INSERT INTO `users_new` (`id`, `name`, `email`, `email_verified`, `image`, `bio`, `level`, `completed_hikes`, `created_at`, `updated_at`)
SELECT
    `id`,
    `name`,
    `email`,
    `email_verified`,
    `image`,
    `bio`,
    COALESCE(`level`, `experience`, 'beginner'), -- 优先使用 level，如果没有则使用 experience，都为 null 则使用默认值
    `completed_hikes`,
    `created_at`,
    `updated_at`
FROM `users`;

-- 删除原表
DROP TABLE `users`;

-- 重命名新表为原表名
ALTER TABLE `users_new` RENAME TO `users`;

-- 重建索引
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);

-- 重新启用 foreign_keys 支持
PRAGMA foreign_keys=on;