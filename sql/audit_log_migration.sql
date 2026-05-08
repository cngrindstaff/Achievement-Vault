-- Audit log (no FKs: rows remain after games/sections/records are deleted).
-- Run against your Achievement Vault database (same schema as Games, GameRecords, etc.).

CREATE TABLE IF NOT EXISTS AuditLog (
    ID BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ChangedAt DATETIME(6) NOT NULL,
    ChangeDescription TEXT NOT NULL,
    GameID INT NULL,
    SectionGroupID INT NULL,
    SectionID INT NULL,
    RecordID INT NULL,
    PRIMARY KEY (ID),
    KEY idx_AuditLog_ChangedAt (ChangedAt),
    KEY idx_AuditLog_GameID (GameID),
    KEY idx_AuditLog_RecordID (RecordID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP PROCEDURE IF EXISTS InsertAuditLog;
DELIMITER ;;
CREATE PROCEDURE InsertAuditLog(
    IN p_changeDescription TEXT,
    IN p_gameId INT,
    IN p_sectionGroupId INT,
    IN p_sectionId INT,
    IN p_recordId INT
)
BEGIN
    INSERT INTO AuditLog (ChangedAt, ChangeDescription, GameID, SectionGroupID, SectionID, RecordID)
    VALUES (UTC_TIMESTAMP(6), p_changeDescription, p_gameId, p_sectionGroupId, p_sectionId, p_recordId);
END ;;
DELIMITER ;
