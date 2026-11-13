-- Hạ Long SmartGuide – Tài khoản quản trị và cài đặt (DFD 6.0)
-- Bảng: admins, admin_sessions, settings
-- Tách từ bản dump MariaDB đầy đủ. Import được theo thứ tự bất kỳ (đã tắt kiểm tra khoá ngoại).

CREATE DATABASE IF NOT EXISTS `halong` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `halong`;

/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;

--
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `display_name` varchar(120) NOT NULL,
  `role` varchar(32) NOT NULL DEFAULT 'admin',
  `password_hash` varchar(256) NOT NULL,
  `salt` varchar(64) NOT NULL,
  `created_at` varchar(32) NOT NULL,
  `last_login_at` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'admin','Quản trị viên','admin','6685f0668a9bcc0e1d96f4301a0353b88dd275394249914d5e795c1712856dd76af104961fb0c2f490d04d13b2c22e153357332dcc9618e195d714f8fd86d773','11bb1afab0d2580f858a5f4b9e20fc23','2026-10-19T23:57:08.386Z','2026-11-08T12:04:15.330Z');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
--

DROP TABLE IF EXISTS `admin_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `admin_sessions` (
  `token` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `admin_id` int(11) NOT NULL,
  `created_at` varchar(32) NOT NULL,
  `expires_ms` bigint(20) NOT NULL,
  PRIMARY KEY (`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
--

DROP TABLE IF EXISTS `settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `settings` (
  `key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `value` longtext NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `settings`
--

LOCK TABLES `settings` WRITE;
/*!40000 ALTER TABLE `settings` DISABLE KEYS */;
INSERT INTO `settings` VALUES ('app','{\"publicBaseUrl\":null,\"previewSeconds\":30,\"bank\":{\"bankId\":\"VCB\",\"accountNo\":\"1023456789\",\"accountName\":\"HA LONG SMARTGUIDE\"},\"simulateVisitors\":true}'),('seededAt','\"2026-10-19T23:57:08.808Z\"'),('seededClaimCodes','[\"HALONG\",\"VIP2026\",\"DEMO\"]'),('seededPackageCodes','[\"SITE_SINGLE\",\"ALL_DAY\",\"FAMILY\"]'),('seededSiteIds','[1,2,3,4,5,6,7]');
/*!40000 ALTER TABLE `settings` ENABLE KEYS */;
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
