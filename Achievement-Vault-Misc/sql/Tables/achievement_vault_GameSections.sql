-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: db-mysql-nyc3-chelseag-2-do-user-2093339-0.m.db.ondigitalocean.com    Database: achievement_vault
-- ------------------------------------------------------
-- Server version	8.0.35

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '13f536e6-3221-11f0-89eb-2a1f1f6a88ac:1-483,
5971d0d9-032a-11f1-8d26-bac02f3269ae:1-915,
a82e3d65-4b1c-11f0-89c5-be49b8b782ce:1-7247,
b86c9be3-0e6f-11f0-a9c0-2228d4c40b56:1-6825,
e683336f-d1a8-11f0-a04f-32c880f94a50:1-1125';

--
-- Table structure for table `GameSections`
--

DROP TABLE IF EXISTS `GameSections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `GameSections` (
  `ID` int NOT NULL AUTO_INCREMENT,
  `Name` varchar(100) NOT NULL,
  `GameID` int NOT NULL,
  `ListOrder` int NOT NULL DEFAULT '0',
  `RecordOrderPreference` varchar(100) DEFAULT NULL,
  `Hidden` tinyint(1) NOT NULL DEFAULT '0',
  `DateCreated` datetime(3) DEFAULT CURRENT_TIMESTAMP(3),
  `DateLastUpdated` datetime(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  `SectionGroupID` int DEFAULT NULL,
  `Description` varchar(250) DEFAULT NULL,
  PRIMARY KEY (`ID`),
  KEY `GameID` (`GameID`),
  KEY `FK_GameSections_SectionGroups` (`SectionGroupID`),
  CONSTRAINT `FK_GameSections_SectionGroups` FOREIGN KEY (`SectionGroupID`) REFERENCES `SectionGroups` (`ID`),
  CONSTRAINT `GameSections_ibfk_1` FOREIGN KEY (`GameID`) REFERENCES `Games` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=264 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-14 11:49:07
