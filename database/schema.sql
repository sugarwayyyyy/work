-- 社團活動資訊統整平台 資料庫設計
-- 此檔案由 mysqldump 從完整運行環境導出，包含所有 migration 後的最終 schema
-- 如需在 AppServ/XAMPP 安裝，請先執行此檔案，再依序執行 database/migrations/
CREATE DATABASE IF NOT EXISTS club_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE club_platform;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_transfer_requests` (
  `request_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `requester_user_id` int NOT NULL,
  `target_user_id` int NOT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `handover_note` text COLLATE utf8mb4_unicode_ci,
  `request_status` enum('pending','approved','rejected','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `reviewed_by` int DEFAULT NULL,
  `review_note` text COLLATE utf8mb4_unicode_ci,
  `requested_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`request_id`),
  KEY `club_id` (`club_id`),
  KEY `requester_user_id` (`requester_user_id`),
  KEY `target_user_id` (`target_user_id`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_transfer_requests_status_time` (`request_status`,`requested_at`),
  CONSTRAINT `account_transfer_requests_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `account_transfer_requests_ibfk_2` FOREIGN KEY (`requester_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `account_transfer_requests_ibfk_3` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `account_transfer_requests_ibfk_4` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `account_transfers` (
  `transfer_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int DEFAULT NULL,
  `from_user_id` int NOT NULL,
  `to_user_id` int NOT NULL,
  `transferred_roles` json DEFAULT NULL,
  `transferred_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `transferred_by` int DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`transfer_id`),
  KEY `club_id` (`club_id`),
  KEY `from_user_id` (`from_user_id`),
  KEY `to_user_id` (`to_user_id`),
  KEY `transferred_by` (`transferred_by`),
  CONSTRAINT `account_transfers_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `account_transfers_ibfk_2` FOREIGN KEY (`from_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `account_transfers_ibfk_3` FOREIGN KEY (`to_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `account_transfers_ibfk_4` FOREIGN KEY (`transferred_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int DEFAULT NULL,
  `activity_type` enum('post_event','post_qa','publish_announcement','member_join','activity') COLLATE utf8mb4_unicode_ci DEFAULT 'activity',
  `activity_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `triggered_by` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`log_id`),
  KEY `triggered_by` (`triggered_by`),
  KEY `idx_activity_logs_club` (`club_id`),
  CONSTRAINT `activity_logs_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `activity_logs_ibfk_2` FOREIGN KEY (`triggered_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bot_messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `message_type` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `meta` json DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_user_read` (`user_id`,`is_read`),
  KEY `idx_time` (`created_at`),
  CONSTRAINT `bot_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `campus_locations` (
  `location_id` int NOT NULL AUTO_INCREMENT,
  `location_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `building_code` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `floor` int DEFAULT NULL,
  `coordinates_latitude` decimal(10,7) DEFAULT NULL,
  `coordinates_longitude` decimal(10,7) DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`location_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `category_assistant_assignments` (
  `assignment_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `category_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`assignment_id`),
  UNIQUE KEY `uq_user` (`user_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `category_assistant_assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `category_assistant_assignments_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `club_categories` (`category_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_categories` (
  `category_id` int NOT NULL AUTO_INCREMENT,
  `category_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `icon` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`category_id`),
  UNIQUE KEY `category_name` (`category_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_followers` (
  `follower_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `user_id` int NOT NULL,
  `followed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_subscribing_notifications` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`follower_id`),
  UNIQUE KEY `unique_follower` (`club_id`,`user_id`),
  KEY `idx_club_followers_user` (`user_id`),
  CONSTRAINT `club_followers_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `club_followers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_join_applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `user_id` int NOT NULL,
  `fee_type` enum('none','onetime','semester','session') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `verification_code` varchar(8) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code_expires_at` datetime DEFAULT NULL,
  `code_used` tinyint(1) NOT NULL DEFAULT '0',
  `reviewed_by` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  UNIQUE KEY `uq_active_app` (`club_id`,`user_id`,`status`),
  KEY `reviewed_by` (`reviewed_by`),
  KEY `idx_club_pending` (`club_id`,`status`),
  KEY `idx_user_apps` (`user_id`,`status`),
  CONSTRAINT `club_join_applications_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`) ON DELETE CASCADE,
  CONSTRAINT `club_join_applications_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `club_join_applications_ibfk_3` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_members` (
  `member_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` enum('president','vice_president','public_relations','treasurer','director','member','advisor') COLLATE utf8mb4_unicode_ci DEFAULT 'member',
  `join_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `fee_type` enum('none','onetime','semester','session') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'none',
  `fee_paid` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`member_id`),
  UNIQUE KEY `unique_club_user` (`club_id`,`user_id`),
  KEY `idx_club_members_user` (`user_id`),
  KEY `idx_club_members_club` (`club_id`),
  CONSTRAINT `club_members_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `club_members_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_operation_logs` (
  `log_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `actor_user_id` int NOT NULL,
  `actor_role` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_user_id` int DEFAULT NULL,
  `detail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  KEY `idx_col_club_time` (`club_id`,`created_at`),
  KEY `idx_col_actor` (`actor_user_id`),
  CONSTRAINT `club_operation_logs_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_tag_relations` (
  `club_id` int NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`club_id`,`tag_id`),
  KEY `tag_id` (`tag_id`),
  CONSTRAINT `club_tag_relations_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `club_tag_relations_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `club_tags` (`tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `club_tags` (
  `tag_id` int NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_type` enum('experience','fee','time','other') COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`tag_id`),
  UNIQUE KEY `tag_name` (`tag_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clubs` (
  `club_id` int NOT NULL AUTO_INCREMENT,
  `club_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `club_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category_id` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `founding_year` int DEFAULT NULL,
  `club_fee` int DEFAULT '0',
  `club_fee_semester` int DEFAULT NULL,
  `club_fee_per_session` int DEFAULT NULL,
  `meeting_day` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meeting_time` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `meeting_location` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `activity_status` enum('active','inactive','suspended','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'active',
  `last_activity_date` datetime DEFAULT NULL,
  `last_updated` datetime DEFAULT CURRENT_TIMESTAMP,
  `total_posts` int DEFAULT '0',
  `recent_activity_count` int DEFAULT '0',
  `activity_badge` enum('high_active','normal_active','no_recent_activity','ghost_club') COLLATE utf8mb4_unicode_ci DEFAULT 'normal_active',
  `logo_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`club_id`),
  UNIQUE KEY `club_code` (`club_code`),
  UNIQUE KEY `club_name` (`club_name`),
  UNIQUE KEY `uk_clubs_club_code` (`club_code`),
  KEY `idx_clubs_category` (`category_id`),
  KEY `idx_clubs_activity_status` (`activity_status`),
  KEY `idx_clubs_activity_badge` (`activity_badge`),
  KEY `idx_clubs_deleted_at` (`deleted_at`),
  CONSTRAINT `clubs_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `club_categories` (`category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collaborative_events` (
  `collab_event_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `created_by_club_id` int NOT NULL,
  `participated_club_id` int NOT NULL,
  `status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`collab_event_id`),
  KEY `event_id` (`event_id`),
  KEY `created_by_club_id` (`created_by_club_id`),
  KEY `participated_club_id` (`participated_club_id`),
  CONSTRAINT `collaborative_events_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`),
  CONSTRAINT `collaborative_events_ibfk_2` FOREIGN KEY (`created_by_club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `collaborative_events_ibfk_3` FOREIGN KEY (`participated_club_id`) REFERENCES `clubs` (`club_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_attendance` (
  `attendance_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `check_in_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`attendance_id`),
  KEY `event_id` (`event_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `event_attendance_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`),
  CONSTRAINT `event_attendance_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_comments` (
  `comment_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `rating` int NOT NULL,
  `comment` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comment_id`),
  UNIQUE KEY `unique_event_user_comment` (`event_id`,`user_id`),
  KEY `user_id` (`user_id`),
  KEY `idx_event_comments_event` (`event_id`),
  CONSTRAINT `event_comments_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `event_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_posters` (
  `poster_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `image_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `sort_order` int DEFAULT '0',
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`poster_id`),
  KEY `event_id` (`event_id`),
  CONSTRAINT `event_posters_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_registrations` (
  `registration_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `user_id` int NOT NULL,
  `registered_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `status` enum('approved','pending','rejected','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'approved',
  `notes` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`registration_id`),
  UNIQUE KEY `unique_registration` (`event_id`,`user_id`),
  KEY `idx_registrations_event` (`event_id`),
  KEY `idx_registrations_user` (`user_id`),
  CONSTRAINT `event_registrations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`),
  CONSTRAINT `event_registrations_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_tag_relations` (
  `event_id` int NOT NULL,
  `tag_id` int NOT NULL,
  PRIMARY KEY (`event_id`,`tag_id`),
  KEY `idx_event_tag_relations_tag_id` (`tag_id`),
  CONSTRAINT `event_tag_relations_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `event_tag_relations_ibfk_2` FOREIGN KEY (`tag_id`) REFERENCES `club_tags` (`tag_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_venue_application_files` (
  `file_id` int NOT NULL AUTO_INCREMENT,
  `application_id` int NOT NULL,
  `file_path` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`),
  KEY `application_id` (`application_id`),
  CONSTRAINT `event_venue_application_files_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `event_venue_applications` (`application_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `event_venue_applications` (
  `application_id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `club_id` int NOT NULL,
  `applicant_id` int NOT NULL,
  `status` enum('pending','approved','needs_supplement','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `review_comment` text COLLATE utf8mb4_unicode_ci,
  `reviewer_id` int DEFAULT NULL,
  `reviewed_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`application_id`),
  KEY `club_id` (`club_id`),
  KEY `applicant_id` (`applicant_id`),
  KEY `reviewer_id` (`reviewer_id`),
  KEY `idx_venue_app_status` (`status`),
  KEY `idx_venue_app_event` (`event_id`),
  CONSTRAINT `event_venue_applications_ibfk_1` FOREIGN KEY (`event_id`) REFERENCES `events` (`event_id`) ON DELETE CASCADE,
  CONSTRAINT `event_venue_applications_ibfk_2` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `event_venue_applications_ibfk_3` FOREIGN KEY (`applicant_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `event_venue_applications_ibfk_4` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `events` (
  `event_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `event_name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `event_date` datetime NOT NULL,
  `event_end_date` datetime DEFAULT NULL,
  `registration_start` datetime DEFAULT NULL,
  `location` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `poster_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `campus_location_id` int DEFAULT NULL,
  `capacity` int DEFAULT NULL,
  `fee` int DEFAULT '0',
  `registration_deadline` datetime DEFAULT NULL,
  `event_status` enum('draft','published','ongoing','completed','cancelled','archived') COLLATE utf8mb4_unicode_ci DEFAULT 'draft',
  `is_registration_open` tinyint(1) DEFAULT '0',
  `is_attendance_tracking` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `published_at` datetime DEFAULT NULL,
  PRIMARY KEY (`event_id`),
  KEY `idx_events_club` (`club_id`),
  KEY `idx_events_date` (`event_date`),
  KEY `idx_events_status` (`event_status`),
  CONSTRAINT `events_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `feedback_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `feedback_type` enum('suggestion','bug','other') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'other',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  KEY `fk_feedback_user` (`user_id`),
  KEY `idx_feedback_created` (`created_at` DESC),
  CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `login_attempts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempted_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_time` (`email`,`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_reactions` (
  `reaction_id` int NOT NULL AUTO_INCREMENT,
  `message_id` int NOT NULL,
  `user_id` int NOT NULL,
  `emoji` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reaction_id`),
  UNIQUE KEY `uq_msg_user` (`message_id`,`user_id`),
  KEY `idx_message_id` (`message_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `message_reactions_ibfk_1` FOREIGN KEY (`message_id`) REFERENCES `private_messages` (`message_id`) ON DELETE CASCADE,
  CONSTRAINT `message_reactions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `note_messages` (
  `note_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_recalled` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`note_id`),
  KEY `idx_note_user` (`user_id`),
  CONSTRAINT `note_messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `notification_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `notification_type` enum('event','announcement','qa_reply','system') COLLATE utf8mb4_unicode_ci DEFAULT 'system',
  `related_type` enum('event','announcement','club','qa','report') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  KEY `idx_notifications_user_created` (`user_id`,`created_at`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participation_certificates` (
  `certificate_id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `club_id` int NOT NULL,
  `participation_type` enum('member','admin','organizer') COLLATE utf8mb4_unicode_ci DEFAULT 'member',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `total_events_attended` int DEFAULT '0',
  `certificate_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `generated_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`certificate_id`),
  KEY `user_id` (`user_id`),
  KEY `club_id` (`club_id`),
  CONSTRAINT `participation_certificates_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `participation_certificates_ibfk_2` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `private_messages` (
  `message_id` int NOT NULL AUTO_INCREMENT,
  `sender_id` int NOT NULL,
  `receiver_id` int NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `is_recalled` tinyint(1) NOT NULL DEFAULT '0',
  `reply_to_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`message_id`),
  KEY `idx_conv` (`sender_id`,`receiver_id`),
  KEY `idx_inbox` (`receiver_id`,`is_read`),
  KEY `idx_time` (`created_at`),
  KEY `fk_pm_reply` (`reply_to_id`),
  CONSTRAINT `fk_pm_reply` FOREIGN KEY (`reply_to_id`) REFERENCES `private_messages` (`message_id`) ON DELETE SET NULL,
  CONSTRAINT `private_messages_ibfk_1` FOREIGN KEY (`sender_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `private_messages_ibfk_2` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `q_and_a` (
  `qa_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `user_id` int NOT NULL,
  `question_title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `urgency_level` enum('normal','important','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'normal',
  `is_anonymous` tinyint(1) DEFAULT '0',
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('open','answered','closed') COLLATE utf8mb4_unicode_ci DEFAULT 'open',
  `views_count` int DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`qa_id`),
  KEY `idx_qa_club` (`club_id`),
  KEY `idx_qa_user` (`user_id`),
  CONSTRAINT `q_and_a_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `q_and_a_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qa_replies` (
  `reply_id` int NOT NULL AUTO_INCREMENT,
  `qa_id` int NOT NULL,
  `parent_reply_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `reply_content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_official_answer` tinyint(1) DEFAULT '0',
  `is_anonymous` tinyint(1) DEFAULT '0',
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_accepted_solution` tinyint(1) DEFAULT '0',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reply_id`),
  KEY `qa_id` (`qa_id`),
  KEY `user_id` (`user_id`),
  KEY `fk_qa_replies_parent_reply` (`parent_reply_id`),
  CONSTRAINT `fk_qa_replies_parent_reply` FOREIGN KEY (`parent_reply_id`) REFERENCES `qa_replies` (`reply_id`) ON DELETE CASCADE,
  CONSTRAINT `qa_replies_ibfk_1` FOREIGN KEY (`qa_id`) REFERENCES `q_and_a` (`qa_id`),
  CONSTRAINT `qa_replies_ibfk_2` FOREIGN KEY (`parent_reply_id`) REFERENCES `qa_replies` (`reply_id`) ON DELETE CASCADE,
  CONSTRAINT `qa_replies_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qa_reply_helpful` (
  `vote_id` int NOT NULL AUTO_INCREMENT,
  `reply_id` int NOT NULL,
  `user_id` int NOT NULL,
  `vote_type` enum('helpful','not_helpful') COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`vote_id`),
  UNIQUE KEY `unique_reply_vote` (`reply_id`,`user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `qa_reply_helpful_ibfk_1` FOREIGN KEY (`reply_id`) REFERENCES `qa_replies` (`reply_id`) ON DELETE CASCADE,
  CONSTRAINT `qa_reply_helpful_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qa_tag_relations` (
  `qa_id` int NOT NULL,
  `qa_tag_id` int NOT NULL,
  PRIMARY KEY (`qa_id`,`qa_tag_id`),
  KEY `qa_tag_id` (`qa_tag_id`),
  CONSTRAINT `qa_tag_relations_ibfk_1` FOREIGN KEY (`qa_id`) REFERENCES `q_and_a` (`qa_id`),
  CONSTRAINT `qa_tag_relations_ibfk_2` FOREIGN KEY (`qa_tag_id`) REFERENCES `qa_tags` (`qa_tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `qa_tags` (
  `qa_tag_id` int NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_category` enum('welcome_info','fees','time_location','activities','membership','other') COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  `description` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`qa_tag_id`),
  UNIQUE KEY `tag_name` (`tag_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `report_id` int NOT NULL AUTO_INCREMENT,
  `reported_by_user_id` int NOT NULL,
  `report_type` enum('inappropriate_content','spam','false_information','harassment','other') COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  `reported_content_type` enum('qa_question','qa_reply','review','event','club') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_content_id` int DEFAULT NULL,
  `reason` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','reviewing','resolved','dismissed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `admin_notes` text COLLATE utf8mb4_unicode_ci,
  `action_taken` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by` int DEFAULT NULL,
  PRIMARY KEY (`report_id`),
  KEY `reported_by_user_id` (`reported_by_user_id`),
  KEY `resolved_by` (`resolved_by`),
  KEY `idx_reports_status` (`status`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`reported_by_user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`resolved_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_tag_relations` (
  `review_id` int NOT NULL,
  `review_tag_id` int NOT NULL,
  PRIMARY KEY (`review_id`,`review_tag_id`),
  KEY `review_tag_id` (`review_tag_id`),
  CONSTRAINT `review_tag_relations_ibfk_1` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`review_id`),
  CONSTRAINT `review_tag_relations_ibfk_2` FOREIGN KEY (`review_tag_id`) REFERENCES `review_tags` (`review_tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_tags` (
  `review_tag_id` int NOT NULL AUTO_INCREMENT,
  `tag_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tag_category` enum('atmosphere','organization','value','learning','social','other') COLLATE utf8mb4_unicode_ci DEFAULT 'other',
  PRIMARY KEY (`review_tag_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `review_id` int NOT NULL AUTO_INCREMENT,
  `club_id` int NOT NULL,
  `user_id` int NOT NULL,
  `rating` int DEFAULT NULL,
  `review_title` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `review_content` text COLLATE utf8mb4_unicode_ci,
  `is_anonymous` tinyint(1) DEFAULT '0',
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `verified_participant` tinyint(1) DEFAULT '0',
  `event_attended_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `helpful_count` int DEFAULT '0',
  `review_status` enum('pending','approved','rejected') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  PRIMARY KEY (`review_id`),
  UNIQUE KEY `uniq_reviews_club_user` (`club_id`,`user_id`),
  KEY `event_attended_id` (`event_attended_id`),
  KEY `idx_reviews_club` (`club_id`),
  KEY `idx_reviews_user` (`user_id`),
  KEY `idx_reviews_status` (`review_status`),
  CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`club_id`) REFERENCES `clubs` (`club_id`),
  CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `reviews_ibfk_3` FOREIGN KEY (`event_attended_id`) REFERENCES `events` (`event_id`),
  CONSTRAINT `reviews_chk_1` CHECK (((`rating` >= 1) and (`rating` <= 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_announcements` (
  `announcement_id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `announcement_type` enum('event','maintenance','update','important') COLLATE utf8mb4_unicode_ci DEFAULT 'important',
  `is_pinned` tinyint(1) DEFAULT '0',
  `display_priority` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  PRIMARY KEY (`announcement_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_announcement_pin_priority` (`is_pinned`,`display_priority`,`created_at`),
  CONSTRAINT `system_announcements_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('student','club_admin','platform_admin','category_assistant') COLLATE utf8mb4_unicode_ci DEFAULT 'student',
  `profile_image` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `google_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `oauth_provider` enum('email','google') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'email',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `student_id` (`student_id`),
  UNIQUE KEY `uniq_google_id` (`google_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

