-- Hạ Long SmartGuide – Multi-tenant (ban quản lý)
-- Mô hình shared database, shared schema: thêm bảng tenants và cột tenant_id.
-- Nhập SAU các file 01, 02, 03. Server cũng tự chạy các bước này khi khởi động (server/db.js),
-- nên file này chỉ cần khi muốn nâng cấp CSDL bằng phpMyAdmin. Chạy lại nhiều lần không sao.

CREATE DATABASE IF NOT EXISTS `halong` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `halong`;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `tenants` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(64) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` VARCHAR(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ban mặc định giữ toàn bộ dữ liệu có từ trước.
INSERT IGNORE INTO `tenants` (`id`, `slug`, `name`, `is_active`, `created_at`)
VALUES (1, 'bql-vinh-ha-long', 'Ban quản lý Vịnh Hạ Long', 1, '2026-11-17T00:00:00.000Z');

-- NULL = quản trị nền tảng (superadmin), thấy mọi ban.
ALTER TABLE `admins`      ADD COLUMN IF NOT EXISTS `tenant_id` INT NULL;
ALTER TABLE `sites`       ADD COLUMN IF NOT EXISTS `tenant_id` INT NOT NULL DEFAULT 1;
ALTER TABLE `packages`    ADD COLUMN IF NOT EXISTS `tenant_id` INT NOT NULL DEFAULT 1;
ALTER TABLE `claim_codes` ADD COLUMN IF NOT EXISTS `tenant_id` INT NOT NULL DEFAULT 1;

ALTER TABLE `admins`      ADD INDEX IF NOT EXISTS `idx_admins_tenant` (`tenant_id`);
ALTER TABLE `sites`       ADD INDEX IF NOT EXISTS `idx_sites_tenant` (`tenant_id`);
ALTER TABLE `packages`    ADD INDEX IF NOT EXISTS `idx_packages_tenant` (`tenant_id`);
ALTER TABLE `claim_codes` ADD INDEX IF NOT EXISTS `idx_claim_codes_tenant` (`tenant_id`);

-- Tài khoản không thuộc ban nào là quản trị nền tảng.
UPDATE `admins` SET `role` = 'superadmin' WHERE `tenant_id` IS NULL AND `role` <> 'superadmin';
