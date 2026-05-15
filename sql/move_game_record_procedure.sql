-- Move a game record to another section (updates by primary key).
-- `UpdateGameRecord` matches rows with WHERE SectionID = newSection AND ID = recordId, which fails
-- when the row is still in the old section. This procedure updates `SectionID` and other fields using `WHERE ID = recordId` only.
-- Run against your Achievement Vault database (same schema as Dump*.sql).

DROP PROCEDURE IF EXISTS MoveGameRecord;
DELIMITER ;;
CREATE PROCEDURE MoveGameRecord(
    IN p_recordId INT,
    IN p_sectionId INT,
    IN p_recordName VARCHAR(100),
    IN p_description VARCHAR(1000),
    IN p_gameId INT,
    IN p_numberOfCheckboxes INT,
    IN p_numberAlreadyCompleted INT,
    IN p_listOrder INT,
    IN p_longDescription VARCHAR(1000),
    IN p_hidden TINYINT
)
BEGIN
    IF p_recordId IS NULL OR p_sectionId IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'recordId and sectionId cannot be NULL';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM GameRecords WHERE ID = p_recordId) THEN
        SIGNAL SQLSTATE '02000'
            SET MESSAGE_TEXT = 'No matching record found to move';
    END IF;

    UPDATE GameRecords
    SET
        SectionID = p_sectionId,
        Name = COALESCE(p_recordName, Name),
        Description = COALESCE(p_description, Description),
        GameID = COALESCE(p_gameId, GameID),
        NumberOfCheckboxes = COALESCE(p_numberOfCheckboxes, NumberOfCheckboxes),
        NumberAlreadyCompleted = COALESCE(p_numberAlreadyCompleted, NumberAlreadyCompleted),
        ListOrder = COALESCE(p_listOrder, ListOrder),
        LongDescription = COALESCE(p_longDescription, LongDescription),
        Hidden = COALESCE(p_hidden, Hidden)
    WHERE ID = p_recordId;

    IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'MoveGameRecord: expected exactly one row updated';
    END IF;
END ;;
DELIMITER ;
